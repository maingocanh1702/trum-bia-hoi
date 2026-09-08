import { DISHES, type Config, type Dish, type Equipment, type Rush } from './config';
import type { Customer, Order, Table, World } from './types';

export function dayKey(now: number, c: Config): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: c.values.shift.dayRollover.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
/** Project the current rush first; upcoming slots are only relevant while accepting guests. */
export function rushStatus(w: World, c: Config) {
  const s = w.shift;
  const active = w.phase !== 'resting' && s && s.rush !== 'none' && s.rushUntil != null && s.rushUntil > w.now ? { kind: s.rush, remainingMs: s.rushUntil - w.now } : null;
  const next = w.phase === 'open' ? s?.rushes.find(r => r.start > w.now) : undefined;
  return {
    active,
    next: next ? { kind: next.kind, remainingMs: next.start - w.now, warning: next.start - w.now <= c.values.rush.schedule.warningMs } : null,
  };
}
export function wellRestedRemaining(w: World): number {
  return w.phase === 'resting' || w.shift?.wellRestedUntil == null ? 0 : Math.max(0, w.shift.wellRestedUntil - w.now);
}
/** Base payment/tip remain the k measurement; the service boost is a separate counted credit. */
export function wellRestedBonus(w: World, c: Config, payment: number, tip: number): number {
  const bonus = wellRestedRemaining(w) > 0 ? Math.round((payment + tip) * c.values.shift.wellRested.mult) - payment - tip : 0;
  if (!Number.isSafeInteger(bonus) || bonus < 0) throw Error('ledger:invalid-bonus');
  return bonus;
}
export function stockCap(w: World, c: Config): number { return c.values.upgrades.stall.stockCap[w.equipment.stall - 1]; }
export function queueSlots(w: World, c: Config): number {
  return c.values.runtime.queueBaseSlots + Math.floor(w.tables.reduce((s, t) => s + t.capacity, 0) / c.values.runtime.queueSeatsPerSlot);
}
export function dishUnlocked(w: World, c: Config, dish: Dish): boolean { return w.equipment.kitchen >= c.values.menu[dish].unlock.kitchenLevel; }
export function restockQuote(w: World, c: Config, dish: Dish, mode: 'bulk' | 'full' | 'one') {
  const missing = stockCap(w, c) - w.inventory[dish];
  const batch = c.values.inventory.bulkSize;
  const quantity = mode === 'full' ? missing : mode === 'bulk' ? batch : 1;
  const menu = c.values.menu[dish];
  const cost = Math.floor(quantity / batch) * batch * menu.bulkCost + quantity % batch * menu.unitCost;
  return { quantity, cost, ok: dishUnlocked(w, c, dish) && quantity > 0 && quantity <= missing && w.coins >= cost };
}
export function upgradeQuote(w: World, c: Config, kind: Equipment) {
  const prices = c.values.upgrades[kind].priceBase;
  const next = w.equipment[kind] + 1;
  const index = kind === 'kitchen' ? next : next - 1;
  const cost = prices[index];
  return { next, cost: cost ?? null, ok: cost != null && w.coins >= cost && (w.phase === 'resting' || !c.values.upgrades.phase1UpgradesOutsideShiftOnly) };
}
export function freshnessMs(w: World, c: Config): number {
  const base = c.values.upgrades.cooler.freshnessMs[w.equipment.cooler - 1];
  return base === null ? Infinity : base * c.values.weather[w.shift?.weather ?? 'sunny'].freshnessMult;
}
export function rushConfig(c: Config, rush: Rush) { return c.values.rush[rush]; }
export function customerValue(w: World, c: Config, order: Order, customer: Customer) {
  const items = order.items.filter(i => i.customerId === customer.id);
  const type = c.values.customerTypes[customer.type];
  const rush = rushConfig(c, w.shift?.rush ?? 'none');
  const location = c.values.locations.list.find(l => l.id === w.location);
  if (!location) throw Error('state:location');
  const gross = items.reduce((s, i) => s + c.values.menu[i.dish].price, 0);
  const payment = Math.round(gross * type.paymentMult * location.mult * rush.paymentMult);
  const ratio = order.state === 'grace' ? c.values.tip.graceForcedPatienceRatio : Math.max(0, (order.placedAt + customer.patienceMs - w.now) / customer.patienceMs);
  const stale = items.some(i => i.glassId !== null && w.now >= (w.glasses.find(g => g.id === i.glassId)?.readyAt ?? Infinity) + freshnessMs(w, c));
  let tip = ratio >= c.values.tip.patienceThreshold && !stale ? Math.round(payment * c.values.tip.rate) * rush.tipMult * c.values.weather[w.shift?.weather ?? 'sunny'].tipMult * type.tipMult : 0;
  if (w.unlocks.includes('qr')) tip = Math.ceil(tip * c.values.tip.qrMult);
  tip = Math.round(tip);
  const penalty = Math.round(Math.round(gross * c.values.penalty.leaveRate * type.leavePenaltyMult) * rush.leavePenaltyMult);
  return { payment, tip, penalty, stale, ratio, dishes: items.map(i => i.dish) };
}
export function currentGuests(table: Table): Customer[] {
  if (['empty', 'cleaning', 'broken'].includes(table.state)) return [];
  if (!table.group) throw Error('state:tableGroup');
  if (table.state !== 'seating' && !table.order) throw Error('state:tableOrder');
  return table.state === 'occupied' ? table.group.customers.filter(c => c.type === 'chipheo') : table.group.customers;
}
/** Quote assigned orders only: guests still queueing/seating have not ordered or spent stock. */
export function kickAllQuote(w: World, c: Config) {
  const guests = w.tables.flatMap(table => currentGuests(table).map(customer => ({
    customerId: customer.id, tableId: table.id as string | null, orderId: table.order?.id ?? null,
    fee: table.order ? customerValue(w, c, table.order, customer).penalty : 0,
  })));
  for (const group of w.queue) for (const customer of group.customers) guests.push({ customerId: customer.id, tableId: null, orderId: null, fee: 0 });
  const cost = guests.reduce((sum, guest) => sum + guest.fee, 0);
  if (!Number.isSafeInteger(cost) || cost < 0) throw Error('ledger:invalid-close-fee');
  return { guests, cost, ok: w.phase !== 'resting' && c.values.shift.kickAllAllowed && w.coins >= cost };
}
/** The only faucet entry point. Spending/rewards cannot accidentally inflate league scores. */
export function credit(w: World, c: Config, amount: number, source: string): number {
  if (!Number.isSafeInteger(amount) || amount < 0) throw Error('ledger:invalid-credit');
  const counted = c.values.ledgers.countedSources.includes(source);
  const day = dayKey(w.now, c);
  const credited = counted ? Math.min(amount, Math.max(0, c.values.shift.dailyEarnCapBase - (w.dayEarned[day] ?? 0))) : amount;
  w.coins += credited;
  if (counted) {
    w.dayEarned[day] = (w.dayEarned[day] ?? 0) + credited;
    w.seasonEarned += credited;
    w.lifetimeEarned += credited;
  }
  return credited;
}
export function addStock(w: World, c: Config, stock: Partial<Record<Dish, number>>): number {
  let overflow = 0;
  for (const dish of DISHES) {
    const value = stock[dish] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0) throw Error('inventory:invalid-gift');
    if (!dishUnlocked(w, c, dish)) continue;
    const added = Math.min(value, Math.max(0, stockCap(w, c) - w.inventory[dish]));
    w.inventory[dish] += added;
    overflow += (value - added) * c.values.menu[dish].unitCost;
  }
  return credit(w, c, overflow, 'giftOverflow');
}
