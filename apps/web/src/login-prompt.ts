import type { Config, WorldView } from '../../../packages/engine/src';
import type { Settings } from './local';

export type LoginTouchpoint = 'firstShift' | 'leaderboard' | 'leave';
/** Presentation only: completed shifts and earnings come from the current server snapshot. */
export function canInvite(settings: Settings, game: { world: WorldView; config: Config }, guest: boolean, touchpoint: LoginTouchpoint): boolean {
  const w = game.world, c = game.config.values.onboarding;
  if (!guest || !c.enabled || settings.loginPromptPlayer === w.playerId && w.completedShifts - settings.loginPromptShift < c.loginPrompt.cooldownShifts) return false;
  if (touchpoint === 'firstShift') return c.loginPrompt.afterFirstShift && w.completedShifts === 1; // config-exempt: the first completed shift is an ordinal, not a balance threshold
  if (touchpoint === 'leaderboard') return c.loginPrompt.onLeaderboardOpen;
  return c.loginPrompt.onLeaveWithProgress && (w.completedShifts > 0 || w.lifetimeEarned > 0);
}
