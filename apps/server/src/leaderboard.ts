import { createHash } from 'node:crypto';
import { seasonWindow, type Config, type SeasonKind } from '@tbh/engine';
import type { competitivePeriods } from './competitive-score';
import type { ImportReview } from './competition';
export type RankQuery = { kind: SeasonKind; tier?: string; page: number; revision?: string };
export type RankSource = { playerId: string; reputation: number; lifePath: number; review: ImportReview | null; periods: ReturnType<typeof competitivePeriods> };
export type RankSnapshot = { at: number; until: number; signature: string; revision: string; config: Config; sources: RankSource[] };
export const publicRankId = (id: string) => createHash('sha256').update('tbh-public-player:' + id).digest('hex');
export function validateRankQuery(q: RankQuery, config: Config) {
  if (!q || !['ranking', 'contest'].includes(q.kind) || !Number.isSafeInteger(q.page) || q.page < 0 ||
    q.tier !== undefined && !config.values.league.tiers.some(t => t.id === q.tier) ||
    q.revision !== undefined && (typeof q.revision !== 'string' || !/^[a-f0-9]{64}$/.test(q.revision))) throw Error('leaderboard:invalidQuery'); // config-exempt: SHA256 snapshot identifier
}
export function rankSnapshot(at: number, signature: string, config: Config, sources: RankSource[]): RankSnapshot {
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
  const candidates = snapshot.sources.flatMap(source => {
    const score = source.periods.find(p => p.id === period.id && p.endsAt > now);
    return score?.eligible ? [{ source, score }] : [];
  }).sort((a, b) => b.score.earned - a.score.earned || (a.score.firstReachedAt ?? Infinity) - (b.score.firstReachedAt ?? Infinity) ||
    (a.source.playerId < b.source.playerId ? -1 : a.source.playerId > b.source.playerId ? 1 : 0));
  const ranks = new Map<string, number>();
  const ranked = candidates.map(({ source, score }) => {
    const rank = (ranks.get(score.tierId) ?? 0) + 1; ranks.set(score.tierId, rank);
    return { id: publicRankId(source.playerId), rank, tierId: score.tierId, earned: score.earned, reputation: source.reputation, lifePath: source.lifePath };
  });
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
