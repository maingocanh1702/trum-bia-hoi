import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode = '', save?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/live-upgrades.ts', mode], { encoding: 'utf8', input: save ? JSON.stringify({ save }) : undefined }));
for (const poor of [false, true]) test(`kitchen can be bought in the current shift while its menu stays paused, sufficient funds=${!poor}`, async ({ page }) => {
  const f = fixture(poor ? 'poor' : ''); await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('upgrades-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('upgrades-seeded', '1'); } }, f.save);
  await page.goto('/');
  const snapshot = async () => fixture('inspect', await readSave(page));
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.locator('.kitchen-entry').click();
  const panel = page.getByRole('dialog', { name: 'Bếp', exact: true }), buy = panel.getByRole('button', { name: /^Nâng ·/ });
  await expect(panel.getByText('Nâng cấp sau khi đóng ca. Ca vẫn đang chạy.', { exact: true })).toHaveCount(0);
  await page.clock.runFor(1000); const before = await snapshot();
  if (poor) { await expect(buy).toBeDisabled(); await expect(panel.locator('.upgrade-card').getByRole('status')).toHaveText('Chưa đủ xu.'); }
  else {
    await expect(buy).toBeEnabled(); await buy.click(); await page.clock.runFor(1000);
    const bought = await snapshot(); expect(bought.equipment.kitchen).toBe(1); expect(bought.coins).toBe(before.coins - f.kitchenPrice);
    expect(bought.spent).toBe(before.spent + f.kitchenPrice); expect(bought.inventory).toEqual(before.inventory);
    await page.screenshot({ path: '.qa/live-upgrade-kitchen-390.png' });
  }
  await expect(panel).toBeVisible(); await page.clock.runFor(40000); const held = await snapshot();
  expect(held.paused).toBe(true); expect(held.remaining).toBe(before.remaining); expect(held.shiftRemaining).toBe(before.shiftRemaining);
  expect(held.orderId).toBe(before.orderId); expect(held.shiftId).toBe(before.shiftId); expect(held.expired).toBe(0);
  await panel.getByRole('button', { name: 'Bếp ×', exact: true }).click(); await page.clock.runFor(1000);
  const resumed = await snapshot(); expect(resumed.paused).toBe(false); expect(resumed.remaining).toBe(before.remaining - 1000);
  await waitSaved(page); await page.reload(); expect((await snapshot()).equipment.kitchen).toBe(poor ? 0 : 1);
});
