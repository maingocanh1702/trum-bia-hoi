// Isolated acceptance server: production config/HTTP/store, with overnight-only clock acceleration.
import { config, nextDayAt } from '@tbh/engine';
import { GameStore } from '../../server/src/store';
import { createGameServer } from '../../server/src/http';
let offset=0;
const now=()=>Date.now()+offset, store=new GameStore(':memory:',config,now);
const port=Number(process.env.TBH_PORT),origin=process.env.TBH_ORIGIN!;
const server=createGameServer(store,{origin,sessionTtlMs:604800000,rateWindowMs:60000,rateMax:10000}); // config-exempt: isolated acceptance transport
const handler=server.listeners('request')[0] as (...args:any[])=>void;
server.removeAllListeners('request');server.on('request',(req,res)=>{
  if(req.method!=='POST'||req.url!=='/__test/overnight'){handler(req,res);return;}
  const token=req.headers.cookie?.match(/(?:^|;\s*)tbh-session=([^;]+)/)?.[1],owner=token&&store.session(token);
  if(!token||!owner||store.read(owner.playerId).world.phase!=='resting'){res.writeHead(409);res.end();return;}
  const clientId=store.connect(owner.playerId).clientId;let beatSeq=0;
  const beat=()=>store.heartbeat(token,{clientId,beatSeq:++beatSeq,active:true,paused:false});
  // First shift is real wall time. Only rest after this summary is accelerated.
  beat();
  const restMs=Math.ceil(config.values.shift.durationMs/config.values.shift.regenRate);
  for(let elapsed=0;elapsed<restMs;){const step=Math.min(store.heartbeatIntervalMs,restMs-elapsed);offset+=step;elapsed+=step;beat();}
  offset+=nextDayAt(now(),config)-now()+1;store.sweepPresence();
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({overnight:true,restMs}));
});
server.listen(port,'127.0.0.1'); // config-exempt: isolated acceptance port
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{server.closeAllConnections();server.close(()=>store.close());});
