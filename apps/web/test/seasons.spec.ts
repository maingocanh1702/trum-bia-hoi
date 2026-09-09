import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode: string, input?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/seasons.ts', mode], { encoding: 'utf8', input }));
for (const [locale, width] of [['vi', 360], ['en', 390]] as const) test(`personal seasons preserve customer pause and show calendar rollover at ${width}px in ${locale}`, async ({ page }) => {
  const f = fixture('ready'), vi = locale === 'vi', errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(({ save, locale }) => { if (!localStorage.getItem('season-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true, locale })); localStorage.setItem('season-seeded', '1'); } }, { save: f.save, locale });
  await page.goto('/');
  const snapshot = async () => fixture('inspect', await readSave(page));
  const open = async () => {
    await page.getByRole('button', { name: vi ? 'Đường lên Trùm' : 'Your journey', exact: true }).click();
    await page.getByRole('button', { name: vi ? 'Giải Nhậu & Vụ Bia' : 'League & Seasons', exact: true }).click();
  };
  await open(); const dialog = page.getByRole('dialog', { name: vi ? 'Giải Nhậu & Vụ Bia' : 'League & Seasons', exact: true });
  await expect(dialog).toBeVisible(); const before = await snapshot(); expect(before.paused).toBe(true); expect(before.waiting).not.toBeNull();
  await page.clock.runFor(10000); expect((await snapshot()).waiting).toBe(before.waiting);
  await expect(dialog.getByText(vi ? /Bảng xếp hạng cộng đồng chưa mở/ : /Community rankings are not open/)).toBeVisible();
  await page.screenshot({ path: `.qa/seasons-${locale}-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const current = await snapshot(); await page.clock.fastForward(current.seasons.ranking.endsAt - current.now + 1000);
  const rolled = await snapshot(); expect(rolled.earned).toBe(0); expect(rolled.seasons.contestEarned).toBe(before.seasons.contestEarned);
  expect(rolled.seasons.results[0].earned).toBe(before.earned); expect(rolled.waiting).toBe(before.waiting);
  await expect(dialog.getByRole('region', { name: vi ? 'Vụ Phân Hạng' : 'Ranking Season' }).getByText(vi ? '0 Xu' : '0 Coins', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await waitSaved(page); await page.reload();
  expect((await snapshot()).seasons.results).toEqual(rolled.seasons.results); await open(); await expect(dialog).toBeVisible(); expect(errors).toEqual([]);
});
