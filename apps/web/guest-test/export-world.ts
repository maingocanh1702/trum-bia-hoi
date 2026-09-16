import { readFileSync } from 'node:fs';
import { decodeSave } from '../../../packages/engine/src';
const game = decodeSave(readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify({ world: game.world, durationMs: game.config.values.shift.durationMs, leagueAfterShifts: game.config.values.onboarding.featureReveal.leagueAfterShifts }));
