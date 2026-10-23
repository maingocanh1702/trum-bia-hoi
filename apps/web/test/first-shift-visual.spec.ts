import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { waitSaved } from './storage';

// fun-onboarding-visual (PLAN "Vui 3 ca" P0): the screen teaches itself. Engine-made saves, DOM-only proof.
const viewports = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];
const fixture = (mode: string, arg?: string, save?: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/first-shift-visual.ts', mode, ...(arg ? [arg] : [])], { encoding: 'utf8', input: save }));
const settings = { locale: 'vi', localeAccepted: true, welcomed: true, guideDone: false, guideIndex: null, muted: true };
// axe reads colours at the instant it runs: let finite entrance animations (bubble, customer tag, door) finish first, or it measures them half-faded.
const settled = (page: Page) => page.waitForFunction(() => document.getAnimations().every(a => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
const axe = async (page: Page, include?: string) => { await settled(page); const b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']); return (include ? b.include(include) : b).analyze(); };
const lit = (page: Page) => page.locator('[data-spotlight]');
/**
 * Boot a guest (a brand-new game when `save` is null). `controlled` freezes the clock one second ahead so page.clock.runFor drives
 * engine and animation time together; otherwise time is only pinned, because axe-core needs live timers.
 */
async function load(page: Page, save: string | null, now: number, controlled = true) {
  if (controlled) await page.clock.install({ time: now }); else await page.clock.setFixedTime(now);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('fsv-seeded')) return;
    localStorage.setItem('fsv-seeded', '1'); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs));
    if (save) localStorage.setItem('tbh.save.v1', save);
  }, { save, prefs: settings });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  if (controlled) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
/** Advance game time in small steps, letting React flush after each; `check` sees every intermediate frame. */
async function run(page: Page, ms: number, step: number, check: () => Promise<boolean | void>) {
  for (let t = 0; t < ms; t += step) { await page.clock.runFor(step); await page.waitForTimeout(20); if (await check()) return; }
}
const fresh = () => Date.parse('2026-09-08T10:00:00Z');

