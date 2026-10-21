// Targeted joint descent of review round 2 of S5 (finding 4), the second stage after the shift-1 scan: the shift-1 levers (D19 maxMult / refTables, the tip inside the standard-k band, patience, the door queue)
// are FIXED by the base file (BASE_FILE, the best plan-literal setting of the scan around one maxMult), so the plan-literal shift-1 row is whatever that setting gives; this descent only moves the LADDERS
// and the door to make every OTHER row pass on both seeds under the literal protocol (`--known-red=shift1.wallet,shift1.plan`, `--stop-at-clean`). The numbers the owner decided stay where they are
// (the daily cap 400 000, the lease of 3 days, LP7 2 000 000 and the other life-path thresholds, the starting wallet 750 xu, the 8 places and `pPair`). Monotone ladders only; the stall's second level
// never goes below table 2's price. The coordinates are ordered by what the first runs showed breaks: the first chair (the last table's date), the purchase gap and the door of days 15-21.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/joint2.mjs --out=<dir> --passes=2 --pool=8 --seeds=42,99 --known-red=shift1.wallet,shift1.plan --stop-at-clean
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

const coordinates = [
  scale('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [0.95, 1.03, 1.06, 1.1, 1.15], 100),
  scale('table level prices', [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]), [0.9, 0.95, 1.05, 1.1], 500),
  scale('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [0.85, 0.95, 1.05, 1.2], 100),
  scale('devices together', devicePaths(KINDS), [0.9, 0.95, 1.05, 1.1], 250, { [STALL_2]: TABLE_2 }),
  { name: 'patience', values: () => [24000, 27000, 30000, 33000].map(v => ({ label: `patience ${v}`, patch: { 'patience.thuongMs': v } })) },
  { name: 'door queue seats per slot', values: () => [6, 8, 10, 12].map(v => ({ label: `seats/slot ${v}`, patch: { 'runtime.queueSeatsPerSlot': v } })) },
  scale('chair level prices', ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], [0.85, 0.95, 1.05, 1.2], 500),
  scale('device tail (levels 4-5)', tail, [0.9, 0.95, 1.05, 1.1], 250),
  ...[1, 2, 3, 4, 5, 6].map(i => scale(`table ${i + 2}`, [t(i)], FINE)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => scale(`chair ${i + 1}`, [c(i)], FINE)),
  ...KINDS.map(kind => scale(`${kind} prices`, devicePaths([kind]), [0.9, 0.95, 1.05, 1.1], 250, { [STALL_2]: TABLE_2 })),
];
export default { base, coordinates };
