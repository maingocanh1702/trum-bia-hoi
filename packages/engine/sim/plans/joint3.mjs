// Joint descent 3 of review round 2 of S5 (finding 4), the ladders around the plan-literal shift-1 setting the scan found: D19 maxMult 2.05, tip 0.19, patience 33 000, `queueBaseSlots` 2 on the owner's cap 400 000,
// 3-day lease and LP7 2 000 000 (BASE_FILE). That setting passed the plan-narrative shift-1 row over the first 60 probes (48 of 60 can buy table 2 when the shift closes, median takings 1 082 xu, 11 refused pairs; review round 3: over 300 probes it is 69 %, 95 % interval 64-74 %, so the row is red) and every row of
// the standard k, but the faster early game runs the careers hot (the 30-day value 9.9-10.1 tr against 9.185, the first chair at shift 38-39 against 40-56): so the moves are WIDE first (the late ladders and the
// level prices by factors up to 2, to slow the plateau down inside LP7 <= 170), then fine. The shift-1 levers are NOT coordinates (the ladders do not touch shift 1; the plan-literal row stays what the base gives),
// and neither are the numbers the owner decided (cap 400 000, 3-day lease, LP thresholds, the starting wallet 750 xu, the 8 places, `pPair`). Monotone ladders only; the stall's second level never goes below table 2's price.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/joint3.mjs --out=<dir> --passes=3 --pool=8 --seeds=42,99 --known-red=shift1.wallet --stop-at-clean
import { readFileSync } from 'node:fs';
import { bundled } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300;

const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = (patch, path) => path in patch ? patch[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const FINE = [0.9, 0.95, 1.05, 1.1];
const scale = (name, paths, factors, step = 100, floor = {}) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`,
  patch: Object.fromEntries(paths.map(path => [path, Math.max(floor[path] ?? 0, round(now(patch, path) * f, step))])) })) });
const t = i => `upgrades.table.tablePriceBase.${i}`, c = i => `upgrades.table.chairPriceBase.${i}`;
const devicePaths = kinds => kinds.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const KINDS = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
const TABLE_2 = 600, STALL_2 = 'upgrades.stall.priceBase.1';
const tail = KINDS.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p && i >= 3 ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const levelPrices = [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]);
const chairLevel = ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'];

const coordinates = [
  scale('devices together', devicePaths(KINDS), [1.15, 1.3, 1.5, 1.75], 250, { [STALL_2]: TABLE_2 }),
  scale('device tail (levels 4-5)', tail, [1.25, 1.5, 2], 250),
  scale('table level prices', levelPrices, [1.15, 1.3, 1.5], 500),
  scale('chair level prices', chairLevel, [1.2, 1.5, 2], 500),
  scale('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [1.05, 1.1, 1.2, 1.35], 100),
  scale('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [1.1, 1.25, 1.5], 100),
  scale('devices together', devicePaths(KINDS), [0.9, 0.95, 1.05, 1.1], 250, { [STALL_2]: TABLE_2 }),
  scale('device tail (levels 4-5)', tail, [0.9, 0.95, 1.05, 1.1], 250),
  scale('table level prices', levelPrices, [0.9, 0.95, 1.05, 1.1], 500),
  scale('chair level prices', chairLevel, [0.9, 0.95, 1.05, 1.1], 500),
  ...[1, 2, 3, 4, 5, 6].map(i => scale(`table ${i + 2}`, [t(i)], FINE)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => scale(`chair ${i + 1}`, [c(i)], FINE)),
  ...KINDS.map(kind => scale(`${kind} prices`, devicePaths([kind]), [0.85, 0.95, 1.05, 1.15], 250, { [STALL_2]: TABLE_2 })),
  { name: 'door queue seats per slot', values: () => [6, 8, 10, 12].map(v => ({ label: `seats/slot ${v}`, patch: { 'runtime.queueSeatsPerSlot': v } })) },
];
export default { base, coordinates };
