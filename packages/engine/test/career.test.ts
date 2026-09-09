import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, decodeSave, encodeSave } from '../src';
import { simulateCareer } from '../sim/career';

test('two real career days conserve the wallet and replay purchases, claims, clocks and earned LP from a fresh save', () => {
  const { game, report } = simulateCareer({ days: 2, seed: 42 });
  assert.equal(game.world.completedShifts, config.values.shift.dailyShiftCap.newbie * 2);
  assert.equal(report.rows[0].openingCoins, config.values.shift.startingCoinsBase);
  assert.equal(report.rows[1].openingCoins, report.rows[0].coins);
  assert.notEqual(report.rows[0].date, report.rows[1].date);
  assert.ok(report.rows.every(row => row.shifts === config.values.shift.dailyShiftCap.newbie && row.served > 0 && row.totalSpent > 0));
  assert.ok(game.log.some(e => e.command.type === 'upgradeTable'));
  assert.ok(game.log.some(e => e.command.type === 'buyGlass'));
  assert.ok(game.log.some(e => e.command.type === 'upgradeDog'));
  assert.ok(game.log.some(e => e.command.type === 'claimLifePath'));
  assert.equal(game.world.events.filter(e => e.type === 'attendance_claimed').length, 2);
  assert.equal(report.rows[1].lifePath, 1);
  assert.ok(report.milestones.some(e => e.type === 'upgrade_bought'));
  assert.deepEqual(decodeSave(encodeSave(game)).world, game.world, 'the entire result must be reproducible from real commands, never injected state');
});

test('career measurement rejects unbounded, fractional and non-calendar inputs before simulation', () => {
  for (const days of [0, -1, 1.5, 91, Infinity, NaN]) assert.throws(() => simulateCareer({ days }), /days/);
  assert.throws(() => simulateCareer({ days: 1, seed: NaN }), /seed/);
  assert.throws(() => simulateCareer({ days: 1, startAt: Date.parse('2026-09-09T12:00:00+07:00') }), /midnight/);
});
