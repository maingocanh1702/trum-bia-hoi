// The levers of the balance pass as patch builders (plan S5, brief B5; the exhaustion rule names: tip.rate, capacityDemand, queue, patience, ladders,
// dailyEarnCapBase, tableSlots, leaseDays, device-tail x, lifePath[].lifetimeBase, keg stock/batch, warningMs). A coordinate is a list of values, each a patch of
// dotted paths over the bundled economy; scales are always taken from the bundled 2.0.23 seed numbers (the starting point), never from the current patch.
import { readFileSync } from 'node:fs';

export const seed = JSON.parse(readFileSync(new URL('../../../../docs/config/economy.tbh.json', import.meta.url), 'utf8'));
const t = seed.upgrades.table, locations = seed.locations.list;
const round = (v, step) => Math.max(step, Math.round(v / step) * step);

/** Every device price but level 1, scaled; `tail` rows are already the W9 x0.5 numbers of the base patch, so the scale applies on top of the SEED value and the tail factor. */
export const devices = (f, tail = 0.5) => {
  const patch = {};
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen']) seed.upgrades[kind].priceBase.forEach((p, i) => {
    if (p === null || p === 0) return;
    const isTail = kind === 'kitchen' ? i >= 3 : i >= 3;
    patch[`upgrades.${kind}.priceBase.${i}`] = round(p * f * (isTail ? tail : 1), 250);
  });
  return patch;
};
export const tables = (f, from = 1) => Object.fromEntries(t.tablePriceBase.map((p, i) => i >= from ? [`upgrades.table.tablePriceBase.${i}`, round(p * f, 100)] : null).filter(Boolean));
export const chairs = f => Object.fromEntries(t.chairPriceBase.map((p, i) => [`upgrades.table.chairPriceBase.${i}`, round(p * f, 100)]));
export const tableLevels = f => Object.fromEntries(t.tableUpgrade.levels.flatMap((l, i) => [[`upgrades.table.tableUpgrade.levels.${i}.priceBase`, round(l.priceBase * f, 500)], [`upgrades.table.tableUpgrade.levels.${i}.stepBase`, round(l.stepBase * f, 500)]]));
export const chairLevels = f => ({ 'upgrades.table.chairUpgrade.priceBase': round(t.chairUpgrade.priceBase * f, 500), 'upgrades.table.chairUpgrade.stepBase': round(t.chairUpgrade.stepBase * f, 500) });
const LP = [8000, 20000, 80000, 280000, 680000, 1200000, 2000000];
export const lifePath = f => Object.fromEntries(LP.flatMap((v, i) => [[`lifePath.${i + 1}.lifetimeBase`, round(v * f, 1000)], [`league.tiers.${i + 1}.minSeasonEarnedBase`, round(v * f, 1000)]]));
/** The location multipliers as a ramp from 1.0 at the fallback to `top` at the last location. */
export const mult = top => Object.fromEntries(locations.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (locations.length - 1)).toFixed(3)]));
export const rent = f => Object.fromEntries(locations.map((l, i) => [`locations.list.${i}.rentPerDayBase`, l.rentPerDayBase === 0 ? 0 : round(l.rentPerDayBase * f, 100)])); // the free fallback stays free
export const kegs = (storage, batch) => Object.fromEntries([...seed.upgrades.keg.kegStorage.flatMap((v, i) => [[`upgrades.keg.kegStorage.${i}`, Math.round(v * storage)], [`upgrades.keg.kegBatch.${i}`, Math.min(Math.round(v * storage), Math.round(seed.upgrades.keg.kegBatch[i] * batch))]])]);
export const values = (label, list, build) => list.map(v => ({ label: `${label} ${v}`, patch: build(v) }));
