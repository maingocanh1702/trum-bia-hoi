import { readSave, waitSaved, readBackups } from './storage';
import { bootFresh } from './fresh-game';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Let React's lazy scheduler boot while Date.now (the engine clock) stays fixed.
async function reloadAtSameGameTime(page: Page) {
  const time = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(time); await page.clock.resume();
  await page.reload(); await expect(page.locator('.table-object').first()).toBeVisible({ timeout: 20000 });
  await page.clock.pauseAt(time); await page.clock.setSystemTime(time);
  expect(await page.evaluate(() => Date.now())).toBe(time);
}

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }, { width: 1280, height: 400 }]) {
  test(`guest serves, reloads, opens paused sheets and switches locale at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // Lazy screen boot needs the browser scheduler; freeze only once the shell is ready. Full HUD from shift 1: onboarding's own HUD is first-shift-visual.spec.ts.
    await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
    await bootFresh(page);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 4000)); // the clock runs until paused: leave room for a loaded machine
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.clock.runFor(11100);
    await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);
    await expect(page.locator('.guide')).toHaveCount(0); // first play is taught by the single spotlight, not a banner
    await expect(page.locator('#active-table-order .primary[data-spotlight]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tables = await page.locator('.table-object').all();
    for (const button of await page.locator('.stock-strip > button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const boxes = await Promise.all(tables.map(table => table.boundingBox()));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await expect(page.locator('.toast-gain')).toHaveAccessibleName(/có boa/);
    await expect(page.locator('.toast-gain strong')).toHaveText(/^\+\d+$/);
    const coins = await page.locator('.money strong').textContent();
    expect(await page.locator('.money').ariaSnapshot()).toContain('Xu');
    expect(await page.locator('.glass-counter').ariaSnapshot()).toContain('Cốc sạch');
    // Seat model (rules 28): a new game is one table with one chair, taken by the first guest.
    await expect(page.locator('.seat')).toHaveCount(1);
    await expect(page.locator('.seat-customer')).toHaveCount(1);
    await expect(page.locator('.seat-empty')).toHaveCount(0);
    await waitSaved(page);
    // A slow lazy module takes longer than a served guest's entire consumption time.
    if (viewport.width === 390) await page.route('**/src/App.tsx*', async route => { await new Promise(resolve => setTimeout(resolve, 12000)); await route.continue(); }, { times: 1 });
    await reloadAtSameGameTime(page);
    await expect(page.locator('.money strong')).toHaveText(coins!);
    await expect(page.locator('.table-space.state-consuming')).toHaveCount(1);
    await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
    const stockRow = page.locator('.stock-row').first();
    for (const button of await stockRow.getByRole('button').all()) {
      const b = (await button.boundingBox())!, panel = (await page.locator('.sheet').boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.x).toBeGreaterThanOrEqual(panel.x); expect(b.x + b.width).toBeLessThanOrEqual(panel.x + panel.width);
    }
    const stockBefore = Number((await stockRow.locator('.stock-info span').textContent())!.match(/\d+/)![0]);
    await stockRow.getByRole('button', { name: 'Mua bom +1 · 12 xu', exact: true }).click();
    await expect(stockRow.locator('.stock-info span')).toHaveText(`Bom bia ${stockBefore + 1}/15 cốc`);
    const before = await page.locator('.energy strong').textContent();
    await page.clock.runFor(2000);
    expect(await page.locator('.energy strong').textContent()).toBe(before);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en');
    await expect(page.getByRole('heading', { name: 'Your own corner' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    await waitSaved(page); await reloadAtSameGameTime(page);
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a neglected first shift closes after remaining guests expire and shows the numbers of the loss with exactly one reason', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  // The forced first guest orders at about 8 s and nobody serves it: it walks out after its patience (24 s x the weather's multiplier, then 2.5 s of grace).
  // Step the fake clock until that toast shows instead of assuming one weather's number; the toast stays up for seconds, far longer than a step.
  for (let waited = 0; waited < 60000 && !await page.locator('.toast-loss').isVisible(); waited += 500) await page.clock.runFor(500);
  await expect(page.locator('.toast-loss')).toBeVisible();
  await expect(page.locator('.toast-loss')).toHaveAccessibleName(/Trừ \d+ xu và \d+ uy tín/);
  // PLAN P3 (owner 18/09, supersedes the 08/09 numbers-only rule): the numbers stay, and the toast names ONE reason; nobody served the ready order, so the guest waited too long.
  await expect(page.locator('.toast-loss')).toHaveText(/^Chờ lâu quá[−\d\s.,]+$/);
  await expect(page.locator('.toast-loss .loss-reason')).toHaveCount(1);
  for (const icon of await page.locator('.toast-loss svg').all()) expect((await icon.boundingBox())!.width).toBeGreaterThan(0);
  await expect(page.locator('.lost-bubble')).toHaveCount(0);
  await expect(page.getByText('Khách chờ lâu quá', { exact: false })).toHaveCount(0);
  await page.clock.fastForward(720000);
  // A late Chi Pheo may still be waiting after exhaustion; drain the configured deadline.
  const c = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8')) as typeof import('../../../docs/config/economy.tbh.json');
  const maxPatience = c.patience.thuongMs * Math.max(...Object.values(c.customerTypes).flatMap(t => t.usesTable && 'patienceMult' in t ? [t.patienceMult] : [])) * Math.max(...(['sunny', 'hot', 'humid', 'rain', 'cold'] as const).map(w => c.weather[w].patienceMult));
  await page.clock.fastForward(maxPatience + c.patience.graceMs + c.runtime.tableSeatingMs + c.runtime.tableCleaningMs);
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ngừng đón khách' })).toHaveCount(0);
  const saved = JSON.parse(await readSave(page));
  expect(saved.version).toBe(2); expect(saved.log[0].command.type).toBe('activity'); expect(saved.log.some((e: { command: { type: string } }) => e.command.type === 'startShift')).toBe(true);
});

test('tapped order stays live, returns keyboard focus, and closes on customer expiry', async ({ page }) => {
  // Seat model: a new game has one table; this save bought its second (real command) so focus can move between two table triggers.
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-08T10:00:00Z'));
  await bootFresh(page, {}, undefined, undefined, 2);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(8100);
  const originalCustomer = await page.locator('.seat-customer').first().getAttribute('data-customer-id');
  expect(originalCustomer).toBeTruthy();
  const trigger = page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first();
  await trigger.click();
  const panel = page.getByRole('dialog', { name: 'Bàn 1', exact: true });
  await expect(panel).toBeVisible();
  // Instant pour (rules 28): the beer is already in the reserve, so the tray is ready the moment the order exists (before, the Serve button stayed
  // dimmed for the 2 s tap; that wait lives on in instant-pour.spec.ts for a capacity pin). The open panel still runs live: its countdown moves.
  const serve = panel.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }), countdown = panel.locator('.order-heading b'), left = await countdown.textContent();
  expect(left).toBeTruthy(); await expect(serve).toBeEnabled();
  await page.clock.runFor(2000);
  await expect(countdown).not.toHaveText(left!); await expect(serve).toBeEnabled();
  await expect(panel.getByRole('button', { name: 'Đóng', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  const secondTable = page.getByRole('button', { name: 'Xem mâm · bàn 2', exact: true });
  await secondTable.focus(); await secondTable.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Bàn 2', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(secondTable).toBeFocused();
  await trigger.click();
  const timeBefore = await page.locator('.energy strong').textContent();
  await page.clock.runFor(3000);
  await expect(panel.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeEnabled();
  expect(await page.locator('.energy strong').textContent()).not.toBe(timeBefore);
  // Weather changes patience; exercise this actual order's deadline, not a sunny-day estimate.
  const saved = { text: await readSave(page), now: await page.evaluate(() => Date.now()) };
  const current = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/pause.ts', 'inspect'], { encoding: 'utf8', input: JSON.stringify({ save: saved.text }) }));
  const remaining = current.now + current.remaining + current.grace - saved.now;
  expect(remaining).toBeGreaterThan(0);
  await page.clock.runFor(remaining - 1);
  await expect(panel).toBeVisible();
  await page.clock.runFor(101);
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.toast-loss')).toHaveText(/^Chờ lâu quá[−\d\s.,]+$/);
  await expect(page.locator('.table-object').first()).toBeFocused();
  await expect(page.locator(`[data-customer-id="${originalCustomer}"]`)).toHaveCount(0);
  await expect(page.locator('.lost-bubble')).toHaveCount(0);
});

test('mixed customers retain their urgent identity and a live grace countdown when beer is out', async ({ page }) => {
  // The engine's JSON imports use the same tsx loader as the unit suite and simulator.
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/mixed-grace.ts'], { encoding: 'utf8' }));
  expect(fixture.customers).toEqual(['thuong', 'voi']); expect(fixture.state).toBe('grace');
  await page.clock.install({ time: new Date(fixture.now) });
  await page.clock.pauseAt(new Date(fixture.now + 1000));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/');
  const hint = page.locator('.table-space').first().locator('.table-order-hint');
  const countdown = await hint.locator('.bubble-time').textContent();
  expect(countdown).toMatch(/^Còn [1-3]s$/);
  await hint.click();
  await expect(page.locator('.customer-tag')).toHaveText('Khách vội');
  await expect(page.locator('.order-heading b')).toHaveText(countdown!);
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeDisabled();
});

// pauseAt installs fake timers itself; a separate running install can race the identical target time.
for (const [mode, emoji] of [['early', '🤩'], ['late', '😐'], ['grace', '😥'], ['stale', '😖']]) {
  test(`multi-dish service shows the actual ${mode} reward and guest reaction`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/service-states.ts', mode], { encoding: 'utf8' }));
    expect(fixture.result).toMatchObject({ ok: true, outcome: mode });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('service-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('service-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    const table = page.locator('.table-space').first(), hint = table.locator('.table-order-hint');
    await expect(hint.locator('.bubble-dish')).toHaveCount(2);
    const dishBoxes = await Promise.all((await hint.locator('.bubble-dish').all()).map(dish => dish.boundingBox()));
    expect(dishBoxes[0]!.y).toBe(dishBoxes[1]!.y);
    await expect(hint).toHaveAccessibleDescription(/Bia hơi × 1, Lạc rang × 1/);
    await hint.click();
    await expect(page.locator('.order-heading strong')).toHaveText('2 món');
    await expect(page.locator('.dish-ready')).toHaveCount(2);
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await expect(page.locator('.order-panel')).toHaveCount(0);
    await expect(hint).toHaveCount(0);
    await expect(table.locator('.customer-reaction')).toHaveText(emoji);
    await expect(table.locator('.enjoy-time')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(table.locator('.guest-label')).toHaveText('Bàn lai rai');
    await expect(page.locator('.toast-gain')).toHaveCount(1);
    await expect(page.locator('.toast-gain strong')).toHaveText(`+${fixture.result.amount}`);
    await expect(page.locator('.toast-gain button')).toHaveCount(0);
    const balance = new Intl.NumberFormat('vi-VN').format(fixture.coins + fixture.result.amount);
    await expect(page.locator('.money strong')).toHaveText(balance);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await table.locator('.customer-reaction').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.locator('.toast-gain').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await page.clock.runFor(2500);
    await expect(page.locator('.toast-gain')).toHaveCount(0);
    await waitSaved(page); await page.reload();
    await expect(page.locator('.money strong')).toHaveText(balance);
    await expect(page.locator('.toast-gain')).toHaveCount(0);
    await expect(table.locator('.customer-reaction')).toHaveText(emoji);
  });
}

test('corrupt saves are preserved and the app offers the original for recovery', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tbh.save.v1', '{broken-save'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Bản lưu chưa đọc được');
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{broken-save');
});

for (const width of [360, 390]) {
  test(`well-rested timer pauses offline and actual bonus appears in the shift book at ${width}px`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/service-states.ts', 'rested'], { encoding: 'utf8' }));
    await page.setViewportSize({ width, height: 844 });
    await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('rested-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('rested-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    const badge = page.locator('.well-rested');
    await expect(badge).toHaveAccessibleName(/Tỉnh Táo ×1.1/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const before = await badge.locator('time').textContent();
    await waitSaved(page); await page.goto('about:blank'); await page.clock.setSystemTime(new Date(fixture.now + 86400000));
    await page.goto('/'); await expect(badge.locator('time')).toHaveText(before!);
    await page.locator('.table-order-hint').first().click();
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await expect(page.locator('.toast-gain strong')).toHaveText(`+${fixture.result.amount}`);
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    await expect(page.locator('.ledger > div').filter({ hasText: 'Thưởng Tỉnh Táo' }).locator('dd')).toHaveText(String(fixture.bonus));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await expect(badge).toHaveAccessibleName(/Well rested ×1.1/);
    await page.clock.runFor(1000);
    expect(await badge.locator('time').textContent()).not.toBe(before);
  });
}

test('muting, guide skipping and reduced-motion preference survive normal play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bootFresh(page, { guideDone: false, guideIndex: 1, muted: false }); // the fallback guide is already showing, as after three lost guests
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: 'Âm thanh Đang bật' }).click();
  await waitSaved(page); await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.settings.v1')!))).toMatchObject({ muted: true, guideDone: true });
  await expect(page.locator('.guide')).toHaveCount(0);
});


test('hidden and offline time preserves the current order and remaining shift', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-08T10:00:00Z'));
  await bootFresh(page);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(11100);
  const timeBefore = await page.locator('.energy strong').textContent();
  const coinsBefore = await page.locator('.money strong').textContent();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByText('Game tự tạm dừng', { exact: true })).toBeVisible();
  await page.clock.runFor(60000);
  await expect(page.locator('.energy strong')).toHaveText(timeBefore!);
  await expect(page.locator('.toast-loss')).toHaveCount(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await waitSaved(page); await page.goto('about:blank');
  await page.clock.setSystemTime(new Date('2026-09-09T10:01:11.100Z'));
  await page.goto('/');
  await expect(page.locator('.energy strong')).toHaveText(timeBefore!);
  await expect(page.locator('.money strong')).toHaveText(coinsBefore!);
  await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect(page.locator('.toast-gain')).toHaveAccessibleName(/có boa/);
    await expect(page.locator('.toast-gain strong')).toHaveText(/^\+\d+$/);
});

test('recovery rejects a bad import, accepts a valid backup and preserves the original', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('recovery-seeded')) { localStorage.setItem('tbh.save.v1', '{bad-original'); localStorage.setItem('recovery-seeded', '1'); } });
  await page.goto('/');
  const input = page.getByLabel('Nhập file sao lưu');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('Chưa thể phục hồi.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{bad-original');
  await input.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: readFileSync('packages/engine/test/fixtures/legacy-save-v1.json') });
  await expect(page.locator('.game-shell')).toBeVisible();
  expect(await readBackups(page)).toContain('{bad-original');
});

test('starting fresh requires an explicit choice and retains the corrupt backup', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('recovery-seeded')) { localStorage.setItem('tbh.save.v1', '{bad-reset'); localStorage.setItem('recovery-seeded', '1'); } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('{bad-reset');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Giữ bản dự phòng và tạo quán mới' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bắt đầu lại', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ bản dự phòng và tạo quán mới' }).click();
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.locator('.money strong')).toHaveText('750');
  expect(await readBackups(page)).toContain('{bad-reset');
});

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 400 }]) {
  test(`manual close shows its fee, allows cancellation and debits consuming guests once at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
    await bootFresh(page);
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.clock.runFor(11100);
    await page.locator('.table-order-hint').first().click();
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    const coins = Number((await page.locator('.money strong').textContent())!.replace(/\./g, ''));
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    await page.getByRole('button', { name: 'Mời tất cả về · 5 xu', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Mời khách về để đóng ca?', exact: true });
    await expect(dialog).toBeVisible(); await expect(dialog.locator('.sheet-header button')).toBeFocused();
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins));
    const time = await page.locator('.energy strong').textContent();
    await page.clock.runFor(1000); expect(await page.locator('.energy strong').textContent()).toBe(time);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Đợi khách dùng xong', exact: true }).click();
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins)); await expect(page.locator('.state-consuming')).toHaveCount(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    await page.getByRole('button', { name: 'Mời tất cả về · 5 xu', exact: true }).click();
    await page.getByRole('button', { name: 'Trả 5 xu và đóng ca', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Sổ ca hôm nay' })).toBeVisible();
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins - 5));
    await expect(page.locator('.ledger > div').filter({ hasText: 'Chi trong ca' }).locator('dd')).toHaveText('5');
    await expect(page.locator('.seat-customer')).toHaveCount(0);
    await expect(page.locator('.toast-loss')).toHaveCount(0);
    await waitSaved(page); await page.reload(); await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins - 5));
    const save = JSON.parse(await readSave(page));
    expect(save.events.filter((e: { type: string }) => e.type === 'guests_dismissed')).toHaveLength(1);
  });
}

