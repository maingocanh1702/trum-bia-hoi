import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, planRushes, summarizeRush, rushStatus, kickAllQuote, encodeSave, decodeSave, type Command, type Economy, type DomainEvent } from '../src';
const origin = Date.parse('2026-09-08T10:00:00Z');
const send = (g: Game, command: Command, at = g.world.now) => g.command({ idempotencyKey: `schedule-${g.log.length}`, at, command });
function create(patch = (_: Economy) => {}) {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.shift.startingCoinsBase = 100000; raw.patience.thuongMs = 1000000;
  patch(raw); return new Game(loadConfig(raw), 42, origin);
}
function open(patch?: (c: Economy) => void) { const g = create(patch); assert.equal(send(g, { type: 'startShift' }).ok, true); return g; }

test('seed tuple produces varied balanced schedules with complete durations and warning gaps', () => {
  const orders = new Set<string>(), layouts = new Set<string>();
  for (const count of [0, 1, 2, 3, 4]) {
    const raw = structuredClone(config.raw); raw.rush.schedule.perShift = count; const c = loadConfig(raw);
    for (let i = 0; i < 100; i++) {
      const location = c.values.locations.list[i % c.values.locations.list.length].id, id = `shift-${i}`, day = `2026-09-${i % 2 + 8}`;
      const plan = planRushes(c, location, id, day, origin)!; assert.ok(plan); assert.equal(plan.rushes.length, count);
      assert.deepEqual(plan, planRushes(c, location, id, day, origin));
      assert.equal(plan.seed, JSON.stringify([location, id, day]));
      const shifted = planRushes(c, location, id, day, origin + 1234)!;
      assert.deepEqual(shifted.rushes, plan.rushes.map(r => ({ ...r, start: r.start + 1234, end: r.end + 1234 })));
      for (const [index, slot] of plan.rushes.entries()) {
        assert.equal(slot.end - slot.start, c.values.rush[slot.kind as 'light' | 'heavy'].durationMs);
        assert.ok(slot.start >= origin + c.values.rush.schedule.noRushFirstMs);
        assert.ok(slot.start - c.values.rush.schedule.warningMs >= (plan.rushes[index - 1]?.end ?? origin));
        assert.ok(slot.end <= origin + c.values.shift.durationMs);
      }
      const lights = plan.rushes.filter(r => r.kind === 'light').length; assert.ok(Math.abs(lights - (count - lights)) <= 1);
      if (count === 2) { orders.add(plan.rushes.map(r => r.kind).join(',')); layouts.add(JSON.stringify(plan.rushes)); }
    }
  }
  assert.equal(orders.size, 2); assert.ok(layouts.size > 90);
  const g = create(), legacy = create(); send(g, { type: 'startShift' });
  legacy.replay({ idempotencyKey: 'open7', at: legacy.world.now, command: { type: 'startShift' }, rulesVersion: 7, configVersion: legacy.config.version, result: { ok: true } });
  assert.equal(g.world.rng, legacy.world.rng); assert.equal(g.world.shift!.id, legacy.world.shift!.id); assert.equal(g.world.shift!.weather, legacy.world.shift!.weather);
  assert.equal(g.world.events.filter(e => e.type === 'rush_scheduled').length, 2);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('an impossible or unbounded schedule refuses opening before any state or RNG mutation', () => {
  for (const patch of [
    (c: Economy) => { c.rush.schedule.perShift = 10001; },
    (c: Economy) => { c.rush.heavy.durationMs = c.shift.durationMs; },
    (c: Economy) => { c.rush.schedule.warningMs = c.shift.durationMs; },
    (c: Economy) => { c.rush.schedule.seed = 'invented'; },
  ]) {
    const g = create(patch), before = structuredClone(g.world);
    assert.deepEqual(send(g, { type: 'startShift' }), { ok: false, reason: 'rushScheduleUnavailable' }); assert.deepEqual(g.world, before);
  }
  const noSlots = open(c => { c.rush.schedule.perShift = 0; }); noSlots.advance(noSlots.world.shift!.endsAt);
  assert.equal(noSlots.world.events.filter(e => e.type.startsWith('rush_')).length, 0);
  const first = new Game(config, 42, origin); send(first, { type: 'startShift' }); assert.equal(first.world.shift!.rushes.length, 0);
});

test('genuine active v7 schedule and identifiers survive a same-time v8 command without retroactive reports', () => {
  const text = readFileSync(new URL('./fixtures/legacy-rush-schedule-v7.json', import.meta.url), 'utf8');
  const expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-rush-schedule-v7-expected.json', import.meta.url), 'utf8'));
  const g = decodeSave(text), w = g.world;
  for (const key of ['now', 'coins', 'reputation', 'rng', 'nextId'] as const) assert.equal(w[key], expected[key]);
  assert.deepEqual(w.shift!.rushes, expected.rushes); assert.deepEqual(w.shift!.stats, expected.stats); assert.deepEqual(w.events, JSON.parse(text).events);
  assert.deepEqual(g.log.at(-1)!.result, expected.result); send(g, { type: 'activity', active: true });
  assert.equal(g.log.at(-1)!.rulesVersion, 8); assert.deepEqual(w.shift!.rushes, expected.rushes); assert.equal(w.shift!.rushScheduleSeed, undefined);
  assert.equal(w.events.filter(e => e.type === 'rush_scheduled').length, 0);
  send(g, { type: 'endShift' }); g.advance(w.shift!.rushes[0].end);
  const ended = w.events.find(e => e.type === 'rush_ended')!; assert.deepEqual(ended.data, { kind: expected.rushes[0].kind });
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('rush report owns actual capped receipts and excludes a serve at its exact end', () => {
  const g = open(c => { c.shift.dailyEarnCapBase = 1; }), w = g.world, first = w.shift!.rushes[0];
  g.advance(first.start + 1000);
  const table = w.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const amount = send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).amount!;
  assert.equal(amount, g.config.values.shift.dailyEarnCapBase); assert.ok(w.serves.length > 0);
  const served = w.serves.length, payment = w.serves.reduce((n, s) => n + s.payment, 0), tips = w.serves.reduce((n, s) => n + s.tip, 0);
  send(g, { type: 'endShift' }); g.advance(first.end);
  const report = w.events.find(e => e.type === 'rush_ended')!;
  assert.equal(report.at, first.end); assert.equal(report.data.revenue, amount); assert.equal(report.data.served, served);
  assert.equal(report.data.payment, payment); assert.equal(report.data.tips, tips); assert.equal(report.data.staleRate, 1);
  assert.equal(report.data.shiftId, w.shift!.id); assert.equal(report.data.slot, 0);
  const during = w.events.filter(e => e.at >= first.start && e.at < first.end);
  const foreign: DomainEvent[] = [
    { ...report, type: 'shipper_completed', data: { deliveryId: 'delivery-1', gross: 525, net: 394, credited: 394, bonus: 0, onTime: true } },
    { ...report, type: 'coin_gain', data: { amount: 394 } },
    { ...report, type: 'life_path_reward_claimed', data: { coin: 2500, overflow: 0, level: 'LP1' } },
  ];
  assert.deepEqual(summarizeRush([...during, ...foreign], 0), summarizeRush(during, 0));
  const next = w.tables.find(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready'))!;
  assert.equal(send(g, { type: 'serve', tableId: next.id, orderId: next.order!.id }).ok, true);
  assert.equal(report.data.served, served); assert.ok(w.serves.length > served); assert.equal(w.shift!.rush, 'none');
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('expiry mirrors are counted once and zero-service reports have a finite stale rate', () => {
  const g = open(c => { c.patience.thuongMs = config.raw.patience.thuongMs; }), w = g.world, first = w.shift!.rushes[0];
  g.advance(first.end);
  const report = w.events.find(e => e.type === 'rush_ended')!.data;
  const during = w.events.filter(e => e.at >= first.start && e.at < first.end);
  const orderLoss = during.filter(e => e.type === 'order_expired').reduce((n, e) => n + Number(e.data.count), 0);
  const queueLoss = during.filter(e => e.type === 'customer_left' && e.data.reason === 'queue').reduce((n, e) => n + Number(e.data.count), 0);
  assert.ok(orderLoss > 0); assert.ok(during.some(e => e.type === 'customer_left' && e.data.reason === 'expired'));
  assert.equal(report.lost, orderLoss + queueLoss); assert.equal(report.served, 0); assert.equal(report.revenue, 0); assert.equal(report.staleRate, 0);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('hidden time and early finalization retain slot identity and emit one actual end report', () => {
  const g = open(), w = g.world, first = w.shift!.rushes[0]; g.advance(first.start + 1000);
  const from = first.eventStart, startedAt = first.start, remaining = rushStatus(w, g.config).active!.remainingMs;
  send(g, { type: 'activity', active: false }); g.advance(w.now + 3600000); send(g, { type: 'activity', active: true });
  assert.equal(first.eventStart, from); assert.equal(rushStatus(w, g.config).active!.remainingMs, remaining);
  assert.equal(send(g, { type: 'kickAll', shiftId: w.shift!.id, maxCost: kickAllQuote(w, g.config).cost }).ok, true);
  assert.equal(w.phase, 'resting'); const report = w.events.find(e => e.type === 'rush_ended')!;
  assert.equal(report.data.endedAt, w.now); assert.ok(Number(report.data.endedAt) < first.end);
  assert.equal(report.data.startedAt, startedAt); assert.equal(report.data.activeMs, 1000);
  g.advance(w.shift!.endsAt); assert.equal(w.events.filter(e => e.type === 'rush_ended').length, 1);
  assert.equal(w.events.filter(e => e.type === 'rush_started').length, 1); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('large and small advances retain identical schedule warnings, summaries and later customer events', () => {
  const a = open(c => { c.patience.thuongMs = config.raw.patience.thuongMs; }), b = decodeSave(encodeSave(a));
  const end = a.world.shift!.endsAt + 100000;
  a.advance(end); while (b.world.now < end) b.advance(Math.min(end, b.world.now + 1000));
  assert.deepEqual(a.world, b.world);
  assert.equal(a.world.events.filter(e => e.type === 'rush_ended').length, 2);
  assert.deepEqual(a.world.events.filter(e => e.type === 'rush_warning').map(e => e.at), a.world.shift!.rushes.map(r => r.start - a.config.values.rush.schedule.warningMs));
  assert.deepEqual(a.world.events.filter(e => e.type === 'rush_started').map(e => e.at), a.world.shift!.rushes.map(r => r.start));
  assert.deepEqual(a.world.events.filter(e => e.type === 'rush_ended').map(e => e.at), a.world.shift!.rushes.map(r => r.end));
  assert.deepEqual(decodeSave(encodeSave(a)).world, a.world);
});

test('heavy arrival captures the configured enjoyment multiplier without changing earlier guests', () => {
  const g = open(c => {
    c.patience.thuongMs = config.raw.patience.thuongMs; c.enjoy.minMs = c.enjoy.maxMs = 1000;
    for (const type of Object.values(c.customerTypes)) if ('weight' in type) type.weight = 0;
    c.customerTypes.thuong.weight = 1;
  }), w = g.world, heavy = w.shift!.rushes.find(r => r.kind === 'heavy')!;
  g.advance(w.shift!.nextSpawnAt); const earlier = w.queue[0] ?? w.tables.find(t => t.group)?.group;
  assert.ok(earlier); assert.ok(earlier.customers.every(c => c.enjoyMs === 1000));
  g.advance(heavy.start + 10000);
  const groups = [...w.queue, ...w.tables.flatMap(t => t.group ? [t.group] : [])].filter(g => g.arrivedAt >= heavy.start);
  assert.ok(groups.length > 0); assert.ok(groups.every(g => g.customers.every(c => c.enjoyMs === 1000 * config.values.rush.heavy.enjoyMult)));
  assert.ok(earlier.customers.every(c => c.enjoyMs === 1000)); assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});
