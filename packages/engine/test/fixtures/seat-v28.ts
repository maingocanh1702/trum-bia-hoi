import { createHash } from 'node:crypto';
import { Game, config, encodeSave, DISHES, restockQuote, type Command } from '../../src';
import { serveNext } from '../../sim/policy';

/**
 * Genuine rules-28 history on the bundled seat-model seed of config 2.0.21 (the pin S1 and S2 shipped: one table, one chair, queue 2 + seats/3,
 * patience 18 s, no capacity demand), produced by real commands: onboarding's first guest, singles and pairs arriving every ~10 s, pairs turned
 * away at the door, queue timeouts, then a closed shift and a full rest. Generated once with the pre-S3 engine (S2 tip 1cfde17); the S3 tests
 * replay it and must reproduce the recorded world hash, so a pinned snapshot from before `spawn.capacityDemand` keeps behaving as it did.
 * Usage: node --import tsx packages/engine/test/fixtures/seat-v28.ts <source-commit>
 */
const source = process.argv[2] ?? 'unknown';
if (config.version !== '2.0.21') throw Error(`fixture:config ${config.version}: record this fixture with the pre-S3 engine (JSON 2.0.21)`);
const g = new Game(config, 42, Date.parse('2026-10-20T10:00:00+07:00')), w = g.world;
const send = (command: Command) => g.command({ at: w.now, idempotencyKey: `seat28-${g.log.length}`, command });
if (!send({ type: 'startShift' }).ok) throw Error('fixture:startShift');
const end = w.now + 420000;
while (w.now < end) {
  for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
  serveNext(g, command => { send(command); });
  g.advance(w.now + 100);
}
if (!send({ type: 'endShift' }).ok) throw Error('fixture:endShift');
g.advance(w.now + config.raw.shift.durationMs / config.raw.shift.regenRate);
const kinds = new Set(w.events.map(e => e.type + (e.type === 'queue_overflow' ? `:${e.data.reason}` : '') + (e.type === 'customer_left' ? `:${e.data.reason}` : '')));
for (const need of ['queue_overflow:noSeat', 'customer_left:queue', 'order_served']) if (!kinds.has(need)) throw Error(`fixture:coverage ${need}`);
if (w.phase !== 'resting' || w.staminaMs !== config.raw.shift.durationMs || g.log.some(e => e.rulesVersion !== 28)) throw Error('fixture:state');
const save = encodeSave(g);
console.log(JSON.stringify({ source, worldSha256: createHash('sha256').update(JSON.stringify(w)).digest('hex'), save }));
