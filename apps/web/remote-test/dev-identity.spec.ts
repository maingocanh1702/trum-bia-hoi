import { test, expect, type Page } from '@playwright/test';
const snapshot = async (page: Page) => (await page.request.get('/api/player/state')).json();
async function enter(page: Page) {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Tiếng Việt', exact: true }).check();
  await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true }).click();
  await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
}
async function account(page: Page) {
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('button', { name: /Tài khoản/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Tài khoản', exact: true });
  await dialog.getByRole('textbox', { name: 'Tên tài khoản thử nghiệm' }).fill('browser-alice');
  return dialog;
}
// Run only with playwright.dev-identity.config.ts: no mocked Google SDK or credential endpoint.
test('explicit dev provider links a live shift once and restores it in a fresh browser context without loading Google', async ({ page, browser }) => {
  const errors: string[] = [], google: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.url().startsWith('https://accounts.google.com/')) google.push(r.url()); });
  await enter(page); await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).world.phase).toBe('open');
  const dialog = await account(page);
  await expect(dialog).toContainText('Không phải đăng nhập Google thật');
  await expect.poll(async () => (await snapshot(page)).world.paused).toBe(true);
  const before = (await snapshot(page)).world;
  await page.screenshot({ path: '.qa/dev-identity-390.png' });
  await dialog.getByRole('button', { name: 'Đăng nhập thử nghiệm', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Tài khoản Google', exact: true })).toBeVisible();
  const after = (await snapshot(page)).world;
  expect(after.playerId).toBe(before.playerId); expect(after.shift.id).toBe(before.shift.id); expect(after.coins).toBe(before.coins);
  await page.reload(); await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
  expect((await snapshot(page)).world.shift.id).toBe(before.shift.id);
  await page.close();
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4179', locale: 'vi-VN', viewport: { width: 360, height: 740 } });
  try {
    const restored = await context.newPage(); restored.on('pageerror', e => errors.push(e.message));
    await enter(restored); const panel = await account(restored);
    await panel.getByRole('button', { name: 'Đăng nhập thử nghiệm', exact: true }).click();
    await expect.poll(async () => (await snapshot(restored)).world?.playerId).toBe(before.playerId);
    expect((await (await restored.request.post('/api/auth/session', { data: {}, headers: { Origin: 'http://127.0.0.1:4179' } })).json()).provider).toBe('google');
    const world = (await snapshot(restored)).world;
    expect(world.playerId).toBe(before.playerId); expect(world.shift.id).toBe(before.shift.id); expect(world.coins).toBe(before.coins);
    expect(errors).toEqual([]); expect(google).toEqual([]);
  } finally { await context.close(); }
});
