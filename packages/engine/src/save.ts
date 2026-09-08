import { loadConfig } from './config';
import { Game, validEnvelope } from './engine';
import type { LoggedCommand } from './types';

/** Command log is append-only. The time frontier replays autonomous events between commands. */
export function encodeSave(game: Game): string {
  return JSON.stringify({ version: 1, seed: game.seed, createdAt: game.createdAt, playerId: game.playerId, config: game.config.raw, log: game.log, now: game.world.now });
}

export function decodeSave(text: string): Game {
  const save = JSON.parse(text);
  if (!save || save.version !== 1 || typeof save.playerId !== 'string' || !Array.isArray(save.log) || !Number.isSafeInteger(save.now)) throw Error('save:unsupported');
  // v1 is the first released format. Future migrations must retain the original log.
  const game = new Game(loadConfig(save.config), save.seed, save.createdAt, save.playerId);
  for (const entry of save.log as LoggedCommand[]) {
    if (!validEnvelope(entry) || entry.at < game.world.now) throw Error('save:invalid-log');
    const result = game.command(entry);
    if (JSON.stringify(result) !== JSON.stringify(entry.result)) throw Error('save:replay-mismatch');
  }
  game.advance(save.now);
  return game;
}
