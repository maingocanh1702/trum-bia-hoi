import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { config, loadConfig, decodeSave, dayKey, type Config, type Command } from '@tbh/engine';
import { GameStore } from '../src/store';
const ORIGIN = Date.parse('2026-09-09T10:00:00Z');
function fixture(t: { after(fn: () => void): void }) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/server-store-')), file = resolve(dir, 'game.db');
  const stores: GameStore[] = []; let now = ORIGIN;
  t.after(() => { for (const s of stores) s.close(); rmSync(dir, { recursive: true, force: true }); });
  return { file, get now() { return now; }, set now(value: number) { now = value; },
    open(c: Config = config) { const s = new GameStore(file, c, () => now); stores.push(s); return s; } };
}
const send = (s: GameStore, id: string, key: string, command: Command) => s.command(id, { idempotencyKey: key, command });
const ready = (s: GameStore, id: string) => {
  const table = s.read(id).world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  return { type: 'serve' as const, tableId: table.id, orderId: table.order!.id };
};

test('server time, one service debit/credit and detached state survive an actual file restart with ordered catch-up events', t => {
  const f = fixture(t), a = f.open(); a.createPlayer('one', 42);
  const started = a.command('one', { idempotencyKey: 'open', command: { type: 'startShift' }, at: Number.MAX_SAFE_INTEGER, world: { coins: 999999 } } as never);
  assert.equal(started.world.now, f.now); assert.equal(started.world.coins, config.values.shift.startingCoinsBase);
  f.now += 11100; const action = ready(a, 'one'), served = send(a, 'one', 'serve', action);
  assert.ok(served.result.ok); const coins = served.world.coins;
  served.world.coins = -1; served.world.events.length = 0;
  f.now += 100; const retry = send(a, 'one', 'serve', action);
  assert.equal(retry.world.coins, coins); assert.deepEqual(retry.result, served.result);
  assert.equal(retry.world.events.filter(e => e.type === 'order_served').length, 1);
  a.close();
  const restarted = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    "import { GameStore } from '@tbh/server'; const s=new GameStore(process.argv[1],undefined,()=>Number(process.argv[2])); console.log(JSON.stringify(s.read('one'))); s.close();", f.file, String(f.now)], { encoding: 'utf8' }));
  assert.deepEqual(restarted, retryWithoutResult(retry));
  const b = f.open(); assert.deepEqual(b.read('one'), retryWithoutResult(retry));
  const { events } = b.eventsAfter('one', started.lastEventSeq);
  assert.deepEqual(events.map(e => e.seq), Array.from({ length: retry.lastEventSeq - started.lastEventSeq }, (_, i) => started.lastEventSeq + i + 1));
  assert.equal(events.filter(e => e.event.type === 'order_served').length, 1);
  assert.deepEqual(b.eventsAfter('one', retry.lastEventSeq), { events: [], lastEventSeq: retry.lastEventSeq, hasMore: false });
  const db = new DatabaseSync(f.file); t.after(() => db.close());
  const durable = () => db.prepare('SELECT now,revision,projection FROM players WHERE id=?').get('one');
  const beforeInvalid = durable(); f.now += 300000;
  for (const cursor of [-1, 0.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => b.eventsAfter('one', cursor), /invalidCursor/);
  assert.deepEqual(durable(), beforeInvalid);
  assert.equal(db.prepare('SELECT count(*) AS n FROM events WHERE player_id=?').get('one')!.n, retry.lastEventSeq);
});
function retryWithoutResult<T extends { result: unknown }>(value: T) { const { result: _, ...state } = value; return state; }

