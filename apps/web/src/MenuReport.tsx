import type { menuReport } from '../../../packages/engine/src';
import { menuAsset, Sprite } from './assets';

export function MenuReport({ report, t, num, locale }: { report: ReturnType<typeof menuReport>; t: (key: string, params?: Record<string, string | number>) => string; num: (n: number) => string; locale: 'vi' | 'en' }) {
  const metrics = report?.metrics;
  const decimal = (n: number | null, percent = false) => n === null ? t('menu.noValue') : new Intl.NumberFormat(locale, { style: percent ? 'percent' : 'decimal', maximumFractionDigits: 4 }).format(n);
  return <section className="menu-report" aria-label={t('menu.title')}>
    <h3>{t('menu.title')}</h3>
    {!report ? <p>{t('menu.unavailable')}</p> : <>
      {!report.complete && <p className="menu-partial">{t('menu.partial')}</p>}
      <table><thead><tr><th scope="col">{t('menu.dish')}</th><th scope="col">{t('menu.ordered')}</th><th scope="col">{t('menu.sold')}</th><th scope="col">{t('menu.wasted')}</th></tr></thead>
        <tbody>{report.rows.map(row => <tr key={row.dish} data-dish={row.dish}><th scope="row"><Sprite id={menuAsset[row.dish]} /><span>{t(`dish.${row.dish}`)}</span></th><td>{num(row.ordered)}</td><td>{num(row.sold)}</td><td>{num(row.wasted)}</td></tr>)}</tbody>
      </table>
      <dl><div><dt>{t('menu.tables')}</dt><dd>{num(report.orders)}</dd></div><div><dt>{t('menu.average')}</dt><dd data-metric="avgTicket">{report.avgTicket === null ? t('menu.noValue') : num(report.avgTicket)}</dd></div></dl>
      <p>{t('menu.note')}</p>
      <details className="shift-metrics"><summary>{t('metrics.details')}</summary>
        <section aria-label={t('metrics.title')}><h4>{t('metrics.title')}</h4>
          {!metrics ? <p>{t('metrics.unavailable')}</p> : <>
            <dl>{(['served', 'mean', 'kValue', 'moiRate', 'staleRate', 'lost'] as const).map(key => <div key={key}>
              <dt>{t(`metrics.${key}`)}</dt><dd data-metric={key} title={metrics[key] === null ? undefined : String(metrics[key])}>{decimal(metrics[key], key === 'moiRate' || key === 'staleRate')}</dd>
            </div>)}</dl>
            <p>{t('metrics.basis', { moi: num(metrics.withMoi), served: num(metrics.served), stale: num(metrics.staleBeer), beer: num(metrics.beerServed), arrived: num(metrics.arrived), rejected: num(metrics.rejected) })}</p>
            <p>{t('metrics.note')}</p>
          </>}
        </section>
      </details>
    </>}
  </section>;
}
