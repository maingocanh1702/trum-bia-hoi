import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config as bundled } from '../src/index';
import { mergeJobs, formatGateTable, applyPatch, score, TARGETS, type JobResult, type JobOptions, type Patch } from './balance-gates';

/**
 * Coordinate descent over the levers of the balance pass (plan S5, brief B5): every candidate is a patch of dotted paths over the bundled economy, evaluated by
 * balance-gates.ts (the career bot on seeds 42 and 99, the standard k, the shift-1 wallet probe) in a pool of child processes; EVERY run is kept as
 * `<out>/runs/<hash>.json` (patch + the metrics of each job + the gate table) so a sweep can stop and resume and nothing is ever eyeballed.
 *   node --import tsx packages/engine/sim/balance-sweep.ts --plan=<plan.mjs> --out=<dir> [--pool=5] [--passes=3] [--days=30] [--shift1=60]
 * A plan module exports `base` (a patch) and `coordinates`: [{ name, values: [{ label, patch }] }]. One pass tries every value of every coordinate in turn
 * around the CURRENT best patch and keeps the best (fewest failing seed-cells, then smallest summed violation); a pass that improves nothing ends the sweep.
 */
export interface Coordinate { name: string; values: { label: string; patch: Patch }[] }
export interface Plan { base: Patch; coordinates: Coordinate[] }
export const hashOf = (patch: Patch) => createHash('sha256').update(JSON.stringify(Object.entries(patch).sort(([a], [b]) => a.localeCompare(b)))).digest('hex').slice(0, 12);

/**
 * The standard-k and shift-1 probes never buy anything and never leave the first location, so they do not depend on what the shop costs later: a sweep that
 * moves a ladder, a device, the rent, a lease, the cap or the league reuses their saved result (`jobcache/`). A career depends on everything.
 */
const NEUTRAL = /^(upgrades\.table\.(tablePriceBase|chairPriceBase|tableUpgrade|chairUpgrade)|upgrades\.(keg|washer|cooler|stall|kitchen)\.priceBase|league\.|locations\.leaseDays|locations\.list\.\d+\.(rentPerDayBase|mult|tableSlots|gate)|shift\.dailyEarnCapBase)/;
const relevant = (patch: Patch) => Object.fromEntries(Object.entries(patch).filter(([key]) => !NEUTRAL.test(key)));
const here = fileURLToPath(import.meta.url), gates = join(resolve(here, '..'), 'balance-gates.ts');
function runChild(job: string, patchFile: string, options: JobOptions): Promise<JobResult> {
  return new Promise((done, fail) => {
    const args = ['--import', 'tsx', gates, `--job=${job}`, `--patch=${patchFile}`, `--days=${options.days}`, `--shift1=${options.shift1Seeds}`, `--seeds=${options.standardSeeds.join(',')}`, ...(options.onboardingPair ? ['--onboarding-pair'] : [])];
    const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { err += d; });
    child.on('exit', code => { try { if (code !== 0) throw Error(err.slice(-600)); done(JSON.parse(out.trim().split('\n').at(-1)!)); } catch (e) { fail(Error(`${job}: ${(e as Error).message}`)); } });
  });
}
/** A fixed-size pool: the queue of jobs of all candidates, `pool` children at a time. */
function pooled<T>(tasks: (() => Promise<T>)[], pool: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length); let next = 0;
  const worker = async () => { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } };
  return Promise.all(Array.from({ length: Math.min(pool, tasks.length) }, worker)).then(() => results);
}
export interface Evaluated { hash: string; patch: Patch; failing: string[]; score: { fails: number; violation: number }; rows: ReturnType<typeof mergeJobs>['rows']; careers: ReturnType<typeof mergeJobs>['careers']; standard: ReturnType<typeof mergeJobs>['standard']; shift1: ReturnType<typeof mergeJobs>['shift1'] }

