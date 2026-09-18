import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { config, Game, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';
import { ConfigRegistry, type AdminActor, type ConfigScope, type ProposalInput } from '../src/registry';

const NOW = Date.parse('2026-09-10T10:00:00Z'), DAY = 86400000;
function fixture(t: { after(fn: () => unknown): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-scopes-')), file = join(dir, 'game.db');
  let now = NOW, serial = 0; const stores: GameStore[] = [];
  const open = () => { const store = new GameStore(file, config, () => now); stores.push(store); return store; };
  const store = open(), db = new DatabaseSync(file); db.exec('PRAGMA foreign_keys=ON');
  const registry = new ConfigRegistry(db, () => now);
  t.after(() => { for (const s of stores) s.close(); db.close(); rmSync(dir, { recursive: true, force: true }); });
  for (const id of ['alice', 'bob', 'carol']) store.createPlayer(id, 42);
  const actor = (role: AdminActor['role'] = 'super', subject = `${role}-${++serial}`): AdminActor => ({ subject, role, mfa: true, issuedAt: now, expiresAt: now + 3600000 });
  const scope = (id: string, extra: Partial<ConfigScope> = {}): ConfigScope => ({ kind: 'segment', id, playerIds: ['alice'], priority: 0, expiresAt: null, previousVersion: null, ticketId: null, ...extra });
  const input = (edit: (raw: Config['raw']) => void, scope?: ConfigScope): ProposalInput => {
    const base = registry.config(registry.latest().version), snapshot = structuredClone(base.raw); edit(snapshot);
    return { key: `request-${++serial}`, baseVersion: base.version, snapshot, reason: 'Scoped balance check', ...(scope ? { scope } : {}) };
  };
  const publish = (edit: (raw: Config['raw']) => void, scope?: ConfigScope) => {
    const who = actor(), proposal = registry.propose(who, input(edit, scope)); registry.approve(actor(), proposal.version);
    return registry.publish(who, proposal.version);
  };
  return { store, db, registry, open, actor, scope, input, publish, get now() { return now; }, set now(v) { now = v; } };
}

test('per-key precedence retains default and segment values under campaign and ticketed player overrides', t => {
  const f = fixture(t), r = f.registry;
  f.publish(c => { c.menu.bia.price = 110; }, f.scope('group'));
  f.publish(c => { c.spawn.baseMs += 100; }, f.scope('disjoint'));
  f.publish(c => { c.menu.bia.price = 120; }, f.scope('festival', { kind: 'campaign', expiresAt: NOW + DAY }));
  const ticketId = r.requestSupport(f.actor('support'), { key: 'ticket', playerId: 'alice', reason: 'Approved temporary correction' });
  f.publish(c => { c.menu.bia.price = 130; }, f.scope('alice', { kind: 'player', expiresAt: NOW + DAY, ticketId }));
  const defaultPub = f.publish(c => { c.menu.lac.price++; });
  const resolved = r.resolve('alice');
  assert.equal(resolved.raw.menu.bia.price, 130); assert.equal(resolved.raw.spawn.baseMs, config.raw.spawn.baseMs + 100);
  assert.equal(resolved.raw.menu.lac.price, config.raw.menu.lac.price + 1);
  assert.equal(r.latest().version, defaultPub.version); assert.equal(r.active().version, defaultPub.version);
  assert.equal(r.resolve('bob').version, defaultPub.version);
  assert.equal(r.resolve('alice').version, resolved.version);
  const row = f.db.prepare('SELECT sources FROM registry_resolutions WHERE version=?').get(resolved.version)!;
  assert.equal(JSON.parse(String(row.sources)).length, 5);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM registry_audit WHERE type='ConfigResolved'").get()!.n, 1);
});

test('equal-priority contradictory overrides are rejected atomically; explicit higher priority wins', t => {
  const f = fixture(t), r = f.registry;
  f.publish(c => { c.menu.bia.price = 110; }, f.scope('one'));
  f.publish(c => { c.menu.bia.price = 110; }, f.scope('identical'));
  const d = r.propose(f.actor(), f.input(c => { c.menu.bia.price = 120; }, f.scope('conflict'))); r.approve(f.actor(), d.version);
  const before = f.db.prepare('SELECT COUNT(*) AS n FROM registry_publications').get()!.n;
  assert.throws(() => r.publish(f.actor(), d.version), /scopeConflict/);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_publications').get()!.n, before);
  assert.equal(f.db.prepare("SELECT 1 FROM registry_audit WHERE type='ConfigPublished' AND json_extract(payload,'$.version')=?").get(d.version), undefined);
  f.publish(c => { c.menu.bia.price = 120; }, f.scope('priority', { priority: 1 }));
  assert.equal(r.resolve('alice').raw.menu.bia.price, 120);
});

test('named-scope replacement changes audience and expiry never resurrects its older publication', t => {
  const f = fixture(t), r = f.registry;
  const old = f.publish(c => { c.menu.bia.price = 110; }, f.scope('club'));
  assert.equal(r.resolve('alice').raw.menu.bia.price, 110);
  const replacement = f.scope('club', { playerIds: ['bob'], expiresAt: NOW + 1000, previousVersion: old.version });
  f.publish(c => { c.menu.bia.price = 120; }, replacement);
  assert.equal(r.resolve('alice').version, config.version); assert.equal(r.resolve('bob').raw.menu.bia.price, 120);
  f.now += 1000;
  assert.equal(r.resolve('alice').version, config.version); assert.equal(r.resolve('bob').version, config.version);
});

test('scoped lifecycle agrees with resolver replacement and expiry, while a pinned resolution is only a stored snapshot', t => {
  const f = fixture(t), r = f.registry, old = f.publish(c => { c.menu.bia.price = 110; }, f.scope('club'));
  const snapshot = r.resolve('alice');
  assert.equal(r.details(f.actor('viewer'), old.version).phase, 'active');
  assert.equal(r.details(f.actor('viewer'), snapshot.version).phase, 'snapshot');
  const next = f.publish(c => { c.menu.bia.price = 120; }, f.scope('club', { previousVersion: old.version, playerIds: ['bob'], expiresAt: NOW + 1000 }));
  assert.equal(r.details(f.actor('viewer'), old.version).phase, 'archived');
  assert.equal(r.details(f.actor('viewer'), next.version).phase, 'active');
  assert.equal(r.resolve('alice').version, config.version); assert.equal(r.resolve('bob').raw.menu.bia.price, 120);
  f.now += 1000;
  assert.equal(r.details(f.actor('viewer'), old.version).phase, 'archived');
  assert.equal(r.details(f.actor('viewer'), next.version).phase, 'archived');
  assert.equal(r.details(f.actor('viewer'), config.version).phase, 'active');
  assert.equal(r.details(f.actor('viewer'), snapshot.version).phase, 'snapshot');
  assert.equal(r.resolve('bob').version, config.version);
  const rows = r.index(f.actor('viewer')).proposals;
  assert.equal(rows.find(p => p.version === old.version)!.phase, 'archived');
  assert.equal(rows.find(p => p.version === next.version)!.phase, 'archived');
});

test('campaign expiry falls through to segment; live shifts retain their generated snapshot and public replay survives restart', async t => {
  const f = fixture(t), r = f.registry, s = f.store;
  f.publish(c => { c.menu.bia.price = 110; }, f.scope('club'));
  f.publish(c => { c.menu.bia.price = 120; }, f.scope('promotion', { kind: 'campaign', expiresAt: NOW + 1000 }));
  const first = s.command('alice', { idempotencyKey: 'open', command: { type: 'startShift' } });
  assert.ok(first.result.ok); const pinned = first.world.shift!.configVersion;
  assert.match(pinned, /^resolved-/); assert.equal(r.config(pinned).raw.menu.bia.price, 120);
  const count = f.db.prepare('SELECT COUNT(*) AS n FROM registry_resolutions').get()!.n;
  f.now += 1000;
  const retry = s.command('alice', { idempotencyKey: 'open', command: { type: 'startShift' } });
  assert.deepEqual(retry.result, first.result); assert.equal(retry.world.shift!.configVersion, pinned);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_resolutions').get()!.n, count);
  s.command('alice', { idempotencyKey: 'close', command: { type: 'endShift' } }); f.now += 3600000;
  const second = s.command('alice', { idempotencyKey: 'second', command: { type: 'startShift' } });
  assert.ok(second.result.ok); assert.equal(r.config(second.configVersion).raw.menu.bia.price, 110);
  const restarted = f.open(); assert.deepEqual(restarted.read('alice'), s.read('alice'));
  const replay = new Game(config, 42, NOW, 'alice');
  for (const row of f.db.prepare('SELECT entry FROM commands WHERE player_id=? ORDER BY seq').all('alice')) {
    const entry = JSON.parse(String(row.entry)); assert.deepEqual(replay.replay(entry, r.config(entry.configVersion)), entry.result);
  }
  replay.advance(f.now); assert.deepEqual(replay.world, restarted.read('alice').world);
  const server = createGameServer(s, { origin: 'http://localhost:4180', sessionTtlMs: DAY, rateMax: 100, rateWindowMs: 60000 });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const guest = s.createGuestSession(DAY);
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/player/config?version=${pinned}`, { headers: { Cookie: `tbh-session=${guest.token}` } });
  assert.equal(response.status, 200); assert.equal((await response.json()).menu.bia.price, 120);
});

test('immutable scope fingerprint, exact predecessor, and approval revalidation reject competing replacements', t => {
  const f = fixture(t), r = f.registry, who = f.actor();
  const input = f.input(c => { c.menu.bia.price++; }, f.scope('club', { playerIds: ['alice', 'bob'] }));
  const d = r.propose(who, input); assert.deepEqual(r.propose(who, { ...input, scope: { ...input.scope!, playerIds: ['bob', 'alice'] } }), d);
  for (const extra of [{ priority: 1 }, { playerIds: ['carol'] }, { expiresAt: NOW + DAY }]) {
    assert.throws(() => r.propose(who, { ...input, scope: { ...input.scope!, ...extra } }), /keyConflict/);
  }
  const competing = r.propose(f.actor(), { ...input, key: 'competing' });
  r.approve(f.actor(), d.version); r.approve(f.actor(), competing.version); r.publish(who, d.version);
  assert.deepEqual(r.propose(who, input), d);
  assert.throws(() => r.publish(f.actor(), competing.version), /staleBase/);
  assert.throws(() => r.propose(f.actor(), input), /staleBase/);
  const shrink = r.propose(f.actor('economy'), f.input(c => { c.menu.bia.price += 2; }, { ...input.scope!, playerIds: ['alice'], previousVersion: d.version }));
  assert.throws(() => r.approve(f.actor('economy'), shrink.version), /forbidden/);
  const replacement = r.propose(who, f.input(c => { c.menu.bia.price += 2; }, { ...input.scope!, previousVersion: d.version }));
  f.publish(c => { c.menu.lac.price++; });
  assert.throws(() => r.approve(f.actor(), replacement.version), /staleBase/);
});

test('scope boundary validation rejects invalid players, missing campaign expiry, unapproved roles, and early activation', t => {
  const f = fixture(t), r = f.registry;
  for (const scope of [f.scope(''), f.scope('x', { playerIds: [] }), f.scope('x', { playerIds: ['missing'] }),
    f.scope('x', { playerIds: ['alice', 'alice'] }), f.scope('x', { kind: 'campaign' }),
    f.scope('x', { expiresAt: NaN }), f.scope('x', { priority: 0.5 }), f.scope('x', { expiresAt: NOW })]) {
    assert.throws(() => r.propose(f.actor(), f.input(c => { c.menu.bia.price++; }, scope)), /invalidScope|invalidExpiry/);
  }
  assert.throws(() => r.propose(f.actor('game'), f.input(c => { c.menu.bia.price++; }, f.scope('segment'))), /forbidden/);
  const campaign = f.scope('event', { kind: 'campaign', expiresAt: NOW + 2 * DAY });
  const game = f.actor('game'), d = r.propose(game, f.input(c => { c.shift.dailyEarnCapBase++; }, campaign));
  assert.throws(() => r.approve(game, d.version), /forbidden/);
  assert.throws(() => r.approve({ ...game, role: 'super' }, d.version), /distinctApprover/);
  assert.throws(() => r.publish(game, d.version), /approvalRequired/);
  r.approve(f.actor(), d.version); const pub = r.publish(game, d.version);
  assert.ok(pub.effective_at > NOW); assert.equal(r.resolve('alice').version, config.version);
  f.now = pub.effective_at; assert.equal(r.resolve('alice').raw.shift.dailyEarnCapBase, config.raw.shift.dailyEarnCapBase + 1);
  const bulk = r.propose(f.actor('economy'), f.input(c => { c.menu.bia.price++; }, f.scope('bulk', { playerIds: ['alice', 'bob'] })));
  assert.throws(() => r.approve(f.actor('economy'), bulk.version), /forbidden/);
});

test('support ticket is tied to the exact player, consumed once atomically, and retries never grant extra value', t => {
  const f = fixture(t), r = f.registry, support = f.actor('support'), who = f.actor();
  const request = { key: 'complaint', playerId: 'alice', reason: 'Temporary documented adjustment' };
  const ticketId = r.requestSupport(support, request); assert.equal(r.requestSupport(support, request), ticketId);
  assert.throws(() => r.requestSupport(support, { ...request, playerId: 'bob' }), /keyConflict/);
  assert.throws(() => r.requestSupport(f.actor('viewer'), request), /forbidden/);
  const scope = f.scope('alice', { kind: 'player', ticketId, expiresAt: NOW + DAY });
  assert.throws(() => r.propose(f.actor('economy'), f.input(c => { c.menu.bia.price++; }, scope)), /forbidden/);
  assert.throws(() => r.propose(who, f.input(c => { c.menu.bia.price++; }, { ...scope, id: 'bob', playerIds: ['bob'] })), /invalidTicket/);
  const input = f.input(c => { c.menu.bia.price++; }, scope), d = r.propose(who, input); r.approve(f.actor(), d.version);
  const before = f.store.read('alice');
  f.db.exec("CREATE TRIGGER fail_scope BEFORE INSERT ON registry_audit WHEN NEW.type='ConfigPublished' BEGIN SELECT RAISE(ABORT,'test:failure'); END");
  assert.throws(() => r.publish(who, d.version), /test:failure/); assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_support_uses').get()!.n, 0);
  f.db.exec('DROP TRIGGER fail_scope'); const pub = r.publish(who, d.version);
  assert.deepEqual(r.publish(who, d.version), pub); assert.deepEqual(r.propose(who, input), d);
  assert.deepEqual(f.store.read('alice'), before);
  assert.throws(() => r.propose(who, f.input(c => { c.menu.bia.price += 2; }, { ...scope, previousVersion: d.version })), /invalidTicket/);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM registry_support_uses').get()!.n, 1);
  f.now += DAY; assert.deepEqual(r.propose(f.actor('super', who.subject), input), d);
  assert.deepEqual(r.publish(f.actor('super', who.subject), d.version), pub);
  for (const table of ['registry_scopes', 'registry_support', 'registry_support_uses']) assert.throws(() => f.db.exec(`DELETE FROM ${table}`), /appendOnly/);
});

test('publication validates future expiry boundaries before an apparently valid masked override can break openings', t => {
  const f = fixture(t), r = f.registry;
  f.publish(c => { c.k.band = [2, 2.6]; }, f.scope('narrow-band'));
  f.publish(c => { c.k.band = [2, 2.9]; }, f.scope('temporary-mask', { kind: 'campaign', expiresAt: NOW + 2 * DAY }));
  const d = r.propose(f.actor(), f.input(c => { c.k.value = 2.7; })); r.approve(f.actor(), d.version);
  assert.throws(() => r.publish(f.actor(), d.version), /config:k/);
  assert.equal(r.latest().version, config.version);
  assert.equal(f.db.prepare('SELECT 1 FROM registry_publications WHERE version=?').get(d.version), undefined);
});

test('failed runtime composition rolls back catch-up and save changes without silently using default', t => {
  const f = fixture(t), r = f.registry;
  const pub = f.publish(c => { c.menu.bia.price++; }, f.scope('club'));
  // Simulate an invalid historical scoped row from an external database restore, beyond publication validation.
  f.db.exec('DROP TRIGGER registry_scopes_update');
  const scope = JSON.parse(String(f.db.prepare('SELECT scope FROM registry_scopes WHERE version=?').get(pub.version)!.scope));
  scope.playerIds = null; f.db.prepare('UPDATE registry_scopes SET scope=? WHERE version=?').run(JSON.stringify(scope), pub.version);
  const before = f.db.prepare('SELECT * FROM players WHERE id=?').get('alice'); f.now += 1000;
  assert.throws(() => f.store.command('alice', { idempotencyKey: 'open', command: { type: 'startShift' } }));
  assert.deepEqual(f.db.prepare('SELECT * FROM players WHERE id=?').get('alice'), before);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM commands WHERE player_id=?').get('alice')!.n, 0);
});

test('schema9 migration preserves default publication, approval, existing careers and historical replay', t => {
  const f = fixture(t); const pub = f.publish(c => { c.menu.bia.price++; });
  f.store.command('alice', { idempotencyKey: 'open', command: { type: 'startShift' } }); const before = f.store.read('alice'); f.store.close();
  f.db.exec('DROP TABLE registry_resolutions; DROP TABLE registry_support_uses; DROP TABLE registry_support; DROP TABLE registry_scopes; DROP TABLE registry_measurements; PRAGMA user_version=9');
  const migrated = f.open(); assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 11);
  assert.deepEqual(migrated.read('alice'), before); assert.equal(migrated.registry.latest().version, pub.version);
  assert.equal(migrated.registry.resolve('alice').version, pub.version);
});


test('removing old scoped Tier A keys retains Super approval and the day floor, including an empty replacement', t => {
  const f = fixture(t), r = f.registry;
  const pub = f.publish(c => { c.shift.dailyEarnCapBase++; }, f.scope('club'));
  const scope = f.scope('club', { previousVersion: pub.version });
  assert.throws(() => r.propose(f.actor('game'), f.input(c => { c.audio.enabled = !c.audio.enabled; }, scope)), /forbidden/);
  const input = f.input(() => {}, scope), who = f.actor('economy');
  assert.throws(() => r.propose(who, { ...input, effective: 'immediate' }), /earlyActivation/);
  const d = r.propose(who, input); assert.deepEqual(JSON.parse(d.keys), []);
  assert.throws(() => r.approve(who, d.version), /forbidden/);
  r.approve(f.actor(), d.version); const removed = r.publish(who, d.version);
  assert.equal(removed.effective_at, pub.effective_at);
  f.now = removed.effective_at;
  assert.equal(r.resolve('alice').raw.shift.dailyEarnCapBase, config.raw.shift.dailyEarnCapBase);
});

test('a scope replacement cannot overtake its future predecessor and expiry is rechecked at publication time', t => {
  const f = fixture(t), r = f.registry;
  const input = { ...f.input(c => { c.menu.bia.price++; }, f.scope('club')), effective: 'next_day' as const };
  const d = r.propose(f.actor(), input); r.approve(f.actor(), d.version); r.publish(f.actor(), d.version);
  const next = r.propose(f.actor(), f.input(c => { c.menu.bia.price += 2; }, f.scope('club', { previousVersion: d.version })));
  r.approve(f.actor(), next.version); assert.throws(() => r.publish(f.actor(), next.version), /scheduleConflict/);
  const short = r.propose(f.actor(), f.input(c => { c.menu.lac.price++; }, f.scope('flash', { kind: 'campaign', expiresAt: NOW + 1000 })));
  r.approve(f.actor(), short.version); f.now += 1000;
  assert.throws(() => r.publish(f.actor(), short.version), /invalidExpiry/);
});

test('campaign entitlement publishes immediately for new openings; other scopes and mixed day/season keys retain their floors', t => {
  const f = fixture(t), r = f.registry;
  // JSON import: loader accepts number|null; the seed's TypeScript type is null.
  const edit = (c: Config['raw']) => { Object.assign(c.entitlements.freeSessionsPerDay, { campaignOverride: 5 }); };
  const campaign = f.scope('short-campaign', { kind: 'campaign', expiresAt: NOW + 1000 });
  const who = f.actor('game'), d = r.propose(who, { ...f.input(edit, campaign), effective: 'immediate' });
  assert.equal(d.effective, 'immediate'); assert.throws(() => r.approve(who, d.version), /forbidden/);
  r.approve(f.actor(), d.version); assert.equal(r.publish(who, d.version).effective_at, NOW);
  const opening = f.store.command('alice', { idempotencyKey: 'open-campaign', command: { type: 'startShift' } });
  assert.ok(opening.result.ok); assert.equal(r.config(opening.configVersion).raw.entitlements.freeSessionsPerDay.campaignOverride, 5);
  const ticketId = r.requestSupport(f.actor('support'), { key: 'individual', playerId: 'alice', reason: 'Temporary policy check' });
  for (const scope of [undefined, f.scope('segment'), f.scope('alice', { kind: 'player', ticketId, expiresAt: NOW + 2 * DAY })]) {
    assert.throws(() => r.propose(f.actor(), { ...f.input(edit, scope), effective: 'immediate' }), /earlyActivation/);
  }
  const longer = { ...campaign, expiresAt: NOW + 40 * DAY, previousVersion: d.version };
  for (const change of [(c: Config['raw']) => { edit(c); c.shift.dailyEarnCapBase++; },
    (c: Config['raw']) => { edit(c); c.league.tiers[1].minSeasonEarnedBase++; }]) {
    assert.throws(() => r.propose(f.actor(), { ...f.input(change, longer), effective: 'immediate' }), /earlyActivation/);
  }
  const withdraw = r.propose(who, f.input(() => {}, { ...campaign, previousVersion: d.version }));
  assert.equal(withdraw.effective, 'immediate'); r.approve(f.actor(), withdraw.version); r.publish(who, withdraw.version);
  assert.equal(r.resolve('alice').raw.entitlements.freeSessionsPerDay.campaignOverride, null);
  assert.equal(f.store.read('alice').world.shift!.configVersion, opening.configVersion);
});

test('impact counts unmasked keys and both audiences on replacement without persisting generated resolutions', t => {
  const f=fixture(t),r=f.registry;
  const old=f.publish(c=>{c.menu.bia.price=110;},f.scope('club',{playerIds:['alice','bob']}));
  f.publish(c=>{c.menu.bia.price=120;},f.scope('mask',{kind:'campaign',expiresAt:NOW+DAY}));
  f.store.command('bob',{idempotencyKey:'open',command:{type:'startShift'}});
  const d=r.propose(f.actor(),f.input(c=>{c.menu.bia.price=130;},f.scope('club',{playerIds:['alice','carol'],previousVersion:old.version})));
  const counts=()=>['configs','registry_resolutions','registry_audit','commands','events'].map(table=>f.db.prepare('SELECT COUNT(*) n FROM '+table).get()!.n);
  const before=counts(),impact=r.impact(f.actor(),d.version);
  assert.equal(impact.audiencePlayers,3);assert.equal(impact.changedPlayers,2);assert.equal(impact.pinnedShifts,1);
  assert.deepEqual(impact.keys,[{path:'menu.bia.price',players:2}]);assert.deepEqual(counts(),before);
  r.approve(f.actor(),d.version);r.publish(f.actor(),d.version);
  assert.equal(r.resolve('alice').raw.menu.bia.price,120);assert.equal(r.resolve('bob').raw.menu.bia.price,config.raw.menu.bia.price);assert.equal(r.resolve('carol').raw.menu.bia.price,130);
});

test('impact refuses contradictory candidates and future expiry failures using real publication validation', t => {
  const f=fixture(t),r=f.registry;
  f.publish(c=>{c.k.band=[2,2.6];},f.scope('band'));
  f.publish(c=>{c.k.band=[2,2.9];},f.scope('mask',{kind:'campaign',expiresAt:NOW+2*DAY}));
  const d=r.propose(f.actor(),f.input(c=>{c.k.value=2.7;}));
  assert.throws(()=>r.impact(f.actor(),d.version),/config:k/);
  const conflict=r.propose(f.actor(),f.input(c=>{c.k.band=[2,2.8];},f.scope('conflict')));
  assert.throws(()=>r.impact(f.actor(),conflict.version),/scopeConflict/);
  assert.equal(f.db.prepare('SELECT 1 FROM registry_publications WHERE version=?').get(d.version),undefined);
});

test('preview token rejects overlapping publications and expiry drift, while exact committed retries recover once', t => {
  const f=fixture(t),r=f.registry,who=f.actor();
  const input=f.input(c=>{c.menu.bia.price=110;},f.scope('candidate'));
  const d=r.propose(who,input);r.approve(who,d.version);const first=r.impact(who,d.version);
  f.now+=100;assert.equal(r.impact(who,d.version).token,first.token,'ordinary clock movement must not force confirmation loops');
  f.publish(c=>{c.menu.bia.price=120;},f.scope('mask',{kind:'campaign',expiresAt:NOW+1000}));
  assert.throws(()=>r.publish(who,d.version,first.token),/staleImpact/);
  const masked=r.impact(who,d.version);assert.equal(masked.changedPlayers,0);f.now=NOW+1000;
  assert.throws(()=>r.publish(who,d.version,masked.token),/staleImpact/);
  const fresh=r.impact(who,d.version);assert.equal(fresh.changedPlayers,1);
  const pub=r.publish(who,d.version,fresh.token);f.publish(c=>{c.menu.lac.price++;});
  assert.deepEqual(r.publish(who,d.version,fresh.token),pub);assert.equal(r.resolve('alice').raw.menu.bia.price,110);
});

test('emergency replaces only the exact scoped schedule chain; expiry never resurrects it and other scopes keep schedules',t=>{
 const f=fixture(t),r=f.registry,who=f.actor();
 const active=f.publish(c=>{c.menu.bia.price++;},f.scope('festival',{kind:'campaign',expiresAt:NOW+3*DAY}));
 const pending=f.publish(c=>{c.shift.dailyEarnCapBase++;},f.scope('festival',{kind:'campaign',expiresAt:NOW+3*DAY,previousVersion:active.version}));
 const another=f.publish(c=>{c.shift.dailyEarnCapBase+=2;},f.scope('other',{playerIds:['bob']}));
 const global=f.publish(c=>{c.shift.dailyEarnCapBase+=3;});
 assert.throws(()=>r.draftSource(who,pending.version,true),/inactiveEmergencySource/);
 const source=r.scopeSource(who,'campaign','festival',true);
 assert.equal(source.baseVersion,config.version);assert.equal(source.snapshot.menu.bia.price,config.raw.menu.bia.price+1);
 assert.equal(source.snapshot.shift.dailyEarnCapBase,config.raw.shift.dailyEarnCapBase);assert.equal(source.scope!.previousVersion,pending.version);
 source.snapshot.menu.bia.price++;const scope={...source.scope!,expiresAt:NOW+1000};
 const d=r.propose(who,{...source,scope,key:'emergency',emergency:true,reason:'Fix active campaign'}),preview=r.impact(who,d.version);
 assert.deepEqual(preview.supersedes!.map(s=>s.version),[pending.version]);r.publish(who,d.version,preview.token);
 assert.equal(r.resolve('alice').raw.menu.bia.price,config.raw.menu.bia.price+2);
 f.now+=1001;assert.equal(r.resolve('alice').version,config.version);
 f.now=global.effective_at;assert.equal(r.resolve('alice').version,global.version);
 assert.equal(r.resolve('bob').raw.shift.dailyEarnCapBase,config.raw.shift.dailyEarnCapBase+2);
 assert.equal(r.details(f.actor('viewer'),pending.version).supersededBy,d.version);
 assert.equal(r.details(f.actor('viewer'),another.version).supersededBy,null);assert.equal(r.details(f.actor('viewer'),global.version).supersededBy,null);
 const next=r.scopeSource(f.actor(),'campaign','festival');assert.equal(next.scope!.previousVersion,d.version);
});

test('emergency campaign replacement cannot skip support tickets, exact predecessors or incompatible other scopes',t=>{
 const f=fixture(t),r=f.registry,who=f.actor();
 f.publish(c=>{c.menu.bia.price++;},f.scope('other'));
 const input={...f.input(c=>{c.menu.bia.price+=2;},f.scope('collision')),emergency:true};
 const d=r.propose(who,input);assert.throws(()=>r.impact(who,d.version),/scopeConflict/);assert.throws(()=>r.publish(who,d.version,'0'.repeat(64)),/scopeConflict/);
 const ticketless={...f.input(c=>{c.menu.bia.price++;},f.scope('alice',{kind:'player',expiresAt:NOW+DAY})),emergency:true};
 assert.throws(()=>r.propose(who,ticketless),/invalidScope/);
 const ticket=r.requestSupport(who,{key:'case',playerId:'alice',reason:'Correction'});
 ticketless.scope!.ticketId=ticket;const p=r.propose(who,ticketless);r.publish(who,p.version,r.impact(who,p.version).token);
 assert.equal(f.db.prepare('SELECT version FROM registry_support_uses WHERE ticket_id=?').get(ticket)!.version,p.version);
 const next={...ticketless,key:'reuse',scope:{...ticketless.scope!,previousVersion:p.version}};
 assert.throws(()=>r.propose(who,next),/invalidTicket/);
});

test('emergency scope preview expires when a pending schedule activates without a publication revision',t=>{
 const f=fixture(t),r=f.registry,who=f.actor();
 const pending=f.publish(c=>{c.shift.dailyEarnCapBase++;},f.scope('scheduled'));
 const source=r.scopeSource(who,'segment','scheduled',true);assert.equal(source.snapshot.shift.dailyEarnCapBase,config.raw.shift.dailyEarnCapBase);
 source.snapshot.menu.bia.price++;
 const d=r.propose(who,{...source,scope:source.scope!,key:'boundary',emergency:true,reason:'Correction'}),preview=r.impact(who,d.version);
 assert.equal(preview.supersedes!.length,1);f.now=pending.effective_at;
 assert.throws(()=>r.publish(f.actor(),d.version,preview.token),/staleImpact/);
 const fresh=r.impact(f.actor(),d.version);assert.deepEqual(fresh.supersedes,[]);r.publish(f.actor(),d.version,fresh.token);
 assert.equal(r.details(f.actor('viewer'),pending.version).supersededBy,null);
 assert.equal(r.resolve('alice').raw.menu.bia.price,config.raw.menu.bia.price+1);
});

test('emergency cannot silently remove active Tier C keys hidden behind an A/B scheduled successor',t=>{
 const f=fixture(t),r=f.registry,who=f.actor();
 const active=f.publish(c=>{c.audio.enabled=false;},f.scope('mixed'));
 const pending=f.publish(c=>{c.shift.dailyEarnCapBase++;},f.scope('mixed',{playerIds:['bob'],previousVersion:active.version}));
 const input={...f.input(c=>{c.menu.bia.price++;},f.scope('mixed',{playerIds:['carol'],previousVersion:pending.version})),key:'guard-active-C',emergency:true};
 assert.throws(()=>r.propose(who,input),/emergencyTier/);
 assert.equal(r.resolve('alice').raw.audio.enabled,false);assert.equal(r.details(who,pending.version).phase,'scheduled');
});

test('emergency impact and forecast include active and every pending audience; retry survives later Tier C publication',t=>{
 const f=fixture(t),r=f.registry,who=f.actor();
 const active=f.publish(c=>{c.menu.bia.price++;},f.scope('audience'));
 const schedule=(previous:string,id:string,amount:number)=>{
  const d=r.propose(f.actor(),{...f.input(c=>{c.menu.bia.price+=amount;},f.scope('audience',{playerIds:[id],previousVersion:previous})),effective:'next_day'});
  r.approve(f.actor(),d.version);return r.publish(f.actor(),d.version);
 };
 const middle=schedule(active.version,'bob',2),last=schedule(middle.version,'carol',3);
 f.store.createPlayer('dave',4);
 f.store.command('alice',{idempotencyKey:'open-alice',command:{type:'startShift'}});
 const input={...f.input(c=>{c.menu.bia.price+=4;},f.scope('audience',{playerIds:['dave'],previousVersion:last.version})),key:'all-audiences',emergency:true};
 const d=r.propose(who,input),impact=r.impact(who,d.version),forecast=r.forecastPlan(who,d.version,f.now+2*DAY);
 assert.equal(impact.audiencePlayers,4);assert.equal(impact.changedPlayers,2);assert.equal(impact.pinnedShifts,1);
 assert.deepEqual(impact.keys,[{path:'menu.bia.price',players:2}]);
 assert.deepEqual(forecast.players.map(p=>p.id),['alice','bob','carol','dave']);
 assert.ok(forecast.players.find(p=>p.id==='alice')!.keys.includes('menu.bia.price'));
 assert.deepEqual(forecast.players.find(p=>p.id==='bob')!.keys,[]); // Same-time successor already masks this pending audience in the baseline.
 assert.ok(forecast.players.find(p=>p.id==='carol')!.keys.includes('menu.bia.price'));
 const receipt=r.publish(who,d.version,impact.token);
 assert.equal(r.resolve('alice').raw.menu.bia.price,config.raw.menu.bia.price);
 assert.equal(r.resolve('dave').raw.menu.bia.price,config.raw.menu.bia.price+4);
 f.publish(c=>{c.audio.enabled=false;},f.scope('audience',{previousVersion:d.version}));
 assert.deepEqual(r.publish(who,d.version,'outdated'),receipt);assert.deepEqual(r.propose(who,input),d);
});
