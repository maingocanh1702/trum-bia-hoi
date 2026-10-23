import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { readSave } from './storage';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.4): tapping an empty table place opens the same buy card as the Upgrades sheet's item for the next table
// (price, what it gives, why it is dimmed) and pauses like every management sheet; buying from it puts the table in the yard. DOM only, engine-made saves
// (fixtures/slot-buy.ts); a pin that still hides the Upgrades button keeps the place a picture (fixtures/first-shift-visual.ts `pin-2.1.1`).
const fixture = (file: string, mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', `apps/web/test/fixtures/${file}.ts`, mode], { encoding: 'utf8' }));
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
const inspect = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/yard.ts', 'inspect'], { encoding: 'utf8', input: JSON.stringify({ save }) }));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('sb-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('sb-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];

for (const locale of ['vi', 'en'] as const) for (const viewport of viewports) test(`B2.4 tapping an empty table place opens the next table's buy card, paused like the Upgrades sheet, and buying puts the table there (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = fixture('slot-buy', 'afford'), xu = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  expect(f.phase).toBe('open'); expect(f.tables).toBe(1);
  await page.setViewportSize(viewport); await boot(page, f, locale);
  const places = page.locator('.yard .table-slot');
  await expect(places).toHaveCount(f.slots - 1);
  const place = places.nth(2); await expect(place).toHaveAccessibleName(copy['yard.slot']);
  const box = (await place.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  // The Upgrades sheet's card for the next table, as the reference.
  await page.getByRole('button', { name: copy['nav.upgrades'], exact: true }).click();
  const reference = (await page.getByRole('dialog').locator('.buy-card[data-goal="buyTable"]').innerText()).trim();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await place.click();
  const sheet = page.getByRole('dialog', { name: copy['goal.buyTable'], exact: true });
  await expect(sheet).toBeVisible(); await expect(sheet.locator('.sheet-pause')).toContainText(copy['pause.menu']); await expect(page.locator('.game')).toHaveClass(/is-paused/);
  const card = sheet.locator('.buy-card[data-goal="buyTable"]');
  await expect(card.locator('.goal-effect')).toHaveText(fill(copy['goal.fx.seatsAdded'], { n: 1 })); // what it gives
  const buy = card.getByRole('button', { name: fill(copy['upgrade.buyTable'], { cost: xu(f.price) }), exact: true }); // the price
  await expect(buy).toBeEnabled(); await expect(card.locator('.buy-reason')).toHaveCount(0);
  expect((await card.innerText()).trim()).toBe(reference); // the same card as the Upgrades sheet's item
  expect(await axe(page)).toEqual([]);
  await tbh.shot(`b2-slot-buy-${locale}-${viewport.width}.png`);
  await buy.click();
  await expect(page.getByRole('dialog')).toHaveCount(0); // bought: the sheet closes on the yard
  await expect(page.locator('.yard .table-object')).toHaveCount(2); await expect(places).toHaveCount(f.slots - 2);
  await expect(page.locator('.money strong')).toHaveText(xu(f.coins - f.price));
  await expect.poll(async () => inspect(await readSave(page)).tables.length).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(tbh.consoleErrors()).toEqual([]);
});

test('B2.4 a short wallet: the place opens the same card, dimmed with its one reason', async ({ page, tbh }) => {
  const copy = copyOf('vi');
  await page.setViewportSize(viewports[0]); await boot(page, fixture('slot-buy', 'short'), 'vi');
  await page.locator('.yard .table-slot').first().click();
  const card = page.getByRole('dialog', { name: copy['goal.buyTable'], exact: true }).locator('.buy-card[data-goal="buyTable"]');
  const buy = card.getByRole('button'); await expect(buy).toBeDisabled();
  await expect(card.locator('.buy-reason')).toHaveText(copy['reason.notEnoughCoins']); await expect(buy).toHaveAccessibleDescription(copy['reason.notEnoughCoins']);
  expect(await axe(page)).toEqual([]);
  await tbh.shot('b2-slot-buy-short-vi.png'); expect(tbh.consoleErrors()).toEqual([]);
});

test('B2.4 at rest the place opens the card too, and buying works between shifts', async ({ page }) => {
  const copy = copyOf('vi'), rest = fixture('slot-buy', 'rest'); expect(rest.phase).toBe('resting');
  await page.setViewportSize(viewports[0]); await boot(page, rest, 'vi');
  await page.locator('.yard .table-slot').first().click();
  const buy = page.getByRole('dialog', { name: copy['goal.buyTable'], exact: true }).locator('.buy-card[data-goal="buyTable"]').getByRole('button');
  await expect(buy).toBeEnabled(); await buy.click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.yard .table-object')).toHaveCount(2);
});

test('B2.4 a save pinned to 2.1.1 with no shift played still hides the Upgrades button, so its empty places stay pictures', async ({ page }) => {
  const f = fixture('first-shift-visual', 'pin-2.1.1'); expect(f.version).toBe('2.1.1');
  await page.setViewportSize(viewports[0]); await boot(page, f, 'vi');
  await expect(page.locator('.bottom-nav')).toHaveCount(0);
  await expect(page.locator('.yard .table-slot').first()).toHaveAttribute('role', 'img');
  await expect(page.locator('.yard button.table-slot')).toHaveCount(0);
});
