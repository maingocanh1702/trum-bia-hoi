import { Game, config, loadConfig, encodeSave, buyTableQuote } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Founder 2026-10-22 (Part B2.4): a one-table shop whose empty places can be tapped to buy the next table. Real commands only.
//   slot-buy afford   -> an open shift, the wallet pays the second table (its price from the config's ladder)
//   slot-buy short    -> an open shift, the wallet is short of it
//   slot-buy rest     -> at rest after one (empty) shift, the wallet pays it (no opening note: that note covers the yard of a save that never played)
const mode = process.argv[2] ?? 'afford';
const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'slot-buy-fixture'; raw.onboarding.enabled = false;
const base = raw.upgrades.table.tablePriceBase[0]; // both Base values are scaled by k at load, so the wallet keeps its relation to the price
raw.shift.startingCoinsBase = mode === 'short' ? Math.floor(base / 2) : base + 200; // the subject is the card, not the wallet; prices stay the config's
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-23T10:00:00+07:00')), w = g.world;
const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ idempotencyKey: `sb-${g.log.length}`, at: w.now, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
send({ type: 'startShift' }); g.advance(w.now + 1000);
if (mode === 'rest') { send({ type: 'endShift' }); for (let i = 0; i < 600 && w.phase !== 'resting'; i++) g.advance(w.now + 100); if (w.completedShifts !== 1) throw Error('fixture:rest-not-reached'); }
const q = buyTableQuote(w, g.config);
if (q.cost === null || q.ok !== (mode !== 'short')) throw Error(`fixture:quote ${JSON.stringify(q)}`);
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, price: q.cost, coins: w.coins, phase: w.phase, tables: w.tables.length, slots: q.slots }));
