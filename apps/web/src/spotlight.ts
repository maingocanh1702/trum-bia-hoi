import { beerStatus, restockQuote, type Config, type Table, type WorldView } from '../../../packages/engine/src';
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

/** Keg empty, nothing brewing and no raw stock: only a restock brings beer back. */
export function beerOut(w: WorldView, c: Config): boolean {
  const beer = beerStatus(w, c);
  return beer.available === 0 && beer.busy === 0 && w.inventory.bia === 0;
}

/** The one card the Upgrades sheet shows before `upgradeAllAfterShifts`: the first table that can still level up.
 * An empty table wins over a busy one: the sheet pauses the world, so a table mid-clean would never free up behind a locked button. */
export function firstGoal(w: WorldView, c: Config) {
  const levels = c.values.upgrades.table.levels;
  const table = w.tables.find(t => levels[t.level] && t.state === 'empty') ?? w.tables.find(t => levels[t.level]);
  if (!table) return null;
  const next = levels[table.level];
  return { table, next, affordable: table.state === 'empty' && w.coins >= next.priceBase, bought: w.tables.some(t => t.level > c.values.runtime.initialTableLevel) };
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
