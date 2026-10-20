// Literal-protocol coordinate descent 1 (review round 1 of S5, fix plan A.2): EVERY lever the plan and the exhaustion rule name, around a base chosen by the grid (`BASE_FILE`, a patch
// over the bundled economy; the start wallet stays 300 base = 750 xu and is not a lever): tip.rate, capacityDemand (maxMult, refTables), queue (base slots, seats per slot), patience,
// the ladders (tables 3-8 all together and one by one, the second chairs likewise, table levels, chair levels), device prices and tail, tableSlots (patterns), the life-path thresholds
// (all, and LP5/LP6/LP7 one by one, each with its league tier), dailyEarnCapBase, leaseDays, rent, the location multiplier ramp, keg stock/batch, stall stock, rush warningMs.
// Scales are relative to the BUNDLED numbers (candidate C when this plan was written); an absolute value replaces the current best's value of the same keys.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/literal1.mjs --out=<dir> --passes=3 --pool=9 --seeds=42
import { readFileSync } from 'node:fs';
import { bundled, chairs, tables, tableLevels, chairLevels, devices, lifePath, mult, rent, kegs, values } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300; // never a lever: the player EARNS table 2

const TABLE_2 = 600; // the stall's second level is never cheaper than table 2 (gate shift1.firstGoal)
const floored = patch => ({ ...patch, 'upgrades.stall.priceBase.1': Math.max(TABLE_2, patch['upgrades.stall.priceBase.1'] ?? TABLE_2) });
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const t = bundled.upgrades.table;
const elem = (path, list, f, step) => ({ [path]: round(list * f, step) });
const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slotsOf = (first, rest = W9_SLOTS) => Object.fromEntries(rest.map((n, i) => [`locations.list.${i}.tableSlots`, i < first.length ? first[i] : Math.max(n, first.at(-1))]));
const LP_IDS = [1, 2, 3, 4, 5, 6, 7];
const lpOne = (i, f) => { const v = [8000, 20000, 80000, 280000, 680000, 1200000, 2000000][i - 1]; return { [`lifePath.${i}.lifetimeBase`]: round(v * f, 1000), [`league.tiers.${i}.minSeasonEarnedBase`]: round(v * f, 1000) }; };

