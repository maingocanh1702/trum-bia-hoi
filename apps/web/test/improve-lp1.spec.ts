import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { waitSaved } from './storage';

test('production guest reaches LP1 without hidden dog and preserves previous shift history on reload', async ({ page }) => {
  test.setTimeout(180000);
  const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/lp1.ts'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: f.now });
  await page.addInitScript(({ save }) => {
    if (!localStorage.getItem('lp1-fixture')) {
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('lp1-fixture', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true }));
    }
  }, { save: f.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect(page.locator('.resting-message')).toHaveCount(0);
  await waitSaved(page);
  const inspect = async () => {
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tải bản lưu dự phòng', exact: true }).click();
    const archive = readFileSync((await (await pending).path())!, 'utf8');
    await page.keyboard.press('Escape');
    return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/lp1.ts', 'inspect'], { encoding: 'utf8', input: archive, maxBuffer: 64 * 1024 * 1024 }));
  };
  expect(await inspect()).toEqual({ version: f.configVersion, level: 1, dog: 0, lifetime: f.lifetime });
  await expect(page.locator('.dog-object')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); await waitSaved(page);
  expect(await inspect()).toEqual({ version: f.configVersion, level: 1, dog: 0, lifetime: f.lifetime });
  expect(errors).toEqual([]);
});
