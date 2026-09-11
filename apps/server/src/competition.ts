import type { DatabaseSync } from 'node:sqlite';
import type { DomainEvent, LoggedCommand } from '@tbh/engine';
import { assertAdminActor, type AdminActor } from './registry';

type Common = { key: string; playerId: string; expectedSeq: number; reason: string };
export type CompetitionRequest = Common & ({ type: 'import-review'; digest: string; value: 'approved' | 'rejected' } | { type: 'flag'; value: boolean });
export type ImportReview = 'pending' | 'approved' | 'rejected';
type Receipt = { seq: number; actor: string; at: number; before: boolean | ImportReview; request: CompetitionRequest };
const TYPES = { 'import-review': 'LocalHistoryReviewed', flag: 'PlayerFlagChanged' } as const;
const validId = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 128; // config-exempt: identity/request protocol bound
const HISTORY_PAGE = 50; // config-exempt: bounded admin evidence page, not gameplay tuning

/** Internal service. HTTP must derive AdminActor from the authenticated admin cookie. */
export class Competition {
  constructor(private readonly db: DatabaseSync, private readonly clock: () => number) {}
  private receipt(row: Record<string, unknown>): Receipt { return { ...JSON.parse(String(row.payload)), seq: Number(row.seq) }; }
  private latest(type: CompetitionRequest['type'], playerId: string, at: number): Receipt | undefined {
    // ponytail: scan immutable admin audit; add expression indexes if measured moderation volume requires them.
    const row = this.db.prepare("SELECT seq,payload FROM registry_audit WHERE type=? AND json_extract(payload,'$.request.playerId')=? AND json_extract(payload,'$.at')<=? ORDER BY seq DESC LIMIT 1").get(TYPES[type], playerId, at);
    return row ? this.receipt(row) : undefined;
  }
  /** Authoritative moderation as of a server cutoff; default is current state. */
  state(playerId: string, at = this.clock()) {
    if (!validId(playerId)) throw Error('competition:invalidInput');
    if (!this.db.prepare('SELECT 1 FROM players WHERE id=?').get(playerId)) throw Error('competition:missingPlayer');
    const google = this.db.prepare('SELECT subject FROM google_accounts WHERE player_id=? AND created_at<=?').get(playerId, at);
    const imported = this.db.prepare('SELECT player_id,subject,digest,imported_at,source_now,command_seq,event_seq FROM local_imports WHERE player_id=? AND imported_at<=?').get(playerId, at);
    if (imported && imported.subject !== google?.subject) throw Error('competition:importOwnerChanged');
    const flag = this.latest('flag', playerId, at), decision = imported ? this.latest('import-review', playerId, at) : undefined;
    if (flag && (flag.request.type !== 'flag' || typeof flag.request.value !== 'boolean') || decision &&
      (decision.request.type !== 'import-review' || decision.request.digest !== imported!.digest || !['approved', 'rejected'].includes(decision.request.value))) throw Error('competition:invalidHistory');
    return { playerId, provider: google ? 'google' as const : 'guest' as const,
      flag: { seq: flag?.seq ?? 0, value: flag?.request.value === true, decision: flag ?? null },
      localImport: imported ? { digest: String(imported.digest), importedAt: Number(imported.imported_at), sourceNow: Number(imported.source_now),
        commandSeq: Number(imported.command_seq), eventSeq: Number(imported.event_seq),
        review: { seq: decision?.seq ?? 0, value: (decision?.request.value ?? 'pending') as ImportReview, decision: decision ?? null } } : null };
  }
  private transaction<T>(fn: (now: number) => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now).getTime())) throw Error('competition:invalidClock');
      const result = fn(now); this.db.exec('COMMIT'); return result;
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
  }
  inspect(actor: AdminActor, playerId: string) {
    return this.transaction(now => {
      assertAdminActor(actor, now);
      if (!['super', 'game', 'support'].includes(actor.role)) throw Error('competition:forbidden');
      const state = this.state(playerId);
      this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run('CompetitionInspected', JSON.stringify({ actor: actor.subject, playerId, at: now }));
      return state;
    });
  }
  history(actor: AdminActor, playerId: string, digest: string, kind: 'commands' | 'events', after: number) {
    return this.transaction(now => {
      assertAdminActor(actor, now);
      if (!['super', 'game', 'support'].includes(actor.role)) throw Error('competition:forbidden');
      if (!['commands', 'events'].includes(kind) || !Number.isSafeInteger(after) || after < 0) throw Error('competition:invalidInput');
      const origin = this.state(playerId).localImport;
      if (!origin || origin.digest !== digest) throw Error('competition:importConflict');
      const through = kind === 'commands' ? origin.commandSeq : origin.eventSeq;
      if (!Number.isSafeInteger(through) || through < 0) throw Error('competition:invalidHistory');
      if (after > through) throw Error('competition:invalidInput');
      const field = kind === 'commands' ? 'entry' : 'payload';
      const rows = this.db.prepare(`SELECT seq,${field} AS record FROM ${kind} WHERE player_id=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?`)
        .all(playerId, after, through, HISTORY_PAGE);
      if (rows.length !== Math.min(HISTORY_PAGE, through - after) || rows.some((row, i) => row.seq !== after + i + 1)) throw Error('competition:invalidHistory');
      const entries = rows.map(row => ({ seq: Number(row.seq), record: JSON.parse(String(row.record)) as LoggedCommand | DomainEvent }));
      const nextCursor = after + rows.length;
      this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run('CompetitionHistoryInspected', JSON.stringify({ actor: actor.subject, playerId, digest, kind, after, through, nextCursor, at: now }));
      return { playerId, digest, kind, after, through, nextCursor: nextCursor < through ? nextCursor : null, entries };
    });
  }
  decide(actor: AdminActor, input: CompetitionRequest): Receipt {
    return this.transaction(now => {
      assertAdminActor(actor, now);
      if (!['super', 'game'].includes(actor.role)) throw Error('competition:forbidden');
      if (!input || !validId(input.key) || !validId(input.playerId) || !Number.isSafeInteger(input.expectedSeq) || input.expectedSeq < 0 ||
        typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000 ||
        (input.type === 'flag' ? typeof input.value !== 'boolean' || Object.keys(input).sort().join(',') !== 'expectedSeq,key,playerId,reason,type,value'
          : input.type !== 'import-review' || !['approved', 'rejected'].includes(input.value) || typeof input.digest !== 'string' || !/^[a-f0-9]{64}$/.test(input.digest) ||
          Object.keys(input).sort().join(',') !== 'digest,expectedSeq,key,playerId,reason,type,value')) throw Error('competition:invalidInput'); // config-exempt: audit text bound and SHA256 protocol
      const request: CompetitionRequest = { key: input.key, playerId: input.playerId, expectedSeq: input.expectedSeq, reason: input.reason,
        ...(input.type === 'flag' ? { type: 'flag', value: input.value } : { type: 'import-review', digest: input.digest, value: input.value }) };
      const prior = this.db.prepare("SELECT seq,payload FROM registry_audit WHERE type IN (?,?) AND json_extract(payload,'$.actor')=? AND json_extract(payload,'$.request.key')=? ORDER BY seq LIMIT 1")
        .get(TYPES.flag, TYPES['import-review'], actor.subject, input.key);
      if (prior) {
        const receipt = this.receipt(prior);
        if (JSON.stringify(receipt.request) !== JSON.stringify(request)) throw Error('competition:keyConflict');
        return receipt;
      }
      const state = this.state(input.playerId);
      if (input.type === 'import-review' && (!state.localImport || state.localImport.digest !== input.digest)) throw Error('competition:importConflict');
      const current = input.type === 'flag' ? state.flag : state.localImport!.review;
      if (current.seq !== input.expectedSeq) throw Error('competition:staleDecision');
      if (current.value === input.value) throw Error('competition:noChange');
      const payload = { actor: actor.subject, at: now, before: current.value, request };
      const result = this.db.prepare('INSERT INTO registry_audit VALUES (NULL,?,?)').run(TYPES[input.type], JSON.stringify(payload));
      return { ...payload, seq: Number(result.lastInsertRowid) };
    });
  }
}
