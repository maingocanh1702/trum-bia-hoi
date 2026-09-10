import { test, expect, type Page } from '@playwright/test';
const panel = (page: Page) => page.locator('.admin-review');
const key = 'tbh.admin.competition.v1.game';
async function login(page: Page, subject = 'game') {
  await page.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(o){this.o=o},renderButton(el){const b=document.createElement('button');b.textContent='Test Google';b.onclick=async()=>{const r=await fetch('/api/__test/sign?subject=${subject}&nonce='+this.o.nonce);this.o.callback(await r.json())};el.append(b)},disableAutoSelect(){},cancel(){}}}};` }));
  await page.goto('/admin'); await page.getByRole('button', { name: 'Tiếp tục với Google' }).click(); await page.getByRole('button', { name: 'Test Google' }).click();
  if (subject === 'game' || subject.startsWith('super')) {
    await expect(page.getByLabel('Mã xác thực 6 số')).toBeVisible();
    // Move the isolated clock to a fresh TOTP step; never weaken the production anti-replay check.
    await page.request.get('/api/__test/advance?ms=30000');
    const { code } = await (await page.request.get('/api/__test/otp?subject=' + subject)).json();
    await page.getByLabel('Mã xác thực 6 số').fill(code); await page.getByRole('button', { name: 'Xác thực', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled();
}
async function seed(page: Page) { const r = await page.request.get('/api/__test/moderation'); expect(r.status()).toBe(200); return r.json(); }
async function inspect(page: Page, id: string) {
  await panel(page).getByLabel('ID người chơi cần kiểm tra').fill(id); await panel(page).getByRole('button', { name: 'Xem lịch sử nhập', exact: true }).click();
  await expect(panel(page).locator('.admin-history')).toBeVisible(); await expect(panel(page).getByLabel('Lý do quyết định')).toBeEnabled();
}
async function prepare(page: Page, action = 'Duyệt lịch sử', reason = 'Reviewed replay and source clock') {
  await panel(page).getByLabel('Lý do quyết định').fill(reason); await panel(page).getByRole('button', { name: action, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused();
}
async function submit(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận quyết định này' }).click();
}
async function decide(page: Page, action: string) { await prepare(page, action); await submit(page); await expect(panel(page).getByRole('status')).toContainText('Đã ghi nhận'); await expect(panel(page).getByLabel('Lý do quyết định')).toBeEnabled(); }

test('Game admin inspects bounded source pages and reviews or flags without altering the game; VI/EN mobile controls', async ({ page }) => {
  await login(page); const origin = await seed(page); await inspect(page, origin.playerId);
  await expect(panel(page)).toContainText(origin.digest); await expect(panel(page).getByRole('button', { name: 'Duyệt lịch sử', exact: true })).toBeDisabled();
  await panel(page).getByRole('button', { name: 'Lệnh khi nhập', exact: true }).click();
  await expect(panel(page).locator('.admin-history li')).toHaveCount(50);
  await panel(page).getByRole('button', { name: 'Trang tiếp theo' }).click();
  await expect(panel(page).locator('.admin-history li')).toHaveCount(origin.commandSeq - 50);
  await expect(panel(page).getByRole('button', { name: 'Trang tiếp theo' })).toHaveCount(0);
  await panel(page).getByText('Xem bản ghi', { exact: true }).first().click();
  await expect(panel(page)).toContainText('local-activity-'); await expect(panel(page)).not.toContainText('server-after-import');
  await prepare(page); await expect(page.getByRole('dialog')).toContainText(origin.playerId); await expect(page.getByRole('dialog')).toContainText(origin.digest);
  await page.screenshot({ path: '.qa/admin-review-confirm-mobile.png' });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(panel(page).getByRole('button', { name: 'Duyệt lịch sử', exact: true })).toBeFocused();
  await decide(page, 'Duyệt lịch sử'); await expect(panel(page)).toContainText('Đã duyệt');
  await decide(page, 'Từ chối lịch sử'); await expect(panel(page)).toContainText('Đã từ chối');
  await decide(page, 'Gắn cờ'); await expect(panel(page)).toContainText('Đang gắn cờ');
  await decide(page, 'Gỡ cờ'); await expect(panel(page)).toContainText('Không gắn cờ');
  const current = await (await page.request.get('/api/__test/moderation?playerId=' + origin.playerId)).json();
  for (const field of ['coins', 'reputation', 'phase', 'equipment', 'served', 'completedShifts']) expect(current[field]).toEqual(origin.before[field]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await panel(page).locator('button:visible,input:visible,textarea:visible,summary:visible').evaluateAll(elements => elements.every(e => e.getBoundingClientRect().height >= 44))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.getByLabel('Ngôn ngữ').selectOption('en'); await expect(panel(page).getByRole('heading', { name: 'Player history review and flags' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 }); await panel(page).screenshot({ path: '.qa/admin-review-desktop.png' });
});

test('lost decision acknowledgement keeps one exact request across reload and never reapplies an old decision', async ({ page }) => {
  await login(page); const origin = await seed(page); await inspect(page, origin.playerId); const payloads: unknown[] = []; let first: any;
  await page.route('**/api/admin/competition', async r => {
    payloads.push(r.request().postDataJSON());
    if (!first) { const response = await r.fetch(); first = await response.json(); await r.abort('failed'); } else await r.continue();
  });
  await prepare(page); await submit(page); await expect(panel(page).getByRole('button', { name: 'Thử lại yêu cầu đã lưu' })).toBeEnabled();
  expect(first.actor).toBe('game'); expect(await page.evaluate(k => JSON.parse(sessionStorage.getItem(k)!).request, key)).toEqual(payloads[0]);
  await page.reload(); await expect(panel(page).getByRole('button', { name: 'Thử lại yêu cầu đã lưu' })).toBeEnabled(); expect(payloads).toHaveLength(1);
  await panel(page).getByRole('button', { name: 'Thử lại yêu cầu đã lưu' }).click(); await expect(panel(page).getByRole('status')).toContainText('Đã ghi nhận');
  expect(payloads).toEqual([payloads[0], payloads[0]]); expect(await page.evaluate(k => sessionStorage.getItem(k), key)).toBeNull();
  const state = await (await page.request.get('/api/admin/competition?playerId=' + origin.playerId)).json(); expect(state.localImport.review.seq).toBe(first.seq);
});

test('a stale decision forces inspection, while storage failure prevents any write and confirmed ACK clears before failed refresh', async ({ page }) => {
  await login(page); const origin = await seed(page); await inspect(page, origin.playerId);
  const auth = await (await page.request.get('/api/admin/auth')).json();
  const concurrent = await page.request.post('/api/admin/competition', { data: { type: 'import-review', value: 'approved', digest: origin.digest, playerId: origin.playerId, key: 'competing-' + origin.playerId, expectedSeq: 0, reason: 'Concurrent review' }, headers: { Origin: 'http://127.0.0.1:4181', 'X-TBH-Admin-Context': auth.context } }); expect(concurrent.status()).toBe(200);
  await prepare(page); await submit(page); await expect(panel(page).getByRole('alert')).toContainText('Xem lại'); await expect(panel(page).locator('.admin-history')).toHaveCount(0); expect(await page.evaluate(k => sessionStorage.getItem(k), key)).toBeNull();
  await inspect(page, origin.playerId); let posts = 0; page.on('request', r => { if (new URL(r.url()).pathname === '/api/admin/competition' && r.method() === 'POST') posts++; });
  await page.evaluate(k => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === k) throw Error('storage unavailable'); return original.call(this, name, value); }; }, key);
  await prepare(page, 'Từ chối lịch sử'); await submit(page); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Chưa gửi'); expect(posts).toBe(0);
  await page.reload(); await inspect(page, origin.playerId); await prepare(page, 'Từ chối lịch sử');
  await page.route('**/api/admin/competition?playerId=*', r => r.fulfill({ status: 401, json: { error: 'admin:invalidSession' } }));
  await submit(page); await expect(panel(page)).toHaveCount(0); expect(await page.evaluate(k => sessionStorage.getItem(k), key)).toBeNull(); await expect(page.getByRole('alert')).toContainText('hết hạn');
});

test('Support is read-only and changing the admin identity clears protected evidence and hides another operator pending intent', async ({ page, browser }) => {
  await login(page); const origin = await seed(page); await inspect(page, origin.playerId);
  const pending = { owner: 'game', request: { type: 'flag', value: true, playerId: origin.playerId, key: 'other-operator', expectedSeq: 0, reason: 'Private operator intent' } };
  await page.evaluate(({ key, pending }) => sessionStorage.setItem(key, JSON.stringify(pending)), { key, pending });
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4181' }); const support = await other.newPage(); await login(support, 'support');
  await page.context().addCookies((await other.cookies()).filter(c => c.name === 'tbh-admin'));
  await panel(page).getByRole('button', { name: 'Xem lịch sử nhập', exact: true }).click(); await expect(panel(page)).toHaveCount(0); await expect(page.getByRole('alert')).toContainText('đổi tài khoản');
  await page.reload(); await expect(panel(page)).toBeVisible(); await expect(panel(page)).not.toContainText('Private operator intent'); await expect(panel(page).getByRole('button', { name: 'Thử lại yêu cầu đã lưu' })).toHaveCount(0);
  await panel(page).getByLabel('ID người chơi cần kiểm tra').fill(origin.playerId); await panel(page).getByRole('button', { name: 'Xem lịch sử nhập', exact: true }).click();
  await expect(panel(page).locator('.admin-history')).toBeVisible(); await expect(panel(page)).toContainText('Support chỉ được xem');
  await expect(panel(page).getByLabel('Lý do quyết định')).toHaveCount(0); await expect(panel(page).getByRole('button', { name: 'Gắn cờ', exact: true })).toHaveCount(0); await other.close();
});

test('a delayed history response cannot restore protected contents after logout; damaged recovery is downloadable', async ({ page }) => {
  await login(page); const origin = await seed(page); let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; }); let arrived!: () => void; const started = new Promise<void>(resolve => { arrived = resolve; });
  await page.route('**/api/admin/competition/history?*', async r => { const response = await r.fetch(); arrived(); await hold; await r.fulfill({ response }).catch(() => {}); });
  await panel(page).getByLabel('ID người chơi cần kiểm tra').fill(origin.playerId); await panel(page).getByRole('button', { name: 'Xem lịch sử nhập', exact: true }).click(); await started;
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(panel(page)).toHaveCount(0); release(); await page.unroute('**/api/admin/competition/history?*', undefined); await expect(page.locator('.admin-history')).toHaveCount(0);
  await page.evaluate(k => sessionStorage.setItem(k, '{broken'), key); await login(page);
  await expect(panel(page).getByRole('alert')).toContainText('Không đọc được yêu cầu cũ'); await expect(panel(page).getByRole('button', { name: 'Xem lịch sử nhập', exact: true })).toBeDisabled();
  const dl = page.waitForEvent('download'); await panel(page).getByRole('button', { name: 'Tải yêu cầu lưu trong tab' }).click(); expect((await dl).suggestedFilename()).toBe('admin-review-recovery.json');
});
