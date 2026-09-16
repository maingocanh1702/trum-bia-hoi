import { Worker } from 'node:worker_threads';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compareEconomy, projectEconomy, FORECAST_DAYS, DAY_MS, FORECAST_POLICY, type ForecastDay } from '../../../packages/engine/sim/forecast';
import { serveValueStats } from '@tbh/engine';
import type { GameStore } from './store';
import type { AdminActor } from './registry';

// config-exempt: report worker resource/deployment limits, not economy tuning.
const TIMEOUT_MS=600000, HEAP_MB=1024;
let running=false;
type Totals=ReturnType<typeof projectEconomy>['report']['totals'];
const checked=(n:number)=>{if(!Number.isSafeInteger(n))throw Error('registry:forecastAmount');return n;};
const empty=():Totals=>({faucet:0,sink:0,penalties:0,depositRefunds:0,openingCoins:0,closingCoins:0});
const sum=(into:Totals,from:Totals)=>{for(const key of Object.keys(into) as (keyof Totals)[])into[key]=checked(into[key]+from[key]);};
const difference=(a:Totals,b:Totals)=>Object.fromEntries((Object.keys(a) as (keyof Totals)[]).map(k=>[k,checked(b[k]-a[k])])) as Totals;

/** The caller supplies ONLY a private backup store. read() advances that copy with normal presence rules. */
export function reportFromBackup(store:GameStore,actor:AdminActor,version:string) {
  const plan=store.registry.forecastPlan(actor,version,store.serverNow+FORECAST_DAYS*DAY_MS);
  const baseline=empty(),candidate=empty(),daily=new Map<string,{date:string;baseline:Totals;candidate:Totals}>();
  const members:{id:string;revision:number;snapshotRevision:number;inputConfigVersion:string;commandHash:string;candidateHash:string}[]=[], keys=new Map<string,number>();
  const aggregate=(rows:ForecastDay[],side:'baseline'|'candidate')=>{for(const row of rows){
    let target=daily.get(row.date);if(!target){target={date:row.date,baseline:empty(),candidate:empty()};daily.set(row.date,target);}
    sum(target[side],row);
  }};
  let candidateTotalValue=0,candidateServed=0,candidateSafe=true;
  for(const player of plan.players) {
    const snapshot=store.read(player.id),game=store.fork(player.id);
    const result=player.keys.length?compareEconomy(game,player.before,player.after):(()=>{
      const startServes=game.world.serves.length,run=projectEconomy(game,player.before);
      const stats=serveValueStats(run.game.world.serves.slice(startServes),player.before.at(-1)!.config);
      return {baseline:run.report,candidate:run.report,k:{baseline:stats,candidate:stats}};
    })();
    sum(baseline,result.baseline.totals);sum(candidate,result.candidate.totals);
    aggregate(result.baseline.rows,'baseline');aggregate(result.candidate.rows,'candidate');
    members.push({id:player.id,revision:player.revision,snapshotRevision:snapshot.revision,inputConfigVersion:game.config.version,commandHash:result.baseline.commandHash,candidateHash:result.candidate.commandHash});
    for(const key of player.keys)keys.set(key,(keys.get(key)??0)+1);
    if(result.k.candidate.totalValue===null)candidateSafe=false;
    else {candidateTotalValue=checked(candidateTotalValue+result.k.candidate.totalValue);candidateServed=checked(candidateServed+result.k.candidate.served);}
  }
  for(const totals of [baseline,candidate])if(totals.closingCoins!==totals.openingCoins+totals.faucet+totals.depositRefunds-totals.sink-totals.penalties)throw Error('registry:forecastConservation');
  // Pooled across every real player actually simulated under the candidate -- mean of means would misweight
  // a low-volume player the same as a high-volume one, so this sums totalValue/served first, then divides once.
  const anchor=store.registry.config(version).values.k.anchorValuePerServe;
  const measuredK=candidateSafe&&candidateServed>0?candidateTotalValue/candidateServed/anchor:null;
  return {version,computedAt:plan.computedAt,through:plan.through,activatesAt:plan.activatesAt,registryRevision:plan.registryRevision,policy:FORECAST_POLICY,
    status:members.length?'complete' as const:'empty' as const,audiencePlayers:members.length,changedPlayers:plan.players.filter(p=>p.keys.length).length,
    keys:[...keys].map(([path,players])=>({path,players})),members,measuredK,
    totals:members.length?{baseline,candidate,delta:difference(baseline,candidate)}:null,
    daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),
    vndRevenue:{status:'unavailable' as const,reason:'No observed donation data; free gameplay sales are not VND revenue.'}};
}
export type EconomicForecast=ReturnType<typeof reportFromBackup>;
/** The production MeasureK: reuses the existing forecast Worker (async, off the event loop) rather than a
 * second mechanism. Falls back to the candidate's own declared k.value only when there is no real player
 * yet to measure against -- it cannot refuse what there is no data to measure. */
export async function measureKViaForecast(store:GameStore,actor:AdminActor,version:string):Promise<number> {
  const report=await forecastEconomy(store,actor,version,new AbortController().signal);
  return report.measuredK??store.registry.config(version).values.k.value;
}

/** Copy + simulate off the HTTP event loop; a failed/cancelled report never returns partial totals. */
export async function forecastEconomy(store:GameStore,actor:AdminActor,version:string,signal:AbortSignal):Promise<EconomicForecast> {
  store.registry.details(actor,version); // authenticate before consuming worker/disk resources
  if(signal.aborted)throw Error('registry:forecastCancelled');
  if(running)throw Error('registry:forecastBusy');
  if(store.path===':memory:')throw Error('registry:forecastUnavailable');
  running=true;
  let dir:string|undefined,worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,abort:(()=>void)|undefined;
  try {
    dir=await mkdtemp(join(tmpdir(),'tbh-forecast-'));
    if(signal.aborted)throw Error('registry:forecastCancelled');
    worker=new Worker(new URL('./forecast-worker.mjs',import.meta.url),{execArgv:[],resourceLimits:{maxOldGenerationSizeMb:HEAP_MB},
      workerData:{source:resolve(store.path),destination:join(dir,'snapshot.db'),actor,version,now:store.serverNow}});
    return await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('registry:forecastTimeout')),TIMEOUT_MS);
      abort=()=>reject(Error('registry:forecastCancelled'));signal.addEventListener('abort',abort,{once:true});
      worker!.once('message',message=>message.error?reject(Error(message.error)):resolve(message.report));
      worker!.once('error',()=>reject(Error('registry:forecastUnavailable')));
      worker!.once('exit',()=>reject(Error('registry:forecastUnavailable')));
    });
  } finally {
    if(timer)clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);
    try {await worker?.terminate();if(dir)await rm(dir,{recursive:true,force:true});} finally {running=false;}
  }
}
