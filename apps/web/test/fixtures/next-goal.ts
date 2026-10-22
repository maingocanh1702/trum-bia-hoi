import { Game, config, loadConfig, encodeSave, decodeSave, upgradeQuote, buyTableQuote, buyChairQuote, tableUpgradeQuote } from '../../../../packages/engine/src';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { listGoals, pickNextGoal } from '../../src/goals';

// Deterministic saves for the "Mục tiêu kế tiếp" chip (fun-next-goal). Always the real engine, never hand-written JSON.
// `closed` and `oldpin` run on a capacity snapshot (the frozen 2.0.4 file: a save pinned before the seat model keeps table levels = seats until its
// next opening), where Wave 1 wrote them; the seat-* modes and `gated` are their counterparts on the bundled seat model (rules 28).
//   closed <n> <base>    n shifts closed, nothing bought, starting wallet `base` (x k); after shift 2 the sheet shows its three lanes
//   seat-closed <n> <base>  the same on the seat model: one table, one chair, the second table is the first purchase
//   seat-buy <n> <base>  like `seat-closed`, but the wallet already bought table 2 (the chip moves on to table 3)
//   gated                two shifts closed, every table slot bought with both chairs, every table at the level its gate allows (none on the S4 ladder: Lv2
//                        waits for life path 1) and every device at the life-path gate: only guest goals are left to suggest
//   oldpin               like `closed 1 4000`, but the game is pinned to a config snapshot older than JSON 2.0.6 (no `nextGoal` section)
//   inspect              facts about a save read from stdin: coins, table levels, equipment, the chip's pick
const mode = process.argv[2] ?? 'closed';
const start = Date.parse('2026-09-16T03:00:00Z');

/** A capacity snapshot with a custom version, so the bundled seat model never replaces it at an opening. `nextGoal` is the section JSON 2.0.6 added. */
function capacityRaw(nextGoal: boolean) {
  const raw = structuredClone(capacityModel) as any; raw._meta.version = nextGoal ? 'capacity-fixture' : 'old-no-next-goal';
  if (nextGoal) raw.nextGoal = structuredClone(config.raw.nextGoal);
  return raw;
}

/** Coins come from the config's starting wallet, never from editing the world: decodeSave replays the log and drops a hand-edited balance. */
function played(shifts: number, startingCoinsBase: number, raw: any = structuredClone(config.raw)) {
  raw.shift.startingCoinsBase = startingCoinsBase;
  const g = new Game(loadConfig(raw), 42, start);
  for (let n = 1; n <= shifts; n++) {
    let attempt = 0;
    while (!g.command({ at: g.world.now, idempotencyKey: `open-${n}-${attempt}`, command: { type: 'startShift' } }).ok) { if (++attempt > 200) throw Error('fixture:shift-not-open'); g.advance(g.world.now + 600000); }
    for (let step = 0; step < 20000 && g.world.phase !== 'resting'; step++) g.advance(g.world.now + 1000);
    if (g.world.phase !== 'resting' || g.world.completedShifts !== n) throw Error(`fixture:shift-${n}-not-closed`);
  }
  return g;
}
const facts = (g: Game) => ({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, goal: pickNextGoal(g.world, g.config)?.id ?? null });

if (mode === 'closed') {
  console.log(JSON.stringify(facts(played(Number(process.argv[3] ?? 2), Number(process.argv[4] ?? 4000), capacityRaw(true)))));
} else if (mode === 'seat-closed') {
  console.log(JSON.stringify(facts(played(Number(process.argv[3] ?? 2), Number(process.argv[4] ?? 4000)))));
} else if (mode === 'seat-buy') {
  const g = played(Number(process.argv[3] ?? 1), Number(process.argv[4] ?? 4000));
  if (!g.command({ at: g.world.now, idempotencyKey: 'table-2', command: { type: 'buyTable' } }).ok) throw Error('fixture:buyTable');
  console.log(JSON.stringify(facts(g)));
} else if (mode === 'oldpin') {
  console.log(JSON.stringify(facts(played(1, 4000, capacityRaw(false)))));
} else if (mode === 'gated') {
  // Everything below is a real command: decodeSave replays the log and refuses a save whose world was edited by hand.
  const g = played(2, 600_000), w = g.world;
  let n = 0; const buy = (command: Parameters<Game['command']>[0]['command']) => { if (!g.command({ at: w.now, idempotencyKey: `buy-${n++}`, command }).ok) throw Error(`fixture:${JSON.stringify(command)}`); };
  while (buyTableQuote(w, g.config).reason !== 'maxTables') buy({ type: 'buyTable' }); // the alley's table slots (locations.list[].tableSlots)
  for (const table of w.tables) if (buyChairQuote(w, g.config, table).ok) buy({ type: 'buyChair', tableId: table.id }); // a table levels up only as a pair
  for (const table of w.tables) while (tableUpgradeQuote(w, g.config, table).ok) buy({ type: 'upgradeTable', tableId: table.id }); // as far as its gate lets it: S4's Lv2 asks life path 1 (not yet reached after two shifts)
  for (const kind of ['keg', 'washer', 'cooler', 'stall', 'kitchen'] as const) while (upgradeQuote(w, g.config, kind).ok) buy({ type: 'upgrade', kind }); // stops where the life-path gate begins
  const goals = listGoals(w, g.config);
  console.log(JSON.stringify({ save: encodeSave(g), now: w.now, goal: pickNextGoal(w, g.config)?.id ?? null, keg: goals.find(x => x.id === 'equipment:keg')!.eligible, equipment: w.equipment,
    tables: w.tables.map(t => ({ level: t.level, seats: t.capacity })) }));
} else {
  const g = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); }));
  const w = g.world;
  console.log(JSON.stringify({ coins: w.coins, tableLevels: w.tables.map(t => t.level), tables: w.tables.length, seats: w.tables.map(t => t.capacity), equipment: w.equipment, completedShifts: w.completedShifts, goal: pickNextGoal(w, g.config)?.id ?? null }));
}
