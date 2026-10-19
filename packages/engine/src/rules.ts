import { creditSeasons, seasonCreditSafe } from './seasons';
import { signboardStyle } from './signboard';
import { isEconomy2, DISHES, type Config, type Dish, type Equipment, type Rush } from './config';
import type { WorldView, Customer, Order, Table, World } from './types';

// One formatter per timezone, built on first use. An Intl.DateTimeFormat owns a native ICU formatter
// that V8 does not count in heapUsed and only frees when a major GC finalises the wrapper; built per
// call in this hot path (every step, plus nextDayAt's binary search) it grew a 3-day headless career
// to 1.4GB RSS on a 38MB JS heap. Same formatter, same output -- day keys and rollovers are unchanged.
const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();
export function dayKey(now: number, c: Config): string {
  const tz = c.values.shift.dayRollover.tz;
  let formatter = dayKeyFormatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayKeyFormatters.set(tz, formatter);
  }
  return formatter.format(now);
}
/** Project the current rush first; upcoming slots are only relevant while accepting guests. */
export function rushStatus(w: WorldView, c: Config) {
  const s = w.shift;
  const active = w.phase !== 'resting' && s && s.rush !== 'none' && s.rushUntil != null && s.rushUntil > w.now ? { kind: s.rush, remainingMs: s.rushUntil - w.now } : null;
  const next = w.phase === 'open' ? s?.rushes.find(r => r.start > w.now) : undefined;
  return {
    active,
    next: next ? { kind: next.kind, remainingMs: next.start - w.now, warning: next.start - w.now <= c.values.rush.schedule.warningMs } : null,
  };
}
export function wellRestedRemaining(w: WorldView): number {
  return w.phase === 'resting' || w.shift?.wellRestedUntil == null ? 0 : Math.max(0, w.shift.wellRestedUntil - w.now);
}
/** Base payment/tip remain the k measurement; the service boost is a separate counted credit. */
export function wellRestedBonus(w: WorldView, c: Config, payment: number, tip: number): number {
  const bonus = wellRestedRemaining(w) > 0 ? Math.round((payment + tip) * c.values.shift.wellRested.mult) - payment - tip : 0;
  if (!Number.isSafeInteger(bonus) || bonus < 0) throw Error('ledger:invalid-bonus');
  return bonus;
}
export function stockCap(w: WorldView, c: Config): number { return c.values.upgrades.stall.stockCap[w.equipment.stall - 1]; }
export function queueSlots(w: WorldView, c: Config): number {
  return c.values.runtime.queueBaseSlots + Math.floor(w.tables.reduce((s, t) => s + t.capacity, 0) / c.values.runtime.queueSeatsPerSlot);
}
export function dishUnlocked(w: WorldView, c: Config, dish: Dish): boolean { return w.equipment.kitchen >= c.values.menu[dish].unlock.kitchenLevel; }
export function restockQuote(w: WorldView, c: Config, dish: Dish, mode: 'bulk' | 'full' | 'one') {
  const missing = stockCap(w, c) - w.inventory[dish];
  const batch = c.values.inventory.bulkSize;
  const quantity = mode === 'full' ? missing : mode === 'bulk' ? batch : 1;
  const menu = c.values.menu[dish];
  const cost = Math.floor(quantity / batch) * batch * menu.bulkCost + quantity % batch * menu.unitCost;
  return { quantity, cost, ok: dishUnlocked(w, c, dish) && quantity > 0 && quantity <= missing && w.coins >= cost };
}
export function upgradeQuote(w: WorldView, c: Config, kind: Equipment, outsideShiftOnly = false, lifePathGate = true) {
  const prices = c.values.upgrades[kind].priceBase;
  const next = w.equipment[kind] + 1;
  const index = kind === 'kitchen' ? next : next - 1;
  const cost = prices[index];
  const requiredLifePath = lifePathGate && isEconomy2(c.values) ? c.values.upgrades.lifePathGate[kind][index] ?? 0 : 0;
  const reason = cost == null ? 'maxLevel' : w.lifePath < requiredLifePath ? 'lifePathRequired' : w.coins < cost ? 'notEnoughCoins' : outsideShiftOnly && w.phase !== 'resting' ? 'outsideShiftOnly' : null;
  return { next, cost: cost ?? null, requiredLifePath, ok: reason === null, reason };
}
/**
 * What `upgradeTable` will answer for this table, refusals in the command's own order. `gate` is the part a suggestion must respect
 * whatever the table is doing right now (top level, badge, reputation); `reason` adds the busy table and the wallet on top of it.
 */
