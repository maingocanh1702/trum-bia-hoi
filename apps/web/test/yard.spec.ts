import { test, expect } from './tbh-fixture';
import type { Locator, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// S6 (plan S6 row, P0 P4; HANDOFF section 11: eight tables of two chairs at 360 px): the yard draws every place of the location (`locations.list[].tableSlots`,
// 8 in JSON 2.1.0), each bought table by its level (table-lv1..4), one or two chairs by the chairs owned, the chair art by the chair level (the plastic stool,
// "ghế tựa nhựa", "ghế gỗ đệm") and a tray of as many dishes as the level allows; an unbought place is an empty spot. DOM only, saves from the real engine.
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/yard.ts', mode], { encoding: 'utf8' }));
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const CHAIR_ART = ['chair-plastic', 'chair-backrest', 'chair-cushion'];
async function boot(page: Page, locale: string, mode: string, reducedMotion = false) {
  const f = fixture(mode), copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('yard-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('yard-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, { save: f.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const t = (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  return { f, t };
}
const boxes = async (items: Locator) => Promise.all((await items.all()).map(async el => (await el.boundingBox())!));
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Every image the yard shows is really decoded (a missing sprite would be an empty placeholder box, caught by the src checks below). Polled: images decode after
 *  mount, and one early sample raced them (red 3 in 6 under --repeat-each once the A3 note got shorter, 2026-10-22); a sprite that never loads still fails. */
const loaded = (page: Page, scope: string) => page.locator(`${scope} img`).evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0));

for (const viewport of viewports) test(`S6 a full first alley: eight tables of two chairs fit the yard, each drawn by its table level, chair level and tray, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const { f, t } = await boot(page, 'vi', 'full');
  expect(f.slots).toBe(8); expect(f.tables).toHaveLength(8);
  const yard = page.locator('.yard'); await expect(yard).toHaveAttribute('data-slots', '8');
  await expect(yard.locator('.table-space')).toHaveCount(8); await expect(yard.locator('.table-slot')).toHaveCount(0); // every place is a table: no empty spot
  await expect(yard.locator('.table-object')).toHaveCount(8); await expect(yard.locator('.seat')).toHaveCount(16);
  for (const [i, table] of (f.tables as { seats: number; level: number; chairLevel: number; dishes: number }[]).entries()) {
    const space = yard.locator(`.table-space.table-${i}`), object = space.locator('.table-object');
    await expect(object).toHaveAttribute('data-level', String(table.level)); await expect(space).toHaveAttribute('data-chair-level', String(table.chairLevel));
    await expect(object.locator('> img.sprite')).toHaveAttribute('src', new RegExp(`table-lv${table.level}-`)); // the table sprite follows the level
    await expect(space.locator('.seat')).toHaveCount(table.seats);
    for (const seat of await space.locator('.seat img.sprite').all()) await expect(seat).toHaveAttribute('src', new RegExp(CHAIR_ART[table.chairLevel - 1])); // the chair art follows the chair level
    await expect(space.locator('.tray')).toHaveAttribute('data-dishes', String(table.dishes)); await expect(space.locator('.tray .sprite')).toHaveCount(table.dishes);
    await expect(space.locator('.table-caption')).toContainText(t('table.tray', { n: table.dishes }));
  }
  // Every level of both ladders and every tray size is on the yard at once (the fixture spreads them over the eight tables).
  expect(new Set(f.tables.map((x: { level: number }) => x.level))).toEqual(new Set([1, 2, 3, 4])); expect(new Set(f.tables.map((x: { chairLevel: number }) => x.chairLevel))).toEqual(new Set([1, 2, 3]));
  expect(new Set(f.tables.map((x: { dishes: number }) => x.dishes))).toEqual(new Set([2, 3]));
  await expect.poll(() => loaded(page, '.yard')).toBe(true);
  // Layout: no horizontal scroll, every table target at least 44 px and inside the viewport, no two tables overlapping (HANDOFF section 11: eight at 360 px).
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const objects = await boxes(yard.locator('.table-object'));
  for (const box of objects) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); }
  for (let a = 0; a < objects.length; a++) for (let b = a + 1; b < objects.length; b++) expect(overlaps(objects[a], objects[b]), `tables ${a + 1} and ${b + 1} overlap`).toBe(false);
  await expect(page.locator('[data-spotlight]')).toHaveCount(0); // a resting shop with nothing to tap: nothing blinks (P0: at most one thing ever does)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
  // Review 07 r1 (W4): the fixture has played one shift, so no "Quán nhỏ đã sẵn sàng" note covers the grid: the screenshot shows the eight tables themselves.
  await expect(page.locator('.opening-note')).toHaveCount(0);
  await page.locator('.yard').scrollIntoViewIfNeeded(); await tbh.shot(`yard-full-${viewport.width}.png`);
  expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
});

for (const locale of ['vi', 'en'] as const) test(`S6 a new shop shows its one table and seven empty places, the tray of a solo table and the plastic stool (${locale}) at 390×844`, async ({ page, tbh }) => {
  await page.setViewportSize(viewports[0]);
  const { f, t } = await boot(page, locale, 'fresh');
  expect(f.tables).toEqual([{ seats: 1, level: 1, chairLevel: 1, dishes: 1 }]);
  const yard = page.locator('.yard');
  await expect(yard.locator('.table-object')).toHaveCount(1); await expect(yard.locator('.seat')).toHaveCount(1);
  await expect(yard.locator('.table-slot')).toHaveCount(7); await expect(yard.locator('.table-slot').first()).toHaveAccessibleName(t('yard.slot'));
  await expect(yard.locator('.table-slot img')).toHaveCount(0); // an empty spot invents no art
  await expect(yard.locator('.table-0 .seat img.sprite')).toHaveAttribute('src', /chair-plastic/);
  await expect(yard.locator('.table-0 .tray')).toHaveAttribute('data-dishes', '1'); await expect(yard.locator('.table-0 .table-caption')).toContainText(t('table.tray', { n: 1 }));
  await expect.poll(() => loaded(page, '.yard')).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  await tbh.shot(`yard-fresh-${locale}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

// Review 07 r1 (W1 follow-up): at rest the "Quán nhỏ đã sẵn sàng" note hangs from the top of the yard with the height of its text, so its "Mở ca" button
// did not move with the height of the grid; centred, it had slid under the sticky bottom nav (axe target-size at 1280×720, under the nav at 360×740).
// Founder 2026-10-22 (A3): exactly one "Mở ca" on screen. With the bottom nav shown the note keeps its text, has no button of its own and points down at the
// nav's, which is the one "Mở ca" of the page: whole on screen, its corners and centre its own, at least 44 px, in the thumb zone (the bottom third of the
// screen), in both languages. A pin that still hides the nav keeps the note's button: first-shift-visual.spec.ts `A3 a save pinned to 2.1.1 …`.
for (const locale of ['vi', 'en'] as const) for (const viewport of viewports) test(`A3 at rest exactly one Mở ca is on screen, the bottom nav's: whole, uncovered and in the thumb zone, and the opening note points at it (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const { t } = await boot(page, locale, 'fresh');
  const note = page.locator('.opening-note'), button = page.getByRole('button', { name: t('nav.shift'), exact: true }); // strict: one button of that name on the page
  await expect(note).toBeVisible(); await expect(page.locator('.bottom-nav')).toBeVisible(); // the HUD and the nav are shown: the rest screen of a new shop
  await expect(note.locator('h2')).toHaveText(t('rest.title')); await expect(note).toContainText(t('rest.copy')); await expect(note).toContainText(t('rest.free')); // the note keeps its text
  await expect(note.getByRole('button')).toHaveCount(0);
  await expect(note.locator('.start-below')).toHaveText(t('rest.startBelow', { button: t('nav.shift') })); await expect(note.locator('.start-below b')).toHaveText(t('nav.shift'));
  await expect(button).toHaveCount(1); await expect(page.locator('.bottom-nav').getByRole('button', { name: t('nav.shift'), exact: true })).toHaveCount(1);
  await expect(button).toBeInViewport({ ratio: 1 });
  const box = (await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y, 'the button sits in the bottom third of the screen').toBeGreaterThanOrEqual(viewport.height * 2 / 3);
  const covered = await button.evaluate(el => {
    // the nav's buttons are rounded (13 px): a corner probe sits that far in along the diagonal, inside the painted button, not on the nav behind its corner
    const b = el.getBoundingClientRect(), d = Math.max(3, Math.ceil(parseFloat(getComputedStyle(el).borderTopLeftRadius) * (1 - Math.SQRT1_2)) + 1);
    return [[b.left + d, b.top + d], [b.right - d, b.top + d], [b.left + d, b.bottom - d], [b.right - d, b.bottom - d], [b.left + b.width / 2, b.top + b.height / 2]]
      .filter(([x, y]) => !el.contains(document.elementFromPoint(x, y))).length;
  });
  expect(covered, 'points of the start button painted over by another element').toBe(0);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`yard-rest-note-${locale}-${viewport.width}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

// A live shift (fixture `live`: two one-chair tables in the first row, a ready order and its bubble, which carries the one spotlight): the bubble of a
// first-row table rises into the band the grid keeps above its rows and never covers the keg's numbers or the door band. Founder 2026-10-22 (B2.3): the beer
// line (S2's one set of numbers, which this test guarded until then) repeated the keg badge, the stock strip and the glass counter and is for screen readers only.
for (const viewport of viewports) test(`S6 on a live shift the order bubble of a first-row table stays below the keg's numbers and the door band, and one thing blinks, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const { f } = await boot(page, 'vi', 'live');
  expect(f.readyTable).toBeLessThan(2); // a table of the first row
  const bubble = page.locator(`.table-space.table-${f.readyTable} .table-order-hint`); await expect(bubble).toHaveClass(/is-ready/);
  await expect(page.locator('[data-spotlight]')).toHaveCount(1); await expect(bubble).toHaveAttribute('data-spotlight', ''); // P0: the ready order is the one thing that blinks
  await expect(page.locator('#beer-supply-status')).toHaveClass(/sr-only/);
  const [hint, keg, door, grid] = await Promise.all([bubble.boundingBox(), page.locator('.equipment-object.keg .capacity-badge').boundingBox(), page.locator('.yard-door').boundingBox(), page.locator('.yard-grid').boundingBox()]);
  expect(hint && keg && door && grid).toBeTruthy();
  expect(overlaps(hint!, keg!), 'the bubble covers the keg\'s numbers').toBe(false);
  expect(hint!.y).toBeGreaterThanOrEqual(door!.y + door!.height - 1); // below the door band, which stays free for the queue
  expect(hint!.y).toBeGreaterThanOrEqual(grid!.y - 1); // inside the band the grid keeps above its first row
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`yard-live-${viewport.width}.png`); expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
});

// Review 07 r1 (W1): a busy alley (fixture `rows`: eight tables of two chairs, an open shift, an unserved order at every table) hangs an order bubble and
// its patience track above every table. A bubble of row 2 or below rises into the band its row keeps free and never covers the caption (state, countdown,
// "n chỗ · Mâm m món": the cue "Mời về" relies on) or the drawing of another table, on a phone's two columns and on a wide screen's three.
for (const viewport of viewports) test(`S6 a busy alley: the order bubbles of every row cover no other table's caption or drawing, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const { f } = await boot(page, 'vi', 'rows');
  const yard = page.locator('.yard'), open = f.openTables as number[];
  expect(f.tables).toHaveLength(8); expect(open).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  await expect(yard.locator('.table-order-hint')).toHaveCount(open.length);
  const tops = (await boxes(yard.locator('.table-object'))).map(b => Math.round(b.y)), rows = [...new Set(tops)].sort((a, b) => a - b), rowOf = (i: number) => rows.indexOf(tops[i]);
  expect(rows).toHaveLength(viewport.width < 640 ? 4 : 3); // four rows of two on a phone, three rows of three on a wide screen
  expect(new Set(open.filter(i => rowOf(i) >= 1).map(rowOf)).size).toBeGreaterThanOrEqual(2); // the subject: bubbles in rows 2 and 3 (and 4 on a phone)
  for (const i of open) {
    const hint = yard.locator(`.table-space.table-${i} .table-order-hint`), track = hint.locator('.patience-track');
    const parts = [(await hint.boundingBox())!, ...(await track.count() ? [(await track.boundingBox())!] : [])];
    for (let j = 0; j < f.tables.length; j++) if (j !== i) for (const target of ['.table-caption', '.table-object']) {
      const box = (await yard.locator(`.table-space.table-${j} ${target}`).boundingBox())!;
      for (const part of parts) expect(overlaps(part, box), `the bubble of table ${i + 1} (row ${rowOf(i) + 1}) covers the ${target} of table ${j + 1} (row ${rowOf(j) + 1})`).toBe(false);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.yard').scrollIntoViewIfNeeded(); await tbh.shot(`yard-rows-${viewport.width}.png`); expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
});

// Review 07 r1 (W1, second look): the tallest caption is a lingering table's, whose guest label, state and enjoy countdown (the cue "Mời về" relies on) hang
// about 21 px below its space. Fixture `linger-rows`: "lai rai" pairs sipping their served trays (tables 1-3 and 5-6) right above tables whose order is open
// (4, 7, 8), on a phone's two columns (4 under 2, 7-8 under 5-6) and on a wide screen's three (4 under 1, 8 under 5). No bubble or patience track of a lower
// row covers the caption or the drawing of another table. The old 31 px gap cleared only tables that wait for their order: it fails here by 10 px.
for (const viewport of viewports) test(`S6 a busy alley under lingering tables: no order bubble covers the label, state or countdown of the table above, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const { f } = await boot(page, 'vi', 'linger-rows');
  const yard = page.locator('.yard'), open = f.openTables as number[], lingering = f.lingering as number[];
  expect(f.tables).toHaveLength(8); expect(lingering).toEqual([0, 1, 2, 4, 5]); expect(open).toEqual([3, 6, 7]);
  for (const i of lingering) {
    const space = yard.locator(`.table-space.table-${i}`);
    await expect(space.locator('.guest-label')).toHaveCount(1); await expect(space.locator('.enjoy-time')).toHaveCount(1); // the three-line caption
  }
  await expect(yard.locator('.table-order-hint')).toHaveCount(open.length);
  const tops = (await boxes(yard.locator('.table-object'))).map(b => Math.round(b.y)), rows = [...new Set(tops)].sort((a, b) => a - b), rowOf = (i: number) => rows.indexOf(tops[i]);
  const xs = (await boxes(yard.locator('.table-object'))).map(b => Math.round(b.x)), above = (i: number) => tops.findIndex((y, j) => xs[j] === xs[i] && rowOf(j) === rowOf(i) - 1);
  expect(open.filter(i => lingering.includes(above(i))).length).toBeGreaterThanOrEqual(2); // the subject: open orders right under lingering captions
  for (const i of open) {
    const hint = yard.locator(`.table-space.table-${i} .table-order-hint`), track = hint.locator('.patience-track');
    const parts = [(await hint.boundingBox())!, ...(await track.count() ? [(await track.boundingBox())!] : [])];
    for (let j = 0; j < f.tables.length; j++) if (j !== i) for (const target of ['.table-caption', '.table-object']) {
      const box = (await yard.locator(`.table-space.table-${j} ${target}`).boundingBox())!;
      for (const part of parts) expect(overlaps(part, box), `the bubble of table ${i + 1} (row ${rowOf(i) + 1}) covers the ${target} of table ${j + 1} (row ${rowOf(j) + 1})`).toBe(false);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.yard').scrollIntoViewIfNeeded(); await tbh.shot(`yard-linger-rows-${viewport.width}.png`); expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
});

test('S6 reduced motion: the live yard animates (the spotlight pulse) without it and not at all with it, while the static cues (chairs, tray, spots) stay', async ({ page, tbh }) => {
  await page.setViewportSize(viewports[1]);
  await boot(page, 'vi', 'live');
  const running = () => page.evaluate(() => document.querySelector('.yard')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
  await expect(page.locator('.yard [data-spotlight]')).toHaveCount(1); expect(await running()).toBeGreaterThan(0); // the spotlight pulse runs without the preference
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(running).toBe(0); // with it nothing in the yard moves
  await expect(page.locator('.yard [data-spotlight]')).toHaveCount(1); await expect(page.locator('.yard .seat')).toHaveCount(2); await expect(page.locator('.yard .tray')).toHaveCount(2); await expect(page.locator('.yard .table-slot')).toHaveCount(6); // the static cues stay
  expect(tbh.consoleErrors()).toEqual([]);
});
