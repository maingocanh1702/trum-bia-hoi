import { Worker } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import { configContent, decodeSave, loadConfig, type EngineCheckpoint, type LoggedCommand, type World } from '@tbh/engine';

// config-exempt: upload/worker resource bounds, not gameplay limits or economy tuning.
export const LOCAL_ARCHIVE_BYTES = 128 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 120000, WORKER_HEAP_MB = 1024;
export type LocalArchive = { playerId: string; seed: number; createdAt: number; initialConfigVersion: string;
  world: World; log: LoggedCommand[]; original: Uint8Array; checkpoint: EngineCheckpoint };
// ponytail: one replay per process; use a bounded shared queue before multi-host uploads.
let validating = false;

/** Worker entry only. Uploaded configuration is never admitted into the registry. */
export function replayLocalArchive(text: string, snapshots: string[], now: number): LocalArchive {
  const save = JSON.parse(text);
  if (!save || typeof save.playerId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(save.playerId) ||
      !Number.isSafeInteger(save.now) || save.now > now || !Number.isSafeInteger(save.createdAt) || save.createdAt < 0 || save.createdAt > save.now ||
      !Array.isArray(save.log) || new Set(save.log.map((e: LoggedCommand) => e?.idempotencyKey)).size !== save.log.length) throw Error('store:invalidLocalArchive');
  const known = new Map(snapshots.map(text => { const config = loadConfig(JSON.parse(text)); return [config.version, config] as const; }));
  const approved = (raw: unknown) => {
    const candidate = loadConfig(raw), config = known.get(candidate.version);
    if (!config || configContent(candidate) !== configContent(config)) throw Error('store:unknownLocalConfig');
    // Weighted sampling depends on the original registry snapshot's member order.
    return config.raw;
  };
  save.config = approved(save.config);
  if (save.configs !== undefined) {
    if (!Array.isArray(save.configs)) throw Error('store:invalidLocalArchive');
    save.configs = save.configs.map(approved);
  }
  const game = decodeSave(JSON.stringify(save));
  if (game.log.length !== save.log.length) throw Error('store:invalidLocalArchive');
  return { playerId: game.playerId, seed: game.seed, createdAt: game.createdAt,
    initialConfigVersion: game.initialConfig.version, world: game.world, log: game.log, original: gzipSync(text), checkpoint: game.checkpoint() };
}

/** Do not block request handling while replaying a real career archive. */
export async function validateLocalArchive(text: string, snapshots: string[], now: number): Promise<LocalArchive> {
  if (typeof text !== 'string' || !text.length || Buffer.byteLength(text) > LOCAL_ARCHIVE_BYTES) throw Error('store:localArchiveSize');
  if (validating) throw Error('store:importBusy');
  validating = true;
  let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  try {
    worker = new Worker(new URL('./local-archive-worker.mjs', import.meta.url), {
      workerData: { text, snapshots, now }, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB },
    });
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('store:importInterrupted')), WORKER_TIMEOUT_MS);
      worker!.once('message', message => message.error ? reject(Error(message.error)) : resolve(message.archive));
      worker!.once('error', () => reject(Error('store:importInterrupted')));
      worker!.once('exit', () => reject(Error('store:importInterrupted')));
    });
  } finally {
    if (timer) clearTimeout(timer);
    await worker?.terminate(); validating = false;
  }
}
