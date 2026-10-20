import { readSave, waitSaved, readBackups } from './storage';
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const decode = (save: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/config-pinning.ts', 'inspect'], { encoding: 'utf8', input: save }));

test('a mixed-config save imports through recovery, preserves its backup and continues the pinned shift after browser reload', async ({ page }) => {
  const f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/config-pinning.ts'], { encoding: 'utf8' }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(f.now));
  await page.addInitScript(() => { if (!localStorage.getItem('pin-seeded')) { localStorage.setItem('tbh.save.v1', '{broken'); localStorage.setItem('pin-seeded', '1'); } });
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('Bản lưu chưa đọc được');
  await page.locator('input[type=file]').setInputFiles({ name: 'mixed-save.json', mimeType: 'application/json', buffer: Buffer.from(f.save) });
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.locator('.recovery')).toHaveCount(0);
  const snapshot = async () => readSave(page);
  await page.clock.runFor(1100);
  const before = decode(await snapshot()); expect(before.version).toBe(f.version); expect(before.world.coins).toBe(f.coins);
  expect(before.world.shift!.endsAt - before.world.shift!.startedAt - before.world.shift!.pausedMs).toBe(f.duration);
  expect((await readBackups(page)).includes('{broken')).toBe(true);
  await waitSaved(page); await page.reload(); await waitSaved(page); await page.clock.runFor(1100);
  const after = decode(await snapshot()); expect(after.version).toBe(f.version); expect(after.world.coins).toBe(f.coins);
  expect(after.world.events.filter((e: { type: string }) => e.type === 'config_pinned')).toHaveLength(1);
  expect(after.world.events.filter((e: { type: string }) => e.type === 'customer_served')).toEqual(before.world.events.filter((e: { type: string }) => e.type === 'customer_served'));
  expect(JSON.parse(await snapshot()).configs).toHaveLength(1); expect(errors).toEqual([]);
});

// S3 (JSON 2.0.22): the browser edition adopts a newer bundled release when a new shift opens. A browser save recorded by the S2 build (JSON 2.0.21, rules 28,
// recorded by the real engine of tip 1cfde17) must still open without the recovery screen, and its next opening must pin the bundled seed once.
test('a browser save pinned to JSON 2.0.21 opens without recovery, then adopts the bundled seed once when its next shift opens', async ({ page }) => {
  const fixture = JSON.parse(readFileSync('packages/engine/test/fixtures/seat-2.0.21-v28.json', 'utf8')) as { save: string }, saved = JSON.parse(fixture.save);
  const bundled = (JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8')) as { _meta: { version: string } })._meta.version; // the seed this build ships
  expect(saved.config._meta.version).toBe('2.0.21'); expect(saved.configs).toBeUndefined(); expect(bundled).not.toBe('2.0.21');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.pauseAt(new Date(saved.now));
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('pin-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('tbh.settings.v1', JSON.stringify(prefs)); localStorage.setItem('pin-seeded', '1');
  }, { save: fixture.save, prefs: { locale: 'vi', guideDone: true, guideIndex: null, muted: true } });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible(); await expect(page.locator('.recovery')).toHaveCount(0);
  const before = JSON.parse(await readSave(page));
  expect(before.config._meta.version).toBe('2.0.21'); expect(before.configs).toBeUndefined(); // still its own numbers: nothing is adopted while the shop is closed
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await expect(page.locator('.money')).toBeVisible();
  await page.clock.runFor(1100);
  const after = JSON.parse(await readSave(page));
  expect(after.configs).toHaveLength(1); expect(after.configs[0]._meta.version).toBe(bundled);
  const pins = after.events.filter((e: { type: string }) => e.type === 'config_pinned');
  expect(pins).toHaveLength(1); expect(pins[0].data).toMatchObject({ previousVersion: '2.0.21', configVersion: bundled });
  expect(after.events.filter((e: { type: string }) => e.type === 'seat_model_adopted')).toHaveLength(0); // a seat pin never re-derives its seats
  expect(after.log.slice(0, saved.log.length)).toEqual(saved.log); // the recorded history is kept as it was
  expect(errors).toEqual([]);
});
