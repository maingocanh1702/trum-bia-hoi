import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, currentGuests, kickAllQuote, customerValue, encodeSave, decodeSave, dayKey, type Command } from '../src';

const send = (g: Game, command: Command, at = g.world.now) => g.command({ idempotencyKey: `close-${g.log.length}`, at, command });
function create(at = 11000) {
  const raw = structuredClone(config.raw);
  for (const k of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[k].weight = 0;
  const g = new Game(loadConfig(raw), 42, 0);
  send(g, { type: 'startShift' }); g.advance(at);
  return g;
}
const close = (g: Game) => ({ type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost } as const);

test('manual close charges every assigned order once, including consuming guests, without abandonment penalties', () => {
  for (const state of ['preparing', 'pending', 'grace', 'consuming'] as const) {
    const g = create(state === 'preparing' ? 8100 : 11000), w = g.world, table = w.tables[0], order = table.order!;
    send(g, { type: 'endShift' });
    if (state === 'grace') g.advance(order.placedAt + order.patienceMs);
    if (state === 'consuming') send(g, { type: 'serve', tableId: table.id, orderId: order.id });
    const before = structuredClone(w), quote = kickAllQuote(w, g.config);
    assert.equal(quote.cost, 5); assert.equal(quote.guests.length, 1);
    const e = { idempotencyKey: 'close-once', at: w.now, command: close(g) };
    assert.deepEqual(g.command(e), { ok: true, amount: 5 });
    assert.deepEqual(g.command(e), { ok: true, amount: 5 });
    assert.equal(w.coins, before.coins - 5); assert.equal(w.reputation, before.reputation);
    assert.equal(w.shift!.stats.spent, 5); assert.equal(w.shift!.stats.penalty, 0); assert.equal(w.shift!.stats.lost, 0);
    assert.equal(w.seasonEarned, before.seasonEarned); assert.equal(w.lifetimeEarned, before.lifetimeEarned);
    assert.deepEqual(w.inventory, before.inventory);
    assert.equal(order.state, state === 'consuming' ? 'served' : 'cancelled');
    assert.equal(w.phase, 'resting'); assert.equal(w.completedShifts, 1); assert.equal(w.dayShifts[dayKey(w.now, g.config)], 1);
    assert.equal(w.restStartedAt, w.now); assert.equal(w.events.filter(e => e.type === 'guests_dismissed').length, 1);
    assert.equal(w.events.filter(e => e.type === 'order_expired').length, 0);
    assert.equal(w.glasses.filter(x => ['dirty', 'washing'].includes(x.state)).length, 1);
    assert.equal(order.items[0].glassId, null);
    assert.deepEqual(decodeSave(encodeSave(g)).world, w);
    g.advance(w.now + 10000);
    assert.ok(w.glasses.every(x => x.state === 'clean')); assert.equal(w.completedShifts, 1);
  }
});

test('close quote reuses VIP and rush pricing, and only a remaining Chi Pheo occupies a finished mixed table', () => {
  const g = create(), w = g.world, table = w.tables[0], guest = table.group!.customers[0];
  guest.type = 'vip'; w.shift!.rush = 'heavy';
  assert.equal(kickAllQuote(w, g.config).cost, customerValue(w, g.config, table.order!, guest).penalty);
  assert.ok(kickAllQuote(w, g.config).cost > 5);
  guest.type = 'thuong';
  const chipheo = { ...guest, id: 'remaining-chipheo', type: 'chipheo' as const };
  table.group!.customers.push(chipheo);
  table.state = 'occupied'; table.order!.state = 'served';
  assert.deepEqual(currentGuests(table), [chipheo]);
  assert.deepEqual(kickAllQuote(w, g.config).guests.map(x => [x.customerId, x.fee]), [[chipheo.id, 0]]);
  const coins = w.coins; assert.deepEqual(send(g, close(g)), { ok: true, amount: 0 });
  assert.equal(w.coins, coins); assert.equal(w.phase, 'resting');
});

test('quoting unassigned queue and seating guests is pure, costs zero and never invents orders', () => {
  const g = new Game(config, 42, 0); send(g, { type: 'startShift' }); g.advance(g.world.shift!.nextSpawnAt);
  const w = g.world, table = w.tables[0];
  assert.equal(table.state, 'seating'); assert.equal(table.order, null);
  w.queue.push({ ...structuredClone(table.group!), id: 'queue', customers: [{ ...table.group!.customers[0], id: 'queued' }] });
  const before = structuredClone(w), quote = kickAllQuote(w, g.config);
  assert.equal(quote.cost, 0); assert.equal(quote.guests.length, 2); assert.deepEqual(w, before);
  assert.deepEqual(send(g, close(g)), { ok: true, amount: 0 });
  assert.deepEqual(w.inventory, before.inventory); assert.equal(w.rng, before.rng);
  assert.equal(w.queue.length, 0); assert.equal(w.phase, 'resting');
});

test('insufficient funds and invalid or stale confirmation fail before debiting or dismissing guests', () => {
  const g = create(), w = g.world;
  for (const [command, reason] of [
    [{ type: 'kickAll' }, 'shiftChanged'],
    [{ ...close(g), maxCost: undefined }, 'closeCostChanged'],
    [{ ...close(g), maxCost: 0 }, 'closeCostChanged'],
    [{ ...close(g), shiftId: 'old-shift' }, 'shiftChanged'],
    [{ ...close(g), maxCost: -1 }, 'invalidCommand'],
    [{ ...close(g), maxCost: NaN }, 'invalidCommand'],
  ] as const) {
    const before = structuredClone(w); assert.deepEqual(send(g, command), { ok: false, reason }); assert.deepEqual(w, before);
  }
  w.coins = 4; const before = structuredClone(w);
  assert.deepEqual(send(g, close(g)), { ok: false, reason: 'notEnoughCoins' }); assert.deepEqual(w, before);
});

test('expired guests are never charged twice and a lower current fee stays within the confirmed maximum', () => {
  const g = create(), w = g.world, order = w.tables[0].order!, quoted = close(g);
  send(g, { type: 'endShift' });
  g.advance(order.placedAt + order.patienceMs + g.config.values.patience.graceMs);
  assert.equal(kickAllQuote(w, g.config).cost, 0); assert.equal(w.phase, 'resting');
  const coins = w.coins;
  assert.deepEqual(send(g, quoted), { ok: false, reason: 'noShift' }); assert.equal(w.coins, coins);
  g.advance(w.now + g.config.values.shift.durationMs / g.config.values.shift.regenRate);
  send(g, { type: 'startShift' });
  assert.deepEqual(send(g, quoted), { ok: false, reason: 'shiftChanged' });
  assert.deepEqual(send(g, { ...close(g), maxCost: quoted.maxCost }), { ok: true, amount: 0 });
});

test('a damaged active table cannot silently become a zero-cost dismissal', () => {
  const g = create(); g.world.tables[0].order = null;
  assert.throws(() => kickAllQuote(g.world, g.config), /state:tableOrder/);
});

test('the actual v3 close save retains its free served-table dismissal, results and event identifiers', () => {
  const read = (name: string) => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
  const text = read('legacy-kick-v3'), expected = JSON.parse(read('legacy-kick-v3-expected')), g = decodeSave(text);
  for (const key of ['coins', 'reputation', 'phase', 'nextId'] as const) assert.deepEqual(g.world[key], expected[key]);
  assert.deepEqual(g.world.shift!.stats, expected.stats); assert.deepEqual(g.log.at(-1)!.result, expected.result);
  assert.deepEqual(g.world.events, JSON.parse(text).events); assert.ok(g.log.every(e => e.rulesVersion === 3));
  send(g, { type: 'activity', active: true });
  assert.equal(g.log.at(-1)!.rulesVersion, 20); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});


test('a new group between quote and confirmation cannot raise the approved fee silently', () => {
  const g = create(), order = g.world.tables[0].order!, quoted = close(g), coins = g.world.coins;
  const at = order.placedAt + order.patienceMs;
  assert.deepEqual(send(g, quoted, at), { ok: false, reason: 'closeCostChanged' });
  assert.ok(kickAllQuote(g.world, g.config).cost > quoted.maxCost);
  assert.equal(g.world.coins, coins); assert.equal(g.world.phase, 'open');
  assert.equal(g.world.events.filter(e => e.type === 'customer_dismissed').length, 0);
  const updated = close(g);
  assert.deepEqual(send(g, updated), { ok: true, amount: updated.maxCost });
  assert.equal(g.world.coins, coins - updated.maxCost);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
