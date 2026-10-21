import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, isSeatModel, tableUpgrade, tableUpgradeQuote, buyTableQuote, buyChairQuote, chairUpgrade, chairUpgradeQuote, PAIR, type Command } from '../src';
import { LANES, listGoals, pickNextGoal, reachMult, shiftAverage } from '../../../apps/web/src/goals';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import { capacityConfig } from './fixtures/capacity-model';
import { seat2022Config } from './fixtures/seat-pin';

// The goal chip (PLAN §4 fun-next-goal) on real engine worlds: lane priority, price, reach, gates, and what an old pin without `nextGoal` does.
// Wave 1 wrote it on the 3-table capacity model: those tests run unchanged on a pinned capacity snapshot (an old save plays on it until its
// next opening adopts the seat model); the bundled seed (seat model, rules 28) has its own tests, one per difference.
const at = Date.parse('2026-09-16T03:00:00Z');
const game = () => new Game(undefined, 42, at); // the bundled seed: seat model
const capacityGame = () => new Game(capacityConfig, 42, at); // pinned before the seat model
const pinGame = () => new Game(seat2022Config(), 42, at); // a seat snapshot from before the S4 ladders (JSON 2.0.22): a level promises nothing
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

for (const [label, make] of [['seat model', game], ['seat model, a pin from before the S4 ladders', pinGame], ['capacity snapshot', capacityGame]] as const) test(`a goal behind a life-path, badge, reputation or stall gate is never suggested (${label})`, () => {
  const g = make(), w = g.world; w.coins = 10_000_000;
  w.equipment.keg = 3; // Lv4 needs life path 2
  const keg = () => listGoals(w, g.config).find(x => x.id === 'equipment:keg')!;
  assert.equal(keg().eligible, false); w.lifePath = 2; assert.equal(keg().eligible, true);
  const top = w.tables.length - 1; w.lifePath = 0; w.tables[top].level = g.config.values.upgrades.table.levels.length - 1; // the next table level wants a badge and reputation
  const table = () => listGoals(w, g.config).find(x => x.id === `table:${w.tables[top].id}`)!;
  const v = g.config.values;
  if (isSeatModel(v) && tableUpgrade(v)) {
    // With the S4 ladder a level promises its benefit (Lv4: the tip), so the goal is eligible exactly when every gate is open: two chairs, then Duong Len Trum.
    const quote = () => tableUpgradeQuote(w, g.config, w.tables[top]), rung = tableUpgrade(v)!.levels.at(-1)!;
    const before = { chairs: w.tables[top].capacity, lifePath: w.lifePath };
    assert.equal(quote().gate, 'tableNeedsChairs'); assert.equal(table().eligible, false);
    w.tables[top].capacity = PAIR; assert.equal(quote().gate, 'lifePathRequired'); assert.equal(quote().requiredLifePath, rung.lifePathGate); assert.equal(table().eligible, false);
    w.lifePath = rung.lifePathGate; assert.equal(quote().gate, null); assert.equal(table().eligible, true, 'with every gate open a level is a goal'); assert.deepEqual(table().effect, { key: 'goal.fx.tip', params: { n: rung.tipMult } });
    w.tables[top].capacity = before.chairs; w.lifePath = before.lifePath; // the other gates below start from the same shop
  } else if (isSeatModel(v)) {
    // A pin from before S4: a level carries no seat and no benefit, so the goal is never eligible, whatever its gates say: the gate chain itself
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
  assert.equal(table.eligible, false, 'a one-chair table cannot level up (needs two chairs)');
  assert.deepEqual(table.effect, { key: 'goal.fx.rounds', params: { n: 1 } }, 'and a level promises its benefit (S4: Lv2 one more round), never a seat number');
});

test('the chip walks the table ladder, then the second chairs once the alley is full (S6), and moves on to the speed lane: the levels wait for Duong Len Trum', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v)); w.coins = 10_000_000;
  const slots = v.locations.list.find(row => row.id === w.location)!.tableSlots, table = v.upgrades.table, prices: (number | null)[] = [];
  // D18: tables 2..8 first. A second chair is cheaper than every late table but locked until chairsAfterTables tables stand; from the fourth table on
  // the chip would take the cheaper chair, so the ladder is walked past that point by hand and the chip is read before each purchase it agrees with.
  while (w.tables.length < slots) {
    const goal = pick(g)!;
    if (w.tables.length < table.chairsAfterTables) assert.equal(goal.id, 'buyTable', `table ${w.tables.length + 1}: chairs are still locked`);
    else assert.equal(goal.id, `chair:${w.tables[0].id}`, 'from the fourth table on the cheapest capacity item is the first second chair');
    prices.push(buyTableQuote(w, g.config).cost); assert.ok(send(g, { type: 'buyTable' }).ok);
  }
  assert.deepEqual(prices, table.tablePriceBase.slice(0, slots - 1), 'each rung of the ladder once, in order');
  assert.equal(listGoals(w, g.config).find(x => x.id === 'buyTable')!.eligible, false, 'the alley is full');
  // S6: the second chairs are the chip's goals now, one per one-chair table, cheapest first (the price follows the chairs owned shop-wide), +1 seat each.
  const chairPrices: (number | null)[] = [];
  for (const [i, t] of w.tables.entries()) {
    const goal = pick(g)!;
    assert.deepEqual([goal.id, goal.lane, goal.card, goal.effect, goal.cost], [`chair:${t.id}`, 'capacity', { kind: 'buyChair', tableId: t.id }, { key: 'goal.fx.seatsAdded', params: { n: 1 } }, buyChairQuote(w, g.config, t).cost], `chair ${i + 1}`);
    chairPrices.push(goal.cost); assert.ok(send(g, { type: 'buyChair', tableId: t.id }).ok);
    const bought = listGoals(w, g.config).find(x => x.id === `chair:${t.id}`)!;
    assert.deepEqual([bought.cost, bought.effect, bought.eligible], [null, null, false], 'a pair is the most a table holds: nothing left to list');
  }
  assert.deepEqual(chairPrices, table.chairPriceBase.slice(0, slots), 'each chair rung once, in order');
  // Two chairs make a table able to level up and the chair ladder opens too, but both first levels sit behind Duong Len Trum LP1 (S4), so the chip points at a device.
  const level = listGoals(w, g.config).find(x => x.id === `table:${w.tables[0].id}`)!, chairLevel = listGoals(w, g.config).find(x => x.id === `chairLevel:${w.tables[0].id}`)!;
  assert.equal(level.cost !== null && level.eligible, false); assert.equal(chairLevel.cost !== null && chairLevel.eligible, false);
  assert.deepEqual([chairLevel.card, chairLevel.effect], [{ kind: 'chairUpgrade', tableId: w.tables[0].id }, { key: 'goal.fx.patience', params: { n: chairUpgrade(v)!.levels[0].patienceMult } }]);
  assert.equal(pick(g)!.lane, 'speed');
});

