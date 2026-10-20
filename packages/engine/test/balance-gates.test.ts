import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src';
import { gateTable, failing, score, TARGETS, type CareerMetrics, type GateInputs, type Shift1Metrics, type StandardMetrics } from '../sim/balance-gates';
import { DOOR_TARGETS, type DoorBand } from '../sim/door';

/**
 * The gate table of plan S5 is the yardstick of the balance pass (S6, fun-kick-table and stage 07 must "not break the S5 gates"), so the yardstick itself is pinned: a
 * hand-written career that sits inside every target passes every row, and one doctored number per rule family fails exactly its own row, on its own seed, and no other.
 * `gateTable` is pure (metrics in, rows out); the careers it judges are run by `npm run sim:balance`.
 */
const band = (name: string, lostOfAdmitted: number): DoorBand => ({ band: name, shifts: 56, arrived: 1000, rejected: 200, lost: Math.round(800 * lostOfAdmitted), lostOfArrived: lostOfAdmitted * 0.8, lostOfAdmitted, target: 0, ok: true });
function career(seed: number, over: Partial<CareerMetrics> = {}): CareerMetrics {
  return { seed, days: 30, configVersion: '2.1.0', commandHash: `hash-${seed}`,
    raw: { served: 30000, totalValue: 15e6, k: 4.5 }, standard: { served: 25000, extraRoundServes: 2000, totalValue: 7.5e6, k: 3.3 },
    lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: 142 }, table4: 20, chair1: 45, lv2: 46, lv4: 100, lv4x8: 144, equipMax: 122, equipMissing: [],
    purchases: 100, maxGap: { shifts: 5, after: 10, next: 15 },
    door: { bands: [band('shifts 1-24', 0.05), band('days 8-14', 0.15), band('days 15-21', 0.10)], shift1: { arrived: 19, rejected: 8, refusedPairs: 5, targetArrivals: 15, targetPairs: 5, ok: true }, complete: true, ok: true },
    capShift: 208, beer: { guests: 0, lost: 500, arrived: 9000, admitted: 7000, ofLost: 0, ofArrived: 0, ofAdmitted: 0 },
    end: { day: 30, shifts: 240, tables: 8, seats: 16, tableLevels: Array(8).fill(4), chairLevels: Array(8).fill(3), equipment: {}, location: 'pho_tay', reputation: 0, lifePath: 7, lifetimeEarned: 1, coins: 1, dogLevel: 0 },
    firstDays: [], ...over };
}
const standardRows = (seed: number, k = [2.4, 2.7, 2.4, 2.8]): StandardMetrics['rows'] => k.map((value, i) => ({ onboardingEnabled: i < 2, flyerStart: false, campaigns: 0, profile: i % 2 ? 'full-menu' : 'cold-menu', seed, restedStart: false,
  qrStart: false, shipperStart: false, deliveries: 0, bonus: 0, serves: 600, mean: 1, k: value, stale: 0, days: 1, configVersion: '2.1.0', day: '2026-09-09' }));
const shift1 = (over: Partial<Shift1Metrics> = {}): Shift1Metrics => ({ seeds: 60, price: 1500, startCoins: 750, cheapestDevice: 1500, closing: { min: 1800, p05: 1900, median: 2300, max: 3000 },
  afterRestock: { min: 1734, p05: 1800, median: 2306, max: 3000 }, below: 0, belowSlow: 0, served: { min: 10, median: 14 }, slowCoarse: { min: 1734, median: 2200 }, ...over });
const inputs = (over: { [seed: number]: Partial<CareerMetrics> } = {}, standard = { 42: standardRows(42), 99: standardRows(99) } as Record<number, StandardMetrics['rows']>, s1 = shift1()): GateInputs => ({
  careers: { 42: career(42, over[42]), 99: career(99, over[99]) }, standard: { rows: [...standard[42], ...standard[99]] }, shift1: s1, config });

