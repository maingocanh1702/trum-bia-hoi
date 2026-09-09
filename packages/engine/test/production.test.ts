import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, beerStatus, washerStatus, encodeSave, decodeSave, type Command, type Economy } from '../src';
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `batch-${g.log.length}` });
function game(patch?: (c: Economy) => void) {
  const raw = structuredClone(legacy); raw.shift.startingCoinsBase = 100000;
  for (const weather of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[weather].weight = 0;
  patch?.(raw); return new Game(loadConfig(raw), 42, 0);
}

test('level one fills five servings before any customer and refills the vacancy as a glass leaves for service', () => {
  const g = game(), w = g.world, initial = w.inventory.bia;
  send(g, { type: 'startShift' });
  assert.equal(w.shift!.stats.arrived, 0); assert.equal(w.beer!.batch!.quantity, 5); assert.equal(w.inventory.bia, initial - 5);
  g.advance(3000); assert.equal(beerStatus(w, g.config).stored, 5); assert.equal(w.beer!.batch, null);
  assert.equal(w.glasses.filter(g => g.state === 'clean').length, w.glasses.length);
  g.advance(8000); const table = w.tables[0], item = table.order!.items[0];
  assert.equal(item.state, 'ready'); assert.equal(item.readyAt, w.now); assert.equal(w.beer!.ready, 4);
  assert.equal(w.beer!.batch!.quantity, 1); assert.equal(w.inventory.bia, initial - 6);
  const serve = { command: { type: 'serve', tableId: table.id, orderId: table.order!.id } as const, at: w.now, idempotencyKey: 'one-glass' };
  assert.ok(g.command(serve).ok); const after = structuredClone(w);
  assert.ok(g.command(serve).ok); assert.deepEqual(w, after);
  g.advance(11000); assert.equal(w.beer!.ready, 5); assert.equal(w.inventory.bia, initial - 6);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a table larger than the tank assembles across batches without overflowing storage or double-consuming stock', () => {
  const g = game(c => { c.runtime.initialTableLevel = 3; c.onboarding.firstShift.firstGroupSize = 6; }), w = g.world;
  const initial = w.inventory.bia;
  send(g, { type: 'startShift' }); g.advance(8000);
  const table = w.tables[0]; assert.equal(table.order!.items.filter(i => i.state === 'ready').length, 5);
  assert.equal(w.beer!.batch!.quantity, 5); g.advance(11000);
  assert.equal(table.order!.items.length, 6); assert.ok(table.order!.items.every(i => i.state === 'ready'));
  assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok);
  for (let n = 0; n < 150; n++) {
    const readyOnTrays = w.tables.flatMap(t => t.order?.items ?? []).filter(i => i.dish === 'bia' && ['preparing', 'ready'].includes(i.state)).length;
    const served = w.serves.reduce((n, s) => n + s.dishes.filter(d => d === 'bia').length, 0);
    const waste = w.events.filter(e => e.type === 'dish_wasted' && e.data.dish === 'bia').length;
    assert.equal(w.inventory.bia + w.beer!.ready + (w.beer!.batch?.quantity ?? 0) + readyOnTrays + served + waste, initial);
    assert.ok(w.beer!.ready + (w.beer!.batch?.quantity ?? 0) <= beerStatus(w, g.config).capacity);
    assert.equal(new Set(w.glasses.map(g => g.id)).size, g.config.values.glasses.start);
    g.advance(w.now + 1000);
  }
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a partial raw stock starts immediately; restocking and a live upgrade cannot advance or resize the paused batch', () => {
  const g = game(c => { c.inventory.startingStock.bia[0] = 2; }), w = g.world;
  send(g, { type: 'startShift' }); g.advance(1000); send(g, { type: 'activity', active: true, paused: true });
  const before = beerStatus(w, g.config); assert.equal(before.busy, 2); assert.equal(w.inventory.bia, 0);
  send(g, { type: 'restock', dish: 'bia', mode: 'full' });
  assert.ok(send(g, { type: 'upgrade', kind: 'keg' }).ok);
  g.advance(w.now + 40000);
  const held = beerStatus(w, g.config); assert.equal(held.busy, 2); assert.equal(held.remainingMs, before.remainingMs); assert.equal(held.progress, before.progress);
  assert.equal(w.inventory.bia, g.config.values.upgrades.stall.stockCap[0]); assert.equal(w.beer!.ready, 0);
  const resumed = decodeSave(encodeSave(g)); send(resumed, { type: 'activity', active: true });
  resumed.advance(resumed.world.now + before.remainingMs);
  assert.equal(resumed.world.beer!.ready, 2); assert.equal(resumed.world.beer!.batch!.quantity, 3);
  assert.equal(resumed.world.beer!.batch!.readyAt - resumed.world.now, resumed.config.values.upgrades.keg.refillMs[1]);
  resumed.advance(resumed.world.beer!.batch!.readyAt); assert.equal(resumed.world.beer!.ready, 5);
  assert.deepEqual(decodeSave(encodeSave(resumed)).world, resumed.world);
});

