// Isolated browser-test API, never imported by the production entry point.
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { config, loadConfig } from '@tbh/engine';
import { GameStore } from '../../server/src/store';
import { createGameServer } from '../../server/src/http';
let offset = 0;
const raw = structuredClone(config.raw); raw._meta.version = 'remote-browser-fixture'; raw.shift.startingCoinsBase = 100000;
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
server.on('request', (req, res) => {
  const url = new URL(req.url!, 'http://localhost');
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
