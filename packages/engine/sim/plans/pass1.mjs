// Coordinate descent, pass-set 1 (plan S5): start = the W9 set + the early structure and location ramp the explorations pointed at; every lever of the exhaustion rule
// plus the starting wallet is swept one at a time around the current best, judged on ALL gates of both seeds (30-day careers).
//   node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/pass1.mjs --out=artifacts/verification/feat-eco21-balance-pass/sweeps/pass1 --passes=3
import { w9 } from './w9.mjs';
import { chairs, tables, tableLevels, chairLevels, devices, lifePath, mult, rent, kegs, values } from './levers.mjs';

export default {
  base: { ...w9(), ...chairs(2.5), ...tables(1.5), ...mult(1.2), 'shift.startingCoinsBase': 700 },
  coordinates: [
    { name: 'chair prices', values: values('chairs x', [1.5, 2, 2.5, 3, 4], chairs) },
    { name: 'tables 3-8 prices', values: values('tables x', [1, 1.25, 1.5, 2], tables) },
    { name: 'starting wallet', values: values('base', [300, 500, 700, 900], v => ({ 'shift.startingCoinsBase': v })) },
    { name: 'tip.rate', values: values('tip', [0.10, 0.14, 0.18, 0.22, 0.26], v => ({ 'tip.rate': v })) },
    { name: 'location multiplier top', values: values('top', [1.15, 1.2, 1.3, 1.4, 1.5], mult) },
    { name: 'table levels prices', values: values('levels x', [0.4, 0.6, 0.8, 1, 1.3], tableLevels) },
    { name: 'devices prices', values: values('devices x', [0.4, 0.6, 0.8, 1, 1.25], devices) },
    { name: 'life path thresholds', values: values('lp x', [0.5, 0.75, 1, 1.25, 1.5], lifePath) },
    { name: 'chair levels prices', values: values('clv x', [0.5, 1, 2], chairLevels) },
    { name: 'capacity demand refTables', values: values('ref', [5, 6, 7, 8], v => ({ 'spawn.capacityDemand.refTables': v })) },
    { name: 'capacity demand maxMult', values: values('max', [3, 4, 5, 6], v => ({ 'spawn.capacityDemand.maxMult': v })) },
    { name: 'solo pBeer', values: values('pBeer', [0.6, 0.7, 0.8, 0.9], v => ({ 'upgrades.table.orderShape.solo.pBeer': v })) },
    { name: 'pair pMoi', values: values('pMoi', [0.7, 0.85, 1.0], v => ({ 'upgrades.table.orderShape.pair.pMoi': v })) },
    { name: 'patience', values: values('thuong ms', [20000, 24000, 28000, 32000], v => ({ 'patience.thuongMs': v })) },
    { name: 'door queue seats per slot', values: values('seats/slot', [4, 8, 12], v => ({ 'runtime.queueSeatsPerSlot': v })) },
    { name: 'door queue base slots', values: values('base', [1, 2], v => ({ 'runtime.queueBaseSlots': v })) },
    { name: 'rent', values: values('rent x', [0.5, 1, 2], rent) },
    { name: 'lease days', values: values('days', [3, 5, 7], v => ({ 'locations.leaseDays': v })) },
    { name: 'daily earn cap', values: values('cap', [300000, 400000, 500000, 600000], v => ({ 'shift.dailyEarnCapBase': v })) },
    { name: 'stall stock Lv1', values: values('cap', [15, 25, 45], v => ({ 'upgrades.stall.stockCap.0': v })) },
    { name: 'keg storage and batch', values: [[1, 1], [1.5, 1.5], [2, 1.5], [2, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: kegs(s, b) })) },
    { name: 'rush warning', values: values('ms', [20000, 30000, 45000], v => ({ 'rush.schedule.warningMs': v })) },
  ],
};
