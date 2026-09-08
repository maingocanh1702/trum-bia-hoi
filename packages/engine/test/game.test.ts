import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Game, kickAllQuote, config, loadConfig, encodeSave, decodeSave, credit, customerValue, dayKey, restockQuote, type Command, type Economy } from '../src/index';

function create(patch?: (c: Economy) => void) {
  const raw = structuredClone(config.raw);
  for (const k of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[k].weight = 0;
  patch?.(raw);
  return new Game(loadConfig(raw), 42, 0);
}
function send(g: Game, command: Command, at = g.world.now) {
  return g.command({ idempotencyKey: `test-${g.log.length}`, at, command });
}
function firstOrder(g: Game) {
  assert.equal(send(g, { type: 'startShift' }).ok, true);
  g.advance(11000);
  const table = g.world.tables.find(t => t.order)!;
  assert.ok(table.order);
  return { table, command: { type: 'serve', tableId: table.id, orderId: table.order.id } as const };
}

test('all money Base values scale once; menu, times and probabilities retain their units', () => {
  assert.equal(config.values.shift.startingCoinsBase, 750);
  assert.equal(config.values.upgrades.keg.priceBase[1], 7500);
  assert.equal(config.values.quests.loginTrackRepBase[0], 5);
  assert.equal(config.values.menu.bia.price, 50);
  assert.equal(config.values.freshness.baseMs, 12000);
  assert.equal(config.values.demandMix.pMoi, .85);
  assert.throws(() => config.get('menu.typo'));
  assert.ok(Object.isFrozen(config.values.menu));
});
test('bad snapshots and paid-play/legal/content activation fail closed', () => {
  for (const patch of [
    (c: Economy) => { c.menu.bia.price = NaN; },
    (c: Economy) => { c.upgrades.washer.washMs[0] = 0; },
    (c: Economy) => { c.entitlements.sessionPass.enabled = true; },
    (c: Economy) => { c.lottery.legalGate = true; },
    (c: Economy) => { c.risk.inspection.enabled = true; },
  ]) { const c = structuredClone(config.raw); patch(c); assert.throws(() => loadConfig(c)); }
});
test('first guest gets one customer and one beer, with auto pour, a single serve and auto wash', () => {
  const g = create(); const { table, command } = firstOrder(g);
  assert.equal(table.group!.customers.length, 1);
  assert.deepEqual(table.order!.items.map(i => i.dish), ['bia']);
  assert.equal(table.order!.items[0].state, 'ready');
  assert.deepEqual(send(g, command), { ok: true, outcome: 'early', amount: 65 });
  assert.equal(g.world.coins, 815);
  assert.equal(g.world.reputation, 3);
  assert.equal(g.world.glasses.filter(x => x.state === 'in_use').length, 1);
  send(g, { type: 'endShift' }); g.advance(35000);
  assert.equal(g.world.phase, 'resting');
  assert.ok(g.world.glasses.every(x => x.state === 'clean'));
  assert.equal(g.world.glasses.length, config.values.glasses.start);
});
test('late service keeps payment, loses tip, and does not fine the group', () => {
  const g = create(); const { command } = firstOrder(g);
  assert.deepEqual(send(g, command, 20000), { ok: true, outcome: 'late', amount: 50 });
  assert.equal(g.world.shift!.stats.penalty, 0);
});
test('grace rescues the whole table; exact grace end expires and charges only once', () => {
  const g = create(c => { c.shift.startingCoinsBase = 10000; });
  assert.ok(send(g, { type: 'upgrade', kind: 'cooler' }).ok);
  const { command, table } = firstOrder(g);
  const deadline = table.order!.placedAt + table.order!.patienceMs;
  assert.deepEqual(send(g, command, deadline), { ok: true, outcome: 'grace', amount: 50 });
  const h = create(); const f = firstOrder(h);
  const expires = f.table.order!.placedAt + f.table.order!.patienceMs + h.config.values.patience.graceMs;
  h.advance(expires);
  const coins = h.world.coins;
  assert.equal(send(h, f.command).ok, false);
  h.advance(expires + 1);
  assert.equal(h.world.coins, coins);
  assert.equal(h.world.shift!.stats.lost, 1);
  assert.ok(h.world.glasses.every(x => x.state !== 'in_use' || x.itemId !== f.table.order?.items[0].id));
});
test('flat beer keeps payment and has only one reputation penalty even when late', () => {
  const g = create(); const { command } = firstOrder(g);
  g.world.reputation = 10;
  assert.deepEqual(send(g, command, 23000), { ok: true, outcome: 'stale', amount: 50 });
  assert.equal(g.world.reputation, 9);
  assert.equal(g.world.serves[0].tip, 0);
});
test('retries cannot duplicate serving money or replay an old order against a new group', () => {
  const g = create(); const { command } = firstOrder(g);
  const e = { idempotencyKey: 'retry', at: g.world.now, command };
  const result = g.command(e); const coins = g.world.coins;
  assert.deepEqual(g.command(e), result);
  assert.equal(g.world.coins, coins);
  assert.equal(g.world.serves.length, 1);
  assert.equal(g.command({ ...e, command: { type: 'endShift' } }).reason, 'idempotencyConflict');
  g.advance(45000);
  assert.equal(send(g, command).ok, false);
});
test('daily cap counts only actual gameplay credit, and spending/reward cannot inflate ranking', () => {
  const g = create(c => { c.shift.dailyEarnCapBase = 20; });
  const { command } = firstOrder(g);
  assert.equal(send(g, command).amount, 50);
  assert.equal(g.world.serves[0].payment + g.world.serves[0].tip, 65);
  assert.equal(g.world.seasonEarned, 50);
  credit(g.world, g.config, 1000, 'quest');
  assert.equal(g.world.seasonEarned, 50);
  assert.equal(g.world.lifetimeEarned, 50);
  assert.throws(() => credit(g.world, g.config, NaN, 'servePayment'));
});
test('restock uses full bulk packs plus retail remainder and never overfills', () => {
  const g = create();
  g.world.inventory.bia = 0;
  assert.deepEqual(restockQuote(g.world, g.config, 'bia', 'full'), { quantity: 15, cost: 160, ok: true });
  assert.ok(send(g, { type: 'restock', dish: 'bia', mode: 'full' }).ok);
  assert.equal(g.world.inventory.bia, 15);
  assert.equal(send(g, { type: 'restock', dish: 'bia', mode: 'bulk' }).ok, false);
});
test('small ticks and a large time jump produce identical autonomous events/state', () => {
  const a = create(), b = create();
  send(a, { type: 'startShift' }); send(b, { type: 'startShift' });
  for (let t = 17; t < 60000; t += 17) a.advance(t);
  a.advance(60000); b.advance(60000);
  assert.deepEqual(a.world, b.world);
});
test('active rest recovery is independent of frame rate and never counts hidden time', () => {
  const a = create(), b = create();
  for (const g of [a, b]) { const { command } = firstOrder(g); send(g, command); send(g, { type: 'endShift' }); }
  for (let t = 11037; t < 35007; t += 37) a.advance(t);
  a.advance(35007); b.advance(35007);
  assert.deepEqual(a.world, b.world);
  send(a, { type: 'activity', active: false }); const stamina = a.world.staminaMs;
  a.advance(100000); assert.equal(a.world.staminaMs, stamina);
  send(a, { type: 'activity', active: true }); a.advance(100100);
  assert.equal(a.world.staminaMs, Math.min(a.config.values.shift.durationMs, stamina + 40));
});
test('local save reload exactly replays the running order, finances and glass ownership', () => {
  const g = create(); const { command } = firstOrder(g);
  send(g, command); g.advance(17777);
  const restored = decodeSave(encodeSave(g));
  assert.deepEqual(restored.world, g.world);
  assert.deepEqual(restored.log, g.log);
  const bad = JSON.parse(encodeSave(g)); bad.log[1].result.amount++;
  assert.throws(() => decodeSave(JSON.stringify(bad)), /replay-mismatch/);
});
test('invalid commands cannot write arbitrary inventory fields or regress the clock', () => {
  const g = create();
  assert.equal(g.command({ idempotencyKey: 'bad', at: 0, command: { type: 'restock', dish: '__proto__', mode: 'full' } } as never).ok, false);
  g.advance(1000); assert.equal(send(g, { type: 'startShift' }, 0).reason, 'staleCommand');
  assert.throws(() => g.advance(1));
});

test('loss feedback reports actual clamped coins and reputation once per expired table', () => {
  const g = create(); const { table } = firstOrder(g);
  // A player can have less money/reputation left than the nominal penalty.
  g.world.coins = 2; g.world.reputation = 3;
  g.advance(table.order!.placedAt + table.order!.patienceMs + g.config.values.patience.graceMs);
  const losses = g.world.events.filter(e => e.type === 'order_expired');
  assert.equal(losses.length, 1);
  assert.equal(losses[0].data.penalty, 2);
  assert.equal(losses[0].data.reputation, 3);
  assert.equal(g.world.coins, 0); assert.equal(g.world.reputation, 0);
});

test('startup rejects configurations that create fractional stock, unusable equipment or silent audio crashes', () => {
  const cases: [string, (c: Economy) => void][] = [
    ['equipment below first level', c => { c.runtime.initialEquipmentLevel = 0; }],
    ['equipment above last level', c => { c.runtime.initialEquipmentLevel = 99; }],
    ['kitchen above last level', c => { c.runtime.initialKitchenLevel = 99; }],
    ['fractional stock', c => { c.inventory.startingStock.bia[0] = 0.5; }],
    ['no arriving customer types', c => { Object.values(c.customerTypes).forEach(t => { t.weight = 0; }); }],
    ['no possible weather', c => { for (const w of ['sunny', 'hot', 'humid', 'rain', 'cold'] as const) c.weather[w].weight = 0; }],
    ['invalid browser audio gain', c => { c.audio.masterGainDefault = 2; }],
    ['first customer can never fit', c => { c.onboarding.firstShift.firstGroupSize = 99; }],
    ['fractional menu cost', c => { c.menu.bia.unitCost = 1.5; }],
  ];
  for (const [name, patch] of cases) { const raw = structuredClone(config.raw); patch(raw); assert.throws(() => loadConfig(raw), name); }
});

test('v1 save migrates without changing prior fines, identifiers or an in-progress second shift', () => {
  const text = readFileSync(new URL('./fixtures/legacy-save-v1.json', import.meta.url), 'utf8');
  const expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-save-v1-expected.json', import.meta.url), 'utf8'));
  const g = decodeSave(text);
  for (const key of ['coins', 'reputation', 'dayShifts', 'tables', 'glasses'] as const) assert.deepEqual(g.world[key], expected[key]);
  assert.equal(g.world.shift!.id, expected.shift.id);
  assert.equal(g.world.shift!.startedAt, expected.shift.startedAt);
  assert.ok(g.log.every(e => e.rulesVersion === 1 && e.configVersion === g.config.version));
  const migrated = encodeSave(g); const data = JSON.parse(migrated);
  assert.equal(data.version, 2);
  assert.ok(data.events.length > 0);
  assert.ok(data.events.every((e: { idempotencyKey: string; configVersion: string }) => e.idempotencyKey && e.configVersion === g.config.version));
  assert.deepEqual(decodeSave(migrated).world, g.world);
  assert.equal(send(g, { type: 'activity', active: true }).ok, true);
  assert.equal(g.log.at(-1)!.rulesVersion, 4);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  data.events[0].configVersion = 'tampered';
  assert.throws(() => decodeSave(JSON.stringify(data)), /event-mismatch/);
});


test('a patient guest beside a hurried guest keeps their own tip clock (03-SPEC section 4)', () => {
  const g = create(); const { table } = firstOrder(g);
  const normal = table.group!.customers[0];
  const hurried = { ...normal, id: 'hurried', type: 'voi' as const, patienceMs: normal.patienceMs / 2 };
  table.order!.patienceMs = hurried.patienceMs;
  table.order!.items.push({ ...table.order!.items[0], id: 'hurried-beer', customerId: hurried.id, glassId: null });
  g.world.now = table.order!.placedAt + Math.round(hurried.patienceMs * .5);
  assert.ok(customerValue(g.world, g.config, table.order!, normal).tip > 0);
  assert.equal(customerValue(g.world, g.config, table.order!, hurried).tip, 0);
});

test('daily cap permits another available shift, with zero credited earnings', () => {
  const g = create(c => { c.shift.dailyEarnCapBase = 20; });
  const { command } = firstOrder(g); send(g, command); send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost });
  g.advance(12000 + g.config.values.shift.durationMs / g.config.values.shift.regenRate);
  const coins = g.world.coins;
  assert.ok(send(g, { type: 'startShift' }).ok);
  assert.equal(credit(g.world, g.config, 100, 'servePayment'), 0);
  assert.equal(g.world.coins, coins);
});

