import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import { configContent, dayKey, loadConfig, type Config } from '@tbh/engine';
import { validGoogleSubject } from './google';
import { rankSettings } from './leaderboard';

// These are authenticated server claims, NOT a public request body. HTTP adapters must derive them.
export type AdminActor = { subject: string; role: 'super' | 'economy' | 'game' | 'support' | 'viewer'; mfa: boolean; issuedAt: number; expiresAt: number };
export type ConfigPhase = 'draft' | 'approved' | 'scheduled' | 'active' | 'archived' | 'snapshot';
type Effective = 'immediate' | 'next_shift' | 'next_day' | 'next_season';
type Tier = 'A' | 'B' | 'C';
export type ConfigScope = { kind: 'segment' | 'campaign' | 'player'; id: string; playerIds: string[]; priority: number; expiresAt: number | null; previousVersion: string | null; ticketId: string | null };
export type ProposalInput = { key: string; baseVersion: string; snapshot: unknown; reason: string; effective?: Effective; scope?: ConfigScope; emergency?: boolean };
type Proposal = { version: string; request_key: string; base_version: string; fingerprint: string; changed_by: string;
  keys: string; reason: string; effective: Effective; created_at: number };
type PreviewPublication = Publication & { scope?: ConfigScope };
type Publication = { seq: number; version: string; effective_at: number; published_at: number; changed_by: string; approved_by: string };
export type SupersededSchedule = { version: string; effectiveAt: number; keys: string[]; proposer: string; approver: string };
export type EmergencyTicket = { version: string; publishedBy: string; dueAt: number; at: number };
export type EmergencyReview = { version: string; reviewedBy: string; reason: string; at: number };
const emergencyDraft = (draft: Proposal) => JSON.parse(draft.fingerprint).emergency === true;
export const ADMIN_SESSION_MS = 28800000; // config-exempt:BRD9.2 eight-hour admin authentication limit
export function assertAdminActor(actor: AdminActor, now: number) {
  if (!actor || !validGoogleSubject(actor.subject) || !['super', 'economy', 'game', 'support', 'viewer'].includes(actor.role) ||
    !Number.isSafeInteger(actor.issuedAt) || actor.issuedAt < 0 || !Number.isSafeInteger(actor.expiresAt) || actor.issuedAt > now || actor.expiresAt <= now ||
    actor.expiresAt - actor.issuedAt > ADMIN_SESSION_MS || typeof actor.mfa !== 'boolean' ||
    (actor.role === 'super' || actor.role === 'game') && !actor.mfa) throw Error('registry:invalidActor');
}
const DAY_MS = 86400000, PUBLISH_PER_DAY = 5; // config-exempt: calendar units and admin authentication/abuse limits (BRD9.2/9.4), not gameplay tuning
const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '.');
export function heartbeatTiming(config: Config) {
  const timeoutMs = config.values.network.reconnectingUiDelayMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 2 || timeoutMs > 2147483647) throw Error('store:heartbeatClock'); // config-exempt: two distinguishable tick instants and native signed32 timer limit
  return { heartbeatTimeoutMs: timeoutMs, heartbeatIntervalMs: Math.floor(timeoutMs / 2) }; // config-exempt: two heartbeat opportunities per configured detection window
}
function changedPaths(a: unknown, b: unknown, path = ''): string[] {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(key => changedPaths(
      (a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
  }
  return [path];
}
export function registryPolicy(keys: string[], c: Config, scope?: ConfigScope['kind']) {
  const g = c.raw._meta.governance, tierFor = (key: string): Tier => {
    if (g.tiers.A.featureFlags.some(p => under(key, p))) return 'A';
    for (const tier of ['A', 'B', 'C'] as const) if (g.tiers[tier].sections.some(p => under(key, p))) return tier;
    throw Error('registry:ungovernedKey');
  };
  const tiers = keys.map(tierFor), tier = (['A', 'B', 'C'] as const).find(t => tiers.includes(t))!;
  const superOnly = keys.some(k => ['lottery', 'shopSeason', 'donation', 'cosmetics.donationTiersVnd', ...g.tiers.A.featureFlags].some(p => under(k, p)));
  const modes: Effective[] = keys.map(k => scope === 'campaign' && under(k, 'entitlements') ? 'immediate'
    : ['league', 'lifePath', 'ledgers'].some(p => under(k, p)) || under(k, 'leaderboard') && !['leaderboard.topN', 'leaderboard.refreshMs', 'leaderboard.displayNameFilter'].includes(k) ? 'next_season'
    : tierFor(k) === 'A' || under(k, 'risk') || under(k, 'locations') ? 'next_day' : tierFor(k) === 'B' ? 'next_shift' : 'immediate');
  const effective = (['next_season', 'next_day', 'next_shift', 'immediate'] as const).find(mode => modes.includes(mode))!;
  return { tier, tiers, superOnly, effective, modes };
}
function activation(now: number, effective: Effective, c: Config): number {
  if (effective === 'immediate' || effective === 'next_shift') return now;
  if (effective === 'next_day') return Date.parse(`${dayKey(now, c)}T00:00:00+07:00`) + DAY_MS; // config-exempt: VN calendar offset, no DST
  const { ranking, contest, epochUtc } = c.values.league.seasons;
  let a = ranking.days, b = contest.days;
  while (b) [a, b] = [b, a % b];
  const duration = ranking.days / a * contest.days * DAY_MS, epoch = Date.parse(epochUtc);
  const at = epoch + (Math.floor((now - epoch) / duration) + 1) * duration;
  if (!Number.isSafeInteger(duration) || !Number.isSafeInteger(at) || at <= now || !Number.isFinite(new Date(at).getTime())) throw Error('registry:unsafeSchedule');
  return at;
}
function scheduledAt(now: number, mode: Effective, policy: ReturnType<typeof registryPolicy>, c: Config) {
  const floor = Math.max(...policy.modes.map(m => activation(now, m, c))), at = activation(now, mode, c);
  // A mixed season/day change must wait for a common season boundary after BOTH restrictions.
  if (at < floor && mode === 'next_season') return activation(floor - 1, mode, c);
  if (at < floor) throw Error('registry:earlyActivation');
  return at;
}
export function initializeRegistry(db: DatabaseSync, seed: Config, now: number) {
  db.exec(`CREATE TABLE registry_proposals (version TEXT PRIMARY KEY REFERENCES configs(version), request_key TEXT NOT NULL,
    base_version TEXT NOT NULL REFERENCES configs(version), fingerprint TEXT NOT NULL, changed_by TEXT NOT NULL,
    keys TEXT NOT NULL, reason TEXT NOT NULL, effective TEXT NOT NULL, created_at INTEGER NOT NULL,
    UNIQUE(changed_by,request_key)) STRICT;
    CREATE TABLE registry_approvals (version TEXT PRIMARY KEY REFERENCES registry_proposals(version),
      approved_by TEXT NOT NULL, approved_at INTEGER NOT NULL) STRICT;
    CREATE TABLE registry_publications (seq INTEGER PRIMARY KEY, version TEXT NOT NULL UNIQUE REFERENCES configs(version),
      effective_at INTEGER NOT NULL, published_at INTEGER NOT NULL, changed_by TEXT NOT NULL, approved_by TEXT NOT NULL) STRICT;
    CREATE TABLE registry_audit (seq INTEGER PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL) STRICT;`);
  for (const table of ['registry_proposals', 'registry_approvals', 'registry_publications', 'registry_audit']) {
    for (const action of ['UPDATE', 'DELETE']) db.exec(`CREATE TRIGGER ${table}_${action.toLowerCase()} BEFORE ${action} ON ${table}
      BEGIN SELECT RAISE(ABORT,'registry:appendOnly'); END;`);
  }
  db.prepare('INSERT INTO registry_publications VALUES (NULL,?,0,?,?,?)').run(seed.version, now, 'system:seed', 'system:seed');
  db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run('ConfigSeeded', JSON.stringify({ version: seed.version, at: now }));
}

export function initializeScopes(db: DatabaseSync) {
  db.exec(`CREATE TABLE registry_scopes (version TEXT PRIMARY KEY REFERENCES registry_proposals(version), scope TEXT NOT NULL) STRICT;
    CREATE TABLE registry_support (id TEXT PRIMARY KEY, request_key TEXT NOT NULL, player_id TEXT NOT NULL REFERENCES players(id),
      reason TEXT NOT NULL, requested_by TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(requested_by,request_key)) STRICT;
    CREATE TABLE registry_support_uses (ticket_id TEXT PRIMARY KEY REFERENCES registry_support(id),
      version TEXT NOT NULL UNIQUE REFERENCES registry_publications(version)) STRICT;
    CREATE TABLE registry_resolutions (version TEXT PRIMARY KEY REFERENCES configs(version), sources TEXT NOT NULL) STRICT;`);
  for (const table of ['registry_scopes', 'registry_support', 'registry_support_uses', 'registry_resolutions']) {
    for (const action of ['UPDATE', 'DELETE']) db.exec(`CREATE TRIGGER ${table}_${action.toLowerCase()} BEFORE ${action} ON ${table}
      BEGIN SELECT RAISE(ABORT,'registry:appendOnly'); END;`);
  }
}
/** Separate from registry_publications so that table's insert-only trigger never needs an exception:
 * this table alone allows exactly one 'pending' -> ('admitted'|'refused') transition, then is immutable too.
 * Every publication that predates this migration is grandfathered as 'admitted' on its own declared k.value --
 * it was already live/trusted under the old self-report-only regime; this must not regress an existing deploy. */
export function initializeMeasurements(db: DatabaseSync, now: number) {
  db.exec(`CREATE TABLE registry_measurements (version TEXT PRIMARY KEY REFERENCES registry_publications(version),
    state TEXT NOT NULL CHECK(state IN ('pending','admitted','refused')), measured_k REAL, measured_at INTEGER) STRICT;
    CREATE TRIGGER registry_measurements_update BEFORE UPDATE ON registry_measurements
      WHEN NOT (OLD.state='pending' AND NEW.version=OLD.version AND NEW.state IN ('admitted','refused') AND NEW.measured_k IS NOT NULL AND NEW.measured_at IS NOT NULL)
      BEGIN SELECT RAISE(ABORT,'registry:appendOnly'); END;
    CREATE TRIGGER registry_measurements_delete BEFORE DELETE ON registry_measurements BEGIN SELECT RAISE(ABORT,'registry:appendOnly'); END;`);
  const insert = db.prepare("INSERT INTO registry_measurements VALUES (?,'admitted',?,?)");
  for (const row of db.prepare('SELECT version FROM registry_publications').all()) {
    const snapshot = JSON.parse(String(db.prepare('SELECT snapshot FROM configs WHERE version=?').get(row.version)!.snapshot));
    insert.run(String(row.version), Number(snapshot.k.value), now);
  }
}
function patch(raw: Config['raw'], source: Config['raw'], keys: string[]) {
  for (const key of keys) {
    const parts = key.split('.');
    if (parts.some(p => ['__proto__', 'prototype', 'constructor'].includes(p))) throw Error('registry:invalidKeys');
    let target = raw as unknown as Record<string, unknown>, value = source as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      value = value?.[part] as Record<string, unknown>;
      if (!target[part] || typeof target[part] !== 'object') target[part] = {};
      target = target[part] as Record<string, unknown>;
    }
    const last = parts.at(-1)!;
    if (value && Object.hasOwn(value, last)) target[last] = structuredClone(value[last]); else delete target[last];
  }
}

// Injected so registry.ts never spawns a Worker/sim itself: production wires the forecast worker (async, 9-18s);
// tests wire a cheap sync stub. Defaulting to the candidate's own declared k.value reproduces today's
// self-report admission exactly for any caller that never overrides it.
export type MeasureK = (config: Config, version: string, actor: AdminActor) => number | Promise<number>;

/** Shared internal service. No HTTP endpoint accepts AdminActor; the admin-auth adapter is a separate boundary. */
export class ConfigRegistry {
  private readonly configs = new Map<string, Config>();
  private readonly settling = new Map<string, Promise<void>>();
  constructor(private readonly db: DatabaseSync, private readonly clock: () => number,
    private readonly measureK: MeasureK = config => config.values.k.value) {}
  private now() {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now).getTime())) throw Error('registry:invalidClock');
    return now;
  }
  private transaction<T>(action: (now: number) => T, readOnly = false): T {
    if (readOnly && this.db.isTransaction) return action(this.now());
    this.db.exec(readOnly ? 'BEGIN' : 'BEGIN IMMEDIATE');
    try { const value = action(this.now()); this.db.exec('COMMIT'); return value; }
    catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  config(version: string): Config {
    let config = this.configs.get(version);
    if (!config) {
      const row = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(version);
      if (!row) throw Error('registry:missingVersion');
      config = loadConfig(JSON.parse(String(row.snapshot))); this.configs.set(version, config);
      if (this.configs.size > 64) this.configs.delete(this.configs.keys().next().value!); // config-exempt: bounded immutable process cache
    }
    return config;
  }
  // A publication only counts once its measurement is admitted -- a pending/refused row is invisible here,
  // so the previous admitted version keeps serving; there is no window where an unmeasured/bad config is live.
  private readonly ADMITTED = "version IN (SELECT version FROM registry_measurements WHERE state='admitted')";
  latest() { return this.db.prepare(`SELECT * FROM registry_publications WHERE version NOT IN (SELECT version FROM registry_scopes) AND ${this.ADMITTED} ORDER BY seq DESC LIMIT 1`).get() as Publication; }
  active(now = this.now()) {
    const row = this.db.prepare(`SELECT version FROM registry_publications WHERE effective_at<=? AND version NOT IN (SELECT version FROM registry_scopes) AND ${this.ADMITTED} ORDER BY seq DESC LIMIT 1`).get(now);
    if (!row) throw Error('registry:missingActive');
    return this.config(String(row.version));
  }
  private validate(original: Config, base: Config) {
    heartbeatTiming(original);
    const seedVersion = this.db.prepare('SELECT version FROM registry_publications ORDER BY seq LIMIT 1').get()!.version;
    const seed = this.config(String(seedVersion));
    if (original.values.shift.dayRollover.tz !== seed.values.shift.dayRollover.tz || original.values.k.value < seed.values.k.band[0] || original.values.k.value > seed.values.k.band[1]) throw Error('registry:bindingRange');
    const identities = (c: Config) => [c.raw.league.tiers.map(t => t.id),
      c.raw.locations.list.map(l => l.id).sort(), c.raw.locations.fallback];
    // These identifiers are persisted in careers. Tuning numbers cannot migrate their meaning.
    if (!isDeepStrictEqual(identities(seed), identities(original))) throw Error('registry:identityMigrationRequired');
    const metadata = (c: Config) => ({ ...c.raw._meta, version: '', date: '' });
    if (!isDeepStrictEqual(metadata(base), metadata(original))) throw Error('registry:metadataImmutable');
  }
  private validateAdmission(original: Config, base: Config) {
    this.validate(original, base);
    rankSettings(original);
    // Replay accepts older snapshots; new proposals cannot delete an installed threshold group.
    if ('leaveProgress' in base.raw.onboarding.loginPrompt && !('leaveProgress' in original.raw.onboarding.loginPrompt)) throw Error('config:onboarding.loginPrompt:keys');
  }
  private scope(version: string): ConfigScope | undefined {
    const row = this.db.prepare('SELECT scope FROM registry_scopes WHERE version=?').get(version);
    return row ? JSON.parse(String(row.scope)) : undefined;
  }
  private scopedPublications() {
    // ponytail: scan admin publication history; index scope/effective boundaries if this catalog becomes large.
    // Same admitted-only gate as active()/latest(): a pending/refused scoped override must never compose
    // into a real player's resolved config (codex round 1 finding -- this was the actual bypass).
    return this.db.prepare(`SELECT p.*,s.scope FROM registry_publications p JOIN registry_scopes s USING(version) WHERE ${this.ADMITTED} ORDER BY seq`).all()
      .map(r => ({ ...r, scope: JSON.parse(String(r.scope)) as ConfigScope })) as (Publication & { scope: ConfigScope })[];
  }
  private predecessor(scope: ConfigScope) {
    return this.scopedPublications().filter(p => p.scope.kind === scope.kind && p.scope.id === scope.id).at(-1);
  }
  private normalizeScope(scope: ConfigScope | undefined): ConfigScope | undefined {
    if (scope === undefined) return undefined;
    if (!scope || !['segment', 'campaign', 'player'].includes(scope.kind) || typeof scope.id !== 'string' || !scope.id.trim() || scope.id.length > 128 ||
      !Array.isArray(scope.playerIds) || !scope.playerIds.length || scope.playerIds.some(id => typeof id !== 'string' || !this.db.prepare('SELECT 1 FROM players WHERE id=?').get(id)) ||
      new Set(scope.playerIds).size !== scope.playerIds.length || !Number.isSafeInteger(scope.priority) ||
      scope.previousVersion !== null && typeof scope.previousVersion !== 'string' ||
      scope.ticketId !== null && typeof scope.ticketId !== 'string' ||
      scope.expiresAt !== null && (!Number.isSafeInteger(scope.expiresAt) || !Number.isFinite(new Date(scope.expiresAt).getTime())) ||
      scope.kind !== 'segment' && scope.expiresAt === null) throw Error('registry:invalidScope'); // config-exempt:identity protocol bound
    if (scope.kind === 'player' ? scope.playerIds.length !== 1 || scope.playerIds[0] !== scope.id || scope.priority !== 0 || !scope.ticketId : scope.ticketId !== null) throw Error('registry:invalidScope');
    return { kind: scope.kind, id: scope.id, playerIds: [...scope.playerIds].sort(), priority: scope.priority,
      expiresAt: scope.expiresAt, previousVersion: scope.previousVersion, ticketId: scope.ticketId };
  }
  private policy(keys: string[], base: Config, scope?: ConfigScope, emergencyAt?: number) {
    // Replacing an entry also removes its old keys/audience: that removal keeps their approval and scheduling policy.
    const prior = scope?.previousVersion ? JSON.parse(this.proposal(scope.previousVersion).keys) as string[] : [];
    const displaced = emergencyAt === undefined ? [] : scope
      ? this.emergencyScopeReplacements(scope, emergencyAt).flatMap(p => JSON.parse(this.proposal(p.version).keys) as string[])
      : this.pendingSchedules(undefined, emergencyAt).flatMap(p => p.keys);
    const governed = [...new Set([...keys, ...prior, ...displaced])];
    if (!governed.length) throw Error('registry:invalidKeys');
    return registryPolicy(governed, base, scope?.kind);
  }
  private currentBase(draft: { base_version: string }, scope?: ConfigScope, emergency = false, now = this.now()) {
    if ((emergency ? this.active(now).version : this.latest().version) !== draft.base_version || scope && (this.predecessor(scope)?.version ?? null) !== scope.previousVersion) throw Error('registry:staleBase');
  }
  private supportAvailable(scope: ConfigScope) {
    const ticket = this.db.prepare('SELECT player_id FROM registry_support WHERE id=?').get(scope.ticketId!);
    if (!ticket || ticket.player_id !== scope.id || this.db.prepare('SELECT 1 FROM registry_support_uses WHERE ticket_id=?').get(scope.ticketId!)) throw Error('registry:invalidTicket');
  }
  requestSupport(actor: AdminActor, input: { key: string; playerId: string; reason: string }) {
    return this.transaction(now => {
      this.actor(actor, now);
      if (!['super', 'game', 'support'].includes(actor.role)) throw Error('registry:forbidden');
      if (typeof input?.key !== 'string' || !input.key.trim() || input.key.length > 128 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000 ||
        typeof input.playerId !== 'string' || !this.db.prepare('SELECT 1 FROM players WHERE id=?').get(input.playerId)) throw Error('registry:invalidInput'); // config-exempt:request identity and audit text bounds
      const previous = this.db.prepare('SELECT * FROM registry_support WHERE requested_by=? AND request_key=?').get(actor.subject, input.key);
      if (previous) { if (previous.player_id !== input.playerId || previous.reason !== input.reason) throw Error('registry:keyConflict'); return String(previous.id); }
      const id = `support-${randomUUID()}`;
      this.db.prepare('INSERT INTO registry_support VALUES (?,?,?,?,?,?)').run(id, input.key, input.playerId, input.reason, actor.subject, now);
      this.audit('SupportRequested', { ticketId: id, ...input, requestedBy: actor.subject, at: now }); return id;
    });
  }
  private currentScopes(now: number, candidate?: PreviewPublication) {
    const latest = new Map<string, ReturnType<ConfigRegistry['scopedPublications']>[number]>();
    const entries = this.scopedPublications();
    if (candidate?.scope) entries.push({ ...candidate, scope: candidate.scope });
    for (const entry of entries) if (entry.effective_at <= now) latest.set(JSON.stringify([entry.scope.kind, entry.scope.id]), entry);
    return [...latest.values()].filter(p => p.scope.expiresAt === null || p.scope.expiresAt > now);
  }
  private emergencyScopeReplacements(scope: ConfigScope, now: number) {
    const matches = (p: { scope: ConfigScope }) => p.scope.kind === scope.kind && p.scope.id === scope.id;
    const active = this.currentScopes(now).find(matches)?.version;
    return this.scopedPublications().filter(matches).filter(p => p.version === active || p.effective_at > now && !this.supersededBy(p.version));
  }
  private affectedPlayers(version: string, now: number) {
    const scope = this.scope(version);
    if (!scope) return this.db.prepare('SELECT id FROM players ORDER BY id').all().map(p => String(p.id));
    const previous = scope.previousVersion ? this.scope(scope.previousVersion)?.playerIds ?? [] : [];
    const displaced = emergencyDraft(this.proposal(version)) ? this.emergencyScopeReplacements(scope, now).flatMap(p => p.scope.playerIds) : [];
    return [...new Set([...scope.playerIds, ...previous, ...displaced])].sort();
  }
  private compose(playerId: string, now: number, candidate?: PreviewPublication): { config: Config; sources: string[] } {
    const base = candidate && !candidate.scope && candidate.effective_at <= now ? this.config(candidate.version) : this.active(now);
    const rank = { segment: 0, campaign: 1, player: 2 };
    const selected = this.currentScopes(now, candidate).filter(p => p.scope.playerIds.includes(playerId))
      .sort((a, b) => rank[a.scope.kind] - rank[b.scope.kind] || a.scope.priority - b.scope.priority || a.seq - b.seq);
    if (!selected.length) return { config: base, sources: [base.version] };
    const sources = [base.version, ...selected.map(p => p.version)], raw = structuredClone(base.raw);
    for (let i = 0; i < selected.length; i++) {
      const entry = selected[i], source = this.config(entry.version).raw, keys = JSON.parse(this.proposal(entry.version).keys) as string[];
      for (const other of selected.slice(0, i)) if (entry.scope.kind === other.scope.kind && entry.scope.priority === other.scope.priority) {
        const earlier = this.config(other.version).raw, earlierKeys = JSON.parse(this.proposal(other.version).keys) as string[];
        const forward = structuredClone(base.raw), backward = structuredClone(base.raw);
        patch(forward, earlier, earlierKeys); patch(forward, source, keys);
        patch(backward, source, keys); patch(backward, earlier, earlierKeys);
        if (!isDeepStrictEqual(forward, backward)) throw Error('registry:scopeConflict');
      }
      patch(raw, source, keys);
    }
    raw._meta.version = `resolved-${createHash('sha256').update(JSON.stringify(sources)).digest('hex')}`;
    const config = loadConfig(raw); this.validate(config, base); return { config, sources };
  }
  resolve(playerId: string, now = this.now()): Config {
    const action = () => {
      const { config, sources } = this.compose(playerId, now);
      if (sources.length > 1 && !this.db.prepare('SELECT 1 FROM configs WHERE version=?').get(config.version)) {
        this.db.prepare('INSERT INTO configs VALUES (?,?)').run(config.version, JSON.stringify(config.raw));
        this.db.prepare('INSERT INTO registry_resolutions VALUES (?,?)').run(config.version, JSON.stringify(sources));
        this.audit('ConfigResolved', { version: config.version, sources, at: now });
      }
      return config;
    };
    return this.db.isTransaction ? action() : this.transaction(action);
  }
  private validatePublications(now: number, candidate?: PreviewPublication) {
    const entries = this.scopedPublications();
    if (candidate?.scope) entries.push({ ...candidate, scope: candidate.scope });
    const players = new Set(entries.flatMap(p => p.scope.playerIds));
    const boundaries = new Set([now, ...(candidate ? [candidate.effective_at] : []), ...this.db.prepare('SELECT effective_at FROM registry_publications WHERE effective_at>=?').all(now).map(r => Number(r.effective_at)),
      ...entries.flatMap(p => p.scope.expiresAt !== null && p.scope.expiresAt >= now ? [p.scope.expiresAt] : [])]);
    for (const at of boundaries) for (const player of players) this.compose(player, at, candidate);
  }
  private actor(actor: AdminActor, now: number) { assertAdminActor(actor, now); }
  private permit(actor: AdminActor, policy: ReturnType<typeof registryPolicy>, approve = false, scope?: ConfigScope) {
    const priorAudience = scope?.previousVersion ? this.scope(scope.previousVersion)?.playerIds ?? [] : [];
    if (scope?.kind === 'player' || approve && scope && new Set([...scope.playerIds, ...priorAudience]).size > 1) {
      if (actor.role !== 'super') throw Error('registry:forbidden');
    }
    if (!approve && scope?.kind === 'campaign' && actor.role === 'game' && !policy.superOnly) return;
    if (actor.role === 'super') return;
    if (policy.superOnly || approve && policy.tier === 'A' || policy.tiers.some(t => t === 'C' ? actor.role !== 'game' : actor.role !== 'economy')) throw Error('registry:forbidden');
  }
  private audit(type: string, data: object) { this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run(type, JSON.stringify(data)); }
  private auditRecord<T>(type: string, version: string): T | null {
    const row = this.db.prepare("SELECT payload FROM registry_audit WHERE type=? AND json_extract(payload,'$.version')=? ORDER BY seq LIMIT 1").get(type, version);
    return row ? JSON.parse(String(row.payload)) as T : null;
  }
  private emergencyPermit(actor: AdminActor, policy?: ReturnType<typeof registryPolicy>) {
    if (actor.role !== 'super' || !actor.mfa) throw Error('registry:forbidden');
    if (policy?.tiers.some(t => t === 'C')) throw Error('registry:emergencyTier');
  }
  private supersededBy(version: string) {
    return this.auditRecord<{ byVersion: string }>('ConfigScheduleSuperseded', version)?.byVersion ?? null;
  }
  private pendingSchedules(scope: ConfigScope | undefined, now: number): SupersededSchedule[] {
    const rows = this.db.prepare(`SELECT p.*,d.keys FROM registry_publications p JOIN registry_proposals d USING(version)
      WHERE p.effective_at>? ORDER BY p.seq`).all(now);
    return rows.filter(p => {
      const other = this.scope(String(p.version));
      return scope ? other?.kind === scope.kind && other.id === scope.id : !other;
    }).filter(p => !this.supersededBy(String(p.version))).map(p => ({ version: String(p.version), effectiveAt: Number(p.effective_at),
      keys: JSON.parse(String(p.keys)), proposer: String(p.changed_by), approver: String(p.approved_by) }));
  }
  reviewEmergency(actor: AdminActor, version: string, reason: string) {
    return this.transaction(now => {
      this.actor(actor, now); this.emergencyPermit(actor);
      if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw Error('registry:invalidInput'); // config-exempt:audit text bound
      const ticket = this.auditRecord<EmergencyTicket>('ConfigEmergencyReviewOpened', version);
      if (!ticket) throw Error('registry:invalidTicket');
      if ([ticket.publishedBy, this.proposal(version).changed_by].includes(actor.subject)) throw Error('registry:distinctApprover');
      const existing = this.auditRecord<EmergencyReview>('ConfigEmergencyReviewed', version);
      if (existing) {
        if (existing.reviewedBy !== actor.subject || existing.reason !== reason) throw Error('registry:alreadyApproved');
        return existing;
      }
      const review = { version, reviewedBy: actor.subject, reason, at: now };
      this.audit('ConfigEmergencyReviewed', review); return review;
    });
  }
  private rollbackSource(original: Config, baseVersion: string) {
    const known = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(original.version);
    return original.version !== baseVersion && known && configContent(loadConfig(JSON.parse(String(known.snapshot)))) === configContent(original) ? original.version : null;
  }
  private phaseReader(now: number) {
    const active = new Set([this.active(now).version, ...this.currentScopes(now).map(p => p.version)]);
    const row = this.db.prepare(`SELECT p.version AS proposed,a.version AS approved,u.effective_at FROM configs c
      LEFT JOIN registry_proposals p ON p.version=c.version LEFT JOIN registry_approvals a ON a.version=c.version
      LEFT JOIN registry_publications u ON u.version=c.version WHERE c.version=?`);
    return (version: string): ConfigPhase => {
      const record = row.get(version);
      if (!record) throw Error('registry:missingVersion');
      if (this.supersededBy(version)) return 'archived';
      if (record.effective_at !== null) return Number(record.effective_at) > now ? 'scheduled' : active.has(version) ? 'active' : 'archived';
      return record.approved ? 'approved' : record.proposed ? 'draft' : 'snapshot';
    };
  }
  index(actor: AdminActor, before = Number.MAX_SAFE_INTEGER) {
    return this.transaction(now => {
      this.actor(actor, now);
      if (!Number.isSafeInteger(before) || before < 1) throw Error('registry:invalidInput');
      const phase = this.phaseReader(now), latest = this.latest();
      const proposals = this.db.prepare(`SELECT rowid AS cursor,version,base_version,changed_by,keys,reason,effective,created_at
        FROM registry_proposals WHERE rowid<? ORDER BY rowid DESC LIMIT 50`).all(before) as (Omit<Proposal, 'request_key' | 'fingerprint'> & { cursor: number })[]; // config-exempt:admin pagination bound
      return { computedAt: now, latest: { ...latest, phase: phase(latest.version) }, activeVersion: this.active(now).version, proposals: proposals.map(p => ({ ...p, computedAt: now, phase: phase(String(p.version)), scope: this.scope(String(p.version)) ?? null })),
        nextCursor: proposals.length === 50 ? Number(proposals.at(-1)!.cursor) : null }; // config-exempt:admin pagination bound
    }, true);
  }
  details(actor: AdminActor, version: string) {
    return this.transaction(now => {
      this.actor(actor, now);
      const config = this.config(version);
      const draft = this.db.prepare(`SELECT version,base_version,changed_by,keys,reason,effective,created_at
        FROM registry_proposals WHERE version=?`).get(version);
      const approval = this.db.prepare('SELECT approved_by,approved_at FROM registry_approvals WHERE version=?').get(version) ?? null;
      const publication = this.db.prepare('SELECT * FROM registry_publications WHERE version=?').get(version) ?? null;
      const emergency = draft ? emergencyDraft(this.proposal(version)) : false;
      const policy = draft ? this.policy(JSON.parse(String(draft.keys)), this.config(String(draft.base_version)), this.scope(version), emergency && !publication ? now : undefined) : null;
      const permitted = (approve: boolean) => { if (!policy) return false; try { this.permit(actor, policy, approve, this.scope(version)); if (emergency) this.emergencyPermit(actor, policy); return true; } catch { return false; } };
      const scope = this.scope(version), previousVersion = scope?.previousVersion;
      const previous = previousVersion ? { snapshot: this.config(previousVersion).raw, base: this.config(this.proposal(previousVersion).base_version).raw, scope: this.scope(previousVersion)! } : null;
      return { computedAt: now, phase: this.phaseReader(now)(version), emergency, supersededBy: this.supersededBy(version),
        reviewTicket: this.auditRecord<EmergencyTicket>('ConfigEmergencyReviewOpened', version), review: this.auditRecord<EmergencyReview>('ConfigEmergencyReviewed', version), snapshot: config.raw, scope: scope ?? null, previous, draft: draft ?? null,
        permissions: { propose: !['support', 'viewer'].includes(actor.role),
          approve: !emergency && !publication && !approval && permitted(true) && (policy?.tier !== 'A' || draft?.changed_by !== actor.subject),
          publish: !publication && (emergency || !!approval) && permitted(false) },
        base: draft ? this.config(String(draft.base_version)).raw : null,
        policy, approval, publication, measurement: publication ? this.measurementRow(version) ?? null : null };
    }, true);
  }
  auditPage(actor: AdminActor, after = 0) {
    this.actor(actor, this.now());
    if (!Number.isSafeInteger(after) || after < 0) throw Error('registry:invalidInput');
    const events = this.db.prepare('SELECT * FROM registry_audit WHERE seq>? ORDER BY seq LIMIT 50').all(after); // config-exempt:admin audit pagination bound
    return { events: events.map(e => ({ seq: e.seq, type: e.type, data: JSON.parse(String(e.payload)) })),
      nextCursor: events.length ? Number(events.at(-1)!.seq) : after };
  }
  proposal(version: string) {
    const row = this.db.prepare('SELECT * FROM registry_proposals WHERE version=?').get(version) as Proposal | undefined;
    if (!row) throw Error('registry:missingProposal');
    return row;
  }
  propose(actor: AdminActor, input: ProposalInput) {
    return this.transaction(now => {
      this.actor(actor, now);
      if (typeof input?.key !== 'string' || !input.key.trim() || input.key.length > 128 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000) throw Error('registry:invalidInput'); // config-exempt: request identity/audit text bounds
      const base = this.config(input.baseVersion), original = loadConfig(input.snapshot);
      this.validateAdmission(original, base);
      const keys = changedPaths(base.raw, original.raw).filter(k => !under(k, '_meta')).sort();
      if (keys.some(k => under(k, 'prototypePhase0'))) throw Error('registry:invalidKeys');
      const scope = this.normalizeScope(input.scope), policy = this.policy(keys, base, scope); this.permit(actor, policy, false, scope);
      if (input.emergency !== undefined && typeof input.emergency !== 'boolean') throw Error('registry:invalidInput');
      const emergency = input.emergency === true; if (emergency) this.emergencyPermit(actor, policy);
      const effective = input.effective ?? (emergency ? 'immediate' : policy.effective);
      if (emergency && effective !== 'immediate') throw Error('registry:earlyActivation');
      if (!['immediate', 'next_shift', 'next_day', 'next_season'].includes(effective)) throw Error('registry:earlyActivation');
      const fingerprint = JSON.stringify({ baseVersion: input.baseVersion, config: configContent(original), reason: input.reason, effective, ...(emergency ? { emergency: true } : {}), ...(scope ? { scope } : {}) });
      const existing = this.db.prepare('SELECT * FROM registry_proposals WHERE changed_by=? AND request_key=?').get(actor.subject, input.key) as Proposal | undefined;
      if (existing) { if (existing.fingerprint !== fingerprint) throw Error('registry:keyConflict'); return existing; }
      if (emergency) this.emergencyPermit(actor, this.policy(keys, base, scope, now));
      const at = emergency ? now : scheduledAt(now, effective, policy, base);
      if (scope?.expiresAt !== null && scope?.expiresAt !== undefined && scope.expiresAt <= at) throw Error('registry:invalidExpiry');
      this.currentBase({ base_version: input.baseVersion }, scope, emergency, now);
      if (scope?.kind === 'player') this.supportAvailable(scope);
      const version = `registry-${randomUUID()}`, raw = structuredClone(original.raw);
      raw._meta = { ...base.raw._meta, version, date: dayKey(now, base) };
      const snapshot = loadConfig(raw);
      this.db.prepare('INSERT INTO configs VALUES (?,?)').run(version, JSON.stringify(snapshot.raw));
      this.db.prepare('INSERT INTO registry_proposals VALUES (?,?,?,?,?,?,?,?,?)').run(version, input.key, input.baseVersion, fingerprint,
        actor.subject, JSON.stringify(keys), input.reason, effective, now);
      if (scope) this.db.prepare('INSERT INTO registry_scopes VALUES (?,?)').run(version, JSON.stringify(scope));
      this.audit('ConfigProposed', { version, emergency, baseVersion: input.baseVersion, keys, scope: scope ?? null, changedBy: actor.subject, reason: input.reason,
        rollbackVersion: this.rollbackSource(original, base.version), at: now });
      return this.proposal(version);
    });
  }
  approve(actor: AdminActor, version: string) {
    return this.transaction(now => {
      this.actor(actor, now);
      const draft = this.proposal(version), policy = this.policy(JSON.parse(draft.keys), this.config(draft.base_version), this.scope(version));
      if (emergencyDraft(draft)) throw Error('registry:emergencyApproval');
      const scope = this.scope(version); this.permit(actor, policy, true, scope);
      if (policy.tier === 'A' && actor.subject === draft.changed_by) throw Error('registry:distinctApprover');
      const existing = this.db.prepare('SELECT approved_by FROM registry_approvals WHERE version=?').get(version);
      if (existing) { if (existing.approved_by !== actor.subject) throw Error('registry:alreadyApproved'); return draft; }
      this.currentBase(draft, scope);
      if (scope?.kind === 'player') this.supportAvailable(scope);
      this.db.prepare('INSERT INTO registry_approvals VALUES (?,?,?)').run(version, actor.subject, now);
      this.audit('ConfigApproved', { version, approvedBy: actor.subject, at: now }); return draft;
    });
  }
  private publicationAt(draft: Proposal, now: number) {
    const scope = this.scope(draft.version), base = this.config(draft.base_version), policy = this.policy(JSON.parse(draft.keys), base, scope);
    const emergency = emergencyDraft(draft);
    this.currentBase(draft, scope, emergency, now);
    this.validateAdmission(this.config(draft.version), base); // Also fence drafts admitted before a validation fix.
    const latest = scope ? this.predecessor(scope) : this.latest();
    const at = emergency ? now : scheduledAt(now, draft.effective, policy, base);
    if (scope?.expiresAt !== null && scope?.expiresAt !== undefined && scope.expiresAt <= at) throw Error('registry:invalidExpiry');
    if (!emergency && latest && at < latest.effective_at) throw Error('registry:scheduleConflict');
    return at;
  }
  players(actor: AdminActor, after = '') {
    this.actor(actor, this.now());
    if (typeof after !== 'string' || after.length > 128) throw Error('registry:invalidInput'); // config-exempt:identity cursor bound
    const players = this.db.prepare('SELECT id FROM players WHERE id>? ORDER BY id LIMIT 50').all(after); // config-exempt:admin pagination bound
    return { players, nextCursor: players.length === 50 ? String(players.at(-1)!.id) : null }; // config-exempt:admin pagination bound
  }
  supportPage(actor: AdminActor, after = 0) {
    this.actor(actor, this.now());
    if (!['super', 'game', 'support'].includes(actor.role)) throw Error('registry:forbidden');
    if (!Number.isSafeInteger(after) || after < 0) throw Error('registry:invalidInput');
    const tickets = this.db.prepare(`SELECT s.rowid AS cursor,s.*,u.version AS used_version FROM registry_support s
      LEFT JOIN registry_support_uses u ON u.ticket_id=s.id WHERE s.rowid>? ORDER BY s.rowid LIMIT 50`).all(after); // config-exempt:admin pagination bound
    return { tickets, nextCursor: tickets.length === 50 ? Number(tickets.at(-1)!.cursor) : null }; // config-exempt:admin pagination bound
  }
  draftSource(actor: AdminActor, version?: string, emergency = false) {
    const now = this.now(); this.actor(actor, now); if (emergency) this.emergencyPermit(actor);
    const base = emergency ? this.active(now) : this.config(this.latest().version), source = version ? this.config(version) : base;
    if (emergency && version && version !== base.version && !this.currentScopes(now).some(p => p.version === version)) throw Error('registry:inactiveEmergencySource');
    const scope = version ? this.scope(version) : undefined, snapshot = structuredClone(scope ? base.raw : source.raw);
    if (scope) patch(snapshot, source.raw, JSON.parse(this.proposal(version!).keys));
    snapshot._meta = { ...base.raw._meta };
    return { baseVersion: base.version, base: base.raw, snapshot, scope: scope ? { ...scope, previousVersion: this.predecessor(scope)?.version ?? null,
      ticketId: scope.kind === 'player' ? null : scope.ticketId } : null };
  }
  scopeSource(actor: AdminActor, kind: string, id: string, emergency = false) {
    const now = this.now(); this.actor(actor, now); if (emergency) this.emergencyPermit(actor);
    if (!['segment', 'campaign', 'player'].includes(kind) || !id || id.length > 128) throw Error('registry:invalidInput'); // config-exempt:scope identity protocol
    const last = this.scopedPublications().filter(p => p.scope.kind === kind && p.scope.id === id).at(-1);
    if (!last) throw Error('registry:missingScope');
    if (!emergency) return this.draftSource(actor, last.version);
    const active = this.currentScopes(now).find(p => p.scope.kind === kind && p.scope.id === id);
    const source = this.draftSource(actor, active?.version, true);
    return { ...source, scope: { ...(active?.scope ?? last.scope), previousVersion: last.version, ticketId: kind === 'player' ? null : last.scope.ticketId } };
  }
  impact(actor: AdminActor, version: string) {
    return this.transaction(now => { this.actor(actor, now); return this.previewImpact(version, now); });
  }
  private previewPublication(version: string, now: number): PreviewPublication {
      const existing = this.db.prepare('SELECT * FROM registry_publications WHERE version=?').get(version) as Publication | undefined;
      if (existing) {
        // A still-pending measurement means publish() already committed and validated this row once;
        // return the REAL committed shape (no re-schedule, no re-validate) so forecastPlan()/reportFromBackup()
        // can measure it (codex round 1 finding -- this guard made production measurement unreachable).
        // A settled (admitted/refused) version keeps the original terminal guard unchanged.
        if (this.measurementRow(version)?.state !== 'pending') throw Error('registry:alreadyPublished');
        return { ...existing, scope: this.scope(version) };
      }
      const draft = this.proposal(version), scope = this.scope(version), at = this.publicationAt(draft, now);
      const candidate: PreviewPublication = { seq: Number(this.db.prepare('SELECT MAX(seq) AS n FROM registry_publications').get()!.n) + 1,
        version, scope, effective_at: at, published_at: now, changed_by: draft.changed_by, approved_by: 'preview' };
      this.validatePublications(now, candidate);
      return candidate;
  }
  forecastPlan(actor: AdminActor, version: string, through: number) {
    const now = this.now(); this.actor(actor, now);
    if (!Number.isSafeInteger(through) || through <= now) throw Error('registry:invalidInput');
    const candidate = this.previewPublication(version, now), scope = candidate.scope;
    const ids = this.affectedPlayers(version, now);
    const times = [...new Set([now, candidate.effective_at, ...this.db.prepare('SELECT effective_at FROM registry_publications').all().map(p => Number(p.effective_at)),
      ...this.scopedPublications().flatMap(p => p.scope.expiresAt === null ? [] : [p.scope.expiresAt]), ...(scope?.expiresAt ? [scope.expiresAt] : [])])]
      .filter(at => at >= now && at < through).sort((a,b) => a-b);
    const players = ids.map(id => {
      const before = times.map(from => ({ from, config: this.compose(id, from).config })), after = times.map(from => ({ from, config: this.compose(id, from, candidate).config }));
      const keys = [...new Set(before.flatMap((p,i) => changedPaths(p.config.raw, after[i].config.raw).filter(k => !under(k, '_meta'))))].sort();
      return { id, revision: Number(this.db.prepare('SELECT revision FROM players WHERE id=?').get(id)!.revision), before, after, keys };
    });
    return { version, computedAt: now, through, activatesAt: candidate.effective_at,
      registryRevision: candidate.seq-1, players };
  }
  assertForecastCurrent(actor: AdminActor, report: { version: string; registryRevision: number; computedAt: number; activatesAt: number }) {
    const now=this.now();this.actor(actor,now);
    const candidate=this.previewPublication(report.version,now);
    const activation=candidate.effective_at>now?candidate.effective_at:null;
    const expected=report.activatesAt>report.computedAt?report.activatesAt:null;
    if(candidate.seq-1!==report.registryRevision || activation!==expected)throw Error('registry:staleForecast');
  }
  private previewImpact(version: string, now: number) {
      const candidate = this.previewPublication(version, now), scope = candidate.scope, at = candidate.effective_at;
      const ids = this.affectedPlayers(version, now);
      let changedPlayers = 0, pinnedShifts = 0; const keys = new Map<string, number>(), resolutions: string[][] = [];
      for (const id of ids.sort()) {
        const before = this.compose(id, at).config, after = this.compose(id, at, candidate).config;
        resolutions.push([id, before.version, after.version]);
        const changes = changedPaths(before.raw, after.raw).filter(k => !under(k, '_meta'));
        if (changes.length) {
          changedPlayers++; for (const key of changes) keys.set(key, (keys.get(key) ?? 0) + 1);
          const row = this.db.prepare('SELECT projection FROM players WHERE id=?').get(id)!;
          if (['open', 'closing'].includes(JSON.parse(String(row.projection)).phase)) pinnedShifts++;
        }
      }
      // Bind registry revisions and time-dependent resolution, not continuously changing live-shift counts.
      const supersedes = emergencyDraft(this.proposal(version)) ? this.pendingSchedules(scope, now) : null;
      const token = createHash('sha256').update(JSON.stringify({ revision: candidate.seq - 1, activation: at > now ? at : null, resolutions, supersedes })).digest('hex');
      return { version, token, supersedes, computedAt: now, activatesAt: at, expiresAt: scope?.expiresAt ?? null, audiencePlayers: ids.length,
        changedPlayers, pinnedShifts, keys: [...keys].sort(([a], [b]) => a.localeCompare(b)).map(([path, players]) => ({ path, players })) };
  }
  private seedBand(): Config['values']['k']['band'] {
    const seedVersion = this.db.prepare('SELECT version FROM registry_publications ORDER BY seq LIMIT 1').get()!.version;
    return this.config(String(seedVersion)).values.k.band;
  }
  private measurementRow(version: string) {
    const row = this.db.prepare('SELECT state, measured_k, measured_at FROM registry_measurements WHERE version=?').get(version);
    return row ? { state: String(row.state) as 'pending' | 'admitted' | 'refused',
      measured_k: row.measured_k === null ? null : Number(row.measured_k), measured_at: row.measured_at === null ? null : Number(row.measured_at) } : undefined;
  }
  /** Absent/pending -> not ready; refused carries both numbers as Error properties (never in .message, so the
   * existing bare 'registry:bindingRange' HTTP 400 mapping keeps matching exactly, no second error string). */
  private assertMeasured(version: string) {
    const row = this.measurementRow(version);
    if (!row || row.state === 'pending') throw Error('registry:kUnmeasured');
    if (row.state === 'refused') throw Object.assign(new Error('registry:bindingRange'), { measured: row.measured_k, band: this.seedBand() });
  }
  /** Pure DB write, never throws -- callers decide what a refusal means for their own control flow. */
  private finishMeasurement(version: string, measured: number): boolean {
    const band = this.seedBand(), admitted = measured >= band[0] && measured <= band[1];
    this.transaction(now => { this.db.prepare("UPDATE registry_measurements SET state=?,measured_k=?,measured_at=? WHERE version=? AND state='pending'")
      .run(admitted ? 'admitted' : 'refused', measured, now, version); });
    return admitted;
  }
  /** Called OUTSIDE publish()'s own transaction. A sync measurer (tests) settles admission inline before
   * publish() returns; a Promise (production forecast worker) settles later -- publish() already returned
   * the pending row, and active()/latest() keep serving the previous admitted version until this lands. */
  private settleMeasurement(version: string, config: Config, actor: AdminActor) {
    const result = this.measureK(config, version, actor);
    if (typeof result === 'number') {
      if (!this.finishMeasurement(version, result)) throw Object.assign(new Error('registry:bindingRange'), { measured: result, band: this.seedBand() });
      return;
    }
    const promise = result.then(measured => { this.finishMeasurement(version, measured); },
      // ponytail: leaves the row pending forever on a rejected measurement; add a retry queue if this ever fires in practice.
      error => { console.error('registry:measurementFailed', version, error instanceof Error ? error.message : error); }
    ).finally(() => this.settling.delete(version));
    this.settling.set(version, promise);
  }
  /** Test-only determinism seam: await every in-flight async measurement instead of racing timers. */
  async settleMeasurements() { await Promise.all([...this.settling.values()]); }
  /** Recovery for a restart mid-measurement, or after a worker failure that left a row pending forever
   * (codex round 1 finding). The original publishing admin's session is long gone by restart time, so this
   * uses a synthetic system actor -- same pattern as 'system:seed' in initializeRegistry(). A resumed
   * version that turns out refused must not throw out of here.
   * Called explicitly by the production entrypoint (apps/server/src/main.ts) after constructing its store --
   * NOT wired into the GameStore constructor itself. forecastEconomy()'s worker also constructs a throwaway
   * GameStore from a BACKUP COPY of the same database to run the very measurement this method would resume;
   * auto-calling this from the constructor would race that measurement using this default self-report
   * measurer and settle the row before the real one runs (codex round 2 finding, caught before it shipped). */
  resumePendingMeasurements() {
    const system: AdminActor = { subject: 'system:measurement-resume', role: 'super', mfa: true, issuedAt: this.now(), expiresAt: this.now() + 3600000 };
    for (const row of this.db.prepare("SELECT version FROM registry_measurements WHERE state='pending'").all()) {
      const version = String(row.version);
      try { this.settleMeasurement(version, this.config(version), system); }
      catch (error) { console.error('registry:measurementResumeFailed', version, error instanceof Error ? error.message : error); }
    }
  }
  publish(actor: AdminActor, version: string, expectedImpact?: string | null): Publication {
    const prepared = this.transaction(now => {
      this.actor(actor, now);
      const draft = this.proposal(version), base = this.config(draft.base_version), policy = this.policy(JSON.parse(draft.keys), base, this.scope(version));
      const scope = this.scope(version); this.permit(actor, policy, false, scope);
      const approval = this.db.prepare('SELECT approved_by FROM registry_approvals WHERE version=?').get(version);
      const emergency = emergencyDraft(draft); if (emergency) this.emergencyPermit(actor, policy);
      if (!emergency && !approval) throw Error('registry:approvalRequired');
      const existing = this.db.prepare('SELECT * FROM registry_publications WHERE version=?').get(version) as Publication | undefined;
      if (existing) { this.assertMeasured(version); return { publication: existing, config: null as Config | null }; }
      if (emergency) this.emergencyPermit(actor, this.policy(JSON.parse(draft.keys), base, scope, now));
      if ((emergency || scope && expectedImpact !== undefined) && (!expectedImpact || this.previewImpact(version, now).token !== expectedImpact)) throw Error('registry:staleImpact');
      const at = this.publicationAt(draft, now);
      const today = activation(now, 'next_day', base) - DAY_MS;
      const count = Number(this.db.prepare('SELECT COUNT(*) AS n FROM registry_publications WHERE changed_by=? AND published_at>=?').get(draft.changed_by, today)!.n);
      if (count >= PUBLISH_PER_DAY) throw Error('registry:rateLimited');
      if (scope?.kind === 'player') this.supportAvailable(scope);
      const supersedes = emergency ? this.pendingSchedules(scope, now) : [], approvedBy = emergency ? actor.subject : String(approval!.approved_by);
      const seq = Number(this.db.prepare('SELECT MAX(seq) AS n FROM registry_publications').get()!.n) + 1;
      // Scope-conflict self-check runs against a PREVIEW candidate, exactly like previewPublication() does,
      // because the real row is still one statement away -- and once inserted it starts 'pending', which
      // active()/scopedPublications() would otherwise treat as not-yet-real for this very own consistency check.
      this.validatePublications(now, { seq, version, scope, effective_at: at, published_at: now, changed_by: draft.changed_by, approved_by: approvedBy });
      this.db.prepare('INSERT INTO registry_publications VALUES (NULL,?,?,?,?,?)').run(version, at, now, draft.changed_by, approvedBy);
      this.db.prepare("INSERT INTO registry_measurements VALUES (?,'pending',NULL,NULL)").run(version);
      if (scope?.kind === 'player') this.db.prepare('INSERT INTO registry_support_uses VALUES (?,?)').run(scope.ticketId!, version);
      if (emergency) {
        for (const schedule of supersedes) this.audit('ConfigScheduleSuperseded', { ...schedule, byVersion: version, marker: `superseded by emergency ${version}`, at: now });
        this.audit('ConfigEmergencyReviewOpened', { version, publishedBy: actor.subject, dueAt: now + DAY_MS, at: now });
      }
      this.audit('ConfigPublished', { version, emergency, scope: scope ?? null, keys: JSON.parse(draft.keys), effectiveAt: draft.effective, activatesAt: at,
        changedBy: draft.changed_by, publishedBy: actor.subject, approvedBy, reason: draft.reason,
        rollbackVersion: this.rollbackSource(loadConfig(JSON.parse(JSON.parse(draft.fingerprint).config)), draft.base_version), at: now });
      return { publication: this.db.prepare('SELECT * FROM registry_publications WHERE version=?').get(version) as Publication, config: this.config(version) };
    });
    if (prepared.config) this.settleMeasurement(version, prepared.config, actor);
    return prepared.publication;
  }
}
