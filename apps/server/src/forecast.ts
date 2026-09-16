import { Worker } from 'node:worker_threads';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compareEconomy, projectEconomy, FORECAST_DAYS, DAY_MS, FORECAST_POLICY, type ForecastDay } from '../../../packages/engine/sim/forecast';
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
    let result:{baseline:ReturnType<typeof projectEconomy>['report'];candidate:ReturnType<typeof projectEconomy>['report']};
    if(player.keys.length) {
      const compared=compareEconomy(game,player.before,player.after);
      result=compared;
      // Only a player who actually diverges under the candidate tells us anything about ITS real economics --
      // one whose resolved config never changes within this horizon (masked by a more specific scope, or the
      // change activates beyond the forecast window) must not smuggle baseline-labeled-candidate data into the
      // pool (codex round 1 finding: a price hike scheduled past the horizon measured in-band on zero real data).
      if(compared.k.candidate.totalValue===null)candidateSafe=false;
      else {candidateTotalValue=checked(candidateTotalValue+compared.k.candidate.totalValue);candidateServed=checked(candidateServed+compared.k.candidate.served);}
    } else {
      const report=projectEconomy(game,player.before).report;
      result={baseline:report,candidate:report};
    }
    sum(baseline,result.baseline.totals);sum(candidate,result.candidate.totals);
    aggregate(result.baseline.rows,'baseline');aggregate(result.candidate.rows,'candidate');
    members.push({id:player.id,revision:player.revision,snapshotRevision:snapshot.revision,inputConfigVersion:game.config.version,commandHash:result.baseline.commandHash,candidateHash:result.candidate.commandHash});
    for(const key of player.keys)keys.set(key,(keys.get(key)??0)+1);
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
 * second mechanism. Throws when there is no real measured data (no players, or none actually experience the
 * candidate within the horizon) -- the row stays 'pending' rather than silently certifying the self-reported
 * k.value, which is exactly the gap this feature closes (codex round 1 finding: fail closed, not open). */
export async function measureKViaForecast(store:GameStore,actor:AdminActor,version:string):Promise<number> {
  const report=await forecastEconomy(store,actor,version,new AbortController().signal);
  if(report.measuredK===null)throw Error('registry:forecastEmpty');
  return report.measuredK;
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
