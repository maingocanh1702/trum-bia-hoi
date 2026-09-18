import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRENT_RULES, Game, config, loadConfig, DISHES, WEATHER, deliveryBundles, deliveryInterval, deliveryQuote, dayKey, kickAllQuote, encodeSave, decodeSave, type Command, type Economy, type Weather } from '../src';
const origin = Date.parse('2026-09-08T10:00:00Z');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `ship-${g.log.length}` });
function owner({ weather = 'sunny', buy = true, rested = false, at = origin, patch = (_: Economy) => {} }: { weather?: Weather; buy?: boolean; rested?: boolean; at?: number; patch?: (c: Economy) => void } = {}) {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 100000; raw.lifePath[1].lifetimeBase = 1; raw.lifePath[2].lifetimeBase = 2;
  raw.spawn.baseMs = raw.shift.durationMs * 2; // Leave the guaranteed onboarding customer; isolate delivery resource effects afterward.
  for (const name of WEATHER) raw.weather[name].weight = name === weather ? 1 : 0;
  patch(raw); const g = new Game(loadConfig(raw), 42, at);
  for (const command of [{ type: 'upgrade', kind: 'stall' }, { type: 'restock', dish: 'lac', mode: 'full' }, { type: 'upgradeDog', level: 1 }] as const) assert.equal(send(g, command).ok, true);
  if (rested) g.advance(g.world.now + raw.shift.wellRested.requiresRestHours * 3600000 + 1);
  assert.equal(send(g, { type: 'startShift' }).ok, true); g.advance(g.world.now + 11000);
  const t = g.world.tables.find(t => t.order)!; assert.equal(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok, true);
  if (buy) assert.equal(send(g, { type: 'buyUnlock', item: 'phone' }).ok, true);
  return g;
}
function arrive(g: Game) { g.advance(g.world.nextDeliveryAt!); assert.ok(g.world.delivery); return deliveryQuote(g.world, g.config)!; }
function fill(g: Game) { for (const line of g.world.delivery!.lines) if (g.world.inventory[line.dish] < line.quantity) assert.equal(send(g, { type: 'restock', dish: line.dish, mode: 'full' }).ok, true); }

test('configured bundles respect final menu prices, all kitchen unlocks, count and gross bounds', () => {
  for (let kitchen = 0; kitchen < config.values.upgrades.kitchen.priceBase.length; kitchen++) {
    const bundles = deliveryBundles(config.values, kitchen, config.values.customerTypes.shipper.grossBase); assert.ok(bundles.length);
    for (const bundle of bundles) {
      const units = bundle.lines.reduce((n, line) => n + line.quantity, 0);
      assert.ok(units >= 4 && units <= 7); assert.ok(bundle.gross >= 450 && bundle.gross <= 725);
      assert.equal(bundle.gross, bundle.lines.reduce((n, line) => n + line.quantity * config.values.menu[line.dish].price, 0));
      assert.ok(bundle.lines.every(line => line.quantity > 0 && config.values.menu[line.dish].unlock.kitchenLevel <= kitchen));
      assert.equal(new Set(bundle.lines.map(line => line.dish)).size, bundle.lines.length);
    }
  }
  for (const patch of [
    (c: Economy) => { c.customerTypes.shipper.grossBase = [1, 2]; },
    (c: Economy) => { c.customerTypes.shipper.orderLines = [7, 4]; },
    (c: Economy) => { c.customerTypes.shipper.orderLines = [4, Number.MAX_SAFE_INTEGER]; },
    (c: Economy) => { c.customerTypes.shipper.netRate = 1.1; },
    (c: Economy) => { c.weather.rain.shipperMult = 0; },
    (c: Economy) => { c.customerTypes.shipper.requires = 'invented'; },
  ]) { const raw = structuredClone(config.raw); patch(raw); assert.throws(() => loadConfig(raw), /config:/); }
});

test('a retargeted QR gate cannot replace the required phone for shipper access', () => {
  const raw = structuredClone(config.raw); raw.unlocks.qr.gate = ['LP1', 'LP2'];
  assert.doesNotThrow(() => loadConfig(raw));
  raw.customerTypes.shipper.requires = 'qr';
  assert.throws(() => loadConfig(raw), /^Error: config:shipper$/);
});

