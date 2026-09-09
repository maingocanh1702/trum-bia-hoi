import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, WEATHER, RUSH_TYPES, arrivalIntervalMs, encodeSave, decodeSave, type Economy, type Weather, type Command } from '../src';

const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `arrival-${g.log.length}` });
function snapshot(weather: Weather, patch = (_: Economy) => {}) {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0;
  for (const name of WEATHER) raw.weather[name].weight = name === weather ? 1 : 0;
  patch(raw); return loadConfig(raw);
}
const latestArrival = (g: Game) => g.world.events.filter(e => e.type === 'customer_spawned' || e.type === 'queue_overflow').at(-1)!;

test('ordinary hot and humid arrivals get their configured speedup across actual seeded groups', () => {
  const expected = { sunny: 10500, hot: 9975, humid: 9450, rain: 11550, cold: 12600 };
  for (const weather of WEATHER) {
    const c = snapshot(weather);
    for (const seed of [20260611, 42, 20260908, 7, 99]) {
      const g = new Game(c, seed, 0); assert.ok(send(g, { type: 'startShift' }).ok);
      assert.equal(g.world.shift!.nextSpawnAt, Math.round(c.values.spawn.baseMs * c.values.spawn.warmupMult));
      for (let group = 0; group < 3; group++) {
        g.advance(g.world.shift!.nextSpawnAt); const arrival = latestArrival(g);
        assert.equal(arrival.at, g.world.now);
        assert.equal(g.world.shift!.nextSpawnAt - g.world.now, Math.round(expected[weather] * Number(arrival.data.size)));
      }
      assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
    }
  }
});

test('ordinary baseline floor and multiplier remain configurable without weakening active-rush floors', () => {
  const c = snapshot('hot', raw => { raw.spawn.baseMs = 5000; raw.rush.none.floorMs = 9000; raw.rush.none.spawnIntervalMult = 0.8; });
  assert.equal(arrivalIntervalMs(c.values, 'hot', 'none'), 6840);
  assert.equal(arrivalIntervalMs(c.values, 'hot', 'heavy'), 950);
  const raw = structuredClone(c.raw); raw.rush.none.floorMs = 2000;
  assert.equal(arrivalIntervalMs(loadConfig(raw).values, 'hot', 'none'), 3800);
});

test('fast-weather rush groups retain hard floors and round once after the per-customer size factor', () => {
  const expected = { none: 105, peak: 6.6, light: 1000, heavy: 700, lunch_light: 1000, football: 700 };
  for (const perCustomer of [true, false]) for (const kind of RUSH_TYPES) {
    const c = snapshot('hot', raw => { raw.spawn.baseMs = 1000; raw.weather.hot.spawnIntervalMult = 0.01; raw.spawn.perCustomer = perCustomer; });
    const g = new Game(c, 5, 0); assert.ok(send(g, { type: 'startShift' }).ok);
    // Controlled slot: isolates all supported rush modes from random schedule placement.
    if (kind !== 'none') g.world.shift!.rushes = [{ kind, start: 0, end: c.values.shift.durationMs }];
    g.advance(g.world.shift!.nextSpawnAt); const size = Number(latestArrival(g).data.size);
    assert.equal(size, 2);
    const gap = g.world.shift!.nextSpawnAt - g.world.now;
    assert.equal(gap, Math.round(expected[kind] * (perCustomer ? size : 1)));
    if (kind !== 'none') assert.ok(gap >= c.values.rush[kind].floorMs);
  }
});

test('config intake rejects rounded-zero and unrepresentable ordinary or group arrival intervals', () => {
  for (const patch of [
    (raw: Economy) => { raw.weather.hot.spawnIntervalMult = 1e-9; },
    (raw: Economy) => { raw.rush.none.spawnIntervalMult = 1e300; },
    (raw: Economy) => { raw.rush.heavy.floorMs = Number.MAX_SAFE_INTEGER; },
  ]) assert.throws(() => snapshot('sunny', patch), /config:spawn\.(interval|groupInterval)/);
});

test('genuine v9 hot and humid histories keep their old cadence until a new interval is scheduled', () => {
  for (const weather of ['hot', 'humid'] as const) {
    const file = readFileSync(new URL(`./fixtures/legacy-weather-${weather}-v9.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-weather-${weather}-v9-expected.json`, import.meta.url), 'utf8'));
    const g = decodeSave(file), w = g.world; assert.deepEqual(w, expected.world);
    assert.equal(g.log.at(-1)!.rulesVersion, 9); assert.equal(g.config.version, '1.7.0');
    // Autonomous legacy ticks can run after the last logged command and before first current input.
    g.advance(w.shift!.nextSpawnAt + 1);
    const historical = structuredClone(w);
    assert.equal(w.shift!.nextSpawnAt - latestArrival(g).at, 10500 * Number(latestArrival(g).data.size));
    const pending = w.shift!.nextSpawnAt;
    assert.ok(send(g, { type: 'activity', active: true }).ok);
    assert.equal(g.log.at(-1)!.rulesVersion, 19);
    assert.deepEqual(w, { ...historical, staminaAnchorAt: w.now, staminaAnchorMs: w.staminaMs, attendance: w.attendance, shift: { ...historical.shift!, menu: { eventStart: historical.events.length, serveStart: historical.serves.length, complete: false } }, nextId: historical.nextId + 2, events: [...historical.events, { id: `event-${historical.nextId + 1}`, type: 'menu_tracking_started', at: historical.now, configVersion: g.config.version, idempotencyKey: g.log.at(-1)!.idempotencyKey, data: { shiftId: historical.shift!.id, complete: false } }, w.events.at(-1)!] }); assert.equal(w.events.at(-1)!.type, 'attendance_day_opened');
    assert.equal(w.shift!.nextSpawnAt, pending);
    g.advance(pending);
    assert.equal(w.shift!.nextSpawnAt - pending, Math.round((weather === 'hot' ? 9975 : 9450) * Number(latestArrival(g).data.size)));
    assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  }
});
