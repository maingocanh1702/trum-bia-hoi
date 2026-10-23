import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { readSave } from './storage';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.6): when a rush ends, a short one-tap card that pauses like a sheet: arrived, served, left, tips, net, and
// the change against the rush before it (↑/↓). Built from the rush's own events, nothing stored. DOM only; the page's own clock ends the rush of an
// engine-made save (fixtures/rush-recap.ts), and the card is checked against the recap of the save it wrote (`inspect`, the engine's events).
const fixture = (mode: string, input?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/rush-recap.ts', mode], { encoding: 'utf8', input }));
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.install({ time: at.now });
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('rr-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('rr-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true, hintsDone: ['tipWindow', 'rush', 'freshness', 'glasses', 'stock', 'slot'] }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 200));
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));

for (const [mode, locale, width, height] of [['first', 'vi', 390, 844], ['first', 'en', 360, 740], ['second', 'vi', 1280, 720], ['second', 'en', 390, 844]] as const) test(`B2.6 the end of the ${mode} rush of a shift leaves a one-tap card that pauses: arrived, served, left, tips, net${mode === 'second' ? ' and the change against the first' : ''} (${locale}) at ${width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = fixture(mode), num = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  await page.setViewportSize({ width, height }); await boot(page, f, locale);
  const card = page.getByRole('dialog', { name: fill(copy['rushRecap.title'], { kind: copy[`rush.${f.kind}`] }), exact: true });
  await expect(card).toHaveCount(0); // the rush still runs
  await page.clock.runFor(f.endsInMs + 1000);
  await expect(card).toBeVisible();
  await expect(card.locator('.sheet-pause')).toContainText(copy['pause.menu']); await expect(page.locator('.game')).toHaveClass(/is-paused/);
  const recap = fixture('inspect', JSON.stringify({ save: await readSave(page) })); // what the engine's own events of this rush say
  expect(recap).not.toBeNull();
  for (const key of ['arrived', 'served', 'left', 'tips'] as const) {
    const row = card.locator(`[data-recap="${key}"]`);
    await expect(row.locator('dt')).toHaveText(copy[`rushRecap.${key}`]); await expect(row.locator('dd')).toHaveText(num(recap[key]));
  }
  await expect(card.locator('[data-recap="net"] dd')).toHaveText(num(recap.net));
  if (mode === 'first') { expect(recap.change).toBeNull(); await expect(card.locator('.rush-change')).toHaveCount(0); }
  else await expect(card.locator('.rush-change')).toHaveText(fill(copy[recap.change >= 0 ? 'rushRecap.up' : 'rushRecap.down'], { n: num(Math.abs(recap.change)) }));
  const ok = card.getByRole('button', { name: copy['rushRecap.ok'], exact: true });
  expect((await ok.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.clock.resume(); // axe-core needs live timers; the card keeps the game paused meanwhile
  expect(await axe(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`b2-rush-recap-${mode}-${locale}-${width}.png`);
  await ok.click(); // one tap
  await expect(card).toHaveCount(0); await expect(page.locator('.game')).not.toHaveClass(/is-paused/);
  expect(tbh.consoleErrors()).toEqual([]);
});
