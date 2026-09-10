import { createServer, type IncomingMessage } from 'node:http';
import type { OAuth2Client } from 'google-auth-library';
import { validEnvelope, loadConfig, menuReport, type Config, type Command, type DomainEvent, type WorldView } from '@tbh/engine';
import { GameStore, type Snapshot } from './store';
import { googleVerifier } from './google';
import { adminDirectory } from './admin-auth';
import { forecastEconomy } from './forecast';
import type { ProposalInput } from './registry';

// config-exempt: deployment security/resource limits, not gameplay or economic parameters
const BODY_BYTES = 16384, RATE_KEYS = 4096, REQUEST_TIMEOUT_MS = 30000, HEADER_TIMEOUT_MS = 10000;
export interface ServerOptions { origin: string; sessionTtlMs: number; rateWindowMs: number; rateMax: number; googleClientId?: string; adminAccountsFile?: string }
class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
const pathIsAdmin = (url: string | undefined) => url?.startsWith('/admin/');
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// HTTP accepts only these fields; historical replay keeps the engine's existing decoder.
const commandFields = {
  startShift: [], endShift: [], kickAll: ['shiftId', 'maxCost'], serve: ['tableId', 'orderId'],
  serveDelivery: ['deliveryId'], restock: ['dish', 'mode'], upgrade: ['kind'], upgradeTable: ['tableId'],
  rentLocation: ['locationId', 'leaseId', 'maxCost'], leaveLocation: ['leaseId'],
  buyTable: [], buyGlass: ['count'], upgradeDog: ['level'], claimLifePath: ['level'], buyUnlock: ['item'],
  claimAttendance: ['day'], claimQuest: ['day', 'questId'], claimDailyBonus: ['day'], buyFlyer: [],
  activateFlyer: ['shiftId'], installSignboard: [], setSignboard: ['style'], activity: ['active', 'paused'], emergencyPack: [],
} satisfies { [T in Command['type']]: readonly (keyof Extract<Command, { type: T }>)[] };
const publicEvent = (event: DomainEvent) => ({ ...event, data: Object.fromEntries(Object.entries(event.data).filter(([key]) => key !== 'seed')) });
/** Never ship replay RNG, generation seeds or a private config snapshot to a client. */
function publicState(state: Snapshot, config: Config) {
  const { rng: _, nextId: __, events: ___, ...world } = state.world;
  const shift = world.shift && (({ rushScheduleSeed: _, ...visible }) => visible)(world.shift);
  const daily = world.daily && (({ seed: _, ...visible }) => visible)(world.daily);
  const view: WorldView = { ...world, shift, ...(daily ? { daily } : {}) };
  const orders = new Set(world.tables.map(t => t.order?.id));
  const presentation = state.world.events.filter(e => e.type === 'order_served' && orders.has(String(e.data.orderId)) || e.type === 'rush_ended' && e.data.shiftId === world.shift?.id);
  const flyer = state.world.events.filter(e => e.type === 'flyer_ended').at(-1);
  if (flyer) presentation.push(flyer);
  return { world: view, presentation: presentation.map(publicEvent), menu: menuReport(state.world, config),
    configVersion: state.configVersion, serverNow: world.now, revision: state.revision, lastEventSeq: state.lastEventSeq };
}
async function json(req: IncomingMessage, maxBytes = BODY_BYTES): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'jsonRequired');
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw new HttpError(415, 'encodingUnsupported');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'bodyTooLarge');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'invalidJson'); }
}
export function createGameServer(store: GameStore, options: ServerOptions, googleClient?: OAuth2Client) {
  const url = new URL(options.origin);
  if (url.origin !== options.origin || !['http:', 'https:'].includes(url.protocol) ||
      url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('http:invalidOrigin');
  for (const n of [options.sessionTtlMs, options.rateWindowMs, options.rateMax]) if (!Number.isSafeInteger(n) || n <= 0) throw Error('http:invalidLimits');
  const verifyGoogle = googleVerifier(options.googleClientId, googleClient);
  const secure = url.protocol === 'https:', cookieName = secure ? '__Host-tbh-session' : 'tbh-session';
  const cookie = (token: string, expires: number) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expires).toUTCString()}${secure ? '; Secure' : ''}`;
  const credential = (req: IncomingMessage, name = cookieName) => {
    const values = (req.headers.cookie ?? '').split(';').map(p => p.trim()).filter(p => p === name || p.startsWith(`${name}=`));
    if (values.length > 1) throw new HttpError(401, 'invalidSession');
    return values[0]?.slice(name.length + 1);
  };
  const adminName = secure ? '__Host-tbh-admin' : 'tbh-admin';
  const adminCookie = (token: string, expiresAt: number) => `${adminName}=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAt).toUTCString()}${secure ? '; Secure' : ''}`;
  const directory = () => { if (!options.adminAccountsFile || !verifyGoogle) throw Error('admin:unavailable'); return adminDirectory(options.adminAccountsFile); };
  // ponytail: bounded process-local limiter; enforce at a shared edge before multi-host deployment.
  const configs = new Map<string, Config>();
  const configAt = (version: string) => {
    let config = configs.get(version);
    if (!config) { config = loadConfig(JSON.parse(store.configSnapshot(version))); configs.set(version, config); }
    return config;
  };
  const present = (state: Snapshot) => publicState(state, configAt(state.configVersion));
  const requests = new Map<string, { until: number; count: number }>();
  const server = createServer({ maxHeaderSize: BODY_BYTES, requestTimeout: REQUEST_TIMEOUT_MS, headersTimeout: HEADER_TIMEOUT_MS }, async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Vary', 'Origin');
    const reply = (status: number, data: unknown) => { if (!res.destroyed) { res.statusCode = status; res.end(JSON.stringify(data)); } };
    try {
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== options.origin || req.method !== 'GET' && origin !== options.origin || req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'originDenied');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', options.origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
      const now = Date.now(), ip = req.socket.remoteAddress ?? 'unknown';
      for (const [key, row] of requests) if (row.until <= now) requests.delete(key);
      let row = requests.get(ip);
      if (!row) { if (requests.size >= RATE_KEYS) throw new HttpError(429, 'rateLimited'); requests.set(ip, row = { until: now + options.rateWindowMs, count: 0 }); }
      if (++row.count > options.rateMax) { res.setHeader('Retry-After', String(Math.max(1, Math.ceil((row.until - now) / 1000)))); throw new HttpError(429, 'rateLimited'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-TBH-Admin-Context'); res.statusCode = 204; res.end(); return;
      }
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) throw new HttpError(400, 'invalidUrl');
      const route = new URL(req.url, options.origin), path = route.pathname;
      if (route.search && !['/admin/registry', '/admin/config', '/admin/audit', '/admin/players', '/admin/support', '/admin/scope', '/admin/draft-source'].includes(path) && path !== '/player/events' && path !== '/player/config') throw new HttpError(400, 'invalidQuery');
      if (path.startsWith('/admin/')) {
        // Body IO precedes all access decisions. Actor fields never cross this boundary.
        const body = req.method === 'POST' ? await json(req, path === '/admin/proposals' ? 524288 : BODY_BYTES) : undefined; // config-exempt:512KiB bounded full-config JSON input
        const token = credential(req, adminName), auth = store.adminAuth;
        const fields = (allowed: string[]) => { if (!record(body) || Object.keys(body).some(k => !allowed.includes(k))) throw new HttpError(400, 'invalidBody'); return body; };
        if (req.method === 'POST' && path === '/admin/auth/logout') {
          fields([]); auth.logout(token); res.setHeader('Set-Cookie', adminCookie('', 0)); reply(200, { ok: true }); return;
        }
        if (req.method === 'GET' && path === '/admin/auth') {
          if (!options.adminAccountsFile || !verifyGoogle) { reply(200, { enabled: false, phase: 'signedOut' }); return; }
          reply(200, { enabled: true, ...auth.status(token, directory()) }); return;
        }
        if (req.method === 'POST' && path === '/admin/auth/challenge') {
          fields([]); directory(); const { token: next, ...challenge } = auth.challenge(token);
          res.setHeader('Set-Cookie', adminCookie(next, challenge.expiresAt)); reply(200, { ...challenge, clientId: options.googleClientId }); return;
        }
        if (req.method === 'POST' && path === '/admin/auth/google') {
          const input = fields(['credential']); directory(); const nonce = auth.nonce(token);
          let identity;
          try { identity = await verifyGoogle!(input.credential, nonce); }
          catch (error) { auth.rejectGoogle(token, nonce); throw error; }
          const result = auth.google(token, nonce, identity, directory());
          if ('token' in result) res.setHeader('Set-Cookie', adminCookie(result.token, result.expiresAt));
          reply(200, { phase: result.phase, expiresAt: result.expiresAt }); return;
        }
        if (req.method === 'POST' && path === '/admin/auth/factor') {
          const input = fields(['code']), result = auth.factor(token, input.code, directory());
          res.setHeader('Set-Cookie', adminCookie(result.token, result.expiresAt)); reply(200, { phase: result.phase, expiresAt: result.expiresAt }); return;
        }
        const actor = auth.actor(token, directory()), registry = store.registry;
        const context = req.headers['x-tbh-admin-context'];
        if ((req.method === 'POST' || context !== undefined) && context !== auth.context(token)) throw Error('admin:accountChanged');
        const cursor = (name: string, fallback: number) => {
          if (!route.search) return fallback;
          const value = route.searchParams.get(name);
          if (route.searchParams.size !== 1 || !value || !/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) throw new HttpError(400, 'invalidCursor');
          return Number(value);
        };
        if (req.method === 'GET' && path === '/admin/registry') { reply(200, registry.index(actor, cursor('before', Number.MAX_SAFE_INTEGER))); return; }
        if (req.method === 'GET' && path === '/admin/audit') { reply(200, registry.auditPage(actor, cursor('after', 0))); return; }
        if (req.method === 'GET' && path === '/admin/players') {
          if (route.search && (route.searchParams.size !== 1 || !route.searchParams.has('after'))) throw new HttpError(400, 'invalidQuery');
          reply(200, registry.players(actor, route.searchParams.get('after') ?? '')); return;
        }
        if (req.method === 'GET' && path === '/admin/support') { reply(200, registry.supportPage(actor, cursor('after', 0))); return; }
        if (req.method === 'POST' && path === '/admin/support') {
          const input = fields(['key', 'playerId', 'reason']);
          reply(200, { ticketId: registry.requestSupport(actor, input as {key:string; playerId:string; reason:string}) }); return;
        }
        if (req.method === 'GET' && path === '/admin/scope') {
          if (route.searchParams.size !== 2 || !route.searchParams.has('kind') || !route.searchParams.has('id')) throw new HttpError(400, 'invalidQuery');
          reply(200, registry.scopeSource(actor, route.searchParams.get('kind')!, route.searchParams.get('id')!)); return;
        }
        if (req.method === 'GET' && path === '/admin/draft-source') {
          const version = route.searchParams.get('version');
          if (route.search && (route.searchParams.size !== 1 || !version || version.length > 128)) throw new HttpError(400, 'invalidVersion'); // config-exempt:version protocol bound
          reply(200, registry.draftSource(actor, version ?? undefined)); return;
        }
        if (req.method === 'POST' && path === '/admin/forecast') {
          const input = fields(['version']);
          if (typeof input.version !== 'string' || !input.version || input.version.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt:version protocol bound
          const cancel = new AbortController(), abort = () => cancel.abort();res.once('close',abort);
          try {
            const report = await forecastEconomy(store,actor,input.version,cancel.signal);
            const current=auth.actor(token,directory());if(context !== auth.context(token))throw Error('admin:accountChanged');
            registry.assertForecastCurrent(current,report);reply(200,report);
          } catch(error) {if(!cancel.signal.aborted)throw error;} finally {res.removeListener('close',abort);} return;
        }
        if (req.method === 'POST' && path === '/admin/impact') {
          const input = fields(['version']);
          if (typeof input.version !== 'string' || !input.version || input.version.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt:version protocol bound
          reply(200, registry.impact(actor, input.version)); return;
        }
        if (req.method === 'GET' && path === '/admin/config') {
          const version = route.searchParams.get('version');
          if (route.searchParams.size !== 1 || !version || version.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt:transport string bound
          reply(200, registry.details(actor, version)); return;
        }
        if (req.method === 'POST' && path === '/admin/proposals') {
          const input = fields(['key', 'baseVersion', 'snapshot', 'reason', 'effective', 'scope']);
          if (typeof input.baseVersion !== 'string' || input.baseVersion.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt:transport string bound
          if (input.scope !== undefined && (!record(input.scope) || Object.keys(input.scope).sort().join(',') !== 'expiresAt,id,kind,playerIds,previousVersion,priority,ticketId')) throw new HttpError(400, 'invalidBody');
          const draft = registry.propose(actor, input as ProposalInput);
          reply(200, { version: draft.version }); return;
        }
        if (req.method === 'POST' && ['/admin/approve', '/admin/publish'].includes(path)) {
          const input = fields(path === '/admin/publish' ? ['version', 'impactToken'] : ['version']);
          if (typeof input.version !== 'string' || !input.version || input.version.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt:transport string bound
          if (input.impactToken !== undefined && (typeof input.impactToken !== 'string' || !/^[a-f0-9]{64}$/.test(input.impactToken))) throw new HttpError(400, 'invalidBody'); // config-exempt:SHA256 receipt
          if (path === '/admin/approve') { const draft = registry.approve(actor, input.version); reply(200, { version: draft.version }); }
          else reply(200, registry.publish(actor, input.version, (input.impactToken as string | undefined) ?? null)); return;
        }
        throw new HttpError(404, 'notFound');
      }
      const token = credential(req);
      if (req.method === 'POST' && path === '/auth/session') {
        const body = await json(req); if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        let previousGuestId: string | null = null;
        if (token !== undefined) {
          const owner = store.session(token);
          if (owner) { reply(200, { ...owner, transition: store.accountTransition(token) }); return; }
          // A lost guest restart response may leave the revoked guest cookie.
          // This permits only a NEW anonymous visit, never old-state/account access.
          previousGuestId = store.guestCredentialPlayerId(token);
          if (!previousGuestId) throw new HttpError(401, 'invalidSession');
        }
        const created = store.createGuestSession(options.sessionTtlMs);
        res.setHeader('Set-Cookie', cookie(created.token, created.expiresAt)); reply(201, { playerId: created.playerId, expiresAt: created.expiresAt, provider: 'guest', created: true, ...(previousGuestId ? { previousGuestId } : {}) }); return;
      }
      // Authenticate after body IO, immediately before synchronous storage access.
      const body = req.method === 'POST' ? await json(req) : undefined;
      if (req.method === 'POST' && path === '/auth/logout') {
        if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        if (token) store.revokeSession(token); res.setHeader('Set-Cookie', cookie('', 0)); reply(200, { ok: true }); return;
      }
      const owner = token && store.session(token); if (!owner) throw new HttpError(401, 'invalidSession');
      if (req.method === 'POST' && path === '/auth/guest/restart') {
        if (!record(body) || Object.keys(body).join(',') !== 'playerId' || typeof body.playerId !== 'string') throw new HttpError(400, 'invalidBody');
        const created = store.createGuestSession(options.sessionTtlMs, { token: token!, playerId: body.playerId });
        res.setHeader('Set-Cookie', cookie(created.token, created.expiresAt));
        reply(201, { playerId: created.playerId, expiresAt: created.expiresAt, provider: 'guest' }); return;
      }
      if (req.method === 'POST' && path === '/auth/google/challenge') {
        if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        if (!verifyGoogle) throw new HttpError(503, 'googleUnavailable');
        reply(200, { ...store.issueGoogleChallenge(token!), clientId: options.googleClientId }); return;
      }
      if (req.method === 'POST' && path === '/auth/google') {
        if (!record(body) || Object.keys(body).some(k => !['credential', 'keepAccount', 'expectedPlayerId'].includes(k)) ||
            typeof body.credential !== 'string' || body.keepAccount !== undefined && typeof body.keepAccount !== 'boolean' ||
            body.expectedPlayerId !== undefined && (typeof body.expectedPlayerId !== 'string' || !body.expectedPlayerId || body.expectedPlayerId.length > 128)) throw new HttpError(400, 'invalidBody'); // config-exempt: transport player identifier length bound
        if (!verifyGoogle) throw new HttpError(503, 'googleUnavailable');
        const { nonce } = store.googleChallenge(token!);
        const identity = await verifyGoogle(body.credential, nonce);
        const signed = store.signInGoogle(token!, nonce, identity, options.sessionTtlMs, body.keepAccount === true, body.expectedPlayerId as string | undefined);
        res.setHeader('Set-Cookie', cookie(signed.token, signed.expiresAt));
        reply(200, { playerId: signed.playerId, expiresAt: signed.expiresAt, provider: signed.provider }); return;
      }
      if (req.method === 'POST' && path === '/player/connect') {
        if (!record(body) || Object.keys(body).some(k => k !== 'clientId') || body.clientId !== undefined && (typeof body.clientId !== 'string' || !body.clientId || body.clientId.length > 128)) throw new HttpError(400, 'invalidClient'); // config-exempt: transport identifier length bound
        const connected = store.connect(owner.playerId, body.clientId as string | undefined);
        reply(200, { ...present(connected), clientId: connected.clientId, acknowledgedSeq: connected.acknowledgedSeq, heartbeatSeq: connected.heartbeatSeq }); return;
      }
      if (req.method === 'POST' && path === '/player/heartbeat') {
        if (!record(body) || Object.keys(body).some(k => !['clientId', 'beatSeq', 'active', 'paused'].includes(k)) ||
            typeof body.clientId !== 'string' || !Number.isSafeInteger(body.beatSeq) || typeof body.active !== 'boolean' || typeof body.paused !== 'boolean') throw new HttpError(400, 'invalidHeartbeat');
        const beat = store.heartbeat(token!, { clientId: body.clientId, beatSeq: Number(body.beatSeq), active: body.active, paused: body.paused });
        arm();
        reply(beat.error ? 409 : 200, { ...present(beat), clientId: beat.clientId, heartbeatSeq: beat.heartbeatSeq,
          heartbeatUntil: beat.heartbeatUntil, heartbeatIntervalMs: beat.heartbeatIntervalMs, heartbeatTimeoutMs: beat.heartbeatTimeoutMs,
          duplicate: beat.duplicate, error: beat.error }); return;
      }
      if (req.method === 'GET' && path === '/player/config') {
        const version = route.searchParams.get('version');
        if (route.searchParams.size !== 1 || !version || version.length > 128) throw new HttpError(400, 'invalidVersion'); // config-exempt: transport string bound
        // The strict economy schema contains public game rules only; deployment credentials live outside it.
        try { reply(200, configAt(version).raw); } catch { throw new HttpError(404, 'configMissing'); }
        return;
      }
      if (req.method === 'GET' && path === '/player/state') { reply(200, present(store.read(owner.playerId))); return; }
      if (req.method === 'GET' && path === '/player/events') {
        const after = route.searchParams.get('after');
        if (route.searchParams.size !== 1 || after === null || !/^(0|[1-9]\d*)$/.test(after) || !Number.isSafeInteger(Number(after))) throw new HttpError(400, 'invalidCursor');
        const page = store.eventsAfter(owner.playerId, Number(after));
        reply(200, { ...page, playerId: owner.playerId, events: page.events.map(row => ({ ...row, event: publicEvent(row.event) })) }); return;
      }
      if (req.method === 'POST' && path === '/player/command') {
        const envelope = record(body) ? { ...body, at: 0 } : undefined;
        if (!record(body) || Object.keys(body).some(k => !['command', 'idempotencyKey', 'clientId', 'clientSeq'].includes(k)) ||
            typeof body.clientId !== 'string' || !body.clientId || body.clientId.length > 128 || !Number.isSafeInteger(body.clientSeq) || Number(body.clientSeq) < 1 || !validEnvelope(envelope) || // config-exempt: transport identifier length bound
            Object.keys(envelope.command).some(k => k !== 'type' && !(commandFields[envelope.command.type] as readonly string[]).includes(k))) throw new HttpError(400, 'invalidCommand');
        const response = store.clientCommand(owner.playerId, { command: envelope.command, idempotencyKey: envelope.idempotencyKey, clientId: body.clientId, clientSeq: Number(body.clientSeq) }, token);
        reply(response.error ? 409 : 200, { ...present(response), clientId: response.clientId, acknowledgedSeq: response.acknowledgedSeq, result: response.result, error: response.error }); return;
      }
      throw new HttpError(404, 'notFound');
    } catch (error) {
      const adminErrors: Record<string, number> = {
        'admin:unavailable': 503, 'admin:invalidSession': 401, 'admin:invalidChallenge': 401,
        'admin:accountChanged': 409, 'admin:notAllowed': 403, 'admin:invalidFactor': 401, 'admin:rateLimited': 429,
        'registry:invalidActor': 401, 'registry:forbidden': 403, 'registry:distinctApprover': 403,
        'store:heartbeatClock': 400, 'registry:missingVersion': 404, 'registry:missingProposal': 404, 'registry:rateLimited': 429,
        'registry:staleBase': 409, 'registry:scheduleConflict': 409, 'registry:keyConflict': 409,
        'registry:staleForecast': 409, 'registry:forecastBusy': 429, 'registry:forecastTimeout': 503, 'registry:forecastCancelled': 408, 'registry:forecastUnavailable': 503,
        'registry:staleImpact': 409, 'registry:scopeConflict': 409, 'registry:invalidTicket': 409, 'registry:alreadyPublished': 409, 'registry:missingScope': 404, 'registry:invalidScope': 400, 'registry:invalidExpiry': 400,
        'registry:alreadyApproved': 409, 'registry:approvalRequired': 409,
      };
      if (pathIsAdmin(req.url) && error instanceof Error && (error.message.startsWith('registry:') || error.message.startsWith('config:') || error.message.startsWith('admin:') || error.message === 'store:heartbeatClock')) {
        const status = adminErrors[error.message] ?? (error.message.startsWith('config:') || ['registry:invalidInput', 'registry:bindingRange', 'registry:identityMigrationRequired', 'registry:metadataImmutable', 'registry:invalidKeys', 'registry:earlyActivation', 'registry:unsafeSchedule', 'registry:ungovernedKey'].includes(error.message) ? 400 : 500);
        reply(status, { error: status === 500 ? 'serverError' : error.message }); req.resume(); return;
      }
      const auth = error instanceof Error && {
        'store:invalidSession': [401, 'invalidSession'], 'store:invalidGoogleChallenge': [401, 'invalidGoogleChallenge'],
        'auth:googleVerificationFailed': [401, 'googleVerificationFailed'],
        'store:accountConflict': [409, 'accountConflict'], 'store:signOutRequired': [409, 'signOutRequired'],
      }[error.message];
      if (Array.isArray(auth)) { reply(Number(auth[0]), { error: auth[1] }); req.resume(); return; }
      const input = error instanceof Error && ['store:invalidCursor', 'store:invalidCommand', 'store:invalidClient', 'store:invalidHeartbeat'].includes(error.message);
      reply(error instanceof HttpError ? error.status : error instanceof Error && error.message === 'store:invalidClient' ? 403 : input ? 400 : 500,
        { error: error instanceof HttpError ? error.message : input ? error.message.slice(6) : 'serverError' });
      req.resume();
    }
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { if (timer) clearTimeout(timer); timer = undefined; };
  const arm = () => { stop(); if (server.listening) { timer = setTimeout(() => { sweep(); arm(); }, store.heartbeatIntervalMs); timer.unref(); } };
  const sweep = () => {
    try { for (const failure of store.sweepPresence()) console.error('presence sweep failed', failure); }
    catch (error) { console.error('presence sweep failed', error instanceof Error ? error.message : 'unknown'); }
  };
  server.on('listening', () => { sweep(); arm(); });
  server.on('close', stop); server.on('error', stop);
  return server;
}
