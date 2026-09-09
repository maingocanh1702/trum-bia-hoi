import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { GameStore } from '../src/store';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function fixture(t: { after(fn: () => void): void }) {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa/accounts-')), file = resolve(dir, 'game.db');
  let now = Date.parse('2026-09-10T10:00:00Z'); const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, undefined, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  t.after(() => { db.close(); for (const s of stores) s.close(); rmSync(dir, { force: true, recursive: true }); });
  return { db, open, store, get now() { return now; }, set now(v: number) { now = v; } };
}
const signIn = (s: GameStore, token: string, subject: string, keepAccount = false) =>
  s.signInGoogle(token, s.issueGoogleChallenge(token).nonce, { subject }, 86400000, keepAccount);

test('linking a server guest mid-shift preserves its exact world, history and command receipts across restart', t => {
  const f = fixture(t), s = f.store, guest = s.createGuestSession(86400000);
  const stream = s.connect(guest.playerId), request = { clientId: stream.clientId, clientSeq: 1, idempotencyKey: 'open', command: { type: 'startShift' as const } };
  s.clientCommand(guest.playerId, request); f.now += 11100;
  const order = s.read(guest.playerId).world.tables.find(x => x.order?.items.every(i => i.state === 'ready'))!.order!;
  const table = s.read(guest.playerId).world.tables.find(x => x.order?.id === order.id)!;
  const served = s.clientCommand(guest.playerId, { ...request, clientSeq: 2, idempotencyKey: 'served', command: { type: 'serve', tableId: table.id, orderId: order.id } });
  assert.ok(served.result?.ok);
  s.command(guest.playerId, { idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
  const before = s.read(guest.playerId), challenge = s.issueGoogleChallenge(guest.token);
  const otherGuestToken = 'b'.repeat(64);
  f.db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(hash(otherGuestToken), guest.playerId, f.now, guest.expiresAt);
  s.issueGoogleChallenge(otherGuestToken);
  const linked = s.signInGoogle(guest.token, challenge.nonce, { subject: 'google-one' }, 86400000);
  assert.equal(linked.playerId, guest.playerId); assert.equal(linked.provider, 'google'); assert.notEqual(linked.token, guest.token);
  assert.deepEqual(s.read(linked.playerId), before); assert.equal(s.session(guest.token), null);
  assert.equal(s.session(otherGuestToken), null); assert.throws(() => s.googleChallenge(otherGuestToken), /invalidGoogleChallenge/);
  assert.throws(() => s.googleChallenge(guest.token), /invalidGoogleChallenge/);
  const sessionRow = f.db.prepare('SELECT * FROM sessions WHERE token_hash=?').get(hash(linked.token))!;
  assert.equal(sessionRow.player_id, guest.playerId); assert.ok(!JSON.stringify(sessionRow).includes(linked.token));
  assert.equal(f.db.prepare('SELECT action FROM account_logins').get()!.action, 'link');
  assert.throws(() => f.db.exec('DELETE FROM account_logins'), /appendOnly/);
  s.close(); const reopened = f.open(); assert.equal(reopened.session(linked.token)!.provider, 'google');
  assert.deepEqual(reopened.read(linked.playerId), before);
  assert.deepEqual(reopened.clientCommand(linked.playerId, request).result, { ok: true });
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM commands WHERE idempotency_key=?').get('open')!.n, 1);
});

test('existing Google progress conflicts without mutation; explicit keep-account switches without merging either history', t => {
  const f = fixture(t), s = f.store, a = s.createGuestSession(86400000), b = s.createGuestSession(86400000);
  s.command(a.playerId, { idempotencyKey: 'a-open', command: { type: 'startShift' } });
  const account = signIn(s, a.token, 'same-subject'), beforeA = s.read(a.playerId), beforeB = s.read(b.playerId);
  const challenge = s.issueGoogleChallenge(b.token);
  assert.throws(() => s.signInGoogle(b.token, challenge.nonce, { subject: 'same-subject' }, 86400000), /accountConflict/);
  assert.equal(s.session(b.token)!.provider, 'guest'); assert.deepEqual(s.googleChallenge(b.token), challenge);
  assert.deepEqual(s.read(a.playerId), beforeA); assert.deepEqual(s.read(b.playerId), beforeB);
  const switched = s.signInGoogle(b.token, challenge.nonce, { subject: 'same-subject' }, 86400000, true);
  assert.equal(switched.playerId, a.playerId); assert.ok(s.session(account.token), 'other account devices stay logged in');
  assert.equal(s.session(b.token), null); assert.deepEqual(s.read(a.playerId), beforeA); assert.deepEqual(s.read(b.playerId), beforeB);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM google_accounts').get()!.n, 1);
  assert.deepEqual(f.db.prepare('SELECT action FROM account_logins ORDER BY rowid').all().map(x => x.action), ['link', 'switch']);
  const renewed = signIn(s, switched.token, 'same-subject'); assert.equal(renewed.playerId, a.playerId);
  assert.equal(s.session(switched.token), null); assert.ok(s.session(account.token));
  assert.throws(() => signIn(s, renewed.token, 'different-unregistered-subject', true), /signOutRequired/);
});

test('a logout, expiry, replaced nonce or other session cannot consume a pending Google authentication', t => {
  const f = fixture(t), s = f.store, a = s.createGuestSession(86400000), b = s.createGuestSession(86400000);
  const old = s.issueGoogleChallenge(a.token), current = s.issueGoogleChallenge(a.token);
  assert.notEqual(old.nonce, current.nonce); s.issueGoogleChallenge(b.token);
  for (const token of [a.token, b.token]) assert.throws(() => s.signInGoogle(token, old.nonce, { subject: 'one' }, 86400000), /invalidGoogleChallenge/);
  s.revokeSession(a.token);
  assert.throws(() => s.signInGoogle(a.token, current.nonce, { subject: 'one' }, 86400000), /invalidSession/);
  const challenge = s.issueGoogleChallenge(b.token); f.now = challenge.expiresAt;
  assert.throws(() => s.signInGoogle(b.token, challenge.nonce, { subject: 'one' }, 86400000), /invalidGoogleChallenge/);
  const short = s.createGuestSession(100), shortChallenge = s.issueGoogleChallenge(short.token);
  assert.equal(shortChallenge.expiresAt, short.expiresAt); f.now = short.expiresAt;
  assert.throws(() => s.signInGoogle(short.token, shortChallenge.nonce, { subject: 'one' }, 86400000), /invalidSession/);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM google_accounts').get()!.n, 0);
});

test('authentication commits mapping, consumed nonce, revoked credentials, new session and audit atomically', t => {
  const f = fixture(t), s = f.store, guest = s.createGuestSession(86400000), challenge = s.issueGoogleChallenge(guest.token);
  const before = s.read(guest.playerId);
  f.db.exec("CREATE TRIGGER test_auth_failure BEFORE INSERT ON account_logins BEGIN SELECT RAISE(ABORT,'test:authFailure'); END");
  assert.throws(() => s.signInGoogle(guest.token, challenge.nonce, { subject: 'one' }, 86400000), /authFailure/);
  assert.equal(s.session(guest.token)!.provider, 'guest'); assert.deepEqual(s.googleChallenge(guest.token), challenge);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM google_accounts').get()!.n, 0);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM sessions').get()!.n, 1);
  assert.deepEqual(s.read(guest.playerId), before);
  f.db.exec('DROP TRIGGER test_auth_failure');
  const signed = s.signInGoogle(guest.token, challenge.nonce, { subject: 'one' }, 86400000);
  assert.equal(s.session(signed.token)!.provider, 'google');
  assert.throws(() => s.signInGoogle(guest.token, challenge.nonce, { subject: 'one' }, 86400000), /invalidSession/);
});

