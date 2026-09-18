import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import legacy from './fixtures/legacy-feedback-v25.json';
import { decodeSave, encodeSave, menuReport, orderPreparation } from '../src';
import { feedbackGame, feedbackCommand, firstOrder } from './fixtures/feedback';

test('pending beer distinguishes empty raw stock from reserved refill, clean glasses and an already prepared tray', () => {
  const empty = feedbackGame(raw => { raw.inventory.startingStock.bia[0] = 0; });
  const emptyOrder = firstOrder(empty); assert.equal(orderPreparation(empty.world, empty.config, emptyOrder), 'beerStock');
  feedbackCommand(empty, { type: 'restock', dish: 'bia', mode: 'one' });
  assert.equal(empty.world.inventory.bia, 0); assert.ok(empty.world.beer!.batch);
  assert.equal(orderPreparation(empty.world, empty.config, emptyOrder), 'beerRefill');
  empty.advance(empty.world.beer!.batch!.readyAt);
  assert.equal(orderPreparation(empty.world, empty.config, emptyOrder), 'preparing');
  empty.advance(emptyOrder.items[0].readyAt!);
  assert.equal(orderPreparation(empty.world, empty.config, emptyOrder), 'ready');
  assert.equal(empty.world.inventory.bia, 0);
  const glasses = feedbackGame(raw => { raw.glasses.start = 1; raw.onboarding.firstShift.firstGroupSize = 2; });
  const glassOrder = firstOrder(glasses); glasses.advance(glassOrder.items[0].readyAt!);
  assert.equal(orderPreparation(glasses.world, glasses.config, glassOrder), 'glasses');
  const food = feedbackGame(raw => { raw.runtime.initialKitchenLevel = 1; raw.onboarding.firstShift.firstOrder = ['dau']; });
  assert.equal(orderPreparation(food.world, food.config, firstOrder(food)), 'foodStock');
  const mixed = feedbackGame(raw => { raw.onboarding.firstShift.firstGroupSize = 2; });
  assert.equal(orderPreparation(mixed.world, mixed.config, firstOrder(mixed)), 'mixed');
});

test('simultaneous deadlines observe a blocked pan before another expiring table frees it, and a busy tap is distinct', () => {
  const g = feedbackGame(raw => {
    raw.runtime.initialKitchenLevel = 1; raw.onboarding.firstShift.firstOrder = ['dau'];
    raw.upgrades.table.levels[0].capacity = 1; raw.menu.dau.prepMs = 100000;
    raw.demandMix.pMoi = raw.demandMix.pHotGivenMoi = 1;
    raw.inventory.startingStock.lac[0] = raw.inventory.startingStock.nem[0] = 0;
    for (const row of Object.values(raw.customerTypes)) if ('weight' in row) row.weight = 0;
    raw.customerTypes.voi.weight = 1; raw.customerTypes.voi.patienceMult = (raw.patience.thuongMs - raw.rush.none.floorMs) / raw.patience.thuongMs;
  });
  feedbackCommand(g, { type: 'restock', dish: 'dau', mode: 'full' }); const first = firstOrder(g);
  const deadline = first.placedAt + first.patienceMs + g.config.values.patience.graceMs;
  g.advance(deadline - 1); const second = g.world.tables[1].order!;
  assert.equal(second.placedAt + second.patienceMs + g.config.values.patience.graceMs, deadline);
  assert.equal(orderPreparation(g.world, g.config, first), 'preparing');
  assert.equal(orderPreparation(g.world, g.config, second), 'pan');
  g.advance(deadline);
  assert.deepEqual(g.world.events.filter(e => e.type === 'order_expired' && e.at === deadline).map(e => e.data.cause), ['preparing', 'pan']);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  const tap = feedbackGame(raw => { raw.upgrades.table.levels[0].capacity = 1; raw.upgrades.keg.pourMs[0] = 100000; raw.demandMix.pMoi = 0; });
  firstOrder(tap); tap.advance(tap.world.now + 11000);
  assert.equal(orderPreparation(tap.world, tap.config, tap.world.tables[1].order), 'tap');
});

