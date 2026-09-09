import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, kickAllQuote, config, loadConfig, dayKey, encodeSave, decodeSave, wellRestedRemaining, type Command, type Economy } from '../src';

const origin = Date.parse('2026-09-08T00:00:00Z');
function create(patch?: (raw: Economy) => void, at = origin, seed = 42, source: Economy = config.raw) {
  const raw = structuredClone(source);
  for (const key of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[key].weight = 0;
  patch?.(raw);
  return new Game(loadConfig(raw), seed, at);
}
const send = (g: Game, command: Command, at = g.world.now) => g.command({ idempotencyKey: `rested-${g.log.length}`, at, command });
const restMs = (g: Game) => g.config.values.shift.wellRested.requiresRestHours * 3600000;
function openRested(g: Game) {
  assert.deepEqual(send(g, { type: 'startShift' }, g.world.now + restMs(g) + 1), { ok: true });
  return g.world.shift!;
}
function serveFirst(g: Game, at = g.world.shift!.startedAt + 11000) {
  g.advance(at);
  const table = g.world.tables[0];
  return send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id });
}

test('rest must be strictly longer than six hours and a start retry consumes the opening day only once', () => {
  for (const delta of [-1, 0, 1]) {
    const g = create();
    const envelope = { idempotencyKey: 'open-once', at: origin + restMs(g) + delta, command: { type: 'startShift' } as const };
    assert.deepEqual(g.command(envelope), { ok: true });
    const before = encodeSave(g);
    assert.deepEqual(g.command(envelope), { ok: true }); assert.equal(encodeSave(g), before);
    assert.equal(wellRestedRemaining(g.world), delta > 0 ? g.config.values.shift.wellRested.durationMs : 0);
    assert.equal(Object.keys(g.world.wellRestedDays).length, delta > 0 ? 1 : 0);
    assert.equal(g.world.events.filter(e => e.type === 'well_rested_started').length, delta > 0 ? 1 : 0);
  }
});

