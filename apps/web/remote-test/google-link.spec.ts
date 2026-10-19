import { test, expect, type Page } from '@playwright/test';
import type { RemoteGame, PlayerSession } from '../src/remote';
import type { Result, WorldView } from '@tbh/engine';
declare global { interface Window { linkTransport: RemoteGame; linkResult?: PlayerSession | { error: string }; commandResult?: Result } }
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tbh.remote.v1')!));
const snapshot = async (page: Page) => (await page.request.get('/api/player/state')).json();
const withoutGame = new WeakSet<Page>();
async function openTransport(page: Page) {
  // The game must not boot (it would take the writer lock the moment the page loads, now that no language screen holds it back):
  // this test owns the sole production RemoteGame instance.
  if (!withoutGame.has(page)) { withoutGame.add(page); await page.route('**/src/App.tsx*', route => route.abort()); }
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/remote.ts', { RemoteGame } = await import(path);
    window.linkTransport = await RemoteGame.open(); window.linkTransport.start();
  });
  await expect.poll(() => page.evaluate(() => window.linkTransport.state)).toBe('online');
}
async function credential(page: Page, subject: string) {
  const challenge = await page.evaluate(() => window.linkTransport.googleChallenge());
  if (!challenge) throw Error('A guest link must request a Google challenge');
  expect(challenge.clientId).toBe('browser-player.apps.googleusercontent.com');
  return (await (await page.request.get(`/api/__test/sign?subject=${subject}&nonce=${challenge.nonce}`)).json()).credential as string;
}
const link = (page: Page, token: string, keepAccount = false) => page.evaluate(async ({ token, keepAccount }) => {
  try { return await window.linkTransport.linkGoogle(token, keepAccount); }
  catch (error) { return { error: (error as Error).message }; }
}, { token, keepAccount });
async function beginLink(page: Page, token: string, keepAccount = false) {
  await page.evaluate(({ token, keepAccount }) => {
    delete window.linkResult;
    void window.linkTransport.linkGoogle(token, keepAccount).then(result => { window.linkResult = result; }, error => { window.linkResult = { error: error.message }; });
  }, { token, keepAccount });
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
  expect(await link(page, await credential(page, 'link-before-network'))).toMatchObject({ playerId: before.playerId, provider: 'google' });
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

test('lost canonical-session reads retry identity after reconnect without replaying the credential', async ({ page }) => {
  await openTransport(page); const before = await journal(page), token = await credential(page, 'link-session-retry');
  let cut = true, authCalls = 0;
  page.on('request', r => { if (r.url().endsWith('/auth/google')) authCalls++; });
  await page.route('**/api/auth/session', route => cut ? route.abort() : route.continue());
  expect(await link(page, token)).toHaveProperty('error');
  expect(await page.evaluate(() => window.linkTransport.state)).toBe('reconnecting');
  expect(await page.evaluate(() => window.linkTransport.accountBusy)).toBe(true);
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: false, reason: 'accountBusy' });
  cut = false;
  await expect.poll(() => page.evaluate(() => ({ provider: window.linkTransport.identity.provider, state: window.linkTransport.state, busy: window.linkTransport.accountBusy }))).toEqual({ provider: 'google', state: 'online', busy: false });
  expect(authCalls).toBe(1); expect((await journal(page)).playerId).toBe(before.playerId);
  expect((await journal(page)).clientId).toBe(before.clientId);
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: true });
});

test('opening the account menu during event catch-up is paused on the server before verification begins', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-menu-pause');
  let held = false, release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/player/events?*', async route => {
    const response = await route.fetch(); held = true; await barrier; await route.fulfill({ response });
  });
  await page.evaluate(() => window.linkTransport.setPresence(true, false));
  await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }));
  await expect.poll(() => held).toBe(true);
  expect((await snapshot(page)).world.phase).toBe('open');
  expect(Boolean((await snapshot(page)).world.paused)).toBe(false);
  let pausedAtVerification: boolean | undefined;
  await page.route('**/api/auth/google', async route => {
    pausedAtVerification = (await snapshot(page)).world.paused;
    await route.continue();
  });
  await page.evaluate(() => window.linkTransport.setPresence(true, true));
  await beginLink(page, token); release();
  await expect.poll(() => page.evaluate(() => window.linkResult)).toHaveProperty('provider', 'google');
  expect(pausedAtVerification).toBe(true);
});

