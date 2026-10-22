import assert from 'node:assert/strict';
import {Game,config,loadConfig,DISHES,restockQuote,summarizeRush,type Command} from '../src';
import {furnishFirstAlley} from './scenario';
// config-exempt: controlled experiment seeds, sampling step and starting bankroll; never live tuning.
const rows: (ReturnType<typeof summarizeRush> & { seed: number; kind: 'none' | 'light' | 'heavy'; seconds: number; loss: number; perSec: number })[]=[];
for(const seed of [20260611,42,20260908,7,99]) for(const kind of ['none','light','heavy'] as const){
 const raw=structuredClone(config.raw); raw.onboarding.enabled=false;raw.shift.startingCoinsBase=100000;raw.rush.schedule.perShift=0;
 for(const weather of ['sunny','hot','humid','rain','cold'] as const)raw.weather[weather].weight=weather==='sunny'?1:0;
 const g=new Game(loadConfig(raw),seed,0),w=g.world,c=g.config.values;
 furnishFirstAlley(g);
 const send=(command:Command)=>g.command({idempotencyKey:`probe-${g.log.length}`,at:w.now,command});
 send({type:'startShift'});
 const start=c.rush.schedule.noRushFirstMs,end=start+(kind==='none'?c.rush.heavy.durationMs:c.rush[kind].durationMs);
 // Controlled measurement pulse, independent of randomized placement; production scheduler is separately verified.
 if(kind!=='none')w.shift!.rushes=[{kind,start,end}];

 while(w.now<end){
  for(const dish of DISHES)if(restockQuote(w,g.config,dish,'full').ok)send({type:'restock',dish,mode:'full'});
  const ready=w.tables.filter(t=>t.order&&['pending','grace'].includes(t.order.state)&&t.order.items.every(i=>i.state==='ready'));
  ready.sort((a,b)=>a.order!.placedAt+a.order!.patienceMs-b.order!.placedAt-b.order!.patienceMs);
  for(const t of ready)send({type:'serve',tableId:t.id,orderId:t.order!.id});
  g.advance(Math.min(end,w.now+100));
 }
 const during=w.events.filter(e=>e.at>=start&&e.at<end), s=summarizeRush(during,0);
 const spawns=during.filter(e=>e.type==='customer_spawned'||e.type==='queue_overflow');
 for(let i=1;i<spawns.length;i++)assert.ok(spawns[i].at-spawns[i-1].at>=c.rush[kind].floorMs, 'spawn floor');
 const handoffs=during.filter(e=>e.type==='order_served');
 for(let i=1;i<handoffs.length;i++)assert.ok(handoffs[i].at-handoffs[i-1].at>=1000/c.spawn.playerServeCeilingPerSec,'service ceiling');
 if(kind!=='none'){const report=w.events.find(e=>e.type==='rush_ended')!.data;for(const [key,value] of Object.entries(s))assert.equal(report[key],value,'reported '+key);}
 rows.push({seed,kind,seconds:(end-start)/1000,...s,loss:s.lost/(s.served+s.lost),perSec:s.arrived/((end-start)/1000)});
}
console.table(rows);

for(const seed of [20260611,42,20260908,7,99]) {
 const normal=rows.find(r=>r.seed===seed&&r.kind==='none')!,light=rows.find(r=>r.seed===seed&&r.kind==='light')!,heavy=rows.find(r=>r.seed===seed&&r.kind==='heavy')!;
 assert.ok(normal.served>0&&light.served>0&&heavy.served>0);
 assert.ok(heavy.perSec>light.perSec&&light.perSec>normal.perSec,'demand grows by rush strength');
 assert.ok(heavy.loss>light.loss&&light.loss>=normal.loss,'heavy pressure exceeds light and normal');
}
console.log('PASS: controlled sunny pulses, initial devices, canonical rush durations, floor and serve ceiling; per-window event outcomes, not completed arrival cohorts. k is measured separately by sim.');
