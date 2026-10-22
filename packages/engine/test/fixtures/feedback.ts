import assert from 'node:assert/strict';
import { Game, loadConfig, isEconomy2, WEATHER, type Command } from '../../src';
import { capacityRaw } from './capacity-model';

/**
 * Controlled config, real commands and clock: no injected world state. Loss causes are shape-agnostic; these
 * fixtures keep the capacity model's three two-seat tables because they stage two-guest first groups and a
 * second busy table (the seat model starts at one chair).
 */
export function feedbackGame(patch?: (raw: ReturnType<typeof capacityRaw>) => void) {
  const raw = capacityRaw();
  assert.ok(isEconomy2(raw));
  raw.shift.startingCoinsBase = 100000;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  patch?.(raw);
  return new Game(loadConfig(raw), 42, Date.parse('2026-09-16T04:00:00Z'));
}
export function feedbackCommand(g: Game, command: Command) {
  const result = g.command({ command, at: g.world.now, idempotencyKey: `feedback-${g.log.length}` });
  assert.ok(result.ok, result.reason ?? 'fixture command failed'); return result;
}
export function firstOrder(g: Game) {
  feedbackCommand(g, { type: 'startShift' });
  g.advance(g.world.now + g.config.values.onboarding.firstShift.guaranteedFirstGroupWithinMs);
  assert.ok(g.world.tables[0].order); return g.world.tables[0].order!;
}
