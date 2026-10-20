import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, decodeSave, encodeSave, isSeatModel, queueSlots, capacityDemandMult, WEATHER, RUSH_TYPES, type Command } from '../src';
import { serveNext } from '../sim/policy';

// Plan "Vui 3 ca" S3 / FEEDBACK II.2 v3.3 / D12 D17 D19 D25: capacity demand, the short door queue, longer patience. Every state change below is
// a real command or clock advance; the recorded save was produced by the engine of the slice before this one (fixtures/seat-v28.ts).
type Seed = typeof seed;
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `s3-${g.log.length}` });
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** A seat-model game with a wallet for real purchases, sunny weather and no scheduled rush, unless the patch says otherwise. */
function seatGame(patch?: (raw: Seed) => void, rngSeed = 42) {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 1000000; // every price still comes from the config
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0;
  patch?.(raw);
  return new Game(loadConfig(raw), rngSeed, T0);
}
const arrivals = (g: Game) => g.world.events.filter(e => e.type === 'customer_spawned' || e.type === 'queue_overflow');
/** The cadence before capacity demand and the group-size factor (ordinary weather, no rush, no flyer). */
const baseGap = (raw: Seed, weather: typeof WEATHER[number] = 'sunny') => Math.max(raw.spawn.baseMs, raw.rush.none.floorMs) * raw.weather[weather].spawnIntervalMult * raw.rush.none.spawnIntervalMult;
const version = (label: string) => label.split('.').map(Number);
const newer = (a: string, b: string) => { const [x, y] = [version(a), version(b)]; return (x[0] - y[0] || x[1] - y[1] || x[2] - y[2]) > 0; };
/** The rules-28 history S1/S2 shipped: bundled seat seed 2.0.21 (no capacity demand, queue 2 + seats/3, patience 18 s), recorded by tip 1cfde17. */
function seat2021() {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.21-v28.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save);
  return { fixture, saved, save: fixture.save as string, raw: () => structuredClone(saved.config) as any };
}
const onlyType = (raw: Seed | typeof capacityModel, type: string) => { for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === type ? 1 : 0; };

test('a rules-28 history recorded on JSON 2.0.21 replays byte for byte and re-encodes unchanged', () => {
  const { fixture, saved, save } = seat2021();
  assert.equal(saved.config._meta.version, '2.0.21'); assert.ok(saved.log.every((e: { rulesVersion: number }) => e.rulesVersion === 28));
  const g = decodeSave(save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the pre-S3 history replays to the world the old engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  assert.ok(isSeatModel(g.config.values) && g.config.version === '2.0.21');
  const kinds = new Set(g.world.events.map(e => e.type === 'queue_overflow' ? `${e.type}:${e.data.reason}` : e.type));
  for (const need of ['queue_overflow:noSeat', 'customer_left', 'order_served']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
});

test('the bundled numbers are the plan\'s W9 set: capacity demand 6 / 4 (D19), queue 1 + seats/8 and patience 24 s (D25), a Tier A key, a version above 2.0.21', () => {
  // S5 owns every number: when it retunes these, this is the one test that names them.
  assert.equal(seed.spawn.capacityDemand.refTables, 6); assert.equal(seed.spawn.capacityDemand.maxMult, 4);
  assert.equal(seed.runtime.queueBaseSlots, 1); assert.equal(seed.runtime.queueSeatsPerSlot, 8);
  assert.equal(seed.patience.thuongMs, 24000);
  assert.ok(seed._meta.governance.tiers.A.sections.includes('spawn.capacityDemand'), 'Tier A: it moves the whole economy');
  assert.ok(newer(seed._meta.version, '2.0.21'), `${seed._meta.version} is above 2.0.21`);
  assert.equal(seed.penalty.queueOverflow, 0, 'D12: a refusal at the door has no coin price either');
});

test('capacityDemandMult is min(maxMult, max(1, refTables / tables)); a snapshot from before the key has none', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(n => capacityDemandMult(config.values, n)), [4, 3, 2, 1.5, 1.2, 1, 1, 1], '1 table x4, 2 x3, 3 x2, 4 x1.5');
  const clamped = loadConfig(Object.assign(structuredClone(seed), { spawn: { ...seed.spawn, capacityDemand: { ...seed.spawn.capacityDemand, maxMult: 2 } } }));
  assert.deepEqual([1, 2, 3, 4].map(n => capacityDemandMult(clamped.values, n)), [2, 2, 2, 1.5], 'maxMult clamps the early game');
  const reference = loadConfig(Object.assign(structuredClone(seed), { spawn: { ...seed.spawn, capacityDemand: { ...seed.spawn.capacityDemand, refTables: 3 } } }));
  assert.deepEqual([1, 2, 3, 4].map(n => capacityDemandMult(reference.values, n)), [3, 1.5, 1, 1], 'refTables is the shop size that needs no help');
  for (const old of [loadConfig(seat2021().raw()), loadConfig(structuredClone(capacityModel)), loadConfig(structuredClone(legacy))]) {
    assert.deepEqual([1, 2, 4].map(n => capacityDemandMult(old.values, n)), [1, 1, 1], `${old.version} keeps its cadence`);
  }
});

