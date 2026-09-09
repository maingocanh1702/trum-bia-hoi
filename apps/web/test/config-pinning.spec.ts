import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const decode = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/config-pinning.ts', 'inspect'], { encoding: 'utf8', input: save }));

test('a mixed-config save imports through recovery, preserves its backup and continues the pinned shift after browser reload', async ({ page }) => {
  const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/config-pinning.ts'], { encoding: 'utf8' }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(() => { if (!localStorage.getItem('pin-seeded')) { localStorage.setItem('tbh.save.v1', '{broken'); localStorage.setItem('pin-seeded', '1'); } });
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('Bản lưu chưa đọc được');
  await page.locator('input[type=file]').setInputFiles({ name: 'mixed-save.json', mimeType: 'application/json', buffer: Buffer.from(f.save) });
  await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await expect(page.locator('.recovery')).toHaveCount(0);
  const snapshot = async () => page.evaluate(() => localStorage.getItem('tbh.save.v1')!);
  await page.clock.runFor(1100);
  const before = decode(await snapshot()); expect(before.version).toBe(f.version); expect(before.world.coins).toBe(f.coins);
  expect(before.world.shift!.endsAt - before.world.shift!.startedAt - before.world.shift!.pausedMs).toBe(f.duration);
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('tbh.backup.') && localStorage.getItem(k) === '{broken'))).toBe(true);
  await page.reload(); await page.clock.runFor(1100);
  const after = decode(await snapshot()); expect(after.version).toBe(f.version); expect(after.world.coins).toBe(f.coins);
  expect(after.world.events.filter((e: { type: string }) => e.type === 'config_pinned')).toHaveLength(1);
  expect(after.world.events.filter((e: { type: string }) => e.type === 'customer_served')).toEqual(before.world.events.filter((e: { type: string }) => e.type === 'customer_served'));
  expect(JSON.parse(await snapshot()).configs).toHaveLength(1); expect(errors).toEqual([]);
});
