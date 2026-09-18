import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, dayKey, nextDayAt } from '../src';

// v6-sim-career-memory. dayKey() built a fresh Intl.DateTimeFormat on every call. Each one owns a
// native ICU formatter that V8 does not count in heapUsed and only releases when the wrapper is
// finalised by a major GC -- so a hot loop that calls dayKey() per step (career.ts, quests,
// nextDayAt's own 27-step binary search) grew RSS by hundreds of MB per simulated day while the
// JS heap stayed under 40MB. Measured on a 3-day career: heapUsed 38MB, RSS 1.43GB, and a forced
// GC returned 500MB at once. The fix is a per-timezone formatter cache; the output is the same
// formatter's output, so no day key, boundary or rollover can change.

const tz = config.values.shift.dayRollover.tz;
const stamps = [
  Date.parse('2026-09-09T00:00:00+07:00'), Date.parse('2026-09-09T16:59:59.999Z'), Date.parse('2026-09-09T17:00:00Z'),
  Date.parse('2026-12-31T23:59:59.999+07:00'), Date.parse('2027-01-01T00:00:00+07:00'), Date.parse('2028-02-29T12:00:00+07:00'),
];

test('dayKey reuses one formatter per timezone instead of constructing one per call', () => {
  const Original = Intl.DateTimeFormat;
  let constructed = 0;
  const Counting = function (this: unknown, ...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
    constructed++; return new Original(...args);
  } as unknown as typeof Intl.DateTimeFormat;
  Object.setPrototypeOf(Counting, Original);
  Object.defineProperty(Counting, 'prototype', { value: Original.prototype });
  (Intl as { DateTimeFormat: typeof Intl.DateTimeFormat }).DateTimeFormat = Counting;
  try {
    for (let i = 0; i < 1000; i++) dayKey(stamps[i % stamps.length] + i * 1000, config);
    nextDayAt(stamps[0], config); nextDayAt(stamps[3], config);
  } finally {
    (Intl as { DateTimeFormat: typeof Intl.DateTimeFormat }).DateTimeFormat = Original;
  }
  // at most one construction for this timezone across ~1050 calls; zero is also fine if an earlier
  // test already warmed the cache
  assert.ok(constructed <= 1, `expected <= 1 Intl.DateTimeFormat construction, got ${constructed}`);
});

test('the cached formatter yields exactly what a fresh formatter yields', () => {
  for (const at of stamps) {
    const fresh = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
    assert.equal(dayKey(at, config), fresh);
  }
  // rollover boundary: one millisecond before VN midnight is the previous day, midnight is the next
  assert.notEqual(dayKey(stamps[1], config), dayKey(stamps[2], config));
  assert.equal(nextDayAt(stamps[1], config), stamps[2]);
});

test('a different timezone gets its own cached formatter and never leaks into the first', () => {
  const other = { ...config, values: { ...config.values, shift: { ...config.values.shift, dayRollover: { ...config.values.shift.dayRollover, tz: 'America/Los_Angeles' } } } } as typeof config;
  const at = Date.parse('2026-09-09T05:30:00Z'); // 12:30 VN 09-09, 22:30 LA 09-08
  assert.equal(dayKey(at, config), '2026-09-09');
  assert.equal(dayKey(at, other), '2026-09-08');
  assert.equal(dayKey(at, config), '2026-09-09');
});
