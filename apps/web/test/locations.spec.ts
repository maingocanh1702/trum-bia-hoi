import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode: string, input?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/locations.ts', mode], { encoding: 'utf8', input }));
for (const [locale, width] of [['vi', 360], ['en', 390]] as const) test(`rental quote, early move, pause and reload at ${width}px in ${locale}`, async ({ page }) => {
  const f = fixture('ready'), vi = locale === 'vi', errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(({ save, locale }) => { if (!localStorage.getItem('lease-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true, locale })); localStorage.setItem('lease-seeded', '1'); } }, { save: f.save, locale });
  await page.goto('/');
  const snapshot = async () => fixture('inspect', await readSave(page));
  const open = async () => { await page.getByRole('button', { name: vi ? 'Nâng cấp' : 'Upgrades', exact: true }).click(); await page.getByRole('button', { name: vi ? /Mặt bằng/ : /Locations/ }).click(); };
  await open(); const dialog = page.getByRole('dialog', { name: vi ? 'Mặt bằng' : 'Locations', exact: true });
  const market = dialog.locator('[data-location="ngo_cho"]'); await expect(market.getByRole('button')).toContainText(vi ? '87.500' : '87,500');
  await expect(dialog.locator('[data-location="pho_co"] button')).toBeDisabled(); const before = await snapshot();
  await market.getByRole('button').click(); const rented = await snapshot(); expect(rented.coins).toBe(before.coins - 87500); expect(rented.lease.locationId).toBe('ngo_cho');
  await expect(dialog).toBeVisible(); expect(rented.paused).toBe(true); await page.clock.runFor(10000);
  expect((await snapshot()).lease.expiresAt).toBe(rented.lease.expiresAt);
  await expect(dialog.getByText(vi ? /Chuyển chỗ bây giờ mất 17.500/ : /Moving now forfeits 17,500/)).toBeVisible();
  await dialog.locator('[data-location="ben_xe"] button').click(); const moved = await snapshot(); expect(moved.coins).toBe(rented.coins - 148750); expect(moved.location).toBe('ben_xe');
  await dialog.evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: `.qa/lease-${locale}-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await waitSaved(page); await page.reload(); expect((await snapshot()).lease.id).toBe(moved.lease.id);
  await open();
  if (vi) await dialog.getByRole('button', { name: /^Rời về/ }).click();
  else { const current = await snapshot(); await page.clock.fastForward(current.lease.expiresAt - current.now + 1000); }
  expect((await snapshot()).location).toBe('hem_nho'); expect((await snapshot()).coins).toBe(moved.coins + (vi ? 0 : moved.lease.deposit));
  await expect(dialog).toBeVisible(); expect(errors).toEqual([]);
});
