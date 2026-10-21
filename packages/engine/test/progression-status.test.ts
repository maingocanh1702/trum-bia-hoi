import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, lifePathStatus, requirementStatus, parseProgressRequirement, EQUIPMENT, type Config, type SeedConfig, type WorldView, type RequirementStatus } from '../src';

/**
 * Review round 1 of plan S5: the career simulation spent 40 % of its time in `lifePathStatus`, which copied the whole world once per requirement token only to change `lifePath`,
 * and in re-parsing the same tokens. Both are now cheaper (the level is a parameter, the parse is cached per economy) and must not change a single answer: this file keeps the
 * ORIGINAL implementation verbatim and compares the production functions with it on thousands of random worlds in two economies (the bundled one, whose life-path rows never ask for a
 * level, and a chained one in which every row also asks for the level below it, so the walked level matters), and checks that the parse cache never leaks between economies.
 */
function referenceRequirement(w: WorldView, c: Config, token: string): RequirementStatus {
  const r = parseProgressRequirement(token, c.values);
  if (r.kind === 'owned') return { kind: r.kind, target: r.target, met: r.target === 'dog' ? w.dogLevel > 0 : w.unlocks.includes(r.target) };
  if (r.kind === 'peak') return { kind: r.kind, target: r.target, met: c.values.league.tiers.findIndex(t => t.id === w.peakLeague) >= c.values.league.tiers.findIndex(t => t.id === r.target) };
  const have = r.kind === 'level' ? w.lifePath : r.kind === 'seats' ? w.tables.reduce((sum, table) => sum + table.capacity, 0) : r.kind === 'tables' ? w.tables.length : r.kind === 'stall' ? w.equipment.stall : Math.min(...EQUIPMENT.filter(kind => kind !== 'kitchen').map(kind => w.equipment[kind]));
  return { kind: r.kind, have, need: r.need, met: r.exact ? have === r.need : have >= r.need };
}
function referenceStatus(w: WorldView, c: Config) {
  let level = w.lifePath;
  const rows = c.values.lifePath.map((definition, index) => {
    const requirements: RequirementStatus[] = [
      { kind: 'lifetime', have: w.lifetimeEarned, need: definition.lifetimeBase, met: w.lifetimeEarned >= definition.lifetimeBase },
      ...(definition.requires ?? []).map(token => referenceRequirement({ ...w, lifePath: level }, c, token)),
    ];
    if (index === level + 1 && requirements.every(r => r.met)) level = index;
    const reached = index <= level, claimed = index === 0 || w.claimedLifePaths.includes(index);
    return { ...definition, index, requirements, reached, claimed, claimable: reached && !claimed };
  });
  return { level, rows };
}

/** The bundled economy plus an economy whose rows 2..7 also require the level below them ("LP1" ... "LP6"). */
function economies(): { name: string; config: Config }[] {
  const raw = structuredClone(config.raw);
  raw.lifePath.forEach((row, i) => { if (i >= 2) row.requires = [...(row.requires ?? []), `LP${i - 1}`]; });
  return [{ name: 'bundled', config }, { name: 'chained', config: loadConfig(raw) as SeedConfig }];
}

