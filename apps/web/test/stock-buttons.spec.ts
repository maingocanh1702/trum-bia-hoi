import { test, expect } from './tbh-fixture';
import type { Locator, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.7): Nhập hàng with two buttons per row, "+10 · {price}" and "Đầy kho · {price}", the price as a chip, in the
// secondary style (not all primary red); "+10" stays dimmed with its reason when it would overflow. Ingredient and dish names differ on purpose (the raw
// ingredient, the cooked dish): a kitchen row shows both. DOM only, engine-made saves (fixtures/stock-buttons.ts).
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/stock-buttons.ts', mode], { encoding: 'utf8' }));
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('sk-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('sk-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
const red = 'rgb(179, 47, 26)'; // --stoolRedDeep, the primary buy colour the rows used until now
async function twoButtons(row: Locator, copy: Record<string, string>, num: (n: number) => string, bulk: number, quotes: Record<string, { cost: number }>) {
  const buttons = row.locator('.stock-actions > .stock-buy > button');
  await expect(buttons).toHaveCount(2);
  const [plus, fullStock] = [buttons.nth(0), buttons.nth(1)];
  await expect(plus).toHaveAccessibleName(fill(copy['stock.buy'], { action: fill(copy['stock.bulk'], { n: bulk }), cost: num(quotes.bulk.cost) }));
  await expect(fullStock).toHaveAccessibleName(fill(copy['stock.buy'], { action: copy['stock.full'], cost: num(quotes.full.cost) }));
  await expect(plus.locator('.price-chip')).toHaveText(fill(copy['stock.cost'], { cost: num(quotes.bulk.cost) })); await expect(fullStock.locator('.price-chip')).toHaveText(fill(copy['stock.cost'], { cost: num(quotes.full.cost) }));
  for (const b of [plus, fullStock]) {
    const box = (await b.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    expect(await b.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(red); // secondary, not all primary red
  }
  return { plus, fullStock };
}

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) test(`B2.7 a stock row has two buttons with their price chips; "+10" stays dimmed with its reason when it would overflow, "Đầy kho" fills the rest (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = fixture('room'), num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  await page.setViewportSize(viewport); await boot(page, f, locale);
  await page.getByRole('button', { name: copy['nav.stock'], exact: true }).click();
  const sheet = page.getByRole('dialog', { name: copy['nav.stock'], exact: true }), beer = sheet.locator('.stock-row').first();
  await expect(beer.locator('.stock-info strong')).toHaveText(copy['ingredient.bia']);
  const { plus, fullStock } = await twoButtons(beer, copy, num, f.bulkSize, f.quotes.bia);
  const missing = f.cap - f.stock.bia; expect(missing).toBeLessThan(f.bulkSize);
  await expect(plus).toBeDisabled(); await expect(beer.locator('.buy-reason')).toHaveText(fill(copy['stock.roomFor'], { n: missing }));
  await expect(plus).toHaveAccessibleDescription(`${copy['ingredient.bia']} ${fill(copy['stock.roomFor'], { n: missing })}`);
  await expect(fullStock).toBeEnabled(); await expect(sheet.locator('.stock-one')).toHaveCount(0); // a wallet that pays: no extra button
  // The raw ingredient and the cooked dish are both named on a kitchen row, also while the kitchen is still locked.
  for (const dish of ['dau', 'topmo', 'long']) {
    const row = sheet.locator('.stock-row').filter({ has: page.locator(`#stock-ingredient-${dish}`) });
    await expect(row).toContainText(copy[`ingredient.${dish}`]); await expect(row).toContainText(fill(copy['stock.cookHint'], { dish: copy[`dish.${dish}`] }));
  }
  expect(await axe(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`b2-stock-${locale}-${viewport.width}.png`);
  await fullStock.click();
  await expect(beer.locator('.stock-info span')).toHaveText(fill(copy['beer.inventory'], { n: f.cap, cap: f.cap }));
  await expect(plus).toBeDisabled(); await expect(fullStock).toBeDisabled(); await expect(beer.locator('.buy-reason')).toHaveText([copy['stock.isFull'], copy['stock.isFull']]);
  expect(tbh.consoleErrors()).toEqual([]);
});

test('B2.7 a wallet below both prices: each button says why, and one glass at a time stays possible so an empty keg is never a dead end', async ({ page, tbh }) => {
  const copy = copyOf('vi'), f = fixture('broke'), num = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
  expect(f.quotes.bia.bulk.ok || f.quotes.bia.full.ok).toBe(false); expect(f.quotes.bia.one.ok).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, 'vi');
  await page.getByRole('button', { name: copy['nav.stock'], exact: true }).click();
  const beer = page.getByRole('dialog').locator('.stock-row').first();
  const { plus, fullStock } = await twoButtons(beer, copy, num, f.bulkSize, f.quotes.bia);
  await expect(plus).toBeDisabled(); await expect(fullStock).toBeDisabled();
  await expect(beer.locator('.buy-reason')).toHaveText([copy['reason.notEnoughCoins'], copy['reason.notEnoughCoins']]);
  const one = beer.getByRole('button', { name: fill(copy['stock.buy'], { action: copy['stock.one'], cost: num(f.quotes.bia.one.cost) }), exact: true });
  await expect(one).toBeEnabled(); expect((await one.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await axe(page)).toEqual([]); await tbh.shot('b2-stock-broke-vi.png');
  await one.click();
  await expect(beer.locator('.stock-info span')).toHaveText(fill(copy['beer.inventory'], { n: 1, cap: f.cap }));
  await expect(page.locator('.money strong')).toHaveText(num(f.coins - f.quotes.bia.one.cost));
});

test('B2.7 a full stock: both buttons dimmed with "Kho đã đầy", no extra button', async ({ page }) => {
  const copy = copyOf('vi'), f = fixture('full');
  await page.setViewportSize({ width: 360, height: 740 }); await boot(page, f, 'vi');
  await page.getByRole('button', { name: copy['nav.stock'], exact: true }).click();
  for (const dish of ['bia', 'lac', 'nem']) {
    const row = page.getByRole('dialog').locator('.stock-row').filter({ has: page.locator(`#stock-ingredient-${dish}`) });
    await expect(row.locator('.stock-buy button:disabled')).toHaveCount(2); await expect(row.locator('.buy-reason')).toHaveText([copy['stock.isFull'], copy['stock.isFull']]);
  }
  await expect(page.locator('.stock-one')).toHaveCount(0);
});
