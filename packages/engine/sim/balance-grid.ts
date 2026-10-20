import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config as bundled } from '../src/index';
import { applyPatch, TARGETS, type JobOptions, type Patch } from './balance-gates';
import { claimProtocol, evaluateAll, hashOf, scoped, judgedFailing, valuesOf, type Coordinate, type Judge } from './balance-sweep';

/**
 * A full-factorial grid over a few axes (plan S5, brief B5: "grid + coordinate descent"): every combination of one value per axis is a candidate (the patches of the picked values
 * merged over `base`, later axes win), all of them are evaluated by balance-gates.ts in the process pool of the sweep, EVERY run is kept as `<out>/runs/<hash>.json`, and the
 * table of the best ones is printed. The plan module exports `{ base, axes }` (axes are `Coordinate`s of the sweep driver). `--random=N` draws N combinations (a seeded shuffle)
 * instead of all of them: the grid of a many-axis plan is far bigger than a machine can run; `--sample=N` draws N combinations axis by axis (one uniform value per axis, seeded)
 * without ever building the product. `--gates=table4,chair1,...` scores only those rows (ids or prefixes), `--days=12 --shift1=0 --skip-standard` makes a screening run of the early game.
 *   node --import tsx packages/engine/sim/balance-grid.ts --plan=<plan.mjs> --out=<dir> [--pool=8] [--seeds=42] [--random=N | --sample=N] [--shuffle=1] [--chunk=16] [--top=25] [--gates=...] [--days=30] [--shift1=60] [--skip-standard] [--bot=price] [--start=YYYY-MM-DD]
 */
export interface GridPlan { base: Patch; axes: Coordinate[] }
export function combinations(plan: GridPlan): { label: string; patch: Patch }[] {
  let acc: { label: string; patch: Patch }[] = [{ label: '', patch: { ...plan.base } }];
  for (const axis of plan.axes) acc = acc.flatMap(c => valuesOf(axis, plan.base).map(v => ({ label: `${c.label}${c.label ? ' | ' : ''}${v.label}`, patch: { ...c.patch, ...v.patch } })));
  return acc;
}
/** mulberry32: a seeded shuffle keeps a random draw reproducible. */
const shuffled = <T>(list: T[], seed: number): T[] => {
  let a = seed >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const planFile = option('plan'), out = option('out');
  assert.ok(planFile && out, 'Usage: balance-grid --plan=<plan.mjs> --out=<dir> [--pool=8] [--seeds=42] [--random=N] [--shuffle=1] [--chunk=16] [--top=25] [--bot=price] [--start=YYYY-MM-DD]');
  const pool = Number(option('pool') ?? 8), chunk = Number(option('chunk') ?? 16), top = Number(option('top') ?? 25);
  const options: JobOptions = { days: Number(option('days') ?? 30), onboardingPair: false, shift1Seeds: Number(option('shift1') ?? TARGETS.shift1Seeds), standardSeeds: (option('seeds') ?? '42').split(',').map(Number),
    seatsFirst: option('bot') === 'price' ? false : undefined, startAt: option('start') ? Date.parse(`${option('start')}T00:00:00+07:00`) : undefined, skipStandard: argv.includes('--skip-standard') };
  const judge: Judge = { only: option('gates')?.split(',') ?? null, knownRed: option('known-red')?.split(',') ?? [], p0Floor: null };
  const plan = (await import(pathToFileURL(resolve(planFile)).href)).default as GridPlan;
  applyPatch(bundled.raw, plan.base); for (const a of plan.axes) for (const v of valuesOf(a, plan.base)) applyPatch(bundled.raw, v.patch);
  mkdirSync(out, { recursive: true });
  claimProtocol(out, options, option('start'));
  let list: { label: string; patch: Patch }[];
  const total = plan.axes.reduce((n, a) => n * valuesOf(a, plan.base).length, 1);
  if (option('sample')) { // N independent draws, one value per axis: the product of a many-axis plan is never built
    let a = Number(option('shuffle') ?? 1) >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const seen = new Set<string>(); list = [];
    for (let i = 0; i < Number(option('sample')) * 4 && list.length < Number(option('sample')); i++) {
      const picks = plan.axes.map(axis => { const vs = valuesOf(axis, plan.base); return vs[Math.floor(rnd() * vs.length)]; });
      const patch = Object.assign({}, plan.base, ...picks.map(v => v.patch)) as Patch, hash = hashOf(patch);
      if (!seen.has(hash)) { seen.add(hash); list.push({ label: picks.map(v => v.label).join(' | '), patch }); }
    }
  } else {
    list = combinations(plan);
    if (option('random')) list = shuffled(list, Number(option('shuffle') ?? 1)).slice(0, Number(option('random')));
  }
  console.log(`# grid: ${list.length} of ${total} combinations, seeds ${options.standardSeeds.join(',')}, ${plan.axes.map(a => `${a.name}[${valuesOf(a, plan.base).length}]`).join(' x ')}`);
  const rows: { label: string; hash: string; fails: number; violation: number; failing: string[] }[] = [];
  const names = new Map(list.map(c => [hashOf(c.patch), c.label]));
  for (let i = 0; i < list.length; i += chunk) {
    const part = list.slice(i, i + chunk), evaluated = await evaluateAll(part.map(c => c.patch), out, options, pool, `grid:${i}`);
    for (const e of evaluated) { const sc = scoped(e, judge); rows.push({ label: names.get(e.hash) ?? e.hash, hash: e.hash, fails: sc.fails, violation: sc.violation, failing: judgedFailing(e, judge) }); }
    const best = [...rows].sort((a, b) => a.fails - b.fails || a.violation - b.violation)[0];
    console.log(`# ${Math.min(i + chunk, list.length)}/${list.length} done; best so far: fails ${best.fails} violation ${best.violation.toFixed(3)} [${best.failing.join(', ')}] ${best.label}`);
  }
  rows.sort((a, b) => a.fails - b.fails || a.violation - b.violation);
  for (const r of rows.slice(0, top)) console.log(`${String(r.fails).padStart(2)} ${r.violation.toFixed(3)} ${r.hash} [${r.failing.join(', ')}] ${r.label}`);
  writeFileSync(join(out, 'grid.json'), JSON.stringify({ total, evaluated: rows.length, rows }, null, 1) + '\n');
}
