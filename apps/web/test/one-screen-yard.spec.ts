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
// repo's engine fixtures (fixtures/yard.ts, fixtures/hints.ts, fixtures/kitchen.ts, fixtures/service-states.ts, fixtures/quick-chair.ts, fixtures/weather-row.ts). Review B2-r2: also
// the fallback step guide with the beer low, the well-rested chip, a wide font (no slot text cut, the weather row one row), and the keyboard ring in the slot.
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
  // Review B2-r2: the fallback step guide with the beer low; the one-tap prompt keeps the slot (its refill on screen), the guide's line joins it, Bỏ qua stays
  'guide, empty keg': { at: () => fx('hints', 'empty'), message: '.beer-stock-warning:has(.guide-line)', settings: { guideDone: false, guideIndex: 1 } },
  'guide, low beer': { at: () => fx('hints', 'low'), message: '.beer-stock-warning:has(.guide-line)', settings: { guideDone: false, guideIndex: 1 } },
  // Review B2-r2: the well-rested chip in the weather row (it wrapped the row with a wide font), a live shift, no hint
  rested: { at: () => fx('service-states', 'rested'), message: null, settings: { hintsDone: ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'] } },
  // Review B2-r3: the longest weather row: the rested chip beside the heavy rush ("Sắp tới · Giờ Vàng đông khách") and the longest weather name (fixtures/weather-row.ts)
  'heavy rush, rested': { at: () => fx('weather-row', 'next'), message: null, settings: { hintsDone: ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'] } },
};
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
// Review B2-r2 / Linux CI: also with a deliberately wide font (DejaVu Sans, else Verdana, + letter-spacing), the family Linux renders and Windows never sees.
const wideFont = '*, *::before, *::after { font-family: "DejaVu Sans", Verdana, sans-serif !important; letter-spacing: .03em !important; }';
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

for (const [state, s] of Object.entries(states)) for (const locale of ['vi', 'en'] as const) for (const font of ['app', 'wide'] as const) for (const viewport of viewports) test(`B2.8 the yard fits one screen: no page scroll, all 8 places whole above the nav, tap targets ≥ 44 px, no slot text cut (${state}, ${locale}${font === 'wide' ? ', wide font' : ''}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); await boot(page, s.at(), locale, s.settings);
  if (font === 'wide') await page.addStyleTag({ content: wideFont });
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
  // Review B2-r2: no text of the slot is clamped or cut (its words fit the 48 px slot), and the weather row stays one row high.
  const cut = await slot.evaluate(el => [...el.querySelectorAll('*')].filter(x => !x.closest('.sr-only') && (x as HTMLElement).offsetParent !== null && x.clientWidth > 0 && (x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1)).map(x => `${x.className || x.tagName}: "${(x.textContent ?? '').trim().slice(0, 40)}"`));
  expect(cut, 'no slot text clamped or cut, in every font').toEqual([]); // review B2-r3: the long guide line has a short form beside the refill (App.tsx `guideJoined`)
  expect((await page.locator('.weather-row').boundingBox())!.height, 'the weather row is one row').toBeLessThanOrEqual(31);
  // Review B2-r3: the weather's name is never cut (one ☀ stands for sunny, hot, humid and cold); the rush pill gives the room instead
  expect(await page.locator('.weather-name').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'the weather name is whole').toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  await tbh.shot(`b2-one-screen-${state.replace(/[ ,]+/g, '-')}-${locale}${font === 'wide' ? '-wide' : ''}-${viewport.width}x${viewport.height}.png`); expect(tbh.consoleErrors()).toEqual([]);
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

// Review B2-r2: the slot clips what sticks out of its 48 px (overflow: hidden), so the keyboard ring of every button it holds is drawn inside the button:
// the refill (lit by the restock spotlight here) and the guide's "Bỏ qua" beside it, the guide banner's "Bỏ qua", a hint's "Đã hiểu", the quick chair.
const ringStates: [string, Fixture | (() => Fixture), Record<string, unknown>, string[]][] = [
  ['guide, empty keg', () => fx('hints', 'empty'), { guideDone: false, guideIndex: 1 }, ['.quick-beer', '.guide-skip']],
  ['guide', null, { guideDone: false, guideIndex: 0 }, ['.guide > .guide-skip']], ['hint', () => fx('hints', 'slot'), {}, ['.guide.hint > button']],
  ['quick chair', () => fx('quick-chair', 'ready'), {}, ['.quick-chair > button']],
];
for (const [state, at, settings, buttons] of ringStates) for (const viewport of viewports) test(`B2.8 a slot button's keyboard ring stays inside the slot (${state}) at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport); await boot(page, typeof at === 'function' ? at() : at, 'vi', settings);
  await page.keyboard.press('Tab'); // keyboard modality: focus() below shows the :focus-visible ring
  for (const selector of buttons) {
    const button = page.locator(`.message-slot ${selector}`); await button.focus();
    const ring = await button.evaluate(el => { const b = el.getBoundingClientRect(), s = el.closest('.message-slot')!.getBoundingClientRect(), cs = getComputedStyle(el), grow = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
      return { visible: el.matches(':focus-visible') && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, inside: b.top - grow >= s.top - 0.5 && b.bottom + grow <= s.bottom + 0.5 && b.left - grow >= s.left - 0.5 && b.right + grow <= s.right + 0.5 }; });
    expect(ring, `${selector}: a visible ring, inside the slot`).toEqual({ visible: true, inside: true });
  }
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
