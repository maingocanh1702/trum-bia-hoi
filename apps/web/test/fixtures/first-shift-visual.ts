import { Game, config, loadConfig, encodeSave, decodeSave, queueSlots } from '../../../../packages/engine/src';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';

// Deterministic saves for the P0 first-shift visuals (fun-onboarding-visual). Always the real engine, never hand-written JSON.
//   crowd <size>  one table, a full door queue (every queueSlots slot holds a group), a long-patience guest seated; the NEXT arrival is refused with `size` guests
//   steady        a brand-new game as the app creates it (onboarding on), except that capacity demand is off: guests keep arriving at the pace these
//                 visuals were written for (the specs are about coins, rings and bubbles, not about how quiet one table is: capacity-demand.test.ts)
//   dry           shift 1 open with no beer anywhere
//   ready         shift 1, ten seconds in: the first guest's order is ready and nobody was served yet (the pointer is on the check)
//   patient       a brand-new game whose guests never lose patience: only idleness, never losses, can start the fallback guide
//   rest <n>      n shifts closed (default 1) with enough coins for the first goal and nothing bought, on a capacity snapshot (the frozen 2.0.4 file:
//                 a table level is seats, which Wave 1 wrote this for; an old save keeps it until its next opening adopts the seat model)
//   seat-rest <n> the same on the bundled seat model (rules 28), where the first goal is the second table
//   inspect       print facts about a save read from stdin
const mode = process.argv[2] ?? 'rest', want = Number(process.argv[3] ?? 1);
const start = Date.parse('2026-09-16T03:00:00Z');

function crowd(seed: number): Game | null {
  const raw = steadyDemand(structuredClone(config.raw));
  raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = 2000; raw.patience.thuongMs = 180000; raw.onboarding.firstShift.firstGroupSize = 1;
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

if (mode === 'crowd') {
  let game: Game | null = null;
  for (let seed = 1; seed < 400 && !game; seed++) game = crowd(seed);
  if (!game) throw Error('fixture:no-crowd-seed');
  console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now, queue: game.world.queue.length }));
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
  raw.shift.startingCoinsBase = 4000; // 10 000 xu: the first goal (3 750, or the second table at 1 500) is affordable once shift 1 ends
  const g = new Game(loadConfig(raw), 42, start);
  for (let n = 1; n <= shifts; n++) {
    // Between shifts the stall rests until stamina is full again; every attempt is its own command (idempotency keys cache results).
    let attempt = 0;
    while (!g.command({ at: g.world.now, idempotencyKey: `open-${n}-${attempt}`, command: { type: 'startShift' } }).ok) { if (++attempt > 200) throw Error('fixture:shift-not-open'); g.advance(g.world.now + 600000); }
    for (let step = 0; step < 20000 && g.world.phase !== 'resting'; step++) g.advance(g.world.now + 1000);
    if (g.world.phase !== 'resting' || g.world.completedShifts !== n) throw Error(`fixture:shift-${n}-not-closed`);
  }
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins }));
} else {
  const w = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); })).world;
  console.log(JSON.stringify({ coins: w.coins, tableLevels: w.tables.map(t => t.level), tables: w.tables.length, completedShifts: w.completedShifts, phase: w.phase }));
}