test('custom normal, VIP, hurried and leisurely round ranges reach spawned groups', () => {
  for (const [type, range, probability, expected] of [
    ['thuong', [2, 4], 0, 2], ['thuong', [2, 4], 1, 4],
    ['vip', [3, 5], 0, 3], ['vip', [3, 5], 1, 5],
    ['voi', [2, 2], 0, 2], ['ngoily', [4, 4], 0, 4],
  ] as const) {
    const g = create(c => {
      c.onboarding.enabled = false; c.upgrades.table.levels[0].capacity = 1;
      Object.entries(c.customerTypes).forEach(([key, profile]) => { profile.weight = key === type ? 1 : 0; });
      c.rounds[type] = [...range]; c.demandMix.pSecondRound = probability;
    });
    send(g, { type: 'startShift' }); g.advance(g.world.shift!.nextSpawnAt);
    const group = g.world.tables.find(t => t.group)!.group!;
    assert.equal(group.customers[0].type, type); assert.equal(group.rounds, expected);
  }
});

test('queued groups leave exactly at patience, without the seated-order grace', () => {
  const g = create(); firstOrder(g);
  // Both tables are occupied; a complete queued group must remain unseated up to its own deadline.
  g.world.tables.forEach(t => { t.state = 'broken'; t.order = null; t.group = null; t.until = null; });
  const customer = { id: 'queued-1', type: 'thuong' as const, patienceMs: 1000, enjoyMs: 1000 };
  g.world.queue.push({ id: 'queued', customers: [customer, { ...customer, id: 'queued-2' }], rounds: 1, arrivedAt: g.world.now });
  g.world.reputation = 20;
  const expiry = g.world.now + customer.patienceMs;
  g.advance(expiry - 1); assert.equal(g.world.queue.length, 1);
  g.advance(expiry); assert.equal(g.world.queue.length, 0);
  const event = g.world.events.find(e => e.type === 'customer_left' && e.data.groupId === 'queued')!;
  assert.equal(event.at, expiry); assert.equal(event.data.count, 2); assert.equal(event.data.penalty, 0);
  assert.equal(event.data.reputation, -g.config.values.reputation.customerLeft * 2);
});

