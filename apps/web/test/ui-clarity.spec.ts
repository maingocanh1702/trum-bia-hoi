import { test, expect } from './tbh-fixture';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { waitSaved } from './storage';

const fixture = (mode?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/ui-clarity.ts', ...(mode ? [mode] : [])], { encoding: 'utf8' }));
const clock = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.ceil(ms / 1000 % 60).toString().padStart(2, '0')}`;

for (const locale of ['vi', 'en']) for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    const f = fixture(), copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8'));
    await page.setViewportSize(viewport); await page.clock.pauseAt(f.now);
    await page.addInitScript(({ save, locale }) => {
      localStorage.setItem('tbh.save.v1', save);
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    for (const asset of ['menu-friedbean', 'phone-illustrated', 'sign-wood']) {
      await expect(page.locator(`head link[rel="preload"][as="image"][href*="${asset}"]`)).toHaveCount(1);
    }
    await page.getByRole('button', { name: copy['equipment.keg'], exact: true }).click();
    const panel = page.getByRole('dialog');
    await expect(panel).toContainText(locale === 'vi' ? 'Rót ra cốc: 1 vòi · 2 s/cốc · dự trữ 4 cốc' : 'Pour to tray · taps: 1 · 2s/glass · reserve capacity: 4');
    await expect(panel).toContainText(locale === 'vi' ? 'Nạp từ bom vào dự trữ: 2 cốc/mẻ · 12 s' : 'Refill reserve from keg · glasses/batch: 2 · 12s');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: copy['nav.stock'], exact: true }).click();
    const tofu = page.getByRole('dialog').locator('img[src*="menu-friedbean"]');
    await expect(tofu).toHaveCount(1); expect(await tofu.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: copy['nav.upgrades'], exact: true }).click();
    for (const asset of ['phone-illustrated', 'sign-wood']) {
      const img = page.getByRole('dialog').locator(`img[src*="${asset}"]`).first();
      await expect(img).toBeVisible(); expect(await img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    }
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: copy['nav.book'], exact: true }).first().click();
    await expect(page.getByRole('dialog').getByText(copy['book.served'], { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: copy['menu.title'] })).toContainText(locale === 'vi' ? 'Một lượt = một khách trong một đợt gọi' : 'One serve is one customer in one ordering round');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(tbh.consoleErrors()).toEqual([]); await tbh.shot(`a5-book-${locale}-${viewport.width}.png`);
  });
}

test('A5 recovery ETA follows active rest, survives reload and disappears when stamina is full', async ({ page, tbh }) => {
  const f = fixture(); await page.clock.pauseAt(f.now);
  await page.addInitScript(save => {
    if (!localStorage.getItem('clarity-seeded')) {
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('clarity-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }
  }, f.save);
  await page.goto('/'); const eta = page.locator('.rest-summary > span');
  await expect(page.locator('.energy strong')).toHaveText('0%');
  await expect(eta).toHaveText(`Hồi đầy sau ${clock(f.recoveryMs)} khi đang ở quán.`);
  await page.clock.fastForward(60000);
  await expect(eta).toHaveText(`Hồi đầy sau ${clock(f.recoveryMs - 60000)} khi đang ở quán.`);
  await waitSaved(page); await page.reload();
  await expect(eta).toHaveText(`Hồi đầy sau ${clock(f.recoveryMs - 60000)} khi đang ở quán.`);
  await page.clock.fastForward(f.recoveryMs - 60000);
  await expect(page.locator('.energy strong')).toHaveText('100%');
  await expect(eta).toHaveText('Chơi miễn phí · Không cần đăng ký');
  expect(tbh.consoleErrors()).toEqual([]); await tbh.shot('a5-recovery-full.png');
});


test('A5 zero configured recovery rate shows paused recovery without an invalid ETA', async ({ page, tbh }) => {
  const f = fixture('no-recovery'); await page.clock.pauseAt(f.now);
  await page.addInitScript(save => {
    localStorage.setItem('tbh.save.v1', save);
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, f.save);
  await page.goto('/');
  await expect(page.locator('.rest-summary > span')).toHaveText('Đang nghỉ tại quán · Chưa hồi thể lực.');
  await page.clock.fastForward(60000);
  await expect(page.locator('.energy strong')).toHaveText('0%');
  await expect(page.locator('.rest-summary')).not.toContainText(/NaN|Infinity/);
  expect(tbh.consoleErrors()).toEqual([]);
});

for (const locale of ['vi', 'en']) {
  test(`A5 legacy pinned save shows direct pour without a refill or reserve in ${locale}`, async ({ page, tbh }) => {
    const f = fixture('legacy'), copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8'));
    await page.clock.pauseAt(f.now);
    await page.addInitScript(({ save, locale }) => {
      localStorage.setItem('tbh.save.v1', save);
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/');
    await page.getByRole('button', { name: copy['equipment.keg'], exact: true }).click();
    const panel = page.getByRole('dialog');
    await expect(panel).toContainText(locale === 'vi' ? 'Rót trực tiếp: 1 vòi · 3 s/cốc' : 'Direct pour · taps: 1 · 3s/glass');
    await expect(panel).not.toContainText(locale === 'vi' ? /Nạp từ bom|dự trữ/ : /Refill reserve|reserve capacity/);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}
