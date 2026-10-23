import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.8): the yard fits one phone screen, all eight table places visible, every tap target at least 44 px; settles
// 09-SPEC §3.1 ("playtest quyết") in favour of one screen. Founder 2026-10-23, answering the B2.8 STOP clause: "Thêm một lượt cho đầu game" — with the HUD
// shown the early-game page is exactly one screen at 390×844, 360×740 and 1280×720 in every message state too: the one-tap beer prompt, a hint banner, the
// first-screen step guide, the closing line, and the stock hint with the beer prompt (merged into one control). Every message takes turns in one slot above
// the nav whose height is always reserved, so the page never scrolls and the tables never resize (reference-layout.css `.message-slot`). Through the DOM only,
// in vi and en; every place's centre is its own (on the first screen the opening note is the one allowed cover). Saves: none (a brand-new game) or the
// repo's engine fixtures (fixtures/yard.ts, fixtures/hints.ts, fixtures/kitchen.ts).
const fx = (file: string, mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', `apps/web/test/fixtures/${file}.ts`, mode], { encoding: 'utf8' }));
type Fixture = { save: string; now: number } | null;
const states: Record<string, { at: () => Fixture; message: string | null; settings?: Record<string, unknown> }> = {
  new: { at: () => null, message: null }, // nothing stored: the real first screen
  guide: { at: () => null, message: '.guide:not(.hint)', settings: { guideDone: false, guideIndex: 0 } }, // the first screen with the step guide up
  live: { at: () => fx('yard', 'live'), message: null },
  full: { at: () => fx('yard', 'full'), message: null }, // eight tables at rest
  prompt: { at: () => fx('yard', 'rows'), message: '.beer-stock-warning' }, // a busy alley whose beer runs out: the one-tap prompt
  hint: { at: () => fx('hints', 'slot'), message: '.guide.hint' }, // a hint banner (onboarding on, the wallet pays table 2)
  'stock hint': { at: () => fx('hints', 'stock'), message: '.beer-stock-warning:has(.hint-line)' }, // the stock hint inside the beer prompt: one control
  closing: { at: () => fx('yard', 'closing'), message: '.status-line' }, // the player closed the shift, a guest still waits
  'closing, low beer': { at: () => fx('yard', 'closing-low'), message: '.beer-stock-warning:has(.closing-line)' }, // the prompt keeps the slot, the closing line joins it
};
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
async function boot(page: Page, at: Fixture, locale: string, settings: Record<string, unknown> = {}) {
  if (at) await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('os-seeded')) return;
    if (save) localStorage.setItem('tbh.save.v1', save);
    localStorage.setItem('os-seeded', '1'); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs));
  }, { save: at?.save ?? null, prefs: { locale, guideDone: true, guideIndex: null, muted: true, ...settings } });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect.poll(() => page.locator('.yard img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete))).toBe(true);
}
/** The page's size, the dock (message slot + nav) and each place: its box and whether its centre is its own (or the allowed opening note's). */
const geometry = (page: Page) => page.evaluate(() => {
  const box = (el: Element) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const places = [...document.querySelectorAll('.yard-grid > .table-space')].map(space => {
    const el = space.querySelector('.table-object, .slot-mark') ?? space, b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { ...box(el), own: space.contains(hit), note: !!hit?.closest('.opening-note') };
  });
  return { scrollHeight: document.documentElement.scrollHeight, innerHeight, scrollWidth: document.documentElement.scrollWidth, innerWidth,
    dockTop: document.querySelector('.bottom-dock')!.getBoundingClientRect().top, places,
    targets: [...document.querySelectorAll('.yard .table-object, .yard button.table-slot, .bottom-nav button, .table-order-hint, .message-slot button')].map(box) };
});

for (const [state, s] of Object.entries(states)) for (const locale of ['vi', 'en'] as const) for (const viewport of viewports) test(`B2.8 the yard fits one screen: no page scroll, all 8 places whole above the nav, tap targets ≥ 44 px (${state}, ${locale}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); await boot(page, s.at(), locale, s.settings);
  const slot = page.locator('.message-slot');
  if (s.message) { await expect(slot.locator(`> ${s.message}`)).toBeVisible(); await expect(slot.locator('> *')).toHaveCount(1); } // exactly one message, in its slot
  else await expect(slot.locator('> *')).toHaveCount(0);
  const g = await geometry(page);
  expect(g.scrollHeight, 'the page does not scroll').toBeLessThanOrEqual(g.innerHeight + 1);
  expect(g.scrollWidth).toBeLessThanOrEqual(g.innerWidth);
  expect(g.places).toHaveLength(8);
  for (const [i, p] of g.places.entries()) {
    expect(p.y).toBeGreaterThanOrEqual(0); expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + p.w).toBeLessThanOrEqual(viewport.width);
    expect(p.y + p.h, `place ${i + 1} reaches the message slot or the nav`).toBeLessThanOrEqual(g.dockTop + 0.5);
    expect(p.own || (state === 'new' || state === 'guide') && p.note, `the centre of place ${i + 1} is covered`).toBe(true);
  }
  for (const t of g.targets) { expect(t.w, 'tap target width').toBeGreaterThanOrEqual(44); expect(t.h, 'tap target height').toBeGreaterThanOrEqual(44); }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  await tbh.shot(`b2-one-screen-${state.replace(/[ ,]+/g, '-')}-${locale}-${viewport.width}x${viewport.height}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

// No layout shift (founder 2026-10-23, (e)): on a desktop the tables are height-bound, so a message that took height from the yard would resize all eight.
// The slot is reserved: the tables keep their size when the closing line comes, and a busy alley has the same tables with and without the beer prompt.
for (const viewport of viewports) test(`B2.8 a message coming or going never resizes the tables at ${viewport.width}×${viewport.height}`, async ({ browser }) => {
  const size = async (mode: string) => {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    await boot(page, fx('yard', mode), 'vi');
    const b = (await page.locator('.yard .table-object').first().boundingBox())!; await context.close(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10];
  };
  expect(await size('closing'), 'the closing line').toEqual(await size('live'));
  expect(await size('rows'), 'the beer prompt (a busy alley of eight tables)').toEqual(await size('full'));
});

// Out of the early-game target (founder 2026-10-23): a stall with the kitchen keeps its classic arrangement and the page scrolls by a measured, accepted
// amount; this pins it so a later change cannot silently make it worse (the measurement matrix is in the B2 PR body §9).
const kitchenResidual: Record<string, number> = { '390x844': 0, '360x740': 52, '1280x720': 65 }; // measured 0 / 50 / 63 px on the second pass, + 2 px for fonts
for (const viewport of viewports) test(`B2.8 a stall with the kitchen scrolls by at most its accepted residual at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport); await boot(page, fx('kitchen', 'live'), 'vi', { hintsDone: ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'] });
  await expect(page.locator('.equipment-object.kitchen')).toBeVisible();
  const g = await geometry(page);
  expect(g.scrollHeight - g.innerHeight, 'the accepted residual scroll of the classic stall').toBeLessThanOrEqual(kitchenResidual[`${viewport.width}x${viewport.height}`]);
  expect(g.scrollWidth).toBeLessThanOrEqual(g.innerWidth);
});
