import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, flyerQuote, WEATHER, RUSH_TYPES, arrivalIntervalMs, encodeSave, decodeSave, requirementStatus, type Command, type Economy } from '../src';
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `flyer-${g.log.length}` });
function setup(patch = (_: Economy) => {}) {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0; raw.unlocks.flyer.gate = 'LP0';
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  patch(raw); return new Game(loadConfig(raw), 5, 0);
}
const activate = (g: Game) => send(g, { type: 'activateFlyer', shiftId: g.world.shift!.id });
function serveReady(g: Game) {
  for (const table of g.world.tables) if (table.order?.state === 'pending' && table.order.items.every(i => i.state === 'ready')) send(g, { type: 'serve', tableId: table.id, orderId: table.order.id });
}

test('flyers spend exact reputation once, refuse full stock and preserve coin ledgers and acquired ownership', () => {
  const locked = new Game(); locked.world.reputation = 10000;
  assert.equal(send(locked, { type: 'buyFlyer' }).reason, 'featureLocked'); assert.equal(locked.world.flyers, undefined);
  const g = setup(), w = g.world, cost = g.config.values.unlocks.flyer.repBase;
  w.reputation = cost - 1; assert.equal(send(g, { type: 'buyFlyer' }).reason, 'reputationRequired');
  w.reputation = cost; const coins = w.coins;
  const e = { command: { type: 'buyFlyer' as const }, at: w.now, idempotencyKey: 'exact-buy' };
  assert.deepEqual(g.command(e), { ok: true, amount: cost }); assert.equal(w.reputation, 0); assert.equal(w.flyers, 1);
  assert.deepEqual(g.command(e), { ok: true, amount: cost }); assert.equal(w.flyers, 1);
  w.reputation = cost * 5;
  while (w.flyers! < g.config.values.unlocks.flyer.stockCap) assert.ok(send(g, { type: 'buyFlyer' }).ok);
  const rep = w.reputation; assert.equal(send(g, { type: 'buyFlyer' }).reason, 'flyerStockFull'); assert.equal(w.reputation, rep);
  assert.equal(w.coins, coins); assert.equal(w.seasonEarned, 0); assert.equal(w.lifetimeEarned, 0);
  assert.equal(w.unlocks.filter(x => x === 'flyer').length, 1); assert.ok(requirementStatus(w, g.config, 'flyer').met);
  assert.ok(send(g, { type: 'startShift' }).ok); assert.ok(activate(g).ok);
  w.flyers = 0; assert.ok(requirementStatus(w, g.config, 'flyer').met);
  w.reputation = cost; assert.ok(send(g, { type: 'buyFlyer' }).ok); assert.equal(w.shift!.stats.rep, -cost); assert.equal(w.shift!.stats.spent, 0);
  const purchase = w.events.filter(e => e.type === 'flyer_bought').at(-1)!;
  assert.equal(purchase.data.reputationBefore, cost); assert.equal(purchase.data.reputationAfter, 0);
});

