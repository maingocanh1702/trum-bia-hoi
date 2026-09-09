import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, dayKey, flyerQuote, encodeSave, decodeSave, type Command } from '../src';
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `menu-${g.log.length}` });

test('a present player can restock, claim the real calendar day and activate a flyer while gameplay remains frozen', () => {
  const raw = structuredClone(config.raw); raw.unlocks.flyer.gate = 'LP0'; raw.unlocks.flyer.repBase = 0;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T16:59:50Z')), w = g.world;
  send(g, { type: 'startShift' }); g.advance(w.now + 8100);
  send(g, { type: 'activity', active: true, paused: true });
  const order = w.tables.find(t => t.order)!.order!;
  const remaining = () => [order.placedAt + order.patienceMs - w.now, order.items[0].readyAt! - w.now, w.shift!.endsAt - w.now, w.staminaMs];
  const before = remaining(), oldDay = dayKey(w.now, g.config), stock = w.inventory.bia, coins = w.coins;
  assert.ok(send(g, { type: 'buyFlyer' }).ok);
  assert.ok(send(g, { type: 'activateFlyer', shiftId: w.shift!.id }).ok);
  const campaign = flyerQuote(w, g.config).remainingMs;
  g.advance(w.now + 60000); assert.deepEqual(remaining(), before); assert.equal(flyerQuote(w, g.config).remainingMs, campaign);
  assert.equal(w.active, true); assert.equal(w.paused, true);
  assert.notEqual(dayKey(w.now, g.config), oldDay); assert.equal(w.attendance!.lastActiveDateKey, dayKey(w.now, g.config));
  assert.equal(send(g, { type: 'claimAttendance', day: oldDay }).reason, 'attendanceExpired');
  assert.ok(send(g, { type: 'claimAttendance', day: dayKey(w.now, g.config) }).ok);
  assert.equal(send(g, { type: 'claimAttendance', day: dayKey(w.now, g.config) }).reason, 'attendanceClaimed');
  assert.ok(send(g, { type: 'restock', dish: 'bia', mode: 'one' }).ok);
  assert.equal(w.inventory.bia, stock + 1); assert.equal(w.coins, coins - g.config.values.menu.bia.unitCost);
  assert.deepEqual(remaining(), before); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  send(g, { type: 'activity', active: false }); assert.equal(w.paused, undefined);
  assert.equal(send(g, { type: 'claimAttendance', day: dayKey(w.now, g.config) }).reason, 'attendanceInactive');
  g.advance(w.now + 60000); assert.deepEqual(remaining(), before);
  send(g, { type: 'activity', active: true, paused: true }); g.advance(w.now + 1000); assert.deepEqual(remaining(), before);
  send(g, { type: 'activity', active: true }); g.advance(w.now + 1000);
  assert.deepEqual(remaining(), before.map(n => n - 1000)); assert.equal(flyerQuote(w, g.config).remainingMs, campaign - 1000);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('menu pause rejects malformed or pre-protocol commands and repeated pause leaves the original clock intact', () => {
  const g = new Game(); send(g, { type: 'startShift' });
  const before = structuredClone(g.world);
  for (const command of [{ type: 'activity', active: true, paused: 'yes' }, { type: 'activity', active: false, paused: true }]) {
    assert.equal(send(g, command as Command).reason, 'invalidCommand'); assert.deepEqual(g.world, before);
  }
  const e = { command: { type: 'activity' as const, active: true, paused: true }, at: g.world.now, idempotencyKey: 'pause-once' };
  assert.throws(() => g.replay({ ...e, rulesVersion: 15, configVersion: g.config.version, result: { ok: true } }), /replay:rulesVersion/);
  assert.ok(g.command(e).ok); g.advance(g.world.now + 10000); const paused = structuredClone(g.world);
  assert.ok(g.command(e).ok); assert.deepEqual(g.world, paused); assert.equal(g.log.filter(x => x.idempotencyKey === e.idempotencyKey).length, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
