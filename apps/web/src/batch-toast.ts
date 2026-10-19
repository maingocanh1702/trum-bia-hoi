import type { DomainEvent } from '../../../packages/engine/src';
import { isLossEvent, toastReason, type LeaveReason } from './leave-reasons';

export interface BatchToast { text: string; kind: string; id?: string; gain?: number; loss?: { coins: number; reputation: number }; reason?: LeaveReason }
type Say = (key: string, params?: Record<string, string | number>) => string;

/**
 * The one toast a batch of events leaves behind. Rewards and confirmations follow each other and the LAST one wins; a loss replaces them
 * all (numbers + one reason, F27/P3); a group turned away at the door costs nothing, so it only gets a reason-only toast when nothing else
 * in the batch has one. Pure projection of events the engine already emitted: no rule lives here.
 */
export function batchToast(events: readonly DomainEvent[], say: Say): BatchToast | null {
  let toast: BatchToast | null = null, loss: { coins: number; reputation: number } | undefined;
  for (const e of events) {
    if (isLossEvent(e)) { loss ??= { coins: 0, reputation: 0 }; loss.coins += Number(e.data.penalty); loss.reputation += Number(e.data.reputation); }
    if (e.type === 'attendance_claimed') toast = { text: say('attendance.received', { n: Number(e.data.reputation) }), kind: 'early' };
    if (e.type === 'quest_claimed') toast = { text: say('quests.received', { coin: Number(e.data.coin), rep: Number(e.data.reputation) }), kind: 'early' };
    if (e.type === 'daily_bonus_claimed') toast = { text: say('quests.bonusReceived'), kind: 'early' };
    if (e.type === 'shipper_arrived') toast = { text: say('delivery.arrived'), kind: 'early' };
    if (e.type === 'shipper_completed') toast = { id: e.id, text: say('delivery.completed', { n: Number(e.data.credited) }), kind: 'earlyNoTip', gain: Number(e.data.credited) };
    if (e.type === 'order_served') {
      const kind = e.data.outcome === 'early' && e.data.tipped === false ? 'earlyNoTip' : String(e.data.outcome);
      toast = { id: e.id, text: say(`outcome.${kind}`, { n: Number(e.data.amount) }), kind, gain: Number(e.data.amount) };
    }
    if (e.type === 'shift_closed' && !events.some(event => event.type === 'shipper_completed')) toast = { text: say('book.closed'), kind: 'early' };
  }
  const reason = toastReason(events);
  if (loss) return { text: '', kind: 'loss', loss, reason: reason ?? undefined };
  if (!toast && reason === 'seat') return { text: '', kind: 'loss', loss: { coins: 0, reputation: 0 }, reason };
  return toast;
}
