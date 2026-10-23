import { test, expect } from './tbh-fixture';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { readSave, waitSaved } from './storage';

// Table and chair levels (rules 28, plan S4): through the DOM only -- a shop with four pairs of chairs and Duong Len Trum LP1 reached buys a table level
// and chair levels from the Upgrades sheet; every button keeps its price and exactly one reason while dimmed (LP2 named in words, then the wallet), the
// price of the next table level follows how many tables have reached the level, and the card says what the level gives. State is read back through
// the real engine. Engine-made save (fixtures/table-upgrades.ts), vi and en, three viewports.
const fixture = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/table-upgrades.ts'], { encoding: 'utf8' }));
const inspect = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/table-upgrades.ts', 'inspect'], { encoding: 'utf8', input: JSON.stringify({ save }) }));
const words = (text: string) => text.replace(/·/g, ' ').trim().split(/\s+/).filter(Boolean).length;
async function axe(page: Page) {
  await page.evaluate(() => (document.querySelector('dialog[open]') ?? document.body).getAnimations({ subtree: true })
    .filter(a => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a => a.finish()));
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.passes.length).toBeGreaterThan(0); // the audit really ran rules on this page
  return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
}

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`table and chair levels: price by target level, what each gives and one reason per dimmed button (${locale}) at ${viewport.width}×${viewport.height}`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
    const t = (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
    const xu = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
    const decimal = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 }).format(n);
    const f = fixture(); expect(f.lifePath).toBe(1);
    const [lv2, lv3, chairs] = [f.levelPrices.lv2 as number[], f.levelPrices.lv3 as number[], f.chairPrices as number[]];
    await page.setViewportSize(viewport); await page.clock.setFixedTime(f.now);
    await page.addInitScript(({ save, locale }) => {
      if (localStorage.getItem('tu-seeded')) return;
      localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tu-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    // With two chairs and its life-path gate open a table level is the chip's goal (capacity lane first), and its effect is what the level gives.
    await expect(page.locator('.goal-chip')).toContainText(t('goal.table', { n: 1 })); await expect(page.locator('.goal-chip')).toContainText(t('goal.fx.rounds', { n: 1 }));
    await page.getByRole('button', { name: t('nav.upgrades'), exact: true }).click();
    const sheet = page.getByRole('dialog'), cards = sheet.locator('#upgrade-tables ~ .upgrade-grid .upgrade-card'); await expect(cards).toHaveCount(4);
    const card = (n: number) => cards.nth(n - 1);
    const level = (n: number, cost: number) => card(n).getByRole('button', { name: t('upgrade.buy', { cost: xu(cost) }), exact: true });
    const chair = (n: number, cost: number) => card(n).getByRole('button', { name: t('upgrade.chairUp', { cost: xu(cost) }), exact: true });
    const perk = async (n: number, tableLevel: number, gives: string[]) => { await expect(card(n).locator('.table-perk p')).toHaveText(t('level', { n: tableLevel })); await expect(card(n).locator('.table-perk li')).toHaveText(gives); };
    const comfort = (n: number, chairLevel: number) => expect(card(n).locator('.chair-perk')).toHaveText(t('table.chairLevel', { n: chairLevel, mult: decimal(chairLevel === 1 ? 1 : chairLevel === 2 ? 1.15 : 1.3) }));
    // 1) A new pair of tables: Lv1, no perk, Lv1 chairs; every price is the base of its ladder and every button is open.
    for (const n of [1, 2, 3, 4]) {
      await perk(n, 1, [t('table.benefit.none')]); await comfort(n, 1);
      await expect(level(n, lv2[0])).toBeEnabled(); await expect(chair(n, chairs[0])).toBeEnabled(); await expect(card(n).locator('.buy-reason')).toHaveCount(0);
    }
    // 2) Table 1 to Lv2: one more round, shown on its card; its next level is Lv3 (its own ladder, LP2: named in words); table 2 now pays one step more.
    await level(1, lv2[0]).click();
    await perk(1, 2, [t('table.benefit.rounds', { n: 1 })]);
    await expect(level(1, lv3[0])).toBeDisabled(); await expect(level(1, lv3[0])).toHaveAccessibleDescription(t('reason.lifePathRequired', { name: t('lifePath.LP2') }));
    await expect(level(2, lv2[1])).toBeEnabled(); await expect(level(2, lv2[0])).toHaveCount(0);
    // 3) Table 1's chairs to level 2 (1.15 x patience): the next chair level is the second upgrade of the shop and waits for LP2; the wallet still pays table 2's level.
    // S6: the chair-level block says before -> after (x1 -> x1,15 now, x1,15 -> x1,3 once bought); the level block says what the next level gives (table 1 is Lv2: Lv3's second snack).
    const fx = (n: number) => card(n).locator('[data-goal^="chairLevel:"] .goal-effect');
    await expect(fx(1)).toHaveText(t('goal.fx.patienceTo', { from: decimal(1), to: decimal(1.15) })); await expect(card(1).locator('.goal-effect').first()).toHaveText(t('goal.fx.snack', { n: 35 }));
    await chair(1, chairs[0]).click();
    await comfort(1, 2); await expect(fx(1)).toHaveText(t('goal.fx.patienceTo', { from: decimal(1.15), to: decimal(1.3) })); await expect(fx(2)).toHaveText(t('goal.fx.patienceTo', { from: decimal(1), to: decimal(1.15) }));
    await expect(chair(1, chairs[1])).toBeDisabled(); await expect(chair(1, chairs[1])).toHaveAccessibleDescription(t('reason.lifePathRequired', { name: t('lifePath.LP2') }));
    await expect(level(2, lv2[1])).toBeEnabled();
    // 4) Table 2's chairs (the shop's second chair upgrade) leave too little for table 2's level and for the third table's chairs: one reason each, the wallet.
    await expect(chair(2, chairs[1])).toBeEnabled(); await chair(2, chairs[1]).click();
    await comfort(2, 2);
    await expect(level(2, lv2[1])).toBeDisabled(); await expect(level(2, lv2[1])).toHaveAccessibleDescription(t('reason.notEnoughCoins'));
    await expect(chair(3, chairs[2])).toBeDisabled(); await expect(chair(3, chairs[2])).toHaveAccessibleDescription(t('reason.notEnoughCoins'));
    for (const n of [1, 2, 3, 4]) for (const button of await card(n).getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Labels stay short: no line, chip or button of a card is longer than six words, whatever its level.
    for (const n of [1, 2, 3, 4]) for (const text of await card(n).locator('h3, p, li, button').allTextContents()) expect(words(text), `"${text}"`).toBeLessThanOrEqual(6);
    // Exactly one reason per dimmed button, on every card: the lines of a card are as many as its dimmed buttons, and each button is described by its own.
    for (const n of [1, 2, 3, 4]) expect(await card(n).locator('.buy-reason').count(), `card ${n}`).toBe(await card(n).locator('button:disabled').count());
    expect(await axe(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tbh.shot(`table-upgrades-${locale}-${viewport.width}.png`);
    await page.keyboard.press('Escape'); await waitSaved(page);
    const state = inspect(await readSave(page));
    expect(state.tables).toEqual([{ seats: 2, level: 2, chairLevel: 2 }, { seats: 2, level: 1, chairLevel: 2 }, { seats: 2, level: 1, chairLevel: 1 }, { seats: 2, level: 1, chairLevel: 1 }]);
    expect(state.events.map((e: Record<string, unknown>) => { const { tableId: _, ...rest } = e; return rest; })).toEqual([
      { type: 'table_upgraded', level: 2, cost: lv2[0], what: 'extraRounds' }, { type: 'chair_upgraded', level: 2, cost: chairs[0], patienceMult: 1.15 }, { type: 'chair_upgraded', level: 2, cost: chairs[1], patienceMult: 1.15 }]);
    expect(state.coins).toBe(f.coins - lv2[0] - chairs[0] - chairs[1]); expect(state.lifePath).toBe(1);
    await page.reload(); await expect(page.locator('.game-shell')).toBeVisible();
    await page.getByRole('button', { name: t('nav.upgrades'), exact: true }).click();
    await perk(1, 2, [t('table.benefit.rounds', { n: 1 })]); await comfort(1, 2); await comfort(2, 2); await comfort(3, 1);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}

// The patience bar of a table with level-3 chairs: its width follows the order's own (stretched) deadline, its low state follows the tip window, the first 40 % of the
// guest's OWN patience (guestPatienceLeft). Judged on the stretched deadline too, the bar at 46 % of the guest's patience would still be "not low" with x1.30 chairs.
const bar = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/table-upgrades.ts', 'bar'], { encoding: 'utf8' }));
for (const moment of ['early', 'late'] as const) test(`the patience bar of a table with level-3 chairs turns low when the tip window closes, not when the stretched order deadline would (${moment}) at 390×844`, async ({ page, tbh }) => {
  const f = bar(), at = f[moment] as { save: string; now: number; elapsedMs: number };
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save }) => {
    if (localStorage.getItem('tu-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tu-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const track = page.locator('.table-space.table-0 .patience-track'); await expect(track).toHaveCount(1);
  // The bar still counts down the order's own, longer deadline ...
  const width = await track.locator('i').evaluate(el => parseFloat((el as HTMLElement).style.width));
  expect(width).toBeCloseTo(100 * (1 - at.elapsedMs / f.orderMs), 0);
  // ... but turns low with the tip: the first 40 % of the guest's OWN patience, which the chairs do not stretch.
  expect(at.elapsedMs / f.ownMs < 1 - f.threshold).toBe(moment === 'early');
  if (moment === 'early') await expect(track).not.toHaveClass(/is-low/); else await expect(track).toHaveClass(/is-low/);
  // Founder 2026-10-22 (B2.1c): the order card's clock agrees with the bar, green with "Còn boa" inside the tip window and not after it, while the stretched
  // countdown it prints still has most of its seconds left (the 22/10 card said "Còn 18s" in yellow after the serve already counted as late).
  await page.locator('.table-space.table-0 .table-order-hint').click();
  const clock = page.locator('#active-table-order .order-clock');
  if (moment === 'early') { await expect(clock).toHaveClass(/is-tip/); await expect(clock.locator('small')).toHaveText('Còn boa'); }
  else { await expect(clock).not.toHaveClass(/is-tip/); await expect(clock.locator('small')).toHaveCount(0); }
  expect(tbh.consoleErrors()).toEqual([]);
});
