import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, snapshot, type Command, type Economy, type DailyQuests, type Attendance } from '../src';

function setup(patch = (_: Economy) => {}) {
  const raw = structuredClone(config.raw);
  for (const k of ['hot', 'humid', 'rain', 'cold'] as const) raw.weather[k].weight = 0;
  patch(raw);
  return new Game(loadConfig(raw), 42, 0);
}
function send(g: Game, command: Command, at = g.world.now) {
  return g.command({ idempotencyKey: `snap-${g.log.length}`, at, command });
}
function withReadyOrder(g: Game) {
  assert.ok(send(g, { type: 'startShift' }).ok);
  while (!g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready'))) g.advance(g.world.now + 100);
  return g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
}

test('snapshot() returns a schema:1, JSON-safe projection of every documented field group', () => {
  const g = setup();
  const table = withReadyOrder(g);
  const order = table.order!;
  const group = table.group!;
  const result = send(g, { type: 'serve', tableId: table.id, orderId: order.id });
  assert.ok(result.ok);

  // Populate the field groups a fresh/default world leaves empty, so their projections are
  // checked against real, non-trivial values instead of only against their absent/zero case.
  g.world.queue.push({ id: 'queue-test-group', customers: [{ id: 'queue-cust-1', type: 'thuong', patienceMs: 30000, enjoyMs: 20000 }], rounds: 2, arrivedAt: g.world.now });
  g.world.lease = { id: 'lease-test', locationId: g.world.location, fallback: 'via_he', startedAt: g.world.now, expiresAt: g.world.now + 100000, rent: 500, deposit: 1000, forfeitOnEarlyLeave: true };
  g.world.signStyle = 'neon';
  g.world.flyers = 3;
  g.world.dogLevel = 2;
  const dailyRows = [
    { id: 'quest-1', kind: 'test_kind_a', bucket: 'b0', target: 5, progress: 5, coin: 10, reputation: 2, claimed: true },
    { id: 'quest-2', kind: 'test_kind_b', bucket: 'b0', target: 3, progress: 1, coin: 5, reputation: 1, claimed: false },
  ];
  const daily: DailyQuests = {
    day: 'test-day', tier: 1, seed: 'test-seed', expiresAt: g.world.now + 86400000, rows: dailyRows,
    bonusClaimed: true, recipients: [], lossFreeSince: null, lossFreeServed: false,
    vipShift: null, vipServed: false, vipLost: false, rushSlot: null, rushShift: null, rushServed: false,
  };
  g.world.daily = daily;
  const attendance: Attendance = { cycleDay: 3, lastActiveDateKey: 'test-day', lastClaimDateKey: 'test-prev-day', expiresAt: g.world.now + 86400000, claimedDays: [1, 2] };
  g.world.attendance = attendance;

  const s = snapshot(g);
  assert.equal(s.schema, 1);
  assert.equal(s.configVersion, g.config.version);
  assert.equal(s.now, g.world.now);
  assert.equal(s.phase, g.world.phase);
  assert.equal(s.seed, g.seed);
  assert.equal(s.logLength, g.log.length);

  assert.ok(g.world.shift);
  assert.deepEqual(s.shift, {
    elapsed: g.world.now - g.world.shift!.startedAt,
    duration: g.world.shift!.endsAt - g.world.shift!.startedAt,
    weather: g.world.shift!.weather,
    rush: g.world.shift!.rush,
    stats: { ...g.world.shift!.stats },
  });

  assert.equal(s.tables.length, g.world.tables.length);
  const servedRow = s.tables.find(t => t.id === table.id)!;
  assert.equal(servedRow.state, table.state);
  assert.equal(servedRow.level, table.level);
  assert.equal(servedRow.capacity, table.capacity);
  assert.equal(servedRow.groupId, group.id);
  assert.equal(servedRow.orderId, order.id);
  assert.equal(servedRow.orderState, 'served');
  assert.equal(servedRow.itemsReady, order.items.filter(i => i.state === 'ready').length);
  assert.equal(servedRow.itemsTotal, order.items.length);
  assert.equal(servedRow.itemsReady, 0);
  assert.ok(servedRow.itemsTotal > 0);

  assert.deepEqual(s.queue, g.world.queue.map(q => ({ id: q.id, size: q.customers.length, rounds: q.rounds, arrivedAt: q.arrivedAt })));
  assert.ok(s.queue.length > 0);
  assert.deepEqual(Object.keys(s.glasses).sort(), ['clean', 'dirty', 'in_use', 'washing']);
  assert.equal(Object.values(s.glasses).reduce((a, b) => a + b, 0), g.world.glasses.length);

  if (g.world.beer) assert.deepEqual(s.keg, { ready: g.world.beer.ready, batch: g.world.beer.batch ? { ...g.world.beer.batch } : null });
  else assert.equal(s.keg, null);

  assert.deepEqual(s.inventory, g.world.inventory);
  assert.deepEqual(s.equipment, g.world.equipment);
  assert.deepEqual(s.economy, {
    coins: g.world.coins, reputation: g.world.reputation, seasonEarned: g.world.seasonEarned,
    lifetimeEarned: g.world.lifetimeEarned, serves: g.world.serves.length,
  });
  assert.equal(s.location, g.world.location);
  assert.deepEqual(s.lease, { ...g.world.lease });
  assert.equal(s.staminaMs, g.world.staminaMs);
  assert.equal(s.completedShifts, g.world.completedShifts);
  assert.equal(s.signboard, 'neon');
  assert.equal(s.flyer, 3);
  assert.equal(s.dog, 2);
  assert.deepEqual(s.quests, { claimed: 1, total: 2, bonusClaimed: true });
  assert.deepEqual(s.attendance, { cycleDay: 3, claimedDays: 2 });
});

test('snapshot(game) shift timing excludes paused/hidden wall time and freezes once the shift closes', () => {
  const g = setup();
  assert.ok(send(g, { type: 'startShift' }).ok);
  g.advance(g.world.now + 1000);
  assert.ok(send(g, { type: 'activity', active: false }).ok);
  g.advance(g.world.now + 60000);
  assert.ok(send(g, { type: 'activity', active: true }).ok);

  assert.equal(g.world.shift!.pausedMs, 60000);
  let s = snapshot(g);
  assert.equal(s.shift!.elapsed, 1000);
  assert.equal(s.shift!.duration, g.config.values.shift.durationMs);

  assert.ok(send(g, { type: 'endShift' }).ok);
  while (g.world.phase !== 'resting') g.advance(g.world.now + 1000);
  const closedElapsed = snapshot(g).shift!.elapsed;
  assert.ok(g.world.shift!.closedAt !== null);
  g.advance(g.world.now + 5000);

  s = snapshot(g);
  assert.equal(s.shift!.elapsed, closedElapsed);
  assert.equal(s.shift!.duration, g.config.values.shift.durationMs);
});

test('snapshot(game) is pure JSON and does not mutate game.world', () => {
  const g = setup();
  withReadyOrder(g);

  const before = structuredClone(g.world);
  const s = snapshot(g);
  const after = structuredClone(g.world);
  assert.deepEqual(before, after);

  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test('snapshot(game) reports quests/attendance counters and a null shift when resting', () => {
  const g = setup();
  const s = snapshot(g);
  assert.equal(s.shift, null);
  if (g.world.daily) {
    assert.deepEqual(s.quests, {
      claimed: g.world.daily.rows.filter(r => r.claimed).length,
      total: g.world.daily.rows.length,
      bonusClaimed: g.world.daily.bonusClaimed,
    });
  } else assert.equal(s.quests, null);
  if (g.world.attendance) assert.deepEqual(s.attendance, { cycleDay: g.world.attendance.cycleDay, claimedDays: g.world.attendance.claimedDays.length });
  else assert.equal(s.attendance, null);
});