export async function evaluateAll(patches: Patch[], dir: string, options: JobOptions, pool: number, label = ''): Promise<Evaluated[]> {
  mkdirSync(join(dir, 'runs'), { recursive: true }); mkdirSync(join(dir, 'patches'), { recursive: true }); mkdirSync(join(dir, 'jobcache'), { recursive: true });
  const unique = new Map<string, Patch>(); for (const p of patches) unique.set(hashOf(p), p);
  const todo = [...unique].filter(([hash]) => !existsSync(join(dir, 'runs', `${hash}.json`)));
  const seedJobs = options.standardSeeds.map(s => `career:${s}`);
  const names = [...seedJobs, 'standard', ...(options.shift1Seeds > 0 ? ['shift1'] : [])];
  const tasks: (() => Promise<{ hash: string; result?: JobResult; error?: string }>)[] = [];
  for (const [hash, patch] of todo) {
    const file = join(dir, 'patches', `${hash}.json`); writeFileSync(file, JSON.stringify(patch, null, 1));
    // A patch the engine refuses (config validation) or a job that dies is an INVALID candidate, kept on disk with its error, never a crash of the sweep.
    for (const job of names) tasks.push(async () => {
      const cache = job.startsWith('career') ? null : join(dir, 'jobcache', `${job}-${options.shift1Seeds}-${options.standardSeeds.join('+')}-${hashOf(relevant(patch))}.json`);
      if (cache && existsSync(cache)) return { hash, result: JSON.parse(readFileSync(cache, 'utf8')) as JobResult };
      return runChild(job, file, options).then(result => { if (cache) writeFileSync(cache, JSON.stringify(result)); return { hash, result }; }, (e: Error) => ({ hash, error: e.message }));
    });
  }
  const started = Date.now();
  const finished = await pooled(tasks, pool);
  const byHash = new Map<string, JobResult[]>(), errors = new Map<string, string>();
  for (const f of finished) { if (f.error) errors.set(f.hash, f.error); else byHash.set(f.hash, [...(byHash.get(f.hash) ?? []), f.result!]); }
  for (const hash of errors.keys()) {
    const record = { hash, patch: unique.get(hash)!, failing: ['invalid'], score: { fails: 9999, violation: 9999 }, rows: [], careers: {}, error: errors.get(hash), label, days: options.days, seeds: options.standardSeeds, ms: Date.now() - started };
    writeFileSync(join(dir, 'runs', `${hash}.json`), JSON.stringify(record, null, 1)); byHash.delete(hash);
  }
  for (const [hash, results] of byHash) {
    const patch = unique.get(hash)!, merged = mergeJobs(patch, results);
    const record: Evaluated & { label: string; days: number; seeds: number[]; ms: number } = { hash, patch, failing: merged.failing, score: merged.score, rows: merged.rows, careers: merged.careers, standard: merged.standard, shift1: merged.shift1, label, days: options.days, seeds: options.standardSeeds, ms: Date.now() - started };
    writeFileSync(join(dir, 'runs', `${hash}.json`), JSON.stringify(record, null, 1));
  }
  return [...unique.keys()].map(hash => JSON.parse(readFileSync(join(dir, 'runs', `${hash}.json`), 'utf8')) as Evaluated);
}
/** A sweep stage may judge only some gates (`--gates=table4,chair1,door` : an id or a prefix of one); the whole table is still saved with every run. */
const scoped = (e: Evaluated, only: string[] | null) => e.failing[0] === 'invalid' ? e.score : only ? score(e.rows.filter(r => only.some(id => r.id === id || r.id.startsWith(`${id}.`)))) : e.score;
const better = (a: Evaluated, b: Evaluated, only: string[] | null) => { const x = scoped(a, only), y = scoped(b, only); return x.fails < y.fails || x.fails === y.fails && x.violation < y.violation - 1e-9; };

if (process.argv[1] && resolve(process.argv[1]) === here) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const planFile = option('plan'), out = option('out');
  assert.ok(planFile && out, 'Usage: balance-sweep --plan=<plan.mjs> --out=<dir> [--pool=5] [--passes=3] [--days=30] [--shift1=60] [--stop-at-clean]');
  const pool = Number(option('pool') ?? 5), passes = Number(option('passes') ?? 3), only = option('gates')?.split(',') ?? null;
  const options: JobOptions = { days: Number(option('days') ?? 30), onboardingPair: false, shift1Seeds: Number(option('shift1') ?? TARGETS.shift1Seeds), standardSeeds: (option('seeds') ?? '42,99').split(',').map(Number) };
  const plan = (await import(pathToFileURL(resolve(planFile)).href)).default as Plan;
  applyPatch(bundled.raw, plan.base); for (const c of plan.coordinates) for (const v of c.values) applyPatch(bundled.raw, v.patch); // a path that does not exist fails now, not after an hour
  mkdirSync(out, { recursive: true });
  const log = (line: string) => { console.log(line); writeFileSync(join(out, 'sweep.log'), line + '\n', { flag: 'a' }); };
  let current = (await evaluateAll([plan.base], out, options, pool, 'base'))[0];
  log(`# base ${current.hash}: fails ${scoped(current, only).fails}, violation ${scoped(current, only).violation.toFixed(3)} (all gates ${current.score.fails}): ${current.failing.join(', ') || 'none'}${only ? ` | judged on ${only.join(',')}` : ''}`);
  const stopAtClean = argv.includes('--stop-at-clean'); // end the sweep at the first set that passes every gate on every seed
  let clean = false;
  for (let pass = 1; pass <= passes && !clean; pass++) {
    let improved = false;
    for (const coordinate of plan.coordinates) {
      const candidates = coordinate.values.map(v => ({ ...current.patch, ...v.patch }));
      const evaluated = await evaluateAll(candidates, out, options, pool, `${pass}:${coordinate.name}`);
      const byHash = new Map(evaluated.map(e => [e.hash, e]));
      let best = current;
      for (const [i, v] of coordinate.values.entries()) {
        const e = byHash.get(hashOf(candidates[i]))!;
        log(`  pass ${pass} ${coordinate.name} = ${v.label}: fails ${scoped(e, only).fails}, violation ${scoped(e, only).violation.toFixed(3)} [${e.failing.join(', ')}]`);
        if (better(e, best, only)) best = e;
      }
      if (best.hash !== current.hash) { current = best; improved = true; log(`> pass ${pass} ${coordinate.name}: NEW BEST ${current.hash} fails ${scoped(current, only).fails}, violation ${scoped(current, only).violation.toFixed(3)}`); }
      if (stopAtClean && current.score.fails === 0) { clean = true; log(`# clean: every gate passes on every seed (${current.hash})`); break; }
    }
    writeFileSync(join(out, `best-pass${pass}.json`), JSON.stringify({ pass, hash: current.hash, patch: current.patch, score: current.score, failing: current.failing }, null, 1));
    log(`# end of pass ${pass}: best ${current.hash} fails ${scoped(current, only).fails}, violation ${scoped(current, only).violation.toFixed(3)}, improved: ${improved}`);
    if (!improved) break;
  }
  for (const line of formatGateTable(current.rows, options.standardSeeds)) log(line);
  writeFileSync(join(out, 'best.json'), JSON.stringify({ hash: current.hash, patch: current.patch, score: current.score, failing: current.failing }, null, 1));
}
