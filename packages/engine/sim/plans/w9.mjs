// The W9 candidate set of DESIGN-story section 3 (08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0") as a patch of dotted paths over the 2.0.23 economy (`plans/seed-2.0.23.json`):
// the starting point of the balance sweeps (plan S5, brief B5). Everything not listed here (queue 1 + seats/8, patience 24 s, capacityDemand 6/4, the table and
// chair ladders) is already in the 2.0.23 seed as W9. Device tails come from the seed itself (x0.5 on levels 4-5, kitchen levels 3-4), nothing is retyped.
import { frozen as seed } from './levers.mjs'; // the 2.0.23 file of the S4 tip: W9 is defined over it, whatever the bundled economy is when the plan runs
export const LP_LIFETIME = [8000, 20000, 80000, 280000, 680000, 1200000, 2000000];
export const SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];

export function w9() {
  const patch = {
    'tip.rate': 0.22,
    'shift.dailyEarnCapBase': 400000,
    'locations.leaseDays': 3,
    'league.seasons.ranking.days': 21,
    'league.seasons.contest.days': 21,
  };
  LP_LIFETIME.forEach((v, i) => { patch[`lifePath.${i + 1}.lifetimeBase`] = v; patch[`league.tiers.${i + 1}.minSeasonEarnedBase`] = v; });
  SLOTS.forEach((v, i) => { patch[`locations.list.${i}.tableSlots`] = v; });
  const tails = { keg: [3, 4], washer: [3, 4], cooler: [3, 4], stall: [3, 4], kitchen: [3, 4] };
  for (const [kind, levels] of Object.entries(tails)) for (const i of levels) patch[`upgrades.${kind}.priceBase.${i}`] = Math.round(seed.upgrades[kind].priceBase[i] * 0.5);
  return patch;
}
export default { base: w9(), coordinates: [] };
