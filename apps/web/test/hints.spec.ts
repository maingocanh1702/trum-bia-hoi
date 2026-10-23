import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.2): just-in-time hints for the HUD that shows from shift 1, each once, the first time it matters, through
// the DOM only (saves from fixtures/hints.ts, real engine). One banner at a time in the step guide's slot, the hint's own target lit only when nothing else
// is, done once (`hintsDone`, `onboarding.hints.neverRepeatAfterDone`). The first late serve's hint and "never over a sheet": serve-feedback.spec.ts.
const fixture = (mode: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/hints.ts', mode], { encoding: 'utf8' }));
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('hi-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('hi-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => {
  await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a => a.finish()));
  return (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
};
// What each hint lights: its own target, or (the freshness hint, which has none) the ready tray the spotlight already points at.
const lit: Record<string, string> = { stock: '.stock-strip .beer-stock', glasses: '.equipment-object.washer', slot: '.yard .table-slot >> nth=0', rush: '.rush-label', freshness: '.table-order-hint.is-ready' };

for (const [mode, locale] of [['stock', 'vi'], ['glasses', 'vi'], ['slot', 'vi'], ['rush', 'vi'], ['freshness', 'vi'], ['stock', 'en'], ['freshness', 'en']] as const) test(`B2.2 the ${mode} hint speaks once when its moment comes, as the one banner, and lights ${mode === 'freshness' ? 'nothing new' : 'its target'} (${locale}) at 390×844`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = fixture(mode);
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, locale);
  const hint = page.locator('.hint');
  await expect(hint).toHaveCount(1); await expect(hint).toHaveAttribute('data-hint', mode);
  const words = fill(copy[`hint.${mode}`], { s: new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 }).format(f.freshnessS ?? 0), kind: copy[`rush.${f.rush ?? 'light'}`] });
  // Founder 2026-10-23 (d): the stock hint always comes with the one-tap beer prompt, so it is a line of that prompt (one banner), not a banner of its own.
  const text = mode === 'stock' ? hint : hint.locator('p');
  if (mode === 'stock') await expect(page.locator('.beer-stock-warning')).toContainText(words);
  await expect(text).toHaveText(words);
  expect(words.split(/\s+/).length).toBeLessThanOrEqual(12); // F27: at most 12 words a step
  await expect(page.locator('.message-slot > *')).toHaveCount(1); // one banner, in the one slot above the nav
  await expect(page.locator('[data-spotlight]')).toHaveCount(1); await expect(page.locator(lit[mode])).toHaveAttribute('data-spotlight', '');
  expect(await axe(page)).toEqual([]);
  await tbh.shot(`b2-hint-${mode}-${locale}.png`);
  if (mode !== 'stock') { // the merged stock line has no button of its own: it goes with the prompt (its refill, or the end of the moment)
    await hint.getByRole('button', { name: copy['hint.ok'], exact: true }).click();
    await expect(hint).toHaveCount(0);
    if (mode !== 'freshness') await expect(page.locator('[data-spotlight]')).toHaveCount(0); // the hint took its light with it
  }
  await page.reload(); await expect(page.locator('.game-shell')).toBeVisible(); await page.waitForTimeout(500);
  await expect(hint).toHaveCount(0); // done once: the moment is still here, the hint is not
  if (mode === 'stock') await expect(page.locator('.beer-stock-warning')).toBeVisible(); // ... the prompt is, with its own words
  expect(tbh.consoleErrors()).toEqual([]);
});

