import { test, expect } from './tbh-fixture';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

// Instant pour (plan "Vui 3 ca" S2, rules 28), through the DOM only on saves the real engine made (fixtures/instant-pour.ts):
// the keg shows one set of numbers, "Rót sẵn n" is what a guest can get right now, and a tray whose beer is in the reserve is ready the
// moment the order is placed. A capacity pin (what an old save keeps until its next opening) still shows and runs its tap.
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const fixture = (mode: 'seat' | 'pin') => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/instant-pour.ts', mode], { encoding: 'utf8' }));
const copyOf = (locale: string) => {
  const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
  return (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
};
/** Boot a guest from a fixture save. `controlled` lets page.clock.runFor drive engine and animation time; otherwise time is only pinned, because axe-core needs live timers. */
async function load(page: Page, f: { save: string; now: number }, locale: string, controlled: boolean) {
  if (controlled) await page.clock.install({ time: f.now }); else await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('pour-seeded')) return;
    localStorage.setItem('pour-seeded', '1'); localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs));
  }, { save: f.save, prefs: { locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true } });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  if (controlled) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
async function axe(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every(a => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.passes.length).toBeGreaterThan(0); // the audit really ran rules on this page
  return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
}
/** Step the game clock until the first order of the shift has a check hint on its table; the hint's frame is at most one step after the order. */
async function untilFirstOrder(page: Page, stepMs: number) {
  const hint = page.locator('.table-order-hint');
  for (let t = 0; t < 30000 && await hint.count() === 0; t += stepMs) { await page.clock.runFor(stepMs); await page.waitForTimeout(20); }
  await expect(hint).toHaveCount(1); return hint;
}

for (const locale of ['vi', 'en'] as const) for (const viewport of viewports) {
  test(`instant pour: the keg shows one set of numbers and "rót sẵn" counts the beers a guest can get right now (${locale}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const f = fixture('seat'), t = copyOf(locale);
    expect(f.instant).toBe(true); expect(f.ready).toBeGreaterThan(f.serveNow); expect(f.serveNow).toBe(f.clean); // four beers in the reserve, three clean glasses
    await page.setViewportSize(viewport); await load(page, f, locale, false);
    const keg = page.locator('.equipment-object.keg'), badge = keg.locator('.capacity-badge');
    const count = `${f.serveNow}/${f.capacity}`;
    await expect(badge).toHaveText(t('production.ready', { count })); await expect(badge).toHaveAccessibleName(t('production.ready', { count }));
    await expect(page.locator('.beer-pipeline')).toHaveText(t('beer.pipeline', { ready: f.serveNow, n: f.rawStock, cap: f.stockCap, clean: f.clean, total: f.glasses }));
    await keg.click(); const sheet = page.getByRole('dialog', { name: t('equipment.keg'), exact: true });
    await expect(sheet).toContainText(t('beer.poured', { ready: f.serveNow, max: f.capacity, batch: f.batch, s: f.refillS }));
    await expect(sheet).toContainText(t('production.instantHint'));
    // The two waits the engine knows (beer cause beerStock/beerRefill -> the next batch, cause glasses -> the washer), worded in the sheet and pinned here.
    await expect(sheet).toContainText(locale === 'vi' ? 'Hết cốc rót sẵn thì đợi mẻ kế, hết cốc sạch thì đợi rửa.' : 'No poured glass: next batch. No clean glass: next wash.');
    // The upgrade card compares two levels by the bom alone: reserve and refill batch, no tap count and no seconds per glass.
    await expect(sheet).toContainText(t('production.tank', { max: f.capacity })); await expect(sheet).toContainText(t('production.tank', { max: f.next.capacity }));
    await expect(sheet).toContainText(t('production.refill', { n: f.batch, seconds: f.refillS })); await expect(sheet).toContainText(t('production.refill', { n: f.next.batch, seconds: f.next.refillS }));
    for (const key of ['production.taps', 'production.pouring', 'production.reserveHint']) await expect(sheet).not.toContainText(t(key, { n: 0, seconds: 0, max: 0, busy: 0, total: 0 }).split(/\d/)[0].trim());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await axe(page)).toEqual([]); await tbh.shot(`s2-keg-${locale}-${viewport.width}.png`);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}

for (const viewport of viewports) {
  test(`instant pour: a guest's beer is in the tray the moment the order is placed, and the badge drops by one (vi) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const f = fixture('seat'), t = copyOf('vi');
    await page.setViewportSize(viewport); await load(page, f, 'vi', true);
    const badge = page.locator('.equipment-object.keg .capacity-badge');
    await expect(badge).toHaveText(t('production.ready', { count: `${f.serveNow}/${f.capacity}` }));
    const hint = await untilFirstOrder(page, 100);
    // The first frame that shows the order already shows it ready: with a 2 s tap it took 20 steps of this loop.
    await expect(hint).toHaveClass(/is-ready/);
    await expect(badge).toHaveText(t('production.ready', { count: `${f.serveNow - 1}/${f.capacity}` })); // one beer and one glass left the reserve: min(3, 2)
    await hint.click(); const panel = page.locator('#active-table-order');
    await expect(panel.locator('[data-preparation]')).toHaveAttribute('data-preparation', 'ready');
    await expect(panel.locator('.order-dishes .dish-ready')).toHaveCount(1);
    await expect(panel.getByRole('button', { name: t('order.serve'), exact: true })).toBeEnabled();
    await tbh.shot(`s2-ready-${viewport.width}.png`);
    const wallet = page.locator('.money'), before = await wallet.innerText();
    await panel.getByRole('button', { name: t('order.serve'), exact: true }).click();
    await expect(wallet).not.toHaveText(before); // the serve pays at once
    expect(tbh.consoleErrors()).toEqual([]);
  });

  test(`instant pour: a capacity pin keeps its tap numbers and waits for the pour (vi) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const f = fixture('pin'), t = copyOf('vi');
    expect(f.instant).toBe(false); expect(f.serveNow).toBe(f.stored); // an old pin counts its reserve as before
    await page.setViewportSize(viewport); await load(page, f, 'vi', true);
    await expect(page.locator('.equipment-object.keg .capacity-badge')).toHaveText(t('production.ready', { count: `${f.stored}/${f.capacity}` }));
    await page.locator('.equipment-object.keg').click(); const sheet = page.getByRole('dialog', { name: t('equipment.keg'), exact: true });
    await expect(sheet).toContainText(t('production.taps', { n: f.taps, seconds: f.pourS, max: f.capacity }));
    await expect(sheet).toContainText(t('production.pouring', { busy: 0, total: f.taps })); await expect(sheet).toContainText(t('production.reserveHint'));
    await expect(sheet).not.toContainText(t('production.instantHint'));
    await page.keyboard.press('Escape');
    const hint = await untilFirstOrder(page, 100);
    await expect(hint).not.toHaveClass(/is-ready/); // the guest's beer is on the tap: not ready for another two seconds
    await hint.click(); await expect(page.locator('#active-table-order [data-preparation]')).toHaveAttribute('data-preparation', 'preparing');
    await page.clock.runFor(f.pourMs + 100); await page.waitForTimeout(20);
    await expect(page.locator('#active-table-order [data-preparation]')).toHaveAttribute('data-preparation', 'ready');
    expect(tbh.consoleErrors()).toEqual([]);
  });
}
