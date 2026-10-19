import type { Page } from '@playwright/test';

/**
 * The language screen is gone (FEEDBACK I.1): a clean profile opens in Vietnamese whatever the browser says, and an English run starts
 * from a saved English choice, like a returning player. Call before `page.goto`.
 */
export async function seedLocale(page: Page, locale: string) {
  if (locale === 'vi') return;
  await page.addInitScript(locale => { if (!localStorage.getItem('tbh.settings.v1')) localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale })); }, locale);
}
