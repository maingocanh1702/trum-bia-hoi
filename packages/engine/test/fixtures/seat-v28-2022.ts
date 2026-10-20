import { createHash } from 'node:crypto';
import { Game, config, loadConfig, encodeSave, DISHES, restockQuote, type Command } from '../../src';
import { serveNext } from '../../sim/policy';

/**
 * Genuine rules-28 history on the bundled seat-model seed of config 2.0.22 (the pin S3 shipped: queue 1 + seats/8, patience 24 s, capacity demand,
 * and the S1 table-level ladder: levels priced by `upgrades.table.levels[].priceBase`, Lv4 behind the Ket Noi badge and reputation, no level benefit),
 * produced by real commands: the alley filled with tables and chairs, two table levels bought and the third refused, then two played shifts at four
 * two-chair tables with singles and pairs. The only edit of the bundled content is `shift.startingCoinsBase` (a wallet for the purchases: a real shop
 * earns them over days). Generated once with the pre-S4 engine (S3 tip 004e6ad); the S4 tests replay it and must reproduce the recorded world hash, so a
 * pinned snapshot from before `upgrades.table.tableUpgrade` keeps behaving as it did: the old price, the old gates and no benefit at any table level.
 * Usage: node --import tsx packages/engine/test/fixtures/seat-v28-2022.ts <source-commit>
 */
const source = process.argv[2] ?? 'unknown';
if (config.version !== '2.0.22') throw Error(`fixture:config ${config.version}: record this fixture with the pre-S4 engine (JSON 2.0.22)`);
const raw = structuredClone(config.raw);
raw.shift.startingCoinsBase = 400000;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-20T10:00:00+07:00')), w = g.world;
const send = (command: Command) => g.command({ at: w.now, idempotencyKey: `seat28b-${g.log.length}`, command });
const must = (command: Command) => { const r = send(command); if (!r.ok) throw Error(`fixture:${command.type} ${r.reason}`); return r; };
const play = (ms: number) => {
  const end = w.now + ms;
  while (w.now < end) {
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(command); });
    g.advance(w.now + 100);
  }
};
for (let i = 1; i < 4; i++) must({ type: 'buyTable' });
for (const table of w.tables) must({ type: 'buyChair', tableId: table.id });
const [first, second] = w.tables;
must({ type: 'upgradeTable', tableId: first.id }); must({ type: 'upgradeTable', tableId: first.id }); // Lv1 -> Lv2 -> Lv3 at the old prices
must({ type: 'upgradeTable', tableId: second.id });
const top = send({ type: 'upgradeTable', tableId: first.id }); // Lv4: the old Ket Noi badge gate still refuses
if (top.ok || top.reason !== 'badgeRequired') throw Error(`fixture:lv4 ${JSON.stringify(top)}`);
must({ type: 'startShift' });
play(400000);
if (!send({ type: 'endShift' }).ok) throw Error('fixture:endShift');
play(60000);
g.advance(w.now + config.raw.shift.durationMs / config.raw.shift.regenRate);
must({ type: 'startShift' });
play(300000);
if (!send({ type: 'endShift' }).ok) throw Error('fixture:endShift2');
play(60000);
g.advance(w.now + config.raw.shift.durationMs / config.raw.shift.regenRate);
const kinds = new Set(w.events.map(e => e.type + (e.type === 'queue_overflow' ? `:${e.data.reason}` : '')));
for (const need of ['table_upgraded', 'chair_bought', 'order_served', 'order_placed']) if (!kinds.has(need)) throw Error(`fixture:coverage ${need}`);
const rounds = w.events.filter(e => e.type === 'order_placed' && w.tables.some(t => t.id === e.data.tableId && t.level === 3)).length;
if (rounds < 5 || g.log.some(e => e.rulesVersion !== 28) || w.phase !== 'resting') throw Error(`fixture:state ${rounds} ${w.phase}`);
const save = encodeSave(g);
console.log(JSON.stringify({ source, worldSha256: createHash('sha256').update(JSON.stringify(w)).digest('hex'), save }));
