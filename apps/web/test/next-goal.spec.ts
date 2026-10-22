import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { waitSaved } from './storage';

// fun-next-goal (PLAN "Vui 3 ca" §4): the "Mục tiêu kế tiếp" chip and the three lanes of the Upgrades sheet. Engine-made saves, DOM-only proof.
// The tests written with Wave 1 describe a capacity snapshot (a table level is seats; fixture modes closed/oldpin run on the frozen 2.0.4 file, which an
// old browser save keeps until its next opening adopts the seat model). They are unchanged except where they said "a brand-new save", which the app now
// builds on the seat model. Their counterparts on the bundled seat model (rules 28: the first purchase is the second table) follow them, as `seat-*` tests.
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const fixture = (mode: string, ...args: (string | number)[]) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/next-goal.ts', mode, ...args.map(String)], { encoding: 'utf8' }));
const prefs = { locale: 'vi', guideDone: true, guideIndex: null, muted: true };
const settled = (page: Page) => page.waitForFunction(() => document.getAnimations().every(a => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
const axe = async (page: Page) => { await settled(page); return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); };
const chip = (page: Page) => page.locator('.goal-chip');
const inLane = (page: Page, lane: string) => page.locator(`.goal-lane[aria-labelledby="lane-${lane}"]`);

/** Boot a guest from an engine-made save (a brand-new game when `save` is null) with the clock pinned at the save's time. */
async function load(page: Page, save: string | null, now: number) {
  await page.clock.setFixedTime(now);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('goal-seeded')) return;
    localStorage.setItem('goal-seeded', '1'); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs));
    if (save) localStorage.setItem('tbh.save.v1', save);
  }, { save, prefs });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const viewport of viewports) test(`a brand-new save shows its first goal from shift 1, and a tap opens the sheet at that item at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('closed', 0, 300); expect(f.coins).toBe(750); await load(page, f.save, f.now); // a brand-new game on a capacity snapshot: the seat model has its own test below
  await expect(page.locator('.hud button')).toHaveCount(1); // the settings gear and nothing else: this 2.0.4 snapshot has no `hudAfterShifts`, so the reveal falls back to the bundled seed (0 since JSON 2.1.2, founder 2026-10-22); the chip sits right under the header
  await expect(chip(page)).toBeVisible(); await expect(chip(page)).toContainText('Nâng bàn 1 · 4 chỗ'); await expect(chip(page)).toContainText('3.750 xu · thiếu 3.000');
  await expect(chip(page)).toHaveAccessibleName(/^Mục tiêu kế tiếp: Nâng bàn 1 · 4 chỗ/);
  const box = (await chip(page).boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(await fits(page)).toBe(true);
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`ng-chip-shift1-${viewport.width}.png`);
  await chip(page).click();
  const sheet = page.locator('dialog[open]'); await expect(sheet).toBeVisible();
  await expect(sheet.locator('.upgrade-card')).toHaveCount(1); await expect(sheet.locator('.upgrade-card')).toHaveAttribute('data-goal', 'table:table-1'); // one card: the chip's goal
  await expect(sheet.getByRole('heading', { name: 'Bàn 1', exact: true })).toBeVisible();
  expect((await axe(page)).violations).toEqual([]); expect(errors).toEqual([]);
});

for (const viewport of viewports) test(`the chip moves on after every purchase and says what is still missing at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const f = fixture('closed', 1, 4000); await load(page, f.save, f.now); expect(f.coins).toBe(9110);
  await expect(chip(page)).toContainText('Nâng bàn 1 · 4 chỗ'); await expect(chip(page)).toContainText('3.750 xu · đủ rồi'); await tbh.shot(`ng-chip-ready-${viewport.width}.png`);
  await chip(page).click(); const sheet = page.locator('dialog[open]');
  await expect(sheet.getByRole('heading', { name: 'Bàn 1', exact: true })).toBeVisible();
  await sheet.getByRole('button', { name: 'Nâng · 3.750 xu', exact: true }).click(); await waitSaved(page); await page.keyboard.press('Escape');
  await expect(chip(page)).toContainText('Nâng bàn 2 · 4 chỗ'); await expect(chip(page)).toContainText('3.750 xu · đủ rồi'); // 5 360 left
  await chip(page).click(); await page.locator('dialog[open]').getByRole('button', { name: 'Nâng · 3.750 xu', exact: true }).click(); await waitSaved(page); await page.keyboard.press('Escape');
  await expect(chip(page)).toContainText('Nâng bàn 3 · 4 chỗ'); await expect(chip(page)).toContainText('3.750 xu · thiếu 2.140'); // 1 610 left
});

