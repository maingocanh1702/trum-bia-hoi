import { Game, config, loadConfig, encodeSave, freshnessMs } from '../../../../packages/engine/src';

// Replayable saves for the visible before/after service sequence, using real engine commands.
const mode = process.argv[2] ?? 'early';
const raw = structuredClone(config.raw);
raw.onboarding.enabled = false;
// Seat model (rules 28): one guest at a two-chair table gets the beer + lac tray; the wallet covers that chair exactly.
raw.spawn.pPair = 0; raw.upgrades.table.chairsAfterTables = 1; raw.shift.startingCoinsBase += raw.upgrades.table.chairPriceBase[0];
raw.upgrades.table.orderShape.pair.pMoi = 1; raw.demandMix.pNemGivenMoi = 0;
Object.entries(raw.customerTypes).forEach(([key, profile]) => { profile.weight = key === 'ngoily' ? 1 : 0; });
Object.entries(raw.weather).forEach(([key, weather]) => { if (typeof weather === 'object' && weather !== null && 'weight' in weather) weather.weight = key === 'sunny' ? 1 : 0; });
// Isolate patience outcomes from the independent stale-beer clock.
if (mode === 'late' || mode === 'grace') raw.upgrades.cooler.freshnessMs[0] = raw.shift.durationMs;
const game = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
game.command({ idempotencyKey: 'service-chair', at: game.world.now, command: { type: 'buyChair', tableId: game.world.tables[0].id } });
if (mode === 'rested') game.advance(game.world.now + raw.shift.wellRested.requiresRestHours * 3600000 + 1);
game.command({ idempotencyKey: 'service-start', at: game.world.now, command: { type: 'startShift' } });
game.advance(game.world.shift!.nextSpawnAt + raw.runtime.tableSeatingMs);
const table = game.world.tables[0], order = table.order!;
while (order.items.some(i => i.state !== 'ready')) game.advance(game.world.now + 100);
if (mode === 'late') game.advance(order.placedAt + Math.ceil(order.patienceMs * (1 - raw.tip.patienceThreshold / 2)));
if (mode === 'grace') game.advance(order.placedAt + order.patienceMs + 100);
if (mode === 'stale') game.advance(Math.max(...order.items.filter(i => i.glassId).map(i => i.readyAt!)) + freshnessMs(game.world, game.config));
const save = encodeSave(game), now = game.world.now, coins = game.world.coins;
const result = game.command({ idempotencyKey: 'service-result', at: now, command: { type: 'serve', tableId: table.id, orderId: order.id } });
process.stdout.write(JSON.stringify({ save, now, coins, result, bonus: game.world.shift!.stats.wellRestedBonus, customers: table.group!.customers.length, until: table.until, orderId: order.id, state: order.state }));
