import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { waitSaved } from './storage';
for (const locale of ['vi', 'en']) for (const mode of ['stale', 'crowded', 'fresh', 'next']) {
  test(`M1-UPGRADE ${locale} uses this shift's observed ${mode} bottleneck`, async ({ page }) => {
    const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/upgrade-hint.ts', mode], { encoding: 'utf8' }));
    await page.setViewportSize({ width: 390, height: 844 }); await page.clock.pauseAt(fixture.now);
    await page.addInitScript(({ save, locale }) => {
      if (!localStorage.getItem('hint-seeded')) { localStorage.setItem('tbh.save.v1', save); localStorage.setItem('hint-seeded', '1'); }
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: fixture.save, locale });
    await page.goto('/');
    const welcome = page.getByRole('button', { name: locale === 'vi' ? 'Vào quán' : 'Enter the yard', exact: true });
    if (await welcome.isVisible()) await welcome.click();
    await expect(page.locator('.game-shell')).toBeVisible();
    const book = page.getByRole('button', { name: locale === 'vi' ? 'Sổ ca' : 'Shift book', exact: true }).first();
    await book.click();
    const hint = page.locator('.upgrade-hint');
    if (mode === 'fresh' || mode === 'next') { expect(fixture.stale).toBe(0); expect(fixture.rejected).toBe(0); await expect(hint).toHaveCount(0); return; }
    const kind = mode === 'stale' ? 'cooler' : 'tables', count = mode === 'stale' ? fixture.stale : fixture.rejected;
    expect(count).toBeGreaterThan(0); await expect(hint).toHaveAttribute('data-kind', kind); await expect(hint.locator('p')).toContainText(String(count));
    await waitSaved(page); await page.reload(); await book.click();
    await expect(hint).toHaveAttribute('data-kind', kind); await expect(hint.locator('p')).toContainText(String(count));
    await hint.getByRole('button').click();
    if (kind === 'cooler') await expect(page.getByRole('dialog', { name: locale === 'vi' ? 'Hầm lạnh' : 'Cooler', exact: true })).toBeVisible();
    else {
      const heading = page.locator('#upgrade-tables');
      await expect(heading).toBeInViewport(); await expect(heading).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#upgrade-tables ~ .upgrade-grid button:enabled, #upgrade-tables ~ button:enabled').first()).toBeFocused();
      // Repeat from within Upgrades, where no sheet transition runs the effect.
      await hint.getByRole('button').focus(); await page.keyboard.press('Enter');
      await expect(heading).toBeFocused(); await page.keyboard.press('Tab');
      await expect(page.locator('#upgrade-tables ~ .upgrade-grid button:enabled, #upgrade-tables ~ button:enabled').first()).toBeFocused();
    }
    await page.screenshot({ path: `.qa/m1-upgrade-${locale}-${mode}.png` });
  });
}

test('M1-UPGRADE never recommends maxed equipment or invents legacy shift history', () => {
  const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/upgrade-hint.ts', 'stale'], { encoding: 'utf8' }));
  const rows = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    import { createElement } from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
    import { decodeSave } from './packages/engine/src/index.ts'; import { UpgradeHint } from './apps/web/src/UpgradeHint.tsx';
    const game = decodeSave(readFileSync(0, 'utf8')), world = structuredClone(game.world);
    const render = () => renderToStaticMarkup(createElement(UpgradeHint, { world, config: game.config, t: key => key, open: () => {} }));
    const rows = [render()]; world.equipment.cooler = game.config.values.upgrades.cooler.freshnessMs.length; rows.push(render());
    world.equipment.cooler = 1; delete world.shift.menu; rows.push(render()); console.log(JSON.stringify(rows));
  `], { input: fixture.save, encoding: 'utf8' }));
  expect(rows[0]).toContain('data-kind="cooler"'); expect(rows.slice(1)).toEqual(['', '']);
});
