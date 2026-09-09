import { parentPort, workerData } from 'node:worker_threads';
import { register } from 'tsx/esm/api';
register();
try {
  const { replayLocalArchive } = await import('./local-archive.ts');
  parentPort.postMessage({ archive: replayLocalArchive(workerData.text, workerData.snapshots, workerData.now) });
} catch (error) {
  parentPort.postMessage({ error: error.message === 'store:unknownLocalConfig' ? error.message : 'store:invalidLocalArchive' });
}
