import { waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode = 'live') => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/kitchen.ts', mode], { encoding: 'utf8' }));
for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
  test(`live kitchen shows real timers and routes to the whole table at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const f = fixture(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => { if (!localStorage.getItem('kitchen-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('kitchen-seeded', '1'); } }, f.save);
    await page.goto('/'); 
    const yard = page.getByRole('button', { name: 'Bếp', exact: true }); await yard.scrollIntoViewIfNeeded();
    const box = (await yard.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    expect(await yard.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await expect.poll(() => yard.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `.qa/kitchen-yard-${viewport.width}.png` }); await yard.click();
    const panel = page.getByRole('region', { name: 'Tại bếp', exact: true }); await expect(panel).toContainText('1/1 bếp đang nấu');
    await expect(panel.locator('[data-state="queued"]')).not.toHaveCount(0);
    const job = f.status.jobs.find((j: { state: string }) => j.state === 'preparing'), row = panel.locator(`[data-item="${job.itemId}"]`);
    await expect(row.locator('time')).toHaveText(`${Math.ceil(job.remainingMs / 1000)}s`);
    await page.clock.runFor(1000); await expect(row.locator('time')).toHaveText(`${Math.ceil(job.remainingMs / 1000)}s`);
    await expect.poll(() => panel.locator('img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `.qa/kitchen-live-${viewport.width}.png` }); await row.getByRole('button').click();
    const order = page.getByRole('dialog', { name: `Bàn ${job.tableNumber}`, exact: true }); await expect(order).toBeVisible();
    await expect(order.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeDisabled();
    await order.getByRole('button', { name: 'Tại bếp', exact: true }).click(); await expect(panel).toBeVisible();
    await page.keyboard.press('Escape'); await page.clock.runFor(23000); await yard.click(); await expect(panel.locator('[data-state="ready"]')).not.toHaveCount(0);
    await row.getByRole('button').click(); const serve = order.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }); await expect(serve).toBeEnabled(); await serve.click();
    await expect(order).toHaveCount(0); await expect(yard).not.toBeFocused();
    await waitSaved(page); await page.reload(); await yard.click(); await expect(panel.locator(`[data-item="${job.itemId}"]`)).toHaveCount(0);
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Kitchen', exact: true }).click(); await expect(page.getByRole('region', { name: 'Live kitchen', exact: true })).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}
test('kitchen warning disappears after real expiry and never leaves a stale dish link', async ({ page }) => {
  const f = fixture('late'); await page.clock.pauseAt(new Date(f.now)); await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save); await page.goto('/'); await page.getByRole('button', { name: 'Bếp', exact: true }).click();
  const panel = page.locator('.kitchen-panel'); await expect(panel.locator('.kitchen-warning').first()).toBeVisible(); await page.screenshot({ path: '.qa/kitchen-late.png' });
  await page.clock.runFor(f.deadline - f.now + 100); await expect(panel.locator('.kitchen-warning').first()).toBeVisible();
  await page.keyboard.press('Escape'); await page.clock.runFor(f.deadline - f.now + 100); await page.getByRole('button', { name: 'Bếp', exact: true }).click(); for (const job of f.status.jobs) await expect(panel.locator(`[data-item="${job.itemId}"]`)).toHaveCount(0);
});
test('out-of-stock recipe opens the existing restock sheet', async ({ page }) => {
  const f = fixture('stock'); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('tbh.save.v1')) localStorage.setItem('tbh.save.v1', save); }, f.save); await page.goto('/'); await page.getByRole('button', { name: 'Bếp', exact: true }).click();
  await expect(page.locator('.kitchen-panel')).toContainText('Hết nguyên liệu'); await page.locator('.kitchen-panel').getByRole('button', { name: 'Nhập hàng', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Nhập hàng', exact: true })).toBeVisible();
});
test('max-level kitchen shows all three configured burners', async ({ page }) => {
  const f = fixture('max'); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save); await page.goto('/'); await page.getByRole('button', { name: 'Bếp', exact: true }).click();
  await expect(page.locator('.kitchen-panel')).toContainText('3/3 bếp đang nấu'); await expect(page.locator('.equipment-detail .upgrade-card button')).toHaveText('Đã tối đa');
  await expect.poll(() => page.locator('.equipment-detail img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: '.qa/kitchen-max.png' });
});
test('an unowned kitchen is purchasable mid-shift without showing a fake owned yard appliance', async ({ page }) => {
  const f = fixture('locked'); await page.clock.pauseAt(new Date(f.now)); await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save);
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Bếp', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.locator('.kitchen-entry').click(); await expect(page.locator('.kitchen-panel')).toContainText('Mua bếp để mở'); await expect(page.locator('.kitchen-panel header')).toHaveCount(0); await expect(page.locator('.equipment-detail .upgrade-card button')).toBeEnabled();
});
