import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, decodeSave, encodeSave, loadConfig, type SeedConfig } from '../src';
import { simulateCareer, assertAdvancedCareerK } from '../sim/career';
import { steadyDemand } from './fixtures/steady-demand';

test('six real career days conserve the wallet and replay purchases, claims, clocks and earned LP from a fresh save', () => {
  // The harness is the subject: it needs a bot that reaches tables, chairs, a life-path claim and devices. Capacity demand (S3) slows the early game on purpose, so this
  // run switches it off; `sim:career` and its gate keep measuring the bundled numbers. The protocol bot (seats first) buys tables 2-8 before anything else, then its first second
  // chair at shift 32 and its first extra glass (more than two per seat) at shift 36 of such a run (JSON 2.1.0), and reaches LP4 on day 6, so six days hold every command the assertions below look for.
  const days = 6;
  const { game, report } = simulateCareer({ days, seed: 42, config: loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig });
  assert.equal(game.world.completedShifts, config.values.shift.dailyShiftCap.newbie * days);
  assert.equal(report.rows[0].openingCoins, config.values.shift.startingCoinsBase);
  for (let i = 1; i < days; i++) { assert.equal(report.rows[i].openingCoins, report.rows[i - 1].coins); assert.notEqual(report.rows[i].date, report.rows[i - 1].date); }
  assert.ok(report.rows.every(row => row.shifts === config.values.shift.dailyShiftCap.newbie && row.served > 0 && row.totalSpent > 0));
  assert.ok(game.log.some(e => e.command.type === 'buyTable')); assert.ok(game.log.some(e => e.command.type === 'buyChair'));
  assert.ok(game.log.some(e => e.command.type === 'buyGlass'));
  assert.ok(!game.log.some(e => e.command.type === 'upgradeDog'), 'the bot never buys the dog (M6 deferred)');
  assert.ok(game.log.some(e => e.command.type === 'claimLifePath'));
  // Every coin purchase is logged once, in order, with the shift it serves; tables come before second chairs (D18).
  const spending = game.log.filter(e => (e.result.amount ?? 0) > 0 && ['buyTable', 'buyChair', 'upgrade', 'upgradeTable', 'upgradeChair', 'buyGlass', 'buyUnlock', 'installSignboard', 'setSignboard', 'rentLocation'].includes(e.command.type));
  assert.deepEqual(report.purchases.map(p => [p.command, p.cost]), spending.map(e => [e.command.type, e.result.amount]));
  assert.ok(report.purchases.every((p, i) => p.shift >= 1 && p.shift <= game.world.completedShifts + 1 && (!i || p.shift >= report.purchases[i - 1].shift)));
  assert.deepEqual(report.purchaseMilestones.filter(p => p.command === 'buyTable').map(p => p.item), ['table 2', 'table 3', 'table 4', 'table 5', 'table 6', 'table 7', 'table 8'], 'the bot fills the alley (eight places in 2.1.0) before its first second chair');
  const firstChair = report.purchaseMilestones.find(p => p.command === 'buyChair')!;
  assert.ok(firstChair.shift >= report.purchaseMilestones.filter(p => p.command === 'buyTable').at(-1)!.shift);
  assert.deepEqual(report.rows.flatMap(row => row.purchases), report.purchases);
  assert.equal(game.world.events.filter(e => e.type === 'attendance_claimed').length, days);
  assert.deepEqual(report.rows.map(row => row.lifePath), [...report.rows.map(row => row.lifePath)].sort((a, b) => a - b), 'the life path never goes back');
  assert.ok(report.rows.at(-1)!.lifePath >= 3);
  assert.ok(report.milestones.some(e => e.type === 'upgrade_bought'));
  assert.deepEqual(decodeSave(encodeSave(game)).world, game.world, 'the entire result must be reproducible from real commands, never injected state');
});

test('career measurement rejects unbounded, fractional and non-calendar inputs before simulation', () => {
  for (const days of [0, -1, 1.5, 91, Infinity, NaN]) assert.throws(() => simulateCareer({ days }), /days/);
  assert.throws(() => simulateCareer({ days: 1, seed: NaN }), /seed/);
  assert.throws(() => simulateCareer({ days: 1, startAt: Date.parse('2026-09-09T12:00:00+07:00') }), /midnight/);
});

test('advanced career gate accepts owner measurements and rejects cap breaches or incomplete evidence', () => {
  const samples = [
    { seed: 42, days: 30, lifePath: 4, served: 29209, k: 3.483282134916905 },
    { seed: 99, days: 30, lifePath: 4, served: 28259, k: 3.3182494823317215 },
  ];
  assert.doesNotThrow(() => assertAdvancedCareerK(samples));
  assert.doesNotThrow(() => assertAdvancedCareerK([samples[0], { ...samples[1], k: 3.5 }]));
  assert.throws(() => assertAdvancedCareerK([samples[0], { ...samples[1], k: 3.500001 }]), /soft cap/);
  assert.throws(() => assertAdvancedCareerK([samples[0]]), /distinct RNG seeds/);
  assert.throws(() => assertAdvancedCareerK([samples[0], { ...samples[1], seed: 42 + 2 ** 32 }]), /distinct RNG seeds/);
  for (const invalid of [{ days: 29 }, { days: NaN }, { lifePath: 3 }, { served: 499 }, { served: Infinity }, { k: null }, { k: NaN }, { k: Infinity }, { k: -1 }]) {
    assert.throws(() => assertAdvancedCareerK([samples[0], { ...samples[1], ...invalid }]), /requires/);
  }
});
