import { beerStatus, buyTableQuote, isSeatModel, restockQuote, type Config, type Table, type WorldView } from '../../../packages/engine/src';
import { revealed } from './reveal';

// F27/P0(a): exactly one control may call for a tap at a time. Pure projection of engine state, no rules here.
export type Target =
  | { kind: 'ready'; tableId: string } // whole order ready: the bubble check, or Serve once that table's panel is open
  | { kind: 'seated'; tableId: string } // first play: a guest sat down and is still ordering
  | { kind: 'wallet' } // first play: coins just landed
  | { kind: 'restock' } // keg and raw stock are both empty
  | { kind: 'upgradesNav' } // between shifts: the first goal is affordable
  | { kind: 'goal' }; // inside the Upgrades sheet: the first goal's buy button
export interface Spotlight { target: Target | null; arrow: boolean }

const ARROW_WALLET_MS = 2400; // config-exempt: transient pointer lifetime, same as the gain toast

const activeOrder = (t: Table) => t.order && ['pending', 'grace'].includes(t.order.state) ? t.order : null;
const isReady = (t: Table) => { const o = activeOrder(t); return !!o && o.items.length > 0 && o.items.every(i => i.state === 'ready'); };
export const servedOrders = (w: Pick<WorldView, 'serves'>) => new Set(w.serves.map(s => s.orderId)).size;

const RING_FLOOR = 0.04; // config-exempt: visual floor only, never a game number

/**
 * Share of a queued group's patience left (0..1), the same projection as the order bubble's bar: the queue deadline is arrival plus
 * the least patient guest. Rules-v1 saves add `graceMs` to that deadline and the client cannot see the rules version, so the ring
 * keeps a last sliver instead of reading empty while the group is still standing there.
 */
export function queuePatience(group: WorldView['queue'][number], now: number): number {
  const total = Math.min(...group.customers.map(x => x.patienceMs));
  return Math.max(RING_FLOOR, (group.arrivedAt + total - now) / total);
}

/** Keg empty, nothing brewing and no raw stock: only a restock brings beer back. */
export function beerOut(w: WorldView, c: Config): boolean {
  const beer = beerStatus(w, c);
  return beer.available === 0 && beer.busy === 0 && w.inventory.bia === 0;
}

/** The one card the Upgrades sheet shows before `upgradeAllAfterShifts`.
 * Seat model (rules 28): the second table, the purchase a one-table shop earns first (plan §0 P2/P4); it needs no empty table.
 * A capacity snapshot pinned before it: the first table that can still level up. An empty table wins over a busy one: the sheet pauses
 * the world, so a table mid-clean would never free up behind a locked button. */
export function firstGoal(w: WorldView, c: Config) {
  const v = c.values;
  if (isSeatModel(v)) return { kind: 'buyTable' as const, affordable: buyTableQuote(w, c).ok, bought: w.tables.length > v.upgrades.table.startingTables };
  const levels = v.upgrades.table.levels;
  const table = w.tables.find(t => levels[t.level] && t.state === 'empty') ?? w.tables.find(t => levels[t.level]);
  if (!table) return null;
  const next = levels[table.level];
  return { kind: 'table' as const, table, next, affordable: table.state === 'empty' && w.coins >= next.priceBase, bought: w.tables.some(t => t.level > v.runtime.initialTableLevel) };
}

export function pickSpotlight(w: WorldView, c: Config, ui: { sheet: string | null; dialogOpen: boolean }): Spotlight {
  const none: Spotlight = { target: null, arrow: false };
  const goal = firstGoal(w, c), goalDue = !!goal && goal.affordable && !goal.bought && !revealed(w, c).upgradeList;
  if (ui.sheet === 'upgrades') return goalDue ? { target: { kind: 'goal' }, arrow: false } : none;
  if (ui.dialogOpen) return none;
  const ob = c.values.onboarding, intro = ob.enabled && ob.stepGuide.onFirstPlay && w.completedShifts === 0, served = servedOrders(w);
  const graceMs = c.values.patience.graceMs, expiry = (t: Table) => t.order!.placedAt + t.order!.patienceMs + graceMs;
  const ready = w.tables.filter(isReady).sort((a, b) => expiry(a) - expiry(b))[0];
  if (ready) return { target: { kind: 'ready', tableId: ready.id }, arrow: intro && served === 0 };
  if (w.phase !== 'resting' && beerOut(w, c) && restockQuote(w, c, 'bia', 'full').ok) return { target: { kind: 'restock' }, arrow: false };
  if (intro && served === 1 && w.lastServedAt !== null && w.now - w.lastServedAt < ARROW_WALLET_MS) return { target: { kind: 'wallet' }, arrow: true };
  const seated = intro && served === 0 ? w.tables.find(t => t.group && ['seating', 'waiting'].includes(t.state)) : undefined;
  if (seated) return { target: { kind: 'seated', tableId: seated.id }, arrow: true };
  if (w.phase === 'resting' && goalDue) return { target: { kind: 'upgradesNav' }, arrow: false };
  return none;
}
