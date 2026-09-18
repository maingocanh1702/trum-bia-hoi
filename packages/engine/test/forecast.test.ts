import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, decodeSave, isEconomy2, leaseQuote, type Config, type Command } from '../src';
import { projectEconomy, compareEconomy, DAY_MS } from '../sim/forecast';
const START=Date.parse('2026-09-09T00:00:00+07:00');
const changed=(version:string,edit:(raw:Config['raw'])=>void)=>{const raw=structuredClone(config.raw);raw._meta.version=version;edit(raw);return loadConfig(raw);};

test('seven-day projection conserves the wallet, preserves a real paused input and deterministically replays every modeled command',()=>{
 const source=new Game(config,42,START);source.command({command:{type:'startShift'},at:START,idempotencyKey:'real-open'});
 source.command({command:{type:'activity',active:true,paused:true},at:START+5000,idempotencyKey:'real-menu'});
 const before=encodeSave(source),a=projectEconomy(source,[{from:0,config}]),b=projectEconomy(source,[{from:0,config}]);
 assert.deepEqual(a.report,b.report);assert.equal(encodeSave(source),before);assert.equal(a.report.to,source.world.now+7*DAY_MS);assert.equal(a.game.world.now,a.report.to-1);
 assert.ok(a.report.rows.every(row=>row.closingCoins===row.openingCoins+row.faucet+row.depositRefunds-row.sink-row.penalties));
 assert.ok(a.report.totals.faucet>0&&a.report.totals.sink>0&&a.report.totals.penalties>0);assert.equal(a.report.vndRevenue.status,'unavailable');
 assert.deepEqual(decodeSave(encodeSave(a.game)).world,a.game.world);
});

test('scheduled and expired prices switch only at real openings while the existing shift retains its immutable pin',()=>{
 const source=new Game(config,7,START);source.command({command:{type:'startShift'},at:START,idempotencyKey:'open'});source.advance(START+5000);
 const campaign=changed('forecast-price',raw=>{raw.menu.bia.price+=10;});
 const starts=START+60000,expires=START+12*3600000;
 const result=projectEconomy(source,[{from:0,config},{from:starts,config:campaign},{from:expires,config}],2);
 const openings=result.game.log.filter(e=>e.command.type==='startShift'&&e.result.ok);
 assert.equal(openings[0].configVersion,config.version);assert.ok(openings.some(e=>e.at>=starts&&e.at<expires&&e.configVersion===campaign.version));
 assert.ok(openings.some(e=>e.at>=expires&&e.configVersion===config.version));
 for(const e of result.game.world.events.filter(e=>e.type==='customer_served'&&e.at<openings[1].at))assert.equal(e.configVersion,config.version);
 assert.deepEqual(decodeSave(encodeSave(result.game)).world,result.game.world);
});

test('a daily cap exhausted before a midday activation is retried at that activation instead of skipped until tomorrow',()=>{
 const cap=(n:number)=>changed('forecast-cap-'+n,raw=>{raw.shift.dailyShiftCap.newbie=n;raw.entitlements.freeSessionsPerDay.bySegment.newbie=n;});
 const zero=cap(0),one=cap(1),two=cap(2),source=new Game(zero,42,START),activation=START+12*3600000;
 const report=compareEconomy(source,[{from:0,config:zero},{from:activation,config:one}],[{from:0,config:zero},{from:activation,config:two}],1);
 assert.equal(report.baseline.rows[0].shiftsOpened,1);assert.equal(report.candidate.rows[0].shiftsOpened,2);
 assert.equal(report.delta.faucet,report.candidate.totals.faucet-report.baseline.totals.faucet);
 assert.notEqual(report.delta.faucet,0);assert.equal(source.world.completedShifts,0);
});

test('a candidate whose after-timeline versions are a subset of the before-timeline measures the CANDIDATE run, not baseline\'s',()=>{
 // Baseline plays config-pricing for the first 3 days then campaign-pricing for the rest; candidate plays
 // campaign-pricing the WHOLE time. candidateVersions (after minus before) is empty -- {campaign.version}
 // is already inside beforeVersions {config.version, campaign.version} -- the simplest real case of "the
 // candidate never introduces a version outside baseline's own set" (e.g. removing a player from a scope
 // collapses their after-timeline onto a version already in their before-timeline). But an identical
 // version SET does not mean an identical serve DISTRIBUTION: these are two independent simulations from
 // the same source, and one of them experiences campaign pricing for 4 more days than the other. A first
 // attempt at this fix measured baselineRun's own events for the fallback instead of candidateRun's,
 // silently reporting the wrong run's economics whenever a case like this arose (codex round 5 finding,
 // caught before it shipped) -- k.candidate must reflect what the CANDIDATE simulation actually did.
 const source=new Game(config,42,START);source.command({command:{type:'startShift'},at:START,idempotencyKey:'open'});
 const activation=START+3*DAY_MS,campaign=changed('forecast-subset-campaign',raw=>{raw.menu.bia.price+=10;});
 const report=compareEconomy(source,[{from:0,config},{from:activation,config:campaign}],[{from:0,config:campaign}],7);
 assert.notEqual(report.k.candidate.served,0);
 assert.notEqual(report.k.candidate.mean,report.k.baseline.mean);
});

