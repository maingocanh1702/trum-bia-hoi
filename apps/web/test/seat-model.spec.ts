import { test, expect } from './tbh-fixture';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { readSave, waitSaved } from './storage';

// Seat model (rules 28, plan S1): through the DOM only -- tables 2-4, then a second chair once four tables stand,
// every button with its price and exactly one reason while dimmed, in vi and en. State is read back through the real engine.
// The reason under a dimmed button is the `reason.*` line Wave 1's buy buttons read from the engine quotes (merge, stage 00); S1 first showed the
// `error.*` text of the same refusal (the same words with a full stop; English "All tables are built" instead of "Your stall has all its tables.").
const fixture = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/seat-model.ts'], { encoding: 'utf8' }));
const inspect = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/seat-model.ts', 'inspect'], { encoding: 'utf8', input: JSON.stringify({ save }) }));
// The accessibility tier's audit (remote-test/accessibility.spec.ts, same tags) on the open sheet; finite animations are
// jumped to their end so contrast is measured on the settled frame.
async function axe(page: Page) {
  await page.evaluate(() => (document.querySelector('dialog[open]') ?? document.body).getAnimations({ subtree: true })
    .filter(a => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a => a.finish()));
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.passes.length).toBeGreaterThan(0); // the audit really ran rules on this page
  return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
}

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`seat model sells tables 2-4, then a second chair, each with its price and one reason (${locale}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
    const t = (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
    const xu = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
    const f = fixture();
    // Fixed, not paused: the shop's clock stays at f.now while page timers (axe's included) still run.
    await page.setViewportSize(viewport); await page.clock.setFixedTime(f.now);
    await page.addInitScript(({ save, locale }) => {
      if (localStorage.getItem('seat-seeded')) return;
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('seat-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('.seat')).toHaveCount(1); // a new game: one table, one chair
    await page.getByRole('button', { name: t('nav.upgrades'), exact: true }).click();
    const sheet = page.getByRole('dialog'), cards = sheet.locator('#upgrade-tables ~ .upgrade-grid .upgrade-card'), first = cards.first();
    await expect(cards).toHaveCount(1); await expect(first.getByText(t('table.seats', { n: 1 }), { exact: true })).toBeVisible();
    const chair = first.getByRole('button', { name: t('upgrade.buyChair', { cost: xu(f.chairPrice) }), exact: true });
    await expect(chair).toBeDisabled(); await expect(first.getByText(t('reason.chairsLocked'), { exact: true })).toBeVisible();
    const level = first.getByRole('button', { name: t('upgrade.buy', { cost: xu(f.levelPrice) }), exact: true });
    await expect(level).toBeDisabled(); await expect(first.getByText(t('reason.tableNeedsChairs'), { exact: true })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    for (const [i, price] of (f.tablePrices as number[]).entries()) {
      const buy = sheet.getByRole('button', { name: t('upgrade.buyTable', { cost: xu(price) }), exact: true });
      await expect(buy).toBeEnabled(); await buy.click(); await expect(cards).toHaveCount(i + 2);
    }
    await expect(sheet.getByRole('button', { name: t('upgrade.addTable'), exact: true })).toBeDisabled();
    await expect(sheet.getByText(t('reason.maxTables'), { exact: true })).toBeVisible();
    await expect(chair).toBeEnabled(); await chair.click();
    await expect(first.getByText(t('table.seats', { n: 2 }), { exact: true })).toBeVisible(); await expect(chair).toHaveCount(0);
    // The usual starting coins are left: the next chair and the paired table's level each say "not enough coins";
    // the one-chair table's level still names the missing chair.
    const second = cards.nth(1);
    await expect(second.getByRole('button', { name: t('upgrade.buyChair', { cost: xu(f.nextChairPrice) }), exact: true })).toBeDisabled();
    await expect(second.getByText(t('reason.notEnoughCoins'), { exact: true })).toBeVisible();
    await expect(second.getByText(t('reason.tableNeedsChairs'), { exact: true })).toBeVisible();
    await expect(level).toBeDisabled(); await expect(first.getByText(t('reason.notEnoughCoins'), { exact: true })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tbh.shot(`seat-model-${locale}-${viewport.width}.png`);
    await page.keyboard.press('Escape'); await waitSaved(page);
    const state = inspect(await readSave(page));
    expect(state.tables).toEqual([{ seats: 2, level: 1 }, { seats: 1, level: 1 }, { seats: 1, level: 1 }, { seats: 1, level: 1 }]);
    expect(state.events).toEqual([...f.tablePrices.map((cost: number) => ({ type: 'table_bought', cost })), { type: 'chair_bought', cost: f.chairPrice }]);
    expect(state.coins).toBe(f.coins - f.tablePrices.reduce((a: number, b: number) => a + b, 0) - f.chairPrice);
    await page.reload(); await expect(page.locator('.seat')).toHaveCount(5);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}
