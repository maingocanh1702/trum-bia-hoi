import { test, expect } from './tbh-fixture';
import type { Snapshot } from '../../../packages/engine/src';

// Golden path selectors are copied from the existing guest-serve flow, not guessed:
// game.spec.ts:21 clock.install, :22 goto('/'), :23/:25 "Vào quán", :26 "Mở ca",
// :27 clock.runFor(11100), :28 "Xem mâm · bàn 1", :29/:42 "Phục vụ cả mâm".
test('serving a whole table increases economy.coins by exactly that serve\'s coin_gain amount', async ({ page, tbh }) => {
  await page.clock.install({ time: new Date('2026-09-08T10:00:00Z') });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Vào quán', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await page.getByRole('button', { name: 'Vào quán', exact: true }).click();
  await page.getByRole('button', { name: 'Mở ca', exact: true }).first().click();
  await page.clock.runFor(11100);
  await page.getByRole('button', { name: 'Xem mâm · bàn 1', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true })).toHaveCount(1);

  const before = (await tbh.snapshot()) as Snapshot;

  await page.getByRole('button', { name: 'Phục vụ cả mâm', exact: true }).click();
  await expect(page.locator('.toast-gain')).toHaveAccessibleName(/có boa/);

  const served = await tbh.waitForEvent('coin_gain', { since: before.now });
  expect(served).toBeTruthy();
  const amount = served!.data.amount as number;
  expect(amount).toBeGreaterThan(0);

  const after = (await tbh.snapshot()) as Snapshot;
  expect(after.economy.coins).toBe(before.economy.coins + amount);

  expect(tbh.consoleErrors()).toEqual([]);
  await tbh.shot('serve-whole-table.png');
});
