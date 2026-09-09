import { isEconomy2, leaseQuote, leaveLocationQuote, type WorldView, type Config, type Command } from '../../../packages/engine/src';

export function Locations({ world: w, config, run, t, locale }: { world: WorldView; config: Config; run: (command: Command) => void; t: (key: string, params?: Record<string, string | number>) => string; locale: string }) {
  const num = (n: number) => n.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const end = (at: number) => new Date(at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const leave = leaveLocationQuote(w), c = config.values;
  const hours = w.lease ? Math.ceil(Math.max(0, w.lease.expiresAt - w.now) / 3600000) : 0;
  return <div className="locations-panel">
    <section className="location-current" aria-label={t('lease.current')}>
      <span>{t('lease.current')}</span><h3>{t(`location.${w.location}`)}</h3>
      {w.lease ? <><p>{w.lease.expired ? t('error.leaseRefundPending') : t('lease.ends', { date: end(w.lease.expiresAt) })}</p>
        {!w.lease.expired && <p>{t('lease.remaining', { days: Math.floor(hours / 24), hours: hours % 24 })}</p>}
        <p>{t('lease.deposit', { cost: num(w.lease.deposit) })}</p>
        {!w.lease.expired && <><p>{t('lease.early', { cost: num(leave.forfeitedDeposit) })}</p><button disabled={!leave.ok} onClick={() => run({ type: 'leaveLocation', leaseId: leave.leaseId! })}>{t('lease.leave', { cost: num(leave.forfeitedDeposit) })}</button></>}
      </> : <p>{t('lease.free')}</p>}
    </section>
    <p>{t('lease.calendar')}</p>{w.phase !== 'resting' && <p role="status">{t('error.locationOutsideShift')}</p>}
    {w.lease && !w.lease.expired && <p className="lease-warning">{t('lease.switch', { cost: num(leave.forfeitedDeposit) })}</p>}
    {!isEconomy2(c) ? <p>{t('error.locationConfigRequired')}</p> : <ol className="location-options">{c.locations.list.filter(row => row.id !== c.locations.fallback).map(row => {
      const q = leaseQuote(w, config, row.id);
      return <li key={row.id} data-location={row.id}><header><h3>{t(`location.${row.id}`)}</h3><b>×{row.mult}</b></header>
        <dl><div><dt>{t('lease.rent', { days: q.days })}</dt><dd>{num(q.rent)} {t('coins')}</dd></div><div><dt>{t('lease.refundable')}</dt><dd>{num(q.deposit)} {t('coins')}</dd></div></dl>
        <button className="primary full" disabled={!q.ok} onClick={() => run({ type: 'rentLocation', locationId: row.id, leaseId: q.leaseId, maxCost: q.cost })}>{t(w.lease ? 'lease.move' : 'lease.rentButton', { name: t(`location.${row.id}`), cost: num(q.cost) })}</button>
        {q.reason && <small>{q.reason === 'lifePathRequired' ? t('lease.gate', { n: q.requiredLifePath }) : t(`error.${q.reason}`)}</small>}
      </li>;
    })}</ol>}
  </div>;
}
