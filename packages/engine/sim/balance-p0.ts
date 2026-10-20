import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config as bundled, loadConfig, type SeedConfig } from '../src/index';
import { applyPatch, runShift1, type Patch, type Shift1Metrics } from './balance-gates';
import { hashOf, valuesOf, type Plan } from './balance-sweep';

/**
 * The P0 descent (plan section 0 P0, review round 1 of S5): shift 1 must EARN table 2 - a start wallet of 750 xu that does not pay it and a wallet that has grown to its price by
 * the end of shift 1 and the beer stock, on EVERY probe (60 seeds, the fast and the 4 s service model). That row depends on nothing but shift 1, so it is searched on its own and
 * cheaply (about 3 s a candidate): a coordinate descent over the levers of a plan that maximises the worst end wallet (then the median), every candidate kept. The exhaustion rule
 * of the brief ("unreachable by JSON" only after >= 3 full passes without improvement and every named lever swept) is read off this table for the row alone.
 *   node --import tsx packages/engine/sim/balance-p0.ts --plan=packages/engine/sim/plans/p0.mjs --out=<dir> [--passes=4] [--idle=3]
 */
export interface P0Run { hash: string; patch: Patch; worst: number; fast: number; slow: number; median: number; below: number; belowSlow: number; price: number; startCoins: number; servedMin: number; servedMedian: number }
export function evaluateP0(patch: Patch, seeds = 60): P0Run {
  const m: Shift1Metrics = runShift1(loadConfig(applyPatch(bundled.raw, patch)) as SeedConfig, seeds);
  const worst = Math.min(m.afterRestock.min, m.slowCoarse.min);
  return { hash: hashOf(patch), patch, worst, fast: m.afterRestock.min, slow: m.slowCoarse.min, median: m.afterRestock.median, below: m.below, belowSlow: m.belowSlow, price: m.price, startCoins: m.startCoins, servedMin: m.served.min, servedMedian: m.served.median };
}
const better = (a: P0Run, b: P0Run) => a.worst > b.worst || (a.worst === b.worst && a.median > b.median);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const planFile = option('plan'), out = option('out');
  assert.ok(planFile && out, 'Usage: balance-p0 --plan=<plan.mjs> --out=<dir> [--passes=4] [--idle=3]');
  const passes = Number(option('passes') ?? 4), idleNeeded = Number(option('idle') ?? 3);
  const plan = (await import(pathToFileURL(resolve(planFile)).href)).default as Plan;
  mkdirSync(out, { recursive: true });
  const all = new Map<string, P0Run>(), log: string[] = [];
  const say = (line: string) => { console.log(line); log.push(line); };
  const run = (patch: Patch) => { const h = hashOf(patch); if (!all.has(h)) all.set(h, evaluateP0(patch)); return all.get(h)!; };
  let current = run(plan.base), idle = 0;
  say(`# base: worst end ${current.worst} (fast ${current.fast}, 4 s ${current.slow}), median ${current.median}, ${current.below}/60 and ${current.belowSlow}/60 below ${current.price}, start ${current.startCoins}, served min ${current.servedMin} median ${current.servedMedian}`);
  for (let pass = 1; pass <= passes; pass++) {
    let improved = false;
    for (const coordinate of plan.coordinates) {
      let best = current;
      for (const v of valuesOf(coordinate, current.patch)) {
        const r = run({ ...current.patch, ...v.patch });
        say(`  pass ${pass} ${coordinate.name} = ${v.label}: worst ${r.worst} median ${r.median} below ${r.below}/${r.belowSlow} served min ${r.servedMin}`);
        if (better(r, best)) best = r;
      }
      if (best.hash !== current.hash) { current = best; improved = true; say(`> pass ${pass} ${coordinate.name}: NEW BEST worst ${current.worst} median ${current.median} below ${current.below}/${current.belowSlow}`); }
    }
    idle = improved ? 0 : idle + 1;
    say(`# end of pass ${pass}: worst ${current.worst}, median ${current.median}, ${current.below}/60 below ${current.price}; improved: ${improved}; passes without improvement: ${idle}`);
    if (idle >= idleNeeded) break;
  }
  say(`# best: ${JSON.stringify(current.patch)}`);
  say(`# ${all.size} candidates, ${current.worst >= current.price ? 'REACHED' : 'NOT reached'}: the worst probe ends at ${current.worst} against ${current.price} (takings ${current.worst - current.startCoins} against ${current.price - current.startCoins})`);
  writeFileSync(join(out, 'p0.json'), JSON.stringify({ best: current, runs: [...all.values()], log }, null, 1) + '\n');
}
