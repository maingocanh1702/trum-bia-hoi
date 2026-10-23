import { beerStatus, buyTableQuote, config as seed, freshnessMs, restockQuote, rushStatus, tableSlots, washerStatus, type Config, type WorldView } from '../../../packages/engine/src';
import { pickNextGoal } from './goals';

/**
 * Founder 2026-10-22 (Part B2): just-in-time hints for the HUD that shows from shift 1. Each one speaks once, the first time its moment comes; the
 * `onboarding.hints` rules hold (`maxConcurrent` hints at a time, `dismissOnTap`, `neverRepeatAfterDone`), and App.tsx never shows one over a sheet or
 * the step guide. Pure projection of engine state and config, like spotlight.ts: no game rule and no number of its own lives here; every threshold is
 * one the HUD already uses (the quick beer prompt's, the taps' poured reserve, the rush warning, the buy quote).
 */
export type HintId = 'tipWindow' | 'rush' | 'freshness' | 'glasses' | 'stock' | 'slot';
/** What a hint points at (lit only when no other spotlight is on): the strip's beer counter, the sink, the rush pill, the first empty table place. */
export type HintTarget = 'beerStock' | 'washer' | 'rush' | 'slot';
/** A hint on screen: `since` is the serve count when it appeared (a hint about one serve stops mattering at the next one). */
export interface Hint { id: HintId; since: number }
export interface HintRules { maxConcurrent: number; dismissOnTap: boolean; neverRepeatAfterDone: boolean }
export const HINT_TARGET: Record<HintId, HintTarget | null> = { tipWindow: null, rush: 'rush', freshness: null, glasses: 'washer', stock: 'beerStock', slot: 'slot' };
/** Most urgent first, when several moments come at once and `maxConcurrent` is 1. */
const ORDER: readonly HintId[] = ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'];

/** Pinned snapshots without `onboarding.hints` read the bundled seed (the fallback of reveal.ts). */
export function hintRules(c: Config): HintRules {
  const own = (c.values.onboarding as { hints?: Partial<HintRules> }).hints;
  return { ...(seed.values.onboarding as unknown as { hints: HintRules }).hints, ...own };
}

const open = (w: WorldView) => w.phase === 'open' && !!w.shift;
const moments: Record<HintId, (w: WorldView, c: Config, upgrades: boolean) => boolean> = {
  // B2.1(d): the guest just served was past the tip window (`tip.patienceThreshold` of their own patience) with fresh beer.
  tipWindow: (w, c) => { const last = w.serves.at(-1); return open(w) && !!last && last.t >= w.shift!.startedAt && !last.stale && last.patienceRatio < c.values.tip.patienceThreshold; },
  // The rush warning is up (`rush.schedule.warningMs` before it starts).
  rush: (w, c) => { const r = rushStatus(w, c); return !r.active && !!r.next?.warning; },
  // A poured beer waits on a ready tray while beer can go flat (not in an onboarding shift with `staleDisabled`, nor at the top cooler level).
  freshness: (w, c) => open(w) && Number.isFinite(freshnessMs(w, c)) && w.tables.some(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready') && t.order.items.some(i => i.dish === 'bia' && i.glassId)),
  // A real shortage: glasses wait at the sink (dirty or washing) and fewer are clean than the beers already poured, so the glasses now limit serving
  // (review B2-r1: "clean < the keg's reserve" held from keg Lv3 on with every glass clean).
  glasses: (w, c) => { if (!open(w)) return false; const sink = washerStatus(w, c); return sink.queued + sink.busy > 0 && sink.clean < beerStatus(w, c).available; },
  // The moment of the quick beer prompt (stock below one refill batch, a refill possible).
  stock: (w, c) => open(w) && restockQuote(w, c, 'bia', 'full').quantity > 0 && w.inventory.bia < beerStatus(w, c).batchSize,
  // The next goal is a new table, the wallet pays it and a place is free (B2.4 makes the place a button).
  slot: (w, c, upgrades) => { const goal = pickNextGoal(w, c); return upgrades && goal?.card.kind === 'buyTable' && buyTableQuote(w, c).ok && w.tables.length < tableSlots(w, c); },
};

/** Whether the moment the hint speaks about is still here. */
export function holds(hint: Hint, w: WorldView, c: Config, upgrades = true): boolean {
  return moments[hint.id](w, c, upgrades) && (hint.id !== 'tipWindow' || w.serves.length === hint.since);
}

/**
 * The first hint whose moment is here and that was never shown (onboarding on), or null. A hint that lights a target waits while another spotlight is
 * on (`spotBusy`), so at most one element ever carries `data-spotlight`; `upgrades` is whether the Upgrades sheet (and the tappable empty place) is revealed.
 */
export function nextHint(w: WorldView, c: Config, done: readonly string[], ui: { spotBusy?: boolean; upgrades?: boolean } = {}): Hint | null {
  if (!c.values.onboarding.enabled) return null;
  const rules = hintRules(c);
  if (rules.maxConcurrent < 1) return null;
  const id = ORDER.find(h => !(rules.neverRepeatAfterDone && done.includes(h)) && !(ui.spotBusy && HINT_TARGET[h]) && moments[h](w, c, ui.upgrades ?? true));
  return id ? { id, since: w.serves.length } : null;
}
