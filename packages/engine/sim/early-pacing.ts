import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, WEATHER, beerStatus, currentGuests, restockQuote, type Command, type DomainEvent, type Weather } from '../src/index';
import { patchedConfig, type Patch } from './balance-gates';
import { serveNext } from './policy';

/**
 * Early pacing (founder 2026-10-22, IMPROVE-EARLY-GAME Part B1): what a brand-new save meets in its first two shifts at ONE table (nothing is bought), with the
 * weather fixed to one kind, over many seeds. Per shift: groups seated, groups turned away at the door (`queue_overflow`), the median and the longest gap
 * between two seatings, the seconds of the open shift with nobody seated, stale serves, and per rush the guests who arrived, were served and were lost (the
 * engine's own `rush_ended` report); and the coins when shift 1 has closed. Two players, both refilling only the beer from the keg's own button when it falls
 * below one batch (the player of `runShift1`): `fast` serves every ready tray at once (the sims' bot); `newcomer` serves the save's first tray 15 s after it
 * is ready (the 22/10 log: seated 15:08:12, flat 15:08:24, served 15:08:27) and every later one on a 4 s beat (the guest journey's poll, `runShift1`'s slow model).
 *   node --import tsx packages/engine/sim/early-pacing.ts [--seeds=200] [--weather=sunny,cold] [--player=newcomer,fast] [--set=path=json ...] [--json]
 * A measurement, never a tuning input and never a game number.
 */
// config-exempt: measurement protocol of Part B1 (start time, step, the two player models), not gameplay tuning.
export const T0 = Date.parse('2026-10-22T10:00:00+07:00'), STEP_MS = 100, FIRST_SERVE_DELAY_MS = 15000, BEAT_MS = 4000;
export type Player = 'fast' | 'newcomer';
/** `firstArrivalMs`: from the rush's start to the first group at the door inside it (seated, queued or turned away), null when none came. */
export interface RushRow { slot: number; kind: string; arrived: number; rejected: number; served: number; lost: number; firstArrivalMs: number | null }
export interface ShiftRow { seated: number; turnedAway: number; turnedAwayGuests: number; noSeat: number; full: number; gaps: number[]; medianGapMs: number | null; maxGapMs: number | null;
  firstSeatMs: number | null; idleMs: number; stale: number; arrived: number; served: number; lost: number; rushes: RushRow[]; coinsAtClose: number }

