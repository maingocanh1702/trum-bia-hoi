import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, config, loadConfig, decodeSave, encodeSave, firstShiftExcludedTypes, restockQuote, DISHES, type Command } from '../src';
import { serveNext } from '../sim/policy';

// Founder 2026-10-22 (Part A2, JSON 2.1.3): no "Bàn lai rai" (`ngoily`) while the save has completed no shift. `onboarding.firstShift.excludedCustomerTypes` (Tier C)
// lists the seated types an onboarding shift (onboarding on and completedShifts 0, the gate of `firstShift.rushDisabled`) never draws; the others share the draw as if
// the type weighed 0. The key is the rule: a pin without it (JSON <= 2.1.2) plays and replays as it always did. Every state here comes from real commands and clock time.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-22T10:00:00+07:00');
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** The bundled seed with the two lingering guests drawn often (the weights of the recorded S6 history below), so a shift 1 without them is not luck. */
const lively = (patch?: (raw: Seed) => void) => { const raw = structuredClone(seed); raw.customerTypes.ngoily.weight = 0.6; raw.customerTypes.chipheo.weight = 0.4; patch?.(raw); return raw; };
/** The same content as it was before 2.1.3: the label 2.1.2, without the two keys 2.1.3 added. */
const before213 = (raw: Seed) => {
  raw._meta.version = '2.1.2';
  delete (raw.onboarding.featureReveal as Record<string, unknown>).kickAfterShifts; delete (raw.onboarding.firstShift as Record<string, unknown>).excludedCustomerTypes;
};
/** Open the next shifts one by one, keep the shelves stocked and serve every ready tray until each closes; the types of every guest who sat down, per shift. */
function play(g: Game, shifts: number): string[][] {
  const send = (command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `fs-${g.log.length}` });
  const seated: string[][] = [];
  for (let n = 1; n <= shifts; n++) {
    assert.ok(send({ type: 'startShift' }).ok, `shift ${n} opens`); // the first three shifts of a save need no rest (shift.noCooldownFirstShifts)
    const seen = new Set<string>(), types: string[] = [];
    for (let step = 0; g.world.phase !== 'resting'; step++) {
      assert.ok(step < 20000, `shift ${n} closes`);
      for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
      serveNext(g, command => { send(command); });
      g.advance(g.world.now + 200);
      for (const t of g.world.tables) if (t.group && !seen.has(t.group.id)) { seen.add(t.group.id); types.push(...t.group.customers.map(c => c.type)); }
    }
    seated.push(types);
  }
  return seated;
}
const count = (types: string[], type: string) => types.filter(t => t === type).length;

test('a new save seats no Bàn lai rai in shift 1, even when it is drawn often, and seats them again from shift 2 (founder 2026-10-22, JSON 2.1.3)', () => {
  assert.deepEqual(firstShiftExcludedTypes(config.values), ['ngoily']);
  let first = 0, second = 0; const others = new Set<string>();
  for (const rngSeed of [1, 2, 3, 4]) {
    const g = new Game(loadConfig(lively()), rngSeed, T0), [one, two] = play(g, 2);
    first += count(one, 'ngoily'); second += count(two, 'ngoily'); for (const type of one) others.add(type);
    assert.equal(g.world.completedShifts, 2);
  }
  assert.equal(first, 0, 'the onboarding shift draws no ngoily');
  assert.ok(second > 0, 'shift 2 (one completed shift, no onboarding) draws them again');
  for (const type of ['thuong', 'voi', 'chipheo']) assert.ok(others.has(type), `${type} still arrives in shift 1 (seen: ${[...others].join(', ')})`);
});

test('leaving a type out of the onboarding shift is the draw with that type at weight 0: the same randomness, the others renormalised, shift 1 identical', () => {
  for (const rngSeed of [1, 2, 3]) {
    const out = new Game(loadConfig(lively()), rngSeed, T0);
    const zero = new Game(loadConfig(lively(raw => { raw.customerTypes.ngoily.weight = 0; raw.onboarding.firstShift.excludedCustomerTypes = []; })), rngSeed, T0);
    play(out, 1); play(zero, 1);
    assert.equal(sha(out.world), sha(zero.world), `seed ${rngSeed}: the same shift 1, event for event`);
  }
});

test('a pin without the key (JSON 2.1.2) still seats Bàn lai rai in shift 1, as before, and its history replays byte for byte', () => {
  let lingering = 0;
  for (const rngSeed of [1, 2, 3, 4]) {
    const old = loadConfig(lively(before213)); assert.deepEqual(firstShiftExcludedTypes(old.values), []);
    const g = new Game(old, rngSeed, T0), [one] = play(g, 1);
    lingering += count(one, 'ngoily');
    const again = decodeSave(encodeSave(g));
    assert.equal(sha(again.world), sha(g.world), `seed ${rngSeed}: the 2.1.2 history replays to the same world`); assert.equal(encodeSave(again), encodeSave(g));
  }
  assert.ok(lingering > 0, 'the onboarding shift of a 2.1.2 pin draws ngoily');
});

