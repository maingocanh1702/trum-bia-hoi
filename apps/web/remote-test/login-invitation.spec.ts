import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8'));
const snapshot = async (page: Page) => (await page.request.get('/api/player/state')).json();
const prefs = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tbh.settings.v1')!));
const invitation = (page: Page) => page.locator('.login-invitation');
async function enter(page: Page, locale = 'vi', overrides: Record<string, unknown> = {}) {
  await page.route('**/api/player/config?*', async route => {
    const response = await route.fetch(), raw = await response.json();
    Object.assign(raw.onboarding.loginPrompt, overrides);
    await route.fulfill({ response, json: raw });
  });
  await page.goto('/');
  await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).check();
  await page.getByRole('button', { name: locale === 'vi' ? 'Vào quán' : 'Enter the stall', exact: true }).click();
  await page.getByRole('button', { name: locale === 'vi' ? 'Chơi không đăng nhập' : 'Play without signing in', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
}
async function closeShift(page: Page, locale = 'vi') {
  await expect.poll(async () => (await snapshot(page)).world.staminaMs, { timeout: 15000 }).toBe(config.shift.durationMs);
  await page.getByRole('button', { name: locale === 'vi' ? 'Mở ca' : 'Open shift', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  await page.locator('.bottom-nav').getByRole('button').first().click();
  await page.getByRole('button', { name: locale === 'vi' ? 'Ngừng đón khách' : 'Stop taking new guests', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('resting');
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function board(page: Page) {
  await page.getByRole('button', { name: /Đường lên trùm/i }).click();
  await page.getByRole('button', { name: /Giải Nhậu/ }).click();
}
for (const locale of ['vi', 'en']) test(`first closed shift offers exactly three benefits without loading Google or hiding the book in ${locale}`, async ({ page }) => {
  let google = 0; page.on('request', r => { if (r.url().includes('accounts.google.com') || r.url().includes('/auth/google')) google++; });
  await enter(page, locale); await expect(invitation(page)).not.toBeVisible();
  await closeShift(page, locale);
  await expect(invitation(page)).toBeVisible();
  await expect(invitation(page).locator('li')).toHaveText(locale === 'vi' ? ['Lưu tiến độ', 'Thành tích', 'Đua top'] : ['Save progress', 'Achievements', 'Compete on the leaderboard']);
  await expect(page.locator('.ledger')).toBeVisible(); expect(google).toBe(0);
  const before = (await snapshot(page)).world;
  expect(await prefs(page)).toMatchObject({ loginPromptPlayer: before.playerId, loginPromptShift: 1 });
  for (const button of await invitation(page).getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await invitation(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `.qa/login-invitation-${locale}.png`, fullPage: true });
  await invitation(page).getByRole('button', { name: locale === 'vi' ? 'Chơi không đăng nhập' : 'Play without signing in', exact: true }).click();
  await expect(invitation(page)).not.toBeVisible(); await expect(page.locator('.ledger')).toBeVisible();
  expect((await snapshot(page)).world.coins).toBe(before.coins);
  await page.keyboard.press('Escape'); await page.reload();
  await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
  await page.getByRole('button', { name: locale === 'vi' ? 'Sổ ca' : 'Shift book', exact: true }).click();
  await expect(invitation(page)).not.toBeVisible();
});

test('all guest invitation surfaces share cooldown and unlock again at the configured shift boundary', async ({ page }) => {
  await enter(page, 'vi', { cooldownShifts: 2 }); await closeShift(page);
  await invitation(page).getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click(); await page.keyboard.press('Escape');
  await closeShift(page); await expect(invitation(page)).not.toBeVisible(); await page.keyboard.press('Escape');
  const suppressed = await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true }))); expect(suppressed).toBe(true);
  await closeShift(page); await expect(invitation(page)).not.toBeVisible(); await page.keyboard.press('Escape');
  await board(page); await expect(invitation(page)).toBeVisible();
  expect((await prefs(page)).loginPromptShift).toBe(3);
  await invitation(page).getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click(); await page.keyboard.press('Escape');
  await board(page); await expect(invitation(page)).not.toBeVisible();
  // Explicit account access remains available during cooldown.
  await page.getByRole('button', { name: 'Tài khoản', exact: true }).click();
  await expect(page.locator('.account-panel').getByRole('list')).toBeVisible();
});

test('disabled invitation flags suppress each surface while the account entry remains usable', async ({ page }) => {
  await enter(page, 'vi', { afterFirstShift: false, onLeaderboardOpen: false, onLeaveWithProgress: false });
  for (let n = 0; n < config.onboarding.featureReveal.leagueAfterShifts; n++) { await closeShift(page); await expect(invitation(page)).not.toBeVisible(); await page.keyboard.press('Escape'); }
  await board(page); await expect(invitation(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  await page.getByRole('button', { name: 'Tài khoản', exact: true }).click(); await expect(page.locator('.account-benefits')).toBeVisible();
});

test('cancelling native departure shows a skippable invitation, pauses the live shift, and reload respects dismissal', async ({ page }) => {
  await enter(page);
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  const table = page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first(); await table.click();
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeEnabled({ timeout: 20000 });
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.lifetimeEarned).toBeGreaterThan(0);
  const warning = page.waitForEvent('dialog');
  const navigation = page.evaluate(() => { window.location.href = 'about:blank'; });
  const native = await warning; expect(native.type()).toBe('beforeunload'); await native.dismiss(); await navigation;
  await expect(invitation(page)).toBeVisible(); expect(page.url()).toContain('4179');
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  const before = (await snapshot(page)).world; await page.waitForTimeout(1100);
  expect((await snapshot(page)).world.staminaMs).toBe(before.staminaMs);
  await invitation(page).getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect.poll(async () => Boolean((await snapshot(page)).world.paused)).toBe(false);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(page)).world.playerId).toBe(before.playerId); await expect(invitation(page)).not.toBeVisible();
});

test('accepting the invitation uses the existing Google panel and unavailable login stays skippable', async ({ page }) => {
  await enter(page);
  await page.route('**/api/auth/google/challenge', route => route.fulfill({ status: 503, json: { error: 'googleUnavailable' } }));
  await closeShift(page);
  await invitation(page).getByRole('button', { name: 'Đăng ký / Đăng nhập bằng Google', exact: true }).click();
  await expect(invitation(page)).not.toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Đăng nhập Google chưa sẵn sàng');
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await closeShift(page); await expect(invitation(page)).not.toBeVisible();
});

test('accepting native departure leaves freely and a new guest visit does not inherit invitation cooldown', async ({ page }) => {
  await enter(page, 'vi', { afterFirstShift: false }); await closeShift(page); await page.keyboard.press('Escape');
  const old = (await snapshot(page)).world.playerId;
  page.once('dialog', dialog => dialog.accept());
  await page.goto('about:blank'); expect(page.url()).toBe('about:blank');
  await page.unroute('**/api/player/config?*');
  await page.goto('/'); await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(page)).world.playerId).not.toBe(old);
  await closeShift(page); await expect(invitation(page)).toBeVisible();
});

test('a configured higher progress threshold suppresses departure reminders below that threshold', async ({ page }) => {
  await enter(page, 'vi', { afterFirstShift: false, leaveProgress: { minCompletedShifts: 2, minLifetimeEarned: 1000000 } });
  await closeShift(page); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  await closeShift(page); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false);
  await expect(invitation(page)).toBeVisible();
});
