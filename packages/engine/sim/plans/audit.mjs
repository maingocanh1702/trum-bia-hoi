// Lever audit around the sealed set (plan S5, exhaustion rule evidence): every lever the plan names is moved ONE AT A TIME around the bundled numbers (the sealed set, which
// passes every gate) and judged on all gates of both seeds. The sweep driver only moves to a candidate that is strictly better than the current best, and nothing beats a set
// with no failing gate, so every coordinate is evaluated around the sealed set: this is a one-factor-at-a-time table, not a descent.
// Values include the sealed one (its gate table is the baseline); scales are relative to the bundled numbers (a factor of 1 is the sealed set).
//   node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/audit.mjs --out=<dir> --passes=1 --pool=8
import { chairs, tables, tableLevels, devices, lifePath, mult, rent, kegs, values } from './levers.mjs';

const TABLE_2 = 600; // base: the stall's second level never costs less than table 2 (gate shift1.firstGoal)
const floored = patch => ({ ...patch, 'upgrades.stall.priceBase.1': Math.max(TABLE_2, patch['upgrades.stall.priceBase.1'] ?? TABLE_2) });
export default {
  base: {},
  coordinates: [
    { name: 'tip.rate', values: values('tip', [0.10, 0.15, 0.25, 0.30], v => ({ 'tip.rate': v })) },
    { name: 'capacity demand maxMult', values: values('max', [3, 5, 6], v => ({ 'spawn.capacityDemand.maxMult': v })) },
    { name: 'capacity demand refTables', values: values('ref', [5, 7, 8], v => ({ 'spawn.capacityDemand.refTables': v })) },
    { name: 'door queue seats per slot', values: values('seats/slot', [4, 6, 10, 12], v => ({ 'runtime.queueSeatsPerSlot': v })) },
    { name: 'door queue base slots', values: values('base', [2, 3], v => ({ 'runtime.queueBaseSlots': v })) },
    { name: 'patience', values: values('thuong ms', [18000, 20000, 28000, 32000], v => ({ 'patience.thuongMs': v })) },
    { name: 'table prices 3-8', values: values('tables x', [0.8, 1.25], tables) },
    { name: 'chair prices', values: values('chairs x', [0.8, 1.25], chairs) },
    { name: 'table levels prices', values: values('levels x', [0.8, 1.25], tableLevels) },
    { name: 'device tail and ladders', values: values('devices x', [0.7, 1.4], f => floored(devices(f, 1))) },
    { name: 'life path thresholds', values: values('lp x', [0.75, 1.25], lifePath) },
    { name: 'daily earn cap', values: values('cap', [200000, 300000, 500000, 600000], v => ({ 'shift.dailyEarnCapBase': v })) },
    { name: 'location multiplier top', values: values('top', [1.1, 1.25, 1.4], mult) },
    { name: 'rent', values: values('rent x', [0.5, 2], rent) },
    { name: 'lease days', values: values('days', [5, 7], v => ({ 'locations.leaseDays': v })) },
    { name: 'table slots', values: [
      { label: 'slots one less from Ben Xe (4/4/4/5/5/6/7/7/7)', patch: Object.fromEntries([4, 4, 4, 5, 5, 6, 7, 7, 7].map((n, i) => [`locations.list.${i}.tableSlots`, n])) },
      { label: 'slots all 8 from Ben Xe', patch: Object.fromEntries([4, 4, 8, 8, 8, 8, 8, 8, 8].map((n, i) => [`locations.list.${i}.tableSlots`, n])) },
    ] },
    { name: 'stall stock Lv1 (A2 keg stock)', values: values('cap', [25, 45], v => ({ 'upgrades.stall.stockCap.0': v })) },
    { name: 'keg storage and batch (A2)', values: [[1.5, 1.5], [2, 1.5], [2, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: kegs(s, b) })) },
    { name: 'rush warning', values: values('ms', [30000, 45000], v => ({ 'rush.schedule.warningMs': v })) },
    { name: 'solo pBeer', values: values('pBeer', [0.5, 0.9], v => ({ 'upgrades.table.orderShape.solo.pBeer': v })) },
    { name: 'pair pMoi', values: values('pMoi', [0.6, 1.0], v => ({ 'upgrades.table.orderShape.pair.pMoi': v })) },
    { name: 'group size pPair', values: values('pPair', [0.4, 0.6], v => ({ 'spawn.pPair': v })) },
    { name: 'starting wallet', values: values('base', [500, 900], v => ({ 'shift.startingCoinsBase': v })) },
  ],
};
