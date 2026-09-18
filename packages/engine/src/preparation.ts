import { isEconomy2, type Config } from './config';
import { dishUnlocked } from './rules';
import { beerStatus } from './production';
import { kitchenStatus } from './kitchen';
import type { Order, WorldView } from './types';

export const PREPARATION_CAUSES = ['ready', 'beerStock', 'beerRefill', 'glasses', 'foodStock', 'pan', 'tap', 'preparing', 'locked', 'queued', 'mixed', 'unknown'] as const;
export type PreparationCause = typeof PREPARATION_CAUSES[number];

/** Current whole-order status, never a claim about how long a resource was unavailable. */
export function orderPreparation(w: WorldView, c: Config, order: Order | null | undefined): PreparationCause {
  if (!order || !['pending', 'grace'].includes(order.state) || !order.items.length) return 'unknown';
  if (order.items.every(item => item.state === 'ready')) return 'ready';
  const beer = beerStatus(w, c), kitchen = kitchenStatus(w, c), clean = w.glasses.some(glass => glass.state === 'clean');
  const causes = new Set<PreparationCause>();
  for (const item of order.items) {
    if (item.state === 'ready') continue;
    if (item.state === 'preparing') { causes.add('preparing'); continue; }
    if (item.state !== 'pending') { causes.add('unknown'); continue; }
    if (!dishUnlocked(w, c, item.dish)) { causes.add('locked'); continue; }
    if (item.dish === 'bia' && beer.enabled && !w.beer) { causes.add('unknown'); continue; }
    const available = item.dish === 'bia' && beer.enabled ? beer.available : w.inventory[item.dish];
    if (available <= 0) {
      causes.add(item.dish !== 'bia' ? 'foodStock' : beer.enabled && (beer.busy > 0 || w.inventory.bia > 0) ? 'beerRefill' : 'beerStock');
    } else if (c.values.menu[item.dish].needsGlass) {
      causes.add((!beer.enabled || isEconomy2(c.values)) && beer.pouring >= beer.tapSlots ? 'tap' : !clean ? 'glasses' : 'queued');
    } else if (c.values.menu[item.dish].station === 'kitchen') {
      causes.add(kitchen.busy >= kitchen.slots ? 'pan' : 'queued');
    } else causes.add('queued');
  }
  return causes.has('unknown') ? 'unknown' : causes.size === 1 ? [...causes][0] : 'mixed';
}
