import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRENT_RULES, Game, config, loadConfig, encodeSave, decodeSave, validEnvelope, dayKey, type Command } from '../src';
import { capacityConfig } from './fixtures/capacity-model';
const start = Date.parse('2026-09-09T16:59:30Z');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `disconnect-test-${g.log.length}` });
function readyOrder() {
  const g = new Game(config, 42, start);
  assert.ok(send(g, { type: 'startShift' }).ok); g.advance(start + 11100);
  assert.ok(g.world.tables.some(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')));
  return g;
}
const disconnect = (g: Game, at: number, shiftId: string) => g.disconnect(at, shiftId, `loss-at-${at}`);
const roundtrip = (g: Game) => { const restored = decodeSave(encodeSave(g)); assert.deepEqual(restored.world, g.world); return restored; };
const count = (g: Game, type: string) => g.world.events.filter(e => e.type === type).length;

test('a lost connection freezes grace, closes an unserved table at the deadline and never grants absent attendance or resting stamina', () => {
  const g = readyOrder(), w = g.world, lostAt = w.now, shiftId = w.shift!.id;
  send(g, { type: 'activity', active: true, paused: true });
  const attendance = structuredClone(w.attendance), stamina = w.staminaMs;
  const order = w.tables.find(t => t.order)!.order!, waiting = order.placedAt + order.patienceMs - w.now;
  const zeroLoss = w.daily!.rows.find(r => r.kind === 'zero_loss_window')?.progress ?? 0;
  assert.ok(disconnect(g, lostAt, shiftId).ok); const deadline = w.disconnection!.expiresAt;
  assert.equal(deadline, lostAt + config.values.network.reconnectGraceMs);
  g.advance(deadline - 1); assert.equal(w.phase, 'open'); assert.equal(order.placedAt + order.patienceMs - w.now, waiting);
  assert.deepEqual(w.attendance, attendance); assert.equal(w.staminaMs, stamina); roundtrip(g);
  g.advance(deadline); assert.equal(w.phase, 'closing'); assert.equal(w.disconnection!.timedOut, true);
  assert.equal(count(g, 'connection_expired'), 1); assert.equal(count(g, 'shift_closing'), 1); roundtrip(g);
  g.advance(deadline + 1); assert.equal(order.placedAt + order.patienceMs - w.now, waiting - 1);
  g.advance(deadline + 300000);
  assert.equal(w.phase, 'resting'); assert.ok(w.shift!.closedAt! > deadline); assert.equal(count(g, 'shift_closed'), 1);
  assert.equal(w.active, false); assert.equal(w.disconnection, undefined); assert.deepEqual(w.attendance, attendance);
  assert.equal(w.staminaMs, stamina); assert.ok(count(g, 'customer_left') > 0); assert.equal(count(g, 'order_served'), 0);
  assert.equal(w.daily!.rows.find(r => r.kind === 'zero_loss_window')?.progress ?? zeroLoss, zeroLoss);
  g.advance(w.now + 86400000); assert.equal(w.staminaMs, stamina); assert.deepEqual(w.attendance, attendance); roundtrip(g);
});

test('reconnect strictly before grace cancels timeout, keeps menu paused, and a later outage gets its own full grace', () => {
  const g = readyOrder(), w = g.world;
  assert.ok(disconnect(g, w.now, w.shift!.id).ok); const deadline = w.disconnection!.expiresAt;
  g.advance(deadline - 1); assert.ok(send(g, { type: 'activity', active: true, paused: true }).ok);
  assert.equal(w.disconnection, undefined); const order = w.tables.find(t => t.order)!.order!, placed = order.placedAt;
  g.advance(deadline + 1000); assert.equal(w.phase, 'open'); assert.equal(order.placedAt, placed + 1001);
  assert.equal(count(g, 'connection_expired'), 0); assert.equal(w.attendance!.lastActiveDateKey, '2026-09-10');
  assert.ok(disconnect(g, w.now, w.shift!.id).ok); assert.equal(w.disconnection!.expiresAt, w.now + config.values.network.reconnectGraceMs); roundtrip(g);
});

test('reconnect at or after expiry cannot reopen the shift, and losing that connection again stops attendance', () => {
  for (const offset of [0, 1]) {
    const g = readyOrder(), w = g.world; disconnect(g, w.now, w.shift!.id);
    g.advance(w.disconnection!.expiresAt + offset); send(g, { type: 'activity', active: true, paused: true });
    assert.equal(w.phase, 'closing'); assert.equal(w.disconnection!.timedOut, true);
    const attendance = structuredClone(w.attendance); assert.ok(disconnect(g, w.now, w.shift!.id).ok);
    assert.equal(w.active, false); g.advance(w.now + 86400000); assert.equal(w.phase, 'resting');
    assert.deepEqual(w.attendance, attendance); assert.equal(count(g, 'connection_expired'), 1); roundtrip(g);
  }
});

test('duplicate loss never extends grace, retries survive restoration, and wrong or late shifts cannot arm a timeout', () => {
  const g = readyOrder(), w = g.world, at = w.now, shiftId = w.shift!.id;
  assert.equal(disconnect(g, at, 'old-shift').reason, 'noShift'); assert.equal(w.disconnection, undefined);
  assert.ok(disconnect(g, at, shiftId).ok); const deadline = w.disconnection!.expiresAt, entries = g.log.length;
  g.advance(at + 1000); assert.ok(disconnect(g, at, shiftId).ok); assert.equal(g.log.length, entries);
  assert.ok(disconnect(g, w.now, shiftId).ok); assert.equal(w.disconnection!.expiresAt, deadline);
  assert.equal(count(g, 'connection_lost'), 1);
  const restored = roundtrip(g); assert.ok(disconnect(restored, at, shiftId).ok); assert.equal(restored.log.length, g.log.length);
  assert.equal(disconnect(g, at + 1, shiftId).reason, 'staleCommand');
  g.advance(deadline + 300000); const closed = w.shift!.closedAt;
  assert.equal(disconnect(g, w.now, shiftId).reason, 'noShift'); assert.equal(w.shift!.closedAt, closed);
  send(g, { type: 'activity', active: true }); g.advance(w.now + config.values.shift.durationMs / config.values.shift.regenRate);
  assert.ok(send(g, { type: 'startShift' }).ok); assert.equal(disconnect(g, w.now, shiftId).reason, 'noShift');
  assert.equal(w.disconnection, undefined); roundtrip(g);
});

test('disconnected normal closing is independent of advance chunk size, including an empty shift at exact expiry', () => {
  for (const order of [false, true]) {
    const g = order ? readyOrder() : new Game(config, 42, start);
    if (!order) send(g, { type: 'startShift' });
    if (order) send(g, { type: 'endShift' });
    disconnect(g, g.world.now, g.world.shift!.id); const deadline = g.world.disconnection!.expiresAt;
    const chunks = roundtrip(g), end = deadline + 300000;
    g.advance(end); while (chunks.world.now < end) chunks.advance(Math.min(end, chunks.world.now + 1000));
    assert.deepEqual(chunks.world, g.world); assert.equal(count(g, 'shift_closing'), 1);
    if (!order) assert.equal(g.world.shift!.closedAt, deadline);
    roundtrip(g);
  }
});

test('public callers cannot forge disconnections or reserve system keys; only rules19 can replay the trusted record', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  for (const command of [{ type: 'connectionLost', shiftId }, { type: 'startShift' }]) {
    const envelope = { at, idempotencyKey: `system:connectionLost:${shiftId}:${at}`, command };
    assert.equal(validEnvelope(envelope), false); assert.equal(g.command(envelope as never).reason, 'invalidCommand');
  }
  disconnect(g, at, shiftId); const save = JSON.parse(encodeSave(g));
  save.log.at(-1).rulesVersion = 18; assert.throws(() => decodeSave(JSON.stringify(save)), /replay:rulesVersion/);
  save.log.at(-1).rulesVersion = 19; save.log.at(-1).idempotencyKey = 'forged'; assert.throws(() => decodeSave(JSON.stringify(save)), /save:invalid-log/);
  roundtrip(g);
});

test('configured grace comes from the pinned shift and unsafe deadline arithmetic fails before installing a timer', () => {
  for (const grace of [2500, Number.MAX_SAFE_INTEGER]) {
    const raw = structuredClone(config.raw); raw._meta.version = `grace-${grace}`; raw.network.reconnectGraceMs = grace;
    const g = new Game(loadConfig(raw), 42, start); send(g, { type: 'startShift' });
    const result = disconnect(g, g.world.now, g.world.shift!.id);
    if (grace === 2500) { assert.ok(result.ok); assert.equal(g.world.disconnection!.expiresAt, start + grace); }
    else { assert.equal(result.reason, 'configClock'); assert.equal(g.world.disconnection, undefined); assert.equal(g.world.active, true); }
    roundtrip(g);
  }
});

test('genuine e390a1c rules18 menu and inactive closing saves retain their original worlds without implicit connection deadlines', () => {
  for (const name of ['menu', 'inactive-closing']) {
    const text = readFileSync(new URL(`./fixtures/legacy-v18-${name}.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-v18-${name}-expected.json`, import.meta.url), 'utf8'));
    assert.equal(expected.source, 'e390a1c297ed5429360e96428924a6bb91dd4fa6');
    const g = decodeSave(text); assert.deepEqual(g.world, expected.world); assert.equal(g.world.disconnection, undefined); roundtrip(g);
    send(g, { type: 'activity', active: g.world.active, ...(g.world.paused ? { paused: true } : {}) });
    const phase = g.world.phase; g.advance(g.world.now + config.values.network.reconnectGraceMs + 300000);
    assert.equal(g.world.phase, phase); assert.equal(count(g, 'connection_expired'), 0); roundtrip(g);
  }
});

