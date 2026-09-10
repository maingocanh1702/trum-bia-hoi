import { config as defaults, type Config, type WorldView } from '../../../packages/engine/src';
import type { Settings } from './local';

export type LoginTouchpoint = 'firstShift' | 'leaderboard' | 'leave';
/** Presentation only: completed shifts and earnings come from the current server snapshot. */
export function canInvite(settings: Settings, game: { world: WorldView; config: Config }, guest: boolean, touchpoint: LoginTouchpoint): boolean {
  const w = game.world, c = game.config.values.onboarding;
  if (!guest || !c.enabled || settings.loginPromptPlayer === w.playerId && w.completedShifts - settings.loginPromptShift < c.loginPrompt.cooldownShifts) return false;
  if (touchpoint === 'firstShift') return c.loginPrompt.afterFirstShift && w.completedShifts === 1; // config-exempt: the first completed shift is an ordinal, not a balance threshold
  if (touchpoint === 'leaderboard') return c.loginPrompt.onLeaderboardOpen;
  // Pinned snapshots before 2.0.2 have no presentation thresholds; the registry seed supplies them.
  const fallback = defaults.values.onboarding.loginPrompt;
  const progress = 'leaveProgress' in c.loginPrompt ? c.loginPrompt.leaveProgress : 'leaveProgress' in fallback ? fallback.leaveProgress : null;
  return Boolean(progress && c.loginPrompt.onLeaveWithProgress && (w.completedShifts >= progress.minCompletedShifts || w.lifetimeEarned >= progress.minLifetimeEarned));
}
