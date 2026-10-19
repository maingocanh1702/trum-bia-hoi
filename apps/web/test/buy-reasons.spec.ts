import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';

// fun-buy-buttons-reason (PLAN "Vui 3 ca" §4 + P3): a price on every buy button and exactly one reason when it is dimmed, one reason on every
// "a guest left" toast, and the shift book ranking the reasons. Engine-made saves, DOM-only proof.
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/buy-reasons.ts', mode], { encoding: 'utf8' }));
const prefs = { locale: 'vi', guideDone: true, guideIndex: null, muted: true };
// axe reads colours at the instant it runs: let finite entrance animations finish first.
const settled = (page: Page) => page.waitForFunction(() => document.getAnimations().every(a => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
const axe = async (page: Page, include?: string) => { await settled(page); const b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']); return (include ? b.include(include) : b).analyze(); };

/** Boot a guest from an engine-made save. `controlled` freezes the clock so page.clock.runFor drives engine and animation time together. */
async function load(page: Page, save: string, now: number, controlled: boolean) {
  if (controlled) await page.clock.install({ time: now }); else await page.clock.setFixedTime(now);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('br-seeded')) return;
    localStorage.setItem('br-seeded', '1'); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs)); localStorage.setItem('tbh.save.v1', save);
  }, { save, prefs });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  if (controlled) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
/** Advance game time in small steps, letting React flush after each; stops as soon as `check` is true. */
async function run(page: Page, ms: number, step: number, check: () => Promise<boolean>) {
  for (let t = 0; t < ms; t += step) { await page.clock.runFor(step); await page.waitForTimeout(20); if (await check()) return true; }
  return false;
}
const openUpgrades = async (page: Page) => { await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); const sheet = page.locator('dialog[open]'); await expect(sheet).toBeVisible(); return sheet; };
const tableCard = (sheet: ReturnType<Page['locator']>, n: number) => sheet.locator('[data-goal^="table:"]').nth(n - 1);

for (const viewport of viewports) test(`a dimmed table button keeps its price and names exactly one reason: guests, then coins; an affordable one has none, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('states'); expect(f.coins).toBe(5000); expect(f.tables.map((t: { state: string }) => t.state !== 'empty')).toEqual([true, false, false]);
  await load(page, f.save, f.now, false);
  const sheet = await openUpgrades(page);
  // Table 1 has guests (the engine would answer tableBusy): dimmed, the price is still there, and the reason is the first refusal of the command.
  const busy = tableCard(sheet, 1);
  await expect(busy.getByRole('button')).toBeDisabled(); await expect(busy.getByRole('button')).toHaveText('Nâng · 3.750 xu');
  await expect(busy.locator('.buy-reason')).toHaveText('Bàn đang có khách'); await expect(busy.getByRole('button')).toHaveAccessibleDescription('Bàn đang có khách');
  // Table 2 is Lv2 already: its next level costs 15 000 and the wallet holds 5 000.
  const poor = tableCard(sheet, 2);
  await expect(poor.getByRole('button')).toBeDisabled(); await expect(poor.getByRole('button')).toHaveText('Nâng · 15.000 xu');
  await expect(poor.locator('.buy-reason')).toHaveText('Chưa đủ xu'); await expect(poor.locator('.buy-reason')).toHaveCount(1);
  // Table 3 is empty and affordable: a price, no reason.
  const ready = tableCard(sheet, 3);
  await expect(ready.getByRole('button')).toBeEnabled(); await expect(ready.getByRole('button')).toHaveText('Nâng · 3.750 xu'); await expect(ready.locator('.buy-reason')).toHaveCount(0);
  // "Buy another table" carries its price too and says why it is dimmed.
  const buy = sheet.locator('[data-goal="buyTable"]');
  await expect(buy.getByRole('button')).toBeDisabled(); await expect(buy.getByRole('button')).toHaveText(/^Mua thêm bàn · [\d.]+ xu$/); await expect(buy.locator('.buy-reason')).toHaveText('Chưa đủ xu');
  const box = (await busy.getByRole('button').boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`br-states-${viewport.width}.png`);
  expect(errors).toEqual([]);
});

for (const viewport of viewports) test(`a table at Lv3 says it needs the badge, an affordable table has no reason, and the last table bought turns the buy button into "all tables built" at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('rich'); expect(f.tables.map((t: { level: number }) => t.level)).toEqual([3, 1, 1]);
  await load(page, f.save, f.now, false);
  const sheet = await openUpgrades(page);
  const gated = tableCard(sheet, 1);
  await expect(gated.getByRole('button')).toBeDisabled(); await expect(gated.getByRole('button')).toHaveText('Nâng · 62.500 xu'); await expect(gated.locator('.buy-reason')).toHaveText('Cần huy hiệu Kết Nối');
  for (const n of [2, 3]) { await expect(tableCard(sheet, n).getByRole('button')).toBeEnabled(); await expect(tableCard(sheet, n).locator('.buy-reason')).toHaveCount(0); }
  const buy = sheet.locator('[data-goal="buyTable"]').getByRole('button');
  const prices: string[] = [];
  for (let bought = 3; bought < 6; bought++) {
    await expect(buy).toBeEnabled(); prices.push((await buy.textContent())!); await expect(sheet.locator('[data-goal="buyTable"] .buy-reason')).toHaveCount(0);
    await buy.click(); await expect(sheet.locator('[data-goal^="table:"]')).toHaveCount(bought + 1);
  }
  expect(new Set(prices).size).toBe(3); for (const price of prices) expect(price).toMatch(/^Mua thêm bàn · [\d.]+ xu$/);
  await expect(buy).toBeDisabled(); await expect(sheet.locator('[data-goal="buyTable"] .buy-reason')).toHaveText('Quán đã đủ bàn');
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`br-rich-${viewport.width}.png`); expect(errors).toEqual([]);
});

