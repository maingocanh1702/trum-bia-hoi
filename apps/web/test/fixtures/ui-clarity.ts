import { readFileSync } from 'node:fs';
import { Game, config, encodeSave, loadConfig, decodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

if (process.argv[2] === 'legacy') {
  const save = readFileSync('packages/engine/test/fixtures/legacy-daily-claimed-v12.json', 'utf8');
  const game = decodeSave(save);
  console.log(JSON.stringify({ save, now: game.world.now }));
} else {
// Reach zero stamina and natural closure through the production engine, without editing a save. The recovery modes ('cooldown', 'no-recovery') play the three
// shifts that open without the stamina cooldown (D8, plan S5) first, so that the rest line is about the wait the fourth opening needs.
const raw = fullHud(structuredClone(config.raw));
if (process.argv[2] === 'no-recovery') raw.shift.regenRate = 0;
const game = new Game(loadConfig(raw), 42, Date.parse('2026-09-16T03:00:00Z'));
for (let shift = 0; shift < (process.argv[2] === 'cooldown' || process.argv[2] === 'no-recovery' ? 3 : 1); shift++) {
  game.command({ at: game.world.now, idempotencyKey: `open-${shift}`, command: { type: 'startShift' } });
  while (game.world.phase !== 'resting') game.advance(game.world.now + 100);
}
if (game.world.staminaMs !== 0) throw Error('fixture:expected-exhaustion');
console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now, recoveryMs: config.values.shift.durationMs / config.values.shift.regenRate }));
}
