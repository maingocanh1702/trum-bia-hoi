import { Worker } from 'node:worker_threads';
import { backup, type DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SEASON_CAPTURE_TIMEOUT_MS } from '../../shared/season-history';
import type { SeasonSnapshot } from './leaderboard';
// config-exempt: worker resource limits, not gameplay tuning.
const HEAP_MB = 1024;
/** Native consistent backup + isolated replay, reusing the forecast worker pattern. */
export async function captureSeasonBackup(db: DatabaseSync, now: number, signal: AbortSignal): Promise<SeasonSnapshot[]> {
  const dir = await mkdtemp(join(tmpdir(), 'tbh-season-'));
  let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, abort: (() => void) | undefined;
  try {
    if (signal.aborted) throw Error('leaderboard:captureCancelled');
    const destination = join(dir, 'snapshot.db');
    await backup(db, destination);
    if (signal.aborted) throw Error('leaderboard:captureCancelled');
    worker = new Worker(new URL('./season-snapshot-worker.mjs', import.meta.url), { execArgv: [], resourceLimits: { maxOldGenerationSizeMb: HEAP_MB }, workerData: { destination, now } });
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('leaderboard:captureTimeout')), SEASON_CAPTURE_TIMEOUT_MS);
      abort = () => reject(Error('leaderboard:captureCancelled')); signal.addEventListener('abort', abort, { once: true });
      worker!.once('message', message => message.error ? reject(Error(message.error)) : resolve(message.snapshots));
      worker!.once('error', () => reject(Error('leaderboard:captureUnavailable')));
      worker!.once('exit', () => reject(Error('leaderboard:captureUnavailable')));
    });
  } finally {
    if (timer) clearTimeout(timer); if (abort) signal.removeEventListener('abort', abort);
    try { await worker?.terminate(); } finally { await rm(dir, { recursive: true, force: true }); }
  }
}
