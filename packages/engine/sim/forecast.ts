import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game, nextDayAt, dayKey, serveValueStats, type Config, type Command } from '../src/index';
import { createManagementPolicy, serveNext, STEP_MS, MANAGEMENT_MS, MAX_DAY_STEPS } from './policy';

// config-exempt: BRD5.2 report horizon and calendar units; diagnostic, not gameplay tuning.
export const FORECAST_DAYS=7, DAY_MS=86400000;
export const FORECAST_POLICY='v1: continuously active career policy; 100ms deadline service, 1s management; quote-governed purchases and earned claims; full configured stamina rest; engine-enforced daily caps; no future arrivals of new players or donation assumptions. Existing shifts retain their pin. This is a deterministic scenario, not a prediction of human activity.';
export type ConfigPeriod={from:number;config:Config};
export type ForecastDay={date:string;from:number;to:number;openingCoins:number;closingCoins:number;
  faucets:Record<string,number>;sinks:Record<string,number>;faucet:number;sink:number;penalties:number;depositRefunds:number;
  shiftsOpened:number;shiftsClosed:number;served:number;countedEarned:number};
const safe=(n:number)=>{assert.ok(Number.isSafeInteger(n)&&n>=0,'forecast:unsafeAmount');return n;};
const total=(values:Record<string,number>)=>Object.values(values).reduce((sum,n)=>safe(sum+safe(n)),0);