test('actual v6 phone-owned history stays inert until a current command arms a future delivery', () => {
  const saved = readFileSync(new URL('./fixtures/legacy-shipper-v6.json', import.meta.url), 'utf8');
  const expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-shipper-v6-expected.json', import.meta.url), 'utf8'));
  const g = decodeSave(saved), w = g.world;
  assert.equal(w.now, expected.now); assert.equal(w.coins, expected.coins); assert.equal(w.lifetimeEarned, expected.lifetime); assert.equal(w.nextId, expected.nextId);
  assert.deepEqual(w.inventory, expected.inventory); assert.deepEqual(w.events, JSON.parse(saved).events); assert.deepEqual(g.log.at(-1)!.result, expected.result);
  assert.equal(w.delivery, null); assert.equal(w.nextDeliveryAt, null);
  send(g, { type: 'activity', active: true }); assert.equal(g.log.at(-1)!.rulesVersion, CURRENT_RULES);
  assert.equal(w.nextDeliveryAt, w.now + deliveryInterval(w, g.config));
  const end = w.nextDeliveryAt!, small = decodeSave(encodeSave(g));
  while (small.world.now < end) small.advance(Math.min(end, small.world.now + 1000));
  g.advance(end); assert.deepEqual(small.world, w); assert.ok(w.delivery);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('phone bought midshift starts its timer then; weather multiplies delivery frequency, not interval', () => {
  for (const weather of WEATHER) {
    const g = owner({ weather, buy: false }); g.advance(g.world.now + 60000);
    assert.equal(g.world.nextDeliveryAt, null); assert.equal(g.world.delivery, null);
    send(g, { type: 'buyUnlock', item: 'phone' });
    const next = g.world.nextDeliveryAt!;
    assert.equal(next - g.world.now, Math.round(220000 / config.values.weather[weather].shipperMult));
    g.advance(next - 1); assert.equal(g.world.delivery, null); g.advance(next); assert.ok(g.world.delivery);
    assert.equal(deliveryQuote(g.world, g.config)!.order.expiresAt - next, 45000);
  }
});

test('delivery handoff requires every ingredient and debits once without tables, glasses or seated k records', () => {
  const g = owner(), q = arrive(g), w = g.world;
  const missing = q.lines.at(-1)!; w.inventory[missing.dish] = 0;
  let before = structuredClone(w);
  assert.deepEqual(send(g, { type: 'serveDelivery', deliveryId: q.order.id }), { ok: false, reason: 'deliveryStock' }); assert.deepEqual(w, before);
  fill(g); const quoted = deliveryQuote(w, g.config)!; before = structuredClone(w);
  const envelope = { command: { type: 'serveDelivery', deliveryId: q.order.id } as const, at: w.now, idempotencyKey: 'one-handoff' };
  assert.deepEqual(g.command(envelope), { ok: true, amount: quoted.net });
  assert.equal(w.coins - before.coins, quoted.net); assert.equal(w.lifetimeEarned - before.lifetimeEarned, quoted.net); assert.equal(w.seasonEarned - before.seasonEarned, quoted.net);
  assert.equal(w.reputation - before.reputation, config.values.reputation.serveNoTip);
  for (const dish of DISHES) assert.equal(before.inventory[dish] - w.inventory[dish], q.lines.find(line => line.dish === dish)?.quantity ?? 0);
  assert.deepEqual(w.glasses, before.glasses); assert.deepEqual(w.tables, before.tables); assert.deepEqual(w.queue, before.queue); assert.deepEqual(w.serves, before.serves);
  assert.equal(w.delivery, null); assert.equal(w.shift!.stats.deliveryCompleted, 1);
  before = structuredClone(w); assert.equal(g.command(envelope).ok, true); assert.deepEqual(w, before);
  assert.deepEqual(send(g, envelope.command), { ok: false, reason: 'deliveryGone' }); assert.deepEqual(w, before);
});

test('pending delivery blocks paid kick-all and final closure; exact deadline charges the available coins only', () => {
  const g = owner(), q = arrive(g), w = g.world;
  assert.equal(kickAllQuote(w, g.config).deliveryBlocked, true);
  const before = structuredClone(w);
  assert.deepEqual(send(g, { type: 'kickAll', shiftId: w.shift!.id, maxCost: Number.MAX_SAFE_INTEGER }), { ok: false, reason: 'deliveryPending' }); assert.deepEqual(w, before);
  assert.equal(send(g, { type: 'endShift' }).ok, true); assert.equal(w.phase, 'closing'); assert.equal(w.nextDeliveryAt, null);
  w.coins = 1; const rep = w.reputation, lost = w.shift!.stats.lost, stock = structuredClone(w.inventory);
  g.advance(q.order.expiresAt);
  assert.equal(w.phase, 'resting'); assert.equal(w.delivery, null); assert.equal(w.coins, 0); assert.equal(w.reputation, rep); assert.equal(w.shift!.stats.lost, lost); assert.deepEqual(w.inventory, stock);
  const missed = w.events.filter(e => e.type === 'shipper_missed'); assert.equal(missed.length, 1); assert.equal(missed[0].data.penalty, 1); assert.equal(missed[0].data.reputation, 0);
  assert.deepEqual(send(g, { type: 'serveDelivery', deliveryId: q.order.id }), { ok: false, reason: 'deliveryGone' }); assert.equal(w.shift!.stats.deliveryMissed, 1);
});

test('hidden delivery time and requested closing replay a successful handoff without phantom arrivals', () => {
  const g = owner(), q = arrive(g), w = g.world; fill(g);
  send(g, { type: 'activity', active: false }); const remaining = q.order.expiresAt - w.now, next = w.nextDeliveryAt!;
  g.advance(w.now + 3600000); assert.equal(w.delivery!.expiresAt - w.now, remaining); assert.equal(w.nextDeliveryAt, next + 3600000);
  send(g, { type: 'activity', active: true }); send(g, { type: 'endShift' });
  assert.equal(w.phase, 'closing'); assert.equal(send(g, { type: 'serveDelivery', deliveryId: q.order.id }).ok, true); assert.equal(w.phase, 'resting');
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  assert.equal(w.events.filter(e => e.type === 'shipper_arrived').length, 1);
});

test('table and delivery handoffs share the service ceiling; a busy delivery never accumulates a backlog', () => {
  const g = owner({ patch: c => { c.customerTypes.shipper.spawnIntervalMs = 10; } }), q = arrive(g); fill(g);
  const before = structuredClone(g.world);
  assert.deepEqual(send(g, { type: 'serveDelivery', deliveryId: q.order.id }), { ok: false, reason: 'serveCooldown' }); assert.deepEqual(g.world, before);
  g.advance(g.world.lastServedAt! + Math.ceil(1000 / g.config.values.spawn.playerServeCeilingPerSec));
  assert.equal(g.world.events.filter(e => e.type === 'shipper_arrived').length, 1);
  assert.equal(g.world.delivery!.id, q.order.id);
  assert.equal(send(g, { type: 'serveDelivery', deliveryId: q.order.id }).ok, true);
  assert.equal(g.world.events.filter(e => e.type === 'shipper_arrived').length, 2);
  const next = g.world.delivery!; assert.notEqual(next.id, q.order.id); fill(g);
  assert.deepEqual(send(g, { type: 'serveDelivery', deliveryId: next.id }), { ok: false, reason: 'serveCooldown' });
  assert.equal(g.world.shift!.stats.deliveryCompleted, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('stamina exhaustion stops arrivals but keeps the last delivery available until handoff', () => {
  const g = owner({ patch: c => { c.customerTypes.shipper.spawnIntervalMs = c.shift.durationMs - 12000; } }), q = arrive(g); fill(g);
  g.advance(g.world.shift!.endsAt);
  assert.equal(g.world.phase, 'closing'); assert.equal(g.world.nextDeliveryAt, null); assert.equal(g.world.delivery!.id, q.order.id);
  assert.ok(deliveryQuote(g.world, g.config)!.remainingMs > 0);
  assert.equal(send(g, { type: 'serveDelivery', deliveryId: q.order.id }).ok, true);
  assert.equal(g.world.phase, 'resting'); assert.equal(g.world.events.filter(e => e.type === 'shipper_arrived').length, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('delivery uses the actual day cap, rested bonus, midnight bucket and safe aggregate preflight', () => {
  const rested = owner({ rested: true }), boosted = arrive(rested); fill(rested);
  assert.ok(boosted.bonus > 0); const before = rested.world.coins;
  assert.equal(send(rested, { type: 'serveDelivery', deliveryId: boosted.order.id }).amount, boosted.net + boosted.bonus);
  assert.equal(rested.world.coins - before, boosted.net + boosted.bonus); assert.equal(rested.world.shift!.stats.deliveryBonus, boosted.bonus);
  assert.deepEqual(decodeSave(encodeSave(rested)).world, rested.world);
  const capped = owner({ rested: true, patch: c => { c.shift.dailyEarnCapBase = 40; } }), capOrder = arrive(capped); fill(capped);
  const old = capped.world.dayEarned[dayKey(capped.world.now, capped.config)];
  assert.equal(send(capped, { type: 'serveDelivery', deliveryId: capOrder.order.id }).amount, capped.config.values.shift.dailyEarnCapBase - old);
  assert.equal(capped.world.shift!.stats.deliveryBonus, 0); assert.equal(capped.world.dayEarned[dayKey(capped.world.now, capped.config)], 100);
  const midnight = owner({ at: Date.parse('2026-09-08T16:59:00Z'), patch: c => { c.shift.dailyEarnCapBase = 40; } });
  const oldDay = dayKey(midnight.world.now, midnight.config), oldEarned = midnight.world.dayEarned[oldDay], delivery = arrive(midnight); fill(midnight);
  const newDay = dayKey(midnight.world.now, midnight.config); assert.notEqual(newDay, oldDay);
  assert.equal(send(midnight, { type: 'serveDelivery', deliveryId: delivery.order.id }).amount, 100); assert.equal(midnight.world.dayEarned[oldDay], oldEarned);
  for (const field of ['coins', 'seasonEarned', 'lifetimeEarned'] as const) {
    const g = owner(), q = arrive(g); fill(g); g.world[field] = Number.MAX_SAFE_INTEGER; const snapshot = structuredClone(g.world);
    assert.deepEqual(send(g, { type: 'serveDelivery', deliveryId: q.order.id }), { ok: false, reason: 'rewardOverflow' }); assert.deepEqual(g.world, snapshot);
  }
});
