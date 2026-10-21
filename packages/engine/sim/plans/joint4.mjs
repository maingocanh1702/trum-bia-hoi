// Joint descent 4 of review round 2 of S5 (finding 4): the EARLY structure around the best screened draw (BASE_FILE), where the last two failing cells sit: the first second chair is the purchase right after the last table
// (a table rung moves its date) and LP2 needs stall Lv3 and the phone (the phone's price is a plain unlock price, not an owner number). The shift-1 levers and every number the owner decided stay out of the coordinates;
// monotone ladders only; the stall's second level never goes below table 2's price.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/joint4.mjs --out=<dir> --passes=3 --pool=10 --seeds=42,99 --known-red=shift1.wallet --stop-at-clean
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
const STALL = bundled.upgrades.stall.priceBase.map((p, i) => p ? `upgrades.stall.priceBase.${i}` : null).filter(Boolean), TABLE_2 = 600, STALL_2 = 'upgrades.stall.priceBase.1';

const coordinates = [
  { name: 'phone price', values: () => [3500, 4000, 4500, 5500, 6000].map(v => ({ label: `phone ${v}`, patch: { 'unlocks.phone.priceBase': v } })) },
  scale('stall prices', STALL, [0.85, 0.92, 1.08, 1.15], 250, { [STALL_2]: TABLE_2 }),
  ...[6, 5, 4, 3, 2, 1].map(i => scale(`table ${i + 2}`, [t(i)], [0.92, 0.96, 1.04, 1.08, 1.15], 100)),
  scale('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [0.7, 0.85, 1.15, 1.3], 100),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => scale(`chair ${i + 1}`, [c(i)], [0.8, 0.9, 1.1, 1.25], 100)),
  scale('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [0.97, 1.03, 1.06], 100),
];
export default { base, coordinates };
