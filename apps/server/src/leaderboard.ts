import { createHash } from 'node:crypto';
import { seasonWindow, type Config, type SeasonKind } from '@tbh/engine';
import type { competitivePeriods } from './competitive-score';
import type { ImportReview } from './competition';
export type RankQuery = { kind: SeasonKind; tier?: string; page: number; revision?: string };
export type RankSource = { playerId: string; reputation: number; lifePath: number; review: ImportReview | null; periods: ReturnType<typeof competitivePeriods> };
export type RankSnapshot = { at: number; until: number; signature: string; revision: string; config: Config; sources: RankSource[] };
export const publicRankId = (id: string) => createHash('sha256').update('tbh-public-player:' + id).digest('hex');
export function archiveSettings(config: Config) {
  const settings = config.values.leaderboard;
  for (const key of ['shrineTop', 'wallSize', 'historySeasonsKept'] as const)
    if (!Number.isSafeInteger(settings[key]) || settings[key] < 1) throw Error(`config:leaderboard.${key}:integerRange`);
  if (settings.shrineTop > settings.wallSize) throw Error('config:leaderboard.historyRange');
  return settings;
}
export function rankSettings(config: Config) {
  const settings = archiveSettings(config);
  for (const key of ['topN', 'refreshMs', 'neighborsWindow', 'minShiftsToRank'] as const) {
    const value = settings[key];
    if (!Number.isSafeInteger(value) || value < (key === 'neighborsWindow' || key === 'minShiftsToRank' ? 0 : 1) ||
      key === 'refreshMs' && value > 2147483647) throw Error(`config:leaderboard.${key}:integerRange`); // config-exempt: native signed32 timer limit, counts must be whole
  }
  if (typeof settings.hideFlagged !== 'boolean') throw Error('config:leaderboard.historyRange');
  return settings;
}
export function validateRankQuery(q: RankQuery, config: Config) {
  rankSettings(config);
  if (!q || !['ranking', 'contest'].includes(q.kind) || !Number.isSafeInteger(q.page) || q.page < 0 ||
    q.tier !== undefined && !config.values.league.tiers.some(t => t.id === q.tier) ||
    q.revision !== undefined && (typeof q.revision !== 'string' || !/^[a-f0-9]{64}$/.test(q.revision))) throw Error('leaderboard:invalidQuery'); // config-exempt: SHA256 snapshot identifier
}
export function rankSnapshot(at: number, signature: string, config: Config, sources: RankSource[]): RankSnapshot {
  rankSettings(config);
  const ends = sources.flatMap(s => s.periods.map(p => p.endsAt)).filter(end => end > at);
  const until = ends.reduce((nearest, end) => Math.min(nearest, end), Math.min(at + config.values.leaderboard.refreshMs,
    ...(['ranking', 'contest'] as const).map(kind => seasonWindow(at, config, kind).endsAt)));
  const revision = createHash('sha256').update(JSON.stringify([at, signature, sources])).digest('hex');
  return { at, until, signature, revision, config, sources };
}
export function rankPage(snapshot: RankSnapshot, query: RankQuery, owner: { playerId: string; provider: 'google' | 'guest' } | null, now: number) {
  validateRankQuery(query, snapshot.config);
  if (query.revision !== undefined && query.revision !== snapshot.revision) throw Error('leaderboard:stalePage');
  const own = owner?.provider === 'google' ? snapshot.sources.find(s => s.playerId === owner.playerId) : undefined;
  const ownPeriod = own?.periods.find(p => p.kind === query.kind && p.endsAt > now);
  const period = ownPeriod ?? seasonWindow(now, snapshot.config, query.kind);
  const tier = query.tier ?? ownPeriod?.tierId ?? snapshot.config.values.league.tiers[0].id;
  const ranked = rankRows(snapshot.sources, period.id);
  const rows = ranked.filter(r => r.tierId === tier), me = own ? ranked.find(r => r.id === publicRankId(own.playerId)) ?? null : null;
  const { topN, neighborsWindow, refreshMs } = snapshot.config.values.leaderboard, offset = query.page * topN;
  if (!Number.isSafeInteger(offset) || query.page > 0 && offset >= rows.length) throw Error('leaderboard:invalidPage');
  return { revision: snapshot.revision, serverNow: now, updatedAt: snapshot.at, refreshAt: snapshot.until, refreshMs,
    period: { id: period.id, kind: query.kind, startsAt: period.startsAt, endsAt: period.endsAt },
    tiers: snapshot.config.values.league.tiers.map(t => t.id), tier, page: query.page, total: rows.length, rows: rows.slice(offset, offset + topN),
    nextPage: offset + topN < rows.length ? query.page + 1 : null, me,
    neighbors: me ? ranked.filter(r => r.tierId === me.tierId && r.id !== me.id && Math.abs(r.rank - me.rank) <= neighborsWindow) : [],
    eligibility: { reason: owner?.provider !== 'google' ? 'googleRequired' : ownPeriod?.reason ?? (me ? null : 'insufficientShifts'), review: own?.review ?? null } };
}

/** Shared stable ordering for live pages and immutable season capture. */
export function rankRows(sources: RankSource[], periodId: string) {
  const candidates = sources.flatMap(source => {
    const score = source.periods.find(p => p.id === periodId);
    return score?.eligible ? [{ source, score }] : [];
  }).sort((a, b) => b.score.earned - a.score.earned || (a.score.firstReachedAt ?? Infinity) - (b.score.firstReachedAt ?? Infinity) ||
    (a.source.playerId < b.source.playerId ? -1 : a.source.playerId > b.source.playerId ? 1 : 0));
  const ranks = new Map<string, number>();
  return candidates.map(({ source, score }) => {
    const rank = (ranks.get(score.tierId) ?? 0) + 1; ranks.set(score.tierId, rank);
    return { id: publicRankId(source.playerId), rank, tierId: score.tierId, earned: score.earned, reputation: source.reputation, lifePath: source.lifePath };
  });
}

export type SeasonSnapshot = { period: { id: string; kind: SeasonKind; startsAt: number; endsAt: number }; capturedAt: number; configVersion: string; tiers: string[]; shrineTop: number; wallSize: number; rows: (ReturnType<typeof rankRows>[number] & { name: { key: 'rank.alias'; id: string } })[] };
