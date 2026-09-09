import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/attendance.ts'], { encoding: 'utf8' }));
for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
  test(`attendance claims exactly once, shows unclaimed past days and survives reload at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const f = fixture(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(f.now));
    await page.addInitScript(save => { if (!localStorage.getItem('attendance-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('attendance-seeded', '1'); } }, f.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    await page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Điểm danh 7 ngày', exact: true }), cells = panel.locator('.attendance-track li');
    await expect(cells).toHaveCount(f.rewards.length); await expect(cells.nth(0)).toContainText('Đã nhận'); await expect(cells.nth(1)).toContainText('Đã qua');
    await expect(cells.nth(5)).toHaveAttribute('aria-current', 'step'); await expect(cells.nth(5)).toContainText('Hôm nay');
    const claim = panel.getByRole('button', { name: `Nhận +${f.rewards[5]} uy tín`, exact: true }); await claim.scrollIntoViewIfNeeded();
    const box = (await claim.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    await claim.click(); await expect(panel.getByRole('button', { name: 'Đã nhận hôm nay', exact: true })).toBeDisabled();
    await expect(page.locator('.stock-strip .reputation')).toHaveText(new Intl.NumberFormat('vi-VN').format(f.reputation + f.rewards[5]));
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(f.coins));
    await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `.qa/attendance-${viewport.width}.png` });
    await waitSaved(page); await page.reload(); await page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Đã nhận hôm nay', exact: true })).toBeDisabled();
    const saved = JSON.parse(await readSave(page));
    expect(saved.events.filter((e: { type: string }) => e.type === 'attendance_claimed')).toHaveLength(f.claims + 1);
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Daily quests', exact: true }).click();
    await expect(page.getByRole('region', { name: '7-day check-in', exact: true }).getByRole('button', { name: 'Claimed today', exact: true })).toBeDisabled();
    await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}
test('live midnight expires an unclaimed check-in and wraps after the seventh observed day', async ({ page }) => {
  const f = fixture(); await page.setViewportSize({ width: 390, height: 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save); await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click(); const panel = page.locator('.attendance-panel');
  await expect(panel.getByRole('button', { name: `Nhận +${f.rewards[5]} uy tín`, exact: true })).toBeEnabled();
  await page.clock.runFor(1100); await expect(panel.locator('[aria-current]')).toContainText('Ngày 7'); await expect(panel.locator('li').nth(5)).toContainText('Đã qua');
  await panel.getByRole('button', { name: `Nhận +${f.rewards[6]} uy tín`, exact: true }).click();
  await page.clock.fastForward(86400000); await expect(panel.locator('[aria-current]')).toContainText('Ngày 1'); await expect(panel.locator('[data-state="claimed"]')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: `Nhận +${f.rewards[0]} uy tín`, exact: true })).toBeEnabled();
  await expect(page.locator('.stock-strip .reputation')).toHaveText(new Intl.NumberFormat('vi-VN').format(f.reputation + f.rewards[6]));
});
test('returning after offline days resets the cycle without backfilling rewards or attendance', async ({ page }) => {
  const f = fixture(), now = f.now + 86400000 * 3; await page.clock.pauseAt(new Date(now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), f.save); await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Nhiệm vụ ngày', exact: true }).click(); const panel = page.locator('.attendance-panel');
  await expect(panel.locator('[aria-current]')).toContainText('Ngày 1'); await expect(panel.locator('[data-state="claimed"]')).toHaveCount(0);
  await expect(page.locator('.stock-strip .reputation')).toHaveText(new Intl.NumberFormat('vi-VN').format(f.reputation));
  await panel.getByRole('button', { name: `Nhận +${f.rewards[0]} uy tín`, exact: true }).click();
  const saved = JSON.parse(await readSave(page));
  expect(saved.events.filter((e: { type: string }) => e.type === 'attendance_day_opened')).toHaveLength(f.visits + 1);
  expect(saved.events.filter((e: { type: string }) => e.type === 'attendance_claimed')).toHaveLength(f.claims + 1);
});
test('a new guest visit is recorded before opening a shift', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-09T10:00:00Z') }); await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click(); await page.clock.runFor(1000);
  const saved = JSON.parse(await readSave(page));
  expect(saved.log.some((e: { command: { type: string } }) => e.command.type === 'startShift')).toBe(false);
  expect(saved.events.filter((e: { type: string }) => e.type === 'attendance_day_opened')).toHaveLength(1);
  expect(saved.events.filter((e: { type: string }) => e.type === 'attendance_claimed')).toHaveLength(0);
});
