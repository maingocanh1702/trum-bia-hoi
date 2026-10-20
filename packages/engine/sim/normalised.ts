import { customerValue, tableBenefit, type Config, type WorldView } from '../src/index';

/**
 * D4(a) (owner 18/09, plan S5; 04-SPEC section 5): the advanced-career gate measures the STANDARD order, beer plus the first snack. What a table level adds
 * is a bonus lever of the same class as "lai rai" (GDD 3), so the measurement takes it out of every serve:
 *   - a second snack (Lv3, `pExtraMoi`): only the first two dishes of a guest count (beer, first snack; a one-chair guest has one dish and keeps it);
 *   - the Lv4 table tip (`tipMult`): the tip is recomputed with factor 1;
 *   - an extra round (Lv2, `extraRounds`): the serve is not counted at all (the base rounds of the group are).
 * The value of what is left is the engine's own `customerValue` on a copy of the order that keeps only those dishes, so the weather, the rush, the QR
 * code, the location multiplier and the freshness of the glass of that very moment are exactly what the real serve pays; nothing here re-implements a
 * price or a rate. k itself is still mean(payment + tip) / anchor over the counted serves (04-SPEC section 5): the method is unchanged, the order is
 * the standard one.
 */
export interface NormalisedServe { customerId: string; payment: number; tip: number; extraRound: boolean }

/** What the `serve` command of this table would pay for the standard order, per guest, read BEFORE the command is sent (the state is the state it will pay in). */
export function normalisedServes(w: WorldView, config: Config, tableId: string): NormalisedServe[] {
  const table = w.tables.find(t => t.id === tableId), order = table?.order, group = table?.group;
  if (!table || !order || !group) throw Error(`normalised:noOrder:${tableId}`);
  // The perks of a group are recorded when it sits down: group.rounds already holds the extra round of a Lv2+ table (JSON >= 2.0.23), a pin has no level at all.
  const base = group.rounds - (group.level === undefined ? 0 : tableBenefit(config.values, group.level).extraRounds);
  const extraRound = table.roundsServed >= base;
  return group.customers.map(customer => {
    const items = order.items.filter(item => item.customerId === customer.id).slice(0, 2);
    const { payment, tip } = customerValue(w, config, { ...order, items }, customer, 1);
    return { customerId: customer.id, payment, tip, extraRound };
  });
}

/** The counted serves of a career folded into the numbers of the gate: the standard-order twin of `serveValueStats`. */
export function normalisedStats(serves: readonly NormalisedServe[], anchor: number) {
  const counted = serves.filter(s => !s.extraRound), totalValue = counted.reduce((sum, s) => sum + s.payment + s.tip, 0);
  const served = counted.length, mean = served ? totalValue / served : null;
  return { served, extraRoundServes: serves.length - served, totalValue, mean, kValue: mean === null ? null : mean / anchor };
}
