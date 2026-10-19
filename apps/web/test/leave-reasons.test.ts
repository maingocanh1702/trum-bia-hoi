import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, PREPARATION_CAUSES, config, loadConfig, menuReport, type DomainEvent } from '../../../packages/engine/src';
import { LEAVE_REASONS, dominantLeaveReason, isLossEvent, leaveReason, leaveRows, toastReason } from '../src/leave-reasons';

// F27/P3 (fun-buy-buttons-reason): every guest who leaves has exactly one reason, and the shift book ranks them by guests lost.
const ev = (type: string, data: DomainEvent['data']): Pick<DomainEvent, 'type' | 'data'> => ({ type, data });

test('an expired order is out of beer, out of snacks or waited too long, by the engine cause; the door queue is waiting; a refused group has no seat', () => {
  assert.equal(leaveReason(ev('order_expired', { cause: 'beerStock', count: 2 })), 'beer');
  assert.equal(leaveReason(ev('order_expired', { cause: 'beerRefill', count: 1 })), 'beer', 'no beer ready while the batch is still brewing is still "no beer"');
  assert.equal(leaveReason(ev('order_expired', { cause: 'foodStock', count: 1 })), 'food');
  for (const cause of PREPARATION_CAUSES.filter(c => !['beerStock', 'beerRefill', 'foodStock'].includes(c))) assert.equal(leaveReason(ev('order_expired', { cause, count: 1 })), 'wait', cause);
  assert.equal(leaveReason(ev('order_expired', { count: 1 })), 'wait', 'a rules-v1 loss has no cause: the guest still waited too long');
  assert.equal(leaveReason(ev('customer_left', { reason: 'queue', count: 2, penalty: 5, reputation: 5 })), 'wait');
  assert.equal(leaveReason(ev('queue_overflow', { size: 2 })), 'seat');
  for (const type of ['order_served', 'customer_left', 'shift_closed', 'table_cleaning']) assert.equal(leaveReason(ev(type, { reason: 'expired' })), null, type);
});

test('one toast, one reason: the cause that cost the most guests wins, ties go beer, snacks, waiting, seat', () => {
  assert.equal(dominantLeaveReason([]), null);
  assert.equal(dominantLeaveReason([ev('order_served', {})]), null);
  assert.equal(dominantLeaveReason([ev('order_expired', { cause: 'ready', count: 1 }), ev('order_expired', { cause: 'beerStock', count: 2 })]), 'beer');
  assert.equal(dominantLeaveReason([ev('order_expired', { cause: 'beerStock', count: 1 }), ev('customer_left', { reason: 'queue', count: 3 })]), 'wait');
  assert.equal(dominantLeaveReason([ev('queue_overflow', { size: 2 }), ev('order_expired', { cause: 'foodStock', count: 2 })]), 'food', 'tie: snacks before seat');
  assert.equal(dominantLeaveReason([ev('queue_overflow', { size: 2 })]), 'seat');
});

test('a toast takes its reason from the guests who paid its penalty: a shipper miss keeps it numeric-only, a refused group only speaks when nothing was lost', () => {
  assert.equal(toastReason([]), null);
  assert.equal(toastReason([ev('queue_overflow', { size: 2 })]), 'seat', 'nothing lost: the group turned away at the door is the reason');
  assert.equal(toastReason([ev('order_expired', { cause: 'beerStock', count: 1, penalty: 5 }), ev('queue_overflow', { size: 3 })]), 'beer', 'a bigger refused group does not rename a loss it did not cause');
  assert.equal(toastReason([ev('shipper_missed', { penalty: 7 }), ev('queue_overflow', { size: 2 })]), null, 'a missed delivery has no guest reason, and the refused group is not its reason');
  assert.equal(toastReason([ev('shipper_missed', { penalty: 7 }), ev('order_expired', { cause: 'ready', count: 1 })]), null, 'numbers of a mixed loss are not one guest reason');
  assert.equal(toastReason([ev('shipper_missed', { penalty: 7 })]), null);
  assert.equal(toastReason([ev('customer_left', { reason: 'queue', count: 2 }), ev('order_expired', { cause: 'foodStock', count: 1 })]), 'wait');
  for (const type of ['order_expired', 'shipper_missed']) assert.equal(isLossEvent(ev(type, {})), true, type);
  assert.equal(isLossEvent(ev('customer_left', { reason: 'queue' })), true); assert.equal(isLossEvent(ev('customer_left', { reason: 'expired' })), false, 'the per-guest record beside order_expired');
  assert.equal(isLossEvent(ev('queue_overflow', { size: 1 })), false);
});

test('the shift book ranks reasons by guests lost, folds every waiting cause into one row, hides zero rows and keeps ties in a fixed order', () => {
  const losses = Object.fromEntries([...PREPARATION_CAUSES, 'queue'].map(cause => [cause, 0]));
  assert.deepEqual(leaveRows(losses, 0), []);
  Object.assign(losses, { beerStock: 1, beerRefill: 1, ready: 3, queued: 1, queue: 2, unknown: 1 });
  assert.deepEqual(leaveRows(losses, 3), [{ reason: 'wait', count: 7 }, { reason: 'seat', count: 3 }, { reason: 'beer', count: 2 }]);
  assert.deepEqual(leaveRows({ foodStock: 2, beerStock: 2 }, 2).map(row => row.reason), ['beer', 'food', 'seat'], 'a three-way tie keeps beer, snacks, seat');
  assert.deepEqual(leaveRows({ ready: -4 }, -1), [], 'a corrupt negative count is never shown');
  assert.deepEqual(LEAVE_REASONS, ['beer', 'food', 'wait', 'seat']);
});

test('on a real neglected shift the book rows add up to the guests the engine counted as lost plus the ones turned away', () => {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.inventory.startingStock.bia[0] = 0;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-16T03:00:00Z'));
  assert.ok(g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok);
  for (let step = 0; step < 6000 && g.world.shift && !g.world.shift.closedAt; step++) g.advance(g.world.now + 1000); // nobody is ever served
  const report = menuReport(g.world, g.config)!, stats = g.world.shift!.stats;
  assert.ok(stats.lost > 0, 'the fixture must lose guests');
  const rows = leaveRows(report.losses, stats.rejected);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), stats.lost + stats.rejected);
  assert.deepEqual(rows.map(row => row.count), [...rows.map(row => row.count)].sort((a, b) => b - a));
});