test('the gap to the next group is multiplied by the demand factor of the tables owned: x4, x3, x2, x1.5 (singles and pairs, seed 42)', () => {
  const d = seed.spawn.capacityDemand;
  for (const [pPair, size] of [[0, 1], [1, 2]] as const) for (const tables of [1, 2, 3, 4]) {
    const g = seatGame(raw => { raw.onboarding.enabled = false; raw.spawn.pPair = pPair; }), w = g.world;
    while (w.tables.length < tables) assert.ok(send(g, { type: 'buyTable' }).ok);
    assert.ok(send(g, { type: 'startShift' }).ok);
    const s = w.shift!, mult = Math.min(d.maxMult, Math.max(1, d.refTables / tables));
    assert.equal(s.nextSpawnAt - s.startedAt, Math.round(seed.spawn.baseMs * seed.spawn.warmupMult), 'the first guest is not delayed by demand');
    for (let n = 0; n < 3; n++) {
      g.advance(s.nextSpawnAt);
      assert.equal(arrivals(g).at(-1)!.data.size, size);
      assert.equal(s.nextSpawnAt - w.now, Math.round(baseGap(seed) * size * mult), `${tables} table(s), groups of ${size}: x${mult}`);
    }
  }
});

test('the gap rounds once, after the group-size and demand factors, and follows the table count live', () => {
  const g = seatGame(raw => { raw.onboarding.enabled = false; raw.spawn.pPair = 0; raw.weather.sunny.weight = 0; raw.weather.hot.weight = 1; }), w = g.world;
  assert.ok(send(g, { type: 'startShift' }).ok);
  const s = w.shift!, hot = baseGap(seed, 'hot');
  g.advance(s.nextSpawnAt); assert.equal(s.nextSpawnAt - w.now, Math.round(hot * 4), 'one table: 9 975 ms x 4');
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok); // bought mid-shift: the next gap uses the shop as it is then
  g.advance(s.nextSpawnAt); assert.equal(s.nextSpawnAt - w.now, 14963, 'four tables: 9 975 x 1.5 = 14 962.5 rounds once');
});

test('capacity demand scales the gap of every rush kind too, after the rush floor and the group-size factor, rounded once (6 kinds x 1-4 tables x single and pair)', () => {
  // F08 owner line (18/09): "áp cả trong rush". The per-guest cadence is restated by hand from the config, exactly as arrivalIntervalMs documents it:
  // the ordinary cadence keeps max(baseMs, floor) before the weather, an active rush keeps its hard floor AFTER its multiplier; only then the group-size
  // and shop-size factors apply and the product is rounded once. The second regime makes every rush floor bind, so a factor applied before the floor,
  // or only while no rush runs, cannot pass.
  type Kind = typeof RUSH_TYPES[number];
  const perGuest = (raw: Seed, kind: Kind) => kind === 'none'
    ? Math.max(raw.spawn.baseMs, raw.rush.none.floorMs) * raw.weather.sunny.spawnIntervalMult * raw.rush.none.spawnIntervalMult
    : Math.max(raw.spawn.baseMs * raw.weather.sunny.spawnIntervalMult * raw.rush[kind].spawnIntervalMult, raw.rush[kind].floorMs);
  const regimes: [string, (raw: Seed) => void, number[]][] = [
    ['bundled numbers, sunny', () => {}, [10500, 6930, 3675, 2100, 4725, 2625]],
    ['every floor binds: baseMs 1000, weather x0.01', raw => { raw.spawn.baseMs = 1000; raw.weather.sunny.spawnIntervalMult = 0.01; }, [105, 6.6, 1000, 700, 1000, 700]],
  ];
  assert.deepEqual([...RUSH_TYPES], ['none', 'peak', 'light', 'heavy', 'lunch_light', 'football']);
  const d = seed.spawn.capacityDemand;
  for (const [name, patch, anchors] of regimes) {
    const raw = structuredClone(seed); patch(raw);
    assert.deepEqual(RUSH_TYPES.map(kind => +perGuest(raw, kind).toFixed(3)), anchors, `${name}: the per-guest cadence the expectation starts from`);
    for (const kind of RUSH_TYPES) for (const [pPair, size] of [[0, 1], [1, 2]] as const) for (const tables of [1, 2, 3, 4]) {
      const g = seatGame(r => { r.onboarding.enabled = false; r.spawn.pPair = pPair; patch(r); }), w = g.world;
      while (w.tables.length < tables) assert.ok(send(g, { type: 'buyTable' }).ok);
      assert.ok(send(g, { type: 'startShift' }).ok);
      const s = w.shift!;
      if (kind !== 'none') s.rushes = [{ kind, start: w.now, end: w.now + 1e9 }]; // one controlled rush for the whole shift (the trick of arrival-interval.test.ts)
      g.advance(s.nextSpawnAt);
      assert.equal(s.rush, kind, 'the controlled rush is the one running at the arrival'); assert.equal(arrivals(g).at(-1)!.data.size, size);
      const mult = Math.min(d.maxMult, Math.max(1, d.refTables / tables));
      assert.equal(s.nextSpawnAt - w.now, Math.round(perGuest(raw, kind) * size * mult), `${name}: ${kind}, ${tables} table(s), groups of ${size}: x${mult}`);
    }
  }
});

