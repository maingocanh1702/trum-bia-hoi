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

// A banner in the bottom dock (a hint here; the step guide and the closing line share the dock) needs 52 px the one-screen yard does not have at 360×740 and
// 1280×720 (its yard is already at its least height): the page then scrolls by that much, and the banner must stay whole above the nav, its button its own at
// the corners and the centre (axe target-size: the nav used to cover it), and the eight places whole above the banner. Save: fixtures/hints.ts `slot`
// (onboarding on, the wallet pays table 2, so the slot hint is up).
for (const viewport of viewports) test(`B2.8 a hint banner stays whole above the nav, its button uncovered, the eight places whole above it, axe 0, at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
  const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/hints.ts', 'slot'], { encoding: 'utf8' }));
  await page.setViewportSize(viewport); await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save }) => {
    if (localStorage.getItem('os-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('os-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', guideDone: true, guideIndex: null, muted: true }));
  }, { save: f.save });
  await page.goto('/'); const banner = page.locator('.bottom-dock > .guide.hint'); await expect(banner).toHaveAttribute('data-hint', 'slot');
  await expect.poll(() => page.locator('.yard img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete))).toBe(true);
  const g = await geometry(page), b = (await banner.boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height, 'the banner hides under the nav').toBeLessThanOrEqual(g.navTop + 0.5);
  // its centre and the middle of each edge (2 px in: the rounded corners are not the button's own pixels) hit the button, not the nav or the yard
  expect(await banner.locator('button').evaluate(el => { const r = el.getBoundingClientRect(), own = (x: number, y: number) => el.contains(document.elementFromPoint(x, y)), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    return r.height >= 44 && own(cx, cy) && own(cx, r.y + 2) && own(cx, r.bottom - 2) && own(r.x + 2, cy) && own(r.right - 2, cy); }), 'the banner\'s button is whole and its own').toBe(true);
  expect(g.places).toHaveLength(8);
  for (const p of g.places) expect(p.y + p.h, 'a place hides under the banner').toBeLessThanOrEqual(b.y + 0.5);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  test.info().annotations.push({ type: 'scroll', description: `${viewport.width}x${viewport.height}: scrollHeight ${g.scrollHeight} of ${g.innerHeight} with the banner` });
  await tbh.shot(`b2-one-screen-hint-${viewport.width}x${viewport.height}.png`); expect(tbh.consoleErrors()).toEqual([]);
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
