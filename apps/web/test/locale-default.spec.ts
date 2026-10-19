import { test, expect } from '@playwright/test';
import { freshGame } from './fresh-game';
import { waitSaved } from './storage';

// FEEDBACK I.1 (owner 2026-09-17), local build: no language screen, Vietnamese whatever the browser says, a saved English choice stays,
// Settings switches it. The save is a brand-new full-HUD game; the settings key is left untouched, i.e. a clean profile.
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const languages = ['en-US', 'en-GB', 'fr-FR'];

viewports.forEach((viewport, i) => test(`a clean profile on a ${languages[i]} browser opens straight into the Vietnamese yard and Settings keeps English across reload at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
  const context = await browser.newContext({ locale: languages[i], viewport }), page = await context.newPage(), f = freshGame(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(save => { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); localStorage.setItem('tbh.save.v1', save); } }, f.save);
  await page.goto('/');
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.locator('.language-entry')).toHaveCount(0); await expect(page.getByRole('radio')).toHaveCount(0);
  expect(await page.evaluate(() => navigator.language)).toBe(languages[i]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi'); await expect(page.getByRole('button', { name: 'Mở ca', exact: true }).first()).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('tbh.settings.v1')); if (saved) expect(JSON.parse(saved).locale).toBe('vi'); // the first checkpoint may already have written the defaults: never the browser's language
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await expect(page.getByRole('button', { name: 'Open shift', exact: true }).first()).toBeVisible();
  await waitSaved(page); await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await expect(page.getByRole('button', { name: 'Open shift', exact: true }).first()).toBeVisible();
  await expect(page.locator('.language-entry')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.settings.v1')!).locale)).toBe('en');
  expect(errors).toEqual([]); await context.close();
}));

test('a saved English choice stays English on a Vietnamese browser, and a saved Vietnamese one stays Vietnamese on an English browser', async ({ browser }) => {
  for (const [saved, language, lang, open] of [['en', 'vi-VN', 'en', 'Open shift'], ['vi', 'en-US', 'vi', 'Mở ca']] as const) {
    const context = await browser.newContext({ locale: language }), page = await context.newPage(), f = freshGame();
    await page.addInitScript(({ save, saved }) => { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: saved })); }, { save: f.save, saved });
    await page.goto('/');
    await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByRole('button', { name: open, exact: true }).first()).toBeVisible(); await expect(page.getByRole('radio')).toHaveCount(0);
    await context.close();
  }
});

test('settings written by the removed language screen still load, and an unknown language falls back to Vietnamese', async ({ browser }) => {
  for (const [settings, lang] of [[{ locale: 'en', localeAccepted: true, welcomed: true, muted: true }, 'en'], [{ locale: 'bad', localeAccepted: true, welcomed: true }, 'vi'], [{ welcomed: true }, 'vi']] as const) {
    const context = await browser.newContext({ locale: 'en-US' }), page = await context.newPage(), f = freshGame();
    await page.addInitScript(({ save, settings }) => { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify(settings)); }, { save: f.save, settings });
    await page.goto('/');
    await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('lang', lang); await expect(page.getByRole('radio')).toHaveCount(0);
    await context.close();
  }
});
