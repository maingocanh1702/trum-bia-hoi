import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, SIGN_STYLES, WEATHER, signboardQuote, deliveryInterval, encodeSave, decodeSave, requirementStatus, type Command, type Economy, type SignStyle } from '../src';
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `sign-${g.log.length}` });
function setup(patch = (_: Economy) => {}) {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 1000000; raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0; raw.unlocks.phone.gate = 'LP0';
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  patch(raw); return new Game(loadConfig(raw), 42, 0);
}
function upgrade(g: Game) { while (g.world.equipment.stall < g.config.values.signboard.gate.stallLevel) assert.ok(send(g, { type: 'upgrade', kind: 'stall' }).ok); }

test('a stall earns its wooden sign at the exact gate; installation spends once and records LP ownership', () => {
  const g = setup(), w = g.world;
  const before = w.coins;
  assert.equal(send(g, { type: 'installSignboard' }).reason, 'signboardGate'); assert.equal(w.coins, before);
  assert.equal(send(g, { type: 'setSignboard', style: 'neon' }).reason, 'signboardRequired');
  upgrade(g); const q = signboardQuote(w, g.config); w.coins = q.cost - 1;
  assert.equal(send(g, { type: 'installSignboard' }).reason, 'notEnoughCoins'); assert.equal(w.signStyle, undefined);
  w.coins = q.cost; const envelope = { command: { type: 'installSignboard' as const }, at: w.now, idempotencyKey: 'install-exact' };
  assert.deepEqual(g.command(envelope), { ok: true, amount: q.cost }); assert.equal(w.coins, 0); assert.equal(w.signStyle, 'wood');
  assert.equal(requirementStatus(w, g.config, 'signboard').met, true); assert.deepEqual(g.command(envelope), { ok: true, amount: q.cost });
  assert.equal(send(g, { type: 'installSignboard' }).reason, 'signboardInstalled');
  assert.equal(w.events.filter(e => e.type === 'signboard_installed').length, 1); assert.equal(w.lifetimeEarned, 0); assert.equal(w.seasonEarned, 0);
});

test('golden reputation is checked at purchase, never spent; owned styles switch free even after reputation falls', () => {
  const g = setup(); upgrade(g); assert.ok(send(g, { type: 'installSignboard' }).ok); const w = g.world, q = signboardQuote(w, g.config, 'golden');
  w.reputation = q.requiredRep - 1; const coins = w.coins;
  assert.equal(send(g, { type: 'setSignboard', style: 'golden' }).reason, 'reputationRequired'); assert.equal(w.coins, coins);
  w.reputation = q.requiredRep; w.coins = q.cost - 1;
  assert.equal(send(g, { type: 'setSignboard', style: 'golden' }).reason, 'notEnoughCoins'); assert.equal(w.reputation, q.requiredRep);
  w.coins = q.cost; assert.deepEqual(send(g, { type: 'setSignboard', style: 'golden' }), { ok: true, amount: q.cost }); assert.equal(w.coins, 0); assert.equal(w.reputation, q.requiredRep);
  assert.equal(send(g, { type: 'setSignboard', style: 'golden' }).reason, 'signboardSelected');
  w.reputation = 0; assert.ok(send(g, { type: 'setSignboard', style: 'wood' }).ok); assert.deepEqual(send(g, { type: 'setSignboard', style: 'golden' }), { ok: true, amount: 0 });
  assert.equal(w.unlocks.filter(x => x === 'signboard:golden').length, 1); assert.equal(w.coins, 0);
  assert.equal(w.events.filter(e => e.type === 'signboard_bought').length, 1);
  assert.equal(g.command({ command: { type: 'setSignboard', style: '__proto__' }, at: w.now, idempotencyKey: 'bad-style' } as never).reason, 'invalidCommand');
});

