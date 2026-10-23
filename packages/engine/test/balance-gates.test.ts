import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src';
import { gateTable, failing, gateVerdict, score, formatGateTable, runShift1, wilson, patchedConfig, TARGETS, type CareerMetrics, type GateInputs, type Shift1Metrics, type StandardMetrics } from '../sim/balance-gates';
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
    // the bundled config seats singles only in shift 1 (JSON 2.1.4): no pair is turned away there (door.shift1 re-sealed by the founder, 2026-10-23)
    door: { bands: [band('shifts 1-24', 0.05), band('days 8-14', 0.15), band('days 15-21', 0.10)], shift1: { arrived: 19, rejected: 0, refusedPairs: 0, targetArrivals: 15, targetPairs: 0, ok: true }, complete: true, ok: true },
    capShift: 208, beer: { guests: 0, lost: 500, arrived: 9000, admitted: 7000, ofLost: 0, ofArrived: 0, ofAdmitted: 0 },
    end: { day: 30, shifts: 240, tables: 8, seats: 16, tableLevels: Array(8).fill(4), chairLevels: Array(8).fill(3), equipment: {}, location: 'pho_tay', reputation: 0, lifePath: 7, lifetimeEarned: 1, coins: 1, dogLevel: 0 },
    firstDays: [], ...over };
}
const standardRows = (seed: number, k = [2.4, 2.7, 2.4, 2.8]): StandardMetrics['rows'] => k.map((value, i) => ({ onboardingEnabled: i < 2, flyerStart: false, campaigns: 0, profile: i % 2 ? 'full-menu' : 'cold-menu', seed, restedStart: false,
  qrStart: false, shipperStart: false, deliveries: 0, bonus: 0, serves: 600, mean: 1, k: value, stale: 0, days: 1, configVersion: '2.1.0', day: '2026-09-09' }));
const shift1 = (over: Partial<Shift1Metrics> = {}): Shift1Metrics => ({ seeds: 60, price: 1500, startCoins: 750, cheapestDevice: 1500, closing: { min: 1800, p05: 1900, median: 2300, max: 3000 },
  afterRestock: { min: 1734, p05: 1800, median: 2306, max: 3000 }, below: 0, belowSlow: 0, served: { min: 10, median: 14 }, slowCoarse: { min: 1734, median: 2200 },
  plan: { shareFast: 1, shareSlow: 1, takingsMedian: 1000, takingsMedianSlow: 900, refusedPairsMedian: 10, refusedPairsMedianSlow: 9 }, ...over });
const inputs = (over: { [seed: number]: Partial<CareerMetrics> } = {}, standard = { 42: standardRows(42), 99: standardRows(99) } as Record<number, StandardMetrics['rows']>, s1 = shift1()): GateInputs => ({
  careers: { 42: career(42, over[42]), 99: career(99, over[99]) }, standard: { rows: [...standard[42], ...standard[99]] }, shift1: s1, config });

test('a career inside every target passes every gate row of the 23 on both seeds (22 gates and one information row)', () => {
  const rows = gateTable(inputs());
  assert.equal(rows.length, 23, '20 plan / brief B5 rows, the shift-1 information row (the strict reading), the shift-1 gate row (the owner\'s 4 runs in 5) and the first-goal row');
  assert.deepEqual(rows.map(r => r.id).filter(id => id.startsWith('shift1.')), ['shift1.wallet', 'shift1.plan', 'shift1.firstGoal']);
  assert.deepEqual(rows.filter(r => r.info).map(r => r.id), ['shift1.wallet'], 'one information row: the strict reading of P0');
  assert.deepEqual(failing(rows), []);
  assert.ok(rows.filter(r => !r.info).every(r => r.ok && r.pass[42] === true && r.pass[99] === true && r.violation[42] === 0 && r.violation[99] === 0));
  assert.deepEqual(score(rows), { fails: 0, violation: 0 });
  assert.deepEqual(TARGETS.lp7, [140, 170]); assert.deepEqual(TARGETS.chair1, [35, 56]); assert.equal(TARGETS.maxGap, 8); assert.equal(TARGETS.table4, 48);
  assert.equal(DOOR_TARGETS.shifts1to24, 0.10); assert.equal(DOOR_TARGETS.days8to14, 0.20); assert.equal(DOOR_TARGETS.days15to21, 0.15);
});

