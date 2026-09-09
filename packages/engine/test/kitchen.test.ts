import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, kitchenStatus, encodeSave, decodeSave } from '../src';
import { kitchenGame, sendKitchen, untilKitchen } from './fixtures/kitchen';

test('actual upgrades open exactly the configured dishes and all intermediate burner limits', () => {
  for (let level = 0; level < config.values.upgrades.kitchen.slots.length; level++) {
    const g = kitchenGame(level), w = g.world, slots = g.config.values.upgrades.kitchen.slots[level];
    if (slots) untilKitchen(g, () => kitchenStatus(w, g.config).busy === slots);
    else g.advance(w.now + 15000);
    const status = kitchenStatus(w, g.config), before = structuredClone(w);
    assert.equal(status.level, level); assert.equal(status.slots, slots); assert.equal(status.busy, slots);
    for (const item of w.tables.flatMap(t => t.order?.items ?? [])) assert.ok(g.config.values.menu[item.dish].unlock.kitchenLevel <= level);
    for (const event of w.events.filter(e => e.type === 'dish_preparing')) {
      const item = w.tables.flatMap(t => t.order?.items ?? []).find(i => i.id === event.data.itemId);
      if (item && g.config.values.menu[item.dish].station === 'kitchen') assert.equal(item.readyAt! - event.at, Math.round(g.config.values.menu[item.dish].prepMs * g.config.values.upgrades.kitchen.prepMult[level]!));
    }
    assert.deepEqual(kitchenStatus(w, g.config), status); assert.deepEqual(w, before); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
    assert.equal(w.events.filter(e => e.type === 'upgrade_bought' && e.data.kind === 'kitchen').length, level);
  }
});

