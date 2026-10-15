import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { seedLocale } from './locale-seed';
async function seed(page: Page, subject: string) {
  const r = await page.request.post('/api/__test/rank?subject=' + subject); expect(r.ok(), await r.text()).toBe(true); return r.json() as Promise<{ players: { playerId: string }[] }>;
}
async function enter(page: Page, locale = 'vi') {
  await seedLocale(page, locale); await page.goto('/');
  await expect(page.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
}
async function board(page: Page, locale = 'vi') {
  await page.getByRole('button', { name: locale === 'vi' ? /Đường lên trùm/i : /Your journey/i }).click();
  await page.getByRole('button', { name: locale === 'vi' ? /Giải Nhậu/ : /League & Seasons/ }).click();
  await expect(page.locator('.leaderboard')).toBeVisible();
}
const state = async (page: Page) => (await page.request.get('/api/player/state')).json();
for (const locale of ['vi', 'en']) test(`real ranked careers show pages, own tier neighbors and paused menus in ${locale}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const fixture = await seed(page, 'ui-' + locale); await enter(page, locale);
  await page.getByRole('button', { name: locale === 'vi' ? 'Mở ca' : 'Open shift', exact: true }).first().click();
  await expect.poll(async () => (await state(page)).world.phase).toBe('open');
  await board(page, locale); const panel = page.locator('.leaderboard');
  await expect(panel.locator('.rank-personal .is-me')).toBeVisible(); await expect(panel.locator(':scope > .rank-list > li')).toHaveCount(2);
  const paused = (await state(page)).world; expect(paused.paused).toBe(true); await page.waitForTimeout(1200);
  expect((await state(page)).world.staminaMs).toBe(paused.staminaMs);
  await panel.getByRole('button', { name: locale === 'vi' ? 'Trang sau' : 'Next page', exact: true }).click();
  await expect(panel.locator('.rank-pages')).toContainText(locale === 'vi' ? 'Trang 2' : 'Page 2'); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  await panel.getByRole('combobox').selectOption('bac'); await expect(panel.locator(':scope > .rank-list > li')).toHaveCount(0); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  await panel.getByRole('button', { name: locale === 'vi' ? 'Vụ Tranh Bá' : 'Contest Season', exact: true }).click();
  await expect(panel.locator(':scope > .rank-list > li')).toHaveCount(2); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  await page.screenshot({ path: `.qa/leaderboard-${locale}-390.png`, fullPage: true });
  expect(await panel.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  for (const control of await panel.locator('button,select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const cache = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.leaderboard.v1')!));
  for (const key of ['viewer', 'me', 'neighbors', 'eligibility']) expect(cache[key]).toBeUndefined();
  expect(JSON.stringify(cache)).not.toContain(fixture.players[0].playerId);
  await page.keyboard.press('Escape'); await expect.poll(async () => Boolean((await state(page)).world.paused)).toBe(false); expect(errors).toEqual([]);
});

test('moderation invalidates an open page and a guest can view the public board without inheriting the prior account row', async ({ page }) => {
  const fixture = await seed(page, 'ui-moderation'); await enter(page); await board(page);
  const panel = page.locator('.leaderboard'); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  const old = await (await page.request.get('/api/leaderboard?kind=ranking')).json();
  await page.request.post('/api/__test/rank?action=flag&playerId=' + fixture.players[0].playerId);
  await panel.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(panel.locator('.rank-pages')).toContainText('Trang 1'); await expect(panel.locator('.rank-personal')).toContainText('tạm ẩn');
  expect((await page.request.get('/api/leaderboard?kind=ranking&revision=' + old.revision)).status()).toBe(409);
  await page.request.post('/api/__test/rank?action=clear&playerId=' + fixture.players[0].playerId);
  await panel.getByRole('button', { name: 'Làm mới bảng', exact: true }).click(); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  // A fresh actual guest has the same public board, with no personal rank or inherited review state.
  await page.context().clearCookies(); await page.request.post('/api/auth/session', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } });
  const guestBoard = await (await page.request.get('/api/leaderboard?kind=ranking')).json(); expect(guestBoard.me).toBeNull(); expect(guestBoard.neighbors).toEqual([]); expect(guestBoard.rows.length).toBe(2);
  await panel.getByRole('button', { name: 'Làm mới bảng', exact: true }).click();
  await expect(panel.locator('.rank-status')).toContainText('Phiên tài khoản đã thay đổi'); await expect(panel.locator('.rank-personal .is-me')).not.toBeVisible();
});

test('offline reopening shows only a dated public preview, recovers online and ignores a late response after closing', async ({ page, context }) => {
  await seed(page, 'ui-offline'); await enter(page); await board(page);
  const panel = page.locator('.leaderboard'); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  await page.keyboard.press('Escape'); await context.setOffline(true); await board(page);
  await expect(panel.locator('.rank-asof')).toContainText('Bản xem đã lưu'); await expect(panel.locator(':scope > .rank-list > li')).toHaveCount(2);
  await expect(panel.locator('.rank-status')).toContainText('Chưa tải được bảng mới'); await expect(panel.locator('.rank-personal .is-me')).not.toBeVisible();
  await context.setOffline(false); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
  let release!: () => void, held = false; const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/leaderboard?*', async route => { const response = await route.fetch(); held = true; await barrier; await route.fulfill({ response }).catch(() => {}); });
  await panel.getByRole('button', { name: 'Làm mới bảng', exact: true }).click(); await expect.poll(() => held).toBe(true);
  await page.keyboard.press('Escape'); release(); await expect(panel).not.toBeVisible();
  await page.unroute('**/api/leaderboard?*');
  await page.evaluate(() => localStorage.setItem('tbh.leaderboard.v1', '{broken'));
  await board(page); await expect(panel.locator('.rank-personal .is-me')).toBeVisible();
});

for (const locale of ['vi', 'en']) test(`ended season history freezes names and scores with public podium/wall in ${locale}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.request.post('/api/__test/advance?ms=1000000');
  await seed(page, 'history-' + locale);
  const live = await (await page.request.get('/api/leaderboard?kind=ranking')).json();
  await page.request.post('/api/__test/rank?action=end');
  // The component fetches public history without credentials, even inside an account menu.
  await page.route('**/api/seasons/history', async route => { const response = await route.fetch(); await new Promise(r => setTimeout(r, 3000)); await route.fulfill({ response }); });
  await page.context().clearCookies(); await seed(page, 'history-viewer-' + locale); await enter(page, locale); await board(page, locale);
  await page.getByText(locale === 'vi' ? 'Bảng vàng các mùa' : 'Season hall of fame', { exact: true }).first().click();
  const panel = page.locator('.season-archive'); await expect(panel.getByRole('combobox').first()).toBeVisible();
  await panel.getByRole('combobox').first().selectOption(live.period.id);
  const frozen = (await (await page.request.get('/api/seasons/history')).json()).find((s: any) => s.period.id === live.period.id);
  expect(frozen.rows.slice(0, live.rows.length).map((r: any) => r.id)).toEqual(live.rows.map((r: any) => r.id));
  const top = panel.locator('.rank-list').first(); await expect(top.locator('li').first()).toContainText(frozen.rows[0].name.id);
  await expect(top.locator('li')).toHaveCount(Math.min(frozen.shrineTop, frozen.rows.filter((r: any) => r.tierId === 'dong').length));
  await panel.getByRole('combobox').last().selectOption('bac'); await expect(panel).toContainText(locale === 'vi' ? 'Chưa có ai' : 'No one in this tier yet.');
  await panel.getByRole('combobox').last().selectOption('dong');
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    expect(await panel.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    for (const control of await panel.locator('select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    writeFileSync(`.qa/v03-season-axe-${locale}-${viewport.width}.json`, JSON.stringify(audit.violations, null, 2));
    expect(audit.violations).toEqual([]);
    await panel.screenshot({ path: `.qa/v03-season-history-${locale}-${viewport.width}.png` });
  }
  expect(errors).toEqual([]);
});
