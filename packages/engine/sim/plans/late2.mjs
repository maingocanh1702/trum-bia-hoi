// Random screening of the late ladders of review round 2 of S5 (finding 4), around the plan-literal shift-1 setting (BASE_FILE: D19 maxMult 2.05, tip 0.19, patience 33 000, queueBaseSlots 2, on the owner's cap /
// lease / LP7): the faster early game runs the careers hot (30-day value 9.9-10.1 tr against 9.185, first chair at 38-39 against 40-56), the descent finds the cliff between "value still too high" and "LP7 past 170" only
// with factors that move TOGETHER, so the late ladders are drawn jointly (a seeded sample of a grid, the way plans/late1.mjs found the first clean set). Careers only (`--skip-standard --shift1=0 --gates=...`): the
// location multiplier ramp joins the axes (a lower top multiplier lowers k and the 30-day value without delaying LP7); the shift-1 rows do not depend on any of these axes, the standard k neither; the best draws are evaluated in full afterwards.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/late2.mjs --out=<dir> --seeds=42,99 --sample=200 --shuffle=1 --pool=10 --skip-standard --shift1=0 --top=25
//        --gates=k.gate,value,lp7,equip,tables,table4,chair1,lv2,lv4,lp1,lp3,lp5,gap,door,cap,beer
import { readFileSync } from 'node:fs';
import { bundled } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300;

const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = (patch, path) => path in patch ? patch[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const scale = (name, paths, factors, step = 100, floor = {}) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`,
  patch: Object.fromEntries(paths.map(path => [path, Math.max(floor[path] ?? 0, round(now(patch, path) * f, step))])) })) });
const t = i => `upgrades.table.tablePriceBase.${i}`, c = i => `upgrades.table.chairPriceBase.${i}`;
const devicePaths = kinds => kinds.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const KINDS = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
const TABLE_2 = 600, STALL_2 = 'upgrades.stall.priceBase.1';
const tail = KINDS.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p && i >= 3 ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));

const mult = top => Object.fromEntries(bundled.locations.list.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (bundled.locations.list.length - 1)).toFixed(3)]));
const axes = [
  scale('devices', devicePaths(KINDS), [1, 1.15, 1.3], 250, { [STALL_2]: TABLE_2 }),
  scale('tail', tail, [1, 1.15, 1.3], 250),
  scale('table levels', [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]), [1, 1.15, 1.3], 500),
  scale('chair levels', ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], [1, 1.5, 2], 500),
  scale('kitchen', devicePaths(['kitchen']), [1, 1.2], 250),
  scale('tables 3-8', [1, 2, 3, 4, 5, 6].map(t), [1, 1.03, 1.06], 100),
  scale('chairs', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [1, 2], 100),
  { name: 'location multiplier top', values: () => [1.1, 1.05, 1].map(v => ({ label: `mult top ${v}`, patch: mult(v) })) },
];
export default { base, axes };