const coordinates = [
  { name: 'table slots', values: [
    ['4/4/5/6/6/7/8/8/8 (W9)', [4, 4]], ['5/5/5/6/6/7/8/8/8', [5, 5]], ['6/6/6/6/6/7/8/8/8', [6, 6]], ['7/7/7/7/7/7/8/8/8', [7, 7]], ['8 everywhere', [8, 8]],
    ['4/5/6/6/7/7/8/8/8', [4, 5, 6, 6, 7, 7]], ['5/6/6/7/7/8/8/8/8', [5, 6, 6, 7, 7, 8]], ['4/4/6/6/8/8/8/8/8', [4, 4, 6, 6, 8]],
  ].map(([label, first]) => ({ label: `slots ${label}`, patch: slotsOf(first) })) },
  { name: 'tables 3-8 prices', values: values('tables x', [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8], tables) },
  { name: 'chair prices', values: values('chairs x', [0.2, 0.3, 0.4, 0.6, 0.8, 1, 1.5, 2], chairs) },
  { name: 'table 3 price', values: values('t3 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.tablePriceBase.1', t.tablePriceBase[1], f, 100)) },
  { name: 'table 4 price', values: values('t4 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.tablePriceBase.2', t.tablePriceBase[2], f, 100)) },
  { name: 'table 5 price', values: values('t5 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.tablePriceBase.3', t.tablePriceBase[3], f, 100)) },
  { name: 'table 6 price', values: values('t6 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.tablePriceBase.4', t.tablePriceBase[4], f, 100)) },
  { name: 'table 7-8 prices', values: values('t7-8 x', [0.5, 0.75, 1.25, 1.5, 2], f => ({ ...elem('upgrades.table.tablePriceBase.5', t.tablePriceBase[5], f, 100), ...elem('upgrades.table.tablePriceBase.6', t.tablePriceBase[6], f, 100) })) },
  { name: 'chair 1 price', values: values('c1 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.chairPriceBase.0', t.chairPriceBase[0], f, 100)) },
  { name: 'chair 2 price', values: values('c2 x', [0.5, 0.75, 1.25, 1.5, 2, 3], f => elem('upgrades.table.chairPriceBase.1', t.chairPriceBase[1], f, 100)) },
  { name: 'chairs 3-4 prices', values: values('c3-4 x', [0.5, 0.75, 1.25, 1.5, 2], f => ({ ...elem('upgrades.table.chairPriceBase.2', t.chairPriceBase[2], f, 100), ...elem('upgrades.table.chairPriceBase.3', t.chairPriceBase[3], f, 100) })) },
  { name: 'chairs 5-8 prices', values: values('c5-8 x', [0.3, 0.5, 0.75, 1.25, 1.5, 2], f => Object.fromEntries([4, 5, 6, 7].map(i => [`upgrades.table.chairPriceBase.${i}`, round(t.chairPriceBase[i] * f, 100)]))) },
  { name: 'table level prices', values: values('levels x', [0.4, 0.6, 0.8, 1, 1.25, 1.6, 2], tableLevels) },
  { name: 'chair level prices', values: values('clv x', [0.5, 0.75, 1, 1.5, 2, 3], chairLevels) },
  { name: 'device prices', values: values('devices x', [0.4, 0.6, 0.8, 1, 1.25, 1.6, 2, 3], f => floored(devices(f, 1))) },
  { name: 'device tail (levels 4-5)', values: values('tail x', [0.5, 0.75, 1, 1.5, 2], f => { const out = {}; for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen']) bundled.upgrades[kind].priceBase.forEach((p, i) => { if (i >= 3 && p) out[`upgrades.${kind}.priceBase.${i}`] = round(p * f, 250); }); return out; }) },
  { name: 'life path thresholds (all)', values: values('lp x', [0.6, 0.8, 1, 1.25, 1.5, 2], lifePath) },
  { name: 'LP7 threshold', values: values('lp7 x', [0.75, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5], f => lpOne(7, f)) },
  { name: 'LP6 threshold', values: values('lp6 x', [0.5, 0.75, 1, 1.5, 2, 3], f => lpOne(6, f)) },
  { name: 'LP5 threshold', values: values('lp5 x', [0.5, 0.75, 1, 1.5, 2, 3], f => lpOne(5, f)) },
  { name: 'LP4 threshold', values: values('lp4 x', [0.5, 0.75, 1, 1.5, 2, 3], f => lpOne(4, f)) },
  { name: 'LP3 threshold', values: values('lp3 x', [0.5, 0.75, 1, 1.5, 2, 3], f => lpOne(3, f)) },
  { name: 'tip.rate', values: values('tip', [0.12, 0.14, 0.16, 0.17, 0.18, 0.19, 0.2, 0.22, 0.25], v => ({ 'tip.rate': v })) },
  { name: 'daily earn cap', values: values('cap', [250000, 300000, 350000, 400000, 450000, 500000, 600000], v => ({ 'shift.dailyEarnCapBase': v })) },
  { name: 'lease days', values: values('days', [1, 2, 3, 4, 5, 7], v => ({ 'locations.leaseDays': v })) },
  { name: 'location multiplier top', values: values('top', [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.5], mult) },
  { name: 'rent', values: values('rent x', [0.25, 0.5, 1, 2, 4, 8], rent) },
  { name: 'capacity demand maxMult', values: values('max', [2, 3, 4, 5, 6, 8], v => ({ 'spawn.capacityDemand.maxMult': v })) },
  { name: 'capacity demand refTables', values: values('ref', [4, 5, 6, 7, 8, 10], v => ({ 'spawn.capacityDemand.refTables': v })) },
  { name: 'door queue seats per slot', values: values('seats/slot', [4, 6, 8, 10, 12, 16], v => ({ 'runtime.queueSeatsPerSlot': v })) },
  { name: 'door queue base slots', values: values('base', [1, 2, 3], v => ({ 'runtime.queueBaseSlots': v })) },
  { name: 'patience', values: values('thuong ms', [16000, 20000, 24000, 28000, 32000, 40000], v => ({ 'patience.thuongMs': v })) },
  { name: 'keg storage and batch', values: [[1, 1], [1.5, 1.5], [2, 1.5], [2, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: kegs(s, b) })) },
  { name: 'stall stock Lv1', values: values('cap', [15, 25, 45], v => ({ 'upgrades.stall.stockCap.0': v })) },
  { name: 'rush warning', values: values('ms', [10000, 20000, 30000, 45000], v => ({ 'rush.schedule.warningMs': v })) },
];
export default { base, coordinates };
