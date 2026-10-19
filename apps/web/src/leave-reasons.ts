import type { DomainEvent } from '../../../packages/engine/src';

/**
 * F27/P3 "mọi mất mát có đúng 1 lý do": why a guest left, in the words a player is told. A guest whose order times out always
 * "waited too long"; the engine's `order_expired.cause` refines it when the stock was the reason. A group turned away at the door
 * (`queue_overflow`) has no seat. Pure projection of events the engine already emits: no rule lives here.
 */
export type LeaveReason = 'beer' | 'food' | 'wait' | 'seat';
/** The order reasons are listed in when counts tie (and the key order of `leave.*` copy). */
export const LEAVE_REASONS: readonly LeaveReason[] = ['beer', 'food', 'wait', 'seat'];

const BY_CAUSE: Partial<Record<string, LeaveReason>> = { beerStock: 'beer', beerRefill: 'beer', foodStock: 'food' };

type Leave = Pick<DomainEvent, 'type' | 'data'>;

/** The reason a single event tells, or null when the event is not a guest leaving. */
export function leaveReason(event: Leave): LeaveReason | null {
  if (event.type === 'order_expired') return BY_CAUSE[String(event.data.cause)] ?? 'wait';
  if (event.type === 'customer_left' && event.data.reason === 'queue') return 'wait';
  if (event.type === 'queue_overflow') return 'seat';
  return null;
}

/** Guests that left with that event (`order_expired`/`customer_left` carry `count`, `queue_overflow` carries `size`). */
const guests = (event: Leave): number => Math.max(1, Number(event.data.count ?? event.data.size ?? 1) || 1);

/** One reason for a batch of events: the one that cost the most guests, ties in `LEAVE_REASONS` order. */
export function dominantLeaveReason(events: readonly Leave[]): LeaveReason | null {
  const total: Record<LeaveReason, number> = { beer: 0, food: 0, wait: 0, seat: 0 };
  for (const event of events) { const reason = leaveReason(event); if (reason) total[reason] += guests(event); }
  return LEAVE_REASONS.reduce<LeaveReason | null>((best, reason) => total[reason] > (best ? total[best] : 0) ? reason : best, null);
}

/**
 * The shift book's list: guests lost per reason, most first (ties in `LEAVE_REASONS` order), zero rows left out.
 * `losses` is the engine's per-cause report (`menuReport().losses`: preparation causes + `queue`), `turnedAway` the shift's `stats.rejected`.
 */
export function leaveRows(losses: Readonly<Record<string, number>>, turnedAway: number): { reason: LeaveReason; count: number }[] {
  const total: Record<LeaveReason, number> = { beer: 0, food: 0, wait: 0, seat: Math.max(0, turnedAway) };
  for (const [cause, count] of Object.entries(losses)) total[BY_CAUSE[cause] ?? 'wait'] += Math.max(0, count);
  return LEAVE_REASONS.map(reason => ({ reason, count: total[reason] })).filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count || LEAVE_REASONS.indexOf(a.reason) - LEAVE_REASONS.indexOf(b.reason));
}
