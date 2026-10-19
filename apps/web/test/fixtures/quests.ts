import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, planDailyQuests, WEATHER } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0;
for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
for (const [key, type] of Object.entries(raw.customerTypes)) if (type.usesTable) type.weight = key === 'thuong' ? 1 : 0;
for (const bucket of raw.quests.daily.buckets) for (const range of Object.values(bucket.pool)) if (range) range[0] = range[1] = 1;
const reveal = process.argv.find(a => a.startsWith('--onboarding='));
if (reveal) { fullHud(raw); raw.onboarding.enabled = true; raw.onboarding.featureReveal.questsAfterShifts = Number(reveal.split('=')[1]); }
const c = loadConfig(raw), start = Date.parse(process.argv.includes('--midnight') ? '2026-09-09T16:59:00Z' : '2026-09-09T10:00:00Z');
if (reveal) { const g = new Game(c, 42, start); process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now })); }
else for (let d = 0; d < 90; d++) {
  const g = new Game(c, 42, start + d * 86400000);
  if (!planDailyQuests(g.world, c).rows.some(q => q.kind === 'serve_tables')) continue;
  assert.ok(g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'quest-fixture-open' }).ok);
  const deadline = g.world.now + 60000;
  while (g.world.now < deadline && !g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready'))) g.advance(g.world.now + 100);
  assert.ok(g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready')));
  const quest = g.world.daily!.rows.find(q => q.kind === 'serve_tables')!;
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, quest, daily: g.world.daily })); break;
}
