import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode: string, input?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/economy2.ts', mode], { encoding: 'utf8', input }));
for (const width of [360, 390]) test(`new economy capacities, LP gate and glass purchases stay paused at ${width}px`, async ({ page }) => {
  const f = fixture('modern'), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('eco-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('eco-seeded', '1'); } }, f.save);
  await page.goto('/'); const snapshot = async () => fixture('inspect', await readSave(page));
  await page.getByRole('button', { name: 'Bom bia', exact: true }).click(); const keg = page.getByRole('dialog', { name: 'Bom bia', exact: true });
  await expect(keg.getByText('Chứa 10 ly', { exact: true })).toBeVisible();
  await expect(keg.getByText('3 vòi · 1.6s/ly', { exact: true })).toBeVisible();
  await expect(keg.getByRole('button', { name: /^Nâng ·/ })).toBeDisabled(); await expect(keg.locator('.upgrade-card').getByRole('status')).toContainText('Cần đạt');
  const before = await snapshot(); await page.clock.runFor(30000); const after = await snapshot();
  expect(after.beer).toEqual(before.beer); expect(after.remaining).toBe(before.remaining);
  await page.screenshot({ path: `.qa/economy2-keg-${width}.png` });
  await keg.getByRole('button', { name: 'Bom bia ×', exact: true }).click();
  await page.getByRole('button', { name: 'Bồn rửa', exact: true }).click(); const wash = page.getByRole('dialog', { name: 'Bồn rửa', exact: true });
  await expect(wash.getByText('Có 10 ly · Mua tối đa 40 ly', { exact: true })).toBeVisible();
  const start = await snapshot(); await wash.getByRole('button', { name: /^Mua 1 ly/ }).click(); await page.clock.runFor(10000);
  const bought = await snapshot(); expect(bought.glasses).toBe(start.glasses + 1); expect(bought.coins).toBe(start.coins - 1000); expect(bought.paused).toBe(true); expect(bought.remaining).toBe(start.remaining);
  await expect(wash.getByText('Có 11 ly · Mua tối đa 40 ly', { exact: true })).toBeVisible();
  await page.screenshot({ path: `.qa/economy2-glasses-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  await wash.getByRole('button', { name: 'Bồn rửa ×', exact: true }).click(); await waitSaved(page); await page.reload(); expect((await snapshot()).glasses).toBe(11);
});

test('the local start action adopts the new bundle from an old resting save, without repricing it on reload', async ({ page }) => {
  const f = fixture('legacy'); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('eco-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('eco-seeded', '1'); } }, f.save);
  await page.goto('/'); const snapshot = async () => fixture('inspect', await readSave(page));
  expect((await snapshot()).version).toBe(f.version);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).click();
  await page.clock.runFor(1000); expect((await snapshot()).version).toBe('2.0.1');
  await waitSaved(page); await page.reload(); expect((await snapshot()).version).toBe('2.0.1');
});
