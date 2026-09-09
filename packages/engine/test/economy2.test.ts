import { test } from 'node:test';
import assert from 'node:assert/strict';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, isEconomy2, DISHES, WEATHER, EQUIPMENT, beerStatus, kitchenStatus, buyGlassQuote, upgradeQuote, planRushes, encodeSave, decodeSave, type Command } from '../src';
const send = (g: Game, command: Command, key = `eco2-${g.log.length}`) => g.command({ command, at: g.world.now, idempotencyKey: key });
function game(patch?: (raw: typeof import('../../../docs/config/economy.tbh.json')) => void) {
  const raw = structuredClone(config.raw); assert.ok(isEconomy2(raw));
  raw.shift.startingCoinsBase = 1000000;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  patch?.(raw); return new Game(loadConfig(raw), 42, 0);
}
const replay = (g: Game) => assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);

test('a new shift fills real reserve, pours through its one tap and starts refilling the vacancy immediately', () => {
  const g = game(), w = g.world, total = w.inventory.bia, keg = g.config.values.upgrades.keg;
  assert.ok(send(g, { type: 'startShift' }).ok);
  assert.equal(beerStatus(w, g.config).stored, keg.kegStorage[0]); assert.equal(w.beer!.batch, null);
  assert.equal(w.inventory.bia, total - keg.kegStorage[0]);
  g.advance(8000); const table = w.tables[0], item = table.order!.items[0];
  assert.equal(item.state, 'preparing'); assert.equal(item.readyAt, w.now + keg.pourMs[0]);
  assert.equal(beerStatus(w, g.config).pouring, 1); assert.equal(w.beer!.batch!.quantity, 1);
  const deadline = item.readyAt!; assert.equal(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok, false);
  send(g, { type: 'activity', active: true, paused: true }); const before = beerStatus(w, g.config);
  g.advance(w.now + 40000); assert.deepEqual(beerStatus(w, g.config), before);
  send(g, { type: 'activity', active: true }); g.advance(deadline + 40000);
  assert.equal(item.state, 'ready'); assert.equal(w.events.filter(e => e.type === 'beer_poured' && e.data.itemId === item.id).length, 1);
  assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok);
  assert.equal(w.serves[0].stale, false); replay(g);
});

test('two simultaneous same-dish pans cook four portions, never six, then release capacity at their exact deadline', () => {
  const g = game(raw => {
    raw.runtime.initialKitchenLevel = 2; raw.runtime.initialTableLevel = 3;
    raw.onboarding.firstShift.firstGroupSize = 6; raw.onboarding.firstShift.firstOrder = ['dau'];
  }), w = g.world;
  assert.ok(send(g, { type: 'restock', dish: 'dau', mode: 'full' }).ok); const initial = w.inventory.dau;
  send(g, { type: 'startShift' }); g.advance(8000);
  const order = w.tables[0].order!, active = order.items.filter(i => i.state === 'preparing');
  assert.equal(active.length, 4); assert.equal(new Set(active.map(i => i.kitchenBatchId)).size, 2);
  assert.equal(kitchenStatus(w, g.config).busy, 2); assert.equal(w.inventory.dau, initial - 4);
  const at = active[0].readyAt!; g.advance(at - 1); assert.equal(order.items.filter(i => i.state === 'preparing').length, 4);
  g.advance(at); assert.equal(order.items.filter(i => i.state === 'ready').length, 4);
  assert.equal(order.items.filter(i => i.state === 'preparing').length, 2); assert.equal(kitchenStatus(w, g.config).busy, 1);
  assert.equal(w.inventory.dau, initial - 6); replay(g);
});

test('the last portions of raw side dishes are reserved once across a group; later guests order only available food', () => {
  const g = game(raw => {
    raw.onboarding.enabled = false; raw.demandMix.pMoi = 1; raw.demandMix.pHotGivenMoi = 1;
    raw.runtime.initialKitchenLevel = 1; raw.runtime.initialTableLevel = 3;
    raw.weather.sunny.spawnIntervalMult = 0.1;
    raw.inventory.startingStock.lac[0] = raw.inventory.startingStock.nem[0] = 0;
  }), w = g.world;
  for (let n = 0; n < 3; n++) assert.ok(send(g, { type: 'restock', dish: 'dau', mode: 'one' }).ok);
  send(g, { type: 'startShift' }); g.advance(60000);
  const ordered = w.events.filter(e => e.type === 'dish_ordered');
  assert.equal(ordered.filter(e => e.data.dish === 'dau').length, 3);
  assert.equal(ordered.filter(e => e.data.dish !== 'dau' && e.data.dish !== 'bia').length, 0);
  assert.ok(ordered.filter(e => e.data.dish === 'bia').length > 3); assert.equal(w.inventory.dau, 0); replay(g);
});

