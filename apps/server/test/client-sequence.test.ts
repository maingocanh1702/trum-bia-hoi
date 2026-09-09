import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config, type Command } from '@tbh/engine';
import { GameStore } from '../src/store';

function fixture(t: { after(fn: () => void): void }) {
  mkdirSync('.qa', { recursive: true }); const dir = mkdtempSync(resolve('.qa/sequence-')), file = resolve(dir, 'game.db');
  let now = Date.parse('2026-09-09T10:00:00Z'); const stores: GameStore[] = [];
  const open = () => { const s = new GameStore(file, config, () => now); stores.push(s); return s; };
  t.after(() => { for (const s of stores) s.close(); rmSync(dir, { recursive: true, force: true }); });
  const store = open(); store.createPlayer('one', 42);
  return { file, store, open, get now() { return now; }, set now(v: number) { now = v; } };
}
const request = (clientId: string, clientSeq: number, idempotencyKey: string, command: Command) => ({ clientId, clientSeq, idempotencyKey, command });

test('response loss after serving survives process cache loss, ordered retries and another tab without paying twice', t => {
  const f = fixture(t), first = f.store.connect('one'), otherTab = f.store.connect('one');
  assert.equal(first.acknowledgedSeq, 0); assert.notEqual(first.clientId, otherTab.clientId);
  const start = request(first.clientId, 1, 'start', { type: 'startShift' }); assert.ok(f.store.clientCommand('one', start).result!.ok);
  f.now += 11100;
  const table = f.store.read('one').world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const serve = request(first.clientId, 2, 'serve', { type: 'serve', tableId: table.id, orderId: table.order!.id });
  const paid = f.store.clientCommand('one', serve); assert.ok(paid.result!.ok); assert.equal(paid.acknowledgedSeq, 2);
  f.store.close(); const restarted = f.open();
  assert.equal(restarted.connect('one', first.clientId).acknowledgedSeq, 2);
  const retry = restarted.clientCommand('one', { ...serve, command: { orderId: table.order!.id, type: 'serve', tableId: table.id } });
  assert.deepEqual(retry, paid);
  const sameOperation = restarted.clientCommand('one', { ...serve, clientId: otherTab.clientId, clientSeq: 1 });
  assert.deepEqual(sameOperation.result, paid.result); assert.equal(sameOperation.world.coins, paid.world.coins);
  assert.equal(sameOperation.world.events.filter(e => e.type === 'order_served').length, 1);
  assert.equal(restarted.connect('one', otherTab.clientId).acknowledgedSeq, 1);
  f.now += 1000; const later = restarted.clientCommand('one', serve);
  assert.equal(later.world.now, f.now); assert.deepEqual(later.result, paid.result); assert.equal(later.world.coins, paid.world.coins);
});

test('gaps and altered retries do not consume sequence; processed gameplay failures do, and owners cannot use foreign streams', t => {
  const f = fixture(t), { clientId } = f.store.connect('one'), db = new DatabaseSync(f.file); t.after(() => db.close());
  const send = (seq: number, key: string, command: Command) => f.store.clientCommand('one', request(clientId, seq, key, command));
  const start = send(1, 'start', { type: 'startShift' }); assert.ok(start.result!.ok);
  assert.equal(send(3, 'serve', { type: 'serve', tableId: 'gone', orderId: 'gone' }).error, 'sequenceGap');
  assert.equal(send(1, 'changed', { type: 'startShift' }).error, 'sequenceConflict');
  assert.equal(send(2, 'start', { type: 'endShift' }).error, 'idempotencyConflict');
  assert.equal(f.store.connect('one', clientId).acknowledgedSeq, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, 1);
  const failure = send(2, 'serve', { type: 'serve', tableId: 'gone', orderId: 'gone' });
  assert.equal(failure.result!.reason, 'orderGone'); assert.equal(failure.acknowledgedSeq, 2);
  assert.deepEqual(send(2, 'serve', { type: 'serve', tableId: 'gone', orderId: 'gone' }), failure);
  assert.equal(send(3, 'start', { type: 'startShift' }).result!.ok, true); // Same operation re-enveloped, not another shift.
  assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, 2);
  assert.equal(f.store.read('one').world.events.filter(e => e.type === 'shift_opened').length, 1);
  f.store.createPlayer('two', 43);
  assert.throws(() => f.store.connect('two', clientId), /invalidClient/);
  assert.throws(() => f.store.clientCommand('two', request(clientId, 4, 'steal', { type: 'buyTable' })), /invalidClient/);
  for (const seq of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => send(seq, 'bad', { type: 'endShift' }), /invalidCommand/);
  assert.equal(f.store.connect('one', clientId).acknowledgedSeq, 3);
});

