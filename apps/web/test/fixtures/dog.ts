import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
const raw = fullHud(structuredClone(config.raw)); raw.shift.startingCoinsBase = 100000;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now }));
