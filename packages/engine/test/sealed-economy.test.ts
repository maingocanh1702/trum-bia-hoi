import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src';

// Plan "Vui 3 ca" S5 (eco21-balance-pass): JSON 2.1.0 seals the numbers of the balance pass. They were found for the plan's own acceptance bot (seats and chairs first, direct
// leasing, no dog, seeds 42 and 99, a start on 2026-09-09) by the designed table ladder (packages/engine/sim/solve-ladder.ts), the random and coordinate-descent searches of
// packages/engine/sim/balance-sweep.ts / balance-grid.ts and judged by the gate evaluator packages/engine/sim/balance-gates.ts (`npm run sim:balance`: every gate row green on
// seeds 42 and 99, the owner's price of table 2 included, see the shift-1 test below; evidence under artifacts/verification/feat-eco21-balance-pass/). The sim gates (`npm run sim`,
// `sim:onboarding`, `sim:rush`, `sim:career:gate`) are the proof that they work together; this file is the tripwire: a change to one of them has to be made on purpose, with the
// gate table re-run, and not slip in through a neighbouring edit.
const raw = config.raw, t = raw.upgrades.table;
const increasing = (list: readonly (number | null)[]) => list.filter((v): v is number => v !== null && v > 0).every((v, i, all) => !i || v > all[i - 1]);

test('the bundled label is 2.1.1 (the balance pass sealed under 2.1.0, unchanged, plus the founder\'s kickTable price of 2026-10-22) and the first-shifts allowance is three shifts', () => {
  assert.equal(config.version, '2.1.1'); // owner call 1: a ninth content of 2.1.0 needed a new label (DECISIONS `## 07 · owner calls 2026-10-22`)
  assert.equal(raw.kickTable.feeRate, 0.5); // the only number 2.1.1 changes; every assertion below is the balance pass of 2.1.0
  assert.equal(raw.shift.noCooldownFirstShifts, 3);
});

test('the sealed economy numbers of the balance pass', () => {
  assert.equal(raw.tip.rate, 0.17);
  assert.equal(raw.shift.dailyEarnCapBase, 400000); // D24, the owner's number: no gate row needs another
  assert.equal(raw.shift.startingCoinsBase, 300); // 750 coins, the wallet of S4: below table 2's 1 070, see the shift-1 test below
  assert.equal(raw.locations.leaseDays, 3); // the brief's lease (B5, DESIGN-story section 3)
  assert.deepEqual(raw.locations.list.map(l => l.tableSlots), [8, 8, 8, 8, 8, 8, 8, 8, 8]);
  assert.deepEqual(raw.locations.list.map(l => l.rentPerDayBase), [0, 1200, 2000, 3000, 4200, 5400, 7200, 9600, 13200]);
  assert.deepEqual(raw.locations.list.map(l => l.mult), [1, 1.012, 1.025, 1.038, 1.05, 1.063, 1.075, 1.088, 1.1]);
  assert.deepEqual(t.tablePriceBase, [428, 3700, 5700, 9600, 12900, 15900, 16000]); // table 2 = 428 base = 1 070 xu: the owner's price (owner decision 1 of S5), see the shift-1 test below
  assert.deepEqual(t.chairPriceBase, [400, 600, 900, 1200, 1600, 2000, 2400, 2800]);
  assert.equal(t.chairsAfterTables, 4);
  assert.deepEqual(t.tableUpgrade.levels.map(l => [l.priceBase, l.stepBase]), [[7000, 2500], [34000, 13500], [59500, 20500]]);
  assert.deepEqual([t.chairUpgrade.priceBase, t.chairUpgrade.stepBase], [12000, 6000]);
  assert.deepEqual(raw.upgrades.keg.priceBase, [0, 2000, 7750, 38750, 146750]);
  assert.deepEqual(raw.upgrades.washer.priceBase, [0, 1500, 6250, 29500, 97750]);
  assert.deepEqual(raw.upgrades.cooler.priceBase, [0, 1250, 4500, 22500, 73250]);
  assert.deepEqual(raw.upgrades.stall.priceBase, [0, 750, 3250, 14250, 59000]); // Lv2 above table 2's price: see the first-purchase test below
  assert.deepEqual(raw.upgrades.kitchen.priceBase, [null, 4500, 19500, 78500, 195500]);
});

