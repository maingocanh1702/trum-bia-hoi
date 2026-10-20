// The P0 levers (plan section 0 P0; review round 1 of S5): every JSON number the plan or the brief names as a lever that can touch the takings of shift 1 of a one-table, one-chair
// shop, with the start wallet FIXED at 750 xu (it is not a lever: the player earns table 2). The ranges run from far below to far above the committed numbers on purpose, the
// exhaustion rule asks for every named lever swept: tip.rate, capacityDemand, queue, patience, keg stock/batch, stall stock, warningMs (the ladders, caps, slots, leases,
// device prices, life-path thresholds and location multipliers do not exist in shift 1: nothing is bought but the beer, the first location is the free one).
//   node --import tsx packages/engine/sim/balance-p0.ts --plan=packages/engine/sim/plans/p0.mjs --out=artifacts/verification/feat-eco21-balance-pass/sweeps/literal/p0-named
import { kegs, values } from './levers.mjs';

export const named = [
  { name: 'tip.rate', values: values('tip', [0.1, 0.19, 0.25, 0.3, 0.4, 0.5], v => ({ 'tip.rate': v })) },
  { name: 'capacityDemand.maxMult', values: values('maxMult', [1, 1.5, 2, 3, 4, 6], v => ({ 'spawn.capacityDemand.maxMult': v })) },
  { name: 'capacityDemand.refTables', values: values('refTables', [1, 2, 3, 4, 6, 8], v => ({ 'spawn.capacityDemand.refTables': v })) },
  { name: 'queue base slots', values: values('base', [1, 2, 3, 4], v => ({ 'runtime.queueBaseSlots': v })) },
  { name: 'queue seats per slot', values: values('seats/slot', [1, 2, 4, 8], v => ({ 'runtime.queueSeatsPerSlot': v })) },
  { name: 'patience', values: values('thuong ms', [12000, 18000, 24000, 36000, 60000, 90000], v => ({ 'patience.thuongMs': v })) },
  { name: 'keg storage and batch', values: [[1, 1], [1.5, 1.5], [2, 1.5], [3, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: kegs(s, b) })) },
  { name: 'stall stock Lv1', values: values('cap', [15, 25, 45, 80], v => ({ 'upgrades.stall.stockCap.0': v })) },
  { name: 'rush warning', values: values('ms', [10000, 20000, 45000], v => ({ 'rush.schedule.warningMs': v })) },
  // Table 2 is the first rung of the table ladder (600 base = 1 500 xu in the plan, the chip and every doc): its price decides what "enough" means for the row.
  { name: 'table 2 price (ladder rung 1)', values: values('base', [350, 400, 500, 600, 800], v => ({ 'upgrades.table.tablePriceBase.0': v })) },
];
export default { base: { 'shift.startingCoinsBase': 300 }, coordinates: named };
