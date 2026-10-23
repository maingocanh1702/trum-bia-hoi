import { Game, config, loadConfig, encodeSave, decodeSave, queueSlots } from '../../../../packages/engine/src';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';

// Deterministic saves for the P0 first-shift visuals (fun-onboarding-visual). Always the real engine, never hand-written JSON.
//   crowd <size>  one table, a full door queue (every queueSlots slot holds a group), a long-patience guest seated; the NEXT arrival is refused with `size` guests
//   crowd2        the same full door at a 0.7 s arrival pace (`spawn.baseMs` and the no-rush `rush.none.floorMs` set to 700, a test cadence, config-exempt):
//                 the next TWO arrivals are refused inside one door-bubble lifetime (2.2 s), as a heavy rush with a full queue or a flyer does (S6 review round 2)
//   steady       a brand-new game as the app creates it (onboarding on), except that capacity demand is off: guests keep arriving at the pace these
//                 visuals were written for (the specs are about coins, rings and bubbles, not about how quiet one table is: capacity-demand.test.ts)
//   dry           shift 1 open with no beer anywhere
//   ready         shift 1, ten seconds in: the first guest's order is ready and nobody was served yet (the pointer is on the check)
//   patient       a brand-new game whose guests never lose patience: only idleness, never losses, can start the fallback guide
//   rest <n>      n shifts closed (default 1) with enough coins for the first goal and nothing bought, on a capacity snapshot (the frozen 2.0.4 file:
//                 a table level is seats, which Wave 1 wrote this for; an old save keeps it until its next opening adopts the seat model)
//   seat-rest <n> the same on the bundled seat model (rules 28), where the first goal is the second table
//   pin-2.1.1     a brand-new game pinned to the 2.1.1 content (the released v-fb2: HUD and Upgrades after one shift, none of the 2.1.3 keys), no shift played
//   inspect       print facts about a save read from stdin
const mode = process.argv[2] ?? 'rest', want = Number(process.argv[3] ?? 1);
const start = Date.parse('2026-09-16T03:00:00Z');

function crowd(seed: number): Game | null {
  const raw = steadyDemand(structuredClone(config.raw));
  raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = 2000; raw.patience.thuongMs = 180000; raw.onboarding.firstShift.firstGroupSize = 1;
  // A pair at a one-chair shop in shift 1 ("2 ghế") is the draw of every pin before 2.1.4: the bundled `spawn.singlesFirstShifts` (founder 2026-10-23) sends no pair in a save's first three shifts.
  if (want === 2) raw.spawn.singlesFirstShifts = 0;
  const g = new Game(loadConfig(raw), seed, start);
  if (!g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok) throw Error('fixture:shift-not-open');
  const queued = () => g.world.queue.length, slots = queueSlots(g.world, g.config); // a full door: every queue slot holds a group (1 + seats/8 on the bundled seed)
  for (let step = 0; step < 4000 && queued() < slots; step++) g.advance(g.world.now + 100);
  if (queued() < slots) return null;
  // The next spawn must overflow with the wanted size: probe a clone through the log instead of guessing the RNG.
  const probe = decodeSave(encodeSave(g)); const before = probe.world.events.length;
  for (let step = 0; step < 300 && !probe.world.events.slice(before).some(e => e.type === 'queue_overflow'); step++) probe.advance(probe.world.now + 100);
  const overflow = probe.world.events.slice(before).find(e => e.type === 'queue_overflow');
  return overflow && Number(overflow.data.size) === want ? g : null;
}

/** S6 review round 2: a full door whose next two arrivals are refused `gap` ms apart (`pace` × the first refused group's size, well inside the 2.2 s bubble lifetime). */
function crowd2(seed: number, pace: number): { game: Game; sizes: number[]; gap: number } | null {
  const raw = steadyDemand(structuredClone(config.raw));
  raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = pace; raw.rush.none.floorMs = pace; raw.patience.thuongMs = 180000; raw.onboarding.firstShift.firstGroupSize = 1;
  const g = new Game(loadConfig(raw), seed, start);
  if (!g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok) throw Error('fixture:shift-not-open');
  const slots = queueSlots(g.world, g.config);
  for (let step = 0; step < 4000 && g.world.queue.length < slots; step++) g.advance(g.world.now + 100);
  if (g.world.queue.length < slots) return null;
  const probe = decodeSave(encodeSave(g)); const before = probe.world.events.length;
  const refused = () => probe.world.events.slice(before).filter(e => e.type === 'queue_overflow');
  for (let step = 0; step < 300 && refused().length < 2; step++) probe.advance(probe.world.now + 100);
  const [first, second] = refused();
  if (!first || !second) return null;
  return { game: g, sizes: [Number(first.data.size), Number(second.data.size)], gap: second.at - first.at };
}

