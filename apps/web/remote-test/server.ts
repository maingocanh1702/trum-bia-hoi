// Isolated browser-test API, never imported by the production entry point.
import { config, loadConfig } from '@tbh/engine';
import { GameStore } from '../../server/src/store';
import { createGameServer } from '../../server/src/http';
let offset = 0;
const raw = structuredClone(config.raw); raw._meta.version = 'remote-browser-fixture'; raw.shift.startingCoinsBase = 100000;
const store = new GameStore(':memory:', loadConfig(raw), () => Date.now() + offset);
const server = createGameServer(store, { origin: 'http://127.0.0.1:4179', sessionTtlMs: 3600000, rateWindowMs: 60000, rateMax: 10000 }); // config-exempt: test transport limits
const handler = server.listeners('request')[0] as (...args: any[]) => void;
server.removeAllListeners('request');
server.on('request', (req, res) => {
  if (req.url?.startsWith('/__test/advance?ms=') && req.method === 'POST') {
    const amount = Number(new URL(req.url, 'http://localhost').searchParams.get('ms'));
    if (!Number.isSafeInteger(amount) || amount < 0) { res.writeHead(400); res.end(); return; }
    offset += amount; store.sweepPresence(); res.end('{}'); return;
  }
  handler(req, res);
});
server.listen(4180, '127.0.0.1'); // config-exempt: isolated test TCP port
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => server.close(() => store.close()));
