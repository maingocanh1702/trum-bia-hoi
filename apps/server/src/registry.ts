import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import { configContent, dayKey, loadConfig, type Config } from '@tbh/engine';
import { validGoogleSubject } from './google';

// These are authenticated server claims, NOT a public request body. HTTP adapters must derive them.
export type AdminActor = { subject: string; role: 'super' | 'economy' | 'game' | 'support' | 'viewer'; mfa: boolean; issuedAt: number; expiresAt: number };
type Effective = 'immediate' | 'next_shift' | 'next_day' | 'next_season';
type Tier = 'A' | 'B' | 'C';
export type ProposalInput = { key: string; baseVersion: string; snapshot: unknown; reason: string; effective?: Effective };
type Proposal = { version: string; request_key: string; base_version: string; fingerprint: string; changed_by: string;
  keys: string; reason: string; effective: Effective; created_at: number };
type Publication = { seq: number; version: string; effective_at: number; published_at: number; changed_by: string; approved_by: string };
const DAY_MS = 86400000, ADMIN_SESSION_MS = 28800000, PUBLISH_PER_DAY = 5; // config-exempt: calendar units and admin authentication/abuse limits (BRD9.2/9.4), not gameplay tuning
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
export function registryPolicy(keys: string[], c: Config) {
  const g = c.raw._meta.governance, tierFor = (key: string): Tier => {
    if (g.tiers.A.featureFlags.some(p => under(key, p))) return 'A';
    for (const tier of ['A', 'B', 'C'] as const) if (g.tiers[tier].sections.some(p => under(key, p))) return tier;
    throw Error('registry:ungovernedKey');
  };
  const tiers = keys.map(tierFor), tier = (['A', 'B', 'C'] as const).find(t => tiers.includes(t))!;
  const superOnly = keys.some(k => ['lottery', 'shopSeason', 'donation', 'cosmetics.donationTiersVnd', ...g.tiers.A.featureFlags].some(p => under(k, p)));
  const effective: Effective = keys.some(k => ['league', 'lifePath', 'ledgers'].some(p => under(k, p))) ? 'next_season'
    : tier === 'A' || keys.some(k => under(k, 'risk') || under(k, 'locations')) ? 'next_day' : tier === 'B' ? 'next_shift' : 'immediate';
  const modes: Effective[] = keys.map(k => ['league', 'lifePath', 'ledgers'].some(p => under(k, p)) ? 'next_season'
    : tierFor(k) === 'A' || under(k, 'risk') || under(k, 'locations') ? 'next_day' : tierFor(k) === 'B' ? 'next_shift' : 'immediate');
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

/** Shared internal service. No HTTP endpoint accepts AdminActor; the admin-auth adapter is a separate boundary. */
export class ConfigRegistry {
  private readonly configs = new Map<string, Config>();
  constructor(private readonly db: DatabaseSync, private readonly clock: () => number) {}
  private now() {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now).getTime())) throw Error('registry:invalidClock');
    return now;
  }
  private transaction<T>(action: (now: number) => T): T {
    this.db.exec('BEGIN IMMEDIATE');
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
  latest() { return this.db.prepare('SELECT * FROM registry_publications ORDER BY seq DESC LIMIT 1').get() as Publication; }
  active(now = this.now()) {
    const row = this.db.prepare('SELECT version FROM registry_publications WHERE effective_at<=? ORDER BY seq DESC LIMIT 1').get(now);
    if (!row) throw Error('registry:missingActive');
    return this.config(String(row.version));
  }
  private actor(actor: AdminActor, now: number) {
    if (!actor || !validGoogleSubject(actor.subject) || !['super', 'economy', 'game', 'support', 'viewer'].includes(actor.role) ||
      !Number.isSafeInteger(actor.issuedAt) || actor.issuedAt < 0 || !Number.isSafeInteger(actor.expiresAt) || actor.issuedAt > now || actor.expiresAt <= now ||
      actor.expiresAt - actor.issuedAt > ADMIN_SESSION_MS || typeof actor.mfa !== 'boolean' ||
      (actor.role === 'super' || actor.role === 'game') && !actor.mfa) throw Error('registry:invalidActor');
  }
  private permit(actor: AdminActor, policy: ReturnType<typeof registryPolicy>, approve = false) {
    if (actor.role === 'super') return;
    if (policy.superOnly || approve && policy.tier === 'A' || policy.tiers.some(t => t === 'C' ? actor.role !== 'game' : actor.role !== 'economy')) throw Error('registry:forbidden');
  }
  private audit(type: string, data: object) { this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run(type, JSON.stringify(data)); }
  private rollbackSource(original: Config, baseVersion: string) {
    const known = this.db.prepare('SELECT snapshot FROM configs WHERE version=?').get(original.version);
    return original.version !== baseVersion && known && configContent(loadConfig(JSON.parse(String(known.snapshot)))) === configContent(original) ? original.version : null;
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
      heartbeatTiming(original);
      const seedVersion = this.db.prepare('SELECT version FROM registry_publications ORDER BY seq LIMIT 1').get()!.version;
      const seed = this.config(String(seedVersion));
      if (original.values.shift.dayRollover.tz !== seed.values.shift.dayRollover.tz || original.values.k.value < seed.values.k.band[0] || original.values.k.value > seed.values.k.band[1]) throw Error('registry:bindingRange');
      const metadata = (c: Config) => ({ ...c.raw._meta, version: '', date: '' });
      if (!isDeepStrictEqual(metadata(base), metadata(original))) throw Error('registry:metadataImmutable');
      const keys = changedPaths(base.raw, original.raw).filter(k => !under(k, '_meta')).sort();
      if (!keys.length || keys.some(k => under(k, 'prototypePhase0'))) throw Error('registry:invalidKeys');
      const policy = registryPolicy(keys, base); this.permit(actor, policy);
      const effective = input.effective ?? policy.effective;
      if (!['immediate', 'next_shift', 'next_day', 'next_season'].includes(effective)) throw Error('registry:earlyActivation');
      scheduledAt(now, effective, policy, base);
      const fingerprint = JSON.stringify({ baseVersion: input.baseVersion, config: configContent(original), reason: input.reason, effective });
      const existing = this.db.prepare('SELECT * FROM registry_proposals WHERE changed_by=? AND request_key=?').get(actor.subject, input.key) as Proposal | undefined;
      if (existing) { if (existing.fingerprint !== fingerprint) throw Error('registry:keyConflict'); return existing; }
      if (this.latest().version !== input.baseVersion) throw Error('registry:staleBase');
      const version = `registry-${randomUUID()}`, raw = structuredClone(original.raw);
      raw._meta = { ...base.raw._meta, version, date: dayKey(now, base) };
      const snapshot = loadConfig(raw);
      this.db.prepare('INSERT INTO configs VALUES (?,?)').run(version, JSON.stringify(snapshot.raw));
      this.db.prepare('INSERT INTO registry_proposals VALUES (?,?,?,?,?,?,?,?,?)').run(version, input.key, input.baseVersion, fingerprint,
        actor.subject, JSON.stringify(keys), input.reason, effective, now);
      this.audit('ConfigProposed', { version, baseVersion: input.baseVersion, keys, changedBy: actor.subject, reason: input.reason,
        rollbackVersion: this.rollbackSource(original, base.version), at: now });
      return this.proposal(version);
    });
  }
  approve(actor: AdminActor, version: string) {
    return this.transaction(now => {
      this.actor(actor, now);
      const draft = this.proposal(version), policy = registryPolicy(JSON.parse(draft.keys), this.config(draft.base_version));
      this.permit(actor, policy, true);
      if (policy.tier === 'A' && actor.subject === draft.changed_by) throw Error('registry:distinctApprover');
      const existing = this.db.prepare('SELECT approved_by FROM registry_approvals WHERE version=?').get(version);
      if (existing) { if (existing.approved_by !== actor.subject) throw Error('registry:alreadyApproved'); return draft; }
      if (this.latest().version !== draft.base_version) throw Error('registry:staleBase');
      this.db.prepare('INSERT INTO registry_approvals VALUES (?,?,?)').run(version, actor.subject, now);
      this.audit('ConfigApproved', { version, approvedBy: actor.subject, at: now }); return draft;
    });
  }
  publish(actor: AdminActor, version: string): Publication {
    return this.transaction(now => {
      this.actor(actor, now);
      const draft = this.proposal(version), base = this.config(draft.base_version), policy = registryPolicy(JSON.parse(draft.keys), base);
      this.permit(actor, policy);
      const approval = this.db.prepare('SELECT approved_by FROM registry_approvals WHERE version=?').get(version);
      if (!approval) throw Error('registry:approvalRequired');
      const existing = this.db.prepare('SELECT * FROM registry_publications WHERE version=?').get(version) as Publication | undefined;
      if (existing) return existing;
      const latest = this.latest(); if (latest.version !== draft.base_version) throw Error('registry:staleBase');
      const at = scheduledAt(now, draft.effective, policy, base);
      if (at < latest.effective_at) throw Error('registry:scheduleConflict');
      const today = activation(now, 'next_day', base) - DAY_MS;
      const count = Number(this.db.prepare('SELECT COUNT(*) AS n FROM registry_publications WHERE changed_by=? AND published_at>=?').get(actor.subject, today)!.n);
      if (count >= PUBLISH_PER_DAY) throw Error('registry:rateLimited');
      this.db.prepare('INSERT INTO registry_publications VALUES (NULL,?,?,?,?,?)').run(version, at, now, actor.subject, String(approval.approved_by));
      this.audit('ConfigPublished', { version, keys: JSON.parse(draft.keys), effectiveAt: draft.effective, activatesAt: at,
        changedBy: draft.changed_by, publishedBy: actor.subject, approvedBy: approval.approved_by, reason: draft.reason,
        rollbackVersion: this.rollbackSource(loadConfig(JSON.parse(JSON.parse(draft.fingerprint).config)), draft.base_version), at: now });
      return this.latest();
    });
  }
}