if (mode === 'crowd') {
  let game: Game | null = null;
  for (let seed = 1; seed < 400 && !game; seed++) game = crowd(seed);
  if (!game) throw Error('fixture:no-crowd-seed');
  console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now, queue: game.world.queue.length }));
} else if (mode === 'crowd2') {
  let found: ReturnType<typeof crowd2> = null;
  for (let seed = 1; seed < 400 && !found; seed++) found = crowd2(seed, 700);
  if (!found) throw Error('fixture:no-crowd2-seed');
  console.log(JSON.stringify({ save: encodeSave(found.game), now: found.game.world.now, queue: found.game.world.queue.length, sizes: found.sizes, gap: found.gap }));
} else if (mode === 'steady') {
  const g = new Game(loadConfig(steadyDemand(structuredClone(config.raw))), 42, start);
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now }));
} else if (mode === 'dry') {
  const raw = structuredClone(config.raw);
  raw.inventory.startingStock.bia[0] = 0; // no beer anywhere: keg empty, raw stock empty, nothing brewing
  const g = new Game(loadConfig(raw), 42, start);
  if (!g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok) throw Error('fixture:shift-not-open');
  g.advance(g.world.now + 100);
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now }));
} else if (mode === 'ready') {
  const g = new Game(undefined, 42, start);
  if (!g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok) throw Error('fixture:shift-not-open');
  for (let step = 0; step < 200 && !g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready')); step++) g.advance(g.world.now + 100);
  if (!g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready'))) throw Error('fixture:no-ready-order');
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now }));
} else if (mode === 'patient') {
  const raw = structuredClone(config.raw);
  raw.patience.thuongMs = 3_600_000;
  const g = new Game(loadConfig(raw), 42, start);
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now }));
} else if (mode === 'rest' || mode === 'seat-rest') {
  const shifts = Number(process.argv[3] ?? 1);
  const raw: any = structuredClone(mode === 'rest' ? capacityModel : config.raw);
  if (mode === 'rest') raw._meta.version = 'capacity-fixture'; // a custom version: the bundled seat model never replaces this snapshot at an opening
  raw.shift.startingCoinsBase = 4000; // 10 000 xu: the first goal (3 750, or the second table at 1 070) is affordable once shift 1 ends
  const g = new Game(loadConfig(raw), 42, start);
  for (let n = 1; n <= shifts; n++) {
    // Between shifts the stall rests until stamina is full again; every attempt is its own command (idempotency keys cache results).
    let attempt = 0;
    while (!g.command({ at: g.world.now, idempotencyKey: `open-${n}-${attempt}`, command: { type: 'startShift' } }).ok) { if (++attempt > 200) throw Error('fixture:shift-not-open'); g.advance(g.world.now + 600000); }
    for (let step = 0; step < 20000 && g.world.phase !== 'resting'; step++) g.advance(g.world.now + 1000);
    if (g.world.phase !== 'resting' || g.world.completedShifts !== n) throw Error(`fixture:shift-${n}-not-closed`);
  }
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins }));
} else if (mode === 'pin-2.1.1') {
  // 2.1.1 = the bundled content with the two thresholds the founder moved in 2.1.2 back at 1 and without the two keys of 2.1.3.
  const raw: any = structuredClone(config.raw); raw._meta.version = '2.1.1';
  Object.assign(raw.onboarding.featureReveal, { hudAfterShifts: 1, upgradeAfterShifts: 1 });
  delete raw.onboarding.featureReveal.kickAfterShifts; delete raw.onboarding.firstShift.excludedCustomerTypes;
  const g = new Game(loadConfig(raw), 42, start);
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, version: g.config.version }));
} else {
  const w = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); })).world;
  console.log(JSON.stringify({ coins: w.coins, tableLevels: w.tables.map(t => t.level), tables: w.tables.length, completedShifts: w.completedShifts, phase: w.phase }));
}