test('a safe shift deadline too close to the integer limit cannot be shifted by disconnection grace or a menu pause', () => {
  const raw = structuredClone(config.raw); raw._meta.version = 'near-clock-limit';
  raw.shift.durationMs = Number.MAX_SAFE_INTEGER - 10000;
  const g = new Game(loadConfig(raw), 42, 0); assert.ok(send(g, { type: 'startShift' }).ok);
  assert.ok(Number.isSafeInteger(g.world.shift!.endsAt));
  const timers = structuredClone({ shift: g.world.shift, tables: g.world.tables, glasses: g.world.glasses, beer: g.world.beer });
  assert.deepEqual(disconnect(g, 0, g.world.shift!.id), { ok: false, reason: 'configClock' });
  assert.equal(g.world.active, true); assert.equal(g.world.disconnection, undefined);
  assert.deepEqual({ shift: g.world.shift, tables: g.world.tables, glasses: g.world.glasses, beer: g.world.beer }, timers); roundtrip(g);
  send(g, { type: 'activity', active: true, paused: true }); const before = structuredClone(g.world);
  assert.throws(() => g.advance(config.values.network.reconnectGraceMs), /clock:unsafePause/);
  assert.deepEqual(g.world, before); roundtrip(g);
});


test('a menu pause rejected across midnight leaves the entire world and calendar events untouched', () => {
  const raw = structuredClone(config.raw); raw._meta.version = 'pause-overflow-after-midnight';
  raw.shift.durationMs = Number.MAX_SAFE_INTEGER - 71_200_000;
  const g = new Game(loadConfig(raw), 42, 0); assert.ok(send(g, { type: 'startShift' }).ok);
  send(g, { type: 'activity', active: true, paused: true });
  assert.ok(g.world.daily!.expiresAt < 81_200_000);
  const before = structuredClone(g.world);
  assert.throws(() => g.advance(81_200_000), /clock:unsafePause/);
  assert.deepEqual(g.world, before); roundtrip(g);
});


