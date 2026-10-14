import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// A brand-new guest save: no shift opened, every HUD control available from shift 1 (specs that are not about onboarding).
//   fresh-game [isoTime] [seed]
const now = Date.parse(process.argv[2] ?? '2026-09-08T10:00:00Z'), seed = Number(process.argv[3] ?? 42);
const game = new Game(loadConfig(fullHud(structuredClone(config.raw))), seed, now);
console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now }));
