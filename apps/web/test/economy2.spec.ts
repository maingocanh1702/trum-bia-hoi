import { readSave, waitSaved } from './storage';
import { readFileSync } from 'node:fs';
const seed = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8'));
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const fixture = (mode: string, input?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/economy2.ts', mode], { encoding: 'utf8', input }));
for (const width of [360, 390]) test(`new economy capacities, LP gate and glass purchases stay paused at ${width}px`, async ({ page }) => {
  const f = fixture('modern'), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width, height: 844 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(save => { if (!localStorage.getItem('eco-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ welcomed: true, guideDone: true })); localStorage.setItem('eco-seeded', '1'); } }, f.save);
  await page.goto('/'); const snapshot = async () => fixture('inspect', await readSave(page));
  await page.getByRole('button', { name: 'Vòi rót', exact: true }).click(); const keg = page.getByRole('dialog', { name: 'Vòi rót', exact: true });
  const capacity = seed.upgrades.keg.kegStorage[2];
  await expect(keg.getByText(new RegExp(`rót sẵn tối đa ${capacity} cốc$`))).toBeVisible();
  await expect(keg.getByText(`3 vòi · 1.6 s/cốc · rót sẵn tối đa ${capacity} cốc`, { exact: true })).toBeVisible();
  await expect(keg.getByRole('button', { name: /^Nâng ·/ })).toBeDisabled(); await expect(keg.locator('.upgrade-card').getByRole('status')).toContainText('Cần đạt');
  const before = await snapshot(); await page.clock.runFor(30000); const after = await snapshot();
  expect(after.beer).toEqual(before.beer); expect(after.remaining).toBe(before.remaining);
  await page.screenshot({ path: `.qa/economy2-keg-${width}.png` });
  await keg.getByRole('button', { name: 'Vòi rót ×', exact: true }).click();
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
  await page.clock.runFor(1000); expect((await snapshot()).version).toBe(seed._meta.version);
  await waitSaved(page); await page.reload(); expect((await snapshot()).version).toBe(seed._meta.version);
});

for (const lang of ['vi', 'en']) test(`upgrade and stock labels distinguish ingredients from cooked dishes in ${lang}`, async ({ page }) => {
  const f = fixture('modern'), labels = JSON.parse(readFileSync(`apps/web/src/i18n/${lang}.json`, 'utf8'));
  const copy = (key: string, params: Record<string, string | number> = {}) => labels[key].replace(/\{(\w+)\}/g, (_: string, key: string) => String(params[key]));
  await page.setViewportSize({ width: 360, height: 740 }); await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(({ save, lang }) => { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify({ language: lang, welcomed: true, guideDone: true })); }, { save: f.save, lang });
  await page.goto('/');
  // Choose through the real locale control so this also exercises the persisted i18n setting.
  await page.getByRole('button', { name: /^(Cài đặt|Settings)$/ }).click();
  await page.locator('select').first().selectOption(lang); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: labels['nav.upgrades'], exact: true }).click();
  const phone = page.locator('.business-card').filter({ has: page.getByRole('heading', { name: labels['business.phone'], exact: true }) });
  await expect(phone).toContainText(labels['business.phoneEffect']);
  await expect(phone.locator('.requirement-list')).toContainText(labels[`lifePath.${seed.unlocks.phone.gate}`]);
  const qr = page.locator('.business-card').filter({ hasText: labels['business.qr'] });
  await expect(qr.locator('.requirement-list li').first()).toContainText(labels['requirement.phone']);
  await expect(qr).toContainText(copy('business.qrEffect', { mult: seed.tip.qrMult }));
  await expect(page.locator('.kitchen-entry')).toContainText(labels['kitchen.locked']);
  await expect(page.locator('.kitchen-entry')).not.toContainText('0/0');
  await page.locator('.kitchen-entry').click();
  const card = page.locator('.equipment-detail .upgrade-card');
  await expect(page.locator('.kitchen-panel header')).toHaveCount(0);
  await expect(card).toContainText(labels['kitchen.rawStock']);
  for (let level = 1; level <= 3; level++) {
    const next = card.locator('.equipment-comparison section').last();
    await expect(next).toContainText(copy('production.kitchenSlots', { n: seed.upgrades.kitchen.slots[level] }));
    await expect(next).toContainText(copy('production.portions', { n: seed.upgrades.kitchen.portionsPerPan[level] }));
    await expect(next).toContainText(copy('kitchen.speed', { percent: Math.round((1 - seed.upgrades.kitchen.prepMult[level]) * 100) }));
    for (const dish of seed.upgrades.kitchen.unlocks[level]) await expect(next).toContainText(labels[`dish.${dish}`]);
    if (level < 3) await card.getByRole('button').click();
  }
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: labels['nav.stock'], exact: true }).click();
  for (const [index, dish] of ['bia', 'lac', 'nem', 'dau', 'topmo', 'long'].entries()) {
    const row = page.locator('.stock-row').nth(index);
    await expect(row.locator('.stock-info strong')).toHaveText(labels[`ingredient.${dish}`]);
    if (seed.menu[dish].station === 'kitchen') await expect(row).toContainText(copy('stock.cookHint', { dish: labels[`dish.${dish}`] }));
    else await expect(row.locator('.stock-info small')).toHaveCount(0);
    await expect(row.getByRole('button').first()).toHaveAccessibleDescription(labels[`ingredient.${dish}`]);
    if (dish !== 'bia') expect(await page.locator('.stock-strip > button').nth(index).getAttribute('aria-label')).toContain(`${labels[`ingredient.${dish}`]}:`);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.qa/upgrade-stock-copy-${lang}.png` });
});
