import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { readSave, waitSaved } from './storage';

// S6 (plan D10, S6 row "mua ghế giữa ca không dừng đồng hồ ca"): the quick "Mua ghế" button on the HUD buys the second chair of the registry's next goal
// with ONE tap, no sheet, and the shift clock keeps running — the pattern of the quick beer refill (quick-beer-stock.spec.ts). DOM only; the save is read
// back through the real engine (fixtures/quick-chair.ts).
const fixture = (mode = 'ready', save?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/quick-chair.ts', mode], { encoding: 'utf8', input: save }));
async function boot(page: Page, locale: string, mode = 'ready') {
  const f = fixture(mode), copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
  await page.clock.setFixedTime(f.now); // game time stands still while page timers (axe's included) still run
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('quick-chair-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('quick-chair-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, { save: f.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const t = (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  const quick = page.getByRole('region', { name: t('upgrade.quickChairTitle'), exact: true });
  return { f, t, quick };
}
const saved = async (page: Page) => fixture('inspect', JSON.stringify({ save: await readSave(page) }));

for (const locale of ['vi', 'en']) for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`S6 quick chair purchase buys one chair with one tap, keeps the shift clock running and survives reload in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const { f, t, quick } = await boot(page, locale);
    expect(f.paused).toBe(false); expect([f.tables, f.nextTablePrice]).toEqual([8, null]); // owner call 3: the chip (and so the button) waits for a full alley
    const xu = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
    const button = quick.getByRole('button', { name: t('upgrade.quickChair', { n: 1, cost: xu(f.chairPrice) }), exact: true });
    await expect(button).toBeEnabled(); const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.goal-chip')).toContainText(t('goal.buyChair', { n: 1 })); // the quick button and the chip agree: the second chair of table 1 is the next step
    const axe = await new AxeBuilder({ page }).include('.quick-chair').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tbh.shot(`quick-chair-${locale}-${viewport.width}.png`);
    const before = await saved(page); expect(before.chairs).toEqual(Array(8).fill(1));
    await button.click(); await waitSaved(page); const after = await saved(page);
    // One chair, paid once, on table 1; no sheet opened, the world never paused, and the shift clock did not lose a tick.
    expect(after.chairs).toEqual([2, ...Array(7).fill(1)]); expect(after.coins).toBe(before.coins - f.chairPrice);
    expect(after.bought).toEqual([{ tableId: expect.any(String), cost: f.chairPrice }]); expect(after.chairCommands).toBe(1);
    expect(after.paused).toBe(false); expect(after.phase).toBe('open'); expect(after.remaining).toBe(before.remaining);
    await expect(page.locator('dialog[open]')).toHaveCount(0); await expect(page.locator('.game')).not.toHaveClass(/is-paused/);
    await expect(page.locator('.table-space.table-0 .seat')).toHaveCount(2); // the yard shows the new chair at once
    // The next goal is table 2's chair at the next rung of the shop-wide ladder; the wallet still pays it, so the quick button moves on with the chip.
    await expect(quick.getByRole('button', { name: t('upgrade.quickChair', { n: 2, cost: xu(f.nextChairPrice) }), exact: true })).toBeEnabled();
    await expect(page.locator('.goal-chip')).toContainText(t('goal.buyChair', { n: 2 }));
    // The clock keeps running: a second of real time is a second of shift time.
    await page.clock.setFixedTime(f.now + 1000);
    await expect.poll(async () => (await saved(page)).remaining).toBe(after.remaining - 1000);
    const later = await saved(page); expect(later.paused).toBe(false);
    await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); const restored = await saved(page);
    expect(restored.chairs).toEqual([2, ...Array(7).fill(1)]); expect(restored.coins).toBe(later.coins); expect(restored.chairCommands).toBe(1);
    expect(restored.remaining).toBe(later.remaining); expect(restored.paused).toBe(false);
    expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
  });
}

test('S6 the quick chair button is not shown while the wallet cannot pay the chair: the chip alone says what is missing', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { f, t, quick } = await boot(page, 'vi', 'poor');
  const xu = (n: number) => new Intl.NumberFormat('vi-VN').format(n); expect(f.coins).toBeLessThan(f.chairPrice);
  await expect(page.locator('.goal-chip')).toContainText(t('goal.buyChair', { n: 1 })); await expect(page.locator('.goal-chip')).toContainText(t('goal.short', { cost: xu(f.chairPrice), missing: xu(f.chairPrice - f.coins) }));
  await expect(quick).toHaveCount(0);
  const state = await saved(page); expect(state.chairs).toEqual(Array(8).fill(1)); expect(state.chairCommands).toBe(0);
  expect(tbh.consoleErrors()).toEqual([]);
});

// Owner call 3 (the founder, 2026-10-22): the chip buys every table first, so with table 5 still for sale it points at "Mua bàn mới" although a second chair is
// open (four tables stand) and the wallet pays two; the quick button follows the chip and is not shown. The chair stays buyable in the Upgrades sheet, and
// buying it there does not turn the chip to the chairs while a table can still be bought.
for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`owner call 3 while a table can still be bought the chip points at it and the quick chair button is not shown; the sheet still sells the chair at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport);
    const { f, t, quick } = await boot(page, 'vi', 'tables-left');
    const xu = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
    expect([f.tables, f.coins]).toEqual([4, f.chairPrice + f.nextChairPrice]); expect(f.nextTablePrice).toBeGreaterThan(f.chairPrice); // the chair is open, cheaper and paid for
    const chip = page.locator('.goal-chip');
    await expect(chip).toContainText(t('goal.buyTable')); await expect(chip).toContainText(t('goal.short', { cost: xu(f.nextTablePrice), missing: xu(f.nextTablePrice - f.coins) }));
    await expect(chip).not.toContainText(t('goal.buyChair', { n: 1 })); await expect(quick).toHaveCount(0);
    await tbh.shot(`quick-chair-tables-left-${viewport.width}.png`);
    await page.getByRole('button', { name: t('nav.upgrades'), exact: true }).click();
    const block = page.locator(`dialog[open] [data-goal="chair:${f.firstTableId}"]`), buy = block.getByRole('button', { name: t('upgrade.buyChair', { cost: xu(f.chairPrice) }), exact: true });
    await expect(buy).toBeEnabled(); await expect(block.locator('.buy-reason')).toHaveCount(0); await expect(block.locator('.goal-effect')).toHaveText(t('goal.fx.seatsTo', { from: 1, to: 2 }));
    await buy.click(); await waitSaved(page); await page.keyboard.press('Escape');
    const after = await saved(page); expect(after.chairs).toEqual([2, 1, 1, 1]); expect(after.coins).toBe(f.coins - f.chairPrice);
    await expect(chip).toContainText(t('goal.buyTable')); await expect(quick).toHaveCount(0); // the chip stays on the tables, the button stays away
    expect(tbh.consoleErrors()).toEqual([]);
  });
}
