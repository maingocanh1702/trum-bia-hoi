import { Game, config, loadConfig, encodeSave, rushStatus, restockQuote, freshnessMs, type Command } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Founder 2026-10-22 (Part B2.2): the moment of each just-in-time hint, on a save with onboarding on (hints belong to onboarding). Real commands and clock
// steps; every changed number is a test input of this fixture only (the hint thresholds are the HUD's own: the quick beer prompt, the taps' reserve, the
// rush warning, the buy quote).
//   hints stock     -> shift 1 opens with one beer in stock (below one refill batch)
//   hints glasses   -> shift 1 opens with fewer clean glasses than the taps keep poured
//   hints slot      -> shift 1 opens with the price of table 2 in the wallet
//   hints both      -> stock and slot at once (one hint at a time: stock first, slot after it)
//   hints rush      -> shift 2, the first rush's warning is up, nothing else is lit (ready orders served by command on the way)
//   hints freshness -> shift 2, a ready tray with a poured beer waits
const mode = process.argv[2] ?? 'stock';
const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'hints-fixture';
for (const weather of Object.keys(raw.weather)) { const w = (raw.weather as Record<string, unknown>)[weather]; if (w && typeof w === 'object' && 'weight' in w) (w as { weight: number }).weight = weather === 'sunny' ? 1 : 0; }
if (mode === 'stock' || mode === 'both') raw.inventory.startingStock.bia = [1, 1];
if (mode === 'glasses') raw.glasses.start = raw.upgrades.keg.kegStorage[0] - 1;
if (mode === 'slot' || mode === 'both') raw.shift.startingCoinsBase = raw.upgrades.table.tablePriceBase[0] + 200;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-23T10:00:00+07:00')), w = g.world;
const send = (command: Command) => { const r = g.command({ idempotencyKey: `hi-${g.log.length}`, at: w.now, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); return r; };
const serveReady = () => { for (const t of w.tables) if (t.order && t.order.state === 'pending' && t.order.items.every(i => i.state === 'ready')) g.command({ idempotencyKey: `hi-${g.log.length}`, at: w.now, command: { type: 'serve', tableId: t.id, orderId: t.order.id } }); };
const keepStock = () => { if (w.inventory.bia < 5 && restockQuote(w, g.config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' }); };
if (mode === 'rush' || mode === 'freshness') { // play an empty shift 1 to reach shift 2 (rushes on, beer can go flat)
  send({ type: 'startShift' }); send({ type: 'endShift' });
  for (let i = 0; i < 3000 && w.phase !== 'resting'; i++) { serveReady(); g.advance(w.now + 100); }
  if (w.completedShifts !== 1) throw Error('fixture:shift-1-not-closed');
}
send({ type: 'startShift' });
if (mode === 'rush') {
  for (let i = 0; i < 20000 && !rushStatus(w, g.config).next?.warning; i++) { keepStock(); g.advance(w.now + 100); serveReady(); }
  if (!rushStatus(w, g.config).next?.warning) throw Error('fixture:no-rush-warning');
  if (w.tables.some(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready'))) throw Error('fixture:a-ready-order-is-lit');
} else if (mode === 'freshness') {
  for (let i = 0; i < 6000 && !w.tables.some(t => t.order?.state === 'pending' && t.order.items.every(x => x.state === 'ready') && t.order.items.some(x => x.dish === 'bia')); i++) { keepStock(); g.advance(w.now + 100); }
  if (!Number.isFinite(freshnessMs(w, g.config))) throw Error('fixture:beer-cannot-go-flat');
} else g.advance(w.now + 500); // before the first guest of shift 1 (guaranteedFirstGroupWithinMs): nothing else is lit
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, completedShifts: w.completedShifts, freshnessS: freshnessMs(w, g.config) / 1000, rush: rushStatus(w, g.config).next?.kind ?? null }));