test('two SQLite connections invalidate stale cached state, deduplicate retries, and never charge another player', t => {
  const f = fixture(t), a = f.open(), b = f.open(); a.createPlayer('one', 42); b.createPlayer('two', 42);
  send(a, 'one', 'open', { type: 'startShift' }); f.now += 11100;
  const action = ready(a, 'one'); b.read('one'); const first = send(a, 'one', 'serve', action), retry = send(b, 'one', 'serve', action);
  assert.deepEqual(retry, first);
  const reordered = { orderId: action.orderId, tableId: action.tableId, type: action.type };
  assert.deepEqual(send(b, 'one', 'serve', reordered), first);
  a.close(); assert.deepEqual(send(f.open(), 'one', 'serve', reordered), first);
  const c = f.open();
  assert.equal(send(b, 'one', 'serve', { type: 'restock', dish: 'bia', mode: 'one' }).result.reason, 'idempotencyConflict');
  const bought = send(b, 'one', 'stock', { type: 'restock', dish: 'bia', mode: 'one' }); assert.ok(bought.result.ok);
  assert.deepEqual(send(c, 'one', 'stock', { type: 'restock', dish: 'bia', mode: 'one' }), bought);
  assert.equal(c.read('one').world.coins, first.world.coins - config.values.menu.bia.unitCost);
  assert.equal(b.read('two').world.coins, config.values.shift.startingCoinsBase);
  assert.throws(() => c.createPlayer('one', 99), /playerExists/); assert.deepEqual(c.read('one'), retryWithoutResult(bought));
});

test('a real SQLite failure between command and event inserts rolls everything back and evicts mutated cache before retry', t => {
  const f = fixture(t), a = f.open(); a.createPlayer('one', 42); send(a, 'one', 'open', { type: 'startShift' }); f.now += 11100;
  const action = ready(a, 'one'), before = a.read('one'), db = new DatabaseSync(f.file); t.after(() => db.close());
  const count = () => db.prepare('SELECT count(*) AS n FROM commands').get()!.n;
  const commands = count(); db.exec("CREATE TRIGGER simulate_disk_failure BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'test:writeFailure'); END");
  assert.throws(() => send(a, 'one', 'serve', action), /test:writeFailure/); assert.equal(count(), commands);
  db.exec('DROP TRIGGER simulate_disk_failure'); assert.deepEqual(a.read('one'), before);
  const served = send(a, 'one', 'serve', action); assert.ok(served.result.ok); assert.equal(count(), Number(commands) + 1);
  a.close(); assert.deepEqual(f.open().read('one'), retryWithoutResult(served));
});

test('history and configs are append-only, foreign keys are enforced, and damaged projections or unknown schemas fail closed', t => {
  const f = fixture(t), a = f.open(); a.createPlayer('one', 42); send(a, 'one', 'open', { type: 'startShift' });
  const db = new DatabaseSync(f.file); t.after(() => db.close()); db.exec('PRAGMA foreign_keys=ON');
  for (const sql of ['DELETE FROM events', "UPDATE commands SET entry='{}'", "UPDATE configs SET snapshot='{}'"]) assert.throws(() => db.exec(sql), /appendOnly/);
  assert.throws(() => db.prepare('INSERT INTO commands VALUES (?,?,?,?)').run('missing', 1, 'bad', '{}'), /FOREIGN KEY/);
  db.prepare('UPDATE players SET projection=? WHERE id=?').run('{}', 'one'); a.close();
  assert.throws(() => f.open().read('one'), /projectionMismatch/);
  db.exec('PRAGMA user_version=999'); assert.throws(() => f.open(), /unsupportedSchema/);
});

test('restarting with a new server snapshot preserves the running pin and adopts it only on the next successful shift', t => {
  const f = fixture(t), a = f.open(); a.createPlayer('one', 42); send(a, 'one', 'open-A', { type: 'startShift' }); f.now += 1000;
  const before = a.read('one'); a.close();
  const raw = structuredClone(config.raw); raw._meta.version = 'store-B'; raw.shift.durationMs += 60000; raw.menu.bia.price += 3;
  const next = loadConfig(raw), b = f.open(next); assert.deepEqual(b.read('one'), before);
  assert.equal(send(b, 'one', 'too-soon', { type: 'startShift' }).result.reason, 'shiftRunning');
  assert.equal(b.read('one').world.shift!.configVersion, config.version);
  send(b, 'one', 'end-A', { type: 'endShift' }); f.now += config.values.shift.durationMs;
  const rest = b.read('one'); f.now += Math.ceil((config.values.shift.durationMs - rest.world.staminaMs) / config.values.shift.regenRate);
  const opened = send(b, 'one', 'open-B', { type: 'startShift' }); assert.ok(opened.result.ok);
  assert.equal(opened.world.shift!.configVersion, 'store-B'); assert.equal(opened.world.shift!.endsAt - f.now, next.values.shift.durationMs);
  assert.equal(opened.world.events.filter(e => e.type === 'config_pinned').length, 1);
  b.close(); assert.deepEqual(f.open(next).read('one'), retryWithoutResult(opened));
});