test('genuine rules25 losses and summaries replay unchanged, then mixed old and new evidence remains explicitly unknown', () => {
  assert.equal(legacy.source, '07430a95ec6f8f2799650344511dbda2f8a19f12');
  const g = decodeSave(legacy.save);
  assert.equal(createHash('sha256').update(JSON.stringify(g.world)).digest('hex'), legacy.worldSha256);
  const oldEvents = structuredClone(g.world.events), oldLost = g.world.shift!.stats.lost;
  assert.ok(oldEvents.some(event => event.type === 'menu_mix_summary'));
  assert.ok(oldEvents.filter(event => event.type === 'menu_mix_summary').every(event => !('losses' in event.data)));
  assert.ok(oldLost > 0); assert.equal(menuReport(g.world, g.config)!.losses.unknown, oldLost);
  feedbackCommand(g, { type: 'activity', active: true }); g.advance(g.world.now + 60000);
  assert.deepEqual(g.world.events.slice(0, oldEvents.length), oldEvents);
  const report = menuReport(g.world, g.config)!;
  assert.equal(report.losses.unknown, oldLost); assert.ok(report.losses.beerStock + report.losses.queue > 0);
  assert.equal(Object.values(report.losses).reduce((a, b) => a + b, 0), g.world.shift!.stats.lost);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('expiry records the ready or pending cause before waste and counts whole customers once, separate from queue losses', () => {
  for (const stocked of [true, false]) {
    const g = feedbackGame(raw => { if (!stocked) raw.inventory.startingStock.bia[0] = 0; }), order = firstOrder(g);
    feedbackCommand(g, { type: 'endShift' });
    const deadline = order.placedAt + order.patienceMs + g.config.values.patience.graceMs;
    g.advance(deadline - 1); assert.equal(menuReport(g.world, g.config)!.losses[stocked ? 'ready' : 'beerStock'], 0);
    g.advance(deadline);
    const event = g.world.events.find(e => e.type === 'order_expired')!;
    assert.equal(event.data.cause, stocked ? 'ready' : 'beerStock'); assert.equal(event.data.shiftId, g.world.shift!.id);
    assert.equal(menuReport(g.world, g.config)!.losses[stocked ? 'ready' : 'beerStock'], event.data.count);
    assert.equal(order.state, 'expired');
    const before = structuredClone(g.world); g.advance(g.world.now); assert.deepEqual(g.world, before);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
    g.advance(g.world.now + 10000);
    assert.equal(Object.values(menuReport(g.world, g.config)!.losses).reduce((a, b) => a + b, 0), g.world.shift!.stats.lost);
    assert.ok(!('losses' in g.world.events.find(e => e.type === 'menu_mix_summary')!.data));
  }
  const queued = feedbackGame(raw => {
    raw.onboarding.enabled = false; raw.spawn.baseMs = 500; raw.spawn.warmupMult = 1;
    raw.rush.none.floorMs = 500; raw.inventory.startingStock.bia[0] = 0;
  });
  feedbackCommand(queued, { type: 'startShift' }); queued.advance(queued.world.now + 180000);
  const report = menuReport(queued.world, queued.config)!;
  assert.ok(report.losses.queue > 0); assert.ok(report.losses.beerStock > 0); assert.equal(report.losses.unknown, 0);
  assert.equal(report.losses.queue, queued.world.events.filter(e => e.type === 'customer_left' && e.data.reason === 'queue').reduce((sum, e) => sum + Number(e.data.count), 0));
  assert.equal(Object.values(report.losses).reduce((a, b) => a + b, 0), queued.world.shift!.stats.lost);
  assert.deepEqual(decodeSave(encodeSave(queued)).world, queued.world);
});
