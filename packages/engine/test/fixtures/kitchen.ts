import legacy from '../../../../docs/config/legacy/economy-1.7.3.json';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, DISHES, WEATHER, dishUnlocked, type Command } from '../../src';
// Controlled demand exposes occupied burners; all state still comes from real commands.
export function kitchenGame(level = 1, stocked = true, patienceMs = 120000) {
  const raw = structuredClone(legacy);
  raw.onboarding.enabled = false; raw.shift.startingCoinsBase = 1000000;
  raw.demandMix.pMoi = 1; raw.patience.thuongMs = patienceMs;
  for (const key of WEATHER) raw.weather[key].weight = 0;
  raw.weather.hot.weight = 1; raw.weather.hot.spawnIntervalMult = 0.1;
  for (const customer of Object.values(raw.customerTypes)) if ('weight' in customer) customer.weight = 0;
  raw.customerTypes.thuong.weight = 1;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T10:00:00Z'));
  for (let i = 0; i < level; i++) sendKitchen(g, { type: 'upgrade', kind: 'kitchen' });
  if (stocked) for (const dish of DISHES) if (dishUnlocked(g.world, g.config, dish)) sendKitchen(g, { type: 'restock', dish, mode: 'full' });
  sendKitchen(g, { type: 'startShift' }); return g;
}
export function sendKitchen(g: Game, command: Command) {
  const result = g.command({ command, at: g.world.now, idempotencyKey: `kitchen-${g.log.length}` });
  assert.ok(result.ok, result.reason ?? 'fixture command failed'); return result;
}
export function untilKitchen(g: Game, predicate: () => boolean, limitMs = 60000) {
  const end = g.world.now + limitMs;
  while (!predicate() && g.world.now < end) g.advance(g.world.now + 100);
  assert.ok(predicate(), 'expected kitchen state before fixture deadline');
}
