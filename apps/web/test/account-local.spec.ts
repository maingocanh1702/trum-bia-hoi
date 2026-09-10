import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản lưu dự phòng', exact: true }).click();
  const save = await readFile((await (await pending).path())!, 'utf8');
  return page.evaluate(async text => {
    const path = '/test/fixtures/browser-save.ts';
    const { decodeSave } = await import(path) as typeof import('./fixtures/browser-save');
    return decodeSave(text).world;
  }, save);
}
test('local account panel preserves the live archive and never creates a server career or Google request', async ({ page }) => {
  const external: string[] = []; page.on('request', r => { if (r.url().includes('/api/') || r.url().includes('accounts.google.com')) external.push(r.url()); });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); const before = await exported(page);
  await page.getByRole('button', { name: /Tài khoản/ }).click();
  const panel = page.getByRole('dialog', { name: 'Tài khoản', exact: true });
  await expect(panel).toContainText('Tiến độ này đang lưu trên thiết bị');
  await expect(panel.getByRole('button', { name: 'Tiếp tục với Google', exact: true })).not.toBeVisible();
  await page.waitForTimeout(1200);
  await panel.getByRole('button', { name: 'Để sau, chơi tiếp', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); const after = await exported(page);
  expect(after.playerId).toBe(before.playerId); expect(after.shift!.id).toBe(before.shift!.id); expect(after.coins).toBe(before.coins);
  expect(after.staminaMs).toBeGreaterThan(before.staminaMs - 500); expect(after.completedShifts).toBe(before.completedShifts);
  expect(external).toEqual([]); expect(await page.evaluate(() => localStorage.getItem('tbh.remote.v1'))).toBeNull();
});
