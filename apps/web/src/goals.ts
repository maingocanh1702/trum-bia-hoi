import { BUSINESS_UNLOCKS, EQUIPMENT, buyTableQuote, config as seed, flyerQuote, signboardQuote, tableUpgradeQuote, unlockQuote, upgradeQuote, type BusinessUnlock, type Config, type Equipment, type WorldView } from '../../../packages/engine/src';

/**
 * F27/P0 "Mục tiêu kế tiếp": every purchasable thing of the Upgrades sheet as data. The goal chip picks from this list and the sheet
 * draws its three lanes from it, so a new item (S6: chairs, new dishes) is one more provider here — neither the chip nor its rule changes.
 * Pure projections of engine state and the engine's own quotes: no game rule lives here.
 */
export type Lane = 'capacity' | 'speed' | 'guests';
/** Chip priority (PLAN §4 fun-next-goal): capacity first, then speed, then guests. */
export const LANES: readonly Lane[] = ['capacity', 'speed', 'guests'];

/** Which card of the sheet shows the item. */
export type Card =
  | { kind: 'table'; tableId: string } | { kind: 'buyTable' } | { kind: 'equipment'; equipment: Equipment }
  | { kind: 'business'; item: BusinessUnlock } | { kind: 'flyer' } | { kind: 'signboard' };
/** An i18n key; `keyed` params are themselves keys, translated before they are interpolated. */
export interface Copy { key: string; params?: Record<string, string | number>; keyed?: Record<string, string> }

export interface Goal {
  id: string; lane: Lane; card: Card;
  name: Copy; effect: Copy | null; // the effect is one number: what the player gets
  currency: 'coins' | 'rep';
  cost: number | null; // null: nothing left to buy (top level, owned)
  eligible: boolean; // may be suggested: something is left to buy and every gate (life path, badge, reputation, stall level) is open
  busy: boolean; // only a table in use stands in the way: still a fine goal, but an empty one is better
}
type Provider = (w: WorldView, c: Config) => Goal[];
const goal = (g: Omit<Goal, 'busy' | 'currency'> & Partial<Pick<Goal, 'busy' | 'currency'>>): Goal => ({ busy: false, currency: 'coins', ...g });

