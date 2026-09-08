import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }, { width: 1280, height: 400 }]) {
  test(`guest serves, reloads, opens live sheets and switches locale at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
    await page.goto('/');
    await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.clock.runFor(11100);
    await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);
    await expect(page.locator('.guide')).toContainText('Chạm Phục vụ');
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
    await expect(page.locator('.seat')).toHaveCount(6);
    await expect(page.locator('.seat-customer')).toHaveCount(1);
    await expect(page.locator('.seat-empty')).toHaveCount(5);
    await page.reload();
    await expect(page.locator('.money strong')).toHaveText(coins!);
    await expect(page.locator('.table-space.state-consuming')).toHaveCount(1);
    await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
    const stockRow = page.locator('.stock-row').first();
    const stockBefore = Number((await stockRow.locator('.stock-info span').textContent())!.split('/')[0]);
    await stockRow.getByRole('button', { name: '+1 · 12 xu', exact: true }).click();
    await expect(stockRow.locator('.stock-info span')).toHaveText(`${stockBefore + 1} / 15`);
    const before = await page.locator('.energy strong').textContent();
    await page.clock.runFor(2000);
    expect(await page.locator('.energy strong').textContent()).not.toBe(before);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByLabel('Ngôn ngữ').selectOption('en');
    await expect(page.getByRole('heading', { name: 'Your own corner' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restock', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a neglected first shift closes cleanly after twelve minutes and shows only numeric loss feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(29000);
  await expect(page.locator('.toast-loss')).toBeVisible();
  await expect(page.locator('.toast-loss')).toHaveAccessibleName(/Trừ \d+ xu và \d+ uy tín/);
  await expect(page.locator('.toast-loss')).toHaveText(/^[−\d\s.,]+$/);
  for (const icon of await page.locator('.toast-loss svg').all()) expect((await icon.boundingBox())!.width).toBeGreaterThan(0);
  await expect(page.locator('.lost-bubble')).toHaveCount(0);
  await expect(page.getByText('Khách chờ lâu quá', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.clock.fastForward(720000);
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ngừng đón khách' })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
  expect(saved.version).toBe(2); expect(saved.log[0].command.type).toBe('startShift');
});

test('tapped order stays live, returns keyboard focus, and closes on customer expiry', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(8100);
  const originalCustomer = await page.locator('.seat-customer').first().getAttribute('data-customer-id');
  expect(originalCustomer).toBeTruthy();
  const trigger = page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first();
  await trigger.click();
  const panel = page.getByRole('dialog', { name: 'Bàn 1', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeDisabled();
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
  await page.clock.runFor(17900);
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.toast-loss')).toHaveText(/^[−\d\s.,]+$/);
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
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  const hint = page.locator('.table-space').first().locator('.table-order-hint');
  const countdown = await hint.locator('.bubble-time').textContent();
  expect(countdown).toMatch(/^Còn [1-3]s$/);
  await hint.click();
  await expect(page.locator('.customer-tag')).toHaveText('Khách vội');
  await expect(page.locator('.order-heading b')).toHaveText(countdown!);
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeDisabled();
});

for (const [mode, emoji] of [['early', '🤩'], ['late', '😐'], ['grace', '😥'], ['stale', '😖']]) {
  test(`multi-dish service shows the actual ${mode} reward and guest reaction`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/service-states.ts', mode], { encoding: 'utf8' }));
    expect(fixture.result).toMatchObject({ ok: true, outcome: mode });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date(fixture.now) });
    await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('service-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('service-seeded', '1'); } }, fixture.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
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
    await page.reload();
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
    await page.clock.install({ time: new Date(fixture.now) });
    await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('rested-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('rested-seeded', '1'); } }, fixture.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    const badge = page.locator('.well-rested');
    await expect(badge).toHaveAccessibleName(/Tỉnh Táo ×1.1/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const before = await badge.locator('time').textContent();
    await page.goto('about:blank'); await page.clock.setSystemTime(new Date(fixture.now + 86400000));
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
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: 'Âm thanh Đang bật' }).click();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.settings.v1')!))).toMatchObject({ muted: true, guideDone: true });
  await expect(page.locator('.guide')).toHaveCount(0);
});


test('hidden and offline time preserves the current order and remaining shift', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
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
  await page.goto('about:blank');
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
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tbh.backup.')).map(k => localStorage.getItem(k)))).toContain('{bad-original');
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
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tbh.backup.')).map(k => localStorage.getItem(k)))).toContain('{bad-reset');
});

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 400 }]) {
  test(`manual close shows its fee, allows cancellation and debits consuming guests once at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
    await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
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
    await page.clock.runFor(1000); expect(await page.locator('.energy strong').textContent()).not.toBe(time);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Đợi khách dùng xong', exact: true }).click();
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins)); await expect(page.locator('.state-consuming')).toHaveCount(1);
    await page.getByRole('button', { name: 'Mời tất cả về · 5 xu', exact: true }).click();
    await page.getByRole('button', { name: 'Trả 5 xu và đóng ca', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Sổ ca hôm nay' })).toBeVisible();
    await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins - 5));
    await expect(page.locator('.ledger > div').filter({ hasText: 'Chi trong ca' }).locator('dd')).toHaveText('5');
    await expect(page.locator('.seat-customer')).toHaveCount(0);
    await expect(page.locator('.toast-loss')).toHaveCount(0);
    await page.reload(); await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(coins - 5));
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
    expect(save.events.filter((e: { type: string }) => e.type === 'guests_dismissed')).toHaveLength(1);
  });
}