test('queue slots are queueBaseSlots + floor(seats / queueSeatsPerSlot): one seat queues one group, eight seats two; a capacity pin keeps 2 + seats/3', () => {
  const g = seatGame(), w = g.world, seats = () => w.tables.reduce((n, t) => n + t.capacity, 0);
  const expected = () => seed.runtime.queueBaseSlots + Math.floor(seats() / seed.runtime.queueSeatsPerSlot);
  assert.equal(queueSlots(w, g.config), 1); assert.equal(queueSlots(w, g.config), expected());
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok);
  for (const table of w.tables) {
    assert.equal(queueSlots(w, g.config), seats() < 8 ? 1 : 2, `${seats()} seats`); assert.equal(queueSlots(w, g.config), expected());
    assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok);
  }
  assert.equal(seats(), 8); assert.equal(queueSlots(w, g.config), 2);
  const pin = new Game(loadConfig(structuredClone(capacityModel)), 42, T0), p = pin.world, pinSeats = p.tables.reduce((n, t) => n + t.capacity, 0);
  assert.equal(capacityModel.runtime.queueBaseSlots, 2); assert.equal(capacityModel.runtime.queueSeatsPerSlot, 3);
  assert.equal(queueSlots(p, pin.config), 2 + Math.floor(pinSeats / 3));
});

test('D12: a group turned away because the door queue is full costs no coins and no reputation and is never lost; only waiting too long does', () => {
  const g = seatGame(raw => {
    raw.onboarding.enabled = false; raw.spawn.pPair = 0; onlyType(raw, 'thuong'); raw.patience.thuongMs = 120000;
    raw.spawn.baseMs = raw.rush.none.floorMs = 500; // a group every 2 s at one table
  }), w = g.world;
  assert.ok(send(g, { type: 'startShift' }).ok);
  while (w.serves.length < 1) { serveNext(g, command => { send(g, command); }); g.advance(w.now + 100); } // one guest served: there is reputation to lose
  const s = w.shift!, coins = w.coins, reputation = w.reputation, streak = w.lostStreak, from = w.events.length;
  assert.ok(reputation > 0, 'a reputation loss would be visible');
  g.advance(w.now + 30000); // nobody is served any more: the table keeps a waiting order, the one queue slot a waiting group, the rest is turned away
  assert.equal(queueSlots(w, g.config), 1); assert.equal(w.queue.length, 1);
  const doors = w.events.slice(from).filter(e => e.type === 'queue_overflow');
  assert.ok(doors.length >= 5, `${doors.length} refusals`); assert.ok(doors.every(e => e.data.reason === 'full' && e.data.size === 1));
  assert.equal(w.events.slice(from).filter(e => e.type === 'customer_left' || e.type === 'order_expired').length, 0, 'nobody left for any other reason');
  assert.equal(s.stats.lost, 0); assert.equal(s.stats.penalty, 0); assert.equal(s.stats.rejected, doors.length); assert.equal(s.stats.noSeat ?? 0, 0, 'a full queue is not a missing chair');
  assert.equal(w.coins, coins); assert.equal(w.reputation, reputation); assert.equal(w.lostStreak, streak);
  // The asymmetry D12 asks for: a guest who gave up waiting is what costs reputation, and counts as lost.
  const loss = (e: { type: string; data: Record<string, unknown> }) => e.type === 'order_expired' || e.type === 'customer_left' && e.data.reason === 'queue';
  while (!w.events.slice(from).some(loss) && w.now < s.endsAt) g.advance(w.now + 1000);
  const left = w.events.slice(from).find(loss)!;
  assert.ok(left && Number(left.data.reputation) > 0 && w.reputation < reputation, 'waiting too long costs reputation');
  assert.ok(s.stats.lost >= 1 && w.lostStreak > streak);
  assert.equal(s.stats.rejected, w.events.filter(e => e.type === 'queue_overflow').length, 'every refusal is counted once, as rejected');
  assert.equal(s.stats.lost, w.events.filter(loss).reduce((n, e) => n + Number(e.data.count), 0), 'and none of them as lost');
});

