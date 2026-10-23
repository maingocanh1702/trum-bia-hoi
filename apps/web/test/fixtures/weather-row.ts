import { Game, config, loadConfig, encodeSave, restockQuote, rushStatus, wellRestedRemaining, type Command } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Review B2-r3: the longest weather row an early shift shows, on real commands and clock steps: the well-rested chip, the heavy rush ("Giờ Vàng đông
// khách", open from life-path 1: `rush.schedule.heavyFromLifePath`) and the longest weather name ("Gió lạnh" / "Cold breeze"). Every changed number is a test
// input of this fixture only: life-path 1 needs its four tables and 1 coin earned (`lifetimeBase` 1, one serve of shift 1), and the weather is cold.
// Shift 2 opens rested at life-path 1, so one of its two rushes is heavy; the bot serves what is ready and keeps beer in stock (no message in the slot).
//   weather-row next   -> the heavy rush is the next one: "Sắp tới · Giờ Vàng đông khách" and its countdown, beside the rested chip
//   weather-row active -> the heavy rush runs: "Giờ Vàng đông khách · Còn m:ss", beside the rested chip
const mode = process.argv[2] ?? 'next';
const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'weather-row-fixture'; raw.onboarding.enabled = false;
for (const name of ['sunny', 'hot', 'humid', 'rain', 'cold'] as const) raw.weather[name].weight = name === 'cold' ? 1 : 0;
raw.lifePath[1].lifetimeBase = 1; raw.shift.startingCoinsBase = 2_000_000;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-24T10:00:00+07:00')), w = g.world;
const send = (command: Command) => { const r = g.command({ idempotencyKey: `wr-${g.log.length}`, at: w.now, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
const serveReady = () => { for (const t of w.tables) if (t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')) g.command({ idempotencyKey: `wr-${g.log.length}`, at: w.now, command: { type: 'serve', tableId: t.id, orderId: t.order.id } }); };
const keepStock = () => { if (w.inventory.bia < 6 && restockQuote(w, g.config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' }); };
while (w.tables.length < 4) send({ type: 'buyTable' }); // life-path 1 counts four tables
send({ type: 'startShift' }); // shift 1: one serve earns the coin life-path 1 asks here, then the shift closes
for (let i = 0; i < 6000 && w.lifetimeEarned < 1; i++) { keepStock(); serveReady(); g.advance(w.now + 100); }
send({ type: 'endShift' });
for (let i = 0; i < 6000 && w.phase !== 'resting'; i++) { serveReady(); g.advance(w.now + 100); }
g.advance(w.now + raw.shift.wellRested.requiresRestHours * 3600000 + 1); // rested long enough for the bonus
send({ type: 'startShift' });
const heavy = w.shift!.rushes.findIndex(r => r.kind === 'heavy');
if (heavy < 0) throw Error('fixture:no-heavy-rush');
const at = mode === 'active' ? w.shift!.rushes[heavy].start + 1000 : heavy === 0 ? w.now + 1000 : w.shift!.rushes[heavy - 1].end + 1000;
for (let i = 0; i < 20000 && w.now < at; i++) { keepStock(); serveReady(); g.advance(Math.min(w.now + 100, at)); }
const rush = rushStatus(w, g.config), kind = mode === 'active' ? rush.active?.kind : rush.next?.kind;
if (kind !== 'heavy' || wellRestedRemaining(w) <= 0 || w.shift!.weather !== 'cold' || w.lifePath < 1) throw Error(`fixture:not-the-long-row:${kind}:${wellRestedRemaining(w)}:${w.shift!.weather}:${w.lifePath}`);
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, lifePath: w.lifePath, rush: kind, restedMs: wellRestedRemaining(w), completedShifts: w.completedShifts }));
