import type { menuReport } from '../../../packages/engine/src';
import { menuAsset, Sprite } from './assets';

export function MenuReport({ report, t, num }: { report: ReturnType<typeof menuReport>; t: (key: string) => string; num: (n: number) => string }) {
  return <section className="menu-report" aria-label={t('menu.title')}>
    <h3>{t('menu.title')}</h3>
    {!report ? <p>{t('menu.unavailable')}</p> : <>
      {!report.complete && <p className="menu-partial">{t('menu.partial')}</p>}
      <table><thead><tr><th scope="col">{t('menu.dish')}</th><th scope="col">{t('menu.ordered')}</th><th scope="col">{t('menu.sold')}</th><th scope="col">{t('menu.wasted')}</th></tr></thead>
        <tbody>{report.rows.map(row => <tr key={row.dish} data-dish={row.dish}><th scope="row"><Sprite id={menuAsset[row.dish]} /><span>{t(`dish.${row.dish}`)}</span></th><td>{num(row.ordered)}</td><td>{num(row.sold)}</td><td>{num(row.wasted)}</td></tr>)}</tbody>
      </table>
      <dl><div><dt>{t('menu.tables')}</dt><dd>{num(report.orders)}</dd></div><div><dt>{t('menu.average')}</dt><dd data-metric="avgTicket">{report.avgTicket === null ? t('menu.noValue') : num(report.avgTicket)}</dd></div></dl>
      <p>{t('menu.note')}</p>
    </>}
  </section>;
}
