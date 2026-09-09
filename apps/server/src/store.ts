import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validGoogleSubject, type GoogleIdentity } from './google';
import { LOCAL_ARCHIVE_BYTES, validateLocalArchive } from './local-archive';
import { Game, config as seedConfig, configContent, decodeSave, loadConfig, validEnvelope, type Config, type Command, type DomainEvent, type LoggedCommand, type World } from '@tbh/engine';

const SCHEMA_VERSION = 5, CACHE_SIZE = 64; // config-exempt: persistence format and bounded process cache, not game tuning
const GOOGLE_CHALLENGE_TTL_MS = 300000; // config-exempt: five-minute authentication nonce lifetime, not gameplay time
const EVENT_PAGE_SIZE = 100; // config-exempt: transport history page bound, not gameplay tuning
type PlayerRow = { id: string; seed: number; created_at: number; config_version: string; now: number; revision: number; projection: string };
export type Snapshot = { world: World; configVersion: string; revision: number; lastEventSeq: number };
export type ImportReceipt = { playerId: string; digest: string; importedAt: number; sourceNow: number;
  commandSeq: number; eventSeq: number; review: 'pending' };
type Request = { idempotencyKey: string; command: Command };
export type SequencedRequest = Request & { clientId: string; clientSeq: number };
const sessionHash = (token: string) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null; // config-exempt:256-bit random credential encoding
const projection = (w: World) => JSON.stringify({ ...w, events: undefined });
const validPlayerId = (id: string) => typeof id === 'string' && id.length > 0 && id.length <= 128; // config-exempt: internal identity protocol bound
function sessionExpiry(now: number, ttlMs: number) {
  const expiresAt = now + ttlMs;
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(expiresAt) || !Number.isFinite(new Date(expiresAt).getTime())) throw Error('store:invalidSessionTtl');
  return expiresAt;
}

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
      if (version !== 0 && version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== SCHEMA_VERSION) throw Error('store:unsupportedSchema');
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
          `);
      }
      if (version === 0 || version === 1 || version === 2) {
        this.db.exec(`CREATE TABLE client_streams (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id),
          created_at INTEGER NOT NULL, UNIQUE(id,player_id)) STRICT;
          CREATE TABLE client_receipts (client_id TEXT NOT NULL, player_id TEXT NOT NULL, client_seq INTEGER NOT NULL CHECK(client_seq>0),
            idempotency_key TEXT NOT NULL, PRIMARY KEY(client_id,client_seq),
            FOREIGN KEY(client_id,player_id) REFERENCES client_streams(id,player_id),
            FOREIGN KEY(player_id,idempotency_key) REFERENCES commands(player_id,idempotency_key) DEFERRABLE INITIALLY DEFERRED) STRICT;`);
        for (const action of ['UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER client_receipts_${action.toLowerCase()}
          BEFORE ${action} ON client_receipts BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END;`);
      }
      if (Number(version) < 4) {
        this.db.exec(`CREATE TABLE google_accounts (subject TEXT PRIMARY KEY,
          player_id TEXT NOT NULL UNIQUE REFERENCES players(id), created_at INTEGER NOT NULL) STRICT;
          CREATE TABLE google_challenges (session_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash),
            nonce TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL) STRICT;
          CREATE TABLE account_logins (session_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash),
            previous_session_hash TEXT NOT NULL REFERENCES sessions(token_hash), action TEXT NOT NULL,
            created_at INTEGER NOT NULL) STRICT;
          CREATE INDEX sessions_player ON sessions(player_id);`);
        for (const action of ['UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER account_logins_${action.toLowerCase()}
          BEFORE ${action} ON account_logins BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END;`);
      }
      if (version !== SCHEMA_VERSION) {
        this.db.exec(`CREATE TABLE local_imports (player_id TEXT PRIMARY KEY REFERENCES players(id),
          subject TEXT NOT NULL UNIQUE REFERENCES google_accounts(subject),
          previous_player_id TEXT NOT NULL REFERENCES players(id), digest TEXT NOT NULL UNIQUE,
          imported_at INTEGER NOT NULL, source_now INTEGER NOT NULL, command_seq INTEGER NOT NULL,
          event_seq INTEGER NOT NULL, original_gzip BLOB NOT NULL) STRICT;
          PRAGMA user_version=${SCHEMA_VERSION};`);
        for (const action of ['UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER local_imports_${action.toLowerCase()}
          BEFORE ${action} ON local_imports BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END;`);
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
    const now = this.now(), expiresAt = sessionExpiry(now, ttlMs);
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
    const row = hash && this.db.prepare(`SELECT s.player_id,s.expires_at,a.subject FROM sessions s
      LEFT JOIN google_accounts a ON a.player_id=s.player_id
      WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?`).get(hash, this.now());
    return row ? { playerId: String(row.player_id), expiresAt: Number(row.expires_at), provider: row.subject === null ? 'guest' as const : 'google' as const } : null;
  }
  revokeSession(token: string) {
    const hash = sessionHash(token);
    if (hash) this.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(this.now(), hash);
  }
  issueGoogleChallenge(token: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
      const expiresAt = Math.min(owner.expiresAt, sessionExpiry(this.now(), GOOGLE_CHALLENGE_TTL_MS));
      const nonce = randomBytes(32).toString('hex'); // config-exempt: 256-bit server-generated authentication nonce
      this.db.prepare(`INSERT INTO google_challenges VALUES (?,?,?) ON CONFLICT(session_hash)
        DO UPDATE SET nonce=excluded.nonce,expires_at=excluded.expires_at`).run(sessionHash(token)!, nonce, expiresAt);
      this.db.exec('COMMIT'); return { nonce, expiresAt };
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  googleChallenge(token: string) {
    const hash = sessionHash(token), now = this.now();
    const row = hash && this.db.prepare(`SELECT c.nonce,c.expires_at FROM google_challenges c
      JOIN sessions s ON s.token_hash=c.session_hash
      WHERE c.session_hash=? AND c.expires_at>? AND s.expires_at>? AND s.revoked_at IS NULL`).get(hash, now, now);
    if (!row) throw Error('store:invalidGoogleChallenge');
    return { nonce: String(row.nonce), expiresAt: Number(row.expires_at) };
  }
  /** Only call with a verified Google identity; recheck authorization after verifier IO.
   * Linking a server guest retains its immutable engine/history ID, never imports local totals. */
  signInGoogle(token: string, nonce: string, identity: GoogleIdentity, ttlMs: number, keepAccount = false) {
    if (!validGoogleSubject(identity?.subject) || typeof keepAccount !== 'boolean') throw Error('store:invalidGoogleIdentity');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
      if (this.googleChallenge(token).nonce !== nonce) throw Error('store:invalidGoogleChallenge');
      const now = this.now(), expiresAt = sessionExpiry(now, ttlMs);
      const existing = this.db.prepare('SELECT player_id FROM google_accounts WHERE subject=?').get(identity.subject);
      const playerId = existing ? String(existing.player_id) : owner.playerId;
      if (!existing && owner.provider === 'google') throw Error('store:signOutRequired');
      if (playerId !== owner.playerId && !keepAccount) throw Error('store:accountConflict');
      if (!existing) {
        this.db.prepare('INSERT INTO google_accounts VALUES (?,?,?)').run(identity.subject, playerId, now);
        this.db.prepare('UPDATE sessions SET revoked_at=? WHERE player_id=? AND revoked_at IS NULL').run(now, playerId);
      } else this.revokeSession(token);
      this.db.prepare('DELETE FROM google_challenges WHERE session_hash=?').run(sessionHash(token)!);
      const nextToken = randomBytes(32).toString('hex'); // config-exempt: rotate the 256-bit credential on authentication
      this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(sessionHash(nextToken)!, playerId, now, expiresAt);
      this.db.prepare('INSERT INTO account_logins VALUES (?,?,?,?)').run(sessionHash(nextToken)!, sessionHash(token)!,
        !existing ? 'link' : playerId === owner.playerId ? 'login' : 'switch', now);
      this.db.exec('COMMIT'); return { token: nextToken, playerId, expiresAt, provider: 'google' as const };
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  private googleOwner(token: string) {
    const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
    if (owner.provider !== 'google') throw Error('store:googleRequired');
    const row = this.db.prepare('SELECT subject FROM google_accounts WHERE player_id=?').get(owner.playerId)!;
    return { ...owner, subject: String(row.subject) };
  }
  localImport(token: string): ImportReceipt | undefined {
    const owner = this.googleOwner(token);
    const row = this.db.prepare('SELECT player_id,digest,imported_at,source_now,command_seq,event_seq FROM local_imports WHERE subject=?').get(owner.subject);
    if (!row) return;
    if (row.player_id !== owner.playerId) throw Error('store:importOwnerChanged');
    return { playerId: String(row.player_id), digest: String(row.digest), importedAt: Number(row.imported_at),
      sourceNow: Number(row.source_now), commandSeq: Number(row.command_seq), eventSeq: Number(row.event_seq), review: 'pending' };
  }
  private requireEmptyClaimTarget(id: string) {
    const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow;
    const game = this.hydrate(row);
    if (game.log.some(e => e.result.ok && !['activity', 'adoptCalendarRules'].includes(e.command.type))) throw Error('store:accountConflict');
  }
  /** Internal claim boundary; no public upload route until its transport and recovery are ready.
   * A replay-consistent import is preserved, but has no approved competitive provenance. */
  async claimLocal(token: string, text: string): Promise<ImportReceipt & { token?: string; expiresAt?: number }> {
    const owner = this.googleOwner(token);
    if (typeof text !== 'string' || !text.length || Buffer.byteLength(text) > LOCAL_ARCHIVE_BYTES) throw Error('store:localArchiveSize');
    const digest = createHash('sha256').update(text).digest('hex'), existing = this.localImport(token);
    if (existing) { if (existing.digest !== digest) throw Error('store:importConflict'); return existing; }
    this.requireEmptyClaimTarget(owner.playerId);
    const snapshots = this.db.prepare('SELECT snapshot FROM configs').all().map(row => String(row.snapshot));
    const archive = await validateLocalArchive(text, snapshots, this.now());
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.googleOwner(token), now = this.now();
      if (current.playerId !== owner.playerId || current.subject !== owner.subject) throw Error('store:importOwnerChanged');
      if (archive.world.now > now) throw Error('store:invalidLocalArchive');
      this.requireEmptyClaimTarget(owner.playerId);
      if (this.db.prepare('SELECT player_id FROM local_imports WHERE subject=? OR digest=?').get(owner.subject, digest) ||
          this.db.prepare('SELECT id FROM players WHERE id=?').get(archive.playerId)) throw Error('store:importConflict');
      this.db.prepare('INSERT INTO players VALUES (?,?,?,?,?,?,?)').run(archive.playerId, archive.seed, archive.createdAt,
        archive.initialConfigVersion, archive.world.now, 1, projection(archive.world));
      this.appendHistory(archive.playerId, archive.log, archive.world.events);
      this.db.prepare('INSERT INTO local_imports VALUES (?,?,?,?,?,?,?,?,?)').run(archive.playerId, owner.subject, owner.playerId,
        digest, now, archive.world.now, archive.log.length, archive.world.events.length, Buffer.from(archive.original));
      this.db.prepare('UPDATE google_accounts SET player_id=? WHERE subject=?').run(archive.playerId, owner.subject);
      this.db.prepare('UPDATE sessions SET revoked_at=? WHERE player_id=? AND revoked_at IS NULL').run(now, owner.playerId);
      const nextToken = randomBytes(32).toString('hex'); // config-exempt: rotate credential when adopting a different game aggregate
      this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(sessionHash(nextToken)!, archive.playerId, now, current.expiresAt);
      this.db.prepare('INSERT INTO account_logins VALUES (?,?,?,?)').run(sessionHash(nextToken)!, sessionHash(token)!, 'claim', now);
      this.db.exec('COMMIT'); this.cache.delete(owner.playerId);
      return { playerId: archive.playerId, digest, importedAt: now, sourceNow: archive.world.now,
        commandSeq: archive.log.length, eventSeq: archive.world.events.length, review: 'pending', token: nextToken, expiresAt: current.expiresAt };
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
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
  private appendHistory(id: string, log: readonly LoggedCommand[], events: readonly DomainEvent[], logStart = 0, eventStart = 0) {
    const command = this.db.prepare('INSERT INTO commands VALUES (?,?,?,?)');
    for (let i = logStart; i < log.length; i++) command.run(id, i + 1, log[i].idempotencyKey, JSON.stringify(log[i]));
    const event = this.db.prepare('INSERT INTO events VALUES (?,?,?,?)');
    for (let i = eventStart; i < events.length; i++) event.run(id, i + 1, events[i].id, JSON.stringify(events[i]));
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
      game.catchUp(now);
      const result = action(game, now);
      const changed = now !== row.now || game.log.length !== logStart || game.world.events.length !== eventStart;
      const revision = row.revision + Number(changed);
      if (!Number.isSafeInteger(revision)) throw Error('store:revisionOverflow');
      if (changed) {
        for (const config of game.configs) this.registerConfig(config);
        this.appendHistory(id, game.log, game.world.events, logStart, eventStart);
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
  private commandEntry(id: string, key: string) {
    const row = this.db.prepare('SELECT entry FROM commands WHERE player_id=? AND idempotency_key=?').get(id, key);
    return row ? JSON.parse(String(row.entry)) as LoggedCommand : undefined;
  }
  private execute(game: Game, id: string, request: Request, now: number) {
    const previous = this.commandEntry(id, request.idempotencyKey)?.command;
    // JSON member order is not command identity; retain the original engine payload on an equal retry.
    const command = previous && previous.type !== 'connectionLost' && previous.type !== 'adoptCalendarRules' && isDeepStrictEqual(previous, request.command) ? previous : request.command;
    return game.command({ idempotencyKey: request.idempotencyKey, command, at: now }, request.command.type === 'startShift' ? this.config : undefined);
  }
  command(id: string, request: Request) {
    if (!validEnvelope({ ...request, at: 0 })) throw Error('store:invalidCommand');
    return this.operate(id, (game, now) => this.execute(game, id, request, now));
  }
  private stream(id: string, clientId: string) {
    if (typeof clientId !== 'string' || !this.db.prepare('SELECT id FROM client_streams WHERE id=? AND player_id=?').get(clientId, id)) throw Error('store:invalidClient');
    return Number(this.db.prepare('SELECT COALESCE(MAX(client_seq),0) AS seq FROM client_receipts WHERE client_id=?').get(clientId)!.seq);
  }
  connect(id: string, clientId?: string) {
    const { result, ...state } = this.operate(id, (_, now) => {
      if (clientId !== undefined) return { clientId, acknowledgedSeq: this.stream(id, clientId) };
      const created = randomUUID();
      this.db.prepare('INSERT INTO client_streams VALUES (?,?,?)').run(created, id, now);
      return { clientId: created, acknowledgedSeq: 0 };
    });
    return { ...state, ...result };
  }
  clientCommand(id: string, request: SequencedRequest) {
    if (!validEnvelope({ ...request, at: 0 }) || !Number.isSafeInteger(request.clientSeq) || request.clientSeq < 1) throw Error('store:invalidCommand');
    const { result, ...state } = this.operate(id, (game, now) => {
      const acknowledgedSeq = this.stream(id, request.clientId), previous = this.commandEntry(id, request.idempotencyKey);
      const receipt = this.db.prepare('SELECT idempotency_key FROM client_receipts WHERE client_id=? AND client_seq=?').get(request.clientId, request.clientSeq);
      const conflict = request.clientSeq > acknowledgedSeq + 1 ? 'sequenceGap'
        : request.clientSeq <= acknowledgedSeq && !receipt ? 'sequenceConflict'
        : receipt && receipt.idempotency_key !== request.idempotencyKey ? 'sequenceConflict'
        : previous && !isDeepStrictEqual(previous.command, request.command) ? 'idempotencyConflict' : null;
      if (conflict) return { clientId: request.clientId, acknowledgedSeq, error: conflict };
      const result = this.execute(game, id, request, now);
      // The FK is deferred until operate() has appended the canonical engine command log.
      if (!receipt) this.db.prepare('INSERT INTO client_receipts VALUES (?,?,?,?)').run(request.clientId, id, request.clientSeq, request.idempotencyKey);
      return { clientId: request.clientId, acknowledgedSeq: this.stream(id, request.clientId), result };
    });
    return { ...state, ...result };
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
