import { useEffect, useState } from 'react';
import { SEASON_CAPTURE_TIMEOUT_MS } from '../../shared/season-history';
import type { SeasonSnapshot } from '../../server/src/leaderboard';
export function SeasonHistory({ timeout, timeZone, t, locale, num }: { timeout: number; timeZone: string; t: (key: string, params?: Record<string, string | number>) => string; locale: string; num: (n: number) => string }) {
  const [history, setHistory] = useState<SeasonSnapshot[]>([]), [selected, setSelected] = useState(''), [tier, setTier] = useState('');
  const [status, setStatus] = useState('rank.loading'), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), SEASON_CAPTURE_TIMEOUT_MS + timeout);
    setStatus('rank.loading');
    void fetch('/api/seasons/history', { credentials: 'omit', cache: 'no-store', signal: controller.signal }).then(async r => {
      if (!r.ok) throw Error('history');
      const rows: SeasonSnapshot[] = await r.json();
      if (active) { setHistory(rows); setStatus(''); }
    }).catch(() => { if (active) setStatus('rank.offline'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [timeout, retry]);
  const season = history.find(s => s.period.id === selected) ?? history[0];
  const chosenTier = season?.tiers.includes(tier) ? tier : season?.tiers[0];
  const rows = season?.rows.filter(r => r.tierId === chosenTier && r.rank <= season.wallSize) ?? [];
  const date = (at: number) => new Date(at).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone, year: 'numeric', month: 'short', day: 'numeric' });
  const list = (podium: boolean) => <ol className="rank-list" aria-label={t(podium ? 'shrine.podium' : 'shrine.wall')}>{rows.filter(r => podium ? r.rank <= season!.shrineTop : r.rank > season!.shrineTop).map(r => <li className="rank-row" key={r.id}>
    <b className="rank-number">{num(r.rank)}</b><div><strong>{t(r.name.key, { id: r.name.id })}</strong><small>{t('rank.stats', { reputation: num(r.reputation), level: num(r.lifePath) })}</small></div><b className="rank-earned">{num(r.earned)}<small>{t('coins')}</small></b>
  </li>)}</ol>;
  return <section className="season-archive" aria-label={t('shrine.title')} aria-busy={status === 'rank.loading'}>
    <h3>{t('shrine.title')}</h3><p>{t('shrine.frozen')}</p>
    {status && <p role={status === 'rank.offline' ? 'alert' : 'status'}>{t(status)}</p>}
    {status === 'rank.offline' && <button onClick={() => setRetry(n => n + 1)}>{t('rank.refresh')}</button>}
    {!status && !season && <p>{t('shrine.empty')}</p>}
    {season && <><div className="rank-heading"><label>{t('shrine.season')}<select value={season.period.id} onChange={e => setSelected(e.target.value)}>{history.map(s => <option key={s.period.id} value={s.period.id}>{t(`season.${s.period.kind}`)} · {date(s.period.endsAt)}</option>)}</select></label>
      <label>{t('rank.tier')}<select value={chosenTier} onChange={e => setTier(e.target.value)}>{season.tiers.map(id => <option key={id} value={id}>{t(`league.${id}`)}</option>)}</select></label></div>
      <p>{t('shrine.captured', { date: date(season.capturedAt) })}</p><h4>{t('shrine.podium')}</h4>{list(true)}<h4>{t('shrine.wall')}</h4>{list(false)}{!rows.length && <p>{t('rank.empty')}</p>}
    </>}
  </section>;
}
