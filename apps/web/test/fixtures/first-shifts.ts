import { Game, config, encodeSave, loadConfig } from '../../../../packages/engine/src';
import { capacityRaw } from '../../../../packages/engine/test/fixtures/capacity-model';
import { fullHud } from './full-hud';

/**
 * A save that has played whole shifts on the bundled economy (D8, plan S5): argv[2] = how many shifts are closed (default 1). The first three shifts of a save open
 * without the stamina cooldown, so between them the rest line has nothing to wait for; after the third it is the 30 minutes of GDD 10 again. Every shift is played
 * through the production engine (opened with the real command, run to its natural end); nothing is edited in the save.
 * argv[3] = `legacy` (review 07 r1, W2): the same save pinned to the last capacity-model seed (JSON 2.0.4, the content of the deployed guest build), which
 * carries no `shift.noCooldownFirstShifts`; its next "Mở ca" in the browser opens with the bundled 2.1.2 (`local.ts` `openingConfig`) and that allowance.
 */
const closed = Number(process.argv[2] ?? 1), legacy = process.argv[3] === 'legacy';
const raw = legacy ? capacityRaw() : fullHud(structuredClone(config.raw));
const game = new Game(loadConfig(raw), 42, Date.parse('2026-09-16T03:00:00Z'));
for (let i = 0; i < closed; i++) {
  const opened = game.command({ at: game.world.now, idempotencyKey: `open-${i}`, command: { type: 'startShift' } });
  if (!opened.ok) throw Error(`fixture:open ${i} ${opened.reason}`);
  while (game.world.phase !== 'resting') game.advance(game.world.now + 100);
}
// A shift can close inside a 100 ms step and the rest of that step already recovers: at most one step of regeneration is left.
if (game.world.completedShifts !== closed || game.world.staminaMs > 100 * raw.shift.regenRate) throw Error('fixture:expected-exhaustion');
console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now, version: game.config.version, recoveryMs: config.values.shift.durationMs / config.values.shift.regenRate, noCooldownFirstShifts: config.values.shift.noCooldownFirstShifts }));