for (const viewport of viewports) test(`a table at its top level says "Đã tối đa" and nothing else, with guests or without, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('maxed'); expect(f.tables).toEqual([{ level: 4, state: 'seating' }, { level: 4, state: 'empty' }]);
  await load(page, f.save, f.now, false);
  const sheet = await openUpgrades(page);
  // The engine would answer tableBusy for table 1 and maxLevel for table 2; nothing is left to buy at either, so the button's own label is the one reason (PLAN §4: "đã tối đa").
  for (const n of [1, 2]) { const card = tableCard(sheet, n); await expect(card.getByRole('button')).toBeDisabled(); await expect(card.getByRole('button')).toHaveText('Đã tối đa'); await expect(card.locator('.buy-reason')).toHaveCount(0); }
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`br-maxed-${viewport.width}.png`); expect(errors).toEqual([]);
});

const reasons = [
  { mode: 'beer', reason: 'beer', label: 'Hết bia', numbers: true },
  { mode: 'wait', reason: 'wait', label: 'Chờ lâu quá', numbers: true },
  { mode: 'seat', reason: 'seat', label: 'Hết chỗ', numbers: false },
] as const;
for (const viewport of viewports) for (const r of reasons) test(`when a guest leaves the toast says why in one reason (${r.label}) at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture(r.mode); expect(f.leadMs).toBeGreaterThan(0);
  await load(page, f.save, f.now, false);
  await expect(page.locator('.toast-loss')).toHaveCount(0);
  await page.clock.setFixedTime(f.now + f.leadMs + 300); // the app's own tick catches the engine up: the first guest has just left
  await expect(page.locator('.toast-loss')).toBeVisible();
  const toast = page.locator('.toast-loss');
  await expect(toast).toHaveAttribute('data-reason', r.reason); await expect(toast.locator('.loss-reason')).toHaveText(r.label); await expect(toast.locator('.loss-reason')).toHaveCount(1);
  if (r.numbers) {
    await expect(toast).toHaveAccessibleName(new RegExp(`^${r.label}\\. Trừ \\d+ xu và \\d+ uy tín$`)); await expect(toast.locator('.loss-value')).toHaveCount(2);
  } else { // a group turned away at the door costs nothing: the reason stands alone
    await expect(toast).toHaveAccessibleName('Hết chỗ. Khách ra về, không mất xu hay uy tín'); await expect(toast.locator('.loss-value')).toHaveCount(0);
  }
  const box = (await toast.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect((await axe(page, '.toast-loss')).violations).toEqual([]); await tbh.shot(`br-toast-${r.reason}-${viewport.width}.png`);
  expect(errors).toEqual([]);
});

for (const viewport of viewports) test(`the shift book lists why guests left, most guests first, at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('book'), l = f.losses as Record<string, number>;
  // What the player should read, restated from the engine's own counts (not through the app's helper).
  const beer = l.beerStock + l.beerRefill, food = l.foodStock, seat = f.rejected as number, wait = Object.entries(l).filter(([k]) => !['beerStock', 'beerRefill', 'foodStock'].includes(k)).reduce((s, [, n]) => s + n, 0);
  const order = ([['beer', beer, 0], ['food', food, 1], ['wait', wait, 2], ['seat', seat, 3]] as const).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  expect(order.length).toBeGreaterThanOrEqual(3); expect(order[0][0]).not.toBe('beer'); // the order is not the default one: the ranking is real
  await load(page, f.save, f.now, false);
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  const book = page.getByRole('dialog', { name: 'Sổ ca hôm nay', exact: true }); await expect(book).toBeVisible();
  const section = book.locator('.leave-reasons'); await expect(section.getByRole('heading', { name: 'Vì sao khách đi' })).toBeVisible();
  const label: Record<string, string> = { beer: 'Hết bia', food: 'Hết mồi', wait: 'Chờ lâu quá', seat: 'Hết chỗ' };
  await expect(section.locator('li')).toHaveCount(order.length);
  for (const [i, [reason, count]] of order.entries()) {
    const row = section.locator('li').nth(i); await expect(row).toHaveAttribute('data-reason', reason);
    await expect(row.locator('span')).toHaveText(label[reason]); await expect(row.locator('b')).toHaveText(new Intl.NumberFormat('vi-VN').format(count));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`br-book-${viewport.width}.png`); expect(errors).toEqual([]);
});
