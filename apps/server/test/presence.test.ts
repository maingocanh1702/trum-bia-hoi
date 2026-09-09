import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { config, loadConfig, Game, type Config, type Command } from '@tbh/engine';
import { GameStore, type Heartbeat } from '../src/store';
import { createGameServer } from '../src/http';
const NOW = Date.parse('2026-09-10T10:00:00Z'), ORIGIN = 'http://127.0.0.1:5174';
function fixture(t: { after(fn: () => unknown): void }, c: Config = config) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/presence-')), file = resolve(dir, 'game.db');
  let now = NOW; const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, c, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  t.after(() => { db.close(); for (const s of stores) s.close(); rmSync(dir, { force: true, recursive: true }); });
  const view = (session = store.createGuestSession(86400000)) => ({ ...session, ...store.connect(session.playerId),
    beatSeq: 0, clientSeq: 0, keys: new Map<string, number>() });
  type View = ReturnType<typeof view>;
  const beat = (a: View, flags: Partial<Pick<Heartbeat, 'active' | 'paused'>> = {}, s = store, seq = ++a.beatSeq) => s.heartbeat(a.token,
    { clientId: a.clientId, beatSeq: seq, active: true, paused: false, ...flags });
  const send = (a: View, command: Command, key = `action-${a.clientSeq + 1}`, s = store) => {
    if (!a.keys.has(key)) a.keys.set(key, ++a.clientSeq);
    return s.clientCommand(a.playerId, { clientId: a.clientId, clientSeq: a.keys.get(key)!, idempotencyKey: key, command }, a.token);
  };
  const ready = () => {
    const a = view(); beat(a); assert.ok(send(a, { type: 'startShift' }).result?.ok);
    for (let n = 0; n < 60; n++) {
      now += c.values.network.reconnectingUiDelayMs / 2;
      const state = beat(a), table = state.world.tables.find(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready'));
      if (table) return { a, state, table };
    }
    throw Error('test:noReadyOrder');
  };
  const events = (id: string, type: string) => db.prepare('SELECT payload FROM events WHERE player_id=? AND json_extract(payload,\'$.type\')=? ORDER BY seq').all(id, type).map(r => JSON.parse(String(r.payload)));
  return { store, db, file, open, view, beat, send, ready, events, get now() { return now; }, set now(v: number) { now = v; } };
}

test('durable loss precedes catch-up; hidden menu recovery freezes wait and exact action retries serve only once', t => {
  const f = fixture(t), { a, state, table } = f.ready(), before = table.order!.placedAt + table.order!.patienceMs - f.now;
  f.beat(a, { paused: true }); const at = f.now, lostAt = at + config.values.network.reconnectingUiDelayMs;
  const attendance = f.store.read(a.playerId).world.attendance;
  f.now = lostAt + 5000; const offline = f.store.read(a.playerId);
  assert.equal(offline.world.disconnection!.expiresAt, lostAt + config.values.network.reconnectGraceMs);
  assert.equal(offline.world.tables.find(t => t.id === table.id)!.order!.placedAt + table.order!.patienceMs - f.now, before);
  assert.equal(offline.world.staminaMs, state.world.staminaMs); assert.deepEqual(offline.world.attendance, attendance);
  const payload = { type: 'serve' as const, tableId: table.id, orderId: table.order!.id };
  assert.equal(f.send(a, payload, 'served').error, 'heartbeatRequired');
  assert.equal(f.store.command(a.playerId, { idempotencyKey: 'bypass', command: { type: 'activity', active: true } }).result.reason, 'heartbeatRequired');
  const restored = f.beat(a, { active: false, paused: true });
  assert.equal(restored.world.disconnection, undefined); assert.equal(restored.world.active, false); assert.equal(restored.world.paused, true);
  for (let n = 0; n < 3; n++) { f.now += 1000; f.beat(a, { active: false, paused: true }); }
  assert.deepEqual(f.store.read(a.playerId).world.attendance, attendance);
  f.beat(a); const served = f.send(a, payload, 'served'); assert.ok(served.result?.ok);
  const retried = f.send(a, { orderId: table.order!.id, tableId: table.id, type: 'serve' }, 'served');
  assert.deepEqual(retried.result, served.result); assert.equal(retried.world.coins, served.world.coins);
  assert.equal(f.events(a.playerId, 'order_served').length, 1); assert.equal(f.events(a.playerId, 'connection_lost').length, 1);
  assert.equal(f.events(a.playerId, 'connection_lost')[0].at, lostAt);
});