for (const viewport of viewports) {
  test(`P0 first shift shows wallet, keg and one thing to tap at a time at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await load(page, null, fresh());
    // Founder 2026-10-22 (JSON 2.1.2): the whole HUD is there from shift 1, so the P0 (d) minimal HUD no longer holds; only the later unlocks stay hidden (quests, the step banner).
    await expect(page.locator('.money')).toBeVisible(); await expect(page.locator('.equipment-object.keg')).toBeVisible();
    for (const shown of ['.bottom-nav', '.stock-strip', '.energy', '.weather-row', '.equipment-object.cooler', '.equipment-object.washer', '.glass-counter', '.settings-button']) await expect(page.locator(shown)).toBeVisible();
    for (const hidden of ['.quest-trigger', '.guide']) await expect(page.locator(hidden)).toHaveCount(0);
    await expect(page.locator('.hud button')).toHaveCount(1); // the header holds the wallet, the timer and the settings gear; the goal chip of slice 3 sits right under it
    await expect(lit(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Mở ca', exact: true }).click(); // strict again: one "Mở ca" on screen, the bottom nav's (founder 2026-10-22, A3)
    // Guest sits at ~7.2 s, the order is ready at ~10 s. Follow the pointer guest -> check -> Serve -> wallet; never two at once.
    const stages: string[] = [];
    const stage = () => lit(page).evaluate(el => el.matches('.table-object') ? 'guest' : el.matches('.table-order-hint') ? 'check' : el.matches('.primary') ? 'serve' : el.matches('.money') ? 'wallet' : 'other');
    await run(page, 30000, 250, async () => {
      const n = await lit(page).count(); expect(n).toBeLessThanOrEqual(1);
      if (n === 0) return false;
      const now = await stage(); if (stages.at(-1) !== now) stages.push(now);
      if (now === 'check') { await expect(page.locator('.spotlight-arrow')).toHaveCount(1); await tbh.shot(`p0-check-${viewport.width}.png`); await lit(page).click(); await page.waitForTimeout(20); }
      if (now === 'serve') { await expect(lit(page)).toHaveCount(1); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click(); }
      return now === 'wallet';
    });
    expect(stages).toEqual(['guest', 'check', 'serve', 'wallet']);
    await expect(page.locator('.spotlight-arrow')).toHaveCount(1); await tbh.shot(`p0-wallet-${viewport.width}.png`);
    await expect(page.locator('.guide')).toHaveCount(0); // first play never shows the step banner
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.clock.runFor(2600); await page.waitForTimeout(20);
    await expect(page.locator('.spotlight-arrow')).toHaveCount(0); // the pointer retires after the first serve
    expect(errors).toEqual([]);
  });

  test(`P0 coins fly from the table to the wallet and lost reputation falls from the guest at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90000); // the wait for the first guest who walks out is long on a one-table shop (below)
    await page.setViewportSize(viewport);
    const steady = fixture('steady'); await load(page, steady.save, steady.now); // a brand-new game with capacity demand off (fixture comment): this spec is about the visuals, not the pace
    await page.getByRole('button', { name: 'Mở ca', exact: true }).click();
    await page.clock.runFor(10200); await page.waitForTimeout(20);
    await page.locator('.table-order-hint').first().click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await page.clock.runFor(200); await page.waitForTimeout(20);
    const coins = page.locator('.fly-coin'); await expect(coins).toHaveCount(3);
    const wallet = (await page.locator('.money').boundingBox())!, dy = await coins.first().evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--dy')));
    expect(dy).toBeLessThan(0); expect(wallet.y).toBeLessThan(120); // the wallet sits above the table
    expect(await coins.first().evaluate(el => getComputedStyle(el).animationName)).toBe('fly-coin');
    await page.clock.runFor(1600); await page.waitForTimeout(20);
    await expect(page.locator('.fly')).toHaveCount(0);
    // Leave the next guests to expire: the reputation just earned is what falls from them. A new shop has one table (seat model): a pair is turned away
    // at the door without a penalty, so the first guest who really walks out is a single who sat down and waited out their patience (24 s + 2.5 s grace,
    // after the 10.5 s arrivals of the steady save): 150 s of game time is about ten arrivals, each a single with probability 0.5 (spawn.pPair), where
    // the old 3-table shop needed 40 s. The wait ends at the first falling number, so a lucky seed costs nothing.
    let seen = '';
    await run(page, 150000, 500, async () => { const rep = page.locator('.fly-rep'); if (!await rep.count()) return false; seen = await rep.first().innerText(); return true; });
    expect(seen).toMatch(/^−\d+$/);
    await expect(page.locator('.toast-loss')).toBeVisible(); // the toast stays the accessible record
  });
}