test('campaign consumption checks the current shift, activity, stock and configurable per-shift usage', () => {
  const g = setup(r => { r.unlocks.flyer.repBase = 0; r.unlocks.flyer.perShift = 2; r.unlocks.flyer.campaignMs = 2000; });
  for (let i = 0; i < 3; i++) assert.ok(send(g, { type: 'buyFlyer' }).ok);
  assert.equal(send(g, { type: 'activateFlyer', shiftId: 'old' }).reason, 'shiftChanged');
  assert.ok(send(g, { type: 'startShift' }).ok); const s = g.world.shift!;
  assert.ok(send(g, { type: 'activity', active: false }).ok); assert.equal(activate(g).reason, 'flyerOpenShift'); send(g, { type: 'activity', active: true });
  assert.equal(send(g, { type: 'activateFlyer', shiftId: 'old' }).reason, 'shiftChanged');
  const e = { command: { type: 'activateFlyer' as const, shiftId: s.id }, at: g.world.now, idempotencyKey: 'activate-once' };
  assert.ok(g.command(e).ok); assert.ok(g.command(e).ok); assert.equal(g.world.flyers, 2); assert.equal(s.flyersUsed, 1);
  assert.equal(activate(g).reason, 'flyerActive'); g.advance(s.flyer!.end); assert.ok(activate(g).ok);
  g.advance(s.flyer!.end); assert.equal(activate(g).reason, 'flyerUsed'); assert.equal(g.world.flyers, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  assert.equal(g.command({ command: { type: 'activateFlyer' }, at: g.world.now, idempotencyKey: 'bad' } as never).reason, 'invalidCommand');
});

test('every weather and rush combines flyer demand once; pending arrival and seated patience stay intact', () => {
  for (const weather of WEATHER) for (const kind of RUSH_TYPES) {
    const g = setup(r => { r.unlocks.flyer.repBase = 0; for (const k of WEATHER) r.weather[k].weight = k === weather ? 1 : 0; });
    send(g, { type: 'buyFlyer' }); send(g, { type: 'startShift' }); const w = g.world, s = w.shift!;
    if (kind !== 'none') s.rushes = [{ kind, start: 0, end: g.config.values.shift.durationMs }];
    g.advance(s.nextSpawnAt); const pending = s.nextSpawnAt, tables = structuredClone(w.tables), queue = structuredClone(w.queue);
    assert.ok(activate(g).ok); assert.equal(s.nextSpawnAt, pending); assert.deepEqual(w.tables, tables); assert.deepEqual(w.queue, queue);
    g.advance(pending); const e = w.events.filter(e => ['customer_spawned', 'queue_overflow'].includes(e.type)).at(-1)!;
    const c = g.config.values, raw = (kind === 'none' ? Math.max(c.spawn.baseMs, c.rush.none.floorMs) : c.spawn.baseMs) * c.weather[weather].spawnIntervalMult * c.rush[kind].spawnIntervalMult * c.unlocks.flyer.spawnIntervalMult;
    const expected = kind === 'none' ? raw : Math.max(raw, c.rush[kind].floorMs);
    assert.equal(s.nextSpawnAt - pending, Math.round(expected * Number(e.data.size)));
    assert.equal(arrivalIntervalMs(c, weather, kind, true), expected);
    if (kind !== 'none') assert.ok(expected >= c.rush[kind].floorMs);
  }
});

test('hidden time preserves campaign duration; reports end once before boundary events and survive closing', () => {
  const g = setup(r => { r.unlocks.flyer.repBase = 0; r.unlocks.flyer.campaignMs = 30000; });
  send(g, { type: 'buyFlyer' }); send(g, { type: 'startShift' }); activate(g); const s = g.world.shift!;
  g.advance(1000); send(g, { type: 'activity', active: false }); g.advance(101000);
  assert.equal(flyerQuote(g.world, g.config).remainingMs, 29000); assert.equal(s.flyer!.end, 130000);
  send(g, { type: 'activity', active: true }); g.advance(s.nextSpawnAt + g.config.values.runtime.tableSeatingMs);
  send(g, { type: 'endShift' }); assert.ok(s.flyer); assert.equal(g.world.phase, 'closing'); assert.equal(activate(g).reason, 'flyerOpenShift');
  g.advance(s.flyer!.end); const ended = g.world.events.find(e => e.type === 'flyer_ended')!;
  assert.equal(ended.data.startedAt, 0); assert.equal(ended.data.activeMs, 30000); assert.equal(ended.data.endedAt, 130000);
  assert.equal(ended.data.reason, 'expired'); g.advance(135000); assert.equal(g.world.events.filter(e => e.type === 'flyer_ended').length, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  const early = setup(r => { r.unlocks.flyer.repBase = 0; }); send(early, { type: 'buyFlyer' }); send(early, { type: 'startShift' }); activate(early);
  early.advance(1000); send(early, { type: 'endShift' });
  assert.equal(early.world.shift!.flyer, undefined); assert.equal(early.world.events.find(e => e.type === 'flyer_ended')!.data.reason, 'shiftClosed');
  assert.equal(early.world.events.find(e => e.type === 'flyer_ended')!.data.activeMs, 1000);
  early.advance(early.world.now + early.config.values.shift.durationMs); send(early, { type: 'startShift' }); assert.equal(early.world.shift!.flyersUsed, undefined);
});

test('campaign reports measure actual seated service and losses, not capped-away tips or delivery credit', () => {
  const g = setup(r => { r.unlocks.flyer.repBase = 0; r.unlocks.flyer.campaignMs = 60000; r.shift.dailyEarnCapBase = 1; r.shift.startingCoinsBase = 100000; r.unlocks.phone.gate = 'LP0'; r.customerTypes.shipper.spawnIntervalMs = 10000; });
  send(g, { type: 'buyUnlock', item: 'phone' }); send(g, { type: 'buyFlyer' }); send(g, { type: 'startShift' }); activate(g);
  const w = g.world, until = w.shift!.flyer!.end, from = w.events.length;
  while (w.now < until) {
    g.advance(Math.min(until, w.now + 100));
    if (w.now < 35000) serveReady(g);
    if (w.delivery) send(g, { type: 'serveDelivery', deliveryId: w.delivery.id });
  }
  const events = w.events.slice(from), report = events.find(e => e.type === 'flyer_ended')!;
  const inWindow = events.filter(e => e.at < until);
  assert.ok(Number(report.data.served) > 0); assert.ok(Number(report.data.lost) > 0); assert.ok(Number(report.data.tips) > 0);
  assert.ok(events.some(e => e.type === 'shipper_completed'));
  assert.equal(report.data.served, inWindow.filter(e => e.type === 'customer_served').length);
  assert.equal(report.data.revenue, inWindow.filter(e => e.type === 'order_served').reduce((sum, e) => sum + Number(e.data.amount), 0));
  assert.ok(Number(report.data.revenue) <= g.config.values.shift.dailyEarnCapBase);
  assert.equal(report.data.lost, inWindow.filter(e => e.type === 'order_expired' || e.type === 'customer_left' && e.data.reason === 'queue').reduce((sum, e) => sum + Number(e.data.count), 0));
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a campaign ending exactly before a ready table is served excludes that service and preserves its pending arrival', () => {
  const g = setup(r => { r.unlocks.flyer.repBase = 0; r.unlocks.flyer.campaignMs = 1000; });
  send(g, { type: 'buyFlyer' }); send(g, { type: 'startShift' });
  while (!g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready'))) g.advance(g.world.now + 100);
  activate(g); const pending = g.world.shift!.nextSpawnAt, deadline = g.world.shift!.flyer!.end;
  g.advance(deadline); assert.equal(g.world.shift!.nextSpawnAt, pending); serveReady(g);
  assert.equal(g.world.events.find(e => e.type === 'flyer_ended')!.data.served, 0);
  assert.ok(g.world.events.some(e => e.type === 'customer_served' && e.at === deadline));
});

test('flyer intake rejects unsafe values and progression cycles; historical shift ledgers cannot block a resting purchase', () => {
  for (const patch of [
    (r: Economy) => { r.unlocks.flyer.repBase = 0.1; }, (r: Economy) => { r.unlocks.flyer.repBase = Number.MAX_SAFE_INTEGER; },
    (r: Economy) => { r.unlocks.flyer.campaignMs = 0; }, (r: Economy) => { r.unlocks.flyer.perShift = 1.1; },
    (r: Economy) => { r.unlocks.flyer.stockCap = 0; }, (r: Economy) => { r.unlocks.flyer.spawnIntervalMult = 1e-300; },
    (r: Economy) => { r.unlocks.flyer.spawnIntervalMult = 1e300; }, (r: Economy) => { r.unlocks.flyer.gate = 'LP4'; },
  ]) assert.throws(() => setup(patch), /config:/);
  const g = setup(), w = g.world; send(g, { type: 'startShift' }); send(g, { type: 'endShift' });
  w.shift!.stats.rep = -Number.MAX_SAFE_INTEGER; w.reputation = flyerQuote(w, g.config).cost;
  assert.ok(send(g, { type: 'buyFlyer' }).ok); assert.equal(w.shift!.stats.rep, -Number.MAX_SAFE_INTEGER);
  w.phase = 'open'; w.reputation = flyerQuote(w, g.config).cost; assert.equal(send(g, { type: 'buyFlyer' }).reason, 'reputationRequired');
  const unsafe = setup(r => { r.unlocks.flyer.campaignMs = Number.MAX_SAFE_INTEGER; r.unlocks.flyer.repBase = 0; });
  send(unsafe, { type: 'buyFlyer' }); send(unsafe, { type: 'startShift' }); unsafe.advance(1000);
  const before = structuredClone(unsafe.world);
  assert.equal(activate(unsafe).reason, 'flyerClock'); assert.deepEqual(unsafe.world, before);
});

test('genuine rules10 weather and neon histories replay unchanged through current adoption and autonomous ticks', () => {
  for (const name of ['weather-hot', 'weather-humid', 'signboard']) {
    const file = readFileSync(new URL(`./fixtures/legacy-${name}-v10.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-${name}-v10-expected.json`, import.meta.url), 'utf8'));
    const g = decodeSave(file);
    if (expected.world) assert.deepEqual(g.world, expected.world);
    else {
      const historical: Record<string, unknown> = { ...g.world, stats: g.world.shift!.stats, result: g.log.at(-1)!.result };
      for (const [key, value] of Object.entries(expected)) if (key !== 'source') assert.deepEqual(historical[key], value);
      assert.deepEqual(g.world.events, JSON.parse(file).events);
    }
    assert.equal(g.log.at(-1)!.rulesVersion, 10); g.advance(g.world.shift!.nextSpawnAt + 1);
    const previous = structuredClone(g.world); assert.ok(send(g, { type: 'activity', active: true }).ok);
    assert.deepEqual(g.world, { ...previous, staminaAnchorAt: previous.now, staminaAnchorMs: previous.staminaMs, attendance: g.world.attendance, shift: { ...previous.shift!, menu: { eventStart: previous.events.length, serveStart: previous.serves.length, complete: false } }, nextId: previous.nextId + 2, events: [...previous.events, { id: `event-${previous.nextId + 1}`, type: 'menu_tracking_started', at: previous.now, configVersion: g.config.version, idempotencyKey: g.log.at(-1)!.idempotencyKey, data: { shiftId: previous.shift!.id, complete: false } }, g.world.events.at(-1)!] }); assert.equal(g.world.events.at(-1)!.type, 'attendance_day_opened');
    assert.equal(g.log.at(-1)!.rulesVersion, 16); assert.equal(g.world.flyers, undefined);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});
