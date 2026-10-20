import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';
import { syncBuiltinESMExports } from 'node:module';
import { Game, config, encodeSave, loadConfig, type Command, type Config, type World } from '@tbh/engine';
import { importBaseline, competitivePeriods } from '../src/competitive-score';
import { GameStore } from '../src/store';
import { Competition, type CompetitionRequest } from '../src/competition';
import type { AdminActor } from '../src/registry';
const NOW = Date.parse('2026-09-10T10:00:00Z');
/** The calendar the window test below was written for: a weekly ranking inside a two-week contest. JSON 2.1.0 seals ONE 21-day window for both, which cannot show "the ranking resets, the contest continues". */
function weeklyConfig() { const raw = structuredClone(config.raw); raw.league.seasons.ranking.days = 7; raw.league.seasons.contest.days = 14; return loadConfig(raw); }
function fixture(t: { after(fn: () => void): void }, at = NOW, cfg: Config = config) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-competition-')), file = join(dir, 'game.db');
  let now = at; const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, cfg, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  t.after(() => { stores.forEach(s => s.close()); db.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = (role: AdminActor['role'] = 'game', subject: string = role): AdminActor => ({ subject, role, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const login = () => { const g = store.createGuestSession(86400000); return store.signInGoogle(g.token, store.issueGoogleChallenge(g.token).nonce, { subject: 'player-one' }, 86400000); };
  const imported = async (closed = false, extraCommands = 0) => {
    const account = login(), game = new Game(cfg, 42, now - 11100, 'local-reviewed');
    game.command({ at: game.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }); game.advance(now);
    const table = game.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
    assert.ok(game.command({ at: now, idempotencyKey: 'serve', command: { type: 'serve', tableId: table.id, orderId: table.order!.id } }).ok);
    if (closed) {
      game.command({ at: game.world.now, idempotencyKey: 'end', command: { type: 'endShift' } });
      game.advance(game.world.now + 3600000); now = game.world.now;
      assert.equal(game.world.completedShifts, 1);
    }
    for (let i = 0; i < extraCommands; i++) game.command({ at: game.world.now, idempotencyKey: 'local-visibility-' + i, command: { type: 'activity', active: true, paused: true } });
    game.command({ at: game.world.now, idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
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

const send = (f: ReturnType<typeof fixture>, id: string, command: Command) => {
  const result = f.store.command(id, { idempotencyKey: `server-${f.store.read(id).revision}`, command });
  assert.ok(result.result.ok, result.result.reason ?? "command refused"); return result.world;
};
function serveAndClose(f: ReturnType<typeof fixture>, id: string) {
  send(f, id, { type: 'activity', active: true, paused: false });
  if (f.store.read(id).world.phase === 'resting') send(f, id, { type: 'startShift' });
  let served = false;
  for (let i = 0; i < 120 && !served; i++) {
    f.now += 1000;
    const table = f.store.read(id).world.tables.find(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready'));
    if (table) { send(f, id, { type: 'serve', tableId: table.id, orderId: table.order!.id }); served = true; }
  }
  assert.ok(served); send(f, id, { type: 'endShift' }); f.now += 3600000;
  assert.equal(f.store.read(id).world.phase, 'resting');
}

test('pending imported earnings and shifts are excluded, server continuation counts, and review never credits a wallet twice', async t => {
  const f = fixture(t), { receipt, before } = await f.imported(true), id = receipt.playerId, token = receipt.token!;
  const start = await f.store.competitiveStatus(token);
  for (const p of start.periods) {
    assert.equal(p.earned, 0); assert.equal(p.closedShifts, 0); assert.equal(p.firstReachedAt, null); assert.equal(p.reason, 'insufficientShifts');
    assert.equal(p.excludedLocalEarned, before.world.seasonEarned);
  }
  serveAndClose(f, id);
  const world = f.store.read(id).world, score = await f.store.competitiveStatus(token), earned = world.seasonEarned - before.world.seasonEarned;
  assert.ok(earned > 0);
  for (const p of score.periods) { assert.equal(p.earned, earned); assert.equal(p.closedShifts, 1); assert.equal(p.eligible, true); assert.equal(p.firstReachedAt, world.seasons![p.kind].firstReachedCurrentSeasonEarnedAt); }
  const review: CompetitionRequest = { type: 'import-review', key: 'accept', playerId: id, digest: receipt.digest, expectedSeq: 0, reason: 'Reviewed source', value: 'approved' };
  const done = f.store.competition.decide(f.actor(), review);
  for (const p of (await f.store.competitiveStatus(token)).periods) { assert.equal(p.earned, world.seasonEarned); assert.equal(p.closedShifts, 2); assert.equal(p.excludedLocalEarned, 0); }
  f.store.competition.decide(f.actor(), review); assert.deepEqual(f.store.read(id).world, world);
  f.store.competition.decide(f.actor(), { ...review, key: 'reject', expectedSeq: done.seq, value: 'rejected' });
  assert.deepEqual((await f.open().competitiveStatus(token)).periods, score.periods);
  assert.deepEqual(f.store.read(id).world, world);
});

test('server-origin guest scores survive Google attachment and current flag decisions immediately change eligibility', async t => {
  const f = fixture(t), g = f.store.createGuestSession(86400000);
  serveAndClose(f, g.playerId);
  const guest = await f.store.competitiveStatus(g.token);
  assert.ok(guest.periods.every(p => p.earned > 0 && p.reason === 'googleRequired'));
  const a = f.store.signInGoogle(g.token, f.store.issueGoogleChallenge(g.token).nonce, { subject: 'direct' }, 86400000);
  const google = await f.store.competitiveStatus(a.token);
  assert.equal(google.review, null); assert.ok(google.periods.every(p => p.eligible));
  assert.deepEqual(google.periods.map(p => p.earned), guest.periods.map(p => p.earned));
  const flag: CompetitionRequest = { type: 'flag', key: 'flag', playerId: a.playerId, expectedSeq: 0, reason: 'Investigation', value: true };
  const done = f.store.competition.decide(f.actor(), flag);
  assert.ok((await f.store.competitiveStatus(a.token)).periods.every(p => p.reason === 'flagged'));
  f.store.competition.decide(f.actor(), { ...flag, key: 'clear', value: false, expectedSeq: done.seq });
  assert.deepEqual(await f.open().competitiveStatus(a.token), google);
});

test('an exact new ranking window stops old local subtraction while the continuing contest keeps its own baseline', async t => {
  const f = fixture(t, NOW - 7 * 86400000, weeklyConfig()), { receipt, before } = await f.imported(), id = receipt.playerId;
  const end = before.world.seasons!.ranking.endsAt;
  assert.ok(end < before.world.seasons!.contest.endsAt);
  f.now = end;
  const g = f.store.createGuestSession(86400000), renewed = f.store.signInGoogle(g.token, f.store.issueGoogleChallenge(g.token).nonce, { subject: 'player-one' }, 86400000, true);
  const result = await f.store.competitiveStatus(renewed.token);
  assert.notEqual(result.periods[0].id, before.world.seasons!.ranking.id);
  assert.equal(result.periods[0].excludedLocalEarned, 0); assert.equal(result.periods[0].earned, 0);
  assert.equal(result.periods[1].id, before.world.seasons!.contest.id); assert.equal(result.periods[1].earned, 0);
  assert.equal(result.periods[1].excludedLocalEarned, before.world.seasons!.contestEarned);
  const frozen = structuredClone(f.store.read(id).world.seasons!.results);
  const actor = f.actor(); f.store.competition.decide(actor, { type: 'import-review', key: 'late', playerId: id, digest: receipt.digest, expectedSeq: 0, reason: 'Late decision', value: 'approved' });
  await f.store.competitiveStatus(renewed.token);
  assert.deepEqual(f.store.read(id).world.seasons!.results, frozen, 'personal results are not rewritten or claimed as a global rank snapshot');
});

function removeBaseline(db: DatabaseSync) {
  db.exec("DROP TRIGGER registry_audit_delete; DELETE FROM registry_audit WHERE type='LocalImportBaseline'; CREATE TRIGGER registry_audit_delete BEFORE DELETE ON registry_audit BEGIN SELECT RAISE(ABORT,'registry:appendOnly'); END;");
}

test('pre-slice imports recover their original cutoff through replay after later gameplay, once across restart, with current decisions', async t => {
  const f = fixture(t), { receipt, before } = await f.imported(true), id = receipt.playerId;
  const original = f.db.prepare("SELECT payload FROM registry_audit WHERE type='LocalImportBaseline'").get()!.payload;
  serveAndClose(f, id); const current = f.store.read(id);
  removeBaseline(f.db);
  const recovering = f.open().competitiveStatus(receipt.token!);
  const review: CompetitionRequest = { type: 'import-review', key: 'during-worker', playerId: id, digest: receipt.digest, expectedSeq: 0, reason: 'Reviewed now', value: 'approved' };
  f.store.competition.decide(f.actor(), review);
  const score = await recovering;
  assert.equal(score.review, 'approved'); assert.equal(score.periods[0].earned, current.world.seasonEarned);
  const saved = JSON.parse(String(f.db.prepare("SELECT payload FROM registry_audit WHERE type='LocalImportBaseline'").get()!.payload));
  assert.deepEqual(saved.baseline, JSON.parse(String(original)).baseline);
  assert.equal(saved.baseline.periods.find((p: { kind: string }) => p.kind === 'ranking').earned, before.world.seasonEarned);
  assert.deepEqual(await f.open().competitiveStatus(receipt.token!), score);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='LocalImportBaseline'").get()!.n, 1);
  assert.deepEqual(f.store.read(id), current);
});

test('missing or corrupt baseline fails closed, audit failure rolls back the claim, and expired recovery credentials get no score', async t => {
  const f = fixture(t), a = f.login();
  const game = new Game(config, 42, f.now, 'rollback-baseline');
  game.command({ at: f.now, idempotencyKey: 'paused', command: { type: 'activity', active: true, paused: true } });
  f.db.exec("CREATE TRIGGER fail_baseline BEFORE INSERT ON registry_audit WHEN NEW.type='LocalImportBaseline' BEGIN SELECT RAISE(ABORT,'test:baselineFailure'); END");
  await assert.rejects(f.store.claimLocal(a.token, encodeSave(game)), /baselineFailure/);
  assert.equal(f.db.prepare('SELECT 1 FROM players WHERE id=?').get(game.playerId), undefined);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM local_imports').get()!.n, 0); assert.equal(f.store.session(a.token)!.playerId, a.playerId);
  f.db.exec('DROP TRIGGER fail_baseline'); const receipt = await f.store.claimLocal(a.token, encodeSave(game));
  removeBaseline(f.db);
  const pending = f.store.competitiveStatus(receipt.token!); f.store.revokeSession(receipt.token!);
  await assert.rejects(pending, /invalidSession/);
  const bad = { ...importBaseline(game.world), periods: [{ id: game.world.seasons!.ranking.id, kind: 'ranking' as const, earned: 1, closedShifts: 0 }] };
  const state = f.store.competition.state(game.playerId);
  assert.throws(() => competitivePeriods(game.world, () => config, state), /invalidBaseline/);
  assert.throws(() => competitivePeriods(game.world, () => config, state, bad), /invalidBaseline/);
  f.db.exec('DROP TRIGGER registry_audit_update');
  f.db.prepare("UPDATE registry_audit SET payload=json_set(payload,'$.baseline.periods[0].earned',1) WHERE type='LocalImportBaseline'").run();
  const next = f.store.createGuestSession(86400000), login = f.store.signInGoogle(next.token, f.store.issueGoogleChallenge(next.token).nonce, { subject: 'player-one' }, 86400000, true);
  await assert.rejects(f.store.competitiveStatus(login.token), /invalidBaseline/);
});

test('competitive tiers and qualification reuse each active season pin; unwindowed legacy income never becomes a new score', async t => {
  const f = fixture(t), { receipt, before } = await f.imported(), state = f.store.competition.state(receipt.playerId);
  const world = structuredClone(before.world), raw = structuredClone(config.raw); raw._meta.version = 'score-pinned'; raw.leaderboard.minShiftsToRank = 4;
  const pinned = loadConfig(raw), base = importBaseline(before.world), threshold = config.values.league.tiers[1].minSeasonEarnedBase;
  // A boundary-shaped derived view isolates the already tested canonical tier function; no stored wallet mutation.
  world.seasonEarned += threshold; world.seasons!.ranking.closedShifts = 3; world.now++;
  world.seasons!.ranking.firstReachedCurrentSeasonEarnedAt = world.now; world.seasons!.ranking.configVersion = pinned.version;
  const periods = competitivePeriods(world, version => version === pinned.version ? pinned : config, state, base);
  assert.equal(periods[0].earned, threshold); assert.equal(periods[0].tierId, 'bac'); assert.equal(periods[0].reason, 'insufficientShifts');
  const legacy = { ...world, seasons: undefined, seasonEarned: 999999 } as World;
  assert.deepEqual(competitivePeriods(legacy, () => config, { ...state, localImport: null }), []);
});

test('legacy baseline inflation runs only in the admitted worker while concurrent recovery is refused', async t => {
  const f = fixture(t), { receipt } = await f.imported(), native = zlib.gunzipSync;
  removeBaseline(f.db);
  zlib.gunzipSync = (() => { throw Error('test:mainThreadInflation'); }) as typeof native;
  syncBuiltinESMExports();
  try {
    const first = f.store.competitiveStatus(receipt.token!); void first.catch(() => {});
    await assert.rejects(f.open().competitiveStatus(receipt.token!), /importBusy/);
    const result = await first;
    assert.equal(result.review, 'pending'); assert.ok(result.periods.every(p => p.earned === 0));
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='LocalImportBaseline'").get()!.n, 1);
  } finally { zlib.gunzipSync = native; syncBuiltinESMExports(); }
});

test('corrupt retained gzip or mismatched original digest cannot become a zero imported baseline', async t => {
  const f = fixture(t), { receipt, text, before } = await f.imported(); removeBaseline(f.db);
  f.db.exec('DROP TRIGGER local_imports_update');
  for (const bytes of [Buffer.from('broken gzip'), zlib.gzipSync(text + ' ')]) {
    f.db.prepare('UPDATE local_imports SET original_gzip=? WHERE player_id=?').run(bytes, receipt.playerId);
    await assert.rejects(f.store.competitiveStatus(receipt.token!), /invalidLocalArchive/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='LocalImportBaseline'").get()!.n, 0);
    assert.deepEqual(f.store.read(receipt.playerId), before);
  }
  f.db.prepare('UPDATE local_imports SET original_gzip=? WHERE player_id=?').run(zlib.gzipSync(text), receipt.playerId);
  assert.ok((await f.store.competitiveStatus(receipt.token!)).periods.every(p => p.earned === 0));
});


test('paged import evidence excludes later server activity and audits each bounded exact source prefix', async t => {
  const f = fixture(t), { receipt, text } = await f.imported(false, 60), source = JSON.parse(text), c = f.store.competition;
  send(f, receipt.playerId, { type: 'activity', active: true, paused: true });
  const current = f.store.read(receipt.playerId);
  let pages = 0;
  for (const kind of ['commands', 'events'] as const) {
    let after = 0; const records: unknown[] = [];
    do {
      const result = c.history(f.actor('support'), receipt.playerId, receipt.digest, kind, after); pages++;
      assert.equal(result.digest, receipt.digest); assert.equal(result.playerId, receipt.playerId);
      assert.equal(result.through, kind === 'commands' ? receipt.commandSeq : receipt.eventSeq);
      assert.ok(result.entries.length <= 50);
      assert.deepEqual(result.entries.map(r => r.seq), result.entries.map((_, i) => after + i + 1));
      records.push(...result.entries.map(r => r.record));
      if (result.nextCursor === null) break;
      after = result.nextCursor;
    } while (true);
    assert.deepEqual(records, kind === 'commands' ? source.log : source.events);
    const end = c.history(f.actor(), receipt.playerId, receipt.digest, kind, records.length); pages++;
    assert.deepEqual(end.entries, []); assert.equal(end.nextCursor, null);
  }
  const audit = f.db.prepare("SELECT payload FROM registry_audit WHERE type='CompetitionHistoryInspected'").all();
  assert.equal(audit.length, pages);
  for (const row of audit) { const a = JSON.parse(String(row.payload)); assert.equal(a.digest, receipt.digest); assert.equal(a.playerId, receipt.playerId); assert.equal(a.at, f.now); }
  assert.deepEqual(f.store.read(receipt.playerId), current); assert.equal(f.audits().length, 0);
});

test('history inspection refuses wrong owners, cursors, roles, missing prefix records and failed audit writes', async t => {
  const f = fixture(t), { receipt } = await f.imported(), c = f.store.competition;
  const read = (actor = f.actor(), digest = receipt.digest, kind = 'commands', after = 0) => c.history(actor, receipt.playerId, digest, kind as 'commands', after);
  for (const role of ['economy', 'viewer'] as const) assert.throws(() => read(f.actor(role)), /forbidden/);
  assert.throws(() => read({ ...f.actor(), mfa: false }), /invalidActor/);
  assert.throws(() => read({ ...f.actor(), expiresAt: f.now }), /invalidActor/);
  for (const after of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, receipt.commandSeq + 1]) assert.throws(() => read(f.actor(), receipt.digest, 'commands', after), /invalidInput/);
  assert.throws(() => read(f.actor(), 'a'.repeat(64)), /importConflict/);
  assert.throws(() => read(f.actor(), receipt.digest, 'players'), /invalidInput/);
  f.db.exec("CREATE TRIGGER fail_inspection BEFORE INSERT ON registry_audit WHEN NEW.type='CompetitionHistoryInspected' BEGIN SELECT RAISE(ABORT,'test:auditFailed'); END;");
  assert.throws(() => read(), /auditFailed/);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM registry_audit WHERE type='CompetitionHistoryInspected'").get()!.n, 0);
  f.db.exec('DROP TRIGGER fail_inspection; DROP TRIGGER commands_delete');
  f.db.prepare('DELETE FROM commands WHERE player_id=? AND seq=1').run(receipt.playerId);
  assert.throws(() => read(), /invalidHistory/);
});