test('fresh heartbeat sequence owns presence; duplicates, reordering, other players and legacy activity cannot renew or override it', t => {
  const f = fixture(t), a = f.view(), b = f.view(), first = f.beat(a, { paused: true });
  const count = () => f.db.prepare('SELECT COUNT(*) AS n FROM commands WHERE player_id=?').get(a.playerId)!.n;
  const initial = count(); f.now += 500;
  const duplicate = f.beat(a, { paused: true }, f.store, a.beatSeq);
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.heartbeatUntil, first.heartbeatUntil); assert.equal(count(), initial);
  assert.equal(f.beat(a, { paused: false }, f.store, a.beatSeq).error, 'heartbeatStale');
  a.beatSeq += 5; f.beat(a, { paused: true }); assert.equal(count(), initial, 'unchanged heartbeat never appends a command');
  assert.equal(f.beat(a, {}, f.store, 1).error, 'heartbeatStale');
  assert.throws(() => f.store.heartbeat(b.token, { clientId: a.clientId, beatSeq: 999, active: true, paused: false }), /invalidClient/);
  assert.equal(f.send(a, { type: 'activity', active: true }).error, 'presenceManaged');
  const fresh = f.store.connect(a.playerId); assert.equal(f.store.clientCommand(a.playerId,
    { clientId: fresh.clientId, clientSeq: 1, idempotencyKey: 'unmanaged-stream', command: { type: 'startShift' } }, a.token).error, 'heartbeatRequired');
  const before = f.store.read(a.playerId); assert.equal(before.world.paused, true);
  f.now += config.values.network.reconnectingUiDelayMs;
  assert.equal(f.beat(a, { paused: true }, f.store, a.beatSeq).duplicate, true);
  assert.equal(f.db.prepare('SELECT live FROM client_presence WHERE client_id=?').get(a.clientId)!.live, 0);
  assert.equal(f.store.read(a.playerId).world.active, false, 'replaying the last packet cannot resurrect an expired lease');
  const handshake = f.store.connect(a.playerId, a.clientId); assert.equal(handshake.heartbeatSeq, a.beatSeq);
});

test('multiple views aggregate one presence and intermediate menu expiry is applied at its own timestamp', t => {
  const f = fixture(t), { a, table } = f.ready(), start = f.now;
  f.beat(a, { paused: true }); const remaining = table.order!.placedAt + table.order!.patienceMs - start;
  f.now += 500; const b = f.view(a); f.beat(b, { paused: false });
  const secondExpiry = f.now + config.values.network.reconnectingUiDelayMs;
  f.now = secondExpiry + 500; const offline = f.store.read(a.playerId);
  const order = offline.world.tables.find(t => t.id === table.id)!.order!;
  assert.equal(order.placedAt + order.patienceMs - f.now, remaining - 500);
  assert.equal(f.events(a.playerId, 'connection_lost').length, 1);
  assert.equal(f.events(a.playerId, 'connection_lost')[0].at, secondExpiry);
  assert.equal(offline.world.disconnection!.expiresAt, secondExpiry + config.values.network.reconnectGraceMs);
});