test('S6: the four seat-model items of the capacity lane say what their commands say, one price and one gate each (buy table, buy chair, upgrade table, upgrade chair)', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v)); w.coins = 100_000_000;
  const ladder = chairUpgrade(v)!, slots = v.locations.list.find(row => row.id === w.location)!.tableSlots;
  while (w.tables.length < slots) assert.ok(send(g, { type: 'buyTable' }).ok);
  for (const t of w.tables.slice(0, 2)) assert.ok(send(g, { type: 'buyChair', tableId: t.id }).ok);
  w.lifePath = ladder.levels[0].lifePathGate;
  const goals = listGoals(w, g.config), byId = (id: string) => goals.find(x => x.id === id)!;
  for (const t of w.tables) {
    const chair = byId(`chair:${t.id}`), q = buyChairQuote(w, g.config, t);
    if (t.capacity >= PAIR) assert.deepEqual([chair.cost, chair.eligible], [null, false]); else assert.deepEqual([chair.cost, chair.eligible], [q.cost, q.ok]);
    const level = byId(`chairLevel:${t.id}`), cq = chairUpgradeQuote(w, g.config, t);
    assert.deepEqual([level.cost, level.eligible, level.effect], [cq.cost, cq.gate === null && cq.cost !== null, { key: 'goal.fx.patience', params: { n: cq.next!.patienceMult } }]);
    const table = byId(`table:${t.id}`), tq = tableUpgradeQuote(w, g.config, t);
    assert.deepEqual([table.cost, table.eligible], [tq.cost, tq.gate === null && tq.cost !== null]); // a one-chair table's level is gated (tableNeedsChairs)
  }
  assert.ok(goals.filter(x => x.lane === 'capacity').every(x => ['table', 'buyTable', 'buyChair', 'chairUpgrade'].includes(x.card.kind)));
  // The cheapest eligible capacity item wins: the third table's second chair (1 000 xu class) before any level; once every chair stands, the cheapest level.
  assert.equal(pick(g)!.id, `chair:${w.tables[2].id}`);
  for (const t of w.tables.slice(2)) assert.ok(send(g, { type: 'buyChair', tableId: t.id }).ok);
  const first = pick(g)!, cheapest = Math.min(tableUpgradeQuote(w, g.config, w.tables[0]).cost!, chairUpgradeQuote(w, g.config, w.tables[0]).cost!);
  assert.equal(first.cost, cheapest); assert.equal(first.lane, 'capacity');
  // A chair level bought through the command moves its goal one rung up and the shop-wide price of the next one with it, as the quote says.
  assert.ok(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }).ok);
  const next = listGoals(w, g.config), lv2 = next.find(x => x.id === `chairLevel:${w.tables[0].id}`)!, other = next.find(x => x.id === `chairLevel:${w.tables[1].id}`)!;
  assert.deepEqual([lv2.cost, lv2.effect, lv2.eligible], [chairUpgradeQuote(w, g.config, w.tables[0]).cost, { key: 'goal.fx.patience', params: { n: ladder.levels[1].patienceMult } }, false], 'Lv3 of the chairs waits for LP2');
  assert.equal(other.cost, ladder.priceBase + ladder.stepBase, 'the next chair level of another table pays one step more');
});

