import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode = 'live') => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/menu.ts', mode], { encoding: 'utf8' }));
const number = (n: number, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n));

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
  test(`Sổ ca shows actual dish counts, pauses while open and updates after closing and survives reload at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const f = fixture(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => { if (!localStorage.getItem('menu-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('menu-seeded', '1'); } }, f.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Món trong ca', exact: true });
    await panel.scrollIntoViewIfNeeded(); await expect(panel.locator('tbody tr')).toHaveCount(6);
    for (const row of f.report.rows) await expect(panel.locator(`[data-dish="${row.dish}"] td`)).toHaveText([row.ordered, row.sold, row.wasted].map(n => number(n)));
    await expect(panel.locator('[data-metric="avgTicket"]')).toHaveText(number(f.report.avgTicket));
    await expect(panel.locator('.menu-partial')).toHaveCount(0);
    await expect.poll(() => panel.locator('img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `.qa/menu-live-${viewport.width}.png` });
    await page.clock.fastForward(f.target - f.now);
    for (const row of f.report.rows) await expect(panel.locator(`[data-dish="${row.dish}"] td`)).toHaveText([row.ordered, row.sold, row.wasted].map(n => number(n)));
    await page.keyboard.press('Escape'); await page.clock.fastForward(f.target - f.now);
    await expect(page.getByRole('dialog', { name: 'Sổ ca hôm nay', exact: true })).toBeVisible();
    expect(f.after.rows.reduce((n: number, row: { wasted: number }) => n + row.wasted, 0)).toBeGreaterThan(0);
    for (const row of f.after.rows) await expect(panel.locator(`[data-dish="${row.dish}"] td`)).toHaveText([row.ordered, row.sold, row.wasted].map(n => number(n)));
    await page.reload(); await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    await expect(panel.locator('[data-metric="avgTicket"]')).toHaveText(number(f.after.avgTicket));
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Sổ ca', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Shift book', exact: true }).click();
    const english = page.getByRole('region', { name: 'Dishes this shift', exact: true }); await english.scrollIntoViewIfNeeded();
    await expect(english).toContainText('Table orders served'); await expect(english.locator('[data-metric="avgTicket"]')).toHaveText(number(f.after.avgTicket, 'en'));
    await page.screenshot({ path: `.qa/menu-en-${viewport.width}.png` });
    expect(await english.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}

test('empty current and partial or closed legacy shifts do not present an invented average', async ({ browser }) => {
  for (const mode of ['empty', 'legacy-active', 'legacy-closed']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(), f = fixture(mode);
    await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click(); await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    const report = page.locator('.menu-report'); await report.scrollIntoViewIfNeeded();
    if (mode === 'legacy-closed') { await expect(report.locator('table')).toHaveCount(0); await expect(report).toContainText('Ca cũ chưa có thống kê món'); }
    else {
      await expect(report.locator('[data-metric="avgTicket"]')).toHaveText('—');
      await expect(report.locator('.menu-partial')).toHaveCount(mode === 'legacy-active' ? 1 : 0);
      await expect(report.locator('td')).toHaveText(Array(18).fill('0'));
    }
    await context.close();
  }
});
