// Confirmation sweep 1 (plan S5): starts from candidate A, the first set that passed EVERY gate on seed 42 (pass2 sweep, seed-42 scoring), which on seed 99 still failed
// four seed-cells (standard k full/no-onboarding 3.014, first Lv2 58, the purchase rhythm 9, the days 8-14 door 21.7 %). Finer grids around the sensitive levers, judged on
// both seeds. node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/conf1.mjs --out=<dir> --passes=3 --pool=8
import { readFileSync } from 'node:fs';
import { chairs, tables, tableLevels, chairLevels, devices, lifePath, mult, kegs, values } from './levers.mjs';

const candidate = JSON.parse(readFileSync(new URL('./candidate-a.json', import.meta.url), 'utf8'));
export default {
  base: candidate,
  coordinates: [
    { name: 'chair prices', values: values('chairs x', [2.2, 2.4, 2.5, 2.6, 2.8], chairs) },
    { name: 'table levels prices', values: values('levels x', [0.7, 0.85, 1, 1.15], tableLevels) },
    { name: 'devices prices', values: values('devices x', [0.3, 0.4, 0.5, 0.6], devices) },
    { name: 'tables 3-8 prices', values: values('tables x', [1.25, 1.5, 1.75], tables) },
    { name: 'tip.rate', values: values('tip', [0.20, 0.22, 0.24], v => ({ 'tip.rate': v })) },
    { name: 'location multiplier top', values: values('top', [1.12, 1.15, 1.18, 1.22], mult) },
    { name: 'patience', values: values('thuong ms', [22000, 24000, 26000, 28000], v => ({ 'patience.thuongMs': v })) },
    { name: 'door queue seats per slot', values: values('seats/slot', [6, 8, 10], v => ({ 'runtime.queueSeatsPerSlot': v })) },
    { name: 'starting wallet', values: values('base', [600, 700, 800], v => ({ 'shift.startingCoinsBase': v })) },
    { name: 'capacity demand maxMult', values: values('max', [3.5, 4, 4.5], v => ({ 'spawn.capacityDemand.maxMult': v })) },
    { name: 'solo pBeer', values: values('pBeer', [0.6, 0.7, 0.8], v => ({ 'upgrades.table.orderShape.solo.pBeer': v })) },
    { name: 'life path thresholds', values: values('lp x', [0.9, 1, 1.1], lifePath) },
    { name: 'chair levels prices', values: values('clv x', [0.75, 1, 1.5], chairLevels) },
    { name: 'daily earn cap', values: values('cap', [350000, 400000, 450000], v => ({ 'shift.dailyEarnCapBase': v })) },
  ],
};
