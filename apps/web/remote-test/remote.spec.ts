import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8'));
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tbh.remote.v1')!));
const snapshot = async (page: Page) => (await page.request.get('/api/player/state')).json();
async function enter(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
}
async function openShift(page: Page) {
  await enter(page);
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const trigger = page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first();
  await expect(trigger).toBeVisible({ timeout: 20000 });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toBeEnabled({ timeout: 20000 });
}

test('real server serves once after lost acknowledgement, retains queue across reload, menus pause and reports resync', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openShift(page);
  const before = await snapshot(page), beforeCoins = await page.locator('.money strong').textContent();
  let cut = false, lost = false;
  await page.route('**/api/**', async route => {
    if (cut) { await route.abort(); return; }
    const data = route.request().postDataJSON();
    if (!lost && route.request().url().endsWith('/player/command') && data?.command.type === 'serve') {
      await route.fetch(); lost = true; cut = true; await route.abort(); return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect.poll(() => lost).toBe(true);
  await expect(page.locator('.network-status')).toContainText('Đang kết nối lại');
  expect(await page.locator('.money strong').textContent()).toBe(beforeCoins);
  const pending = await journal(page); expect(pending.pending).toHaveLength(1);
  const after = await snapshot(page); expect(after.world.coins).toBeGreaterThan(before.world.coins);
  await page.reload(); await expect(page.getByRole('alert')).toContainText('Chưa kết nối');
  expect((await journal(page)).pending).toEqual(pending.pending);
  cut = false; await page.reload();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  expect((await snapshot(page)).world.coins).toBe(after.world.coins);
  await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  const paused = await snapshot(page);
  const stock = page.locator('.stock-row').first();
  await stock.getByRole('button').first().click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Nhập hàng', exact: true })).toBeVisible();
  expect((await snapshot(page)).world.paused).toBe(true);
  await page.waitForTimeout(1200);
  const later = await snapshot(page);
  expect(later.world.staminaMs).toBe(paused.world.staminaMs);
  expect(later.world.shift.pausedMs).toBeGreaterThan(paused.world.shift.pausedMs);
  expect(later.menu.rows.find((r: { dish: string }) => r.dish === 'bia').sold).toBe(1);
  expect(later.world.rng).toBeUndefined(); expect(later.world.events).toBeUndefined();
  expect(errors).toEqual([]);
  await page.screenshot({ path: '.qa/m4-remote-mobile.png', fullPage: true });
});

test('offline restock and in-shift upgrade use durable ordered commands and current menu presence on return', async ({ page }) => {
  await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  let cut = true;
  await page.route('**/api/**', route => cut ? route.abort() : route.continue());
  await expect(page.locator('.network-status')).toContainText('Đang kết nối lại');
  // Purchases are evaluated only on the server; offline UI cannot alter stock or balance.
  const before = await snapshot(page);
  const available = page.locator('.stock-row').first().getByRole('button').first();
  await expect(available).toBeEnabled(); await available.click();
  const queue = await journal(page);
  expect(queue.pending).toHaveLength(1);
  expect((await snapshot(page)).world.coins).toBe(before.world.coins);
  cut = false; await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  const after = await snapshot(page); expect(after.world.paused).toBe(true);
  expect(after.world.coins).toBeLessThan(before.world.coins);
  await page.getByRole('button', { name: 'Nhập hàng ×', exact: true }).click();
  await page.getByRole('button', { name: 'Bom bia', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Bom bia', exact: true });
  await expect(panel).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  cut = true;
  await panel.getByRole('button', { name: /Nâng ·/ }).click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(1);
  expect((await snapshot(page)).world.equipment.keg).toBe(1);
  cut = false; await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect.poll(async () => (await snapshot(page)).world.equipment.keg).toBe(2);
  const upgraded = await snapshot(page);
  expect(upgraded.world.paused).toBe(true); expect(upgraded.world.phase).toBe('open');
  expect(upgraded.configVersion).toBe('remote-browser-fixture');
  await expect(panel).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await snapshot(page)).world.active).toBe(false);
  expect((await snapshot(page)).world.paused).toBe(true);
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await snapshot(page)).world.active).toBe(true);
  expect((await snapshot(page)).world.paused).toBe(true);
});

