import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateCareer, type CareerShift } from '../sim/career';
import { doorTable, doorLines, DOOR_TARGETS } from '../sim/door';

// Plan S3 acceptance table: % of guests who left WITH a penalty by band, and what shift 1 shows at the door. The input is the career report.
const shift = (n: number, arrived: number, lost: number, rejected: number, noSeat: number): CareerShift => ({ shift: n, day: Math.ceil(n / 8), arrived, served: arrived - lost - rejected, lost, rejected, noSeat, penalty: 0 });
const day = (d: number, arrived: number, lost: number, rejected: number) => ({ day: d, shifts: 8, arrived, lost, rejected });

test('doorTable reports lost / arrived and lost / admitted per band, the stricter reading decides, shift 1 counts arrivals and refused pairs', () => {
  const shiftStats = Array.from({ length: 24 }, (_, i) => i === 0 ? shift(1, 20, 0, 12, 12) : shift(i + 1, 20, 2, 8, 0));
  const rows = Array.from({ length: 21 }, (_, i) => day(i + 1, 100, i + 1 >= 15 ? 12 : 18, 20));
  const t = doorTable({ rows, shiftStats });
  assert.deepEqual(t.bands.map(b => b.band), ['shifts 1-24', 'days 8-14', 'days 15-21']);
  const [early, mid, late] = t.bands;
  // 24 shifts: 480 arrived, 288 admitted (192 refused), 46 left with a penalty
  assert.deepEqual([early.shifts, early.arrived, early.rejected, early.lost], [24, 440 + 40, 12 + 23 * 8, 46]);
  assert.equal(early.lostOfArrived, 46 / 480); assert.equal(early.lostOfAdmitted, 46 / (480 - 196)); assert.equal(early.ok, false, '16.2 % of admitted guests is above 10 %');
  // days 8-14: 700 arrived, 560 admitted, 126 lost -> 22.5 % of the admitted, above 20 %
  assert.deepEqual([mid.shifts, mid.arrived, mid.rejected, mid.lost], [56, 700, 140, 126]); assert.equal(mid.lostOfAdmitted, 126 / 560); assert.equal(mid.ok, false);
  // days 15-21: 84 lost of 560 admitted = exactly 15 %: the target is inclusive
  assert.deepEqual([late.arrived, late.rejected, late.lost], [700, 140, 84]); assert.equal(late.lostOfAdmitted, 0.15); assert.equal(late.ok, true);
  assert.deepEqual(t.shift1, { arrived: 20, rejected: 12, refusedPairs: 6, targetArrivals: DOOR_TARGETS.firstShiftArrivals, targetPairs: DOOR_TARGETS.firstShiftRefusedPairs, ok: true });
  assert.equal(t.complete, true); assert.equal(t.ok, false, 'one band out of target fails the whole table');
  const lines = doorLines(t); assert.equal(lines.length, 4); assert.match(lines[0], /shifts 1-24: arrived 480 .* 9\.6% of arrivals · 16\.2% of admitted guests \(target <= 10\.0%\) FAIL/); assert.match(lines[3], /shift 1: arrived 20 \(>= 15\) · refused pairs 6 \(>= 5\) PASS/);
});

test('doorTable passes when every band and shift 1 are inside the targets, and says so when the run is too short to cover a band', () => {
  const clean = Array.from({ length: 24 }, (_, i) => shift(i + 1, 20, 1, 4, i === 0 ? 10 : 0));
  const rows = Array.from({ length: 21 }, (_, i) => day(i + 1, 100, 5, 20));
  const t = doorTable({ rows, shiftStats: clean });
  assert.equal(t.ok, true); assert.ok(t.bands.every(b => b.ok));
  assert.equal(doorTable({ rows: rows.slice(0, 14), shiftStats: clean }).complete, false, 'fourteen days do not cover days 15-21');
  assert.deepEqual(doorTable({ rows: rows.slice(0, 14), shiftStats: clean }).bands.map(b => b.band), ['shifts 1-24', 'days 8-14']);
  assert.deepEqual(doorTable({ rows: rows.slice(0, 10), shiftStats: clean }).bands.map(b => b.band), ['shifts 1-24'], 'a band needs all of its days');
  assert.equal(doorTable({ rows, shiftStats: [shift(1, 14, 0, 12, 12), ...clean.slice(1)] }).shift1!.ok, false, '14 arrivals are below 15');
  assert.equal(doorTable({ rows, shiftStats: [shift(1, 20, 0, 8, 8), ...clean.slice(1)] }).shift1!.refusedPairs, 4, '8 guests are four pairs, below 5');
  assert.equal(doorTable({ rows, shiftStats: [] }).shift1, null); assert.equal(doorTable({ rows: [], shiftStats: [] }).ok, false);
  assert.equal(doorTable({ rows: [day(1, 0, 0, 0)], shiftStats: [shift(1, 0, 0, 0, 0)] }).shift1!.ok, false, 'no arrivals: no division by zero');
});

test('a real career day reports one stats row per closed shift and they add up to the day row', () => {
  const { report } = simulateCareer({ days: 1, seed: 42 });
  assert.deepEqual(report.shiftStats.map(s => [s.shift, s.day]), Array.from({ length: 8 }, (_, i) => [i + 1, 1]));
  for (const key of ['arrived', 'lost', 'rejected'] as const) assert.equal(report.shiftStats.reduce((n, s) => n + s[key], 0), report.rows[0][key], key);
  assert.ok(report.shiftStats.every(s => s.noSeat <= s.rejected && s.noSeat % 2 === 0), 'noSeat counts the guests of whole pairs and is part of rejected');
  const t = doorTable(report);
  assert.equal(t.complete, false, 'one day covers no band'); assert.equal(t.bands.length, 0); assert.equal(t.shift1!.arrived, report.shiftStats[0].arrived);
});
