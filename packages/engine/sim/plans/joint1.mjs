// Joint coordinate descent of review round 2 of S5 (finding 4): the demand lever of the plan (D19 `capacityDemand`, refTables 4-6, maxMult 1.5-3), the tip, the door and the ladders are searched TOGETHER,
// the objective being every row of the evaluator but the STRICT shift-1 wallet row (`--known-red=shift1.wallet`): the 20 gate rows, the plan-literal shift-1 row (`shift1.plan`: at least 4 runs in 5 can buy
// table 2 when shift 1 closes, median takings 850-1160 xu, about ten refused pairs) and the first-goal row. The numbers the owner decided stay where they are and are not coordinates: the daily cap (D24 400 000),
// the lease (3 days), the life-path thresholds (LP7 2 000 000), the starting wallet (300 base = 750 xu), the places (8 slots) and `pPair`. Monotone ladders only (the sweep driver rejects the rest); the stall's
// second level never goes below table 2's price (the first-goal row). Every shift-1 lever comes first (they decide the plan-literal row and the sweep reuses nothing for them), then the ladders as in literal4.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/joint1.mjs --out=<dir> --passes=2 --pool=8 --seeds=42,99 --known-red=shift1.wallet --stop-at-clean
import { readFileSync } from 'node:fs';
import { bundled } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300;

const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = (patch, path) => path in patch ? patch[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const FINE = [0.9, 0.95, 1.05, 1.1];
/** Scale some numbers by each factor around what they are now. */
const scale = (name, paths, factors, step = 100, floor = {}) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`,
  patch: Object.fromEntries(paths.map(path => [path, Math.max(floor[path] ?? 0, round(now(patch, path) * f, step))])) })) });
const t = i => `upgrades.table.tablePriceBase.${i}`, c = i => `upgrades.table.chairPriceBase.${i}`;
const devicePaths = kinds => kinds.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const KINDS = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
const TABLE_2 = 600, STALL_2 = 'upgrades.stall.priceBase.1';
const tail = KINDS.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p && i >= 3 ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));

const coordinates = [
  // the shift-1 levers (D19 demand, the tip within the standard-k band, patience, the door)
  { name: 'capacity demand maxMult', values: () => [1.5, 1.75, 1.9, 2, 2.1, 2.25, 2.5, 3].map(v => ({ label: `max ${v}`, patch: { 'spawn.capacityDemand.maxMult': v } })) },
  { name: 'capacity demand refTables', values: () => [4, 5, 6].map(v => ({ label: `ref ${v}`, patch: { 'spawn.capacityDemand.refTables': v } })) },
  { name: 'tip.rate', values: () => [0.15, 0.16, 0.17, 0.18, 0.19, 0.2].map(v => ({ label: `tip ${v}`, patch: { 'tip.rate': v } })) },
  { name: 'patience', values: () => [24000, 27000, 30000, 33000, 36000, 39000, 42000].map(v => ({ label: `patience ${v}`, patch: { 'patience.thuongMs': v } })) },
  { name: 'door queue base slots', values: () => [1, 2, 3].map(v => ({ label: `base ${v}`, patch: { 'runtime.queueBaseSlots': v } })) },
  { name: 'door queue seats per slot', values: () => [6, 8, 10, 12].map(v => ({ label: `seats/slot ${v}`, patch: { 'runtime.queueSeatsPerSlot': v } })) },
  // the ladders
  scale('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [0.9, 0.95, 1.05, 1.1, 1.2], 100),
  scale('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [0.8, 0.9, 1.1, 1.25], 100),
  scale('table level prices', [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]), [0.8, 0.9, 1.1, 1.25], 500),
  scale('chair level prices', ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], [0.7, 0.85, 1.15, 1.4], 500),
  scale('devices together', devicePaths(KINDS), [0.85, 0.95, 1.05, 1.15, 1.3], 250, { [STALL_2]: TABLE_2 }),
  scale('device tail (levels 4-5)', tail, [0.8, 0.9, 1.1, 1.25, 1.5], 250),
  ...[1, 2, 3, 4, 5, 6].map(i => scale(`table ${i + 2}`, [t(i)], FINE)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => scale(`chair ${i + 1}`, [c(i)], FINE)),
  ...KINDS.map(kind => scale(`${kind} prices`, devicePaths([kind]), [0.85, 0.95, 1.05, 1.15], 250, { [STALL_2]: TABLE_2 })),
  { name: 'keg storage and batch', values: () => [[1, 1], [1.5, 1.5], [2, 1.5], [2, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: Object.fromEntries(bundled.upgrades.keg.kegStorage.flatMap((v, i) => [[`upgrades.keg.kegStorage.${i}`, Math.round(v * s)], [`upgrades.keg.kegBatch.${i}`, Math.min(Math.round(v * s), Math.round(bundled.upgrades.keg.kegBatch[i] * b))]])) })) },
  { name: 'stall stock Lv1', values: () => [15, 25, 45].map(v => ({ label: `cap ${v}`, patch: { 'upgrades.stall.stockCap.0': v } })) },
];
export default { base, coordinates };
