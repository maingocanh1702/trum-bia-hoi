import { readSave, waitSaved } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (save?: string, legacy = false) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/production.ts', ...(save ? ['inspect'] : legacy ? ['legacy'] : [])], { encoding: 'utf8', input: save ? JSON.stringify({ save }) : undefined }));
for (const width of [360, 390]) test(`stocked beer capacity and upgrade comparison update live, with frozen batch progress in menus at ${width}px`, async ({ page }) => {
  const f = fixture(); await page.setViewportSize({ width, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('batch-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('batch-seeded', '1'); } }, f.save);
  await page.goto('/');
  const keg = page.getByRole('button', { name: 'Vòi rót', exact: true }), washer = page.getByRole('button', { name: 'Bồn rửa', exact: true });
  const snapshot = async () => fixture(await readSave(page));
  await expect(washer.locator('.capacity-badge')).toHaveText('0/1');
  const cooler = page.locator('.equipment-object.cooler');
  await expect(cooler.locator('.capacity-badge')).toHaveText('8.04s');
  await cooler.click(); const coldPanel = page.getByRole('dialog');
  await expect(coldPanel.getByText('Giữ tươi 8.04s', { exact: true })).toBeVisible();
  await expect(coldPanel.getByText('Giữ tươi 13.4s', { exact: true })).toBeVisible();
  await coldPanel.getByRole('button', { name: /×$/ }).click();
  await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 0/5 cốc'); await expect(keg.getByRole('progressbar')).toBeVisible();
  await page.screenshot({ path: `.qa/batch-yard-${width}.png` });
  await keg.click(); const panel = page.getByRole('dialog', { name: 'Vòi rót', exact: true });
  await page.clock.runFor(1000); const before = await snapshot();
  await expect(panel.getByText(/rót sẵn tối đa 5 cốc$/)).toHaveCount(2);
  await expect(panel.getByText('5 ly/mẻ · 3s', { exact: true })).toBeVisible();
  await expect(panel.getByText('Rót sẵn 0/5 cốc · +5 cốc / 3 s', { exact: true })).toBeVisible();
  await expect(panel.getByText('Bom nhựa + vòi tay', { exact: true })).toBeVisible();
  await expect(page.locator('.beer-pipeline')).toContainText('Bia: 0 cốc sẵn · bom');
  await expect(page.locator('.beer-stock')).toHaveAccessibleName(/^Bom bia \d+\/\d+ cốc$/);
  await expect(panel.getByText('5 ly/mẻ · 2.7s', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: /^Nâng ·/ }).click(); await page.clock.runFor(40000);
  const held = await snapshot(); expect(held.paused).toBe(true); expect(held.beer.remainingMs).toBe(before.beer.remainingMs); expect(held.beer.progress).toBe(before.beer.progress); expect(held.inventory).toEqual(before.inventory); expect(held.remaining).toBe(before.remaining); expect(held.equipment.keg).toBe(2);
  await expect(keg.locator('img')).toHaveAttribute('src', /keg-lv2-imagegen-v1\.png/);
  await expect(panel.locator('img[src*="keg-lv3-imagegen-v1"]')).toHaveCount(1);
  await page.screenshot({ path: `.qa/batch-panel-${width}.png` });
  await panel.getByRole('button', { name: 'Vòi rót ×', exact: true }).click(); await page.clock.runFor(held.beer.remainingMs);
  await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc'); expect((await snapshot()).beer.busy).toBe(0);
  await page.clock.runFor(5000); await page.locator('.table-order-hint').first().click();
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 4/5 cốc'); await expect(keg.getByRole('progressbar')).toBeVisible();
  await page.clock.runFor(2700); await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc');
  await waitSaved(page); await page.reload(); await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc');
  await washer.click(); const washPanel = page.getByRole('dialog', { name: 'Bồn rửa', exact: true });
  await expect(washPanel.getByText('1 ly/mẻ · 7s', { exact: true })).toBeVisible();
  await expect(washPanel.getByText('1 ly/mẻ · 5s', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await washPanel.getByRole('button', { name: 'Bồn rửa ×', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
  await expect(page.locator('.beer-stock')).toHaveAccessibleName(/^Beer keg \d+\/\d+ glasses$/);
  await expect(page.locator('.beer-pipeline')).toContainText('Beer:');
  await page.getByRole('button', { name: 'Beer taps', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/^Poured \d+\/5 · \+5 every 2.7s$/)).toBeVisible();
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Restock', exact: true }).click();
  await expect(page.locator('.stock-row').first().getByText('Buy keg', { exact: true })).toBeVisible();

});


test('legacy washing shows an indeterminate bar in the yard and paused equipment panel', async ({ page }) => {
  const f = fixture(undefined, true);
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); }, f.save);
  await page.goto('/');
  const washer = page.getByRole('button', { name: 'Bồn rửa', exact: true });
  await expect(washer.locator('.capacity-badge')).toHaveText('1/1');
  await expect(washer.getByRole('progressbar')).not.toHaveAttribute('value');
  await washer.click(); const panel = page.getByRole('dialog', { name: 'Bồn rửa', exact: true });
  await expect(panel.getByRole('progressbar')).not.toHaveAttribute('value');
  await expect(panel.getByText('Đang làm 1 ly · còn 5s', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Bồn rửa ×', exact: true }).click();
  await page.clock.runFor(2431); await washer.click();
  await expect(panel.getByRole('progressbar')).not.toHaveAttribute('value');
  await expect(panel.getByText('Đang làm 1 ly · còn 3s', { exact: true })).toBeVisible();
});

test('reload immediately after a completed beer batch warns while its save is pending and preserves the batch', async ({ page }) => {
  const f = fixture(); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('batch-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('batch-seeded', '1'); } }, f.save);
  await page.goto('/'); await waitSaved(page);
  const keg = page.getByRole('button', { name: 'Vòi rót', exact: true });
  await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 0/5 cốc');
  // A real user gesture makes the browser's beforeunload protection eligible.
  await page.locator('.money').click();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('tbh.career.v1'); open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction('head', 'readwrite'); let held = true;
        // Hold a real competing transaction so the event write cannot commit before reload.
        (window as unknown as { releaseTestWrite: () => void }).releaseTestWrite = () => { held = false; };
        const keep = () => { const row = tx.objectStore('head').get('current'); row.onsuccess = () => { if (held) keep(); }; };
        keep(); tx.oncomplete = () => db.close(); resolve();
      };
    });
  });
  await page.clock.runFor(3000); await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc');
  await expect(page.locator('.game-shell')).toHaveAttribute('data-save-state', 'saving');
  const dialog = page.waitForEvent('dialog'); const reload = page.evaluate(() => location.reload());
  const warning = await dialog; expect(warning.type()).toBe('beforeunload'); await warning.dismiss();
  await reload;
  await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc');
  await page.evaluate(() => (window as unknown as { releaseTestWrite: () => void }).releaseTestWrite());
  await waitSaved(page); await page.reload(); await expect(keg.locator('.capacity-badge')).toHaveText('Rót sẵn 5/5 cốc');
});
