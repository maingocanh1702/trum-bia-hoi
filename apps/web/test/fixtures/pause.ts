import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, restockQuote } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
const input = process.argv[2] === 'inspect' ? JSON.parse(readFileSync(0, 'utf8')) : null;
const g = input ? decodeSave(input.save) : new Game(loadConfig(fullHud(structuredClone(config.raw))), 42, Date.parse('2026-09-09T10:00:00Z'));
if (!input) { g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'pause-open' }); g.advance(g.world.now + 8100); }
const w = g.world, orderId = input?.orderId ?? w.tables.find(t => t.order)!.order!.id;
const order = w.tables.find(t => t.order?.id === orderId)?.order;
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, orderId, active: w.active, paused: Boolean(w.paused), coins: w.coins, inventory: w.inventory,
  stamina: w.staminaMs, remaining: order ? order.placedAt + order.patienceMs - w.now : null,
  prepRemaining: order?.items[0]?.readyAt == null ? null : order.items[0].readyAt - w.now,
  shiftRemaining: w.shift!.endsAt - w.now, unitCost: g.config.values.menu.bia.unitCost, grace: g.config.values.patience.graceMs, full: restockQuote(w, g.config, 'bia', 'full'), // full: B2.7 (founder 2026-10-22), the row's "Đầy kho"
  expired: w.events.filter(e => e.type === 'order_expired' && e.data.orderId === orderId).length,
  served: w.events.filter(e => e.type === 'order_served' && e.data.orderId === orderId).length,
}));