test('distinct outages within the same millisecond arm independently while only an identical lossId retries', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  assert.ok(g.disconnect(at, shiftId, 'first-connection').ok);
  send(g, { type: 'activity', active: true });
  assert.equal(g.world.disconnection, undefined);
  assert.ok(g.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(g.world.active, false); assert.ok(g.world.disconnection);
  assert.equal(count(g, 'connection_lost'), 2);
  const before = encodeSave(g);
  assert.ok(g.disconnect(at, shiftId, 'first-connection').ok);
  assert.ok(g.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(encodeSave(g), before);
  const restored = roundtrip(g); assert.ok(restored.disconnect(at, shiftId, 'second-connection').ok);
  assert.equal(encodeSave(restored), before);
  assert.equal(g.disconnect(at, shiftId, '').reason, 'invalidCommand');
});

test('an overflowing offline advance cannot close a served shift or mutate calendar events before rejection', () => {
  const g = readyOrder(), t = g.world.tables.find(t => t.order)!, w = g.world;
  assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok);
  assert.ok(w.lastServedAt !== null); assert.ok(g.disconnect(w.now, w.shift!.id, 'served-offline').ok);
  const before = structuredClone(w);
  assert.throws(() => g.advance(Number.MAX_SAFE_INTEGER), /clock:unsafePause/);
  assert.deepEqual(w, before); roundtrip(g);
});


