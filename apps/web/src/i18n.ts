import vi from './i18n/vi.json';
import en from './i18n/en.json';
export type Locale = 'vi' | 'en';
export type CopyKey = keyof typeof vi;
const locales: Record<Locale, Record<CopyKey, string>> = { vi, en };
export function translate(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const copy = locales[locale][key as CopyKey] ?? locales.vi[key as CopyKey];
  if (!copy) { if (import.meta.env.DEV) console.warn(`Missing copy: ${key}`); return key; }
  return copy.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