/** One doctored number per case: [row id that must fail, what to doctor on seed 99]. The same case on seed 42 must fail the same row there and leave seed 99 alone. */
const bad = (over: Partial<CareerMetrics>) => over;
const doctored: [string, string, Partial<CareerMetrics>][] = [
  ['k.gate', 'career k a hair above 3.5', { standard: { served: 25000, extraRoundServes: 2000, totalValue: 7.5e6, k: 3.501 } }],
  ['value.30d', '30-day value above 9.519 tr', { standard: { served: 25000, extraRoundServes: 2000, totalValue: 9.52e6, k: 3.3 } }],
  ['lp7', 'LP7 at shift 139 (too early)', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: 139 } })],
  ['lp7', 'LP7 at shift 171 (too late)', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: 171 } })],
  ['lp7', 'LP7 never', bad({ lp: { LP1: 20, LP2: 23, LP3: 45, LP4: 70, LP5: 100, LP6: 120, LP7: null } })],
  ['equip.max', 'equipment max at 171', { equipMax: 171 }],
  ['equip.max', 'equipment never maxed', { equipMax: null, equipMissing: ['kitchen'] }],
  ['tables.lv4x8', '8 tables at Lv4 at 171', { lv4x8: 171 }],
  ['tables.lv4x8', '8 tables at Lv4 never', { lv4x8: null }],
  ['table4', 'table 4 at 49', { table4: 49 }],
  ['chair1', 'first second chair at 34 (too early)', { chair1: 34 }],
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
  ['door.shift1', 'shift 1: 14 arrivals', bad({ door: { ...career(1).door, shift1: { arrived: 14, rejected: 0, refusedPairs: 0, targetArrivals: 15, targetPairs: 0, ok: false } } })],
  ['door.shift1', 'shift 1: 1 refused pair although it seats singles only', bad({ door: { ...career(1).door, shift1: { arrived: 19, rejected: 2, refusedPairs: 1, targetArrivals: 15, targetPairs: 0, ok: false } } })],
  ['cap', 'daily cap reached at shift 149', { capShift: 149 }],
  ['beer', 'beer running out takes 10 % of the leavers', { beer: { guests: 50, lost: 500, arrived: 9000, admitted: 7000, ofLost: 0.1, ofArrived: 0.005, ofAdmitted: 0.007 } }],
];

test('door.shift1 on a config whose shift 1 draws pairs keeps the S3 target of at least 5 refused pairs; the bundled one (singles in shift 1) asks for none (founder 2026-10-23)', () => {
  const pairs = { ...inputs(), config: patchedConfig({ 'spawn.singlesFirstShifts': 0 }) };
  const pairShift = (refusedPairs: number) => ({ door: { ...career(1).door, shift1: { arrived: 19, rejected: 2 * refusedPairs, refusedPairs, targetArrivals: 15, targetPairs: 5, ok: refusedPairs >= 5 } } });
  const row = (i: GateInputs) => gateTable(i).find(r => r.id === 'door.shift1')!;
  assert.equal(row(inputs()).target, '>= 15 / = 0 (singles only)');
  assert.equal(row(pairs).target, `>= 15 / >= ${DOOR_TARGETS.firstShiftRefusedPairs}`);
  assert.equal(row({ ...pairs, careers: { 42: career(42, pairShift(5)), 99: career(99, pairShift(5)) } }).ok, true, '5 refused pairs pass the S3 target');
  assert.equal(row({ ...pairs, careers: { 42: career(42, pairShift(4)), 99: career(99, pairShift(5)) } }).pass[42], false, '4 refused pairs fail it');
  assert.equal(row({ ...inputs(), careers: { 42: career(42, pairShift(5)), 99: career(99) } }).pass[42], false, 'with singles in shift 1 a refused pair fails');
});

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

test('npm run sim:balance ends red when a gate row fails and green when only the information row is unmet (review 07 r1: the exit code, not only the printed line)', () => {
  assert.deepEqual(gateVerdict(gateTable(inputs())), { failing: [], exitCode: 0 }, 'every gate inside its target: exit 0');
  for (const [id, , change] of [doctored[0], doctored[10], doctored[17]]) assert.deepEqual(gateVerdict(gateTable(inputs({ 99: change }))), { failing: [id], exitCode: 1 }, `${id} red: exit 1`);
  const strictOnly = gateTable(inputs({}, undefined, shift1({ afterRestock: { min: 1499, p05: 1800, median: 2306, max: 3000 }, below: 1 })));
  assert.match(strictOnly.find(r => r.id === 'shift1.wallet')!.cells[42], /information, not a gate: not met/, 'the strict reading is not met');
  assert.deepEqual(gateVerdict(strictOnly), { failing: [], exitCode: 0 }, 'an unmet information row never makes the command red');
});

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

