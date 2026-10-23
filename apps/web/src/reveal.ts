import { config as seed, isEconomy2, type Config, type WorldView } from '../../../packages/engine/src';

type Reveal = Extract<Config['values']['onboarding']['featureReveal'], { hudAfterShifts: number }>;
/** Pinned snapshots older than JSON 2.0.5 lack the newer thresholds; the bundled seed fills the gap (same fallback as login-prompt.ts). */
export function featureReveal(c: Config): Reveal {
  return { ...seed.values.onboarding.featureReveal as Reveal, ...c.values.onboarding.featureReveal };
}

/**
 * F27/P0(d): which controls exist yet. Onboarding off reveals everything, as it always did for quests and league; so do 1.x
 * snapshots, which predate progressive disclosure and are replaced by the bundled seed when their next shift opens.
 */
export function revealed(w: Pick<WorldView, 'completedShifts'>, c: Config) {
  const r = featureReveal(c), on = c.values.onboarding.enabled && isEconomy2(c.values);
  const after = (shifts: number) => !on || w.completedShifts >= shifts, hud = after(r.hudAfterShifts);
  return {
    hud, // shift timer, weather/rush row, stock strip, extra equipment, bottom nav
    kick: hud && after(r.kickAfterShifts), // "Mời về" (founder 2026-10-22, JSON 2.1.3): its own threshold, and never without the HUD
    upgrades: after(r.upgradeAfterShifts),
    upgradeList: after(r.upgradeAllAfterShifts), // false = the sheet shows only the first goal
    journey: after(r.journeyAfterShifts),
    quests: after(r.questsAfterShifts),
    league: after(r.leagueAfterShifts),
  };
}

type Idle = { idleToGuideMs: number };
/** Idle window before the fallback step guide; old pins fall back to the seed like the reveal thresholds. */
export const idleToGuideMs = (c: Config): number => (c.values.onboarding as Partial<Idle>).idleToGuideMs ?? (seed.values.onboarding as Idle).idleToGuideMs;