test('stock shortage starts no cooking; one real restock starts only one matching dish and the rest waits', () => {
  const g = kitchenGame(2, false), w = g.world;
  untilKitchen(g, () => kitchenStatus(w, g.config).jobs.length >= 3);
  assert.equal(kitchenStatus(w, g.config).busy, 0);
  assert.ok(kitchenStatus(w, g.config).jobs.every(j => j.state === 'stock'));
  const dish = kitchenStatus(w, g.config).jobs[0].dish;
  const starts = w.events.filter(e => e.type === 'dish_preparing').length;
  sendKitchen(g, { type: 'restock', dish, mode: 'one' });
  assert.equal(w.inventory[dish], 0); assert.equal(kitchenStatus(w, g.config).busy, 1);
  assert.equal(w.events.filter(e => e.type === 'dish_preparing').length, starts + 1);
  assert.equal(kitchenStatus(w, g.config).jobs.filter(j => j.state === 'preparing')[0].dish, dish);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('actual completion deadline and hidden pause agree under fine and coarse time steps', () => {
  const a = kitchenGame(1); untilKitchen(a, () => kitchenStatus(a.world, a.config).jobs.some(j => j.state === 'queued'));
  const b = decodeSave(encodeSave(a)), target = a.world.now + 19000;
  a.advance(target); while (b.world.now < target) b.advance(Math.min(target, b.world.now + 100));
  assert.deepEqual(a.world, b.world);
  const before = kitchenStatus(a.world, a.config); sendKitchen(a, { type: 'activity', active: false });
  a.advance(a.world.now + 86400000); assert.deepEqual(kitchenStatus(a.world, a.config), before);
  sendKitchen(a, { type: 'activity', active: true }); assert.deepEqual(decodeSave(encodeSave(a)).world, a.world);
});

test('patience warning uses the actual started-job timestamp including equality, never a queued estimate', () => {
  const g = kitchenGame(1); untilKitchen(g, () => kitchenStatus(g.world, g.config).busy > 0);
  const t = g.world.tables.find(t => t.order?.items.some(i => i.state === 'preparing' && g.config.values.menu[i.dish].station === 'kitchen'))!;
  const item = t.order!.items.find(i => i.state === 'preparing' && g.config.values.menu[i.dish].station === 'kitchen')!;
  // Projection-only boundary probe; never serialized as a played history.
  for (const difference of [-1, 0, 1]) {
    const world = structuredClone(g.world), order = world.tables.find(x => x.id === t.id)!.order!;
    order.patienceMs = item.readyAt! - order.placedAt + difference;
    const status = kitchenStatus(world, g.config), row = status.jobs.find(j => j.itemId === item.id)!;
    assert.equal(row.late, difference <= 0);
    assert.ok(status.jobs.filter(j => j.state === 'queued').every(j => j.remainingMs === null && !j.late));
  }
});

test('expired preparing food is wasted once without refund, and pending stock was never consumed', () => {
  for (const stocked of [true, false]) {
    const g = kitchenGame(1, stocked, 12000), w = g.world;
    untilKitchen(g, () => kitchenStatus(w, g.config).jobs.some(j => j.state === (stocked ? 'queued' : 'stock')));
    sendKitchen(g, { type: 'endShift' });
    const orders = w.tables.filter(t => t.order).map(t => t.order!);
    const expiredItems: string[] = [], prepared = new Set<string>();
    const stock = structuredClone(w.inventory), startsBefore = w.events.filter(e => e.type === 'dish_preparing').length;
    let observedPreparingExpiry = false;
    for (const order of [...orders].sort((a, b) => a.placedAt + a.patienceMs - b.placedAt - b.patienceMs)) {
      const deadline = order.placedAt + order.patienceMs + g.config.values.patience.graceMs;
      g.advance(deadline - 1);
      for (const item of order.items) if (g.config.values.menu[item.dish].station === 'kitchen' && item.state !== 'pending') {
        prepared.add(item.id); observedPreparingExpiry ||= item.state === 'preparing';
      }
      g.advance(deadline); assert.equal(order.state, 'expired');
      for (const item of order.items) if (g.config.values.menu[item.dish].station === 'kitchen') {
        assert.equal(item.state, prepared.has(item.id) ? 'wasted' : 'pending'); expiredItems.push(item.id);
      }
    }
    assert.ok(expiredItems.length); if (stocked) assert.ok(observedPreparingExpiry); else assert.equal(prepared.size, 0);
    const starts = w.events.filter(e => e.type === 'dish_preparing').slice(startsBefore);
    for (const dish of ['dau', 'topmo', 'long'] as const) assert.equal(w.inventory[dish], stock[dish] - starts.filter(e => e.data.dish === dish).length);
    const count = w.events.filter(e => e.type === 'order_expired').length, inventory = structuredClone(w.inventory); g.advance(w.now + 5000);
    assert.equal(w.events.filter(e => e.type === 'order_expired').length, count); assert.deepEqual(w.inventory, inventory);
    assert.equal(kitchenStatus(w, g.config).jobs.length, 0); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  }
});

test('a partial hot-food order is refused and its whole ready mâm can still be served with stale beer', () => {
  const g = kitchenGame(1), w = g.world; untilKitchen(g, () => kitchenStatus(w, g.config).busy > 0);
  const row = kitchenStatus(w, g.config).jobs.find(j => j.state === 'preparing')!, table = w.tables.find(t => t.id === row.tableId)!;
  const command = { type: 'serve' as const, tableId: table.id, orderId: table.order!.id }, coins = w.coins;
  const result = g.command({ command, at: w.now, idempotencyKey: 'partial-mam' }); assert.equal(result.ok, false); assert.equal(w.coins, coins);
  untilKitchen(g, () => table.order!.items.every(i => i.state === 'ready'));
  g.advance(Math.max(w.now, table.order!.placedAt + 40000));
  const served = sendKitchen(g, command); assert.equal(served.outcome, 'stale');
  assert.equal(kitchenStatus(w, g.config).jobs.filter(j => j.tableId === table.id).length, 0);
  assert.ok(w.serves.filter(s => s.orderId === command.orderId).every(s => s.tip === 0));
  assert.equal(w.serves.filter(s => s.orderId === command.orderId).length, table.group!.customers.length);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a completed recipe releases its burner at the exact timestamp for the next queued dish', () => {
  const g = kitchenGame(1); untilKitchen(g, () => kitchenStatus(g.world, g.config).jobs.some(j => j.state === 'queued'));
  const status = kitchenStatus(g.world, g.config), current = status.jobs.find(j => j.state === 'preparing')!, next = status.jobs.find(j => j.state === 'queued')!;
  const items = g.world.tables.flatMap(t => t.order?.items ?? []), item = items.find(i => i.id === current.itemId)!, queued = items.find(i => i.id === next.itemId)!;
  const at = item.readyAt!; g.advance(at - 1); assert.equal(item.state, 'preparing'); assert.equal(queued.state, 'pending');
  g.advance(at); assert.equal(item.state, 'ready'); assert.equal(queued.state, 'preparing');
  assert.equal(queued.readyAt, at + Math.round(g.config.values.menu[queued.dish].prepMs * g.config.values.upgrades.kitchen.prepMult[1]!));
  assert.equal(g.world.events.find(e => e.type === 'dish_ready' && e.data.itemId === item.id)!.at, at);
  assert.equal(kitchenStatus(g.world, g.config).busy, 1);
});