test('patience.thuongMs is 24 s on the bundled seat seed and stays 18 s on a capacity pin and on a 2.0.21 pin', () => {
  const patience = (g: Game) => { const w = g.world; assert.ok(send(g, { type: 'startShift' }).ok); g.advance(w.shift!.nextSpawnAt); const group = w.tables.find(t => t.group)?.group ?? w.queue[0]; return group.customers[0].patienceMs; };
  const fresh = seatGame(raw => { raw.onboarding.enabled = false; raw.spawn.pPair = 0; onlyType(raw, 'thuong'); });
  assert.equal(patience(fresh), seed.patience.thuongMs); assert.equal(seed.patience.thuongMs, 24000);
  const raw = structuredClone(capacityModel); raw.onboarding.enabled = false; onlyType(raw, 'thuong');
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  assert.equal(patience(new Game(loadConfig(raw), 42, T0)), capacityModel.patience.thuongMs); assert.equal(capacityModel.patience.thuongMs, 18000);
  const old = seat2021().raw(); old.onboarding.enabled = false; old.spawn.pPair = 0; onlyType(old, 'thuong');
  for (const weather of WEATHER) old.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  assert.equal(patience(new Game(loadConfig(old), 42, T0)), 18000, 'a pin from before S3 keeps its own 18 s');
});

test('snapshots from before the key load, bytes kept, and refuse every half-way shape; the new keys never loosen an older shape', () => {
  const { raw } = seat2021();
  for (const [name, patch] of [['2.0.21', () => {}], ['2.0.20 (no Wave 1 presentation keys)', (r: any) => {
    r._meta.version = '2.0.20'; delete r.nextGoal; delete r.onboarding.idleToGuideMs; delete r.onboarding.loginPrompt.leaveProgress;
    for (const key of ['hudAfterShifts', 'upgradeAllAfterShifts', 'journeyAfterShifts']) delete r.onboarding.featureReveal[key];
    r._meta.governance.tiers.C.sections = r._meta.governance.tiers.C.sections.filter((s: string) => s !== 'nextGoal');
  }]] as [string, (r: any) => void][]) {
    const pin = raw(); patch(pin);
    assert.equal(JSON.stringify(loadConfig(pin).raw), JSON.stringify(pin), `${name}: raw bytes preserved`);
    assert.equal('capacityDemand' in loadConfig(pin).values.spawn, false);
  }
  const demand = () => structuredClone(seed.spawn.capacityDemand);
  const bad: [string, RegExp, (r: any) => void][] = [
    ['the key without its Tier A entry', /config:_meta\.governance\.tiers\.A\.sections:array/, r => { r.spawn.capacityDemand = demand(); }],
    ['the Tier A entry without the key', /config:_meta\.governance\.tiers\.A\.sections:array/, r => { r._meta.governance.tiers.A.sections.push('spawn.capacityDemand'); }],
    ['a snapshot labelled with the new version that lacks the key', /config:spawn:keys/, r => { r._meta.version = seed._meta.version; r._meta.governance.tiers.A.sections.push('spawn.capacityDemand'); }],
    ['an unknown key inside capacityDemand', /config:spawn\.capacityDemand:keys/, r => { r.spawn.capacityDemand = { ...demand(), bogus: 1 }; r._meta.governance.tiers.A.sections.push('spawn.capacityDemand'); }],
    ['a wrongly typed refTables', /config:spawn\.capacityDemand\.refTables:type/, r => { r.spawn.capacityDemand = { ...demand(), refTables: '6' }; r._meta.governance.tiers.A.sections.push('spawn.capacityDemand'); }],
  ];
  for (const [name, refusal, patch] of bad) { const pin = raw(); patch(pin); assert.throws(() => loadConfig(pin), refusal, name); }
  const same = structuredClone(seed); assert.equal(loadConfig(same).version, seed._meta.version, 'the bundled seed itself loads');
  // A 1.x or capacity snapshot never carries it: refused exactly as before.
  for (const [name, base] of [['1.7.3', legacy], ['2.0.4', capacityModel]] as const) {
    const old = structuredClone(base) as any; assert.equal(loadConfig(structuredClone(base)).version, name);
    old.spawn.capacityDemand = demand(); assert.throws(() => loadConfig(old), /config:spawn:keys/, `${name} + capacityDemand`);
  }
});