test('an early zero-tip guest keeps reputation when manually dismissed, with only the explicit close fee', () => {
  const g = create(c => { c.customerTypes.thuong.tipMult = 0; });
  const { command } = firstOrder(g);
  assert.deepEqual(send(g, command), { ok: true, outcome: 'early', amount: 50 });
  assert.equal(g.world.events.find(e => e.type === 'order_served')!.data.tipped, false);
  const coins = g.world.coins, rep = g.world.reputation;
  send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost }); send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost });
  assert.equal(g.world.coins, coins - 5); assert.equal(g.world.reputation, rep);
  assert.equal(g.world.shift!.stats.spent, 5);
  assert.equal(g.world.shift!.stats.lost, 0); assert.equal(g.world.shift!.stats.penalty, 0);
});

test('hidden time freezes pending orders and freshness while preserving real calendar time and replay', () => {
  const a = create(), b = create();
  for (const g of [a, b]) firstOrder(g);
  const hiddenMs = 24 * 60 * 60 * 1000;
  send(b, { type: 'activity', active: false });
  const snapshot = structuredClone(b.world);
  b.advance(b.world.now + hiddenMs);
  assert.equal(b.world.staminaMs, snapshot.staminaMs);
  assert.deepEqual(b.world.events, snapshot.events);
  assert.equal(b.world.shift!.pausedMs, hiddenMs);
  assert.equal(dayKey(b.world.now, b.config), '1970-01-02');
  assert.deepEqual(decodeSave(encodeSave(b)).world, b.world);
  send(b, { type: 'activity', active: true });
  for (const g of [a, b]) {
    const table = g.world.tables.find(t => t.order)!;
    assert.deepEqual(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }), { ok: true, outcome: 'early', amount: 65 });
  }
  assert.equal(a.world.coins, b.world.coins);
  assert.equal(b.world.shift!.endsAt - b.world.now, a.world.shift!.endsAt - a.world.now);
});

