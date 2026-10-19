import type { Locale } from './i18n';

export const SETTINGS_KEY = 'tbh.settings.v1';

/** Owner 2026-09-17 (FEEDBACK I.1): the game opens in Vietnamese whatever the browser says; only an explicit saved English choice changes that. */
export const localeOf = (value: unknown): Locale => value === 'en' ? 'en' : 'vi';

/** The saved language, read without the engine so the loading screen can use it before the app chunk arrives. */
export function savedLocale(): Locale {
  try { return localeOf(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').locale); } catch { return 'vi'; }
}
