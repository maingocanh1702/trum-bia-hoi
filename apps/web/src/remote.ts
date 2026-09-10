import { loadConfig, validEnvelope, type Command, type Config, type DomainEvent, type Result, type WorldView, type menuReport } from '../../../packages/engine/src';

const JOURNAL_KEY = 'tbh.remote.v1';
// config-exempt: bootstrap HTTP timeout before the pinned network configuration arrives.
const BOOT_TIMEOUT_MS = 30000;
type Action = { clientId: string; clientSeq: number; idempotencyKey: string; command: Command };
type Journal = { playerId: string; clientId: string; nextSeq: number; heartbeatSeq: number; cursor: number; pending: Action[] };
type Snapshot = { world: WorldView; configVersion: string; serverNow: number; revision: number; lastEventSeq: number; presentation: DomainEvent[]; menu: ReturnType<typeof menuReport> };
type Reply = Snapshot & { clientId: string; acknowledgedSeq: number; heartbeatSeq: number; heartbeatUntil: number; heartbeatIntervalMs: number; heartbeatTimeoutMs: number; result?: Result; error?: string };
export type PlayerSession = { playerId: string; provider: 'guest' | 'google'; expiresAt: number };
type Link = { credential: string; resolve: (owner: PlayerSession) => void; reject: (error: unknown) => void };
function playerSession(value: any): PlayerSession {
  if (!value || typeof value.playerId !== 'string' || !value.playerId || !['guest', 'google'].includes(value.provider) || !Number.isSafeInteger(value.expiresAt)) throw new RemoteError('conflict');
  return { playerId: value.playerId, provider: value.provider, expiresAt: value.expiresAt };
}
export type Connection = 'connecting' | 'online' | 'reconnecting' | 'invalidSession' | 'conflict' | 'storage';
class RemoteError extends Error { constructor(readonly code: string, readonly status = 0) { super(code); } }
function readJournal(): Journal | null {
  const raw = localStorage.getItem(JOURNAL_KEY); if (raw === null) return null;
  const j = JSON.parse(raw) as Journal;
  if (!j || typeof j.playerId !== 'string' || !j.playerId || typeof j.clientId !== 'string' || !j.clientId ||
      ![j.nextSeq, j.heartbeatSeq, j.cursor].every(Number.isSafeInteger) || j.nextSeq < 1 || j.heartbeatSeq < 0 || j.cursor < 0 || !Array.isArray(j.pending) ||
      j.pending.some((a, i) => a.clientId !== j.clientId || a.clientSeq !== j.nextSeq - j.pending.length + i || a.clientSeq < 1 || a.command?.type === 'activity' || !validEnvelope({ ...a, at: 0 }))) throw new RemoteError('storage');
  return j;
}
/** A single browser writer owns this small journal; career history stays on the server. */
export class RemoteGame {
  identity!: PlayerSession;
  private linking?: Link;
  private reconcileAccount = false;
  get accountBusy() { return Boolean(this.linking) || this.reconcileAccount; }
  world!: WorldView & { events: DomainEvent[] };
  config!: Config;
  menu: ReturnType<typeof menuReport> = null;
  state: Connection = 'connecting';
  onChange: (events: DomainEvent[]) => void = () => {};
  private journal: Journal | null = null;
  private revision = -1;
  private frontier = 0;
  private active = !document.hidden;
  private paused = true;
  private presenceVersion = 0;
  private stopped = false;
  private working = false;
  private again = false;
  private monitor?: ReturnType<typeof setTimeout>;
  private timer?: ReturnType<typeof setTimeout>;
  private controllers = new Set<AbortController>();
  private callbacks = new Map<string, (value: Result) => void>();
  private release?: () => void;
  private timeout = BOOT_TIMEOUT_MS;
  private interval = 1000; // config-exempt: bootstrap retry cadence, replaced by the server heartbeat interval
  private configs = new Map<string, Config>();
  get pending() { return this.journal?.pending.length ?? 0; }
  private persist() {
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(this.journal)); }
    catch { throw new RemoteError('storage'); }
  }
  private async request(path: string, body?: unknown, timeout = this.timeout): Promise<any> {
    if (this.stopped) throw new RemoteError('stopped');
    const controller = new AbortController(); this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
      const data = await response.json();
      if (this.stopped) throw new RemoteError('stopped');
      if (!response.ok && !(response.status === 409 && data.world)) throw new RemoteError(data.error ?? 'network', response.status);
      return data;
    } finally { clearTimeout(timer); this.controllers.delete(controller); }
  }
  static async open() {
    const game = new RemoteGame();
    if (!navigator.locks) throw new RemoteError('storage');
    await new Promise<void>((resolve, reject) => {
      void navigator.locks.request(JOURNAL_KEY, { ifAvailable: true }, async lock => {
        if (!lock) { reject(new RemoteError('otherTab')); return; }
        await new Promise<void>(done => { game.release = done; resolve(); });
      }).catch(reject);
    });
    try {
      game.journal = readJournal();
      const owner = game.identity = playerSession(await game.request('/auth/session', {}));
      if (game.journal && game.journal.playerId !== owner.playerId) throw new RemoteError('conflict');
      const connected: Reply = await game.request('/player/connect', game.journal ? { clientId: game.journal.clientId } : {});
      if (connected.world.playerId !== owner.playerId) throw new RemoteError('conflict');
      if (!game.journal) {
        game.journal = { playerId: owner.playerId, clientId: connected.clientId, nextSeq: connected.acknowledgedSeq + 1,
          heartbeatSeq: connected.heartbeatSeq, cursor: connected.lastEventSeq, pending: [] };
      } else {
        if (connected.acknowledgedSeq >= game.journal.nextSeq || connected.acknowledgedSeq < game.journal.nextSeq - game.pending - 1) throw new RemoteError('conflict');
        game.journal.heartbeatSeq = connected.heartbeatSeq;
      }
      game.persist(); await game.apply(connected);
      return game;
    } catch (error) { game.close(); throw error; }
  }
  private async apply(snapshot: Snapshot) {
    if (!snapshot.world || snapshot.world.playerId !== this.journal?.playerId || !Number.isSafeInteger(snapshot.revision) || snapshot.serverNow !== snapshot.world.now || !Number.isSafeInteger(snapshot.lastEventSeq)) throw new RemoteError('conflict');
    if (snapshot.revision < this.revision) return;
    if (snapshot.lastEventSeq < this.journal.cursor) throw new RemoteError('conflict');
    let config = this.configs.get(snapshot.configVersion);
    if (!config) {
      config = loadConfig(await this.request(`/player/config?version=${encodeURIComponent(snapshot.configVersion)}`));
      if (config.version !== snapshot.configVersion) throw new RemoteError('conflict');
      this.configs.set(config.version, config);
    }
    this.config = config; this.timeout = config.values.network.reconnectingUiDelayMs;
    this.world = { ...snapshot.world, events: snapshot.presentation }; this.menu = snapshot.menu;
    this.revision = snapshot.revision; this.frontier = snapshot.lastEventSeq;
  }
  async googleChallenge(): Promise<{ clientId: string; nonce: string; expiresAt: number }> {
    if (this.stopped || this.accountBusy || this.state !== 'online' || this.identity.provider !== 'guest') throw new RemoteError('accountBusy');
    const challenge = await this.request('/auth/google/challenge', {});
    if (!challenge || typeof challenge.clientId !== 'string' || !challenge.clientId || typeof challenge.nonce !== 'string' || !challenge.nonce || !Number.isSafeInteger(challenge.expiresAt)) throw new RemoteError('conflict');
    return challenge;
  }
  /** Queue cookie rotation AFTER acknowledged commands, without recreating the player/stream. */
  linkGoogle(credential: string): Promise<PlayerSession> {
    if (this.stopped || this.accountBusy || this.state !== 'online' || this.identity.provider !== 'guest') return Promise.reject(new RemoteError('accountBusy'));
    if (typeof credential !== 'string' || !credential) return Promise.reject(new RemoteError('googleVerificationFailed'));
    const result = new Promise<PlayerSession>((resolve, reject) => { this.linking = { credential, resolve, reject }; });
    this.onChange([]); this.wake(); return result;
  }
  private rejectLink(error: unknown) {
    const link = this.linking; this.linking = undefined; link?.reject(error);
  }
  private async reconcileSession() {
    const owner = playerSession(await this.request('/auth/session', {}));
    if (owner.playerId !== this.journal!.playerId) throw new RemoteError('conflict');
    this.identity = owner; this.reconcileAccount = false; return owner;
  }
  private async finishGoogleLink() {
    const link = this.linking!;
    try {
      let failure: unknown;
      this.reconcileAccount = true;
      try { await this.request('/auth/google', { credential: link.credential }, BOOT_TIMEOUT_MS); }
      catch (error) {
        // An explicit rejection did not rotate our cookie. Network/5xx loss is ambiguous.
        if (error instanceof RemoteError && error.status >= 400 && error.status < 500) {
          this.reconcileAccount = false;
          if (error.code === 'invalidSession') this.fail(error);
          throw error;
        }
        failure = error;
      }
      let owner: PlayerSession;
      try { owner = await this.reconcileSession(); }
      catch (error) { this.fail(error); throw error; }
      if (owner.provider !== 'google') {
        if (failure) throw failure;
        const error = new RemoteError('conflict'); this.fail(error); throw error;
      }
      link.resolve(owner);
    } catch (error) { link.reject(error); }
    finally { if (this.linking === link) this.linking = undefined; this.again = true; this.onChange([]); }
  }
  setPresence(active: boolean, paused: boolean) {
    if (this.active !== active || this.paused !== paused) { this.active = active; this.paused = paused; this.presenceVersion++; }
    this.wake();
  }
  private watchLiveness() {
    clearTimeout(this.monitor);
    this.monitor = setTimeout(() => {
      if (this.state === 'online' || this.state === 'connecting') { this.state = 'reconnecting'; this.onChange([]); }
    }, this.timeout);
  }
  start() { this.watchLiveness(); this.wake(); }
  close() {
    this.stopped = true; this.reconcileAccount = false; this.rejectLink(new RemoteError('stopped')); clearTimeout(this.timer); clearTimeout(this.monitor);
    for (const controller of this.controllers) controller.abort();
    this.release?.(); this.release = undefined;
  }
  private fail(error: unknown) {
    if (this.stopped) return;
    this.rejectLink(error);
    const code = error instanceof RemoteError ? error.code : '';
    const rejected = error instanceof RemoteError && error.status >= 400 && error.status < 500 && error.status !== 429;
    this.state = code === 'storage' ? 'storage' : code === 'invalidSession' ? 'invalidSession' :
      (rejected || ['conflict', 'invalidClient', 'sequenceGap', 'sequenceConflict', 'idempotencyConflict', 'presenceManaged'].includes(code)) ? 'conflict' : 'reconnecting';
    if (['conflict', 'storage', 'invalidSession'].includes(this.state)) this.reconcileAccount = false;
    this.onChange([]);
  }
  command(command: Command): Promise<Result> {
    if (this.accountBusy) return Promise.resolve({ ok: false, reason: 'accountBusy' });
    if (command.type === 'activity' || this.stopped || ['conflict', 'storage', 'invalidSession'].includes(this.state)) return Promise.resolve({ ok: false, reason: this.state });
    const j = this.journal!;
    if (j.pending.length >= this.config.values.network.commandBufferMax) return Promise.resolve({ ok: false, reason: 'bufferFull' });
    const action: Action = { command: structuredClone(command), clientId: j.clientId, clientSeq: j.nextSeq++, idempotencyKey: crypto.randomUUID() };
    j.pending.push(action);
    try { this.persist(); } catch (error) { j.pending.pop(); j.nextSeq--; this.fail(error); return Promise.resolve({ ok: false, reason: 'storage' }); }
    const result = new Promise<Result>(resolve => this.callbacks.set(action.idempotencyKey, resolve));
    this.onChange([]); this.wake(); return result;
  }
  private wake() {
    if (this.working) { this.again = true; return; }
    if (this.stopped || ['conflict', 'storage', 'invalidSession'].includes(this.state)) return;
    clearTimeout(this.timer); void this.cycle();
  }
  private async beat() {
    const j = this.journal!, version = this.presenceVersion;
    // Persist sequence before send; a lost acknowledgement is followed by a NEW beat.
    j.heartbeatSeq++; this.persist();
    const reply: Reply = await this.request('/player/heartbeat', { clientId: j.clientId, beatSeq: j.heartbeatSeq, active: this.active, paused: this.paused });
    if (reply.clientId !== j.clientId) throw new RemoteError('conflict');
    if (reply.error) {
      if (reply.error === 'heartbeatStale') { j.heartbeatSeq = Math.max(j.heartbeatSeq, reply.heartbeatSeq); this.persist(); }
      throw new RemoteError(reply.error);
    }
    this.watchLiveness();
    await this.apply(reply); this.interval = reply.heartbeatIntervalMs;
    return version === this.presenceVersion;
  }
  private async cycle() {
    this.working = true; this.again = false;
    try {
      const j = this.journal!;
      // After ambiguous cookie rotation, retry identity only; the credential is already discarded.
      if (this.reconcileAccount) await this.reconcileSession();
      if (!await this.beat()) return;
      this.state = 'online'; this.onChange([]);
      // Ordered acknowledgements are never inferred from snapshots. Retry even a possibly committed head.
      while (j.pending.length && !this.stopped) {
        if (!await this.beat()) return;
        const action = j.pending[0], reply: Reply = await this.request('/player/command', action);
        if (reply.error) throw new RemoteError(reply.error);
        if (reply.clientId !== j.clientId || reply.acknowledgedSeq < action.clientSeq || !reply.result) throw new RemoteError('conflict');
        await this.apply(reply);
        j.pending.shift(); this.persist();
        this.callbacks.get(action.idempotencyKey)?.(reply.result); this.callbacks.delete(action.idempotencyKey);
        this.onChange([]);
      }
      if (j.cursor < this.frontier) {
        const page = await this.request(`/player/events?after=${j.cursor}`);
        if (page.playerId !== j.playerId || !Array.isArray(page.events) || page.events.some((r: { seq: number }, i: number) => r.seq !== j.cursor + i + 1) || page.lastEventSeq !== (page.events.at(-1)?.seq ?? j.cursor)) throw new RemoteError('conflict');
        this.onChange(page.events.map((r: { event: DomainEvent }) => r.event));
        j.cursor = page.lastEventSeq; this.persist();
      }
      if (this.linking && !this.stopped && await this.beat()) await this.finishGoogleLink();
    } catch (error) { this.fail(error); }
    finally { this.working = false; if (!this.stopped && !['conflict', 'storage', 'invalidSession'].includes(this.state)) this.timer = setTimeout(() => this.wake(), this.again ? 0 : this.interval); }
  }
}
