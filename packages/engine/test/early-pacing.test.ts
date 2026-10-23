import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, PAIR, WEATHER, config, loadConfig, decodeSave, encodeSave, arrivalIntervalMs, capacityDemandMult, freshnessMs, restockQuote, restRequired, buyChairQuote,
  singlesFirstShifts, replanPendingArrival, firstShiftStaleDisabled, DISHES, type Command, type Weather } from '../src';
import { serveNext } from '../sim/policy';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B1, JSON 2.1.4): B1.1 singles only in a save's first three shifts (`spawn.singlesFirstShifts` 3, Tier A: the founder's
// amendment of 2026-10-23 to QD-117 option B), B1.2 the pending arrival re-planned when a rush starts or ends (`rush.schedule.replanPendingArrival`, Tier B), B1.3 no
// flat beer in shift 1 (`onboarding.firstShift.staleDisabled`, Tier C). Each key is its own gate: a pin without them (JSON <= 2.1.3) plays and replays as it always did.
// Every state comes from real commands and clock time.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-22T10:00:00+07:00');
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** The bundled seed with one weather only (the measurement's sunny and cold), patched further if asked. */
const content = (weather: Weather = 'sunny', patch?: (raw: Seed) => void) => {
  const raw = structuredClone(seed); for (const kind of WEATHER) raw.weather[kind].weight = kind === weather ? 1 : 0; patch?.(raw); return raw;
};
/** The same content as it was before 2.1.4: the label 2.1.3, without the three keys and the Tier A entry 2.1.4 added. */
const before214 = (raw: Seed) => {
  raw._meta.version = '2.1.3';
  delete (raw.spawn as Record<string, unknown>).singlesFirstShifts; delete (raw.rush.schedule as Record<string, unknown>).replanPendingArrival;
  delete (raw.onboarding.firstShift as Record<string, unknown>).staleDisabled;
  raw._meta.governance.tiers.A.sections = raw._meta.governance.tiers.A.sections.filter(name => name !== 'spawn.singlesFirstShifts');
};
const keysOff = (raw: Seed) => { raw.spawn.singlesFirstShifts = 0; raw.rush.schedule.replanPendingArrival = false; raw.onboarding.firstShift.staleDisabled = false; };
const sender = (g: Game) => (command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `ep-${g.log.length}` });
/** Keep the shelves stocked and serve every ready tray at once, one step at a time, until `done` (or the shift closes). */
function run(g: Game, done: () => boolean = () => g.world.phase === 'resting') {
  const send = sender(g);
  for (let step = 0; !done(); step++) {
    assert.ok(step < 20000, 'the shift moves on');
    for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(command); });
    g.advance(g.world.now + 200);
  }
}
/** Open and play the next shifts; the fourth shift of a save first rests for its stamina (the first three need none: `shift.noCooldownFirstShifts`). */
const play = (g: Game, shifts: number) => {
  for (let n = 0; n < shifts; n++) {
    const w = g.world, full = g.config.values.shift.durationMs;
    if (restRequired(w, g.config)) g.advance(w.now + Math.ceil((full - w.staminaMs) / g.config.values.shift.regenRate));
    assert.ok(sender(g)({ type: 'startShift' }).ok); run(g);
  }
};
const door = (g: Game) => g.world.events.filter(e => e.type === 'customer_spawned' || e.type === 'queue_overflow');
/** The groups at the door per shift (shift n = the n-th `shift_opened`). */
const doorByShift = (g: Game) => {
  const out: (typeof g.world.events)[] = [];
  for (const e of g.world.events) { if (e.type === 'shift_opened') out.push([]); else if (out.length && (e.type === 'customer_spawned' || e.type === 'queue_overflow')) out.at(-1)!.push(e); }
  return out;
};
/** The gap one guest gets after arriving now, as `Game.spawn()` plans it at one-chair tables (no flyer). */
const gapOfOne = (g: Game, kind: 'none' | 'light') => Math.round(arrivalIntervalMs(g.config.values, g.world.shift!.weather, kind, false) * capacityDemandMult(g.config.values, g.world.tables.length));

