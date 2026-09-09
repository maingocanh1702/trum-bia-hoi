import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, validEnvelope, type Command } from '../src';
const start = Date.parse('2026-09-09T16:59:30Z');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `disconnect-test-${g.log.length}` });
function readyOrder() {
  const g = new Game(config, 42, start);
  assert.ok(send(g, { type: 'startShift' }).ok); g.advance(start + 11100);
  assert.ok(g.world.tables.some(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')));
  return g;
}
const disconnect = (g: Game, at: number, shiftId: string) => g.disconnect(at, shiftId, `loss-at-${at}`);
const roundtrip = (g: Game) => { const restored = decodeSave(encodeSave(g)); assert.deepEqual(restored.world, g.world); return restored; };
const count = (g: Game, type: string) => g.world.events.filter(e => e.type === type).length;

test('a lost connection freezes grace, closes an unserved table at the deadline and never grants absent attendance or resting stamina', () => {
  const g = readyOrder(), w = g.world, lostAt = w.now, shiftId = w.shift!.id;
  send(g, { type: 'activity', active: true, paused: true });
  const attendance = structuredClone(w.attendance), stamina = w.staminaMs;
  const order = w.tables.find(t => t.order)!.order!, waiting = order.placedAt + order.patienceMs - w.now;
  const zeroLoss = w.daily!.rows.find(r => r.kind === 'zero_loss_window')?.progress ?? 0;
  assert.ok(disconnect(g, lostAt, shiftId).ok); const deadline = w.disconnection!.expiresAt;
  assert.equal(deadline, lostAt + config.values.network.reconnectGraceMs);
  g.advance(deadline - 1); assert.equal(w.phase, 'open'); assert.equal(order.placedAt + order.patienceMs - w.now, waiting);
  assert.deepEqual(w.attendance, attendance); assert.equal(w.staminaMs, stamina); roundtrip(g);
  g.advance(deadline); assert.equal(w.phase, 'closing'); assert.equal(w.disconnection!.timedOut, true);
  assert.equal(count(g, 'connection_expired'), 1); assert.equal(count(g, 'shift_closing'), 1); roundtrip(g);
  g.advance(deadline + 1); assert.equal(order.placedAt + order.patienceMs - w.now, waiting - 1);
  g.advance(deadline + 300000);
  assert.equal(w.phase, 'resting'); assert.ok(w.shift!.closedAt! > deadline); assert.equal(count(g, 'shift_closed'), 1);
  assert.equal(w.active, false); assert.equal(w.disconnection, undefined); assert.deepEqual(w.attendance, attendance);
  assert.equal(w.staminaMs, stamina); assert.ok(count(g, 'customer_left') > 0); assert.equal(count(g, 'order_served'), 0);
  assert.equal(w.daily!.rows.find(r => r.kind === 'zero_loss_window')?.progress ?? zeroLoss, zeroLoss);
  g.advance(w.now + 86400000); assert.equal(w.staminaMs, stamina); assert.deepEqual(w.attendance, attendance); roundtrip(g);
});

test('reconnect strictly before grace cancels timeout, keeps menu paused, and a later outage gets its own full grace', () => {
  const g = readyOrder(), w = g.world;
  assert.ok(disconnect(g, w.now, w.shift!.id).ok); const deadline = w.disconnection!.expiresAt;
  g.advance(deadline - 1); assert.ok(send(g, { type: 'activity', active: true, paused: true }).ok);
  assert.equal(w.disconnection, undefined); const order = w.tables.find(t => t.order)!.order!, placed = order.placedAt;
  g.advance(deadline + 1000); assert.equal(w.phase, 'open'); assert.equal(order.placedAt, placed + 1001);
  assert.equal(count(g, 'connection_expired'), 0); assert.equal(w.attendance!.lastActiveDateKey, '2026-09-10');
  assert.ok(disconnect(g, w.now, w.shift!.id).ok); assert.equal(w.disconnection!.expiresAt, w.now + config.values.network.reconnectGraceMs); roundtrip(g);
});

test('reconnect at or after expiry cannot reopen the shift, and losing that connection again stops attendance', () => {
  for (const offset of [0, 1]) {
    const g = readyOrder(), w = g.world; disconnect(g, w.now, w.shift!.id);
    g.advance(w.disconnection!.expiresAt + offset); send(g, { type: 'activity', active: true, paused: true });
    assert.equal(w.phase, 'closing'); assert.equal(w.disconnection!.timedOut, true);
    const attendance = structuredClone(w.attendance); assert.ok(disconnect(g, w.now, w.shift!.id).ok);
    assert.equal(w.active, false); g.advance(w.now + 86400000); assert.equal(w.phase, 'resting');
    assert.deepEqual(w.attendance, attendance); assert.equal(count(g, 'connection_expired'), 1); roundtrip(g);
  }
});

test('duplicate loss never extends grace, retries survive restoration, and wrong or late shifts cannot arm a timeout', () => {
  const g = readyOrder(), w = g.world, at = w.now, shiftId = w.shift!.id;
  assert.equal(disconnect(g, at, 'old-shift').reason, 'noShift'); assert.equal(w.disconnection, undefined);
  assert.ok(disconnect(g, at, shiftId).ok); const deadline = w.disconnection!.expiresAt, entries = g.log.length;
  g.advance(at + 1000); assert.ok(disconnect(g, at, shiftId).ok); assert.equal(g.log.length, entries);
  assert.ok(disconnect(g, w.now, shiftId).ok); assert.equal(w.disconnection!.expiresAt, deadline);
  assert.equal(count(g, 'connection_lost'), 1);
  const restored = roundtrip(g); assert.ok(disconnect(restored, at, shiftId).ok); assert.equal(restored.log.length, g.log.length);
  assert.equal(disconnect(g, at + 1, shiftId).reason, 'staleCommand');
  g.advance(deadline + 300000); const closed = w.shift!.closedAt;
  assert.equal(disconnect(g, w.now, shiftId).reason, 'noShift'); assert.equal(w.shift!.closedAt, closed);
  send(g, { type: 'activity', active: true }); g.advance(w.now + config.values.shift.durationMs / config.values.shift.regenRate);
  assert.ok(send(g, { type: 'startShift' }).ok); assert.equal(disconnect(g, w.now, shiftId).reason, 'noShift');
  assert.equal(w.disconnection, undefined); roundtrip(g);
});

test('disconnected normal closing is independent of advance chunk size, including an empty shift at exact expiry', () => {
  for (const order of [false, true]) {
    const g = order ? readyOrder() : new Game(config, 42, start);
    if (!order) send(g, { type: 'startShift' });
    if (order) send(g, { type: 'endShift' });
    disconnect(g, g.world.now, g.world.shift!.id); const deadline = g.world.disconnection!.expiresAt;
    const chunks = roundtrip(g), end = deadline + 300000;
    g.advance(end); while (chunks.world.now < end) chunks.advance(Math.min(end, chunks.world.now + 1000));
    assert.deepEqual(chunks.world, g.world); assert.equal(count(g, 'shift_closing'), 1);
    if (!order) assert.equal(g.world.shift!.closedAt, deadline);
    roundtrip(g);
  }
});

test('public callers cannot forge disconnections or reserve system keys; only rules19 can replay the trusted record', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  for (const command of [{ type: 'connectionLost', shiftId }, { type: 'startShift' }]) {
    const envelope = { at, idempotencyKey: `system:connectionLost:${shiftId}:${at}`, command };
    assert.equal(validEnvelope(envelope), false); assert.equal(g.command(envelope as never).reason, 'invalidCommand');
  }
  disconnect(g, at, shiftId); const save = JSON.parse(encodeSave(g));
  save.log.at(-1).rulesVersion = 18; assert.throws(() => decodeSave(JSON.stringify(save)), /replay:rulesVersion/);
  save.log.at(-1).rulesVersion = 19; save.log.at(-1).idempotencyKey = 'forged'; assert.throws(() => decodeSave(JSON.stringify(save)), /save:invalid-log/);
  roundtrip(g);
});

test('configured grace comes from the pinned shift and unsafe deadline arithmetic fails before installing a timer', () => {
  for (const grace of [2500, Number.MAX_SAFE_INTEGER]) {
    const raw = structuredClone(config.raw); raw._meta.version = `grace-${grace}`; raw.network.reconnectGraceMs = grace;
    const g = new Game(loadConfig(raw), 42, start); send(g, { type: 'startShift' });
    const result = disconnect(g, g.world.now, g.world.shift!.id);
    if (grace === 2500) { assert.ok(result.ok); assert.equal(g.world.disconnection!.expiresAt, start + grace); }
    else { assert.equal(result.reason, 'configClock'); assert.equal(g.world.disconnection, undefined); assert.equal(g.world.active, true); }
    roundtrip(g);
  }
});

test('genuine e390a1c rules18 menu and inactive closing saves retain their original worlds without implicit connection deadlines', () => {
  for (const name of ['menu', 'inactive-closing']) {
    const text = readFileSync(new URL(`./fixtures/legacy-v18-${name}.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-v18-${name}-expected.json`, import.meta.url), 'utf8'));
    assert.equal(expected.source, 'e390a1c297ed5429360e96428924a6bb91dd4fa6');
    const g = decodeSave(text); assert.deepEqual(g.world, expected.world); assert.equal(g.world.disconnection, undefined); roundtrip(g);
    send(g, { type: 'activity', active: g.world.active, ...(g.world.paused ? { paused: true } : {}) });
    const phase = g.world.phase; g.advance(g.world.now + config.values.network.reconnectGraceMs + 300000);
    assert.equal(g.world.phase, phase); assert.equal(count(g, 'connection_expired'), 0); roundtrip(g);
  }
});

