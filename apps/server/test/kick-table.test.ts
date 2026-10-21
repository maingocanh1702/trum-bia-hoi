import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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
