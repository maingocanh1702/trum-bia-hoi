import type { Config } from './config';
import type { World } from './types';
import { dishUnlocked } from './rules';

/** Read the existing prep pipeline; pending jobs have no promised completion time. */
export function kitchenStatus(w: World, c: Config) {
  const level = w.equipment.kitchen, slots = c.values.upgrades.kitchen.slots[level];
  const jobs = w.tables.flatMap((table, index) => {
    const order = table.order;
    if (!order || !['pending', 'grace'].includes(order.state)) return [];
    return order.items.filter(item => c.values.menu[item.dish].station === 'kitchen' && ['pending', 'preparing', 'ready'].includes(item.state)).map(item => ({
      itemId: item.id, tableId: table.id, tableNumber: index + 1, orderId: order.id, dish: item.dish,
      state: item.state === 'pending' ? !dishUnlocked(w, c, item.dish) ? 'locked' : w.inventory[item.dish] <= 0 ? 'stock' : 'queued' : item.state,
      remainingMs: item.state === 'preparing' && item.readyAt !== null ? Math.max(0, item.readyAt - w.now) : null,
      late: item.state === 'preparing' && item.readyAt !== null && item.readyAt >= order.placedAt + order.patienceMs,
    }));
  });
  const busy = jobs.filter(job => job.state === 'preparing').length;
  return { level, slots, busy, jobs };
}
