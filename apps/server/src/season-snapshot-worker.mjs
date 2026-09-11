import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { register } from 'tsx/esm/api';
register();
let store;
try {
  const copy = new DatabaseSync(workerData.destination, { readOnly: true });
  const now = Math.max(workerData.now, Number(copy.prepare('SELECT COALESCE(MAX(now),0) AS n FROM players').get().n)); copy.close();
  const { GameStore } = await import('./store.ts');
  store = new GameStore(workerData.destination, undefined, () => now);
  parentPort.postMessage({ snapshots: await store.snapshotSeasonsInBackup() });
} catch {
  parentPort.postMessage({ error: 'leaderboard:captureUnavailable' });
} finally { store?.close(); }
