import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { config, Game, encodeSave, type Command } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer, type ServerOptions } from '../src/http';
const ORIGIN = 'http://127.0.0.1:5174', NOW = Date.parse('2026-09-09T10:00:00Z');
async function fixture(t: { after(fn: () => unknown): void }, limits: Partial<ServerOptions> = {}) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/http-')), file = resolve(dir, 'game.db');
  let now = NOW; const instances: { store: GameStore; close: () => Promise<void> }[] = [];
  const clients = new Map<string, { id: string; next: number; keys: Map<string, number>; beatSeq: number; active: boolean; paused: boolean }>();
  t.after(async () => { for (const i of instances) { await i.close(); i.store.close(); } rmSync(dir, { force: true, recursive: true }); });
  const open = async () => {
    const store = new GameStore(file, config, () => now), server = createGameServer(store,
      { origin: ORIGIN, sessionTtlMs: 86400000, rateWindowMs: 60000, rateMax: 1000, ...limits });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const close = async () => { if (server.listening) { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); } };
    instances.push({ store, close });
    const request = (path: string, body?: unknown, cookie?: string, headers?: Record<string, string>) => {
      const client = cookie && clients.get(cookie);
      // Existing scenarios use a real handshake and stable retry sequence; explicit protocol tests supply their own fields.
      if (client && path === '/player/command' && body && typeof body === 'object' && 'idempotencyKey' in body &&
          typeof body.idempotencyKey === 'string' && !('clientId' in body) && !('clientSeq' in body)) {
        if (!client.keys.has(body.idempotencyKey)) client.keys.set(body.idempotencyKey, client.next++);
        body = { ...body, clientId: client.id, clientSeq: client.keys.get(body.idempotencyKey) };
      }
      return fetch(url + path, {
        method: body === undefined ? 'GET' : 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    };
    const registerClient = async (cookie: string) => {
      const r = await request('/player/connect', {}, cookie); assert.equal(r.status, 200); const data = await r.json();
      clients.set(cookie, { id: data.clientId, next: 1, keys: new Map(), beatSeq: 0, active: true, paused: false }); return data.clientId as string;
    };
    const beat = async (cookie: string, flags: Partial<{ active: boolean; paused: boolean }> = {}) => {
      const client = clients.get(cookie)!; Object.assign(client, flags);
      const r = await request('/player/heartbeat', { clientId: client.id, beatSeq: ++client.beatSeq, active: client.active, paused: client.paused }, cookie);
      assert.equal(r.status, 200); return r.json();
    };
    const advance = async (milliseconds: number) => {
      const end = now + milliseconds;
      while (now < end) {
        now = Math.min(end, now + config.values.network.reconnectingUiDelayMs / 2);
        for (const [cookie, client] of clients) if (client.beatSeq) await beat(cookie);
      }
    };
    return { store, request, close, url, registerClient, beat, advance };
  };
  return { file, open, get now() { return now; }, set now(v: number) { now = v; }, ...await open() };
}
async function guest(api: Awaited<ReturnType<typeof fixture>>, heartbeat = true) {
  const response = await api.request('/auth/session', {}); assert.equal(response.status, 201);
  const set = response.headers.get('set-cookie')!; assert.match(set, /HttpOnly; SameSite=Lax/); assert.match(set, /Path=\//);
  const data = await response.json(); assert.equal(data.provider, 'guest'); assert.equal(data.token, undefined);
  const cookie = set.split(';')[0], clientId = await api.registerClient(cookie);
  if (heartbeat) await api.beat(cookie);
  return { cookie, clientId, ...data };
}
const command = (type: string) => ({ idempotencyKey: type, command: { type } });

test('guest restart validates origin, body and exact cookie owner before rotating the visit', async t => {
  const f = await fixture(t), a = await guest(f);
  assert.equal((await f.request('/auth/guest/restart', { playerId: a.playerId })).status, 401);
  assert.equal((await f.request('/auth/guest/restart', { playerId: a.playerId }, a.cookie, { Origin: 'http://elsewhere.test' })).status, 403);
  for (const body of [{}, { playerId: 1 }, { playerId: a.playerId, extra: true }]) {
    assert.equal((await f.request('/auth/guest/restart', body, a.cookie)).status, 400);
  }
  assert.equal((await f.request('/auth/guest/restart', { playerId: 'wrong' }, a.cookie)).status, 409);
  const response = await f.request('/auth/guest/restart', { playerId: a.playerId }, a.cookie);
  assert.equal(response.status, 201); const next = await response.json();
  assert.notEqual(next.playerId, a.playerId); assert.equal(next.provider, 'guest'); assert.equal(next.token, undefined);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly; SameSite=Lax/);
  assert.equal((await f.request('/player/state', undefined, a.cookie)).status, 401);
  const state = await (await f.request('/player/state', undefined, response.headers.get('set-cookie')!.split(';')[0])).json();
  assert.equal(state.world.completedShifts, 0); assert.equal(state.world.phase, 'resting');
});

