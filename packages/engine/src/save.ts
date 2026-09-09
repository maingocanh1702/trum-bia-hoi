import { loadConfig } from './config';
import { Game, validReplayEnvelope } from './engine';
import type { LoggedCommand } from './types';
const CATALOG_SAVE_VERSION = 3; // config-exempt: fixed local-save format revision, not economy tuning

/** Command log is append-only. The time frontier replays autonomous events between commands. */
export function encodeSave(game: Game): string {
  // A live dev tab can still hold a pre-upgrade Game instance during hot reload.
  const configs = (game.configs ?? [game.config]).slice(1).map(c => c.raw);
  const version = configs.length ? CATALOG_SAVE_VERSION : game.log.some(e => !e.rulesVersion) || game.world.events.some(e => !e.idempotencyKey) ? 1 : 2;
  return JSON.stringify({ version, seed: game.seed, createdAt: game.createdAt, playerId: game.playerId, config: (game.initialConfig ?? game.config).raw, ...(configs.length ? { configs } : {}), log: game.log, events: game.world.events, now: game.world.now });
}

/** Replay may enrich old event payloads with additive fields; every recorded value must still match. */
function recordedFieldsMatch(recorded: unknown, replayed: unknown): boolean {
  if (Array.isArray(recorded)) return Array.isArray(replayed) && recorded.length === replayed.length && recorded.every((v, i) => recordedFieldsMatch(v, replayed[i]));
  if (recorded && typeof recorded === 'object') return !!replayed && typeof replayed === 'object' && Object.entries(recorded).every(([k, v]) => Object.hasOwn(replayed, k) && recordedFieldsMatch(v, (replayed as Record<string, unknown>)[k]));
  return recorded === replayed;
}

export function decodeSave(text: string): Game {
  const save = JSON.parse(text);
  if (!save || ![1, 2, CATALOG_SAVE_VERSION].includes(save.version) || typeof save.playerId !== 'string' || !Array.isArray(save.log) || !Number.isSafeInteger(save.now)) throw Error('save:unsupported');
  // v1 upgrades by replaying its original rules, retaining command identities and financial history.
  const game = new Game(loadConfig(save.config), save.seed, save.createdAt, save.playerId);
  const configs = new Map([[game.config.version, game.config]]);
  if (save.version === CATALOG_SAVE_VERSION) {
    if (!Array.isArray(save.configs) || !save.configs.length) throw Error('save:configCatalog');
    const used = new Set(save.log.map((e: LoggedCommand) => e?.configVersion));
    for (const raw of save.configs) {
      const c = loadConfig(raw);
      if (configs.has(c.version) || !used.has(c.version)) throw Error('save:configCatalog');
      configs.set(c.version, c);
    }
  }
  for (const original of save.log as LoggedCommand[]) {
    const entry = save.version === 1 ? { ...original, configVersion: game.config.version, rulesVersion: 1 as const } : original;
    if (!validReplayEnvelope(entry) || entry.at < game.world.now) throw Error('save:invalid-log');
    const c = configs.get(entry.configVersion);
    if (!c || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(entry.rulesVersion)) throw Error('save:invalid-version'); // config-exempt: supported replay protocol versions
    const result = game.replay(entry, c);
    if (JSON.stringify(result) !== JSON.stringify(entry.result)) throw Error('save:replay-mismatch');
  }
  if (save.version === CATALOG_SAVE_VERSION && game.log.length !== save.log.length) throw Error('save:invalid-log');
  game.advance(save.now);
  if (save.version >= 2 && (!Array.isArray(save.events) || !recordedFieldsMatch(save.events, game.world.events) || save.version === CATALOG_SAVE_VERSION && !recordedFieldsMatch(game.world.events, save.events))) throw Error('save:event-mismatch');
  return game;
}