const tables: Provider = (w, c) => w.tables.map((table, i) => {
  const q = tableUpgradeQuote(w, c, table);
  return goal({ id: `table:${table.id}`, lane: 'capacity', card: { kind: 'table', tableId: table.id }, name: { key: 'goal.table', params: { n: i + 1 } },
    effect: q.next ? { key: 'goal.fx.seats', params: { n: q.next.capacity } } : null, cost: q.cost, eligible: q.cost !== null && q.gate === null, busy: q.reason === 'tableBusy' });
});
const newTable: Provider = (w, c) => {
  const q = buyTableQuote(w, c);
  return [goal({ id: 'buyTable', lane: 'capacity', card: { kind: 'buyTable' }, name: { key: 'goal.buyTable' }, effect: { key: 'goal.fx.seatsAdded', params: { n: q.capacity } },
    cost: q.cost, eligible: q.cost !== null && q.reason !== 'maxTables' })];
};
function equipmentEffect(c: Config, kind: Equipment, at: number): Copy | null {
  const u = c.values.upgrades;
  if (kind === 'keg') return { key: 'goal.fx.taps', params: { n: u.keg.pourSlots[at] } };
  if (kind === 'washer') return { key: 'goal.fx.wash', params: { n: u.washer.slots[at] } };
  if (kind === 'stall') return { key: 'goal.fx.stock', params: { n: u.stall.stockCap[at] } };
  if (kind === 'kitchen') return { key: 'goal.fx.pans', params: { n: u.kitchen.slots[at] } };
  const cold = u.cooler.freshnessMs[at];
  return cold === null ? { key: 'goal.fx.coldForever' } : { key: 'goal.fx.cold', params: { n: cold / 1000 } };
}
const equipment: Provider = (w, c) => EQUIPMENT.map(kind => {
  const q = upgradeQuote(w, c, kind), at = kind === 'kitchen' ? q.next : q.next - 1; // the kitchen's price list starts at level 1, the others at level 2
  return goal({ id: `equipment:${kind}`, lane: 'speed', card: { kind: 'equipment', equipment: kind }, name: { key: 'goal.equipment', keyed: { name: `equipment.${kind}` } },
    effect: q.cost === null ? null : equipmentEffect(c, kind, at), cost: q.cost, eligible: q.cost !== null && q.reason !== 'lifePathRequired' });
});
const business: Provider = (w, c) => BUSINESS_UNLOCKS.map(item => {
  const q = unlockQuote(w, c, item);
  return goal({ id: `unlock:${item}`, lane: 'guests', card: { kind: 'business', item }, name: { key: 'goal.unlock', keyed: { name: `business.${item}` } },
    effect: item === 'qr' ? { key: 'goal.fx.tip', params: { n: c.values.tip.qrMult } } : null, cost: q.owned ? null : q.cost, eligible: !q.owned && q.requirements.every(r => r.met) });
});
const sign: Provider = (w, c) => {
  const q = signboardQuote(w, c);
  return [goal({ id: 'signboard', lane: 'guests', card: { kind: 'signboard' }, name: { key: 'goal.sign' }, effect: null, cost: q.installed ? null : q.cost, eligible: !q.installed && q.reason !== 'signboardGate' })];
};
const flyer: Provider = (w, c) => {
  const q = flyerQuote(w, c); // paid in reputation, so the coin-priced chip never picks it; the sheet still lists it in its lane
  return [goal({ id: 'flyer', lane: 'guests', card: { kind: 'flyer' }, name: { key: 'goal.flyer' }, effect: null, currency: 'rep', cost: q.cost, eligible: q.buyReason === null || q.buyReason === 'reputationRequired' })];
};
/** The registry. Wave 2 adds chairs (capacity) and new dishes (speed) here. */
export const PROVIDERS: readonly Provider[] = [tables, newTable, equipment, sign, flyer, business];

export const listGoals = (w: WorldView, c: Config): Goal[] => PROVIDERS.flatMap(provider => provider(w, c));

/** Pinned snapshots older than JSON 2.0.6 have no `nextGoal`: the bundled seed fills the gap (same fallback as reveal.ts). */
type Current = Extract<Config['values'], { nextGoal: unknown }>;
export const reachMult = (c: Config): number => (c.values as Partial<Current>).nextGoal?.reachMult ?? (seed.values as Current).nextGoal.reachMult;

/** Average coins credited per closed shift, the open shift's partial takings left out; null before the first shift closes. */
export function shiftAverage(w: WorldView): number | null {
  if (w.completedShifts <= 0) return null;
  const open = w.phase === 'resting' ? 0 : w.shift?.stats.credited ?? 0;
  return Math.max(0, (w.lifetimeEarned - open) / w.completedShifts);
}

/**
 * The chip's goal: the cheapest eligible coin-priced item of the first lane that has one (capacity, then speed, then guests), among the
 * items within `reachMult` x an average shift's takings. A new save has no history and is not filtered; when nothing is within reach the
 * cheapest eligible item stands in, so the chip never vanishes while something can still be bought.
 */
export function pickNextGoal(w: WorldView, c: Config): Goal | null {
  const eligible = listGoals(w, c).filter(g => g.eligible && g.currency === 'coins' && g.cost !== null);
  const average = shiftAverage(w), limit = average === null ? Infinity : reachMult(c) * average;
  const near = eligible.filter(g => g.cost! <= limit), pool = near.length ? near : eligible;
  for (const lane of LANES) {
    const inLane = pool.filter(g => g.lane === lane);
    if (inLane.length) return inLane.reduce((best, g) => g.cost! < best.cost! || g.cost === best.cost && best.busy && !g.busy ? g : best);
  }
  return null;
}
