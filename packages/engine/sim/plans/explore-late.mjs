// Exploration (not a sweep of record): single-lever moves around the W9 set, full 30-day careers on both seeds, price-decides bot (career policy v4).
//   node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/explore-late.mjs --out=<dir> --passes=1
import { readFileSync } from 'node:fs';
import { w9 } from './w9.mjs';

const seed = JSON.parse(readFileSync(new URL('../../../../docs/config/economy.tbh.json', import.meta.url), 'utf8'));
const locations = seed.locations.list;
/** The location multipliers as a ramp from 1.0 at the fallback to `top` at the last location. */
const ramp = top => Object.fromEntries(locations.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (locations.length - 1)).toFixed(3)]));
const scaled = (prefix, values, f) => Object.fromEntries(values.map((v, i) => [`${prefix}.${i}`, Math.round(v * f / 100) * 100]));
export default {
  base: w9(),
  coordinates: [
    { name: 'tip.rate', values: [0.10, 0.15].map(v => ({ label: `${v}`, patch: { 'tip.rate': v } })) },
    { name: 'location mult top', values: [1.2, 1.35, 1.5].map(v => ({ label: `${v}`, patch: ramp(v) })) },
    { name: 'capacityDemand refTables', values: [8, 10].map(v => ({ label: `${v}`, patch: { 'spawn.capacityDemand.refTables': v } })) },
    { name: 'early structure', values: [{ label: 'chairs x2.5 tables3-4 x1.5', patch: { ...scaled('upgrades.table.chairPriceBase', seed.upgrades.table.chairPriceBase, 2.5), 'upgrades.table.tablePriceBase.1': 2400, 'upgrades.table.tablePriceBase.2': 4800 } }] },
    { name: 'starting wallet', values: [450, 600].map(v => ({ label: `${v}`, patch: { 'shift.startingCoinsBase': v } })) },
  ],
};
