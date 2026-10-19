import { test, expect } from './tbh-fixture';
import { execFileSync } from 'node:child_process';
import { readSave, waitSaved } from './storage';

// Seat model (rules 28, plan S1): through the DOM only -- tables 2-4, then a second chair once four tables stand,
// every button with its price and exactly one reason while dimmed. State is read back through the real engine.
const fixture = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/seat-model.ts'], { encoding: 'utf8' }));
const inspect = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/seat-model.ts', 'inspect'], { encoding: 'utf8', input: JSON.stringify({ save }) }));
const xu = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`seat model sells tables 2-4, then a second chair, each with its price and one reason at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const f = fixture();
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => {
      if (localStorage.getItem('seat-seeded')) return;
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('seat-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, f.save);
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('.seat')).toHaveCount(1); // a new game: one table, one chair
    await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
    const sheet = page.getByRole('dialog'), cards = sheet.locator('#upgrade-tables ~ .upgrade-grid .upgrade-card'), first = cards.first();
    await expect(cards).toHaveCount(1); await expect(first.getByText('1 chỗ', { exact: true })).toBeVisible();
    const chair = first.getByRole('button', { name: `Thêm ghế · ${xu(f.chairPrice)} xu`, exact: true });
    await expect(chair).toBeDisabled(); await expect(first.getByText('Mua đủ bàn trước đã.', { exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: /^Nâng · / })).toBeDisabled(); await expect(first.getByText('Bàn cần 2 ghế.', { exact: true })).toBeVisible();
    for (const [i, price] of (f.tablePrices as number[]).entries()) {
      const buy = sheet.getByRole('button', { name: `Mua bàn · ${xu(price)} xu`, exact: true });
      await expect(buy).toBeEnabled(); await buy.click(); await expect(cards).toHaveCount(i + 2);
    }
    await expect(sheet.getByRole('button', { name: 'Mua thêm bàn', exact: true })).toBeDisabled();
    await expect(sheet.getByText('Quán đã đủ bàn.', { exact: true })).toBeVisible();
    await expect(chair).toBeEnabled(); await chair.click();
    await expect(first.getByText('2 chỗ', { exact: true })).toBeVisible(); await expect(chair).toHaveCount(0);
    // The usual starting coins are left: the next chair and the table level each give the one reason "Chưa đủ xu."
    await expect(cards.nth(1).getByRole('button', { name: /^Thêm ghế · / })).toBeDisabled();
    await expect(cards.nth(1).getByText('Chưa đủ xu.', { exact: true }).first()).toBeVisible();
    await expect(first.getByRole('button', { name: `Nâng · ${xu(f.levelPrice)} xu`, exact: true })).toBeDisabled();
    await expect(first.getByText('Chưa đủ xu.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tbh.shot(`seat-model-${viewport.width}.png`);
    await page.keyboard.press('Escape'); await waitSaved(page);
    const state = inspect(await readSave(page));
    expect(state.tables).toEqual([{ seats: 2, level: 1 }, { seats: 1, level: 1 }, { seats: 1, level: 1 }, { seats: 1, level: 1 }]);
    expect(state.events).toEqual([...f.tablePrices.map((cost: number) => ({ type: 'table_bought', cost })), { type: 'chair_bought', cost: f.chairPrice }]);
    expect(state.coins).toBe(f.coins - f.tablePrices.reduce((a: number, b: number) => a + b, 0) - f.chairPrice);
    await page.reload(); await expect(page.locator('.seat')).toHaveCount(5);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}