test('a safe shift deadline too close to the integer limit cannot be shifted by disconnection grace or a menu pause', () => {
  const raw = structuredClone(config.raw); raw._meta.version = 'near-clock-limit';
  raw.shift.durationMs = Number.MAX_SAFE_INTEGER - 10000;
  const g = new Game(loadConfig(raw), 42, 0); assert.ok(send(g, { type: 'startShift' }).ok);
  assert.ok(Number.isSafeInteger(g.world.shift!.endsAt));
  const timers = structuredClone({ shift: g.world.shift, tables: g.world.tables, glasses: g.world.glasses, beer: g.world.beer });
  assert.deepEqual(disconnect(g, 0, g.world.shift!.id), { ok: false, reason: 'configClock' });
  assert.equal(g.world.active, true); assert.equal(g.world.disconnection, undefined);
  assert.deepEqual({ shift: g.world.shift, tables: g.world.tables, glasses: g.world.glasses, beer: g.world.beer }, timers); roundtrip(g);
  send(g, { type: 'activity', active: true, paused: true }); const before = structuredClone(g.world);
  assert.throws(() => g.advance(config.values.network.reconnectGraceMs), /clock:unsafePause/);
  assert.deepEqual(g.world, before); roundtrip(g);
});


test('a menu pause rejected across midnight leaves the entire world and calendar events untouched', () => {
  const raw = structuredClone(config.raw); raw._meta.version = 'pause-overflow-after-midnight';
  raw.shift.durationMs = Number.MAX_SAFE_INTEGER - 71_200_000;
  const g = new Game(loadConfig(raw), 42, 0); assert.ok(send(g, { type: 'startShift' }).ok);
  send(g, { type: 'activity', active: true, paused: true });
  assert.ok(g.world.daily!.expiresAt < 81_200_000);
  const before = structuredClone(g.world);
  assert.throws(() => g.advance(81_200_000), /clock:unsafePause/);
  assert.deepEqual(g.world, before); roundtrip(g);
});


