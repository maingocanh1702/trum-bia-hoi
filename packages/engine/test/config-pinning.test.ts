import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, loadConfig, encodeSave, decodeSave, dayKey, validEnvelope } from '../src';
import { pinConfig, nextPin, servePin, restPin, mixedPinGame } from './fixtures/config-pinning';
import { sendKitchen } from './fixtures/kitchen';
const open = (g: Game, key = `pin-${g.log.length}`) => ({ command: { type: 'startShift' } as const, at: g.world.now, idempotencyKey: key });

test('a published candidate cannot reprice a running shift; the next opening preserves assets and adopts its duration, capacity and real pour/serve price', () => {
  const a = pinConfig('pin-A'), b = nextPin(), g = new Game(a, 42, Date.parse('2026-09-09T10:00:00Z'));
  assert.ok(g.command(open(g)).ok); const first = structuredClone(g.world.shift);
  assert.deepEqual(g.command(open(g), b), { ok: false, reason: 'shiftRunning' });
  assert.equal(g.config, a); assert.equal(g.world.shift!.endsAt, first!.endsAt); servePin(g);
  assert.equal(g.world.serves[0].payment, a.values.menu.bia.price);
  restPin(g); const assets = structuredClone({ coins: g.world.coins, inventory: g.world.inventory, equipment: g.world.equipment, dayEarned: g.world.dayEarned, dayShifts: g.world.dayShifts, lifetime: g.world.lifetimeEarned, tableIds: g.world.tables.map(t => t.id) });
  assert.ok(g.command(open(g), b).ok); assert.equal(g.config, b); assert.equal(g.initialConfig, a);
  assert.equal(g.world.staminaMs, b.values.shift.durationMs); assert.equal(g.world.shift!.endsAt - g.world.now, b.values.shift.durationMs);
  assert.deepEqual({ coins: g.world.coins, inventory: g.world.inventory, equipment: g.world.equipment, dayEarned: g.world.dayEarned, dayShifts: g.world.dayShifts, lifetime: g.world.lifetimeEarned, tableIds: g.world.tables.map(t => t.id) }, assets);
  assert.ok(g.world.tables.every(t => t.capacity === 3 && t.level === 1));
  const pin = g.world.events.find(e => e.type === 'config_pinned')!;
  assert.deepEqual(pin.data, { shiftId: g.world.shift!.id, previousVersion: a.version, configVersion: b.version });
  servePin(g); assert.equal(g.world.serves.at(-1)!.payment, b.values.menu.bia.price);
  const pour = g.world.events.find(e => e.type === 'beer_batch_started' && e.configVersion === b.version)!;
  g.advance(Number(pour.data.readyAt));
  const ready = g.world.events.find(e => e.type === 'beer_batch_ready' && e.at === pour.data.readyAt)!;
  assert.equal(ready.at - pour.at, b.values.upgrades.keg.refillMs[g.world.equipment.keg - 1]);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('failed candidate admission keeps the preceding pin and its recharge, daily accounting and ledger; the attempted snapshot still replays', () => {
  const g = mixedPinGame(); sendKitchen(g, { type: 'endShift' });
  const c = pinConfig('closed', raw => { raw.shift.dailyShiftCap.newbie = 0; raw.entitlements.freeSessionsPerDay.bySegment.newbie = 0; });
  const before = structuredClone(g.world), current = g.config;
  assert.deepEqual(g.command(open(g), c), { ok: false, reason: 'dailyShiftCap' });
  assert.equal(g.config, current); assert.deepEqual(g.world, before); assert.equal(g.log.at(-1)!.configVersion, c.version);
  const short = pinConfig('short', raw => { raw.shift.durationMs = 1; });
  assert.deepEqual(g.command(open(g), short), { ok: false, reason: 'rushScheduleUnavailable' }); assert.deepEqual(g.world, before); assert.equal(g.config, current);
  const replay = decodeSave(encodeSave(g)); assert.deepEqual(replay.world, g.world); assert.equal(replay.config.version, current.version);
  const blocked = pinConfig('longer', raw => { raw.shift.durationMs *= 2; });
  assert.ok(g.command(open(g), blocked).ok); g.advance(g.world.now + 1000); sendKitchen(g, { type: 'endShift' });
  sendKitchen(g, { type: 'activity', active: false }); g.advance(g.world.now + 86400000);
  assert.deepEqual(g.command(open(g), nextPin()), { ok: false, reason: 'restFirst' }); assert.equal(g.config.version, blocked.version);
  sendKitchen(g, { type: 'activity', active: true }); g.advance(g.world.now + 1000 / blocked.values.shift.regenRate);
  assert.ok(g.command(open(g), nextPin()).ok); assert.equal(g.world.staminaMs, nextPin().values.shift.durationMs);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('idempotent opening retries bind the original decision even after the registry selects another version; malformed, stale and non-opening transitions never register snapshots', () => {
  const g = mixedPinGame(), before = encodeSave(g), c = pinConfig('pin-C');
  const original = g.log.find(e => e.idempotencyKey === 'open-B')!;
  assert.ok(validEnvelope(original));
  assert.deepEqual(g.command(original, c), original.result); assert.equal(encodeSave(g), before);
  assert.deepEqual(g.command({ ...open(g), at: g.world.now - 1 }, c), { ok: false, reason: 'staleCommand' });
  assert.deepEqual(g.command({ ...open(g), idempotencyKey: '' }, c), { ok: false, reason: 'invalidCommand' });
  assert.deepEqual(g.command({ ...open(g), command: { type: 'activity', active: true } }, c), { ok: false, reason: 'configOnlyOnStart' });
  const collision = structuredClone(g.config.raw); collision.menu.bia.price++;
  assert.deepEqual(g.command(open(g), loadConfig(collision)), { ok: false, reason: 'configVersionConflict' });
  assert.equal(encodeSave(g), before); assert.deepEqual(g.configs.map(c => c.version), ['pin-A', 'pin-B']);
  assert.throws(() => { g.config.raw.menu.bia.price++; }, TypeError);
  const list = g.configs as unknown[]; list.pop(); assert.equal(g.configs.length, 2);
});

test('elapsed autonomous history uses the previous pin through close and rest even when a future opening selects new rules', () => {
  const a = new Game(pinConfig('pin-A'), 42, 0); assert.ok(a.command(open(a)).ok);
  const b = decodeSave(encodeSave(a)), at = a.world.now + a.config.values.shift.durationMs * 4;
  const command = { ...open(a), at, idempotencyKey: 'future-B' };
  assert.ok(a.command(command, nextPin()).ok);
  while (b.world.now < at) b.advance(Math.min(at, b.world.now + 1000));
  assert.ok(b.command(command, nextPin()).ok); assert.deepEqual(a.world, b.world);
  assert.ok(a.world.events.some(e => e.type === 'shift_closed' && e.configVersion === 'pin-A'));
  assert.deepEqual(decodeSave(encodeSave(a)).world, a.world);
});

test('single-config saves stay v2; multi-config saves reject missing, duplicated, unused or illegally referenced snapshots and altered results/events', () => {
  const single = new Game(pinConfig('pin-A'), 42, 0); single.command(open(single)); assert.equal(JSON.parse(encodeSave(single)).version, 2);
  const g = mixedPinGame(), source = JSON.parse(encodeSave(g)); assert.equal(source.version, 3);
  assert.equal(source.config._meta.version, 'pin-A'); assert.equal(source.configs[0]._meta.version, 'pin-B');
  const corruptions = [
    (s: typeof source) => { s.configs = []; },
    (s: typeof source) => { s.configs.push(s.configs[0]); },
    (s: typeof source) => { s.configs.push(pinConfig('unused').raw); },
    (s: typeof source) => { s.log.at(-1).configVersion = 'missing'; },
    (s: typeof source) => { s.log.at(-1).rulesVersion = 14; s.log.at(-1).result = { ok: false, reason: 'configVersionConflict' }; },
    (s: typeof source) => { s.log[1].configVersion = 'pin-B'; },
    (s: typeof source) => { s.log.at(-1).result.ok = false; },
    (s: typeof source) => { s.events.pop(); },
    (s: typeof source) => { delete s.events.at(-1).data; },
    (s: typeof source) => { s.configs[0].shift.durationMs *= 2; },
    (s: typeof source) => { s.log.push(s.log.at(-1)); },
  ];
  for (const corrupt of corruptions) { const s = structuredClone(source); corrupt(s); assert.throws(() => decodeSave(JSON.stringify(s)), `corruption ${corruptions.indexOf(corrupt)}`); }
  const restored = decodeSave(encodeSave(g)); assert.equal(encodeSave(restored), encodeSave(g));
});

test('a genuine rules13 service history survives current adoption and a new pinned shift without rewriting its recorded prefix', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/legacy-kitchen-served-v13.json', import.meta.url), 'utf8'));
  const prefix = structuredClone(g.world.events); sendKitchen(g, { type: 'activity', active: true });
  restPin(g); assert.ok(g.command(open(g), nextPin()).ok); assert.equal(g.log.at(-1)!.rulesVersion, 21);
  assert.deepEqual(g.world.events.slice(0, prefix.length), prefix); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('a same-day lower cap preserves already-earned value and a prior rested grant across config changes', () => {
  const g = new Game(pinConfig('pin-A'), 42, Date.parse('2026-09-09T00:00:00Z'));
  g.advance(g.world.now + g.config.values.shift.wellRested.requiresRestHours * 3600000 + 1); g.command(open(g)); servePin(g); restPin(g);
  const day = dayKey(g.world.now, g.config), earned = g.world.dayEarned[day], grants = structuredClone(g.world.wellRestedDays);
  const low = pinConfig('low-cap', raw => { raw.shift.dailyEarnCapBase = 0; }); assert.ok(g.command(open(g), low).ok); servePin(g);
  assert.equal(g.world.dayEarned[day], earned); assert.equal(g.world.serves.at(-1)!.credited, 0); assert.deepEqual(g.world.wellRestedDays, grants);
  assert.equal(g.world.shift!.wellRestedUntil, null); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('an unsafe new clock is refused before onboarding can install an unrepresentable shift deadline', () => {
  const g = new Game(pinConfig('pin-A'), 42, 1), c = pinConfig('unsafe', raw => { raw.shift.durationMs = Number.MAX_SAFE_INTEGER; });
  assert.deepEqual(g.command(open(g), c), { ok: false, reason: 'configClock' }); assert.equal(g.world.phase, 'resting'); assert.equal(g.config.version, 'pin-A');
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('a published location rename cannot orphan an owned stall, including the first onboarding shift that skips rush validation', () => {
  for (const returning of [false, true]) {
    const g = new Game(pinConfig('pin-A'), 42, 0);
    if (returning) { sendKitchen(g, { type: 'startShift' }); servePin(g); restPin(g); }
    const before = structuredClone({ coins: g.world.coins, location: g.world.location, stamina: g.world.staminaMs, tables: g.world.tables, shift: g.world.shift, rng: g.world.rng });
    const renamed = pinConfig('rename', raw => {
      raw.locations.list.find(l => l.id === g.world.location)!.id = 'new-location'; raw.locations.fallback = 'new-location';
    });
    assert.deepEqual(g.command(open(g), renamed), { ok: false, reason: 'configLocationMissing' });
    assert.equal(g.config.version, 'pin-A'); assert.deepEqual({ coins: g.world.coins, location: g.world.location, stamina: g.world.staminaMs, tables: g.world.tables, shift: g.world.shift, rng: g.world.rng }, before);
    assert.ok(!g.world.events.some(e => e.type === 'config_pinned')); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
    const compatible = nextPin(); assert.ok(g.command(open(g), compatible).ok); servePin(g); assert.ok(g.world.serves.at(-1)!.payment > 0);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('registry reserialization may reorder object keys but cannot change same-version values or array order', () => {
  const a = pinConfig('pin-A');
  const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  const reordered = loadConfig(reorder(a.raw)), g = new Game(a, 42, 0);
  assert.notEqual(JSON.stringify(a.raw), JSON.stringify(reordered.raw)); assert.ok(g.command(open(g), reordered).ok);
  assert.equal(g.config.version, a.version); assert.equal(g.configs.length, 1); assert.ok(!g.world.events.some(e => e.type === 'config_pinned'));
  const before = encodeSave(g), swapped = structuredClone(a.raw); swapped.upgrades.keg.pourMs.reverse();
  assert.deepEqual(g.command(open(g), loadConfig(swapped)), { ok: false, reason: 'configVersionConflict' }); assert.equal(encodeSave(g), before);
  assert.deepEqual(decodeSave(before).world, g.world);
});

test('a candidate designed for larger initial tables cannot strand the first group at a preserved small stall', () => {
  const candidate = pinConfig('large-onboarding', raw => { raw.runtime.initialTableLevel = 2; raw.onboarding.firstShift.firstGroupSize = 4; });
  const g = new Game(pinConfig('pin-A'), 42, 0), before = structuredClone(g.world.tables);
  assert.deepEqual(g.command(open(g), candidate), { ok: false, reason: 'configOnboardingTables' });
  assert.equal(g.world.phase, 'resting'); assert.equal(g.config.version, 'pin-A'); assert.deepEqual(g.world.tables, before);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  const compatible = pinConfig('fits-owned-level', raw => {
    raw.runtime.initialTableLevel = 2; raw.onboarding.firstShift.firstGroupSize = 3; raw.upgrades.table.levels[0].capacity = 3;
  });
  assert.ok(g.command(open(g), compatible).ok); assert.ok(g.world.tables.every(t => t.level === 1 && t.capacity === 3));
  servePin(g); assert.equal(g.world.serves.length, 3); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  const returning = mixedPinGame(); restPin(returning);
  assert.ok(returning.command(open(returning), candidate).ok); assert.equal(returning.world.shift!.onboarding, false);
  assert.deepEqual(decodeSave(encodeSave(returning)).world, returning.world);
});
