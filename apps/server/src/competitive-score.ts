import { seasonEarned, seasonTier, type Config, type SeasonKind, type World } from '@tbh/engine';
import type { Competition } from './competition';

const kinds: readonly SeasonKind[] = ['ranking', 'contest'];
export function importBaseline(world: World) {
  return { playerId: world.playerId, sourceNow: world.now, periods: world.seasons ? [
    ...world.seasons.results.map(p => ({ id: p.id, kind: p.kind, earned: p.earned, closedShifts: p.closedShifts })),
    ...kinds.map(kind => ({ id: world.seasons![kind].id, kind, earned: seasonEarned(world, kind), closedShifts: world.seasons![kind].closedShifts })),
  ] : [] };
}
export type ImportBaseline = ReturnType<typeof importBaseline>;
const count = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** A read projection, never a second wallet or engine credit. Caller supplies trusted replay/state. */
export function competitivePeriods(world: World, configFor: (version: string) => Config,
  state: ReturnType<Competition['state']>, baseline?: ImportBaseline) {
  const origin = state.localImport;
  if (state.playerId !== world.playerId || origin && (!baseline || baseline.playerId !== world.playerId || baseline.sourceNow !== origin.sourceNow ||
    world.now < baseline.sourceNow || !Array.isArray(baseline.periods) || new Set(baseline.periods.map(p => p.id)).size !== baseline.periods.length ||
    baseline.periods.some(p => !p.id || !kinds.includes(p.kind) || !count(p.earned) || !count(p.closedShifts)))) throw Error('competition:invalidBaseline');
  if (!world.seasons) return [];
  return kinds.map(kind => {
    const period = world.seasons![kind], config = configFor(period.configVersion), raw = seasonEarned(world, kind);
    const imported = origin ? baseline!.periods.find(p => p.id === period.id) : undefined;
    if (!count(raw) || !count(period.closedShifts) || imported && (imported.kind !== kind || imported.earned > raw || imported.closedShifts > period.closedShifts)) throw Error('competition:invalidBaseline');
    const exclude = origin?.review.value !== 'approved', excludedLocalEarned = exclude ? imported?.earned ?? 0 : 0;
    const earned = raw - excludedLocalEarned, closedShifts = period.closedShifts - (exclude ? imported?.closedShifts ?? 0 : 0);
    const firstReachedAt = earned === 0 ? null : period.firstReachedCurrentSeasonEarnedAt;
    if (earned > 0 && (firstReachedAt === null || !count(firstReachedAt) || firstReachedAt < period.trackingFromAt || firstReachedAt >= period.endsAt ||
      firstReachedAt > world.now || exclude && imported && firstReachedAt < baseline!.sourceNow)) throw Error('competition:invalidBaseline');
    const view = { ...world, seasonEarned: kind === 'ranking' ? earned : world.seasonEarned,
      seasons: { ...world.seasons!, contestEarned: kind === 'contest' ? earned : world.seasons!.contestEarned } };
    const { tier } = seasonTier(view, config, kind);
    const reason = state.provider !== 'google' ? 'googleRequired' : state.flag.value && config.values.leaderboard.hideFlagged ? 'flagged'
      : closedShifts < config.values.leaderboard.minShiftsToRank ? 'insufficientShifts' : null;
    return { id: period.id, kind, startsAt: period.startsAt, endsAt: period.endsAt, configVersion: period.configVersion,
      earned, excludedLocalEarned, closedShifts, firstReachedAt, tierId: tier.id, eligible: reason === null, reason };
  });
}
