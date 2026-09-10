import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { validGoogleSubject, type GoogleIdentity } from './google';
import { ADMIN_SESSION_MS, type AdminActor } from './registry';

// config-exempt: authentication protocol/resource bounds (BRD9.2, RFC6238), never gameplay tuning.
const CHALLENGE_MS = 300000, STEP_MS = 30000, LOCK_MS = 900000, MAX_FAILURES = 5, MAX_PENDING = 4096, FILE_BYTES = 65536;
const roles = ['super', 'economy', 'game', 'support', 'viewer'] as const;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const tokenHash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? sha(v) : ''; // config-exempt:256bit session token
const secretBytes = (secret: string) => Buffer.from([...secret].map(c => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5, '0')).join('').match(/.{8}/g)!.map(b => parseInt(b, 2))); // config-exempt:Base32-to-byte protocol encoding
export function totp(secret: string, step: number) {
  if (secret.length !== 32 || !/^[A-Z2-7]{32}$/.test(secret) || !Number.isSafeInteger(step) || step < 0) throw Error('admin:invalidFactor'); // config-exempt:160bit shared secret
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); // config-exempt:RFC6238 unsigned64 counter
  const digest = createHmac('sha1', secretBytes(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15; // config-exempt:RFC4226 dynamic truncation nibble
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0'); // config-exempt:RFC4226 dynamic truncation, six decimal digits
}
type Account = { subject: string; role: AdminActor['role']; totpSecret?: string; fingerprint: string };
export type AdminDirectory = Map<string, Account>;
/** Deployment-only directory, reread for every authentication/access decision. */
export function adminDirectory(path: string): AdminDirectory {
  let fd: number | undefined;
  try {
    if (!isAbsolute(path)) throw Error();
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > FILE_BYTES || (stat.mode & 0o077) || process.getuid && stat.uid !== process.getuid()) throw Error(); // config-exempt:private OS-owned credential file
    const rows: unknown = JSON.parse(readFileSync(fd, 'utf8'));
    if (!Array.isArray(rows) || rows.length > 64) throw Error(); // config-exempt:bounded administrator allowlist
    const entries: AdminDirectory = new Map(), secrets = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(k => !['subject', 'role', 'totpSecret'].includes(k)) ||
          !validGoogleSubject(row.subject) || !roles.includes(row.role) || entries.has(row.subject) ||
          row.totpSecret !== undefined && (typeof row.totpSecret !== 'string' || row.totpSecret.length !== 32 || !/^[A-Z2-7]{32}$/.test(row.totpSecret) || secrets.has(row.totpSecret)) ||
          ['super', 'game'].includes(row.role) && !row.totpSecret) throw Error();
      if (row.totpSecret) secrets.add(row.totpSecret);
      entries.set(row.subject, { subject: row.subject, role: row.role, totpSecret: row.totpSecret,
        fingerprint: sha(JSON.stringify([row.subject, row.role, row.totpSecret ?? null])) });
    }
    return entries;
  } catch { throw Error('admin:unavailable'); }
  finally { if (fd !== undefined) closeSync(fd); }
}
export function initializeAdmin(db: DatabaseSync) {
  db.exec(`CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, nonce TEXT, subject TEXT, account_hash TEXT,
    phase TEXT NOT NULL CHECK(phase IN ('google','mfa','authenticated')), mfa INTEGER NOT NULL CHECK(mfa IN (0,1)),
    issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL) STRICT;
    CREATE TABLE admin_factors (subject TEXT PRIMARY KEY, last_step INTEGER NOT NULL,
      failures INTEGER NOT NULL, blocked_until INTEGER NOT NULL) STRICT;`);
}
type Row = { token_hash: string; nonce: string | null; subject: string | null; account_hash: string | null;
  phase: 'google' | 'mfa' | 'authenticated'; mfa: number; issued_at: number; expires_at: number };