test('two SQLite connections cannot reuse a nonce, claim one guest twice or fork one Google account', t => {
  const f = fixture(t), a = f.store, b = f.open(), guest = a.createGuestSession(86400000), challenge = a.issueGoogleChallenge(guest.token);
  const signed = b.signInGoogle(guest.token, challenge.nonce, { subject: 'one' }, 86400000);
  assert.equal(a.session(signed.token)!.provider, 'google');
  assert.throws(() => a.signInGoogle(guest.token, challenge.nonce, { subject: 'two' }, 86400000), /invalidSession/);
  const other = a.createGuestSession(86400000), another = a.issueGoogleChallenge(other.token);
  assert.throws(() => b.signInGoogle(other.token, another.nonce, { subject: 'one' }, 86400000), /accountConflict/);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM google_accounts').get()!.n, 1);
  for (const subject of ['', 'bad subject', 'x'.repeat(256)]) assert.throws(() => a.signInGoogle(other.token, another.nonce, { subject }, 86400000), /invalidGoogleIdentity/);
  for (const ttl of [NaN, 0, Number.MAX_SAFE_INTEGER - f.now]) {
    assert.throws(() => a.signInGoogle(other.token, another.nonce, { subject: 'two' }, ttl), /invalidSessionTtl/);
    assert.throws(() => a.createGuestSession(ttl), /invalidSessionTtl/);
  }
  assert.deepEqual(a.googleChallenge(other.token), another);
});

test('schema3 migration preserves guest credentials, active history and ordered receipts without inventing an account', t => {
  const f = fixture(t), s = f.store, guest = s.createGuestSession(86400000), stream = s.connect(guest.playerId);
  const before = s.clientCommand(guest.playerId, { clientId: stream.clientId, clientSeq: 1, idempotencyKey: 'open', command: { type: 'startShift' } });
  s.close(); f.db.exec('DROP TABLE account_logins; DROP TABLE google_challenges; DROP TABLE google_accounts; DROP INDEX sessions_player; PRAGMA user_version=3');
  const migrated = f.open(); assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 4);
  assert.equal(migrated.session(guest.token)!.provider, 'guest'); assert.deepEqual(migrated.read(guest.playerId).world, before.world);
  assert.equal(migrated.connect(guest.playerId, stream.clientId).acknowledgedSeq, 1);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM google_accounts').get()!.n, 0);
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
});
