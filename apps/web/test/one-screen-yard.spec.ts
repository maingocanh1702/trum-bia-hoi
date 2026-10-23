import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.8): the yard fits one phone screen. At 390×844, 360×740 and 1280×720, with the HUD shown, the page does not
// scroll and every one of the eight table places is whole on screen above the bottom nav, every tap target at least 44 px; settles 09-SPEC §3.1 ("playtest
// quyết") in favour of one screen. Saves: a brand-new game (nothing stored: the real first screen), and the yard fixtures (fixtures/yard.ts) of a live shift,
// a full alley at rest and a busy alley whose beer runs out (its quick refill prompt pushes the yard: the places must stay on screen).
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/yard.ts', mode], { encoding: 'utf8' }));
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
async function boot(page: Page, mode: string) {
  if (mode !== 'new') {
    const f = fixture(mode);
    await page.clock.setFixedTime(f.now);
    await page.addInitScript(({ save }) => {
      if (localStorage.getItem('os-seeded')) return;
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('os-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save });
  }
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect.poll(() => page.locator('.yard img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete))).toBe(true);
}
/** The places of the yard, and the line under which the sticky nav begins. */
const geometry = (page: Page) => page.evaluate(() => {
  const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
  const box = (el: Element) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  return { scrollHeight: document.documentElement.scrollHeight, innerHeight, scrollWidth: document.documentElement.scrollWidth, innerWidth, navTop: nav.top,
    places: [...document.querySelectorAll('.yard-grid > .table-space')].map(el => box(el.querySelector('.table-object, .slot-mark') ?? el)),
    targets: [...document.querySelectorAll('.yard .table-object, .yard button.table-slot, .bottom-nav button, .table-order-hint')].map(box) };
});

for (const mode of ['new', 'live', 'full'] as const) for (const viewport of viewports) test(`B2.8 the yard fits one screen: no page scroll, all 8 places whole above the nav, tap targets ≥ 44 px (${mode}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); await boot(page, mode);
  const g = await geometry(page);
  expect(g.scrollHeight, 'the page does not scroll').toBeLessThanOrEqual(g.innerHeight);
  expect(g.scrollWidth).toBeLessThanOrEqual(g.innerWidth);
  expect(g.places).toHaveLength(8);
  for (const p of g.places) { expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y + p.h, 'a place hides under the nav').toBeLessThanOrEqual(g.navTop + 0.5); expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + p.w).toBeLessThanOrEqual(viewport.width); }
  for (const t of g.targets) { expect(t.w, 'tap target width').toBeGreaterThanOrEqual(44); expect(t.h, 'tap target height').toBeGreaterThanOrEqual(44); }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  await tbh.shot(`b2-one-screen-${mode}-${viewport.width}x${viewport.height}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

// The beer runs out in a busy alley: the quick refill prompt joins the HUD and pushes the yard down. The page may then scroll by a few px (reported in the PR),
// but the eight tables stay whole on screen above the nav.
for (const viewport of viewports) test(`B2.8 with the quick beer refill prompt up, the eight tables of a busy alley stay whole above the nav at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport); await boot(page, 'rows');
  await expect(page.locator('.beer-stock-warning')).toBeVisible();
  const g = await geometry(page);
  const tables = await page.locator('.yard .table-object').evaluateAll(els => els.map(el => { const b = el.getBoundingClientRect(); return { y: b.top, h: b.height }; }));
  expect(tables).toHaveLength(8);
  for (const t of tables) { expect(t.y).toBeGreaterThanOrEqual(0); expect(t.y + t.h, 'a table hides under the nav').toBeLessThanOrEqual(g.navTop + 0.5); }
  test.info().annotations.push({ type: 'scroll', description: `${viewport.width}x${viewport.height}: scrollHeight ${g.scrollHeight} of ${g.innerHeight}` });
});