test('forecast rejects unsupported horizons and ambiguous timelines before projecting',()=>{
 const source=new Game(config,42,START);
 for(const days of [0,-1,1.1,8,NaN,Infinity])assert.throws(()=>projectEconomy(source,[{from:0,config}],days),/forecast:days/);
 for(const timeline of [[],[{from:START+1,config}],[{from:0,config},{from:0,config}],[{from:NaN,config}],[{from:-1,config}]])assert.throws(()=>projectEconomy(source,timeline),/forecast:timeline/);
 assert.equal(source.log.length,0);
});

test('an existing signed lease separates returned principal and renews by location identity after multiplier tuning',()=>{
 const fixture=changed('forecast-lease-fixture',raw=>{
  assert.ok(isEconomy2(raw));raw.shift.startingCoinsBase=1000000;
  raw.lifePath[1].lifetimeBase=1;raw.lifePath[1].requires=raw.lifePath[1].requires!.map(()=>'LP0');
 });
 const source=new Game(fixture,42,START);
 const send=(command:Command)=>assert.ok(source.command({command,at:source.world.now,idempotencyKey:`lease-setup-${source.log.length}`}).ok);
 send({type:'startShift'});source.advance(START+11000);
 const table=source.world.tables.find(t=>t.order?.items.every(i=>i.state==='ready'))!;
 send({type:'serve',tableId:table.id,orderId:table.order!.id});send({type:'endShift'});source.advance(source.world.now+3600000);
 assert.equal(source.world.lifePath,1);
 const quote=leaseQuote(source.world,fixture,'ngo_cho');assert.ok(quote.ok);
 send({type:'rentLocation',locationId:'ngo_cho',leaseId:quote.leaseId,maxCost:quote.cost});
 const lease=structuredClone(source.world.lease!);source.advance(lease.expiresAt-1000);
 const before=encodeSave(source),eventStart=source.world.events.length,result=projectEconomy(source,[{from:0,config:fixture}],1);
 assert.equal(result.report.totals.depositRefunds,lease.deposit);assert.ok(result.report.totals.penalties>0);
 const events=result.game.world.events.slice(eventStart);
 assert.equal(events.filter(e=>e.type==='lease_deposit_refunded').length,1);
 assert.equal(result.report.totals.penalties,events.filter(e=>e.type==='order_expired'||e.type==='shipper_missed').reduce((n,e)=>n+Number(e.data.penalty),0));
 assert.equal(encodeSave(source),before);assert.deepEqual(decodeSave(encodeSave(result.game)).world,result.game.world);
 const raw=structuredClone(fixture.raw);raw._meta.version='forecast-retuned-locations';
 for(const location of raw.locations.list)location.mult+=1;
 const retuned=loadConfig(raw),next=projectEconomy(source,[{from:0,config:retuned}],1);
 const opening=next.game.log.slice(source.log.length).find(e=>e.command.type==='startShift'&&e.result.ok)!;
 assert.equal(opening.configVersion,retuned.version);assert.ok(opening.at<lease.expiresAt);
 const renewal=next.game.log.find(e=>e.at>=lease.expiresAt&&e.command.type==='rentLocation'&&e.result.ok)!;
 assert.equal((renewal.command as Extract<Command,{type:'rentLocation'}>).locationId,'ben_xe');
 assert.equal(encodeSave(source),before);assert.deepEqual(decodeSave(encodeSave(next.game)).world,next.game.world);
 const expired=decodeSave(before);expired.advance(lease.expiresAt);
 assert.equal(expired.world.lease,undefined);assert.equal(expired.world.location,fixture.values.locations.fallback);
 const resumed=projectEconomy(expired,[{from:0,config:fixture}],1);
 const afterExpiry=resumed.game.log.slice(expired.log.length).find(e=>e.command.type==='rentLocation'&&e.result.ok)!;
 assert.equal((afterExpiry.command as Extract<Command,{type:'rentLocation'}>).locationId,'ben_xe');
 assert.deepEqual(decodeSave(encodeSave(resumed.game)).world,resumed.game.world);
});
