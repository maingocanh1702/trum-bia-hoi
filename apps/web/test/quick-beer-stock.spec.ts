import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { readSave, waitSaved } from './storage';

const fixture = (mode = 'ready', save?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/quick-beer-stock.ts', mode], { encoding: 'utf8', input: save }));
async function boot(page: Page, locale: string, mode = 'ready') {
  const f = fixture(mode), copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8'));
  // Keep game time deterministic while accessibility's own timers continue normally.
  await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save, locale }) => {
    if (!localStorage.getItem('quick-stock-seeded')) {
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('quick-stock-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }
  }, { save: f.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const warning = page.getByRole('region', { name: copy['stock.quickBeerTitle'], exact: true });
  return { f, copy, warning };
}
const saved = async (page: Page) => fixture('inspect', await readSave(page));

for (const locale of ['vi', 'en']) for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const { f, copy, warning } = await boot(page, locale);
    expect(f.stock).toBe(0); expect(f.ready).toBeGreaterThan(0);
    await expect(warning.getByRole('status')).toHaveText(copy['stock.beerEmpty']);
    const format = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
    const button = warning.getByRole('button', { name: copy['stock.quickBeer'].replace('{n}', format(f.quote.quantity)).replace('{cost}', format(f.quote.cost)), exact: true });
    await expect(button).toBeEnabled(); const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    const axe = await new AxeBuilder({ page }).include('.beer-stock-warning').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tbh.shot(`a2-stock-${locale}-${viewport.width}.png`);
    const before = await saved(page); await button.click(); await waitSaved(page); const after = await saved(page);
    expect(after.coins).toBe(before.coins - before.quote.cost);
    // A refill may immediately move raw stock into a production batch; preserve both quantities.
    expect(after.stock + after.batch).toBe(before.stock + before.batch + before.quote.quantity);
    expect(after.restocked).toHaveLength(1); expect(after.restocked[0]).toMatchObject({ quantity: before.quote.quantity, cost: before.quote.cost });
    expect(after.restockCommands).toBe(1); expect(after.paused).toBe(false); expect(after.remaining).toBe(before.remaining);
    await expect(page.locator('dialog[open]')).toHaveCount(0); await expect(page.locator('.game')).not.toHaveClass(/is-paused/);
    await expect(warning).toHaveCount(0);
    await page.clock.setFixedTime(f.now + 1000);
    await expect.poll(async () => (await saved(page)).remaining).toBe(after.remaining - 1000);
    const later = await saved(page);
    expect(later.remaining).toBe(after.remaining - 1000);
    await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); const restored = await saved(page);
    expect(restored.coins).toBe(later.coins); expect(restored.stock).toBe(later.stock); expect(restored.restockCommands).toBe(1);
    expect(restored.remaining).toBe(later.remaining); expect(restored.paused).toBe(false);
    expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
  });
}

test('A2 empty raw beer stock remains a refill warning while a batch is still preparing', async ({ page, tbh }) => {
  const { f, copy, warning } = await boot(page, 'vi', 'batch');
  expect(f.stock).toBe(0); expect(f.batch).toBeGreaterThan(0);
  await expect(warning.getByRole('status')).toHaveText(copy['stock.beerEmpty']);
  await warning.getByRole('button').click(); const after = await saved(page);
  expect(after.stock).toBe(f.cap); expect(after.batch).toBe(f.batch);
  expect(after.coins).toBe(f.coins - f.quote.cost); expect(after.paused).toBe(false);
  await expect(warning).toHaveCount(0); expect(tbh.consoleErrors()).toEqual([]);
});

for (const locale of ['vi', 'en']) test(`A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}`, async ({ page, tbh }) => {
  const { f, copy, warning } = await boot(page, locale, 'poor');
  expect(f.stock).toBeGreaterThan(0); expect(f.quote.ok).toBe(false);
  await expect(warning.getByRole('status')).toHaveText(copy['stock.beerLow']);
  const format = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  await expect(warning.getByRole('button')).toHaveText(copy['stock.quickBeer'].replace('{n}', format(f.quote.quantity)).replace('{cost}', format(f.quote.cost)));
  await expect(warning.getByRole('button')).toBeDisabled(); await expect(warning).toContainText(copy['error.notEnoughCoins']);
  const after = await saved(page); expect(after.coins).toBe(f.coins); expect(after.stock).toBe(f.stock); expect(after.restockCommands).toBe(0);
  expect(tbh.consoleErrors()).toEqual([]);
});

test('A2 stock at the configured batch boundary has no warning despite a nonzero refill quote', async ({ page, tbh }) => {
  const { f, warning } = await boot(page, 'vi', 'threshold');
  expect(f.stock).toBe(f.batchSize); expect(f.stock).toBeLessThan(f.cap); expect(f.quote.quantity).toBeGreaterThan(0);
  await expect(warning).toHaveCount(0); expect((await saved(page)).restockCommands).toBe(0);
  expect(tbh.consoleErrors()).toEqual([]);
});

test('A2 full beer stock has no low-stock warning or zero-quantity quick purchase', async ({ page, tbh }) => {
  const { f, warning } = await boot(page, 'vi', 'full');
  expect(f.stock).toBe(f.cap); expect(f.quote.quantity).toBe(0); await expect(warning).toHaveCount(0);
  expect(tbh.consoleErrors()).toEqual([]);
});
