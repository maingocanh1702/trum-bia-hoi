import { Game, loadConfig, WEATHER } from '../../src';
import { capacityRaw } from './capacity-model';
import { sendKitchen, untilKitchen } from './kitchen';

/**
 * Pinning mechanics are shape-agnostic. These pins keep the 2.0 capacity model because the suites also prove its
 * table-capacity adoption and onboarding-table admission, which old saves still run until they adopt the seat model
 * (plan D2). Seat-model pins: seat-model.test.ts and the seat repin test in config-pinning.test.ts.
 */
export function pinConfig(version: string, patch?: (raw: ReturnType<typeof capacityRaw>) => void) {
  const raw = capacityRaw(); raw._meta.version = version;
  raw.demandMix.pMoi = 0;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  for (const customer of Object.values(raw.customerTypes)) if ('weight' in customer) customer.weight = 0;
  raw.customerTypes.thuong.weight = 1;
  patch?.(raw); return loadConfig(raw);
}
export function nextPin() {
  return pinConfig('pin-B', raw => {
    raw.menu.bia.price *= 2; raw.shift.durationMs *= 1.5;
    raw.upgrades.keg.pourMs = raw.upgrades.keg.pourMs.map(n => n * 2);
    raw.upgrades.keg.refillMs = raw.upgrades.keg.refillMs.map(n => n * 2);
    raw.upgrades.table.levels[0].capacity = 3;
    raw.shift.startingCoinsBase *= 10;
  });
}
export function servePin(g: Game) {
  untilKitchen(g, () => g.world.tables.some(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')));
  const t = g.world.tables.find(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready'))!;
  sendKitchen(g, { type: 'serve', tableId: t.id, orderId: t.order!.id });
}
export function restPin(g: Game) {
  sendKitchen(g, { type: 'endShift' });
  g.advance(g.world.now + g.config.values.shift.durationMs * (1 + 1 / g.config.values.shift.regenRate));
}
export function mixedPinGame() {
  const g = new Game(pinConfig('pin-A'), 42, Date.parse('2026-09-09T10:00:00Z'));
  sendKitchen(g, { type: 'startShift' }); servePin(g); restPin(g);
  const result = g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'open-B' }, nextPin());
  if (!result.ok) throw Error(result.reason);
  return g;
}
