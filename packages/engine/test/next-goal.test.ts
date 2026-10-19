import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, isSeatModel, tableUpgradeQuote, PAIR, type Command } from '../src';
import { LANES, listGoals, pickNextGoal, reachMult, shiftAverage } from '../../../apps/web/src/goals';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import { capacityConfig } from './fixtures/capacity-model';

// The goal chip (PLAN §4 fun-next-goal) on real engine worlds: lane priority, price, reach, gates, and what an old pin without `nextGoal` does.
// Wave 1 wrote it on the 3-table capacity model: those tests run unchanged on a pinned capacity snapshot (an old save plays on it until its
// next opening adopts the seat model); the bundled seed (seat model, rules 28) has its own tests, one per difference.
const at = Date.parse('2026-09-16T03:00:00Z');
const game = () => new Game(undefined, 42, at); // the bundled seed: seat model
const capacityGame = () => new Game(capacityConfig, 42, at); // pinned before the seat model
const levelsOf = (g: Game) => (g.config.values as typeof capacityModel).upgrades.table.levels; // a capacity snapshot's table levels carry seats
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `goal-${g.log.length}` });
const pick = (g: Game) => pickNextGoal(g.world, g.config);
const closed = (g: Game, shifts: number, earned: number) => { const w = g.world; w.phase = 'resting'; w.shift = null; w.completedShifts = shifts; w.lifetimeEarned = earned; };

test('a new save points at the first table upgrade: capacity lane, cheapest, nothing filtered before a shift has closed (capacity snapshot)', () => {
  const g = capacityGame(), goal = pick(g)!;
  assert.deepEqual(LANES, ['capacity', 'speed', 'guests']);
  assert.equal(goal.id, `table:${g.world.tables[0].id}`); assert.equal(goal.lane, 'capacity');
  assert.equal(goal.cost, levelsOf(g)[1].priceBase); assert.deepEqual(goal.effect, { key: 'goal.fx.seats', params: { n: levelsOf(g)[1].capacity } });
  assert.equal(shiftAverage(g.world), null);
});

test('an empty table beats a busy one at the same price, and the chip moves on after every purchase (capacity snapshot)', () => {
  const g = capacityGame(), w = g.world; w.coins = 10_000_000;
  w.tables[0].state = 'seating';
  assert.equal(pick(g)!.id, `table:${w.tables[1].id}`, 'table 1 is in use, table 2 costs the same');
  w.tables[0].state = 'empty';
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) { const goal = pick(g)!; seen.push(goal.id); assert.ok(send(g, { type: 'upgradeTable', tableId: w.tables.find(t => `table:${t.id}` === goal.id)!.id }).ok); }
  assert.deepEqual(seen, w.tables.map(t => `table:${t.id}`), 'each table once, in order');
  const goals = listGoals(w, g.config), lv3 = levelsOf(g)[2].priceBase;
  assert.ok(goals.find(x => x.id === 'buyTable')!.cost! > lv3, 'seat prices climb with the seats you already own, so a new table is now dearer than a Lv3 table');
  assert.equal(pick(g)!.id, `table:${w.tables[0].id}`); assert.equal(pick(g)!.cost, lv3);
});

test('lane priority beats price: a cheaper speed item waits while a capacity item is eligible (capacity snapshot)', () => {
  const g = capacityGame(), w = g.world; w.coins = 10_000_000; w.tables.forEach(t => { t.level = 2; t.capacity = 4; });
  const goals = listGoals(w, g.config), cheapestSpeed = Math.min(...goals.filter(x => x.lane === 'speed' && x.eligible).map(x => x.cost!));
  const goal = pick(g)!; assert.equal(goal.lane, 'capacity'); assert.ok(cheapestSpeed < goal.cost!, `${cheapestSpeed} < ${goal.cost}`);
});

test('the reach filter moves the chip to the next lane, and falls back to the cheapest item when nothing is within reach (capacity snapshot)', () => {
  const g = capacityGame(), w = g.world, mult = reachMult(g.config); assert.equal(mult, 3);
  w.coins = 10_000_000; w.tables.forEach(t => { t.level = 2; t.capacity = 4; });
  const stall = g.config.values.upgrades.stall.priceBase[1];
  closed(g, 1, 2_500); // 7 500 within reach: a Lv2 stall (3 750) and cooler (7 500) qualify, a new table (10 000) and Lv3 tables do not
  assert.equal(shiftAverage(w), 2_500); const near = pick(g)!;
  assert.equal(near.lane, 'speed'); assert.equal(near.cost, stall);
  closed(g, 1, 100); // nothing is within 300: the cheapest eligible item stands in, so the chip never disappears
  const far = pick(g)!; assert.ok(far.cost! > 300); assert.equal(far.lane, 'capacity');
  closed(g, 0, 0); assert.equal(shiftAverage(w), null, 'no closed shift, no filter');
});