test('B1.1 a new save at one table draws singles only in its first three shifts: no group of two arrives and nobody is sent away for want of a second chair (founder 2026-10-23, JSON 2.1.4)', () => {
  assert.equal(singlesFirstShifts(config.values), 3);
  for (const rngSeed of [1, 2, 3]) {
    const g = new Game(loadConfig(content()), rngSeed, T0); play(g, 3);
    const shifts = doorByShift(g);
    assert.equal(shifts.length, 3);
    for (const [n, arrivals] of shifts.entries()) assert.ok(arrivals.length >= 8 && arrivals.every(e => e.data.size === 1), `seed ${rngSeed}, shift ${n + 1}: every group is one guest (${arrivals.length})`);
    assert.equal(g.world.events.filter(e => e.type === 'queue_overflow' && e.data.reason === 'noSeat').length, 0, 'no "Hết chỗ" for a pair');
  }
});

test('B1.1 singles-only is the draw at pair probability 0: the same randomness, the same first three shifts, event for event', () => {
  for (const rngSeed of [1, 2, 3]) {
    const singles = new Game(loadConfig(content()), rngSeed, T0);
    const zero = new Game(loadConfig(content('sunny', raw => { raw.spawn.singlesFirstShifts = 0; raw.spawn.pPair = 0; })), rngSeed, T0);
    play(singles, 3); play(zero, 3);
    assert.equal(sha(singles.world), sha(zero.world), `seed ${rngSeed}`);
  }
});

test('B1.1 the rule counts shifts, not chairs: a shop that seats a pair from the start still gets singles in shifts 1-3, and spawn.pPair applies from shift 4', () => {
  // Four tables and a second chair (chairsAfterTables), bought with real commands from a large starting wallet before shift 1 (no real save gets there in three shifts).
  const g = new Game(loadConfig(content('sunny', raw => { raw.shift.startingCoinsBase = 10_000_000; })), 7, T0), send = sender(g);
  while (g.world.tables.length < seed.upgrades.table.chairsAfterTables) assert.ok(send({ type: 'buyTable' }).ok);
  assert.ok(buyChairQuote(g.world, g.config, g.world.tables[0]).ok); assert.ok(send({ type: 'buyChair', tableId: g.world.tables[0].id }).ok);
  assert.equal(Math.max(...g.world.tables.map(t => t.capacity)), PAIR);
  play(g, 4);
  const shifts = doorByShift(g);
  assert.equal(shifts.length, 4);
  for (const n of [0, 1, 2]) assert.ok(shifts[n].every(e => e.data.size === 1), `shift ${n + 1}: singles only, a two-chair table or not`);
  assert.ok(shifts[3].some(e => e.data.size === PAIR), 'shift 4 (three completed shifts): pairs arrive at pPair');
  const again = decodeSave(encodeSave(g)); assert.equal(sha(again.world), sha(g.world), 'and the history replays');
});

test('B1.1 a pin without the key (JSON 2.1.3) still sends pairs away at one table, as before, and its history replays byte for byte', () => {
  let refused = 0;
  for (const rngSeed of [1, 2, 3]) {
    const old = loadConfig(content('sunny', before214)); assert.equal(singlesFirstShifts(old.values), 0);
    const g = new Game(old, rngSeed, T0); play(g, 1);
    refused += g.world.events.filter(e => e.type === 'queue_overflow' && e.data.reason === 'noSeat').length;
    const again = decodeSave(encodeSave(g));
    assert.equal(sha(again.world), sha(g.world), `seed ${rngSeed}: the 2.1.3 history replays to the same world`); assert.equal(encodeSave(again), encodeSave(g));
  }
  assert.ok(refused > 0, 'a 2.1.3 shift 1 turns pairs away at the door');
});

/** A new save on `raw`: shift 1 played, shift 2 opened and played up to 1 ms before its first rush; the pending arrival then and right after the rush starts. */
function atFirstRush(raw: Seed, rngSeed: number) {
  const g = new Game(loadConfig(raw), rngSeed, T0); play(g, 1);
  assert.ok(sender(g)({ type: 'startShift' }).ok);
  const s = g.world.shift!, rush = s.rushes[0];
  assert.equal(rush.kind, 'light', 'a save on life path 0 has light rushes only');
  run(g, () => g.world.now >= rush.start - 300);
  g.advance(rush.start - 1);
  return { g, s, rush, pending: s.nextSpawnAt };
}