test('real HTTP guests own separate state; serving retries, paused stock purchases and event catch-up survive restart', async t => {
  const f = await fixture(t), a = await guest(f), b = await guest(f);
  assert.notEqual(a.playerId, b.playerId); assert.notEqual(a.cookie, b.cookie);
  const resume = await f.request('/auth/session', {}, a.cookie); assert.equal(resume.status, 200); assert.equal((await resume.json()).playerId, a.playerId);
  const opened = await (await f.request('/player/command', command('startShift'), a.cookie)).json(); assert.ok(opened.result.ok);
  assert.equal(opened.world.now, f.now); assert.equal(opened.configVersion, config.version);
  assert.equal(opened.world.rng, undefined); assert.equal(opened.world.nextId, undefined); assert.equal(opened.world.events, undefined);
  assert.equal(opened.world.shift.rushScheduleSeed, undefined); assert.equal(opened.config, undefined);
  assert.deepEqual(opened.shiftLocation, { shiftId: opened.world.shift.id, locations: [{ id: 'hem_nho', mult: config.values.locations.list[0].mult }] });
  await f.advance(11100);
  const ready = await (await f.request('/player/state', undefined, a.cookie)).json(), table = ready.world.tables.find((t: any) => t.order?.items.every((i: any) => i.state === 'ready'));
  const payload = { idempotencyKey: 'serve-one', command: { type: 'serve', tableId: table.id, orderId: table.order.id } };
  const served = await (await f.request('/player/command', payload, a.cookie)).json(); assert.ok(served.result.ok);
  const publicConfig = await (await f.request(`/player/config?version=${served.configVersion}`, undefined, a.cookie)).json();
  assert.deepEqual(publicConfig, config.raw);
  assert.equal((await f.request(`/player/config?version=${served.configVersion}`)).status, 401);
  assert.equal((await f.request('/player/config?version=missing', undefined, a.cookie)).status, 404);
  assert.equal((await f.request('/player/config?version=x&extra=y', undefined, a.cookie)).status, 400);
  assert.equal(served.menu.rows.find((r: { dish: string }) => r.dish === 'bia').sold, 1);
  assert.ok(served.presentation.some((e: any) => e.type === 'order_served' && e.data.orderId === table.order.id));
  const retry = await (await f.request('/player/command', { command: { orderId: table.order.id, tableId: table.id, type: 'serve' }, idempotencyKey: 'serve-one' }, a.cookie)).json();
  assert.deepEqual(retry, served);
  const other = await (await f.request('/player/state', undefined, b.cookie)).json(); assert.equal(other.world.coins, config.values.shift.startingCoinsBase); assert.equal(other.world.phase, 'resting');
  assert.equal((await (await f.request('/player/command', payload, b.cookie)).json()).result.ok, false);
  const changes = await (await f.request(`/player/events?after=${opened.lastEventSeq}`, undefined, a.cookie)).json();
  assert.equal(changes.events.filter((e: any) => e.event.type === 'order_served').length, 1);
  assert.ok(changes.events.every((e: any, i: number) => e.seq === opened.lastEventSeq + i + 1 && e.event.data.seed === undefined));
  const paused = await f.beat(a.cookie, { active: true, paused: true });
  const stock = await (await f.request('/player/command', { idempotencyKey: 'stock', command: { type: 'restock', dish: 'bia', mode: 'one' } }, a.cookie)).json(); assert.ok(stock.result.ok);
  await f.advance(40000); await f.close(); f.store.close(); const restarted = await f.open();
  const restored = await (await restarted.request('/player/state', undefined, a.cookie)).json();
  assert.equal(restored.world.paused, true); assert.equal(restored.world.shift.endsAt - restored.serverNow, paused.world.shift.endsAt - paused.serverNow);
  assert.equal(restored.world.coins, stock.world.coins); assert.equal(restored.world.inventory.bia, stock.world.inventory.bia);
  assert.equal((await restarted.request('/player/state', undefined, b.cookie)).status, 200);
});