test('server closes beyond grace while the visible client yard stays frozen', async ({ page }) => {
  await openShift(page);
  await page.route('**/api/**', route => route.abort());
  await expect(page.locator('.network-status')).toContainText('Đang kết nối lại');
  const coins = await page.locator('.money strong').textContent();
  await page.request.post(`/api/__test/advance?ms=${config.network.reconnectGraceMs + config.network.reconnectingUiDelayMs + config.shift.durationMs}`);
  expect(await page.locator('.money strong').textContent()).toBe(coins);
  await expect(page.locator('.yard')).toBeVisible();
  await page.unroute('**/api/**'); await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect.poll(async () => (await snapshot(page)).world.phase, { timeout: 15000 }).toBe('resting');
  await expect(page.getByRole('heading', { name: 'Sổ ca hôm nay' })).toBeVisible({ timeout: 15000 });
});

test('existing local archive is untouched and a second tab cannot overwrite the remote action stream', async ({ page, context }) => {
  const original = '{"an-existing-local-archive":"kept byte for byte"}';
  await page.addInitScript(text => { if (!localStorage.getItem('tbh.save.v1')) localStorage.setItem('tbh.save.v1', text); }, original);
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tiến độ đã lưu trên máy' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tbh.remote.v1'))).toBeNull();
  await page.getByRole('button', { name: 'Mở quán mới trên server' }).click();
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  const before = await journal(page);
  const other = await context.newPage(); await other.goto('/');
  await expect(other.getByRole('alert')).toContainText('tab khác');
  expect((await journal(page)).clientId).toBe(before.clientId);
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe(original);
  await page.close(); await other.reload();
  await other.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(other.locator('.network-status')).toContainText('Đã đồng bộ');
});

test('journal storage failure refuses the action before any network mutation', async ({ page }) => {
  await enter(page); await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  let commands = 0; page.on('request', req => { if (req.url().endsWith('/player/command')) commands++; });
  const before = await snapshot(page);
  await page.evaluate(() => {
    const put = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === 'tbh.remote.v1') throw new DOMException('full', 'QuotaExceededError'); put.call(this, key, value); };
  });
  await page.locator('.stock-row').nth(1).getByRole('button').first().click();
  await expect(page.locator('.network-status')).toContainText('Không lưu được');
  expect(commands).toBe(0); expect((await journal(page)).pending).toHaveLength(0);
  expect((await snapshot(page)).world.coins).toBe(before.world.coins);
});

test('config bounds the durable queue and account rotation cannot send its commands to another player', async ({ page }) => {
  await enter(page); await page.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  let cut = true;
  await page.route('**/api/player/**', route => cut ? route.abort() : route.continue());
  await expect(page.locator('.network-status')).toContainText('Đang kết nối lại');
  await page.locator('.stock-row').nth(1).getByRole('button').first().evaluate((button, max) => {
    for (let i = 0; i <= max; i++) (button as HTMLButtonElement).click();
  }, config.network.commandBufferMax);
  const saved = await journal(page); expect(saved.pending).toHaveLength(config.network.commandBufferMax);
  expect(new Set(saved.pending.map((a: { idempotencyKey: string }) => a.idempotencyKey)).size).toBe(config.network.commandBufferMax);
  expect(saved.pending.every((a: { clientSeq: number }, i: number) => a.clientSeq === i + 1)).toBe(true);
  await expect(page.locator('.toast')).toContainText('Hàng đợi đã đầy');
  const newOwner = await page.evaluate(async () => {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
    await fetch('/api/auth/logout', opts); return (await fetch('/api/auth/session', opts)).json();
  });
  expect(newOwner.playerId).not.toBe(saved.playerId);
  cut = false; await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect(page.locator('.network-status')).toContainText('Trạng thái tài khoản không khớp');
  expect((await journal(page)).pending).toEqual(saved.pending);
  const untouched = await snapshot(page); expect(untouched.world.completedShifts).toBe(0);
  await page.reload(); await expect(page.getByRole('alert')).toContainText('Trạng thái tài khoản không khớp');
  expect((await journal(page)).pending).toEqual(saved.pending);
});