export function tableUpgradeQuote(w: WorldView, c: Config, table: Table, outsideShiftOnly = false) {
  const level = c.values.upgrades.table.levels[table.level];
  const cost = level?.priceBase ?? null;
  const gate = !level ? 'maxLevel' as const : level.requiredBadge && !w.badges.includes(level.requiredBadge) ? 'badgeRequired' as const
    : level.repBase && w.reputation < level.repBase[0] ? 'reputationRequired' as const : null;
  const reason = outsideShiftOnly && w.phase !== 'resting' ? 'outsideShiftOnly' as const : table.state !== 'empty' ? 'tableBusy' as const
    : gate ?? (w.coins < cost! ? 'notEnoughCoins' as const : null);
  return { next: level ?? null, cost, gate, reason, ok: reason === null };
}
/** What `buyTable` will answer: the next table's seats are priced one by one from `extraSeatPriceBase`, refusals in the command's order. */
export function buyTableQuote(w: WorldView, c: Config, outsideShiftOnly = false) {
  const u = c.values.upgrades, seats = w.tables.reduce((sum, t) => sum + t.capacity, 0);
  const capacity = u.table.levels[c.values.runtime.initialTableLevel - 1].capacity, prices = u.extraSeatPriceBase as Record<string, number>;
  let cost: number | null = 0;
  for (let i = 1; i <= capacity && cost !== null; i++) { const price = prices[String(seats + i)]; cost = price === undefined ? null : cost + price; }
  const reason = outsideShiftOnly && w.phase !== 'resting' ? 'outsideShiftOnly' as const : w.tables.length >= u.table.maxTables ? 'maxTables' as const
    : cost === null ? 'seatPriceUnconfigured' as const : w.coins < cost ? 'notEnoughCoins' as const : null;
  return { cost, capacity, reason, ok: reason === null };
}
/** Owned glasses are the purchase ceiling; there is no second lifetime purchase counter. */
export function buyGlassQuote(w: WorldView, c: Config, count: number) {
  const capacity = Math.min(c.values.glasses.buyCap, c.values.glasses.storageCap);
  const cost = count * c.values.glasses.priceBase;
  const reason = !Number.isSafeInteger(count) || count <= 0 ? 'invalidQuantity' : count > capacity - w.glasses.length ? 'glassCapacity' : !Number.isSafeInteger(cost) || cost < 0 ? 'invalidCost' : w.coins < cost ? 'notEnoughCoins' : null;
  return { count, cost, capacity, owned: w.glasses.length, ok: reason === null, reason };
}
/** One level owns purchase state; dog stats and requirements remain in the config. */
export function dogUpgradeQuote(w: WorldView, c: Config) {
  const next = c.values.dog.levels.find(level => level.level === w.dogLevel + 1) ?? null;
  const materials = Object.entries(next?.materials ?? {}).map(([dish, quantity]) => ({ dish: dish as Dish, quantity, have: w.inventory[dish as Dish] }));
  const cost = next?.coinBase ?? null;
  return { next, materials, cost, ok: cost !== null && Number.isSafeInteger(cost) && cost >= 0 && w.coins >= cost && materials.every(m => m.have >= m.quantity) };
}
export function freshnessMs(w: WorldView, c: Config): number {
  const base = c.values.upgrades.cooler.freshnessMs[w.equipment.cooler - 1];
  return base === null ? Infinity : base * c.values.weather[w.shift?.weather ?? 'sunny'].freshnessMult;
}
export function rushConfig(c: Config, rush: Rush) { return c.values.rush[rush]; }
export function customerValue(w: WorldView, c: Config, order: Order, customer: Customer) {
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
export function kickAllQuote(w: WorldView, c: Config) {
  const guests = w.tables.flatMap(table => currentGuests(table).map(customer => ({
    customerId: customer.id, tableId: table.id as string | null, orderId: table.order?.id ?? null,
    fee: table.order ? customerValue(w, c, table.order, customer).penalty : 0,
  })));
  for (const group of w.queue) for (const customer of group.customers) guests.push({ customerId: customer.id, tableId: null, orderId: null, fee: 0 });
  const cost = guests.reduce((sum, guest) => sum + guest.fee, 0);
  if (!Number.isSafeInteger(cost) || cost < 0) throw Error('ledger:invalid-close-fee');
  return { guests, cost, deliveryBlocked: w.delivery !== null, ok: w.phase !== 'resting' && c.values.shift.kickAllAllowed && w.coins >= cost && !w.delivery };
}
/** All credit consumers use the same day cap before mutation. */
export function creditQuote(w: WorldView, c: Config, amount: number, source: string) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw Error('ledger:invalid-credit');
  const counted = (w.seasons?.ranking.countedSources ?? c.values.ledgers.countedSources).includes(source);
  const day = dayKey(w.now, c);
  const credited = counted ? Math.min(amount, Math.max(0, c.values.shift.dailyEarnCapBase - (w.dayEarned[day] ?? 0))) : amount;
  return { credited, counted, day };
}
/** The only faucet entry point. Spending/rewards cannot accidentally inflate league scores. */
export function credit(w: World, c: Config, amount: number, source: string): number {
  const { credited, counted, day } = creditQuote(w, c, amount, source);
  if (!seasonCreditSafe(w, credited, source)) throw Error('ledger:unsafe-season-credit');
  w.coins += credited;
  if (counted) {
    w.dayEarned[day] = (w.dayEarned[day] ?? 0) + credited;
    if (!w.seasons) w.seasonEarned += credited;
    w.lifetimeEarned += credited;
  }
  creditSeasons(w, c, credited, source);
  return credited;
}
/** Run the same ledger mutation on its small writable projection before a whole order commits. */
export function creditBatchSafe(w: World, c: Config, credits: { amount: number; source: string }[]): boolean {
  const day = dayKey(w.now, c);
  const trial: World = { ...w, dayEarned: { [day]: w.dayEarned[day] ?? 0 },
    seasons: w.seasons ? { ...w.seasons, ranking: { ...w.seasons.ranking }, contest: { ...w.seasons.contest } } : undefined };
  for (const { amount, source } of credits) {
    if (!Number.isSafeInteger(amount) || amount < 0) return false;
    const quote = creditQuote(trial, c, amount, source);
    if (!seasonCreditSafe(trial, quote.credited, source)) return false;
    credit(trial, c, amount, source);
    if (![trial.coins, trial.lifetimeEarned, trial.seasonEarned, trial.seasons?.contestEarned ?? 0, trial.dayEarned[day]].every(n => Number.isSafeInteger(n) && n >= 0)) return false;
  }
  return true;
}
export function deliveryInterval(w: WorldView, c: Config) {
  const style = signboardStyle(w, c), mult = style && 'shipperMult' in style ? Number(style.shipperMult) : 1;
  return Math.round(c.values.customerTypes.shipper.spawnIntervalMs / c.values.weather[w.shift?.weather ?? 'sunny'].shipperMult / mult);
}
export function deliveryQuote(w: WorldView, c: Config) {
  const order = w.delivery;
  if (!order) return null;
  const lines = order.lines.map(line => ({ ...line, have: w.inventory[line.dish] }));
  const gross = lines.reduce((sum, line) => sum + c.values.menu[line.dish].price * line.quantity, 0);
  const net = Math.round(gross * c.values.customerTypes.shipper.netRate), bonus = wellRestedBonus(w, c, net, 0);
  const { credited, counted, day } = creditQuote(w, c, net + bonus, 'shipperNet');
  const creditedBonus = credited - creditQuote(w, c, net, 'shipperNet').credited, stats = w.shift?.stats;
  const safe = seasonCreditSafe(w, credited, 'shipperNet') && [gross, net, bonus, credited, w.coins + credited, ...(counted ? [(w.dayEarned[day] ?? 0) + credited, w.seasonEarned + credited, w.lifetimeEarned + credited] : []),
    (stats?.deliveryNet ?? 0) + net, (stats?.deliveryBonus ?? 0) + creditedBonus, (stats?.wellRestedBonus ?? 0) + creditedBonus, (stats?.credited ?? 0) + credited].every(n => Number.isSafeInteger(n) && n >= 0);
  return { order, lines, gross, net, bonus, credited, creditedBonus, safe, penalty: Math.round(gross * c.values.customerTypes.shipper.missPenaltyRate),
    ready: lines.every(line => line.have >= line.quantity), remainingMs: Math.max(0, order.expiresAt - w.now) };
}
/** Project a complete gift before applying it; reward consumers share this overflow calculation. */
export function stockGiftQuote(w: WorldView, c: Config, stock: Partial<Record<Dish, number>>) {
  let overflow = 0;
  const added = {} as Record<Dish, number>;
  for (const dish of DISHES) {
    const value = stock[dish] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0) throw Error('inventory:invalid-gift');
    added[dish] = dishUnlocked(w, c, dish) ? Math.min(value, Math.max(0, stockCap(w, c) - w.inventory[dish])) : 0;
    if (dishUnlocked(w, c, dish)) overflow += (value - added[dish]) * c.values.menu[dish].unitCost;
  }
  if (!Number.isSafeInteger(overflow) || overflow < 0) throw Error('inventory:invalid-overflow');
  return { added, overflow };
}
export function addStock(w: World, c: Config, stock: Partial<Record<Dish, number>>): number {
  const q = stockGiftQuote(w, c, stock);
  for (const dish of DISHES) w.inventory[dish] += q.added[dish];
  return credit(w, c, q.overflow, 'giftOverflow');
}