test('receipt, command, events and purchase roll back together at every write boundary and competing connections observe one ack', t => {
  const f = fixture(t), { clientId } = f.store.connect('one'), other = f.open(), db = new DatabaseSync(f.file); t.after(() => db.close());
  assert.ok(f.store.clientCommand('one', request(clientId, 1, 'start', { type: 'startShift' })).result!.ok);
  f.now += 11100; f.store.read('one');
  let seq = 2;
  for (const target of ['commands', 'events', 'client_receipts']) {
    const before = other.connect('one', clientId), payload = request(clientId, seq, `stock-${target}`, { type: 'restock', dish: 'bia', mode: 'one' });
    db.exec(`CREATE TRIGGER test_fail BEFORE INSERT ON ${target} BEGIN SELECT RAISE(ABORT,'test:diskFailure'); END`);
    assert.throws(() => f.store.clientCommand('one', payload), /test:diskFailure/);
    db.exec('DROP TRIGGER test_fail');
    assert.deepEqual(other.connect('one', clientId), before);
    const bought = other.clientCommand('one', payload); assert.ok(bought.result!.ok); assert.equal(bought.acknowledgedSeq, seq);
    assert.equal(bought.world.coins, before.world.coins - config.values.menu.bia.unitCost);
    assert.deepEqual(f.store.clientCommand('one', payload), bought); seq++;
  }
  for (const sql of ['DELETE FROM client_receipts', 'UPDATE client_receipts SET client_seq=999']) assert.throws(() => db.exec(sql), /appendOnly/);
  db.exec('PRAGMA foreign_keys=ON'); f.store.createPlayer('two', 7); const two = f.store.connect('two');
  assert.throws(() => db.prepare('INSERT INTO client_receipts VALUES (?,?,?,?)').run(two.clientId, 'one', 1, 'start'), /FOREIGN KEY/);
  assert.throws(() => db.prepare('INSERT INTO client_receipts VALUES (?,?,?,?)').run(clientId, 'one', seq, 'missing'), /FOREIGN KEY/);
});

test('v2 guest session and authoritative history migrate to ordered streams without recreating the player or applying old commands twice', t => {
  const f = fixture(t), session = f.store.createGuestSession(86400000);
  const original = f.store.command(session.playerId, { idempotencyKey: 'already-opened', command: { type: 'startShift' } });
  f.store.close(); const db = new DatabaseSync(f.file); t.after(() => db.close());
  db.exec('DROP TABLE registry_audit; DROP TABLE registry_publications; DROP TABLE registry_approvals; DROP TABLE registry_proposals; DROP TABLE client_presence; DROP TABLE engine_checkpoints; DROP TABLE local_imports; DROP TABLE account_logins; DROP TABLE google_challenges; DROP TABLE google_accounts; DROP INDEX sessions_player; DROP TABLE client_receipts; DROP TABLE client_streams; PRAGMA user_version=2');
  const migrated = f.open(); assert.equal(db.prepare('PRAGMA user_version').get()!.user_version, 8);
  assert.equal(migrated.session(session.token)!.playerId, session.playerId);
  const stream = migrated.connect(session.playerId); assert.deepEqual(stream.world, original.world);
  const retried = migrated.clientCommand(session.playerId, request(stream.clientId, 1, 'already-opened', { type: 'startShift' }));
  assert.deepEqual(retried.result, original.result); assert.deepEqual(retried.world, original.world);
  assert.equal(retried.acknowledgedSeq, 1); assert.equal(db.prepare('SELECT count(*) AS n FROM commands').get()!.n, 1);
});