/** mulberry32: the same worlds on every run. */
function random(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function randomWorld(c: Config, rnd: () => number): WorldView {
  const base = new Game(c as SeedConfig, 42, 0).world, int = (n: number) => Math.floor(rnd() * n), pick = <T>(xs: readonly T[]) => xs[int(xs.length)];
  const thresholds = c.values.lifePath.map(r => r.lifetimeBase);
  const tables = Array.from({ length: 1 + int(8) }, (_, i) => ({ ...structuredClone(base.tables[0]), id: `table-${i}`, capacity: pick([1, 2]) }));
  const equipment = { ...base.equipment }; for (const kind of EQUIPMENT) equipment[kind] = 1 + int(kind === 'kitchen' ? 4 : 5);
  return { ...base, lifePath: int(c.values.lifePath.length), tables,
    lifetimeEarned: pick([0, ...thresholds, ...thresholds.map(t => Math.max(0, t - 1)), int(thresholds.at(-1)! * 2)]),
    equipment, dogLevel: int(2), unlocks: (['phone', 'qr', 'flyer', 'signboard', 'dog'] as const).filter(() => rnd() < 0.5),
    peakLeague: pick([null, ...c.values.league.tiers.map(t => t.id)]), claimedLifePaths: [1, 2, 3, 4, 5, 6, 7].filter(() => rnd() < 0.3) } as WorldView;
}

test('lifePathStatus answers exactly what the world-copying original answered, on 4000 random worlds in each economy', () => {
  for (const { name, config: c } of economies()) {
    const rnd = random(20261021);
    let climbed = 0;
    for (let i = 0; i < 4000; i++) {
      const w = randomWorld(c, rnd), expected = referenceStatus(w, c);
      assert.deepEqual(lifePathStatus(w, c), expected, `${name} world ${i}`);
      if (expected.level > w.lifePath) climbed++;
    }
    assert.ok(climbed > 100, `${name}: the random worlds include ladders that climb (${climbed})`);
  }
});

test('a level handed to requirementStatus reads exactly as a world copy carrying that level, for every token the economy knows', () => {
  for (const { name, config: c } of economies()) {
    const rnd = random(7), tokens = new Set<string>(c.values.lifePath.map(row => row.id).slice(1));
    for (const row of c.values.lifePath) for (const token of row.requires ?? []) tokens.add(token);
    for (const item of ['phone', 'qr', 'flyer'] as const) for (const token of [c.values.unlocks[item].gate].flat()) tokens.add(token);
    assert.ok(tokens.size >= 14, `${name}: the economy names a dozen or more requirement tokens (${tokens.size})`);
    for (let i = 0; i < 400; i++) {
      const w = randomWorld(c, rnd), level = Math.floor(rnd() * c.values.lifePath.length);
      for (const token of tokens) {
        assert.deepEqual(requirementStatus(w, c, token, level), referenceRequirement({ ...w, lifePath: level }, c, token), `${name} ${token} at level ${level}`);
        assert.deepEqual(requirementStatus(w, c, token), referenceRequirement(w, c, token), `${name} ${token} at the world's own level`);
      }
    }
  }
});

test('the parse cache is per economy: a token means what THIS economy says, and an unknown token still throws every time', () => {
  const w = new Game(config as SeedConfig, 42, 0).world;
  assert.equal(requirementStatus(w, config, 'peak:huyen_thoai').target, 'huyen_thoai'); // parsed and cached for the bundled economy
  // An economy whose top league tier is called tier_x (and whose LP7 asks for it): "peak:huyen_thoai" does not exist there, however often the bundled economy has parsed it.
  const raw = structuredClone(config.raw); raw.league.tiers[7].id = 'tier_x';
  raw.lifePath[7].requires = raw.lifePath[7].requires!.map(token => token === 'peak:huyen_thoai' ? 'peak:tier_x' : token);
  const renamed = loadConfig(raw) as SeedConfig;
  for (let i = 0; i < 3; i++) assert.throws(() => requirementStatus(w, renamed, 'peak:huyen_thoai'), /config:progressRequirement:peak:huyen_thoai/);
  assert.equal(requirementStatus(w, renamed, 'peak:tier_x').target, 'tier_x');
  assert.throws(() => requirementStatus(w, config, 'peak:tier_x'), /config:progressRequirement:peak:tier_x/);
  assert.equal(requirementStatus(w, config, 'peak:huyen_thoai').target, 'huyen_thoai', 'and the bundled economy still reads its own tier afterwards');
  for (let i = 0; i < 3; i++) assert.throws(() => requirementStatus(w, config, 'no such token'), /config:progressRequirement:no such token/);
});