test('an ambiguous guest result is fenced before resume so the old credential cannot arrive late', async ({ page }) => {
  await openTransport(page); const token = await credential(page, 'link-late-verifier'), paths: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/auth/')) paths.push(new URL(r.url()).pathname); });
  await page.route('**/api/auth/google', route => route.fulfill({ status: 503, json: { error: 'network' } }));
  expect(await link(page, token)).toEqual({ error: 'network' });
  expect(paths.slice(0, 3)).toEqual(['/api/auth/google', '/api/auth/google/challenge', '/api/auth/session']);
  expect(await page.evaluate(() => window.linkTransport.identity.provider)).toBe('guest');
  const late = await page.request.post('/api/auth/google', { data: { credential: token }, headers: { Origin: 'http://127.0.0.1:4179' } });
  expect(late.status()).toBe(401); expect(await late.json()).toEqual({ error: 'googleVerificationFailed' });
  expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: true });
});

async function existingAccount(browser: import('@playwright/test').Browser, subject: string) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179' }), page = await context.newPage();
  await openTransport(page); await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }));
  const owner = await link(page, await credential(page, subject));
  return { context, page, owner, world: (await snapshot(page)).world as WorldView };
}

test('explicit Google choice drains the source outbox then uses an audited fresh target stream', async ({ page, browser }) => {
  const target = await existingAccount(browser, 'choice-drain');
  try {
    await openTransport(page); await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }));
    const source = await journal(page), token = await credential(page, 'choice-drain');
    let held = false, release!: () => void, atAuth: any;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/player/command', async route => { held = true; await barrier; await route.continue(); });
    await page.route('**/api/auth/google', async route => { atAuth = await journal(page); await route.continue(); });
    await page.evaluate(() => { void window.linkTransport.command({ type: 'upgrade', kind: 'keg' }); });
    await expect.poll(() => held).toBe(true); await beginLink(page, token, true);
    expect(await page.evaluate(() => window.linkTransport.command({ type: 'restock', dish: 'bia', mode: 'one' }))).toEqual({ ok: false, reason: 'accountBusy' });
    release(); await expect.poll(() => page.evaluate(() => window.linkResult)).toMatchObject({ playerId: target.world.playerId, provider: 'google', transition: { previousPlayerId: source.playerId } });
    expect(atAuth).toMatchObject({ playerId: source.playerId, accountSwitch: true, pending: [] });
    const next = await journal(page); expect(next.playerId).toBe(target.world.playerId); expect(next.clientId).not.toBe(source.clientId); expect(next.accountSwitch).toBeUndefined();
    expect((await snapshot(page)).world.equipment.keg).toBe(target.world.equipment.keg);
    expect((await snapshot(page)).world.shift.id).toBe(target.world.shift!.id);
    const upgraded = await page.evaluate(() => window.linkTransport.command({ type: 'upgrade', kind: 'keg' }));
    expect(upgraded).toMatchObject({ ok: true }); expect(upgraded.amount).toBeGreaterThan(0);
    const after = (await snapshot(target.page)).world;
    expect(after.equipment.keg).toBe(target.world.equipment.keg + 1); expect(after.coins).toBe(target.world.coins - upgraded.amount!);
  } finally { await target.context.close(); }
});

test('lost switch response with rotated cookie reconciles once without replaying Google or source commands', async ({ page, browser }) => {
  const target = await existingAccount(browser, 'choice-lost');
  try {
    await openTransport(page); const source = await journal(page), token = await credential(page, 'choice-lost'); let posts = 0;
    await page.route('**/api/auth/google', async route => { posts++; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort(); });
    expect(await link(page, token, true)).toMatchObject({ playerId: target.world.playerId, transition: { previousPlayerId: source.playerId } });
    expect(posts).toBe(1); expect((await journal(page)).pending).toEqual([]);
    expect(await page.evaluate(() => window.linkTransport.accountBusy)).toBe(false);
  } finally { await target.context.close(); }
});

