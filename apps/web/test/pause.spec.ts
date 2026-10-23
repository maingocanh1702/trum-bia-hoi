import { readSave, waitSaved } from './storage';
import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (input?: { save: string; orderId: string }) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/pause.ts', ...(input ? ['inspect'] : [])], { encoding: 'utf8', input: input ? JSON.stringify(input) : undefined }));
async function boot(page: Page) {
  const f = fixture(); await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('pause-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('pause-seeded', '1'); } }, f.save);
  await page.goto('/');
  return { f, snapshot: async () => fixture({ save: await readSave(page), orderId: f.orderId }) };
}

test('stock purchases keep the menu open and the whole game paused until closing, then the same table can be served', async ({ page }) => {
  const { f, snapshot } = await boot(page), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Nhập hàng', exact: true }); await expect(panel.locator('.sheet-pause')).toContainText('Tạm dừng');
  await page.clock.runFor(1000); const before = await snapshot(); expect(before.active).toBe(true); expect(before.paused).toBe(true);
  await page.clock.runFor(before.remaining + f.grace + 10000); const waiting = await snapshot();
  expect([waiting.remaining, waiting.prepRemaining, waiting.shiftRemaining, waiting.stamina]).toEqual([before.remaining, before.prepRemaining, before.shiftRemaining, before.stamina]);
  expect(waiting.coins).toBe(before.coins); expect(waiting.expired).toBe(0);
  const beer = panel.locator('.stock-row').filter({ has: page.getByText('Bia hơi', { exact: true }) });
  // Founder 2026-10-22 (B2.7): two buttons per row, "+10" and "Đầy kho" (the "+1" this test clicked twice is gone); the purchase in the paused sheet is "Đầy kho".
  expect(before.full.ok).toBe(true); expect(before.full.quantity).toBeGreaterThan(0);
  await beer.getByRole('button', { name: /^Đầy kho ·/ }).click();
  await page.clock.runFor(1000); const stocked = await snapshot();
  expect(stocked.inventory.bia).toBe(before.inventory.bia + before.full.quantity); expect(stocked.coins).toBe(before.coins - before.full.cost);
  expect(stocked.paused).toBe(true); expect(stocked.remaining).toBe(before.remaining); await expect(panel).toBeVisible();
  await expect(page.locator('.paused-overlay')).toHaveCount(0);
  expect(await page.locator('.yard .sprite').first().evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.screenshot({ path: '.qa/menu-pause-stock-390.png' });
  await panel.getByRole('button', { name: 'Nhập hàng ×', exact: true }).click();
  await expect(page.locator('.game')).not.toHaveClass(/is-paused/); await page.clock.runFor(Math.max(0, before.prepRemaining) + 100);
  await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click();
  const order = page.getByRole('dialog', { name: 'Bàn 1', exact: true }); await expect(order.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeEnabled();
  await order.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click(); await page.clock.runFor(1000);
  expect((await snapshot()).served).toBe(1); expect((await snapshot()).expired).toBe(0); expect(errors).toEqual([]);
});

test('visibility changes cannot resume an open settings menu; Escape resumes the original remaining wait and expiry happens once', async ({ page }) => {
  const { f, snapshot } = await boot(page);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.clock.runFor(1000); const before = await snapshot();
  for (const hidden of [true, false]) {
    await page.evaluate(hidden => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden }); document.dispatchEvent(new Event('visibilitychange')); }, hidden);
    await page.clock.runFor(20000);
  }
  const paused = await snapshot(); expect(paused.active).toBe(true); expect(paused.paused).toBe(true); expect(paused.remaining).toBe(before.remaining); expect(paused.expired).toBe(0);
  await page.keyboard.press('Escape'); await page.clock.runFor(before.remaining + f.grace + 200);
  const resumed = await snapshot(); expect(resumed.active).toBe(true); expect(resumed.expired).toBe(1);
  await page.clock.runFor(1000); expect((await snapshot()).expired).toBe(1);
});

test('switching from upgrades to equipment stays paused and reloading preserves the frozen wait before resuming the yard', async ({ page }) => {
  const { snapshot } = await boot(page);
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.clock.runFor(1000); const before = await snapshot();
  await page.locator('.kitchen-entry').click(); await expect(page.getByRole('dialog', { name: 'Bếp', exact: true })).toBeVisible();
  await page.clock.runFor(40000); const nested = await snapshot(); expect(nested.paused).toBe(true); expect(nested.remaining).toBe(before.remaining);
  await waitSaved(page); await page.reload(); await waitSaved(page); await page.clock.runFor(1000); const after = await snapshot();
  expect(after.active).toBe(true); expect(after.expired).toBe(0); expect(after.remaining).toBe(before.remaining - 1000);
  await expect(page.locator('.sheet[open]')).toHaveCount(0);
});
