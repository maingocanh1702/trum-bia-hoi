// Isolated test signer/certs: no production entry point imports this file.
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import { GameStore } from '../../server/src/store';
import { createGameServer } from '../../server/src/http';
import { totp } from '../../server/src/admin-auth';
const key=generateKeyPairSync('rsa',{modulusLength:2048}), clientId='browser-admin.apps.googleusercontent.com';
const dir=mkdtempSync(join(tmpdir(),'tbh-admin-browser-')), accounts=join(dir,'accounts.json');
const directory=[{subject:'economy',role:'economy'},{subject:'viewer',role:'viewer'},{subject:'super-one',role:'super',totpSecret:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'},{subject:'super-two',role:'super',totpSecret:'B'.repeat(32)}];
writeFileSync(accounts,JSON.stringify(directory),{mode:0o600});
let offset=0;const now=()=>Date.now()+offset;const store=new GameStore(join(dir,'game.db'),undefined,now);
const certs=createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({test:key.publicKey.export({type:'spki',format:'pem'})}));});
certs.listen(4183,'127.0.0.1');
const client=new OAuth2Client({endpoints:{oauth2FederatedSignonPemCertsUrl:new URL('http://127.0.0.1:4183')}});
const server=createGameServer(store,{origin:'http://127.0.0.1:4181',googleClientId:clientId,adminAccountsFile:accounts,sessionTtlMs:86400000,rateWindowMs:60000,rateMax:10000},client);
const handler=server.listeners('request')[0] as (...args:any[])=>void;server.removeAllListeners('request');
server.on('request',(req,res)=>{
 const url=new URL(req.url!,'http://localhost');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/__test/sign'){
  const sub=url.searchParams.get('subject')!,nonce=url.searchParams.get('nonce')!,seconds=Math.floor(Date.now()/1000),enc=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const body=enc({alg:'RS256',kid:'test'})+'.'+enc({iss:'https://accounts.google.com',sub,aud:clientId,iat:seconds-1,exp:seconds+3600,nonce});
  res.end(JSON.stringify({credential:body+'.'+sign('RSA-SHA256',Buffer.from(body),key.privateKey).toString('base64url')}));return;
 }
 if(url.pathname==='/__test/otp'){const secret=directory.find(x=>x.subject===url.searchParams.get('subject'))?.totpSecret;res.end(JSON.stringify({code:secret?totp(secret,Math.floor(now()/30000)):null}));return;}
 if(url.pathname==='/__test/advance'){offset+=Number(url.searchParams.get('ms'));res.end('{}');return;}
 handler(req,res);
});
server.listen(4182,'127.0.0.1');
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{server.closeAllConnections();server.close(()=>{certs.close(()=>{store.close();rmSync(dir,{recursive:true,force:true});});});});
