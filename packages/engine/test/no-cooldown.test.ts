import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, decodeSave, encodeSave, restRequired, noCooldownOpening, restockQuote, DISHES, type Command } from '../src';
import { serveNext } from '../sim/policy';

// Plan "Vui 3 ca" S5 / D8 / D23: `shift.noCooldownFirstShifts` = 3. The first three shifts of a save's whole life open without full stamina (the stamina is
// set to 100 % when they open), the shift cap of the day stays, shift 4 asks for the 30 minutes of GDD 10. Rules 28, switched by the key: a snapshot without it
// (JSON <= 2.0.23, every pin) keeps the cooldown from the second shift on, which the recorded S4 history below proves byte for byte.
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const K = seed.k.value;
const send = (g: Game, command: Command, opening?: Parameters<Game['command']>[1]) => g.command({ command, at: g.world.now, idempotencyKey: `nc-${g.log.length}` }, opening);
const must = (g: Game, command: Command, opening?: Parameters<Game['command']>[1]) => { const r = send(g, command, opening); assert.ok(r.ok, `${command.type}: ${r.reason}`); return r; };
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Serve and restock for `ms` of game time, the way a player at the counter would. */
function run(g: Game, ms: number) {
  const end = g.world.now + ms;
  while (g.world.now < end) {
    for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(g, command); });
    g.advance(g.world.now + 100);
  }
}
/** Play on until the shift that has run its time is closed (the guests leave). */
function closeOut(g: Game) {
  let guard = 0; while (g.world.phase !== 'resting' && guard++ < 1200) run(g, 1000);
  assert.equal(g.world.phase, 'resting', 'the shift closed');
}
/** A whole shift: opened, played to its end, closed - the stamina at the end is what the shift drained. */
function wholeShift(g: Game, opening?: Parameters<Game['command']>[1]) {
  must(g, { type: 'startShift' }, opening);
  run(g, g.config.raw.shift.durationMs);
  closeOut(g);
}
const restMs = (g: Game) => Math.ceil((g.config.raw.shift.durationMs - g.world.staminaMs) / g.config.raw.shift.regenRate);
/** A fresh game on a patched copy of the bundled seed (a quiet door and no rush: the clock is what is under test). */
function fresh(patch?: (raw: typeof seed) => void) {
  const raw = structuredClone(seed);
  raw.rush.schedule.perShift = 0; raw.onboarding.enabled = false;
  patch?.(raw);
  return new Game(loadConfig(raw), 42, T0);
}
const seat2023 = () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.23-v28.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save);
  return { fixture, saved, save: fixture.save as string, raw: () => structuredClone(saved.config) as any };
};
const seat2023Config = () => loadConfig(seat2023().raw());
const version = (label: string) => label.split('.').map(Number);
const newer = (a: string, b: string) => { const [x, y] = [version(a), version(b)]; return (x[0] - y[0] || x[1] - y[1] || x[2] - y[2]) > 0; };

