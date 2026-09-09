import assert from 'node:assert/strict';
import { Game, DISHES, restockQuote } from '../../src';
import { sendKitchen } from './kitchen';

export function playMenu(g: Game, done: () => boolean, limit = 300000) {
  const end = g.world.now + limit;
  while (!done() && g.world.now < end) {
    for (const dish of DISHES) if (g.world.inventory[dish] < 2 && restockQuote(g.world, g.config, dish, 'full').ok) sendKitchen(g, { type: 'restock', dish, mode: 'full' });
    for (const table of g.world.tables) if (table.order && ['pending', 'grace'].includes(table.order.state) && table.order.items.every(i => i.state === 'ready')) g.command({ command: { type: 'serve', tableId: table.id, orderId: table.order.id }, at: g.world.now, idempotencyKey: `play-${g.log.length}` });
    g.advance(g.world.now + 100);
  }
  assert.ok(done(), 'real service reached the report checkpoint');
}
