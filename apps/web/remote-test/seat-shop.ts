import { expect, type Page } from '@playwright/test';

/**
 * Seat model (rules 28): a new shop is one table with one chair, and pairs leave at the door until a table has two chairs.
 * Suites written for the old 3 x 2-seat start first furnish the shop (tables 2-4, then a second chair on each) through
 * the real Upgrades sheet and the real server, paid from the fixture wallet.
 */
export async function furnishShop(page: Page) {
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
  const sheet = page.getByRole('dialog'), cards = sheet.locator('#upgrade-tables ~ .upgrade-grid .upgrade-card');
  for (let tables = 2; tables <= 4; tables++) {
    await sheet.getByRole('button', { name: /^Mua bàn · / }).click(); await expect(cards).toHaveCount(tables);
  }
  for (let i = 0; i < 4; i++) {
    await cards.nth(i).getByRole('button', { name: /^Thêm ghế · / }).click();
    await expect(cards.nth(i).getByText('2 chỗ', { exact: true })).toBeVisible();
  }
  await page.keyboard.press('Escape');
}