test('B1.2 reproduced on a 2.1.3 pin: the arrival planned before the first rush keeps its timer when the rush starts, so the rush can open with a long wait (shift-205 of 22/10)', () => {
  let longer = 0;
  for (const rngSeed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { g, s, rush, pending } = atFirstRush(content('cold', before214), rngSeed);
    assert.equal(replanPendingArrival(g.config.values), false);
    if (pending <= rush.start) continue; // an arrival lands before the start; nothing to re-plan in this run
    g.advance(rush.start);
    assert.equal(s.rush, 'light', 'the rush has started');
    assert.equal(s.nextSpawnAt, pending, `seed ${rngSeed}: the timer set at the old pace is untouched`);
    if (pending - rush.start > gapOfOne(g, 'light')) longer++;
  }
  assert.ok(longer >= 4, `in most runs the first rush guest waits longer than one guest's rush gap (${longer} of 8)`);
});

test('B1.2 with the key a rush start re-plans the pending arrival to min(remaining, one guest\'s gap at the rush pace), and the rush end to min(remaining, the normal gap)', () => {
  let shortened = 0;
  for (const rngSeed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { g, s, rush, pending } = atFirstRush(content('cold'), rngSeed);
    if (pending <= rush.start) continue;
    g.advance(rush.start);
    const gap = gapOfOne(g, 'light');
    assert.equal(s.nextSpawnAt, Math.min(pending, rush.start + gap), `seed ${rngSeed}: re-planned at the start`);
    if (pending > rush.start + gap) {
      shortened++;
      g.advance(rush.start + gap);
      assert.ok(door(g).some(e => e.at === rush.start + gap), `seed ${rngSeed}: the first rush guest comes to the door one gap after the start`);
    }
    run(g, () => g.world.now >= rush.end - 300);
    g.advance(rush.end - 1);
    const beforeEnd = s.nextSpawnAt; g.advance(rush.end);
    assert.equal(s.rush, 'none');
    if (beforeEnd > rush.end) assert.equal(s.nextSpawnAt, Math.min(beforeEnd, rush.end + gapOfOne(g, 'none')), `seed ${rngSeed}: and at the end`);
    const again = decodeSave(encodeSave(g)); assert.equal(sha(again.world), sha(g.world), `seed ${rngSeed}: the history replays`);
  }
  assert.ok(shortened >= 4, `the start shortened the wait in most runs (${shortened} of 8)`);
});

