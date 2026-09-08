import { Game, encodeSave, decodeSave, type Command, type DomainEvent, type Result } from '../../../packages/engine/src';
import type { Locale } from './i18n';

const SAVE_KEY = 'tbh.save.v1', SETTINGS_KEY = 'tbh.settings.v1';
export interface Settings { locale: Locale; muted: boolean; welcomed: boolean; guideDone: boolean; guideIndex: number | null; guideRuns: number; guideDay: string; lostStreak: number }
export function readSettings(): Settings {
  const fallback: Settings = { locale: 'vi', muted: false, welcomed: false, guideDone: false, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { ...fallback, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in fallback && typeof v === typeof fallback[k as keyof Settings])), locale: data.locale === 'en' ? 'en' : 'vi', guideIndex: Number.isInteger(data.guideIndex) && data.guideIndex >= 0 ? data.guideIndex : null };
  } catch { return fallback; }
}
export function writeSettings(settings: Settings): void { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
export function boot(): { game: Game; original: string | null; error: boolean } {
  let original: string | null = null;
  try {
    original = localStorage.getItem(SAVE_KEY);
    if (original !== null) {
      const game = decodeSave(original);
      // Offline time pauses gameplay and never grants active-rest recovery.
      game.command({ idempotencyKey: crypto.randomUUID(), at: game.world.now, command: { type: 'activity', active: false } });
      game.advance(Math.max(Date.now(), game.world.now));
      game.command({ idempotencyKey: crypto.randomUUID(), at: game.world.now, command: { type: 'activity', active: !document.hidden } });
      return { game, original, error: false };
    }
  } catch { return { game: new Game(), original, error: true }; }
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return { game: new Game(undefined, seed, Date.now(), `guest-${crypto.randomUUID()}`), original, error: false };
}
export function persist(game: Game): void { localStorage.setItem(SAVE_KEY, encodeSave(game)); }
/** Validate before replacing; keep the original under a separate key even if import/reset fails. */
export function replaceSave(text: string | null): void {
  const game = text === null ? new Game(undefined, crypto.getRandomValues(new Uint32Array(1))[0], Date.now(), `guest-${crypto.randomUUID()}`) : decodeSave(text);
  const original = localStorage.getItem(SAVE_KEY);
  if (original !== null) localStorage.setItem(`tbh.backup.${crypto.randomUUID()}`, original);
  persist(game);
}
export function dispatch(game: Game, command: Command): Result {
  return game.command({ idempotencyKey: crypto.randomUUID(), at: Math.max(Date.now(), game.world.now), command });
}
export function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // config-exempt: browser download lifetime
}
export function advanceGuide(settings: Settings, game: Game, events: DomainEvent[], uiEvent?: string): void {
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