for (const viewport of viewports) test(`the full Upgrades sheet has three lanes, capacity then speed then guests, and the chip opens it at its item at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const f = fixture('closed', 2, 4000); await load(page, f.save, f.now);
  await expect(chip(page)).toContainText('Nâng bàn 1');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); const sheet = page.locator('dialog[open]');
  await expect(sheet.locator('.goal-lane > h3:first-child')).toHaveText(['Sức chứa', 'Tốc độ', 'Khách']);
  await expect(inLane(page, 'capacity').locator('[data-goal^="table:"]')).toHaveCount(3); await expect(inLane(page, 'capacity').locator('[data-goal="buyTable"]')).toHaveCount(1);
  await expect(inLane(page, 'speed').locator('[data-goal^="equipment:"]')).toHaveCount(5);
  await expect(inLane(page, 'guests').locator('[data-goal="signboard"], [data-goal="flyer"], [data-goal^="unlock:"]')).toHaveCount(4);
  await expect(inLane(page, 'guests').locator('[data-goal="equipment:keg"]')).toHaveCount(0);
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`ng-lanes-${viewport.width}.png`);
  await page.keyboard.press('Escape'); await expect(page.locator('dialog[open]')).toHaveCount(0);
  await chip(page).click();
  const target = page.locator('dialog[open] [data-goal="table:table-1"]'); await expect(target).toBeVisible(); await expect(target).toHaveAttribute('data-targeted', ''); await expect(target).toBeInViewport();
});

test('a goal behind the life-path gate is never the chip: it skips the keg and points at the sign', async ({ page, tbh }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('gated'); await load(page, f.save, f.now); expect(f.keg).toBe(false);
  await expect(chip(page)).toContainText('Lắp biển hiệu'); await expect(chip(page)).not.toContainText('Vòi rót'); await tbh.shot('ng-chip-gated-390.png');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
  const keg = page.locator('dialog[open] [data-goal="equipment:keg"]'); await expect(keg).toBeVisible(); await expect(keg.getByRole('button').last()).toBeDisabled(); // listed, but not buyable and not suggested
});

test('Settings can switch the chip off, and it stays off after a reload', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('closed', 2, 4000); await load(page, f.save, f.now);
  await expect(chip(page)).toBeVisible();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const row = page.getByRole('button', { name: /Gợi ý mục tiêu/ }); await expect(row).toContainText('Đang bật'); await row.click(); await expect(row).toContainText('Đã tắt');
  await page.keyboard.press('Escape'); await expect(chip(page)).toHaveCount(0); await waitSaved(page);
  await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); await expect(chip(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByRole('button', { name: /Gợi ý mục tiêu/ }).click(); await page.keyboard.press('Escape');
  await expect(chip(page)).toBeVisible();
});

test('a game pinned to a snapshot without the nextGoal section still shows its chip (the client reads the seed)', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('oldpin'); await load(page, f.save, f.now);
  await expect(chip(page)).toContainText('Nâng bàn 1');
});

test('the chip is English in English, with the units of the English copy', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('closed', 1, 4000); await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save }) => { if (localStorage.getItem('goal-seeded')) return; localStorage.setItem('goal-seeded', '1'); localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'en', guideDone: true, guideIndex: null, muted: true })); }, { save: f.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  await expect(chip(page)).toContainText('Upgrade table 1 · 4 seats'); await expect(chip(page)).toContainText('3,750 coins · ready'); await expect(chip(page)).toHaveAccessibleName(/^Next goal: Upgrade table 1/);
});

// ---- The seat model (rules 28, the bundled config): the chip's rule is unchanged; what it can point at is not. A table level adds no seat
// (chairs do) and carries no benefit until S4, so the chip never suggests one; the second table is the first purchase of a one-table shop.

for (const viewport of viewports) test(`on the seat model a brand-new save's first goal is the second table, and a tap opens the sheet at that one card at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await load(page, null, Date.parse('2026-09-08T10:00:00Z'));
  await expect(page.locator('.hud button')).toHaveCount(1); // the settings gear: the HUD is there from shift 1 (JSON 2.1.2, founder 2026-10-22); the header holds the wallet, the timer and the gear
  await expect(chip(page)).toBeVisible(); await expect(chip(page)).toContainText('Mua bàn mới · +1 chỗ'); await expect(chip(page)).toContainText('1.070 xu · thiếu 320');
  await expect(chip(page)).toHaveAccessibleName(/^Mục tiêu kế tiếp: Mua bàn mới · \+1 chỗ/);
  const box = (await chip(page).boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(await fits(page)).toBe(true);
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`ng-seat-chip-shift1-${viewport.width}.png`);
  await chip(page).click();
  const sheet = page.locator('dialog[open]'); await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-goal]')).toHaveCount(1); await expect(sheet.locator('[data-goal]')).toHaveAttribute('data-goal', 'buyTable'); // one card: the chip's goal
  await expect(sheet.getByRole('button', { name: /^Mua bàn · 1\.070 xu$/ })).toBeDisabled(); await expect(sheet.locator('.buy-reason')).toHaveText('Chưa đủ xu');
  expect((await axe(page)).violations).toEqual([]); expect(errors).toEqual([]);
});

