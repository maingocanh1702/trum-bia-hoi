import { readFileSync } from 'node:fs';
import { decodeSave, encodeSave, kickAllQuote } from '../../../../packages/engine/src';
const g = decodeSave(readFileSync('packages/engine/test/fixtures/legacy-progression-v5.json', 'utf8'));
g.command({ idempotencyKey: 'path-fixture-close', at: g.world.now, command: { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost } });
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, lifetime: g.world.lifetimeEarned }));
