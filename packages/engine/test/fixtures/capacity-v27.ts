import { createHash } from 'node:crypto';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { Game, loadConfig, encodeSave, DISHES, WEATHER, restockQuote, type Command, type LoggedCommand } from '../../src';
import { serveNext } from '../../sim/policy';

/**
 * Genuine rules-27 history on the frozen 2.0.4 capacity model (tables x6 seats at level 3), produced by
 * real commands. Generated once with the pre-seat-model engine; seat-model.test.ts replays it and must
 * reproduce the recorded world hash before adopting rules 28 (plan D2).
 * Usage: node --import tsx packages/engine/test/fixtures/capacity-v27.ts <tables> <source-commit>
 */
const tables = Number(process.argv[2] ?? 3), source = process.argv[3] ?? 'unknown';
const raw = structuredClone(capacityModel);
raw._meta.version = `2.0.4-lv3x${tables}`; raw.runtime.initialTableLevel = 3;
raw.upgrades.table.startingTables = tables; raw.upgrades.table.maxTables = Math.max(tables, raw.upgrades.table.maxTables);
for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-19T10:00:00+07:00')), w = g.world;
const old = (command: Command) => g.replay({ at: w.now, idempotencyKey: `v27-${g.log.length}`, command, rulesVersion: 27, configVersion: g.config.version, result: { ok: true } } as LoggedCommand);
if (!old({ type: 'startShift' }).ok) throw Error('fixture:startShift');
const end = w.now + 300000;
while (w.now < end) {
  for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) old({ type: 'restock', dish, mode: 'bulk' });
  serveNext(g, command => { old(command); });
  g.advance(w.now + 100);
}
if (!old({ type: 'endShift' }).ok) throw Error('fixture:endShift');
g.advance(w.now + raw.shift.durationMs / raw.shift.regenRate);
if (w.phase !== 'resting' || w.staminaMs !== raw.shift.durationMs || w.tables.some(t => t.capacity !== 6 || t.level !== 3)) throw Error('fixture:state');
const save = encodeSave(g);
console.log(JSON.stringify({ source, worldSha256: createHash('sha256').update(JSON.stringify(g.world)).digest('hex'), save }));