test('a career inside every target passes every one of the 22 rows on both seeds', () => {
  const rows = gateTable(inputs());
  assert.equal(rows.length, 22, '21 plan / brief B5 rows plus the first-goal row');
  assert.deepEqual(failing(rows), []);
  assert.ok(rows.every(r => r.ok && r.pass[42] === true && r.pass[99] === true && r.violation[42] === 0 && r.violation[99] === 0));
  assert.deepEqual(score(rows), { fails: 0, violation: 0 });
  assert.deepEqual(TARGETS.lp7, [140, 170]); assert.deepEqual(TARGETS.chair1, [40, 56]); assert.equal(TARGETS.maxGap, 8); assert.equal(TARGETS.table4, 48);
  assert.equal(DOOR_TARGETS.shifts1to24, 0.10); assert.equal(DOOR_TARGETS.days8to14, 0.20); assert.equal(DOOR_TARGETS.days15to21, 0.15);
});

/** One doctored number per case: [row id that must fail, what to doctor on seed 99]. The same case on seed 42 must fail the same row there and leave seed 99 alone. */
const bad = (over: Partial<CareerMetrics>) => over;
const doctored: [string, string, Partial<CareerMetrics>][] = [
  ['k.gate', 'career k a hair above 3.5', { standard: { served: 25000, extraRoundServes: 2000, totalValue: 7.5e6, k: 3.501 } }],
  ['value.30d', '30-day value above 9.185 tr', { standard: { served: 25000, extraRoundServes: 2000, totalValue: 9.2e6, k: 3.3 } }],
  ['lp7', 'LP7 at shift 139 (too early)', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: 139 } })],
  ['lp7', 'LP7 at shift 171 (too late)', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: 171 } })],
  ['lp7', 'LP7 never', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: null } })],
  ['equip.max', 'equipment max at 171', { equipMax: 171 }],
  ['equip.max', 'equipment never maxed', { equipMax: null, equipMissing: ['kitchen'] }],
  ['tables.lv4x8', '8 tables at Lv4 at 171', { lv4x8: 171 }],
  ['tables.lv4x8', '8 tables at Lv4 never', { lv4x8: null }],
  ['table4', 'table 4 at 49', { table4: 49 }],
  ['chair1', 'first second chair at 39 (too early)', { chair1: 39 }],
  ['chair1', 'first second chair at 57 (too late)', { chair1: 57 }],
  ['lv2', 'first table Lv2 at 57', { lv2: 57 }],
  ['lv4', 'first table Lv4 at 121', { lv4: 121 }],
  ['lp1+2', 'LP2 at 49', bad({ lp: { LP1: 20, LP2: 49, LP3: 50, LP4: 70, LP5: 100, LP6: 120, LP7: 142 } })],
  ['lp3+4', 'LP4 at 97', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 97, LP5: 100, LP6: 120, LP7: 142 } })],
  ['lp5', 'LP5 at 121', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 121, LP6: 125, LP7: 142 } })],
  ['gap', 'nine shifts without a purchase', { maxGap: { shifts: 9, after: 20, next: 29 } }],
  ['door.shifts1-24', 'shifts 1-24: 10.1 % left with a penalty', bad({ door: { ...career(1).door, bands: [band('shifts 1-24', 0.101), band('days 8-14', 0.15), band('days 15-21', 0.10)] } })],
  ['door.days8-14', 'days 8-14: 20.1 %', bad({ door: { ...career(1).door, bands: [band('shifts 1-24', 0.05), band('days 8-14', 0.201), band('days 15-21', 0.10)] } })],
  ['door.days15-21', 'days 15-21: 15.1 %', bad({ door: { ...career(1).door, bands: [band('shifts 1-24', 0.05), band('days 8-14', 0.15), band('days 15-21', 0.151)] } })],
  ['door.days15-21', 'a career too short to cover days 15-21', bad({ door: { ...career(1).door, bands: [band('shifts 1-24', 0.05), band('days 8-14', 0.15)] } })],
  ['door.shift1', 'shift 1: 14 arrivals', bad({ door: { ...career(1).door, shift1: { arrived: 14, rejected: 8, refusedPairs: 5, targetArrivals: 15, targetPairs: 5, ok: false } } })],
  ['door.shift1', 'shift 1: 4 refused pairs', bad({ door: { ...career(1).door, shift1: { arrived: 19, rejected: 8, refusedPairs: 4, targetArrivals: 15, targetPairs: 5, ok: false } } })],
  ['cap', 'daily cap reached at shift 149', { capShift: 149 }],
  ['beer', 'beer running out takes 10 % of the leavers', { beer: { guests: 50, lost: 500, arrived: 9000, admitted: 7000, ofLost: 0.1, ofArrived: 0.005, ofAdmitted: 0.007 } }],
];