/** Input MUST be an integrity-checked server Game, never a client-provided checkpoint. */
export function projectEconomy(source:Game,timeline:readonly ConfigPeriod[],days=FORECAST_DAYS) {
  assert.ok(Number.isInteger(days)&&days>=1&&days<=FORECAST_DAYS,'forecast:days');
  const startAt=source.world.now,endAt=startAt+days*DAY_MS;
  assert.ok(Number.isSafeInteger(endAt)&&Number.isFinite(new Date(endAt).getTime()),'forecast:clock');
  assert.ok(timeline.length&&timeline[0].from<=startAt,'forecast:timeline');
  for(let i=0;i<timeline.length;i++)assert.ok(Number.isSafeInteger(timeline[i].from)&&timeline[i].from>=0&&
    Number.isFinite(new Date(timeline[i].from).getTime())&&(!i||timeline[i].from>timeline[i-1].from),'forecast:timeline');
  const game=Game.restoreTrusted(source.configs,structuredClone({seed:source.seed,createdAt:source.createdAt,world:source.world,log:source.log}),source.checkpoint());
  const w=game.world,rows:ForecastDay[]=[],logStart=game.log.length;
  const usedKeys=new Set(game.log.map(e=>e.idempotencyKey));let serial=0,lastManagement=-Infinity;
  let row:ForecastDay;
  const add=(values:Record<string,number>,key:string,amount:number)=>{values[key]=safe((values[key]??0)+safe(amount));};
  function observe(action:()=>void,command?:Command['type']) {
    const before=w.coins,eventStart=w.events.length;action();
    let refunds=0,penalties=0;
    for(const event of w.events.slice(eventStart)) {
      if(event.type==='lease_deposit_refunded')refunds=safe(refunds+safe(Number(event.data.amount)));
      if(event.type==='order_expired'||event.type==='shipper_missed')penalties=safe(penalties+safe(Number(event.data.penalty)));
      if(event.type==='shift_opened')row.shiftsOpened++;
    }
    row.depositRefunds=safe(row.depositRefunds+refunds);row.penalties=safe(row.penalties+penalties);
    const delta=w.coins-before-refunds+penalties;
    if(command){if(delta>0)add(row.faucets,command,delta);else if(delta<0)add(row.sinks,command,-delta);}
    else assert.equal(delta,0,'forecast:unclassifiedClockMoney');
    safe(w.coins);
  }
  function send(command:Command,opening?:Config) {
    let key:string;do{key=`forecast-${logStart}-${++serial}`;}while(usedKeys.has(key));usedKeys.add(key);
    let result:ReturnType<Game['command']>;
    observe(()=>{result=game.command({command,at:w.now,idempotencyKey:key},opening);},command.type);
    return result!;
  }
  const requireCommand=(command:Command)=>{const r=send(command);assert.ok(r.ok,`forecast:command:${command.type}:${r.reason}`);};
  const manage=createManagementPolicy(game,requireCommand);
  const advance=(to:number)=>observe(()=>game.advance(to));
  let currentPeriod=0;
  function period(){while(currentPeriod+1<timeline.length&&timeline[currentPeriod+1].from<=w.now)currentPeriod++;return timeline[currentPeriod];}
  while(w.now<endAt-1) {
    const from=rows.length?w.now+1:w.now,to=Math.min(nextDayAt(from,game.config),endAt);
    const earned=w.lifetimeEarned,completed=w.completedShifts,serves=w.serves.length;
    row={date:dayKey(from,game.config),from,to,openingCoins:w.coins,closingCoins:w.coins,faucets:{},sinks:{},faucet:0,sink:0,penalties:0,depositRefunds:0,shiftsOpened:0,shiftsClosed:0,served:0,countedEarned:0};
    if(from>w.now)advance(from);
    if(!w.active||w.paused||w.disconnection)requireCommand({type:'activity',active:true,paused:false});
    let steps=0;
    while(w.now<to-1) {
      assert.ok(++steps<=MAX_DAY_STEPS,'forecast:stepBudget');
      if(w.phase==='resting') {
        const c=game.config.values;
        if(w.staminaMs<c.shift.durationMs) {
          const at=w.now+Math.ceil((c.shift.durationMs-w.staminaMs)/c.shift.regenRate);
          assert.ok(Number.isSafeInteger(at)&&at>w.now,'forecast:restClock');advance(Math.min(to-1,at));
          if(w.now>=to-1)break;
        }
        manage();const next=period(),result=send({type:'startShift'},next.config);
        if(!result.ok){
          assert.equal(result.reason,'dailyShiftCap',`forecast:opening:${result.reason}`);
          const changeAt=timeline[currentPeriod+1]?.from??to-1;advance(Math.min(to-1,changeAt));continue;
        }
      }
      if(w.now-lastManagement>=MANAGEMENT_MS){manage();lastManagement=w.now;}
      serveNext(game,requireCommand);advance(Math.min(to-1,w.now+STEP_MS));
    }
    row.faucet=total(row.faucets);row.sink=total(row.sinks);row.closingCoins=w.coins;
    row.shiftsClosed=w.completedShifts-completed;row.served=w.serves.length-serves;row.countedEarned=safe(w.lifetimeEarned-earned);
    assert.equal(row.closingCoins,row.openingCoins+row.faucet+row.depositRefunds-row.sink-row.penalties,'forecast:walletConservation');rows.push(row);
  }
  const sum=(key:'faucet'|'sink'|'penalties'|'depositRefunds')=>rows.reduce((n,row)=>safe(n+row[key]),0);
  const totals={faucet:sum('faucet'),sink:sum('sink'),penalties:sum('penalties'),depositRefunds:sum('depositRefunds'),openingCoins:source.world.coins,closingCoins:w.coins};
  assert.equal(totals.closingCoins,totals.openingCoins+totals.faucet+totals.depositRefunds-totals.sink-totals.penalties,'forecast:walletConservation');
  const report={policy:FORECAST_POLICY,playerId:source.playerId,seed:source.seed,from:startAt,to:endAt,throughAt:w.now,
    inputConfigVersion:source.config.version,inputCommandCount:logStart,inputEventCount:source.world.events.length,
    timeline:timeline.map(p=>({from:p.from,configVersion:p.config.version})),rows,totals,
    commandCount:game.log.length-logStart,commandHash:createHash('sha256').update(JSON.stringify(game.log.slice(logStart))).digest('hex'),
    vndRevenue:{status:'unavailable' as const,reason:'No observed donation data; free gameplay sales are not a revenue model.'}};
  return {game,report};
}

export function compareEconomy(source:Game,before:readonly ConfigPeriod[],after:readonly ConfigPeriod[],days=FORECAST_DAYS) {
  const startServes=source.world.serves.length;
  const baselineRun=projectEconomy(source,before,days),candidateRun=projectEconomy(source,after,days);
  const baseline=baselineRun.report,candidate=candidateRun.report;
  const delta=Object.fromEntries((['faucet','sink','penalties','depositRefunds','closingCoins'] as const).map(key=>[key,candidate.totals[key]-baseline.totals[key]]));
  // The real per-serve k for each side, from the serves actually generated during this projection --
  // the only place a candidate's TRUE economics get measured, not just its self-reported k.value.
  const k={baseline:serveValueStats(baselineRun.game.world.serves.slice(startServes),before.at(-1)!.config),
    candidate:serveValueStats(candidateRun.game.world.serves.slice(startServes),after.at(-1)!.config)};
  return {baseline,candidate,delta,k};
}
