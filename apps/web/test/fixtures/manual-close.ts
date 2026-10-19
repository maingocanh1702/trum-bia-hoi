import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, currentGuests, kickAllQuote, type Command } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
const mode = process.argv[2];
const raw = fullHud(structuredClone(config.raw));
for (const k of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[k].weight = 0;
if (mode === 'poor') raw.shift.startingCoinsBase = 1;
if (mode === 'occupied') {
  // Seat model (rules 28): the thuong + Chi Pheo pair sits at the first table's second chair; the wallet covers that chair exactly.
  raw.onboarding.enabled = false; raw.spawn.pPair = 1; raw.upgrades.table.orderShape.pair.pMoi = 0;
  raw.upgrades.table.chairsAfterTables = 1; raw.shift.startingCoinsBase += raw.upgrades.table.chairPriceBase[0];
  Object.entries(raw.customerTypes).forEach(([key, profile]) => { profile.weight = key === 'thuong' || key === 'chipheo' ? 1 : 0; });
}
const g = new Game(loadConfig(raw), 8, Date.parse('2026-09-08T10:00:00Z'));
const send = (command: Command) => g.command({ idempotencyKey: `fixture-${g.log.length}`, at: g.world.now, command });
if (mode === 'occupied') assert.equal(send({ type: 'buyChair', tableId: g.world.tables[0].id }).ok, true);
send({ type: 'startShift' }); g.advance(g.world.shift!.nextSpawnAt + raw.runtime.tableSeatingMs);
send({ type: 'endShift' });
const table = g.world.tables[0], order = table.order!;
while (order.items.some(i => i.state !== 'ready')) g.advance(g.world.now + 100);
if (mode === 'occupied') {
  assert.deepEqual(table.group!.customers.map(c => c.type), ['thuong', 'chipheo']);
  assert.equal(send({ type: 'serve', tableId: table.id, orderId: order.id }).ok, true);
  g.advance(table.until!); assert.equal(table.state, 'occupied');
}
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, expiresIn: order.placedAt + order.patienceMs + g.config.values.patience.graceMs - g.world.now, coins: g.world.coins, quote: kickAllQuote(g.world, g.config), guests: currentGuests(table).map(c => c.id) }));
