import { useEffect, useState } from 'react';
import type { GameStore } from '../../server/src/store';
type Board = Awaited<ReturnType<GameStore['leaderboard']>>;
type PublicBoard = Pick<Board, 'revision' | 'updatedAt' | 'period' | 'tier' | 'tiers' | 'page' | 'total' | 'rows' | 'nextPage'>;
const CACHE = 'tbh.leaderboard.v1';
// Whitelist the public projection: never retain viewer, personal rank, neighbors or review status.
function publicBoard(b: Board): PublicBoard {
  const { revision, updatedAt, period, tier, tiers, page, total, rows, nextPage } = b;
  return { revision, updatedAt, period, tier, tiers, page, total, rows, nextPage };
}
function readCache(): PublicBoard | null {
  try {
    const b = JSON.parse(localStorage.getItem(CACHE) ?? 'null');
    const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
    if (!b || !/^[a-f0-9]{64}$/.test(b.revision) || !count(b.updatedAt) || !count(b.total) || !count(b.page) ||
      !b.period || !['ranking', 'contest'].includes(b.period.kind) || typeof b.period.id !== 'string' || !count(b.period.endsAt) || !count(b.period.startsAt) ||
      typeof b.tier !== 'string' || !Array.isArray(b.tiers) || !b.tiers.every((t: unknown) => typeof t === 'string') ||
      !Array.isArray(b.rows) || !b.rows.every((r: Board['rows'][number]) => r && /^[a-f0-9]{64}$/.test(r.id) && typeof r.tierId === 'string' && [r.rank, r.earned, r.reputation, r.lifePath].every(count)) ||
      b.nextPage !== null && !count(b.nextPage)) return null;
    return publicBoard(b);
  } catch { return null; }
}
export function Leaderboard({ viewer, timeout, timeZone, t, locale, num }: { viewer: Board['viewer']; timeout: number; timeZone: string; t: (key: string, params?: Record<string, string | number>) => string; locale: string; num: (n: number) => string }) {
  const [query, setQuery] = useState({ kind: 'ranking', tier: '', page: 0, revision: '' });
  const [cached, setCached] = useState(readCache), [live, setLive] = useState<Board | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(true), [refresh, setRefresh] = useState(0), [clock, setClock] = useState(Date.now), [serverOffset, setServerOffset] = useState(0);
  useEffect(() => {
    let active = true, refreshTimer: ReturnType<typeof setTimeout>;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
    setBusy(true); setError(''); setLive(null);
    const params = new URLSearchParams({ kind: query.kind, page: String(query.page) });
    if (query.tier) params.set('tier', query.tier); if (query.revision) params.set('revision', query.revision);
    void (async () => {
      try {
        const response = await fetch('/api/leaderboard?' + params, { credentials: viewer ? 'same-origin' : 'omit', cache: 'no-store', signal: controller.signal });
        if (response.status === 409 && query.revision) { if (active) { setQuery(q => ({ ...q, page: 0, revision: '' })); setCached(null); } return; }
        if (response.status === 401) throw Error('rank.accountChanged');
        if (!response.ok) throw Error('rank.offline');
        const result: Board = await response.json();
        if (result.viewer?.playerId !== viewer?.playerId || result.viewer?.provider !== viewer?.provider) throw Error('rank.accountChanged');
        if (!active) return;
        setLive(result); const copy = publicBoard(result); setCached(copy); setClock(Date.now()); setServerOffset(result.serverNow - Date.now());
        try { localStorage.setItem(CACHE, JSON.stringify(copy)); } catch { /* Public display cache is optional. */ }
        refreshTimer = setTimeout(() => { if (active) setQuery(q => ({ ...q, page: 0, revision: '' })); }, Math.max(0, result.refreshAt - result.serverNow));
      } catch (e) { if (active) setError(e instanceof Error && e.message === 'rank.accountChanged' ? e.message : 'rank.offline'); }
      finally { clearTimeout(timer); if (active) setBusy(false); }
    })();
    const retry = () => setRefresh(n => n + 1);
    window.addEventListener('online', retry);
    return () => { active = false; controller.abort(); clearTimeout(timer); clearTimeout(refreshTimer); window.removeEventListener('online', retry); };
  }, [query, refresh, viewer?.playerId, viewer?.provider, timeout]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []); // config-exempt: display-only countdown cadence
  const data = live ?? (cached?.period.kind === query.kind && (!query.tier || cached.tier === query.tier) && cached.page === query.page ? cached : null);
  const date = (at: number) => new Date(at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const remaining = data ? Math.max(0, Math.ceil((data.period.endsAt - clock - serverOffset) / 3600000)) : 0; // config-exempt: hours-to-calendar UI conversion
  const row = (r: Board['rows'][number], me = false) => <li key={r.id} className={me ? 'rank-row is-me' : 'rank-row'}>
    <b className="rank-number">{num(r.rank)}</b><div><strong>{me ? t('rank.you') : t('rank.alias', { id: r.id.slice(0, 8).toUpperCase() })}</strong><small>{t('rank.stats', { reputation: num(r.reputation), level: num(r.lifePath) })}</small></div><b className="rank-earned">{num(r.earned)}<small>{t('coins')}</small></b>
  </li>;
  return <section className="leaderboard" aria-label={t('rank.title')} aria-busy={busy}>
    <div className="rank-tabs">{['ranking', 'contest'].map(kind => <button key={kind} aria-pressed={query.kind === kind} onClick={() => setQuery({ kind, tier: '', page: 0, revision: '' })}>{t(`season.${kind}`)}</button>)}</div>
    {data && <><div className="rank-heading"><label>{t('rank.tier')}<select value={data.tier} onChange={e => setQuery(q => ({ ...q, tier: e.target.value, page: 0, revision: '' }))}>{data.tiers.map(tier => <option key={tier} value={tier}>{t(`league.${tier}`)}</option>)}</select></label><p>{t('season.remaining', { days: Math.floor(remaining / 24), hours: remaining % 24 })}{remaining <= 24 && <strong>{t('rank.ending')}</strong>}</p></div><p className="rank-asof">{t(live ? 'rank.updated' : 'rank.cached', { date: date(data.updatedAt) })}</p></>}
    <p className="rank-status" role={error ? 'alert' : 'status'}>{error ? t(error) : busy ? t('rank.loading') : t('rank.authoritative')}</p>
    <button className="secondary" disabled={busy} onClick={() => { setQuery(q => ({ ...q, page: 0, revision: '' })); setRefresh(n => n + 1); }}>{t('rank.refresh')}</button>
    {data && <><ol className="rank-list" aria-label={t('rank.title')}>{data.rows.map(r => row(r))}</ol>{data.rows.length === 0 && <p>{t('rank.empty')}</p>}<div className="rank-pages"><span>{t('rank.page', { page: data.page + 1, total: num(data.total) })}</span>{data.page > 0 && <button disabled={busy || !live} onClick={() => setQuery(q => ({ ...q, tier: data.tier, page: q.page - 1, revision: data.revision }))}>{t('rank.previous')}</button>}{data.nextPage !== null && <button disabled={busy || !live} onClick={() => setQuery(q => ({ ...q, tier: data.tier, page: data.nextPage!, revision: data.revision }))}>{t('rank.next')}</button>}</div></>}
    {viewer?.provider === 'google' && <section className="rank-personal" aria-label={t('rank.mine')}><h3>{t('rank.mine')}</h3>{live?.me ? <><p>{t(`league.${live.me.tierId}`)}</p><ol className="rank-list">{[...live.neighbors, live.me].sort((a, b) => a.rank - b.rank).map(r => row(r, r.id === live.me!.id))}</ol></> : <p>{t(live ? `rank.${live.eligibility.reason ?? 'insufficientShifts'}` : 'rank.verifyOwn')}</p>}{live?.eligibility.review && live.eligibility.review !== 'approved' && <p>{t(`rank.review.${live.eligibility.review}`)}</p>}</section>}
    {viewer?.provider !== 'google' && <p>{t('account.guestCopy')}</p>}
  </section>;
}
