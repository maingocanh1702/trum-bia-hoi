import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validGoogleSubject, type GoogleIdentity } from './google';
import { LOCAL_ARCHIVE_BYTES, validateLocalArchive } from './local-archive';
import { AdminAuth, initializeAdmin } from './admin-auth';
import { Competition, type ImportReview } from './competition';
import { importBaseline, competitivePeriods, type ImportBaseline } from './competitive-score';
import { ConfigRegistry, initializeRegistry, initializeScopes, heartbeatTiming } from './registry';
import { Game, config as seedConfig, configContent, decodeSave, loadConfig, validEnvelope, type Config, type Command, type DomainEvent, type EngineCheckpoint, type LoggedCommand, type World } from '@tbh/engine';

const SCHEMA_VERSION = 10, CACHE_SIZE = 64; // config-exempt: persistence format and bounded process cache, not game tuning
const GOOGLE_CHALLENGE_TTL_MS = 300000; // config-exempt: five-minute authentication nonce lifetime, not gameplay time
const EVENT_PAGE_SIZE = 100; // config-exempt: transport history page bound, not gameplay tuning
type PlayerRow = { id: string; seed: number; created_at: number; config_version: string; now: number; revision: number; projection: string };
type HistoryHashes = { commandHash: string; eventHash: string };
type LiveGame = HistoryHashes & { game: Game; checkpointable: boolean };
const EMPTY_HASH = createHash('sha256').digest('hex');
const historyHash = (previous: string, key: string, text: string) => createHash('sha256').update(previous).update(JSON.stringify([key, text])).digest('hex');
const baselineHash = (p: { digest: string; commandSeq: number; eventSeq: number; baseline: ImportBaseline }) =>
  createHash('sha256').update(JSON.stringify([p.digest, p.commandSeq, p.eventSeq, p.baseline])).digest('hex');
export type Snapshot = { world: World; configVersion: string; revision: number; lastEventSeq: number };
export type ImportReceipt = { playerId: string; digest: string; importedAt: number; sourceNow: number;
  commandSeq: number; eventSeq: number; review: ImportReview };
