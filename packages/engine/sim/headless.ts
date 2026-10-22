import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, config as seedConfig, loadConfig, DISHES, flyerQuote, SIGN_STYLES, type SignStyle, dayKey, deliveryQuote, restockQuote, serveValueStats, type Command } from '../src/index';
import { furnishFirstAlley } from './scenario';

// config-exempt: measurement protocol and bot sampling, never production economy.
export const SEEDS = [20260611, 42, 20260908, 7, 99], MIN_SERVED = 1000, STEP_MS = 100, MAX_STEPS = 500000;
export interface StandardFlags { restedStart: boolean; qrStart: boolean; shipperStart: boolean; signStyle?: SignStyle; flyerStart: boolean }
export interface ArrivalRow { onboardingEnabled: boolean; profile: string; seed: number; spawned: number; rejected: number;
  forced: number; baselineGuests: number; baselineVip: number; expectedVip: number; counts: Record<string, number> }
export interface StandardRow { onboardingEnabled: boolean; flyerStart: boolean; campaigns: number; profile: string; seed: number; signStyle?: SignStyle; restedStart: boolean;
  qrStart: boolean; shipperStart: boolean; deliveries: number; bonus: number; serves: number; mean: number; k: number; stale: number; days: number; configVersion: string; day: string }

/**
 * One standard-profile measurement: >= MIN_SERVED serves of one seed in the cold-menu (kitchen level 0) or the full-menu profile, on `raw` (the bundled
 * economy by default). The k is the unchanged k = mean(payment + tip) / anchor over every serve of the run. Plan S5 re-seats the SCENARIO only: the shop
 * is the furnished first alley (scenario.ts) instead of the single table a new game starts with.
 */
