import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
function fixture(midnight = false) { return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/quests.ts', ...(midnight ? ['--midnight'] : [])], { encoding: 'utf8' })); }
for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
  test(`daily claim follows actual service, persists once and switches locale at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const f = fixture(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => { if (!localStorage.getItem('quest-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('quest-seeded', '1'); } }, f.save);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }); await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Nhiệm vụ ngày', exact: true }), row = panel.locator('[data-quest="serve_tables"]');
    await expect(row.getByRole('button', { name: 'Nhận thưởng', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape'); await page.locator('.table-order-hint.is-ready').first().click();
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    const coins = await page.locator('.money strong').textContent(), rep = await page.locator('.stock-strip .reputation').textContent();
    await trigger.click(); await expect(row.locator('progress')).toHaveAttribute('value', '1');
    const claim = row.getByRole('button', { name: 'Nhận thưởng', exact: true }); await expect(claim).toBeEnabled();
    await claim.click(); await expect(row.getByRole('button', { name: 'Đã nhận', exact: true })).toBeDisabled();
    const number = (s: string | null) => Number(s!.replace(/\D/g, '')), format = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
    await expect(page.locator('.money strong')).toHaveText(format(number(coins) + f.quest.coin));
    await expect(page.locator('.stock-strip .reputation')).toHaveText(format(number(rep) + f.quest.reputation));
    await expect(panel.locator('.quest-list li')).toHaveCount(5);
    await expect(panel.locator('[data-quest="gift_3"]')).toContainText('Gửi quà chưa khả dụng');
    await expect(panel.locator('.quest-bonus button')).toBeDisabled();
    await row.scrollIntoViewIfNeeded(); await page.screenshot({ path: `.qa/quests-claimed-${viewport.width}.png` });
    await waitSaved(page); await page.reload(); await trigger.click(); await expect(row.getByRole('button', { name: 'Đã nhận', exact: true })).toBeDisabled();
    await page.clock.runFor(1000); const saved = JSON.parse(await readSave(page));
    expect(saved.events.filter((e: { type: string }) => e.type === 'quest_claimed')).toHaveLength(1);
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Daily quests', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Daily quests', exact: true })).toContainText('Claimed');
    await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}
test('open daily sheet expires an unclaimed reward at VN midnight', async ({ page }) => {
  const f = fixture(true); await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save);
  await page.goto('/');
  await page.locator('.table-order-hint.is-ready').first().click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Nhiệm vụ ngày', exact: true });
  await expect(panel.locator('[data-quest="serve_tables"] button')).toBeEnabled();
  await page.clock.runFor(f.daily.expiresAt - f.now + 100);
  await expect(panel.locator('.quest-summary strong')).not.toHaveText(f.daily.day);
  for (const button of await panel.locator('.quest-list button').all()) await expect(button).toBeDisabled();
  await page.clock.runFor(1000); const saved = JSON.parse(await readSave(page));
  expect(saved.events.filter((e: { type: string }) => e.type === 'quest_claimed')).toHaveLength(0);
});

for (const threshold of [2, 3]) {
  test(`onboarding reveals both quest entries only after ${threshold} finalized shifts`, async ({ page }) => {
    const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/quests.ts', `--onboarding=${threshold}`], { encoding: 'utf8' }));
    await page.setViewportSize({ width: 390, height: 844 }); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => { if (!localStorage.getItem('quest-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('quest-seeded', '1'); } }, f.save);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true })).toHaveCount(0);
    for (let completed = 0; completed < threshold; completed++) {
      await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
      const skip = page.getByRole('button', { name: 'Bỏ qua', exact: true }); if (await skip.count()) await skip.click();
      await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
      const book = page.getByRole('dialog', { name: 'Sổ ca hôm nay', exact: true });
      await expect(book.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true })).toHaveCount(0);
      await book.getByRole('button', { name: 'Ngừng đón khách', exact: true }).click();
      await expect(book.getByRole('button', { name: 'Ngừng đón khách', exact: true })).toHaveCount(0);
      await expect(book.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true })).toHaveCount(completed + 1 === threshold ? 1 : 0);
      if (completed + 1 < threshold) { await page.keyboard.press('Escape'); await expect(page.locator('.quest-trigger')).toHaveCount(0); }
    }
    await page.getByRole('dialog', { name: 'Sổ ca hôm nay', exact: true }).getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click();
    await expect(page.locator('.quest-list li')).toHaveCount(5); await page.keyboard.press('Escape');
    await expect(page.locator('.quest-trigger')).toBeVisible(); await waitSaved(page); await page.reload(); await expect(page.locator('.quest-trigger')).toBeVisible();
    await page.locator('.quest-trigger').click(); await expect(page.locator('.quest-list li')).toHaveCount(5);
  });
}