test('glass purchases respect owned capacity, exact price, pause and retry identity', () => {
  const g = game(), w = g.world; send(g, { type: 'startShift' }); send(g, { type: 'activity', active: true, paused: true });
  const owned = w.glasses.length, money = w.coins, q = buyGlassQuote(w, g.config, 3), end = w.shift!.endsAt;
  assert.equal(q.cost, 3 * g.config.values.glasses.priceBase); assert.ok(send(g, { type: 'buyGlass', count: 3 }, 'glass-lot').ok);
  assert.equal(w.glasses.length, owned + 3); assert.equal(w.coins, money - q.cost); assert.equal(w.paused, true);
  const after = structuredClone(w); send(g, { type: 'buyGlass', count: 3 }, 'glass-lot'); assert.deepEqual(w, after);
  g.advance(w.now + 10000); assert.equal(w.shift!.endsAt, end + 10000);
  const headroom = q.capacity - w.glasses.length; assert.ok(send(g, { type: 'buyGlass', count: headroom }).ok);
  const full = structuredClone(w); assert.equal(send(g, { type: 'buyGlass', count: 1 }).reason, 'glassCapacity'); assert.deepEqual(w, full);
  for (const count of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, Infinity]) assert.equal(send(g, { type: 'buyGlass', count }).ok, false);
  assert.equal(new Set(w.glasses.map(x => x.id)).size, w.glasses.length); replay(g);
});

test('LP gates use reached level and the kitchen level-zero offset; heavy rush stays locked until LP1', () => {
  const g = game(), raw = g.config.values; assert.ok(isEconomy2(raw));
  for (const kind of EQUIPMENT) for (let current = kind === 'kitchen' ? 0 : 1; current < raw.upgrades[kind].priceBase.length - (kind === 'kitchen' ? 1 : 0); current++) {
    const w = structuredClone(g.world); w.equipment[kind] = current;
    const required: number = raw.upgrades.lifePathGate[kind][kind === 'kitchen' ? current + 1 : current];
    const q = upgradeQuote(w, g.config, kind); assert.equal(q.requiredLifePath, required);
    if (required > 0) assert.equal(q.reason, 'lifePathRequired');
    w.lifePath = required; assert.equal(upgradeQuote(w, g.config, kind).ok, true); assert.deepEqual(w.claimedLifePaths, []);
  }
  const before = planRushes(g.config, 'yard', 'first', '2026-09-09', 0, 0)!;
  assert.ok(before.rushes.every(r => r.kind === 'light'));
  assert.ok(planRushes(g.config, 'yard', 'first', '2026-09-09', 0, raw.rush.schedule.heavyFromLifePath)!.rushes.some(r => r.kind === 'heavy'));
});

test('old complete snapshots stay unchanged through current commands and adopt new reserve only at a successful new shift', () => {
  const old = loadConfig(legacy), g = new Game(old, 42, 0);
  send(g, { type: 'startShift' }); g.advance(8000); const table = g.world.tables[0]; assert.equal(table.order!.items[0].state, 'ready');
  const prefix = structuredClone(g.world.events), pin = JSON.stringify(g.config.raw);
  const refused = g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'bad-open' }, config);
  assert.equal(refused.ok, false); assert.equal(JSON.stringify(g.config.raw), pin); assert.deepEqual(g.world.events, prefix);
  send(g, { type: 'endShift' }); g.advance(g.world.now + old.values.shift.durationMs * (1 + 1 / old.values.shift.regenRate));
  const carried = g.world.beer!.ready;
  assert.ok(g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'new-economy' }, config).ok);
  assert.equal(g.config.version, config.version); assert.equal(JSON.stringify(g.initialConfig.raw), pin);
  assert.equal(g.world.beer!.ready, Math.max(carried, config.values.upgrades.keg.kegStorage[0])); replay(g);
});

