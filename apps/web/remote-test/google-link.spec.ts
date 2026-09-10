import { test, expect, type Page } from '@playwright/test';
import type { RemoteGame, PlayerSession } from '../src/remote';
import type { Result } from '@tbh/engine';
declare global { interface Window { linkTransport: RemoteGame; linkResult?: PlayerSession | { error: string }; commandResult?: Result } }
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tbh.remote.v1')!));
const snapshot = async (page: Page) => (await page.request.get('/api/player/state')).json();
async function openTransport(page: Page) {
  // Keep the entry form unaccepted: this test owns the sole production RemoteGame instance.
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/remote.ts', { RemoteGame } = await import(path);
    window.linkTransport = await RemoteGame.open(); window.linkTransport.start();
  });
  await expect.poll(() => page.evaluate(() => window.linkTransport.state)).toBe('online');
}
async function credential(page: Page, subject: string) {
  const challenge = await page.evaluate(() => window.linkTransport.googleChallenge());
  expect(challenge.clientId).toBe('browser-player.apps.googleusercontent.com');
  return (await (await page.request.get(`/api/__test/sign?subject=${subject}&nonce=${challenge.nonce}`)).json()).credential as string;
}
const link = (page: Page, token: string) => page.evaluate(async token => {
  try { return await window.linkTransport.linkGoogle(token); }
  catch (error) { return { error: (error as Error).message }; }
}, token);
async function beginLink(page: Page, token: string) {
  await page.evaluate(token => {
    delete window.linkResult;
    void window.linkTransport.linkGoogle(token).then(result => { window.linkResult = result; }, error => { window.linkResult = { error: error.message }; });
  }, token);
}

test('link waits for a live-shift upgrade acknowledgement and retains the exact player, stream and served order', async ({ page }) => {
  await openTransport(page);
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: true });
  await page.evaluate(() => window.linkTransport.setPresence(true, false));
  await expect.poll(() => page.evaluate(() => window.linkTransport.world.tables.some(t => t.order?.items.every(i => i.state === 'ready'))), { timeout: 20000 }).toBe(true);
  const served = await page.evaluate(() => {
    const t = window.linkTransport.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
    return window.linkTransport.command({ type: 'serve', tableId: t.id, orderId: t.order!.id });
  });
  expect(served.ok).toBe(true);
  await page.evaluate(() => window.linkTransport.setPresence(true, true));
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  const token = await credential(page, 'link-midshift'), before = await journal(page), beforeWorld = (await snapshot(page)).world;
  let release!: () => void, held = false, authRequests = 0;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/player/command', async route => {
    const response = await route.fetch(); held = true; await barrier; await route.fulfill({ response });
  });
  page.on('request', req => { if (req.url().endsWith('/auth/google')) authRequests++; });
  await page.evaluate(() => { void window.linkTransport.command({ type: 'upgrade', kind: 'keg' }).then(r => { window.commandResult = r; }); });
  await expect.poll(() => held).toBe(true);
  await beginLink(page, token);
  expect(authRequests).toBe(0); expect((await journal(page)).pending).toHaveLength(1);
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'buyTable' }))).toEqual({ ok: false, reason: 'accountBusy' });
  expect(await link(page, token)).toEqual({ error: 'accountBusy' });
  const upgraded = (await snapshot(page)).world; release();
  await expect.poll(() => page.evaluate(() => window.linkResult)).toMatchObject({ playerId: before.playerId, provider: 'google' });
  expect(await page.evaluate(() => window.commandResult)).toEqual({ ok: true, amount: beforeWorld.coins - upgraded.coins }); expect(authRequests).toBe(1);
  await expect.poll(() => page.evaluate(() => window.linkTransport.state)).toBe('online');
  const after = await journal(page), world = (await snapshot(page)).world;
  expect(after).toMatchObject({ playerId: before.playerId, clientId: before.clientId, nextSeq: before.nextSeq + 1, pending: [] });
  expect(after.cursor).toBeGreaterThanOrEqual(before.cursor);
  expect(world.shift.id).toBe(beforeWorld.shift.id); expect(world.shift.stats.served).toBe(beforeWorld.shift.stats.served);
  expect(world.equipment.keg).toBe(upgraded.equipment.keg); expect(world.coins).toBe(upgraded.coins); expect(world.paused).toBe(true);
  expect(JSON.stringify(after)).not.toContain(token);
  await page.reload(); await openTransport(page);
  expect(await page.evaluate(() => window.linkTransport.identity)).toMatchObject({ playerId: before.playerId, provider: 'google' });
  expect((await journal(page)).clientId).toBe(before.clientId); expect((await snapshot(page)).world.coins).toBe(upgraded.coins);
});

