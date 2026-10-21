// Literal-protocol coordinate descent 4 (review round 1 of S5; literal3.mjs with the levers that set the LATE ramp first and with wider steps: the designed early ladder (solve-ladder) leaves the career too fast, LP7 at ~105 and the 30-day value ~10 tr): the full 30-day careers on both seeds, every lever of the exhaustion rule, each moved by a SHARE of what it is now
// (a coordinate's values are a function of the current best patch), around a base that already passes the early rows (`BASE_FILE`, a patch over the bundled economy; the start wallet
// stays 300 base = 750 xu and is not a lever). Pairs that must stay together are moved together: a life-path threshold and its league tier. Monotone ladders only (the sweep driver
// rejects the rest). The stall's second level never goes below table 2's price (the first-goal gate).
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-sweep.ts --plan=packages/engine/sim/plans/literal3.mjs --out=<dir> --passes=3 --pool=10 --seeds=42,99
//        --known-red=shift1.wallet --p0-floor --stop-at-clean
import { readFileSync } from 'node:fs';
import { bundled } from './levers.mjs';

const baseFile = process.env.BASE_FILE;
const base = { 'shift.startingCoinsBase': 300, ...(baseFile ? JSON.parse(readFileSync(baseFile, 'utf8')) : {}) };
base['shift.startingCoinsBase'] = 300;

const at = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);
const now = (patch, path) => path in patch ? patch[path] : at(bundled, path);
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const FINE = [0.8, 0.9, 0.95, 1.05, 1.1, 1.25];
const NUDGE = [0.9, 0.95, 0.98, 1.02, 1.05, 1.1];
/** Scale some numbers by each factor around what they are now. */
const scale = (name, paths, factors, step = 100, floor = {}) => ({ name, values: patch => factors.map(f => ({ label: `${name} x${f}`,
  patch: Object.fromEntries(paths.map(path => [path, Math.max(floor[path] ?? 0, round(now(patch, path) * f, step))])) })) });
const t = i => `upgrades.table.tablePriceBase.${i}`, c = i => `upgrades.table.chairPriceBase.${i}`;
const lp = i => [`lifePath.${i}.lifetimeBase`, `league.tiers.${i}.minSeasonEarnedBase`];
const devicePaths = kinds => kinds.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const KINDS = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
const TABLE_2 = 600, STALL_2 = 'upgrades.stall.priceBase.1';
const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = (s0, s1) => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i === 0 ? s0 : i === 1 ? Math.max(s1, s0) : Math.max(n, s1)]));
const slotPairs = [[5, 5], [5, 6], [6, 6], [6, 7], [7, 7], [6, 8], [7, 8], [8, 8], [4, 7], [4, 8], [5, 8]];
const tail = KINDS.flatMap(kind => bundled.upgrades[kind].priceBase.map((p, i) => p && i >= 3 ? `upgrades.${kind}.priceBase.${i}` : null).filter(Boolean));
const mult = top => Object.fromEntries(bundled.locations.list.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (bundled.locations.list.length - 1)).toFixed(3)]));

