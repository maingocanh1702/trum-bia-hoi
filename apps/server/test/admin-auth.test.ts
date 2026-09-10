import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { OAuth2Client } from 'google-auth-library';
import { config } from '@tbh/engine';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';
import { adminDirectory, totp } from '../src/admin-auth';

const CLIENT = 'test-admin.apps.googleusercontent.com', SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const defaults = [
  { subject: 'super-one', role: 'super', totpSecret: SECRET },
  { subject: 'super-two', role: 'super', totpSecret: 'B'.repeat(32) },
  { subject: 'game-one', role: 'game', totpSecret: 'C'.repeat(32) },
  { subject: 'economy-one', role: 'economy' }, { subject: 'viewer-one', role: 'viewer' }, { subject: 'support-one', role: 'support' },
];
function signed(subject: string, nonce: string, patch: object = {}) {
  const now = Math.floor(Date.now() / 1000), enc = (x: unknown) => Buffer.from(JSON.stringify(x)).toString('base64url');
  const data = `${enc({ alg: 'RS256', kid: 'test' })}.${enc({ iss: 'https://accounts.google.com', sub: subject, aud: CLIENT, iat: now - 1, exp: now + 3600, nonce, ...patch })}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key.privateKey).toString('base64url')}`;
}
async function fixture(t: TestContext, enabled = true, https = false) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/admin-')), file = resolve(dir, 'game.db'), accounts = resolve(dir, 'accounts.json');
  const setAccounts = (rows: unknown) => writeFileSync(accounts, JSON.stringify(rows), { mode: 0o600 }); setAccounts(defaults);
  let now = Date.now(); const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, undefined, () => now); stores.push(s); return s; };
  const store = open(), db = new DatabaseSync(file);
  const certs = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ test: key.publicKey.export({ type: 'spki', format: 'pem' }) })); });
  await new Promise<void>(r => certs.listen(0, '127.0.0.1', r));
  const client = new OAuth2Client({ endpoints: { oauth2FederatedSignonPemCertsUrl: new URL(`http://127.0.0.1:${(certs.address() as AddressInfo).port}`) } });
  const origin = https ? 'https://game.example' : 'http://127.0.0.1:4179';
  const server = createGameServer(store, { origin, sessionTtlMs: 86400000, rateWindowMs: 60000, rateMax: 10000,
    googleClientId: enabled ? CLIENT : undefined, adminAccountsFile: accounts }, client);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { for (const s of [server, certs]) { s.closeAllConnections(); await new Promise<void>(r => s.close(() => r())); } db.close(); stores.forEach(s => s.close()); rmSync(dir, { force: true, recursive: true }); });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) => {
    const context = body !== undefined && path.startsWith('/admin/') && !path.startsWith('/admin/auth') && cookie ? store.adminAuth.status(cookie.split('=')[1], adminDirectory(accounts)) : null;
    const response = await fetch(url + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(context?.phase === 'authenticated' ? { 'X-TBH-Admin-Context': context.context } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json(); return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  };
  const google = async (subject: string) => {
    const c = await call('/admin/auth/challenge', {}); assert.equal(c.status, 200); assert.ok(c.cookie);
    const g = await call('/admin/auth/google', { credential: signed(subject, c.data.nonce) }, c.cookie);
    return { ...g, cookie: g.cookie ?? c.cookie, challengeCookie: c.cookie, nonce: c.data.nonce };
  };
  const login = async (subject: string) => {
    const g = await google(subject); assert.equal(g.status, 200);
    if (g.data.phase === 'mfa') {
      const secret = defaults.find(r => r.subject === subject)!.totpSecret!;
      const f = await call('/admin/auth/factor', { code: totp(secret, Math.floor(now / 30000)) }, g.cookie);
      assert.equal(f.status, 200); assert.ok(f.cookie); return f.cookie;
    }
    return g.cookie!;
  };
  return { dir, file, accounts, setAccounts, store, open, db, call, google, login, get now() { return now; }, set now(v: number) { now = v; } };
}

test('RFC6238 published SHA1 vectors match six-digit authenticator codes, including beyond2038', () => {
  for (const [seconds, expected] of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']] as const) {
    assert.equal(totp(SECRET, Math.floor(seconds / 30)), expected);
  }
  for (const secret of ['', 'A'.repeat(31), SECRET + '\n', 'a'.repeat(32)]) assert.throws(() => totp(secret, 1), /invalidFactor/);
});

test('admin directory rejects exposed files, symlinks, duplicate identities/factors and missing required MFA', async t => {
  const f = await fixture(t); assert.equal(adminDirectory(f.accounts).size, 6);
  for (const rows of [null, {}, [{subject:'x',role:'super'}], [{subject:'x',role:'god'}],
    [defaults[0], defaults[0]], [defaults[0], {...defaults[1],totpSecret:SECRET}],
    [{...defaults[0],totpSecret:SECRET+'\n'}], [{...defaults[0],mfa:true}]]) {
    f.setAccounts(rows); assert.throws(() => adminDirectory(f.accounts), /admin:unavailable/);
  }
  f.setAccounts(defaults); chmodSync(f.accounts, 0o644); assert.throws(() => adminDirectory(f.accounts), /unavailable/);
  chmodSync(f.accounts, 0o600); symlinkSync(f.accounts, resolve(f.dir, 'link')); assert.throws(() => adminDirectory(resolve(f.dir, 'link')), /unavailable/);
  assert.throws(() => adminDirectory('relative.json'), /unavailable/);
  writeFileSync(f.accounts, ' '.repeat(65537)); assert.throws(() => adminDirectory(f.accounts), /unavailable/);
});

test('Google plus independent factor rotates an eight-hour admin cookie without creating or modifying any player', async t => {
  const f = await fixture(t, true, true), guest = f.store.createGuestSession(86400000);
  f.store.command(guest.playerId, { idempotencyKey: 'open', command: {type:'startShift'} }); const before = f.store.read(guest.playerId);
  const g = await f.google('super-one'); assert.equal(g.status, 200); assert.equal(g.data.phase, 'mfa');
  assert.match(g.challengeCookie!, /^__Host-tbh-admin=/);
  assert.equal((await f.call('/admin/registry', undefined, g.cookie)).status, 401);
  const done = await f.call('/admin/auth/factor', {code:totp(SECRET, Math.floor(f.now/30000))}, g.cookie);
  assert.equal(done.status, 200); assert.notEqual(done.cookie, g.cookie); assert.equal(done.data.token, undefined);
  assert.match(done.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict;.*Secure/);
  const who = await f.call('/admin/auth', undefined, done.cookie);
  assert.equal(who.data.actor.role, 'super'); assert.equal(who.data.actor.mfa, true);
  assert.equal(who.data.actor.expiresAt-who.data.actor.issuedAt, 8*3600000);
  assert.equal((await f.call('/admin/registry', undefined, g.cookie)).status, 401);
  assert.deepEqual(f.store.read(guest.playerId), before); assert.equal(f.db.prepare('SELECT count(*) n FROM players').get()!.n, 1);
  const dbText = JSON.stringify(f.db.prepare('SELECT * FROM admin_sessions').all())+JSON.stringify(f.db.prepare('SELECT * FROM registry_audit').all());
  assert.ok(!dbText.includes(SECRET)); assert.ok(!dbText.includes(done.cookie!.split('=')[1]));
  f.store.close(); const reopened=f.open(); assert.equal(reopened.adminAuth.actor(done.cookie!.split('=')[1],adminDirectory(f.accounts)).subject,'super-one');
  f.now=who.data.actor.expiresAt; assert.throws(()=>reopened.adminAuth.actor(done.cookie!.split('=')[1],adminDirectory(f.accounts)),/invalidSession/);
});

test('bad or replayed Google tokens, cross-origin requests, ambiguous cookies and unlisted subjects cannot authorize registry', async t => {
  const f = await fixture(t);
  const c = await f.call('/admin/auth/challenge', {});
  const bad = await f.call('/admin/auth/google',{credential:signed('super-one',c.data.nonce,{aud:'other.apps.googleusercontent.com'})},c.cookie);
  assert.equal(bad.status,401); assert.equal(bad.data.error,'googleVerificationFailed');
  assert.equal((await f.call('/admin/auth/google',{credential:signed('super-one',c.data.nonce)},c.cookie)).status,401);
  const g=await f.google('outsider');assert.equal(g.status,403);assert.equal((await f.call('/admin/registry',undefined,g.cookie)).status,401);
  const admin=await f.login('economy-one');
  assert.equal((await f.call('/admin/registry',undefined,admin+'; '+admin)).status,401);
  assert.equal((await f.call('/admin/auth/challenge',{},undefined,{Origin:'https://evil.example'})).status,403);
  assert.equal((await f.call('/admin/registry',undefined,admin,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await f.call('/admin/registry?before=1&before=2',undefined,admin)).status,400);
  assert.equal((await f.call('/admin/auth/challenge',{role:'super'})).status,400);
  const guest=await f.call('/auth/session',{});
  assert.equal((await f.call('/admin/registry',undefined,guest.cookie!.replace('tbh-session=','tbh-admin='))).status,401);
  assert.equal((await f.call('/player/state',undefined,admin.replace('tbh-admin=','tbh-session='))).status,401);
});

test('OTP replay and persistent subject lockout survive other challenges, connections and restart', async t => {
  const f=await fixture(t), account=adminDirectory(f.accounts), a=await f.google('super-one'), b=await f.google('super-one');
  const code=totp(SECRET,Math.floor(f.now/30000)); const done=await f.call('/admin/auth/factor',{code},a.cookie);assert.equal(done.status,200);
  assert.equal((await f.call('/admin/auth/factor',{code},b.cookie)).status,401);
  const second=f.open();assert.throws(()=>second.adminAuth.factor(b.cookie!.split('=')[1],code,account),/invalidFactor/);
  const never=[code+'\n','bad','12345'];
  for(let i=0;i<never.length;i++){const r=await f.call('/admin/auth/factor',{code:never[i]},b.cookie);assert.equal(r.status,i===2?429:401);}
  f.now+=30000;const c=await f.google('super-one');
  assert.equal((await f.call('/admin/auth/factor',{code:totp(SECRET,Math.floor(f.now/30000))},c.cookie)).status,429);
  assert.equal((await f.call('/admin/registry',undefined,done.cookie)).status,200,'MFA lockout does not log out already authenticated sessions');
  f.now+=900000;const later=await f.google('super-one');assert.equal((await f.call('/admin/auth/factor',{code:totp(SECRET,Math.floor(f.now/30000))},later.cookie)).status,200);
});

test('role removal or factor rotation invalidates sessions and partial authentication immediately; logout stays independent', async t => {
  const f=await fixture(t), econ=await f.login('economy-one'), partial=await f.google('game-one');
  const guest=await f.call('/auth/session',{});
  f.setAccounts(defaults.map(r=>r.subject==='economy-one'?{...r,role:'viewer'}:r.subject==='game-one'?{...r,totpSecret:'D'.repeat(32)}:r));
  assert.equal((await f.call('/admin/registry',undefined,econ)).status,401);
  assert.equal((await f.call('/admin/auth/factor',{code:totp('C'.repeat(32),Math.floor(f.now/30000))},partial.cookie)).status,401);
  const viewer=await f.login('viewer-one');assert.equal((await f.call('/admin/auth/logout',{},viewer+'; '+guest.cookie)).status,200);
  assert.equal((await f.call('/admin/registry',undefined,viewer)).status,401);
  assert.equal((await f.call('/auth/session',{},guest.cookie)).status,200);
  f.setAccounts(defaults.filter(r=>r.subject!=='economy-one'));assert.equal((await f.call('/admin/registry',undefined,econ)).status,401);
});

test('failed audit rolls back login and OTP consumption; bad factor counters commit before returning failure', async t => {
  const f=await fixture(t), g=await f.google('super-one'), code=totp(SECRET,Math.floor(f.now/30000));
  f.db.exec("CREATE TRIGGER test_admin_audit BEFORE INSERT ON registry_audit WHEN NEW.type='AdminSignedIn' BEGIN SELECT RAISE(ABORT,'test:auditFailed'); END");
  assert.equal((await f.call('/admin/auth/factor',{code},g.cookie)).status,500);
  assert.equal(f.db.prepare('SELECT count(*) n FROM admin_factors').get()!.n,0);
  assert.equal((await f.call('/admin/auth',undefined,g.cookie)).data.phase,'mfa');
  f.db.exec('DROP TRIGGER test_admin_audit');assert.equal((await f.call('/admin/auth/factor',{code},g.cookie)).status,200);
  assert.throws(()=>f.db.exec('DELETE FROM registry_audit'),/appendOnly/);
});

test('all five HTTP roles use canonical tier gates, dual approval, exact retry, complete JSON and actual new-shift publication', async t => {
  const f=await fixture(t), cookies=new Map<string,string>();for(const x of defaults)cookies.set(x.subject,await f.login(x.subject));
  const econ=cookies.get('economy-one')!, sup=cookies.get('super-one')!, sup2=cookies.get('super-two')!, game=cookies.get('game-one')!;
  const raw=structuredClone(config.raw);raw.menu.bia.price+=1;
  const proposal={key:'price',baseVersion:config.version,snapshot:raw,reason:'Tune beer after a measured playtest'};
  assert.ok(JSON.stringify(proposal).length>16384);
  for(const role of ['viewer-one','support-one']){
    assert.equal((await f.call('/admin/registry',undefined,cookies.get(role))).status,200);
    assert.equal((await f.call('/admin/proposals',proposal,cookies.get(role))).status,403);
    assert.equal((await f.call('/admin/audit?after=0',undefined,cookies.get(role))).status,200);
  }
  assert.equal((await f.call('/admin/proposals',{...proposal,actor:{subject:'super-one',role:'super',mfa:true}},econ)).status,400);
  assert.equal((await f.call('/admin/proposals',proposal,game)).status,403);
  const d=await f.call('/admin/proposals',proposal,econ);assert.equal(d.status,200);assert.deepEqual((await f.call('/admin/proposals',proposal,econ)).data,d.data);
  const view=await f.call('/admin/config?version='+d.data.version,undefined,econ);assert.equal(view.data.policy.tier,'B');assert.deepEqual(view.data.base,config.raw);
  const guest=f.store.createGuestSession(86400000);f.store.command(guest.playerId,{idempotencyKey:'old',command:{type:'startShift'}});const old=f.store.read(guest.playerId);
  assert.equal((await f.call('/admin/publish',d.data,econ)).status,409);
  assert.equal((await f.call('/admin/approve',d.data,econ)).status,200);const pub=await f.call('/admin/publish',d.data,econ);assert.equal(pub.status,200);
  assert.deepEqual((await f.call('/admin/publish',d.data,econ)).data,pub.data);
  assert.equal(f.store.read(guest.playerId).configVersion,old.configVersion);const fresh=f.store.createGuestSession(86400000); assert.equal(f.store.read(fresh.playerId).configVersion,d.data.version); f.store.command(fresh.playerId,{idempotencyKey:'fresh',command:{type:'startShift'}}); assert.equal(f.store.read(fresh.playerId).world.shift!.configVersion,d.data.version);
  assert.equal((await f.call('/admin/registry',undefined,econ)).data.activeVersion,d.data.version);
  const content=structuredClone(view.data.snapshot);content.audio.enabled=!content.audio.enabled;
  const c=await f.call('/admin/proposals',{key:'content',baseVersion:d.data.version,snapshot:content,reason:'Enable playtest audio'},game);assert.equal(c.status,200);
  assert.equal((await f.call('/admin/approve',c.data,game)).status,200);assert.equal((await f.call('/admin/publish',c.data,game)).status,200);
  const next=structuredClone((await f.call('/admin/config?version='+c.data.version,undefined,game)).data.snapshot);next.k.value=2.6;
  const a=await f.call('/admin/proposals',{key:'k',baseVersion:c.data.version,snapshot:next,reason:'Measured economy test'},sup);assert.equal(a.status,200);
  assert.equal((await f.call('/admin/approve',a.data,sup)).status,403);assert.equal((await f.call('/admin/approve',a.data,sup2)).status,200);
  const ap=await f.call('/admin/publish',a.data,sup);assert.equal(ap.status,200);assert.ok(ap.data.effective_at>f.now);
  assert.equal((await f.call('/admin/proposals',{...proposal,key:'stale'},econ)).status,409);
  assert.equal((await f.call('/admin/proposals',{...proposal,reason:'x'.repeat(524288)},econ)).status,413);
  assert.equal((await f.call('/auth/logout',{padding:'x'.repeat(16384)})).status,413,'player body ceiling unchanged');
});

test('disabled Google stays closed while guest play works and schema8 migration preserves registry and career', async t => {
  const f=await fixture(t,false);assert.deepEqual((await f.call('/admin/auth')).data,{enabled:false,phase:'signedOut'});
  assert.equal((await f.call('/admin/auth/challenge',{})).status,503);assert.equal((await f.call('/admin/registry')).status,503);
  assert.equal((await f.call('/auth/session',{})).status,201);
  const guest=f.store.createGuestSession(86400000),before=f.store.read(guest.playerId);f.store.close();
  f.db.exec('DROP TABLE registry_resolutions; DROP TABLE registry_support_uses; DROP TABLE registry_support; DROP TABLE registry_scopes; DROP TABLE admin_sessions; DROP TABLE admin_factors; PRAGMA user_version=8');
  const migrated=f.open();assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version,10);assert.deepEqual(migrated.read(guest.playerId),before);
  assert.equal(migrated.registry.latest().version,config.version);
});


test('replaced or expired Google challenge cannot consume a verified identity and MFA expires independently of active sessions', async t => {
  const f=await fixture(t), directory=adminDirectory(f.accounts), auth=f.store.adminAuth;
  const old=auth.challenge(undefined), latest=auth.challenge(old.token);
  assert.throws(()=>auth.google(old.token,old.nonce,{subject:'economy-one'},directory),/invalidChallenge/);
  f.now=latest.expiresAt;
  assert.throws(()=>auth.google(latest.token,latest.nonce,{subject:'economy-one'},directory),/invalidChallenge/);
  const mfa=await f.google('super-one');f.now=mfa.data.expiresAt;
  assert.equal((await f.call('/admin/auth/factor',{code:totp(SECRET,Math.floor(f.now/30000))},mfa.cookie)).status,401);
  assert.equal(f.db.prepare("SELECT count(*) n FROM admin_sessions WHERE phase='authenticated'").get()!.n,0);
});


test("an admin account switch cannot apply another tab's previously confirmed registry action", async t => {
  const f=await fixture(t), a=await f.login('economy-one'), b=await f.login('super-one');
  const context=(await f.call('/admin/auth',undefined,a)).data.context;
  const snapshot=structuredClone(config.raw);snapshot.menu.bia.price++;
  const input={key:'bound',baseVersion:config.version,snapshot,reason:'A review bound to its author'};
  const before=f.db.prepare('SELECT count(*) n FROM registry_proposals').get()!.n;
  for(const stale of [context,''])assert.equal((await f.call('/admin/proposals',input,b,{'X-TBH-Admin-Context':stale})).status,409);
  assert.equal((await f.call('/admin/registry',undefined,b,{'X-TBH-Admin-Context':context})).status,409);
  assert.equal(f.db.prepare('SELECT count(*) n FROM registry_proposals').get()!.n,before);
  assert.equal((await f.call('/admin/proposals',input,a)).status,200);
});

test('authenticated scoped publication exposes exact metadata and read-only composed impact; rollback preserves newer defaults', async t => {
  const f=await fixture(t), economy=await f.login('economy-one'), viewer=await f.login('viewer-one');
  f.store.createPlayer('scope-alice',42);f.store.createPlayer('scope-bob',43);
  f.store.command('scope-alice',{idempotencyKey:'open',command:{type:'startShift'}});
  const initial=await f.call('/admin/registry',undefined,economy), baseVersion=initial.data.latest.version;
  const raw=(await f.call('/admin/config?version='+baseVersion,undefined,economy)).data.snapshot;raw.menu.bia.price++;
  const scope={kind:'segment',id:'explicit-club',playerIds:['scope-alice'],priority:0,expiresAt:null,previousVersion:null,ticketId:null};
  assert.equal((await f.call('/admin/proposals',{key:'bad',baseVersion,snapshot:raw,reason:'bad',scope:{...scope,actor:'super'}},economy)).status,400);
  assert.equal((await f.call('/admin/proposals',{key:'viewer',baseVersion,snapshot:raw,reason:'forbidden',scope},viewer)).status,403);
  const proposed=await f.call('/admin/proposals',{key:'scoped-http',baseVersion,snapshot:raw,reason:'Club price',scope},economy);assert.equal(proposed.status,200);const version=proposed.data.version;
  const counts=()=>['configs','registry_proposals','registry_publications','registry_audit','registry_resolutions','players','commands','events'].map(table=>f.db.prepare('SELECT COUNT(*) n FROM '+table).get()!.n);
  const before=counts(),impact=await f.call('/admin/impact',{version},economy);assert.equal(impact.status,200);assert.equal(impact.data.changedPlayers,1);assert.equal(impact.data.audiencePlayers,1);assert.equal(impact.data.pinnedShifts,1);assert.deepEqual(impact.data.keys,[{path:'menu.bia.price',players:1}]);assert.deepEqual(counts(),before);
  assert.deepEqual((await f.call('/admin/config?version='+version,undefined,viewer)).data.scope,scope);
  assert.equal((await f.call('/admin/approve',{version},economy)).status,200);assert.equal((await f.call('/admin/publish',{version},economy)).status,200);
  assert.equal(f.store.read('scope-alice').world.shift!.configVersion,baseVersion);
  assert.equal((await f.call('/admin/registry',undefined,economy)).data.proposals.find((p:any)=>p.version===version).scope.id,'explicit-club');
  const newer=structuredClone(raw);newer.menu.bia.price--;newer.menu.lac.price+=7;
  const global=await f.call('/admin/proposals',{key:'new-default',baseVersion,snapshot:newer,reason:'Newer default'},economy);const gv=global.data.version;
  await f.call('/admin/approve',{version:gv},economy);await f.call('/admin/publish',{version:gv},economy);
  const source=await f.call('/admin/draft-source?version='+version,undefined,economy);assert.equal(source.status,200);assert.equal(source.data.baseVersion,gv);assert.equal(source.data.snapshot.menu.lac.price,newer.menu.lac.price);assert.equal(source.data.snapshot.menu.bia.price,raw.menu.bia.price);assert.equal(source.data.scope.previousVersion,version);
  assert.deepEqual((await f.call('/admin/scope?kind=segment&id=explicit-club',undefined,economy)).data,source.data);
  assert.equal((await f.call('/admin/players?after=scope-alice',undefined,viewer)).data.players[0].id,'scope-bob');
  assert.equal((await f.call('/admin/players?after=x&other=bad',undefined,viewer)).status,400);
  assert.equal((await f.call('/admin/scope?kind=segment&id=missing',undefined,economy)).status,404);
});

test('support HTTP tickets require an admin role, recover exact retries and are visibly consumed by a Super player override', async t => {
  const f=await fixture(t), support=await f.login('support-one'), viewer=await f.login('viewer-one'), admin=await f.login('super-one');f.store.createPlayer('ticket-player',42);
  const body={key:'CASE-2026-01',playerId:'ticket-player',reason:'Temporary configuration correction'};
  assert.equal((await f.call('/admin/support',body,viewer)).status,403);assert.equal((await f.call('/admin/support',undefined,viewer)).status,403);
  assert.equal((await f.call('/admin/support',body)).status,401);
  const created=await f.call('/admin/support',body,support);assert.equal(created.status,200);assert.deepEqual((await f.call('/admin/support',body,support)).data,created.data);
  assert.equal((await f.call('/admin/support',{...body,reason:'Changed'},support)).status,409);
  const source=(await f.call('/admin/draft-source',undefined,admin)).data;source.snapshot.menu.bia.price++;
  const scope={kind:'player',id:'ticket-player',playerIds:['ticket-player'],priority:0,expiresAt:f.now+86400000,previousVersion:null,ticketId:created.data.ticketId};
  const input={key:'player-override',baseVersion:source.baseVersion,snapshot:source.snapshot,reason:'Support adjustment',scope};
  assert.equal((await f.call('/admin/proposals',input,support)).status,403);
  const proposal=await f.call('/admin/proposals',input,admin);assert.equal(proposal.status,200);const version=proposal.data.version;
  const before=f.store.read('ticket-player');await f.call('/admin/approve',{version},admin);assert.equal((await f.call('/admin/publish',{version},admin)).status,200);
  assert.deepEqual(f.store.read('ticket-player'),before);const tickets=await f.call('/admin/support',undefined,support);assert.equal(tickets.data.tickets.length,1);assert.equal(tickets.data.tickets[0].used_version,version);
  const replacement=await f.call('/admin/scope?kind=player&id=ticket-player',undefined,admin);assert.equal(replacement.data.scope.ticketId,null);assert.equal(replacement.data.scope.previousVersion,version);
  assert.equal((await f.call('/admin/impact',{version,changedPlayers:0},admin)).status,400);
});
