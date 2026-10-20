// Confirmation sweep 2 (plan S5): candidate B (the bundled JSON when this plan was written) passed every gate, but on the first-purchase journeys of the guest and playable
// tiers 13 % of the first shifts ended with the goal chip pointing at the stall's second level (1 250 xu) instead of table 2 (1 500 xu): the chip suggests what an average
// shift reaches, capacity lane first, so a device level that costs LESS than table 2 pre-empts it whenever the shift took between 1/3 of the two prices (the sealed numbers
// of the first alley). The new gate `shift1.firstGoal` asks that no device level costs less than table 2, i.e. the stall's second level is at least 600 base. Any such price
// breaks B's thin cells (gap, days 8-14 door), so the search starts again from B with that floor and looks for a clean neighbour. Scales are relative to the BUNDLED numbers,
// which are B's: a factor of 1 is B itself.
//   node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/conf2.mjs --out=<dir> --passes=2 --pool=8 --stop-at-clean
import { chairs, tables, tableLevels, chairLevels, devices, lifePath, mult, values } from './levers.mjs';

const TABLE_2 = 600; // base: `upgrades.table.tablePriceBase[0]`
const floored = patch => ({ ...patch, 'upgrades.stall.priceBase.1': Math.max(TABLE_2, patch['upgrades.stall.priceBase.1'] ?? TABLE_2) });
export default {
  base: { 'upgrades.stall.priceBase.1': TABLE_2 },
  coordinates: [
    { name: 'stall level 2', values: values('stall2', [600, 650, 700, 800, 1000], v => ({ 'upgrades.stall.priceBase.1': v })) },
    { name: 'chair prices', values: values('chairs x', [0.92, 0.96, 1, 1.04, 1.08], chairs) },
    { name: 'tables 3-8 prices', values: values('tables x', [0.9, 1, 1.1], tables) },
    { name: 'devices prices', values: values('devices x', [0.85, 0.92, 1, 1.08, 1.15], f => floored(devices(f, 1))) },
    { name: 'table levels prices', values: values('levels x', [0.9, 1, 1.1], tableLevels) },
    { name: 'location multiplier top', values: values('top', [1.12, 1.15, 1.18], mult) },
    { name: 'tip.rate', values: values('tip', [0.19, 0.20, 0.21, 0.22], v => ({ 'tip.rate': v })) },
    { name: 'starting wallet', values: values('base', [650, 700, 750], v => ({ 'shift.startingCoinsBase': v })) },
    { name: 'patience', values: values('thuong ms', [22000, 24000, 26000], v => ({ 'patience.thuongMs': v })) },
    { name: 'door queue seats per slot', values: values('seats/slot', [7, 8, 9], v => ({ 'runtime.queueSeatsPerSlot': v })) },
    { name: 'solo pBeer', values: values('pBeer', [0.65, 0.7, 0.75], v => ({ 'upgrades.table.orderShape.solo.pBeer': v })) },
    { name: 'life path thresholds', values: values('lp x', [0.95, 1, 1.05], lifePath) },
    { name: 'chair levels prices', values: values('clv x', [0.75, 1, 1.5], chairLevels) },
    { name: 'daily earn cap', values: values('cap', [350000, 400000, 450000], v => ({ 'shift.dailyEarnCapBase': v })) },
  ],
};
