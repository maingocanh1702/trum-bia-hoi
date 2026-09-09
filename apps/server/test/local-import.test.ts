import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { Game, config, decodeSave, encodeSave, loadConfig, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';
import { LOCAL_ARCHIVE_BYTES } from '../src/local-archive';
import { mixedPinGame, nextPin, pinConfig } from '../../../packages/engine/test/fixtures/config-pinning';

const NOW = Date.parse('2026-09-10T10:00:00Z');
function fixture(t: { after(fn: () => void): void }) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/local-import-')), file = resolve(dir, 'game.db');
  let now = NOW; const stores: GameStore[] = [];
  const open = (c: Config = config) => { const s = new GameStore(file, c, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  const login = (subject = 'one') => { const guest = store.createGuestSession(86400000);
    return store.signInGoogle(guest.token, store.issueGoogleChallenge(guest.token).nonce, { subject }, 86400000); };
  t.after(() => { db.close(); for (const s of stores) s.close(); rmSync(dir, { force: true, recursive: true }); });
  return { store, db, open, login, get now() { return now; }, set now(v: number) { now = v; } };
}
function localGame(id = 'local-one', c = config) {
  const game = new Game(c, 42, NOW - 11100, id);
  game.command({ at: game.world.now, idempotencyKey: 'local-open', command: { type: 'startShift' } });
  game.advance(NOW);
  const table = game.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const serve = { type: 'serve' as const, tableId: table.id, orderId: table.order!.id };
  assert.ok(game.command({ at: NOW, idempotencyKey: 'local-serve', command: serve }).ok);
  game.command({ at: NOW, idempotencyKey: 'local-menu', command: { type: 'activity', active: true, paused: true } });
  return { game, serve, text: encodeSave(game) };
}

test('claiming a local live shift preserves its full archive, source IDs and pending review across rotation, replay and restart', async t => {
  const f = fixture(t), s = f.store, account = f.login(), other = f.login('other'), local = localGame();
  const old = s.read(account.playerId);
  s.command(account.playerId, { idempotencyKey: 'empty-presence', command: { type: 'activity', active: false } });
  const receipt = await s.claimLocal(account.token, local.text);
  assert.equal(receipt.review, 'pending'); assert.equal(receipt.playerId, local.game.playerId);
  assert.equal(receipt.commandSeq, local.game.log.length); assert.equal(receipt.eventSeq, local.game.world.events.length);
  assert.equal(s.session(account.token), null); assert.ok(s.session(other.token));
  assert.equal(s.session(receipt.token!)!.playerId, local.game.playerId);
  assert.deepEqual(s.read(receipt.playerId).world, local.game.world);
  assert.equal(f.db.prepare('SELECT projection FROM players WHERE id=?').get(account.playerId) !== undefined, true);
  assert.equal(s.read(account.playerId).world.coins, old.world.coins);
  const imported = f.db.prepare('SELECT * FROM local_imports').get()!;
  assert.equal(gunzipSync(imported.original_gzip as Uint8Array).toString(), local.text);
  assert.equal(imported.previous_player_id, account.playerId);
  assert.throws(() => f.db.exec('DELETE FROM local_imports'), /appendOnly/);
  const again = await s.claimLocal(receipt.token!, local.text);
  assert.equal(again.token, undefined); assert.equal(again.digest, receipt.digest);
  await assert.rejects(s.claimLocal(receipt.token!, local.text + ' '), /importConflict/);
  s.close(); const restarted = f.open(); assert.deepEqual(restarted.localImport(receipt.token!), again);
  assert.deepEqual(restarted.read(receipt.playerId).world, local.game.world);
  const connected = restarted.connect(receipt.playerId);
  const retry = restarted.clientCommand(receipt.playerId, { clientId: connected.clientId, clientSeq: 1,
    idempotencyKey: 'local-serve', command: local.serve });
  assert.ok(retry.result?.ok); assert.equal(retry.world.coins, local.game.world.coins);
  assert.equal(retry.world.events.filter(e => e.type === 'order_served').length, 1);
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('a progressed account, source identity collision or second account cannot overwrite or claim an existing game', async t => {
  const f = fixture(t), s = f.store, account = f.login(), local = localGame();
  s.command(account.playerId, { idempotencyKey: 'opened', command: { type: 'startShift' } });
  const before = s.read(account.playerId);
  await assert.rejects(s.claimLocal(account.token, local.text), /accountConflict/);
  assert.deepEqual(s.read(account.playerId), before);
  const empty = f.login('empty'); s.createPlayer(local.game.playerId, 99);
  const collision = s.read(local.game.playerId);
  await assert.rejects(s.claimLocal(empty.token, local.text), /importConflict/);
  assert.deepEqual(s.read(local.game.playerId), collision);
  const fresh = localGame('local-two'), first = await s.claimLocal(empty.token, fresh.text), another = f.login('another');
  await assert.rejects(s.claimLocal(another.token, fresh.text), /importConflict/);
  assert.equal(s.session(another.token)!.playerId, another.playerId);
  assert.equal(s.localImport(another.token), undefined); assert.equal(s.localImport(first.token!)!.review, 'pending');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM local_imports').get()!.n, 1);
});

test('unknown or changed configuration, malformed history and future frontiers are refused before any import mutation', async t => {
  const f = fixture(t), s = f.store, account = f.login(), local = localGame();
  const before = s.read(account.playerId), original = JSON.parse(local.text);
  for (const patch of [
    (x: typeof original) => { x.config.menu.bia.price++; },
    (x: typeof original) => { x.config._meta.version = 'unpublished'; },
  ]) { const x = structuredClone(original); patch(x); await assert.rejects(s.claimLocal(account.token, JSON.stringify(x)), /unknownLocalConfig/); }
  for (const patch of [
    (x: typeof original) => { x.now = NOW + 1; },
    (x: typeof original) => { x.createdAt = -1; },
    (x: typeof original) => { x.log.push(x.log[0]); },
    (x: typeof original) => { x.events.pop(); },
    (x: typeof original) => { x.playerId = '../other'; },
  ]) { const x = structuredClone(original); patch(x); await assert.rejects(s.claimLocal(account.token, JSON.stringify(x)), /invalidLocalArchive/); }
  await assert.rejects(s.claimLocal(account.token, '{'), /invalidLocalArchive/);
  await assert.rejects(s.claimLocal(account.token, ' '.repeat(LOCAL_ARCHIVE_BYTES + 1)), /localArchiveSize/);
  const guest = s.createGuestSession(1000);
  await assert.rejects(s.claimLocal(guest.token, local.text), /googleRequired/);
  assert.throws(() => s.localImport(guest.token), /googleRequired/);
  assert.deepEqual(s.read(account.playerId), before);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM local_imports').get()!.n, 0);
});

test('logout, expiry or successful gameplay during worker replay invalidates claim authorization at commit', async t => {
  const f = fixture(t), s = f.store;
  for (const mode of ['logout', 'expiry', 'gameplay']) {
    const account = f.login(mode), local = localGame(`local-${mode}`);
    const pending = s.claimLocal(account.token, local.text);
    if (mode === 'logout') s.revokeSession(account.token);
    if (mode === 'expiry') f.now = account.expiresAt;
    if (mode === 'gameplay') s.command(account.playerId, { idempotencyKey: 'open', command: { type: 'startShift' } });
    await assert.rejects(pending, mode === 'gameplay' ? /accountConflict/ : /invalidSession/);
    assert.equal(f.db.prepare('SELECT id FROM players WHERE id=?').get(local.game.playerId), undefined);
    f.now = NOW;
  }
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM local_imports').get()!.n, 0);
});

test('one worker admission and SQLite rollback preserve both accounts and allow a safe retry after a late audit failure', async t => {
  const f = fixture(t), s = f.store, a = f.login(), b = f.login('two'), local = localGame();
  f.db.exec("CREATE TRIGGER import_failure BEFORE INSERT ON account_logins WHEN NEW.action='claim' BEGIN SELECT RAISE(ABORT,'test:importFailure'); END");
  const first = s.claimLocal(a.token, local.text);
  await assert.rejects(s.claimLocal(b.token, localGame('local-b').text), /importBusy/);
  await assert.rejects(first, /importFailure/);
  assert.equal(f.db.prepare('SELECT id FROM players WHERE id=?').get(local.game.playerId), undefined);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM local_imports').get()!.n, 0);
  assert.equal(s.session(a.token)!.playerId, a.playerId); assert.equal(s.session(b.token)!.playerId, b.playerId);
  f.db.exec('DROP TRIGGER import_failure'); const imported = await s.claimLocal(a.token, local.text);
  assert.deepEqual(s.read(imported.playerId).world, local.game.world);
});

test('schema4 migration and approved legacy configuration retain the original v1 archive without inventing approval', async t => {
  const f = fixture(t), account = f.login(), s = f.store;
  s.close(); f.db.exec('DROP TABLE registry_audit; DROP TABLE registry_publications; DROP TABLE registry_approvals; DROP TABLE registry_proposals; DROP TABLE client_presence; DROP TABLE engine_checkpoints; DROP TABLE local_imports; PRAGMA user_version=4');
  const migrated = f.open(); assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 8);
  assert.equal(migrated.session(account.token)!.provider, 'google');
  const text = readFileSync('packages/engine/test/fixtures/legacy-save-v1.json', 'utf8'), raw = JSON.parse(text);
  await assert.rejects(migrated.claimLocal(account.token, text), /unknownLocalConfig/);
  f.open(loadConfig(raw.config)).close(); // Trusted registry history is admitted by server configuration, never the upload.
  const receipt = await migrated.claimLocal(account.token, text), replayed = decodeSave(text);
  assert.equal(receipt.playerId, replayed.playerId); assert.equal(receipt.commandSeq, replayed.log.length);
  assert.equal(receipt.eventSeq, replayed.world.events.length); assert.equal(receipt.review, 'pending');
  assert.equal(gunzipSync(f.db.prepare('SELECT original_gzip FROM local_imports').get()!.original_gzip as Uint8Array).toString(), text);
  assert.doesNotThrow(() => f.open().read(receipt.playerId));
});

test('a local career spanning two registered configurations retains its opening pins and current shift after server restart', async t => {
  const f = fixture(t), game = mixedPinGame(); f.now = game.world.now;
  game.command({ at: f.now, idempotencyKey: 'claim-menu', command: { type: 'activity', active: true, paused: true } });
  const account = f.login(), text = encodeSave(game);
  f.open(pinConfig('pin-A')).close();
  await assert.rejects(f.store.claimLocal(account.token, text), /unknownLocalConfig/);
  f.open(nextPin()).close();
  const imported = await f.store.claimLocal(account.token, text); f.store.close();
  const reopened = f.open().read(imported.playerId);
  assert.deepEqual(reopened.world, game.world); assert.equal(reopened.configVersion, 'pin-B');
  assert.deepEqual([...new Set(f.db.prepare('SELECT entry FROM commands WHERE player_id=? ORDER BY seq').all(imported.playerId)
    .map(row => JSON.parse(String(row.entry)).configVersion))], ['pin-A', 'pin-B']);
});


test('uploaded checkpoint and projection fields never bypass full local replay or become trusted server state', async t => {
  const f = fixture(t), account = f.login(), local = localGame(), uploaded = JSON.parse(local.text);
  uploaded.checkpoint = { ...local.game.checkpoint(), rulesVersion: 1, activeRushIndex: 999 };
  uploaded.world = { ...local.game.world, coins: 999999999 };
  const receipt = await f.store.claimLocal(account.token, JSON.stringify(uploaded));
  assert.deepEqual(f.open().read(receipt.playerId).world, local.game.world);
  assert.deepEqual(JSON.parse(String(f.db.prepare('SELECT metadata FROM engine_checkpoints WHERE player_id=?').get(receipt.playerId)!.metadata)), local.game.checkpoint());
  const invalid = structuredClone(uploaded); invalid.playerId = 'forged-history'; invalid.events.pop();
  const other = f.login('other');
  await assert.rejects(f.store.claimLocal(other.token, JSON.stringify(invalid)), /invalidLocalArchive/);
  assert.equal(f.db.prepare('SELECT id FROM players WHERE id=?').get(invalid.playerId), undefined);
});