test('capacityDemand fails closed: whole refTables >= 1, finite maxMult >= 1, and a gap that stays a safe integer', () => {
  const cases: [string, RegExp, (raw: Seed) => void][] = [
    ['no reference tables', /config:spawn\.capacityDemand\.refTables:integer/, raw => { raw.spawn.capacityDemand.refTables = 0; }],
    ['a fractional reference', /config:spawn\.capacityDemand\.refTables:integer/, raw => { raw.spawn.capacityDemand.refTables = 2.5; }],
    ['a negative reference', /capacityDemand\.refTables:negative/, raw => { raw.spawn.capacityDemand.refTables = -6; }],
    ['a multiplier below one would speed arrivals up', /config:spawn\.capacityDemand\.maxMult/, raw => { raw.spawn.capacityDemand.maxMult = 0.5; }],
    ['a zero multiplier', /config:spawn\.capacityDemand\.maxMult/, raw => { raw.spawn.capacityDemand.maxMult = 0; }],
    ['a gap beyond a safe integer', /config:spawn\.demandInterval:integer/, raw => { raw.spawn.capacityDemand.maxMult = 1e15; }],
  ];
  for (const [name, refusal, patch] of cases) { const raw = structuredClone(seed); patch(raw); assert.throws(() => loadConfig(raw), refusal, name); }
  const neutral = structuredClone(seed); neutral.spawn.capacityDemand.maxMult = 1;
  assert.deepEqual([1, 2, 4].map(n => capacityDemandMult(loadConfig(neutral).values, n)), [1, 1, 1], 'maxMult 1 switches the early-game demand scaling off');
});

test('a pinned 2.0.21 save plays on with its own cadence, then adopts the new bundle at its next opening and never re-migrates its seats', () => {
  const { save } = seat2021(), g = decodeSave(save), w = g.world;
  const tables = w.tables.map(t => [t.id, t.capacity, t.level]);
  assert.equal(g.config.version, '2.0.21');
  // 1) a shift opened under the same pin: no demand scaling, queue 2 + seats/3, patience 18 s (the S2 numbers)
  assert.ok(send(g, { type: 'startShift' }).ok);
  assert.equal(g.config.version, '2.0.21');
  const s = w.shift!;
  g.advance(s.nextSpawnAt);
  const first = arrivals(g).at(-1)!, size = Number(first.data.size);
  assert.equal(s.nextSpawnAt - w.now, Math.round(baseGap(seat2021().raw() as Seed, s.weather) * size), 'x1 on a pin from before the key');
  assert.equal(queueSlots(w, g.config), 2 + Math.floor(1 / 3));
  assert.ok(send(g, { type: 'endShift' }).ok);
  g.advance(w.now + 3600000);
  // 2) the next opening hands over the bundled seed: 2.0.21 -> the new version, seat -> seat (no migration, no refund)
  const coins = w.coins;
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'repin' }, config).ok);
  assert.equal(g.config.version, config.version);
  assert.deepEqual(w.events.filter(e => e.type === 'config_pinned').at(-1)!.data, { shiftId: w.shift!.id, previousVersion: '2.0.21', configVersion: config.version });
  assert.equal(w.events.filter(e => e.type === 'seat_model_adopted').length, 0, 'a seat pin never re-derives the seats');
  assert.deepEqual(w.tables.map(t => [t.id, t.capacity, t.level]), tables); assert.equal(w.coins, coins);
  const next = w.shift!; g.advance(next.nextSpawnAt);
  const size2 = Number(arrivals(g).at(-1)!.data.size);
  assert.equal(next.nextSpawnAt - w.now, Math.round(baseGap(seed, w.shift!.weather) * size2 * 4), 'one table again x4 from the new bundle');
  assert.equal(queueSlots(w, g.config), 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w, 'the whole history, the repin included, replays byte for byte');
});