test('a rules-28 history recorded on JSON 2.0.23 replays byte for byte and re-encodes unchanged: the cooldown starts at the second shift, both early openings are refused with restFirst', () => {
  const { fixture, saved, save } = seat2023();
  assert.equal(saved.config._meta.version, '2.0.23'); assert.ok(saved.log.every((e: { rulesVersion: number }) => e.rulesVersion === 28));
  assert.equal('noCooldownFirstShifts' in saved.config.shift, false, 'a pin from before the key does not carry it');
  const g = decodeSave(save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the pre-S5 history replays to the world the old engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  assert.equal(g.config.version, '2.0.23'); assert.equal(g.world.completedShifts, 3);
  assert.deepEqual(saved.log.filter((e: { result: { ok: boolean } }) => !e.result.ok).map((e: { command: { type: string }; result: { reason: string } }) => [e.command.type, e.result.reason]),
    [['startShift', 'restFirst'], ['startShift', 'restFirst']], 'the second and the third opening waited for the stamina');
  assert.equal(noCooldownOpening({ completedShifts: 0 }, g.config), false); assert.equal(restRequired({ ...g.world, staminaMs: 0 }, g.config), true);
  const kinds = new Set(g.world.events.map(e => e.type));
  for (const need of ['table_upgraded', 'chair_upgraded', 'chair_bought', 'order_served', 'shift_closed']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
});

test('a new save opens shifts 2 and 3 at once with full stamina, and shift 4 asks for the stamina again', () => {
  const g = fresh(), w = g.world, full = g.config.raw.shift.durationMs;
  wholeShift(g); assert.equal(w.completedShifts, 1); assert.equal(w.staminaMs, 0, 'a whole shift drains the stamina');
  assert.equal(restRequired(w, g.config), false, 'the screen is told that no rest is needed');
  must(g, { type: 'startShift' }); assert.equal(w.phase, 'open', 'shift 2 opens at the moment shift 1 closed'); assert.equal(w.staminaMs, full, 'its stamina is set to 100 % when it opens');
  run(g, full); closeOut(g);
  assert.equal(w.completedShifts, 2); assert.equal(w.staminaMs, 0);
  must(g, { type: 'startShift' }); assert.equal(w.staminaMs, full, 'shift 3 too');
  run(g, full); closeOut(g);
  assert.equal(w.completedShifts, 3); assert.equal(restRequired(w, g.config), true, 'from the fourth shift the 30 minutes apply');
  const refused = send(g, { type: 'startShift' }); assert.deepEqual([refused.ok, refused.reason], [false, 'restFirst']);
  const wait = restMs(g); assert.equal(wait, 1800000, 'GDD 10: 12 minutes of stamina come back in 30 minutes of rest (regenRate 0.4)');
  g.advance(w.now + wait - 1); assert.equal(send(g, { type: 'startShift' }).ok, false, 'one millisecond early is still too early');
  g.advance(w.now + 1); must(g, { type: 'startShift' }); assert.equal(w.phase, 'open');
});

test('the first shifts of a save\'s whole life count, however the days fall: the cap of the day stays, a quiet night does not reset them', () => {
  const g = fresh(raw => { raw.shift.dailyShiftCap.newbie = 2; raw.entitlements.freeSessionsPerDay.bySegment.newbie = 2; raw.entitlements.freeSessionsPerDay.default = 2; }), w = g.world;
  wholeShift(g); wholeShift(g);
  const capped = send(g, { type: 'startShift' }); assert.deepEqual([capped.ok, capped.reason], [false, 'dailyShiftCap'], 'the third shift of the day is refused by the cap, not by the stamina');
  g.advance(w.now + 86400000); wholeShift(g); assert.equal(w.completedShifts, 3, 'shift 3 of the save opened the next day');
  g.advance(w.now + 1000);
  const next = send(g, { type: 'startShift' }); assert.deepEqual([next.ok, next.reason], [false, 'restFirst'], 'shift 4 still asks for the stamina in the same day');
});

test('noCooldownFirstShifts is a count of shifts: N lets shifts 2..N open at once, 0 and 1 never do', () => {
  for (const n of [0, 1, 2, 3, 5]) {
    const g = fresh(raw => { raw.shift.noCooldownFirstShifts = n; }), w = g.world, immediate: number[] = [];
    for (let shift = 1; shift <= 6; shift++) {
      if (shift > 1) {
        const r = send(g, { type: 'startShift' });
        if (r.ok) { immediate.push(shift); run(g, g.config.raw.shift.durationMs); closeOut(g); }
        else { assert.equal(r.reason, 'restFirst'); g.advance(w.now + restMs(g)); wholeShift(g); }
      } else wholeShift(g);
    }
    assert.deepEqual(immediate, Array.from({ length: Math.max(0, Math.min(n, 6) - 1) }, (_, i) => i + 2), `N = ${n}`);
  }
});

test('a save pinned to JSON 2.0.23 that played one shift opens its second at once when that opening adopts the bundle: the first shifts of a life belong to the opening snapshot', () => {
  const { raw } = seat2023(), pin = raw(); pin.shift.startingCoinsBase = 100000;
  const g = new Game(loadConfig(pin), 42, T0), w = g.world;
  wholeShift(g); assert.equal(g.config.version, '2.0.23'); assert.equal(restRequired(w, g.config), true, 'on its own pin the second shift would wait');
  assert.equal(send(g, { type: 'startShift' }).ok, false, 'refused with the pin it plays on');
  must(g, { type: 'startShift' }, config); assert.equal(g.config.version, config.version); assert.equal(w.phase, 'open'); assert.equal(w.staminaMs, config.raw.shift.durationMs);
  assert.deepEqual(w.events.filter(e => e.type === 'config_pinned').at(-1)!.data, { shiftId: w.shift!.id, previousVersion: '2.0.23', configVersion: config.version });
  assert.deepEqual(decodeSave(encodeSave(g)).world, w, 'the whole history, the repin included, replays byte for byte');
});

test('a history that opens its early shifts without a rest replays byte for byte: the new rule is deterministic', () => {
  const g = fresh(); wholeShift(g); wholeShift(g); wholeShift(g);
  assert.equal(g.world.completedShifts, 3); assert.ok(g.log.every(e => e.result.ok), 'no refusal: the three shifts followed each other');
  const decoded = decodeSave(encodeSave(g));
  assert.equal(sha(decoded.world), sha(g.world)); assert.equal(encodeSave(decoded), encodeSave(g));
});

test('the bundled seed carries the key as a Tier A shift value of 3, a version above 2.0.23, and no number outside the JSON', () => {
  assert.equal(seed.shift.noCooldownFirstShifts, 3);
  assert.equal(config.values.shift.noCooldownFirstShifts, 3, 'a count, not a Base value: k does not scale it');
  assert.ok(seed._meta.governance.tiers.A.sections.includes('shift'), 'every shift key is Tier A');
  assert.ok(newer(seed._meta.version, '2.0.23'), `${seed._meta.version} is above 2.0.23`);
  assert.equal(K, 2.5);
});

test('snapshots from before the key load, bytes kept, and refuse every half-way shape; the key never loosens an older shape', () => {
  const { raw } = seat2023();
  const pin = raw(); assert.equal(JSON.stringify(loadConfig(pin).raw), JSON.stringify(pin), 'a 2.0.23 pin: raw bytes preserved');
  assert.equal('noCooldownFirstShifts' in loadConfig(pin).values.shift, false);
  const withKey = raw(); withKey.shift.noCooldownFirstShifts = 3;
  assert.equal((loadConfig(withKey).values.shift as { noCooldownFirstShifts?: number }).noCooldownFirstShifts, 3, 'a copy labelled 2.0.23 that carries the key is a complete snapshot too');
  const bad: [string, RegExp, (r: any) => void][] = [
    // "the new version" is the label that introduced the key (2.1.0); the bundled label (2.1.2 since the founder's HUD override of 2026-10-22; `kickTable` came with 2.1.1) also needs `kickTable`, so its case
    // carries that section and lacks only the key under test.
    ['a snapshot labelled with the new version that lacks the key', /config:shift:keys/, r => { r._meta.version = '2.1.0'; }],
    ['a snapshot labelled with the bundled version that lacks only the key', /config:shift:keys/, r => {
      r._meta.version = seed._meta.version; r.kickTable = structuredClone(seed.kickTable); r._meta.governance.tiers.A.sections.push('kickTable'); }],
    ['a string instead of a count', /config:shift\.noCooldownFirstShifts:type/, r => { r.shift.noCooldownFirstShifts = '3'; }],
    ['a fraction of a shift', /config:shift\.noCooldownFirstShifts:integer/, r => { r.shift.noCooldownFirstShifts = 2.5; }],
    ['a negative count', /negative|config:shift\.noCooldownFirstShifts/, r => { r.shift.noCooldownFirstShifts = -1; }],
    ['an unknown sibling key', /config:shift:keys/, r => { r.shift.noCooldownFirstShifts = 3; r.shift.bogus = 1; }],
  ];
  for (const [name, refusal, patch] of bad) { const p = raw(); patch(p); assert.throws(() => loadConfig(p), refusal, name); }
  assert.equal(loadConfig(structuredClone(seed)).version, seed._meta.version, 'the bundled seed itself loads');
  for (const [name, base] of [['1.7.3', legacy], ['2.0.4', capacityModel]] as const) {
    assert.equal(loadConfig(structuredClone(base)).version, name);
    const old = structuredClone(base) as any; old.shift.noCooldownFirstShifts = 3;
    assert.throws(() => loadConfig(old), /config:shift:keys/, `${name} + the key`);
  }
});

test('noCooldownOpening reads the snapshot that opens the shift: no key, no allowance; the count is the whole life of the save', () => {
  // A seat-model snapshot only ever runs at rules >= 28 (replay() refuses older entries for one), and the engine also names SEAT_RULES in the branch, so an
  // old log can never switch the rule on; here the helper itself: the same answer for every screen that asks "must this shop rest first?".
  const g = fresh(); wholeShift(g);
  assert.equal(g.log.at(-1)!.rulesVersion, 28);
  assert.equal(noCooldownOpening({ completedShifts: 0 }, loadConfig(capacityModel)), false, 'a capacity pin has no key: no allowance');
  assert.equal(noCooldownOpening({ completedShifts: 0 }, seat2023Config()), false, 'nor has a 2.0.23 pin');
  assert.equal(noCooldownOpening({ completedShifts: 2 }, config), true); assert.equal(noCooldownOpening({ completedShifts: 3 }, config), false);
  assert.equal(restRequired({ ...g.world, staminaMs: 0, completedShifts: 3 }, config), true); assert.equal(restRequired({ ...g.world, staminaMs: config.values.shift.durationMs, completedShifts: 3 }, config), false, 'full stamina never needs a rest');
});
