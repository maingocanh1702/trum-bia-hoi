import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, deliveryQuote, DISHES, restockQuote, type Command } from '../../../../packages/engine/src';
const raw = structuredClone(config.raw);
raw.shift.startingCoinsBase = 100000; raw.lifePath[1].lifetimeBase = 1; raw.lifePath[2].lifetimeBase = 2; raw.spawn.baseMs = raw.shift.durationMs * 2;
for (const stock of Object.values(raw.inventory.startingStock)) stock.fill(0);
for (const name of ['sunny', 'hot', 'humid', 'rain', 'cold'] as const) raw.weather[name].weight = name === 'sunny' ? 1 : 0;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
const send = (command: Command) => { const result = g.command({ command, at: g.world.now, idempotencyKey: `shipper-fixture-${g.log.length}` }); assert.ok(result.ok, result.reason ?? 'fixture command'); };
send({ type: 'upgrade', kind: 'stall' }); send({ type: 'restock', dish: 'lac', mode: 'full' }); send({ type: 'upgradeDog', level: 1 }); send({ type: 'restock', dish: 'bia', mode: 'one' });
while (g.world.tables.length < 4) send({ type: 'buyTable' }); // LP1 (phone gate) counts four tables in the seat model
if (process.argv.includes('rested')) g.advance(g.world.now + raw.shift.wellRested.requiresRestHours * 3600000 + 1);
send({ type: 'startShift' }); g.advance(g.world.now + 11000);
const table = g.world.tables.find(t => t.order)!; send({ type: 'serve', tableId: table.id, orderId: table.order!.id }); send({ type: 'buyUnlock', item: 'phone' });
g.advance(g.world.nextDeliveryAt!);
assert.ok(g.world.delivery); assert.equal(deliveryQuote(g.world, g.config)!.ready, false);
if (process.argv.includes('ready') || process.argv.includes('rested')) for (const line of g.world.delivery.lines) send({ type: 'restock', dish: line.dish, mode: 'full' });
const quote = deliveryQuote(g.world, g.config)!;
const lines = quote.lines.map(line => ({ ...line, index: DISHES.indexOf(line.dish), cost: restockQuote(g.world, g.config, line.dish, 'full').cost }));
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, quote, lines }));
