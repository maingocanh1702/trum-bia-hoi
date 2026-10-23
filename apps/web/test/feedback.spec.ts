import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
    // Review B2-r2: the one-tap beer prompt keeps the message slot while the guide is up: the guide's words take the prompt's text line (or its own banner once
    // the stock is no longer low), its "Bỏ qua" stays, and the refill is on screen with the restock spotlight (the one lit element).
    const guideWords = page.locator('.message-slot :is(.guide:not(.hint) > p, .guide-line)');
    await expect(guideWords).toContainText(empty);
    const refill = page.locator('.message-slot .quick-beer');
    await expect(refill).toBeVisible(); await expect(refill).toHaveAttribute('data-spotlight', ''); await expect(page.locator('[data-spotlight]')).toHaveCount(1);
    await expect(page.locator('.message-slot').getByRole('button', { name: locale === 'vi' ? 'Bỏ qua' : 'Skip', exact: true })).toBeVisible();
    await page.locator('.table-object').first().click();
    await expect(page.locator('[data-preparation="beerStock"]')).toContainText(empty);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.locator('#active-table-order').getByRole('button', { name: locale === 'vi' ? 'Nhập hàng' : 'Restock', exact: true }).evaluate(button => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.locator('#active-table-order').getByRole('button', { name: locale === 'vi' ? 'Nhập hàng' : 'Restock', exact: true }).click();
    await page.locator('.stock-row').first().getByRole('button').first().click();
    await page.keyboard.press('Escape');
    await expect(guideWords).toContainText(locale === 'vi' ? 'Đợi bia rót sẵn' : 'Waiting for ready beer');
    await page.locator('.table-object').first().click(); await expect(page.locator('[data-preparation="beerRefill"]')).toBeVisible();
    await waitSaved(page); await page.screenshot({ path: `artifacts/verification/codex-improve-order-feedback/feedback-${locale}-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}

// Review B2-r2: the step guide up (Settings → "Xem lại hướng dẫn" restarts it) with the beer stock low but not empty (one beer, below a refill batch:
// fixtures/hints.ts `low`). The one-tap prompt still holds the one message slot: its refill shows quantity and price, the guide's words take its text line,
// "Bỏ qua" stays and works, and the prompt's own low-stock words stay for screen readers. One banner, nothing clamped or cut by the slot.
for (const locale of ['vi', 'en'] as const) for (const width of [360, 390, 1280]) test(`B2.2 the guide up with the beer stock low: the beer prompt keeps the slot and the guide's line joins it (${locale}) at ${width}px`, async ({ page }) => {
  const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/hints.ts', 'low'], { encoding: 'utf8' }));
  const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>, errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 844 }); await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('gl-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('gl-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: false, guideIndex: 0, muted: true, hintsDone: ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'] }));
  }, { save: f.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const slot = page.locator('.message-slot'), prompt = slot.locator('> .beer-stock-warning');
  await expect(slot.locator('> *')).toHaveCount(1); await expect(prompt).toBeVisible();
  await expect(prompt.locator('.guide-line')).toHaveText(copy['onboarding.step.watch_arrive']);
  await expect(prompt.locator('.quick-beer')).toHaveText(new RegExp(`^${copy['stock.quickBeer'].replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '[\\d.,]+')}$`));
  await expect(prompt.locator('.quick-beer')).toBeEnabled();
  await expect(prompt.locator('p.sr-only[role="status"]')).toHaveText(copy['stock.beerLow']); // the prompt's own words, for screen readers
  await expect(page.locator('[data-spotlight]')).toHaveCount(0); // stock left: not the restock spotlight; no hint starts behind the guide
  const fit = await slot.evaluate(el => { const box = el.getBoundingClientRect();
    return [...el.querySelectorAll('*')].filter(x => !x.closest('.sr-only')).map(x => ({ x, b: x.getBoundingClientRect() })).filter(({ b }) => b.height > 0)
      .flatMap(({ x, b }) => [...(b.top < box.top - 0.5 || b.bottom > box.bottom + 0.5 ? [`${x.className || x.tagName} outside the slot`] : []), ...(x.scrollHeight > x.clientHeight + 1 ? [`${x.className || x.tagName} clamped`] : [])]); });
  expect(fit, 'one banner inside the slot, no text clamped').toEqual([]);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await prompt.getByRole('button', { name: copy.skip, exact: true }).click(); // "Bỏ qua" ends the guide; the prompt shows its own words again
  await expect(prompt.locator('.guide-line')).toHaveCount(0); await expect(prompt.getByRole('status')).toHaveText(copy['stock.beerLow']); await expect(prompt.getByRole('status')).toBeVisible();
  expect(errors).toEqual([]);
});

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
