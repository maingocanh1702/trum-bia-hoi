import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, restockQuote, type Command } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
import { rushRecap } from '../../src/rush-recap';

// Founder 2026-10-22 (Part B2.6): shift 2 of a new save (shift 1 is the onboarding shift, without rushes), played by a bot that serves what is ready and keeps
// beer in stock, stopped a moment before a rush ends so the page itself sees it end. Real commands and clock steps.
//   rush-recap first   -> 10 s before the first rush of the shift ends (review B2-r2: 1.5 s left a booting page under load past the end)
//   rush-recap second  -> 10 s before the second one ends (the card then compares with the first)
//   rush-recap inspect -> stdin { save }: the recap of the last rush that ended in that save, as the page should draw it
const mode = process.argv[2] ?? 'first';
if (mode === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save), events = g.world.events, last = [...events].reverse().find(e => e.type === 'rush_ended');
  process.stdout.write(JSON.stringify(last ? rushRecap(events, last) : null));
  process.exit(0);
}
const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'rush-recap-fixture';
for (const weather of Object.keys(raw.weather)) { const w = (raw.weather as Record<string, unknown>)[weather]; if (w && typeof w === 'object' && 'weight' in w) (w as { weight: number }).weight = weather === 'sunny' ? 1 : 0; }
const g = new Game(loadConfig(raw), 11, Date.parse('2026-10-23T10:00:00+07:00')), w = g.world;
const send = (command: Command) => g.command({ idempotencyKey: `rr-${g.log.length}`, at: w.now, command });
const serveReady = () => { for (const t of w.tables) if (t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')) send({ type: 'serve', tableId: t.id, orderId: t.order.id }); };
send({ type: 'startShift' }); send({ type: 'endShift' });
for (let i = 0; i < 3000 && w.phase !== 'resting'; i++) { serveReady(); g.advance(w.now + 100); }
send({ type: 'startShift' });
const rush = w.shift!.rushes[mode === 'second' ? 1 : 0];
if (!rush) throw Error('fixture:no-rush');
for (let i = 0; i < 40000 && w.now < rush.end - 10000; i++) {
  if (w.inventory.bia < 3 && restockQuote(w, g.config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' });
  if (i % 4) serveReady(); // some guests wait long enough to leave: the net is not just the revenue
  g.advance(Math.min(w.now + 100, rush.end - 10000));
}
if (w.phase !== 'open' || w.shift!.rush === 'none') throw Error('fixture:not-in-the-rush');
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, endsInMs: rush.end - w.now, kind: rush.kind, rushesEnded: w.events.filter(e => e.type === 'rush_ended').length }));