test('identity, clock and totals cannot be supplied by clients; malformed JSON, query cursors and oversized bodies cannot mutate state', async t => {
  const f = await fixture(t), a = await guest(f), before = f.store.read(a.playerId);
  assert.equal((await f.request('/player/state')).status, 401);
  assert.equal((await f.request('/player/state', undefined, 'tbh-session=forged')).status, 401);
  assert.equal((await f.request('/player/state', undefined, `${a.cookie}; ${a.cookie}`)).status, 401);
  for (const body of [{ ...command('startShift'), at: Number.MAX_SAFE_INTEGER }, { ...command('startShift'), playerId: 'someone' },
    { ...command('startShift'), world: { coins: 1e12 } }, { idempotencyKey: 'bad', command: { type: 'activity', active: false, paused: true } },
    { idempotencyKey: 'system:connectionLost:shift-14:0', command: { type: 'connectionLost', shiftId: 'shift-14' } },
    { idempotencyKey: 'public-recovery', command: { type: 'connectionRestored', recoveryId: 'forged', active: false, paused: true } },
    { idempotencyKey: 'system:connectionRestored:forged', command: { type: 'connectionRestored', recoveryId: 'forged', active: true, paused: false } },
    { idempotencyKey: 'system:connectionLost:null:forged', command: { type: 'connectionLost', shiftId: null, lossId: 'forged' } },
    { ...command('startShift'), idempotencyKey: 'system:reserved' }, null]) {
    assert.equal((await f.request('/player/command', body, a.cookie)).status, 400);
  }
  assert.equal((await f.request('/auth/session', { playerId: a.playerId })).status, 400);
  for (const q of ['after=-1', 'after=1.5', 'after=999', 'after=0&after=0', 'after=0&playerId=someone', ''])
    assert.equal((await f.request(`/player/events?${q}`, undefined, a.cookie)).status, 400);
  assert.equal((await f.request('/player/state?playerId=someone', undefined, a.cookie)).status, 400);
  const bad = await fetch(f.url + '/player/command', { method: 'POST', headers: { Origin: ORIGIN, Cookie: a.cookie, 'Content-Type': 'application/json' }, body: '{bad' }); assert.equal(bad.status, 400);
  const large = await f.request('/player/command', { padding: 'x'.repeat(17000) }, a.cookie); assert.equal(large.status, 413);
  assert.equal((await f.request('/player/command', {}, a.cookie, { 'Content-Type': 'text/plain' })).status, 415);
  assert.deepEqual(f.store.read(a.playerId), before);
});