test('restart and two stores retain exact lease frontiers, checkpoint replay and one normal ShiftClosed after grace', t => {
  const f = fixture(t), { a } = f.ready(); f.beat(a, { paused: true });
  const lostAt = f.now + config.values.network.reconnectingUiDelayMs, deadline = lostAt + config.values.network.reconnectGraceMs;
  f.store.close(); const s = f.open(), other = f.open(); f.now = deadline;
  const expired = s.read(a.playerId); assert.equal(expired.world.phase, 'closing'); assert.equal(expired.world.disconnection!.timedOut, true);
  assert.equal(expired.world.disconnection!.expiresAt, deadline);
  const recovered = f.beat(a, { active: false, paused: true }, other); assert.equal(recovered.world.phase, 'closing');
  f.now += 300000; assert.deepEqual(s.sweepPresence(), []); assert.deepEqual(other.sweepPresence(), []);
  const closed = s.read(a.playerId); assert.equal(closed.world.phase, 'resting'); assert.equal(closed.world.active, false);
  assert.equal(f.events(a.playerId, 'shift_closed').length, 1); assert.equal(f.events(a.playerId, 'connection_expired').length, 1);
  const commands = f.db.prepare('SELECT entry FROM commands WHERE player_id=? ORDER BY seq').all(a.playerId).map(r => JSON.parse(String(r.entry)));
  const player = f.db.prepare('SELECT * FROM players WHERE id=?').get(a.playerId)!;
  const replay = new Game(config, Number(player.seed), Number(player.created_at), a.playerId);
  for (const entry of commands) assert.deepEqual(replay.replay(entry), entry.result);
  replay.advance(f.now); assert.deepEqual(replay.world, closed.world);
  const cold = f.open(); assert.deepEqual(cold.read(a.playerId), closed);
});

test('session expiry and revocation end leases early, including offline resting stamina and read-only event polling', t => {
  for (const revoked of [false, true]) {
    const f = fixture(t), a = f.view(f.store.createGuestSession(1500));
    f.beat(a); f.send(a, { type: 'startShift' }); f.now += 500; f.beat(a);
    const lossAt = revoked ? f.now : NOW + 1500;
    if (revoked) f.store.revokeSession(a.token);
    f.now = NOW + 2000; assert.throws(() => f.beat(a), /invalidSession/);
    assert.deepEqual(f.store.sweepPresence(), []); const state = f.store.read(a.playerId);
    assert.equal(state.world.disconnection!.expiresAt, lossAt + config.values.network.reconnectGraceMs);
    f.now += config.values.network.reconnectGraceMs + 300000; f.store.eventsAfter(a.playerId, 0);
    assert.deepEqual(f.store.sweepPresence(), []); const closed = f.store.read(a.playerId);
    assert.equal(closed.world.phase, 'resting'); const stamina = closed.world.staminaMs, attendance = closed.world.attendance;
    f.now += 86400000; const absent = f.store.read(a.playerId);
    assert.equal(absent.world.staminaMs, stamina); assert.deepEqual(absent.world.attendance, attendance);
  }
});

test('lease state and checkpoints roll back together, and a malformed player does not prevent other due players closing', t => {
  const f = fixture(t), a = f.view(), b = f.view(); f.beat(a); f.beat(b); f.send(a, { type: 'startShift' }); f.send(b, { type: 'startShift' });
  const before = f.db.prepare('SELECT * FROM client_presence WHERE client_id=?').get(a.clientId);
  const projection = f.db.prepare('SELECT projection FROM players WHERE id=?').get(a.playerId);
  f.db.exec(`CREATE TRIGGER test_fail_projection BEFORE UPDATE ON players WHEN NEW.id='${a.playerId}' BEGIN SELECT RAISE(ABORT,'test:rollback'); END;`);
  f.now += 500; assert.throws(() => f.beat(a, { paused: true }), /test:rollback/);
  assert.deepEqual(f.db.prepare('SELECT * FROM client_presence WHERE client_id=?').get(a.clientId), before);
  assert.deepEqual(f.db.prepare('SELECT projection FROM players WHERE id=?').get(a.playerId), projection);
  f.now += config.values.network.reconnectingUiDelayMs + config.values.network.reconnectGraceMs + 300000;
  const failures = f.store.sweepPresence(); assert.deepEqual(failures.map(r => r.playerId), [a.playerId]); assert.match(failures[0].error, /test:rollback/);
  assert.equal(f.store.read(b.playerId).world.phase, 'resting');
  f.db.exec('DROP TRIGGER test_fail_projection'); assert.deepEqual(f.open().sweepPresence(), []);
  assert.equal(f.store.read(a.playerId).world.phase, 'resting'); assert.equal(f.events(a.playerId, 'connection_lost').length, 1);
});

