import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src';

// Plan "Vui 3 ca" S5 (eco21-balance-pass): JSON 2.1.0 seals the numbers of the balance pass. They were found by the coordinate-descent sweep of
// packages/engine/sim/balance-sweep.ts and judged by the gate evaluator packages/engine/sim/balance-gates.ts (every gate green on seeds 42 and 99, evidence under
// artifacts/verification/feat-eco21-balance-pass/). The sim gates (`npm run sim`, `sim:onboarding`, `sim:rush`, `sim:career:gate`) are the proof that they work together;
// this file is the tripwire: a change to one of them has to be made on purpose, with the gate table re-run, and not slip in through a neighbouring edit.
const raw = config.raw, t = raw.upgrades.table;
const increasing = (list: readonly (number | null)[]) => list.filter((v): v is number => v !== null && v > 0).every((v, i, all) => !i || v > all[i - 1]);

test('2.1.0 is the sealed version and the first-shifts allowance is three shifts', () => {
  assert.equal(config.version, '2.1.0');
  assert.equal(raw.shift.noCooldownFirstShifts, 3);
});

test('the sealed economy numbers of the balance pass', () => {
  assert.equal(raw.tip.rate, 0.2);
  assert.equal(raw.shift.dailyEarnCapBase, 400000);
  assert.equal(raw.shift.startingCoinsBase, 700); // 1 750 coins: the end of shift 1 can always pay table 2 (min 1 734 over 60 runs)
  assert.equal(raw.locations.leaseDays, 3);
  assert.deepEqual(raw.locations.list.map(l => l.tableSlots), [4, 4, 5, 6, 6, 7, 8, 8, 8]);
  assert.deepEqual(raw.locations.list.map(l => l.mult), [1, 1.019, 1.038, 1.056, 1.075, 1.094, 1.112, 1.131, 1.15]);
  assert.deepEqual(t.tablePriceBase, [600, 2000, 4000, 7500, 12500, 20000, 31300]);
  assert.deepEqual(t.chairPriceBase, [10000, 15000, 22500, 30000, 40000, 50000, 60000, 70000]);
  assert.deepEqual(t.tableUpgrade.levels.map(l => [l.priceBase, l.stepBase]), [[8000, 3000], [20000, 8000], [35000, 12000]]);
  assert.deepEqual([t.chairUpgrade.priceBase, t.chairUpgrade.stepBase], [4000, 2000]);
  assert.deepEqual(raw.upgrades.keg.priceBase, [0, 2000, 8000, 16000, 60000]);
  assert.deepEqual(raw.upgrades.washer.priceBase, [0, 1500, 6500, 12000, 40000]);
  assert.deepEqual(raw.upgrades.cooler.priceBase, [0, 1250, 4750, 9000, 30000]);
  assert.deepEqual(raw.upgrades.stall.priceBase, [0, 500, 3250, 6000, 24000]);
  assert.deepEqual(raw.upgrades.kitchen.priceBase, [null, 4750, 20000, 32000, 80000]);
});

test('what the balance pass left as the earlier waves set it: door, patience, demand, group size, keg stock, rush warning', () => {
  assert.equal(raw.spawn.pPair, 0.5);
  assert.deepEqual([raw.spawn.capacityDemand.refTables, raw.spawn.capacityDemand.maxMult], [6, 4]);
  assert.deepEqual([raw.runtime.queueBaseSlots, raw.runtime.queueSeatsPerSlot], [1, 8]);
  assert.equal(raw.patience.thuongMs, 24000);
  assert.deepEqual(raw.upgrades.keg.kegStorage, [4, 7, 12, 20, 40]); assert.deepEqual(raw.upgrades.keg.kegBatch, [2, 3, 5, 8, 14]);
  assert.deepEqual(raw.upgrades.stall.stockCap, [15, 25, 45, 80, 150]);
  assert.equal(raw.rush.schedule.warningMs, 20000);
});

test('the life path ladder and the league ladder are one ladder, over one 21-day season', () => {
  assert.deepEqual(raw.lifePath.map(l => l.lifetimeBase), [0, 8000, 20000, 80000, 280000, 680000, 1200000, 2000000]);
  assert.deepEqual(raw.league.tiers.map(x => x.minSeasonEarnedBase), raw.lifePath.map(l => l.lifetimeBase));
  // The career gate starts on the first Vietnam midnight of a ranking season, so a season is exactly one window long for both periods.
  assert.deepEqual([raw.league.seasons.ranking.days, raw.league.seasons.contest.days], [21, 21]);
});

test('shape of the sealed numbers the gates lean on: ladders only go up, the fallback alley is free, every goal has a place', () => {
  assert.ok(increasing(t.tablePriceBase) && increasing(t.chairPriceBase), 'a later table or chair never costs less');
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const) assert.ok(increasing(raw.upgrades[kind].priceBase), `${kind}: a higher level never costs less`);
  const list = raw.locations.list;
  assert.equal(list[0].id, raw.locations.fallback); assert.equal(list[0].rentPerDayBase, 0); assert.equal(list[0].mult, 1);
  assert.ok(list.every((l, i) => !i || (l.mult > list[i - 1].mult && l.tableSlots >= list[i - 1].tableSlots)), 'the multiplier and the room only grow with the location');
  // LP1 "4 tables" fits the first alley; LP7 "10 seats" and the 8 tables of the table goal need an alley with at least 5 and 8 slots.
  assert.ok(list[0].tableSlots >= 4); assert.ok(Math.max(...list.map(l => l.tableSlots)) >= 8);
});
