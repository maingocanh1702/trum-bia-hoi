import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.5, a shorter shift book), through the DOM only, on the engine-made mid-shift save of buy-reasons.spec.ts
// (fixtures/buy-reasons.ts `book`: guests served, guests whose order timed out, guests who gave up in the queue, groups turned away at the door, pairs
// among them). On top: the net, big, and the one suggestion with its button; then served / left after sitting / could not get in, which add up to the
// reasons of "Vì sao khách đi"; then the shift's actions; everything else under "Chi tiết", collapsed, with no row for a dish that is still locked.
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const seed = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8'));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('bk-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('bk-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) test(`B2.5 the shift book opens on the net and its one suggestion, then three counts that add up to the reasons, the rest under Chi tiết, collapsed (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/buy-reasons.ts', 'book'], { encoding: 'utf8' }));
  const num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  const queueLeft = f.losses.queue as number; expect(queueLeft).toBeGreaterThan(0); expect(f.rejected).toBeGreaterThan(0); // every kind of leaving is in this shift
  await page.setViewportSize(viewport); await boot(page, f, locale);
  await page.getByRole('button', { name: copy['nav.book'], exact: true }).click();
  const book = page.getByRole('dialog', { name: copy['book.title'], exact: true }), content = book.locator('.sheet-content');
  // On top, in this order: the net, the one suggestion with its button, the three counts; then the actions (and the quest entry, revealed here); then "Chi tiết".
  await expect(content.locator('> *')).toHaveClass([/book-summary/, /button-stack/, /book-quests/, /book-details/]);
  const net = book.locator('.book-net');
  await expect(net.locator('span')).toHaveText(copy['book.net']); await expect(net.locator('strong')).toHaveText(num(f.net));
  const summary = book.locator('.book-summary');
  await expect(summary.locator('> *')).toHaveClass([/book-net/, /upgrade-hint/, /book-counts/]);
  await expect(summary.locator('.upgrade-hint').getByRole('button')).toBeVisible();
  const counts = book.locator('.book-counts > div'), leftSeated = f.lost - queueLeft, noEntry = f.rejected + queueLeft;
  await expect(counts.locator('dt')).toHaveText([copy['book.served'], copy['book.leftSeated'], copy['book.noEntry']]);
  await expect(counts.locator('dd')).toHaveText([num(f.served), num(leftSeated), num(noEntry)]);
  // The top block is on the first screen of the sheet: nothing to scroll to read the net, the suggestion and the counts.
  const sheetBox = (await book.boundingBox())!, last = (await counts.last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(sheetBox.y + sheetBox.height + 1);
  // Collapsed: the details are in the page for screen readers that open them, but not shown.
  const details = book.locator('.book-details');
  expect(await details.evaluate(el => (el as HTMLDetailsElement).open)).toBe(false);
  await expect(details.locator('> summary')).toHaveText(copy['book.details']); expect((await details.locator('> summary').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(book.getByRole('region', { name: copy['menu.title'], exact: true })).toBeHidden(); await expect(book.locator('.leave-reasons')).toBeHidden();
  expect(await axe(page)).toEqual([]);
  await tbh.shot(`b2-book-top-${locale}-${viewport.width}.png`);
  await details.locator('> summary').click();
  // The counts agree with "Vì sao khách đi": the guests who left after sitting and those who could not get in are its guests, nobody twice.
  const reasons = await book.locator('.leave-reasons li b').allTextContents();
  expect(reasons.reduce((sum, text) => sum + Number(text.replace(/\D/g, '')), 0)).toBe(leftSeated + noEntry);
  // No row for a dish that is still locked (this shop has no kitchen), every unlocked dish keeps its row.
  const rows = book.locator('.menu-report tbody tr'), dishes = Object.keys(seed.menu) as string[];
  expect(f.kitchen).toBe(0);
  const unlocked = dishes.filter(d => seed.menu[d].unlock.kitchenLevel <= f.kitchen);
  await expect(rows).toHaveCount(unlocked.length);
  for (const dish of dishes) await expect(book.locator(`.menu-report [data-dish="${dish}"]`)).toHaveCount(unlocked.includes(dish) ? 1 : 0);
  await expect(book.locator('.ledger-money dt')).toHaveText([copy['book.payment'], copy['book.tip'], copy['book.penalty'], copy['book.spent']]); // the money rows, moved, not lost
  expect(await axe(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`b2-book-details-${locale}-${viewport.width}.png`); expect(tbh.consoleErrors()).toEqual([]);
});
