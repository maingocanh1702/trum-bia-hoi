import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { config, configContent, Game, loadConfig, seasonWindow, serveValueStats, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';
import { measureKViaForecast } from '../src/forecast';
import { ConfigRegistry, registryPolicy, type AdminActor, type ConfigScope, type MeasureK } from '../src/registry';
const NOW = Date.parse('2026-09-10T10:00:00Z');
// Default measurer trusts the candidate's own declared k.value -- identical to the pre-existing self-report
// check, so every test below that never touches raw.k sees admission behave exactly as before this feature.
function fixture(t: { after(fn: () => unknown): void }, seed = config, measureK?: MeasureK) {
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