export class AdminAuth {
  constructor(private readonly db: DatabaseSync, private readonly clock: () => number) {}
  private now() {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now + ADMIN_SESSION_MS).getTime())) throw Error('admin:invalidClock');
    return now;
  }
  private transaction<T>(fn: (now: number) => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(this.now()); this.db.exec('COMMIT'); return result; }
    catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  private audit(type: string, data: object) { this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run(type, JSON.stringify(data)); }
  private row(token: unknown, now = this.now()) {
    return this.db.prepare('SELECT * FROM admin_sessions WHERE token_hash=? AND issued_at<=? AND expires_at>?')
      .get(tokenHash(token), now, now) as Row | undefined;
  }
  private account(row: Row, directory: AdminDirectory) {
    const account = row.subject && directory.get(row.subject);
    if (!account || row.account_hash !== account.fingerprint) throw Error('admin:invalidSession');
    return account;
  }
  status(token: unknown, directory: AdminDirectory) {
    const row = this.row(token);
    if (!row || row.phase === 'google') return { phase: 'signedOut' as const };
    this.account(row, directory);
    return row.phase === 'mfa' ? { phase: 'mfa' as const, expiresAt: row.expires_at }
      : { phase: 'authenticated' as const, actor: this.actor(token, directory), context: row.token_hash, expiresAt: row.expires_at };
  }
  context(token: unknown) { const row = this.row(token); if (!row || row.phase !== 'authenticated') throw Error('admin:invalidSession'); return row.token_hash; }
  actor(token: unknown, directory: AdminDirectory): AdminActor {
    const row = this.row(token);
    if (!row || row.phase !== 'authenticated') throw Error('admin:invalidSession');
    const account = this.account(row, directory);
    return { subject: account.subject, role: account.role, mfa: row.mfa === 1, issuedAt: row.issued_at, expiresAt: row.expires_at };
  }
  challenge(previous: unknown) {
    return this.transaction(now => {
      this.db.prepare('DELETE FROM admin_sessions WHERE expires_at<=? OR token_hash=?').run(now, tokenHash(previous));
      if (Number(this.db.prepare('SELECT COUNT(*) AS n FROM admin_sessions WHERE phase<>?').get('authenticated')!.n) >= MAX_PENDING) throw Error('admin:rateLimited');
      const token = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex'), expiresAt = now + CHALLENGE_MS; // config-exempt:256bit independent credentials
      this.db.prepare("INSERT INTO admin_sessions VALUES (?,?,NULL,NULL,'google',0,?,?)").run(sha(token), nonce, now, expiresAt);
      this.audit('AdminChallengeIssued', { at: now }); return { token, nonce, expiresAt };
    });
  }
  nonce(token: unknown) {
    const row = this.row(token); if (!row || row.phase !== 'google' || !row.nonce) throw Error('admin:invalidChallenge');
    return row.nonce;
  }
  rejectGoogle(token: unknown, nonce: string) {
    this.transaction(now => {
      const row = this.row(token, now); if (!row || row.phase !== 'google' || row.nonce !== nonce) return;
      this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(row.token_hash);
      this.audit('AdminLoginRejected', { reason: 'googleVerificationFailed', at: now });
    });
  }
  private finish(row: Row, account: Account, now: number, mfa: boolean) {
    const token = randomBytes(32).toString('hex'), expiresAt = now + ADMIN_SESSION_MS; // config-exempt:256bit rotated cookie
    this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(row.token_hash);
    this.db.prepare("INSERT INTO admin_sessions VALUES (?,NULL,?,?,'authenticated',?,?,?)")
      .run(sha(token), account.subject, account.fingerprint, mfa ? 1 : 0, now, expiresAt);
    this.audit('AdminSignedIn', { subject: account.subject, role: account.role, mfa, at: now });
    return { phase: 'authenticated' as const, token, expiresAt };
  }
  google(token: unknown, nonce: string, identity: GoogleIdentity, directory: AdminDirectory) {
    const result = this.transaction(now => {
      const row = this.row(token, now);
      if (!row || row.phase !== 'google' || row.nonce !== nonce) throw Error('admin:invalidChallenge');
      const account = directory.get(identity.subject);
      if (!account) {
        this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(row.token_hash);
        this.audit('AdminLoginRejected', { reason: 'notAllowed', subject: identity.subject, at: now }); return null;
      }
      if (account.totpSecret) {
        this.db.prepare("UPDATE admin_sessions SET nonce=NULL,subject=?,account_hash=?,phase='mfa' WHERE token_hash=?")
          .run(account.subject, account.fingerprint, row.token_hash);
        this.audit('AdminFactorRequired', { subject: account.subject, at: now });
        return { phase: 'mfa' as const, expiresAt: row.expires_at };
      }
      return this.finish(row, account, now, false);
    });
    if (!result) throw Error('admin:notAllowed'); return result;
  }
  factor(token: unknown, code: unknown, directory: AdminDirectory) {
    const result = this.transaction(now => {
      const row = this.row(token, now);
      if (!row || row.phase !== 'mfa') throw Error('admin:invalidSession');
      const account = this.account(row, directory); if (!account.totpSecret) throw Error('admin:invalidSession');
      const state = this.db.prepare('SELECT * FROM admin_factors WHERE subject=?').get(account.subject);
      if (state && Number(state.blocked_until) > now) return 'rateLimited';
      const current = Math.floor(now / STEP_MS);
      const step = typeof code === 'string' && code.length === 6 && /^\d{6}$/.test(code) ? [current, current - 1, current + 1].find(s =>
        s >= 0 && timingSafeEqual(Buffer.from(code), Buffer.from(totp(account.totpSecret!, s)))) : undefined; // config-exempt:one step tolerance, six digits
      if (step === undefined || step <= Number(state?.last_step ?? -1)) {
        const failures = state && Number(state.blocked_until) <= now && Number(state.blocked_until) > 0 ? 1 : Number(state?.failures ?? 0) + 1;
        this.db.prepare(`INSERT INTO admin_factors VALUES (?,-1,?,?) ON CONFLICT(subject) DO UPDATE
          SET failures=excluded.failures,blocked_until=excluded.blocked_until`).run(account.subject, failures, failures >= MAX_FAILURES ? now + LOCK_MS : 0);
        this.audit('AdminFactorRejected', { subject: account.subject, reason: 'invalidOrReplayed', at: now });
        return failures >= MAX_FAILURES ? 'rateLimited' : 'invalidFactor';
      }
      this.db.prepare(`INSERT INTO admin_factors VALUES (?,?,0,0) ON CONFLICT(subject) DO UPDATE
        SET last_step=excluded.last_step,failures=0,blocked_until=0`).run(account.subject, step);
      return this.finish(row, account, now, true);
    });
    if (typeof result === 'string') throw Error('admin:' + result); return result;
  }
  logout(token: unknown) {
    this.transaction(now => {
      const row = this.row(token, now); if (!row) return;
      this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(row.token_hash);
      this.audit('AdminSignedOut', { subject: row.subject, at: now });
    });
  }
}
