import type { DomainEvent } from '../../../packages/engine/src';
import { isLossEvent } from './leave-reasons';

/**
 * Founder 2026-10-22 (Part B2.6): the card a finished rush leaves, built from the rush's own events and nothing stored. The engine's `rush_ended` already
 * carries the rush summary (`summarizeRush`: arrived, rejected, served, lost, tips, revenue) for a scheduled rush; the net takes off the penalties of the
 * guests who left between its `rush_started` and its `rush_ended`; the change is against the rush that ended before it (null for the first one).
 */
export interface RushRecap { kind: string; arrived: number; served: number; left: number; tips: number; net: number; change: number | null }

const summarized = (e: DomainEvent) => e.type === 'rush_ended' && typeof e.data.arrived === 'number';

function recapAt(events: readonly DomainEvent[], at: number): Omit<RushRecap, 'change'> {
  const end = events[at], d = end.data;
  let start = at - 1;
  while (start >= 0 && !(events[start].type === 'rush_started' && events[start].data.shiftId === d.shiftId && events[start].data.slot === d.slot)) start--;
  let penalty = 0;
  for (let i = start + 1; i < at; i++) if (isLossEvent(events[i])) penalty += Number(events[i].data.penalty ?? 0);
  return { kind: String(d.kind), arrived: Number(d.arrived), served: Number(d.served), left: Number(d.lost) + Number(d.rejected), tips: Number(d.tips), net: Number(d.revenue) - penalty };
}

/** The recap of the rush that `ended` closed, or null when that event carries no summary (an unscheduled rush, a snapshot from before the summaries). */
export function rushRecap(events: readonly DomainEvent[], ended: DomainEvent): RushRecap | null {
  const at = events.findIndex(e => e.id === ended.id);
  if (at < 0 || !summarized(ended)) return null;
  let before = at - 1;
  while (before >= 0 && !summarized(events[before])) before--;
  const recap = recapAt(events, at);
  return { ...recap, change: before < 0 ? null : recap.net - recapAt(events, before).net };
}