test('lost authentication body after Set-Cookie reconciles once without replaying the Google credential', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-lost-body'), before = await journal(page);
  let calls = 0;
  await page.route('**/api/auth/google', async route => {
    calls++; const response = await route.fetch(); expect(response.status()).toBe(200);
    await route.fulfill({ response, body: '{', contentType: 'application/json' });
  });
  expect(await link(page, token)).toMatchObject({ playerId: before.playerId, provider: 'google' });
  expect(calls).toBe(1); expect((await journal(page)).clientId).toBe(before.clientId);
  expect(await link(page, token)).toEqual({ error: 'accountBusy' });
  expect((await (await page.request.post('/api/auth/session', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } })).json()).provider).toBe('google');
});

test('pre-mutation network failure stays guest and an explicit retry can link the same history', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-before-network'), before = await journal(page);
  await page.route('**/api/auth/google', route => route.abort());
  expect(await link(page, token)).toHaveProperty('error');
  expect(await page.evaluate(() => window.linkTransport.identity.provider)).toBe('guest');
  expect(await page.evaluate(() => window.linkTransport.accountBusy)).toBe(false);
  expect((await journal(page)).playerId).toBe(before.playerId);
  await page.unroute('**/api/auth/google');
  await expect.poll(() => page.evaluate(() => window.linkTransport.state)).toBe('online');
  expect(await link(page, token)).toMatchObject({ playerId: before.playerId, provider: 'google' });
});

test('an existing Google save is never selected or merged by the guest-link transport', async ({ page, browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179' }), other = await context.newPage();
  try {
    await openTransport(other); await other.evaluate(() => window.linkTransport.command({ type: 'startShift' }));
    const existing = await link(other, await credential(other, 'link-existing-account')), existingWorld = (await snapshot(other)).world;
    await openTransport(page); await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }));
    const before = await journal(page), beforeWorld = (await snapshot(page)).world;
    expect(await link(page, await credential(page, 'link-existing-account'))).toEqual({ error: 'accountConflict' });
    expect(await page.evaluate(() => window.linkTransport.identity)).toMatchObject({ playerId: before.playerId, provider: 'guest' });
    expect((await journal(page)).clientId).toBe(before.clientId);
    expect((await snapshot(page)).world.coins).toBe(beforeWorld.coins);
    expect((await snapshot(other)).world.shift.id).toBe(existingWorld.shift.id);
    expect((await snapshot(other)).world.coins).toBe(existingWorld.coins);
    expect(existing).toHaveProperty('provider', 'google');
    expect(await page.evaluate(() => window.linkTransport.command({ type: 'upgrade', kind: 'keg' }))).toMatchObject({ ok: true });
  } finally { await context.close(); }
});

test('invalid and replaced-nonce tokens are rejected without invalidating gameplay', async ({ page }) => {
  await openTransport(page);
  expect(await link(page, 'invalid-token')).toEqual({ error: 'invalidGoogleChallenge' });
  const old = await credential(page, 'link-nonce'); await credential(page, 'link-nonce');
  expect(await link(page, old)).toEqual({ error: 'googleVerificationFailed' });
  expect(await page.evaluate(() => window.linkTransport.identity.provider)).toBe('guest');
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: true });
  expect(await link(page, await credential(page, 'link-nonce'))).toHaveProperty('provider', 'google');
});

