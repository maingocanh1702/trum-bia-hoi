import { createHash } from 'node:crypto';
import { Game, config, loadConfig, encodeSave, DISHES, restockQuote, type Command } from '../../src';
import { serveNext } from '../../sim/policy';

/**
 * Genuine rules-28 history on the bundled seat-model seed of config 2.1.0 as S5 sealed it and S6 shipped it (no `kickTable` section), produced by real
 * commands: four tables with two chairs, a table level and two chair levels at the 2.1.0 ladder prices, three played shifts that follow each other without a
 * rest (`shift.noCooldownFirstShifts` 3) and a fourth opening refused with `restFirst`. The only edits of the bundled content are `shift.startingCoinsBase`
 * (a wallet for the purchases), `lifePath[1].lifetimeBase` (Phu Quan within the first shift, so that the level ladders open) and the weights of the two
 * lingering guests (`ngoily`, `chipheo`), so that the recorded shifts hold many tables that sit on after their tray was served (`consuming`) and some that a
 * Chi Pheo keeps (`occupied`): exactly the tables the Wave 3 command `kickTable` acts on. The numbers a pin carries are replayed from the save, so the history
 * stays exact whatever the bundle says later. Generated once with the S6 engine (tip 7186ab1); the Wave 3 tests replay it and must reproduce the recorded
 * world hash: a pin from before `kickTable` is the earlier game byte for byte.
 * Usage: node --import tsx packages/engine/test/fixtures/seat-v28-210.ts <source-commit>
 */
const source = process.argv[2] ?? 'unknown';
if (config.version !== '2.1.0' || Object.hasOwn(config.raw, 'kickTable')) throw Error(`fixture:config ${config.version}: record this fixture with the S6 engine (JSON 2.1.0 without kickTable)`);
const raw = structuredClone(config.raw);
raw.shift.startingCoinsBase = 600000;
raw.lifePath[1].lifetimeBase = 1;
raw.customerTypes.ngoily.weight = 0.6; raw.customerTypes.chipheo.weight = 0.4;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-22T10:00:00+07:00')), w = g.world;
const send = (command: Command) => g.command({ at: w.now, idempotencyKey: `seat28d-${g.log.length}`, command });
const must = (command: Command) => { const r = send(command); if (!r.ok) throw Error(`fixture:${command.type} ${r.reason}`); return r; };
const lingering = new Set<string>();
const play = (ms: number) => {
  const end = w.now + ms;
  while (w.now < end) {
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(command); });
    g.advance(w.now + 100);
    for (const table of w.tables) if (table.state === 'consuming' || table.state === 'occupied') lingering.add(table.state);
  }
};
const closeShift = () => { if (!send({ type: 'endShift' }).ok) throw Error('fixture:endShift'); play(120000); if (w.phase !== 'resting') throw Error(`fixture:closing ${w.phase}`); };
for (let i = 1; i < 4; i++) must({ type: 'buyTable' });
for (const table of w.tables) must({ type: 'buyChair', tableId: table.id });
must({ type: 'startShift' });
play(240000);
closeShift();
const [first, second] = w.tables;
must({ type: 'upgradeTable', tableId: first.id }); // Lv1 -> Lv2: one more round
must({ type: 'upgradeChair', tableId: first.id }); must({ type: 'upgradeChair', tableId: second.id }); // Lv2 chairs
must({ type: 'startShift' }); // shift 2 opens at once (D8)
play(240000);
closeShift();
must({ type: 'startShift' }); // and shift 3
play(180000);
closeShift();
const refused = send({ type: 'startShift' }); if (refused.ok || refused.reason !== 'restFirst') throw Error(`fixture:cooldown ${JSON.stringify(refused)}`); // shift 4 waits for the stamina
const kinds = new Set(w.events.map(e => e.type));
for (const need of ['table_upgraded', 'chair_upgraded', 'chair_bought', 'order_served', 'order_placed', 'table_occupied', 'shift_closed']) if (!kinds.has(need)) throw Error(`fixture:coverage ${need}`);
if (!lingering.has('consuming') || !lingering.has('occupied')) throw Error(`fixture:lingering ${[...lingering]}`);
if (w.completedShifts !== 3 || g.log.some(e => e.rulesVersion !== 28) || g.log.filter(e => !e.result.ok).length !== 1 || w.phase !== 'resting') throw Error(`fixture:state ${w.completedShifts} ${w.phase}`);
const save = encodeSave(g);
console.log(JSON.stringify({ source, worldSha256: createHash('sha256').update(JSON.stringify(w)).digest('hex'), save }));
