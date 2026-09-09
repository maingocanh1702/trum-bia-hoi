import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import { googleVerifier } from '../src/google';
import { GameStore } from '../src/store';
import { createGameServer } from '../src/http';

const CLIENT = '123456-tbh-test.apps.googleusercontent.com', NONCE = 'a'.repeat(64);
const keys = ['first', 'rotated'].map(kid => ({ kid, ...generateKeyPairSync('rsa', { modulusLength: 2048 }) }));
function token(patch: Record<string, unknown> = {}, key = keys[0], header: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const body = `${encode({ alg: 'RS256', typ: 'JWT', kid: key.kid, ...header })}.${encode({
    iss: 'https://accounts.google.com', aud: CLIENT, sub: '11223344556677889900',
    iat: now - 10, exp: now + 3600, nonce: NONCE, ...patch,
  })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), key.privateKey).toString('base64url')}`;
}
async function fixture(t: TestContext) {
  let selected = keys[0], requests = 0, status = 200, hang = false;
  const server = createServer((_req, res) => {
    requests++;
    if (hang) return;
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'public, max-age=1' });
    res.end(JSON.stringify({ [selected.kid]: selected.publicKey.export({ format: 'pem', type: 'spki' }) }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const client = new OAuth2Client({
    endpoints: { oauth2FederatedSignonPemCertsUrl: new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/certs`) },
    transporterOptions: { timeout: 5000, retryConfig: { retry: 0 } },
  });
  return { client, verify: googleVerifier(CLIENT, client)!, get requests() { return requests; },
    rotate() { selected = keys[1]; }, fail() { status = 503; }, hang() { hang = true; } };
}
const rejected = (result: Promise<unknown>) => assert.rejects(result, error => {
  assert.ok(error instanceof Error); assert.equal(error.message, 'auth:googleVerificationFailed');
  assert.equal(error.cause, undefined); assert.deepEqual(Object.keys(error), []); return true;
});

test('real Google SDK verifies a signed token and binds only sub, independent of email/profile claims', async t => {
  const f = await fixture(t);
  const identity = await f.verify(token({ email: 'old@example.com', name: 'Old Name', picture: 'https://example.com/a.png' }), NONCE);
  assert.deepEqual(identity, { subject: '11223344556677889900' });
  assert.deepEqual(await f.verify(token({ email: 'changed@example.net', name: 'New Name', email_verified: false, azp: CLIENT }), NONCE), identity);
  assert.deepEqual(await f.verify(token({ iss: 'accounts.google.com' }), NONCE), identity);
  assert.notDeepEqual(await f.verify(token({ sub: 'another-google-account', email: 'old@example.com' }), NONCE), identity);
  assert.equal(f.requests, 1, 'SDK caches certificates, rather than fetching on every login');
});

test('missing Client ID stays unavailable and invalid deployment configuration never disables audience checking', async t => {
  const f = await fixture(t);
  assert.equal(googleVerifier(undefined, f.client), undefined); assert.equal(googleVerifier('', f.client), undefined);
  for (const value of [' ', 'wrong-app', 'https://evil.apps.googleusercontent.com', CLIENT + '.evil', CLIENT + '\n']) {
    assert.throws(() => googleVerifier(value, f.client), /auth:invalidGoogleClientId/);
  }
  assert.equal(f.requests, 0);
});

test('invalid signed claims, signature, audience and request nonce cannot become a Google identity', async t => {
  const f = await fixture(t), now = Math.floor(Date.now() / 1000);
  for (const patch of [
    { aud: 'someone-elses-app.apps.googleusercontent.com' }, { aud: undefined }, { aud: [CLIENT] },
    { iss: 'https://attacker.example' }, { iss: 'googleapis.com' }, { iss: undefined }, { azp: 'other-app.apps.googleusercontent.com' },
    { exp: now - 1 }, { exp: undefined }, { exp: String(now + 3600) }, { exp: now + 100000 },
    { iat: now + 1000 }, { iat: String(now - 10) }, { iat: now + 100, exp: now + 100 },
    { nonce: undefined }, { nonce: 'b'.repeat(64) }, { sub: undefined }, { sub: 123 },
    { sub: '' }, { sub: 'x'.repeat(256) }, { sub: 'has space' }, { sub: 'bad\nsubject' },
  ]) await rejected(f.verify(token(patch), NONCE));
  await rejected(f.verify(token({}, keys[1], { kid: keys[0].kid }), NONCE));
  await rejected(f.verify(token({}, keys[0], { kid: 'unknown' }), NONCE));
  await rejected(f.verify(token(), 'b'.repeat(64)));
  for (const malformed of [undefined, null, {}, '', 'abc', 'a.b.c', 'x'.repeat(16385), token() + '\n']) {
    await rejected(f.verify(malformed, NONCE));
  }
  for (const nonce of ['', 'short', 'a'.repeat(63), NONCE + '\n']) await rejected(f.verify(token(), nonce));
  assert.equal(f.requests, 1);
});

test('certificate expiry and rotation use the SDK cache without accepting a retired signing key', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const f = await fixture(t);
  await f.verify(token(), NONCE); f.rotate();
  await rejected(f.verify(token({}, keys[1]), NONCE)); assert.equal(f.requests, 1);
  t.mock.timers.tick(1001);
  assert.deepEqual(await f.verify(token({}, keys[1]), NONCE), { subject: '11223344556677889900' });
  assert.equal(f.requests, 2);
  await rejected(f.verify(token(), NONCE));
});

test('unavailable or stalled certificate service fails closed with no credential in errors', async t => {
  const unavailable = await fixture(t); unavailable.fail();
  await rejected(unavailable.verify(token({ email: 'private@example.com' }), NONCE));
  assert.equal(unavailable.requests, 1, 'certificate IO does not retry an unavailable provider');
  const stalled = await fixture(t); stalled.hang();
  await rejected(stalled.verify(token(), NONCE)); assert.equal(stalled.requests, 1);
});

async function apiFixture(t: TestContext, configured = true) {
  const certs = await fixture(t), origin = 'http://127.0.0.1:5174';
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/google-http-'));
  let now = Date.now(); const store = new GameStore(resolve(dir, 'game.db'), undefined, () => now);
  const server = createGameServer(store, { origin, sessionTtlMs: 86400000, rateWindowMs: 60000,
    rateMax: 1000, googleClientId: configured ? CLIENT : undefined }, certs.client);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close(); rmSync(dir, { force: true, recursive: true }); });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, body: unknown, cookie?: string, originHeader = origin) => fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: originHeader, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  });
  const guest = async () => {
    const response = await call('/auth/session', {}); assert.equal(response.status, 201);
    return { ...await response.json(), cookie: response.headers.get('set-cookie')!.split(';')[0] } as { playerId: string; cookie: string };
  };
  return { ...certs, store, call, guest, get now() { return now; }, set now(v: number) { now = v; } };
}
async function challenge(f: Awaited<ReturnType<typeof apiFixture>>, cookie: string) {
  const response = await f.call('/auth/google/challenge', {}, cookie); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.clientId, CLIENT); assert.match(result.nonce, /^[a-f0-9]{64}$/);
  return result as { nonce: string; expiresAt: number; clientId: string };
}

test('actual signed-token HTTP login rotates cookies and preserves server guest progress; conflict needs an explicit choice', async t => {
  const f = await apiFixture(t), a = await f.guest(), b = await f.guest();
  f.store.command(a.playerId, { idempotencyKey: 'open', command: { type: 'startShift' } });
  const before = f.store.read(a.playerId), pending = await challenge(f, a.cookie);
  const response = await f.call('/auth/google', { credential: token({ nonce: pending.nonce }) }, a.cookie);
  assert.equal(response.status, 200); const data = await response.json();
  assert.deepEqual(Object.keys(data).sort(), ['expiresAt', 'playerId', 'provider']); assert.equal(data.provider, 'google');
  assert.equal(data.playerId, a.playerId); const cookie = response.headers.get('set-cookie')!.split(';')[0];
  assert.notEqual(cookie, a.cookie); assert.match(response.headers.get('set-cookie')!, /HttpOnly; SameSite=Lax/);
  assert.deepEqual(f.store.read(a.playerId), before);
  assert.equal((await f.call('/auth/session', {}, a.cookie)).status, 401);
  assert.equal((await (await f.call('/auth/session', {}, cookie)).json()).provider, 'google');
  assert.equal((await f.call('/auth/google', { credential: token({ nonce: pending.nonce }) }, cookie)).status, 401);
  const other = await challenge(f, b.cookie), credential = token({ nonce: other.nonce });
  const conflict = await f.call('/auth/google', { credential }, b.cookie);
  assert.equal(conflict.status, 409); assert.deepEqual(await conflict.json(), { error: 'accountConflict' }); assert.equal(conflict.headers.get('set-cookie'), null);
  const kept = await f.call('/auth/google', { credential, keepAccount: true }, b.cookie);
  assert.equal(kept.status, 200); assert.equal((await kept.json()).playerId, a.playerId);
  assert.deepEqual(f.store.read(a.playerId), before); assert.ok(f.store.read(b.playerId));
});

test('Google HTTP refuses missing configuration, CSRF, unbound tokens and client authority without consuming a valid challenge', async t => {
  const disabled = await apiFixture(t, false), guest = await disabled.guest();
  for (const [path, body] of [['/auth/google/challenge', {}], ['/auth/google', { credential: token() }]] as const) {
    const res = await disabled.call(path, body, guest.cookie); assert.equal(res.status, 503); assert.deepEqual(await res.json(), { error: 'googleUnavailable' });
  }
  const f = await apiFixture(t), a = await f.guest(), pending = await challenge(f, a.cookie);
  const credential = token({ nonce: pending.nonce });
  assert.equal((await f.call('/auth/google', { credential }, a.cookie, 'https://evil.example')).status, 403);
  assert.equal((await f.call('/auth/google/challenge', {}, a.cookie, 'https://evil.example')).status, 403);
  assert.equal((await f.call('/auth/google', { credential })).status, 401);
  for (const extra of [{ subject: 'attacker' }, { playerId: 'other' }, { now: 9 }, { coins: 999999 }, { keepAccount: 'true' }, { approved: true }]) {
    const result = await f.call('/auth/google', { credential, ...extra }, a.cookie); assert.equal(result.status, 400);
  }
  for (const invalid of [token({ aud: 'wrong-app', nonce: pending.nonce }), token({ sub: 'sensitive-account', nonce: NONCE }), 'private-credential']) {
    const result = await f.call('/auth/google', { credential: invalid }, a.cookie); assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), { error: 'googleVerificationFailed' }); assert.equal(result.headers.get('set-cookie'), null);
  }
  assert.deepEqual(f.store.googleChallenge(a.cookie.split('=')[1]), { nonce: pending.nonce, expiresAt: pending.expiresAt });
  assert.equal((await f.call('/auth/google', { credential }, a.cookie)).status, 200);
});

test('logout, expiry or a replaced challenge during real verification cannot revive stale HTTP authority', async t => {
  for (const action of ['logout', 'expire', 'replace'] as const) {
    const f = await apiFixture(t), a = await f.guest(), pending = await challenge(f, a.cookie);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => enter = resolve), gate = new Promise<void>(resolve => release = resolve);
    const original = f.client.getFederatedSignonCertsAsync.bind(f.client);
    t.mock.method(f.client, 'getFederatedSignonCertsAsync', async () => { const certificates = await original(); enter(); await gate; return certificates; });
    const response = f.call('/auth/google', { credential: token({ nonce: pending.nonce }) }, a.cookie);
    await entered;
    if (action === 'logout') assert.equal((await f.call('/auth/logout', {}, a.cookie)).status, 200);
    if (action === 'expire') f.now += 86400000;
    if (action === 'replace') await challenge(f, a.cookie);
    release(); const refused = await response; assert.equal(refused.status, 401, action);
    assert.equal(refused.headers.get('set-cookie'), null);
    // Explicit logout also clears a stale cookie, allowing reauthentication after a lost login response.
    const cleared = await f.call('/auth/logout', {}, a.cookie); assert.equal(cleared.status, 200);
    assert.match(cleared.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
    const resumed = await f.guest(); assert.ok(resumed.playerId); assert.ok(f.store.read(a.playerId));
  }
});
