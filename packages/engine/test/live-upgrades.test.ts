import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, decodeSave, encodeSave, EQUIPMENT, upgradeQuote, type Command } from '../src';
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `live-upgrade-${g.log.length}` });
const legacy = () => decodeSave(readFileSync(new URL('./fixtures/live-upgrade-v16.json', import.meta.url), 'utf8'));

test('a real saved v16 paused shift keeps its old refusals but upgrades every device and an empty table without closing', () => {
  const g = legacy(), w = g.world, oldLog = structuredClone(g.log), oldEvents = structuredClone(w.events);
  assert.equal(g.config.values.upgrades.phase1UpgradesOutsideShiftOnly, true);
  assert.ok(oldLog.slice(-4).every(e => e.rulesVersion === 16 && e.result.reason === 'outsideShiftOnly'));
  const table = w.tables.find(t => t.order)!, order = structuredClone(table.order), glasses = structuredClone(w.glasses);
  const shift = w.shift!.id, coins = w.coins, spent = w.shift!.stats.spent; let total = 0;
  for (const kind of EQUIPMENT) {
    const quote = upgradeQuote(w, g.config, kind); assert.ok(quote.ok); total += quote.cost!;
    const envelope = { command: { type: 'upgrade' as const, kind }, at: w.now, idempotencyKey: `device-${kind}` };
    assert.deepEqual(g.command(envelope), { ok: true, amount: quote.cost });
    const after = structuredClone(w); assert.ok(g.command(envelope).ok); assert.deepEqual(w, after);
    assert.equal(w.equipment[kind], quote.next);
  }
  assert.equal(w.coins, coins - total); assert.equal(w.shift!.stats.spent, spent + total);
  assert.deepEqual(table.order, order); assert.deepEqual(w.glasses, glasses); assert.equal(w.shift!.id, shift);
  const empty = w.tables.find(t => t.state === 'empty')!, level = empty.level;
  assert.ok(send(g, { type: 'upgradeTable', tableId: empty.id }).ok); assert.equal(empty.level, level + 1);
  const count = w.tables.length; assert.ok(send(g, { type: 'buyTable' }).ok); assert.equal(w.tables.length, count + 1);
  assert.equal(send(g, { type: 'upgradeTable', tableId: table.id }).reason, 'tableBusy');
  assert.equal(w.phase, 'open'); assert.equal(w.paused, true); assert.equal(w.completedShifts, 0);
  assert.equal(w.seasonEarned, 0); assert.equal(w.lifetimeEarned, 0);
  assert.deepEqual(g.log.slice(0, oldLog.length), oldLog); assert.deepEqual(w.events.slice(0, oldEvents.length), oldEvents);
  const remaining = table.order!.placedAt + table.order!.patienceMs - w.now, prep = table.order!.items[0].readyAt! - w.now;
  g.advance(w.now + 60000); assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, remaining);
  assert.equal(table.order!.items[0].readyAt! - w.now, prep); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  send(g, { type: 'activity', active: true }); g.advance(w.now + 1000);
  assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, remaining - 1000);
  assert.equal(w.shift!.id, shift); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('live upgrade refusals describe real funds or maximum level and cannot debit a customer shift', () => {
  const g = new Game(); send(g, { type: 'startShift' }); send(g, { type: 'activity', active: true, paused: true });
  const before = structuredClone(g.world);
  assert.equal(upgradeQuote(g.world, g.config, 'kitchen').reason, 'notEnoughCoins');
  assert.deepEqual(send(g, { type: 'upgrade', kind: 'kitchen' }), { ok: false, reason: 'notEnoughCoins' });
  assert.deepEqual(g.world, before);
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 10000000;
  const rich = new Game(loadConfig(raw)); send(rich, { type: 'startShift' }); send(rich, { type: 'activity', active: true, paused: true });
  while (upgradeQuote(rich.world, rich.config, 'keg').cost !== null) assert.ok(send(rich, { type: 'upgrade', kind: 'keg' }).ok);
  const max = structuredClone(rich.world); assert.equal(send(rich, { type: 'upgrade', kind: 'keg' }).reason, 'maxLevel');
  assert.deepEqual(rich.world, max); assert.deepEqual(decodeSave(encodeSave(rich)).world, rich.world);
});