test('semantically identical reordered server config reuses its first exact snapshot, preserving seeded customer replay', t => {
  const f = fixture(t), raw = structuredClone(config.raw); raw.onboarding.enabled = false; const original = loadConfig(raw);
  const reverse = (value: unknown): unknown => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)])) : value;
  const a = f.open(original), b = f.open(loadConfig(reverse(raw)));
  a.createPlayer('one', 42); b.createPlayer('two', 42);
  send(a, 'one', 'open', { type: 'startShift' }); send(b, 'two', 'open', { type: 'startShift' }); f.now += 90000;
  const first = a.read('one'), second = b.read('two'); assert.deepEqual(second.world, { ...first.world, playerId: 'two' });
  b.close(); assert.deepEqual(f.open(loadConfig(reverse(raw))).read('two'), second);
  raw.menu.bia.price++; assert.throws(() => f.open(loadConfig(raw)), /configVersionConflict/);
});

test('management pause survives a server restart and real VN midnight without advancing customer wait or disabling check-in', t => {
  const f = fixture(t), a = f.open(); a.createPlayer('one', 42); send(a, 'one', 'open', { type: 'startShift' }); f.now += 8100;
  const paused = send(a, 'one', 'pause', { type: 'activity', active: true, paused: true });
  const wait = (state: typeof paused.world) => { const order = state.tables.find(t => t.order)!.order!; return order.placedAt + order.patienceMs - state.now; };
  a.close(); f.now += 86400000; const b = f.open(), after = b.read('one');
  assert.equal(after.world.paused, true); assert.equal(wait(after.world), wait(paused.world)); assert.equal(after.world.coins, paused.world.coins);
  assert.ok(send(b, 'one', 'check-in', { type: 'claimAttendance', day: dayKey(f.now, config) }).result.ok);
  assert.equal(wait(b.read('one').world), wait(paused.world));
  send(b, 'one', 'resume', { type: 'activity', active: true }); f.now += 1000;
  assert.equal(wait(b.read('one').world), wait(paused.world) - 1000);
});

test('invalid commands, missing players and a regressing server clock never replace durable progress', t => {
  const f = fixture(t), a = f.open(); const before = a.createPlayer('one', 42);
  assert.throws(() => a.read('missing'), /playerMissing/);
  assert.throws(() => a.command('one', { idempotencyKey: '', command: { type: 'startShift' } }), /invalidCommand/);
  assert.throws(() => send(a, 'one', 'bad', { type: 'activity', active: false, paused: true }), /invalidCommand/);
  f.now--; assert.throws(() => a.read('one'), /clockBackwards/); f.now++;
  assert.deepEqual(a.read('one'), before); a.close(); assert.deepEqual(f.open().read('one'), before);
});


test('a rules19 database resumes without backfilling absent quests and atomically persists its rules20 boundary across restart', t => {
  const f = fixture(t); f.open().close();
  const saved = readFileSync(new URL('../../../packages/engine/test/fixtures/legacy-v19-absence.json', import.meta.url), 'utf8');
  const data = JSON.parse(saved), old = decodeSave(saved), db = new DatabaseSync(f.file); t.after(() => db.close());
  db.prepare('INSERT OR IGNORE INTO configs VALUES (?,?)').run(old.config.version, JSON.stringify(old.config.raw));
  db.prepare('INSERT INTO players VALUES (?,?,?,?,?,?,?)').run(data.playerId, data.seed, data.createdAt, old.config.version, data.now, 0, JSON.stringify({ ...old.world, events: undefined }));
  data.log.forEach((entry: { idempotencyKey: string }, i: number) => db.prepare('INSERT INTO commands VALUES (?,?,?,?)').run(data.playerId, i + 1, entry.idempotencyKey, JSON.stringify(entry)));
  data.events.forEach((event: { id: string }, i: number) => db.prepare('INSERT INTO events VALUES (?,?,?,?)').run(data.playerId, i + 1, event.id, JSON.stringify(event)));
  f.now = data.now + 1000 * 86400000;
  const s = f.open(), before = db.prepare('SELECT * FROM players').get();
  db.exec("CREATE TRIGGER fail_calendar_adoption BEFORE INSERT ON commands BEGIN SELECT RAISE(ABORT,'test:adoptionFailure'); END");
  assert.throws(() => s.read(data.playerId), /test:adoptionFailure/);
  assert.deepEqual(db.prepare('SELECT * FROM players').get(), before);
  assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, data.log.length);
  db.exec('DROP TRIGGER fail_calendar_adoption');
  const state = s.read(data.playerId);
  assert.equal(state.world.now, f.now); assert.equal(state.world.active, false);
  assert.deepEqual(state.world.events, old.world.events); assert.deepEqual(state.world.daily, old.world.daily);
  const entry = JSON.parse(String(db.prepare('SELECT entry FROM commands ORDER BY seq DESC LIMIT 1').get()!.entry));
  assert.equal(entry.at, data.now); assert.equal(entry.rulesVersion, 20); assert.equal(entry.idempotencyKey, 'system:calendar:20');
  assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, data.log.length + 1);
  s.close(); assert.deepEqual(f.open().read(data.playerId), state);
});

