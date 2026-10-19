import { Game, config, loadConfig, encodeSave, decodeSave, upgradeQuote } from '../../../../packages/engine/src';
import { listGoals, pickNextGoal } from '../../src/goals';

// Deterministic saves for the "Mục tiêu kế tiếp" chip (fun-next-goal). Always the real engine, never hand-written JSON.
//   closed <n> <base>    n shifts closed, nothing bought, starting wallet `base` (x k); after shift 2 the sheet shows its three lanes
//   gated                two shifts closed, 6 tables at Lv3 and every device at the life-path gate: only guest goals are left to suggest
//   oldpin               like `closed 1 4000`, but the game is pinned to a config snapshot older than JSON 2.0.6 (no `nextGoal` section)
//   inspect              facts about a save read from stdin: coins, table levels, equipment, the chip's pick
const mode = process.argv[2] ?? 'closed';
const start = Date.parse('2026-09-16T03:00:00Z');

/** Coins come from the config's starting wallet, never from editing the world: decodeSave replays the log and drops a hand-edited balance. */
function played(shifts: number, startingCoinsBase: number, edit: (raw: any) => void = () => {}) {
  const raw = structuredClone(config.raw) as any; raw.shift.startingCoinsBase = startingCoinsBase; edit(raw);
  const g = new Game(loadConfig(raw), 42, start);
  for (let n = 1; n <= shifts; n++) {
    let attempt = 0;
    while (!g.command({ at: g.world.now, idempotencyKey: `open-${n}-${attempt}`, command: { type: 'startShift' } }).ok) { if (++attempt > 200) throw Error('fixture:shift-not-open'); g.advance(g.world.now + 600000); }
    for (let step = 0; step < 20000 && g.world.phase !== 'resting'; step++) g.advance(g.world.now + 1000);
    if (g.world.phase !== 'resting' || g.world.completedShifts !== n) throw Error(`fixture:shift-${n}-not-closed`);
  }
  return g;
}

if (mode === 'closed') {
  const g = played(Number(process.argv[3] ?? 2), Number(process.argv[4] ?? 4000));
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, goal: pickNextGoal(g.world, g.config)?.id ?? null }));
} else if (mode === 'oldpin') {
  const g = played(1, 4000, raw => { raw._meta.version = 'old-no-next-goal'; delete raw.nextGoal; });
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, goal: pickNextGoal(g.world, g.config)?.id ?? null }));
} else if (mode === 'gated') {
  // Everything below is a real command: decodeSave replays the log and refuses a save whose world was edited by hand.
  const g = played(2, 600_000), w = g.world, u = g.config.values.upgrades;
  let n = 0; const buy = (command: Parameters<Game['command']>[0]['command']) => { if (!g.command({ at: w.now, idempotencyKey: `buy-${n++}`, command }).ok) throw Error(`fixture:${JSON.stringify(command)}`); };
  while (w.tables.length < u.table.maxTables) buy({ type: 'buyTable' });
  for (const table of w.tables) while (u.table.levels[table.level] && !u.table.levels[table.level].requiredBadge) {
    for (let wait = 0; table.state !== 'empty' && wait < 100; wait++) g.advance(w.now + 5000); // a table is only upgraded when it is empty
    buy({ type: 'upgradeTable', tableId: table.id }); // Lv3: the next table level asks a badge
  }
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const) while (upgradeQuote(w, g.config, kind).ok) buy({ type: 'upgrade', kind }); // stops where the life-path gate begins
  const goals = listGoals(w, g.config);
  console.log(JSON.stringify({ save: encodeSave(g), now: w.now, goal: pickNextGoal(w, g.config)?.id ?? null, keg: goals.find(x => x.id === 'equipment:keg')!.eligible, equipment: w.equipment }));
} else {
  const g = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); }));
  const w = g.world;
  console.log(JSON.stringify({ coins: w.coins, tableLevels: w.tables.map(t => t.level), tables: w.tables.length, equipment: w.equipment, completedShifts: w.completedShifts, goal: pickNextGoal(w, g.config)?.id ?? null }));
}