test('a reload finishes a persisted audited switch after the canonical read failed', async ({ page, browser }) => {
  const target = await existingAccount(browser, 'choice-reload');
  try {
    await openTransport(page); const source = await journal(page), token = await credential(page, 'choice-reload'); let posts = 0;
    page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
    await page.route('**/api/auth/session', route => route.abort());
    expect(await link(page, token, true)).toHaveProperty('error');
    expect(await journal(page)).toMatchObject({ playerId: source.playerId, accountSwitch: true, pending: [] });
    await page.evaluate(() => window.linkTransport.close()); await page.unroute('**/api/auth/session'); await openTransport(page);
    expect((await journal(page)).playerId).toBe(target.world.playerId); expect((await journal(page)).accountSwitch).toBeUndefined();
    expect(await page.evaluate(() => window.linkTransport.world.playerId)).toBe(target.world.playerId); expect(posts).toBe(1);
  } finally { await target.context.close(); }
});

test('an unrelated Google cookie cannot consume a persisted choice without its source audit receipt', async ({ page, browser, context }) => {
  const target = await existingAccount(browser, 'choice-unrelated');
  try {
    await openTransport(page); const source = await journal(page), token = await credential(page, 'choice-unrelated'), cookies = await target.context.cookies();
    await page.route('**/api/auth/google', async route => { await context.addCookies(cookies); await route.fulfill({ status: 503, json: { error: 'network' } }); });
    expect(await link(page, token, true)).toEqual({ error: 'conflict' });
    expect(await journal(page)).toMatchObject({ playerId: source.playerId, accountSwitch: true });
    expect(await page.evaluate(() => window.linkTransport.command({ type: 'upgrade', kind: 'keg' }))).toEqual({ ok: false, reason: 'conflict' });
    await page.evaluate(() => window.linkTransport.close());
    await expect(page.evaluate(async () => { const path = '/src/remote.ts'; const { RemoteGame } = await import(path); await RemoteGame.open(); })).rejects.toThrow('conflict');
    expect((await snapshot(target.page)).world.equipment).toEqual(target.world.equipment);
  } finally { await target.context.close(); }
});

test('switch intent storage refusal occurs before authentication and preserves the source journal', async ({ page }) => {
  await openTransport(page); const source = await journal(page), token = await credential(page, 'choice-storage'); let posts = 0;
  page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
  await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'tbh.remote.v1' && JSON.parse(value).accountSwitch) throw Error('quota'); set.call(this, key, value); }; });
  expect(await link(page, token, true)).toEqual({ error: 'storage' }); expect(posts).toBe(0);
  expect((await journal(page)).playerId).toBe(source.playerId); expect((await journal(page)).accountSwitch).toBeUndefined();
  expect(await page.evaluate(() => window.linkTransport.state)).toBe('storage');
});

test('pre-commit choice loss cancels the old nonce and resumes the original guest', async ({ page }) => {
  await openTransport(page); const source = await journal(page), token = await credential(page, 'choice-before');
  await page.route('**/api/auth/google', route => route.abort()); expect(await link(page, token, true)).toHaveProperty('error');
  expect((await journal(page)).playerId).toBe(source.playerId); expect((await journal(page)).accountSwitch).toBeUndefined();
  await page.unroute('**/api/auth/google');
  const late = await page.request.post('/api/auth/google', { data: { credential: token, keepAccount: true }, headers: { Origin: 'http://127.0.0.1:4179' } });
  expect(late.status()).toBe(401); expect(await page.evaluate(() => window.linkTransport.command({ type: 'startShift' }))).toEqual({ ok: true });
});

test('a corrupted switch intent with pending old commands fails before any server request', async ({ page }) => {
  await openTransport(page); await page.evaluate(() => { window.linkTransport.close(); const j = JSON.parse(localStorage.getItem('tbh.remote.v1')!); j.accountSwitch = true; j.nextSeq++; j.pending.push({ clientId: j.clientId, clientSeq: j.nextSeq - 1, idempotencyKey: 'pending', command: { type: 'startShift' } }); localStorage.setItem('tbh.remote.v1', JSON.stringify(j)); });
  let requests = 0; page.on('request', r => { if (r.url().includes('/api/')) requests++; });
  await expect(page.evaluate(async () => { const path = '/src/remote.ts'; const { RemoteGame } = await import(path); await RemoteGame.open(); })).rejects.toThrow('storage');
  expect(requests).toBe(0); expect((await journal(page)).pending).toHaveLength(1);
});