test('distinct outages within the same millisecond arm independently while only an identical lossId retries', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  assert.ok(g.disconnect(at, shiftId, 'first-connection').ok);
  send(g, { type: 'activity', active: true });
  assert.equal(g.world.disconnection, undefined);
  assert.ok(g.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(g.world.active, false); assert.ok(g.world.disconnection);
  assert.equal(count(g, 'connection_lost'), 2);
  const before = encodeSave(g);
  assert.ok(g.disconnect(at, shiftId, 'first-connection').ok);
  assert.ok(g.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(encodeSave(g), before);
  const restored = roundtrip(g); assert.ok(restored.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(encodeSave(restored), before);
  assert.equal(g.disconnect(at, shiftId, '').reason, 'invalidCommand');
});

test('an overflowing offline advance cannot close a served shift or mutate calendar events before rejection', () => {
  const g = readyOrder(), t = g.world.tables.find(t => t.order)!, w = g.world;
  assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok);
  assert.ok(w.lastServedAt !== null); assert.ok(g.disconnect(w.now, w.shift!.id, 'served-offline').ok);
  const before = structuredClone(w);
  assert.throws(() => g.advance(Number.MAX_SAFE_INTEGER), /clock:unsafePause/);
  assert.deepEqual(w, before); roundtrip(g);
});


test('early rules19 timestamp-keyed loss logs remain readable but new trusted calls require a loss identity', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  assert.ok(g.replay({ at, idempotencyKey: `system:connectionLost:${shiftId}:${at}`, command: { type: 'connectionLost', shiftId }, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
  assert.equal(g.world.active, false); roundtrip(g);
  assert.equal(g.disconnect(at, shiftId, undefined as never).reason, 'invalidCommand');
});
