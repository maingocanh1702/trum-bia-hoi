// Late-ramp random search (review round 1 of S5): the designed early game (solve-ladder: eight table slots, a ladder bought one rung every ~6.5 shifts, free chairs) leaves every early row
// green on both seeds and the late economy too fast: LP7 at ~103 (140-144 wanted), the 30-day standard value ~10.1 tr (9.185 allowed), the daily cap first reached at ~112 (150 wanted).
// One lever at a time did not get out of it (cd3-both: each of them fixes one row and breaks another), so the levers of the late ramp are drawn TOGETHER: the dear levels of the table
// ladder (Lv3, Lv4: price and step), the device tail (levels 4-5), the chair levels, the LP7 threshold with its league tier, the tip rate, the daily cap and the multiplier of the top
// location. The early rows are left alone (Lv2, device levels 2-3, the table and chair ladders, the lease). Scales are relative to the BUNDLED economy (candidate C), which is also the
// base of `BASE_FILE`; a value of 1 keeps C's number only where BASE_FILE did not change it.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/late1.mjs --out=<dir> --sample=150 --shuffle=1 --seeds=42,99 --pool=10
//        --known-red=shift1.wallet
import { readFileSync } from 'node:fs';
import { bundled, values } from './levers.mjs';

const base = { 'shift.startingCoinsBase': 300, ...JSON.parse(readFileSync(process.env.BASE_FILE, 'utf8')) };
base['shift.startingCoinsBase'] = 300;
const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = path => path in base ? base[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const KINDS = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
const levelPaths = [1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]);
const tailPaths = KINDS.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p && i >= 3 ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const scaleOf = (paths, step) => f => Object.fromEntries(paths.map(p => [p, round(now(p) * f, step)]));
const mult = top => Object.fromEntries(bundled.locations.list.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (bundled.locations.list.length - 1)).toFixed(3)]));
const lp7 = f => ({ 'lifePath.7.lifetimeBase': round(2000000 * f, 10000), 'league.tiers.7.minSeasonEarnedBase': round(2000000 * f, 10000) });
export default { base, axes: [
  { name: 'table levels 3-4', values: values('lv34 x', [1, 1.15, 1.3, 1.5, 1.75, 2], scaleOf(levelPaths, 500)) },
  { name: 'device tail', values: values('tail x', [1, 1.25, 1.5, 2, 2.5, 3], scaleOf(tailPaths, 250)) },
  { name: 'chair levels', values: values('clv x', [1, 1.5, 2, 3], scaleOf(['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], 500)) },
  { name: 'LP7 threshold', values: values('lp7 x', [1, 1.4, 1.8, 2.2, 2.6], lp7) },
  { name: 'tip.rate', values: values('tip', [0.17, 0.18, 0.19, 0.2], v => ({ 'tip.rate': v })) },
  { name: 'daily earn cap', values: values('cap', [350000, 400000, 450000], v => ({ 'shift.dailyEarnCapBase': v })) },
  { name: 'location multiplier top', values: values('top', [1.05, 1.1, 1.15, 1.2], mult) },
] };
