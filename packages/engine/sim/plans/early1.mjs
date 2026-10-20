// Early-game structure search (review round 1 of S5): under the plan's strict seat-saving bot the rows chair 1 (40-56), table 4, Lv2, LP1+2, LP3+4, the purchase gap and the door of
// shifts 1-24 are all decided in the first ~96 shifts, so they can be screened on a 12-day career (about 2.5 times cheaper than 30 days) with thousands of random draws over the
// levers that shape that phase: the first places' table slots, the table ladder (level and steepness), the chair ladder, the table-level and chair-level prices, the devices, the
// lease, the rent, the demand curve, patience and the door queue. Scales are relative to the bundled numbers (candidate C when this plan was written); every ladder is monotone
// by construction (a level and a steepness >= 1 / the sweep driver rejects the rest). The phone and QR prices are NOT drawn unless EARLY_UNLOCKS=1 (they are not plan-named levers).
//   node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/early1.mjs --out=<dir> --sample=300 --shuffle=1 --days=12 --shift1=0 --skip-standard --pool=10
//        --gates=table4,chair1,lv2,lp1+2,lp3+4,gap,door.shifts1-24
import { bundled, tableLevels, chairLevels, devices, rent, values } from './levers.mjs';

const t = bundled.upgrades.table;
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const TABLE_2 = 600;
const floored = patch => ({ ...patch, 'upgrades.stall.priceBase.1': Math.max(TABLE_2, patch['upgrades.stall.priceBase.1'] ?? TABLE_2) });
const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = (s0, s1) => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i === 0 ? s0 : i === 1 ? Math.max(s1, s0) : Math.max(n, s1)]));
const tablesShaped = (f, steep) => Object.fromEntries(t.tablePriceBase.map((p, i) => i >= 1 ? [`upgrades.table.tablePriceBase.${i}`, round(p * f * Math.pow(steep, i - 1), 100)] : null).filter(Boolean));
const chairsShaped = (f, steep) => Object.fromEntries(t.chairPriceBase.map((p, i) => [`upgrades.table.chairPriceBase.${i}`, round(p * f * Math.pow(steep, i), 100)]));
const pair = (name, as, bs, build) => ({ name, values: as.flatMap(a => bs.map(b => ({ label: `${name} ${a}/${b}`, patch: build(a, b) }))) });

const axes = [
  pair('slots hem/ngo', [4, 5, 6, 7], [5, 6, 7, 8], slots),
  pair('tables x/steep', [1.5, 2, 2.5, 3, 4, 5], [0.9, 1, 1.1, 1.25, 1.4], tablesShaped),
  pair('chairs x/steep', [0.08, 0.12, 0.18, 0.25, 0.35, 0.5, 0.7], [0.9, 1, 1.15, 1.3], chairsShaped),
  { name: 'table levels', values: values('levels x', [0.5, 0.8, 1, 1.4], tableLevels) },
  { name: 'chair levels', values: values('clv x', [0.5, 1, 2], chairLevels) },
  { name: 'devices', values: values('devices x', [0.5, 0.7, 1, 1.4], f => floored(devices(f, 1))) },
  { name: 'lease days', values: values('days', [1, 2, 3], v => ({ 'locations.leaseDays': v })) },
  { name: 'rent', values: values('rent x', [0.5, 1, 2, 4], rent) },
  { name: 'capacity demand maxMult', values: values('max', [3, 4, 5, 6], v => ({ 'spawn.capacityDemand.maxMult': v })) },
  { name: 'capacity demand refTables', values: values('ref', [5, 6, 7, 8], v => ({ 'spawn.capacityDemand.refTables': v })) },
  { name: 'patience', values: values('thuong ms', [20000, 24000, 28000], v => ({ 'patience.thuongMs': v })) },
  { name: 'door queue seats per slot', values: values('seats/slot', [6, 8, 10], v => ({ 'runtime.queueSeatsPerSlot': v })) },
];
if (process.env.EARLY_UNLOCKS === '1') axes.push(
  { name: 'phone price', values: values('phone', [2500, 5000, 8000, 12000, 20000, 30000], v => ({ 'unlocks.phone.priceBase': v })) },
  { name: 'qr price', values: values('qr', [4000, 8000, 16000], v => ({ 'unlocks.qr.priceBase': v })) });
export default { base: { 'shift.startingCoinsBase': 300 }, axes };
