import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, buyChairQuote, isSeatModel } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// S6 (D10): the quick "Mua ghế" button of the HUD. An OPEN shift of a shop that owns `chairsAfterTables` one-chair tables (the second chair is the registry's
// next goal: cheaper than every later table) and a wallet that pays exactly two chairs (`ready`) or none (`poor`). Real commands only; `inspect` reads a browser
// save back through the engine: chairs per table, the wallet, the shift clock and whether the world is paused.
const mode = process.argv[2] ?? 'ready';
if (mode === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save), w = g.world;
  process.stdout.write(JSON.stringify({ coins: w.coins, chairs: w.tables.map(t => t.capacity), paused: Boolean(w.paused), phase: w.phase, remaining: w.shift ? w.shift.endsAt - w.now : null,
    bought: w.events.filter(e => e.type === 'chair_bought').map(e => ({ tableId: e.data.tableId, cost: e.data.cost })), chairCommands: g.log.filter(entry => entry.command.type === 'buyChair').length }));
} else {
  const raw = structuredClone(config.raw); raw._meta.version = 'quick-chair-fixture'; fullHud(raw); raw.onboarding.enabled = false;
  const table = raw.upgrades.table, tables = table.tablePriceBase.slice(0, table.chairsAfterTables - 1), chairs = table.chairPriceBase.slice(0, 2);
  // The wallet: the tables, then two chairs (`ready`) or one chair short of the first (`poor`); the shop keeps nothing else.
  raw.shift.startingCoinsBase = tables.reduce((sum, n) => sum + n, 0) + (mode === 'poor' ? chairs[0] - 1 : chairs[0] + chairs[1]);
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-21T10:00:00+07:00')), w = g.world, v = g.config.values;
  if (!isSeatModel(v)) throw Error('fixture:not-seat-model');
  const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ at: w.now, idempotencyKey: `qc-${g.log.length}`, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
  while (w.tables.length < table.chairsAfterTables) send({ type: 'buyTable' });
  send({ type: 'startShift' });
  g.advance(w.now + 100);
  const quote = buyChairQuote(w, g.config, w.tables[0]);
  if (quote.cost === null || quote.ok !== (mode === 'ready')) throw Error(`fixture:chair-quote ${quote.reason}`);
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, coins: w.coins, chairPrice: quote.cost, nextChairPrice: Math.round(table.chairPriceBase[1] * raw.k.value),
    tables: w.tables.length, remaining: w.shift!.endsAt - w.now, paused: Boolean(w.paused) }));
}
