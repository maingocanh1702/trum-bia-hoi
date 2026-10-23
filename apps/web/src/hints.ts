import { config as seed, type Config, type WorldView } from '../../../packages/engine/src';

/**
 * Founder 2026-10-22 (Part B2): just-in-time hints for the HUD that shows from shift 1. Each one speaks once, the first time its moment comes; the
 * `onboarding.hints` rules hold (`maxConcurrent` hints at a time, `dismissOnTap`, `neverRepeatAfterDone`), and App.tsx never shows one over a sheet or
 * the step guide. Pure projection of engine state and config, like spotlight.ts: no game rule and no number of its own lives here.
 */
export type HintId = 'tipWindow';
/** A hint on screen: `since` is the serve count when it appeared (a hint about one serve stops mattering at the next one). */
export interface Hint { id: HintId; since: number }
export interface HintRules { maxConcurrent: number; dismissOnTap: boolean; neverRepeatAfterDone: boolean }

/** Pinned snapshots without `onboarding.hints` read the bundled seed (the fallback of reveal.ts). */
export function hintRules(c: Config): HintRules {
  const own = (c.values.onboarding as { hints?: Partial<HintRules> }).hints;
  return { ...(seed.values.onboarding as unknown as { hints: HintRules }).hints, ...own };
}

/** B2.1(d): the guest just served was past the tip window (`tip.patienceThreshold` of their own patience) with fresh beer, in the open shift. */
function lateServe(w: WorldView, c: Config): boolean {
  const last = w.serves.at(-1);
  return w.phase === 'open' && !!w.shift && !!last && last.t >= w.shift.startedAt && !last.stale && last.patienceRatio < c.values.tip.patienceThreshold;
}

/** Whether the moment the hint speaks about is still here. */
export function holds(hint: Hint, w: WorldView, c: Config): boolean {
  if (hint.id === 'tipWindow') return lateServe(w, c) && w.serves.length === hint.since;
  return false;
}

/** The first hint whose moment is here and that was never shown (onboarding on), or null. */
export function nextHint(w: WorldView, c: Config, done: readonly string[]): Hint | null {
  if (!c.values.onboarding.enabled) return null;
  const rules = hintRules(c), seen = (id: HintId) => rules.neverRepeatAfterDone && done.includes(id);
  if (rules.maxConcurrent < 1) return null;
  if (!seen('tipWindow') && lateServe(w, c)) return { id: 'tipWindow', since: w.serves.length };
  return null;
}
