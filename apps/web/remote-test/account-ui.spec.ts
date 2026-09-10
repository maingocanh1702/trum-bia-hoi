import { test, expect, type Page } from '@playwright/test';
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
  await expect(dialog.locator('.account-benefits li')).toHaveText(locale === 'vi' ? ['Lưu tiến độ', 'Thành tích', 'Đua top'] : ['Save progress', 'Achievements', 'Compete on the leaderboard']);
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
  await dialog.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
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
  await expect(entry).toContainText(locale === 'vi' ? 'Không lưu lịch sử chơi, thành tích' : 'Play history, achievements and progress are not saved');
  expect(await entry.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `.qa/account-modes-${locale}.png`, fullPage: true });
  await entry.getByRole('button', { name: locale === 'vi' ? 'Đăng ký / Đăng nhập bằng Google' : 'Sign up / Sign in with Google', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: locale === 'vi' ? 'Tài khoản Google' : 'Google account', exact: true })).toBeVisible();
  expect((await snapshot(page)).world.phase).toBe('resting');
});

test('guest history survives a reload but is not restored when the tab visit ends', async ({ page, context }) => {
  await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const before = (await snapshot(page)).world, cookie = (await context.cookies()).find(c => c.name === 'tbh_session');
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(page)).world.shift.id).toBe(before.shift.id);
  await page.close(); const next = await context.newPage(); await next.goto('/');
  await expect(next.getByRole('heading', { name: 'Chọn cách chơi', exact: true })).toBeVisible();
  await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  const fresh = (await snapshot(next)).world;
  expect(fresh.playerId).not.toBe(before.playerId); expect(fresh.phase).toBe('resting'); expect(fresh.completedShifts).toBe(0);
  expect(fresh.lifetimeEarned).toBe(0); expect(fresh.peakLeague).toBeNull();
  if (cookie) expect((await context.cookies()).find(c => c.name === cookie.name)?.value).not.toBe(cookie.value);
  await next.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(next.getByRole('dialog')).toContainText('Không lưu lịch sử chơi, thành tích');
  await expect(next.getByRole('dialog')).not.toContainText('Tiến độ được lưu trên server');
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

test('a lost restart response never strands a new guest visit behind the expired visit journal', async ({ page, context }) => {
  await enter(page); const old = (await snapshot(page)).world.playerId; await page.close();
  const next = await context.newPage(); let lost = false;
  await next.route('**/api/auth/guest/restart', async route => {
    if (lost) { await route.continue(); return; }
    lost = true; const response = await route.fetch(); expect(response.status()).toBe(201);
    await route.fulfill({ response, body: '{', contentType: 'application/json' });
  });
  await next.goto('/'); await expect(next.getByRole('alert')).toContainText('Chưa kết nối');
  expect(await next.evaluate(() => localStorage.getItem('tbh.remote.v1'))).toBeNull();
  await next.reload(); await next.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(next.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(next)).world.playerId).not.toBe(old); expect((await snapshot(next)).world.phase).toBe('resting');
});
