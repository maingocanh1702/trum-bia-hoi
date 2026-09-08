import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';

// Build a real replayable save through the production engine, including autonomous grace events.
const raw = structuredClone(config.raw);
raw.onboarding.enabled = false; raw.inventory.startingStock.bia[0] = 0;
Object.entries(raw.customerTypes).forEach(([key, profile]) => { profile.weight = key === 'thuong' || key === 'voi' ? 1 : 0; });
const game = new Game(loadConfig(raw), 8, Date.parse('2026-09-08T10:00:00Z'));
game.command({ idempotencyKey: 'mixed-grace-start', at: game.world.now, command: { type: 'startShift' } });
game.advance(game.world.shift!.nextSpawnAt + raw.runtime.tableSeatingMs);
const table = game.world.tables[0], order = table.order!;
game.advance(order.placedAt + order.patienceMs + 100);
process.stdout.write(JSON.stringify({ save: encodeSave(game), now: game.world.now, customers: table.group!.customers.map(c => c.type), state: order.state }));
