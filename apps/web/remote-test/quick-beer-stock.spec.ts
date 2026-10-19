import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import type { World } from '../../../packages/engine/src';
import { furnishShop } from './seat-shop';

const world = async (page: Page): Promise<World> => (await (await page.request.get('/api/player/state')).json()).world;

test('A2 quick beer refill uses the real server while the shift remains live and reloads once', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  // One table with one chair pours too little beer for the loop below to drain the keg; furnish the shop first.
  await furnishShop(page);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await world(page)).phase).toBe('open');

  const warning = page.getByRole('region', { name: 'Nhập bia nhanh', exact: true });
  // Consume stock through real orders and DOM serving; the isolated server exposes only a clock.
  for (let step = 0; step < 60 && !await warning.isVisible(); step++) {
    const current = await world(page);
    for (const table of current.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(item => item.state === 'ready'))) {
      await page.locator(`[data-table-id="${table.id}"] .table-order-hint`).click();
      const serve = page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true });
      if (await serve.isEnabled()) {
        const served = page.waitForResponse(r => r.url().endsWith('/player/command') && r.request().postDataJSON()?.command.type === 'serve');
        await serve.click(); expect((await (await served).json()).result.ok).toBe(true);
      }
      await page.keyboard.press('Escape');
    }
    await page.request.post('/api/__test/advance?ms=2000');
    await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/player/heartbeat') && r.ok()),
      page.evaluate(() => dispatchEvent(new Event('online'))),
    ]);
  }
  await expect(warning).toBeVisible();
  const before = await world(page);
  const quote = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/quick-beer-stock.ts', 'quote'], { encoding: 'utf8', input: JSON.stringify(before) }));
  expect(quote.ok).toBe(true); expect(Boolean(before.paused)).toBe(false);
  await expect(warning.getByRole('button')).toContainText(`${quote.cost.toLocaleString('vi-VN')} xu`);
  const response = page.waitForResponse(r => r.url().endsWith('/player/command') && r.request().postDataJSON()?.command.type === 'restock');
  await warning.getByRole('button').click();
  expect((await (await response).json()).result.ok).toBe(true);
  await expect.poll(async () => (await world(page)).inventory.bia).toBeGreaterThan(before.inventory.bia);
  const after = await world(page);
  expect(after.coins).toBe(before.coins - quote.cost);
  expect(after.inventory.bia).toBeLessThanOrEqual(quote.cap);
  expect(Boolean(after.paused)).toBe(false); expect(after.shift!.endsAt).toBe(before.shift!.endsAt);
  expect(after.shift!.pausedMs).toBe(before.shift!.pausedMs);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(warning).toHaveCount(0);
  await page.request.post('/api/__test/advance?ms=1000');
  const later = await world(page);
  expect(later.shift!.endsAt - later.now).toBeLessThanOrEqual(after.shift!.endsAt - after.now - 1000);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  const restored = await world(page);
  expect(restored.coins).toBe(later.coins); expect(Boolean(restored.paused)).toBe(false);
  // Reload can briefly close presence; preserve the shift's configured active duration.
  expect(restored.shift!.endsAt - restored.shift!.pausedMs).toBe(before.shift!.endsAt - before.shift!.pausedMs);
  expect(errors).toEqual([]);
});