test('the shift-1 rows: the start wallet must not buy table 2, four runs in five must be able to buy it, the strict reading is information, and no device may be cheaper', () => {
  const only = (id: string, s1: Shift1Metrics) => { const rows = gateTable(inputs({}, undefined, s1)); assert.deepEqual(failing(rows), [id]); return rows.find(r => r.id === id)!; };
  const paid = gateTable(inputs({}, undefined, shift1({ startCoins: 1500 })));
  assert.deepEqual(failing(paid), ['shift1.plan'], 'a start wallet that pays table 2 before shift 1 fails the gate row (P0 is earned, not given); the information row never fails');
  assert.equal(paid.find(r => r.id === 'shift1.plan')!.pass[42], false);
  // owner decision 1: the strict reading (every run ends with the price after the restock) is INFORMATION, printed with its verdict and never a gate
  const strict = gateTable(inputs({}, undefined, shift1({ afterRestock: { min: 1499, p05: 1800, median: 2306, max: 3000 }, below: 1 })));
  assert.deepEqual(failing(strict), [], 'one run in 60 ends 1 xu short: the strict reading is information, the gate row asks 4 runs in 5');
  const info = strict.find(r => r.id === 'shift1.wallet')!;
  assert.equal(info.info, true); assert.equal(info.ok, true); assert.equal(info.pass[42], null); assert.equal(info.violation[42], 0);
  assert.match(info.cells[42], /information, not a gate: not met/); assert.match(gateTable(inputs()).find(r => r.id === 'shift1.wallet')!.cells[42], /information, not a gate: met/);
  assert.match(gateTable(inputs({}, undefined, shift1({ afterRestock: { min: 700, p05: 1800, median: 2306, max: 3000 }, slowCoarse: { min: 700, median: 2200 }, below: 3, belowSlow: 3 }))).find(r => r.id === 'shift1.wallet')!.cells[42],
    /no price above the start wallet can be met: the worst run ends at 700, below 750/, 'the reason the strict reading is information');
  assert.equal(only('shift1.firstGoal', shift1({ cheapestDevice: 1499 })).pass[42], false, 'a device level cheaper than table 2 pre-empts the first goal');
  // the information row is printed as INFO, with no (x), and counts in neither the list of failing gates nor the score
  const lines = formatGateTable(strict, [42, 99]), infoLine = lines.find(l => l.startsWith('shift 1: every run'))!;
  assert.ok(infoLine.endsWith(' | INFO') && !infoLine.includes('(x)'), infoLine);
  assert.deepEqual(score(strict), { fails: 0, violation: 0 });
});

test("the shift-1 gate row is the owner's criterion, at least 4 runs in 5 can buy table 2 when the shift closes (the worse service model decides); the takings and refused-pairs bands of the plan's narrative are information and never fail it", () => {
  const T = TARGETS.shift1Plan;
  assert.equal(T.share, 0.8); assert.deepEqual(T.takings, [850, 1160]); assert.deepEqual(T.refusedPairs, [8, 12]);
  const only = (id: string, plan: Partial<Shift1Metrics['plan']>, rest: Partial<Shift1Metrics> = {}) => {
    const base = shift1().plan, rows = gateTable(inputs({}, undefined, shift1({ plan: { ...base, ...plan }, ...rest })));
    return { rows, row: rows.find(r => r.id === id)!, failing: failing(rows) };
  };
  // the share: 48 of 60 runs is exactly 4 in 5, 47 is not; the worse of the two service models decides
  assert.deepEqual(only('shift1.plan', { shareFast: 48 / 60, shareSlow: 48 / 60 }).failing, [], '48 of 60 runs close with table 2 in hand: 4 in 5 exactly');
  const short = only('shift1.plan', { shareFast: 47 / 60 }); assert.deepEqual(short.failing, ['shift1.plan']); assert.equal(short.row.pass[42], false); assert.equal(short.row.pass[99], false);
  assert.ok(short.row.violation[42] > 0 && short.row.violation[42] < 0.05, 'the violation is the share missing, so a sweep can climb it');
  assert.deepEqual(only('shift1.plan', { shareSlow: 40 / 60 }).failing, ['shift1.plan'], 'the 4 s service model counts as much as the fast one');
  assert.deepEqual(only('shift1.plan', { shareFast: 0.79 }).failing, ['shift1.plan'], '79 % fails'); assert.deepEqual(only('shift1.plan', { shareFast: 0.81, shareSlow: 0.81 }).failing, [], '81 % passes');
  // the median takings and the median refused pairs are INFORMATION: a flag in the cell, never a failing gate (a price cannot move them)
  for (const [takings, flag] of [[850, 'in band'], [1160, 'in band'], [849, 'out of band'], [1161, 'out of band'], [542, 'out of band'], [1292, 'out of band']] as const) {
    const r = only('shift1.plan', { takingsMedian: takings });
    assert.deepEqual(r.failing, [], `median takings ${takings} never fails the gate`); assert.ok(r.row.ok && r.row.violation[42] === 0);
    assert.match(r.row.cells[42], new RegExp(`information: median takings ${takings} \\(4 s \\d+; plan section 0: 850-1160, ${flag}\\)`));
  }
  for (const [pairs, flag] of [[8, 'in band'], [12, 'in band'], [7, 'out of band'], [13, 'out of band'], [5, 'out of band'], [16, 'out of band']] as const) {
    const r = only('shift1.plan', { refusedPairsMedian: pairs });
    assert.deepEqual(r.failing, [], `median refused pairs ${pairs} never fails the gate`); assert.ok(r.row.ok && r.row.violation[42] === 0);
    assert.match(r.row.cells[42], new RegExp(`median refused pairs ${pairs} \\(plan: about ten, read as 8-12, ${flag}\\)`));
  }
  // the strict reading is information too: 10 of 60 runs short of the price change nothing in the gate
  const strict = gateTable(inputs({}, undefined, shift1({ below: 10, afterRestock: { min: 1200, p05: 1300, median: 2306, max: 3000 } })));
  assert.deepEqual(failing(strict), [], 'the strict row is information');
  assert.equal(strict.find(r => r.id === 'shift1.plan')!.ok, true);
});

