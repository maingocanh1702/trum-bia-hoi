import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, decodeSave, credit, restockQuote, type Command, type Economy } from '../src/index';

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