test('the average leaves the open shift out: takings so far must not move the chip mid-shift', () => {
  const g = game(), w = g.world; assert.ok(send(g, { type: 'startShift' }).ok);
  w.completedShifts = 2; w.lifetimeEarned = 10_000; w.shift!.stats.credited = 4_000;
  assert.equal(shiftAverage(w), 3_000); w.shift!.stats.credited = 0; assert.equal(shiftAverage(w), 5_000);
  w.phase = 'resting'; w.shift!.stats.credited = 4_000; assert.equal(shiftAverage(w), 5_000, 'closed: everything counts');
});

for (const [label, make] of [['seat model', game], ['capacity snapshot', capacityGame]] as const) test(`a goal behind a life-path, badge, reputation or stall gate is never suggested (${label})`, () => {
  const g = make(), w = g.world; w.coins = 10_000_000;
  w.equipment.keg = 3; // Lv4 needs life path 2
  const keg = () => listGoals(w, g.config).find(x => x.id === 'equipment:keg')!;
  assert.equal(keg().eligible, false); w.lifePath = 2; assert.equal(keg().eligible, true);
  const top = w.tables.length - 1; w.lifePath = 0; w.tables[top].level = g.config.values.upgrades.table.levels.length - 1; // the next table level wants a badge and reputation
  const table = () => listGoals(w, g.config).find(x => x.id === `table:${w.tables[top].id}`)!;
  const v = g.config.values;
  if (isSeatModel(v)) {
    // Under the seat model a level carries no seat and no benefit (S4), so the goal is never eligible, whatever its gates say: the gate chain itself
    // is the quote's and the sheet's dimmed button reads it (two chairs, then the badge, then the reputation, then nothing). The chip's rule is untouched.
    const quote = () => tableUpgradeQuote(w, g.config, w.tables[top]), next = v.upgrades.table.levels[w.tables[top].level];
    const before = { chairs: w.tables[top].capacity, reputation: w.reputation, badges: [...w.badges] };
    assert.equal(quote().gate, 'tableNeedsChairs'); assert.equal(table().eligible, false);
    w.tables[top].capacity = PAIR; assert.equal(quote().gate, 'badgeRequired'); assert.equal(table().eligible, false);
    w.badges.push(next.requiredBadge!); assert.equal(quote().gate, 'reputationRequired'); assert.equal(table().eligible, false);
    w.reputation = next.repBase![0]; assert.equal(quote().gate, null); assert.equal(table().eligible, false, 'with every gate open a level still promises nothing');
    w.tables[top].capacity = before.chairs; w.reputation = before.reputation; w.badges.splice(0, w.badges.length, ...before.badges); // the other gates below start from the same shop
  } else { assert.equal(table().eligible, false); assert.notEqual(pick(g)!.id, table().id); }
  const sign = () => listGoals(w, g.config).find(x => x.id === 'signboard')!;
  w.equipment.stall = 1; assert.equal(sign().eligible, false, 'the signboard waits for a level-3 stall'); w.equipment.stall = g.config.values.signboard.gate.stallLevel; assert.equal(sign().eligible, true);
  const phone = () => listGoals(w, g.config).find(x => x.id === 'unlock:phone')!, qr = () => listGoals(w, g.config).find(x => x.id === 'unlock:qr')!;
  assert.equal(phone().eligible, false); w.lifePath = 1; assert.equal(phone().eligible, true); assert.equal(qr().eligible, false, 'QR needs the phone and life path 2');
  const flyer = listGoals(w, g.config).find(x => x.id === 'flyer')!; assert.equal(flyer.currency, 'rep'); // paid in reputation: never the coin chip
});

test('an old pin without nextGoal keeps its bytes and the chip reads the seed; bad values never load', () => {
  const raw = structuredClone(config.raw) as any; assert.equal(raw.nextGoal.reachMult, 3);
  const old = structuredClone(raw); old._meta.version = 'old-no-next-goal'; delete old.nextGoal;
  const pinned = loadConfig(old); assert.equal(JSON.stringify(pinned.raw), JSON.stringify(old)); assert.equal(reachMult(pinned), 3);
  const g = new Game(pinned, 42, Date.parse('2026-09-16T03:00:00Z')); assert.ok(pickNextGoal(g.world, g.config));
  for (const bad of [0, -1, '3', null, Infinity]) { const broken = structuredClone(raw); broken.nextGoal.reachMult = bad; assert.throws(() => loadConfig(broken), /config:/, String(bad)); }
  const extra = structuredClone(raw); extra.nextGoal.other = 1; assert.throws(() => loadConfig(extra), /config:nextGoal:keys/);
  const tuned = structuredClone(raw); tuned._meta.version = 'tuned'; tuned.nextGoal.reachMult = 2.5; assert.equal(reachMult(loadConfig(tuned)), 2.5);
});

