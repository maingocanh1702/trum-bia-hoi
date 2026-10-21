import { readFileSync } from 'node:fs';
import { patchedConfig, runShift1, wilson, TARGETS, type Patch } from './balance-gates';

/**
 * The shift-1 statistics of one economy over many probes, in one line (review round 3 of plan S5): the share of runs that can buy table 2 when shift 1 closes (fast and 4 s service model, with the 95 %
 * Wilson interval of the worse one), the median takings, the median refused pairs, the strict count (runs that end below table 2's price after the beer restock) and the owner's criterion and the two
 * information flags of the shift-1 rows of balance-gates.ts (gate `shift1.plan`: the worse-model share is at least 80 %, the owner's 4 runs in 5, owner decision 1 of S5; information, never a gate: median takings 850-1160 and median refused pairs 8-12, the plan's section 0 narrative read as bands). Probe seeds are 1..n, so the first 60 probes of a 300-probe run are the 60-probe run of the rounds before.
 *   node --import tsx packages/engine/sim/p0-share.ts [patch.json ...] [--set=path=json ...] [--n=300] [--label=name]
 * A patch file or a --set value overrides the committed economy (the paths of packages/engine/sim/plans/candidate-d.json apply over it); without any the committed set is measured.
 *   committed set:        node --import tsx packages/engine/sim/p0-share.ts
 *   option (d), Set 4:    node --import tsx packages/engine/sim/p0-share.ts packages/engine/sim/plans/candidate-d.json
 *   demand lever:         for m in 4 3 2.5 2 1.75 1.5; do node --import tsx packages/engine/sim/p0-share.ts --set=spawn.capacityDemand.maxMult=$m --label=maxMult$m; done
 *   option (a), price:    node --import tsx packages/engine/sim/p0-share.ts --set=upgrades.table.tablePriceBase.0=440     (xu = base x 2.5: 440 is 1 100 xu, 429 is 1 073 xu)
 *   option (b), pairs:    node --import tsx packages/engine/sim/p0-share.ts --set=spawn.pPair=0.3
 *   40-point grid:        for m in 1.5 1.6 1.7 1.8 1.9; do for q in 1 2; do for p in 24000 33000; do for t in 0.17 0.19; do node --import tsx packages/engine/sim/p0-share.ts --header=no --label=m$m-q$q-p$p-t$t --set=spawn.capacityDemand.maxMult=$m --set=runtime.queueBaseSlots=$q --set=patience.thuongMs=$p --set=tip.rate=$t; done; done; done; done
 *   600 probes:           node --import tsx packages/engine/sim/p0-share.ts packages/engine/sim/plans/candidate-d.json --n=600
 * The whole 23-row table of an option: node --import tsx packages/engine/sim/balance-gates.ts --onboarding-pair [--patch=file.json] [--set=path=json ...]   (shift-1 rows over 300 probes by default).
 */
const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const n = Number(option('n') ?? TARGETS.shift1Seeds), label = option('label') ?? 'committed';
const patch: Patch = {};
for (const file of argv.filter(a => !a.startsWith('--'))) Object.assign(patch, JSON.parse(readFileSync(file, 'utf8')));
for (const a of argv.filter(x => x.startsWith('--set='))) { const [path, ...rest] = a.slice(6).split('='); patch[path] = JSON.parse(rest.join('=')); }

const m = runShift1(patchedConfig(patch), n), p = m.plan, T = TARGETS.shift1Plan;
const nFast = Math.round(p.shareFast * n), nSlow = Math.round(p.shareSlow * n), worse = Math.min(nFast, nSlow), ci = wilson(worse, n);
const pct = (x: number) => `${(x * 100).toFixed(0)} %`;
const shareOk = worse / n >= T.share - 1e-9, takingsOk = p.takingsMedian >= T.takings[0] && p.takingsMedian <= T.takings[1], pairsOk = p.refusedPairsMedian >= T.refusedPairs[0] && p.refusedPairsMedian <= T.refusedPairs[1];
if (option('header') !== 'no') console.log('label | n | can buy table 2 at close: fast / 4 s | worse share (95 % CI) | median takings fast / 4 s | median refused pairs fast / 4 s | strict: below price after restock fast / 4 s, worst end | owner criterion (gate: share >= 80 %) and information flags (takings 850-1160, pairs 8-12)');
console.log([label, n, `${nFast}/${n} · ${nSlow}/${n}`, `${pct(worse / n)} (${(ci.lo * 100).toFixed(0)}-${(ci.hi * 100).toFixed(0)} %)`, `${p.takingsMedian} / ${p.takingsMedianSlow}`, `${p.refusedPairsMedian} / ${p.refusedPairsMedianSlow}`,
  `${m.below}/${n} · ${m.belowSlow}/${n}, worst ${Math.min(m.afterRestock.min, m.slowCoarse.min)}`, `${shareOk ? 'share ok' : 'share SHORT'} · ${takingsOk ? 'takings ok' : 'takings OUT'} · ${pairsOk ? 'pairs ok' : 'pairs OUT'}${m.startCoins >= m.price ? ' · START PAYS TABLE 2' : ''}`].join(' | '));
