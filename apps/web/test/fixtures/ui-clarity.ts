import { readFileSync } from 'node:fs';
import { Game, config, encodeSave, loadConfig, decodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

if (process.argv[2] === 'legacy') {
  const save = readFileSync('packages/engine/test/fixtures/legacy-daily-claimed-v12.json', 'utf8');
  const game = decodeSave(save);
  console.log(JSON.stringify({ save, now: game.world.now }));
} else {
// Reach zero stamina and natural closure through the production engine, without editing a save.
const raw = fullHud(structuredClone(config.raw));
if (process.argv[2] === 'no-recovery') raw.shift.regenRate = 0;
const game = new Game(loadConfig(raw), 42, Date.parse('2026-09-16T03:00:00Z'));
game.command({ at: game.world.now, idempotencyKey: 'open', command: { type: 'startShift' } });
while (game.world.phase !== 'resting') game.advance(game.world.now + 100);
if (game.world.staminaMs !== 0) throw Error('fixture:expected-exhaustion');
console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now, recoveryMs: config.values.shift.durationMs / config.values.shift.regenRate }));
}
