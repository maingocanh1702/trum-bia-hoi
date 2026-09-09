import { DISHES, type Config } from './config';
import type { ServeRecord, World } from './types';

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
  for (let i = shift.menu.eventStart; i < w.events.length; i++) {
    const event = w.events[i];
    if (event.data.shiftId !== shift.id) continue;
    const row = byDish.get(event.data.dish as typeof DISHES[number]);
    if (row && event.type === 'dish_ordered') row.ordered++;
    if (row && event.type === 'dish_wasted') row.wasted++;
  }
  const serves = w.serves.slice(shift.menu.serveStart);
  for (const serve of serves) for (const dish of serve.dishes) byDish.get(dish)!.sold++;
  return { shiftId: shift.id, complete: shift.menu.complete, rows, ...serveValueStats(serves, c) };
}
