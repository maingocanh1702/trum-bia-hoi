/**
 * Design the table ladder by solving (review round 1 of plan S5): under the plan's strict seat-saving bot the first second chair lands right after the last table the first places
 * allow and every purchase before it must come within 8 shifts of the one before, so the ladder is not searched but DESIGNED: for each rung k = 3..n find the price at which the bot
 * buys table k at a TARGET shift (the average over the seeds). A rung's price only moves WHEN its own purchase happens, so the rungs are solved in order; each is a bisection on a short
 * career (days = target / 8 + 3). A rung found this way can sit on a cliff for one seed and not the other: the result is a start for a fine grid (plans/early-fix1.mjs) and a descent,
 * never a seal by itself.
 *   node --import tsx packages/engine/sim/solve-ladder.ts <base-patch.json> <out.json> [seeds=42,99] [targets=8,14,20,26,32,38]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { applyPatch, type Patch } from './balance-gates';
import { simulateCareer } from './career';
import { config, loadConfig, type SeedConfig } from '../src';

const [baseFile, outFile, seedArg = '42,99', targetArg = '8,14,20,26,32,38'] = process.argv.slice(2);
const seeds = seedArg.split(',').map(Number), targets = targetArg.split(',').map(Number);
let patch: Patch = { 'shift.startingCoinsBase': 300, ...JSON.parse(readFileSync(baseFile, 'utf8')) };
const round = (v: number) => Math.max(100, Math.round(v / 100) * 100);

/** The shift at which table #k (k = 3 is the second purchase after table 2) is bought, per seed; Infinity when not within the days. */
function purchaseShifts(p: Patch, rung: number, days: number): number[] {
  const cfg = loadConfig(applyPatch(config.raw, p)) as SeedConfig;
  return seeds.map(seed => {
    const { report } = simulateCareer({ days, seed, config: cfg });
    const bought = report.purchases.filter(x => x.command === 'buyTable');
    return bought[rung - 2]?.shift ?? Infinity; // buyTable #1 is table 2, #2 is table 3 ...
  });
}
for (let k = 3; k <= targets.length + 2; k++) {
  const target = targets[k - 3], days = Math.ceil(target / 8) + 3, path = `upgrades.table.tablePriceBase.${k - 2}`;
  let lo = Number(patch[path] ?? 100) * 0.2, hi = Number(patch[path] ?? 100) * 6;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  let best = { price: Number(patch[path]), shifts: purchaseShifts(patch, k, days) };
  for (let step = 0; step < 9; step++) {
    const mid = round((lo + hi) / 2), shifts = purchaseShifts({ ...patch, [path]: mid }, k, days), m = mean(shifts.map(s => Number.isFinite(s) ? s : days * 8 + 8));
    if (Math.abs(m - target) <= Math.abs(mean(best.shifts.map(s => Number.isFinite(s) ? s : days * 8 + 8)) - target)) best = { price: mid, shifts };
    if (m > target) hi = mid; else lo = mid;
    if (Math.abs(m - target) < 0.6) break;
  }
  patch = { ...patch, [path]: best.price };
  console.log(`table ${k}: target shift ${target} -> ${path} = ${best.price} base (${(best.price * 2.5).toFixed(0)} xu), bought at ${best.shifts.join(' / ')} on seeds ${seeds.join('/')}`);
}
writeFileSync(outFile, JSON.stringify(patch, null, 1) + '\n');
console.log('wrote', outFile);
