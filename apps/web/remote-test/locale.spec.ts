import { test, expect, type Page } from '@playwright/test';

// FEEDBACK I.1 (owner 2026-09-17): no language screen. A clean profile opens in Vietnamese whatever the browser says, a saved English
// choice stays English, and the language changes in Settings only. The remote account-mode screen ("Chọn cách chơi") is the first screen.
const prefs = () => JSON.parse(localStorage.getItem('tbh.settings.v1')!);
const state = async (page: Page) => (await page.request.get('/api/player/state')).json();
const noLanguageChoice = (page: Page) => expect(page.getByRole('radio')).toHaveCount(0);

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) test(`first run opens in Vietnamese without a language screen and keeps the live shift when Settings switches it at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Chọn cách chơi', exact: true })).toBeVisible(); await noLanguageChoice(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await state(page)).world.phase).toBe('open');
  const before = await state(page);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
  expect(await page.evaluate(prefs)).toMatchObject({ locale: 'en' });
  const after = await state(page); expect(after.world.playerId).toBe(before.world.playerId); expect(after.world.shift.id).toBe(before.world.shift.id); expect(after.world.coins).toBe(before.world.coins);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Synced'); await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await noLanguageChoice(page);
  expect((await state(page)).world.shift.id).toBe(before.world.shift.id); expect(errors).toEqual([]);
});

for (const language of ['en-US', 'vi-VN', 'fr-FR']) test(`browser language ${language} never picks the language: the first screen is Vietnamese`, async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179', locale: language, reducedMotion: 'reduce' }), page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Chọn cách chơi', exact: true })).toBeVisible(); await noLanguageChoice(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi'); expect(await page.evaluate(() => navigator.language)).toBe(language);
  expect(await page.evaluate(() => localStorage.getItem('tbh.settings.v1'))).toBeNull(); // nothing is saved for a language nobody chose
  await context.close();
});

test('a saved English choice stays English on a Vietnamese browser', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179', locale: 'vi-VN' }), page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'en' })));
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Choose how to play', exact: true })).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Play without signing in', exact: true }).click(); await expect(page.locator('.network-status')).toContainText('Synced');
  await context.close();
});

for (const locale of ['en', null]) test(`settings written by the removed language screen keep ${locale ?? 'implicit Vietnamese'} without restarting a live shift`, async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await state(page)).world.phase).toBe('open'); const before = await state(page);
  await page.evaluate(locale => { const p = JSON.parse(localStorage.getItem('tbh.settings.v1') ?? '{}'); p.localeAccepted = true; p.welcomed = true; if (locale) p.locale = locale; else delete p.locale; localStorage.setItem('tbh.settings.v1', JSON.stringify(p)); }, locale);
  await page.reload(); await expect(page.locator('.network-status')).toContainText(locale === 'en' ? 'Synced' : 'Đã đồng bộ'); await noLanguageChoice(page);
  await expect(page.locator('html')).toHaveAttribute('lang', locale ?? 'vi');
  const after = await state(page); expect(after.world.playerId).toBe(before.world.playerId); expect(after.world.shift.id).toBe(before.world.shift.id);
});

test('an invalid stored language falls back to Vietnamese and still opens the game', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'bad', localeAccepted: true, welcomed: true })));
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Chọn cách chơi', exact: true })).toBeVisible(); await noLanguageChoice(page); await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
});

test('a failed game module offers retry before any player mutation', async ({ page }) => {
  let sent = false; page.on('request', r => { if (r.url().includes('/api/')) sent = true; });
  await page.route('**/src/App.tsx*', r => r.abort(), { times: 1 }); await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Chưa tải được quán'); expect(sent).toBe(false);
  await page.getByRole('button', { name: 'Thử đọc lại', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Chọn cách chơi', exact: true })).toBeVisible(); await noLanguageChoice(page);
});
