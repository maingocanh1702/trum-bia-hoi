import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DomainEvent } from '../../../packages/engine/src';
import { batchToast } from '../src/batch-toast';

// F27/P3 (fun-buy-buttons-reason): one toast per batch of events. A remote client receives a whole batch at once, so the
// order and the mix of events decide which toast the player sees. `say` echoes the key so the assertions read the copy that was picked.
const say = (key: string, params: Record<string, string | number> = {}) => `${key}${Object.keys(params).length ? ` ${JSON.stringify(params)}` : ''}`;
let seq = 0;
const ev = (type: string, data: DomainEvent['data'] = {}): DomainEvent => ({ id: `e${++seq}`, type, at: 0, configVersion: 'test', idempotencyKey: `k${seq}`, data });
const overflow = () => ev('queue_overflow', { size: 2 });

test('a refused group never hides the reward or confirmation of the same batch (Codex r3: queue_overflow + quest_claimed)', () => {
  const rewards: [DomainEvent, string][] = [
    [ev('quest_claimed', { coin: 40, reputation: 2 }), 'quests.received'],
    [ev('attendance_claimed', { reputation: 3 }), 'attendance.received'],
    [ev('daily_bonus_claimed', {}), 'quests.bonusReceived'],
    [ev('shipper_arrived', {}), 'delivery.arrived'],
    [ev('shipper_completed', { credited: 90 }), 'delivery.completed'],
    [ev('order_served', { outcome: 'early', tipped: true, amount: 25 }), 'outcome.early'],
    [ev('shift_closed', {}), 'book.closed'],
  ];
  for (const [reward, copy] of rewards) for (const batch of [[overflow(), reward], [reward, overflow()]]) {
    const toast = batchToast(batch, say);
    assert.ok(toast, reward.type);
    assert.equal(toast.kind === 'loss', false, `${reward.type}: the free "no room" toast must not replace it`);
    assert.ok(toast.text.startsWith(copy), `${reward.type} (${batch[0] === reward ? 'reward first' : 'overflow first'}) -> ${toast.text}`);
    assert.equal(toast.reason, undefined, reward.type);
  }
});

test('a group turned away with nothing else to say gets the reason-only toast, and costs nothing', () => {
  assert.deepEqual(batchToast([overflow()], say), { text: '', kind: 'loss', loss: { coins: 0, reputation: 0 }, reason: 'seat' });
  assert.equal(batchToast([ev('customer_left', { reason: 'expired', count: 1 })], say), null, 'the per-guest record beside order_expired is not a toast');
  assert.equal(batchToast([], say), null);
});

test('a loss names one reason with its numbers and replaces every reward of the batch; the last reward wins among rewards', () => {
  const lost = ev('order_expired', { cause: 'beerStock', count: 1, penalty: 5, reputation: 2 });
  const toast = batchToast([ev('quest_claimed', { coin: 40, reputation: 2 }), lost, overflow(), ev('order_expired', { cause: 'ready', count: 1, penalty: 3, reputation: 1 })], say);
  assert.deepEqual(toast, { text: '', kind: 'loss', loss: { coins: 8, reputation: 3 }, reason: 'beer' }, 'numbers add up; the refused group (nothing lost) does not rename the loss');
  assert.equal(batchToast([ev('shipper_missed', { penalty: 7, reputation: 1 }), overflow()], say)?.reason, undefined, 'a missed delivery has no guest reason');
  const last = batchToast([ev('order_served', { outcome: 'early', tipped: false, amount: 25 }), ev('quest_claimed', { coin: 40, reputation: 2 })], say);
  assert.ok(last?.text.startsWith('quests.received'), 'the last reward wins');
  const served = batchToast([ev('quest_claimed', { coin: 40, reputation: 2 }), ev('order_served', { outcome: 'early', tipped: false, amount: 25 })], say);
  assert.deepEqual([served?.kind, served?.gain], ['earlyNoTip', 25], 'an untipped early serve reads as its own outcome and floats its gain');
});

test('closing a shift that also completes a delivery shows the delivery, not the book line', () => {
  const toast = batchToast([ev('shipper_completed', { credited: 90 }), ev('shift_closed', {})], say);
  assert.ok(toast?.text.startsWith('delivery.completed'), toast?.text ?? 'no toast');
});