test('a failed queued command keeps its outbox and rejects linking before cookie rotation', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-pending-network'); let authCalls = 0;
  page.on('request', r => { if (r.url().endsWith('/auth/google')) authCalls++; });
  let release!: () => void, held = false; const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/player/command', async route => { held = true; await barrier; await route.abort(); });
  await page.evaluate(() => { void window.linkTransport.command({ type: 'startShift' }); });
  await expect.poll(() => held).toBe(true); await beginLink(page, token); release();
  await expect.poll(() => page.evaluate(() => window.linkResult)).toHaveProperty('error');
  expect(authCalls).toBe(0); expect((await journal(page)).pending).toHaveLength(1);
  expect(await page.evaluate(() => window.linkTransport.identity.provider)).toBe('guest');
  await page.unroute('**/api/player/command');
  await expect.poll(() => page.evaluate(() => window.linkTransport.pending)).toBe(0);
  expect((await snapshot(page)).world.phase).toBe('open');
});

test('closing during verification settles the link promise and makes no reconciliation request', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-close'), before = await journal(page);
  let held = false, release!: () => void, sessions = 0; const barrier = new Promise<void>(resolve => { release = resolve; });
  page.on('request', r => { if (r.url().endsWith('/auth/session')) sessions++; });
  await page.route('**/api/auth/google', async route => { held = true; await barrier; await route.abort(); });
  await beginLink(page, token); await expect.poll(() => held).toBe(true);
  await page.evaluate(() => window.linkTransport.close()); release();
  await expect.poll(() => page.evaluate(() => window.linkResult)).toEqual({ error: 'stopped' });
  expect(sessions).toBe(0); expect(await page.evaluate(() => window.linkTransport.accountBusy)).toBe(false);
  expect((await journal(page)).playerId).toBe(before.playerId);
  expect(await link(page, token)).toEqual({ error: 'accountBusy' });
});

test('unavailable Google and a revoked session do not discard the guest journal', async ({ page }) => {
  await openTransport(page); const before = await journal(page);
  await page.route('**/api/auth/google/challenge', route => route.fulfill({ status: 503, json: { error: 'googleUnavailable' } }));
  expect(await page.evaluate(() => window.linkTransport.googleChallenge().catch(e => ({ error: e.message })))).toEqual({ error: 'googleUnavailable' });
  await page.unroute('**/api/auth/google/challenge'); const token = await credential(page, 'link-revoked');
  expect((await page.request.post('/api/auth/logout', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } })).status()).toBe(200);
  expect(await link(page, token)).toEqual({ error: 'invalidSession' });
  expect(await page.evaluate(() => window.linkTransport.state)).toBe('invalidSession');
  expect((await journal(page)).playerId).toBe(before.playerId);
});

test('a different canonical cookie after authentication cannot attach the old stream to another player', async ({ page, browser, context }) => {
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4179' });
  try {
    const created = await other.request.post('/api/auth/session', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } });
    expect(created.status()).toBe(201); const otherId = (await created.json()).playerId, cookies = await other.cookies();
    await openTransport(page); const before = await journal(page), token = await credential(page, 'link-external-cookie');
    await page.route('**/api/auth/google', async route => {
      const signed = await route.fetch(); expect(signed.status()).toBe(200);
      await context.addCookies(cookies);
      await route.fulfill({ status: 200, json: await signed.json() });
    });
    expect(await link(page, token)).toEqual({ error: 'conflict' });
    expect(await page.evaluate(() => window.linkTransport.state)).toBe('conflict');
    expect((await journal(page)).playerId).toBe(before.playerId);
    expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: false, reason: 'conflict' });
    const untouched = (await snapshot(page)).world;
    expect(untouched.playerId).toBe(otherId); expect(untouched.shift).toBeNull();
  } finally { await other.close(); }
});
