import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
for (const locale of ['vi', 'en']) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) {
  test(`M1-I18N/AXE local guest ${locale} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(180000); page.setDefaultTimeout(10000); await page.setViewportSize(viewport);
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')), t = (key: string) => copy[key];
    const errors: string[] = [], external: string[] = [], reports: unknown[] = [], failures: unknown[] = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('Missing copy:')) errors.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
    const audit = async (screen: string) => {
      await page.evaluate(() => Promise.all((document.querySelector('dialog[open], .order-panel') ?? document.body).getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))));
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      const unresolved = await page.locator('body').innerText(); expect(unresolved).not.toMatch(/\{[a-zA-Z]+\}/);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const violations = result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      reports.push({ screen, passes: result.passes.length, violations }); if (violations.length) failures.push({ screen, violations });
      writeFileSync(`.qa/axe-${locale}-${viewport.width}.json`, JSON.stringify(reports, null, 2));
    };
    const click = (key: string) => page.getByRole('button', { name: t(key), exact: true }).first().click();
    const close = () => page.locator('dialog[open] .sheet-header button').click();
    await page.goto('/'); await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).check();
    await audit('language'); await click('continue'); await expect(page.getByRole('button', { name: t('account.playGuest'), exact: true })).toBeVisible(); await audit('guest-choice'); await click('account.playGuest');
    await expect(page.locator('.game-shell')).toBeVisible(); await audit('rest');
    await click('nav.shift'); await expect(page.locator('.table-order-hint').first()).toBeVisible({ timeout: 20000 });
    await audit('yard'); await page.locator('.table-order-hint').first().click(); await audit('order');
    await click('order.serve');
    for (const [key, screen] of [['nav.stock', 'stock'], ['nav.upgrades', 'upgrades'], ['equipment.kitchen', 'kitchen'], ['equipment.cooler', 'cooler'], ['nav.book', 'book'], ['nav.settings', 'settings']]) {
      if (screen === 'kitchen') { await click('nav.upgrades'); await page.locator('.kitchen-entry').click(); } else await click(key);
      await expect(page.locator('dialog[open]')).toBeVisible(); await audit(screen); await close();
    }
    await click('nav.settings'); await page.getByRole('button', { name: new RegExp(t('account.title')) }).click();
    await expect(page.locator('.dev-identity')).toBeVisible(); await audit('account'); await close();
    await click('nav.book'); await page.getByRole('button', { name: new RegExp(t('book.kick').split('{')[0]) }).click(); await audit('close');
    await page.locator('.close-confirm .primary').click(); await expect(page.locator('.rest-summary')).toBeVisible(); await close();
    await click('quests.title'); await audit('quests');
    const gift = page.locator('[data-quest="gift_3"]');
    if (await gift.count()) { await expect(gift).toContainText(t('quests.giftUnavailable')); await expect(gift.getByRole('button')).toBeDisabled(); }
    await expect(page.getByRole('button', { name: /^(Gửi quà|Send gift|Mời bạn|Invite friends)$/ })).toHaveCount(0); await close();
    await click('nav.journey'); await audit('journey'); await click('nav.seasons');
    await expect(page.locator('.leaderboard')).toHaveAttribute('aria-busy', 'false'); await audit('ranking'); await close();
    await click('nav.upgrades'); await page.getByRole('button', { name: new RegExp('^' + t('nav.locations')) }).click(); await audit('locations'); await close();
    expect(errors).toEqual([]); expect(external).toEqual([]); expect(failures).toEqual([]);
  });
}