test('a silent hung transport shows reconnecting at the configured deadline without hiding the yard', async ({ page }) => {
  await enter(page);
  // Wait for a real heartbeat so the configured expiry has a measured start.
  await page.waitForResponse(r => r.url().endsWith('/player/heartbeat') && r.ok());
  const start = await page.evaluate(() => performance.now());
  await page.route('**/api/**', () => {});
  await expect(page.locator('.network-status')).toContainText('Đang kết nối lại', { timeout: config.network.reconnectingUiDelayMs + 250 });
  const elapsed = await page.evaluate(() => performance.now()) - start;
  // config-exempt: browser assertion scheduling tolerance, not an additional product delay.
  expect(elapsed).toBeLessThan(config.network.reconnectingUiDelayMs + 250);
  await expect(page.locator('.yard')).toBeVisible();
  await page.screenshot({ path: '.qa/m4-remote-offline-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/m4-remote-offline-desktop.png' });
});


test('a fresh guest visit keeps the yard accessible before heartbeat recovery', async ({ page, context }) => {
  await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
  await page.close();
  const back = await context.newPage();
  await back.request.post(`/api/__test/advance?ms=${config.network.reconnectingUiDelayMs + 1}`);
  await back.route('**/api/player/heartbeat', route => route.abort());
  await back.goto('/');
  await back.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(back.locator('.network-status')).toContainText('Đang kết nối lại');
  await expect(back.locator('.paused-overlay')).toHaveCount(0);
  await expect(back.locator('.yard')).toBeVisible();
  await expect(back.getByRole('button', { name: 'Nhập hàng', exact: true })).toBeEnabled();
  await back.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect(back.getByRole('dialog', { name: 'Nhập hàng', exact: true })).toBeVisible();
  await back.unroute('**/api/player/heartbeat'); await back.evaluate(() => dispatchEvent(new Event('online')));
  await expect.poll(async () => (await snapshot(back)).world.active).toBe(true);
  expect((await snapshot(back)).world.paused).toBe(true);
});

for (const damage of ['missing chunk', 'invalid revision']) test(`normal startup preserves ${damage} forensic recovery before any server career is created`, async ({ page }) => {
  await page.route('**/prepare-local', route => route.fulfill({ contentType: 'text/html', body: '<html lang="vi"><body></body></html>' }));
  await page.goto('/prepare-local');
  const legacy = await page.evaluate(async damage => {
    const path = '/test/fixtures/browser-save.ts';
    const { BrowserSave, Game, encodeSave } = await import(path) as typeof import('../test/fixtures/browser-save');
    const storage = await BrowserSave.open(); await storage.read();
    const game = new Game(undefined, 42);
    game.command({ at: game.world.now, idempotencyKey: 'recover-original-shift', command: { type: 'startShift' } });
    await storage.save(game); storage.close();
    const legacy = encodeSave(new Game(undefined, 99)); localStorage.setItem('tbh.save.v1', legacy);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('tbh.career.v1'); request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(['head', 'events'], 'readwrite');
        if (damage === 'missing chunk') tx.objectStore('events').delete(0);
        else { const row = tx.objectStore('head').get('current'); row.onsuccess = () => tx.objectStore('head').put({ ...row.result, revision: -3 }, 'current'); }
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
    return legacy;
  }, damage);
  let newSession = false; page.on('request', r => { if (r.url().endsWith('/api/auth/session')) newSession = true; });
  await page.goto('/'); await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Bản lưu chưa đọc được');
  await expect(page.getByRole('button', { name: 'Tải bản lưu gốc', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải bản lưu localStorage cũ', exact: true })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(legacy) });
  await expect(page.getByRole('heading', { name: 'Tiến độ đã lưu trên máy' })).toBeVisible();
  const { readBackups, readSave } = await import('../test/storage');
  const backups = (await readBackups(page)).map(text => JSON.parse(text));
  expect(backups).toHaveLength(1); expect(backups[0].format).toBe('tbh.indexeddb-backup.v1');
  expect(backups[0].commands[0][0].idempotencyKey).toBe('recover-original-shift');
  if (damage === 'missing chunk') expect(backups[0].eventKeys).toEqual([]);
  else expect(backups[0].head.revision).toBe(-3);
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe(legacy);
  expect(await page.evaluate(() => localStorage.getItem('tbh.remote.v1'))).toBeNull();
  expect(newSession).toBe(false);
  await page.getByRole('button', { name: 'Tiếp tục quán đã lưu' }).click();
  await expect(page.locator('.game-shell')).toBeVisible();
  expect(JSON.parse(await readSave(page)).seed).toBe(99);
});
