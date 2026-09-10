import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Game, config, encodeSave } from '@tbh/engine';
import { GameStore } from '../src/store';
import { Competition, type CompetitionRequest } from '../src/competition';
import type { AdminActor } from '../src/registry';
const NOW = Date.parse('2026-09-10T10:00:00Z');
function fixture(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-competition-')), file = join(dir, 'game.db');
  let now = NOW; const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, config, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  t.after(() => { stores.forEach(s => s.close()); db.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = (role: AdminActor['role'] = 'game', subject: string = role): AdminActor => ({ subject, role, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const login = () => { const g = store.createGuestSession(86400000); return store.signInGoogle(g.token, store.issueGoogleChallenge(g.token).nonce, { subject: 'player-one' }, 86400000); };
  const imported = async () => {
    const account = login(), game = new Game(config, 42, NOW - 11100, 'local-reviewed');
    game.command({ at: game.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }); game.advance(NOW);
    const table = game.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
    assert.ok(game.command({ at: NOW, idempotencyKey: 'serve', command: { type: 'serve', tableId: table.id, orderId: table.order!.id } }).ok);
    game.command({ at: NOW, idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
    const text = encodeSave(game), receipt = await store.claimLocal(account.token, text);
    return { text, receipt, before: store.read(receipt.playerId) };
  };
  const audits = () => db.prepare("SELECT * FROM registry_audit WHERE type IN ('LocalHistoryReviewed','PlayerFlagChanged')").all();
  return { store, db, open, actor, login, imported, audits, get now() { return now; }, set now(v) { now = v; } };
}

test('reviewing the exact imported archive updates only provenance, survives restart, and never credits its live shift twice', async t => {
  const f = fixture(t), { receipt, before, text } = await f.imported(), c = f.store.competition;
  const input: CompetitionRequest = { type: 'import-review', key: 'review-one', playerId: receipt.playerId, digest: receipt.digest, expectedSeq: 0, reason: 'Reviewed the retained local replay', value: 'approved' };
  assert.equal(c.state(receipt.playerId).localImport!.review.value, 'pending');
  const done = c.decide(f.actor(), input);
  assert.equal(done.before, 'pending'); assert.equal(done.actor, 'game'); assert.equal(done.at, NOW);
  assert.equal(f.store.localImport(receipt.token!)!.review, 'approved');
  const reopened = f.open(); assert.deepEqual(reopened.competition.decide(f.actor(), input), done);
  assert.equal((await reopened.claimLocal(receipt.token!, text)).review, 'approved');
  assert.deepEqual(reopened.read(receipt.playerId), before); assert.equal(f.audits().length, 1);
  const original = f.db.prepare('SELECT original_gzip FROM local_imports WHERE player_id=?').get(receipt.playerId)!.original_gzip;
  const reversed = c.decide(f.actor('super'), { ...input, key: 'reject', expectedSeq: done.seq, value: 'rejected', reason: 'Additional evidence invalidated the local clock' });
  assert.deepEqual(reopened.competition.decide(f.actor(), input), done, 'old retry returns its receipt without undoing a later review');
  assert.equal(reopened.localImport(receipt.token!)!.review, 'rejected');
  c.decide(f.actor(), { ...input, key: 'appeal', expectedSeq: reversed.seq, reason: 'Appeal replay and timestamps independently verified' });
  assert.equal(reopened.localImport(receipt.token!)!.review, 'approved');
  assert.deepEqual(reopened.read(receipt.playerId), before);
  assert.deepEqual(f.db.prepare('SELECT original_gzip FROM local_imports WHERE player_id=?').get(receipt.playerId)!.original_gzip, original);
  assert.equal(f.audits().length, 3);
});

test('competing admins must use the current decision and one request key cannot be reused across players or actions', async t => {
  const f = fixture(t), { receipt } = await f.imported(), c = f.store.competition;
  f.store.createPlayer('second', 43);
  const input: CompetitionRequest = { type: 'flag', key: 'global-key', playerId: receipt.playerId, expectedSeq: 0, reason: 'Investigate timing', value: true };
  const done = c.decide(f.actor(), input), other = f.open().competition;
  assert.equal(other.state(receipt.playerId).flag.value, true);
  assert.throws(() => other.decide(f.actor('super'), { ...input, key: 'stale', value: false }), /staleDecision/);
  assert.throws(() => c.decide(f.actor(), { ...input, reason: 'different' }), /keyConflict/);
  assert.throws(() => c.decide(f.actor(), { ...input, playerId: 'second' }), /keyConflict/);
  assert.throws(() => c.decide(f.actor(), { ...input, type: 'import-review', digest: receipt.digest, value: 'approved' }), /keyConflict/);
  assert.throws(() => c.decide(f.actor(), { ...input, key: 'unchanged', expectedSeq: done.seq }), /noChange/);
  const cleared = other.decide(f.actor('super'), { ...input, key: 'clear', expectedSeq: done.seq, value: false, reason: 'Investigation cleared' });
  assert.equal(cleared.before, true); assert.equal(c.state(receipt.playerId).flag.value, false);
  assert.deepEqual(c.decide(f.actor(), input), done); assert.equal(c.state(receipt.playerId).flag.seq, cleared.seq);
  assert.equal(f.audits().length, 2);
});

test('guest and linked server progress are not imported history; malformed review requests cannot fabricate provenance', t => {
  const f = fixture(t), guest = f.store.createGuestSession(86400000), c = f.store.competition;
  assert.equal(c.state(guest.playerId).provider, 'guest'); assert.equal(c.state(guest.playerId).localImport, null);
  const account = f.store.signInGoogle(guest.token, f.store.issueGoogleChallenge(guest.token).nonce, { subject: 'direct' }, 86400000);
  assert.equal(c.state(account.playerId).provider, 'google'); assert.equal(c.state(account.playerId).localImport, null);
  const input: CompetitionRequest = { type: 'import-review', key: 'invented', playerId: account.playerId, digest: 'a'.repeat(64), expectedSeq: 0, reason: 'No actual archive', value: 'approved' };
  assert.throws(() => c.decide(f.actor(), input), /importConflict/);
  for (const patch of [{ expectedSeq: -1 }, { expectedSeq: 0.5 }, { reason: '' }, { digest: 'bad' }, { value: 'pending' }, { type: 'ban' }, { playerId: '' }, { role: 'super' }]) {
    assert.throws(() => c.decide(f.actor(), { ...input, ...patch } as CompetitionRequest), /invalidInput/);
  }
  assert.throws(() => c.state('absent'), /missingPlayer/); assert.equal(f.audits().length, 0);
});

test('wrong archive digest or moved identity is refused and failed audit cannot leave a review applied', async t => {
  const f = fixture(t), { receipt, before } = await f.imported(), c = f.store.competition;
  const input: CompetitionRequest = { type: 'import-review', key: 'review', playerId: receipt.playerId, digest: receipt.digest, expectedSeq: 0, reason: 'Verified archive', value: 'approved' };
  assert.throws(() => c.decide(f.actor(), { ...input, digest: 'a'.repeat(64) }), /importConflict/);
  f.db.exec("CREATE TRIGGER fail_competition BEFORE INSERT ON registry_audit WHEN NEW.type='LocalHistoryReviewed' BEGIN SELECT RAISE(ABORT,'test:auditFailed'); END;");
  assert.throws(() => c.decide(f.actor(), input), /auditFailed/); assert.equal(c.state(receipt.playerId).localImport!.review.value, 'pending');
  f.db.exec('DROP TRIGGER fail_competition'); const done = c.decide(f.actor(), input);
  assert.equal(done.before, 'pending'); assert.deepEqual(f.store.read(receipt.playerId), before);
  f.store.createPlayer('moved', 1); f.db.prepare('UPDATE google_accounts SET player_id=? WHERE player_id=?').run('moved', receipt.playerId);
  assert.throws(() => c.state(receipt.playerId), /importOwnerChanged/);
  assert.throws(() => c.decide(f.actor(), { ...input, key: 'stale-owner', expectedSeq: done.seq, value: 'rejected' }), /importOwnerChanged/);
  assert.equal(f.audits().length, 1);
  assert.throws(() => f.db.exec("DELETE FROM registry_audit WHERE type='LocalHistoryReviewed'"), /appendOnly/);
});

test('only current MFA Game or Super claims may decide, Support inspection is audited, and bad clocks fail closed', t => {
  const f = fixture(t), player = f.store.createPlayer('moderated', 42), c = f.store.competition;
  const input: CompetitionRequest = { type: 'flag', key: 'one', playerId: player.world.playerId, expectedSeq: 0, reason: 'Review', value: true };
  for (const role of ['economy', 'viewer', 'support'] as const) assert.throws(() => c.decide(f.actor(role), input), /forbidden/);
  for (const actor of [{ ...f.actor(), mfa: false }, { ...f.actor(), expiresAt: NOW }, { ...f.actor(), issuedAt: NOW + 1 }]) assert.throws(() => c.decide(actor, input), /invalidActor/);
  assert.equal(c.inspect(f.actor('support'), player.world.playerId).flag.value, false);
  for (const role of ['economy', 'viewer'] as const) assert.throws(() => c.inspect(f.actor(role), player.world.playerId), /forbidden/);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='CompetitionInspected'").get()!.n, 1);
  const invalid = new Competition(f.db, () => NaN); assert.throws(() => invalid.decide(f.actor(), input), /invalidClock/);
  assert.equal(f.audits().length, 0); assert.equal(c.state(player.world.playerId).flag.value, false);
});
