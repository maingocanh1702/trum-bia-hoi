import { createServer, type IncomingMessage } from 'node:http';
import type { OAuth2Client } from 'google-auth-library';
import { validEnvelope, type Command, type DomainEvent } from '@tbh/engine';
import { GameStore, type Snapshot } from './store';
import { googleVerifier } from './google';

// config-exempt: deployment security/resource limits, not gameplay or economic parameters
const BODY_BYTES = 16384, RATE_KEYS = 4096, REQUEST_TIMEOUT_MS = 30000, HEADER_TIMEOUT_MS = 10000;
export interface ServerOptions { origin: string; sessionTtlMs: number; rateWindowMs: number; rateMax: number; googleClientId?: string }
class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
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
function publicState(state: Snapshot) {
  const { rng: _, nextId: __, events: ___, ...world } = state.world;
  const { rushScheduleSeed: ____, ...shift } = world.shift ?? {};
  const { seed: _____, ...daily } = world.daily ?? {};
  return { world: { ...world, shift: world.shift ? shift : null, ...(world.daily ? { daily } : {}) },
    configVersion: state.configVersion, serverNow: world.now, revision: state.revision, lastEventSeq: state.lastEventSeq };
}
async function json(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'jsonRequired');
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw new HttpError(415, 'encodingUnsupported');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > BODY_BYTES) throw new HttpError(413, 'bodyTooLarge');
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
  const credential = (req: IncomingMessage) => {
    const values = (req.headers.cookie ?? '').split(';').map(p => p.trim()).filter(p => p === cookieName || p.startsWith(`${cookieName}=`));
    if (values.length > 1) throw new HttpError(401, 'invalidSession');
    return values[0]?.slice(cookieName.length + 1);
  };
  // ponytail: bounded process-local limiter; enforce at a shared edge before multi-host deployment.
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
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.statusCode = 204; res.end(); return;
      }
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) throw new HttpError(400, 'invalidUrl');
      const route = new URL(req.url, options.origin), path = route.pathname;
      if (route.search && path !== '/player/events') throw new HttpError(400, 'invalidQuery');
      const token = credential(req);
      if (req.method === 'POST' && path === '/auth/session') {
        const body = await json(req); if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        if (token !== undefined) { const owner = store.session(token); if (!owner) throw new HttpError(401, 'invalidSession'); reply(200, owner); return; }
        const created = store.createGuestSession(options.sessionTtlMs);
        res.setHeader('Set-Cookie', cookie(created.token, created.expiresAt)); reply(201, { playerId: created.playerId, expiresAt: created.expiresAt, provider: 'guest' }); return;
      }
      // Authenticate after body IO, immediately before synchronous storage access.
      const body = req.method === 'POST' ? await json(req) : undefined;
      if (req.method === 'POST' && path === '/auth/logout') {
        if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        if (token) store.revokeSession(token); res.setHeader('Set-Cookie', cookie('', 0)); reply(200, { ok: true }); return;
      }
      const owner = token && store.session(token); if (!owner) throw new HttpError(401, 'invalidSession');
      if (req.method === 'POST' && path === '/auth/google/challenge') {
        if (!record(body) || Object.keys(body).length) throw new HttpError(400, 'invalidBody');
        if (!verifyGoogle) throw new HttpError(503, 'googleUnavailable');
        reply(200, { ...store.issueGoogleChallenge(token!), clientId: options.googleClientId }); return;
      }
      if (req.method === 'POST' && path === '/auth/google') {
        if (!record(body) || Object.keys(body).some(k => !['credential', 'keepAccount'].includes(k)) ||
            typeof body.credential !== 'string' || body.keepAccount !== undefined && typeof body.keepAccount !== 'boolean') throw new HttpError(400, 'invalidBody');
        if (!verifyGoogle) throw new HttpError(503, 'googleUnavailable');
        const { nonce } = store.googleChallenge(token!);
        const identity = await verifyGoogle(body.credential, nonce);
        const signed = store.signInGoogle(token!, nonce, identity, options.sessionTtlMs, body.keepAccount === true);
        res.setHeader('Set-Cookie', cookie(signed.token, signed.expiresAt));
        reply(200, { playerId: signed.playerId, expiresAt: signed.expiresAt, provider: signed.provider }); return;
      }
      if (req.method === 'POST' && path === '/player/connect') {
        if (!record(body) || Object.keys(body).some(k => k !== 'clientId') || body.clientId !== undefined && (typeof body.clientId !== 'string' || !body.clientId || body.clientId.length > 128)) throw new HttpError(400, 'invalidClient'); // config-exempt: transport identifier length bound
        const connected = store.connect(owner.playerId, body.clientId as string | undefined);
        reply(200, { ...publicState(connected), clientId: connected.clientId, acknowledgedSeq: connected.acknowledgedSeq, heartbeatSeq: connected.heartbeatSeq }); return;
      }
      if (req.method === 'POST' && path === '/player/heartbeat') {
        if (!record(body) || Object.keys(body).some(k => !['clientId', 'beatSeq', 'active', 'paused'].includes(k)) ||
            typeof body.clientId !== 'string' || !Number.isSafeInteger(body.beatSeq) || typeof body.active !== 'boolean' || typeof body.paused !== 'boolean') throw new HttpError(400, 'invalidHeartbeat');
        const beat = store.heartbeat(token!, { clientId: body.clientId, beatSeq: Number(body.beatSeq), active: body.active, paused: body.paused });
        reply(beat.error ? 409 : 200, { ...publicState(beat), clientId: beat.clientId, heartbeatSeq: beat.heartbeatSeq,
          heartbeatUntil: beat.heartbeatUntil, heartbeatIntervalMs: beat.heartbeatIntervalMs, heartbeatTimeoutMs: beat.heartbeatTimeoutMs,
          duplicate: beat.duplicate, error: beat.error }); return;
      }
      if (req.method === 'GET' && path === '/player/state') { reply(200, publicState(store.read(owner.playerId))); return; }
      if (req.method === 'GET' && path === '/player/events') {
        const after = route.searchParams.get('after');
        if (route.searchParams.size !== 1 || after === null || !/^(0|[1-9]\d*)$/.test(after) || !Number.isSafeInteger(Number(after))) throw new HttpError(400, 'invalidCursor');
        const page = store.eventsAfter(owner.playerId, Number(after));
        reply(200, { ...page, events: page.events.map(row => ({ ...row, event: publicEvent(row.event) })) }); return;
      }
      if (req.method === 'POST' && path === '/player/command') {
        const envelope = record(body) ? { ...body, at: 0 } : undefined;
        if (!record(body) || Object.keys(body).some(k => !['command', 'idempotencyKey', 'clientId', 'clientSeq'].includes(k)) ||
            typeof body.clientId !== 'string' || !body.clientId || body.clientId.length > 128 || !Number.isSafeInteger(body.clientSeq) || Number(body.clientSeq) < 1 || !validEnvelope(envelope) || // config-exempt: transport identifier length bound
            Object.keys(envelope.command).some(k => k !== 'type' && !(commandFields[envelope.command.type] as readonly string[]).includes(k))) throw new HttpError(400, 'invalidCommand');
        const response = store.clientCommand(owner.playerId, { command: envelope.command, idempotencyKey: envelope.idempotencyKey, clientId: body.clientId, clientSeq: Number(body.clientSeq) }, token);
        reply(response.error ? 409 : 200, { ...publicState(response), clientId: response.clientId, acknowledgedSeq: response.acknowledgedSeq, result: response.result, error: response.error }); return;
      }
      throw new HttpError(404, 'notFound');
    } catch (error) {
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
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
  const sweep = () => {
    try { for (const failure of store.sweepPresence()) console.error('presence sweep failed', failure); }
    catch (error) { console.error('presence sweep failed', error instanceof Error ? error.message : 'unknown'); }
  };
  server.on('listening', () => { stop(); sweep(); timer = setInterval(sweep, store.heartbeatIntervalMs); timer.unref(); });
  server.on('close', stop); server.on('error', stop);
  return server;
}
