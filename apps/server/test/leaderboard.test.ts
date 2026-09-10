import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config, Game, encodeSave, loadConfig, type Command } from '@tbh/engine';
import { GameStore } from '../src/store';
import { publicRankId } from '../src/leaderboard';
const NOW = Date.parse('2026-09-10T10:00:00Z');
function fixture(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-rank-')), path = join(dir, 'db');
  const raw = structuredClone(config.raw); raw._meta.version = 'rank-test'; raw.leaderboard.topN = 2; raw.leaderboard.neighborsWindow = 1;
  const c = loadConfig(raw); let now = NOW; const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(path, c, () => now); stores.push(s); return s; }, store = open(), db = new DatabaseSync(path);
  t.after(() => { stores.forEach(s => s.close()); db.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = () => ({ subject: 'game-admin', role: 'game' as const, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const add = async (id: string, delay = 0, approve = true) => {
    const game = new Game(c, 42, NOW - 100000 + delay, id);
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
