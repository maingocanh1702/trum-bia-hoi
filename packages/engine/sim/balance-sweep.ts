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
export interface CoordinateValue { label: string; patch: Patch }
/** `values` may be a function of the CURRENT best patch: a coordinate that moves a rung by a share of what it is now (a fine step around wherever the descent has got to). */
export interface Coordinate { name: string; values: CoordinateValue[] | ((current: Patch) => CoordinateValue[]) }
export const valuesOf = (c: Coordinate, current: Patch): CoordinateValue[] => typeof c.values === 'function' ? c.values(current) : c.values;
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
    const args = ['--import', 'tsx', gates, `--job=${job}`, `--patch=${patchFile}`, `--days=${options.days}`, `--shift1=${options.shift1Seeds}`, `--seeds=${options.standardSeeds.join(',')}`, ...(options.onboardingPair ? ['--onboarding-pair'] : []),
      ...(options.seatsFirst === false ? ['--bot=price'] : []), ...(options.startAt !== undefined ? [`--start=${new Date(options.startAt + 7 * 3600000).toISOString().slice(0, 10)}`] : [])];
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
/**
 * A sanity rule for the ladders a sweep may produce: a rung is never cheaper than the rung before it (tables 2-8, second chairs 1-8, each device's levels, the three table levels,
 * the rent and the multiplier along the list of places). A coordinate descent that is allowed to move one rung at a time finds non-monotone ladders (the first extra chair dearer than
 * the second) that score well against a bot and read as a bug to a human; such a candidate is recorded as invalid and never run. Returns what is wrong, or null.
 */