test('each customer receives the rounded combined-service bonus without changing base k records', () => {
  const g = create(c => { c.onboarding.firstShift.firstGroupSize = 2; }); openRested(g);
  const result = serveFirst(g, g.world.now + 14100);
  assert.deepEqual(result, { ok: true, outcome: 'early', amount: 144 });
  assert.equal(g.world.serves.length, 2);
  for (const serve of g.world.serves) assert.deepEqual([serve.payment, serve.tip, serve.wellRestedBonus, serve.credited], [50, 15, 7, 72]);
  assert.equal(g.world.shift!.stats.wellRestedBonus, 14);
  assert.equal(g.world.lifetimeEarned, 144); assert.equal(g.world.seasonEarned, 144);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('the exact bonus deadline ends the multiplier while a served order is still fresh', () => {
  for (const delta of [-1, 0]) {
    const g = create(c => { c.shift.wellRested.durationMs = 12000; c.tip.wellRestedDurationMs = 12000; });
    const shift = openRested(g);
    assert.equal(serveFirst(g, shift.wellRestedUntil! + delta).amount, delta < 0 ? 72 : 65);
    assert.equal(g.world.serves[0].wellRestedBonus, delta < 0 ? 7 : 0);
  }
});

test('partial and exhausted daily caps clamp the actual bonus and all three earning ledgers', () => {
  for (const [capBase, amount, bonus] of [[27, 68, 3], [20, 50, 0], [0, 0, 0]]) {
    const g = create(c => { c.shift.dailyEarnCapBase = capBase; }); openRested(g);
    assert.equal(serveFirst(g).amount, amount);
    assert.equal(g.world.coins, g.config.values.shift.startingCoinsBase + amount);
    assert.equal(g.world.dayEarned[dayKey(g.world.now, g.config)], amount);
    assert.equal(g.world.lifetimeEarned, amount); assert.equal(g.world.seasonEarned, amount);
    assert.equal(g.world.serves[0].wellRestedBonus, bonus);
    assert.deepEqual(g.world.events.find(e => e.type === 'well_rested_bonus')?.data, { customerId: g.world.serves[0].customerId, orderId: g.world.serves[0].orderId, nominal: 7, credited: bonus });
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('the first grant stays on its opening day while earnings and the finished shift cross midnight', () => {
  const startAt = Date.parse('2026-09-08T16:59:55Z');
  const g = create(undefined, startAt - restMs(create()) - 1);
  openRested(g);
  assert.deepEqual(g.world.wellRestedDays, { '2026-09-08': true });
  assert.equal(serveFirst(g).amount, 72);
  assert.deepEqual(g.world.dayEarned, { '2026-09-09': 72 });
  send(g, { type: 'endShift' });
  g.advance(g.world.tables[0].until!);
  assert.deepEqual(g.world.dayShifts, { '2026-09-09': 1 });
  assert.deepEqual(g.world.wellRestedDays, { '2026-09-08': true });
  assert.equal(wellRestedRemaining(g.world), 0);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('same-day repeat rests do not grant twice; the next opening day and configured repeat mode do', () => {
  for (const oncePerDay of [true, false]) {
    const g = create(c => { c.shift.wellRested.oncePerDay = oncePerDay; });
    openRested(g); send(g, { type: 'endShift' });
    assert.equal(g.world.restStartedAt, g.world.now);
    openRested(g);
    assert.equal(wellRestedRemaining(g.world) > 0, !oncePerDay);
    send(g, { type: 'endShift' }); openRested(g);
    assert.ok(wellRestedRemaining(g.world) > 0);
    assert.deepEqual(Object.keys(g.world.wellRestedDays), ['2026-09-08', '2026-09-09']);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('offline rest qualifies by wall time but cannot bypass full-stamina opening or consume a failed grant', () => {
  const g = create(); send(g, { type: 'startShift' });
  send(g, { type: 'endShift' }, g.world.now + 1000);
  const anchor = g.world.restStartedAt;
  send(g, { type: 'activity', active: false });
  g.advance(g.world.now + restMs(g) + 1);
  assert.equal(g.world.restStartedAt, anchor);
  assert.deepEqual(send(g, { type: 'startShift' }), { ok: false, reason: 'restFirst' });
  assert.deepEqual(g.world.wellRestedDays, {});
  send(g, { type: 'activity', active: true }); g.advance(g.world.now + 2500);
  assert.deepEqual(send(g, { type: 'startShift' }), { ok: true });
  assert.ok(wellRestedRemaining(g.world) > 0);
});

test('hidden time preserves the remaining bonus through replay and never resurrects an expired buff', () => {
  const g = create(); openRested(g); g.advance(g.world.now + 11000);
  const remaining = wellRestedRemaining(g.world), anchor = g.world.restStartedAt;
  send(g, { type: 'activity', active: false }); g.advance(g.world.now + 86400000);
  assert.equal(wellRestedRemaining(g.world), remaining); assert.equal(g.world.restStartedAt, anchor);
  const restored = decodeSave(encodeSave(g));
  assert.deepEqual(restored.world, g.world);
  send(restored, { type: 'activity', active: true });
  const table = restored.world.tables[0];
  assert.equal(send(restored, { type: 'serve', tableId: table.id, orderId: table.order!.id }).amount, 72);
  restored.advance(restored.world.shift!.wellRestedUntil!);
  assert.equal(wellRestedRemaining(restored.world), 0);
  send(restored, { type: 'activity', active: false }); restored.advance(restored.world.now + 86400000);
  send(restored, { type: 'activity', active: true });
  assert.equal(wellRestedRemaining(restored.world), 0);
});

test('the real pre-bonus v2 save preserves amounts, event IDs and its unboosted open shift', () => {
  const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
  const text = fixture('legacy-well-rested-v2'), expected = JSON.parse(fixture('legacy-well-rested-v2-expected'));
  const g = decodeSave(text);
  for (const key of ['now', 'coins', 'reputation', 'lifetimeEarned', 'dayEarned', 'nextId', 'serves'] as const) assert.deepEqual(g.world[key], expected[key]);
  assert.deepEqual(g.world.events, JSON.parse(text).events);
  assert.deepEqual(g.log.at(-1)!.result, expected.result);
  assert.ok(g.log.every(e => e.rulesVersion === 2)); assert.equal(g.world.shift!.wellRestedUntil, null);
  send(g, { type: 'activity', active: true });
  assert.equal(wellRestedRemaining(g.world), 0); assert.deepEqual(g.world.wellRestedDays, {});
  send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost }); openRested(g);
  assert.ok(wellRestedRemaining(g.world) > 0);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('well-rested aliases cannot drift and invalid multipliers or clock units fail before play', () => {
  for (const patch of [
    (c: Economy) => { c.tip.wellRestedMult = 2; },
    (c: Economy) => { c.tip.wellRestedDurationMs = 1; },
    (c: Economy) => { c.tip.wellRestedKeyedBy = 'finalize-day'; },
    (c: Economy) => { c.shift.wellRested.mult = c.tip.wellRestedMult = .9; },
    (c: Economy) => { c.shift.wellRested.durationMs = c.tip.wellRestedDurationMs = 0; },
    (c: Economy) => { c.shift.wellRested.requiresRestHours = Number.MAX_SAFE_INTEGER; },
  ]) assert.throws(() => create(patch));
});

test('modern config rejects overflowing service bonuses; legacy snapshots still refuse the entire mixed order before partial service', () => {
  const patch = (c: Economy) => {
    c.onboarding.enabled = false;
    Object.entries(c.customerTypes).forEach(([key, profile]) => { profile.weight = key === 'thuong' || key === 'voi' ? 1 : 0; });
    c.customerTypes.thuong.paymentMult = 0;
    c.customerTypes.shipper.netRate = 0; // Isolate the table overflow path from the new delivery config guard.
    c.shift.wellRested.mult = c.tip.wellRestedMult = Number.MAX_VALUE;
  };
  assert.throws(() => create(patch), /config:locations.maximumService/);
  const g = create(patch, origin, 8, legacy);
  openRested(g); g.advance(g.world.shift!.nextSpawnAt + g.config.values.runtime.tableSeatingMs);
  const table = g.world.tables[0], order = table.order!;
  assert.deepEqual(table.group!.customers.map(c => c.type), ['thuong', 'voi']);
  while (order.items.some(i => i.state !== 'ready')) g.advance(g.world.now + 100);
  const before = encodeSave(g), world = structuredClone(g.world);
  assert.throws(() => send(g, { type: 'serve', tableId: table.id, orderId: order.id }), /invalid-bonus/);
  assert.equal(encodeSave(g), before); assert.deepEqual(g.world, world);
});
