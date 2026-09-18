import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { waitSaved } from './storage';
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/feedback.ts', mode], { encoding: 'utf8' }));

for (const locale of ['vi', 'en']) for (const width of [360, 390, 1280]) {
  test(`A4 ${locale} actual empty and refilling order feedback agrees with the guide at ${width}px`, async ({ page }) => {
    const f = fixture('empty'), errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 1280 ? 400 : 844 }); await page.clock.setFixedTime(f.now);
    await page.addInitScript(({ save, locale }) => {
      if (!localStorage.getItem('feedback-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('feedback-seeded', '1'); }
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: false, guideIndex: 1, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    const empty = locale === 'vi' ? 'Hết bom bia' : 'Out of raw beer';
    await expect(page.locator('.guide')).toContainText(empty);
    await page.locator('.table-object').first().click();
    await expect(page.locator('[data-preparation="beerStock"]')).toContainText(empty);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.locator('#active-table-order').getByRole('button', { name: locale === 'vi' ? 'Nhập hàng' : 'Restock', exact: true }).evaluate(button => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.locator('#active-table-order').getByRole('button', { name: locale === 'vi' ? 'Nhập hàng' : 'Restock', exact: true }).click();
    await page.locator('.stock-row').first().getByRole('button').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.guide')).toContainText(locale === 'vi' ? 'Đợi bia rót sẵn' : 'Waiting for ready beer');
    await page.locator('.table-object').first().click(); await expect(page.locator('[data-preparation="beerRefill"]')).toBeVisible();
    await waitSaved(page); await page.screenshot({ path: `artifacts/verification/codex-improve-order-feedback/feedback-${locale}-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}

for (const locale of ['vi', 'en']) for (const mode of ['loss', 'loss-vs-stale', 'legacy', 'legacy-tie', 'legacy-known', 'queue', 'maxed', 'ready']) {
  test(`A4 ${locale} ${mode} advice uses observed losses and survives reload`, async ({ page }) => {
    const f = fixture(mode); await page.clock.pauseAt(f.now);
    await page.addInitScript(({ save, locale }) => {
      if (!localStorage.getItem('feedback-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('feedback-seeded', '1'); }
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    if (mode === 'ready') { await page.locator('.table-object').first().click(); await expect(page.locator('[data-preparation="ready"]')).toBeVisible(); return; }
    const book = page.getByRole('button', { name: locale === 'vi' ? 'Sổ ca' : 'Shift book', exact: true }).first();
    await book.click(); const hint = page.locator('.upgrade-hint');
    const kind = ['legacy', 'legacy-tie'].includes(mode) ? 'unknown' : ['queue', 'maxed'].includes(mode) ? 'tables' : 'beerStock';
    await expect(hint).toHaveAttribute('data-kind', kind);
    if (mode === 'loss-vs-stale') { expect(f.stale).toBeGreaterThan(0); expect(f.report.losses.beerStock).toBeGreaterThan(f.stale); }
    if (mode.startsWith('legacy')) {
      expect(f.report.losses.unknown).toBeGreaterThan(0); expect(f.report.losses.beerStock).toBeGreaterThan(0);
      if (mode === 'legacy') expect(f.report.losses.unknown).toBeGreaterThan(f.report.losses.beerStock);
      if (mode === 'legacy-tie') expect(f.report.losses.unknown).toBe(f.report.losses.beerStock);
      if (mode === 'legacy-known') expect(f.report.losses.beerStock).toBeGreaterThan(f.report.losses.unknown);
      await expect(hint.getByRole('button')).toHaveCount(mode === 'legacy-known' ? 1 : 0);
    }
    if (mode === 'maxed') await expect(hint.getByRole('button')).toHaveCount(0);
    if (mode === 'queue') await expect(hint).not.toContainText(locale === 'vi' ? 'bom bia' : 'beer stock');
    await waitSaved(page); await page.reload(); await book.click(); await expect(hint).toHaveAttribute('data-kind', kind);
    if (mode === 'loss') { await hint.getByRole('button').click(); await expect(page.getByRole('dialog', { name: locale === 'vi' ? 'Nhập hàng' : 'Restock', exact: true })).toBeVisible(); }
  });
}
