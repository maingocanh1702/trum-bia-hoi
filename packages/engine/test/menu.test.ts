import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, DISHES, menuReport, serveValueStats, encodeSave, decodeSave, kickAllQuote, type Command } from '../src';
import { kitchenGame, sendKitchen, untilKitchen } from './fixtures/kitchen';
import { playMenu } from './fixtures/menu';

test('six actual menu dishes keep per-item ordered provenance and per-customer sales without mutating the report source', () => {
  const g = kitchenGame(2); playMenu(g, () => menuReport(g.world, g.config)!.rows.every(r => r.sold > 0));
  const w = g.world, report = menuReport(w, g.config)!, before = structuredClone(w);
  assert.equal(report.complete, true); assert.equal(w.events.filter(e => e.type === 'menu_tracking_started').length, 1);
  const ordered = w.events.filter(e => e.type === 'dish_ordered');
  assert.equal(new Set(ordered.map(e => e.data.itemId)).size, ordered.length);
  for (const e of ordered) { assert.equal(e.data.shiftId, w.shift!.id); assert.equal(e.data.customerType, 'thuong'); assert.ok(Number(e.data.tableSize) > 0); assert.ok(e.data.tableId && e.data.orderId && e.data.customerId); }
  for (const row of report.rows) assert.equal(row.sold, w.serves.flatMap(s => s.dishes).filter(d => d === row.dish).length);
  assert.deepEqual(menuReport(w, g.config), report); assert.deepEqual(w, before); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a newly opened shift resets report coverage without rewriting the previous summary or selling old dishes twice', () => {
  const g = kitchenGame(2), w = g.world; playMenu(g, () => menuReport(w, g.config)!.orders > 0);
  sendKitchen(g, { type: 'endShift' }); g.advance(w.now + g.config.values.shift.durationMs * (1 + 1 / g.config.values.shift.regenRate));
  assert.equal(w.phase, 'resting'); const summary = structuredClone(w.events.find(e => e.type === 'menu_mix_summary'));
  assert.ok(summary); const previousId = w.shift!.id; assert.ok(w.serves.length > 0); sendKitchen(g, { type: 'startShift' });
  const report = menuReport(w, g.config)!; assert.notEqual(report.shiftId, previousId); assert.equal(report.complete, true);
  assert.equal(report.avgTicket, null); assert.equal(report.served, 0); assert.ok(report.rows.every(r => r.ordered === 0 && r.sold === 0 && r.wasted === 0));
  assert.deepEqual(w.events.find(e => e.id === summary.id), summary); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('hot kitchen telemetry binds the real configured duration and exact completion timestamp', () => {
  const g = kitchenGame(3); untilKitchen(g, () => g.world.events.some(e => e.type === 'kitchen_job_started'));
  const started = g.world.events.filter(e => e.type === 'kitchen_job_started');
  for (const e of started) {
    const dish = e.data.dish as typeof DISHES[number]; assert.equal(e.data.prepMs, Math.round(g.config.values.menu[dish].prepMs * g.config.values.upgrades.kitchen.prepMult[3]!));
    assert.equal(e.data.readyAt, e.at + Number(e.data.prepMs));
  }
  const first = started[0]; g.advance(Number(first.data.readyAt) - 1); assert.ok(!g.world.events.some(e => e.type === 'kitchen_job_ready' && e.data.itemId === first.data.itemId));
  g.advance(Number(first.data.readyAt)); const ready = g.world.events.filter(e => e.type === 'kitchen_job_ready' && e.data.itemId === first.data.itemId);
  assert.equal(ready.length, 1); assert.equal(ready[0].at, first.data.readyAt); assert.equal(ready[0].data.dish, first.data.dish);
});

test('a configured instant kitchen dish reports completion at the same timestamp, exactly once', () => {
  const raw = structuredClone(kitchenGame(3).config.raw); raw.runtime.initialKitchenLevel = 3;
  for (const dish of DISHES) if (raw.menu[dish].station === 'kitchen') raw.menu[dish].prepMs = 0;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T10:00:00Z'));
  for (const dish of DISHES) sendKitchen(g, { type: 'restock', dish, mode: 'full' }); sendKitchen(g, { type: 'startShift' });
  untilKitchen(g, () => g.world.events.some(e => e.type === 'kitchen_job_started'));
  const start = g.world.events.find(e => e.type === 'kitchen_job_started')!;
  assert.equal(start.data.prepMs, 0); assert.equal(start.data.readyAt, start.at); g.advance(g.world.now + 1000);
  const ready = g.world.events.filter(e => e.type === 'kitchen_job_ready' && e.data.itemId === start.data.itemId);
  assert.equal(ready.length, 1); assert.equal(ready[0].at, start.at); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('expired food is wasted once with a reason, while never-stocked hot orders count as ordered but not wasted', () => {
  for (const stocked of [true, false]) {
    const g = kitchenGame(1, stocked, 12000), w = g.world;
    untilKitchen(g, () => w.events.filter(e => e.type === 'order_placed').length >= 2); sendKitchen(g, { type: 'endShift' }); untilKitchen(g, () => w.phase === 'resting');
    const wasted = w.events.filter(e => e.type === 'dish_wasted'), report = menuReport(w, g.config)!;
    assert.ok(wasted.length); assert.equal(new Set(wasted.map(e => e.data.itemId)).size, wasted.length);
    for (const e of wasted) { assert.equal(e.data.reason, 'expired'); assert.ok(['preparing', 'ready'].includes(String(e.data.previousState))); assert.ok(w.events.some(start => ['dish_preparing', 'beer_pouring'].includes(start.type) && start.data.itemId === e.data.itemId)); }
    const hot = report.rows.filter(r => g.config.values.menu[r.dish].station === 'kitchen'); assert.ok(hot.some(r => r.ordered > 0));
    if (!stocked) assert.ok(hot.every(r => r.wasted === 0)); else assert.ok(hot.some(r => r.wasted > 0));
    const end = w.events.filter(e => e.type === 'menu_mix_summary'); assert.equal(end.length, 1); assert.equal(end[0].data.kValue, null);
    for (const row of report.rows) assert.equal(end[0].data[`wasted_${row.dish}`], row.wasted);
    const inventory = structuredClone(w.inventory); g.advance(w.now + 10000); assert.equal(w.events.filter(e => e.type === 'dish_wasted').length, wasted.length); assert.deepEqual(w.inventory, inventory);
    assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  }
});

test('confirmed dismissal discards pending-order preparation but never reclassifies a served mâm; retry and refusal add no waste', () => {
  const g = kitchenGame(2), w = g.world; untilKitchen(g, () => w.tables.some(t => t.order?.items.every(i => i.state === 'ready')));
  const table = w.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!, sold = table.order!.items.map(i => i.id);
  sendKitchen(g, { type: 'serve', tableId: table.id, orderId: table.order!.id });
  const quote = kickAllQuote(w, g.config); assert.ok(quote.ok && quote.cost > 0);
  const before = menuReport(w, g.config); assert.equal(g.command({ command: { type: 'kickAll', shiftId: 'old', maxCost: quote.cost }, at: w.now, idempotencyKey: 'wrong-shift' }).ok, false); assert.deepEqual(menuReport(w, g.config), before);
  const envelope = { command: { type: 'kickAll', shiftId: w.shift!.id, maxCost: quote.cost } as Command, at: w.now, idempotencyKey: 'dismiss-once' };
  assert.ok(g.command(envelope).ok); const events = structuredClone(w.events); assert.ok(g.command(envelope).ok); assert.deepEqual(w.events, events);
  const waste = w.events.filter(e => e.type === 'dish_wasted'); assert.ok(waste.length); assert.ok(waste.every(e => e.data.reason === 'cancelled' && !sold.includes(String(e.data.itemId))));
  assert.equal(menuReport(w, g.config)!.orders, 1); assert.equal(w.events.filter(e => e.type === 'menu_mix_summary').length, 1); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('mâm average stays separate from per-customer k across repeated rounds, with no cap or bonus credit in either value', () => {
  const raw = structuredClone(kitchenGame(2).config.raw); raw.runtime.initialKitchenLevel = 2; raw.customerTypes.thuong.weight = 0; raw.customerTypes.ngoily.weight = 1;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T10:00:00Z')); for (const dish of DISHES) sendKitchen(g, { type: 'restock', dish, mode: 'full' }); sendKitchen(g, { type: 'startShift' });
  playMenu(g, () => g.world.serves.some((s, i, all) => all.slice(0, i).some(old => old.customerId === s.customerId && old.orderId !== s.orderId)));
  const records = g.world.serves, report = menuReport(g.world, g.config)!, value = records.reduce((n, s) => n + s.payment + s.tip, 0);
  assert.equal(report.totalValue, value); assert.equal(report.mean, value / records.length); assert.equal(report.avgTicket, value / new Set(records.map(s => s.orderId)).size); assert.equal(report.kValue, report.mean! / g.config.values.k.anchorValuePerServe);
  const alteredCredits = records.map(s => ({ ...s, credited: 0, wellRestedBonus: 999999 })); assert.deepEqual(serveValueStats(alteredCredits, g.config), serveValueStats(records, g.config));
  const empty = serveValueStats([], config); assert.equal(empty.mean, null); assert.equal(empty.avgTicket, null); assert.equal(empty.kValue, null);
  const unsafe = serveValueStats([{ ...records[0], payment: Number.MAX_SAFE_INTEGER, tip: 1 }], config); assert.equal(unsafe.totalValue, null); assert.equal(unsafe.mean, null); assert.equal(unsafe.kValue, null);
  const tinyAnchor = structuredClone(config.raw); tinyAnchor.k.anchorValuePerServe = Number.MIN_VALUE;
  assert.equal(serveValueStats(records, loadConfig(tinyAnchor)).kValue, null);
});

test('menu events and report are frame-independent, and a hidden midnight does not manufacture sales or waste', () => {
  const a = kitchenGame(2), b = decodeSave(encodeSave(a)), target = a.world.now + 45000;
  a.advance(target); while (b.world.now < target) b.advance(Math.min(target, b.world.now + 100)); assert.deepEqual(a.world, b.world);
  const report = menuReport(a.world, a.config); sendKitchen(a, { type: 'activity', active: false }); a.advance(a.world.now + 86400000); assert.deepEqual(menuReport(a.world, a.config), report);
  sendKitchen(a, { type: 'activity', active: true }); assert.deepEqual(decodeSave(encodeSave(a)).world, a.world);
});

test('actual capped service, rested bonus and phone delivery keep the seated menu value basis unchanged', () => {
  for (const capped of [false, true]) {
    const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 100000; raw.lifePath[1].lifetimeBase = 1; raw.lifePath[2].lifetimeBase = 2; raw.spawn.baseMs = raw.shift.durationMs * 2;
    if (capped) raw.shift.dailyEarnCapBase = 10;
    const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T10:00:00Z'));
    // LP1 (phone gate) needs four tables in the seat model.
    for (const command of [{ type: 'upgrade', kind: 'stall' }, { type: 'restock', dish: 'lac', mode: 'full' }, { type: 'upgradeDog', level: 1 }, { type: 'buyTable' }, { type: 'buyTable' }, { type: 'buyTable' }] as const) sendKitchen(g, command);
    g.advance(g.world.now + raw.shift.wellRested.requiresRestHours * 3600000 + 1); sendKitchen(g, { type: 'startShift' }); g.advance(g.world.now + 11000);
    const table = g.world.tables.find(t => t.order)!; sendKitchen(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }); sendKitchen(g, { type: 'buyUnlock', item: 'phone' });
    const record = g.world.serves[0], expected = record.payment + record.tip;
    if (capped) assert.ok(record.credited < expected); else assert.ok(record.credited > expected && record.wellRestedBonus! > 0);
    g.advance(g.world.nextDeliveryAt!); assert.ok(g.world.delivery);
    for (const line of g.world.delivery.lines) if (g.world.inventory[line.dish] < line.quantity) sendKitchen(g, { type: 'restock', dish: line.dish, mode: 'full' });
    const before = menuReport(g.world, g.config); sendKitchen(g, { type: 'serveDelivery', deliveryId: g.world.delivery.id });
    assert.deepEqual(menuReport(g.world, g.config), before); assert.equal(before!.mean, expected); assert.equal(before!.kValue, expected / g.config.values.k.anchorValuePerServe);
    assert.equal(g.world.shift!.stats.deliveryCompleted, 1); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('genuine rules13 queued, expired and served histories remain exact; only the observed current portion is reportable', () => {
  for (const name of ['queued', 'expired', 'served']) {
    const data = readFileSync(new URL(`./fixtures/legacy-kitchen-${name}-v13.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-kitchen-${name}-v13-expected.json`, import.meta.url), 'utf8'));
    assert.equal(expected.source, 'af168338a9d85dfd276d34bb00ad9e288e281ce2');
    const g = decodeSave(data); assert.deepEqual(g.world, expected.world); assert.equal(menuReport(g.world, g.config), null);
    const oldEvents = structuredClone(g.world.events); sendKitchen(g, { type: 'activity', active: true });
    assert.deepEqual(g.world.events.slice(0, oldEvents.length), oldEvents);
    const report = menuReport(g.world, g.config);
    if (g.world.phase === 'resting') assert.equal(report, null);
    else { assert.equal(report!.complete, false); assert.equal(report!.served, 0); assert.ok(report!.rows.every(r => r.sold === 0 && r.ordered === 0 && r.wasted === 0)); }
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('five production seeds export exact six shift KPIs matching service records and deterministic replay', () => {
  for (const seed of [20260611, 42, 20260908, 7, 99]) {
    const g = new Game(config, seed, 0), w = g.world;
    sendKitchen(g, { type: 'startShift' });
    playMenu(g, () => w.phase === 'resting', config.values.shift.durationMs * 3);
    const records = w.serves, beer = records.filter(s => s.dishes.includes('bia'));
    const report = menuReport(w, g.config)!, metrics = report.metrics!;
    const mean = records.reduce((total, s) => total + s.payment + s.tip, 0) / records.length;
    assert.ok(records.length > 0);
    assert.deepEqual(metrics, { served: records.length, mean, kValue: mean / config.values.k.anchorValuePerServe,
      moiRate: records.filter(s => s.hadMoi).length / records.length,
      staleRate: beer.filter(s => s.stale).length / beer.length, lost: w.shift!.stats.lost,
      withMoi: records.filter(s => s.hadMoi).length, beerServed: beer.length, staleBeer: beer.filter(s => s.stale).length,
      arrived: w.shift!.stats.arrived, rejected: w.shift!.stats.rejected });
    const closed = w.events.filter(e => e.type === 'shift_closed'); assert.equal(closed.length, 1);
    for (const [key, value] of Object.entries(metrics)) assert.equal(closed[0].data[key], value, `seed ${seed}: ${key}`);
    assert.equal(closed[0].data.metricsComplete, true);
    const restored = decodeSave(encodeSave(g)); assert.deepEqual(restored.world, w);
    assert.deepEqual(menuReport(restored.world, restored.config)!.metrics, metrics);
    const old = structuredClone(closed[0]); g.advance(w.now + 86400000); sendKitchen(g, { type: 'startShift' });
    assert.deepEqual(w.events.find(e => e.id === old.id), old);
    assert.equal(menuReport(w, g.config)!.metrics!.served, 0);
  }
});

test('flat beer and snack numerators use served rounds, while empty and partial shifts never invent ratios', () => {
  const g = kitchenGame(2), w = g.world;
  const empty = menuReport(w, g.config)!.metrics!;
  assert.equal(empty.served, 0); assert.equal(empty.mean, null); assert.equal(empty.kValue, null);
  assert.equal(empty.moiRate, null); assert.equal(empty.staleRate, null);
  untilKitchen(g, () => w.tables.some(t => t.order?.items.every(i => i.state === 'ready')));
  const table = w.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  g.advance(w.now + g.config.values.upgrades.cooler.freshnessMs[0]! + 1);
  sendKitchen(g, { type: 'serve', tableId: table.id, orderId: table.order!.id });
  assert.ok(w.serves.some(s => s.stale));
  const metrics = menuReport(w, g.config)!.metrics!;
  assert.equal(metrics.staleBeer, w.serves.filter(s => s.stale && s.dishes.includes('bia')).length);
  assert.equal(metrics.withMoi, w.serves.filter(s => s.hadMoi).length);
  assert.equal(metrics.staleRate, metrics.staleBeer / metrics.beerServed);
  const old = decodeSave(readFileSync(new URL('./fixtures/legacy-kitchen-queued-v13.json', import.meta.url), 'utf8'));
  sendKitchen(old, { type: 'activity', active: true });
  assert.equal(menuReport(old.world, old.config)!.complete, false);
  assert.equal(menuReport(old.world, old.config)!.metrics, null);
  sendKitchen(old, { type: 'endShift' }); old.advance(old.world.now + 300000);
  const event = old.world.events.find(e => e.type === 'shift_closed')!;
  assert.equal(event.data.metricsComplete, false);
  for (const key of ['served', 'mean', 'kValue', 'moiRate', 'staleRate', 'lost']) assert.equal(event.data[key], null);
});

test('genuine rules26 close events remain byte-equivalent before adding rules27 metrics on a new shift', async () => {
  const { createHash } = await import('node:crypto');
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-metrics-v26.json', import.meta.url), 'utf8'));
  assert.equal(fixture.source, '8b6dff3');
  const g = decodeSave(fixture.save);
  assert.equal(createHash('sha256').update(JSON.stringify(g.world)).digest('hex'), fixture.worldHash);
  const oldEvents = structuredClone(g.world.events);
  assert.equal(oldEvents.find(e => e.type === 'shift_closed')!.data.metricsComplete, undefined);
  g.advance(g.world.now + 86400000); sendKitchen(g, { type: 'startShift' });
  playMenu(g, () => menuReport(g.world, g.config)!.served > 2);
  sendKitchen(g, { type: 'endShift' }); g.advance(g.world.now + 300000);
  assert.deepEqual(g.world.events.slice(0, oldEvents.length), oldEvents);
  assert.equal(g.world.events.filter(e => e.type === 'shift_closed').at(-1)!.data.metricsComplete, true);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
