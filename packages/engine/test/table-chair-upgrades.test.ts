import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Game, decodeSave, encodeSave, isSeatModel } from '../src';

// Plan "Vui 3 ca" S4 / FEEDBACK II.2 v3.3 / D14 D18 D19: table levels and chair levels. Every state change below is a real command or clock advance;
// the recorded save was produced by the engine of the slice before this one (fixtures/seat-v28-2022.ts, S3 tip 004e6ad).
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** The rules-28 history S3 shipped: bundled seat seed 2.0.22 (the S1 level ladder: old prices, Ket Noi gate, no level benefit), recorded by tip 004e6ad. */
function seat2022() {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.22-v28.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save);
  return { fixture, saved, save: fixture.save as string, raw: () => structuredClone(saved.config) as any };
}

test('a rules-28 history recorded on JSON 2.0.22 replays byte for byte and re-encodes unchanged: the old level prices, the old gate, no level benefit', () => {
  const { fixture, saved, save } = seat2022();
  assert.equal(saved.config._meta.version, '2.0.22'); assert.ok(saved.log.every((e: { rulesVersion: number }) => e.rulesVersion === 28));
  const g = decodeSave(save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the pre-S4 history replays to the world the old engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  assert.ok(isSeatModel(g.config.values) && g.config.version === '2.0.22' && !('tableUpgrade' in g.config.values.upgrades.table));
  const upgrades = saved.log.filter((e: { command: { type: string } }) => e.command.type === 'upgradeTable');
  assert.deepEqual(upgrades.map((e: { result: { ok: boolean; reason?: string; amount?: number } }) => [e.result.ok, e.result.reason ?? e.result.amount]),
    [[true, 3750], [true, 15000], [true, 3750], [false, 'badgeRequired']], 'the S1 ladder: 1 500 / 6 000 base x 2.5, then the Ket Noi badge');
  const kinds = new Set(g.world.events.map(e => e.type));
  for (const need of ['table_upgraded', 'chair_bought', 'order_placed', 'order_served']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
  assert.deepEqual(g.world.events.filter(e => e.type === 'table_upgraded').map(e => Object.keys(e.data)), [['tableId', 'level'], ['tableId', 'level'], ['tableId', 'level']], 'the old event payload');
});
