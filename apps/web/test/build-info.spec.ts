import { test, expect } from './tbh-fixture';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
for (const locale of ['vi', 'en']) for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`A6 settings shows the build commit in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8'));
    await page.setViewportSize(viewport);
    await page.addInitScript(locale => localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true })), locale);
    await page.goto('/');
    await page.getByRole('button', { name: copy['nav.settings'], exact: true }).click();
    const build = page.locator('.build-version');
    await expect(build).toContainText(copy['settings.build']);
    await expect(build.locator('code')).toHaveText(commit.slice(0, 12));
    await expect(build.locator('code')).toHaveAttribute('title', commit);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(tbh.consoleErrors()).toEqual([]);
    await tbh.shot(`a6-build-${locale}-${viewport.width}.png`);
    await page.keyboard.press('Escape');
    await expect(page.locator('.build-version')).toHaveCount(0);
  });
}
