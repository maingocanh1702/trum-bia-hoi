import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, dayKey, type Command } from '../../../../packages/engine/src';
const raw = structuredClone(config.raw); raw.onboarding.enabled = false;
const origin = Date.parse('2026-09-01T16:59:59Z'), g = new Game(loadConfig(raw), 42, origin);
const send = (command: Command) => assert.ok(g.command({ command, at: g.world.now, idempotencyKey: `attendance-fixture-${g.log.length}` }).ok);
for (let d = 0; d < 6; d++) {
  send({ type: 'activity', active: false }); g.advance(origin + d * 86400000); send({ type: 'activity', active: true });
  if (d % 2 === 0) send({ type: 'claimAttendance', day: dayKey(g.world.now, g.config) });
}
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, reputation: g.world.reputation, coins: g.world.coins, rewards: g.config.values.quests.loginTrackRepBase, track: g.world.attendance, visits: 6, claims: 3 }));
