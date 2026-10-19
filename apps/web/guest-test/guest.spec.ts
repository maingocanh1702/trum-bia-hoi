import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import type { World } from '../../../packages/engine/src';

async function exported(page: Page) {
  await expect(page.locator('.game-shell')).toHaveAttribute('data-save-state', 'saved');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản lưu dự phòng', exact: true }).click();
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/guest-test/export-world.ts'], {
    input: await readFile((await (await pending).path())!, 'utf8'), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  })) as { world: World; durationMs: number; leagueAfterShifts: number };
}

test('static guest serves, restocks, upgrades, closes shift and persists across reload/new tab without API', async ({ page, context }, info) => {
  const errors: string[] = [], api: string[] = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page.on('pageerror', e => errors.push(e.message));
  context.on('request', r => { if (/\/api(?:\/|$)|accounts\.google\.com/.test(r.url())) api.push(r.url()); });
  context.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.clock.install({ time: new Date('2026-09-11T10:00:00Z') });
  await page.goto('/');
  // Straight into the yard in Vietnamese: no language screen (FEEDBACK I.1). The browser-only notice now lives in Settings > Account.
  await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(11100);
  await page.locator('.table-object').first().click();
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect(page.locator('.order-panel')).toHaveCount(0);
  await expect(page.locator('.toast-gain')).toBeVisible();
  // Shift 1 is the minimal first-shift HUD: wallet, keg and tables. Serve through ordinary play until it closes by itself;
  // the quick beer button refills the keg when it appears. No injected wallet or fixture config.
  const book = page.getByRole('heading', { name: 'Sổ ca hôm nay', exact: true });
  // A 12-minute shift plus the guests still at their tables takes 180-197 steps of 4 s: leave real headroom.
  for (let step = 0; step < 300 && !(await book.isVisible()); step++) {
    await page.clock.fastForward(4000);
    if (await page.locator('.table-order-hint.is-ready').count()) {
      await page.locator('.table-order-hint.is-ready').first().click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
      await expect(page.locator('.order-panel')).toHaveCount(0);
    }
    const refill = page.locator('.beer-stock-warning button:enabled');
    if (await refill.count()) await refill.click();
  }
  await expect(book).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Món trong ca', exact: true });
  await metrics.locator('summary').click();
  await expect(metrics.getByRole('heading', { name: 'Số đo ca', exact: true })).toBeVisible();
  const values: Record<string, string | null> = {};
  for (const key of ['served', 'mean', 'kValue', 'moiRate', 'staleRate', 'lost']) {
    const value = metrics.locator(`[data-metric="${key}"]`);
    await expect(value).toHaveAttribute('title', /[0-9]/);
    values[key] = await value.getAttribute('title');
  }
  await page.screenshot({ path: `.qa/guest-metrics-${info.project.name}.png` });
  await page.keyboard.press('Escape');
  // The HUD opens after shift 1: restock, then the first goal (one card) earned through ordinary service.
  await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  // The quick refill of the loop may already have topped the stock up (15/15): then there is nothing to buy, and the pause check below still holds.
  const bom = page.locator('.stock-row').first().getByRole('button', { name: 'Mua bom +1 · 12 xu', exact: true });
  if (await bom.isEnabled()) await bom.click();
  const energy = await page.locator('.energy strong').textContent();
  await page.clock.runFor(5000);
  await expect(page.locator('.energy strong')).toHaveText(energy!); // the open sheet keeps the world paused
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
  // Seat model (rules 28): the first purchase a one-table shop earns is table 2 (plan §7 owner line 3).
  const upgrade = page.getByRole('dialog').getByRole('button', { name: /^Mua bàn · / });
  await expect(upgrade).toBeEnabled(); await upgrade.click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(page.locator('.build-version code')).toHaveAttribute('title', process.env.TBH_GUEST_COMMIT ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  const before = await exported(page);
  expect(before.world.shift!.stats.served).toBeGreaterThan(0);
  const shop = (world: World) => world.tables.map(table => [table.id, table.capacity, table.level]);
  expect(before.world.tables).toHaveLength(2);
  await page.getByRole('button', { name: /Tài khoản/ }).click();
  await expect(page.locator('.account-panel')).toContainText(/Bản chơi trên trình duyệt.*Đăng nhập, đồng bộ và bảng xếp hạng online chưa mở/);
  await expect(page.locator('.account-benefits, .account-google')).toHaveCount(0);
  await page.screenshot({ path: `.qa/guest-account-${info.project.name}.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const closed = await exported(page), event = closed.world.events.filter(e => e.type === 'shift_closed').at(-1)!;
  expect(event.data.metricsComplete).toBe(true);
  for (const [key, value] of Object.entries(values)) expect(String(event.data[key])).toBe(value);
  await page.keyboard.press('Escape');
  for (let completed = 1; completed < before.leagueAfterShifts; completed++) {
    await page.clock.fastForward(86400000);
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.clock.fastForward(before.durationMs);
    await page.clock.fastForward(600000);
    await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.clock.fastForward(86400000);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const next = await exported(page);
  expect(next.world.completedShifts).toBeGreaterThanOrEqual(before.leagueAfterShifts);
  expect(next.world.shift!.id).not.toBe(before.world.shift!.id);
  expect(next.world.equipment).toEqual(before.world.equipment);
  expect(shop(next.world)).toEqual(shop(before.world));
  const time = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(time); await page.clock.resume(); await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const reloaded = await exported(page);
  expect(reloaded.world.playerId).toBe(next.world.playerId);
  expect(reloaded.world.shift!.id).toBe(next.world.shift!.id);
  expect(reloaded.world.coins).toBe(next.world.coins);
  await page.close();
  const fresh = await context.newPage(); await fresh.clock.setFixedTime(time); await fresh.goto('/admin');
  await fresh.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const reopened = await exported(fresh);
  expect(reopened.world.playerId).toBe(next.world.playerId);
  expect(reopened.world.coins).toBe(next.world.coins);
  expect(reopened.world.equipment).toEqual(next.world.equipment);
  expect(shop(reopened.world)).toEqual(shop(next.world));
  await fresh.keyboard.press('Escape');
  await fresh.getByRole('button', { name: 'Đường lên Trùm', exact: true }).click();
  await expect(fresh.getByRole('button', { name: 'Giải Nhậu & Vụ Bia', exact: true })).toHaveCount(0);
  await fresh.keyboard.press('Escape');
  await fresh.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await fresh.getByLabel('Ngôn ngữ').selectOption('en');
  await fresh.getByRole('button', { name: /Account/ }).click();
  await expect(fresh.locator('.account-panel')).toContainText('Browser edition');
  expect(await fresh.evaluate(() => localStorage.getItem('tbh.remote.v1'))).toBeNull();
  expect(api).toEqual([]); expect(errors).toEqual([]);
});
