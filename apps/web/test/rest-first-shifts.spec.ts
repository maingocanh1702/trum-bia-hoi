import { test, expect } from './tbh-fixture';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Plan S5 / D8: the first three shifts of a save open without the stamina cooldown; shift 4 asks for the 30 minutes again. The rest line and the energy bar
// say what the engine will do (restRequired), through the DOM only; the saves come from the real engine (fixtures/first-shifts.ts).
const fixture = (closed: number, variant = '') => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/first-shifts.ts', String(closed), variant], { encoding: 'utf8' }));
const clock = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.ceil(ms / 1000 % 60).toString().padStart(2, '0')}`;

for (const locale of ['vi', 'en'] as const) for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`D8 shifts 2 and 3 open at once and shift 4 waits, in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')), open = page.getByRole('button', { name: copy['nav.shift'], exact: true }).first();
    const first = fixture(1);
    expect(first.noCooldownFirstShifts).toBe(3);
    await page.setViewportSize(viewport);
    const seed = async (f: { save: string; now: number }) => {
      await page.clock.pauseAt(f.now);
      await page.addInitScript(({ save, locale }) => {
        if (!sessionStorage.getItem('first-shifts-seeded')) {
          localStorage.setItem('tbh.save.v1', save); sessionStorage.setItem('first-shifts-seeded', '1');
          localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
        }
      }, { save: f.save, locale });
      await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    };
    // One shift closed: the stamina is empty, but the next shift is not a wait.
    await seed(first);
    await expect(page.locator('.energy strong')).toHaveText('100%');
    await expect(page.locator('.rest-summary > span')).toHaveText(copy['rest.ready']);
    await expect(page.locator('.rest-summary')).not.toContainText(/NaN|Infinity/);
    await open.click();
    await expect(page.locator('.energy strong')).toHaveText(/^\d\d:\d\d$/); // the opened shift counts its minutes
    await expect(page.locator('.rest-summary')).toHaveCount(0);
    expect(tbh.consoleErrors()).toEqual([]); await tbh.shot(`d8-open-${locale}-${viewport.width}.png`);
  });

  test(`D8 after the third shift the 30 minutes apply and the opening is refused until they pass, in ${locale} at ${viewport.width}px`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync(`apps/web/src/i18n/${locale}.json`, 'utf8')), open = page.getByRole('button', { name: copy['nav.shift'], exact: true }).first();
    const f = fixture(3);
    await page.setViewportSize(viewport); await page.clock.pauseAt(f.now);
    await page.addInitScript(({ save, locale }) => {
      localStorage.setItem('tbh.save.v1', save);
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save, locale });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('.energy strong')).toHaveText('0%');
    await expect(page.locator('.rest-summary > span')).toHaveText(copy['rest.regen'].replace('{time}', clock(f.recoveryMs)));
    await open.click();
    await expect(page.getByText(copy['error.restFirst'])).toBeVisible(); // refused with its one reason
    await expect(page.locator('.rest-summary')).toBeVisible();
    await page.clock.fastForward(f.recoveryMs);
    await expect(page.locator('.energy strong')).toHaveText('100%');
    await expect(page.locator('.rest-summary > span')).toHaveText(copy['rest.free']);
    await open.click();
    await expect(page.locator('.energy strong')).toHaveText(/^\d\d:\d\d$/);
    expect(tbh.consoleErrors()).toEqual([]); await tbh.shot(`d8-wait-${locale}-${viewport.width}.png`);
  });
}

// Review 07 r1 (W2): across a config adoption the bar and the rest line must say what the opening will do. A save pinned to the last capacity-model seed (JSON
// 2.0.4, the deployed guest content, no allowance in it) with one closed shift opens its next shift with the bundled 2.1.3 (`local.ts` `openingConfig`), whose
// first three shifts need no rest: the screen says the shift is ready, not "rest until mm:ss", and "Mở ca" opens at once.
for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test(`D8 across a config adoption: a save pinned to JSON 2.0.4 after one shift is shown ready and opens at once, at ${viewport.width}px`, async ({ page, tbh }) => {
    const copy = JSON.parse(readFileSync('apps/web/src/i18n/vi.json', 'utf8')), open = page.getByRole('button', { name: copy['nav.shift'], exact: true }).first();
    const f = fixture(1, 'legacy');
    expect(f.version).toBe('2.0.4'); expect(f.noCooldownFirstShifts).toBe(3);
    await page.setViewportSize(viewport); await page.clock.pauseAt(f.now);
    await page.addInitScript(({ save }) => {
      if (sessionStorage.getItem('legacy-seeded')) return;
      localStorage.setItem('tbh.save.v1', save); sessionStorage.setItem('legacy-seeded', '1');
      localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: true }));
    }, { save: f.save });
    await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('.energy strong')).toHaveText('100%');
    await expect(page.locator('.rest-summary > span')).toHaveText(copy['rest.ready']);
    await open.click();
    await expect(page.locator('.energy strong')).toHaveText(/^\d\d:\d\d$/); // the engine opened it: the shift counts its minutes
    await expect(page.getByText(copy['error.restFirst'])).toHaveCount(0);
    await expect(page.locator('.rest-summary')).toHaveCount(0);
    expect(tbh.consoleErrors()).toEqual([]); await tbh.shot(`d8-adoption-${viewport.width}.png`);
  });
}
