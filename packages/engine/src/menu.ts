import { DISHES, type Config } from './config';
import type { ServeRecord, World } from './types';
import { PREPARATION_CAUSES, type PreparationCause } from './preparation';

/** Nominal seated-customer value: delivery, caps, bonus credit and throughput never enter k. */
export function serveValueStats(serves: readonly ServeRecord[], c: Config) {
  const served = serves.length, orders = new Set(serves.map(s => s.orderId)).size;
  const total = serves.reduce((sum, s) => sum + s.payment + s.tip, 0);
  const safe = Number.isSafeInteger(total) && serves.every(s => Number.isSafeInteger(s.payment) && s.payment >= 0 && Number.isSafeInteger(s.tip) && s.tip >= 0);
  const totalValue = safe ? total : null, mean = safe && served ? total / served : null;
  const k = mean === null ? NaN : mean / c.values.k.anchorValuePerServe;
  return { served, orders, totalValue, mean, avgTicket: safe && orders ? total / orders : null, kValue: Number.isFinite(k) ? k : null };
}

/** Cursors bound the observed portion of a shift; absent legacy provenance is never zero-filled. */
export function menuReport(w: World, c: Config) {
  const shift = w.shift;
  if (!shift?.menu) return null;
  const rows = DISHES.map(dish => ({ dish, ordered: 0, sold: 0, wasted: 0 }));
  const byDish = new Map(rows.map(row => [row.dish, row]));
  const losses = Object.fromEntries([...PREPARATION_CAUSES, 'queue'].map(cause => [cause, 0])) as Record<PreparationCause | 'queue', number>;
  for (let i = shift.menu.eventStart; i < w.events.length; i++) {
    const event = w.events[i];
    if (event.data.shiftId !== shift.id) continue;
    const row = byDish.get(event.data.dish as typeof DISHES[number]);
    if (row && event.type === 'dish_ordered') row.ordered++;
    if (row && event.type === 'dish_wasted') row.wasted++;
    if (event.type === 'customer_left' && event.data.reason === 'queue') losses.queue += Number(event.data.count);
    if (event.type === 'order_expired') losses[PREPARATION_CAUSES.includes(event.data.cause as PreparationCause) ? event.data.cause as PreparationCause : 'unknown'] += Number(event.data.count);
  }
  const serves = w.serves.slice(shift.menu.serveStart);
  for (const serve of serves) for (const dish of serve.dishes) byDish.get(dish)!.sold++;
  const attributed = Object.values(losses).reduce((sum, count) => sum + count, 0);
  if (!Number.isSafeInteger(attributed) || attributed < 0 || attributed > shift.stats.lost) throw Error('report:lossProvenance');
  losses.unknown += shift.stats.lost - attributed;
  const values = serveValueStats(serves, c);
  const withMoi = serves.filter(serve => serve.hadMoi).length;
  const beerServes = serves.filter(serve => serve.dishes.includes('bia'));
  const beerServed = beerServes.length, staleBeer = beerServes.filter(serve => serve.stale).length;
  // Whole-shift KPIs need complete provenance; observed legacy fragments keep only the existing dish report.
  const metrics = shift.menu.complete ? {
    served: values.served, mean: values.mean, kValue: values.kValue,
    moiRate: values.served ? withMoi / values.served : null,
    staleRate: beerServed ? staleBeer / beerServed : null, lost: shift.stats.lost,
    withMoi, beerServed, staleBeer, arrived: shift.stats.arrived, rejected: shift.stats.rejected,
  } : null;
  return { shiftId: shift.id, complete: shift.menu.complete, rows, losses, metrics, ...values };
}
