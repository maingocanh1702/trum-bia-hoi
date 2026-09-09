import { readFileSync } from 'node:fs';
import { encodeSave, decodeSave } from '../../../../packages/engine/src';
import { mixedPinGame, servePin } from '../../../../packages/engine/test/fixtures/config-pinning';
const inspect = process.argv[2] === 'inspect';
const g = inspect ? decodeSave(readFileSync(0, 'utf8')) : mixedPinGame();
if (!inspect) servePin(g);
process.stdout.write(JSON.stringify({ now: g.world.now, save: encodeSave(g), version: g.config.version, coins: g.world.coins, duration: g.config.values.shift.durationMs, world: inspect ? g.world : undefined }));
