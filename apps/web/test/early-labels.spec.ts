import { test, expect } from './tbh-fixture';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Founder 2026-10-22 (IMPROVE-EARLY-GAME Part B2.3, labels and duplicates), through the DOM only; saves from the real engine. The cooler's seconds read
// "Giữ tươi {n} s" (the ∞ of shift 1 included: economy2.spec.ts `JSON 2.1.4 in shift 1 …`), the sink's count "Rửa {busy}/{batch}", the beer line that repeated
// the yard's numbers is kept for screen readers only, and the order card says one trait of the guest type under the type.
const seed = JSON.parse(readFileSync('docs/config/economy.tbh.json', 'utf8')); // the bundled numbers (the JSON is read, not imported: specs load no engine module)
const copyOf = (locale: string) => JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')) as Record<string, string>;
const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
async function boot(page: Page, at: { save: string; now: number }, locale: string) {
  await page.clock.setFixedTime(at.now);
  await page.addInitScript(({ save, locale }) => {
    if (localStorage.getItem('lb-seeded')) return;
    localStorage.setItem('tbh.save.v1', save); localStorage.setItem('lb-seeded', '1');
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, guideDone: true, guideIndex: null, muted: true }));
  }, { save: at.save, locale });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }]) test(`B2.3 the cooler and the sink say what their number is, and the beer line is for screen readers only (${locale}) at ${viewport.width}px`, async ({ page, tbh }) => {
  const copy = copyOf(locale), f = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/yard.ts', 'fresh'], { encoding: 'utf8' }));
  await page.setViewportSize(viewport); await boot(page, f, locale);
  const seconds = fill(copy['cooler.seconds'], { seconds: seed.upgrades.cooler.freshnessMs[0]! / 1000 }); // a resting shop: no shift weather, the cooler's own seconds
  const cooler = page.locator('.equipment-object.cooler .capacity-badge'), sink = page.locator('.equipment-object.washer .capacity-badge');
  await expect(cooler).toHaveText(fill(copy['production.freshness'], { count: seconds })); await expect(cooler).toHaveAccessibleName(fill(copy['production.freshness'], { count: seconds }));
  await expect(sink).toHaveText(fill(copy['production.washShort'], { count: `0/${seed.upgrades.washer.slots[0]}` }));
  for (const badge of [cooler, sink]) { const box = (await badge.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(box.height).toBeLessThan(24); } // one line, on screen
  const line = page.locator('#beer-supply-status');
  await expect(line).toHaveClass(/sr-only/); await expect(line).toHaveText(new RegExp(copy['beer.pipeline'].split('{')[0].trim())); // the words stay for screen readers ...
  expect(await line.evaluate(el => { const s = getComputedStyle(el); return [s.position, s.clip, s.overflow]; })).toEqual(['absolute', 'rect(0px, 0px, 0px, 0px)', 'hidden']); // ... out of the flow and clipped away
  expect(await axe(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tbh.shot(`b2-labels-${locale}-${viewport.width}.png`); expect(tbh.consoleErrors()).toEqual([]);
});

// Linux CI 1a: also with a deliberately wide font (DejaVu Sans, else Verdana, + letter-spacing), the font family Windows runs never see.
for (const type of ['thuong', 'voi', 'vip', 'ngoily', 'chipheo'] as const) for (const locale of ['vi', 'en'] as const) for (const font of ['app', 'wide'] as const) test(`B2.3 the order card says one trait of the guest type under the type (${type}, ${locale}${font === 'wide' ? ', wide font' : ''}) at 390×844`, async ({ page, tbh }) => {
  const copy = copyOf(locale), at = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/serve-feedback.ts', 'trait', type], { encoding: 'utf8' }));
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page, at, locale);
  if (font === 'wide') await page.addStyleTag({ content: '*, *::before, *::after { font-family: "DejaVu Sans", Verdana, sans-serif !important; letter-spacing: .03em !important; }' });
  await page.locator('.table-space.table-0 .table-order-hint').click();
  const card = page.locator('#active-table-order');
  await expect(card.locator('.customer-tag')).toHaveText(copy[`customer.${type}`]);
  await expect(card.locator('.customer-trait')).toHaveText(copy[`customer.trait.${type}`]);
  // Both boxes in one frame (Linux CI, review B2-r1): the card pops in with a scale transform, and two separate boundingBox() calls caught the header and the
  // trait at different scales (the trait read 1.75 px inside the header box). In one frame the trait sits its 1 px margin below the header in any font.
  const [tag, trait] = await card.evaluate(el => [el.querySelector('header')!, el.querySelector('.customer-trait')!].map(x => { const b = x.getBoundingClientRect(); return { y: b.top, height: b.height }; }));
  expect(trait.y).toBeGreaterThanOrEqual(tag.y + tag.height - 1); // under the type
  expect(await axe(page)).toEqual([]);
  await tbh.shot(`b2-trait-${type}-${locale}-${font}.png`); expect(tbh.consoleErrors()).toEqual([]);
});
