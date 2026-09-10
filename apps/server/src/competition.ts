import type { DatabaseSync } from 'node:sqlite';
import { assertAdminActor, type AdminActor } from './registry';

type Common = { key: string; playerId: string; expectedSeq: number; reason: string };
export type CompetitionRequest = Common & ({ type: 'import-review'; digest: string; value: 'approved' | 'rejected' } | { type: 'flag'; value: boolean });
export type ImportReview = 'pending' | 'approved' | 'rejected';
type Receipt = { seq: number; actor: string; at: number; before: boolean | ImportReview; request: CompetitionRequest };
const TYPES = { 'import-review': 'LocalHistoryReviewed', flag: 'PlayerFlagChanged' } as const;
const validId = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 128; // config-exempt: identity/request protocol bound

/** Internal service. HTTP must derive AdminActor from the authenticated admin cookie. */
export class Competition {
  constructor(private readonly db: DatabaseSync, private readonly clock: () => number) {}
  private receipt(row: Record<string, unknown>): Receipt { return { ...JSON.parse(String(row.payload)), seq: Number(row.seq) }; }
  private latest(type: CompetitionRequest['type'], playerId: string): Receipt | undefined {
    // ponytail: scan immutable admin audit; add expression indexes if measured moderation volume requires them.
    const row = this.db.prepare("SELECT seq,payload FROM registry_audit WHERE type=? AND json_extract(payload,'$.request.playerId')=? ORDER BY seq DESC LIMIT 1").get(TYPES[type], playerId);
    return row ? this.receipt(row) : undefined;
  }
  /** Current authoritative moderation only; season scores remain a separate projection. */
  state(playerId: string) {
    if (!validId(playerId)) throw Error('competition:invalidInput');
    if (!this.db.prepare('SELECT 1 FROM players WHERE id=?').get(playerId)) throw Error('competition:missingPlayer');
    const google = this.db.prepare('SELECT subject FROM google_accounts WHERE player_id=?').get(playerId);
    const imported = this.db.prepare('SELECT player_id,subject,digest,imported_at,source_now,command_seq,event_seq FROM local_imports WHERE player_id=?').get(playerId);
    if (imported && imported.subject !== google?.subject) throw Error('competition:importOwnerChanged');
    const flag = this.latest('flag', playerId), decision = imported ? this.latest('import-review', playerId) : undefined;
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
