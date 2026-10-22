import { Game, config, loadConfig, encodeSave, beerStatus, stockCap } from '../../../../packages/engine/src';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { fullHud } from './full-hud';

// Instant pour (plan S2, rules 28): saves the real engine made for the keg's one set of numbers. The shop has only three glasses, so four beers
// wait in the reserve but a guest can get three right now (the smaller of ready beer and clean glasses). Every figure the spec compares with is
// read back from the engine and the config here, never typed into the spec.
//   seat  the bundled seat model, shift 1 just opened (the first guest sits at ~7.2 s and orders at ~8 s)
//   pin   the same shop on the frozen capacity snapshot: what an old save keeps until its next opening adopts the seat model, tap queue included
const mode = process.argv[2] ?? 'seat';
const raw = structuredClone(mode === 'pin' ? capacityModel : config.raw) as unknown as typeof config.raw;
raw._meta.version = mode === 'pin' ? 'capacity-fixture' : 'instant-pour-fixture'; // a custom version: the bundled bundle never replaces this snapshot at an opening
fullHud(raw); raw.glasses.start = 3;
for (const weather of ['sunny', 'hot', 'humid', 'rain', 'cold'] as const) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-20T10:00:00+07:00'));
if (!g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok) throw Error('fixture:shift-not-open');
const w = g.world, keg = g.config.values.upgrades.keg, status = beerStatus(w, g.config);
console.log(JSON.stringify({
  save: encodeSave(g), now: w.now, instant: status.instant, ready: status.available, clean: w.glasses.filter(x => x.state === 'clean').length, glasses: w.glasses.length,
  serveNow: status.serveNow, stored: status.stored, capacity: status.capacity, batch: status.batchSize, refillS: status.durationMs / 1000,
  rawStock: w.inventory.bia, stockCap: stockCap(w, g.config), taps: keg.pourSlots[0], pourS: keg.pourMs[0] / 1000, pourMs: keg.pourMs[0],
  next: { capacity: keg.kegStorage[1], batch: keg.kegBatch[1], refillS: keg.refillMs[1] / 1000 },
}));