test('what the balance pass left as the earlier waves set it: door, patience, demand, group size, keg stock, rush warning, the three table-level benefits', () => {
  assert.equal(raw.spawn.pPair, 0.5);
  assert.deepEqual([raw.spawn.capacityDemand.refTables, raw.spawn.capacityDemand.maxMult], [6, 4]);
  assert.deepEqual([raw.runtime.queueBaseSlots, raw.runtime.queueSeatsPerSlot], [1, 8]);
  assert.equal(raw.patience.thuongMs, 24000);
  assert.deepEqual(raw.upgrades.keg.kegStorage, [4, 7, 12, 20, 40]); assert.deepEqual(raw.upgrades.keg.kegBatch, [2, 3, 5, 8, 14]);
  assert.deepEqual(raw.upgrades.stall.stockCap, [15, 25, 45, 80, 150]);
  assert.equal(raw.rush.schedule.warningMs, 20000);
  assert.deepEqual(t.tableUpgrade.levels.map(l => [l.extraRounds, l.pExtraMoi, l.tipMult, l.lifePathGate]), [[1, 0, 1, 1], [1, 0.35, 1, 2], [1, 0.35, 1.25, 4]]);
});

test('the life path ladder and the league ladder are one ladder, the owner\'s 8 k ... 2 tr, over one 21-day season', () => {
  assert.deepEqual(raw.lifePath.map(l => l.lifetimeBase), [0, 8000, 20000, 80000, 280000, 680000, 1200000, 2000000]);
  assert.deepEqual(raw.league.tiers.map(x => x.minSeasonEarnedBase), raw.lifePath.map(l => l.lifetimeBase));
  // The career gate starts on 2026-09-09, inside a 21-day ranking season that ends with career day 18: a season is exactly one window long for both periods.
  assert.deepEqual([raw.league.seasons.ranking.days, raw.league.seasons.contest.days], [21, 21]);
});

test('shape of the sealed numbers the gates lean on: ladders only go up, the fallback alley is free, every goal has a place', () => {
  assert.ok(increasing(t.tablePriceBase) && increasing(t.chairPriceBase), 'a later table or chair never costs less');
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const) assert.ok(increasing(raw.upgrades[kind].priceBase), `${kind}: a higher level never costs less`);
  const list = raw.locations.list;
  assert.equal(list[0].id, raw.locations.fallback); assert.equal(list[0].rentPerDayBase, 0); assert.equal(list[0].mult, 1);
  assert.ok(list.every((l, i) => !i || (l.mult > list[i - 1].mult && l.tableSlots >= list[i - 1].tableSlots && l.rentPerDayBase > list[i - 1].rentPerDayBase)), 'the multiplier, the room and the rent only grow with the location');
  // Every alley holds the whole ladder: LP1 "4 tables", LP7 "10 seats" and the 8 tables of the table goal need no better place than the first.
  assert.ok(list.every(l => l.tableSlots === 8)); assert.equal(t.tablePriceBase.length, 8 - 1); assert.equal(t.chairPriceBase.length, 8);
});

test('the first purchase of a new shop stays table 2: no device level costs less than it, so the goal chip never prefers a device', () => {
  // The chip suggests what an average shift reaches, capacity lane first (apps/web/src/goals.ts), so a device level that costs less than table 2 pre-empts it on the first
  // shifts whose takings are between a third of the two prices: the Upgrades sheet then holds the device's card and the guest and playable journeys find no "Mua bàn" button.
  // The gate shift1.firstGoal of the balance evaluator asks the same thing of any candidate set.
  const table2 = t.tablePriceBase[0];
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const) {
    const cheapest = Math.min(...(raw.upgrades[kind].priceBase as readonly (number | null)[]).filter((p): p is number => p !== null && p > 0));
    assert.ok(cheapest >= table2, `${kind}: its cheapest level (${cheapest} base) costs less than table 2 (${table2} base)`);
  }
});

test('the starting wallet does not afford table 2: a new save EARNS its first table in shift 1 (plan section 0, P0; the owner\'s price)', () => {
  // "Kết ca 1: mua bàn 2 (850-1.160 xu + 750 khởi đầu)": the wallet at the start of shift 1 is 750 coins and the player earns the difference. A wallet that pays table 2 at second zero
  // (700 base in the first seal of S5) took that beat away for a row of the economy table, which review round 1 of S5 refused. Owner decision 1 of S5 (the founder, 2026-10-21): shift 1
  // must earn enough to buy table 2 and the mechanism is its price, 428 base = 1 070 xu, the highest round price at which at least 4 runs in 5 can buy it when shift 1 closes (the gate
  // row shift1.plan of the balance evaluator, 300 probes, confirmed over 600: both service models) with every other gate row green on seeds 42 and 99. The price was 1 500 xu until then;
  // the old line "the wallet pays at most half of it" cannot hold (750 is 70 % of 1 070) and is replaced by "shift 1 still has to earn at least 300 xu".
  const wallet = config.values.shift.startingCoinsBase, table2 = config.values.upgrades.table.tablePriceBase[0];
  assert.equal(wallet, 750); assert.equal(table2, 1070);
  assert.ok(wallet < table2, `the start wallet (${wallet}) is below table 2 (${table2})`);
  assert.ok(table2 - wallet >= 300, 'shift 1 still has to earn at least 300 xu before table 2 is affordable');
});