test('cookie sessions expire and revoke durably, store only hashes and refuse CSRF, cross-origin reads and hostile preflights', async t => {
  const f = await fixture(t, { sessionTtlMs: 10000 }), a = await guest(f);
  const db = new DatabaseSync(f.file); t.after(() => db.close()); const row = db.prepare('SELECT * FROM sessions').get()!;
  assert.notEqual(row.token_hash, a.cookie.split('=')[1]); assert.equal(row.player_id, a.playerId);
  const foreign = await f.request('/player/command', command('startShift'), a.cookie, { Origin: 'https://attacker.invalid' }); assert.equal(foreign.status, 403); assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  assert.equal((await f.request('/player/state', undefined, a.cookie, { Origin: 'null' })).status, 403);
  assert.equal((await f.request('/player/state', undefined, a.cookie, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await fetch(f.url + '/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  const preflight = await fetch(f.url + '/player/command', { method: 'OPTIONS', headers: { Origin: ORIGIN } }); assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), ORIGIN);
  const logout = await f.request('/auth/logout', {}, a.cookie); assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie')!, /1970/);
  await f.close(); f.store.close(); const reopened = await f.open(); assert.equal((await reopened.request('/player/state', undefined, a.cookie)).status, 401);
  const b = await guest({ ...f, ...reopened }); f.now += 10000;
  assert.equal((await reopened.request('/player/state', undefined, b.cookie)).status, 401);
  const fresh = await reopened.request('/auth/session', {}, b.cookie); assert.equal(fresh.status, 201);
  const freshOwner = await fresh.json(); assert.equal(freshOwner.previousGuestId, b.playerId); assert.notEqual(freshOwner.playerId, b.playerId);
  for (const cookie of ['tbh-session=', 'tbh-session', 'tbh-session=forged', `tbh-session=; ${b.cookie}`]) {
    const rejected = await reopened.request('/auth/session', {}, cookie);
    assert.equal(rejected.status, 401); assert.equal(rejected.headers.get('set-cookie'), null);
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM players').get()!.n, 3);
});

test('every public action refuses injected authority fields before durable command logging', async t => {
  const f = await fixture(t), a = await guest(f);
  const actions = {
    startShift: { type: 'startShift' }, endShift: { type: 'endShift' }, kickAll: { type: 'kickAll', shiftId: 'old', maxCost: 0 },
    serve: { type: 'serve', tableId: 'old', orderId: 'old' }, serveDelivery: { type: 'serveDelivery', deliveryId: 'old' },
    restock: { type: 'restock', dish: 'bia', mode: 'one' }, upgrade: { type: 'upgrade', kind: 'keg' },
    upgradeTable: { type: 'upgradeTable', tableId: 'old' }, buyTable: { type: 'buyTable' }, buyChair: { type: 'buyChair', tableId: 'old' }, buyGlass: { type: 'buyGlass', count: 1 }, upgradeDog: { type: 'upgradeDog', level: 1 },
    rentLocation: { type: 'rentLocation', locationId: 'ngo_cho', leaseId: null, maxCost: 0 }, leaveLocation: { type: 'leaveLocation', leaseId: 'old' },
    claimLifePath: { type: 'claimLifePath', level: 1 }, buyUnlock: { type: 'buyUnlock', item: 'phone' },
    claimAttendance: { type: 'claimAttendance', day: '2026-09-09' }, claimQuest: { type: 'claimQuest', day: '2026-09-09', questId: 'old' },
    claimDailyBonus: { type: 'claimDailyBonus', day: '2026-09-09' }, buyFlyer: { type: 'buyFlyer' },
    activateFlyer: { type: 'activateFlyer', shiftId: 'old' }, installSignboard: { type: 'installSignboard' },
    setSignboard: { type: 'setSignboard', style: 'wood' }, activity: { type: 'activity', active: true, paused: true }, emergencyPack: { type: 'emergencyPack' },
  } satisfies { [T in Command['type']]: Extract<Command, { type: T }> };
  const before = f.store.read(a.playerId);
  for (const action of Object.values(actions)) for (const extra of [{ at: NOW }, { playerId: 'someone' }, { world: { coins: 1e12 } }, { seed: 42 }, { arbitrary: true }]) {
    const response = await f.request('/player/command', { idempotencyKey: action.type, command: { ...action, ...extra } }, a.cookie);
    assert.equal(response.status, 400, `${action.type}: ${Object.keys(extra)[0]}`);
  }
  assert.deepEqual(f.store.read(a.playerId), before);
  const db = new DatabaseSync(f.file); t.after(() => db.close()); assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, 0);
  await f.registerClient(a.cookie); await f.beat(a.cookie);
  for (const action of Object.values(actions).filter(action => action.type !== 'activity'))
    assert.equal((await f.request('/player/command', { idempotencyKey: action.type, command: action }, a.cookie)).status, 200, action.type);
  const activity = await f.request('/player/command', { idempotencyKey: 'activity', command: actions.activity }, a.cookie);
  assert.equal(activity.status, 409); assert.equal((await activity.json()).error, 'presenceManaged');
});

test('long-lived players catch up in bounded repeatable pages across restart without replaying or advancing the game', async t => {
  const f = await fixture(t, { sessionTtlMs: 10 * 86400000 }), a = await guest(f, false), b = await guest(f, false);
  // Seed legacy server history internally; public commands now require heartbeat from the first action.
  let last = 0;
  for (let day = 0; day < 5 && last <= 200; day++) {
    f.now = NOW + day * 86400000;
    assert.ok(f.store.command(a.playerId, { idempotencyKey: `day-${day}`, command: { type: 'startShift' } }).result.ok);
    f.now += config.values.shift.durationMs; last = f.store.read(a.playerId).lastEventSeq;
  }
  assert.ok(last > 200);
  await f.close(); f.store.close(); const reopened = await f.open(), db = new DatabaseSync(f.file); t.after(() => db.close());
  const durable = () => db.prepare('SELECT now,revision,projection FROM players WHERE id=?').get(a.playerId);
  const before = durable(); f.now += 10000;
  const page = async (after: number) => { const r = await reopened.request(`/player/events?after=${after}`, undefined, a.cookie); assert.equal(r.status, 200); return r.json(); };
  const first = await page(0); assert.equal(first.events.length, 100); assert.equal(first.hasMore, true); assert.equal(first.lastEventSeq, 100);
  assert.deepEqual(await page(0), first);
  const events = [...first.events]; let cursor = first.lastEventSeq, more = first.hasMore;
  while (more) {
    const next = await page(cursor); assert.ok(next.events.length > 0 && next.events.length <= 100);
    assert.ok(next.lastEventSeq > cursor); events.push(...next.events); cursor = next.lastEventSeq; more = next.hasMore;
  }
  assert.equal(cursor, last); assert.equal(events.length, last);
  assert.ok(events.every((row, i) => row.seq === i + 1 && row.event.data.seed === undefined));
  assert.equal(new Set(events.map(row => row.event.id)).size, last);
  assert.deepEqual(await page(last), { playerId: a.playerId, events: [], lastEventSeq: last, hasMore: false });
  const other = await (await reopened.request('/player/events?after=0', undefined, b.cookie)).json(); assert.deepEqual(other.events, []);
  assert.deepEqual(durable(), before);
});

test('v1 SQLite players and event history survive auth migration; failed guest creation leaves no orphan player', async t => {
  const f = await fixture(t); f.store.createPlayer('legacy', 42); f.store.command('legacy', command('startShift') as never); const before = f.store.read('legacy');
  await f.close(); f.store.close(); const db = new DatabaseSync(f.file); t.after(() => db.close());
  db.exec('DROP TABLE registry_resolutions; DROP TABLE registry_support_uses; DROP TABLE registry_support; DROP TABLE registry_scopes; DROP TABLE admin_sessions; DROP TABLE admin_factors; DROP TABLE registry_measurements; DROP TABLE registry_audit; DROP TABLE registry_publications; DROP TABLE registry_approvals; DROP TABLE registry_proposals; DROP TABLE client_presence; DROP TABLE engine_checkpoints; DROP TABLE local_imports; DROP TABLE account_logins; DROP TABLE google_challenges; DROP TABLE google_accounts; DROP INDEX sessions_player; DROP TABLE client_receipts; DROP TABLE client_streams; DROP TABLE sessions; PRAGMA user_version=1');
  const migrated = await f.open(); assert.deepEqual(migrated.store.read('legacy'), before); assert.equal(db.prepare('PRAGMA user_version').get()!.user_version, 11);
  db.exec("CREATE TRIGGER test_session_failure BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'test:sessionFailure'); END");
  const fail = await migrated.request('/auth/session', {}); assert.equal(fail.status, 500); assert.deepEqual(await fail.json(), { error: 'serverError' }); assert.equal(fail.headers.get('set-cookie'), null);
  assert.equal(db.prepare('SELECT count(*) AS n FROM players').get()!.n, 1);
  db.exec('DROP TRIGGER test_session_failure'); assert.equal((await migrated.request('/auth/session', {})).status, 201);
});

test('configured HTTP rate limits apply before allocating players and invalid server options fail closed', async t => {
  const f = await fixture(t, { rateMax: 2 }); assert.equal((await f.request('/auth/session', {})).status, 201); assert.equal((await f.request('/auth/session', {})).status, 201);
  const refused = await f.request('/auth/session', {}); assert.equal(refused.status, 429); assert.ok(Number(refused.headers.get('retry-after')) > 0);
  const db = new DatabaseSync(f.file); t.after(() => db.close()); assert.equal(db.prepare('SELECT count(*) AS n FROM players').get()!.n, 2);
  for (const change of [{ origin: 'http://example.com' }, { origin: ORIGIN + '/' }, { rateMax: 0 }, { sessionTtlMs: NaN }])
    assert.throws(() => createGameServer(f.store, { origin: ORIGIN, sessionTtlMs: 1000, rateMax: 100, rateWindowMs: 1000, ...change }));
});


test('HTTPS deployment uses host-only Secure cookies and never exposes credentials in cached JSON', async t => {
  const origin = 'https://play.example.test', f = await fixture(t, { origin });
  const response = await f.request('/auth/session', {}, undefined, { Origin: origin });
  assert.equal(response.status, 201); assert.match(response.headers.get('set-cookie')!, /^__Host-tbh-session=[a-f0-9]{64}; Path=\//);
  assert.match(response.headers.get('set-cookie')!, /; Secure$/); assert.doesNotMatch(response.headers.get('set-cookie')!, /Domain=/);
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const payload = await response.json(); assert.deepEqual(Object.keys(payload).sort(), ['created', 'expiresAt', 'playerId', 'provider']);
});

test('HTTP requires owned stream sequencing, returns recoverable gap/conflict acknowledgements and resumes the exact cursor after restart', async t => {
  const f = await fixture(t), a = await guest(f), b = await guest(f);
  const send = (seq: number, key: string, action: Command, clientId = a.clientId) => f.request('/player/command', { clientId, clientSeq: seq, idempotencyKey: key, command: action }, a.cookie);
  const noSequence = await fetch(f.url + '/player/command', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Cookie: a.cookie }, body: JSON.stringify(command('startShift')) });
  assert.equal(noSequence.status, 400);
  const gap = await send(2, 'stock', { type: 'restock', dish: 'bia', mode: 'one' }); assert.equal(gap.status, 409);
  assert.equal((await gap.json()).acknowledgedSeq, 0);
  const opened = await send(1, 'start', { type: 'startShift' }); assert.equal(opened.status, 200); const accepted = await opened.json();
  assert.ok(accepted.result.ok); assert.equal(accepted.acknowledgedSeq, 1);
  assert.deepEqual(await (await send(1, 'start', { type: 'startShift' })).json(), accepted);
  for (const response of [await send(1, 'different', { type: 'startShift' }), await send(2, 'start', { type: 'endShift' })]) {
    assert.equal(response.status, 409); assert.equal((await response.json()).acknowledgedSeq, 1);
  }
  const foreign = await send(2, 'foreign', { type: 'endShift' }, b.clientId); assert.equal(foreign.status, 403); assert.deepEqual(await foreign.json(), { error: 'invalidClient' });
  assert.equal((await f.request('/player/connect', { clientId: a.clientId }, b.cookie)).status, 403);
  for (const body of [{ clientId: '' }, { clientId: null }, { clientId: a.clientId, at: NOW }, { clientSeq: 5 }]) assert.equal((await f.request('/player/connect', body, a.cookie)).status, 400);
  for (const clientSeq of [0, -1, 1.5, null, '2']) assert.equal((await f.request('/player/command', { ...command('startShift'), clientId: a.clientId, clientSeq }, a.cookie)).status, 400);
  await f.close(); f.store.close(); const reopened = await f.open();
  const resumed = await (await reopened.request('/player/connect', { clientId: a.clientId }, a.cookie)).json();
  assert.equal(resumed.clientId, a.clientId); assert.equal(resumed.acknowledgedSeq, 1); assert.deepEqual(resumed.world, accepted.world);
  const stock = { clientId: a.clientId, clientSeq: 2, idempotencyKey: 'stock', command: { type: 'restock', dish: 'bia', mode: 'one' } };
  const bought = await (await reopened.request('/player/command', stock, a.cookie)).json(); assert.ok(bought.result.ok); assert.equal(bought.acknowledgedSeq, 2);
  assert.deepEqual(await (await reopened.request('/player/command', stock, a.cookie)).json(), bought);
  assert.equal((await reopened.request('/player/command', { ...stock, clientSeq: 3 }, a.cookie, { Origin: 'https://attacker.invalid' })).status, 403);
  await reopened.request('/auth/logout', {}, a.cookie);
  assert.equal((await reopened.request('/player/command', stock, a.cookie)).status, 401);
});

test('competitive status is caller-only, never accepts client totals, and rechecks the exact session after legacy replay', async t => {
  const f = await fixture(t), g = await guest(f);
  assert.equal((await f.request('/player/competition')).status, 401);
  assert.equal((await f.request('/player/competition?playerId=another', undefined, g.cookie)).status, 400);
  assert.equal((await f.request('/player/competition', { earned: 999999, approved: true }, g.cookie)).status, 404);
  assert.equal((await f.request('/player/command', command('startShift'), g.cookie)).status, 200);
  const guestResult = await f.request('/player/competition', undefined, g.cookie);
  assert.equal(guestResult.status, 200); assert.equal(guestResult.headers.get('cache-control'), 'no-store');
  const unranked = await guestResult.json(); assert.equal(unranked.playerId, g.playerId); assert.equal(unranked.periods.length, 2);
  assert.ok(unranked.periods.every((p: { reason: string }) => p.reason === 'googleRequired'));
  const target = f.store.createGuestSession(86400000), account = f.store.signInGoogle(target.token, f.store.issueGoogleChallenge(target.token).nonce, { subject: 'ranked' }, 86400000);
  const game = new Game(config, 42, f.now, 'http-imported-score');
  game.command({ at: f.now, idempotencyKey: 'paused', command: { type: 'activity', active: true, paused: true } });
  const receipt = await f.store.claimLocal(account.token, encodeSave(game)), cookie = `tbh-session=${receipt.token}`;
  const response = await f.request('/player/competition', undefined, cookie); assert.equal(response.status, 200);
  const data = await response.json(); assert.deepEqual(Object.keys(data).sort(), ['periods', 'playerId', 'review', 'serverNow']); assert.equal(data.review, 'pending');
  const db = new DatabaseSync(f.file); t.after(() => db.close());
  db.exec("DROP TRIGGER registry_audit_delete; DELETE FROM registry_audit WHERE type='LocalImportBaseline'");
  let entered!: () => void; const began = new Promise<void>(resolve => { entered = resolve; });
  const original = f.store.competitiveStatus.bind(f.store);
  f.store.competitiveStatus = token => { const result = original(token); entered(); return result; };
  const pending = f.request('/player/competition', undefined, cookie);
  await began; f.store.revokeSession(receipt.token!);
  const denied = await pending; assert.equal(denied.status, 401); assert.deepEqual(await denied.json(), { error: 'invalidSession' });
  assert.equal((await f.request('/player/competition', undefined, g.cookie)).status, 200, 'another valid guest stays isolated');
});

test('public ranking is read-only, validates pages and hides private identities while authenticating its own row', async t => {
  const f = await fixture(t), g = await guest(f);
  const publicResponse = await f.request('/leaderboard?kind=ranking'); assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get('cache-control'), 'no-store');
  const empty = await publicResponse.json(); assert.equal(empty.viewer, null); assert.equal(empty.me, null);
  const guestBoard = await (await f.request('/leaderboard?kind=contest', undefined, g.cookie)).json();
  assert.equal(guestBoard.me, null); assert.deepEqual(guestBoard.viewer, { playerId: g.playerId, provider: 'guest' });
  for (const q of ['', '?kind=bad', '?kind=ranking&earned=100', '?kind=ranking&kind=contest', '?kind=ranking&page=-1', '?kind=ranking&page=1.2', '?kind=ranking&page=01', '?kind=ranking&page=9999999999999999999', '?kind=ranking&tier=unknown']) assert.equal((await f.request('/leaderboard' + q)).status, 400, q);
  assert.equal((await f.request('/leaderboard?kind=ranking&revision=' + 'f'.repeat(64))).status, 409);
  assert.equal((await f.request('/leaderboard', { earned: 100000, playerId: g.playerId }, g.cookie)).status, 404);
  assert.equal((await f.request('/leaderboard?kind=ranking', undefined, 'tbh-session=invalid')).status, 401);
  assert.equal((await f.request('/leaderboard?kind=ranking', undefined, undefined, { Origin: 'http://evil.test' })).status, 403);
  const target = f.store.createGuestSession(86400000), account = f.store.signInGoogle(target.token, f.store.issueGoogleChallenge(target.token).nonce, { subject: 'private-http-rank' }, 86400000);
  const own = await (await f.request('/leaderboard?kind=ranking', undefined, `tbh-session=${account.token}`)).json();
  assert.deepEqual(own.viewer, { playerId: account.playerId, provider: 'google' }); assert.equal(own.me, null); assert.equal(own.eligibility.reason, 'insufficientShifts');
  assert.ok(!JSON.stringify(own).includes('private-http-rank'));
  assert.deepEqual(Object.keys(own.eligibility).sort(), ['reason', 'review']);
  assert.equal(f.store.read(g.playerId).world.coins, config.values.shift.startingCoinsBase);
});