test('a wash batch takes only its level capacity, keeps new dirty glasses queued and preserves timing through upgrade and pause', () => {
  const g = game(c => { c.runtime.initialEquipmentLevel = 3; }), w = g.world;
  w.glasses.slice(0, 3).forEach(glass => { glass.state = 'dirty'; });
  send(g, { type: 'activity', active: true });
  assert.equal(washerStatus(w, g.config).busy, 2); assert.equal(washerStatus(w, g.config).queued, 1);
  g.advance(1000); w.glasses[3].state = 'dirty'; send(g, { type: 'activity', active: true });
  assert.equal(washerStatus(w, g.config).busy, 2); assert.equal(washerStatus(w, g.config).queued, 2);
  send(g, { type: 'activity', active: true, paused: true }); const before = washerStatus(w, g.config);
  assert.ok(send(g, { type: 'upgrade', kind: 'washer' }).ok); g.advance(41000);
  assert.equal(washerStatus(w, g.config).remainingMs, before.remainingMs); assert.equal(washerStatus(w, g.config).progress, before.progress);
  send(g, { type: 'activity', active: true }); g.advance(44000);
  assert.equal(washerStatus(w, g.config).busy, 2); assert.equal(washerStatus(w, g.config).queued, 0);
  assert.equal(washerStatus(w, g.config).remainingMs, g.config.values.upgrades.washer.washMs[3]);
  g.advance(46500); assert.equal(washerStatus(w, g.config).clean, w.glasses.length);
});

test('the actual v17 paused save replays exactly and adopts enabled batches only at its next config pin', () => {
  const text = readFileSync(new URL('./fixtures/batch-v17.json', import.meta.url), 'utf8');
  const g = decodeSave(text), original = JSON.parse(text), w = g.world;
  assert.ok(g.log.every(e => e.rulesVersion === 17)); assert.deepEqual(w.events, original.events); assert.equal(w.beer, undefined);
  send(g, { type: 'activity', active: true }); assert.equal(g.log.at(-1)!.rulesVersion, 22);
  assert.equal(w.beer, undefined); assert.equal(g.config.values.upgrades.keg.refillEnabled, false);
  send(g, { type: 'endShift' }); g.advance(w.now + 100000);
  g.advance(w.now + g.config.values.shift.durationMs / g.config.values.shift.regenRate);
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'pin-batches' }, config).ok);
  assert.equal(g.config.version, config.version); assert.equal(w.beer!.ready, config.values.upgrades.keg.kegStorage[0]);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('batch capacity, units and deadlines reject fractional, oversized or invalid config', () => {
  for (const patch of [
    (c: Economy) => { c.upgrades.keg.kegBatch[0] = 6; },
    (c: Economy) => { c.upgrades.keg.kegStorage[0] = 5.5; },
    (c: Economy) => { c.upgrades.keg.refillMs[0] = 0; },
    (c: Economy) => { c.upgrades.washer.slots[0] = 1.5; },
  ]) assert.throws(() => game(patch), /config:/);
});

test('an upgraded tank holds forty servings independently of the reusable glass pool, and reserve freshness waits for the tray', () => {
  const g = game(c => { c.runtime.initialEquipmentLevel = 5; c.inventory.startingStock.bia[0] = 50; c.onboarding.firstShift.guaranteedFirstGroupWithinMs = 60000; }), w = g.world;
  send(g, { type: 'startShift' }); g.advance(59000);
  assert.equal(w.beer!.ready, 40); assert.equal(w.inventory.bia, 10); assert.equal(w.glasses.length, 10);
  assert.equal(w.events.filter(e => e.type === 'glass_stale').length, 0);
  g.advance(60000); const table = w.tables[0];
  assert.equal(table.order!.items[0].readyAt, w.now); assert.equal(w.beer!.ready, 39);
  assert.equal(w.beer!.batch!.quantity, 1); assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok);
  assert.equal(w.serves[0].stale, false); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});


test('a legacy wash without a start timestamp keeps its real deadline and reports indeterminate progress', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/legacy-daily-claimed-v12.json', import.meta.url), 'utf8'));
  const before = washerStatus(g.world, g.config);
  assert.equal(before.busy, 1); assert.equal(before.progress, undefined);
  g.advance(g.world.now + before.remainingMs / 2);
  const after = washerStatus(g.world, g.config);
  assert.equal(after.remainingMs, before.remainingMs / 2); assert.equal(after.progress, undefined);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
