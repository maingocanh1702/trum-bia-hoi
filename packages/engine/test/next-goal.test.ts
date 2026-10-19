import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, type Command } from '../src';
import { LANES, listGoals, pickNextGoal, reachMult, shiftAverage } from '../../../apps/web/src/goals';

// The goal chip (PLAN §4 fun-next-goal) on real engine worlds: lane priority, price, reach, gates, and what an old pin without `nextGoal` does.
const game = () => new Game(undefined, 42, Date.parse('2026-09-16T03:00:00Z'));
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `goal-${g.log.length}` });
const pick = (g: Game) => pickNextGoal(g.world, g.config);
const closed = (g: Game, shifts: number, earned: number) => { const w = g.world; w.phase = 'resting'; w.shift = null; w.completedShifts = shifts; w.lifetimeEarned = earned; };

test('a new save points at the first table upgrade: capacity lane, cheapest, nothing filtered before a shift has closed', () => {
  const g = game(), goal = pick(g)!;
  assert.deepEqual(LANES, ['capacity', 'speed', 'guests']);
  assert.equal(goal.id, `table:${g.world.tables[0].id}`); assert.equal(goal.lane, 'capacity');
  assert.equal(goal.cost, g.config.values.upgrades.table.levels[1].priceBase); assert.deepEqual(goal.effect, { key: 'goal.fx.seats', params: { n: g.config.values.upgrades.table.levels[1].capacity } });
  assert.equal(shiftAverage(g.world), null);
});

test('an empty table beats a busy one at the same price, and the chip moves on after every purchase', () => {
  const g = game(), w = g.world; w.coins = 10_000_000;
  w.tables[0].state = 'seating';
  assert.equal(pick(g)!.id, `table:${w.tables[1].id}`, 'table 1 is in use, table 2 costs the same');
  w.tables[0].state = 'empty';
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) { const goal = pick(g)!; seen.push(goal.id); assert.ok(send(g, { type: 'upgradeTable', tableId: w.tables.find(t => `table:${t.id}` === goal.id)!.id }).ok); }
  assert.deepEqual(seen, w.tables.map(t => `table:${t.id}`), 'each table once, in order');
  const goals = listGoals(w, g.config), lv3 = g.config.values.upgrades.table.levels[2].priceBase;
  assert.ok(goals.find(x => x.id === 'buyTable')!.cost! > lv3, 'seat prices climb with the seats you already own, so a new table is now dearer than a Lv3 table');
  assert.equal(pick(g)!.id, `table:${w.tables[0].id}`); assert.equal(pick(g)!.cost, lv3);
});

test('lane priority beats price: a cheaper speed item waits while a capacity item is eligible', () => {
  const g = game(), w = g.world; w.coins = 10_000_000; w.tables.forEach(t => { t.level = 2; t.capacity = 4; });
  const goals = listGoals(w, g.config), cheapestSpeed = Math.min(...goals.filter(x => x.lane === 'speed' && x.eligible).map(x => x.cost!));
  const goal = pick(g)!; assert.equal(goal.lane, 'capacity'); assert.ok(cheapestSpeed < goal.cost!, `${cheapestSpeed} < ${goal.cost}`);
});

test('the reach filter moves the chip to the next lane, and falls back to the cheapest item when nothing is within reach', () => {
  const g = game(), w = g.world, mult = reachMult(g.config); assert.equal(mult, 3);
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

test('a goal behind a life-path, badge, reputation or stall gate is never suggested', () => {
  const g = game(), w = g.world; w.coins = 10_000_000;
  w.equipment.keg = 3; // Lv4 needs life path 2
  const keg = () => listGoals(w, g.config).find(x => x.id === 'equipment:keg')!;
  assert.equal(keg().eligible, false); w.lifePath = 2; assert.equal(keg().eligible, true);
  const top = w.tables.length - 1; w.lifePath = 0; w.tables[top].level = g.config.values.upgrades.table.levels.length - 1; // the next table level wants a badge and reputation
  const table = () => listGoals(w, g.config).find(x => x.id === `table:${w.tables[top].id}`)!;
  assert.equal(table().eligible, false); assert.notEqual(pick(g)!.id, table().id);
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

test('a snapshot pinned before nextGoal joined tier C keeps its shorter tier list, and the list must still be strings', () => {
  const raw = structuredClone(config.raw) as any, sections = raw._meta.governance.tiers.C.sections as string[];
  assert.ok(sections.includes('nextGoal'));
  const old = structuredClone(raw); old._meta.version = 'old-tier-list'; old._meta.governance.tiers.C.sections = sections.filter(name => name !== 'nextGoal'); delete old.nextGoal;
  assert.equal(JSON.stringify(loadConfig(old).raw), JSON.stringify(old));
  for (const bad of [['onboarding', 1], 'onboarding', null]) { const broken = structuredClone(raw); broken._meta.governance.tiers.C.sections = bad; assert.throws(() => loadConfig(broken), /config:_meta.governance.tiers.C.sections:array/, JSON.stringify(bad)); }
});