test('the history the S6 engine recorded on JSON 2.1.0 served Bàn lai rai in its onboarding shift and still replays to the world it recorded', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.1.0-v28.json', import.meta.url), 'utf8')) as { worldSha256: string; save: string };
  const g = decodeSave(fixture.save), events = g.world.events;
  assert.deepEqual(firstShiftExcludedTypes(g.config.values), [], 'the 2.1.0 pin has no such key');
  const opened = events.findIndex(e => e.type === 'shift_opened'), closed = events.findIndex(e => e.type === 'shift_closed');
  assert.ok(opened >= 0 && closed > opened);
  assert.ok(events.slice(opened, closed).some(e => e.type === 'customer_served' && e.data.type === 'ngoily'), 'its shift 1 served a ngoily');
  assert.equal(sha(g.world), fixture.worldSha256, 'and the new engine replays it to the recorded world');
});

test('with onboarding off there is no onboarding shift, so shift 1 leaves nobody out (like firstShift.rushDisabled)', () => {
  const [one] = play(new Game(loadConfig(lively(raw => { raw.onboarding.enabled = false; })), 1, T0), 1);
  assert.ok(count(one, 'ngoily') > 0);
});

test('the two keys of 2.1.3 load on older labels without them byte for byte, 2.1.3 needs both, and the list and the threshold are validated', () => {
  const old = lively(before213); assert.equal(JSON.stringify(loadConfig(old).raw), JSON.stringify(old), 'a 2.1.2 content without them: raw bytes kept');
  const half = lively(before213); half.onboarding.featureReveal.kickAfterShifts = 1;
  assert.throws(() => loadConfig(half), /config:onboarding\.firstShift:keys/, 'never one of the two');
  const bare = lively(before213); bare._meta.version = '2.1.3';
  assert.throws(() => loadConfig(bare), /config:onboarding\.firstShift:keys/, 'the label 2.1.3 needs them');
  const list = (excluded: unknown, patch?: (raw: Seed) => void) => lively(raw => { (raw.onboarding.firstShift as Record<string, unknown>).excludedCustomerTypes = excluded; patch?.(raw); });
  assert.deepEqual(firstShiftExcludedTypes(loadConfig(list([])).values), [], 'an empty list leaves nobody out');
  assert.deepEqual(firstShiftExcludedTypes(loadConfig(list(['ngoily', 'chipheo'])).values), ['ngoily', 'chipheo'], 'a list of any length');
  for (const [why, excluded, patch] of [
    ['a type without a table', ['shipper']], ['an unknown type', ['nobody']], ['an inherited name', ['constructor']], ['a type named twice', ['ngoily', 'ngoily']],
    ['the forced first guest', ['thuong']], ['nobody but the capped VIP left', ['thuong', 'voi', 'chipheo', 'ngoily'], (raw: Seed) => { raw.onboarding.firstShift.firstGroupType = 'vip'; }],
    ['a weather where nobody is left', ['thuong', 'voi', 'ngoily'], (raw: Seed) => { raw.onboarding.firstShift.firstGroupType = 'chipheo'; raw.weather.humid.customerWeightMult.chipheo = 0; }],
  ] as [string, string[], ((raw: Seed) => void)?][]) assert.throws(() => loadConfig(list(excluded, patch)), /config:onboarding\.firstShift\.excludedCustomerTypes$/, why);
  assert.doesNotThrow(() => loadConfig(list(['thuong', 'voi', 'ngoily'], raw => { raw.onboarding.firstShift.firstGroupType = 'chipheo'; })), 'the same list in the bundled weather is fine');
  assert.doesNotThrow(() => loadConfig(list(['ngoily'], raw => { for (const t of ['thuong', 'voi', 'vip', 'chipheo'] as const) raw.customerTypes[t].weight = 0; raw.onboarding.enabled = false; })),
    'with onboarding off there is no onboarding shift to fill: a shop of lai rai guests only (the kick tests) loads');
  for (const bad of ['ngoily', [1], null]) assert.throws(() => loadConfig(list(bad)), /config:onboarding\.firstShift\.excludedCustomerTypes:array/, `${JSON.stringify(bad)}`);
  for (const bad of [-1, 1.5, '1', null, 2 ** 60]) {
    const raw = lively(); (raw.onboarding.featureReveal as Record<string, unknown>).kickAfterShifts = bad;
    assert.throws(() => loadConfig(raw), /config:/, `kickAfterShifts=${bad}`);
  }
});
