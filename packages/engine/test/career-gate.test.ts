import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, config, loadConfig, tableBenefit, upgradeQuote, buyGlassQuote, restockQuote, DISHES, EQUIPMENT, WEATHER, type Command, type SeedConfig } from '../src';
import { normalisedServes, normalisedStats, type NormalisedServe } from '../sim/normalised';
import { simulateCareer, assertAdvancedCareerK, assertAdvancedCareerValue, advancedGateSample, advancedKBasis, ADVANCED_TOTAL_VALUE_BASELINE, ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE } from '../sim/career';
import { serveNext } from '../sim/policy';
import { steadyDemand } from './fixtures/steady-demand';

// Plan "Vui 3 ca" S5 / D4(a) (04-SPEC section 5): the advanced-career k gate measures the STANDARD order (beer + the first snack): a second snack, the Lv4
// table tip and an extra round are bonus levers and are taken out; the second gate bounds the total value of 30 days to +10 % of the 8.35 tr baseline.
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `cg-${g.log.length}` });
const must = (g: Game, command: Command) => { const r = send(g, command); assert.ok(r.ok, `${command.type}: ${r.reason}`); return r; };

/**
 * Four two-chair tables of Lv4 / Lv3 / Lv2 / Lv1 on the bundled seed (a patched copy: ordinary guests only, every pair orders a snack, every Lv3+ guest a
 * second one, one round unless the level adds one), every device at its top level and a full rack of glasses, so the pipeline never starves a table.
 */
function levelledShop() {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 4000000;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0; raw.onboarding.enabled = false;
  for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === 'thuong' ? 1 : 0;
  raw.spawn.pPair = 1; raw.demandMix.pSecondRound = 0; raw.upgrades.table.orderShape.pair.pMoi = 1;
  raw.spawn.baseMs = raw.rush.none.floorMs = 1500;
  for (const row of raw.upgrades.table.tableUpgrade.levels) if (row.pExtraMoi > 0) row.pExtraMoi = 1;
  steadyDemand(raw);
  const g = new Game(loadConfig(raw), 42, T0), w = g.world;
  while (w.tables.length < 4) must(g, { type: 'buyTable' });
  for (const table of w.tables) must(g, { type: 'buyChair', tableId: table.id });
  w.lifePath = 4;
  for (const kind of EQUIPMENT) if (kind !== 'kitchen') while (upgradeQuote(w, g.config, kind).ok) must(g, { type: 'upgrade', kind });
  const glasses = buyGlassQuote(w, g.config, 1); if (glasses.ok) must(g, { type: 'buyGlass', count: glasses.capacity - glasses.owned });
  [3, 2, 1, 0].forEach((levels, index) => { for (let i = 0; i < levels; i++) must(g, { type: 'upgradeTable', tableId: w.tables[index].id }); });
  assert.deepEqual(w.tables.map(t => t.level), [4, 3, 2, 1]);
  return g;
}

test('the standard order is beer plus the first snack: a second snack and the Lv4 tip are taken out, an extra round is not counted, a Lv1 table is untouched', () => {
  const g = levelledShop(), w = g.world, c = g.config.values;
  must(g, { type: 'startShift' });
  const seen: { level: number; round: number; extra: boolean; dishes: number; actual: { payment: number; tip: number }; norm: { payment: number; tip: number } }[] = [];
  const end = w.now + 600000;
  while (w.now < end) {
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    // The same moment the bot serves: look at what the command is about to pay, then let the engine pay it.
    serveNext(g, command => {
      if (command.type !== 'serve') { send(g, command); return; }
      const table = w.tables.find(t => t.id === command.tableId)!, order = table.order!, group = table.group!, guests = group.customers.length;
      const norm = normalisedServes(w, g.config, table.id), serves = w.serves.length;
      assert.equal(norm.length, guests, 'one standard-order value per guest of the table');
      const level = group.level!, round = table.roundsServed, tipMult = tableBenefit(c, level).tipMult;
      must(g, command);
      for (const [i, customer] of group.customers.entries()) {
        const record = w.serves[serves + i]; assert.equal(record.customerId, customer.id); assert.equal(norm[i].customerId, customer.id);
        seen.push({ level, round, extra: norm[i].extraRound, dishes: order.items.filter(item => item.customerId === customer.id).length,
          actual: { payment: record.payment, tip: record.tip }, norm: { payment: norm[i].payment, tip: norm[i].tip } });
        assert.ok(tipMult === 1 || level === 4, 'only a Lv4 table tips x1.25');
      }
    });
    g.advance(w.now + 100);
  }
  assert.ok(seen.length > 150, `enough serves to see every kind (${seen.length})`);
  for (const row of seen.filter(s => s.level === 1)) {
    assert.deepEqual(row.norm, row.actual, 'a Lv1 table: the standard order is the order paid, to the coin');
    assert.equal(row.extra, false); assert.equal(row.dishes, 2, 'beer and one snack');
  }
  for (const row of seen.filter(s => s.level >= 3)) assert.equal(row.dishes, 3, 'Lv3 and Lv4 guests order a second snack here (pExtraMoi 1)');
  const secondSnack = seen.filter(s => s.level >= 3 && !s.extra);
  assert.ok(secondSnack.length > 20 && secondSnack.every(s => s.norm.payment < s.actual.payment), 'the second snack is taken out of the payment');
  const lv3 = secondSnack.filter(s => s.level === 3 && s.actual.tip > 0), lv4 = secondSnack.filter(s => s.level === 4 && s.actual.tip > 0);
  assert.ok(lv3.length > 5 && lv4.length > 5);
  // The tip of the standard order is the plain formula on the standard payment: round(payment x rate), sunny, no rush, no QR, an ordinary guest.
  const rate = c.tip.rate;
  for (const row of [...lv3, ...lv4]) assert.equal(row.norm.tip, Math.round(row.norm.payment * rate), 'the tip is recomputed on the standard payment, without the table factor');
  const lv4Mult = tableBenefit(c, 4).tipMult; assert.ok(lv4Mult > 1);
  for (const row of lv4) assert.equal(row.actual.tip, Math.round(Math.round(row.actual.payment * rate) * lv4Mult), 'while the real Lv4 tip carries its factor on the full payment');
  for (const level of [2, 3, 4]) {
    const rows = seen.filter(s => s.level === level);
    assert.ok(rows.some(s => s.extra) && rows.every(s => s.extra === (s.round >= 1)), `Lv${level}: the round after the first is the extra one (the group's base is one round)`);
  }
  assert.ok(seen.filter(s => s.level === 1).every(s => !s.extra));
});