for (const [id, what, change] of doctored) {
  test(`gateTable FAILS row ${id} when ${what}, on that seed only and on no other row`, () => {
    for (const [seed, other] of [[99, 42], [42, 99]] as const) {
      const rows = gateTable(inputs({ [seed]: change })), row = rows.find(r => r.id === id)!;
      assert.equal(row.pass[seed], false, `${id} on seed ${seed}`); assert.equal(row.pass[other], true, `${id} stays green on seed ${other}`); assert.equal(row.ok, false);
      assert.ok(row.violation[seed] > 0 && row.violation[other] === 0);
      assert.deepEqual(failing(rows), [id], 'exactly this row fails');
      assert.equal(score(rows).fails, 1); assert.ok(score(rows).violation > 0);
    }
  });
}

test('the daily cap and the beer row read their rules as written: "or never" and "< 10 %"', () => {
  assert.deepEqual(failing(gateTable(inputs({ 42: { capShift: null }, 99: { capShift: 150 } }))), [], 'never reaching the cap, or at shift 150 exactly, passes');
  assert.deepEqual(failing(gateTable(inputs({ 42: { beer: { guests: 49, lost: 500, arrived: 9000, admitted: 7000, ofLost: 0.0999, ofArrived: 0, ofAdmitted: 0 } } }))), [], '9.99 % is below 10 %');
});

test('the standard k row fails below 2.0 and above 3.0 on any of its four measurements, per seed', () => {
  for (const k of [[3.01, 2.7, 2.4, 2.8], [2.4, 1.99, 2.4, 2.8], [2.4, 2.7, 2.4, 3.2], [2.4, 2.7, 1.5, 2.8]]) {
    const rows = gateTable(inputs({}, { 42: standardRows(42), 99: standardRows(99, k) })), row = rows.find(r => r.id === 'k.standard')!;
    assert.equal(row.pass[99], false, `k ${k.join(' ')}`); assert.equal(row.pass[42], true); assert.deepEqual(failing(rows), ['k.standard']);
  }
  assert.deepEqual(failing(gateTable(inputs({}, { 42: standardRows(42, [2.0, 3.0, 2.0, 3.0]), 99: standardRows(99) }))), [], '2.0 and 3.0 are inside the band');
});

test('the shift-1 rows: the start wallet must not buy table 2, every run must earn it, and no device may be cheaper', () => {
  const only = (id: string, s1: Shift1Metrics) => { const rows = gateTable(inputs({}, undefined, s1)); assert.deepEqual(failing(rows), [id]); return rows.find(r => r.id === id)!; };
  const bought = only('shift1.wallet', shift1({ startCoins: 1500 })); assert.equal(bought.pass[42], false, 'a start wallet of 1 500 xu pays table 2 before shift 1: P0');
  assert.equal(only('shift1.wallet', shift1({ afterRestock: { min: 1499, p05: 1800, median: 2306, max: 3000 }, below: 1 })).pass[42], false, 'one run in 60 ends 1 xu short');
  const slow = only('shift1.wallet', shift1({ slowCoarse: { min: 1000, median: 2000 }, belowSlow: 7 })); assert.equal(slow.pass[99], false, 'the 4 s service model counts as much as the fast one');
  assert.ok(slow.violation[42] > 0 && slow.violation[42] <= 1, 'the violation is the share of runs that end short (7 of 60), so a sweep can climb it');
  assert.equal(only('shift1.firstGoal', shift1({ cheapestDevice: 1499 })).pass[42], false, 'a device level cheaper than table 2 pre-empts the first goal');
});
