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
/** Every image the yard shows is really decoded (a missing sprite would be an empty placeholder box, caught by the src checks below). */
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
  expect(await loaded(page, '.yard')).toBe(true);
  // Layout: no horizontal scroll, every table target at least 44 px and inside the viewport, no two tables overlapping (HANDOFF section 11: eight at 360 px).
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const objects = await boxes(yard.locator('.table-object'));
  for (const box of objects) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); }
  for (let a = 0; a < objects.length; a++) for (let b = a + 1; b < objects.length; b++) expect(overlaps(objects[a], objects[b]), `tables ${a + 1} and ${b + 1} overlap`).toBe(false);
  await expect(page.locator('[data-spotlight]')).toHaveCount(0); // a resting shop with nothing to tap: nothing blinks (P0: at most one thing ever does)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
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
  expect(await loaded(page, '.yard')).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(axe.violations).toEqual([]);
  await tbh.shot(`yard-fresh-${locale}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

test('S6 with reduced motion nothing in the yard animates, and the static cues (chairs, tray, empty spots) stay', async ({ page, tbh }) => {
  await page.setViewportSize(viewports[1]);
  await boot(page, 'vi', 'full', true);
  await expect(page.locator('.yard .table-object')).toHaveCount(8);
  expect(await page.evaluate(() => document.querySelector('.yard')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  await expect(page.locator('.yard .seat')).toHaveCount(16); await expect(page.locator('.yard .tray')).toHaveCount(8);
  expect(tbh.consoleErrors()).toEqual([]);
});