test('a paid lease survives SQLite restart; offline expiry refunds the stored deposit once without earning credit', t => {
  const f = fixture(t), raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 1000000;
  raw.lifePath[1].lifetimeBase = 1; raw.lifePath[1].requires = raw.lifePath[1].requires!.map(() => 'LP0');
  const pin = loadConfig(raw), a = f.open(pin); a.createPlayer('tenant', 42);
  send(a, 'tenant', 'open', { type: 'startShift' }); f.now += 11000; send(a, 'tenant', 'serve', ready(a, 'tenant'));
  send(a, 'tenant', 'close', { type: 'endShift' }); f.now += 3600000;
  assert.equal(a.read('tenant').world.lifePath, 1);
  const action = { type: 'rentLocation', locationId: 'ngo_cho', leaseId: null, maxCost: 87500 } as const;
  const rented = send(a, 'tenant', 'rent', action); assert.ok(rented.result.ok); assert.ok(rented.world.lease);
  send(a, 'tenant', 'away', { type: 'activity', active: false }); a.close();
  const b = f.open(pin), before = b.read('tenant'); assert.deepEqual(before.world.lease, rented.world.lease);
  assert.equal(send(b, 'tenant', 'rent', action).world.coins, before.world.coins);
  f.now = rented.world.lease.expiresAt + 1000; const expired = b.read('tenant');
  assert.equal(expired.world.location, 'hem_nho'); assert.equal(expired.world.lease, undefined);
  assert.equal(expired.world.coins, before.world.coins + rented.world.lease.deposit);
  assert.equal(expired.world.lifetimeEarned, before.world.lifetimeEarned); assert.equal(expired.world.seasonEarned, 0); assert.equal(expired.world.seasons!.results.find(r => r.kind === 'ranking')!.earned, before.world.seasonEarned);
  assert.deepEqual(expired.world.dayEarned, before.world.dayEarned);
  b.close(); const c = f.open(pin); assert.deepEqual(c.read('tenant'), expired);
  assert.equal(send(c, 'tenant', 'rent', action).world.coins, expired.world.coins);
  assert.equal(c.eventsAfter('tenant', before.lastEventSeq).events.filter(row => row.event.type === 'lease_deposit_refunded').length, 1);
});

test('season rollover and old service retries survive SQLite restart without moving revenue into the next season', t => {
  const f = fixture(t); f.now = Date.parse(config.values.league.seasons.epochUtc) + 86400000;
  const a = f.open(); a.createPlayer('season-player', 42);
  send(a, 'season-player', 'open', { type: 'startShift' }); f.now += 11000;
  const action = ready(a, 'season-player'), first = send(a, 'season-player', 'serve', action);
  const end = first.world.seasons!.ranking.endsAt, amount = first.world.seasonEarned;
  send(a, 'season-player', 'pause', { type: 'activity', active: true, paused: true }); a.close();
  f.now = end; const b = f.open(), rolled = b.read('season-player');
  assert.equal(rolled.world.seasonEarned, 0); assert.equal(rolled.world.seasons!.ranking.startsAt, end);
  assert.equal(rolled.world.seasons!.results.find(r => r.kind === 'ranking')!.earned, amount);
  const retry = send(b, 'season-player', 'serve', action); assert.deepEqual(retry.result, first.result);
  assert.deepEqual(retry.world, rolled.world); assert.equal(retry.world.seasons!.contestEarned, amount);
  b.close(); const c = f.open(); assert.deepEqual(c.read('season-player'), rolled);
});
