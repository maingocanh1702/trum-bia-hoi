import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, snapshot, type Command, type Economy } from '../src';

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
  const result = send(g, { type: 'serve', tableId: table.id, orderId: order.id });
  assert.ok(result.ok);

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
  assert.ok(typeof servedRow.itemsReady === 'number' && typeof servedRow.itemsTotal === 'number');

  assert.equal(s.queue.length, g.world.queue.length);
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
  assert.equal(s.lease, g.world.lease ? s.lease : null);
  assert.equal(s.staminaMs, g.world.staminaMs);
  assert.equal(s.completedShifts, g.world.completedShifts);
  assert.equal(s.signboard, g.world.signStyle ?? null);
  assert.equal(s.flyer, g.world.flyers ?? 0);
  assert.equal(s.dog, g.world.dogLevel);
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
