import { isEconomy2, type Config } from './config';
import type { WorldView } from './types';

/** Stored contract terms survive config changes; deposit refunds are not earnings. */
export function leaveLocationQuote(w: WorldView) {
  const lease = w.lease;
  const refund = lease && !lease.forfeitOnEarlyLeave ? lease.deposit : 0;
  const reason = !lease ? 'leaseChanged' : lease.expired ? 'leaseRefundPending' : w.phase !== 'resting' ? 'locationOutsideShift' :
    !Number.isSafeInteger(w.coins + refund) ? 'rewardOverflow' : null;
  return { leaseId: lease?.id ?? null, refund, forfeitedDeposit: lease ? lease.deposit - refund : 0, reason, ok: reason === null };
}

export function leaseQuote(w: WorldView, config: Config, locationId: string) {
  const c = config.values, modern = isEconomy2(c);
  const location = modern ? c.locations.list.find(row => row.id === locationId) : undefined;
  const days = c.locations.leaseDays;
  const rent = location ? location.rentPerDayBase * days : 0, deposit = Math.round(rent * c.locations.depositRate), cost = rent + deposit;
  const expiresAt = w.now + days * 86400000; // config-exempt: calendar days to milliseconds
  const previous = leaveLocationQuote(w), requiredLifePath = location?.gateLifePath ?? 0;
  const safe = [rent, deposit, cost, w.coins, expiresAt, w.coins - cost + previous.refund].every(n => Number.isSafeInteger(n) && n >= 0) && Number.isFinite(new Date(expiresAt).getTime());
  const reason = !modern ? 'locationConfigRequired' : !location || location.id === c.locations.fallback ? 'locationUnavailable' :
    w.lease?.expired ? 'leaseRefundPending' : w.phase !== 'resting' ? 'locationOutsideShift' : location.id === w.location ? 'locationSelected' :
    w.lifePath < requiredLifePath ? 'lifePathRequired' : w.coins < cost ? 'notEnoughCoins' : !safe ? 'rewardOverflow' : null;
  return { location, days, rent, deposit, cost, expiresAt, requiredLifePath, leaseId: previous.leaseId,
    forfeitedDeposit: previous.forfeitedDeposit, refund: previous.refund, reason, ok: reason === null };
}