// Founder 2026-10-22 (JSON 2.1.2, config only): a brand-new save shows the bottom nav (Mở ca · Nhập hàng · Nâng cấp), the settings gear, the timer row and the stock strip
// at shift 1; the journey button, the quests and the league are not there yet (they open after 2 / 2 / 3 shifts: spotlight-reveal.test.ts, and the shift-2 test below).
for (const viewport of viewports) test(`2.1.2 a brand-new save shows the whole HUD and Nâng cấp from shift 1 and keeps the journey for shift 2 at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await load(page, null, fresh(), false);
  for (const shown of ['.energy', '.weather-row', '.stock-strip', '.settings-button', '.bottom-nav']) await expect(page.locator(shown)).toBeVisible();
  await expect(page.locator('.bottom-nav button')).toHaveText([/Mở ca/, /Nhập hàng/, /Nâng cấp/]);
  await expect(page.getByRole('button', { name: /Đường lên Trùm/ })).toHaveCount(0); await expect(page.locator('.quest-trigger')).toHaveCount(0);
  // Founder 2026-10-22 (A3): one "Mở ca", the nav's; the opening note points at it instead of carrying a second one (the layout promise: yard.spec.ts `A3 at rest …`).
  await expect(page.getByRole('button', { name: 'Mở ca', exact: true })).toHaveCount(1); await expect(page.locator('.opening-note').getByRole('button')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(lit(page)).toHaveCount(0); // nothing calls for a tap yet: 750 coins cannot buy table 2
  expect((await axe(page)).violations).toEqual([]);
  await tbh.shot(`hud-shift1-first-screen-${viewport.width}.png`);
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); // the sheet opens at shift 1 and holds exactly the first goal
  const sheet = page.locator('dialog[open] .sheet-content');
  await expect(sheet.locator('[data-goal]')).toHaveCount(1); await expect(sheet.locator('[data-goal]')).toHaveAttribute('data-goal', 'buyTable');
  await page.keyboard.press('Escape'); await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Founder 2026-10-22 (A3), the exception: a save pinned to 2.1.1 (the released v-fb2 content: HUD and Upgrades from shift 2) with no shift played still hides the bottom
// nav, so the opening note keeps its own button: still exactly one "Mở ca". Opening the shift adopts the bundled 2.1.3 (`local.ts` `openingConfig`, the newer label):
// the HUD and the nav appear and, during the shift, the nav's first button is the shift book, so no "Mở ca" is left (the thresholds: spotlight-reveal.test.ts).
for (const viewport of viewports) test(`A3 a save pinned to 2.1.1 with no shift played hides the bottom nav, so the opening note keeps its one Mở ca; the opening adopts the bundle at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const f = fixture('pin-2.1.1'); expect(f.version).toBe('2.1.1'); await load(page, f.save, f.now, false);
  await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('.bottom-nav')).toHaveCount(0);
  const open = page.getByRole('button', { name: 'Mở ca', exact: true }); // strict: the one "Mở ca" of the page
  await expect(page.locator('.opening-note').getByRole('button', { name: 'Mở ca', exact: true })).toBeVisible(); await expect(page.locator('.opening-note .start-below')).toHaveCount(0);
  await expect(open).toBeInViewport({ ratio: 1 }); expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await axe(page)).violations).toEqual([]);
  await tbh.shot(`a3-pin-2.1.1-note-button-${viewport.width}.png`);
  await open.click();
  await expect(page.locator('.bottom-nav')).toBeVisible(); await expect(page.locator('.opening-note')).toHaveCount(0);
  await expect(page.locator('.bottom-nav button').first()).toHaveText(/Sổ ca/); await expect(page.getByRole('button', { name: 'Mở ca', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('P0 numbers and spotlights keep their cue without motion when the player asks for reduced motion', async ({ page }) => {
  await page.setViewportSize(viewports[0]); await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page, null, fresh());
  await page.getByRole('button', { name: 'Mở ca', exact: true }).click();
  await run(page, 14000, 250, async () => (await page.locator('.table-order-hint.is-ready[data-spotlight]').count()) > 0);
  const bubble = lit(page); await expect(bubble).toHaveCount(1);
  expect(await bubble.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(await bubble.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none'); // the ring stays, only the pulse goes
  await bubble.click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await page.clock.runFor(200); await page.waitForTimeout(20);
  const coin = page.locator('.fly-coin').first(), wallet = (await page.locator('.money').boundingBox())!, at = (await coin.boundingBox())!;
  expect(await coin.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(Math.abs(at.x + at.width / 2 - (wallet.x + wallet.width / 2))).toBeLessThan(6); // already at the wallet: no travel
  expect(Math.abs(at.y + at.height / 2 - (wallet.y + wallet.height / 2))).toBeLessThan(6);
});

test('P0 the step guide is only a fallback: idleness before the first serve starts it once and a tap resets the wait', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('patient'); await load(page, f.save, f.now);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).click();
  await page.clock.runFor(30000); await page.mouse.click(5, 5); // a tap resets the 45 s window
  await page.clock.runFor(30000); await page.waitForTimeout(20);
  await expect(page.locator('.guide')).toHaveCount(0);
  await page.clock.runFor(16000); await page.waitForTimeout(20);
  await expect(page.locator('.guide')).toBeVisible();
  await waitSaved(page);
  const prefs = JSON.parse(await page.evaluate(() => localStorage.getItem('tbh.settings.v1')!));
  expect(prefs.guideRuns).toBe(1); expect(prefs.guideIndex).not.toBeNull();
});

for (const viewport of viewports) test(`P0 the ready check with its pointer passes axe and keeps 44px targets at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const f = fixture('ready'); await load(page, f.save, f.now, false);
  await expect(page.locator('.table-order-hint.is-ready[data-spotlight]')).toHaveCount(1); await expect(page.locator('.spotlight-arrow')).toHaveCount(1);
  const hint = page.locator('.table-order-hint.is-ready'); // measured once its 180 ms entrance animation has settled
  for (const side of ['width', 'height'] as const) await expect.poll(async () => (await hint.boundingBox())![side]).toBeGreaterThanOrEqual(44);
  expect((await axe(page)).violations).toEqual([]);
  await page.locator('.table-order-hint.is-ready').click();
  await expect(page.locator('#active-table-order .primary[data-spotlight]')).toHaveCount(1); await expect(lit(page)).toHaveCount(1);
  expect((await axe(page)).violations).toEqual([]);
});

test('P0 an empty keg is greyed and exactly the refill button asks for a tap', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('dry'); await load(page, f.save, f.now, false);
  await expect(page.locator('.equipment-object.keg')).toHaveClass(/is-empty/);
  const refill = page.getByRole('region', { name: 'Nhập bia nhanh', exact: true }).getByRole('button');
  await expect(lit(page)).toHaveCount(1); await expect(refill).toHaveAttribute('data-spotlight', '');
  expect((await axe(page)).violations).toEqual([]);
  await refill.click(); await waitSaved(page);
  await expect(lit(page)).toHaveCount(0); await expect(page.locator('.equipment-object.keg')).not.toHaveClass(/is-empty/);
});

for (const [size, label] of [[2, '2 ghế'], [1, 'Hết chỗ']] as const) {
  for (const viewport of viewports) test(`P0 the door shows patience rings and a refused group of ${size} says "${label}" at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport);
    const f = fixture('crowd', String(size)); await load(page, f.save, f.now);
    const guests = page.locator('.door-guest:not(.is-leaving)'); await expect(guests).toHaveCount(f.queue);
    await expect(guests.first()).toBeInViewport({ ratio: 1 }); await expect(guests.first().locator('.door-ring')).toBeInViewport({ ratio: 1 }); // S6 review round 1: the door band is above the fold, eight places or not
    const before = Number(await guests.first().getAttribute('data-patience'));
    await run(page, 20000, 250, async () => (await page.locator('[data-turned-away]').count()) > 0);
    await expect(page.locator('[data-turned-away]')).toHaveAttribute('data-turned-away', String(size));
    await expect(page.locator('.door-bubble')).toHaveText(label); await expect(page.locator('.door-bubble')).toBeInViewport({ ratio: 1 }); await expect(page.locator('[data-turned-away]')).toBeInViewport({ ratio: 1 });
    await tbh.shot(`p0-door-${size}-${viewport.width}.png`);
    expect(Number(await guests.first().getAttribute('data-patience'))).toBeLessThan(before); // the ring drained while they waited
    await page.clock.runFor(2400); await page.waitForTimeout(20);
    await expect(page.locator('[data-turned-away]')).toHaveCount(0); // they walked off
    await page.clock.resume(); // axe-core needs live timers
    expect((await axe(page, '.door')).violations).toEqual([]);
  });
}

