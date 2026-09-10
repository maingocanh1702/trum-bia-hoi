import { config, isEconomy2, Game, decodeSave, type Command, type DomainEvent, type Result, type WorldView, type Config } from '../../../packages/engine/src';
import type { Locale } from './i18n';
import { BrowserSave } from './browser-save';

const SAVE_KEY = 'tbh.save.v1', SETTINGS_KEY = 'tbh.settings.v1';
export interface Settings { locale: Locale; localeAccepted: boolean; muted: boolean; welcomed: boolean; guideDone: boolean; guideIndex: number | null; guideRuns: number; guideDay: string; lostStreak: number; loginPromptPlayer: string; loginPromptShift: number }
export function readSettings(): Settings {
  const fallback: Settings = { locale: typeof navigator !== 'undefined' && navigator.language.toLowerCase().split('-')[0] === 'en' ? 'en' : 'vi', localeAccepted: false, muted: false, welcomed: false, guideDone: false, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0, loginPromptPlayer: '', loginPromptShift: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    const validLocale = data.locale === 'vi' || data.locale === 'en';
    // Old welcomed saves predate explicit acceptance; their omitted locale always meant Vietnamese.
    const legacyAccepted = data.localeAccepted === undefined && data.welcomed === true && (validLocale || data.locale === undefined);
    return { ...fallback, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in fallback && typeof v === typeof fallback[k as keyof Settings])),
      locale: validLocale ? data.locale : legacyAccepted ? 'vi' : fallback.locale,
      localeAccepted: data.localeAccepted === true && validLocale || legacyAccepted,
      guideIndex: Number.isInteger(data.guideIndex) && data.guideIndex >= 0 ? data.guideIndex : null,
      loginPromptShift: Number.isSafeInteger(data.loginPromptShift) && data.loginPromptShift >= 0 ? data.loginPromptShift : 0 };
  } catch { return fallback; }
}
export function writeSettings(settings: Settings): void { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
export interface BootSession { game: Game; storage: BrowserSave | null; original: string | null; legacy?: string | null; error: 'corrupt' | 'storage' | 'conflict' | null }
export async function boot(): Promise<BootSession> {
  let original: string | null = null, storage: BrowserSave | null = null, failure: BootSession['error'] = 'storage';
  try {
    storage = await BrowserSave.open(); original = await storage.read();
    if (original === null) {
      original = localStorage.getItem(SAVE_KEY);
      if (original !== null) storage.migrateLegacy(original);
    }
    failure = 'corrupt';
    const game = original !== null ? decodeSave(original) : new Game(undefined, crypto.getRandomValues(new Uint32Array(1))[0], Date.now(), `guest-${crypto.randomUUID()}`);
    failure = 'storage';
    // Offline time pauses gameplay and never grants active-rest recovery.
    game.command({ idempotencyKey: crypto.randomUUID(), at: game.world.now, command: { type: 'activity', active: false } });
    game.advance(Math.max(Date.now(), game.world.now));
    game.command({ idempotencyKey: crypto.randomUUID(), at: game.world.now, command: { type: 'activity', active: !document.hidden } });
    await storage.save(game);
    // Keep the legacy localStorage item and its transactional backup; never erase the recovery source.
    return { game, storage, original: null, error: null };
  } catch (error) {
    let legacy: string | null = null;
    if (failure === 'corrupt') storage?.markCorrupt();
    if (storage?.recoveryText != null) {
      failure = 'corrupt'; original = storage.recoveryText;
      try { legacy = localStorage.getItem(SAVE_KEY); } catch { /* IndexedDB recovery is still available. */ }
    }
    return { game: new Game(), storage, original, legacy, error: error instanceof Error && error.message === 'storage:conflict' ? 'conflict' : failure };
  }
}
/** Validate before the atomic backup/replacement. A failed transaction retains the old archive. */
export async function replaceSave(text: string | null, session: BootSession): Promise<void> {
  if (!session.storage || session.error !== 'corrupt') throw Error('storage:unavailable');
  const game = text === null ? new Game(undefined, crypto.getRandomValues(new Uint32Array(1))[0], Date.now(), `guest-${crypto.randomUUID()}`) : decodeSave(text);
  await session.storage.replace(game, session.original);
}
export function dispatch(game: Game, command: Command): Result {
  return game.command({ idempotencyKey: crypto.randomUUID(), at: Math.max(Date.now(), game.world.now), command }, command.type === 'startShift' && !isEconomy2(game.config.raw) ? config : undefined);
}
export function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // config-exempt: browser download lifetime
}
export function advanceGuide(settings: Settings, game: { world: WorldView; config: Config }, events: DomainEvent[], uiEvent?: string): void {
  const c = game.config.values.onboarding;
  if (!c.enabled) return;
  for (const e of [...events, ...(uiEvent ? [{ type: uiEvent, data: {}, at: game.world.now }] : [])]) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: game.config.values.shift.dayRollover.tz }).format(e.at);
    if (settings.guideDay !== day) { settings.guideDay = day; settings.guideRuns = 0; }
    if (e.type === 'shift_opened') {
      settings.lostStreak = 0;
      if (!settings.guideDone && c.stepGuide.onFirstPlay) settings.guideIndex = 0;
    }
    if (e.type === 'customer_served') settings.lostStreak = 0;
    if (e.type === 'customer_left') {
      settings.lostStreak += Number(('count' in e.data ? e.data.count : 1) ?? 1);
      if (settings.lostStreak >= c.lostStreakToGuide && settings.guideRuns < c.stepGuide.maxAutoRepeatsPerDay) {
        settings.guideIndex = c.stepGuide.steps.findIndex(s => s.waitFor === 'order_ready');
        settings.guideRuns++; settings.lostStreak = 0;
      }
    }
    const step = settings.guideIndex === null ? null : c.stepGuide.steps[settings.guideIndex];
    if (step?.waitFor === e.type && (!step.onlyAfter || game.world.completedShifts > 0)) {
      settings.guideIndex!++;
      if (settings.guideIndex! >= c.stepGuide.steps.length) { settings.guideIndex = null; settings.guideDone = true; }
    }
  }
}
