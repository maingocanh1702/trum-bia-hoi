import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, test, expect, type Page } from '@playwright/test';
const session = async (page: Page) => (await (await page.request.post('/api/auth/session', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } })).json());
const snapshot = async (page: Page) => (await (await page.request.get('/api/player/state')).json());
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tbh.remote.v1')!));
async function gis(page: Page, subject: string) {
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `
window.__googleCallbacks=[];window.__googleOptions=[];
window.google={accounts:{id:{initialize(o){this.options=o;window.__googleCallbacks.push(o.callback);window.__googleOptions.push({client_id:o.client_id,nonce:o.nonce,auto_select:o.auto_select})},
renderButton(el,style){const o=this.options,b=document.createElement('button');b.textContent=style.locale==='vi'?'Tiếp tục với Google':'Continue with Google';b.onclick=async()=>{const r=await fetch('/api/__test/sign?subject=${subject}&nonce='+o.nonce);o.callback(await r.json())};el.append(b)},disableAutoSelect(){},cancel(){}}}};` }));
}
async function enter(page: Page, locale = 'vi') {
  await page.goto('/');
  await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).check();
  await page.getByRole('button', { name: locale === 'vi' ? 'Vào quán' : 'Enter the stall', exact: true }).click();
  await page.getByRole('button', { name: locale === 'vi' ? 'Chơi không đăng nhập' : 'Play without signing in', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
}
async function account(page: Page, locale = 'vi') {
  await page.getByRole('button', { name: locale === 'vi' ? 'Cài đặt' : 'Settings', exact: true }).click();
  await page.getByRole('button', { name: locale === 'vi' ? /Tài khoản/ : /Account/ }).click();
  return page.getByRole('dialog', { name: locale === 'vi' ? 'Tài khoản' : 'Account', exact: true });
}
for (const [locale, width, height] of [['vi', 360, 740], ['en', 390, 844], ['vi', 1280, 720]] as const) test(`Google panel links the same live shift without reload at ${locale} ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height }); await gis(page, `ui-link-${locale}-${width}`); await enter(page, locale);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: locale === 'vi' ? 'Mở ca' : 'Open shift', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const dialog = await account(page, locale);
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  await expect(dialog.locator('.account-benefits li')).toHaveText(locale === 'vi' ? ['Lưu vào tài khoản', 'Thành tích', 'Đua top'] : ['Save to your account', 'Achievements', 'Compete on the leaderboard']);
  await expect(dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true })).toBeVisible();
  const before = (await snapshot(page)).world, stream = await journal(page); let navigations = 0;
  page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++; });
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  expect((await session(page)).provider).toBe('google'); expect(navigations).toBe(0);
  const after = (await snapshot(page)).world;
  expect(after.playerId).toBe(before.playerId); expect(after.shift.id).toBe(before.shift.id); expect(after.coins).toBe(before.coins); expect(after.staminaMs).toBe(before.staminaMs); expect(after.paused).toBe(true);
  expect((await journal(page)).clientId).toBe(stream.clientId); expect((await journal(page)).nextSeq).toBe(stream.nextSeq);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const button of await dialog.getByRole('button').all()) { const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); }
  await page.screenshot({ path: `.qa/account-linked-${locale}-${width}.png`, fullPage: true });
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục chơi' : 'Keep playing', exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect.poll(async () => Boolean((await snapshot(page)).world.paused)).toBe(false);
  await page.reload(); await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
  const reopened = await account(page, locale);
  await expect(reopened.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('unconfigured Google does not load its SDK and lets a guest close the panel and keep playing', async ({ page }) => {
  let scripts = 0; page.on('request', r => { if (r.url().includes('accounts.google.com')) scripts++; });
  await page.route('**/api/auth/google/challenge', route => route.fulfill({ status: 503, json: { error: 'googleUnavailable' } }));
  await enter(page); const before = await journal(page), dialog = await account(page);
  await expect(dialog.getByRole('alert')).toContainText('Đăng nhập Google chưa sẵn sàng'); expect(scripts).toBe(0);
  await page.screenshot({ path: '.qa/account-unavailable-390.png', fullPage: true });
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  expect((await journal(page)).playerId).toBe(before.playerId);
});

test('SDK loading failure retries with a fresh challenge and preserves guest progress', async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', route => route.abort());
  await enter(page); const before = await journal(page), dialog = await account(page);
  await expect(dialog.getByRole('alert')).toContainText('Chưa tải được nút Google');
  await page.unroute('https://accounts.google.com/gsi/client'); await gis(page, 'ui-sdk-retry');
  await dialog.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  expect((await journal(page)).playerId).toBe(before.playerId);
});

test('closing a panel rejects late and duplicate Google callbacks without posting credentials', async ({ page }) => {
  await gis(page, 'ui-closed-callback'); await enter(page); const dialog = await account(page);
  await expect(dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  let posts = 0; page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
  await dialog.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await page.evaluate(() => { const w = window as any; w.__googleCallbacks[0]({ credential: 'stale' }); w.__googleCallbacks[0]({ credential: 'stale' }); });
  expect(posts).toBe(0); expect((await session(page)).provider).toBe('guest');
  const reopened = await account(page); await expect(reopened.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).__googleCallbacks[0]({ credential: 'old-generation' })); expect(posts).toBe(0);
  await reopened.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(reopened.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible(); expect(posts).toBe(1);
});

test('closing while verification is pending keeps the shift paused until the link settles', async ({ page }) => {
  await gis(page, 'ui-busy-close'); await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const dialog = await account(page); let held = false, release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/auth/google', async route => { held = true; await barrier; await route.continue(); });
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click(); await expect.poll(() => held).toBe(true);
  await expect(dialog.getByRole('button', { name: 'Chơi không đăng nhập', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Tài khoản ×', exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect(page.locator('.network-status')).toContainText('Đang xác nhận tài khoản');
  const paused = (await snapshot(page)).world; expect(paused.paused).toBe(true);
  await page.waitForTimeout(1200); expect((await snapshot(page)).world.staminaMs).toBe(paused.staminaMs);
  release(); await expect.poll(async () => (await session(page)).provider).toBe('google');
  await expect.poll(async () => Boolean((await snapshot(page)).world.paused)).toBe(false);
  expect((await snapshot(page)).world.shift.id).toBe(paused.shift.id);
});

test('a cancelled verification error retries without storing the credential or claiming success early', async ({ page }) => {
  await gis(page, 'ui-retry-verification'); await enter(page); const dialog = await account(page), before = await journal(page);
  let posts = 0; page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
  let first = true;
  await page.route('**/api/auth/google', route => { if (first) { first = false; return route.fulfill({ status: 401, json: { error: 'invalidGoogleChallenge' } }); } return route.continue(); });
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('không còn hợp lệ'); expect((await session(page)).provider).toBe('guest');
  await page.evaluate(() => (window as any).__googleCallbacks[0]({ credential: 'late-duplicate' }));
  await dialog.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  expect(posts).toBe(2);
  const options = await page.evaluate(() => (window as any).__googleOptions); expect(options).toHaveLength(2); expect(options[0].nonce).not.toBe(options[1].nonce); expect(options.every((o: any) => o.auto_select === false)).toBe(true);
  expect((await journal(page)).playerId).toBe(before.playerId);
  expect(await page.evaluate(() => Object.values(localStorage).some(value => String(value).includes('eyJ')))).toBe(false);
});

test('closing during challenge loading does not initialize a late Google widget', async ({ page }) => {
  let held = false, release!: () => void, scripts = 0;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  page.on('request', r => { if (r.url().includes('accounts.google.com')) scripts++; });
  await page.route('**/api/auth/google/challenge', async route => { const response = await route.fetch(); held = true; await barrier; await route.fulfill({ response }); });
  await enter(page); const dialog = await account(page); await expect.poll(() => held).toBe(true);
  await dialog.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click(); await expect(dialog).not.toBeVisible();
  const response = page.waitForResponse('**/api/auth/google/challenge'); release(); await (await response).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(scripts).toBe(0); expect((await session(page)).provider).toBe('guest');
});

test('a lost identity read keeps the panel confirming until the canonical Google session recovers', async ({ page }) => {
  await gis(page, 'ui-identity-retry'); await enter(page); const dialog = await account(page); let cut = true;
  await page.route('**/api/auth/session', route => cut ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'Đang xác nhận tài khoản' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).not.toBeVisible();
  cut = false;
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  await expect(dialog.getByRole('alert')).not.toBeVisible(); expect((await session(page)).provider).toBe('google');
});

for (const locale of ['vi', 'en']) test(`Google sign-in restores the account directly without browser navigation in ${locale}`, async ({ page, browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179' }), other = await context.newPage(), subject = `ui-choice-${locale}`;
  try {
    await gis(other, subject); await enter(other); const targetPanel = await account(other);
    await targetPanel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
    await expect(targetPanel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
    const target = (await snapshot(other)).world;
    await gis(page, subject); await enter(page, locale);
    await page.getByRole('button', { name: locale === 'vi' ? 'Mở ca' : 'Open shift', exact: true }).first().click();
    const dialog = await account(page, locale), source = await journal(page); let navigations = 0;
    page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++; });
    await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
    await expect.poll(async () => (await journal(page)).playerId).toBe(target.playerId);
    await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
    expect(navigations).toBe(0); expect((await snapshot(page)).world.phase).toBe(target.phase);
    expect((await journal(page)).clientId).not.toBe(source.clientId);
    const linked = await account(page, locale);
    await expect(linked.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
    await page.reload(); await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
    expect((await journal(page)).playerId).toBe(target.playerId);
  } finally { await context.close(); }
});

for (const locale of ['vi', 'en']) test(`two play modes offer direct Google sign-in before opening a shift in ${locale}`, async ({ page }) => {
  await gis(page, `entry-account-${locale}`); await page.goto('/');
  await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).check();
  await page.getByRole('button', { name: locale === 'vi' ? 'Vào quán' : 'Enter the stall', exact: true }).click();
  const entry = page.getByRole('region', { name: locale === 'vi' ? 'Chọn cách chơi' : 'Choose how to play', exact: true });
  await expect(entry.getByRole('button')).toHaveCount(2);
  await expect(entry).toContainText(locale === 'vi' ? 'Lịch sử chơi, thành tích, xếp hạng' : 'Play history, achievements, ranking');
  expect(await entry.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `.qa/account-modes-${locale}.png`, fullPage: true });
  await entry.getByRole('button', { name: locale === 'vi' ? 'Đăng ký / Đăng nhập bằng Google' : 'Sign up / Sign in with Google', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  expect((await snapshot(page)).world.phase).toBe('resting');
});

async function openAndUpgrade(page: Page) {
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Vòi rót', exact: true }).click();
  await page.getByRole('dialog', { name: 'Vòi rót', exact: true }).getByRole('button', { name: /Nâng ·/ }).click();
  await expect.poll(async () => (await snapshot(page)).world.equipment.keg).toBe(2);
  await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  return (await snapshot(page)).world;
}
function expectProgress(actual: any, saved: any) {
  expect(actual.playerId).toBe(saved.playerId); expect(actual.coins).toBe(saved.coins);
  expect(actual.equipment).toEqual(saved.equipment); expect(actual.shift.id).toBe(saved.shift.id);
  expect(saved.daily.day).toBeTruthy(); expect(actual.daily.day).toBe(saved.daily.day);
  expect(actual.dayShifts).toEqual(saved.dayShifts); expect(actual.dayEarned).toEqual(saved.dayEarned); expect(actual.completedShifts).toBe(saved.completedShifts);
  expect(actual.phase).toBe(saved.phase);
}
test('guest stall, coins, upgrades and current shift survive reload and a new tab on this device', async ({ page, context }) => {
  await enter(page); const before = await openAndUpgrade(page), stream = await journal(page);
  const cookie = (await context.cookies()).find(c => c.name === 'tbh-session'); expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expectProgress((await snapshot(page)).world, before);
  await page.close(); const next = await context.newPage(); let resets = 0;
  next.on('request', r => { if (r.url().endsWith('/auth/guest/restart')) resets++; });
  await next.goto('/'); await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  expectProgress((await snapshot(next)).world, before); expect(resets).toBe(0);
  expect((await journal(next)).clientId).toBe(stream.clientId); expect((await journal(next)).nextSeq).toBe(stream.nextSeq);
  expect((await context.cookies()).find(c => c.name === cookie!.name)?.value).toBe(cookie!.value);
  await next.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(next.getByRole('dialog')).toContainText('Tiến độ quán được giữ trên thiết bị này');
  await expect(next.getByRole('dialog')).toContainText('Lịch sử chơi, thành tích, xếp hạng');
});

test('guest device progress survives closing and relaunching Chromium with the same browser profile', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'tbh-guest-device-'));
  let device = await chromium.launchPersistentContext(profile, { headless: true, baseURL: 'http://127.0.0.1:4179' });
  try {
    const page = await device.newPage(); await enter(page); const before = await openAndUpgrade(page), stream = await journal(page);
    await device.close(); device = await chromium.launchPersistentContext(profile, { headless: true, baseURL: 'http://127.0.0.1:4179' });
    const next = await device.newPage(); await next.goto('/');
    await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
    await expect(next.locator('.network-status')).toContainText('Đã đồng bộ'); expectProgress((await snapshot(next)).world, before);
    expect((await journal(next)).clientId).toBe(stream.clientId); expect((await session(next)).provider).toBe('guest');
  } finally { await device.close(); await rm(profile, { recursive: true, force: true }); }
});

test('a Google account restores its progress when opening a new tab visit', async ({ page, context }) => {
  await gis(page, 'account-returning-visit'); await enter(page); const dialog = await account(page);
  await dialog.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const before = (await snapshot(page)).world;
  await page.close(); const next = await context.newPage(); await next.goto('/');
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  const restored = (await snapshot(next)).world;
  expect(restored.playerId).toBe(before.playerId); expect(restored.shift.id).toBe(before.shift.id);
  expect(restored.coins).toBe(before.coins); expect((await session(next)).provider).toBe('google');
});

for (const path of ['/auth/session', '/player/connect']) test(`new-tab bootstrap retries ${path} response loss without replacing guest progress or receipts`, async ({ page, context }) => {
  await enter(page); const before = await openAndUpgrade(page), stream = await journal(page); await page.close();
  const next = await context.newPage();
  await next.route(`**/api${path}`, async route => { const response = await route.fetch(); await route.fulfill({ response, body: '{', contentType: 'application/json' }); });
  await next.addInitScript(() => { (window as any).__entryJournal = localStorage.getItem('tbh.remote.v1'); });
  await next.goto('/'); await expect(next.getByRole('alert')).toContainText('Chưa kết nối');
  expect(await journal(next)).toEqual(await next.evaluate(() => JSON.parse((window as any).__entryJournal)));
  expect(await journal(next)).toMatchObject({ playerId: stream.playerId, clientId: stream.clientId, nextSeq: stream.nextSeq, pending: stream.pending });
  await next.unroute(`**/api${path}`); await next.reload();
  await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  expectProgress((await snapshot(next)).world, before); expect((await journal(next)).clientId).toBe(stream.clientId);
});

for (const committed of [false, true]) test(`new-tab guest recovery applies a pending upgrade once (server committed=${committed})`, async ({ page, context }) => {
  await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Vòi rót', exact: true }).click();
  const before = (await snapshot(page)).world; let credited: any;
  await page.route('**/api/player/command', async route => {
    if (route.request().postDataJSON()?.command.type === 'upgrade') {
      if (committed && !credited) credited = await (await route.fetch()).json();
      await route.abort(); return;
    }
    await route.continue();
  });
  await page.getByRole('dialog').getByRole('button', { name: /Nâng ·/ }).click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(1);
  if (committed) await expect.poll(() => Boolean(credited)).toBe(true);
  const pending = await journal(page); await page.close();
  const next = await context.newPage(); await next.goto('/');
  await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  await expect.poll(async () => (await journal(next)).pending.length).toBe(0);
  const after = (await snapshot(next)).world;
  expect(after.playerId).toBe(before.playerId); expect(after.shift.id).toBe(before.shift.id); expect(after.equipment.keg).toBe(2);
  expect(after.coins).toBeLessThan(before.coins); if (committed) expect(after.coins).toBe(credited.world.coins);
  expect((await journal(next)).clientId).toBe(pending.clientId); expect((await journal(next)).nextSeq).toBe(pending.nextSeq);
  await next.reload(); await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(next)).world.coins).toBe(after.coins);
});

test('obsolete visit markers cannot replace the authenticated guest progress', async ({ page, context }) => {
  await enter(page); const before = await openAndUpgrade(page); await page.close(); const next = await context.newPage();
  await next.addInitScript(() => sessionStorage.setItem('tbh.guest.visit', 'unrelated-obsolete-player'));
  await next.goto('/'); await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ'); expectProgress((await snapshot(next)).world, before);
});

test('first visit creates one guest and never restarts the freshly created session', async ({ page }) => {
  let resets = 0, creates = 0;
  page.on('request', r => { if (r.url().endsWith('/auth/guest/restart')) resets++; });
  page.on('response', r => { if (r.url().endsWith('/auth/session') && r.status() === 201) creates++; });
  await enter(page); expect(resets).toBe(0); expect(creates).toBe(1);
});

for (const kind of ['revoked', 'missing', 'expired']) test(`a ${kind} guest credential cannot authorize the retained journal or discard it`, async ({ page, context }) => {
  await enter(page); const old = await journal(page), cookies = await context.cookies();
  if (kind === 'missing') await context.clearCookies();
  else if (kind === 'expired') await page.request.post('/api/__test/advance?ms=3600001');
  else { await page.request.post('/api/auth/logout', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } }); await context.addCookies(cookies); }
  await page.addInitScript(() => { (window as any).__entryJournal = localStorage.getItem('tbh.remote.v1'); });
  await page.reload(); await expect(page.getByRole('alert')).toContainText('Trạng thái tài khoản không khớp');
  expect(await journal(page)).toEqual(await page.evaluate(() => JSON.parse((window as any).__entryJournal)));
  expect(await journal(page)).toMatchObject({ playerId: old.playerId, clientId: old.clientId, nextSeq: old.nextSeq, pending: old.pending }); expect((await session(page)).playerId).not.toBe(old.playerId);
});

test('an opener tab waits for the writer lock then resumes the same guest and command stream', async ({ page }) => {
  await enter(page); const before = await openAndUpgrade(page), old = await journal(page);
  const opened = page.waitForEvent('popup'); await page.evaluate(() => { window.open('/'); });
  const clone = await opened; await expect(clone.getByRole('alert')).toContainText('tab khác');
  expect(await journal(clone)).toEqual(old);
  await page.close(); await clone.reload();
  // An actual opener can copy the already-chosen play mode, but never the writer lock.
  await expect(clone.locator('.network-status')).toContainText('Đã đồng bộ');
  expectProgress((await snapshot(clone)).world, before); expect((await journal(clone)).clientId).toBe(old.clientId);
});

async function signedPlayer(page: Page, subject: string, locale = 'vi') {
  await gis(page, subject); await enter(page, locale); const dialog = await account(page, locale);
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục chơi' : 'Keep playing', exact: true }).click();
  await expect(dialog).not.toBeVisible(); return journal(page);
}
for (const [kind, locale] of [['expired', 'vi'], ['missing', 'en'], ['revoked', 'vi']] as const) test(`Google reauthentication recovers the retained stream after ${kind} cookie at boot (${locale})`, async ({ page, context }) => {
  const before = await signedPlayer(page, `reauth-${kind}`, locale), cookies = await context.cookies();
  if (kind === 'expired') await page.request.post('/api/__test/advance?ms=3600001');
  else if (kind === 'missing') await context.clearCookies();
  else { await page.request.post('/api/auth/logout', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } }); await context.addCookies(cookies); }
  await page.reload(); await expect(page.getByRole('alert')).toBeVisible(); const retained = await journal(page);
  await page.getByRole('button', { name: locale === 'vi' ? 'Đăng nhập lại với Google' : 'Sign in again with Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel');
  await expect(panel).toBeVisible(); expect(await journal(page)).toEqual(retained);
  await panel.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
  await expect(panel.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  await page.screenshot({ path: `.qa/reauth-${kind}-${locale}.png`, fullPage: true });
  await panel.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục chơi' : 'Keep playing', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
  const after = await journal(page); expect(after.playerId).toBe(before.playerId); expect(after.clientId).toBe(before.clientId); expect(after.nextSeq).toBe(before.nextSeq);
  expect((await session(page)).provider).toBe('google');
});

test('Google reauthentication refuses a different signed account and keeps the outbox unchanged for retry', async ({ page, context }) => {
  await signedPlayer(page, 'reauth-correct'); await context.clearCookies(); await page.reload();
  await expect(page.getByRole('alert')).toBeVisible(); const before = await journal(page);
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel'); await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  await page.evaluate(async () => { const w = window as any, options = w.__googleOptions.at(-1), result = await (await fetch('/api/__test/sign?subject=reauth-wrong&nonce=' + options.nonce)).json(); w.__googleCallbacks.at(-1)(result); });
  await expect(panel.getByRole('alert')).toContainText('chưa khớp tiến độ đang chờ');
  expect(await journal(page)).toEqual(before); expect((await session(page)).provider).toBe('guest');
  await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ'); expect((await journal(page)).clientId).toBe(before.clientId);
});

for (const committed of [false, true]) test(`Google reauthentication after service transport loss credits once (server committed=${committed})`, async ({ page, context }) => {
  await signedPlayer(page, `reauth-service-${committed}`);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  const trigger = page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first();
  await expect(trigger).toBeVisible({ timeout: 20000 }); await trigger.click();
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeEnabled({ timeout: 20000 });
  const cookies = await context.cookies(), beforeCoins = (await snapshot(page)).world.coins; let lost = false, credited: any;
  await page.route('**/api/player/command', async route => {
    if (!lost && route.request().postDataJSON()?.command.type === 'serve') {
      if (committed) { const response = await route.fetch(); credited = await response.json(); } lost = true;
      await page.request.post('/api/auth/logout', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } }); await context.addCookies(cookies);
      await route.abort(); return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click(); await expect.poll(() => lost).toBe(true);
  await expect(page.locator('.network-status')).toContainText('Đăng nhập lại với Google');
  const pending = await journal(page); expect(pending.pending).toHaveLength(1);
  await page.locator('.network-status').getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel'); await expect(panel).toBeVisible(); expect(await journal(page)).toEqual(pending);
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await panel.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ'); await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  const after = await snapshot(page); expect(after.world.coins).toBeGreaterThan(beforeCoins);
  if (committed) expect(after.world.coins).toBe(credited.world.coins);
  expect(after.menu.rows.find((r: any) => r.dish === 'bia').sold).toBe(1);
  const retry = await page.request.post('/api/player/command', { data: pending.pending[0], headers: { Origin: 'http://127.0.0.1:4179' } });
  expect(retry.status()).toBe(200); expect((await snapshot(page)).world.coins).toBe(after.world.coins);
  expect((await journal(page)).clientId).toBe(pending.clientId); expect((await journal(page)).nextSeq).toBe(pending.nextSeq);
});

test('Google reauthentication with a lost authentication response resumes by canonical identity on reload', async ({ page, context }) => {
  const before = await signedPlayer(page, 'reauth-lost-response'); await context.clearCookies(); await page.reload();
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  let requests = 0;
  await page.route('**/api/auth/google', async route => { requests++; await route.fetch(); await route.abort(); });
  const panel = page.locator('.recovery .account-panel');
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible(); expect(requests).toBe(1);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await journal(page)).playerId).toBe(before.playerId); expect((await journal(page)).clientId).toBe(before.clientId); expect(requests).toBe(1);
});

test('Google reauthentication retries in place after losing the whole rotated-cookie response without clearing commands', async ({ page, context }) => {
  await signedPlayer(page, 'reauth-lost-headers'); await context.clearCookies(); await page.reload();
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel'); await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  const retained = await journal(page); let posts = 0;
  await page.route('**/api/auth/google', async route => {
    posts++;
    if (posts === 1) { const cookies = await context.cookies(); await route.fetch(); await context.addCookies(cookies); await route.abort(); }
    else await route.continue();
  });
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('alert')).toBeVisible(); expect(await journal(page)).toEqual(retained);
  await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible(); expect(posts).toBe(2);
  await panel.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ'); expect((await journal(page)).clientId).toBe(retained.clientId);
});

test('Google reauthentication cancellation releases its tab lock and rejects stale callbacks', async ({ page, context }) => {
  await signedPlayer(page, 'reauth-cancel'); await context.clearCookies(); await page.reload();
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel'); await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  const before = await journal(page); let posts = 0; page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
  const other = await context.newPage(); await other.goto('/'); await expect(other.getByRole('alert')).toContainText('tab khác'); await other.close();
  await panel.getByRole('button', { name: 'Hủy', exact: true }).click(); await expect(panel).not.toBeVisible();
  await page.evaluate(() => { const w = window as any; w.__googleCallbacks.at(-1)({ credential: 'stale' }); });
  expect(posts).toBe(0); expect(await journal(page)).toEqual(before);
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible(); expect(posts).toBe(1);
});

test('Google reauthentication retry recognizes a committed canonical session without a second Google consent', async ({ page, context }) => {
  await signedPlayer(page, 'reauth-confirmed-retry'); await context.clearCookies(); await page.reload();
  await page.getByRole('button', { name: 'Đăng nhập lại với Google', exact: true }).click();
  const panel = page.locator('.recovery .account-panel'); await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).toBeVisible();
  const retained = await journal(page); let posts = 0, failedFence = false;
  page.on('request', r => { if (r.url().endsWith('/auth/google')) posts++; });
  await page.route('**/api/auth/google/challenge', async route => {
    if (posts === 1 && !failedFence) { failedFence = true; await route.abort(); } else await route.continue();
  });
  await panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true }).click();
  await expect(panel.getByRole('alert')).toBeVisible(); expect(posts).toBe(1); expect(await journal(page)).toEqual(retained);
  await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).not.toBeVisible();
  await panel.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect(posts).toBe(1); expect((await journal(page)).clientId).toBe(retained.clientId);
});
