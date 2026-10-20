// Exploration (not a sweep of record): how the early gates (table 4, first second chair, first Lv2, LP1-2, shifts 1-24 door) move with the early levers.
// Run on 12 days of seed 42 with the price-decides bot: TBH_BOT=cheapest node --import tsx packages/engine/sim/balance-sweep.ts --plan=<this> --out=<dir> --days=12 --seeds=42 --shift1=0 --passes=1
import { readFileSync } from 'node:fs';
import { w9 } from './w9.mjs';

const seed = JSON.parse(readFileSync(new URL('../../../../docs/config/economy.tbh.json', import.meta.url), 'utf8'));
const scaled = (prefix, values, f) => Object.fromEntries(values.map((v, i) => [`${prefix}.${i}`, Math.round(v * f / 100) * 100]));
const chairs = seed.upgrades.table.chairPriceBase, tables = seed.upgrades.table.tablePriceBase;
export default {
  base: w9(),
  coordinates: [
    { name: 'chairs x', values: [1, 2.5, 4, 6, 9].map(f => ({ label: `x${f}`, patch: scaled('upgrades.table.chairPriceBase', chairs, f) })) },
    { name: 'tables 3-4 x', values: [1, 2, 4].map(f => ({ label: `x${f}`, patch: { 'upgrades.table.tablePriceBase.1': Math.round(tables[1] * f), 'upgrades.table.tablePriceBase.2': Math.round(tables[2] * f) } })) },
    { name: 'tip.rate', values: [0.12, 0.17, 0.22].map(v => ({ label: `${v}`, patch: { 'tip.rate': v } })) },
    { name: 'capacityDemand maxMult', values: [4, 6, 8].map(v => ({ label: `${v}`, patch: { 'spawn.capacityDemand.maxMult': v } })) },
    { name: 'solo pBeer', values: [0.7, 0.9].map(v => ({ label: `${v}`, patch: { 'upgrades.table.orderShape.solo.pBeer': v } })) },
  ],
};