test('hot preference uses the whole special group and falls back to the available category', () => {
  for (const special of [false, true]) for (const hotStock of [false, true]) {
    const g = game(raw => {
      raw.onboarding.enabled = false; raw.runtime.initialKitchenLevel = 1;
      raw.demandMix.pMoi = 1; raw.demandMix.pHotGivenMoi = 0; raw.demandMix.pHotGivenMoiSpecial = 1;
      for (const customer of Object.values(raw.customerTypes)) if ('weight' in customer) customer.weight = 0;
      raw.customerTypes[special ? 'ngoily' : 'thuong'].weight = 1;
    });
    if (hotStock) send(g, { type: 'restock', dish: 'dau', mode: 'full' });
    send(g, { type: 'startShift' });
    while (!g.world.tables.some(t => t.order) && g.world.now < 20000) g.advance(g.world.now + 100);
    const items = g.world.tables.find(t => t.order)!.order!.items.filter(i => i.dish !== 'bia');
    assert.ok(items.length); assert.ok(items.every(i => special && hotStock ? i.dish === 'dau' : ['lac', 'nem'].includes(i.dish)));
    replay(g);
  }
});

test('both complete config generations load, while partial new snapshots, cyclic gates and invalid units fail closed', () => {
  assert.deepEqual(loadConfig(legacy).raw, legacy); assert.deepEqual(loadConfig(config.raw).raw, config.raw);
  const partial = structuredClone(config.raw); assert.ok(isEconomy2(partial));
  delete (partial.upgrades as Partial<typeof partial.upgrades>).lifePathGate;
  assert.throws(() => loadConfig(partial), /config:/);
  for (const patch of [
    (raw: typeof import('../../../docs/config/economy.tbh.json')) => { raw.demandMix.pHotGivenMoi = 1.1; },
    (raw: typeof import('../../../docs/config/economy.tbh.json')) => { raw.upgrades.kitchen.portionsPerPan[1] = 1.5; },
    (raw: typeof import('../../../docs/config/economy.tbh.json')) => { raw.upgrades.lifePathGate.stall[2] = 2; },
    (raw: typeof import('../../../docs/config/economy.tbh.json')) => { raw.locations.list[1].gateLifePath = 2; },
  ]) assert.throws(() => game(patch), /config:/);
});

test('an expired order waiting for table cleanup no longer reserves the last side dish', () => {
  const g = game(raw => { raw.onboarding.enabled = false; raw.demandMix.pMoi = 1; raw.inventory.startingStock.lac[0] = 1; raw.inventory.startingStock.nem[0] = 0; });
  // Valid transient boundary: expiry has released the food, but cleanup still retains the old order.
  const table = g.world.tables[0]; table.state = 'cleaning'; table.until = 60000;
  table.order = { id: 'expired-order', placedAt: 0, patienceMs: 1, state: 'expired', readyEmitted: false, items: [{ id: 'unused-food', dish: 'lac', state: 'pending', customerId: 'departed', glassId: null, readyAt: null }] };
  send(g, { type: 'startShift' }); g.advance(30000);
  assert.equal(g.world.events.filter(e => e.type === 'dish_ordered' && e.data.dish === 'lac').length, 1);
});

test('opening with an in-flight refill fills only unreserved capacity and never accelerates or duplicates the carried batch', () => {
  const g = game(raw => { raw.onboarding.firstShift.guaranteedFirstGroupWithinMs = 60000; });
  // Isolate the carry boundary; raw stock already excludes this existing batch reservation.
  const w = g.world; w.beer = { ready: 1, batch: { quantity: 1, startedAt: 0, readyAt: 9000 } };
  const stock = w.inventory.bia, batch = structuredClone(w.beer.batch);
  send(g, { type: 'startShift' }, 'carry-open'); assert.equal(w.beer.ready, 2); assert.equal(w.inventory.bia, stock - 1); assert.deepEqual(w.beer.batch, batch);
  const after = structuredClone(w); send(g, { type: 'startShift' }, 'carry-open'); assert.deepEqual(w, after);
  g.advance(9000); assert.equal(w.beer.ready, 3); assert.equal(w.beer.batch, null); assert.equal(w.inventory.bia, stock - 1);
});