const WIDE = [0.85, 1.15, 1.3, 1.5, 1.75, 2];
const coordinates = [
  scale('table level prices', [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]), WIDE, 500),
  scale('devices together', devicePaths(KINDS), WIDE, 250, { [STALL_2]: TABLE_2 }),
  scale('device tail (levels 4-5)', tail, WIDE, 250),
  scale('chair level prices', ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], WIDE, 500),
  scale('LP7 threshold', lp(7), [0.8, 0.9, 0.94, 0.97, 1.03, 1.06, 1.1, 1.2, 1.4, 1.7, 2], 1000),
  { name: 'tip.rate', values: patch => [-0.03, -0.02, -0.01, 0.01, 0.02].map(d => ({ label: `tip ${d > 0 ? '+' : ''}${d}`, patch: { 'tip.rate': +(now(patch, 'tip.rate') + d).toFixed(3) } })) },
  scale('daily earn cap', ['shift.dailyEarnCapBase'], [0.8, 0.9, 1.1, 1.25], 10000),
  { name: 'lease days', values: () => [1, 2, 3, 4, 5].map(v => ({ label: `lease ${v}`, patch: { 'locations.leaseDays': v } })) },
  ...[1, 2, 3, 4, 5, 6].map(i => scale(`table ${i + 2}`, [t(i)], FINE)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => scale(`chair ${i + 1}`, [c(i)], FINE)),
  { name: 'slots', values: () => slotPairs.map(([a, b]) => ({ label: `slots ${a}/${b}`, patch: slots(a, b) })) },
  scale('tables 3-8 together', [1, 2, 3, 4, 5, 6].map(t), [0.8, 0.9, 1.1, 1.25], 100),
  scale('chairs together', [0, 1, 2, 3, 4, 5, 6, 7].map(c), [0.7, 0.85, 1.15, 1.4], 100),
  scale('table level prices', [0, 1, 2].flatMap(i => [`upgrades.table.tableUpgrade.levels.${i}.priceBase`, `upgrades.table.tableUpgrade.levels.${i}.stepBase`]), [0.7, 0.85, 1.15, 1.3], 500),
  scale('chair level prices', ['upgrades.table.chairUpgrade.priceBase', 'upgrades.table.chairUpgrade.stepBase'], [0.6, 0.8, 1.25, 1.6], 500),
  scale('devices together', devicePaths(KINDS), [0.7, 0.85, 1.15, 1.3], 250, { [STALL_2]: TABLE_2 }),
  scale('device tail (levels 4-5)', tail, [0.6, 0.8, 1.25, 1.6], 250),
  ...KINDS.map(kind => scale(`${kind} prices`, devicePaths([kind]), [0.7, 0.85, 1.15, 1.3], 250, { [STALL_2]: TABLE_2 })),
  scale('life path thresholds (all)', [1, 2, 3, 4, 5, 6, 7].flatMap(lp), [0.9, 0.95, 1.05, 1.1], 1000),
  ...[1, 2, 3, 4, 5, 6].map(i => scale(`LP${i} threshold`, lp(i), [0.8, 0.9, 1.1, 1.25], 1000)),
  { name: 'tip.rate', values: patch => [-0.03, -0.02, -0.01, 0.01, 0.02, 0.03].map(d => ({ label: `tip ${d > 0 ? '+' : ''}${d}`, patch: { 'tip.rate': +(now(patch, 'tip.rate') + d).toFixed(3) } })) },
  scale('daily earn cap', ['shift.dailyEarnCapBase'], [0.8, 0.9, 1.1, 1.25], 10000),
  { name: 'location multiplier top', values: () => [1, 1.05, 1.1, 1.15, 1.2, 1.3].map(v => ({ label: `top ${v}`, patch: mult(v) })) },
  scale('rent', bundled.locations.list.filter(l => l.rentPerDayBase).map(l => `locations.list.${bundled.locations.list.indexOf(l)}.rentPerDayBase`), [0.5, 0.75, 1.5, 2], 100),
  { name: 'capacity demand maxMult', values: () => [2, 3, 4, 5, 6].map(v => ({ label: `max ${v}`, patch: { 'spawn.capacityDemand.maxMult': v } })) },
  { name: 'capacity demand refTables', values: () => [4, 5, 6, 7, 8, 9].map(v => ({ label: `ref ${v}`, patch: { 'spawn.capacityDemand.refTables': v } })) },
  { name: 'door queue seats per slot', values: () => [4, 6, 8, 10, 12, 16].map(v => ({ label: `seats/slot ${v}`, patch: { 'runtime.queueSeatsPerSlot': v } })) },
  { name: 'door queue base slots', values: () => [1, 2, 3].map(v => ({ label: `base ${v}`, patch: { 'runtime.queueBaseSlots': v } })) },
  { name: 'patience', values: () => [18000, 21000, 24000, 27000, 30000, 36000].map(v => ({ label: `patience ${v}`, patch: { 'patience.thuongMs': v } })) },
  { name: 'keg storage and batch', values: () => [[1, 1], [1.5, 1.5], [2, 1.5], [2, 2]].map(([s, b]) => ({ label: `keg x${s}/${b}`, patch: Object.fromEntries(bundled.upgrades.keg.kegStorage.flatMap((v, i) => [[`upgrades.keg.kegStorage.${i}`, Math.round(v * s)], [`upgrades.keg.kegBatch.${i}`, Math.min(Math.round(v * s), Math.round(bundled.upgrades.keg.kegBatch[i] * b))]])) })) },
  { name: 'stall stock Lv1', values: () => [15, 25, 45].map(v => ({ label: `cap ${v}`, patch: { 'upgrades.stall.stockCap.0': v } })) },
  { name: 'rush warning', values: () => [10000, 20000, 30000, 45000].map(v => ({ label: `ms ${v}`, patch: { 'rush.schedule.warningMs': v } })) },
];
export default { base, coordinates };
