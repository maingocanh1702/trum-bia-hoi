import assert from 'node:assert/strict';
import { Game, config as seedConfig, loadConfig, DISHES, dayKey, deliveryQuote, restockQuote, type Command } from '../src/index';

// config-exempt: measurement protocol and bot sampling, never production economy.
const SEEDS = [20260611, 42, 20260908, 7, 99], MIN_SERVED = 500, STEP_MS = 100, MAX_STEPS = 500000;
const restedStart = process.argv.includes('--well-rested'), qrStart = process.argv.includes('--qr'), shipperStart = process.argv.includes('--shipper');
const rows = [];
for (const kitchenLevel of [seedConfig.raw.runtime.initialKitchenLevel, seedConfig.raw.upgrades.kitchen.priceBase.length - 1]) {
  const raw = structuredClone(seedConfig.raw);
  raw.runtime.initialKitchenLevel = kitchenLevel;
  const config = loadConfig(raw);
for (const seed of SEEDS) {
  const game = new Game(config, seed, 0);
  const w = game.world;
  // Measurement starts with QR owned to isolate its service-price effect; real purchase is tested separately.
  if (qrStart) w.unlocks.push('qr');
  if (shipperStart) w.unlocks.push('phone');
  if (restedStart) game.advance(w.now + config.values.shift.wellRested.requiresRestHours * 3600000 + 1);
  const send = (command: Command) => game.command({ idempotencyKey: `sim-${game.log.length}`, at: w.now, command });
  let steps = 0;
  while (w.serves.length < MIN_SERVED && steps++ < MAX_STEPS) {
    if (w.phase === 'resting' && w.staminaMs >= config.values.shift.durationMs) {
      const start = send({ type: 'startShift' });
      if (!start.ok && start.reason === 'dailyShiftCap') {
        game.advance(w.now + 24 * 60 * 60 * 1000); // config-exempt: calendar unit conversion; the bot waits online
        continue;
      }
      assert.ok(start.ok, start.reason ?? 'Cannot start shift');
    }
    for (const dish of DISHES) {
      const quote = restockQuote(w, config, dish, 'bulk');
      if (quote.ok) send({ type: 'restock', dish, mode: 'bulk' });
      else if (w.inventory[dish] === 0 && restockQuote(w, config, dish, 'one').ok) send({ type: 'restock', dish, mode: 'one' });
    }
    if (DISHES.every(d => w.inventory[d] === 0)) send({ type: 'emergencyPack' });
    const ready = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'));
    ready.sort((a, b) => (a.order!.placedAt + a.order!.patienceMs) - (b.order!.placedAt + b.order!.patienceMs));
    const delivery = deliveryQuote(w, config);
    if (delivery?.ready) send({ type: 'serveDelivery', deliveryId: delivery.order.id });
    for (const t of ready) send({ type: 'serve', tableId: t.id, orderId: t.order!.id });
    game.advance(w.now + STEP_MS);
  }
  assert.ok(w.serves.length >= MIN_SERVED, `seed ${seed}: insufficient serves`);
  const mean = w.serves.reduce((sum, e) => sum + e.payment + e.tip, 0) / w.serves.length;
  const k = mean / config.values.k.anchorValuePerServe;
  const bonus = w.serves.reduce((sum, serve) => sum + (serve.wellRestedBonus ?? 0), 0);
  if (restedStart) assert.ok(bonus > 0, `seed ${seed}: the rested profile must exercise actual bonus credit`);
  const deliveries = w.events.filter(e => e.type === 'shipper_completed').length;
  if (shipperStart) assert.ok(deliveries > 0, `seed ${seed}: must complete an actual delivery`);
  rows.push({ profile: kitchenLevel ? 'full-menu' : 'cold-menu', seed, restedStart, qrStart, shipperStart, deliveries, bonus, serves: w.serves.length, mean: +mean.toFixed(2), k: +k.toFixed(4), stale: w.serves.filter(e => e.stale).length, days: Object.keys(w.dayShifts).length, configVersion: config.version, day: dayKey(w.now, config) });
}
}
console.table(rows);
for (const row of rows) assert.ok(row.k >= seedConfig.values.k.band[0] && row.k <= seedConfig.values.k.band[1], `seed ${row.seed}: k=${row.k} outside band`);
console.log('PASS: actual customer payment + tip / anchor; no throughput term, >=500 serves per seed in cold and fully unlocked menu profiles.');
