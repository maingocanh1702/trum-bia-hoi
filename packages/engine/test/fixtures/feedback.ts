import assert from 'node:assert/strict';
import { Game, config, loadConfig, isEconomy2, WEATHER, type Command } from '../../src';

/** Controlled config, real commands and clock: no injected world state. */
export function feedbackGame(patch?: (raw: typeof import('../../../../docs/config/economy.tbh.json')) => void) {
  const raw = structuredClone(config.raw);
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
