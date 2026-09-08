import { test, expect } from '@playwright/test';

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

test('a neglected first shift closes cleanly after twelve minutes and explains lost guests', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(29000);
  await expect(page.locator('.lost-bubble').first()).toContainText('Khách chờ lâu quá');
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.clock.runFor(720000);
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ngừng đón khách' })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
  expect(saved.version).toBe(1); expect(saved.log[0].command.type).toBe('startShift');
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
