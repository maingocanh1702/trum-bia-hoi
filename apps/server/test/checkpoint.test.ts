import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Game, config, loadConfig, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';

function fixture(t: { after(fn: () => void): void }, c: Config = config) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/checkpoint-')), file = resolve(dir, 'game.db');
  let now = Date.parse('2026-09-10T10:00:00Z'); const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, c, () => now); stores.push(s); return s; }, store = open(), db = new DatabaseSync(file);
  t.after(() => { db.close(); for (const s of stores) s.close(); rmSync(dir, { recursive: true, force: true }); });
  const start = () => { store.createPlayer('one', 42); return store.command('one', { idempotencyKey: 'open', command: { type: 'startShift' } }); };
  return { store, db, open, start, get now() { return now; }, set now(v: number) { now = v; } };
}

test('cold server reads and retries restore verified checkpoints without replay, while warm revisions avoid rehydration', t => {
  const f = fixture(t); f.start(); f.now += 11100;
  const a = f.store, before = a.read('one'); a.close();
  const replay = Game.prototype.replay, restore = Game.restoreTrusted; let restored = 0;
  Game.prototype.replay = () => { throw Error('test:unexpectedReplay'); };
  Game.restoreTrusted = (...args) => { restored++; return restore(...args); };
  t.after(() => { Game.prototype.replay = replay; Game.restoreTrusted = restore; });
  const b = f.open(); assert.deepEqual(b.read('one'), before); assert.equal(restored, 1);
  const table = before.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const serve = { idempotencyKey: 'serve', command: { type: 'serve' as const, tableId: table.id, orderId: table.order!.id } };
  const served = b.command('one', serve); assert.ok(served.result.ok); b.read('one');
  assert.equal(restored, 1, 'successful cached mutations retain the new revision');
  const c = f.open(); assert.equal(c.read('one').world.coins, served.world.coins); assert.equal(restored, 2);
  b.command('one', { idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
  assert.equal(c.read('one').world.paused, true); assert.equal(restored, 3);
  assert.deepEqual(c.command('one', serve).result, served.result);
  assert.equal(c.read('one').world.events.filter(e => e.type === 'order_served').length, 1);
});

test('checkpoint metadata, projection, origin, raw history and registry order must all match before trusted restore', t => {
  const cases = [
    "UPDATE engine_checkpoints SET metadata=json_set(metadata,'$.rulesVersion',1)",
    "UPDATE engine_checkpoints SET revision=revision+1",
    "UPDATE players SET projection=json_set(projection,'$.coins',999999)",
    'UPDATE players SET seed=seed+1',
    "DROP TRIGGER commands_update; UPDATE commands SET entry=json_set(entry,'$.result.ok',0)",
    "DROP TRIGGER commands_update; UPDATE commands SET idempotency_key='different' WHERE seq=1",
    "DROP TRIGGER events_update; UPDATE events SET payload=json_set(payload,'$.data.changed',1) WHERE seq=1",
    'DROP TRIGGER events_delete; DELETE FROM events WHERE seq=(SELECT max(seq) FROM events)',
  ];
  for (const sql of cases) {
    const f = fixture(t); f.start(); f.store.close(); f.db.exec(sql);
    assert.throws(() => f.open().read('one'), /checkpointMismatch|commandSequence/, sql);
  }
  const oldRaw = structuredClone(config.raw); oldRaw._meta.version = 'checkpoint-old'; const old = loadConfig(oldRaw);
  const f = fixture(t, old); f.start(); f.store.close();
  const reordered = Object.fromEntries(Object.entries(old.raw).reverse());
  f.db.exec('DROP TRIGGER configs_update'); f.db.prepare('UPDATE configs SET snapshot=? WHERE version=?').run(JSON.stringify(reordered), old.version);
  assert.throws(() => f.open().read('one'), /checkpointMismatch/);
});

test('schema5 history is replayed once and checkpointed even on an unchanged read; subsequent restart preserves exact state', t => {
  const f = fixture(t), before = f.start(); f.store.close();
  f.db.exec('DROP TABLE client_presence; DROP TABLE engine_checkpoints; PRAGMA user_version=5');
  let replays = 0; const replay = Game.prototype.replay;
  Game.prototype.replay = function(...args) { replays++; return replay.apply(this, args); };
  t.after(() => { Game.prototype.replay = replay; });
  const migrated = f.open(), after = migrated.read('one'); assert.deepEqual(after.world, before.world); assert.ok(replays > 0);
  assert.equal(f.db.prepare('PRAGMA user_version').get()!.user_version, 7);
  assert.ok(f.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get('one'));
  const count = replays; migrated.close(); assert.deepEqual(f.open().read('one'), after); assert.equal(replays, count);
});

test('checkpoint failure rolls back money, appended history, revision and cache; the original command succeeds once after recovery', t => {
  const f = fixture(t), s = f.store; f.start(); f.now += 11100; const before = s.read('one');
  const table = before.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const request = { idempotencyKey: 'serve', command: { type: 'serve' as const, tableId: table.id, orderId: table.order!.id } };
  const checkpoint = f.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get('one');
  f.db.exec("CREATE TRIGGER fail_checkpoint BEFORE UPDATE ON engine_checkpoints BEGIN SELECT RAISE(ABORT,'test:checkpointFailure'); END");
  assert.throws(() => s.command('one', request), /checkpointFailure/);
  assert.deepEqual(f.db.prepare('SELECT * FROM engine_checkpoints WHERE player_id=?').get('one'), checkpoint);
  assert.deepEqual(f.open().read('one'), before);
  f.db.exec('DROP TRIGGER fail_checkpoint'); const served = s.command('one', request); assert.ok(served.result.ok);
  s.close(); assert.deepEqual(f.open().command('one', request).result, served.result);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM commands WHERE idempotency_key=?').get('serve')!.n, 1);
});

test('legacy rows needing additive replay enrichment keep that verified replay path without rewriting immutable history', t => {
  const f = fixture(t), s = f.store; f.start(); const original = s.read('one'); s.close();
  const row = f.db.prepare('SELECT seq,payload FROM events ORDER BY seq LIMIT 1').get()!, event = JSON.parse(String(row.payload));
  delete event.data[Object.keys(event.data)[0]];
  f.db.exec('DROP TRIGGER events_update; DELETE FROM engine_checkpoints');
  f.db.prepare('UPDATE events SET payload=? WHERE seq=?').run(JSON.stringify(event), row.seq!);
  f.db.exec("CREATE TRIGGER events_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'store:appendOnly'); END");
  const a = f.open(); assert.deepEqual(a.read('one'), original);
  assert.equal(f.db.prepare('SELECT 1 FROM engine_checkpoints').get(), undefined);
  const paused = a.command('one', { idempotencyKey: 'pause', command: { type: 'activity', active: true, paused: true } });
  a.close(); assert.deepEqual(f.open().read('one').world, paused.world);
  assert.equal(f.db.prepare('SELECT 1 FROM engine_checkpoints').get(), undefined);
  assert.equal(f.db.prepare('SELECT payload FROM events WHERE seq=?').get(row.seq!)!.payload, JSON.stringify(event));
});
