import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync, backup } from 'node:sqlite';
import { register } from 'tsx/esm/api';
register();
let source, store;
try {
  source=new DatabaseSync(workerData.source,{readOnly:true});
  await backup(source,workerData.destination);source.close();source=undefined;
  const copy=new DatabaseSync(workerData.destination,{readOnly:true});
  const now=Math.max(workerData.now,Number(copy.prepare('SELECT COALESCE(MAX(now),0) AS n FROM players').get().n));copy.close();
  const {GameStore}=await import('./store.ts'),{reportFromBackup}=await import('./forecast.ts');
  store=new GameStore(workerData.destination,undefined,()=>now);
  parentPort.postMessage({report:reportFromBackup(store,workerData.actor,workerData.version)});
} catch(error) {
  parentPort.postMessage({error:typeof error.message==='string'&&error.message.startsWith('registry:')?error.message:'registry:forecastUnavailable'});
} finally {source?.close();store?.close();}
