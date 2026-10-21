// Early-game coordinate descent (review round 1 of S5): the structure search (early1 / early2: random draws on a 12-day career) finds economies in which all but one of the early rows
// pass (chair 1 at shift 40-56 OR the purchase gap, never both); this descent starts from such a near miss (`BASE_FILE`, a patch over the bundled economy) and moves ONE rung at a time
// by a SHARE of what it is now (a coordinate's values are a function of the current best patch): every table rung 3-8, every second-chair rung 1-8, the slots of the first two places,
// the lease, the table- and chair-level prices, the devices, the rent, the demand curve, patience and the door queue. Monotone ladders only (the sweep driver rejects the rest).
// Judged on seed 42, 12 days, no standard k, no shift-1 probe: table 4, chair 1, Lv2, LP1+2, LP3+4, the purchase gap, the door of shifts 1-24.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/early-cd.mjs --out=<dir> --passes=3 --pool=6 --seeds=42 --days=12
//        --shift1=0 --skip-standard --gates=table4,chair1,lv2,lp1+2,lp3+4,gap,door.shifts1-24 --stop-at-clean
import { readFileSync } from 'node:fs';
import { bundled } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300;

const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = (patch, path) => path in patch ? patch[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
/** A coordinate that scales one number by each factor, around the number it has now. */
const rel = (name, path, factors, step = 100) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`, patch: { [path]: round(now(patch, path) * f, step) } })) });
const FINE = [0.7, 0.8, 0.9, 0.95, 1.05, 1.1, 1.25, 1.4];
const t = (i) => `upgrades.table.tablePriceBase.${i}`, c = (i) => `upgrades.table.chairPriceBase.${i}`;
const slotPairs = [[5, 5], [5, 6], [6, 6], [6, 7], [7, 7], [6, 8], [7, 8], [8, 8], [4, 7], [4, 8], [5, 8]];
const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = (s0, s1) => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i === 0 ? s0 : i === 1 ? Math.max(s1, s0) : Math.max(n, s1)]));
const scaleAll = (name, paths, factors, step) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`, patch: Object.fromEntries(paths.map(path => [path, round(now(patch, path) * f, step)])) })) });
const devicePaths = ['keg', 'washer', 'cooler', 'stall', 'kitchen'].flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));

const coordinates = [
  ...[1, 2, 3, 4, 5, 6].map(i => rel(`table ${i + 2}`, t(i), FINE)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => rel(`chair ${i + 1}`, c(i), FINE)),
  { name: 'slots', values: () => slotPairs.map(([a, b]) => ({ label: `slots ${a}/${b}`, patch: slots(a, b) })) },
  { name: 'lease days', values: () => [1, 2, 3, 4].map(v => ({ label: `lease ${v}`, patch: { 'locations.leaseDays': v } })) },
  scaleAll('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [0.8, 0.9, 1.1, 1.25], 100),
  scaleAll('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [0.7, 0.85, 1.15, 1.4], 100),
  rel('table level 2 price', 'upgrades.table.tableUpgrade.levels.0.priceBase', [0.6, 0.8, 1.25, 1.6], 500),
  rel('table level 3 price', 'upgrades.table.tableUpgrade.levels.1.priceBase', [0.6, 0.8, 1.25, 1.6], 500),
  rel('chair level price', 'upgrades.table.chairUpgrade.priceBase', [0.5, 0.75, 1.5, 2], 500),
  scaleAll('devices together', devicePaths, [0.7, 0.85, 1.15, 1.4], 250),
  rel('rent of Ngo Cho', 'locations.list.1.rentPerDayBase', [0.5, 1, 2, 4], 100),
  { name: 'capacity demand maxMult', values: () => [2, 3, 4, 5].map(v => ({ label: `max ${v}`, patch: { 'spawn.capacityDemand.maxMult': v } })) },
  { name: 'capacity demand refTables', values: () => [4, 5, 6, 7, 8, 9].map(v => ({ label: `ref ${v}`, patch: { 'spawn.capacityDemand.refTables': v } })) },
  { name: 'patience', values: () => [18000, 22000, 24000, 26000, 30000].map(v => ({ label: `patience ${v}`, patch: { 'patience.thuongMs': v } })) },
  { name: 'door queue seats per slot', values: () => [4, 6, 8, 10, 12].map(v => ({ label: `seats/slot ${v}`, patch: { 'runtime.queueSeatsPerSlot': v } })) },
  { name: 'tip.rate', values: () => [0.15, 0.17, 0.19, 0.21, 0.23].map(v => ({ label: `tip ${v}`, patch: { 'tip.rate': v } })) },
];
export default { base, coordinates };
