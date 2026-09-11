import type { kitchenStatus } from '../../../packages/engine/src';
import { menuAsset, Sprite } from './assets';

export function Kitchen({ status, onTable, onStock, t }: { status: ReturnType<typeof kitchenStatus>; onTable: (tableId: string) => void; onStock: () => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  return <section className="kitchen-panel" aria-label={t('kitchen.live')}>
    {status.level > 0 && <header><h3>{t('kitchen.live')}</h3><b>{t('kitchen.slots', { busy: status.busy, total: status.slots })}</b></header>}
    {status.level > 0 && <p>{t('production.portions', { n: status.portionsPerPan })}</p>}
    <div className="kitchen-slots" aria-hidden="true">{Array.from({ length: status.slots }, (_, i) => <span key={i} className={i < status.busy ? 'is-cooking' : ''}>{i + 1}</span>)}</div>
    {!status.level ? <p>{t('kitchen.locked')}</p> : !status.jobs.length ? <p>{t('kitchen.idle')}</p> : <>
      <p>{t('kitchen.tableHint')}</p>
      <ol className="kitchen-jobs">{status.jobs.map(job => <li key={job.itemId} data-item={job.itemId} data-state={job.state} className={job.late ? 'is-late' : ''}>
        <button onClick={() => onTable(job.tableId)}><Sprite id={menuAsset[job.dish]} /><span><strong>{t(`dish.${job.dish}`)}</strong><small>{t('table', { n: job.tableNumber })}</small></span><span className="kitchen-job-state">{t(`kitchen.${job.state}`)}{job.remainingMs !== null && <time>{t('kitchen.seconds', { n: Math.ceil(job.remainingMs / 1000) })}</time>}</span></button>
        {job.late && <small className="kitchen-warning">{t('kitchen.late')}</small>}
      </li>)}</ol>
    </>}
    {status.jobs.some(job => job.state === 'stock') && <button className="secondary full" onClick={onStock}>{t('nav.stock')}</button>}
  </section>;
}
