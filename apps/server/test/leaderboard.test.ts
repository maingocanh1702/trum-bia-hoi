import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config, Game, encodeSave, loadConfig, type Command } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';
import { publicRankId } from '../src/leaderboard';
const NOW = Date.parse('2026-09-10T10:00:00Z');
function fixture(t: { after(fn: () => void): void }, settings: Partial<typeof config.raw.leaderboard> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-rank-')), path = join(dir, 'db');
  const raw = structuredClone(config.raw); raw._meta.version = 'rank-test'; raw.leaderboard.topN = 2; raw.leaderboard.neighborsWindow = 1;
  Object.assign(raw.leaderboard, settings);
  const c = loadConfig(raw); let now = NOW; const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(path, c, () => now); stores.push(s); return s; }, store = open(), db = new DatabaseSync(path);
  t.after(() => { stores.forEach(s => s.close()); db.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = () => ({ subject: 'game-admin', role: 'game' as const, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const add = async (id: string, delay = 0, approve = true, source = c, createdAt = NOW - 100000 + delay) => {
    const game = new Game(source, 42, createdAt, id);
    game.command({ at: game.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }); game.advance(game.world.now + 11100);
    const table = game.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
    assert.ok(game.command({ at: game.world.now, idempotencyKey: 'serve', command: { type: 'serve', tableId: table.id, orderId: table.order!.id } }).ok);
    game.command({ at: game.world.now, idempotencyKey: 'close', command: { type: 'endShift' } }); game.advance(game.world.now + 60000);
    assert.equal(game.world.completedShifts, 1); assert.ok(game.world.seasonEarned > 0);
    game.command({ at: game.world.now, idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
    const guest = store.createGuestSession(86400000), account = store.signInGoogle(guest.token, store.issueGoogleChallenge(guest.token).nonce, { subject: 'private-sub-' + id }, 86400000);
    const receipt = await store.claimLocal(account.token, encodeSave(game));
    if (approve) store.competition.decide(actor(), { type: 'import-review', key: 'approve-' + id, playerId: id, digest: receipt.digest, expectedSeq: 0, reason: 'Private review note', value: 'approved' });
    return { ...receipt, token: receipt.token!, world: game.world };
  };
  const send = (id: string, command: Command) => { const r = store.command(id, { idempotencyKey: String(store.read(id).revision) + '-rank', command }); assert.ok(r.result.ok, r.result.reason ?? 'command rejected'); return r.world; };
  return { store, db, open, c, actor, add, send, get now() { return now; }, set now(v: number) { now = v; } };
}
const query = { kind: 'ranking' as const, page: 0 };

test('actual imported careers rank by earnings then first reached then stable ID, with pages and own neighbors across tiers', async t => {
  const f = fixture(t), z = await f.add('z-first'), a = await f.add('a-later', 1000), b = await f.add('b-later', 1000), c = await f.add('c-last', 2000);
  assert.equal(z.world.seasonEarned, a.world.seasonEarned); assert.equal(a.world.seasonEarned, b.world.seasonEarned);
  const first = await f.store.leaderboard(query, c.token);
  assert.equal(first.total, 4); assert.deepEqual(first.rows.map(r => r.id), [publicRankId(z.playerId), publicRankId(a.playerId)]);
  assert.equal(first.me!.rank, 4); assert.deepEqual(first.neighbors.map(r => r.rank), [3]); assert.equal(first.nextPage, 1);
  const second = await f.store.leaderboard({ ...query, page: 1, revision: first.revision }, c.token);
  assert.deepEqual(second.rows.map(r => r.rank), [3, 4]); assert.equal(second.nextPage, null);
  const empty = await f.store.leaderboard({ ...query, tier: 'bac' }, a.token); assert.equal(empty.rows.length, 0); assert.equal(empty.me!.rank, 2); assert.deepEqual(empty.neighbors.map(r => r.rank), [1, 3]);
  assert.deepEqual((await f.open().leaderboard(query)).rows, first.rows);
  const contest = await f.store.leaderboard({ ...query, kind: 'contest' }); assert.equal(contest.period.kind, 'contest'); assert.equal(contest.total, 4);
  const anonymous = await f.store.leaderboard(query); assert.equal(anonymous.me, null); assert.equal(anonymous.viewer, null); assert.deepEqual(anonymous.neighbors, []);
  const serialized = JSON.stringify(anonymous); for (const privateText of ['private-sub-', 'Private review note', z.digest, z.token, z.playerId, 'commandSeq', 'expectedSeq']) assert.ok(!serialized.includes(privateText), privateText);
});

test('new Google membership and external admin flags or review reverse eligibility immediately and invalidate stale pages', async t => {
  const f = fixture(t), a = await f.add('eligible'), pending = await f.add('pending', 0, false);
  const first = await f.store.leaderboard(query); assert.equal(first.total, 1);
  const pendingView = await f.store.leaderboard(query, pending.token); assert.equal(pendingView.me, null); assert.equal(pendingView.eligibility.review, 'pending');
  const external = f.open(); const accepted = external.competition.decide(f.actor(), { type: 'import-review', key: 'accept', playerId: pending.playerId, digest: pending.digest, expectedSeq: 0, reason: 'Checked retained history', value: 'approved' });
  const approved = await f.store.leaderboard(query, pending.token); assert.equal(approved.total, 2); assert.ok(approved.me); assert.notEqual(approved.revision, first.revision);
  await assert.rejects(f.store.leaderboard({ ...query, revision: first.revision }), /stalePage/);
  const flag = external.competition.decide(f.actor(), { type: 'flag', key: 'flag', playerId: a.playerId, expectedSeq: 0, reason: 'Investigation', value: true });
  assert.equal((await f.store.leaderboard(query)).total, 1); assert.equal((await f.store.leaderboard(query, a.token)).eligibility.reason, 'flagged');
  assert.equal(flag.request.type, 'flag'); if (flag.request.type !== 'flag') throw Error('fixture');
  external.competition.decide(f.actor(), { ...flag.request, key: 'clear', expectedSeq: flag.seq, value: false }); assert.equal((await f.store.leaderboard(query)).total, 2);
  assert.equal(accepted.request.type, 'import-review'); if (accepted.request.type !== 'import-review') throw Error('fixture');
  external.competition.decide(f.actor(), { ...accepted.request, key: 'reject', expectedSeq: accepted.seq, value: 'rejected' }); assert.equal((await f.store.leaderboard(query)).total, 1);
  const g = f.store.createGuestSession(86400000); assert.equal((await f.store.leaderboard(query, g.token)).me, null); assert.equal((await f.store.leaderboard(query, g.token)).eligibility.reason, 'googleRequired');
  await f.add('new-google'); assert.equal((await f.store.leaderboard(query)).total, 2);
  assert.equal(f.store.read(a.playerId).world.coins, a.world.coins); assert.equal(f.store.read(pending.playerId).world.coins, pending.world.coins);
});

test('normal score snapshots honor refresh config and expire at the exact season boundary without rolling or crediting saves', async t => {
  const f = fixture(t), a = await f.add('refresh'); const before = await f.store.leaderboard(query, a.token);
  f.send(a.playerId, { type: 'activity', active: true, paused: false }); f.send(a.playerId, { type: 'startShift' }); f.now += 11100;
  let table = f.store.read(a.playerId).world.tables.find(t => t.order?.items.every(i => i.state === 'ready'));
  while (!table && f.now < before.refreshAt - 1000) { f.now += 1000; table = f.store.read(a.playerId).world.tables.find(t => t.order?.items.every(i => i.state === 'ready')); }
  assert.ok(table, JSON.stringify(f.store.read(a.playerId).world));
  f.send(a.playerId, { type: 'serve', tableId: table.id, orderId: table.order!.id });
  const cached = await f.store.leaderboard(query, a.token); assert.equal(cached.revision, before.revision); assert.equal(cached.me!.earned, before.me!.earned);
  f.now = before.refreshAt; const fresh = await f.store.leaderboard(query, a.token); assert.ok(fresh.me!.earned > before.me!.earned); assert.notEqual(fresh.revision, before.revision);
  await assert.rejects(f.store.leaderboard({ ...query, revision: before.revision }, a.token), /stalePage/);
  const projection = f.db.prepare('SELECT projection FROM players WHERE id=?').get(a.playerId)!.projection;
  f.now = fresh.period.endsAt; const rolled = await f.store.leaderboard(query); assert.equal(rolled.period.startsAt, fresh.period.endsAt); assert.equal(rolled.total, 0);
  assert.equal(f.db.prepare('SELECT projection FROM players WHERE id=?').get(a.playerId)!.projection, projection);
});

test('rank reads recover a missing baseline once, recheck expired sessions after recovery and refuse corrupt evidence or invalid queries', async t => {
  const f = fixture(t), a = await f.add('recover');
  for (const patch of [{ kind: 'bad' }, { tier: 'unknown' }, { page: -1 }, { page: NaN }, { page: 0.1 }, { page: Number.MAX_SAFE_INTEGER }, { revision: 'bad' }]) await assert.rejects(f.store.leaderboard({ ...query, ...patch } as typeof query), /invalidQuery|invalidPage/, JSON.stringify(patch));
  f.db.exec("DROP TRIGGER registry_audit_delete; DELETE FROM registry_audit WHERE type='LocalImportBaseline'");
  const recovering = f.open(), pending = recovering.leaderboard(query, a.token); f.store.revokeSession(a.token); await assert.rejects(pending, /invalidSession/);
  const anonymous = await recovering.leaderboard(query); assert.equal(anonymous.total, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='LocalImportBaseline'").get()!.n, 1);
  f.db.exec("DROP TRIGGER registry_audit_update; UPDATE registry_audit SET payload=json_set(payload,'$.hash','corrupt') WHERE type='LocalImportBaseline'");
  await assert.rejects(f.open().leaderboard(query), /invalidBaseline/);
  await assert.rejects(f.store.leaderboard(query, a.token), /invalidSession/);
});

test('season capture uses boundary eligibility and scores, restores pre-end unflags and remains immutable across restart and account removal', async t => {
  const f = fixture(t), a = await f.add('archive-a'), b = await f.add('archive-b', 1000), c = await f.add('archive-flagged', 2000);
  const before = await f.store.leaderboard(query), end = before.period.endsAt;
  const flag = (id: string, value: boolean) => f.store.competition.decide(f.actor(), { type: 'flag', key: `${id}-${value}-${f.now}`, playerId: id,
    expectedSeq: f.store.competition.state(id).flag.seq, reason: 'Season moderation', value });
  f.now = end - 2; flag(a.playerId, true); flag(c.playerId, true);
  f.now = end - 1; flag(a.playerId, false);
  assert.equal((await f.store.seasonHistory()).length, 0);
  // Delayed startup must use decisions at the boundary, not these later changes.
  f.now = end + 1000; flag(b.playerId, true); flag(c.playerId, false);
  const history = await f.store.seasonHistory(), snapshot = history.find(s => s.period.id === before.period.id)!;
  assert.ok(snapshot); assert.deepEqual(snapshot.rows.map(r => r.id), [publicRankId(a.playerId), publicRankId(b.playerId)]);
  assert.equal(snapshot.rows[0].earned, before.rows[0].earned); assert.equal(snapshot.rows[0].reputation, before.rows[0].reputation);
  assert.deepEqual(snapshot.rows[0].name, { key: 'rank.alias', id: publicRankId(a.playerId).slice(0, 8).toUpperCase() });
  await Promise.all([f.open().sweepSeasons(), f.store.sweepSeasons()]);
  assert.deepEqual(await f.store.seasonHistory(), history);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='SeasonSnapshot' AND json_extract(payload,'$.period.id')=?").get(snapshot.period.id)!.n, 1);
  assert.throws(() => f.db.prepare("UPDATE registry_audit SET payload='{}' WHERE type='SeasonSnapshot'").run(), /appendOnly/);
  assert.throws(() => f.db.prepare("DELETE FROM registry_audit WHERE type='SeasonSnapshot'").run(), /appendOnly/);
  // No profile rename/delete endpoint ships yet. Remove mutable account sources directly;
  // the history contract must not join them or derive the captured alias again.
  f.db.exec('PRAGMA foreign_keys=OFF');
  f.db.prepare('UPDATE google_accounts SET subject=? WHERE player_id=?').run('renamed-account-source', a.playerId);
  f.db.prepare('DELETE FROM google_accounts WHERE player_id IN (?,?)').run(a.playerId, b.playerId);
  f.db.exec('PRAGMA foreign_keys=ON');
  assert.deepEqual(await f.open().seasonHistory(), history);
  const text = JSON.stringify(history);
  for (const secret of [a.playerId, a.digest, a.token, 'private-sub-', 'Season moderation', 'expectedSeq']) assert.ok(!text.includes(secret), secret);
});

test('after-end import approval or Google attachment cannot rewrite a past season, while both calendar kinds capture automatically', async t => {
  const f = fixture(t), pending = await f.add('archive-pending', 0, false), approved = await f.add('archive-approved', 1000);
  const live = await f.store.leaderboard(query), contest = await f.store.leaderboard({ ...query, kind: 'contest' });
  f.now = Math.max(live.period.endsAt, contest.period.endsAt) + 1000;
  f.store.competition.decide(f.actor(), { type: 'import-review', key: 'late-approve', playerId: pending.playerId, digest: pending.digest, expectedSeq: 0, reason: 'Approved after season', value: 'approved' });
  const history = await f.store.seasonHistory();
  for (const period of [live.period, contest.period]) {
    const snapshot = history.find(s => s.period.id === period.id)!;
    assert.ok(snapshot); assert.deepEqual(snapshot.rows.map(r => r.id), [publicRankId(approved.playerId)]);
  }
  // Old local career attached only now is not retroactive season membership.
  await f.add('archive-late-member', 2000);
  assert.deepEqual(await f.store.seasonHistory(), history);
  const world = f.store.read(approved.playerId).world;
  assert.equal(world.coins, approved.world.coins); assert.equal(world.seasons!.results.filter(s => s.id === live.period.id).length, 1);
});

test('startup closes ended seasons without a player request and public history is read-only', async t => {
  const f = fixture(t), a = await f.add('startup-history');
  const end = a.world.seasons!.ranking.endsAt; f.now = end;
  const server = createGameServer(f.store, { origin: 'http://127.0.0.1:5174', sessionTtlMs: 86400000, rateWindowMs: 60000, rateMax: 100 });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  try {
    // Drain the server's actual startup sweep, independently of history GET.
    await f.store.sweepSeasons();
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='SeasonSnapshot' AND json_extract(payload,'$.period.id')=?").get(a.world.seasons!.ranking.id)!.n, 1);
    const port = (server.address() as { port: number }).port, url = `http://127.0.0.1:${port}/seasons/history`;
    const r = await fetch(url); assert.equal(r.status, 200); const body = await r.json(); assert.ok(body.length > 0);
    assert.equal(body[0].rows[0].id, publicRankId(a.playerId)); assert.equal(r.headers.get('set-cookie'), null);
    assert.equal((await fetch(url + '?playerId=private')).status, 400);
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});

test('worker capture does not hold the live writer, preserves saves, and stores only configured wall rows and visible season count', async t => {
  const f = fixture(t, { shrineTop: 1, wallSize: 2, historySeasonsKept: 1 });
  const a = await f.add('wall-first'), b = await f.add('wall-second', 1000); await f.add('wall-third', 2000);
  assert.equal((await f.store.leaderboard(query)).total, 3);
  const before = f.db.prepare('SELECT id,projection FROM players ORDER BY id').all();
  f.now = a.world.seasons!.ranking.endsAt;
  const pending = f.store.seasonHistory();
  await new Promise<void>(resolve => setImmediate(resolve));
  // Native backup/worker yields to normal requests and has no live BEGIN IMMEDIATE.
  const guest = f.store.createGuestSession(86400000); assert.ok(guest.playerId);
  const history = await pending; assert.equal(history.length, 1);
  for (const row of f.db.prepare("SELECT payload FROM registry_audit WHERE type='SeasonSnapshot'").all()) {
    const s = JSON.parse(String(row.payload)); assert.equal(s.shrineTop, 1); assert.equal(s.wallSize, 2);
    assert.deepEqual(s.rows.map((r: { id: string }) => r.id), [publicRankId(a.playerId), publicRankId(b.playerId)]);
  }
  for (const row of before) assert.equal(f.db.prepare('SELECT projection FROM players WHERE id=?').get(row.id)!.projection, row.projection);
});

test('a pre-registry imported season keeps its retained configuration instead of the seed publication effective at zero', async t => {
  const f = fixture(t, { shrineTop: 1, wallSize: 2 });
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(config.version, JSON.stringify(config.raw));
  const old = await f.add('old-season-pin', 0, true, config, NOW - 14 * 86400000);
  const history = await f.store.seasonHistory();
  const snapshot = history.find(s => s.period.id === old.world.seasons!.ranking.id)!;
  assert.ok(snapshot); assert.equal(snapshot.configVersion, config.version);
  assert.equal(snapshot.shrineTop, config.values.leaderboard.shrineTop); assert.equal(snapshot.wallSize, config.values.leaderboard.wallSize);
  assert.equal(snapshot.rows.length, 0); // Account/import approval happened after the old season ended.
});

test('a later registry publication cannot truncate a previously pinned season archive', async t => {
  const f = fixture(t), a = await f.add('pinned-archive-a'); await f.add('pinned-archive-b', 1000);
  const raw = structuredClone(f.c.raw); raw._meta.version = 'later-archive'; raw.leaderboard.shrineTop = 1; raw.leaderboard.wallSize = 1;
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(raw._meta.version, JSON.stringify(raw));
  const end = a.world.seasons!.ranking.endsAt;
  // Historical publication already exists; capture must still honor the original season pin.
  f.db.prepare('INSERT INTO registry_publications VALUES (NULL,?,?,?,?,?)').run(raw._meta.version, end - 1000, end - 2000, 'admin', 'reviewer');
  f.now = end;
  const s = (await f.store.seasonHistory()).find(s => s.period.id === a.world.seasons!.ranking.id)!;
  assert.equal(s.configVersion, f.c.version); assert.equal(s.wallSize, f.c.values.leaderboard.wallSize); assert.equal(s.rows.length, 2);
});

test('staggered HTTP heartbeats cannot postpone automatic season capture', async t => {
  const f = fixture(t), a = await f.add('busy-server-archive'), end = a.world.seasons!.ranking.endsAt;
  f.now = end - 500;
  const clients = [0, 1].map(() => { const s = f.store.createGuestSession(86400000); return { ...s, ...f.store.connect(s.playerId), seq: 0 }; });
  const server = createGameServer(f.store, { origin: 'http://127.0.0.1:5174', sessionTtlMs: 86400000, rateWindowMs: 60000, rateMax: 1000 });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  try {
    f.now = end;
    const until = Date.now() + 5000;
    while (Date.now() < until) {
      for (const c of clients) {
        const r = await fetch(`http://127.0.0.1:${port}/player/heartbeat`, { method: 'POST', headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json', Cookie: 'tbh-session=' + c.token },
          body: JSON.stringify({ clientId: c.clientId, beatSeq: ++c.seq, active: true, paused: false }) });
        assert.equal(r.status, 200); await r.arrayBuffer();
        await new Promise(r => setTimeout(r, 40));
      }
      if (f.db.prepare("SELECT 1 FROM registry_audit WHERE type='SeasonSnapshot'").get()) break;
    }
    assert.ok(f.db.prepare("SELECT 1 FROM registry_audit WHERE type='SeasonSnapshot' AND json_extract(payload,'$.period.id')=?").get(a.world.seasons!.ranking.id));
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});

test('historical invalid live display knobs do not prevent freezing valid pinned archive settings', async t => {
  const f = fixture(t, { topN: 0, refreshMs: 0 }), a = await f.add('legacy-display');
  const fixed = structuredClone(f.c.raw); fixed._meta.version = 'corrected-display'; fixed.leaderboard.topN = 2; fixed.leaderboard.refreshMs = config.raw.leaderboard.refreshMs;
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(fixed._meta.version, JSON.stringify(fixed));
  f.db.prepare('INSERT INTO registry_publications VALUES (NULL,?,?,?,?,?)').run(fixed._meta.version, f.now, f.now, 'admin', 'reviewer');
  f.now = a.world.seasons!.ranking.endsAt;
  const s = (await f.store.seasonHistory()).find(s => s.period.id === a.world.seasons!.ranking.id)!;
  assert.equal(s.configVersion, f.c.version); assert.equal(s.wallSize, f.c.values.leaderboard.wallSize); assert.equal(s.rows[0].id, publicRankId(a.playerId));
});
