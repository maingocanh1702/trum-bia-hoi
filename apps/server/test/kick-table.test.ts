import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, loadConfig, kickTableQuote, WEATHER, type Config } from '@tbh/engine';
import { GameStore } from '../src/store';

// Wave 3 "Mời về" through the server (remote mode): the store runs the same engine command per request, so a lingering table goes home exactly once per
// idempotency key, the price comes from the player's pinned snapshot, and the result and the history survive a restart of the store. The HTTP whitelist
// (`kickTable: ['tableId', 'maxCost']`) is pinned by http.test.ts "every public action refuses injected authority fields before durable command logging".
const NOW = Date.parse('2026-10-22T10:00:00+07:00');
function fixture(t: { after(fn: () => unknown): void }, c: Config) {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-kick-')), file = join(dir, 'game.db');
  let now = NOW; const stores: GameStore[] = [];
  t.after(() => { for (const s of stores) s.close(); rmSync(dir, { recursive: true, force: true }); });
  return { get now() { return now; }, set now(value: number) { now = value; }, open: () => { const s = new GameStore(file, c, () => now); stores.push(s); return s; } };
}

test('the server sends a lingering table home once per key, at the price of the pinned snapshot, and the result survives a restart', t => {
  const raw = structuredClone(config.raw); raw._meta.version = 'kick-server-fixture'; raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === 'ngoily' ? 1 : 0;
  raw.spawn.pPair = 0; raw.spawn.capacityDemand.maxMult = 1;
  const c = loadConfig(raw), f = fixture(t, c), store = f.open();
  store.createPlayer('p', 42);
  assert.ok(store.command('p', { idempotencyKey: 'open', command: { type: 'startShift' } }).result.ok);
  let state = store.read('p');
  for (let i = 0; i < 1200 && !state.world.tables.some(x => x.state === 'consuming'); i++) {
    f.now += 100; state = store.read('p');
    const ready = state.world.tables.find(x => x.order && ['pending', 'grace'].includes(x.order.state) && x.order.items.every(item => item.state === 'ready'));
    if (ready) state = store.command('p', { idempotencyKey: `serve-${i}`, command: { type: 'serve', tableId: ready.id, orderId: ready.order!.id } });
  }
  const table = state.world.tables.find(x => x.state === 'consuming')!;
  assert.ok(table, 'a lai rai guest sits on his served tray');
  const quote = kickTableQuote(state.world, c, table);
  assert.ok(quote.ok && quote.cost! > 0, `${quote.reason}`);
  const coins = state.world.coins, reputation = state.world.reputation;
  assert.deepEqual(store.command('p', { idempotencyKey: 'kick', command: { type: 'kickTable', tableId: table.id, maxCost: quote.cost! - 1 } }).result, { ok: false, reason: 'kickCostChanged' });
  const kicked = store.command('p', { idempotencyKey: 'kick-2', command: { type: 'kickTable', tableId: table.id, maxCost: quote.cost! } });
  assert.deepEqual(kicked.result, { ok: true, amount: quote.cost });
  assert.equal(kicked.world.coins, coins - quote.cost!); assert.equal(kicked.world.reputation, Math.max(0, reputation - quote.reputation));
  assert.equal(kicked.world.tables.find(x => x.id === table.id)!.state, 'cleaning');
  const retry = store.command('p', { idempotencyKey: 'kick-2', command: { type: 'kickTable', tableId: table.id, maxCost: quote.cost! } });
  assert.deepEqual(retry.result, kicked.result, 'a retry answers the recorded result'); assert.equal(retry.world.coins, kicked.world.coins, 'and charges once');
  store.close();
  const reopened = f.open().read('p');
  assert.equal(reopened.world.coins, kicked.world.coins); assert.equal(reopened.world.events.filter(e => e.type === 'table_kicked').length, 1, 'the history kept one send-home');
});

// Owner call 1 (the founder, 2026-10-22): the price moved to kickTable.feeRate 0.5 and, being a ninth content of the label, the bundle went to 2.1.1. A dev database
// that registered a 2.1.0 content (the S6 content without the section, or the content stage 07 shipped with it at 1.5) used to refuse a different 2.1.0 bundle
// at startup (`store:configVersionConflict`); 2.1.1 is a new label, so the store opens, registers it beside the old one for import and replay, and keeps
// serving what its registry published (the bundle is a candidate, never activated by a restart): to play 2.1.1 in remote mode, start from a fresh database.
test('a database that registered a 2.1.0 content opens on the bundled 2.1.1 without store:configVersionConflict and keeps serving what its registry published', t => {
  const dir = mkdtempSync(join(tmpdir(), 'tbh-label-')); const stores: GameStore[] = [];
  t.after(() => { for (const s of stores) if (s) s.close(); rmSync(dir, { recursive: true, force: true }); });
  const s6 = loadConfig(JSON.parse(JSON.parse(readFileSync(new URL('../../../packages/engine/test/fixtures/seat-2.1.0-v28.json', import.meta.url), 'utf8')).save).config);
  const shippedRaw = structuredClone(config.raw); shippedRaw._meta.version = '2.1.0'; shippedRaw._meta.date = '2026-10-20'; shippedRaw.kickTable.feeRate = 1.5;
  const shipped = loadConfig(shippedRaw); // the content stage 07 shipped as 2.1.0
  assert.equal(config.version, '2.1.1');
  for (const [name, old, other] of [['the S6 content', s6, shipped], ['the stage-07 content', shipped, s6]] as const) {
    const file = join(dir, `${name.replace(/\W+/g, '-')}.db`), now = NOW, open = (c: Config) => { const s = new GameStore(file, c, () => now); stores.push(s); return s; };
    const a = open(old); a.createPlayer('p', 42);
    assert.ok(a.command('p', { idempotencyKey: 'open', command: { type: 'startShift' } }).result.ok, name); a.close();
    assert.throws(() => new GameStore(file, other, () => now), /store:configVersionConflict/, `${name}: a second content of 2.1.0 is still refused`);
    const b = open(config);
    assert.equal(b.read('p').world.shift!.configVersion, '2.1.0', `${name}: the player keeps his pin`);
    assert.equal(b.registry.active().version, '2.1.0', `${name}: a restart publishes nothing`);
    assert.equal(b.createPlayer('q', 7).configVersion, '2.1.0', `${name}: a new player gets the published version`);
    b.close();
    const db = new DatabaseSync(file, { readOnly: true });
    try { assert.deepEqual(db.prepare('SELECT version FROM configs ORDER BY version').all().map(row => row.version), ['2.1.0', '2.1.1'], `${name}: 2.1.1 is registered beside it`); } finally { db.close(); }
  }
});
