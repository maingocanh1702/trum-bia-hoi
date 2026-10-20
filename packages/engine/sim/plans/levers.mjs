// The levers of the balance pass as patch builders (plan S5, brief B5; the exhaustion rule names: tip.rate, capacityDemand, queue, patience, ladders,
// dailyEarnCapBase, tableSlots, leaseDays, device-tail x, lifePath[].lifetimeBase, keg stock/batch, warningMs). A coordinate is a list of values, each a patch of
// dotted paths over the bundled economy. A scale is taken from the numbers of the SEED the builders were made from: the exports below use the BUNDLED economy as it
// is when the plan runs (a factor of 1 is the committed set; conf2 and audit were written that way), `frozen` is the 2.0.23 file of the S4 tip kept next to the plans
// (the W9 candidate and the literal-protocol sweeps start from it), and `makeLevers(seed)` builds the same builders over any economy.
import { readFileSync } from 'node:fs';

export const bundled = JSON.parse(readFileSync(new URL('../../../../docs/config/economy.tbh.json', import.meta.url), 'utf8'));
export const frozen = JSON.parse(readFileSync(new URL('./seed-2.0.23.json', import.meta.url), 'utf8'));
const round = (v, step) => Math.max(step, Math.round(v / step) * step);
const LP = [8000, 20000, 80000, 280000, 680000, 1200000, 2000000];

export function makeLevers(seed) {
  const t = seed.upgrades.table, locations = seed.locations.list;
  /** Every device price but level 1, scaled; `tail` rows are already the W9 x0.5 numbers of the base patch, so the scale applies on top of the SEED value and the tail factor. */
  const devices = (f, tail = 0.5) => {
    const patch = {};
    for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen']) seed.upgrades[kind].priceBase.forEach((p, i) => {
      if (p === null || p === 0) return;
      const isTail = kind === 'kitchen' ? i >= 3 : i >= 3;
      patch[`upgrades.${kind}.priceBase.${i}`] = round(p * f * (isTail ? tail : 1), 250);
    });
    return patch;
  };
  const tables = (f, from = 1) => Object.fromEntries(t.tablePriceBase.map((p, i) => i >= from ? [`upgrades.table.tablePriceBase.${i}`, round(p * f, 100)] : null).filter(Boolean));
  const chairs = f => Object.fromEntries(t.chairPriceBase.map((p, i) => [`upgrades.table.chairPriceBase.${i}`, round(p * f, 100)]));
  const tableLevels = f => Object.fromEntries(t.tableUpgrade.levels.flatMap((l, i) => [[`upgrades.table.tableUpgrade.levels.${i}.priceBase`, round(l.priceBase * f, 500)], [`upgrades.table.tableUpgrade.levels.${i}.stepBase`, round(l.stepBase * f, 500)]]));
  const chairLevels = f => ({ 'upgrades.table.chairUpgrade.priceBase': round(t.chairUpgrade.priceBase * f, 500), 'upgrades.table.chairUpgrade.stepBase': round(t.chairUpgrade.stepBase * f, 500) });
  const lifePath = f => Object.fromEntries(LP.flatMap((v, i) => [[`lifePath.${i + 1}.lifetimeBase`, round(v * f, 1000)], [`league.tiers.${i + 1}.minSeasonEarnedBase`, round(v * f, 1000)]]));
  /** The location multipliers as a ramp from 1.0 at the fallback to `top` at the last location. */
  const mult = top => Object.fromEntries(locations.map((l, i) => [`locations.list.${i}.mult`, +(1 + (top - 1) * i / (locations.length - 1)).toFixed(3)]));
  const rent = f => Object.fromEntries(locations.map((l, i) => [`locations.list.${i}.rentPerDayBase`, l.rentPerDayBase === 0 ? 0 : round(l.rentPerDayBase * f, 100)])); // the free fallback stays free
  const kegs = (storage, batch) => Object.fromEntries([...seed.upgrades.keg.kegStorage.flatMap((v, i) => [[`upgrades.keg.kegStorage.${i}`, Math.round(v * storage)], [`upgrades.keg.kegBatch.${i}`, Math.min(Math.round(v * storage), Math.round(seed.upgrades.keg.kegBatch[i] * batch))]])]);
  return { devices, tables, chairs, tableLevels, chairLevels, lifePath, mult, rent, kegs };
}

export const seed = bundled;
export const { devices, tables, chairs, tableLevels, chairLevels, lifePath, mult, rent, kegs } = makeLevers(bundled);
export const values = (label, list, build) => list.map(v => ({ label: `${label} ${v}`, patch: build(v) }));