test('schema6 checkpoint data stays intact when durable presence is added and invalid heartbeat clocks fail closed', t => {
  const f = fixture(t), a = f.view(); const before = f.store.read(a.playerId);
  const checkpoint = f.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get(a.playerId);
  f.store.close(); f.db.exec('DROP TABLE registry_audit; DROP TABLE registry_publications; DROP TABLE registry_approvals; DROP TABLE registry_proposals; DROP TABLE client_presence; PRAGMA user_version=6');
  const migrated = f.open(); assert.deepEqual(migrated.read(a.playerId), before);
  assert.deepEqual(f.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get(a.playerId), checkpoint);
  assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 8);
  assert.ok(f.beat(a, {}, migrated).heartbeatUntil > f.now);
  for (const value of [0, 1, 2147483648]) {
    const raw = structuredClone(config.raw); raw._meta.version = `heartbeat-invalid-${value}`; raw.network.reconnectingUiDelayMs = value;
    assert.throws(() => new GameStore(':memory:', loadConfig(raw)), /heartbeatClock/);
  }
});

async function until(check: () => boolean) {
  const end = Date.now() + 2000; while (!check()) { if (Date.now() >= end) throw Error('test:schedulerTimeout'); await delay(10); }
}

test('native HTTP heartbeat authenticates views, reports protocol clocks and autonomously closes offline shifts after restart', async t => {
  const raw = structuredClone(config.raw); raw._meta.version = 'http-presence'; raw.network.reconnectingUiDelayMs = 40;
  const f = fixture(t, loadConfig(raw)), servers: ReturnType<typeof createGameServer>[] = [];
  t.after(async () => { for (const server of servers) if (server.listening) { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); } });
  const serve = async (store: GameStore) => {
    const server = createGameServer(store, { origin: ORIGIN, sessionTtlMs: 86400000, rateMax: 1000, rateWindowMs: 60000 }); servers.push(server);
    await new Promise<void>((r, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', r); });
    return { server, request: (path: string, body: unknown, cookie?: string) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`,
      { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) }) };
  };
  const http = await serve(f.store), guest = await http.request('/auth/session', {}), cookie = guest.headers.get('set-cookie')!.split(';')[0];
  const playerId = (await guest.json()).playerId, connected = await (await http.request('/player/connect', {}, cookie)).json();
  const openCommand = { clientId: connected.clientId, clientSeq: 1, idempotencyKey: 'open', command: { type: 'startShift' } };
  const unleased = await http.request('/player/command', openCommand, cookie);
  assert.equal(unleased.status, 409); const refused = await unleased.json();
  assert.equal(refused.error, 'heartbeatRequired'); assert.equal(refused.acknowledgedSeq, 0); assert.equal(refused.world.phase, 'resting');
  const payload = { clientId: connected.clientId, beatSeq: 1, active: true, paused: true };
  assert.equal((await http.request('/player/heartbeat', payload)).status, 401);
  for (const bad of [{ ...payload, at: 0 }, { ...payload, beatSeq: 0 }, { ...payload, active: 1 }, { ...payload, paused: undefined }, { ...payload, world: { coins: 999 } }])
    assert.equal((await http.request('/player/heartbeat', bad, cookie)).status, 400);
  const beat = await (await http.request('/player/heartbeat', payload, cookie)).json();
  assert.equal(beat.heartbeatIntervalMs, 20); assert.equal(beat.heartbeatTimeoutMs, 40); assert.equal(beat.world.paused, true);
  assert.equal(beat.world.rng, undefined); assert.equal(beat.world.events, undefined); assert.equal(beat.session_hash, undefined);
  assert.equal((await http.request('/player/heartbeat', { ...payload, active: false }, cookie)).status, 409);
  const opened = await (await http.request('/player/command', openCommand, cookie)).json();
  assert.ok(opened.result.ok); const lostAt = beat.heartbeatUntil;
  http.server.closeAllConnections(); await new Promise<void>(r => http.server.close(() => r())); f.store.close();
  f.now = lostAt + 10; const restart = f.open(), next = await serve(restart);
  await until(() => f.events(playerId, 'connection_lost').length === 1);
  assert.equal(f.events(playerId, 'connection_lost')[0].at, lostAt);
  f.now = lostAt + config.values.network.reconnectGraceMs;
  await until(() => f.events(playerId, 'shift_closed').length === 1);
  const returned = await (await next.request('/player/heartbeat', { ...payload, beatSeq: 2, active: false }, cookie)).json();
  assert.equal(returned.world.phase, 'resting'); assert.equal(returned.world.active, false); assert.equal(returned.world.paused, true);
  assert.equal(f.events(playerId, 'shift_closed').length, 1);
});


test('Google rotation revokes the old lease and requires the new token to renew the same owned stream before actions resume', t => {
  const f = fixture(t), { a, table } = f.ready(); f.beat(a, { paused: true }); f.now += 500;
  const oldToken = a.token, lostAt = f.now, nonce = f.store.issueGoogleChallenge(oldToken).nonce;
  const signed = f.store.signInGoogle(oldToken, nonce, { subject: 'presence-google-account' }, 86400000);
  assert.equal(signed.playerId, a.playerId); assert.throws(() => f.beat(a), /invalidSession/);
  a.token = signed.token;
  const serve = { type: 'serve' as const, tableId: table.id, orderId: table.order!.id };
  assert.equal(f.send(a, serve, 'post-login-serve').error, 'heartbeatRequired');
  assert.equal(f.events(a.playerId, 'connection_lost')[0].at, lostAt);
  const hidden = f.beat(a, { active: false, paused: true }); assert.equal(hidden.world.disconnection, undefined);
  assert.equal(hidden.world.active, false); assert.equal(hidden.world.paused, true);
  assert.ok(f.send(a, serve, 'post-login-serve').result?.ok);
  assert.equal(f.events(a.playerId, 'order_served').length, 1);
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('normal closing can finish before the lease expires, so loss binds to resting state at the exact frontier', t => {
  const f = fixture(t), { a, table } = f.ready();
  assert.ok(f.send(a, { type: 'serve', tableId: table.id, orderId: table.order!.id }).result?.ok);
  assert.ok(f.send(a, { type: 'endShift' }).result?.ok);
  let state = f.store.read(a.playerId);
  const remaining = state.world.tables.filter(t => !['empty', 'cleaning', 'broken'].includes(t.state));
  assert.ok(remaining.length && remaining.every(t => t.state === 'consuming'));
  assert.equal(state.world.queue.length, 0);
  const closesAt = Math.max(...remaining.map(t => t.until!));
  while (f.now < closesAt - 1) { f.now = Math.min(closesAt - 1, f.now + 1000); state = f.beat(a); }
  assert.equal(state.world.phase, 'closing');
  const lostAt = f.now + config.values.network.reconnectingUiDelayMs;
  f.now = lostAt + 10000;
  const lost = f.store.read(a.playerId); assert.equal(lost.world.phase, 'resting'); assert.equal(lost.world.active, false);
  assert.equal(lost.world.disconnection, undefined); assert.equal(lost.world.shift!.closedAt, closesAt);
  const event = f.events(a.playerId, 'connection_lost').at(-1)!;
  assert.equal(event.at, lostAt); assert.equal(event.data.shiftId, null);
});
