import { config, isEconomy2, Game, decodeSave, type Command, type DomainEvent, type Result, type WorldView, type Config } from '../../../packages/engine/src';
import type { Locale } from './i18n';
import { BrowserSave } from './browser-save';
import { SETTINGS_KEY, localeOf } from './locale';

const SAVE_KEY = 'tbh.save.v1';
export interface Settings { locale: Locale; muted: boolean; goalChip: boolean; guideDone: boolean; guideIndex: number | null; guideRuns: number; guideDay: string; lostStreak: number; loginPromptPlayer: string; loginPromptShift: number; hintsDone: string[] }
export function readSettings(): Settings {
  const fallback: Settings = { locale: 'vi', muted: false, goalChip: true, guideDone: false, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0, loginPromptPlayer: '', loginPromptShift: 0, hintsDone: [] };
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    // Settings written before 2026-10 may carry localeAccepted/welcomed from the removed language screen; they are simply ignored.
    return { ...fallback, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in fallback && typeof v === typeof fallback[k as keyof Settings])),
      locale: localeOf(data.locale),
      guideIndex: Number.isInteger(data.guideIndex) && data.guideIndex >= 0 ? data.guideIndex : null,
      loginPromptShift: Number.isSafeInteger(data.loginPromptShift) && data.loginPromptShift >= 0 ? data.loginPromptShift : 0,
      hintsDone: Array.isArray(data.hintsDone) ? data.hintsDone.filter((id: unknown): id is string => typeof id === 'string') : [] }; // hints.ts: the hints already shown (F27 `hintsDone[]`)
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
/** Browser edition adopts a newer bundled release only when opening a new shift. */
function newerBundledConfig(version: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false; // Preserve custom/registry snapshot names.
  const previous = version.split('.').map(Number), next = config.version.split('.').map(Number);
  const changed = next.findIndex((part, i) => part !== previous[i]);
  return changed >= 0 && next[changed] > previous[changed];
}
/**
 * The snapshot the next "Mở ca" opens with: the bundled release when the pin predates economy 2 or is numerically older, else the pin itself. `dispatch`
 * hands it to the engine, and the rest line and the energy bar read it too (review 07 r1: a 2.0.4 save in its first three shifts opens at once on 2.1.0).
 */
export function openingConfig(game: Game): Config {
  return !isEconomy2(game.config.raw) || newerBundledConfig(game.config.version) ? config : game.config;
}
export function dispatch(game: Game, command: Command): Result {
  const opening = openingConfig(game);
  return game.command({ idempotencyKey: crypto.randomUUID(), at: Math.max(Date.now(), game.world.now), command }, command.type === 'startShift' && opening !== game.config ? opening : undefined);
}
export function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // config-exempt: browser download lifetime
}
/**
 * F27 (owner 2026-09-18): the step banner is only a fallback. First play is taught by the screen itself (spotlight.ts);
 * the banner starts after `lostStreakToGuide` lost guests, or on `ui_idle` (no tap for `idleToGuideMs`) before anyone was ever served.
 */
export function advanceGuide(settings: Settings, game: { world: WorldView; config: Config }, events: DomainEvent[], uiEvent?: string): void {
  const c = game.config.values.onboarding;
  if (!c.enabled) return;
  const fallback = () => { settings.guideIndex = c.stepGuide.steps.findIndex(s => s.waitFor === 'order_ready'); settings.guideRuns++; };
  for (const e of [...events, ...(uiEvent ? [{ type: uiEvent, data: {}, at: game.world.now }] : [])]) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: game.config.values.shift.dayRollover.tz }).format(e.at);
    if (settings.guideDay !== day) { settings.guideDay = day; settings.guideRuns = 0; }
    if (e.type === 'shift_opened' || e.type === 'customer_served') settings.lostStreak = 0;
    if (e.type === 'customer_left') {
      settings.lostStreak += Number(('count' in e.data ? e.data.count : 1) ?? 1);
      if (settings.lostStreak >= c.lostStreakToGuide && settings.guideRuns < c.stepGuide.maxAutoRepeatsPerDay) { fallback(); settings.lostStreak = 0; }
    }
    if (e.type === 'ui_idle' && settings.guideIndex === null && game.world.serves.length === 0 && settings.guideRuns < c.stepGuide.maxAutoRepeatsPerDay) fallback();
    const step = settings.guideIndex === null ? null : c.stepGuide.steps[settings.guideIndex];
    if (step?.waitFor === e.type && (!step.onlyAfter || game.world.completedShifts > 0)) {
      settings.guideIndex!++;
      if (settings.guideIndex! >= c.stepGuide.steps.length) { settings.guideIndex = null; settings.guideDone = true; }
    }
  }
}