test('Vietnam midnight resets each earn bucket while shift count belongs to its closing day', () => {
  for (const start of ['2026-09-08T16:59:45Z', '2026-09-08T17:00:01Z']) {
    const raw = structuredClone(config.raw); raw.shift.dailyEarnCapBase = 20;
    const createdAt = Date.parse(start), g = new Game(loadConfig(raw), 42, createdAt);
    send(g, { type: 'startShift' }); g.advance(createdAt + 11000);
    const table = g.world.tables.find(t => t.order)!;
    assert.equal(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).amount, 50);
    send(g, { type: 'endShift' });
    const beforeDay = dayKey(g.world.now, g.config);
    g.advance(Math.max(Date.parse('2026-09-08T17:00:00Z'), g.world.now));
    const currentDay = dayKey(g.world.now, g.config);
    assert.equal(credit(g.world, g.config, 65, 'servePayment'), beforeDay === currentDay ? 0 : 50);
    g.advance(g.world.now + 30000);
    assert.equal(g.world.dayEarned[beforeDay], 50);
    assert.equal(g.world.dayEarned[currentDay], 50);
    assert.equal(g.world.dayShifts['2026-09-09'], 1);
    assert.equal(g.world.dayShifts['2026-09-08'], undefined);
    assert.equal(g.world.seasonEarned, beforeDay === currentDay ? 50 : 100);
  }
});


test('mixed-group round precedence survives hurried nonconstant sampling', () => {
  for (const [types, seed, expected] of [
    [['ngoily', 'voi'], 8, 7], [['voi', 'vip'], 8, 5],
    [['voi', 'vip'], 9, 3], [['vip', 'thuong'], 8, 6],
  ] as const) {
    const raw = structuredClone(config.raw);
    raw.onboarding.enabled = false;
    Object.entries(raw.customerTypes).forEach(([key, profile]) => { profile.weight = types.some(type => type === key) ? 1 : 0; });
    raw.rounds.ngoily = [7, 7]; raw.rounds.voi = [3, 5]; raw.rounds.vip = [6, 6]; raw.rounds.thuong = [2, 2]; raw.demandMix.pSecondRound = 1;
    const g = new Game(loadConfig(raw), seed, 0);
    send(g, { type: 'startShift' }); g.advance(g.world.shift!.nextSpawnAt);
    const group = g.world.tables.find(t => t.group)!.group!;
    assert.deepEqual(group.customers.map(c => c.type).sort(), [...types].sort());
    assert.equal(group.rounds, expected);
  }
});