test('the shift-1 probe reads the numbers of the plan from the same runs as the strict row: shares of the closing wallet, the takings median and the refused pairs', () => {
  const m = runShift1(config, 6), p = m.plan;
  assert.equal(m.seeds, 6); assert.equal(m.startCoins, 750);
  for (const share of [p.shareFast, p.shareSlow]) assert.ok(Number.isInteger(Math.round(share * 6)) && Math.abs(share * 6 - Math.round(share * 6)) < 1e-9 && share >= 0 && share <= 1, 'a share of 6 runs is a multiple of 1/6');
  assert.equal(p.takingsMedian, m.closing.median - m.startCoins, 'the takings are the closing wallet of the fast model minus the start wallet');
  assert.ok(p.shareFast >= 1 - m.below / 6 - 1e-9, 'a run that closes below the price also ends below it after the restock, so the strict count can only be the larger one');
  assert.ok(Number.isInteger(p.refusedPairsMedian) && p.refusedPairsMedian >= 0 && Number.isInteger(p.refusedPairsMedianSlow) && p.refusedPairsMedianSlow >= 0);
});

test('the shift-1 probe counts 300 runs by default and every share prints its 95 % Wilson interval (review round 3: 48 of 60 reads 68-88 %)', () => {
  assert.equal(TARGETS.shift1Seeds, 300);
  const near = (x: number, y: number) => Math.abs(x - y) < 0.005;
  const a = wilson(48, 60); assert.ok(near(a.lo, 0.68) && near(a.hi, 0.88), `48 of 60: ${a.lo} - ${a.hi}`);
  const b = wilson(207, 300); assert.ok(near(b.lo, 0.636) && near(b.hi, 0.739), `207 of 300: ${b.lo} - ${b.hi}`);
  const c = wilson(79, 300); assert.ok(near(c.lo, 0.217) && near(c.hi, 0.315), `79 of 300: ${c.lo} - ${c.hi}`);
  assert.equal(wilson(0, 60).lo, 0); assert.ok(wilson(60, 60).hi > 0.999999); assert.deepEqual(wilson(0, 0), { lo: 0, hi: 1 });
  assert.ok(wilson(80, 300).hi - wilson(80, 300).lo < wilson(16, 60).hi - wilson(16, 60).lo, 'five times the probes, a narrower interval');
  const row = (k: number) => gateTable(inputs({}, undefined, shift1({ seeds: 300, plan: { ...shift1().plan, shareFast: k / 300, shareSlow: k / 300 } }))).find(r => r.id === 'shift1.plan')!;
  assert.equal(row(240).ok, true, '240 of 300 is exactly 4 in 5'); assert.equal(row(239).ok, false);
  assert.match(row(207).cells[42], /69 % of 300 runs close with >= 1500 \(95 % CI 64-74 %; fast 207\/300, 4 s 207\/300\)/, 'the cell says n, the share and its interval');
  assert.equal(row(207).ok, false, 'the point estimate decides the row, the interval is information');
});