test('insufficient close funds keep the guest, and natural expiry closes the confirmation without a second fee', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/manual-close.ts', 'poor'], { encoding: 'utf8' }));
  await page.clock.install({ time: new Date(fixture.now) }); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  await page.getByRole('button', { name: 'Mời tất cả về · 5 xu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Trả 5 xu và đóng ca', exact: true })).toBeDisabled();
  await expect(page.locator('.seat-customer')).toHaveCount(1);
  await expect(page.locator('.money strong')).toHaveText(String(fixture.coins));
  await page.clock.runFor(20000);
  await expect(page.getByRole('dialog', { name: 'Sổ ca hôm nay' })).toBeVisible();
  await expect(page.locator('.money strong')).toHaveText('0');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
  expect(save.events.some((e: { type: string }) => e.type === 'guests_dismissed')).toBe(false);
});

test('a mixed occupied table renders only the remaining Chi Pheo and closes with zero fee', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/manual-close.ts', 'occupied'], { encoding: 'utf8' }));
  await page.clock.install({ time: new Date(fixture.now) }); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await expect(page.locator('.state-occupied .seat-customer')).toHaveCount(1);
  await expect(page.locator('.state-occupied .seat-customer')).toHaveAttribute('data-customer-id', fixture.guests[0]);
  await page.getByRole('button', { name: 'Sổ ca', exact: true }).click();
  await page.getByRole('button', { name: 'Mời tất cả về · 0 xu', exact: true }).click();
  await page.getByRole('button', { name: 'Trả 0 xu và đóng ca', exact: true }).click();
  await expect(page.locator('.seat-customer')).toHaveCount(0);
  await expect(page.locator('.money strong')).toHaveText(new Intl.NumberFormat('vi-VN').format(fixture.coins));
});

for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`rush warning stays live in sheets, active timer wins, and closing ends it at ${viewport.width}px`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/rush.ts'], { encoding: 'utf8' }));
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date(fixture.now) }); await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('rush-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('rush-seeded', '1'); } }, fixture.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
    const hud = page.locator('.rush-label');
    await expect(hud).toContainText('Sắp tới · Giờ Vàng'); await expect(hud.locator('time')).toHaveText('00:21');
    await expect(page.locator('.rush-label.is-warning')).toHaveCount(0);
    await page.clock.runFor(1000);
    await expect(page.locator('.rush-label.is-warning')).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: 'Chuẩn bị đón Giờ Vàng.' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
    await page.clock.runFor(1000); await expect(hud.locator('time')).toHaveText('00:19');
    await page.keyboard.press('Escape');
    await page.clock.runFor(fixture.warningMs - 1000);
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
    await page.keyboard.press('Escape'); await page.reload();
    await expect(hud).toHaveText('Nhịp quán bình thường');
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!));
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_warning')).toHaveLength(1);
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_started')).toHaveLength(1);
    expect(save.events.filter((e: { type: string }) => e.type === 'rush_ended')).toHaveLength(1);
  });
}


test('an overlapping upcoming rush cannot interrupt the active-rush HUD with a screen-reader warning', async ({ page }) => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/rush.ts', 'overlap'], { encoding: 'utf8' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date(fixture.now) }); await page.clock.pauseAt(new Date(fixture.now));
  await page.addInitScript(save => localStorage.setItem('tbh.save.v1', save), fixture.save);
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
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
    await page.setViewportSize(viewport); await page.clock.install({ time: new Date(fixture.now) }); await page.clock.pauseAt(new Date(fixture.now));
    await page.addInitScript(save => { if (!localStorage.getItem('dog-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('dog-seeded', '1'); } }, fixture.save);
    await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
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
    await page.reload(); await expect(page.locator('.money strong')).toHaveText(boughtCoins!);
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
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tbh.save.v1')!).events.filter((e: { type: string }) => ['dog_bought', 'dog_upgraded'].includes(e.type)));
    expect(saved.map((e: { data: { toLevel: number } }) => e.data.toLevel)).toEqual([1, 2, 3]);
  });
}
