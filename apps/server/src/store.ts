import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Game, config as seedConfig, configContent, decodeSave, loadConfig, validEnvelope, type Config, type Command, type DomainEvent, type LoggedCommand, type World } from '@tbh/engine';

const SCHEMA_VERSION = 2, CACHE_SIZE = 64; // config-exempt: persistence format and bounded process cache, not game tuning
const EVENT_PAGE_SIZE = 100; // config-exempt: transport history page bound, not gameplay tuning
type PlayerRow = { id: string; seed: number; created_at: number; config_version: string; now: number; revision: number; projection: string };
export type Snapshot = { world: World; configVersion: string; revision: number; lastEventSeq: number };
const sessionHash = (token: string) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null; // config-exempt:256-bit random credential encoding
const projection = (w: World) => JSON.stringify({ ...w, events: undefined });
const validPlayerId = (id: string) => typeof id === 'string' && id.length > 0 && id.length <= 128; // config-exempt: internal identity protocol bound

/** Internal trusted service boundary. The transport must resolve the authenticated owner;
 * never accept a client world, seed, clock or config here as authoritative state. */
export class GameStore {
  private readonly db: DatabaseSync;
  private readonly config: Config;
  private readonly cache = new Map<string, { revision: number; game: Game }>();
  constructor(path: string, config: Config = seedConfig, private readonly clock = Date.now) {
    const candidate = loadConfig(config.raw);
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'); // config-exempt: SQLite lock wait, milliseconds; not gameplay time
      if (this.db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1) throw Error('store:foreignKeys');
      this.db.exec('BEGIN IMMEDIATE');
      const version = this.db.prepare('PRAGMA user_version').get()?.user_version;
      if (version !== 0 && version !== 1 && version !== SCHEMA_VERSION) throw Error('store:unsupportedSchema');
      if (version === 0) {
        this.db.exec(`
          CREATE TABLE configs (version TEXT PRIMARY KEY, snapshot TEXT NOT NULL) STRICT;
          CREATE TABLE players (id TEXT PRIMARY KEY, seed INTEGER NOT NULL, created_at INTEGER NOT NULL,
            config_version TEXT NOT NULL REFERENCES configs(version), now INTEGER NOT NULL,
            revision INTEGER NOT NULL CHECK(revision >= 0), projection TEXT NOT NULL) STRICT;
          CREATE TABLE commands (player_id TEXT NOT NULL REFERENCES players(id), seq INTEGER NOT NULL CHECK(seq > 0),
            idempotency_key TEXT NOT NULL, entry TEXT NOT NULL, PRIMARY KEY(player_id, seq), UNIQUE(player_id, idempotency_key)) STRICT;
          CREATE TABLE events (player_id TEXT NOT NULL REFERENCES players(id), seq INTEGER NOT NULL CHECK(seq > 0),
            event_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(player_id, seq), UNIQUE(player_id, event_id)) STRICT;
        `);
        for (const table of ['configs', 'commands', 'events']) for (const action of ['UPDATE', 'DELETE']) {
          this.db.exec(`CREATE TRIGGER ${table}_${action.toLowerCase()} BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END;`);
        }
      }
      if (version === 0 || version === 1) {
        this.db.exec(`CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id),
          created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER) STRICT;
          PRAGMA user_version=${SCHEMA_VERSION};`);
      }
      this.config = this.registerConfig(candidate);
      this.db.exec('COMMIT');
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      this.db.close(); throw error;
    }
  }
  close() { this.cache.clear(); if (this.db.isOpen) this.db.close(); }
  private now() {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) throw Error('store:invalidClock');
    return now;
  }
  private registerConfig(config: Config) {
    const row = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(config.version);
    if (row) {
      const existing = loadConfig(JSON.parse(String(row.snapshot)));
      if (configContent(existing) !== configContent(config)) throw Error('store:configVersionConflict');
      return existing;
    }
    // Retain the first snapshot's exact key order: historical weighted sampling reads it.
    this.db.prepare('INSERT INTO configs VALUES (?,?)').run(config.version, JSON.stringify(config.raw));
    return config;
  }
  private remember(id: string, revision: number, game: Game) {
    this.cache.delete(id); this.cache.set(id, { revision, game });
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
  }
  private snapshot(game: Game, revision: number): Snapshot {
    return { world: structuredClone(game.world), configVersion: game.config.version, revision, lastEventSeq: game.world.events.length };
  }
  createPlayer(id: string, seed: number): Snapshot {
    if (!validPlayerId(id)) throw Error('store:invalidPlayer');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT id FROM players WHERE id=?').get(id)) throw Error('store:playerExists');
      const game = this.insertPlayer(id, seed, this.now());
      this.db.exec('COMMIT'); this.remember(id, 0, game); return this.snapshot(game, 0);
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  private insertPlayer(id: string, seed: number, now: number) {
    const game = new Game(this.config, seed, now, id);
    this.db.prepare('INSERT INTO players VALUES (?,?,?,?,?,?,?)').run(id, seed, now, this.config.version, now, 0, projection(game.world));
    return game;
  }
  createGuestSession(ttlMs: number) {
    const now = this.now(), expiresAt = now + ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(expiresAt)) throw Error('store:invalidSessionTtl');
    const token = randomBytes(32).toString('hex'), playerId = `guest-${randomUUID()}`; // config-exempt:256-bit credential, not gameplay RNG
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const game = this.insertPlayer(playerId, randomInt(0x100000000), now); // config-exempt:32-bit engine seed range
      this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(sessionHash(token)!, playerId, now, expiresAt);
      this.db.exec('COMMIT'); this.remember(playerId, 0, game);
      return { token, playerId, expiresAt };
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  session(token: string) {
    const hash = sessionHash(token);
    const row = hash && this.db.prepare('SELECT player_id,expires_at FROM sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?').get(hash, this.now());
    return row ? { playerId: String(row.player_id), expiresAt: Number(row.expires_at) } : null;
  }
  revokeSession(token: string) {
    const hash = sessionHash(token);
    if (hash) this.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(this.now(), hash);
  }
  // ponytail: replay the full stream on cache miss; add verified checkpoints if measured cold starts exceed the release budget.
  private hydrate(row: PlayerRow): Game {
    const cached = this.cache.get(row.id);
    if (cached?.revision === row.revision) return cached.game;
    const log = this.db.prepare('SELECT seq, entry FROM commands WHERE player_id=? ORDER BY seq').all(row.id).map((record, index) => {
      if (record.seq !== index + 1) throw Error('store:commandSequence');
      return JSON.parse(String(record.entry)) as LoggedCommand;
    });
    const events = this.db.prepare('SELECT seq, payload FROM events WHERE player_id=? ORDER BY seq').all(row.id).map((record, index) => {
      if (record.seq !== index + 1) throw Error('store:eventSequence');
      return JSON.parse(String(record.payload)) as DomainEvent;
    });
    const load = (version: string) => {
      const record = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(version);
      if (!record) throw Error('store:configMissing');
      return JSON.parse(String(record.snapshot));
    };
    const configs = [...new Set(log.map(entry => entry.configVersion))].filter(version => version !== row.config_version).map(load);
    const game = decodeSave(JSON.stringify({ version: configs.length ? 3 : 2, seed: row.seed, createdAt: row.created_at, playerId: row.id,
      config: load(row.config_version), ...(configs.length ? { configs } : {}), log, events, now: row.now })); // config-exempt: existing save codec format revisions
    if (projection(game.world) !== row.projection) throw Error('store:projectionMismatch');
    return game;
  }
  private operate<T>(id: string, action: (game: Game, now: number) => T): Snapshot & { result: T } {
    if (!validPlayerId(id)) throw Error('store:invalidPlayer');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow | undefined;
      if (!row) throw Error('store:playerMissing');
      const game = this.hydrate(row), logStart = game.log.length, eventStart = game.world.events.length, now = this.now();
      if (now < game.world.now) throw Error('store:clockBackwards');
      // Even a retry returns the latest autonomous state, but its original command result.
      game.advance(now);
      const result = action(game, now);
      const changed = now !== row.now || game.log.length !== logStart || game.world.events.length !== eventStart;
      const revision = row.revision + Number(changed);
      if (!Number.isSafeInteger(revision)) throw Error('store:revisionOverflow');
      if (changed) {
        for (const config of game.configs) this.registerConfig(config);
        const command = this.db.prepare('INSERT INTO commands VALUES (?,?,?,?)');
        for (let i = logStart; i < game.log.length; i++) command.run(id, i + 1, game.log[i].idempotencyKey, JSON.stringify(game.log[i]));
        const event = this.db.prepare('INSERT INTO events VALUES (?,?,?,?)');
        for (let i = eventStart; i < game.world.events.length; i++) event.run(id, i + 1, game.world.events[i].id, JSON.stringify(game.world.events[i]));
        this.db.prepare('UPDATE players SET now=?,revision=?,projection=? WHERE id=?').run(game.world.now, revision, projection(game.world), id);
      }
      this.db.exec('COMMIT'); this.remember(id, revision, game);
      return { ...this.snapshot(game, revision), result };
    } catch (error) {
      this.cache.delete(id);
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  read(id: string): Snapshot { const { result: _, ...state } = this.operate(id, () => undefined); return state; }
  command(id: string, request: { idempotencyKey: string; command: Command }) {
    if (!validEnvelope({ ...request, at: 0 })) throw Error('store:invalidCommand');
    return this.operate(id, (game, now) => {
      const row = this.db.prepare('SELECT entry FROM commands WHERE player_id=? AND idempotency_key=?').get(id, request.idempotencyKey);
      const previous = row && (JSON.parse(String(row.entry)) as LoggedCommand).command;
      // JSON member order is not command identity; retain the original engine payload on an equal retry.
      const command = previous && isDeepStrictEqual(previous, request.command) ? previous : request.command;
      return game.command({ idempotencyKey: request.idempotencyKey, command, at: now }, request.command.type === 'startShift' ? this.config : undefined);
    });
  }
  /** Bounded durable history only. State reads/commands advance simulation; catch-up does not replay it. */
  eventsAfter(id: string, after: number) {
    if (!validPlayerId(id)) throw Error('store:invalidPlayer');
    if (!Number.isSafeInteger(after) || after < 0) throw Error('store:invalidCursor');
    const last = this.db.prepare('SELECT (SELECT COALESCE(MAX(seq),0) FROM events WHERE player_id=players.id) AS seq FROM players WHERE id=?').get(id);
    if (!last) throw Error('store:playerMissing');
    if (after > Number(last.seq)) throw Error('store:invalidCursor');
    // Append-only rows let us page a fixed frontier without hydrating/copying a player's entire stream.
    const events = this.db.prepare('SELECT seq,payload FROM events WHERE player_id=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?')
      .all(id, after, last.seq, EVENT_PAGE_SIZE).map(row => ({ seq: Number(row.seq), event: JSON.parse(String(row.payload)) as DomainEvent }));
    const lastEventSeq = events.at(-1)?.seq ?? after;
    return { events, lastEventSeq, hasMore: lastEventSeq < Number(last.seq) };
  }
}