test('S6: no chair goal on a capacity snapshot, and no chair-level goal on a seat pin from before the chair ladder', () => {
  const capacity = capacityGame(); assert.ok(!listGoals(capacity.world, capacity.config).some(x => x.card.kind === 'buyChair' || x.card.kind === 'chairUpgrade'));
  const pin = pinGame(), w = pin.world, pv = pin.config.values; assert.ok(isSeatModel(pv)); w.coins = 10_000_000;
  while (w.tables.length < pv.upgrades.table.chairsAfterTables) assert.ok(send(pin, { type: 'buyTable' }).ok);
  const goals = listGoals(w, pin.config);
  assert.ok(!goals.some(x => x.card.kind === 'chairUpgrade'), 'JSON 2.0.22 has no chair ladder');
  const chair = goals.find(x => x.id === `chair:${w.tables[0].id}`)!;
  assert.deepEqual([chair.cost, chair.eligible, chair.effect], [buyChairQuote(w, pin.config, w.tables[0]).cost, true, { key: 'goal.fx.seatsAdded', params: { n: 1 } }], 'the second chair is S1: the pin sells it');
});

test('S4: with two chairs and its life-path gate open a table level is a chip goal: capacity lane, cheapest first, the price follows the ladder, the effect is its benefit', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v)); w.coins = 100_000_000;
  const ladder = tableUpgrade(v)!.levels; assert.ok(ladder);
  const slots = v.locations.list.find(row => row.id === w.location)!.tableSlots; // a full alley: while a table can still be bought the capacity lane wins
  while (w.tables.length < slots) assert.ok(send(g, { type: 'buyTable' }).ok);
  for (const table of w.tables) assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok);
  assert.equal(pick(g)!.lane, 'speed', 'Lv2 waits for life path 1: the chip points at a device');
  w.lifePath = ladder[0].lifePathGate;
  const first = pick(g)!;
  assert.deepEqual([first.id, first.lane, first.cost, first.effect], [`table:${w.tables[0].id}`, 'capacity', ladder[0].priceBase, { key: 'goal.fx.rounds', params: { n: 1 } }]);
  assert.ok(send(g, { type: 'upgradeTable', tableId: w.tables[0].id }).ok);
  const second = pick(g)!; // Lv3 of table 1 waits for LP2; Lv2 of table 2 now costs one step more
  assert.deepEqual([second.id, second.cost], [`table:${w.tables[1].id}`, ladder[0].priceBase + ladder[0].stepBase]);
  for (let i = 1; i < w.tables.length; i++) assert.ok(send(g, { type: 'upgradeTable', tableId: w.tables[i].id }).ok);
  // S6: every table is Lv2 and Lv3 waits for LP2, but the chair ladder (S4, LP1 for its first level) is open: its first rung is the cheapest capacity item left.
  const chairs = chairUpgrade(v)!, comfort = pick(g)!;
  assert.deepEqual([comfort.id, comfort.lane, comfort.cost, comfort.effect], [`chairLevel:${w.tables[0].id}`, 'capacity', chairs.priceBase, { key: 'goal.fx.patience', params: { n: chairs.levels[0].patienceMult } }], 'the chairs of table 1: patience x1.15');
  for (const table of w.tables) assert.ok(send(g, { type: 'upgradeChair', tableId: table.id }).ok);
  assert.equal(pick(g)!.lane, 'speed', 'every table is Lv2 with Lv2 chairs; Lv3 of both ladders waits for LP2');
  w.lifePath = ladder[1].lifePathGate;
  const third = pick(g)!;
  assert.deepEqual([third.id, third.cost, third.effect], [`table:${w.tables[0].id}`, ladder[1].priceBase, { key: 'goal.fx.snack', params: { n: Math.round(ladder[1].pExtraMoi * 100) } }], 'Lv3: the second snack, 35 %');
  assert.ok(send(g, { type: 'upgradeTable', tableId: w.tables[0].id }).ok);
  assert.equal(pick(g)!.cost, ladder[1].priceBase + ladder[1].stepBase, 'the next table pays one step more');
  w.lifePath = ladder[2].lifePathGate; for (const table of w.tables.slice(1)) assert.ok(send(g, { type: 'upgradeTable', tableId: table.id }).ok);
  const top = pick(g)!; assert.deepEqual([top.id, top.effect], [`table:${w.tables[0].id}`, { key: 'goal.fx.tip', params: { n: ladder[2].tipMult } }], 'Lv4: the tip');
  assert.equal(top.cost, ladder[2].priceBase);
});

test('a game on a pre-seat snapshot with the Wave 1 keys still gets a chip, and its first goal is the table upgrade it can afford', () => {
  const raw = structuredClone(capacityConfig.raw) as any; raw._meta.version = '2.0.6';
  raw.nextGoal = structuredClone((config.raw as any).nextGoal); raw._meta.governance.tiers.C.sections.splice(1, 0, 'nextGoal');
  const g = new Game(loadConfig(raw), 42, at), goal = pick(g)!;
  assert.equal(goal.id, `table:${g.world.tables[0].id}`); assert.equal(reachMult(g.config), (config.raw as any).nextGoal.reachMult);
});

test('the keg goal promises its reserve on the seat model (the taps are off the serving path from rules 28) and its taps on a capacity pin', () => {
  const effect = (g: Game) => listGoals(g.world, g.config).find(x => x.id === 'equipment:keg')!.effect;
  const seat = game(), tank = seat.config.values.upgrades.keg.kegStorage, pin = capacityGame(), taps = pin.config.values.upgrades.keg.pourSlots;
  assert.deepEqual(effect(seat), { key: 'goal.fx.keg', params: { n: tank[1] } });
  assert.deepEqual(effect(pin), { key: 'goal.fx.taps', params: { n: taps[1] } });
});
