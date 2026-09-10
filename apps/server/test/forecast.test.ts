import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {config,loadConfig} from '@tbh/engine';
import {GameStore} from '../src/store';
import {forecastEconomy} from '../src/forecast';
import type {AdminActor,ConfigScope} from '../src/registry';
const NOW=Date.parse('2026-09-10T00:00:00+07:00'),DAY=86400000;
function fixture(t:{after(fn:()=>void):void}) {
 const dir=mkdtempSync(join(tmpdir(),'tbh-forecast-test-')),file=join(dir,'game.db');
 const raw=structuredClone(config.raw);raw._meta.version='forecast-test';raw.shift.dailyShiftCap.newbie=1;raw.entitlements.freeSessionsPerDay.bySegment.newbie=1;
 const store=new GameStore(file,loadConfig(raw),()=>NOW),db=new DatabaseSync(file),registry=store.registry;
 const actor:AdminActor={subject:'super',role:'super',mfa:true,issuedAt:NOW,expiresAt:NOW+3600000};let serial=0;
 const propose=(scope?:ConfigScope)=>{const snapshot=structuredClone(registry.config(registry.latest().version).raw);snapshot.menu.bia.price+=10;
  return registry.propose(actor,{key:'p'+ ++serial,baseVersion:registry.latest().version,snapshot,reason:'Forecast fixture',scope});};
 const publish=(scope:ConfigScope)=>{const d=propose(scope);registry.approve(actor,d.version);registry.publish(actor,d.version);return d.version;};
 const scope=(id:string,playerIds=['alice'],extra:Partial<ConfigScope>={}):ConfigScope=>({kind:'segment',id,playerIds,priority:0,expiresAt:null,previousVersion:null,ticketId:null,...extra});
 t.after(()=>{db.close();store.close();rmSync(dir,{force:true,recursive:true});});
 return {store,db,registry,actor,propose,publish,scope};
}
test('seven-day registry plan includes removed audience and expiry boundaries even when activation is masked',t=>{
 const f=fixture(t);for(const id of ['alice','bob'])f.store.createPlayer(id,42);
 const prior=f.publish(f.scope('club',['alice','bob']));
 const campaign=f.publish(f.scope('event',['alice'],{kind:'campaign',expiresAt:NOW+DAY}));
 const d=f.propose(f.scope('club',['bob'],{previousVersion:prior}));
 const plan=f.registry.forecastPlan(f.actor,d.version,NOW+7*DAY);
 assert.deepEqual(plan.players.map(p=>p.id),['alice','bob']);
 const a=plan.players[0];assert.equal(a.before[0].config.raw.menu.bia.price,a.after[0].config.raw.menu.bia.price);
 assert.ok(a.keys.includes('menu.bia.price'));
 const expired=a.after.find(p=>p.from===NOW+DAY)!;assert.equal(expired.config.raw.menu.bia.price,config.raw.menu.bia.price);
 assert.ok(a.before.find(p=>p.from===NOW+DAY)!.config.raw.menu.bia.price>expired.config.raw.menu.bia.price);
 assert.ok(campaign);assert.throws(()=>f.registry.forecastPlan({...f.actor,expiresAt:NOW},d.version,NOW+7*DAY),/invalidActor/);
});
test('real worker forecasts all existing saves, preserves source rows and keeps the request event loop responsive',async t=>{
 const f=fixture(t);f.store.createPlayer('alice',42);
 f.store.command('alice',{command:{type:'startShift'},idempotencyKey:'open'});
 f.store.command('alice',{command:{type:'activity',active:true,paused:true},idempotencyKey:'menu'});
 const version=f.propose().version;
 const dump=()=>JSON.stringify(['players','commands','events','configs','engine_checkpoints','client_presence','registry_publications','registry_audit'].map(table=>f.db.prepare(`SELECT * FROM ${table}`).all()));
 const before=dump();let ticks=0;const timer=setInterval(()=>ticks++,10);
 let result;try {result=await forecastEconomy(f.store,f.actor,version,new AbortController().signal);}finally{clearInterval(timer);}
 assert.ok(ticks>1);assert.equal(dump(),before);assert.equal(result.status,'complete');assert.equal(result.audiencePlayers,1);assert.equal(result.changedPlayers,1);
 assert.equal(result.through-result.computedAt,7*DAY);assert.equal(result.daily.length,7);
 assert.ok(result.totals!.candidate.faucet>result.totals!.baseline.faucet);assert.equal(result.totals!.delta.faucet,result.totals!.candidate.faucet-result.totals!.baseline.faucet);
 assert.equal(result.members[0].inputConfigVersion,'forecast-test');assert.equal(result.vndRevenue.status,'unavailable');
 for(const side of ['baseline','candidate'] as const)for(const totals of [result.totals![side],...result.daily.map(r=>r[side])]) {
  assert.equal(totals.closingCoins,totals.openingCoins+totals.faucet+totals.depositRefunds-totals.sink-totals.penalties);
 }
});
test('forecast cancellation releases its worker slot and empty audiences do not fabricate revenue',async t=>{
 const f=fixture(t),version=f.propose().version,abort=new AbortController();
 const pending=forecastEconomy(f.store,f.actor,version,abort.signal);
 await assert.rejects(forecastEconomy(f.store,f.actor,version,new AbortController().signal),/forecastBusy/);
 abort.abort();await assert.rejects(pending,/forecastCancelled/);
 const report=await forecastEconomy(f.store,f.actor,version,new AbortController().signal);
 assert.equal(report.status,'empty');assert.equal(report.totals,null);assert.deepEqual(report.members,[]);
 await assert.rejects(forecastEconomy(f.store,{...f.actor,expiresAt:NOW},version,new AbortController().signal),/invalidActor/);
});

test('a later scoped publication invalidates the report even while its default proposal base remains current',t=>{
 const f=fixture(t);f.store.createPlayer('alice',42);const draft=f.propose();
 const report=f.registry.forecastPlan(f.actor,draft.version,NOW+7*DAY);
 assert.doesNotThrow(()=>f.registry.assertForecastCurrent(f.actor,report));
 f.publish(f.scope('later-campaign',['alice'],{kind:'campaign',expiresAt:NOW+DAY}));
 assert.equal(f.registry.latest().version,draft.base_version);
 assert.throws(()=>f.registry.assertForecastCurrent(f.actor,report),/staleForecast/);
});