type Request = { idempotencyKey: string; command: Command };
export type SequencedRequest = Request & { clientId: string; clientSeq: number };
export type Heartbeat = { clientId: string; beatSeq: number; active: boolean; paused: boolean };
const presenceExpiry = 'MIN(p.until,s.expires_at,COALESCE(s.revoked_at,p.until))';
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
  readonly registry: ConfigRegistry;
  readonly adminAuth: AdminAuth;
  readonly competition: Competition;
  private readonly cache = new Map<string, LiveGame & { revision: number }>();
  constructor(readonly path: string, config: Config = seedConfig, private readonly clock = Date.now) {
    const candidate = loadConfig(config.raw);
    heartbeatTiming(candidate);
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'); // config-exempt: SQLite lock wait, milliseconds; not gameplay time
      if (this.db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1) throw Error('store:foreignKeys');
      this.db.exec('BEGIN IMMEDIATE');
      const version = this.db.prepare('PRAGMA user_version').get()?.user_version;
      if (!Number.isInteger(version) || Number(version) < 0 || Number(version) > SCHEMA_VERSION) throw Error('store:unsupportedSchema');
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
      if (Number(version) < 5) {
        this.db.exec(`CREATE TABLE local_imports (player_id TEXT PRIMARY KEY REFERENCES players(id),
          subject TEXT NOT NULL UNIQUE REFERENCES google_accounts(subject),
          previous_player_id TEXT NOT NULL REFERENCES players(id), digest TEXT NOT NULL UNIQUE,
          imported_at INTEGER NOT NULL, source_now INTEGER NOT NULL, command_seq INTEGER NOT NULL,
          event_seq INTEGER NOT NULL, original_gzip BLOB NOT NULL) STRICT;`);
        for (const action of ['UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER local_imports_${action.toLowerCase()}
          BEFORE ${action} ON local_imports BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END;`);
      }
      if (Number(version) < 6) this.db.exec(`CREATE TABLE engine_checkpoints (
        player_id TEXT PRIMARY KEY REFERENCES players(id), revision INTEGER NOT NULL,
        metadata TEXT NOT NULL, command_hash TEXT NOT NULL, event_hash TEXT NOT NULL, digest TEXT NOT NULL) STRICT;`);
      if (Number(version) < 7) this.db.exec(`CREATE TABLE client_presence (
        client_id TEXT PRIMARY KEY, player_id TEXT NOT NULL, session_hash TEXT NOT NULL REFERENCES sessions(token_hash),
        beat_seq INTEGER NOT NULL CHECK(beat_seq>0), until INTEGER NOT NULL,
        active INTEGER NOT NULL CHECK(active IN (0,1)), paused INTEGER NOT NULL CHECK(paused IN (0,1)),
        live INTEGER NOT NULL CHECK(live IN (0,1)), FOREIGN KEY(client_id,player_id) REFERENCES client_streams(id,player_id)) STRICT;
        CREATE INDEX presence_player ON client_presence(player_id);
        CREATE INDEX presence_deadline ON client_presence(live,until);`);
      this.db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
      // Register approved historical snapshots for import/replay without activating them.
      const registered = this.registerConfig(candidate);
      if (Number(version) < 8) initializeRegistry(this.db, registered, this.now());
      if (Number(version) < 9) initializeAdmin(this.db);
      if (Number(version) < 10) initializeScopes(this.db);
      this.registry = new ConfigRegistry(this.db, () => this.now());
      this.adminAuth = new AdminAuth(this.db, () => this.now());
      this.competition = new Competition(this.db, () => this.now());
      heartbeatTiming(this.registry.active());
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
  private remember(id: string, revision: number, state: LiveGame) {
    this.cache.delete(id); this.cache.set(id, { ...state, revision });
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
      const state = this.insertPlayer(id, seed, this.now());
      this.db.exec('COMMIT'); this.remember(id, 0, state); return this.snapshot(state.game, 0);
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  private insertPlayer(id: string, seed: number, now: number) {
    const config = this.registry.active(now), game = new Game(config, seed, now, id);
    this.db.prepare('INSERT INTO players VALUES (?,?,?,?,?,?,?)').run(id, seed, now, config.version, now, 0, projection(game.world));
    const state = { game, commandHash: EMPTY_HASH, eventHash: EMPTY_HASH, checkpointable: true };
    this.saveCheckpoint(id, game.checkpoint(), state); return state;
  }
  createGuestSession(ttlMs: number, previous?: { token: string; playerId: string }) {
    const now = this.now(), expiresAt = sessionExpiry(now, ttlMs);
    const token = randomBytes(32).toString('hex'), playerId = `guest-${randomUUID()}`; // config-exempt:256-bit credential, not gameplay RNG
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (previous) {
        const owner = this.session(previous.token);
        if (!owner || owner.provider !== 'guest' || owner.playerId !== previous.playerId) throw Error('store:accountConflict');
      }
      const game = this.insertPlayer(playerId, randomInt(0x100000000), now); // config-exempt:32-bit engine seed range
      this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?,NULL)').run(sessionHash(token)!, playerId, now, expiresAt);
      if (previous) this.revokeSession(previous.token);
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
  /** Recognizes only a former guest credential, never grants access to its old player. */
  guestCredentialPlayerId(token: string): string | null {
    const hash = sessionHash(token);
    const row = hash && this.db.prepare(`SELECT s.player_id FROM sessions s LEFT JOIN google_accounts a ON a.player_id=s.player_id
      WHERE s.token_hash=? AND a.subject IS NULL AND NOT EXISTS (
        SELECT 1 FROM account_logins l JOIN sessions authenticated ON authenticated.token_hash=l.session_hash
        WHERE authenticated.player_id=s.player_id)`).get(hash);
    return row ? String(row.player_id) : null;
  }
  revokeSession(token: string) {
    const hash = sessionHash(token);
    if (hash) this.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(this.now(), hash);
  }
  /** Only the authenticated destination can read its own completed switch receipt. */
  accountTransition(token: string): { previousPlayerId: string } | undefined {
    if (!this.session(token)) throw Error('store:invalidSession');
    const row = this.db.prepare(`SELECT previous.player_id FROM account_logins a
      JOIN sessions previous ON previous.token_hash=a.previous_session_hash
      WHERE a.session_hash=? AND a.action='switch'`).get(sessionHash(token)!);
    return row ? { previousPlayerId: String(row.player_id) } : undefined;
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
  signInGoogle(token: string, nonce: string, identity: GoogleIdentity, ttlMs: number, keepAccount = false, expectedPlayerId?: string) {
    if (!validGoogleSubject(identity?.subject) || typeof keepAccount !== 'boolean' || expectedPlayerId !== undefined && (typeof expectedPlayerId !== 'string' || !expectedPlayerId)) throw Error('store:invalidGoogleIdentity');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
      if (this.googleChallenge(token).nonce !== nonce) throw Error('store:invalidGoogleChallenge');
      const now = this.now(), expiresAt = sessionExpiry(now, ttlMs);
      const existing = this.db.prepare('SELECT player_id FROM google_accounts WHERE subject=?').get(identity.subject);
      const playerId = existing ? String(existing.player_id) : owner.playerId;
      // A retained outbox restricts the verified target; its ID never authenticates it.
      if (expectedPlayerId !== undefined && (!existing || playerId !== expectedPlayerId)) throw Error('store:accountConflict');
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
      sourceNow: Number(row.source_now), commandSeq: Number(row.command_seq), eventSeq: Number(row.event_seq), review: this.competition.state(owner.playerId).localImport!.review.value };
  }
  private requireEmptyClaimTarget(id: string) {
    const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow;
    const { game } = this.hydrate(row);
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
      const hashes = this.appendHistory(archive.playerId, archive.log, archive.world.events);
      this.saveCheckpoint(archive.playerId, archive.checkpoint, hashes);
      this.db.prepare('INSERT INTO local_imports VALUES (?,?,?,?,?,?,?,?,?)').run(archive.playerId, owner.subject, owner.playerId,
        digest, now, archive.world.now, archive.log.length, archive.world.events.length, Buffer.from(archive.original));
      this.recordImportBaseline(archive.world, archive.log.length, digest);
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
  private importedBaseline(id: string): ImportBaseline | undefined {
    const rows = this.db.prepare("SELECT payload FROM registry_audit WHERE type='LocalImportBaseline' AND json_extract(payload,'$.baseline.playerId')=?").all(id);
    if (!rows.length) return;
    if (rows.length !== 1) throw Error('competition:invalidBaseline');
    const saved = JSON.parse(String(rows[0].payload)), origin = this.db.prepare('SELECT digest,source_now,command_seq,event_seq FROM local_imports WHERE player_id=?').get(id);
    if (!origin || saved.digest !== origin.digest || saved.baseline?.sourceNow !== origin.source_now || saved.commandSeq !== origin.command_seq || saved.eventSeq !== origin.event_seq || saved.hash !== baselineHash(saved)) throw Error('competition:invalidBaseline');
    return saved.baseline;
  }
  /** Called only inside the claim/recovery transaction with the worker's replayed world. */
  private recordImportBaseline(world: World, commandSeq: number, digest: string) {
    const baseline = importBaseline(world), existing = this.importedBaseline(world.playerId);
    if (existing) { if (!isDeepStrictEqual(existing, baseline)) throw Error('competition:invalidBaseline'); return; }
    const payload = { digest, commandSeq, eventSeq: world.events.length, baseline };
    this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run('LocalImportBaseline', JSON.stringify({ ...payload, hash: baselineHash(payload), at: this.now() }));
  }
  private async ensureImportBaseline(id: string) {
    const state = this.competition.state(id);
    if (!state.localImport || this.importedBaseline(id)) return;
    const origin = state.localImport, row = this.db.prepare('SELECT original_gzip FROM local_imports WHERE player_id=?').get(id)!;
    const snapshots = this.db.prepare('SELECT snapshot FROM configs').all().map(row => String(row.snapshot));
    const archive = await validateLocalArchive({ gzip: row.original_gzip as Uint8Array, digest: origin.digest }, snapshots, origin.sourceNow);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.competition.state(id).localImport;
      if (!current || current.digest !== origin.digest || archive.playerId !== id || archive.world.now !== current.sourceNow ||
        archive.log.length !== current.commandSeq || archive.world.events.length !== current.eventSeq) throw Error('competition:invalidBaseline');
      this.recordImportBaseline(archive.world, archive.log.length, current.digest);
      this.db.exec('COMMIT');
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  /** Caller-owned live competitive totals. Recovery never promotes local history to approval. */
  async competitiveStatus(token: string) {
    const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
    await this.ensureImportBaseline(owner.playerId);
    const current = this.session(token);
    if (!current || current.playerId !== owner.playerId || current.provider !== owner.provider) throw Error('store:invalidSession');
    return this.operate(owner.playerId, game => {
      const state = this.competition.state(owner.playerId);
      return { playerId: owner.playerId, serverNow: game.world.now, review: state.localImport?.review.value ?? null,
        periods: competitivePeriods(game.world, version => loadConfig(JSON.parse(this.configSnapshot(version))), state, this.importedBaseline(owner.playerId)) };
    }).result;
  }
  configSnapshot(version: string): string {
    const row = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(version);
    if (!row) throw Error('store:configMissing');
    return String(row.snapshot);
  }
  private checkpointDigest(row: PlayerRow, metadata: string, hashes: HistoryHashes, snapshots: string[]) {
    return createHash('sha256').update(JSON.stringify([row.id, row.seed, row.created_at, row.config_version, row.now,
      row.revision, metadata, hashes.commandHash, hashes.eventHash, snapshots])).update('\0').update(row.projection).digest('hex');
  }
  private saveCheckpoint(id: string, checkpoint: EngineCheckpoint, hashes: HistoryHashes) {
    const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow, metadata = JSON.stringify(checkpoint);
    const digest = this.checkpointDigest(row, metadata, hashes, checkpoint.configVersions.map(v => this.configSnapshot(v)));
    this.db.prepare(`INSERT INTO engine_checkpoints VALUES (?,?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET
      revision=excluded.revision,metadata=excluded.metadata,command_hash=excluded.command_hash,event_hash=excluded.event_hash,digest=excluded.digest`)
      .run(id, row.revision, metadata, hashes.commandHash, hashes.eventHash, digest);
  }
  // ponytail: verify/parse full history on cold load; add bounded verified chunks if measured I/O becomes the next bottleneck.
  private hydrate(row: PlayerRow): LiveGame {
    const cached = this.cache.get(row.id);
    if (cached?.revision === row.revision) return cached;
    const hashes = { commandHash: EMPTY_HASH, eventHash: EMPTY_HASH };
    const log = this.db.prepare('SELECT seq,idempotency_key,entry FROM commands WHERE player_id=? ORDER BY seq').all(row.id).map((record, index) => {
      if (record.seq !== index + 1) throw Error('store:commandSequence');
      const entry = JSON.parse(String(record.entry)) as LoggedCommand;
      if (entry.idempotencyKey !== record.idempotency_key) throw Error('store:commandSequence');
      hashes.commandHash = historyHash(hashes.commandHash, entry.idempotencyKey, String(record.entry)); return entry;
    });
    const events = this.db.prepare('SELECT seq,event_id,payload FROM events WHERE player_id=? ORDER BY seq').all(row.id).map((record, index) => {
      if (record.seq !== index + 1) throw Error('store:eventSequence');
      const event = JSON.parse(String(record.payload)) as DomainEvent;
      if (event.id !== record.event_id) throw Error('store:eventSequence');
      hashes.eventHash = historyHash(hashes.eventHash, event.id, String(record.payload)); return event;
    });
    const checkpoint = this.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get(row.id);
    if (checkpoint) {
      const metadata = JSON.parse(String(checkpoint.metadata)) as EngineCheckpoint;
      if (!Array.isArray(metadata?.configVersions) || metadata.configVersions[0] !== row.config_version ||
          checkpoint.revision !== row.revision || checkpoint.command_hash !== hashes.commandHash || checkpoint.event_hash !== hashes.eventHash) throw Error('store:checkpointMismatch');
      const snapshots = metadata.configVersions.map(v => this.configSnapshot(v));
      if (checkpoint.digest !== this.checkpointDigest(row, String(checkpoint.metadata), hashes, snapshots)) throw Error('store:checkpointMismatch');
      const world = { ...JSON.parse(row.projection), events } as World;
      if (world.playerId !== row.id || world.now !== row.now) throw Error('store:checkpointMismatch');
      return { ...hashes, checkpointable: true, game: Game.restoreTrusted(snapshots.map(s => loadConfig(JSON.parse(s))),
        { seed: row.seed, createdAt: row.created_at, world, log }, metadata) };
    }
    const load = (version: string) => JSON.parse(this.configSnapshot(version));
    const configs = [...new Set(log.map(entry => entry.configVersion))].filter(version => version !== row.config_version).map(load);
    const game = decodeSave(JSON.stringify({ version: configs.length ? 3 : 2, seed: row.seed, createdAt: row.created_at, playerId: row.id,
      config: load(row.config_version), ...(configs.length ? { configs } : {}), log, events, now: row.now })); // config-exempt: existing save codec format revisions
    if (projection(game.world) !== row.projection) throw Error('store:projectionMismatch');
    // Historical additive replay may enrich old row fields. Keep that replay path until an explicit history migration exists.
    return { game, ...hashes, checkpointable: isDeepStrictEqual(log, game.log) && isDeepStrictEqual(events, game.world.events) };
  }
  private appendHistory(id: string, log: readonly LoggedCommand[], events: readonly DomainEvent[], logStart = 0, eventStart = 0,
    previous: HistoryHashes = { commandHash: EMPTY_HASH, eventHash: EMPTY_HASH }): HistoryHashes {
    const hashes = { commandHash: previous.commandHash, eventHash: previous.eventHash };
    const command = this.db.prepare('INSERT INTO commands VALUES (?,?,?,?)');
    for (let i = logStart; i < log.length; i++) {
      const text = JSON.stringify(log[i]); command.run(id, i + 1, log[i].idempotencyKey, text);
      hashes.commandHash = historyHash(hashes.commandHash, log[i].idempotencyKey, text);
    }
    const event = this.db.prepare('INSERT INTO events VALUES (?,?,?,?)');
    for (let i = eventStart; i < events.length; i++) {
      const text = JSON.stringify(events[i]); event.run(id, i + 1, events[i].id, text);
      hashes.eventHash = historyHash(hashes.eventHash, events[i].id, text);
    }
    return hashes;
  }
  private operate<T>(id: string, action: (game: Game, now: number) => T): Snapshot & { result: T } {
    if (!validPlayerId(id)) throw Error('store:invalidPlayer');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow | undefined;
      if (!row) throw Error('store:playerMissing');
      const state = this.hydrate(row), { game } = state, logStart = game.log.length, eventStart = game.world.events.length, now = this.now();
      if (now < game.world.now) throw Error('store:clockBackwards');
      this.expirePresence(id, game, now);
      // Even a retry returns the latest autonomous state, but its original command result.
      game.catchUp(now);
      const result = action(game, now);
      const changed = now !== row.now || game.log.length !== logStart || game.world.events.length !== eventStart;
      const revision = row.revision + Number(changed);
      if (!Number.isSafeInteger(revision)) throw Error('store:revisionOverflow');
      if (changed) {
        for (const config of game.configs) this.registerConfig(config);
        Object.assign(state, this.appendHistory(id, game.log, game.world.events, logStart, eventStart, state));
        this.db.prepare('UPDATE players SET now=?,revision=?,projection=? WHERE id=?').run(game.world.now, revision, projection(game.world), id);
      }
      if (state.checkpointable && (changed || !this.db.prepare('SELECT 1 FROM engine_checkpoints WHERE player_id=?').get(id))) this.saveCheckpoint(id, game.checkpoint(), state);
      this.db.exec('COMMIT'); this.remember(id, revision, state);
      return { ...this.snapshot(game, revision), result };
    } catch (error) {
      this.cache.delete(id);
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  read(id: string): Snapshot { const { result: _, ...state } = this.operate(id, () => undefined); return state; }
  /** Detached integrity-checked snapshot for internal simulations; never a client checkpoint. */
  fork(id: string): Game {
    this.db.exec('BEGIN');
    try {
      const row = this.db.prepare('SELECT * FROM players WHERE id=?').get(id) as PlayerRow | undefined;
      if (!row) throw Error('store:playerMissing');
      const { game } = this.hydrate(row);
      const fork = Game.restoreTrusted(game.configs, structuredClone({ seed: game.seed, createdAt: game.createdAt, world: game.world, log: game.log }), game.checkpoint());
      this.db.exec('COMMIT'); return fork;
    } catch(error) { if(this.db.isTransaction)this.db.exec('ROLLBACK'); throw error; }
  }
  get serverNow() { return this.now(); }
  private commandEntry(id: string, key: string) {
    const row = this.db.prepare('SELECT entry FROM commands WHERE player_id=? AND idempotency_key=?').get(id, key);
    return row ? JSON.parse(String(row.entry)) as LoggedCommand : undefined;
  }
  private execute(game: Game, id: string, request: Request, now: number) {
    const previous = this.commandEntry(id, request.idempotencyKey)?.command;
    // JSON member order is not command identity; retain the original engine payload on an equal retry.
    const command = previous && isDeepStrictEqual(previous, request.command) ? previous as Command : request.command;
    return game.command({ idempotencyKey: request.idempotencyKey, command, at: now }, request.command.type === 'startShift' && !previous ? this.registry.resolve(id, now) : undefined);
  }
  command(id: string, request: Request) {
    if (!validEnvelope({ ...request, at: 0 })) throw Error('store:invalidCommand');
    return this.operate(id, (game, now) => this.managed(id) ? { ok: false, reason: 'heartbeatRequired' } : this.execute(game, id, request, now));
  }
  private stream(id: string, clientId: string) {
    if (typeof clientId !== 'string' || !this.db.prepare('SELECT id FROM client_streams WHERE id=? AND player_id=?').get(clientId, id)) throw Error('store:invalidClient');
    return Number(this.db.prepare('SELECT COALESCE(MAX(client_seq),0) AS seq FROM client_receipts WHERE client_id=?').get(clientId)!.seq);
  }
  connect(id: string, clientId?: string) {
    const { result, ...state } = this.operate(id, (_, now) => {
      if (clientId !== undefined) return { clientId, acknowledgedSeq: this.stream(id, clientId),
        heartbeatSeq: Number(this.db.prepare('SELECT beat_seq FROM client_presence WHERE client_id=?').get(clientId)?.beat_seq ?? 0) };
      const created = randomUUID();
      this.db.prepare('INSERT INTO client_streams VALUES (?,?,?)').run(created, id, now);
      return { clientId: created, acknowledgedSeq: 0, heartbeatSeq: 0 };
    });
    return { ...state, ...result };
  }
  clientCommand(id: string, request: SequencedRequest, token?: string) {
    if (!validEnvelope({ ...request, at: 0 }) || !Number.isSafeInteger(request.clientSeq) || request.clientSeq < 1) throw Error('store:invalidCommand');
    const { result, ...state } = this.operate(id, (game, now) => {
      const acknowledgedSeq = this.stream(id, request.clientId), previous = this.commandEntry(id, request.idempotencyKey);
      if (token !== undefined || this.managed(id)) {
        const session = token && this.session(token), hash = token && sessionHash(token);
        if (!session || session.playerId !== id || !this.db.prepare('SELECT 1 FROM client_presence WHERE client_id=? AND session_hash=? AND live=1').get(request.clientId, hash!)) {
          return { clientId: request.clientId, acknowledgedSeq, error: 'heartbeatRequired' };
        }
        if (request.command.type === 'activity') return { clientId: request.clientId, acknowledgedSeq, error: 'presenceManaged' };
      }
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
  private managed(id: string) { return !!this.db.prepare('SELECT 1 FROM client_presence WHERE player_id=? LIMIT 1').get(id); }
  private syncPresence(id: string, game: Game, at: number) {
    game.catchUp(at); // The old presence applies up to the transition, including a shift finishing before loss.
    const row = this.db.prepare('SELECT COUNT(*) AS views,COALESCE(MAX(active),0) AS active,COALESCE(MAX(paused),0) AS paused FROM client_presence WHERE player_id=? AND live=1').get(id)!;
    const active = !!row.active, paused = !!row.paused;
    const result = !row.views ? game.disconnect(at, game.world.phase === 'resting' ? null : game.world.shift!.id, randomUUID())
      : active !== game.world.active || paused !== !!game.world.paused || game.world.disconnection && !game.world.disconnection.timedOut
        ? game.reconnect(at, randomUUID(), active, paused) : undefined;
    if (result && !result.ok) throw Error(`store:presence:${result.reason}`);
  }
  private expirePresence(id: string, game: Game, now: number) {
    const deadlines = this.db.prepare(`SELECT DISTINCT ${presenceExpiry} AS expiry FROM client_presence p JOIN sessions s ON s.token_hash=p.session_hash
      WHERE p.player_id=? AND p.live=1 AND ${presenceExpiry}<=? ORDER BY expiry`).all(id, now);
    for (const row of deadlines) {
      const at = Number(row.expiry);
      if (at < game.world.now) throw Error('store:presenceClock');
      this.db.prepare(`UPDATE client_presence SET live=0 WHERE client_id IN (SELECT p.client_id FROM client_presence p JOIN sessions s ON s.token_hash=p.session_hash
        WHERE p.player_id=? AND p.live=1 AND ${presenceExpiry}<=?)`).run(id, at);
      this.syncPresence(id, game, at);
    }
  }
  heartbeat(token: string, request: Heartbeat) {
    if (!request || typeof request.clientId !== 'string' || !request.clientId || request.clientId.length > 128 || // config-exempt: transport identifier bound
        !Number.isSafeInteger(request.beatSeq) || request.beatSeq < 1 || typeof request.active !== 'boolean' || typeof request.paused !== 'boolean') throw Error('store:invalidHeartbeat');
    const owner = this.session(token); if (!owner) throw Error('store:invalidSession');
    const { result, ...state } = this.operate(owner.playerId, (game, now) => {
      const session = this.session(token); if (!session || session.playerId !== owner.playerId) throw Error('store:invalidSession');
      this.stream(owner.playerId, request.clientId);
      const timing = heartbeatTiming(game.config), hash = sessionHash(token)!;
      const previous = this.db.prepare('SELECT * FROM client_presence WHERE client_id=?').get(request.clientId);
      if (previous && request.beatSeq <= Number(previous.beat_seq)) {
        const identical = request.beatSeq === previous.beat_seq && hash === previous.session_hash && Number(request.active) === previous.active && Number(request.paused) === previous.paused;
        return { ...timing, heartbeatSeq: Number(previous.beat_seq), heartbeatUntil: Number(previous.until),
          duplicate: identical, error: identical ? undefined : 'heartbeatStale' };
      }
      const until = Math.min(now + timing.heartbeatTimeoutMs, session.expiresAt);
      if (!Number.isSafeInteger(until) || until <= now) throw Error('store:heartbeatClock');
      this.db.prepare(`INSERT INTO client_presence VALUES (?,?,?,?,?,?,?,1) ON CONFLICT(client_id) DO UPDATE SET
        session_hash=excluded.session_hash,beat_seq=excluded.beat_seq,until=excluded.until,active=excluded.active,paused=excluded.paused,live=1`)
        .run(request.clientId, owner.playerId, hash, request.beatSeq, until, Number(request.active), Number(request.paused));
      this.syncPresence(owner.playerId, game, now);
      return { ...timing, heartbeatSeq: request.beatSeq, heartbeatUntil: until, duplicate: false, error: undefined };
    });
    return { ...state, ...result, clientId: request.clientId };
  }
  get heartbeatIntervalMs() {
    const now = this.now(), interval = heartbeatTiming(this.registry.active(now)).heartbeatIntervalMs;
    const next = this.db.prepare(`SELECT MIN(${presenceExpiry}) AS at FROM client_presence p JOIN sessions s
      ON s.token_hash=p.session_hash WHERE p.live=1`).get()?.at;
    return next === null || next === undefined ? interval : Math.max(1, Math.min(interval, Number(next) - now)); // config-exempt: native timer requires a positive delay
  }
  /** ponytail: single-host due-player scan; shard scheduling only when measured load requires it. */
  sweepPresence() {
    const due = this.db.prepare(`SELECT DISTINCT p.player_id FROM client_presence p JOIN sessions s ON s.token_hash=p.session_hash
      JOIN players w ON w.id=p.player_id WHERE (p.live=1 AND ${presenceExpiry}<=?) OR json_extract(w.projection,'$.disconnection') IS NOT NULL`).all(this.now());
    const errors: { playerId: string; error: string }[] = [];
    for (const row of due) {
      const playerId = String(row.player_id);
      try { this.read(playerId); } catch (error) { errors.push({ playerId, error: error instanceof Error ? error.message : 'store:presenceError' }); }
    }
    return errors;
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
