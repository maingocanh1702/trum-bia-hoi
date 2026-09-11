// Isolated browser-test API, never imported by the production entry point.
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { config, loadConfig, Game, encodeSave } from '@tbh/engine';
import { GameStore } from '../../server/src/store';
import { createGameServer } from '../../server/src/http';
let offset = 0;
const raw = structuredClone(config.raw); raw._meta.version = 'remote-browser-fixture'; raw.shift.startingCoinsBase = 100000; raw.leaderboard.topN = 2;
// Accessibility coverage reveals later menus without changing progress, purchases or production config.
if (process.env.TBH_A11Y_TEST === '1') { raw.onboarding.featureReveal.questsAfterShifts = 0; raw.onboarding.featureReveal.leagueAfterShifts = 0; }
const store = new GameStore(':memory:', loadConfig(raw), () => Date.now() + offset);
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }), clientId = 'browser-player.apps.googleusercontent.com';
const certs = createServer((_req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ test: key.publicKey.export({ type: 'spki', format: 'pem' }) }));
});
await new Promise<void>(resolve => certs.listen(0, '127.0.0.1', resolve));
const certPort = (certs.address() as { port: number }).port;
const google = new OAuth2Client({ endpoints: { oauth2FederatedSignonPemCertsUrl: new URL(`http://127.0.0.1:${certPort}`) } });
const server = createGameServer(store, { googleClientId: clientId, origin: 'http://127.0.0.1:4179', sessionTtlMs: 3600000, rateWindowMs: 60000, rateMax: 10000 }, google); // config-exempt: test transport limits
const handler = server.listeners('request')[0] as (...args: any[]) => void;
server.removeAllListeners('request');
server.on('request', async (req, res) => {
  const url = new URL(req.url!, 'http://localhost');
  if (url.pathname === '/__test/clock') {
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ offset })); return;
  }
  if (url.pathname === '/__test/rank' && req.method === 'POST') {
    try {
      const at = Date.now() + offset, subject = url.searchParams.get('subject')!, action = url.searchParams.get('action') ?? 'seed';
      const actor = { subject: 'rank-test-admin', role: 'game' as const, mfa: true, issuedAt: at, expiresAt: at + 3600000 };
      if (action === 'end') {
        const board = await store.leaderboard({ kind: 'ranking', page: 0 });
        offset += board.period.endsAt - at;
        await store.sweepSeasons(); res.end('{}'); return;
      }
      if (action === 'flag' || action === 'clear') {
        const id = url.searchParams.get('playerId')!, state = store.competition.state(id);
        store.competition.decide(actor, { type: 'flag', playerId: id, key: crypto.randomUUID(), reason: 'Browser fixture moderation', expectedSeq: state.flag.seq, value: action === 'flag' });
        res.end('{}'); return;
      }
      const players = [];
      for (let i = 0; i < 4; i++) {
        const id = `rank-${subject}-${i}`, game = new Game(loadConfig(raw), 42, at - 900000 + i * 100, id);
        for (let shift = 0; shift < config.values.onboarding.featureReveal.leagueAfterShifts; shift++) {
          game.command({ at: game.world.now, idempotencyKey: `open-${shift}`, command: { type: 'startShift' } }); game.advance(game.world.now + 11100);
          const table = game.world.tables.find(t => t.order?.items.every(item => item.state === 'ready'));
          if (table) game.command({ at: game.world.now, idempotencyKey: `serve-${shift}`, command: { type: 'serve', tableId: table.id, orderId: table.order!.id } });
          game.command({ at: game.world.now, idempotencyKey: `close-${shift}`, command: { type: 'endShift' } }); game.advance(game.world.now + 200000);
        }
        game.command({ at: game.world.now, idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
        const g = store.createGuestSession(3600000), a = store.signInGoogle(g.token, store.issueGoogleChallenge(g.token).nonce, { subject: id }, 3600000);
        const receipt = await store.claimLocal(a.token, encodeSave(game));
        store.competition.decide(actor, { type: 'import-review', key: 'approve-' + id, playerId: id, digest: receipt.digest, expectedSeq: 0, reason: 'Browser fixture history', value: 'approved' });
        players.push({ playerId: id });
        if (i === 0) res.setHeader('Set-Cookie', `tbh-session=${receipt.token}; Path=/; HttpOnly; SameSite=Lax`);
      }
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ players }));
    } catch (error) { res.writeHead(500); res.end(JSON.stringify({ error: String(error) })); }
    return;
  }
  if (url.pathname === '/__test/sign') {
    const sub = url.searchParams.get('subject')!, nonce = url.searchParams.get('nonce')!, seconds = Math.floor(Date.now() / 1000);
    const enc = (x: unknown) => Buffer.from(JSON.stringify(x)).toString('base64url');
    const body = enc({ alg: 'RS256', kid: 'test' }) + '.' + enc({ iss: 'https://accounts.google.com', sub, aud: clientId, iat: seconds - 1, exp: seconds + 3600, nonce });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ credential: body + '.' + sign('RSA-SHA256', Buffer.from(body), key.privateKey).toString('base64url') })); return;
  }
  if (req.url?.startsWith('/__test/advance?ms=') && req.method === 'POST') {
    const amount = Number(new URL(req.url, 'http://localhost').searchParams.get('ms'));
    if (!Number.isSafeInteger(amount) || amount < 0) { res.writeHead(400); res.end(); return; }
    offset += amount; store.sweepPresence(); res.end('{}'); return;
  }
  handler(req, res);
});
server.listen(4180, '127.0.0.1'); // config-exempt: isolated test TCP port
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { server.closeAllConnections(); server.close(() => certs.close(() => store.close())); });
