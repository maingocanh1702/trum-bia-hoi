import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.1, serve feedback), through the DOM only; saves from the real engine (fixtures/serve-feedback.ts).
// (c) the tip window is visible: the order card's clock and the bubble's patience bar show the same state, green with "Còn boa" while every guest keeps
// `tip.patienceThreshold` of their own patience and the beer is fresh, then both change together. (d) the first late serve brings one hint, once.
// The pill's reason line and the faces (a, b) are pinned in game.spec.ts `multi-dish service shows the actual ${mode} reward and guest reaction`.
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/serve-feedback.ts', mode], { encoding: 'utf8' }));
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('sf-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('sf-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const cases = [
  ...(['vi', 'en'] as const).flatMap(locale => viewports.map(viewport => ({ at: 'open' as const, locale, viewport }))),
  { at: 'late' as const, locale: 'vi' as const, viewport: viewports[0] }, { at: 'stale' as const, locale: 'vi' as const, viewport: viewports[0] },
];

for (const { at, locale, viewport } of cases) test(`B2.1c the order card's clock and the bubble's bar show the same tip window: ${at === 'open' ? 'open, green with its label' : at === 'late' ? 'closed by the guest\'s own patience' : 'closed by a flat beer while the patience share is still above the threshold'} (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), moments = fixture('window'); await page.setViewportSize(viewport);
  await boot(page, moments[at], locale);
  const bubble = page.locator('.table-space.table-0 .table-order-hint'), track = bubble.locator('.patience-track');
  await bubble.click();
  const card = page.locator('#active-table-order'), clock = card.locator('.order-clock');
  await expect(clock.locator('b')).toHaveText(/\d+/);
  if (at === 'open') {
    await expect(track).toHaveClass(/is-tip/); await expect(track).not.toHaveClass(/is-low/);
    await expect(clock).toHaveClass(/is-tip/); await expect(clock.locator('small')).toHaveText(copy['order.tipOpen']);
    await expect(bubble).toHaveAccessibleDescription(new RegExp(copy['order.tipOpen']));
    expect(await clock.locator('b').evaluate(el => getComputedStyle(el).color)).toBe(await clock.locator('small').evaluate(el => getComputedStyle(el).color)); // one green for the clock and its label
    expect(await axe(page)).toEqual([]);
  } else {
    await expect(track).toHaveClass(/is-low/); await expect(clock).not.toHaveClass(/is-tip/); await expect(clock.locator('small')).toHaveCount(0);
    await expect(bubble).not.toHaveAccessibleDescription(new RegExp(copy['order.tipOpen']));
    if (at === 'stale') await expect(card.locator('.order-warning')).toHaveText(copy['order.stale']); // the reason the window closed, as before
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`b2-tip-${at}-${locale}-${viewport.width}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

for (const locale of ['vi', 'en'] as const) test(`B2.1d the first late serve brings one hint, once: never over a sheet, gone after the tap, not again after reload (${locale}) at 390×844`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = fixture('hint'); expect(f.completedShifts).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, locale);
  const hint = page.locator('.hint');
  await expect(hint).toHaveCount(0); // nothing served yet: no hint
  await page.locator('.table-space.table-0 .table-order-hint').click();
  await page.locator('#active-table-order').getByRole('button', { name: copy['order.serve'], exact: true }).click();
  await expect(page.locator('.toast-gain .gain-reason')).toHaveText(copy['outcome.slow']); // the pill says why (B2.1a) ...
  await expect(page.locator('.table-space.table-0 .customer-reaction')).toHaveText('😐'); // ... and a late serve has the neutral face (B2.1b, the founder's literal scale)
  await expect(hint).toHaveCount(1); await expect(hint).toContainText(copy['hint.tipWindow']); await expect(hint).toHaveAttribute('data-hint', 'tipWindow');
  await expect(page.locator('.guide')).toHaveCount(1); // the hint is the one banner (it shares the step guide's slot)
  const ok = hint.getByRole('button', { name: copy['hint.ok'], exact: true }), box = (await ok.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await axe(page)).toEqual([]);
  await tbh.shot(`b2-hint-tip-window-${locale}.png`);
  // Never over a sheet: a management sheet hides it, closing the sheet brings it back while its moment lasts.
  await page.getByRole('button', { name: copy['nav.stock'], exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(hint).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(hint).toHaveCount(1);
  await ok.click(); await expect(hint).toHaveCount(0);
  // Done once: the last serve is still the late one after a reload, the hint does not come back.
  await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('.table-space.table-0 .customer-reaction')).toHaveText('😐');
  await expect(hint).toHaveCount(0);
  expect(tbh.consoleErrors()).toEqual([]);
});