// S6 review round 2: the door is a row and a bubble hangs to the right of its guest, so two refusals inside one bubble lifetime (2.2 s: a heavy rush with a
// full queue, a flyer in a light rush, a batch of remote events) used to stack the first bubble under the second guest. Only the newest refused group is drawn.
for (const viewport of viewports) test(`P0 two refusals inside one bubble lifetime: the door says the newest reason and no bubble covers a guest at ${viewport.width}px`, async ({ page, tbh }) => {
  await page.setViewportSize(viewport);
  const f = fixture('crowd2'); expect(f.gap).toBeLessThanOrEqual(1500); // the engine refuses the second group well inside the first bubble's 2.2 s
  await load(page, f.save, f.now);
  await expect(page.locator('.door-guest:not(.is-leaving)')).toHaveCount(f.queue);
  const label = (size: number) => size > 1 ? `${size} ghế` : 'Hết chỗ';
  // No bubble may lie over a guest other than its own, on any 100 ms frame.
  const covered = () => page.evaluate(() => {
    const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return [...document.querySelectorAll('.door-bubble')].flatMap(bubble => [...document.querySelectorAll('.door-guest')]
      .filter(guest => !guest.contains(bubble) && hit(bubble.getBoundingClientRect(), guest.getBoundingClientRect())).map(guest => guest.className));
  });
  const seen: { id: string; at: number; size: number; text: string }[] = []; let elapsed = 0;
  for (let step = 0; step < 240 && (seen.length < 2 || elapsed < seen[1].at + 300); step++) {
    await page.clock.runFor(100); await page.waitForTimeout(20); elapsed += 100;
    expect(await covered()).toEqual([]);
    const leaving = page.locator('[data-turned-away]'); const n = await leaving.count();
    expect(n).toBeLessThanOrEqual(1); expect(await page.locator('.door-bubble').count()).toBe(n); // one refused group at a time, with its one bubble
    if (!n) continue;
    const id = await leaving.getAttribute('data-refusal'), size = Number(await leaving.getAttribute('data-turned-away')), text = await page.locator('.door-bubble').innerText();
    if (id && seen.at(-1)?.id !== id) seen.push({ id, at: elapsed, size, text });
  }
  expect(seen.length).toBeGreaterThanOrEqual(2); // two refusals happened ...
  expect(seen[1].at - seen[0].at).toBeLessThan(2200); // ... inside the first bubble's lifetime: the newest replaced it instead of stacking beside it
  for (const s of seen) { expect([1, 2]).toContain(s.size); expect(s.text).toBe(label(s.size)); } // each bubble names its own group (the sizes are the engine's draw, not the fixture's probe)
  await expect(page.locator('.door-bubble')).toBeInViewport({ ratio: 1 }); await expect(page.locator('[data-turned-away]')).toBeInViewport({ ratio: 1 });
  await tbh.shot(`p0-door-two-${viewport.width}.png`);
  // No axe here: axe-core needs live timers, and at this cadence a live clock refuses a new group every 0.7 s, so the door never settles
  // (a frozen Date with the installed clock keeps axe's own timers frozen too). The door's axe pass with a bubble is the ×6 case above: same DOM, one leaving guest.
});