test('insufficient close funds keep the guest paused until choosing to wait, then natural expiry charges no second fee', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/manual-close.ts', 'poor'], { encoding: 'utf8' }));
  await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  await page.getByRole('button', { name: 'Mời tất cả về · 5 xu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Trả 5 xu và đóng ca', exact: true })).toBeDisabled();
  await expect(page.locator('.seat-customer')).toHaveCount(1);
  await expect(page.locator('.money strong')).toHaveText(String(fixture.coins));
  await page.clock.runFor(20000); await expect(page.locator('.seat-customer')).toHaveCount(1);
  await page.getByRole('button', { name: 'Đợi khách dùng xong', exact: true }).click(); await page.clock.runFor(fixture.expiresIn + 500);
  await expect(page.getByRole('dialog', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.locator('.money strong')).toHaveText('0');
  const save = JSON.parse(await readSave(page));
  expect(save.events.some((e: { type: string }) => e.type === 'guests_dismissed')).toBe(false);
});

test('a mixed occupied table renders only the remaining Chi Pheo and closes with zero fee', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/manual-close.ts', 'occupied'], { encoding: 'utf8' }));
  await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/');
  await expect(page.locator('.state-occupied .seat-customer')).toHaveCount(1);
  await expect(page.locator('.state-occupied .seat-customer')).toHaveAttribute('data-customer-id', fixture.guests[0]);
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  await page.getByRole('button', { name: 'Mời tất cả về · 0 xu', exact: true }).click();
  await page.getByRole('button', { name: 'Trả 0 xu và đóng ca', exact: true }).click();
  await expect(page.locator('.seat-customer')).toHaveCount(0);
  await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(fixture.coins));
});

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 720 }, { width: 1280, height: 400 }]) {
  test(`rush warning pauses in sheets, resumes on closing, active timer wins, and closing ends it at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(90000); // game time is advanced by hand: 14–16 s with 3 workers, past the 45 s default when 6 workers starve the CPU
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/rush.ts'], { encoding: 'utf8' }));
    await page.setViewportSize(viewport);
    await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('rush-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('rush-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    const hud = page.locator('.rush-label');
    await expect(hud).toContainText('Sắp tới · Giờ Vàng'); await expect(hud.locator('time')).toHaveText('00:21');
    await expect(page.locator('.rush-label.is-warning')).toHaveCount(0);
    await page.clock.runFor(1000);
    await expect(page.locator('.rush-label.is-warning')).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: 'Chuẩn bị đón Giờ Vàng.' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
    await page.clock.runFor(1000); await expect(hud.locator('time')).toHaveText('00:20');
    await page.keyboard.press('Escape');
    await page.clock.runFor(fixture.warningMs);
    await expect(page.locator('.rush-label.is-active')).toHaveCount(1);
    await expect(hud).toHaveText('Giờ VàngCòn 01:30');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.table-order-hint').first().click();
    await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
    await expect(page.locator('.toast-gain')).toBeVisible();
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    await page.getByRole('button', { name: 'Ngừng đón khách', exact: true }).click();
    await page.clock.fastForward(fixture.first.end - fixture.first.start);
    await expect(hud).toHaveText('Nhịp quán bình thường');
    await page.clock.fastForward(fixture.second.start - fixture.first.end + 1);
    await expect(hud).toHaveText('Nhịp quán bình thường');
    // The last guests may already have left (seat model: fewer seated groups), and a finished shift opens its book itself.
    if (!(await page.getByRole('dialog', { name: 'Sổ ca hôm nay', exact: true }).isVisible())) await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
    const report = page.getByRole('table', { name: 'Giờ Vàng trong ca' }); await report.scrollIntoViewIfNeeded(); await expect(report).toBeVisible();
    const stored = JSON.parse(await readSave(page));
    const ended = stored.events.find((e: { type: string }) => e.type === 'rush_ended').data;
    await expect(report.locator('tbody td').nth(0)).toHaveText(new Intl.NumberFormat('vi-VN').format(ended.served));
    await expect(report.locator('tbody td').nth(1)).toHaveText(new Intl.NumberFormat('vi-VN').format(ended.lost));
    await expect(report.locator('tbody td').nth(2)).toHaveText(new Intl.NumberFormat('vi-VN').format(ended.revenue));
    await page.keyboard.press('Escape'); await waitSaved(page); await page.reload();
    await expect(hud).toHaveText('Nhịp quán bình thường');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Shift book', exact: true }).click(); await expect(page.getByRole('table', { name: 'Rush results this shift' })).toBeVisible();
    const save = JSON.parse(await readSave(page));
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_warning')).toHaveLength(1);
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_started')).toHaveLength(1);
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_ended')).toHaveLength(1);
  });
}


test('an overlapping upcoming rush cannot interrupt the active-rush HUD with a screen-reader warning', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/rush.ts', 'overlap'], { encoding: 'utf8' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/');
  await page.clock.runFor(1000);
  await expect(page.locator('.rush-label.is-active b')).toHaveText('Giờ Vàng');
  await expect(page.locator('.rush-label.is-warning')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Chuẩn bị đón' })).toHaveCount(0);
  const before = await page.locator('.rush-label time').textContent();
  await page.clock.runFor(1000); expect(await page.locator('.rush-label time').textContent()).not.toBe(before);
});

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 720 }, { width: 1280, height: 400 }]) {
  test(`dog purchase has a reachable stock path, three sprites and exact reload at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/dog.ts'], { encoding: 'utf8' }));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('dog-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('dog-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
    await page.locator('.dog-entry').click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Chó giữ quán');
    await expect(page.getByRole('button', { name: 'Đón chó · 5.000 xu', exact: true })).toBeDisabled();
    await expect(page.locator('.dog-panel')).toContainText('Nâng quầy / kho để chứa đủ nguyên liệu.');
    await expect(page.locator('.dog-requirements')).toContainText('Lạc rang × 20');
    await page.getByRole('button', { name: 'Nâng quầy / kho', exact: true }).click();
    const stall = page.locator('.upgrade-card').filter({ has: page.getByRole('heading', { name: 'Quầy hàng', exact: true }) });
    await stall.getByRole('button').click();
    await page.locator('.dog-entry').click(); await page.getByRole('button', { name: 'Nhập hàng', exact: true }).last().click();
    await page.locator('.stock-row').filter({ hasText: 'Lạc rang' }).getByRole('button', { name: /Đầy kho/ }).click();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.locator('.dog-entry').click();
    await page.getByRole('button', { name: 'Đón chó · 5.000 xu', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.dog-object')).toHaveAccessibleName('Chó giữ quán · cấp 1');
    await expect(page.locator('.dog-object img')).toHaveAttribute('src', /dog-idle-lv1/);
    const dogSprites = [await page.locator('.dog-object img').getAttribute('src')];
    const boughtCoins = await page.locator('.money strong').textContent();
    await waitSaved(page); await page.reload(); await expect(page.locator('.money strong')).toHaveText(boughtCoins!);
    await expect(page.locator('.dog-object')).toHaveAccessibleName('Chó giữ quán · cấp 1');
    for (const level of [2, 3]) {
      await page.locator('.dog-object').click();
      if (level === 3) {
        await expect(page.locator('.dog-panel')).toContainText('Nâng quầy / kho để chứa đủ nguyên liệu.');
        await page.getByRole('button', { name: 'Nâng quầy / kho', exact: true }).click(); await stall.getByRole('button').click();
        await page.locator('.dog-entry').click();
      }
      await page.getByRole('button', { name: 'Nhập hàng', exact: true }).last().click();
      await page.locator('.stock-row').filter({ hasText: 'Nem chua' }).getByRole('button', { name: /Đầy kho/ }).click();
      await page.keyboard.press('Escape'); await page.locator('.dog-object').click();
      await page.locator('.dog-panel > .primary').click();
      await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.dog-object img')).toHaveAttribute('src', new RegExp(`dog-idle-lv${level}`));
      dogSprites.push(await page.locator('.dog-object img').getAttribute('src'));
    }
    const box = (await page.locator('.dog-object').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    for (const target of await page.locator('.equipment-object, .glass-counter, .stock-strip button').all()) {
      const other = (await target.boundingBox())!;
      expect(box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + box.height <= other.y || other.y + other.height <= box.y).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.dog-object img').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    // Verify real alpha, not a painted checkerboard, in each delivered sprite.
    for (const src of dogSprites) {
      const alpha = await page.evaluate(async src => {
        const img = new Image(); img.src = src!; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let transparent = 0, opaque = 0;
        for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) transparent++; if (pixels[i] === 255) opaque++; }
        return { transparent, opaque };
      }, src);
      expect(alpha.transparent).toBeGreaterThan(0); expect(alpha.opaque).toBeGreaterThan(0);
    }
    await page.locator('.dog-object').click(); await expect(page.locator('.dog-panel')).toContainText('Đã tối đa');
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape'); await page.locator('.dog-object').click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Guard dog'); await expect(page.locator('.dog-panel')).toContainText('Veteran dog');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const saved = JSON.parse(await readSave(page)).events.filter((e: { type: string }) => ['dog_bought', 'dog_upgraded'].includes(e.type));
    expect(saved.map((e: { data: { toLevel: number } }) => e.data.toLevel)).toEqual([1, 2, 3]);
  });
}

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 400 }]) {
  test(`life path rewards and business upgrades remain separate at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/progression.ts'], { encoding: 'utf8' }));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('path-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('path-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    await page.getByRole('button', { name: 'Đường lên Trùm', exact: true }).click();
    await expect(page.locator('.journey-summary h3')).toHaveText('Phụ Quán');
    const lp1 = page.locator('.milestone-list > li[data-level="1"]'), lp2 = page.locator('.milestone-list > li[data-level="2"]');
    await expect(lp1).toContainText('Có thể nhận'); await expect(lp2).toContainText('Quầy / kho: cấp 2 / 3'); await expect(lp2).toContainText('Có điện thoại');
    await expect(page.locator('.journey-summary progress')).toHaveAttribute('value', '5');
    await page.getByRole('button', { name: 'Xem nâng cấp quán', exact: true }).click();
    const phone = page.locator('.business-card').filter({ has: page.getByRole('heading', { name: 'Điện thoại', exact: true }) });
    const qr = page.locator('.business-card').filter({ has: page.getByRole('heading', { name: 'Bảng QR', exact: true }) });
    await expect(qr.getByRole('button')).toBeDisabled();
    await phone.getByRole('button', { name: 'Mua · 12.500 xu', exact: true }).click();
    await expect(phone.getByRole('button', { name: 'Đã có', exact: true })).toBeDisabled();
    await expect(qr.getByRole('button')).toBeDisabled();
    await page.locator('.upgrade-card').filter({ has: page.getByRole('heading', { name: 'Quầy hàng', exact: true }) }).getByRole('button').click();
    await expect(qr.getByRole('button')).toBeEnabled(); await qr.getByRole('button', { name: 'Mua · 20.000 xu', exact: true }).click();
    for (const img of await page.locator('.business-card img').all()) await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.keyboard.press('Escape'); await expect(page.locator('.business-props button')).toHaveCount(2);
    await page.getByRole('button', { name: 'Đường lên Trùm', exact: true }).click();
    await expect(page.locator('.journey-summary h3')).toHaveText('Tay Ngang');
    await expect(lp1).toContainText('Có thể nhận'); await expect(lp2).toContainText('Có thể nhận');
    await lp2.getByRole('button', { name: 'Nhận thưởng · Tay Ngang', exact: true }).click();
    await expect(lp2).toContainText('Đã nhận'); await expect(lp2.getByRole('button')).toHaveCount(0);
    await expect(page.locator('.progress-wallet')).toContainText('Mảnh huy hiệu 1');
    await lp1.getByRole('button', { name: 'Nhận thưởng · Phụ Quán', exact: true }).click(); await expect(lp1).toContainText('Đã nhận');
    await expect(page.locator('.journey-summary')).toContainText(`${fixture.lifetime} xu trọn đời`);
    await page.keyboard.press('Escape'); await expect(page.locator('.nav-badge')).toHaveCount(0);
    const coins = fixture.coins - 12500 - 12500 - 20000 + 25000 + 12500;
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins));
    await waitSaved(page); await page.reload(); await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins));
    for (const prop of await page.locator('.business-props button').all()) {
      const a = (await prop.boundingBox())!; expect(a.width).toBeGreaterThanOrEqual(44); expect(a.height).toBeGreaterThanOrEqual(44);
      for (const target of await page.locator('.equipment-object, .glass-counter, .dog-object, .stock-strip button').all()) {
        const b = (await target.boundingBox())!; expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
      }
    }
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Your journey', exact: true }).click();
    await expect(lp1).toContainText('Claimed'); await expect(lp2).toContainText('Claimed'); await expect(page.locator('.milestone-list > li[data-level="3"]')).toContainText('Core equipment');
    await expect(lp1.getByRole('heading')).toHaveText('Stall helper'); await expect(page.locator('.journey-summary h3')).toHaveText('Newcomer');
    await expect(page.locator('.milestone-list > li[data-level="4"]')).toContainText('Previously reached Silver keg');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const state = JSON.parse(await readSave(page));
    expect(state.events.filter((e: { type: string }) => e.type === 'life_path_reward_claimed').map((e: { data: { level: string } }) => e.data.level)).toEqual(['LP2', 'LP1']);
  });
}

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 400 }]) {
  test(`shipper ingredients, whole handoff, phone focus and reload at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/shipper.ts'], { encoding: 'utf8' }));
    await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('shipper-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('shipper-seeded', '1'); } }, fixture.save);
    await page.goto('/');
    const phone = page.getByRole('button', { name: 'Điện thoại · đơn giao hàng', exact: true });
    await expect(phone).toHaveClass(/has-delivery/); await expect(phone).toHaveAccessibleDescription(/Hạn giao còn lại.*00:45/);
    const bounds = (await phone.boundingBox())!; expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
    for (const target of await page.locator('.equipment-object, .glass-counter, .dog-object, .stock-strip button').all()) {
      const b = (await target.boundingBox())!; expect(bounds.x + bounds.width <= b.x || b.x + b.width <= bounds.x || bounds.y + bounds.height <= b.y || b.y + b.height <= bounds.y).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await phone.locator('img').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await phone.click(); const panel = page.getByRole('dialog', { name: 'Đơn giao hàng', exact: true });
    await expect(panel.getByRole('button', { name: /^Giao cả đơn/ })).toBeDisabled(); await expect(panel.locator('.delivery-lines li')).toHaveCount(fixture.lines.length);
    await expect.poll(() => panel.locator('.delivery-summary img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 1024)).toBe(true);
    await page.clock.runFor(1000); await expect(panel.getByRole('timer')).toHaveText('00:45');
    await panel.getByRole('button', { name: 'Nhập nguyên liệu còn thiếu', exact: true }).click();
    let cost = 0;
    for (const line of fixture.lines) { cost += line.cost; await page.locator('.stock-row').nth(line.index).getByRole('button', { name: /Đầy kho/ }).click(); }
    await page.keyboard.press('Escape'); await phone.click();
    await expect(panel.getByRole('button', { name: /^Giao cả đơn/ })).toBeEnabled();
    await panel.getByRole('button', { name: /^Giao cả đơn/ }).click();
    await expect(panel).toHaveCount(0); await expect(phone).toBeFocused(); await expect(phone).not.toHaveClass(/has-delivery/);
    await expect(page.locator('.toast-gain strong')).toHaveText(`+${fixture.quote.credited}`);
    const amount = fixture.coins - cost + fixture.quote.credited;
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(amount));
    await waitSaved(page); await page.reload(); await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(amount));
    await page.getByRole('button', { name: 'Sổ ca', exact: true }).click(); await expect(page.locator('.ledger')).toContainText('Đơn đã giao'); await expect(page.locator('.ledger')).toContainText('Tiền đơn sau chiết khấu');
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Phone · delivery orders', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Delivery order', exact: true })).toContainText('Next order in');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const saved = JSON.parse(await readSave(page));
    expect(saved.events.filter((e: { type: string }) => e.type === 'shipper_completed')).toHaveLength(1);
  });
}

