import { readFileSync } from 'node:fs';
import { Game, encodeSave, decodeSave } from '../../../../packages/engine/src';
const mode = process.argv[2], input = mode === 'inspect' ? JSON.parse(readFileSync(0, 'utf8')) : null;
const g = input ? decodeSave(input.save) : mode === 'poor' ? new Game(undefined, 42, Date.parse('2026-09-09T10:00:00Z')) : decodeSave(readFileSync(new URL('../../../../packages/engine/test/fixtures/live-upgrade-v16.json', import.meta.url), 'utf8'));
if (mode === 'poor') { g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'open-poor' }); g.advance(g.world.now + 8100); }
const w = g.world, table = w.tables.find(t => t.order), order = table?.order;
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, coins: w.coins, equipment: w.equipment, inventory: w.inventory, paused: !!w.paused,
  remaining: order ? order.placedAt + order.patienceMs - w.now : null, orderId: order?.id, shiftId: w.shift?.id,
  shiftRemaining: w.shift ? w.shift.endsAt - w.now : null, kitchenPrice: g.config.values.upgrades.kitchen.priceBase[1], spent: w.shift?.stats.spent,
  expired: w.events.filter(e => e.type === 'order_expired').length,
}));