test('early rules19 timestamp-keyed loss logs remain readable but new trusted calls require a loss identity', () => {
  const legacy = loadConfig(JSON.parse(readFileSync(new URL('../../../docs/config/legacy/economy-1.7.3.json', import.meta.url), 'utf8')));
  const g = new Game(legacy, 42, start);
  assert.ok(g.replay({ at: start, idempotencyKey: 'legacy-open', command: { type: 'startShift' }, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
  g.advance(start + 11100); const at = g.world.now, shiftId = g.world.shift!.id;
  assert.ok(g.replay({ at, idempotencyKey: `system:connectionLost:${shiftId}:${at}`, command: { type: 'connectionLost', shiftId }, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
  assert.equal(g.world.active, false); roundtrip(g);
  assert.equal(g.disconnect(at, shiftId, undefined as never).reason, 'invalidCommand');
});


test('returning after a thousand absent days skips missed quest sets and opens only the current day', () => {
  const g = readyOrder(), w = g.world;
  send(g, { type: 'endShift' }); g.advance(w.now + 300000); assert.equal(w.phase, 'resting');
  send(g, { type: 'activity', active: false });
  const before = structuredClone(w.daily), events = w.events.length, generated = count(g, 'quest_generated');
  const chunks = roundtrip(g), end = w.now + 1000 * 86400000;
  g.advance(end);
  for (let i = 0; i < 1000; i++) chunks.advance(chunks.world.now + 86400000);
  assert.deepEqual(chunks.world, w); assert.equal(w.events.length, events); assert.deepEqual(w.daily, before);
  roundtrip(g);
  assert.equal(send(g, { type: 'claimQuest', day: before!.day, questId: before!.rows[0].id }).reason, 'questExpired');
  send(g, { type: 'activity', active: true, paused: true });
  assert.equal(w.daily!.day, dayKey(w.now, g.config));
  assert.equal(count(g, 'quest_generated') - generated, g.config.values.quests.daily.count);
  assert.ok(w.daily!.rows.every(row => !row.claimed && row.progress === 0)); roundtrip(g);
});


test('genuine cb389e0 rules19 absent-day history survives rules20 adoption without rewriting its past', () => {
  const saved = readFileSync(new URL('./fixtures/legacy-v19-absence.json', import.meta.url), 'utf8');
  const expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-v19-absence-expected.json', import.meta.url), 'utf8'));
  assert.equal(expected.source, 'cb389e088fadd05f77b6ed20e1f96de34833ac2b');
  const g = decodeSave(saved); assert.deepEqual(g.world, expected.world); roundtrip(g);
  send(g, { type: 'activity', active: false }); assert.equal(g.log.at(-1)!.rulesVersion, CURRENT_RULES);
  const countBefore = count(g, 'quest_generated');
  g.advance(g.world.now + 1000 * 86400000); assert.equal(count(g, 'quest_generated'), countBefore); roundtrip(g);
});


test('the first live catch-up or command after loading rules19 adopts at the saved frontier, never across missed days', () => {
  const text = readFileSync(new URL('./fixtures/legacy-v19-absence.json', import.meta.url), 'utf8');
  for (const commandFirst of [false, true]) {
    const g = decodeSave(text), prefix = structuredClone(g.world.events), log = structuredClone(g.log), frontier = g.world.now;
    const end = frontier + 1000 * 86400000;
    if (commandFirst) assert.ok(g.command({ at: end, idempotencyKey: 'return-after-update', command: { type: 'activity', active: true, paused: true } }).ok);
    else g.catchUp(end);
    assert.deepEqual(g.log.slice(0, log.length), log);
    assert.equal(g.log[log.length].at, frontier); assert.equal(g.log[log.length].rulesVersion, 20);
    assert.equal(g.log[log.length].idempotencyKey, 'system:calendar:20');
    assert.deepEqual(g.world.events.slice(0, prefix.length), prefix);
    assert.equal(count(g, 'quest_generated') - prefix.filter(e => e.type === 'quest_generated').length, commandFirst ? g.config.values.quests.daily.count : 0);
    const before = encodeSave(g); g.catchUp(end); assert.equal(encodeSave(g), before); roundtrip(g);
  }
  const historical = decodeSave(text), before = count(historical, 'quest_generated');
  historical.advance(historical.world.now + 86400000);
  assert.equal(count(historical, 'quest_generated') - before, historical.config.values.quests.daily.count); roundtrip(historical);
});


test('invalid, stale, duplicate and unsafe first live operations cannot write a calendar adoption record', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/legacy-v19-absence.json', import.meta.url), 'utf8')), before = encodeSave(g);
  assert.equal(g.command({ at: g.world.now - 1, idempotencyKey: 'stale', command: { type: 'activity', active: true } }).reason, 'staleCommand');
  assert.equal(g.command({ at: g.world.now + 1, idempotencyKey: 'system:calendar:20', command: { type: 'activity', active: false } }).reason, 'invalidCommand');
  assert.deepEqual(g.command(g.log[0] as never), g.log[0].result);
  assert.throws(() => g.catchUp(Number.MAX_SAFE_INTEGER), /clock:unsafePause/);
  assert.throws(() => g.catchUp(NaN), /clock:non-monotonic/);
  assert.equal(encodeSave(g), before);
});


test('rules20 loss records cannot borrow the legacy rules19 missing-identity exception', () => {
  const g = readyOrder(), before = encodeSave(g), at = g.world.now, shiftId = g.world.shift!.id;
  assert.throws(() => g.replay({ at, idempotencyKey: `system:connectionLost:${shiftId}:${at}`, command: { type: 'connectionLost', shiftId }, rulesVersion: 20, configVersion: g.config.version, result: { ok: true } }), /replay:rulesVersion/);
  assert.equal(encodeSave(g), before);
});


test('an older log key cannot shadow the live calendar adoption receipt', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/legacy-v19-absence.json', import.meta.url), 'utf8'));
  assert.ok(g.replay({ at: g.world.now, idempotencyKey: 'system:calendar:20', command: { type: 'activity', active: false }, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
  const before = count(g, 'quest_generated'); g.catchUp(g.world.now + 1000 * 86400000);
  assert.equal(count(g, 'quest_generated'), before); assert.equal(g.log.at(-1)!.idempotencyKey, 'system:calendar:20:1');
  assert.equal(g.log.at(-1)!.rulesVersion, 20); roundtrip(g);
});


test('rules19 menu disconnections adopt without changing presence or pause in open and draining shifts', () => {
  for (const paused of [false, true]) for (const closing of [false, true]) {
    const g = new Game(capacityConfig, 42, Date.parse('2026-09-09T10:00:00Z')); // rules 19 histories predate the seat model
    const replay = (idempotencyKey: string, command: Command | { type: 'connectionLost'; shiftId: string; lossId: string }) => {
      assert.ok(g.replay({ at: g.world.now, idempotencyKey, command, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
    };
    replay('open-old-menu', { type: 'startShift' }); g.advance(g.world.now + 11100);
    if (closing) replay('close-old-menu', { type: 'endShift' });
    replay('pause-old-menu', { type: 'activity', active: true, paused });
    replay(`system:connectionLost:${g.world.shift!.id}:menu`, { type: 'connectionLost', shiftId: g.world.shift!.id, lossId: 'menu' });
    const prefix = structuredClone(g.world.events), frontier = g.world.now, deadline = g.world.disconnection!.expiresAt;
    const old = roundtrip(g); g.catchUp(frontier + 1);
    assert.equal(g.world.active, false); assert.equal(!!g.world.paused, paused);
    assert.equal(g.world.disconnection!.expiresAt, deadline);
    assert.deepEqual(g.log.at(-1)!.command, { type: 'adoptCalendarRules' });
    assert.equal(g.log.at(-1)!.at, frontier); assert.equal(g.log.at(-1)!.rulesVersion, 20);
    const end = frontier + 1000 * 86400000;
    g.catchUp(end); old.catchUp(end); assert.deepEqual(g.world, old.world);
    assert.equal(g.world.phase, 'resting'); assert.equal(g.world.active, false); assert.equal(!!g.world.paused, paused);
    assert.equal(count(g, 'quest_generated'), prefix.filter(e => e.type === 'quest_generated').length);
    assert.deepEqual(g.world.events.slice(0, prefix.length), prefix); roundtrip(g);
  }
});


test('calendar adoption keys stay bounded even if historical keys occupy every colon length and numeric candidates', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/legacy-v19-absence.json', import.meta.url), 'utf8'));
  const prefix = 'system:calendar:20', keys = [prefix + ':1', prefix + ':2'];
  for (let key = prefix; key.length <= 128; key += ':') keys.push(key);
  for (const key of keys) assert.ok(g.replay({ at: g.world.now, idempotencyKey: key, command: { type: 'activity', active: false }, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }).ok);
  const before = count(g, 'quest_generated'); g.catchUp(g.world.now + 1000 * 86400000);
  assert.equal(count(g, 'quest_generated'), before); assert.equal(g.log.at(-1)!.idempotencyKey, prefix + ':3');
  assert.deepEqual(g.log.at(-1)!.command, { type: 'adoptCalendarRules' }); roundtrip(g);
});


test('calendar adoption is a rules20 system record and cannot be submitted through public ingress', () => {
  const g = readyOrder(), command = { type: 'adoptCalendarRules' } as const, before = encodeSave(g);
  for (const key of ['player-calendar', 'system:calendar:20']) {
    const envelope = { at: g.world.now, idempotencyKey: key, command };
    assert.equal(validEnvelope(envelope), false); assert.equal(g.command(envelope as never).reason, 'invalidCommand');
  }
  assert.throws(() => g.replay({ at: g.world.now, idempotencyKey: 'system:calendar:20', command, rulesVersion: 19, configVersion: g.config.version, result: { ok: true } }), /replay:rulesVersion/);
  assert.equal(encodeSave(g), before);
});


test('hidden network recovery across midnight cancels grace without granting attendance or unpausing the menu', () => {
  for (const paused of [false, true]) {
    const g = readyOrder(), w = g.world, at = w.now;
    send(g, { type: 'activity', active: true, paused });
    assert.ok(g.disconnect(at, w.shift!.id, 'hidden-loss').ok);
    const attendance = structuredClone(w.attendance), stamina = w.staminaMs;
    const table = w.tables.find(t => t.order)!, remaining = table.order!.placedAt + table.order!.patienceMs - at;
    const deadline = w.disconnection!.expiresAt;
    assert.ok(g.reconnect(deadline - 1, 'hidden-recovery', false, paused).ok);
    assert.equal(w.disconnection, undefined); assert.equal(w.active, false); assert.equal(!!w.paused, paused);
    g.advance(deadline + 100000);
    assert.equal(w.phase, 'open'); assert.equal(w.staminaMs, stamina); assert.deepEqual(w.attendance, attendance);
    assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, remaining);
    assert.equal(count(g, 'connection_expired'), 0); roundtrip(g);
    assert.ok(g.reconnect(w.now, 'visible-recovery', true, true).ok);
    assert.equal(w.attendance!.lastActiveDateKey, dayKey(w.now, g.config));
    g.advance(w.now + 1000); assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, remaining);
    send(g, { type: 'activity', active: true }); g.advance(w.now + 1);
    assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, remaining - 1); roundtrip(g);
  }
});

test('resting connection loss freezes stamina at its frontier and hidden recovery does not backfill absent rest', () => {
  const g = readyOrder(), w = g.world;
  send(g, { type: 'endShift' }); g.advance(w.now + 300000); assert.equal(w.phase, 'resting');
  // Consume the recovered stamina with another real shift, then close it immediately.
  send(g, { type: 'startShift' }); g.advance(w.now + 1000); send(g, { type: 'endShift' });
  assert.equal(w.phase, 'resting'); assert.ok(w.staminaMs < g.config.values.shift.durationMs);
  send(g, { type: 'activity', active: true, paused: true });
  assert.ok(g.disconnect(w.now, null, 'resting-loss').ok);
  const stamina = w.staminaMs, attendance = structuredClone(w.attendance), closedAt = w.shift!.closedAt;
  g.advance(w.now + 86400000); assert.equal(w.staminaMs, stamina); assert.deepEqual(w.attendance, attendance);
  assert.equal(w.disconnection, undefined); assert.equal(w.shift!.closedAt, closedAt); assert.equal(w.paused, true);
  assert.ok(g.reconnect(w.now, 'resting-hidden', false, true).ok); g.advance(w.now + 10000);
  assert.equal(w.staminaMs, stamina); assert.deepEqual(w.attendance, attendance); roundtrip(g);
  assert.ok(g.reconnect(w.now, 'resting-visible', true, false).ok); g.advance(w.now + 1000);
  assert.equal(w.staminaMs, Math.min(g.config.values.shift.durationMs, stamina + 1000 * g.config.values.shift.regenRate)); roundtrip(g);
});

test('trusted recovery at exact grace or later drains normally in hidden and menu states', () => {
  for (const active of [false, true]) for (const delta of [0, 1]) {
    const g = readyOrder(), w = g.world; g.disconnect(w.now, w.shift!.id, 'timeout-loss');
    const deadline = w.disconnection!.expiresAt;
    assert.ok(g.reconnect(deadline + delta, 'too-late', active, true).ok);
    assert.equal(w.phase, 'closing'); assert.equal(w.disconnection!.timedOut, true);
    const chunks = roundtrip(g), end = deadline + 300000;
    g.advance(end); while (chunks.world.now < end) chunks.advance(Math.min(end, chunks.world.now + 1000));
    assert.deepEqual(chunks.world, w); assert.equal(w.phase, 'resting');
    assert.equal(count(g, 'shift_closed'), 1); assert.equal(count(g, 'connection_expired'), 1); roundtrip(g);
  }
});

test('recovery retries cannot undo a later loss and stale or malformed recovery does not mutate presence', () => {
  const g = readyOrder(), at = g.world.now, shiftId = g.world.shift!.id;
  assert.equal(g.disconnect(at, null, 'wrong-rest').reason, 'noShift'); assert.equal(g.world.active, true);
  g.disconnect(at, shiftId, 'loss-one'); assert.ok(g.reconnect(at, 'recovery-one', false, true).ok);
  g.disconnect(at, shiftId, 'loss-two'); const before = encodeSave(g);
  assert.ok(g.reconnect(at, 'recovery-one', false, true).ok); assert.equal(encodeSave(g), before);
  assert.equal(g.reconnect(at, 'recovery-one', true, true).reason, 'idempotencyConflict');
  assert.equal(g.reconnect(at - 1, 'stale-recovery', true, false).reason, 'staleCommand');
  for (const args of [['', false, false], ['x'.repeat(128), false, false], ['invalid-active', 1, false], ['invalid-pause', true, 1]]) {
    assert.equal(g.reconnect(at, args[0] as string, args[1] as boolean, args[2] as boolean).reason, 'invalidCommand');
  }
  assert.equal(encodeSave(g), before); const restored = roundtrip(g);
  assert.ok(restored.reconnect(at, 'recovery-one', false, true).ok); assert.equal(encodeSave(restored), before);
});

test('public ingress rejects recovery commands and old rules cannot replay recovery or resting loss', () => {
  const g = readyOrder(), at = g.world.now, before = encodeSave(g);
  const command = { type: 'connectionRestored' as const, recoveryId: 'trusted', active: false, paused: true };
  for (const key of ['public-recovery', 'system:connectionRestored:trusted']) {
    const envelope = { at, idempotencyKey: key, command };
    assert.equal(validEnvelope(envelope), false); assert.equal(g.command(envelope as never).reason, 'invalidCommand');
  }
  for (const entry of [
    { idempotencyKey: 'system:connectionRestored:trusted', command },
    { idempotencyKey: 'system:connectionLost:null:resting', command: { type: 'connectionLost' as const, shiftId: null, lossId: 'resting' } },
  ]) assert.throws(() => g.replay({ ...entry, at, rulesVersion: 23, configVersion: g.config.version, result: { ok: true } }), /replay:rulesVersion/);
  assert.equal(encodeSave(g), before);
});

test('genuine base rules23 hidden activity retains its armed outage and visible activity cancels it on replay', () => {
  const text = readFileSync(new URL('./fixtures/legacy-v23-network.json', import.meta.url), 'utf8');
  const expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-v23-network-expected.json', import.meta.url), 'utf8'));
  assert.equal(expected.source, '9e886437e918e8c1a910bc4a1a62df0eeadca510');
  const g = decodeSave(text); assert.deepEqual(g.world, expected.world); roundtrip(g);
  const raw = JSON.parse(text), hiddenIndex = raw.log.findIndex((e: any) => e.command.type === 'activity' && !e.command.active);
  const historical = new Game(loadConfig(raw.config), raw.seed, raw.createdAt, raw.playerId);
  for (const entry of raw.log.slice(0, hiddenIndex + 1)) historical.replay(entry);
  assert.ok(historical.world.disconnection); assert.equal(historical.world.active, false);
  const prefix = structuredClone(historical.world.events);
  assert.ok(historical.reconnect(historical.world.now, 'adopt-hidden', false, true).ok);
  assert.equal(historical.world.disconnection, undefined); assert.equal(historical.world.active, false);
  assert.deepEqual(historical.world.events.slice(0, prefix.length), prefix); roundtrip(historical);
});
