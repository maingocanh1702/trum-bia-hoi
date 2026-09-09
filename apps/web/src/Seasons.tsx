import { seasonTier, type World, type Config } from '../../../packages/engine/src';

export function Seasons({ world: w, config, t, locale, num }: { world: World; config: Config; t: (key: string, params?: Record<string, string | number>) => string; locale: string; num: (n: number) => string }) {
  const seasons = w.seasons;
  if (!seasons) return <p>{t('season.start')}</p>;
  const date = (at: number) => new Date(at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: config.values.league.seasons.tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return <div className="seasons-panel">
    <p>{t('season.own')}</p><p className="season-peak">{t('season.peak', { tier: w.peakLeague ? t(`league.${w.peakLeague}`) : t('season.none') })}</p>
    {(['ranking', 'contest'] as const).map(kind => {
      const period = seasons[kind], q = seasonTier(w, config, kind), hours = Math.ceil(Math.max(0, period.endsAt - w.now) / 3600000);
      return <section key={kind} className="journey-summary" aria-label={t(`season.${kind}`)}>
        <span>{t(`season.${kind}`)} · {t('season.remaining', { days: Math.floor(hours / 24), hours: hours % 24 })}</span>
        <h3>{t(`league.${q.tier.id}`)}</h3><strong>{num(q.earned)} {t('coins')}</strong>
        {q.next ? <><progress aria-label={t('season.next', { tier: t(`league.${q.next.id}`) })} max={q.next.minSeasonEarnedBase} value={q.earned} /><p>{t('season.need', { amount: num(q.next.minSeasonEarnedBase - q.earned), tier: t(`league.${q.next.id}`) })}</p></> : <p>{t('season.max')}</p>}
        <p>{t('season.ends', { date: date(period.endsAt) })} · {t('season.shifts', { n: period.closedShifts })}</p>
      </section>;
    })}
    <p>{t('season.calendar')}</p><h3>{t('season.history')}</h3>
    {seasons.results.length ? <ol className="season-history">{seasons.results.slice(-config.values.leaderboard.historySeasonsKept).reverse().map(row => <li key={row.id}><strong>{t(`season.${row.kind}`)} · {t(`league.${row.tierId}`)}</strong><span>{num(row.earned)} {t('coins')} · {date(row.endsAt)}</span></li>)}</ol> : <p>{t('season.empty')}</p>}
    {seasons.legacy.earned > 0 && <p>{t('season.legacy', { amount: num(seasons.legacy.earned) })}</p>}
  </div>;
}