test('buying signs in a live shift leaves guests and timers intact; neon changes the next scheduled shipper interval', () => {
  const g = setup(), w = g.world; upgrade(g); assert.ok(send(g, { type: 'installSignboard' }).ok); assert.ok(send(g, { type: 'buyUnlock', item: 'phone' }).ok);
  assert.ok(send(g, { type: 'startShift' }).ok); g.advance(w.shift!.nextSpawnAt);
  const tables = structuredClone(w.tables), queue = structuredClone(w.queue), timer = w.nextDeliveryAt!, coins = w.coins;
  const price = g.config.values.signboard.styles.neon.priceBase;
  assert.ok(send(g, { type: 'setSignboard', style: 'neon' }).ok);
  assert.deepEqual(w.tables, tables); assert.deepEqual(w.queue, queue); assert.equal(w.nextDeliveryAt, timer);
  assert.equal(w.coins, coins - price); assert.equal(w.shift!.stats.spent, price);
  assert.equal(deliveryInterval(w, g.config), Math.round(g.config.values.customerTypes.shipper.spawnIntervalMs / g.config.values.signboard.styles.neon.shipperMult));
  g.advance(timer); assert.ok(w.delivery); assert.equal(w.nextDeliveryAt, timer + deliveryInterval(w, g.config));
  const delivery = structuredClone(w.delivery), next = w.nextDeliveryAt;
  assert.ok(send(g, { type: 'setSignboard', style: 'wood' }).ok); assert.deepEqual(w.delivery, delivery); assert.equal(w.nextDeliveryAt, next);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('five owned styles and free re-equips replay exactly; only coin purchases enter spent', () => {
  const g = setup(raw => { raw.signboard.styles.golden.repBase = 0; }); upgrade(g); assert.ok(send(g, { type: 'installSignboard' }).ok);
  for (const style of SIGN_STYLES.filter(s => s !== 'wood')) assert.ok(send(g, { type: 'setSignboard', style }).ok);
  assert.ok(send(g, { type: 'setSignboard', style: 'wood' }).ok); assert.ok(send(g, { type: 'setSignboard', style: 'neon' }).ok);
  assert.equal(g.world.events.filter(e => e.type === 'signboard_bought').length, 4);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('real v8 delivery and rush saves retain all recorded fields before and after their first current command', () => {
  for (const name of ['delivery', 'rush-schedule']) {
    const file = readFileSync(new URL(`./fixtures/legacy-${name}-v8.json`, import.meta.url), 'utf8'), source = JSON.parse(file), g = decodeSave(file);
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-${name}-v8-expected.json`, import.meta.url), 'utf8'));
    const historical: Record<string, unknown> = { ...g.world, lifetime: g.world.lifetimeEarned, season: g.world.seasonEarned, stats: g.world.shift!.stats, rushes: g.world.shift!.rushes, result: g.log.at(-1)!.result };
    for (const [key, value] of Object.entries(expected)) if (key !== 'source') assert.deepEqual(historical[key], value, `historical ${name}:${key}`);
    assert.deepEqual(g.world.events, source.events); assert.equal(g.log.at(-1)!.rulesVersion, 8); assert.equal(g.world.signStyle, undefined);
    const before = structuredClone(g.world); assert.ok(send(g, { type: 'activity', active: true }).ok);
    assert.deepEqual(g.world, { ...before, staminaAnchorAt: before.now, staminaAnchorMs: before.staminaMs, attendance: g.world.attendance, shift: { ...before.shift!, menu: { eventStart: before.events.length, serveStart: before.serves.length, complete: false } }, nextId: before.nextId + 2, events: [...before.events, { id: `event-${before.nextId + 1}`, type: 'menu_tracking_started', at: before.now, configVersion: g.config.version, idempotencyKey: g.log.at(-1)!.idempotencyKey, data: { shiftId: before.shift!.id, complete: false } }, g.world.events.at(-1)!] }); assert.equal(g.world.events.at(-1)!.type, 'attendance_day_opened'); assert.equal(g.log.at(-1)!.rulesVersion, 22); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('actual seeded arrivals follow every sign style and preserve the VIP group cap', () => {
  const raw = structuredClone(setup().config.raw); raw.runtime.initialEquipmentLevel = raw.signboard.gate.stallLevel; raw.signboard.styles.golden.repBase = 0;
  const c = loadConfig(raw), counts: Record<string, Record<string, number>> = {};
  for (const style of [null, ...SIGN_STYLES] as (SignStyle | null)[]) {
    const row = counts[style ?? 'none'] = { vip: 0, voi: 0, ngoily: 0, thuong: 0, chipheo: 0, football_fan: 0 };
    for (let seed = 1; seed <= 1000; seed++) {
      const g = new Game(c, seed, 0);
      if (style) { assert.ok(send(g, { type: 'installSignboard' }).ok); if (style !== 'wood') assert.ok(send(g, { type: 'setSignboard', style }).ok); }
      assert.ok(send(g, { type: 'startShift' }).ok); g.advance(g.world.shift!.nextSpawnAt);
      const customers = g.world.tables.flatMap(t => t.group?.customers ?? []);
      assert.ok(customers.length > 0); assert.ok(customers.filter(c => c.type === 'vip').length <= c.values.customerTypes.vip.maxPerGroupPhase2);
      for (const customer of customers) row[customer.type]++;
    }
  }
  assert.ok(counts.wood.vip > counts.none.vip); assert.ok(counts.golden.vip > counts.wood.vip);
  assert.deepEqual(counts.neon, counts.wood); assert.ok(counts.vintage.voi < counts.wood.voi); assert.ok(counts.calligraphy.ngoily < counts.wood.ngoily);
});

test('sign configuration rejects unsafe costs, weights and zero-tick delivery frequency before play', () => {
  const invalid = [
    (r: Economy) => { r.signboard.installFeeBase = Number.MAX_SAFE_INTEGER; },
    (r: Economy) => { r.signboard.styles.golden.repBase = 0.1; },
    (r: Economy) => { r.signboard.gate.stallLevel = 99; },
    (r: Economy) => { r.signboard.styles.neon.shipperMult = 0; },
    (r: Economy) => { r.signboard.styles.neon.shipperMult = 1e300; },
    (r: Economy) => { r.signboard.styles.wood.vipWeightMult = 1e308; r.customerTypes.vip.weight = 1e308; },
  ];
  for (const patch of invalid) { const r = structuredClone(config.raw); patch(r); assert.throws(() => loadConfig(r), /config:/); }
  const g = setup(r => { r.signboard.installFeeBase = 101; r.signboard.styles.wood.priceBase = 3; }); upgrade(g);
  assert.equal(signboardQuote(g.world, g.config).cost, Math.round(101 * config.values.k.value) + Math.round(3 * config.values.k.value));
});

test('vintage cannot remove the last eligible customer type after a group reaches its VIP cap', () => {
  const raw = structuredClone(setup().config.raw);
  raw.runtime.initialEquipmentLevel = raw.signboard.gate.stallLevel;
  for (const [type, profile] of Object.entries(raw.customerTypes)) if (profile.usesTable) profile.weight = type === 'vip' || type === 'voi' ? 1 : 0;
  const g = new Game(loadConfig(raw), 5, 0);
  assert.ok(send(g, { type: 'installSignboard' }).ok); assert.ok(send(g, { type: 'setSignboard', style: 'vintage' }).ok);
  assert.ok(send(g, { type: 'startShift' }).ok); g.advance(g.world.shift!.nextSpawnAt);
  const guests = g.world.tables.flatMap(t => t.group?.customers ?? []);
  assert.ok(guests.length > raw.customerTypes.vip.maxPerGroupPhase2);
  assert.ok(guests.some(c => c.type === 'voi')); assert.equal(guests.filter(c => c.type === 'vip').length, 1);
  raw.signboard.styles.vintage.voiWeightMult = 0;
  for (const cap of [1, 0]) {
    raw.customerTypes.vip.maxPerGroupPhase2 = cap;
    assert.throws(() => loadConfig(raw), /config:signboardWeights/);
  }
  // A cap covering every possible group never removes VIP from a subsequent draw.
  raw.customerTypes.vip.maxPerGroupPhase2 = Math.max(...raw.upgrades.table.levels.map(t => t.capacity));
  assert.doesNotThrow(() => loadConfig(raw));
});

test('both registry signboard gate names must agree, and a synchronized override reaches installation', () => {
  for (const mirror of [true, false]) {
    const raw = structuredClone(config.raw);
    if (mirror) raw.upgrades.stall.signboardGateLevel++;
    else raw.signboard.gate.stallLevel++;
    assert.throws(() => loadConfig(raw), /config:signboardGateAlias/);
  }
  const g = setup(raw => { raw.upgrades.stall.signboardGateLevel = raw.signboard.gate.stallLevel = 4; if ('lifePathGate' in raw.upgrades) raw.upgrades.lifePathGate.stall.fill(0); });
  assert.equal(signboardQuote(g.world, g.config).requiredStall, 4);
  assert.equal(send(g, { type: 'installSignboard' }).reason, 'signboardGate');
  upgrade(g); assert.ok(send(g, { type: 'installSignboard' }).ok);
});

test('a real closed shift does not block an affordable sign purchase near the safe-integer limit', () => {
  const g = setup(raw => {
    raw.shift.startingCoinsBase = 3200000000000000;
    raw.signboard.styles.neon.priceBase = raw.signboard.styles.vintage.priceBase = 2000000000000000;
    raw.lifePath[1].lifetimeBase = 1; raw.lifePath[1].rewardCoinBase = 1000000000000000;
  });
  upgrade(g); assert.ok(send(g, { type: 'installSignboard' }).ok);
  assert.ok(send(g, { type: 'restock', dish: 'lac', mode: 'full' }).ok); assert.ok(send(g, { type: 'upgradeDog', level: 1 }).ok);
  assert.ok(send(g, { type: 'startShift' }).ok);
  assert.ok(send(g, { type: 'setSignboard', style: 'neon' }).ok);
  g.advance(g.world.shift!.nextSpawnAt + g.config.values.runtime.tableSeatingMs + g.config.values.upgrades.keg.pourMs[0] * g.world.tables[0].capacity);
  const t = g.world.tables.find(t => t.order && t.order.items.every(i => i.state === 'ready'))!;
  assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok);
  assert.ok(send(g, { type: 'claimLifePath', level: 1 }).ok);
  const cost = g.config.values.signboard.styles.vintage.priceBase;
  assert.ok(g.world.coins >= cost); assert.ok(!Number.isSafeInteger(g.world.shift!.stats.spent + cost));
  assert.equal(send(g, { type: 'setSignboard', style: 'vintage' }).reason, 'notEnoughCoins');
  assert.ok(send(g, { type: 'endShift' }).ok); g.advance(g.world.now + g.config.values.shift.durationMs);
  assert.equal(g.world.phase, 'resting'); const stats = structuredClone(g.world.shift!.stats), coins = g.world.coins;
  assert.deepEqual(send(g, { type: 'setSignboard', style: 'vintage' }), { ok: true, amount: cost });
  assert.equal(g.world.coins, coins - cost); assert.deepEqual(g.world.shift!.stats, stats);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
