import { createHash } from 'node:crypto';
import { Game, config, loadConfig, encodeSave, DISHES, restockQuote, type Command } from '../../src';
import { serveNext } from '../../sim/policy';

/**
 * Genuine rules-28 history on the bundled seat-model seed of config 2.0.23 (the pin S4 shipped: the table and chair level ladders, no
 * `shift.noCooldownFirstShifts`), produced by real commands: four tables with two chairs, three played shifts with the 30-minute cooldown between them
 * (the second and the third opening are refused with `restFirst` until the stamina is back, and those refusals are part of the log), one table level
 * and two chair levels bought at the ladder prices. The only edits of the bundled content are `shift.startingCoinsBase` (a wallet for the purchases: a
 * real shop earns them over days) and `lifePath[1].lifetimeBase` (Phu Quan within two short shifts, so that the level and chair ladders open without a
 * week of play); the numbers a pin carries are replayed from the save, so the history stays exact whatever the bundle says later. Generated once with the
 * pre-S5 engine (S4 tip 795942f); the S5 tests replay it and must reproduce the recorded world hash, so a pinned snapshot from before
 * `shift.noCooldownFirstShifts` keeps its cooldown from the second shift on.
 * Usage: node --import tsx packages/engine/test/fixtures/seat-v28-2023.ts <source-commit>
 */
const source = process.argv[2] ?? 'unknown';
if (config.version !== '2.0.23') throw Error(`fixture:config ${config.version}: record this fixture with the pre-S5 engine (JSON 2.0.23)`);
const raw = structuredClone(config.raw);
raw.shift.startingCoinsBase = 600000;
raw.lifePath[1].lifetimeBase = 1;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-20T10:00:00+07:00')), w = g.world;
const send = (command: Command) => g.command({ at: w.now, idempotencyKey: `seat28c-${g.log.length}`, command });
const must = (command: Command) => { const r = send(command); if (!r.ok) throw Error(`fixture:${command.type} ${r.reason}`); return r; };
const play = (ms: number) => {
  const end = w.now + ms;
  while (w.now < end) {
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(command); });
    g.advance(w.now + 100);
  }
};
const closeShift = () => { if (!send({ type: 'endShift' }).ok) throw Error('fixture:endShift'); play(60000); if (w.phase !== 'resting') throw Error(`fixture:closing ${w.phase}`); };
const refused = () => { const r = send({ type: 'startShift' }); if (r.ok || r.reason !== 'restFirst') throw Error(`fixture:cooldown ${JSON.stringify(r)}`); };
const rest = () => g.advance(w.now + config.raw.shift.durationMs / config.raw.shift.regenRate);
for (let i = 1; i < 4; i++) must({ type: 'buyTable' });
for (const table of w.tables) must({ type: 'buyChair', tableId: table.id });
must({ type: 'startShift' });
play(240000);
closeShift();
refused(); // the cooldown starts at the second shift on a snapshot without the key
rest();
const [first, second] = w.tables;
must({ type: 'upgradeTable', tableId: first.id }); // Lv1 -> Lv2: 20 000 coins, one more round
must({ type: 'upgradeChair', tableId: first.id }); must({ type: 'upgradeChair', tableId: second.id }); // Lv2 chairs: 10 000 then 15 000 coins
must({ type: 'startShift' });
play(240000);
closeShift();
refused(); // and at the third
rest();
must({ type: 'startShift' });
play(180000);
closeShift();
rest();
const kinds = new Set(w.events.map(e => e.type));
for (const need of ['table_upgraded', 'chair_upgraded', 'chair_bought', 'order_served', 'order_placed', 'shift_closed']) if (!kinds.has(need)) throw Error(`fixture:coverage ${need}`);
if (w.completedShifts !== 3 || g.log.some(e => e.rulesVersion !== 28) || g.log.filter(e => !e.result.ok).length !== 2 || w.phase !== 'resting') throw Error(`fixture:state ${w.completedShifts} ${w.phase}`);
const save = encodeSave(g);
console.log(JSON.stringify({ source, worldSha256: createHash('sha256').update(JSON.stringify(w)).digest('hex'), save }));
