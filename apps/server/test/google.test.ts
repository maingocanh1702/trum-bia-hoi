import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { OAuth2Client } from 'google-auth-library';
import { googleVerifier } from '../src/google';

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
