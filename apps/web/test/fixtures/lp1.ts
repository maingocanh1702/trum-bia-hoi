import { Game, config, loadConfig, DISHES, restockQuote, encodeSave, decodeSave, type Command } from '../../../../packages/engine/src';
import { serveNext } from '../../../../packages/engine/sim/policy';
import { readFileSync } from 'node:fs';
if (process.argv[2] === 'inspect') {
  const g = decodeSave(readFileSync(0, 'utf8'));
  console.log(JSON.stringify({ version: g.config.version, level: g.world.lifePath, dog: g.world.dogLevel, lifetime: g.world.lifetimeEarned }));
} else {
  // Real old-release commands, no direct world mutation; browser exercises the next-shift migration.
  const raw = structuredClone(config.raw); raw._meta.version = '2.0.3'; raw.lifePath[1].requires!.push('dog');
  const g = new Game(loadConfig(raw), 42, Date.UTC(2026, 8, 16)), w = g.world;
  const send = (command: Command) => g.replay({ at: w.now, idempotencyKey: `lp1-${g.log.length}`, command, rulesVersion: 24, configVersion: g.config.version, result: { ok: true } });
  while (w.lifetimeEarned < config.values.lifePath[1].lifetimeBase) {
    if (w.phase === 'resting') {
      g.advance(w.now + g.config.values.shift.durationMs / g.config.values.shift.regenRate);
      if (!send({ type: 'startShift' }).ok) { g.advance(w.now + 86400000); continue; }
    }
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, send); g.advance(w.now + 100);
  }
  send({ type: 'endShift' }); g.advance(w.now + 86400000); // next calendar day, replenished stamina and free shift allowance
  console.log(JSON.stringify({ save: encodeSave(g), now: w.now, lifetime: w.lifetimeEarned, configVersion: config.version }));
}
