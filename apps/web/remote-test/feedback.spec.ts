import { test, expect } from '@playwright/test';

test('A4 real server supplies loss evidence without event history and remote advice survives reconnect', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click({ timeout: 20000 });
  await expect(page.locator('[data-preparation="ready"]')).toBeVisible({ timeout: 20000 });
  const snapshot = async () => (await page.request.get('/api/player/state')).json();
  await expect.poll(async () => (await snapshot()).menu.losses.ready, { timeout: 40000 }).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Sổ ca', exact: true }).first().click();
  const state = await snapshot(); expect(state.world.events).toBeUndefined();
  expect(Object.values(state.menu.losses).reduce((a: number, b) => a + Number(b), 0)).toBe(state.world.shift.stats.lost);
  await expect(page.locator('.upgrade-hint')).toHaveAttribute('data-kind', 'ready');
  await expect(page.locator('.upgrade-hint')).toContainText(String(state.menu.losses.ready));
  await expect(page.locator('.upgrade-hint button')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).first().click();
  await expect(page.locator('.upgrade-hint')).toHaveAttribute('data-kind', 'ready');
  await page.screenshot({ path: 'artifacts/verification/codex-improve-order-feedback/feedback-remote.png' });
  expect(errors).toEqual([]);
});
