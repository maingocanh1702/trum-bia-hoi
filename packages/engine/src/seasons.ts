import type { Config } from './config';
import type { SeasonKind, SeasonPeriod, World } from './types';

export const SEASON_KINDS: readonly SeasonKind[] = ['ranking', 'contest'];
const DAY_MS = 86400000; // config-exempt: milliseconds in a VN calendar day (no DST)

export function seasonWindow(now: number, c: Config, kind: SeasonKind) {
  const epoch = Date.parse(c.values.league.seasons.epochUtc), duration = c.values.league.seasons[kind].days * DAY_MS;
  const index = Math.floor((now - epoch) / duration), startsAt = epoch + index * duration, endsAt = startsAt + duration;
  if (![now, startsAt, endsAt].every(Number.isSafeInteger) || endsAt <= now) throw Error('season:unsafe-clock');
  return { id: `${kind}:${epoch}:${duration}:${index}`, kind, startsAt, endsAt };
}
function newPeriod(now: number, trackingFromAt: number, c: Config, kind: SeasonKind): SeasonPeriod {
  const window = seasonWindow(now, c, kind);
  return { ...window, trackingFromAt: Math.max(window.startsAt, trackingFromAt), configVersion: c.version,
    tiers: structuredClone(c.values.league.tiers), countedSources: [...c.values.ledgers.countedSources],
    closedShifts: 0, firstReachedCurrentSeasonEarnedAt: null };
}
export function seasonEarned(w: World, kind: SeasonKind): number {
  return kind === 'ranking' ? w.seasonEarned : w.seasons?.contestEarned ?? 0;
}
/** Ranking has one canonical balance; every tier consumer uses the active period's terms. */
export function seasonTier(w: World, c: Config, kind: SeasonKind = 'ranking') {
  const tiers = w.seasons?.[kind].tiers ?? c.values.league.tiers, earned = seasonEarned(w, kind);
  const index = tiers.filter(tier => earned >= tier.minSeasonEarnedBase).length - 1;
  return { index, tier: tiers[index], next: tiers[index + 1] ?? null, earned };
}
/** Only participated periods need an exact clock cutpoint; absent empty years are skipped. */
export function nextSeasonEnd(w: World): number {
  return Math.min(...SEASON_KINDS.map(kind => w.seasons && (seasonEarned(w, kind) > 0 || w.seasons[kind].closedShifts > 0) ? w.seasons[kind].endsAt : Infinity));
}
export function syncSeasons(w: World, c: Config): void {
  if (!w.seasons) {
    const legacy = { earned: w.seasonEarned, throughAt: w.now };
    const ranking = newPeriod(w.now, w.now, c, 'ranking'), contest = newPeriod(w.now, w.now, c, 'contest');
    w.seasons = { ranking, contest, contestEarned: 0, results: [], legacy };
    w.seasonEarned = 0;
    return;
  }
  const resultCount = w.seasons.results.length;
  for (const kind of SEASON_KINDS) {
    const period = w.seasons[kind];
    if (w.now < period.endsAt) continue;
    const { earned, tier } = seasonTier(w, c, kind);
    const next = newPeriod(w.now, period.endsAt, c, kind);
    if (earned > 0 || period.closedShifts > 0) w.seasons.results.push({
      id: period.id, kind, startsAt: period.startsAt, endsAt: period.endsAt, trackingFromAt: period.trackingFromAt,
      configVersion: period.configVersion, earned, tierId: tier.id, tierName: tier.name,
      firstReachedCurrentSeasonEarnedAt: period.firstReachedCurrentSeasonEarnedAt, closedShifts: period.closedShifts,
    });
    w.seasons[kind] = next;
    if (kind === 'ranking') w.seasonEarned = 0; else w.seasons.contestEarned = 0;
  }
  // Stable ordering whether two windows close in one catch-up or several ticks.
  if (w.seasons.results.length > resultCount) w.seasons.results.sort((a, b) => a.endsAt - b.endsAt || a.kind.localeCompare(b.kind));
}
export function seasonCreditSafe(w: World, credited: number, source: string): boolean {
  return !w.seasons || SEASON_KINDS.every(kind => !w.seasons![kind].countedSources.includes(source) || Number.isSafeInteger(seasonEarned(w, kind) + credited));
}
/** Called once by the canonical credit path, after the daily cap. Rewards never pass its pinned source filter. */
export function creditSeasons(w: World, c: Config, credited: number, source: string): void {
  if (!w.seasons || credited === 0) return;
  for (const kind of SEASON_KINDS) {
    const period = w.seasons[kind];
    if (!period.countedSources.includes(source)) continue;
    if (kind === 'ranking') w.seasonEarned += credited; else w.seasons.contestEarned += credited;
    period.firstReachedCurrentSeasonEarnedAt = w.now;
    const { index, tier } = seasonTier(w, c, kind);
    if (index > c.values.league.tiers.findIndex(row => row.id === w.peakLeague)) w.peakLeague = tier.id;
  }
}
/** Tier identities/order carry permanent LP meaning; repricing their thresholds is safe at rollover. */
export function compatibleSeasonTiers(w: World, c: Config, previous: Config): boolean {
  const matches = (tiers: Config['values']['league']['tiers']) => tiers.length === c.values.league.tiers.length && tiers.every((tier, i) => tier.id === c.values.league.tiers[i].id);
  return matches(previous.values.league.tiers) && (!w.seasons || SEASON_KINDS.every(kind => matches(w.seasons![kind].tiers)));
}
/** A just-rolled, unused window can accept opening config without rewriting any earned outcome. */
export function pinUnusedSeasons(w: World, c: Config): void {
  if (!w.seasons) return;
  for (const kind of SEASON_KINDS) if (seasonEarned(w, kind) === 0 && w.seasons[kind].closedShifts === 0) {
    w.seasons[kind] = newPeriod(w.now, w.now, c, kind);
  }
}