export function ladderProblem(raw: typeof bundled.raw): string | null {
  const rising = (name: string, xs: (number | null)[]) => { const v = xs.filter((x): x is number => typeof x === 'number'); for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) return `${name}: rung ${i + 1} (${v[i]}) is cheaper than rung ${i} (${v[i - 1]})`; return null; };
  const t = raw.upgrades.table;
  const problems = [rising('tablePriceBase', t.tablePriceBase), rising('chairPriceBase', t.chairPriceBase), rising('tableUpgrade levels', t.tableUpgrade.levels.map(l => l.priceBase)),
    ...(['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const).map(kind => rising(`${kind}.priceBase`, raw.upgrades[kind].priceBase)),
    rising('rentPerDayBase', raw.locations.list.map(l => l.rentPerDayBase)), rising('location mult', raw.locations.list.map(l => l.mult))];
  return problems.find(x => x !== null) ?? null;
}
export interface Evaluated { hash: string; patch: Patch; failing: string[]; score: { fails: number; violation: number }; rows: ReturnType<typeof mergeJobs>['rows']; careers: ReturnType<typeof mergeJobs>['careers']; standard: ReturnType<typeof mergeJobs>['standard']; shift1: ReturnType<typeof mergeJobs>['shift1'] }

export async function evaluateAll(patches: Patch[], dir: string, options: JobOptions, pool: number, label = ''): Promise<Evaluated[]> {
  mkdirSync(join(dir, 'runs'), { recursive: true }); mkdirSync(join(dir, 'patches'), { recursive: true }); mkdirSync(join(dir, 'jobcache'), { recursive: true });
  const unique = new Map<string, Patch>(); for (const p of patches) unique.set(hashOf(p), p);
  // A ladder that is not monotone is an invalid candidate, written down and never run.
  for (const [hash, patch] of unique) {
    if (existsSync(join(dir, 'runs', `${hash}.json`))) continue;
    let problem: string | null = null;
    try { problem = ladderProblem(applyPatch(bundled.raw, patch)); } catch { problem = null; } // a patch the config refuses is reported by the job itself
    if (problem) writeFileSync(join(dir, 'runs', `${hash}.json`), JSON.stringify({ hash, patch, failing: ['invalid'], score: { fails: 9999, violation: 9999 }, rows: [], careers: {}, error: `ladder: ${problem}`, label, days: options.days, seeds: options.standardSeeds, ms: 0 }, null, 1));
  }
  const todo = [...unique].filter(([hash]) => !existsSync(join(dir, 'runs', `${hash}.json`)));
  const seedJobs = options.standardSeeds.map(s => `career:${s}`);
  const names = [...seedJobs, ...(options.skipStandard ? [] : ['standard']), ...(options.shift1Seeds > 0 ? ['shift1'] : [])]; // a screening run (balance-grid --days=12) skips the standard k
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
/** A run is only comparable with runs of the same protocol: an output directory belongs to one bot, one first day, one set of seeds and one career length. */
export function claimProtocol(out: string, options: JobOptions, start: string | undefined) {
  const protocol = JSON.stringify({ bot: options.seatsFirst === false ? 'price' : 'plan', start: start ?? 'default', seeds: options.standardSeeds, days: options.days, shift1: options.shift1Seeds, ...(options.skipStandard ? { skipStandard: true } : {}) });
  const protocolFile = join(out, 'protocol.json');
  if (existsSync(protocolFile)) assert.equal(readFileSync(protocolFile, 'utf8'), protocol, `${out} holds runs of another protocol`); else writeFileSync(protocolFile, protocol);
}
/**
 * A sweep stage may judge only some gates (`--gates=table4,chair1,door` : an id or a prefix of one) and may leave out rows that are red for EVERY candidate (`--known-red=shift1.wallet`: a row
 * the levers of the plan cannot reach is reported, never searched, and never keeps `--stop-at-clean` from stopping); the whole table is still saved with every run.
 */
export interface Judge { only: string[] | null; knownRed: string[]; p0Floor: number | null }
const matches = (r: { id: string }, ids: string[]) => ids.some(id => r.id === id || r.id.startsWith(`${id}.`));
export const scoped = (e: Evaluated, j: Judge) => e.failing[0] === 'invalid' ? e.score : score(e.rows.filter(r => (!j.only || matches(r, j.only)) && !matches(r, j.knownRed)));
/** The ids of the judged rows that fail (an invalid candidate says so). */
export const judgedFailing = (e: Evaluated, j: Judge) => e.failing[0] === 'invalid' ? e.failing : e.rows.filter(r => !r.ok && (!j.only || matches(r, j.only)) && !matches(r, j.knownRed)).map(r => r.id);
/** The share of the shift-1 probes that end below table 2's price (the worse of the two service models): what `--p0-floor` must not make worse than the base. */
const p0Share = (e: Evaluated) => e.shift1 ? Math.max(e.shift1.below, e.shift1.belowSlow) / e.shift1.seeds : 0;
/** A candidate whose ladders are not monotone is never a best, whether it was run before (a cached run of an earlier sweep) or not. */
const sane = (e: Evaluated) => { try { return ladderProblem(applyPatch(bundled.raw, e.patch)) === null; } catch { return false; } };
const better = (a: Evaluated, b: Evaluated, j: Judge) => {
  if (a.failing[0] !== 'invalid' && !sane(a)) return false;
  if (a.failing[0] !== 'invalid' && j.p0Floor !== null && p0Share(a) > j.p0Floor + 1e-9) return false; // never buy a row with P0: shift 1 may not get worse than the base
  const x = scoped(a, j), y = scoped(b, j); return x.fails < y.fails || x.fails === y.fails && x.violation < y.violation - 1e-9;
};

if (process.argv[1] && resolve(process.argv[1]) === here) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const planFile = option('plan'), out = option('out');
  assert.ok(planFile && out, 'Usage: balance-sweep --plan=<plan.mjs> --out=<dir> [--pool=5] [--passes=3] [--days=30] [--shift1=60] [--bot=price] [--start=YYYY-MM-DD] [--stop-at-clean] [--known-red=shift1.wallet] [--p0-floor] [--skip-standard]');
  const pool = Number(option('pool') ?? 5), passes = Number(option('passes') ?? 3);
  const judge: Judge = { only: option('gates')?.split(',') ?? null, knownRed: option('known-red')?.split(',') ?? [], p0Floor: null };
  const options: JobOptions = { days: Number(option('days') ?? 30), onboardingPair: false, shift1Seeds: Number(option('shift1') ?? TARGETS.shift1Seeds), standardSeeds: (option('seeds') ?? '42,99').split(',').map(Number),
    seatsFirst: option('bot') === 'price' ? false : undefined, startAt: option('start') ? Date.parse(`${option('start')}T00:00:00+07:00`) : undefined, skipStandard: argv.includes('--skip-standard') };
  const plan = (await import(pathToFileURL(resolve(planFile)).href)).default as Plan;
  applyPatch(bundled.raw, plan.base); for (const c of plan.coordinates) for (const v of valuesOf(c, plan.base)) applyPatch(bundled.raw, v.patch); // a path that does not exist fails now, not after an hour
  mkdirSync(out, { recursive: true });
  claimProtocol(out, options, option('start'));
  const log = (line: string) => { console.log(line); writeFileSync(join(out, 'sweep.log'), line + '\n', { flag: 'a' }); };
  let current = (await evaluateAll([plan.base], out, options, pool, 'base'))[0];
  const floorArg = argv.find(a => a === '--p0-floor' || a.startsWith('--p0-floor='));
  if (floorArg) judge.p0Floor = floorArg.includes('=') ? Number(floorArg.split('=')[1]) : p0Share(current); // `--p0-floor` = the base's own share, `--p0-floor=0.733` = an explicit one (a base may start worse than the floor)
  log(`# base ${current.hash}: fails ${scoped(current, judge).fails}, violation ${scoped(current, judge).violation.toFixed(3)} (all gates ${current.score.fails}): ${current.failing.join(', ') || 'none'}${judge.only ? ` | judged on ${judge.only.join(',')}` : ''}${judge.knownRed.length ? ` | known red, not judged: ${judge.knownRed.join(',')}` : ''}${judge.p0Floor !== null ? ` | shift-1 share below table 2 may not exceed ${judge.p0Floor.toFixed(3)}` : ''}`);
  const stopAtClean = argv.includes('--stop-at-clean'); // end the sweep at the first set that passes every gate on every seed
  let clean = false;
  for (let pass = 1; pass <= passes && !clean; pass++) {
    let improved = false;
    for (const coordinate of plan.coordinates) {
      const choices = valuesOf(coordinate, current.patch);
      const candidates = choices.map(v => ({ ...current.patch, ...v.patch }));
      const evaluated = await evaluateAll(candidates, out, options, pool, `${pass}:${coordinate.name}`);
      const byHash = new Map(evaluated.map(e => [e.hash, e]));
      let best = current;
      for (const [i, v] of choices.entries()) {
        const e = byHash.get(hashOf(candidates[i]))!;
        log(`  pass ${pass} ${coordinate.name} = ${v.label}: fails ${scoped(e, judge).fails}, violation ${scoped(e, judge).violation.toFixed(3)} [${e.failing.join(', ')}]${judge.p0Floor !== null && p0Share(e) > judge.p0Floor + 1e-9 ? ' (shift 1 worse: rejected)' : ''}${e.failing[0] !== 'invalid' && !sane(e) ? ' (ladder not monotone: rejected)' : ''}`);
        if (better(e, best, judge)) best = e;
      }
      if (best.hash !== current.hash) { current = best; improved = true; log(`> pass ${pass} ${coordinate.name}: NEW BEST ${current.hash} fails ${scoped(current, judge).fails}, violation ${scoped(current, judge).violation.toFixed(3)}`); }
      if (stopAtClean && scoped(current, judge).fails === 0) { clean = true; log(`# clean: every judged gate passes on every seed (${current.hash})`); break; }
    }
    writeFileSync(join(out, `best-pass${pass}.json`), JSON.stringify({ pass, hash: current.hash, patch: current.patch, score: current.score, failing: current.failing }, null, 1));
    log(`# end of pass ${pass}: best ${current.hash} fails ${scoped(current, judge).fails}, violation ${scoped(current, judge).violation.toFixed(3)}, improved: ${improved}`);
    if (!improved) break;
  }
  for (const line of formatGateTable(current.rows, options.standardSeeds)) log(line);
  writeFileSync(join(out, 'best.json'), JSON.stringify({ hash: current.hash, patch: current.patch, score: current.score, failing: current.failing }, null, 1));
}