test('a pending shipper blocks paid closure and expires with a numeric-only penalty', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/shipper.ts', 'ready'], { encoding: 'utf8' }));
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  await page.getByRole('button', { name: /Mời tất cả về/ }).click();
  await expect(page.getByRole('button', { name: /^Trả .* xu và đóng ca$/ })).toBeDisabled(); await expect(page.getByRole('dialog')).toContainText('Giao đơn shipper đang chờ');
  await page.getByRole('button', { name: 'Đợi khách dùng xong', exact: true }).click();
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click(); await page.getByRole('button', { name: 'Ngừng đón khách', exact: true }).click();
  const phone = page.getByRole('button', { name: 'Điện thoại · đơn giao hàng', exact: true });
  await page.clock.runFor(20000); await phone.click(); await expect(page.locator('.delivery-urgent')).toBeVisible(); await expect(phone).toHaveAccessibleDescription(/Sắp hết hạn giao/);
  await page.clock.runFor(25000); await expect(page.locator('.delivery-urgent')).toBeVisible();
  await page.keyboard.press('Escape'); await page.clock.runFor(25000); await expect(page.getByRole('dialog', { name: 'Đơn giao hàng', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay', exact: true })).toBeVisible();
  await expect(page.locator('.toast-loss')).toHaveText(/^[−\d\s.,]+$/); await expect(page.locator('.toast-loss')).toHaveAccessibleName(`Trừ ${fixture.quote.penalty} xu và 0 uy tín`);
  await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(fixture.coins - fixture.quote.penalty));
  await expect(page.locator('.ledger')).toContainText('Đơn giao quá hạn');
});

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
 test(`business sign installation, ownership, reputation gate and live yard at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/signboard.ts'], { encoding: 'utf8' }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => { if (!localStorage.getItem('sign-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('sign-seeded', '1'); } }, fixture.save);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.getByRole('button', { name: 'Biển hiệu Chưa lắp biển', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Biển hiệu', exact: true }), money = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
  await expect(panel.getByRole('article')).toHaveCount(5);
  await panel.getByRole('button', { name: /^Lắp biển Gỗ/ }).click();
  const wood = panel.getByRole('article', { name: 'Gỗ', exact: true }), neon = panel.getByRole('article', { name: 'Neon', exact: true }), golden = panel.getByRole('article', { name: 'Hoàng kim', exact: true });
  await expect(wood.getByRole('button')).toHaveText('Đang treo'); await expect(golden.getByRole('button')).toBeDisabled();
  await expect(golden).toContainText('Không trừ uy tín');
  await neon.getByRole('button').click(); await expect(neon.getByRole('button')).toHaveText('Đang treo');
  for (const img of await panel.locator('.sign-card > img').all()) await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1536)).toBe(true);
  await wood.getByRole('button').click(); await expect(neon.getByRole('button')).toHaveText('Treo biển này'); await neon.getByRole('button').click();
  await page.keyboard.press('Escape'); const prop = page.getByRole('button', { name: 'Biển Neon · đổi kiểu', exact: true });
  const b = (await prop.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.money strong')).toHaveText(money(fixture.coins - fixture.install - fixture.neon));
  await prop.click(); await page.clock.runFor(1000); await expect(golden.getByRole('button')).toBeDisabled(); await page.keyboard.press('Escape'); await expect(prop).toBeFocused();
  await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await prop.click(); await expect(golden.getByRole('button')).toBeEnabled(); await golden.getByRole('button').click();
  await expect(golden.getByRole('button')).toHaveText('Đang treo');
  await page.keyboard.press('Escape'); await waitSaved(page); await page.reload();
  await expect(page.getByRole('button', { name: 'Biển Hoàng kim · đổi kiểu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Golden sign · change style', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Shop sign', exact: true })).toContainText('VIP attraction ×3');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const saved = JSON.parse(await readSave(page));
  expect(saved.events.filter((e: { type: string }) => e.type === 'signboard_installed')).toHaveLength(1);
  expect(saved.events.filter((e: { type: string }) => e.type === 'signboard_bought')).toHaveLength(2);
  const purchase = saved.events.filter((e: { type: string }) => e.type === 'signboard_bought').at(-1);
  expect(purchase.data.requiredRep).toBe(fixture.reputationGate); expect(purchase.data.cost).toBe(fixture.golden);
  expect(errors).toEqual([]);
 });
}

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 400 }]) {
 test(`flyer purchase, live timer, actual service report and reload at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  test.setTimeout(90000); // 17 s alone, about 40 s with 3 workers, past the 45 s default when 6 workers starve the CPU
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/flyer.ts'], { encoding: 'utf8' }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(viewport); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => { if (!localStorage.getItem('flyer-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('flyer-seeded', '1'); } }, fixture.save);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click(); await page.getByRole('button', { name: 'Tờ rơi 0 / 5 tờ rơi', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Tờ rơi', exact: true });
  await expect(panel).toContainText('Không giảm thời gian chờ'); await expect(panel.getByRole('button', { name: 'Phát tờ rơi', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: /^Mua 1 tờ/ }).click(); await expect(panel).toContainText('1 / 5 tờ rơi');
  await expect(page.locator('.stock-strip .reputation')).toHaveText(new Intl.NumberFormat('vi-VN').format(fixture.reputation - fixture.cost));
  await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(fixture.coins));
  await expect(panel.getByRole('button', { name: /^Mua 1 tờ/ })).toBeDisabled();
  await expect.poll(() => panel.locator('.flyer-summary img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1254)).toBe(true);
  await panel.getByRole('button', { name: 'Phát tờ rơi', exact: true }).click(); await expect(panel).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Tờ rơi · còn 0', exact: true }); await expect(trigger).toHaveText('01:30');
  const box = (await trigger.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await page.clock.runFor(5000); await expect(trigger).toHaveText('01:25'); await waitSaved(page); await page.reload(); await expect(trigger).toHaveText('01:25');
  await trigger.click(); await expect(panel.getByRole('button', { name: 'Phát tờ rơi', exact: true })).toBeDisabled();
  await page.screenshot({ path: `.qa/flyer-active-${viewport.width}.png` }); await page.keyboard.press('Escape');
  for (let i = 0; i < 20; i++) {
    await page.clock.runFor(2000);
    const ready = page.locator('.table-order-hint.is-ready').first();
    if (await ready.count()) { await ready.click(); await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click(); }
  }
  await page.clock.runFor(fixture.duration - 45000); await trigger.click();
  const report = panel.getByRole('region', { name: 'Chiến dịch gần nhất', exact: true }); await expect(report).toBeVisible();
  await expect(report).toContainText('Đã chạy 90s'); await expect(report).toContainText('Xu thực nhận');
  await expect(panel.getByRole('button', { name: 'Phát tờ rơi', exact: true })).toBeDisabled();
  await page.clock.runFor(1000); const saved = JSON.parse(await readSave(page));
  const ends = saved.events.filter((e: { type: string }) => e.type === 'flyer_ended'); expect(ends).toHaveLength(1); expect(ends[0].data.served).toBeGreaterThan(0); expect(ends[0].data.revenue).toBeGreaterThan(0);
  expect(saved.events.filter((e: { type: string }) => e.type === 'flyer_bought')).toHaveLength(1);
  await page.screenshot({ path: `.qa/flyer-report-${viewport.width}.png` }); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Ngôn ngữ').selectOption('en'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Flyers · 0 left', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Flyers', exact: true })).toContainText('Latest campaign');
  await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
 });
}