export function measureStandard(raw0: typeof seedConfig.raw, kitchenLevel: number, onboardingEnabled: boolean, seed: number, flags: StandardFlags): { row: StandardRow; arrival: ArrivalRow } {
  const raw = structuredClone(raw0);
  raw.runtime.initialKitchenLevel = kitchenLevel;
  raw.onboarding.enabled = onboardingEnabled;
  const config = loadConfig(raw);
  const { restedStart, qrStart, shipperStart, signStyle, flyerStart } = flags;
  const game = new Game(config, seed, 0);
  const w = game.world;
  furnishFirstAlley(game);
  // Measurement starts with QR owned to isolate its service-price effect; real purchase is tested separately.
  if (qrStart) w.unlocks.push('qr');
  // Isolate the selected business mix; real install/purchase/re-equip is checked in signboard tests.
  if (signStyle) { w.unlocks.push('signboard', `signboard:${signStyle}`); w.signStyle = signStyle; }
  if (shipperStart) w.unlocks.push('phone');
  // Measurement wallet/gate isolates demand; command-level purchase and LP gates have focused checks.
  if (flyerStart) { w.lifePath = config.values.lifePath.findIndex(row => row.id === config.values.unlocks.flyer.gate); w.reputation = config.values.unlocks.flyer.repBase * config.values.unlocks.flyer.stockCap; }
  if (restedStart) game.advance(w.now + config.values.shift.wellRested.requiresRestHours * 3600000 + 1);
  const send = (command: Command) => game.command({ idempotencyKey: `sim-${game.log.length}`, at: w.now, command });
  const seenCustomers = new Set<string>(), seenShifts = new Set<string>(), counts: Record<string, number> = {};
  let finishedArrivals = 0, eventCursor = 0, spawned = 0, rejected = 0, forced = 0, baselineGuests = 0, baselineVip = 0, expectedVip = 0;
  const baselineWeights = Object.entries(config.values.customerTypes).filter(([, type]) => type.usesTable && type.weight > 0);
  const vipP = config.values.customerTypes.vip.weight / baselineWeights.reduce((sum, [, type]) => sum + type.weight, 0);
  let steps = 0;
  while (w.serves.length < MIN_SERVED && steps++ < MAX_STEPS) {
    if (w.phase === 'resting' && w.staminaMs >= config.values.shift.durationMs) {
      const previousArrivals = w.shift?.stats.arrived ?? 0;
      const start = send({ type: 'startShift' });
      if (!start.ok && start.reason === 'dailyShiftCap') {
        game.advance(w.now + 24 * 60 * 60 * 1000); // config-exempt: calendar unit conversion; the bot waits online
        continue;
      }
      assert.ok(start.ok, start.reason ?? 'Cannot start shift');
      finishedArrivals += previousArrivals;
    }
    if (flyerStart && w.phase === 'open' && !w.shift!.flyersUsed) {
      if (!flyerQuote(w, config).buyReason) send({ type: 'buyFlyer' });
      if (!flyerQuote(w, config).useReason) assert.ok(send({ type: 'activateFlyer', shiftId: w.shift!.id }).ok);
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
    for (const event of w.events.slice(eventCursor)) {
      if (event.type === 'queue_overflow') rejected += Number(event.data.size);
      if (event.type !== 'customer_spawned') continue;
      const group = [...w.queue, ...w.tables.flatMap(table => table.group ? [table.group] : [])].find(group => group.id === event.data.groupId);
      assert.ok(group, `seed ${seed}: arrival observer missed ${event.data.groupId}; reduce sampling step`);
      spawned += Number(event.data.size);
      assert.equal(group.customers.length, event.data.size);
      for (const customer of group.customers) {
        assert.ok(!seenCustomers.has(customer.id), `duplicate arrival ${customer.id}`);
        seenCustomers.add(customer.id);
        counts[customer.type] = (counts[customer.type] ?? 0) + 1;
      }
      const firstOnboarding = w.shift!.onboarding && !seenShifts.has(w.shift!.id);
      seenShifts.add(w.shift!.id);
      if (firstOnboarding) { forced += group.customers.length; continue; }
      // Only the unmodified sunny/non-rush/no-sign pool has denominator sum(raw weights).
      if (event.data.weather !== 'sunny' || event.data.rush !== 'none' || signStyle) continue;
      assert.deepEqual(config.values.weather.sunny.customerWeightMult, {}, 'baseline requires unmodified sunny weights');
      baselineGuests += group.customers.length;
      baselineVip += group.customers.filter(customer => customer.type === 'vip').length;
      // E[min(Binomial(group size, vipP), VIP cap)]: cap applies after the first VIP too.
      let combinations = 1;
      for (let vip = 0; vip <= group.customers.length; vip++) {
        expectedVip += Math.min(vip, config.values.customerTypes.vip.maxPerGroupPhase2) * combinations * vipP ** vip * (1 - vipP) ** (group.customers.length - vip);
        combinations *= (group.customers.length - vip) / (vip + 1);
      }
    }
    eventCursor = w.events.length;
  }
  assert.ok(w.serves.length >= MIN_SERVED, `seed ${seed}: insufficient serves`);
  assert.equal(seenCustomers.size, spawned, 'all admitted arrivals counted once, independent of service rounds');
  assert.equal(spawned + rejected, finishedArrivals + w.shift!.stats.arrived);
  const profile = kitchenLevel ? 'full-menu' : 'cold-menu';
  const arrival = { onboardingEnabled, profile, seed, spawned, rejected, forced, counts, baselineGuests, baselineVip, expectedVip: +expectedVip.toFixed(3) };
  const { mean, kValue: k } = serveValueStats(w.serves, config);
  assert.ok(mean !== null && k !== null, 'measured service value must be representable');
  const bonus = w.serves.reduce((sum, serve) => sum + (serve.wellRestedBonus ?? 0), 0);
  if (restedStart) assert.ok(bonus > 0, `seed ${seed}: the rested profile must exercise actual bonus credit`);
  const deliveries = w.events.filter(e => e.type === 'shipper_completed').length;
  if (shipperStart) assert.ok(deliveries > 0, `seed ${seed}: must complete an actual delivery`);
  const campaigns = w.events.filter(e => e.type === 'flyer_ended');
  if (flyerStart) { assert.ok(campaigns.length > 0); assert.ok(campaigns.some(e => Number(e.data.served) > 0)); }
  const row = { onboardingEnabled, flyerStart, campaigns: campaigns.length, profile, seed, signStyle, restedStart, qrStart, shipperStart, deliveries, bonus, serves: w.serves.length, mean: +mean.toFixed(2), k: +k.toFixed(4), stale: w.serves.filter(e => e.stale).length, days: Object.keys(w.dayShifts).length, configVersion: config.version, day: dayKey(w.now, config) };
  return { row, arrival };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const restedStart = process.argv.includes('--well-rested'), qrStart = process.argv.includes('--qr'), shipperStart = process.argv.includes('--shipper');
  const signStyle = process.argv.find(arg => arg.startsWith('--sign='))?.slice('--sign='.length) as SignStyle | undefined;
  if (signStyle && !SIGN_STYLES.includes(signStyle)) throw Error('Unknown sign style');
  const flyerStart = process.argv.includes('--flyer');
  const flags: StandardFlags = { restedStart, qrStart, shipperStart, signStyle, flyerStart };
  const rows: StandardRow[] = [];
  const arrivalRows: ArrivalRow[] = [];
  const onboardingModes = process.argv.includes('--onboarding-pair') ? [true, false] : [seedConfig.raw.onboarding.enabled];
  for (const onboardingEnabled of onboardingModes) {
    for (const kitchenLevel of [seedConfig.raw.runtime.initialKitchenLevel, seedConfig.raw.upgrades.kitchen.priceBase.length - 1]) {
      for (const seed of SEEDS) {
        const { row, arrival } = measureStandard(seedConfig.raw, kitchenLevel, onboardingEnabled, seed, flags);
        arrivalRows.push(arrival); rows.push(row);
      }
    }
  }
  console.table(rows);
  for (const row of rows) assert.ok(row.k >= seedConfig.values.k.band[0] && row.k <= seedConfig.values.k.band[1], `seed ${row.seed}: k=${row.k} outside band`);
  console.log('PASS: actual customer payment + tip / anchor; no throughput term, >=1000 serves per seed in cold and fully unlocked menu profiles.');

  console.log('VIP arrival census: spawned = admitted unique customers; rejected types are unknown; forced onboarding and modified pools are excluded from baseline.');
  console.table(arrivalRows.map(({ counts, ...row }) => ({ ...row, ...counts })));
  for (const onboardingEnabled of onboardingModes) for (const profile of ['cold-menu', 'full-menu']) {
    const cohort = arrivalRows.filter(row => row.onboardingEnabled === onboardingEnabled && row.profile === profile);
    const actual = cohort.reduce((sum, row) => sum + row.baselineVip, 0), expected = cohort.reduce((sum, row) => sum + row.expectedVip, 0);
    if (signStyle) continue; // Sign-specific distribution is covered by signboard.test.ts, not this baseline.
    assert.ok(expected > 0 && Math.abs(actual - expected) / expected <= 0.3, `${profile}, onboarding=${onboardingEnabled}: five-seed VIP baseline ${actual} vs expected ${expected}`); // config-exempt: Wave A3 measurement tolerance, not a production weight.
  }
  console.log(signStyle ? 'INFO: signed cohort reports arrivals only; baseline comparison excluded.' : 'PASS: five-seed VIP baseline agrees with configured weights and per-group cap; human shift-2 observation remains pending.');
}