test('normalisedStats counts the standard serves only and keeps k as mean value per serve over the anchor', () => {
  const serves: NormalisedServe[] = [
    { customerId: 'a', payment: 100, tip: 20, extraRound: false }, { customerId: 'b', payment: 50, tip: 0, extraRound: false },
    { customerId: 'c', payment: 999, tip: 999, extraRound: true }, { customerId: 'd', payment: 150, tip: 30, extraRound: false },
  ];
  const stats = normalisedStats(serves, 82.5);
  assert.deepEqual([stats.served, stats.extraRoundServes, stats.totalValue], [3, 1, 350]);
  assert.equal(stats.mean, 350 / 3); assert.equal(stats.kValue, 350 / 3 / 82.5);
  assert.deepEqual(normalisedStats([], 82.5), { served: 0, extraRoundServes: 0, totalValue: 0, mean: null, kValue: null }, 'no serve: no invented ratio');
});

test('a career report carries the standard-order twin of the k measurement: every serve is counted or is an extra round, and the value never exceeds the raw one', () => {
  const { report } = simulateCareer({ days: 2, seed: 42, config: loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig });
  const n = report.normalised;
  assert.equal(n.served + n.extraRoundServes, report.value.served, 'a partition of the serve records');
  assert.ok(n.totalValue <= report.value.totalValue!, 'the standard order is worth at most what was paid');
  assert.ok(n.kValue !== null && Number.isFinite(n.kValue) && n.mean !== null);
  assert.equal(report.value.kValue, report.value.totalValue! / report.value.served / config.values.k.anchorValuePerServe, 'the raw measurement is untouched: mean value per serve over the anchor');
  const levelled = report.purchases.some(p => p.command === 'upgradeTable');
  if (!levelled) assert.equal(n.totalValue, report.value.totalValue, 'no table level bought: the standard order is the order paid, to the coin');
});

test('the total-value gate: 30 days of standard orders stay within +10 % of the 8.35 tr baseline, on every seed', () => {
  assert.equal(ADVANCED_TOTAL_VALUE_BASELINE, 8350000); assert.equal(ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE, 0.1);
  const limit = 9185000;
  const samples = [{ seed: 42, days: 30, totalValue: limit }, { seed: 99, days: 30, totalValue: 8000000 }];
  assert.doesNotThrow(() => assertAdvancedCareerValue(samples));
  assert.throws(() => assertAdvancedCareerValue([samples[0], { ...samples[1], totalValue: limit + 1 }]), /total value/);
  assert.throws(() => assertAdvancedCareerValue([{ ...samples[0], days: 29 }, samples[1]]), /requires/);
  assert.throws(() => assertAdvancedCareerValue([samples[0], { ...samples[1], totalValue: NaN }]), /requires/);
  assert.throws(() => assertAdvancedCareerValue([samples[0]]), /distinct RNG seeds/);
});

test('the gate reads the standard order from config 2.1.0 on and the raw k of the older definition before it (04-SPEC section 5)', () => {
  assert.equal(advancedKBasis('2.1.0'), 'standard-order'); assert.equal(advancedKBasis('2.1.1'), 'standard-order'); assert.equal(advancedKBasis('2.1.2'), 'standard-order'); assert.equal(advancedKBasis('2.10.0'), 'standard-order');
  assert.equal(advancedKBasis('2.0.23'), 'raw'); assert.equal(advancedKBasis('2.0.4'), 'raw'); assert.equal(advancedKBasis('1.7.3'), 'raw');
  const report = { seed: 42, days: 30, configVersion: '2.1.0', rows: [{ lifePath: 4 }], value: { served: 31000, kValue: 5.5, totalValue: 14e6 },
    normalised: { served: 24000, extraRoundServes: 7000, totalValue: 8.5e6, mean: 354, kValue: 4.29 } };
  assert.deepEqual(advancedGateSample(report), { seed: 42, days: 30, lifePath: 4, served: 24000, k: 4.29, totalValue: 8.5e6, basis: 'standard-order', rawK: 5.5, rawTotalValue: 14e6 });
  assert.deepEqual(advancedGateSample({ ...report, configVersion: '2.0.23' }), { seed: 42, days: 30, lifePath: 4, served: 31000, k: 5.5, totalValue: 14e6, basis: 'raw', rawK: 5.5, rawTotalValue: 14e6 });
  // The old gate itself is unchanged: raw samples in, the soft cap 3.5 out.
  assert.doesNotThrow(() => assertAdvancedCareerK([{ seed: 42, days: 30, lifePath: 4, served: 29209, k: 3.48 }, { seed: 99, days: 30, lifePath: 4, served: 28259, k: 3.31 }]));
});