for (const viewport of viewports) test(`on the seat model the chip moves on after every table bought and says what is still missing at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  // 9 828 base was the old 10 000 less the 172 base table 2 got cheaper (428 against 600): the three purchases below keep their old arithmetic, 24 515 - 1 070 = 23 445 - 9 250 = 14 195, 55 short of table 4.
  // 9 842 since JSON 2.1.3 (founder 2026-10-22: no Bàn lai rai in shift 1): the unserved shift 1 of this fixture now costs 90 in walk-out penalties where it cost 55, so the base is 14 higher (x2.5 = 35) and every number below stays.
  // 9 879 since JSON 2.1.4 (founder 2026-10-22, early pacing: singles until a table seats a pair): the guests of that unserved shift 1 now sit down and walk out (183 in penalties)
  // where pairs were turned away for free, so the base is 37 higher (x2.5 = 92.5, rounded once) and every number below stays.
  const f = fixture('seat-closed', 1, 9879); await load(page, f.save, f.now); expect(f.coins).toBe(24515);
  await expect(chip(page)).toContainText('Mua bàn mới · +1 chỗ'); await expect(chip(page)).toContainText('1.070 xu · đủ rồi'); await tbh.shot(`ng-seat-chip-ready-${viewport.width}.png`);
  await chip(page).click(); const sheet = page.locator('dialog[open]');
  await expect(sheet.locator('[data-goal="buyTable"]')).toBeVisible();
  await sheet.getByRole('button', { name: 'Mua bàn · 1.070 xu', exact: true }).click(); await waitSaved(page); await page.keyboard.press('Escape'); // 23 445 left
  await expect(chip(page)).toContainText('Mua bàn mới · +1 chỗ'); await expect(chip(page)).toContainText('9.250 xu · đủ rồi');
  await chip(page).click(); await page.locator('dialog[open]').getByRole('button', { name: 'Mua bàn · 9.250 xu', exact: true }).click(); await waitSaved(page); await page.keyboard.press('Escape'); // 14 195 left
  await expect(chip(page)).toContainText('Mua bàn mới · +1 chỗ'); await expect(chip(page)).toContainText('14.250 xu · thiếu 55');
});

for (const viewport of viewports) test(`on the seat model the full Upgrades sheet keeps its three lanes and a table level is listed but never the chip at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const f = fixture('seat-closed', 2, 4000); await load(page, f.save, f.now); expect(f.goal).toBe('buyTable');
  await expect(chip(page)).toContainText('Mua bàn mới');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); const sheet = page.locator('dialog[open]');
  await expect(sheet.locator('.goal-lane > h3:first-child')).toHaveText(['Sức chứa', 'Tốc độ', 'Khách']);
  await expect(inLane(page, 'capacity').locator('[data-goal^="table:"]')).toHaveCount(1); await expect(inLane(page, 'capacity').locator('[data-goal="buyTable"]')).toHaveCount(1);
  await expect(inLane(page, 'speed').locator('[data-goal^="equipment:"]')).toHaveCount(5);
  await expect(inLane(page, 'guests').locator('[data-goal="signboard"], [data-goal="flyer"], [data-goal^="unlock:"]')).toHaveCount(4);
  const level = inLane(page, 'capacity').locator('[data-goal="table:table-1"]').getByRole('button', { name: /^Nâng · [\d.]+ xu$/ });
  await expect(level).toBeDisabled(); await expect(level).toHaveAccessibleDescription('Bàn cần 2 ghế'); // listed, with its price and one reason, but not what the chip points at
  expect((await axe(page)).violations).toEqual([]); await tbh.shot(`ng-seat-lanes-${viewport.width}.png`);
  await page.keyboard.press('Escape'); await expect(page.locator('dialog[open]')).toHaveCount(0);
  await chip(page).click();
  const target = page.locator('dialog[open] [data-goal="buyTable"]'); await expect(target).toBeVisible(); await expect(target).toHaveAttribute('data-targeted', ''); await expect(target).toBeInViewport();
});

test('on the seat model the chip is English in English, with the units of the English copy', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('seat-closed', 1, 4000); await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save }) => { if (localStorage.getItem('goal-seeded')) return; localStorage.setItem('goal-seeded', '1'); localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'en', guideDone: true, guideIndex: null, muted: true })); }, { save: f.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  await expect(chip(page)).toContainText('Buy a new table · Seats +1'); await expect(chip(page)).toContainText('1,070 coins · ready'); await expect(chip(page)).toHaveAccessibleName(/^Next goal: Buy a new table/);
});
