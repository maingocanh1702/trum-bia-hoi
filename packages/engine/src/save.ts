import { loadConfig } from './config';
import { Game, validEnvelope } from './engine';
import type { LoggedCommand } from './types';

/** Command log is append-only. The time frontier replays autonomous events between commands. */
export function encodeSave(game: Game): string {
  // A live dev tab can still hold a pre-upgrade Game instance during hot reload.
  const version = game.log.some(e => !e.rulesVersion) || game.world.events.some(e => !e.idempotencyKey) ? 1 : 2;
  return JSON.stringify({ version, seed: game.seed, createdAt: game.createdAt, playerId: game.playerId, config: game.config.raw, log: game.log, events: game.world.events, now: game.world.now });
}

/** Replay may enrich old event payloads with additive fields; every recorded value must still match. */
function recordedFieldsMatch(recorded: unknown, replayed: unknown): boolean {
  if (Array.isArray(recorded)) return Array.isArray(replayed) && recorded.length === replayed.length && recorded.every((v, i) => recordedFieldsMatch(v, replayed[i]));
  if (recorded && typeof recorded === 'object') return !!replayed && typeof replayed === 'object' && Object.entries(recorded).every(([k, v]) => Object.hasOwn(replayed, k) && recordedFieldsMatch(v, (replayed as Record<string, unknown>)[k]));
  return recorded === replayed;
}

export function decodeSave(text: string): Game {
  const save = JSON.parse(text);
  if (!save || ![1, 2].includes(save.version) || typeof save.playerId !== 'string' || !Array.isArray(save.log) || !Number.isSafeInteger(save.now)) throw Error('save:unsupported');
  // v1 upgrades by replaying its original rules, retaining command identities and financial history.
  const game = new Game(loadConfig(save.config), save.seed, save.createdAt, save.playerId);
  for (const original of save.log as LoggedCommand[]) {
    const entry = save.version === 1 ? { ...original, configVersion: game.config.version, rulesVersion: 1 as const } : original;
    if (!validEnvelope(entry) || entry.at < game.world.now) throw Error('save:invalid-log');
    if (entry.configVersion !== game.config.version || ![1, 2].includes(entry.rulesVersion)) throw Error('save:invalid-version');
    const result = game.replay(entry);
    if (JSON.stringify(result) !== JSON.stringify(entry.result)) throw Error('save:replay-mismatch');
  }
  game.advance(save.now);
  if (save.version === 2 && (!Array.isArray(save.events) || !recordedFieldsMatch(save.events, game.world.events))) throw Error('save:event-mismatch');
  return game;
}