test('B1.3 no flat beer in shift 1: a beer left 15 s on the tray is served fresh (no glass_stale, no stale serve, no stale reputation); from shift 2 the same wait makes it flat', () => {
  assert.equal(firstShiftStaleDisabled(config.values), true);
  /** Wait for the first ready tray with a beer, leave it `waitMs`, serve it; serve the others at once. */
  const leaveBeer = (g: Game, waitMs: number) => {
    const send = sender(g);
    for (let step = 0; ; step++) {
      assert.ok(step < 20000);
      const table = g.world.tables.find(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready') && t.order.items.some(i => i.dish === 'bia'));
      if (table) {
        const order = table.order!, readyAt = Math.max(...order.items.map(i => i.readyAt ?? g.world.now));
        g.advance(Math.max(g.world.now, readyAt + waitMs));
        assert.equal(order.state === 'pending' || order.state === 'grace', true, 'still waiting for the tray');
        const reputation = g.world.reputation, result = send({ type: 'serve', tableId: table.id, orderId: order.id });
        assert.ok(result.ok); return { result, repDelta: g.world.reputation - reputation, served: g.world.serves.at(-1)! };
      }
      for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
      g.advance(g.world.now + 100);
    }
  };
  const g = new Game(loadConfig(content()), 1, T0);
  assert.ok(sender(g)({ type: 'startShift' }).ok);
  assert.equal(freshnessMs(g.world, g.config), Infinity, 'the onboarding shift has no freshness limit');
  const first = leaveBeer(g, 15_000);
  assert.notEqual(first.result.outcome, 'stale'); assert.equal(first.served.stale, false);
  assert.equal(g.world.events.filter(e => e.type === 'glass_stale').length, 0);
  assert.ok(first.repDelta >= 0, 'no stale reputation');
  run(g);
  assert.equal(g.world.completedShifts, 1);
  assert.equal(freshnessMs(g.world, g.config), seed.upgrades.cooler.freshnessMs[0], 'the rest after shift 1 shows the cooler\'s own limit again');
  assert.ok(sender(g)({ type: 'startShift' }).ok);
  const second = leaveBeer(g, 15_000);
  assert.equal(second.result.outcome, 'stale', 'shift 2 keeps the freshness rule'); assert.equal(second.served.stale, true);
  assert.ok(g.world.events.some(e => e.type === 'glass_stale'));
});

test('B1.3 a pin without the key (JSON 2.1.3): the first beer of a new save left 15 s goes flat, as before', () => {
  const g = new Game(loadConfig(content('sunny', before214)), 1, T0), send = sender(g);
  assert.ok(send({ type: 'startShift' }).ok);
  assert.equal(freshnessMs(g.world, g.config), seed.upgrades.cooler.freshnessMs[0]);
  run(g, () => g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready')));
  const table = g.world.tables.find(t => t.order)!, order = table.order!;
  g.advance(Math.max(...order.items.map(i => i.readyAt!)) + 15_000);
  assert.equal(send({ type: 'serve', tableId: table.id, orderId: order.id }).outcome, 'stale');
});

test('every key off on a 2.1.4 content plays the 2.1.3 game: two shifts identical to the 2.1.3 pin but for the label', () => {
  for (const rngSeed of [1, 2]) {
    const off = new Game(loadConfig(content('cold', keysOff)), rngSeed, T0), old = new Game(loadConfig(content('cold', before214)), rngSeed, T0);
    play(off, 2); play(old, 2);
    const label = (w: unknown) => JSON.stringify(w).replaceAll('"2.1.4"', '"2.1.3"');
    assert.equal(label(off.world), JSON.stringify(old.world), `seed ${rngSeed}`);
  }
});

test('the three keys of 2.1.4 load on older labels without them byte for byte, 2.1.4 needs all three and the Tier A entry; a whole count of shifts and two booleans', () => {
  const old = content('sunny', before214); assert.equal(JSON.stringify(loadConfig(old).raw), JSON.stringify(old), 'a 2.1.3 content without them: raw bytes kept');
  assert.equal(singlesFirstShifts(loadConfig(old).values), 0); for (const c of [replanPendingArrival, firstShiftStaleDisabled]) assert.equal(c(loadConfig(old).values), false);
  const half = content('sunny', before214); half.onboarding.firstShift.staleDisabled = true;
  assert.throws(() => loadConfig(half), /config:/, 'never one of the three');
  const bare = content('sunny', before214); bare._meta.version = '2.1.4';
  assert.throws(() => loadConfig(bare), /config:/, 'the label 2.1.4 needs them');
  const untiered = content(); untiered._meta.governance.tiers.A.sections = untiered._meta.governance.tiers.A.sections.filter(name => name !== 'spawn.singlesFirstShifts');
  assert.throws(() => loadConfig(untiered), /config:_meta\.governance\.tiers\.A\.sections:array/, 'the Tier A entry comes with the key');
  const count = (v: unknown) => content('sunny', r => { (r.spawn as Record<string, unknown>).singlesFirstShifts = v; });
  for (const bad of ['3', null, true]) assert.throws(() => loadConfig(count(bad)), /config:spawn\.singlesFirstShifts:type/, `singlesFirstShifts=${JSON.stringify(bad)}`);
  assert.throws(() => loadConfig(count(1.5)), /config:spawn\.singlesFirstShifts:integer/, 'a fraction of a shift');
  assert.throws(() => loadConfig(count(-1)), /negative|config:spawn\.singlesFirstShifts/, 'a negative count');
  for (const ok of [0, 1, 3, 10]) assert.equal(singlesFirstShifts(loadConfig(count(ok)).values), ok, `${ok} shifts load`);
  for (const [path, set] of [['rush.schedule.replanPendingArrival', (r: Seed, v: unknown) => { (r.rush.schedule as Record<string, unknown>).replanPendingArrival = v; }],
    ['onboarding.firstShift.staleDisabled', (r: Seed, v: unknown) => { (r.onboarding.firstShift as Record<string, unknown>).staleDisabled = v; }]] as const)
    for (const bad of [1, 'true', null]) assert.throws(() => loadConfig(content('sunny', r => set(r, bad))), new RegExp(`config:${path.replaceAll('.', '\\.')}:type`), `${path}=${JSON.stringify(bad)}`);
  assert.doesNotThrow(() => loadConfig(content('sunny', keysOff)), '0 shifts and false turn each rule off');
});
