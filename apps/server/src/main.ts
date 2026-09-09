import { GameStore } from './store';
import { createGameServer } from './http';

const path = process.env.TBH_DB, origin = process.env.TBH_ORIGIN;
if (!path || !origin) throw Error('Set TBH_DB and TBH_ORIGIN before starting the API.');
// config-exempt: deployment port, cookie lifetime and HTTP abuse limits; no game tuning here.
const port = Number(process.env.TBH_PORT ?? 5175), ttl = Number(process.env.TBH_SESSION_TTL_MS ?? 604800000);
const rateMax = Number(process.env.TBH_RATE_MAX ?? 120), rateWindowMs = Number(process.env.TBH_RATE_WINDOW_MS ?? 60000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid TBH_PORT'); // config-exempt: TCP port range
process.umask(0o077); // config-exempt: newly created database files are private to the server OS account
const store = new GameStore(path);
const server = createGameServer(store, { origin, sessionTtlMs: ttl, rateMax, rateWindowMs, googleClientId: process.env.TBH_GOOGLE_CLIENT_ID });
server.on('error', error => { console.error(error.message); store.close(); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Trùm Bia Hơi API: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close(() => store.close()));