const median = (xs: readonly number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** One brand-new save, two shifts, one table, the weather fixed: the rows of shift 1 and shift 2. */
export function playSave(patch: Patch, weather: Weather, player: Player, seed: number): ShiftRow[] {
  const fixed: Patch = { ...patch }; for (const kind of WEATHER) fixed[`weather.${kind}.weight`] = kind === weather ? 1 : 0;
  const config = patchedConfig(fixed), game = new Game(config, seed, T0), w = game.world;
  const send = (command: Command) => game.command({ command, at: w.now, idempotencyKey: `ep-${game.log.length}` });
  const rows: ShiftRow[] = [];
  let served = false, firstReadyAt: number | null = null, nextServe = 0;
  for (let n = 1; n <= 2; n++) {
    assert.ok(send({ type: 'startShift' }).ok, `seed ${seed}: shift ${n} opens`); // the first three shifts of a save need no rest (shift.noCooldownFirstShifts)
    assert.equal(w.shift!.weather, weather);
    const from = w.events.length, opened = w.now;
    let idleMs = 0;
    for (let steps = 0; w.phase !== 'resting'; steps++) {
      assert.ok(steps < 40000, `seed ${seed}: shift ${n} closes`);
      if (w.phase === 'open' && w.inventory.bia < beerStatus(w, config).batchSize && restockQuote(w, config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' });
      const ready = w.tables.some(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'));
      if (ready) firstReadyAt ??= w.now;
      if (player === 'fast') serveNext(game, command => { send(command); });
      else if (!served) { // the newcomer reads the step guide: the save's first tray waits FIRST_SERVE_DELAY_MS after it is ready
        if (ready && w.now >= firstReadyAt! + FIRST_SERVE_DELAY_MS) { serveNext(game, command => { send(command); }); if (w.serves.length) { served = true; nextServe = w.now + BEAT_MS; } }
      } else if (w.now >= nextServe) { serveNext(game, command => { send(command); }); nextServe = w.now + BEAT_MS; } // then a look every BEAT_MS, like runShift1's 4 s model
      const open = w.phase === 'open';
      game.advance(w.now + STEP_MS);
      if (open && w.tables.every(t => currentGuests(t).length === 0)) idleMs += STEP_MS;
    }
    const events = w.events.slice(from) as DomainEvent[], s = w.shift!;
    const seatedAt = events.filter(e => e.type === 'group_seated').map(e => e.at), gaps = seatedAt.slice(1).map((t, i) => t - seatedAt[i]);
    const overflow = events.filter(e => e.type === 'queue_overflow');
    const rushes = events.filter(e => e.type === 'rush_ended' && e.data.slot !== undefined).map(e => {
      const start = Number(e.data.startedAt), door = events.find(x => (x.type === 'customer_spawned' || x.type === 'queue_overflow') && x.at >= start && x.at < e.at);
      return { slot: Number(e.data.slot), kind: String(e.data.kind), arrived: Number(e.data.arrived), rejected: Number(e.data.rejected), served: Number(e.data.served), lost: Number(e.data.lost),
        firstArrivalMs: door ? door.at - start : null };
    });
    rows.push({ seated: seatedAt.length, turnedAway: overflow.length, turnedAwayGuests: overflow.reduce((n, e) => n + Number(e.data.size), 0),
      noSeat: overflow.filter(e => e.data.reason === 'noSeat').length, full: overflow.filter(e => e.data.reason !== 'noSeat').length,
      gaps, medianGapMs: median(gaps), maxGapMs: gaps.length ? Math.max(...gaps) : null, firstSeatMs: seatedAt.length ? seatedAt[0] - opened : null, idleMs,
      stale: events.filter(e => e.type === 'customer_served' && e.data.stale === true).length,
      arrived: s.stats.arrived, served: s.stats.served, lost: s.stats.lost, rushes, coinsAtClose: w.coins });
  }
  return rows;
}

export interface Cell { weather: Weather; player: Player; shift: number; seeds: number; values: Record<string, { median: number | null; mean: number; max: number }>; rushes: Record<string, { median: number | null; mean: number; max: number }>[] }
/** Medians (and means and maxima) over the seeds of every number of one cell (weather x player x shift). */
export function measure(patch: Patch, weather: Weather, player: Player, seeds: number): Cell[] {
  const runs = Array.from({ length: seeds }, (_, i) => playSave(patch, weather, player, i + 1));
  const sum = (xs: number[]) => ({ median: median(xs), mean: xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length), max: xs.length ? Math.max(...xs) : 0 });
  return [0, 1].map(index => {
    const rows = runs.map(r => r[index]), pick = (f: (r: ShiftRow) => number | null) => rows.map(f).filter((x): x is number => x !== null);
    const values = { seated: sum(pick(r => r.seated)), turnedAway: sum(pick(r => r.turnedAway)), turnedAwayGuests: sum(pick(r => r.turnedAwayGuests)), noSeat: sum(pick(r => r.noSeat)), full: sum(pick(r => r.full)),
      medianGapS: sum(pick(r => r.medianGapMs === null ? null : r.medianGapMs / 1000)), maxGapS: sum(pick(r => r.maxGapMs === null ? null : r.maxGapMs / 1000)),
      pooledMedianGapS: { median: median(rows.flatMap(r => r.gaps).map(g => g / 1000)), mean: 0, max: Math.max(0, ...rows.flatMap(r => r.gaps)) / 1000 },
      firstSeatS: sum(pick(r => r.firstSeatMs === null ? null : r.firstSeatMs / 1000)), idleS: sum(pick(r => r.idleMs / 1000)), stale: sum(pick(r => r.stale)),
      arrived: sum(pick(r => r.arrived)), served: sum(pick(r => r.served)), lost: sum(pick(r => r.lost)), coinsAtClose: sum(pick(r => r.coinsAtClose)) };
    const slots = Math.max(0, ...rows.map(r => r.rushes.length));
    const rushes = Array.from({ length: slots }, (_, slot) => {
      const of = rows.map(r => r.rushes.find(x => x.slot === slot)).filter((x): x is RushRow => !!x);
      return { count: sum([of.length]), arrived: sum(of.map(x => x.arrived)), rejected: sum(of.map(x => x.rejected)), served: sum(of.map(x => x.served)), lost: sum(of.map(x => x.lost)),
        noArrival: sum([of.filter(x => x.arrived === 0).length]), firstArrivalS: sum(of.map(x => x.firstArrivalMs).filter((x): x is number => x !== null).map(x => x / 1000)) };
    });
    return { weather, player, shift: index + 1, seeds, values, rushes };
  });
}

const f1 = (n: number | null) => n === null ? 'n/a' : (Math.round(n * 10) / 10).toString();
export function formatCells(cells: readonly Cell[]): string[] {
  const lines = ['weather | player | shift | seated | turned away (noSeat/full) | median gap s | max gap s (median · worst) | first seat s | idle s | stale | arrived/served/lost guests | coins at close | rushes: arrived/served/lost (median per rush) · rushes with no arrival · first arrival s (median)'];
  for (const c of cells) {
    const v = c.values;
    lines.push([c.weather, c.player, c.shift, f1(v.seated.median), `${f1(v.turnedAway.median)} (${f1(v.noSeat.median)}/${f1(v.full.median)})`, f1(v.medianGapS.median),
      `${f1(v.maxGapS.median)} · ${f1(v.maxGapS.max)}`, f1(v.firstSeatS.median), f1(v.idleS.median), `${f1(v.stale.median)} (mean ${v.stale.mean.toFixed(2)})`,
      `${f1(v.arrived.median)}/${f1(v.served.median)}/${f1(v.lost.median)}`, f1(v.coinsAtClose.median),
      c.rushes.length ? c.rushes.map((r, i) => `#${i + 1} ${f1(r.arrived.median)}/${f1(r.served.median)}/${f1(r.lost.median)} · ${r.noArrival.max}/${r.count.max} · ${f1(r.firstArrivalS.median)}`).join(' · ') : 'none'].join(' | '));
  }
  return lines;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const patch: Patch = {};
  for (const a of argv.filter(x => x.startsWith('--set='))) { const [path, ...rest] = a.slice(6).split('='); patch[path] = JSON.parse(rest.join('=')); }
  const seeds = Number(option('seeds') ?? 200), weathers = (option('weather') ?? 'sunny,cold').split(',') as Weather[], players = (option('player') ?? 'newcomer,fast').split(',') as Player[];
  for (const weather of weathers) assert.ok(WEATHER.includes(weather), `unknown weather ${weather}`);
  const config = patchedConfig(patch);
  console.log(`# early-pacing · JSON ${config.version} · seeds 1..${seeds} · weather ${weathers.join(',')} · players ${players.join(',')} · patch ${JSON.stringify(patch)}`);
  const cells = weathers.flatMap(weather => players.flatMap(player => measure(patch, weather, player, seeds)));
  for (const line of formatCells(cells)) console.log(line);
  if (argv.includes('--json')) console.log(JSON.stringify(cells));
}
