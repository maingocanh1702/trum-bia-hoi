import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, config, loadConfig, decodeSave, encodeSave, isSeatModel, type Command } from '../src';

// Plan "Vui 3 ca" S3 / FEEDBACK II.2 v3.3 / D12 D17 D19 D25: capacity demand, the short door queue, longer patience. Every state change below is
// a real command or clock advance; the recorded saves were produced by the engine of the slice before this one.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `s3-${g.log.length}` });
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** The rules-28 history S1/S2 shipped: bundled seat seed 2.0.21 (no capacity demand, queue 2 + seats/3, patience 18 s), recorded by tip 1cfde17. */
function seat2021() {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.21-v28.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save);
  return { fixture, saved, save: fixture.save as string };
}

test('a rules-28 history recorded on JSON 2.0.21 replays byte for byte and re-encodes unchanged', () => {
  const { fixture, saved, save } = seat2021();
  assert.equal(saved.config._meta.version, '2.0.21'); assert.ok(saved.log.every((e: { rulesVersion: number }) => e.rulesVersion === 28));
  const g = decodeSave(save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the pre-S3 history replays to the world the old engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  assert.ok(isSeatModel(g.config.values) && g.config.version === '2.0.21');
  const kinds = new Set(g.world.events.map(e => e.type === 'queue_overflow' ? `${e.type}:${e.data.reason}` : e.type));
  for (const need of ['queue_overflow:noSeat', 'customer_left', 'order_served']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
});