for (const viewport of viewports) {
  test(`P0 after shift 1 the HUD opens up and the Upgrades sheet holds exactly one card at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const f = fixture('rest'); await load(page, f.save, f.now, false);
    for (const shown of ['.energy', '.weather-row', '.stock-strip', '.equipment-object.cooler', '.equipment-object.washer', '.glass-counter', '.settings-button']) await expect(page.locator(shown)).toBeVisible();
    await expect(page.locator('.bottom-nav button')).toHaveText([/Mở ca/, /Nhập hàng/, /Nâng cấp/]); // the journey button waits for shift 2
    await expect(lit(page)).toHaveCount(1); await expect(lit(page)).toContainText('Nâng cấp'); // between shifts the first goal calls
    await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
    const sheet = page.locator('dialog[open] .sheet-content');
    await expect(sheet.getByRole('button')).toHaveCount(1); await expect(sheet.locator('.upgrade-card')).toHaveCount(1);
    await expect(sheet.getByRole('button')).toHaveText('Nâng · 3.750 xu'); await expect(sheet.getByRole('button')).toHaveAttribute('data-spotlight', '');
    expect((await axe(page)).violations).toEqual([]);
    await tbh.shot(`p0-upgrade-one-card-${viewport.width}.png`);
    await sheet.getByRole('button').click(); await waitSaved(page);
    await expect(sheet.getByRole('button')).toHaveCount(1); // still one: the same table's next level
    await expect(lit(page)).toHaveCount(0); // bought: the nudge is spent
    await page.keyboard.press('Escape');
    const saved = fixture('inspect', undefined, await page.evaluate(async () => { const m = '/src/browser-save.ts'; return (await import(m)).readBrowserSave(); }));
    expect(saved.tableLevels[0]).toBe(2); expect(saved.coins).toBe(f.coins - 3750);
    expect(errors).toEqual([]);
  });
}

// The test above is the capacity snapshot's (fixture `rest`: a table level is seats); this is the same promise on the bundled seat model (rules 28),
// where a one-table shop's first goal is its second table: the sheet holds that one card, the pointer is spent by buying it.
for (const viewport of viewports) {
  test(`P0 on the seat model after shift 1 the Upgrades sheet holds exactly one card, the second table, at ${viewport.width}px`, async ({ page, tbh }) => {
    await page.setViewportSize(viewport); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const f = fixture('seat-rest'); await load(page, f.save, f.now, false);
    for (const shown of ['.energy', '.weather-row', '.stock-strip', '.equipment-object.cooler', '.equipment-object.washer', '.glass-counter', '.settings-button']) await expect(page.locator(shown)).toBeVisible();
    await expect(page.locator('.bottom-nav button')).toHaveText([/Mở ca/, /Nhập hàng/, /Nâng cấp/]); // the journey button waits for shift 2
    await expect(lit(page)).toHaveCount(1); await expect(lit(page)).toContainText('Nâng cấp'); // between shifts the first goal calls
    await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
    const sheet = page.locator('dialog[open] .sheet-content');
    await expect(sheet.getByRole('button')).toHaveCount(1); await expect(sheet.locator('[data-goal]')).toHaveCount(1); await expect(sheet.locator('[data-goal]')).toHaveAttribute('data-goal', 'buyTable');
    await expect(sheet.getByRole('button')).toHaveText('Mua bàn · 1.070 xu'); await expect(sheet.getByRole('button')).toHaveAttribute('data-spotlight', '');
    expect((await axe(page)).violations).toEqual([]);
    await tbh.shot(`p0-seat-upgrade-one-card-${viewport.width}.png`);
    await sheet.getByRole('button').click(); await waitSaved(page);
    await expect(sheet.getByRole('button')).toHaveCount(1); // still one: the next table
    await expect(sheet.getByRole('button')).toHaveText('Mua bàn · 9.250 xu'); // table 3 of the sealed 2.1.0 ladder
    await expect(lit(page)).toHaveCount(0); // bought: the nudge is spent
    await page.keyboard.press('Escape');
    const saved = fixture('inspect', undefined, await page.evaluate(async () => { const m = '/src/browser-save.ts'; return (await import(m)).readBrowserSave(); }));
    expect(saved.tables).toBe(2); expect(saved.coins).toBe(f.coins - 1070);
    expect(errors).toEqual([]);
  });
}

test('P0 after shift 2 the full Upgrades list and the Journey button open and nothing blinks', async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  const f = fixture('rest', '2'); await load(page, f.save, f.now, false);
  await expect(page.locator('.bottom-nav button')).toHaveCount(4);
  await expect(lit(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
  expect(await page.locator('dialog[open] .upgrade-card').count()).toBeGreaterThan(3);
  await expect(lit(page)).toHaveCount(0);
});
