import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { readSave, waitSaved } from './storage';

// Wave 3 "Mời về" (plan section 6 `fun-kick-table`, owner line 8 of plan section 7: "Chạm bàn lai rai → 'Mời về' hiện xu + uy tín → bàn trống"; D3). Through the DOM
// only: the table's popover shows the price of sending its lingering guests home, in coins and reputation, from `kickTableQuote` (the command's own quote), and
// ONE tap sends them home; while the guests still wait for their food, or the wallet is short, the button is dimmed with exactly one reason. Saves come from the
// real engine (fixtures/kick-table.ts) and are read back through it.
type Fixture = { save: string; now: number; phase: string; coins: number; reputation: number; completedShifts: number; target: { id: string; n: number; state: string }; waiting: { id: string; n: number } | null;
  quote: { cost: number | null; reputation: number; reason: string | null; ok: boolean }; queue: { id: string; size: number }[]; cleaningMs: number; seatingMs: number };
const fixture = (mode: string, save?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/kick-table.ts', mode], { encoding: 'utf8', input: save }));
const words = (text: string) => text.trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
async function boot(page: Page, locale: string, mode = 'linger') {
  const f = fixture(mode) as Fixture, copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
  await page.clock.setFixedTime(f.now); // game time stands still while page timers (axe's included) still run
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('kick-table-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('kick-table-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, { save: f.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const t = (key: string, params: Record<string, string | number> = {}) => copy[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
  const xu = (n: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(n);
  const open = async (table: { id: string; n: number }) => {
    await page.locator(`[data-table-id="${table.id}"] .table-object`).click();
    const panel = page.getByRole('dialog', { name: t('table', { n: table.n }), exact: true });
    await expect(panel).toBeVisible();
    await panel.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished))); // measure the settled popover: it enters at scale .97 for 160 ms
    return panel;
  };
  return { f, t, xu, open };
}
const saved = async (page: Page) => fixture('inspect', JSON.stringify({ save: await readSave(page) }));
const axe = (page: Page) => new AxeBuilder({ page }).include('#active-table-order').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];

for (const locale of ['vi', 'en']) for (const viewport of viewports) {
  test(`Wave 3 Mời về on a lingering table shows its coins and reputation, one tap sends it home and the waiting group sits down (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const { f, t, xu, open } = await boot(page, locale);
    expect(f.target.state).toBe('consuming'); expect(f.quote.ok).toBe(true); expect(f.queue.length).toBeGreaterThan(0);
    const panel = await open(f.target);
    const price = panel.locator('.kick-price'), button = panel.getByRole('button', { name: t('kick.button'), exact: true });
    const priceText = t('kick.price', { cost: xu(f.quote.cost!), rep: xu(f.quote.reputation) });
    await expect(price).toHaveText(priceText); await expect(button).toBeEnabled();
    await expect(button).toHaveAccessibleDescription(priceText, { ignoreCase: false }); // the price is the button's description: what one tap costs
    await expect(panel.locator('.kick-table .buy-reason')).toHaveCount(0);
    for (const text of [t('kick.button'), priceText]) expect(words(text), text).toBeLessThanOrEqual(6);
    const box = (await button.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
    await expect(button).toBeInViewport({ ratio: 1 }); await expect(price).toBeInViewport({ ratio: 1 });
    expect(await page.locator('[data-spotlight]').count()).toBeLessThanOrEqual(1); // P0: never two things lit at once
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const report = await axe(page); expect(report.violations).toEqual([]); expect(report.passes.length).toBeGreaterThan(0);
    await tbh.shot(`kick-linger-${locale}-${viewport.width}.png`);
    const before = await saved(page); expect(before.kickCommands).toEqual([]);
    await button.click();
    await expect(page.locator('.fly-rep', { hasText: `−${xu(f.quote.reputation)}` })).toBeVisible(); // P0(b): the reputation it took falls from the table
    await waitSaved(page); const after = await saved(page);
    // One send-home at the price shown: coins and reputation taken once, nobody lost, the table being cleaned, the shift still running and not paused.
    expect(after.kickCommands).toEqual([{ type: 'kickTable', tableId: f.target.id, maxCost: f.quote.cost, result: { ok: true, amount: f.quote.cost } }]);
    expect(after.coins).toBe(before.coins - f.quote.cost!); expect(after.reputation).toBe(before.reputation - f.quote.reputation);
    expect(after.kicks).toEqual([expect.objectContaining({ tableId: f.target.id, cost: f.quote.cost, reputation: f.quote.reputation, count: 2 })]);
    expect(after.lost).toBe(before.lost); expect(after.left).toBe(before.left); expect(after.spent).toBe(before.spent + f.quote.cost!);
    expect(after.tables.find((x: { id: string }) => x.id === f.target.id).state).toBe('cleaning'); expect(after.phase).toBe('open'); expect(after.paused).toBe(false);
    await expect(page.locator('#active-table-order')).toHaveCount(0); await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator(`[data-table-id="${f.target.id}"]`)).toHaveClass(/state-cleaning/);
    // The table is cleaned, then the group that waited at the door sits down at it.
    await page.clock.setFixedTime(f.now + f.cleaningMs + 100);
    await expect.poll(async () => f.queue.map(group => group.id).includes((await saved(page)).tables.find((x: { id: string }) => x.id === f.target.id).group)).toBe(true);
    await expect(page.locator(`[data-table-id="${f.target.id}"]`)).toHaveClass(/state-(seating|waiting)/);
    await page.reload(); await expect(page.locator('.game-shell')).toBeVisible();
    const restored = await saved(page); expect(restored.kickCommands).toHaveLength(1); expect(restored.coins).toBe(after.coins);
    expect(errors).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
  });
}

for (const locale of ['vi', 'en']) for (const viewport of viewports) {
  test(`Wave 3 a table whose guests wait for their food shows Mời về dimmed with exactly one reason, next to the serve button (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport);
    const { f, t, open } = await boot(page, locale);
    const panel = await open(f.waiting!);
    await expect(panel.getByRole('button', { name: t('order.serve') })).toBeVisible(); // the order and its serve button stay the first thing of the popover
    const button = panel.getByRole('button', { name: t('kick.button'), exact: true });
    await expect(button).toBeDisabled(); await expect(panel.locator('.kick-price')).toHaveCount(0);
    const reasons = panel.locator('.kick-table .buy-reason'); await expect(reasons).toHaveCount(1); await expect(reasons).toHaveText(t('reason.tableNotLingering'));
    await expect(button).toHaveAccessibleDescription(t('reason.tableNotLingering')); expect(words(t('reason.tableNotLingering'))).toBeLessThanOrEqual(6);
    const box = (await button.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(button).toBeInViewport({ ratio: 1 });
    const report = await axe(page); expect(report.violations).toEqual([]);
    await tbh.shot(`kick-waiting-${locale}-${viewport.width}.png`);
    expect((await saved(page)).kickCommands).toEqual([]);
    expect(tbh.consoleErrors()).toEqual([]);
  });
}

for (const viewport of viewports) test(`Wave 3 a short wallet: the price stays on screen and Mời về is dimmed with "not enough coins" at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const { f, t, xu, open } = await boot(page, 'vi', 'poor');
  expect(f.quote.reason).toBe('notEnoughCoins'); expect(f.coins).toBeLessThan(f.quote.cost!);
  const panel = await open(f.target), button = panel.getByRole('button', { name: t('kick.button'), exact: true });
  const priceText = t('kick.price', { cost: xu(f.quote.cost!), rep: xu(f.quote.reputation) });
  await expect(panel.locator('.kick-price')).toHaveText(priceText); await expect(button).toBeDisabled();
  const reasons = panel.locator('.kick-table .buy-reason'); await expect(reasons).toHaveCount(1); await expect(reasons).toHaveText(t('reason.notEnoughCoins'));
  await expect(button).toHaveAccessibleDescription(`${priceText} ${t('reason.notEnoughCoins')}`);
  const report = await axe(page); expect(report.violations).toEqual([]);
  await tbh.shot(`kick-poor-${viewport.width}.png`);
  expect((await saved(page)).kickCommands).toEqual([]); expect(tbh.consoleErrors()).toEqual([]);
});

test('Wave 3 D3: a Chi Pheo who keeps his table goes home for 0 coins and the reputation of one guest', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { f, t, xu, open } = await boot(page, 'vi', 'occupied');
  expect(f.target.state).toBe('occupied'); expect(f.quote).toEqual({ cost: 0, reputation: 2, reason: null, ok: true });
  const panel = await open(f.target), button = panel.getByRole('button', { name: t('kick.button'), exact: true });
  await expect(panel.locator('.kick-price')).toHaveText(t('kick.price', { cost: xu(0), rep: xu(2) })); await expect(button).toBeEnabled();
  await expect(panel.locator('.customer-tag')).toHaveText(t('customer.chipheo')); // the popover names the one guest still there
  const before = await saved(page);
  await button.click(); await waitSaved(page); const after = await saved(page);
  expect(after.coins).toBe(before.coins); expect(after.reputation).toBe(before.reputation - 2);
  expect(after.kicks).toEqual([expect.objectContaining({ tableId: f.target.id, cost: 0, reputation: 2, count: 1, chipheo: 1 })]);
  expect(after.tables.find((x: { id: string }) => x.id === f.target.id).state).toBe('cleaning');
  await tbh.shot('kick-occupied-390.png'); expect(tbh.consoleErrors()).toEqual([]);
});

test('Wave 3 a save pinned to the S6 content of JSON 2.1.0 (no kickTable section) offers no Mời về in the shift it is pinned for', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { f, t, open } = await boot(page, 'vi', 'pin');
  expect(['consuming', 'occupied']).toContain(f.target.state);
  const panel = await open(f.target);
  await expect(panel.locator('.idle-table-info')).toContainText(t(`table.${f.target.state}`));
  await expect(panel.locator('.kick-table')).toHaveCount(0); await expect(panel.getByRole('button', { name: t('kick.button'), exact: true })).toHaveCount(0);
  await tbh.shot('kick-pin-390.png'); expect(tbh.consoleErrors()).toEqual([]);
});

// Founder 2026-10-22, A1 (JSON 2.1.3): "Mời về" is not available in shift 1. It has its own reveal threshold (`featureReveal.kickAfterShifts` 1) AND-ed with the HUD
// (`revealed().kick`), so the HUD of shift 1 (JSON 2.1.2) no longer brings it. This restores the shift-1 assertion PR #32 had turned around ("Mời về comes with the HUD").
test('Wave 3 in shift 1 Mời về is not shown yet, though the HUD is: it is revealed after one completed shift (JSON 2.1.3, founder 2026-10-22)', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { f, t, open } = await boot(page, 'vi', 'first');
  expect(['consuming', 'occupied']).toContain(f.target.state); expect(f.completedShifts).toBe(0);
  await expect(page.locator('.bottom-nav')).toBeVisible(); // the HUD is there: the block is hidden by its own threshold, not by the HUD's
  const panel = await open(f.target);
  await expect(panel.locator('.idle-table-info')).toContainText(t(`table.${f.target.state}`));
  await expect(panel.locator('.kick-table')).toHaveCount(0); await expect(panel.getByRole('button', { name: t('kick.button'), exact: true })).toHaveCount(0);
  await tbh.shot('kick-first-390.png');
  // Review A-r1 F2: the shift book's "Mời tất cả về" is Mời về too, behind the same reveal: since 2.1.2 the nav's "Sổ ca" opens the book in shift 1, and it offers no send-all there.
  await panel.getByRole('button', { name: t('close'), exact: true }).click(); await page.locator('.bottom-nav').getByRole('button', { name: t('nav.book'), exact: true }).click();
  const book = page.getByRole('dialog', { name: t('book.title'), exact: true }); await expect(book).toBeVisible();
  await expect(book.getByRole('button', { name: t('book.end'), exact: true })).toBeVisible(); await expect(book.getByRole('button', { name: new RegExp(`^${t('book.kick', { cost: '#' }).split('#')[0]}`) })).toHaveCount(0);
  expect(tbh.consoleErrors()).toEqual([]);
});

test('Wave 3 after one completed shift Mời về is on a lingering table: the price line and the button (JSON 2.1.3, founder 2026-10-22)', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { f, t, xu, open } = await boot(page, 'vi', 'second');
  expect(['consuming', 'occupied']).toContain(f.target.state); expect([f.phase, f.completedShifts]).toEqual(['open', 1]);
  const panel = await open(f.target), button = panel.getByRole('button', { name: t('kick.button'), exact: true });
  await expect(panel.locator('.kick-table')).toHaveCount(1);
  await expect(panel.locator('.kick-price')).toHaveText(t('kick.price', { cost: xu(f.quote.cost!), rep: xu(f.quote.reputation) }));
  if (f.quote.ok) await expect(button).toBeEnabled(); else await expect(button).toBeDisabled();
  await tbh.shot('kick-second-390.png');
  // Review A-r1 F2: and from the same shift the book offers "Mời tất cả về" with its price, as before #32 (the guests are lingering, so it costs their fees).
  await panel.getByRole('button', { name: t('close'), exact: true }).click(); await page.locator('.bottom-nav').getByRole('button', { name: t('nav.book'), exact: true }).click();
  const book = page.getByRole('dialog', { name: t('book.title'), exact: true }); await expect(book).toBeVisible();
  await expect(book.getByRole('button', { name: new RegExp(`^${t('book.kick', { cost: '#' }).split('#')[0]}`) })).toBeEnabled();
  expect(tbh.consoleErrors()).toEqual([]);
});

// Owner call 1 (the founder, 2026-10-22): the price moved to feeRate 0.5 under a new label, 2.1.1 (2.1.2 the same day, the HUD thresholds, then 2.1.3, the shift-1 fixes, then 2.1.4, the early pacing: the bundle is 2.1.4 now), so a save pinned to a 2.1.0 content without the section no
// longer keeps its pin for ever: its next "Mở ca" opens on the numerically newer bundle (`local.ts` `openingConfig`) and the shop can send tables home from then on.
// Until 2.1.1 the bundle was a second content of 2.1.0 and such a save kept its pin (no Mời về) for good.
test('Wave 3 a save pinned to the S6 content of JSON 2.1.0 adopts the bundled 2.1.4 at its next Mở ca, and with it Mời về at the founder\'s price', async ({ page, tbh }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = fixture('pin-rest') as { save: string; now: number; phase: string; completedShifts: number; version: string; feeRate: number | null; bundle: { version: string; feeRate: number | null } };
  expect([f.phase, f.completedShifts, f.version, f.feeRate]).toEqual(['resting', 1, '2.1.0', null]); // one shift on the pin, which has no kickTable
  expect(f.bundle).toEqual({ version: '2.1.4', feeRate: 0.5 });
  const copy = JSON.parse(readFileSync('apps/web/src/i18n/vi.json', 'utf8')) as Record<string, string>;
  await page.clock.setFixedTime(f.now);
  await page.addInitScript(({ save }) => {
    if (localStorage.getItem('kick-table-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('kick-table-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
  }, { save: f.save });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  const before = await saved(page); expect([before.phase, before.configVersion, before.feeRate]).toEqual(['resting', '2.1.0', null]);
  await page.getByRole('button', { name: copy['nav.shift'], exact: true }).first().click();
  await expect(page.locator('.energy strong')).toHaveText(/^\d\d:\d\d$/); // the engine opened the shift: it counts its minutes
  await waitSaved(page); const after = await saved(page);
  expect([after.phase, after.completedShifts, after.shiftConfigVersion, after.configVersion, after.feeRate]).toEqual(['open', 1, f.bundle.version, f.bundle.version, f.bundle.feeRate]);
  await tbh.shot('kick-pin-adopted-390.png'); expect(tbh.consoleErrors()).toEqual([]);
});

// Review round 1: once the player closes the shift no guest arrives any more and the shift book's "Mời tất cả về" is the cheaper way out, so the popover offers
// no single send-home; the engine would still take this table (the fixture's quote is ok): it is the popover that hides the block.
for (const viewport of viewports) test(`Wave 3 a closing shift offers no Mời về: the lingering table's popover has no send-home block at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const { f, t, open } = await boot(page, 'vi', 'closing');
  expect(f.phase).toBe('closing'); expect(f.target.state).toBe('consuming'); expect(f.quote.ok).toBe(true);
  const panel = await open(f.target);
  await expect(panel.locator('.idle-table-info')).toContainText(t('table.consuming'));
  await expect(panel.locator('[class*="kick-"]')).toHaveCount(0); await expect(panel.getByRole('button', { name: t('kick.button'), exact: true })).toHaveCount(0);
  await tbh.shot(`kick-closing-${viewport.width}.png`);
  const now = await saved(page); expect(now.phase).toBe('closing'); expect(now.kickCommands).toEqual([]);
  expect(tbh.consoleErrors()).toEqual([]);
});

for (const reduce of [false, true]) test(`Wave 3 ${reduce ? 'with' : 'without'} reduced motion: the send-home block has no motion of its own; the falling reputation ${reduce ? 'stays still' : 'moves'}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const { f, t, open } = await boot(page, 'vi');
  const panel = await open(f.target);
  expect(await panel.locator('.kick-table').evaluate(node => [node, ...node.querySelectorAll('*')].flatMap(el => el.getAnimations()).filter(a => a.playState === 'running').length)).toBe(0);
  await panel.getByRole('button', { name: t('kick.button'), exact: true }).click();
  const fly = page.locator('.fly-rep'); await expect(fly).toBeVisible(); // the static cue stays either way (it lives 1.5 s, its fall 1.1 s)
  const running = await fly.first().evaluate(node => node.getAnimations().filter(a => a.playState === 'running').length);
  if (reduce) expect(running).toBe(0); else expect(running).toBeGreaterThan(0);
});