test('B2.2 two moments at once: one hint at a time, the more urgent first, the next one after it', async ({ page }) => {
  const copy = copyOf('vi'), f = fixture('both');
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, 'vi');
  const hint = page.locator('.hint');
  await expect(hint).toHaveCount(1); await expect(hint).toHaveAttribute('data-hint', 'stock');
  await expect(page.locator('[data-spotlight]')).toHaveCount(1);
  // The stock line goes with its prompt: the prompt's one tap refills, the stock moment ends, and the next moment brings its own banner in the slot.
  await page.locator('.beer-stock-warning button').click();
  await expect(hint).toHaveCount(1); await expect(hint).toHaveAttribute('data-hint', 'slot'); await expect(page.locator('.beer-stock-warning')).toHaveCount(0);
  await expect(page.locator('[data-spotlight]')).toHaveCount(1); await expect(page.locator('.yard .table-slot').first()).toHaveAttribute('data-spotlight', '');
  await page.locator('.yard .table-slot').first().click(); // the slot hint's target opens the buy card (B2.4); a sheet hides the hint
  await expect(page.getByRole('dialog', { name: copy['goal.buyTable'], exact: true })).toBeVisible(); await expect(hint).toHaveCount(0);
});

// Founder 2026-10-23 (B2.8 second pass): the one-tap beer prompt keeps the one message slot; while it shows no other hint starts (none is spent unseen
// behind it), and the one that waits comes once the refill ends the prompt. Fixture `both` (stock and slot moments) with the stock hint already done.
test('B2.2 while the beer prompt holds the slot no other hint starts; the waiting one comes after the refill', async ({ page }) => {
  const copy = copyOf('vi'), f = fixture('both');
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save }) => { if (localStorage.getItem('hp-seeded')) return; localStorage.setItem('tbh.save.v1', save); localStorage.setItem('hp-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', guideDone: true, guideIndex: null, muted: true, hintsDone: ['stock'] })); }, { save: f.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const prompt = page.locator('.message-slot > .beer-stock-warning'); await expect(prompt).toBeVisible(); await expect(prompt.getByRole('status')).toBeVisible();
  await page.waitForTimeout(500); await expect(page.locator('.hint')).toHaveCount(0); // the slot hint waits
  await prompt.getByRole('button').click(); await expect(prompt).toHaveCount(0);
  await expect(page.locator('.message-slot > .guide.hint')).toHaveAttribute('data-hint', 'slot'); await expect(page.locator('.message-slot > .guide.hint p')).toHaveText(copy['hint.slot']);
});

// Review B2-r2: a hint already on screen gives up its light with its words when the beer prompt takes the slot: no target pulses without a reason beside it.
// The slot hint is up (its empty place lit); a keg Lv2 bought from the keg's own sheet raises the refill batch above the stock, so the prompt takes the slot
// (fixture `slot-keg`); after the refill the slot hint is back, lit again.
test('B2.2 a hint behind the beer prompt lights nothing; after the refill it is back with its light', async ({ page }) => {
  const f = fixture('slot-keg');
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, 'vi');
  const hint = page.locator('.hint'), place = page.locator('.yard .table-slot').first(), prompt = page.locator('.message-slot > .beer-stock-warning');
  await expect(hint).toHaveAttribute('data-hint', 'slot'); await expect(place).toHaveAttribute('data-spotlight', ''); await expect(prompt).toHaveCount(0);
  await page.locator('.equipment-object.keg').click(); await page.locator('.equipment-detail .upgrade-card button').click(); await page.keyboard.press('Escape');
  await expect(prompt).toBeVisible(); await expect(hint).toHaveCount(0);
  await expect(page.locator('[data-spotlight]')).toHaveCount(0); // the slot hint waits behind the prompt, unlit
  await prompt.locator('.quick-beer').click(); await expect(prompt).toHaveCount(0);
  await expect(hint).toHaveAttribute('data-hint', 'slot'); await expect(place).toHaveAttribute('data-spotlight', '');
});

// Review B2-r1: a hint never points at something the screen does not show. A config whose HUD is still hidden in shift 1 (`hudAfterShifts` 1, like a 2.1.1
// pin's first shift) at the stock moment shows no strip and so no stock hint (fixtures/hints.ts `nohud`).
test('B2.2 with the HUD still hidden there is no stock hint: its strip is not on screen', async ({ page }) => {
  const f = fixture('nohud');
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, f, 'vi');
  await expect(page.locator('.stock-strip')).toHaveCount(0); await expect(page.locator('.bottom-nav')).toHaveCount(0);
  await page.waitForTimeout(500); await expect(page.locator('.hint')).toHaveCount(0);
});
