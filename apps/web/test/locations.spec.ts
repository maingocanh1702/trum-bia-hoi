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
  const market = dialog.locator('[data-location="ngo_cho"]'); await expect(market.getByRole('button')).toContainText(vi ? '37.500' : '37,500'); // JSON 2.1.0: 3 days x 10 000 + the 7 500 deposit
  await expect(dialog.locator('[data-location="pho_co"] button')).toBeDisabled(); const before = await snapshot();
  await market.getByRole('button').click(); const rented = await snapshot(); expect(rented.coins).toBe(before.coins - 37500); expect(rented.lease.locationId).toBe('ngo_cho');
  await expect(dialog).toBeVisible(); expect(rented.paused).toBe(true); await page.clock.runFor(10000);
  expect((await snapshot()).lease.expiresAt).toBe(rented.lease.expiresAt);
  await expect(dialog.getByText(vi ? /Chuyển chỗ bây giờ mất 7.500/ : /Moving now forfeits 7,500/)).toBeVisible();
  await dialog.locator('[data-location="ben_xe"] button').click(); const moved = await snapshot(); expect(moved.coins).toBe(rented.coins - 63750); expect(moved.location).toBe('ben_xe'); // Ben Xe: 3 days x 17 000 + the 12 750 deposit
  await dialog.evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: `.qa/lease-${locale}-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await waitSaved(page); await page.reload(); expect((await snapshot()).lease.id).toBe(moved.lease.id);
  await open();
  if (vi) await dialog.getByRole('button', { name: /^Rời về/ }).click();
  else { const current = await snapshot(); await page.clock.fastForward(current.lease.expiresAt - current.now + 1000); }
  expect((await snapshot()).location).toBe('hem_nho'); expect((await snapshot()).coins).toBe(moved.coins + (vi ? 0 : moved.lease.deposit));
  await expect(dialog).toBeVisible(); expect(errors).toEqual([]);
});

for (const [locale, width] of [['vi', 360], ['en', 390], ['vi', 1280]] as const) test(`closed shift location stays historical after moving and reloading in ${locale} at ${width}px`, async ({ page }) => {
  const f = fixture('book'), vi = locale === 'vi', errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: width === 360 ? 740 : 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(({ save, locale }) => { if (!localStorage.getItem('lease-book-seeded')) {
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true, locale })); localStorage.setItem('lease-book-seeded', '1');
  } }, { save: f.save, locale });
  await page.goto('/');
  for (const reload of [false, true]) {
    if (reload) { await waitSaved(page); await page.reload(); }
    await page.getByRole('button', { name: vi ? 'Sổ ca' : 'Shift book', exact: true }).click();
    const panel = page.getByRole('region', { name: vi ? 'Địa điểm trong ca' : 'Locations this shift', exact: true });
    await expect(panel.locator('[data-shift-location]')).toHaveCount(1);
    await expect(panel.locator('[data-shift-location="ngo_cho"]')).toHaveText(vi ? 'Ngõ Chợ ×1,019' : 'Market Lane ×1.019'); // the sealed 2.1.0 ramp prints its three decimals
    expect(fixture('inspect', await readSave(page)).location).toBe('ben_xe');
    await panel.scrollIntoViewIfNeeded(); expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (!reload) await panel.screenshot({ path: `.qa/v03-f14-${locale}-${width}.png` });
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});
