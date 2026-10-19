import { execFileSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';

/**
 * Boot a brand-new guest whose HUD is fully revealed from shift 1, with the language already accepted: the starting point of every
 * spec that is not about onboarding. Onboarding's own first-shift experience is proven in first-shift-visual.spec.ts.
 * Call before `page.clock.install`/`pauseAt` only if the spec controls the clock; the save carries the game time `now`.
 */
export function freshGame(time = '2026-09-08T10:00:00Z', seed = 42): { save: string; now: number } {
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/fresh-game.ts', time, String(seed)], { encoding: 'utf8' }));
}
export async function bootFresh(page: Page, prefs: Record<string, unknown> = {}, time?: string, seed?: number) {
  const f = freshGame(time, seed);
  await page.addInitScript(({ save, prefs }) => {
    if (localStorage.getItem('fresh-seeded')) return;
    localStorage.setItem('fresh-seeded', '1'); localStorage.setItem('tbh.save.v1', save);
    localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale: 'vi', localeAccepted: true, welcomed: true, guideDone: true, guideIndex: null, muted: false, ...prefs }));
  }, { save: f.save, prefs });
  await page.goto('/'); await expect(page.locator('.game-shell')).toBeVisible();
  return f;
}