test('a snapshot pinned before nextGoal joined tier C keeps exactly its shorter tier list; any other list is refused', () => {
  const raw = structuredClone(config.raw) as any, tiers = raw._meta.governance.tiers, sections = tiers.C.sections as string[];
  assert.ok(sections.includes('nextGoal'));
  const old = structuredClone(raw); old._meta.version = 'old-tier-list'; old._meta.governance.tiers.C.sections = sections.filter(name => name !== 'nextGoal'); delete old.nextGoal;
  assert.equal(JSON.stringify(loadConfig(old).raw), JSON.stringify(old));
  // The tier lists say who may edit what (the server registry reads them): only that exact legacy list loads, never a loosened one.
  const refused = (tier: 'A' | 'B' | 'C', list: unknown, why: string) => {
    const broken = structuredClone(raw); broken._meta.governance.tiers[tier].sections = list;
    assert.throws(() => loadConfig(broken), new RegExp(`config:_meta.governance.tiers.${tier}.sections:array`), why);
  };
  refused('C', ['onboarding', 1], 'not strings'); refused('C', 'onboarding', 'not an array'); refused('C', null, 'null');
  refused('C', [], 'empty C'); refused('A', [], 'empty A');
  refused('C', [...sections, sections[0]], 'duplicate'); refused('C', [...sections, 'bogus'], 'unknown name');
  refused('C', sections.filter(name => name !== 'onboarding'), 'a section that did not join later may not be missing');
  refused('C', sections.filter(name => name !== 'nextGoal' && name !== 'audio'), 'the legacy exception covers nextGoal only');
  refused('B', [...tiers.B.sections, 'nextGoal'], 'a section moved into another tier');
  refused('A', tiers.A.sections.slice(1), 'a missing tier A section');
});

test('a new seat-model save points at table 2: capacity lane, the first rung of the table ladder, nothing filtered before a shift has closed', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v));
  const goal = pick(g)!;
  assert.equal(goal.id, 'buyTable'); assert.equal(goal.lane, 'capacity'); assert.equal(goal.eligible, true);
  assert.equal(goal.cost, v.upgrades.table.tablePriceBase[0]); assert.deepEqual(goal.effect, { key: 'goal.fx.seatsAdded', params: { n: 1 } }, 'a new table comes with one chair');
  assert.equal(shiftAverage(w), null);
  const table = listGoals(w, g.config).find(x => x.id === `table:${w.tables[0].id}`)!;
  assert.equal(table.eligible, false, 'a one-chair table cannot level up (needs two chairs)'); assert.equal(table.effect, null, 'and a level promises no seat number under the seat model');
});

test('the chip walks the table ladder and moves on to the speed lane once the alley is full: levels and chairs are not its goals yet', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v)); w.coins = 10_000_000;
  const slots = v.locations.list.find(row => row.id === w.location)!.tableSlots, prices: (number | null)[] = [];
  while (w.tables.length < slots) { const goal = pick(g)!; assert.equal(goal.id, 'buyTable'); prices.push(goal.cost); assert.ok(send(g, { type: 'buyTable' }).ok); }
  assert.deepEqual(prices, v.upgrades.table.tablePriceBase.slice(0, slots - 1), 'each rung of the ladder once, in order');
  const next = pick(g)!; assert.equal(next.lane, 'speed', 'nothing left to build in the capacity lane'); assert.equal(listGoals(w, g.config).find(x => x.id === 'buyTable')!.eligible, false);
  // Two chairs make a table able to level up, but a level carries no benefit yet, so the chip still points elsewhere.
  for (const table of w.tables) assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok);
  const level = listGoals(w, g.config).find(x => x.id === `table:${w.tables[0].id}`)!;
  assert.equal(level.cost !== null && level.eligible, false); assert.equal(pick(g)!.lane, 'speed');
});

test('a game on a pre-seat snapshot with the Wave 1 keys still gets a chip, and its first goal is the table upgrade it can afford', () => {
  const raw = structuredClone(capacityConfig.raw) as any; raw._meta.version = '2.0.6';
  raw.nextGoal = structuredClone((config.raw as any).nextGoal); raw._meta.governance.tiers.C.sections.splice(1, 0, 'nextGoal');
  const g = new Game(loadConfig(raw), 42, at), goal = pick(g)!;
  assert.equal(goal.id, `table:${g.world.tables[0].id}`); assert.equal(reachMult(g.config), (config.raw as any).nextGoal.reachMult);
});
