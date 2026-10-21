import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { config, configContent, Game, loadConfig, seasonWindow, serveValueStats, tableUpgrade, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';
import { measureKViaForecast } from '../src/forecast';
import { ConfigRegistry, registryPolicy, type AdminActor, type ConfigScope, type MeasureK } from '../src/registry';
const NOW = Date.parse('2026-09-10T10:00:00Z');
// Default measurer trusts the candidate's own declared k.value -- identical to the pre-existing self-report
// check, so every test below that never touches raw.k sees admission behave exactly as before this feature.
function fixture(t: { after(fn: () => unknown): void }, seed: Config = config, measureK?: MeasureK) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-registry-')), file = join(dir, 'game.db');
  let now = NOW; const stores: GameStore[] = [], connections: DatabaseSync[] = [];
  const open = (c = seed) => { const s = new GameStore(file, c, () => now, measureK); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file); connections.push(db);
  db.exec('PRAGMA foreign_keys=ON');
  const registry = new ConfigRegistry(db, () => now, measureK);
  t.after(() => { for (const s of stores) s.close(); for (const d of connections) d.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = (role: AdminActor['role'] = 'economy', subject: string = role): AdminActor => ({ subject, role, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const draft = (edit: (raw: Config['raw']) => void, who = actor(), key = crypto.randomUUID()) => {
    const base = registry.config(registry.latest().version), snapshot = structuredClone(base.raw); edit(snapshot);
    return registry.propose(who, { key, baseVersion: base.version, snapshot, reason: 'Measured balance adjustment' });
  };
  const publish = (edit: (raw: Config['raw']) => void, who = actor()) => {
    const d = draft(edit, who); registry.approve(actor('super', 'reviewer'), d.version); return registry.publish(who, d.version);
  };
  return { file, db, store, registry, open, actor, draft, publish, get now() { return now; }, set now(v) { now = v; } };
}

test('published default config is used by real openings, never rewrites a live shift, and replays exactly after restart', t => {
  const f = fixture(t), s = f.store;
  s.createPlayer('old', 42); const opened = s.command('old', { idempotencyKey: 'open-old', command: { type: 'startShift' } });
  assert.ok(opened.result.ok); f.now += 1000; const before = s.read('old');
  const pub = f.publish(raw => { raw.menu.bia.price++; });
  assert.equal(pub.effective_at, f.now); assert.deepEqual(s.read('old'), before);
  assert.equal(s.createPlayer('new', 43).configVersion, pub.version);
  assert.equal(s.command('new', { idempotencyKey: 'open-new', command: { type: 'startShift' } }).world.shift!.configVersion, pub.version);
  const again = s.command('old', { idempotencyKey: 'open-old', command: { type: 'startShift' } });
  assert.deepEqual(again.result, opened.result); assert.equal(again.world.shift!.configVersion, config.version);
  s.command('old', { idempotencyKey: 'close', command: { type: 'endShift' } }); f.now += 3600000;
  const next = s.command('old', { idempotencyKey: 'open-second', command: { type: 'startShift' } });
  assert.ok(next.result.ok); assert.equal(next.world.shift!.configVersion, pub.version);
  const restart = f.open(); assert.deepEqual(restart.read('old'), s.read('old'));
  assert.equal(restart.createPlayer('restart', 44).configVersion, pub.version);
  const replay = new Game(config, 42, NOW, 'old');
  for (const row of f.db.prepare('SELECT entry FROM commands WHERE player_id=? ORDER BY seq').all('old')) {
    const entry = JSON.parse(String(row.entry)); assert.deepEqual(replay.replay(entry, f.registry.config(entry.configVersion)), entry.result);
  }
  replay.advance(f.now); assert.deepEqual(replay.world, restart.read('old').world);
  assert.equal(JSON.parse(restart.configSnapshot(config.version)).menu.bia.price, config.raw.menu.bia.price);
});

test('Tier A requires a distinct Super approval and becomes active exactly at VN midnight across connections', t => {
  const f = fixture(t), who = f.actor(), d = f.draft(raw => { raw.shift.dailyEarnCapBase++; });
  assert.throws(() => f.registry.publish(who, d.version), /approvalRequired/);
  assert.throws(() => f.registry.approve(who, d.version), /forbidden/);
  assert.throws(() => f.registry.approve(f.actor('super', who.subject), d.version), /distinctApprover/);
  const reviewer = f.actor('super', 'another-person'); f.registry.approve(reviewer, d.version);
  assert.deepEqual(f.registry.approve(reviewer, d.version), d);
  const publication = f.registry.publish(who, d.version), count = f.db.prepare('SELECT COUNT(*) AS n FROM registry_audit').get()!.n;
  assert.deepEqual(f.registry.publish(who, d.version), publication);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_audit').get()!.n, count);
  assert.equal(publication.effective_at, Date.parse('2026-09-10T17:00:00Z'));
  f.now = publication.effective_at - 1; assert.equal(f.open().createPlayer('before', 1).configVersion, config.version);
  f.now++; assert.equal(f.open().createPlayer('at', 2).configVersion, publication.version);
});

test('admin lifecycle distinguishes draft approval scheduled activation and archival without advancing saves or creating audit', t => {
  const f = fixture(t), r = f.registry;
  assert.equal(r.details(f.actor('viewer'), config.version).phase, 'active');
  const d = f.draft(raw => { raw.shift.dailyEarnCapBase++; });
  assert.equal(r.details(f.actor('viewer'), d.version).phase, 'draft');
  r.approve(f.actor('super', 'reviewer'), d.version);
  assert.equal(r.details(f.actor('viewer'), d.version).phase, 'approved');
  const p = r.publish(f.actor(), d.version);
  const count = () => Number(f.db.prepare('SELECT COUNT(*) AS n FROM registry_audit').get()!.n), before = count();
  f.now = p.effective_at - 1;
  const scheduled = r.index(f.actor('viewer'));
  assert.equal(scheduled.latest.phase, 'scheduled'); assert.equal(scheduled.activeVersion, config.version);
  assert.equal(scheduled.proposals.find(row => row.version === d.version)!.phase, 'scheduled');
  assert.equal(scheduled.proposals.find(row => row.version === d.version)!.computedAt, f.now);
  assert.equal(r.details(f.actor('viewer'), d.version).computedAt, f.now);
  f.now++;
  assert.equal(r.details(f.actor('viewer'), d.version).phase, 'active');
  assert.equal(r.details(f.actor('viewer'), config.version).phase, 'archived');
  assert.equal(r.active().version, d.version); assert.equal(count(), before);
  assert.equal(r.index(f.actor('viewer')).latest.phase, 'active');
  const restarted = f.open(); assert.equal(restarted.registry.details(f.actor('viewer'), d.version).phase, 'active');
});

test('admin metadata shares one server clock and retains an outer transaction without writing', t => {
  const f = fixture(t); let reads = 0;
  const registry = new ConfigRegistry(f.db, () => f.now + reads++), actor = f.actor('viewer');
  const index = registry.index(actor); assert.equal(reads, 1); assert.equal(index.computedAt, f.now);
  const details = registry.details(actor, config.version); assert.equal(reads, 2); assert.equal(details.computedAt, f.now + 1);
  assert.equal(f.db.isTransaction, false);
  f.db.exec('BEGIN'); registry.details(actor, config.version); assert.equal(f.db.isTransaction, true); f.db.exec('ROLLBACK');
  assert.throws(() => registry.details({ ...actor, expiresAt: f.now }, config.version), /invalidActor/);
  assert.equal(f.db.isTransaction, false);
});

test('tier classifier covers every section, flags beat broad balance groups, and mixed changes require all roles', t => {
  const f = fixture(t);
  for (const [tier, rule] of Object.entries(config.raw._meta.governance.tiers)) {
    for (const key of rule.sections) assert.equal(registryPolicy([key], config).tier, tier, key);
  }
  assert.equal(registryPolicy(['weather.phase1Enabled'], config).tier, 'A');
  for (const role of ['support', 'viewer', 'game'] as const) assert.throws(() => f.draft(raw => { raw.menu.bia.price++; }, f.actor(role)), /forbidden/);
  assert.throws(() => f.draft(raw => { raw.upgrades.phase1UpgradesOutsideShiftOnly = !raw.upgrades.phase1UpgradesOutsideShiftOnly; }), /forbidden/);
  assert.throws(() => f.draft(raw => { raw.audio.enabled = !raw.audio.enabled; }), /forbidden/);
  const d = f.draft(raw => { raw.audio.enabled = !raw.audio.enabled; }, f.actor('game'));
  f.registry.approve(f.actor('game'), d.version); const pub = f.registry.publish(f.actor('game'), d.version);
  assert.equal(pub.effective_at, f.now);
  assert.throws(() => f.draft(raw => { raw.audio.enabled = !raw.audio.enabled; raw.menu.bia.price++; }), /forbidden/);
  assert.throws(() => f.draft(raw => { raw.menu.bia.price++; }, { ...f.actor('economy'), expiresAt: f.now }), /invalidActor/);
  assert.throws(() => f.draft(raw => { raw.audio.enabled = !raw.audio.enabled; }, { ...f.actor('game'), mfa: false }), /invalidActor/);
  assert.throws(() => f.draft(raw => { raw.menu.bia.price++; }, { ...f.actor(), expiresAt: f.now + 28800001 }), /invalidActor/);
});

test('shared validation rejects unsafe config, held features, metadata privilege changes and early schedules atomically', t => {
  const f = fixture(t), count = () => f.db.prepare('SELECT COUNT(*) AS n FROM configs').get()!.n, before = count();
  for (const edit of [
    (r: Config['raw']) => { r.menu.bia.price = -1; },
    (r: Config['raw']) => { r.lottery.legalGate = true; },
    (r: Config['raw']) => { r.entitlements.sessionPass.enabled = true; },
    (r: Config['raw']) => { r._meta.governance.tiers.A.sections = []; },
    (r: Config['raw']) => { r.network.reconnectingUiDelayMs = 1; },
    (r: Config['raw']) => { r.k.band = [1, 10]; r.k.value = 4; },
    (r: Config['raw']) => { r.shift.dayRollover.tz = 'UTC'; },
  ]) assert.throws(() => f.draft(edit, f.actor('super')), /config:|registry:|store:heartbeatClock/);
  const snapshot = structuredClone(config.raw); snapshot.shift.dailyEarnCapBase++;
  assert.throws(() => f.registry.propose(f.actor(), { key: 'early', baseVersion: config.version, snapshot, reason: 'No bypass', effective: 'immediate' }), /earlyActivation/);
  assert.equal(count(), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_proposals').get()!.n, 0);
});

test('proposal retries, stale bases and same-key conflicts cannot publish another snapshot; rollback creates a fresh version', t => {
  const f = fixture(t), snapshot = structuredClone(config.raw); snapshot.menu.bia.price++;
  const input = { key: 'one-request', baseVersion: config.version, snapshot, reason: 'Price probe' }, who = f.actor();
  const first = f.registry.propose(who, input); assert.deepEqual(f.registry.propose(who, input), first);
  assert.throws(() => f.registry.propose(who, { ...input, reason: 'Changed request' }), /keyConflict/);
  const stale = f.draft(raw => { raw.spawn.baseMs++; });
  f.registry.approve(who, first.version); f.registry.publish(who, first.version);
  assert.throws(() => f.registry.approve(who, stale.version), /staleBase/);
  assert.throws(() => f.registry.propose(who, { ...input, key: 'late-new' }), /staleBase/);
  const rollback = f.registry.propose(who, { key: 'rollback', baseVersion: first.version, snapshot: config.raw, reason: 'Restore measured baseline' });
  f.registry.approve(who, rollback.version); f.registry.publish(who, rollback.version);
  assert.notEqual(rollback.version, config.version); assert.equal(f.registry.active().raw.menu.bia.price, config.raw.menu.bia.price);
  const audit = f.db.prepare("SELECT payload FROM registry_audit WHERE type='ConfigPublished' ORDER BY seq DESC LIMIT 1").get()!;
  assert.equal(JSON.parse(String(audit.payload)).rollbackVersion, config.version);
  assert.equal(f.registry.config(first.version).raw.menu.bia.price, snapshot.menu.bia.price);
  for (const table of ['configs', 'registry_proposals', 'registry_approvals', 'registry_publications', 'registry_audit']) {
    assert.throws(() => f.db.exec(`DELETE FROM ${table}`), /appendOnly/);
  }
});

test('registering an approved historic snapshot cannot change the identity of an identical draft retry', t => {
  const f = fixture(t), snapshot = structuredClone(config.raw); snapshot.menu.bia.price++; snapshot._meta.version = 'historic-import';
  const input = { key: 'catalog-retry', baseVersion: config.version, snapshot, reason: 'Import old tuning' }, who = f.actor();
  const draft = f.registry.propose(who, input); f.open(loadConfig(snapshot));
  assert.deepEqual(f.registry.propose(who, input), draft);
  assert.equal(f.registry.active().version, config.version);
});

test('season publication waits for common boundaries, including a mixed cap change after today\'s season ending', t => {
  const f = fixture(t), window = seasonWindow(f.now, config, 'contest');
  f.now = window.endsAt - 1000;
  const p = f.publish(raw => { raw.league.tiers[1].minSeasonEarnedBase++; });
  assert.equal(p.effective_at, window.endsAt);
  f.now = p.effective_at; assert.equal(f.registry.active().version, p.version);
  f.now = seasonWindow(f.now, config, 'contest').endsAt - 1000;
  const later = f.publish(raw => { raw.league.tiers[1].minSeasonEarnedBase++; raw.shift.dailyEarnCapBase++; });
  const nextEnd = seasonWindow(f.now, config, 'contest').endsAt;
  assert.equal(later.effective_at, nextEnd + config.values.league.seasons.contest.days * 86400000);
  const immediate = f.draft(raw => { raw.menu.bia.price++; }); f.registry.approve(f.actor(), immediate.version);
  assert.throws(() => f.registry.publish(f.actor(), immediate.version), /scheduleConflict/);
});

test('failed publication transaction leaves no activation or audit, and persistent daily abuse limit survives restart', t => {
  const f = fixture(t), d = f.draft(raw => { raw.menu.bia.price++; }); f.registry.approve(f.actor(), d.version);
  f.db.exec("CREATE TRIGGER fail_registry BEFORE INSERT ON registry_audit WHEN NEW.type='ConfigPublished' BEGIN SELECT RAISE(ABORT,'test:write-failed'); END;");
  assert.throws(() => f.registry.publish(f.actor(), d.version), /write-failed/);
  assert.equal(f.registry.latest().version, config.version); f.db.exec('DROP TRIGGER fail_registry');
  f.registry.publish(f.actor(), d.version);
  for (let n = 0; n < 4; n++) f.publish(raw => { raw.menu.bia.price++; });
  const limited = f.draft(raw => { raw.menu.bia.price++; }); f.registry.approve(f.actor(), limited.version);
  const reopened = new ConfigRegistry(f.db, () => f.now);
  assert.throws(() => reopened.publish(f.actor(), limited.version), /rateLimited/);
  f.now = Date.parse('2026-09-10T17:00:00Z'); assert.equal(reopened.publish(f.actor(), limited.version).version, limited.version);
});

test('schema7 migration seeds once while preserving actual prior career history and projection', t => {
  const f = fixture(t); f.store.createPlayer('legacy', 42); f.store.command('legacy', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const before = f.store.read('legacy'); f.store.close();
  f.db.exec('DROP TABLE registry_resolutions; DROP TABLE registry_support_uses; DROP TABLE registry_support; DROP TABLE registry_scopes; DROP TABLE admin_sessions; DROP TABLE admin_factors; DROP TABLE registry_measurements; DROP TABLE registry_audit; DROP TABLE registry_publications; DROP TABLE registry_approvals; DROP TABLE registry_proposals; PRAGMA user_version=7');
  const migrated = f.open(); assert.deepEqual(migrated.read('legacy'), before);
  assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 11);
  const raw = structuredClone(config.raw); raw._meta.version = 'replacement-seed'; raw.menu.bia.price += 2;
  assert.equal(f.open(loadConfig(raw)).createPlayer('next', 43).configVersion, config.version);
});

test('changing publishers cannot bypass the daily limit for one proposal author', t => {
  const f = fixture(t), author = f.actor('economy', 'one-author');
  for (let n = 0; n < 5; n++) {
    const d = f.draft(raw => { raw.menu.bia.price++; }, author); f.registry.approve(author, d.version);
    const pub = f.registry.publish(f.actor('economy', `publisher-${n}`), d.version);
    assert.equal(pub.changed_by, author.subject);
  }
  const blocked = f.draft(raw => { raw.menu.bia.price++; }, author); f.registry.approve(author, blocked.version);
  const before = f.registry.latest();
  assert.throws(() => f.registry.publish(f.actor('economy', 'fresh-publisher'), blocked.version), /rateLimited/);
  assert.deepEqual(f.registry.latest(), before);
  const last = JSON.parse(String(f.db.prepare("SELECT payload FROM registry_audit WHERE type='ConfigPublished' ORDER BY seq DESC LIMIT 1").get()!.payload));
  assert.equal(last.changedBy, author.subject); assert.equal(last.publishedBy, 'publisher-4');
});

test('valid-schema catalog renames cannot strand existing careers behind an incompatible opening config', t => {
  const f = fixture(t); f.store.createPlayer('existing', 42);
  for (const edit of [
    (r: Config['raw']) => { r.league.tiers[0].id = 'renamed-tier'; },
    (r: Config['raw']) => { r.locations.list.at(-1)!.id = 'renamed-location'; },
  ]) {
    const snapshot = structuredClone(config.raw); edit(snapshot); loadConfig(snapshot);
    assert.throws(() => f.registry.propose(f.actor('super'), { key: crypto.randomUUID(), baseVersion: config.version, snapshot, reason: 'Catalog rename' }), /identityMigrationRequired/);
  }
  // Life Path identifiers are already protected by the shared schema validator.
  assert.throws(() => f.draft(raw => { raw.lifePath[0].id = 'renamed-path'; }, f.actor('super')), /config:lifePathOrder/);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_proposals').get()!.n, 0);
  const opened = f.store.command('existing', { idempotencyKey: 'still-openable', command: { type: 'startShift' } });
  assert.ok(opened.result.ok); assert.equal(opened.world.shift!.configVersion, config.version);
});

test('a newly published shorter heartbeat re-arms the real HTTP scheduler without repricing existing players', async t => {
  const f = fixture(t), server = createGameServer(f.store, { origin: 'http://127.0.0.1:5174', sessionTtlMs: 86400000, rateMax: 1000, rateWindowMs: 60000 });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  f.publish(raw => { raw.network.reconnectingUiDelayMs = 40; });
  const a = f.store.createGuestSession(86400000), stream = f.store.connect(a.playerId);
  const response = await fetch(url + '/player/heartbeat', { method: 'POST', headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json', Cookie: `tbh-session=${a.token}` },
    body: JSON.stringify({ clientId: stream.clientId, beatSeq: 1, active: true, paused: false }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).heartbeatIntervalMs, 20);
  f.now += 41; await delay(100);
  assert.equal(f.db.prepare('SELECT live FROM client_presence WHERE client_id=?').get(stream.clientId)!.live, 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM events WHERE player_id=? AND json_extract(payload,\'$.type\')=\'connection_lost\'').get(a.playerId)!.n, 1);
});

test('Game Admin publishes departure invitation thresholds without repricing a live shift or rewriting old pins', t => {
  const old = structuredClone(config.raw); delete (old.onboarding.loginPrompt as any).leaveProgress; old._meta.version = 'before-login-thresholds';
  const f = fixture(t, loadConfig(old)), who = f.actor('game');
  const existing = f.store.createPlayer('prompt-existing', 42); f.store.command('prompt-existing', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const original = f.store.configSnapshot(old._meta.version);
  const d = f.draft(raw => {
    Object.assign(raw.onboarding.loginPrompt, { leaveProgress: { minCompletedShifts: 4, minLifetimeEarned: 250 } });
  }, who);
  assert.equal(registryPolicy(['onboarding.loginPrompt.leaveProgress.minLifetimeEarned'], config).tier, 'C');
  f.registry.approve(who, d.version); f.registry.publish(who, d.version);
  const fresh = f.store.createPlayer('prompt-new', 43), next = f.registry.config(fresh.configVersion).values;
  assert.ok('leaveProgress' in next.onboarding.loginPrompt);
  assert.deepEqual(next.onboarding.loginPrompt.leaveProgress, { minCompletedShifts: 4, minLifetimeEarned: 250 });
  assert.equal(f.store.read('prompt-existing').configVersion, existing.configVersion);
  assert.equal(f.store.configSnapshot(old._meta.version), original);
  assert.deepEqual(next.menu, config.values.menu); assert.deepEqual(next.k, config.values.k);
});

for (const scoped of [false, true]) test(`an admin cannot delete existing invitation thresholds from a ${scoped ? 'scoped' : 'default'} proposal`, t => {
  const f = fixture(t), who = f.actor('game'); f.store.createPlayer('threshold-player', 42);
  const raw = structuredClone(config.raw); delete (raw.onboarding.loginPrompt as any).leaveProgress;
  // The replay loader deliberately accepts an old shape; proposal admission must be stricter.
  assert.doesNotThrow(() => loadConfig(raw));
  const before = f.db.prepare('SELECT snapshot FROM configs ORDER BY version').all();
  assert.throws(() => f.registry.propose(who, { key: 'delete-thresholds', baseVersion: config.version, snapshot: raw, reason: 'Remove threshold group',
    ...(scoped ? { scope: { kind: 'segment' as const, id: 'group', playerIds: ['threshold-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null } } : {}) }), /config:onboarding.loginPrompt:keys/);
  assert.deepEqual(f.db.prepare('SELECT snapshot FROM configs ORDER BY version').all(), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_proposals').get()!.n, 0);
  assert.equal(f.registry.latest().version, config.version);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM registry_audit WHERE type='ConfigProposed'").get()!.n, 0);
});

test('an approved threshold-deletion draft from before the fix cannot preview or publish after restart', t => {
  const f = fixture(t), who = f.actor('game'), version = 'pre-fix-threshold-deletion';
  const raw = structuredClone(config.raw); delete (raw.onboarding.loginPrompt as any).leaveProgress; raw._meta.version = version;
  const reason = 'Pre-fix approved proposal', fingerprint = JSON.stringify({ baseVersion: config.version, config: configContent(loadConfig(raw)), reason, effective: 'immediate' });
  // Immutable rows shaped exactly like a draft admitted by the previous release.
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(version, JSON.stringify(raw));
  f.db.prepare('INSERT INTO registry_proposals VALUES (?,?,?,?,?,?,?,?,?)').run(version, 'legacy-draft', config.version, fingerprint, who.subject,
    JSON.stringify(['onboarding.loginPrompt.leaveProgress']), reason, 'immediate', f.now);
  f.db.prepare('INSERT INTO registry_approvals VALUES (?,?,?)').run(version, who.subject, f.now);
  f.store.createPlayer('old-pin-player', 42); const before = f.store.read('old-pin-player');
  f.open(); const registry = new ConfigRegistry(f.db, () => f.now);
  assert.throws(() => registry.impact(who, version), /config:onboarding.loginPrompt:keys/);
  assert.throws(() => registry.publish(who, version), /config:onboarding.loginPrompt:keys/);
  assert.equal(registry.latest().version, config.version);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_publications').get()!.n, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM registry_audit WHERE type='ConfigPublished'").get()!.n, 0);
  assert.deepEqual(f.store.read('old-pin-player'), before);
  assert.equal(registry.config(version).raw._meta.version, version); // Historical snapshot remains readable.
});


test('an already-published threshold-deletion scope still opens shifts and can be corrected after restart', t => {
  const f = fixture(t), who = f.actor('game'), version = 'pre-fix-published-threshold-scope';
  f.store.createPlayer('scope-player', 42);
  const raw = structuredClone(config.raw); delete (raw.onboarding.loginPrompt as any).leaveProgress; raw._meta.version = version;
  const scope = { kind: 'segment' as const, id: 'historic-group', playerIds: ['scope-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const reason = 'Pre-fix scoped publication', fingerprint = JSON.stringify({ baseVersion: config.version, config: configContent(loadConfig(raw)), reason, effective: 'immediate', scope });
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(version, JSON.stringify(raw));
  f.db.prepare('INSERT INTO registry_proposals VALUES (?,?,?,?,?,?,?,?,?)').run(version, 'legacy-published', config.version, fingerprint, who.subject,
    JSON.stringify(['onboarding.loginPrompt.leaveProgress']), reason, 'immediate', f.now);
  f.db.prepare('INSERT INTO registry_scopes VALUES (?,?)').run(version, JSON.stringify(scope));
  f.db.prepare('INSERT INTO registry_approvals VALUES (?,?,?)').run(version, who.subject, f.now);
  f.db.prepare('INSERT INTO registry_publications(version,effective_at,published_at,changed_by,approved_by) VALUES (?,?,?,?,?)').run(version, f.now, f.now, who.subject, who.subject);
  // Pre-fix rows shaped exactly like a publication admitted by a release before k-measurement existed --
  // grandfathered 'admitted' on its own declared k.value, same as initializeMeasurements()'s own migration backfill.
  f.db.prepare("INSERT INTO registry_measurements VALUES (?,'admitted',?,?)").run(version, raw.k.value, f.now);
  const store = f.open(), registry = store.registry, receipt = registry.publish(who, version);
  const resolved = registry.resolve('scope-player');
  assert.equal('leaveProgress' in resolved.raw.onboarding.loginPrompt, false);
  assert.deepEqual(registry.publish(who, version), receipt);
  const opened = store.command('scope-player', { idempotencyKey: 'open-historic-scope', command: { type: 'startShift' } });
  assert.ok(opened.result.ok); assert.equal(opened.configVersion, resolved.version);
  // Withdrawing the bad override uses the existing named-scope replacement path.
  const replacement = registry.propose(who, { key: 'correct-scope', baseVersion: config.version, snapshot: config.raw, reason: 'Restore installed thresholds', scope: { ...scope, previousVersion: version } });
  registry.impact(who, replacement.version);
  registry.forecastPlan(who, replacement.version, f.now + 1000);
  registry.approve(who, replacement.version); registry.publish(who, replacement.version);
  assert.deepEqual(registry.resolve('scope-player').raw.onboarding.loginPrompt, config.raw.onboarding.loginPrompt);
  assert.equal(store.read('scope-player').world.shift!.configVersion, resolved.version);
  assert.deepEqual(f.open().read('scope-player'), store.read('scope-player'));
});

for (const scoped of [false, true]) test(`leaderboard display tuning refuses zero, fractional and overflowing timers or page counts in ${scoped ? 'scoped' : 'default'} admin drafts`, t => {
  const f = fixture(t), who = f.actor('super'); f.store.createPlayer('rank-tuning-player', 42);
  const invalid = [{ topN: 0 }, { topN: 0.5 }, { topN: Number.MAX_SAFE_INTEGER + 1 }, { refreshMs: 0 }, { refreshMs: 1.5 }, { refreshMs: 2147483648 }, { neighborsWindow: 0.5 }, { minShiftsToRank: 0.5 }, { shrineTop: 0 }, { shrineTop: 11, wallSize: 10 }, { wallSize: 1.5 }, { historySeasonsKept: 0 }, { historySeasonsKept: 1.5 }, { hideFlagged: 'true' }];
  for (const [i, patch] of invalid.entries()) {
    const raw = structuredClone(config.raw); Object.assign(raw.leaderboard, patch);
    assert.throws(() => f.registry.propose(who, { key: 'bad-rank-' + i, baseVersion: config.version, snapshot: raw, reason: 'Leaderboard display tuning',
      ...(scoped ? { scope: { kind: 'segment' as const, id: 'rank-tuning', playerIds: ['rank-tuning-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null } } : {}) }), /config:leaderboard/, JSON.stringify(patch));
  }
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM registry_proposals').get()!.n, 0);
});

test('a pre-fix invalid leaderboard draft cannot preview or publish, while historical invalid pins stay readable and can be corrected', async t => {
  const raw = structuredClone(config.raw); raw.leaderboard.topN = 0; raw._meta.version = 'old-invalid-rank';
  const f = fixture(t, loadConfig(raw)), who = f.actor('economy');
  f.store.createPlayer('old-rank-pin', 42); assert.ok(f.store.command('old-rank-pin', { idempotencyKey: 'open', command: { type: 'startShift' } }).result.ok);
  const before = f.store.read('old-rank-pin'); await assert.rejects(f.store.leaderboard({ kind: 'ranking', page: 0 }), /config:leaderboard/);
  const fixed = structuredClone(raw); fixed.leaderboard.topN = config.raw.leaderboard.topN;
  const good = f.registry.propose(who, { key: 'fix-rank', baseVersion: raw._meta.version, snapshot: fixed, reason: 'Correct old display setting' });
  f.registry.approve(f.actor('super', 'rank-reviewer'), good.version); const published = f.registry.publish(who, good.version); f.now = published.effective_at;
  assert.ok((await f.store.leaderboard({ kind: 'ranking', page: 0 })).rows);
  assert.equal(f.store.read('old-rank-pin').world.shift!.configVersion, before.world.shift!.configVersion);
  assert.equal(f.registry.config(raw._meta.version).values.leaderboard.topN, 0);
  const version = 'approved-bad-rank-draft', old = structuredClone(fixed); old._meta.version = version; old.leaderboard.refreshMs = 0;
  const reason = 'Old approved draft', fingerprint = JSON.stringify({ baseVersion: good.version, config: configContent(loadConfig(old)), reason, effective: 'next_day' });
  f.db.prepare('INSERT INTO configs VALUES (?,?)').run(version, JSON.stringify(old));
  f.db.prepare('INSERT INTO registry_proposals VALUES (?,?,?,?,?,?,?,?,?)').run(version, 'old-bad-rank', good.version, fingerprint, who.subject, JSON.stringify(['leaderboard.refreshMs']), reason, 'next_day', f.now);
  f.db.prepare('INSERT INTO registry_approvals VALUES (?,?,?)').run(version, who.subject, f.now);
  const registry = f.open().registry;
  assert.throws(() => registry.impact(f.actor('economy'), version), /config:leaderboard/);
  assert.throws(() => registry.publish(f.actor('economy'), version), /config:leaderboard/);
  assert.equal(registry.latest().version, good.version);
});

for (const count of [0, 1, 3]) test(`emergency replaces ${count} pending schedules, keeps their audit and pins, and never reactivates them`, t => {
  const f=fixture(t),r=f.registry,who=f.actor('super','hotfix');
  f.store.createPlayer('playing',42);const opened=f.store.command('playing',{idempotencyKey:'open',command:{type:'startShift'}});
  const schedules=Array.from({length:count},(_,i)=>f.publish(c=>{c.shift.dailyEarnCapBase++;},f.actor('economy','scheduler-'+i)));
  for (const scheduled of schedules) assert.throws(()=>r.draftSource(who,scheduled.version,true),/inactiveEmergencySource/);
  const source=r.draftSource(who,undefined,true);assert.equal(source.baseVersion,config.version);
  assert.equal(source.snapshot.shift.dailyEarnCapBase,config.raw.shift.dailyEarnCapBase);
  source.snapshot.menu.bia.price++;
  const input={key:'emergency',baseVersion:source.baseVersion,snapshot:source.snapshot,reason:'Correct current beer price',emergency:true};
  const d=r.propose(who,input),preview=r.impact(who,d.version);
  assert.deepEqual(preview.supersedes,schedules.map(p=>({version:p.version,effectiveAt:p.effective_at,keys:['shift.dailyEarnCapBase'],proposer:p.changed_by,approver:p.approved_by})));
  assert.throws(()=>r.publish(who,d.version),/staleImpact/);
  assert.throws(()=>r.publish(who,d.version,'0'.repeat(64)),/staleImpact/);
  const receipt=r.publish(who,d.version,preview.token);assert.equal(receipt.effective_at,f.now);
  assert.equal(r.active().version,d.version);assert.equal(r.active().raw.shift.dailyEarnCapBase,config.raw.shift.dailyEarnCapBase);
  const details=r.details(who,d.version);assert.equal(details.emergency,true);assert.equal(details.reviewTicket!.dueAt,f.now+86400000);
  assert.equal(details.approval,null);assert.equal(details.review,null);
  const auditCount=f.db.prepare('SELECT COUNT(*) AS n FROM registry_audit').get()!.n;
  assert.deepEqual(r.propose(who,input),d);assert.deepEqual(r.publish(who,d.version,'obsolete-preview'),receipt);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_audit').get()!.n,auditCount);
  for(const s of schedules){assert.equal(r.details(who,s.version).phase,'archived');assert.equal(r.details(who,s.version).supersededBy,d.version);}
  assert.equal(f.store.read('playing').world.shift!.configVersion,opened.world.shift!.configVersion);
  assert.deepEqual(f.store.command('playing',{idempotencyKey:'open',command:{type:'startShift'}}).result,opened.result);
  assert.equal(f.open().registry.active().version,d.version);
  f.now+=86400000;
  assert.equal(r.active().version,d.version);assert.equal(f.open().createPlayer('after-schedules',43).configVersion,d.version);
  assert.deepEqual(r.publish(f.actor('super','hotfix'),d.version,preview.token),receipt);
  assert.throws(()=>r.reviewEmergency(f.actor('super','hotfix'),d.version,'self review'),/distinctApprover/);
  const reviewer=f.actor('super','post-reviewer'),review=r.reviewEmergency(reviewer,d.version,'Checked pinned saves and replaced schedules');
  assert.deepEqual(r.reviewEmergency(reviewer,d.version,review.reason),review);assert.equal(r.details(reviewer,d.version).review!.reviewedBy,reviewer.subject);
  assert.throws(()=>r.reviewEmergency(reviewer,d.version,'different conclusion'),/alreadyApproved/);
  const replay=new Game(config,42,NOW,'playing');
  for(const row of f.db.prepare('SELECT entry FROM commands WHERE player_id=? ORDER BY seq').all('playing')){const entry=JSON.parse(String(row.entry));assert.deepEqual(replay.replay(entry,r.config(entry.configVersion)),entry.result);}
});

test('emergency gate rejects non-Super, missing MFA, Tier C, malformed flags, schema and catalog bypasses',t=>{
  const f=fixture(t),r=f.registry,superActor=f.actor('super');
  const input={key:'guard',baseVersion:config.version,snapshot:structuredClone(config.raw),reason:'Fix',emergency:true};input.snapshot.menu.bia.price++;
  for(const role of ['economy','game','support','viewer'] as const)assert.throws(()=>r.propose(f.actor(role),input),/forbidden/);
  assert.throws(()=>r.propose({...superActor,mfa:false},input),/invalidActor/);
  assert.throws(()=>r.propose(superActor,{...input,emergency:'true' as never}),/invalidInput/);
  assert.throws(()=>r.propose(superActor,{...input,effective:'next_day'}),/earlyActivation/);
  const c=structuredClone(input);c.snapshot.audio.enabled=!c.snapshot.audio.enabled;assert.throws(()=>r.propose(superActor,c),/emergencyTier/);
  const invalid=structuredClone(input);delete (invalid.snapshot.onboarding.loginPrompt as Record<string,unknown>).leaveProgress;assert.throws(()=>r.propose(superActor,invalid),/config:/);
  const identity=structuredClone(input);identity.snapshot.locations.list[0].id='renamed';assert.throws(()=>r.propose(superActor,identity),/identityMigrationRequired|config:/);
  const d=r.propose(superActor,input);assert.throws(()=>r.approve(superActor,d.version),/emergencyApproval/);
  assert.throws(()=>r.publish(f.actor(),d.version,r.impact(superActor,d.version).token),/forbidden/);
});

test('default emergency cannot cancel pending Tier C keys at proposal or publication',t=>{
  const f=fixture(t),r=f.registry,who=f.actor('super');
  const snapshot=structuredClone(config.raw);snapshot.menu.bia.price++;
  const input={key:'before-schedule',baseVersion:config.version,snapshot,reason:'Correct beer price',emergency:true};
  const d=r.propose(who,input);
  const scheduled=f.publish(c=>{c.shift.dailyEarnCapBase++;c.audio.enabled=!c.audio.enabled;},who);
  assert.ok(scheduled.effective_at>f.now);
  assert.throws(()=>r.propose(who,{...input,key:'after-schedule'}),/emergencyTier/);
  assert.throws(()=>r.publish(who,d.version,r.impact(who,d.version).token),/emergencyTier/);
  assert.equal(r.details(who,d.version).permissions.publish,false);
  assert.equal(r.details(who,d.version).reviewTicket,null);
  assert.equal(r.details(who,scheduled.version).supersededBy,null);
  f.now=scheduled.effective_at;
  assert.equal(r.active().version,scheduled.version);
});

test('hotfix confirmation becomes stale when another schedule is published or crosses its activation boundary',t=>{
  const f=fixture(t),r=f.registry,who=f.actor('super');const snapshot=structuredClone(config.raw);snapshot.menu.bia.price++;
  const d=r.propose(who,{key:'hotfix',baseVersion:config.version,snapshot,reason:'Hotfix',emergency:true}),first=r.impact(who,d.version);
  const scheduled=f.publish(c=>{c.shift.dailyEarnCapBase++;});
  assert.throws(()=>r.publish(who,d.version,first.token),/staleImpact/);
  const current=r.impact(who,d.version);assert.equal(current.supersedes!.length,1);
  f.now=scheduled.effective_at;
  assert.throws(()=>r.publish(f.actor('super'),d.version,current.token),/staleBase/);
  assert.equal(f.db.prepare('SELECT 1 FROM registry_publications WHERE version=?').get(d.version),undefined);
});

test('hotfix publication, supersession markers and 24-hour ticket roll back together on audit failure',t=>{
  const f=fixture(t),r=f.registry,who=f.actor('super');const schedule=f.publish(c=>{c.shift.dailyEarnCapBase++;});
  const snapshot=structuredClone(config.raw);snapshot.menu.bia.price++;
  const d=r.propose(who,{key:'atomic',baseVersion:config.version,snapshot,reason:'Hotfix',emergency:true}),preview=r.impact(who,d.version);
  f.db.exec("CREATE TRIGGER fail_ticket BEFORE INSERT ON registry_audit WHEN NEW.type='ConfigEmergencyReviewOpened' BEGIN SELECT RAISE(ABORT,'test:ticketFailure'); END;");
  assert.throws(()=>r.publish(who,d.version,preview.token),/ticketFailure/);
  assert.equal(r.details(who,schedule.version).phase,'scheduled');assert.equal(r.details(who,schedule.version).supersededBy,null);
  assert.equal(r.details(who,d.version).publication,null);assert.equal(r.details(who,d.version).reviewTicket,null);
  f.db.exec('DROP TRIGGER fail_ticket');r.publish(who,d.version,preview.token);
  assert.ok(r.details(who,d.version).reviewTicket);
});

test('superseded schedules require explicit normal republication; rollback also publishes an old snapshot as a new version',t=>{
  const f=fixture(t),r=f.registry,who=f.actor('super');const scheduled=f.publish(c=>{c.shift.dailyEarnCapBase++;});
  const snapshot=structuredClone(config.raw);snapshot.menu.bia.price++;
  const d=r.propose(who,{key:'hotfix',baseVersion:config.version,snapshot,reason:'Emergency',emergency:true});r.publish(who,d.version,r.impact(who,d.version).token);
  const source=r.draftSource(who,scheduled.version);
  const republished=r.propose(who,{key:'republish',...source,scope:undefined,reason:'Explicitly republish scheduled values'});
  assert.throws(()=>r.publish(who,republished.version),/approvalRequired/);
  assert.throws(()=>r.approve(who,republished.version),/distinctApprover/);
  r.approve(f.actor('super','reviewer'),republished.version);const pub=r.publish(who,republished.version);
  assert.notEqual(pub.version,scheduled.version);assert.ok(pub.effective_at>f.now);
  assert.equal(r.active().version,d.version);f.now=pub.effective_at;assert.equal(r.active().version,pub.version);
  const old=r.draftSource(f.actor('super'),config.version),rollback=r.propose(f.actor('super'),{key:'rollback',...old,scope:undefined,reason:'Restore original values'});
  r.approve(f.actor('super','reviewer'),rollback.version);const rolled=r.publish(f.actor('super'),rollback.version);f.now=rolled.effective_at;
  const {_meta:actualMeta,...actual}=r.active().raw,{_meta:seedMeta,...expected}=config.raw;assert.deepEqual(actual,expected);assert.equal(r.details(f.actor('viewer'),scheduled.version).supersededBy,d.version);
});

test('archive and eligibility tuning waits for the common season boundary while topN and refresh stay next-day', t => {
  const f = fixture(t);
  for (const key of ['neighborsWindow', 'minShiftsToRank', 'shrineTop', 'wallSize', 'historySeasonsKept', 'hideFlagged'])
    assert.equal(registryPolicy(['leaderboard.' + key], config).effective, 'next_season');
  for (const key of ['topN', 'refreshMs']) assert.equal(registryPolicy(['leaderboard.' + key], config).effective, 'next_day');
  const before = f.registry.active(), pub = f.publish(raw => { raw.leaderboard.wallSize++; raw.leaderboard.historySeasonsKept++; });
  assert.equal(pub.effective_at, seasonWindow(f.now, config, 'contest').endsAt);
  f.now = pub.effective_at - 1;
  assert.equal(f.registry.active().version, before.version);
  assert.equal(f.registry.active().values.leaderboard.historySeasonsKept, config.values.leaderboard.historySeasonsKept);
  f.now++; assert.equal(f.registry.active().version, pub.version);
});

// A representative one-serve sample, scaled by the candidate's own declared bia price -- a stand-in for the
// real forecast-worker measurement, proving serveValueStats/compareEconomy's k exposure end to end without
// paying a multi-second bot simulation inside this suite.
const sampleMeasurer: MeasureK = candidate => serveValueStats([{ t: 0, customerId: 'sample', customerType: 'thuong', orderId: 'sample-order',
  dishes: ['bia'], payment: candidate.values.menu.bia.price * 4, tip: 0, credited: 0, hadMoi: false, stale: false, patienceRatio: 1 }], candidate).kValue!;

test('a real pricing blowup that self-reports an in-band k is refused once actually measured (fails on main today)', t => {
  const f = fixture(t, config, sampleMeasurer);
  const d = f.draft(raw => { raw.menu.bia.price *= 50; }); // k.value/k.band left at the seed's own values -- self-report alone would admit this
  f.registry.approve(f.actor('super', 'reviewer'), d.version);
  assert.throws(() => f.registry.publish(f.actor(), d.version), (error: unknown) => {
    assert.ok(error instanceof Error); assert.match(error.message, /^registry:bindingRange$/);
    const e = error as Error & { measured: number; band: readonly number[] };
    assert.ok(e.measured > e.band[1], `measured ${e.measured} should exceed band[1] ${e.band[1]}`);
    assert.deepEqual([...e.band], [...config.values.k.band]);
    return true;
  });
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(d.version)!.state, 'refused');
  assert.equal(f.registry.latest().version, config.version);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_publications WHERE version=?').get(d.version)!.n, 1, 'the attempt is still audited, just never admitted');
});

test('a modest pricing change with a genuinely in-band measured k is admitted', t => {
  const f = fixture(t, config, sampleMeasurer);
  const d = f.draft(raw => { raw.menu.bia.price++; });
  f.registry.approve(f.actor('super', 'reviewer'), d.version);
  const pub = f.registry.publish(f.actor(), d.version);
  const row = f.db.prepare('SELECT state, measured_k FROM registry_measurements WHERE version=?').get(d.version)!;
  assert.equal(row.state, 'admitted'); assert.ok(Number(row.measured_k) >= config.values.k.band[0] && Number(row.measured_k) <= config.values.k.band[1]);
  f.now = pub.effective_at; assert.equal(f.registry.active().version, d.version);
});

test('a pending async measurement never becomes active until it settles, and re-checking it throws kUnmeasured', async t => {
  let resolveMeasurement!: (k: number) => void;
  const pending = new Promise<number>(resolve => { resolveMeasurement = resolve; });
  const f = fixture(t, config, () => pending), before = f.registry.latest();
  const d = f.draft(raw => { raw.menu.bia.price++; });
  f.registry.approve(f.actor('super', 'reviewer'), d.version);
  const pub = f.registry.publish(f.actor(), d.version); // returns immediately; measurement still pending
  assert.equal(pub.version, d.version);
  assert.equal(f.registry.latest().version, before.version, 'a pending publication is not latest');
  f.now = pub.effective_at;
  assert.equal(f.registry.active().version, before.version, 'the player path never sees a pending publication as active');
  assert.throws(() => f.registry.publish(f.actor(), d.version), /registry:kUnmeasured/);
  resolveMeasurement(2.6); // settles in-band
  await f.registry.settleMeasurements();
  assert.equal(f.registry.latest().version, d.version);
  assert.equal(f.registry.active().version, d.version);
});

test('resolve()/compose() never invoke the measurer on the real-player hot path -- only publish() does', t => {
  const f = fixture(t);
  f.store.createPlayer('alice', 42);
  const scope: ConfigScope = { kind: 'segment', id: 'group', playerIds: ['alice'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  f.publish(raw => { raw.menu.bia.price++; }); // admitted via the default (working) measurer
  const scopedSnapshot = structuredClone(f.registry.config(f.registry.latest().version).raw); scopedSnapshot.menu.lac.price++;
  const scopedProposal = f.registry.propose(f.actor(), { key: 'scoped-hotpath', baseVersion: f.registry.latest().version, snapshot: scopedSnapshot, reason: 'Scoped path', scope });
  f.registry.approve(f.actor('super', 'reviewer'), scopedProposal.version);
  f.registry.publish(f.actor(), scopedProposal.version); // also admitted via the default measurer
  const throwing: MeasureK = () => { throw Error('registry:measurerCalledOnHotPath'); };
  const restarted = new GameStore(f.file, config, () => f.now, throwing);
  t.after(() => restarted.close());
  assert.doesNotThrow(() => restarted.registry.resolve('alice'));
  assert.doesNotThrow(() => restarted.registry.active());
  const opened = restarted.command('alice', { idempotencyKey: 'open-hotpath', command: { type: 'startShift' } });
  assert.ok(opened.result.ok);
});

// The four cases above all inject a synthetic measurer -- none of them prove the REAL production wiring
// (measureKViaForecast -> forecastEconomy -> forecast-worker.mjs) actually measures and gates correctly
// (codex round 1 finding). These two use the real worker, matching apps/server/src/main.ts's own wiring.
function realWorkerFixture(t: { after(fn: () => unknown): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-registry-realworker-')), file = join(dir, 'game.db');
  let now = NOW;
  const store: GameStore = new GameStore(file, config, () => now, (_c, version, actor) => measureKViaForecast(store, actor, version));
  const db = new DatabaseSync(file);
  t.after(() => { store.close(); db.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = (role: AdminActor['role'] = 'economy', subject: string = role): AdminActor => ({ subject, role, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  return { store, db, registry: store.registry, actor, get now() { return now; }, set now(v) { now = v; } };
}

test('the real forecast worker measures a genuine price blowup and refuses it, not just the self-reported k.value', { timeout: 120000 }, async t => {
  const f = realWorkerFixture(t);
  f.store.createPlayer('real-worker-player', 42);
  f.store.command('real-worker-player', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const base = f.registry.config(f.registry.latest().version), snapshot = structuredClone(base.raw);
  snapshot.menu.bia.price *= 50; // k.value/k.band left at the seed's own values -- only a real sim catches this
  const draft = f.registry.propose(f.actor(), { key: 'real-worker-blowup', baseVersion: base.version, snapshot, reason: 'Real worker measurement probe' });
  f.registry.approve(f.actor('super', 'reviewer'), draft.version);
  f.registry.publish(f.actor(), draft.version);
  await f.registry.settleMeasurements();
  const row = f.db.prepare('SELECT state, measured_k FROM registry_measurements WHERE version=?').get(draft.version)!;
  assert.equal(row.state, 'refused'); assert.ok(Number(row.measured_k) > config.values.k.band[1]);
  assert.equal(f.registry.latest().version, base.version);
});

test('a scoped candidate refused by the real worker never composes into that player\'s resolve()', { timeout: 120000 }, async t => {
  const f = realWorkerFixture(t);
  f.store.createPlayer('scoped-real-player', 42);
  f.store.command('scoped-real-player', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const scope: ConfigScope = { kind: 'segment', id: 'real-worker-group', playerIds: ['scoped-real-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version), snapshot = structuredClone(base.raw); snapshot.menu.bia.price *= 50;
  const draft = f.registry.propose(f.actor(), { key: 'scoped-real-worker-blowup', baseVersion: base.version, snapshot, reason: 'Scoped real-worker probe', scope });
  f.registry.approve(f.actor('super', 'reviewer'), draft.version);
  f.registry.publish(f.actor(), draft.version);
  // Still pending (worker running) -- must not already be composed into the real player's resolve.
  assert.equal(f.registry.resolve('scoped-real-player').raw.menu.bia.price, base.raw.menu.bia.price);
  await f.registry.settleMeasurements();
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draft.version)!.state, 'refused');
  // Refused, not just pending -- resolve() still excludes it, permanently.
  assert.equal(f.registry.resolve('scoped-real-player').raw.menu.bia.price, base.raw.menu.bia.price);
});

test('a scoped campaign that expires within the forecast horizon is measured on its own serves, not the reverted baseline', { timeout: 120000 }, async t => {
  const f = realWorkerFixture(t);
  f.store.createPlayer('expiring-campaign-player', 42);
  f.store.command('expiring-campaign-player', { idempotencyKey: 'open', command: { type: 'startShift' } });
  // Expires partway through the 7-day forecast horizon -- the timeline's LAST period reverts to baseline.
  // Using at(-1) to pick "the candidate's" config would measure baseline serves instead (codex round 3).
  const scope: ConfigScope = { kind: 'campaign', id: 'expiring-real-worker', playerIds: ['expiring-campaign-player'], priority: 0, expiresAt: f.now + 3 * 86400000, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version), snapshot = structuredClone(base.raw); snapshot.menu.bia.price *= 50;
  const draft = f.registry.propose(f.actor(), { key: 'expiring-blowup', baseVersion: base.version, snapshot, reason: 'Expiring campaign probe', scope });
  f.registry.approve(f.actor('super', 'reviewer'), draft.version);
  f.registry.publish(f.actor(), draft.version);
  await f.registry.settleMeasurements();
  const row = f.db.prepare('SELECT state, measured_k FROM registry_measurements WHERE version=?').get(draft.version)!;
  assert.equal(row.state, 'refused'); assert.ok(Number(row.measured_k) > config.values.k.band[1]);
});

test('a scoped proposal against a still-pending sibling for the same scope is refused as measurementPending, not silently accepted', t => {
  let resolveA!: (k: number) => void;
  const pendingA = new Promise<number>(resolve => { resolveA = resolve; });
  let calls = 0;
  // First measurement call (draft A's) hangs; every later call resolves in-band immediately.
  const f = fixture(t, config, candidate => { calls++; return calls === 1 ? pendingA : candidate.values.k.value; });
  f.store.createPlayer('race-player', 42);
  const scope: ConfigScope = { kind: 'segment', id: 'race-group', playerIds: ['race-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version);
  const snapshotA = structuredClone(base.raw); snapshotA.menu.bia.price++;
  const draftA = f.registry.propose(f.actor(), { key: 'race-a', baseVersion: base.version, snapshot: snapshotA, reason: 'A', scope });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  f.registry.publish(f.actor(), draftA.version); // stays pending -- measurement A is still hanging
  // B targets the same scope while A is still pending: currentBase() now refuses this outright, before base/
  // predecessor staleness even enters into it -- two proposals can never be pending on overlapping scopes.
  const snapshotB = structuredClone(base.raw); snapshotB.menu.lac.price++;
  assert.throws(() => f.registry.propose(f.actor(), { key: 'race-b', baseVersion: base.version, snapshot: snapshotB, reason: 'B', scope }), /registry:measurementPending/);
  resolveA(2.6);
});

test('scopeSource() stays admitted-only while a newer sibling for the same scope is still pending', t => {
  let calls = 0;
  let resolveSecond!: (k: number) => void;
  const pendingSecond = new Promise<number>(resolve => { resolveSecond = resolve; });
  // First publish (the admitted one) resolves immediately in-band; the second stays pending.
  const f = fixture(t, config, candidate => { calls++; return calls === 1 ? candidate.values.k.value : pendingSecond; });
  f.store.createPlayer('mismatch-player', 42);
  const scope: ConfigScope = { kind: 'segment', id: 'mismatch-group', playerIds: ['mismatch-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version);
  const snapshotA = structuredClone(base.raw); snapshotA.menu.bia.price = 51;
  const draftA = f.registry.propose(f.actor(), { key: 'mismatch-a', baseVersion: base.version, snapshot: snapshotA, reason: 'A', scope });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  f.registry.publish(f.actor(), draftA.version); // admitted immediately
  const snapshotB = structuredClone(f.registry.config(draftA.version).raw); snapshotB.menu.bia.price = 57;
  const draftB = f.registry.propose(f.actor(), { key: 'mismatch-b', baseVersion: f.registry.latest().version, snapshot: snapshotB, reason: 'B', scope: { ...scope, previousVersion: draftA.version } });
  f.registry.approve(f.actor('super', 'reviewer'), draftB.version);
  f.registry.publish(f.actor(), draftB.version); // stays pending -- doesn't exist for scheduling yet, so
  // scopeSource() must keep returning the still-admitted A untouched, never a mix of A with pending B's price.
  const source = f.registry.scopeSource(f.actor(), 'segment', 'mismatch-group');
  assert.equal(source.snapshot.menu.bia.price, 51);
  resolveSecond(2.6);
});

test('overlapping-audience scoped proposals are refused as measurementPending while the first is still pending', t => {
  // Every measurement hangs forever -- this test only needs currentBase()'s synchronous pre-insert check,
  // which runs before measureK is ever invoked.
  const f = fixture(t, config, () => new Promise<number>(() => {}));
  f.store.createPlayer('conflict-player', 42);
  const base = f.registry.config(f.registry.latest().version);
  const scopeA: ConfigScope = { kind: 'segment', id: 'conflict-a', playerIds: ['conflict-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const scopeB: ConfigScope = { kind: 'segment', id: 'conflict-b', playerIds: ['conflict-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotA = structuredClone(base.raw); snapshotA.menu.bia.price = 60;
  const draftA = f.registry.propose(f.actor(), { key: 'conflict-a', baseVersion: base.version, snapshot: snapshotA, reason: 'A', scope: scopeA });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  f.registry.publish(f.actor(), draftA.version); // stays pending -- different scope id, but the same audience
  // B shares A's audience while A is still pending: currentBase() refuses it outright at propose() time, long
  // before B could ever reach its own scopeConflict self-check (codex round 5's original race -- A being
  // merely pending made it invisible to B's own pre-insert check -- is closed earlier now: two proposals can
  // never be pending on overlapping scopes at once).
  const snapshotB = structuredClone(base.raw); snapshotB.menu.bia.price = 70;
  assert.throws(() => f.registry.propose(f.actor(), { key: 'conflict-b', baseVersion: base.version, snapshot: snapshotB, reason: 'B', scope: scopeB }), /registry:measurementPending/);
});

test('a scoped conflict against a still-admitted original is caught immediately, even while its own cancellation is pending (round-6 finding 1)', t => {
  let resolveCancel!: (k: number) => void;
  const pendingCancel = new Promise<number>(resolve => { resolveCancel = resolve; });
  let calls = 0;
  // Call 1 (A's own publish) settles in-band immediately; call 2 (the cancellation) hangs. B, if the fix
  // holds, never reaches a measurement call at all -- its conflict is caught synchronously before publish().
  const f = fixture(t, config, candidate => { calls++; return calls === 2 ? pendingCancel : candidate.values.k.value; });
  f.store.createPlayer('finding1-p1', 42); f.store.createPlayer('finding1-p2', 43);
  const scopeA: ConfigScope = { kind: 'segment', id: 'finding1-a', playerIds: ['finding1-p1', 'finding1-p2'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version), snapshotA = structuredClone(base.raw); snapshotA.menu.bia.price = 60;
  const draftA = f.registry.propose(f.actor(), { key: 'finding1-a', baseVersion: base.version, snapshot: snapshotA, reason: 'Scheduled scoped price', scope: scopeA, effective: 'next_day' });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  const scheduled = f.registry.publish(f.actor(), draftA.version); // admitted, but scheduled for tomorrow
  assert.ok(scheduled.effective_at > f.now);
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftA.version)!.state, 'admitted');
  // Cancel it: same scope slot, previousVersion chains to A, but narrows the audience to p2 only -- p1 stays
  // uncovered by the cancellation while it's pending, so a conflict against p1 must still see the admitted A.
  const cancelScope: ConfigScope = { ...scopeA, playerIds: ['finding1-p2'], previousVersion: draftA.version };
  // effective:'next_day' matches (not jumps ahead of) A's own reserved slot -- otherwise publicationAt()'s
  // scheduleConflict fires here first, for an unrelated reason this test isn't about.
  const cancelDraft = f.registry.propose(f.actor(), { key: 'finding1-cancel', baseVersion: base.version, snapshot: base.raw, reason: 'Cancel scoped price', scope: cancelScope, effective: 'next_day' });
  f.registry.approve(f.actor('super', 'reviewer'), cancelDraft.version);
  f.registry.publish(f.actor(), cancelDraft.version); // stays pending -- measurement 2 is still hanging
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(cancelDraft.version)!.state, 'pending');
  // A conflicting second scope for p1: same kind+priority as A, touches the same key with a different value.
  // p1 is outside the pending cancellation's audience, so this must NOT trip measurementPending -- it must
  // instead see the still-admitted A and refuse immediately, never silently admit and crash a real player's
  // resolve() later once day 14 actually arrives.
  const scopeB: ConfigScope = { kind: 'segment', id: 'finding1-b', playerIds: ['finding1-p1'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotB = structuredClone(base.raw); snapshotB.menu.bia.price = 70;
  const draftB = f.registry.propose(f.actor(), { key: 'finding1-b', baseVersion: base.version, snapshot: snapshotB, reason: 'Conflicting scoped price', scope: scopeB });
  f.registry.approve(f.actor('super', 'reviewer'), draftB.version);
  assert.throws(() => f.registry.impact(f.actor(), draftB.version), /registry:scopeConflict/);
  assert.throws(() => f.registry.publish(f.actor(), draftB.version), /registry:scopeConflict/);
  assert.equal(f.db.prepare('SELECT 1 FROM registry_publications WHERE version=?').get(draftB.version), undefined);
  f.now = scheduled.effective_at;
  assert.doesNotThrow(() => f.registry.resolve('finding1-p1'));
  assert.equal(f.registry.resolve('finding1-p1').raw.menu.bia.price, 60);
  resolveCancel(2.6);
});

test('an emergency cannot race a due-now-but-pending Tier C entry at the same scope slot to bypass emergencyTier', t => {
  let resolveX!: (k: number) => void;
  const pendingX = new Promise<number>(resolve => { resolveX = resolve; });
  const f = fixture(t, config, () => pendingX);
  f.store.createPlayer('finding2-p1', 42);
  const scopeX: ConfigScope = { kind: 'segment', id: 'finding2-mixed', playerIds: ['finding2-p1'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const base = f.registry.config(f.registry.latest().version), snapshotX = structuredClone(base.raw); snapshotX.audio.enabled = !snapshotX.audio.enabled;
  const draftX = f.registry.propose(f.actor('game'), { key: 'finding2-x', baseVersion: base.version, snapshot: snapshotX, reason: 'Tier C scoped toggle', scope: scopeX, effective: 'immediate' });
  f.registry.approve(f.actor('super', 'reviewer'), draftX.version);
  const published = f.registry.publish(f.actor('game'), draftX.version); // due now (immediate), measurement still hanging
  assert.equal(published.effective_at, f.now);
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftX.version)!.state, 'pending');
  // An emergency at the SAME slot, touching only a Tier A/B key of its own: if emergencyScopeReplacements()
  // spuriously treated the due-now-but-pending X as governing content, emergencyTier (checked earlier in
  // propose()) would fire first; instead the slot is refused outright by measurementPending, proving X's
  // Tier C content is neither silently displaced nor able to leak a false emergencyTier pass-through.
  const scopeZ: ConfigScope = { kind: 'segment', id: 'finding2-mixed', playerIds: ['finding2-p1'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotZ = structuredClone(base.raw); snapshotZ.menu.bia.price++;
  const inputZ = { key: 'finding2-z', baseVersion: f.registry.active().version, snapshot: snapshotZ, reason: 'Emergency at the same slot', scope: scopeZ, emergency: true };
  assert.throws(() => f.registry.propose(f.actor('super'), inputZ), /registry:measurementPending/);
  resolveX(2.6);
});

test('pendingSchedules() excludes a refused future schedule from emergency displacement and preview', t => {
  const f = fixture(t, config, candidate => candidate.raw.audio.enabled !== config.raw.audio.enabled ? 999 : candidate.values.k.value);
  const base = f.registry.config(f.registry.latest().version);
  const snapshotR = structuredClone(base.raw); snapshotR.audio.enabled = !snapshotR.audio.enabled;
  const draftR = f.registry.propose(f.actor('game'), { key: 'refused-d', baseVersion: base.version, snapshot: snapshotR, reason: 'Tier C toggle, will measure out-of-band', effective: 'next_day' });
  f.registry.approve(f.actor('super', 'reviewer'), draftR.version);
  assert.throws(() => f.registry.publish(f.actor('game'), draftR.version), /registry:bindingRange/);
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftR.version)!.state, 'refused');
  assert.ok(Number(f.db.prepare('SELECT effective_at FROM registry_publications WHERE version=?').get(draftR.version)!.effective_at) > f.now, 'still scheduled in the future, just refused');
  // A refused publication doesn't exist for scheduling either: an emergency touching only a Tier A/B key of
  // its own must not see the refused Tier C schedule as something it displaces -- if pendingSchedules() still
  // included it, this emergency would spuriously throw emergencyTier.
  const snapshotE = structuredClone(base.raw); snapshotE.menu.bia.price++;
  const inputE = { key: 'emergency-d', baseVersion: f.registry.active().version, snapshot: snapshotE, reason: 'Unrelated emergency', emergency: true };
  const draftE = f.registry.propose(f.actor('super'), inputE);
  const preview = f.registry.impact(f.actor('super'), draftE.version);
  assert.deepEqual(preview.supersedes, []);
  f.registry.publish(f.actor('super'), draftE.version, preview.token);
});

test('a forecast report computed while an unrelated version was pending is stale after that version admits', async t => {
  let resolveW!: (k: number) => void;
  const pendingW = new Promise<number>(resolve => { resolveW = resolve; });
  const f = fixture(t, config, () => pendingW);
  f.store.createPlayer('forecast-w-player', 42); f.store.createPlayer('forecast-v-player', 43);
  const base = f.registry.config(f.registry.latest().version);
  // W and V are disjoint scoped slots (different id, different audience) so W admitting never trips V's OWN
  // currentBase() (neither the default latest() nor predecessor(V.scope), both untouched by W) -- isolating
  // the one thing that SHOULD go stale: the global measurementSeq() bump from W's settlement.
  const scopeW: ConfigScope = { kind: 'segment', id: 'forecast-w-scope', playerIds: ['forecast-w-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotW = structuredClone(base.raw); snapshotW.menu.bia.price++;
  const draftW = f.registry.propose(f.actor(), { key: 'forecast-w', baseVersion: base.version, snapshot: snapshotW, reason: 'Unrelated scoped change', scope: scopeW });
  f.registry.approve(f.actor('super', 'reviewer'), draftW.version);
  const publishedW = f.registry.publish(f.actor(), draftW.version); // due now, measurement still hanging
  assert.equal(publishedW.effective_at, f.now);
  const scopeV: ConfigScope = { kind: 'segment', id: 'forecast-v-scope', playerIds: ['forecast-v-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotV = structuredClone(base.raw); snapshotV.menu.lac.price++;
  const draftV = f.registry.propose(f.actor(), { key: 'forecast-v', baseVersion: base.version, snapshot: snapshotV, reason: 'Scoped candidate', scope: scopeV });
  const report = f.registry.forecastPlan(f.actor('viewer'), draftV.version, f.now + 7 * 86400000);
  assert.doesNotThrow(() => f.registry.assertForecastCurrent(f.actor('viewer'), report));
  // W settling doesn't touch registry_publications.seq at all -- registryRevision alone would miss this.
  resolveW(2.6); await f.registry.settleMeasurements();
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftW.version)!.state, 'admitted');
  assert.throws(() => f.registry.assertForecastCurrent(f.actor('viewer'), report), /registry:staleForecast/);
});

test('a pending emergency does not archive the schedule it names until it admits, and never does if refused (codex review round 1 finding)', async t => {
  let resolveEmergency!: (k: number) => void;
  const pendingEmergency = new Promise<number>(resolve => { resolveEmergency = resolve; });
  let calls = 0;
  const f = fixture(t, config, candidate => { calls++; return calls === 1 ? candidate.values.k.value : pendingEmergency; });
  const base = f.registry.config(f.registry.latest().version);
  const snapshotA = structuredClone(base.raw); snapshotA.shift.dailyEarnCapBase++;
  const draftA = f.registry.propose(f.actor(), { key: 'schedule-a', baseVersion: base.version, snapshot: snapshotA, reason: 'Scheduled change', effective: 'next_day' });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  const scheduled = f.registry.publish(f.actor(), draftA.version); // admitted, scheduled for tomorrow
  assert.ok(scheduled.effective_at > f.now);
  const snapshotE = structuredClone(base.raw); snapshotE.menu.bia.price++;
  const draftE = f.registry.propose(f.actor('super'), { key: 'emergency', baseVersion: base.version, snapshot: snapshotE, reason: 'Emergency', emergency: true });
  const preview = f.registry.impact(f.actor('super'), draftE.version);
  f.registry.publish(f.actor('super'), draftE.version, preview.token); // stays pending -- measurement 2 hangs
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftE.version)!.state, 'pending');
  // While the emergency is pending, the schedule it named must stay live -- not archived, not supersededBy it.
  // publish()'s emergency branch writes the ConfigScheduleSuperseded audit synchronously, before its own
  // measurement settles -- supersededBy() must not trust that record until the writer itself is admitted.
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).phase, 'scheduled');
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).supersededBy, null);
  resolveEmergency(999); // out of band -- refused
  await f.registry.settleMeasurements();
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftE.version)!.state, 'refused');
  // Permanently: a refused emergency never takes effect, so the schedule it named stays visible forever.
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).phase, 'scheduled');
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).supersededBy, null);
  f.now = scheduled.effective_at;
  assert.equal(f.registry.active().version, draftA.version);
});

test('measureKViaForecast refuses a measurement whose registry state went stale while the worker ran (codex review round 1 finding)', { timeout: 120000 }, async t => {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-registry-stale-')), file = join(dir, 'game.db');
  let calls = 0;
  // The registry's OWN measurement attempt for the target version hangs forever -- irrelevant, since this
  // test measures it independently via a standalone measureKViaForecast call. Only the SECOND (unrelated,
  // scoped) publish needs to settle fast, admitting synchronously while the real worker is still mid-flight.
  const store = new GameStore(file, config, () => NOW, c => { calls++; return calls === 1 ? new Promise<number>(() => {}) : c.values.k.value; });
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const actor = (role: AdminActor['role'] = 'economy', subject: string = role): AdminActor => ({ subject, role, mfa: true, issuedAt: NOW, expiresAt: NOW + 3600000 });
  store.createPlayer('stale-player', 42); store.createPlayer('stale-w-player', 43);
  store.command('stale-player', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const registry = store.registry, base = registry.config(registry.latest().version), snapshot = structuredClone(base.raw); snapshot.menu.bia.price++;
  // Scoped, not default: a default proposal's audience is every player (scopeOverlap()), so the unrelated
  // scoped settlement below (a disjoint audience) would itself be blocked as measurementPending if this
  // candidate were default -- scoping it to its own disjoint player keeps the two truly independent.
  const scopeTarget: ConfigScope = { kind: 'segment', id: 'stale-target', playerIds: ['stale-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const draft = registry.propose(actor(), { key: 'stale-target', baseVersion: base.version, snapshot, reason: 'Measure via real worker', scope: scopeTarget });
  registry.approve(actor('super', 'reviewer'), draft.version);
  registry.publish(actor(), draft.version); // stays pending -- the registry's own attempt hangs, unused
  const measuring = measureKViaForecast(store, actor(), draft.version); // independent real-worker measurement
  // Not fully deterministic (there is no observable signal for "the worker's DB backup finished"), but
  // bounded: a SQLite backup of this tiny test DB is I/O, not compute, so it cannot plausibly still be
  // running after 5s even under heavy load, while the full simulation is documented at ~9-18s minimum in
  // light load and has run 60-90s+ under this session's own observed heavy load -- so 5s reliably lands
  // after the backup and well before completion in both directions (codex review round 2 finding: guard the
  // "simulation finished first" direction explicitly instead of trusting the delay blindly).
  let settledEarly = false;
  measuring.then(() => { settledEarly = true; }, () => { settledEarly = true; });
  await delay(5000);
  assert.equal(settledEarly, false, 'the worker finished (or errored) before this test could mutate the registry mid-flight -- widen the simulated workload or the delay');
  const scopeW: ConfigScope = { kind: 'segment', id: 'stale-w', playerIds: ['stale-w-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotW = structuredClone(base.raw); snapshotW.menu.lac.price++;
  const draftW = registry.propose(actor(), { key: 'stale-w', baseVersion: base.version, snapshot: snapshotW, reason: 'Unrelated settlement mid-flight', scope: scopeW });
  registry.approve(actor('super', 'reviewer'), draftW.version);
  registry.publish(actor(), draftW.version); // admits synchronously (call 2) while the worker is still mid-flight
  await assert.rejects(measuring, /registry:staleForecast/);
});

test('a pending default proposal blocks any scoped proposal from being created, and vice versa (codex review round 2 finding)', async t => {
  let resolveX!: (k: number) => void, resolveY!: (k: number) => void;
  const pendingX = new Promise<number>(resolve => { resolveX = resolve; });
  const pendingY = new Promise<number>(resolve => { resolveY = resolve; });
  let calls = 0;
  const f = fixture(t, config, candidate => { calls++; return calls === 1 ? pendingX : calls === 2 ? pendingY : candidate.values.k.value; });
  f.store.createPlayer('overlap-player', 42);
  const base = f.registry.config(f.registry.latest().version);
  const snapshotX = structuredClone(base.raw); snapshotX.menu.bia.price++;
  const draftX = f.registry.propose(f.actor(), { key: 'overlap-default', baseVersion: base.version, snapshot: snapshotX, reason: 'Default change' });
  f.registry.approve(f.actor('super', 'reviewer'), draftX.version);
  f.registry.publish(f.actor(), draftX.version); // stays pending -- measurement 1 hangs
  // A default proposal's audience is every player (affectedPlayers()'s own reading of "no scope"): a
  // scoped proposal must not be creatable while it's pending -- the two independently-valid publications
  // this closes could otherwise compose into a schema-invalid config for a real player once both admit.
  const scope: ConfigScope = { kind: 'segment', id: 'overlap-scope', playerIds: ['overlap-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotY = structuredClone(base.raw); snapshotY.menu.lac.price++;
  assert.throws(() => f.registry.propose(f.actor(), { key: 'overlap-scoped', baseVersion: base.version, snapshot: snapshotY, reason: 'Scoped change', scope }), /registry:measurementPending/);
  resolveX(2.6); await f.registry.settleMeasurements();
  // Once X settles, the scoped proposal is no longer blocked -- publish it (staying pending itself) to set
  // up the reverse direction: a pending scoped proposal must also block a new default one.
  const afterX = f.registry.config(f.registry.latest().version), snapshotY2 = structuredClone(afterX.raw); snapshotY2.menu.lac.price++;
  const draftY = f.registry.propose(f.actor(), { key: 'overlap-scoped', baseVersion: afterX.version, snapshot: snapshotY2, reason: 'Scoped change', scope });
  f.registry.approve(f.actor('super', 'reviewer'), draftY.version);
  f.registry.publish(f.actor(), draftY.version); // stays pending -- measurement 2 hangs
  const snapshotZ = structuredClone(afterX.raw); snapshotZ.menu.bia.price += 2;
  assert.throws(() => f.registry.propose(f.actor(), { key: 'overlap-default-2', baseVersion: afterX.version, snapshot: snapshotZ, reason: 'Another default change' }), /registry:measurementPending/);
  resolveY(2.6);
});

test('a forecast report stays current through an unrelated pending publication, and only goes stale once it admits (codex review round 3 finding)', async t => {
  let resolveW!: (k: number) => void;
  const pendingW = new Promise<number>(resolve => { resolveW = resolve; });
  const f = fixture(t, config, () => pendingW);
  f.store.createPlayer('revision-w-player', 42); f.store.createPlayer('revision-v-player', 43);
  const base = f.registry.config(f.registry.latest().version);
  const scopeV: ConfigScope = { kind: 'segment', id: 'revision-v-scope', playerIds: ['revision-v-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotV = structuredClone(base.raw); snapshotV.menu.lac.price++;
  const draftV = f.registry.propose(f.actor(), { key: 'revision-v', baseVersion: base.version, snapshot: snapshotV, reason: 'Candidate to forecast', scope: scopeV });
  const report = f.registry.forecastPlan(f.actor('viewer'), draftV.version, f.now + 7 * 86400000);
  assert.doesNotThrow(() => f.registry.assertForecastCurrent(f.actor('viewer'), report));
  // W is unrelated and disjoint (different scope slot, different audience) from V -- merely PUBLISHING it
  // (still pending, never admitting here) must not move admittedRevision(), unlike the old raw MAX(seq)-based
  // registryRevision, which incremented the moment ANY publication was inserted regardless of outcome.
  const scopeW: ConfigScope = { kind: 'segment', id: 'revision-w-scope', playerIds: ['revision-w-player'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null };
  const snapshotW = structuredClone(base.raw); snapshotW.menu.bia.price++;
  const draftW = f.registry.propose(f.actor(), { key: 'revision-w', baseVersion: base.version, snapshot: snapshotW, reason: 'Unrelated publication', scope: scopeW });
  f.registry.approve(f.actor('super', 'reviewer'), draftW.version);
  f.registry.publish(f.actor(), draftW.version); // stays pending -- measurement hangs
  assert.doesNotThrow(() => f.registry.assertForecastCurrent(f.actor('viewer'), report));
  resolveW(2.6); await f.registry.settleMeasurements();
  assert.throws(() => f.registry.assertForecastCurrent(f.actor('viewer'), report), /registry:staleForecast/);
});

test('measureKViaForecast really does call assertForecastCurrent, independent of any timing race (codex review round 3 finding)', { timeout: 120000 }, async t => {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-registry-actor-')), file = join(dir, 'game.db');
  const start = Date.now(); // a real, advancing clock -- required so the actor's expiresAt can genuinely lapse
  // The registry's OWN measurement attempt must hang forever (unused) -- otherwise the default synchronous
  // self-report measurer would admit draft immediately, and the standalone measureKViaForecast call below
  // would hit previewPublication()'s "already admitted" guard instead of the real worker path this test needs.
  const store = new GameStore(file, config, () => Date.now(), () => new Promise<number>(() => {}));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.createPlayer('actor-player', 42);
  store.command('actor-player', { idempotencyKey: 'open', command: { type: 'startShift' } });
  const registry = store.registry, base = registry.config(registry.latest().version), snapshot = structuredClone(base.raw); snapshot.menu.bia.price++;
  // Valid long enough to pass forecastEconomy()'s own early actor check (before the worker even starts), but
  // expires within 1s -- far shorter than the real worker's multi-second minimum (documented ~9-18s even
  // under light load, 60-90s+ observed under this session's heavy load). If assertForecastCurrent() is
  // genuinely invoked afterwards, its own actor check is the only place invalidActor could come from here --
  // deterministic on the worker simply taking "more than an eyeblink", not on hitting a precise window.
  const shortLived: AdminActor = { subject: 'economy', role: 'economy', mfa: true, issuedAt: start, expiresAt: start + 1000 };
  const draft = registry.propose(shortLived, { key: 'actor-target', baseVersion: base.version, snapshot, reason: 'Measure via real worker' });
  registry.approve({ subject: 'reviewer', role: 'super', mfa: true, issuedAt: start, expiresAt: start + 1000 }, draft.version);
  registry.publish(shortLived, draft.version);
  await assert.rejects(measureKViaForecast(store, shortLived, draft.version), /registry:invalidActor/);
});

test('a later admitted emergency supersedes a schedule even after an earlier emergency naming it was refused (codex review round 4 finding)', t => {
  let calls = 0;
  // Call 2 (E1's own measurement) is the only one out-of-band -- everything else admits in-band immediately.
  const f = fixture(t, config, candidate => { calls++; return calls === 2 ? 999 : candidate.values.k.value; });
  const base = f.registry.config(f.registry.latest().version);
  const snapshotA = structuredClone(base.raw); snapshotA.shift.dailyEarnCapBase++;
  const draftA = f.registry.propose(f.actor(), { key: 'schedule-a', baseVersion: base.version, snapshot: snapshotA, reason: 'Scheduled change', effective: 'next_day' });
  f.registry.approve(f.actor('super', 'reviewer'), draftA.version);
  const scheduled = f.registry.publish(f.actor(), draftA.version); // call 1 -- admits in-band, scheduled for tomorrow
  assert.ok(scheduled.effective_at > f.now);
  const snapshotE1 = structuredClone(base.raw); snapshotE1.menu.bia.price++;
  const draftE1 = f.registry.propose(f.actor('super'), { key: 'e1', baseVersion: base.version, snapshot: snapshotE1, reason: 'First emergency', emergency: true });
  const previewE1 = f.registry.impact(f.actor('super'), draftE1.version);
  // A synchronous out-of-band result throws from publish() itself (settleMeasurement()'s own contract) --
  // the row is still marked refused first, inside the same call, before the throw.
  assert.throws(() => f.registry.publish(f.actor('super'), draftE1.version, previewE1.token), /registry:bindingRange/);
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftE1.version)!.state, 'refused');
  // E1's marker is the OLDEST -- auditRecord()'s own LIMIT 1 would find only this one and stop, so a naive
  // fix using it would keep reporting null forever even once a real superseder admits.
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).supersededBy, null);
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).phase, 'scheduled');
  const snapshotE2 = structuredClone(base.raw); snapshotE2.menu.lac.price++;
  const draftE2 = f.registry.propose(f.actor('super'), { key: 'e2', baseVersion: base.version, snapshot: snapshotE2, reason: 'Second emergency', emergency: true });
  const previewE2 = f.registry.impact(f.actor('super'), draftE2.version);
  // A refused writer doesn't count as "already handled" -- E2 must still see A as a live target to supersede.
  assert.deepEqual(previewE2.supersedes!.map(s => s.version), [draftA.version]);
  f.registry.publish(f.actor('super'), draftE2.version, previewE2.token); // call 3 -- admits in-band
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(draftE2.version)!.state, 'admitted');
  // Now A really is superseded -- by E2 (the admitted writer), not stuck on E1 (refused, but written first).
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).supersededBy, draftE2.version);
  assert.equal(f.registry.details(f.actor('viewer'), draftA.version).phase, 'archived');
  // A third emergency no longer sees A as a pending target -- it was genuinely (not just apparently) superseded.
  const snapshotE3 = structuredClone(f.registry.active().raw); snapshotE3.menu.dau.price++;
  const draftE3 = f.registry.propose(f.actor('super'), { key: 'e3', baseVersion: f.registry.active().version, snapshot: snapshotE3, reason: 'Third emergency', emergency: true });
  const previewE3 = f.registry.impact(f.actor('super'), draftE3.version);
  assert.deepEqual(previewE3.supersedes, []);
});

// S6 (plan S6 row "admin registry nhận key mới", brief B6, PR #14): every key the seat-model slices S1-S5 added to the seed is governed by a tier of the
// config itself, editable ONE BY ONE through the registry by the roles its tier names (propose, approve, publish: a Tier A key needs a second Super, a
// Tier B key its Economy author), admitted by the MEASURED k and not by the self-reported scalar, and the published key reaches a real player at the opening.
// Each key is its own publication under its own author (the daily limit is per author); the diff of every publication is exactly that one key.
const flat = (value: unknown, path = '', out = new Map<string, string>()): Map<string, string> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) for (const [k, v] of Object.entries(value)) flat(v, path ? `${path}.${k}` : k, out);
  else out.set(path, JSON.stringify(value));
  return out;
};
type Seed = typeof config.raw; // the bundled seat seed: the only shape that carries every key below (Config['raw'] is the union with the frozen pins)
const SEAT_MODEL_KEYS: { path: string; tier: 'A' | 'B'; since: string; edit: (raw: Seed) => unknown; read: (raw: Seed) => unknown }[] = [
  { path: 'spawn.pPair', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.spawn.pPair = 0.45), read: raw => raw.spawn.pPair },
  { path: 'upgrades.table.tablePriceBase', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.upgrades.table.tablePriceBase[0] += 1, raw.upgrades.table.tablePriceBase), read: raw => raw.upgrades.table.tablePriceBase },
  { path: 'upgrades.table.chairPriceBase', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.upgrades.table.chairPriceBase[0] += 1, raw.upgrades.table.chairPriceBase), read: raw => raw.upgrades.table.chairPriceBase },
  { path: 'upgrades.table.chairsAfterTables', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.upgrades.table.chairsAfterTables = 3), read: raw => raw.upgrades.table.chairsAfterTables },
  { path: 'upgrades.table.orderShape.solo.pBeer', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.upgrades.table.orderShape.solo.pBeer = 0.65), read: raw => raw.upgrades.table.orderShape.solo.pBeer },
  { path: 'upgrades.table.orderShape.pair.pMoi', tier: 'A', since: 'S1 2.0.20', edit: raw => (raw.upgrades.table.orderShape.pair.pMoi = 0.8), read: raw => raw.upgrades.table.orderShape.pair.pMoi },
  { path: 'locations.list', tier: 'A', since: 'S1 2.0.20 (tableSlots per place; 8 everywhere since S5)', edit: raw => (raw.locations.list[0].tableSlots = 7, raw.locations.list), read: raw => raw.locations.list },
  { path: 'spawn.capacityDemand.refTables', tier: 'A', since: 'S3 2.0.22', edit: raw => (raw.spawn.capacityDemand.refTables = 7), read: raw => raw.spawn.capacityDemand.refTables },
  { path: 'spawn.capacityDemand.maxMult', tier: 'A', since: 'S3 2.0.22', edit: raw => (raw.spawn.capacityDemand.maxMult = 3), read: raw => raw.spawn.capacityDemand.maxMult },
  { path: 'runtime.queueBaseSlots', tier: 'B', since: 'S3 2.0.22 (value)', edit: raw => (raw.runtime.queueBaseSlots = 2), read: raw => raw.runtime.queueBaseSlots },
  { path: 'runtime.queueSeatsPerSlot', tier: 'B', since: 'S3 2.0.22 (value)', edit: raw => (raw.runtime.queueSeatsPerSlot = 6), read: raw => raw.runtime.queueSeatsPerSlot },
  { path: 'patience.thuongMs', tier: 'B', since: 'S3 2.0.22 (value)', edit: raw => (raw.patience.thuongMs = 25000), read: raw => raw.patience.thuongMs },
  { path: 'upgrades.table.tableUpgrade.levels', tier: 'A', since: 'S4 2.0.23', edit: raw => (raw.upgrades.table.tableUpgrade.levels[0].priceBase += 100, raw.upgrades.table.tableUpgrade.levels), read: raw => raw.upgrades.table.tableUpgrade.levels },
  { path: 'upgrades.table.chairUpgrade.priceBase', tier: 'A', since: 'S4 2.0.23', edit: raw => (raw.upgrades.table.chairUpgrade.priceBase += 100), read: raw => raw.upgrades.table.chairUpgrade.priceBase },
  { path: 'upgrades.table.chairUpgrade.stepBase', tier: 'A', since: 'S4 2.0.23', edit: raw => (raw.upgrades.table.chairUpgrade.stepBase += 100), read: raw => raw.upgrades.table.chairUpgrade.stepBase },
  { path: 'upgrades.table.chairUpgrade.levels', tier: 'A', since: 'S4 2.0.23', edit: raw => (raw.upgrades.table.chairUpgrade.levels[0].patienceMult = 1.2, raw.upgrades.table.chairUpgrade.levels), read: raw => raw.upgrades.table.chairUpgrade.levels },
  { path: 'shift.noCooldownFirstShifts', tier: 'A', since: 'S5 2.1.0', edit: raw => (raw.shift.noCooldownFirstShifts = 4), read: raw => raw.shift.noCooldownFirstShifts },
];
test('S6: every seat-model key S1-S5 added is governed by its tier, editable one by one through the registry by the roles of that tier, admitted by the measured k, and reaches a new player', t => {
  const f = fixture(t, config, sampleMeasurer);
  const seen = new Set<string>();
  for (const [i, key] of SEAT_MODEL_KEYS.entries()) {
    assert.equal(registryPolicy([key.path], config).tier, key.tier, `${key.path} (${key.since}) is governed as Tier ${key.tier}`);
    const author = f.actor('economy', `economy-${i}`), base = f.registry.latest();
    const before = f.registry.config(base.version).raw, expected = JSON.stringify(key.edit(structuredClone(before) as Seed));
    const d = f.draft(raw => { key.edit(raw as Seed); }, author);
    // The diff of the proposal is exactly this key (its leaf or the array it lives in), nothing else.
    const was = flat(before), changed = [...flat(f.registry.config(d.version).raw)].filter(([path, value]) => !path.startsWith('_meta.') && was.get(path) !== value).map(([path]) => path);
    assert.ok(changed.length > 0 && changed.every(path => path === key.path || path.startsWith(key.path + '.')), `${key.path}: changed ${changed.join(', ')}`);
    if (key.tier === 'A') {
      assert.throws(() => f.registry.publish(author, d.version), /approvalRequired/, `${key.path}: a Tier A key waits for a Super`);
      assert.throws(() => f.registry.approve(author, d.version), /forbidden/, `${key.path}: the Economy author cannot approve a Tier A key`);
      f.registry.approve(f.actor('super', 'reviewer'), d.version);
    } else f.registry.approve(author, d.version); // Tier B: single approval, the Economy Admin's own
    const pub = f.registry.publish(author, d.version);
    const row = f.db.prepare('SELECT state, measured_k FROM registry_measurements WHERE version=?').get(d.version)!;
    assert.equal(row.state, 'admitted', `${key.path}: admitted by the measured k`);
    assert.ok(Number(row.measured_k) >= config.values.k.band[0] && Number(row.measured_k) <= config.values.k.band[1], `${key.path}: k ${row.measured_k} in band`);
    assert.equal(pub.effective_at > f.now, key.tier === 'A', `${key.path}: Tier A waits for the next day, Tier B the next shift`);
    f.now = Math.max(f.now, pub.effective_at); assert.equal(f.registry.active().version, d.version);
    assert.equal(JSON.stringify(key.read(f.registry.active().raw as Seed)), expected, `${key.path}: the published value is the edited one`);
    // A real player opens on it: the store registers the version and its first shift pins it.
    const store = f.open(), player = `player-${i}`; assert.equal(store.createPlayer(player, 100 + i).configVersion, d.version);
    const opened = store.command(player, { idempotencyKey: `open-${i}`, command: { type: 'startShift' } });
    assert.ok(opened.result.ok, `${key.path}: a shift opens on the published key`); assert.equal(opened.world.shift!.configVersion, d.version);
    seen.add(key.path);
  }
  assert.equal(seen.size, SEAT_MODEL_KEYS.length);
  // Nothing of the governance itself moved: the section lists of the active config still classify every key above.
  for (const key of SEAT_MODEL_KEYS) assert.equal(registryPolicy([key.path], f.registry.active()).tier, key.tier);
});

// The S6 case above proves that every seat key is measured and admitted; `sampleMeasurer` prices one beer from `menu.bia.price` alone, so no seat key can move
// its k. This measurer reads a seat key: the tip factor of the top table level (S4, the Lv4 table's tip x1.25 on a pair's tray) scales the sample k, so it equals
// the sample k on the seed and goes far out of band when that factor does. The registry refuses the publication on the measured value, never on the self-reported one.
const seatMeasurer: MeasureK = (candidate, version, actor) => (sampleMeasurer(candidate, version, actor) as number) * tableUpgrade(candidate.values)!.levels.at(-1)!.tipMult / tableUpgrade(config.values)!.levels.at(-1)!.tipMult;
test('S6: the k check reacts to a seat key once a measurer reads it: the Lv4 tip factor far out of range is measured and refused, a small one is admitted', t => {
  const f = fixture(t, config, seatMeasurer);
  const small = f.draft(raw => { (raw as Seed).upgrades.table.tableUpgrade.levels[2].tipMult = 1.3; }); // a step up from 1.25, inside the band
  f.registry.approve(f.actor('super', 'reviewer'), small.version); const pub = f.registry.publish(f.actor(), small.version); // Tier A: scheduled for the next day
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(small.version)!.state, 'admitted');
  f.now = pub.effective_at; assert.equal(f.registry.active().version, small.version);
  const blowup = f.draft(raw => { (raw as Seed).upgrades.table.tableUpgrade.levels[2].tipMult = 40; }, f.actor('economy', 'another-author')); // k.value and k.band untouched: the self-report alone would admit it
  f.registry.approve(f.actor('super', 'reviewer'), blowup.version);
  assert.throws(() => f.registry.publish(f.actor('economy', 'another-author'), blowup.version), (error: unknown) => {
    assert.ok(error instanceof Error); assert.match(error.message, /^registry:bindingRange$/);
    const e = error as Error & { measured: number; band: readonly number[] };
    assert.ok(e.measured > e.band[1], `measured ${e.measured} should exceed band[1] ${e.band[1]}`); return true;
  });
  assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(blowup.version)!.state, 'refused');
  assert.equal(f.registry.active().version, small.version, 'the refused version never becomes active'); assert.equal(f.registry.latest().version, small.version);
});

// Wave 3 (plan section 6 `fun-kick-table`, FEEDBACK II.3, D3): the two keys of "Mời về" are a Tier A section of the config itself, each editable ONE BY ONE
// through the registry (an Economy author proposes, a second Super approves, the publication waits for the next day), and the published value reaches a real
// player at the opening -- the same cycle the S6 case above runs for every seat key. What this case does NOT prove: that the k admission guards these keys. It
// does not react to them: `sampleMeasurer` prices one beer from `menu.bia.price`, and the production `measureKViaForecast` (apps/server/src/forecast.ts)
// projects with `createManagementPolicy` (packages/engine/sim/forecast.ts), whose bot never kicks; a `feeRate` of 0 would be admitted too. The guards of these
// two keys are the validator (validate in config.ts), the dual approval and running `npm run sim:kick` before publishing (08-SPEC section 22, `kickTable` row).
const KICK_TABLE_KEYS: { path: string; edit: (raw: Seed) => unknown; read: (raw: Seed) => unknown }[] = [
  { path: 'kickTable.feeRate', edit: raw => (raw.kickTable.feeRate = 0.6), read: raw => raw.kickTable.feeRate },
  { path: 'kickTable.repPerGuest', edit: raw => (raw.kickTable.repPerGuest = 3), read: raw => raw.kickTable.repPerGuest },
];
test('Wave 3: the two kickTable keys are Tier A, editable one by one through the registry by an Economy author and a second Super, and reach a new player (the k admission does not react to them)', t => {
  const f = fixture(t, config, sampleMeasurer);
  for (const [i, key] of KICK_TABLE_KEYS.entries()) {
    assert.deepEqual(registryPolicy([key.path], config), { tier: 'A', tiers: ['A'], superOnly: false, effective: 'next_day', modes: ['next_day'] }, `${key.path} is a dual-approval key of the next day`);
    const author = f.actor('economy', `kick-economy-${i}`), base = f.registry.latest(), before = f.registry.config(base.version).raw;
    const expected = JSON.stringify(key.edit(structuredClone(before) as Seed));
    const d = f.draft(raw => { key.edit(raw as Seed); }, author);
    const was = flat(before), changed = [...flat(f.registry.config(d.version).raw)].filter(([path, value]) => !path.startsWith('_meta.') && was.get(path) !== value).map(([path]) => path);
    assert.deepEqual(changed, [key.path], `${key.path}: the proposal changes exactly this key`);
    assert.throws(() => f.registry.publish(author, d.version), /approvalRequired/, `${key.path}: a Tier A key waits for a Super`);
    assert.throws(() => f.registry.approve(author, d.version), /forbidden/, `${key.path}: the Economy author cannot approve it`);
    f.registry.approve(f.actor('super', 'kick-reviewer'), d.version);
    const pub = f.registry.publish(author, d.version);
    assert.equal(f.db.prepare('SELECT state FROM registry_measurements WHERE version=?').get(d.version)!.state, 'admitted', `${key.path}: the publication runs the k measurement and is admitted (that measurement does not read kickTable)`);
    assert.ok(pub.effective_at > f.now, `${key.path}: scheduled for the next day`);
    f.now = pub.effective_at; assert.equal(f.registry.active().version, d.version);
    assert.equal(JSON.stringify(key.read(f.registry.active().raw as Seed)), expected, `${key.path}: the published value is the edited one`);
    const store = f.open(), player = `kick-player-${i}`; assert.equal(store.createPlayer(player, 300 + i).configVersion, d.version);
    const opened = store.command(player, { idempotencyKey: `kick-open-${i}`, command: { type: 'startShift' } });
    assert.ok(opened.result.ok); assert.equal(opened.world.shift!.configVersion, d.version, `${key.path}: a shift opens on the published key`);
  }
  for (const key of KICK_TABLE_KEYS) assert.equal(registryPolicy([key.path], f.registry.active()).tier, 'A', 'the governance itself did not move');
});
