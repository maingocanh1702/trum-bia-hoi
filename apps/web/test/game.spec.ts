import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`guest serves, reloads, opens live sheets and switches locale at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
    await page.goto('/');
    await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.clock.runFor(11100);
    await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);
    await expect(page.locator('.guide')).toContainText('Chạm Phục vụ');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('có boa');
    const coins = await page.locator('.money strong').textContent();
    await page.reload();
    await expect(page.locator('.money strong')).toHaveText(coins!);
    await expect(page.locator('.table-space.state-consuming')).toHaveCount(1);
    await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
    const stockRow = page.locator('.stock-row').first();
    const stockBefore = Number((await stockRow.locator('.stock-info span').textContent())!.split('/')[0]);
    await stockRow.getByRole('button', { name: '+1 · 12 xu', exact: true }).click();
    await expect(stockRow.locator('.stock-info span')).toHaveText(`${stockBefore + 1} / 15`);
    const before = await page.locator('.energy strong').textContent();
    await page.clock.runFor(2000);
    expect(await page.locator('.energy strong').textContent()).not.toBe(before);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en');
    await expect(page.getByRole('heading', { name: 'Your own corner' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a neglected first shift closes cleanly after twelve minutes and shows only numeric loss feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(29000);
  await expect(page.locator('.toast-loss')).toBeVisible();
  await expect(page.locator('.toast-loss')).toHaveAccessibleName(/Trừ \d+ xu và \d+ uy tín/);
  await expect(page.locator('.toast-loss')).toHaveText(/^[−\d\s.,]+$/);
  for (const icon of await page.locator('.toast-loss svg').all()) expect((await icon.boundingBox())!.width).toBeGreaterThan(0);
  await expect(page.locator('.lost-bubble')).toHaveCount(0);
  await expect(page.getByText('Khách chờ lâu quá', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.clock.fastForward(720000);
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ngừng đón khách' })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
  expect(saved.version).toBe(2); expect(saved.log[0].command.type).toBe('startShift');
});

test('corrupt saves are preserved and the app offers the original for recovery', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tbh.save.v1', '{broken-save'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Bản lưu chưa đọc được');
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{broken-save');
});

test('muting, guide skipping and reduced-motion preference survive normal play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: 'Âm thanh Đang bật' }).click();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.settings.v1')!))).toMatchObject({ muted: true, guideDone: true });
  await expect(page.locator('.guide')).toHaveCount(0);
});


test('hidden and offline time preserves the current order and remaining shift', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(11100);
  const timeBefore = await page.locator('.energy strong').textContent();
  const coinsBefore = await page.locator('.money strong').textContent();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByText('Game tự tạm dừng', { exact: true })).toBeVisible();
  await page.clock.runFor(60000);
  await expect(page.locator('.energy strong')).toHaveText(timeBefore!);
  await expect(page.locator('.toast-loss')).toHaveCount(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.goto('about:blank');
  await page.clock.setSystemTime(new Date('2026-09-09T10:01:11.100Z'));
  await page.goto('/');
  await expect(page.locator('.energy strong')).toHaveText(timeBefore!);
  await expect(page.locator('.money strong')).toHaveText(coinsBefore!);
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('có boa');
});

test('recovery rejects a bad import, accepts a valid backup and preserves the original', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('recovery-seeded')) { localStorage.setItem('tbh.save.v1', '{bad-original'); localStorage.setItem('recovery-seeded', '1'); } });
  await page.goto('/');
  const input = page.getByLabel('Nhập file sao lưu');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('Chưa thể phục hồi.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{bad-original');
  await input.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: readFileSync('packages/engine/test/fixtures/legacy-save-v1.json') });
  await expect(page.locator('.game-shell')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tbh.backup.')).map(k => localStorage.getItem(k)))).toContain('{bad-original');
});

test('starting fresh requires an explicit choice and retains the corrupt backup', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('recovery-seeded')) { localStorage.setItem('tbh.save.v1', '{bad-reset'); localStorage.setItem('recovery-seeded', '1'); } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{bad-reset');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Giữ bản dự phòng và tạo quán mới' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ bản dự phòng và tạo quán mới' }).click();
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.locator('.money strong')).toHaveText('750');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tbh.backup.')).map(k => localStorage.getItem(k)))).toContain('{bad-reset');
});
