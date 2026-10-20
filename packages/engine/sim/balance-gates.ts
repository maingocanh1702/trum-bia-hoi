import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, config as seedConfig, loadConfig, buyTableQuote, upgradeQuote, EQUIPMENT, restockQuote, beerStatus, tableUpgrade, type Command, type Config, type DomainEvent, type SeedConfig } from '../src/index';
import { simulateCareer, ADVANCED_CAREER_K_MAX, ADVANCED_TOTAL_VALUE_BASELINE, ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE } from './career';
import { doorTable, DOOR_TARGETS, type DoorTable } from './door';
import { measureStandard, type StandardRow } from './headless';
import { serveNext } from './policy';

/**
 * The balance gates of plan S5 (PLAN section 5 row S5, brief B5, DESIGN-story section 6) as ONE scripted evaluator: it takes the bundled economy plus a patch
 * of dotted paths, runs the career bot on each seed, the standard-k sim and the shift-1 wallet probe, and prints the table `gate | target | seed 42 | seed 99 |
 * PASS/FAIL`. Every run is deterministic. A sweep is a loop over patches (balance-sweep.ts) and keeps every run: patch + metrics + table.
 *   node --import tsx packages/engine/sim/balance-gates.ts [--patch=file.json] [--set=path=json ...] [--seeds=42,99] [--days=30] [--label=name] [--out=dir]
 *        [--job=career:42|standard|shift1] [--onboarding-pair] [--shift1=60] [--no-standard] [--start=YYYY-MM-DD] [--bot=price]
 * THE PROTOCOL (plan section 5 S5 row, brief B5) is the default: seeds 42 and 99, the S1-S4 career bot (seats and chairs first, then the cheapest) with direct leasing and no dog,
 * started on 2026-09-09. `--start` moves the first day (a Vietnam midnight; 2026-09-06 is the first day of a 21-day season) and `--bot=price` runs the price-decides bot v4:
 * information runs that say how much of a table belongs to the protocol, never the acceptance table.
 * The numbers below are the OWNER'S ACCEPTANCE PROTOCOL, never a tuning input and never a live gameplay limit.
 */
// config-exempt: owner acceptance protocol of plan S5 (targets of the gate table), not gameplay tuning.
export const TARGETS = {
  kGate: ADVANCED_CAREER_K_MAX, totalValueMax: Math.round(ADVANCED_TOTAL_VALUE_BASELINE * (1 + ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE)),
  lp7: [140, 170] as const, equipmentMax: 170, tables8Lv4: 170, table4: 48, chair1: [40, 56] as const, lv2First: 56, lv4First: 120,
  lp2: 48, lp4: 96, lp5: 120, maxGap: 8, dailyCapNotBefore: 150, beerOutMax: 0.10, shift1Seeds: 60,
};
export type Patch = Record<string, unknown>;
export type Raw = typeof seedConfig.raw;

/** Dotted paths into the raw economy (array indexes are numbers: `upgrades.keg.priceBase.4`, `locations.list.2.tableSlots`). Unknown paths throw. */
export function applyPatch(raw: Raw, patch: Patch): Raw {
  const out = structuredClone(raw) as unknown as Record<string, unknown>;
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.'), last = keys.pop()!;
    let node: unknown = out;
    for (const key of keys) { node = (node as Record<string, unknown>)?.[key]; assert.ok(node !== undefined && node !== null, `patch: ${path} does not exist`); }
    assert.ok(Object.hasOwn(node as object, last), `patch: ${path} does not exist`);
    (node as Record<string, unknown>)[last] = value;
  }
  return out as unknown as Raw;
}
export const patchedConfig = (patch: Patch) => loadConfig(applyPatch(seedConfig.raw, patch)) as SeedConfig;

export interface CareerMetrics {
  seed: number; days: number; configVersion: string; commandHash: string;
  raw: { served: number; totalValue: number; k: number };
  standard: { served: number; extraRoundServes: number; totalValue: number; k: number };
  lp: Record<string, number | null>; table4: number | null; chair1: number | null; lv2: number | null; lv4: number | null; lv4x8: number | null;
  equipMax: number | null; equipMissing: string[];
  purchases: number; maxGap: { shifts: number; after: number; next: number };
  door: DoorTable; capShift: number | null;
  beer: { guests: number; lost: number; arrived: number; admitted: number; ofLost: number; ofArrived: number; ofAdmitted: number };
  end: { day: number; shifts: number; tables: number; seats: number; tableLevels: number[]; chairLevels: number[]; equipment: Record<string, number>; location: string; reputation: number; lifePath: number; lifetimeEarned: number; coins: number; dogLevel: number };
  firstDays: { day: number; income: number; coins: number; tables: number; lifePath: number }[];
}

const MAX_LEVEL_OF_TABLE = (c: Config) => tableUpgrade(c.values)?.levels.at(-1)?.level ?? 1;
/** Everything the gate table needs from one finished career: ONE pass over the events (shift = shifts closed so far + 1, the convention of the purchase log). */
export function careerMetrics(game: Game, report: ReturnType<typeof simulateCareer>['report'], config: Config): CareerMetrics {
  const w = game.world, c = config.values, tableMax = MAX_LEVEL_OF_TABLE(config);
  const equipmentTop: Record<string, number> = { keg: c.upgrades.keg.priceBase.length, washer: c.upgrades.washer.priceBase.length, cooler: c.upgrades.cooler.priceBase.length,
    stall: c.upgrades.stall.priceBase.length, kitchen: c.upgrades.kitchen.priceBase.length - 1 };
  const lp: Record<string, number | null> = Object.fromEntries(c.lifePath.slice(1).map(r => [r.id, null]));
  const levels = new Map<string, number>([[w.tables[0].id, 1]]);
  const equipment: Record<string, number> = { keg: c.runtime.initialEquipmentLevel, washer: c.runtime.initialEquipmentLevel, cooler: c.runtime.initialEquipmentLevel, stall: c.runtime.initialEquipmentLevel, kitchen: c.runtime.initialKitchenLevel };
  const equipAt: Record<string, number | null> = Object.fromEntries(Object.keys(equipmentTop).map(k => [k, equipment[k] >= equipmentTop[k] ? 0 : null]));
  let closed = 0, tablesBought = 1, table4: number | null = null, chair1: number | null = null, lv2: number | null = null, lv4: number | null = null, lv4x8: number | null = null;
  let inRush = false, beerGuests = 0;
  const credited: number[] = [];
  for (const e of w.events as DomainEvent[]) {
    const shift = closed + 1;
    switch (e.type) {
      case 'shift_closed': closed++; credited.push(Number(e.data.credited)); break;
      case 'life_path_level_reached': if (lp[String(e.data.level)] === null) lp[String(e.data.level)] = shift; break;
      case 'table_bought': levels.set(String(e.data.tableId), 1); tablesBought++; if (tablesBought === 4 && table4 === null) table4 = shift; break;
      case 'chair_bought': chair1 ??= shift; break;
      case 'table_upgraded': {
        const level = Number(e.data.level); levels.set(String(e.data.tableId), level);
        if (level === 2) lv2 ??= shift;
        if (level === tableMax) lv4 ??= shift;
        if (lv4x8 === null && levels.size >= 8 && [...levels.values()].every(l => l === tableMax)) lv4x8 = shift;
        break;
      }
      case 'upgrade_bought': {
        const kind = String(e.data.kind); equipment[kind] = Number(e.data.level);
        if (equipAt[kind] === null && equipment[kind] >= equipmentTop[kind]) equipAt[kind] = shift;
        break;
      }
      case 'rush_started': inRush = true; break;
      case 'rush_ended': inRush = false; break;
      case 'order_expired': if (!inRush && (e.data.cause === 'beerStock' || e.data.cause === 'beerRefill')) beerGuests += Number(e.data.count); break;
    }
  }
  const missing = Object.entries(equipAt).filter(([, shift]) => shift === null).map(([kind]) => kind);
  const equipMax = missing.length ? null : Math.max(...Object.values(equipAt) as number[]);
  // The purchase rhythm: every coin purchase but restocks and leases (a lease is a recurring bill, not a goal of the chip), the first interval counted from shift 1.
  const bought = report.purchases.filter(p => p.command !== 'restock' && p.command !== 'rentLocation').map(p => p.shift);
  let gap = { shifts: 0, after: 1, next: 0 }, previous = 1;
  for (const shift of bought) { if (shift - previous > gap.shifts) gap = { shifts: shift - previous, after: previous, next: shift }; previous = shift; }
  // The daily cap: the shift in which the running total of a day first reached the cap.
  const cap = c.shift.dailyEarnCapBase;
  let capShift: number | null = null;
  for (const row of report.rows) {
    if (capShift !== null || row.income < cap) continue;
    const shifts = report.shiftStats.filter(s => s.day === row.day);
    let running = 0;
    for (const s of shifts) { running += credited[s.shift - 1] ?? 0; if (running >= cap) { capShift = s.shift; break; } }
    capShift ??= shifts.at(-1)?.shift ?? null;
  }
  const lostGuests = report.shiftStats.reduce((n, s) => n + s.lost, 0), arrived = report.shiftStats.reduce((n, s) => n + s.arrived, 0), rejected = report.shiftStats.reduce((n, s) => n + s.rejected, 0);
  const admitted = arrived - rejected;
  const last = report.rows.at(-1)!;
  return { seed: report.seed, days: report.days, configVersion: report.configVersion, commandHash: report.commandHash,
    raw: { served: report.value.served, totalValue: report.value.totalValue ?? NaN, k: report.value.kValue ?? NaN },
    standard: { served: report.normalised.served, extraRoundServes: report.normalised.extraRoundServes, totalValue: report.normalised.totalValue, k: report.normalised.kValue ?? NaN },
    lp, table4, chair1, lv2, lv4, lv4x8, equipMax, equipMissing: missing, purchases: bought.length, maxGap: gap,
    door: doorTable(report), capShift,
    beer: { guests: beerGuests, lost: lostGuests, arrived, admitted, ofLost: lostGuests ? beerGuests / lostGuests : 0, ofArrived: arrived ? beerGuests / arrived : 0, ofAdmitted: admitted ? beerGuests / admitted : 0 },
    end: { day: last.day, shifts: w.completedShifts, tables: w.tables.length, seats: w.tables.reduce((n, t) => n + t.capacity, 0), tableLevels: w.tables.map(t => t.level), chairLevels: w.tables.map(t => t.chairLevel ?? 1),
      equipment: { ...w.equipment }, location: last.location, reputation: w.reputation, lifePath: w.lifePath, lifetimeEarned: w.lifetimeEarned, coins: w.coins, dogLevel: w.dogLevel },
    firstDays: report.rows.slice(0, 6).map(r => ({ day: r.day, income: r.income, coins: r.coins, tables: r.tables.length, lifePath: r.lifePath })) };
}

export function runCareer(config: SeedConfig, seed: number, days: number, extra: { startAt?: number; seatsFirst?: boolean } = {}): CareerMetrics {
  const { game, report } = simulateCareer({ days, seed, config, startAt: extra.startAt, policy: { seatsFirst: extra.seatsFirst } }); // the protocol of plan S5 unless asked otherwise: seats first, direct leasing, 2026-09-09
  return careerMetrics(game, report, config);
}

export interface StandardMetrics { rows: StandardRow[] }
export function runStandard(patch: Patch, seeds: number[], onboardingPair: boolean): StandardMetrics {
  const raw = applyPatch(seedConfig.raw, patch), rows: StandardRow[] = [];
  const flags = { restedStart: false, qrStart: false, shipperStart: false, flyerStart: false };
  for (const onboarding of onboardingPair ? [true, false] : [true]) for (const kitchen of [raw.runtime.initialKitchenLevel, raw.upgrades.kitchen.priceBase.length - 1]) for (const seed of seeds)
    rows.push(measureStandard(raw, kitchen, onboarding, seed, flags).row);
  return { rows };
}

/**
 * Shift 1 of a brand-new save, played the way the guest and playable journeys play it, over many random seeds: the coins in hand when the shift has closed
 * and the wallet after the full beer restock the playable journey buys before it opens the Upgrades sheet. Plan section 7 line 3 ("kết ca 1 mua được bàn 2")
 * must hold on EVERY run, not on average: the minimum decides.
 */
export interface Shift1Metrics { seeds: number; price: number; startCoins: number; cheapestDevice: number; closing: { min: number; p05: number; median: number; max: number }; afterRestock: { min: number; p05: number; median: number; max: number }; below: number; belowSlow: number; served: { min: number; median: number }; slowCoarse: { min: number; median: number } }
export function runShift1(config: SeedConfig, seeds: number): Shift1Metrics {
  // The player of those journeys: shift 1 has no stock sheet, so only the beer is refilled (the keg's own button, when the stock falls below one batch),
  // snacks are never bought; every ready table is served, either at once or on a 4 s beat (the guest journey polls every 4 s, the playable one every 1 s).
  const play = (seed: number, coarseMs: number) => {
    const game = new Game(config, seed, Date.parse('2026-09-09T00:00:00+07:00')), w = game.world;
    const send = (command: Command) => game.command({ command, at: w.now, idempotencyKey: `s1-${game.log.length}` });
    const startCoins = w.coins; // the wallet of a brand-new save, before any guest
    send({ type: 'startShift' });
    let nextServe = w.now;
    for (let steps = 0; w.phase !== 'resting' && steps < 40000; steps++) {
      if (w.phase === 'open' && w.inventory.bia < beerStatus(w, config).batchSize && restockQuote(w, config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' });
      if (w.now >= nextServe) { serveNext(game, command => { send(command); }); nextServe = w.now + coarseMs; }
      game.advance(w.now + 100);
    }
    assert.equal(w.phase, 'resting', `shift 1 of seed ${seed} did not close`);
    const full = restockQuote(w, config, 'bia', 'full'); // what the playable journey buys on the stock sheet before it opens the Upgrades sheet
    const devices = EQUIPMENT.map(kind => upgradeQuote(w, config, kind).cost).filter((cost): cost is number => cost !== null && cost > 0);
    return { startCoins, closing: w.coins, afterRestock: w.coins - (full.quantity > 0 && full.cost <= w.coins ? full.cost : 0), served: w.shift!.stats.served, price: buyTableQuote(w, config).cost!, cheapestDevice: Math.min(...devices) };
  };
  const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return { min: s[0], p05: s[Math.floor(s.length * 0.05)], median: s[Math.floor(s.length / 2)], max: s.at(-1)! }; };
  const fast = Array.from({ length: seeds }, (_, i) => play(i + 1, 0)), slow = Array.from({ length: seeds }, (_, i) => play(i + 1, 4000));
  const price = fast[0].price;
  return { seeds, price, startCoins: fast[0].startCoins, cheapestDevice: fast[0].cheapestDevice, closing: stats(fast.map(r => r.closing)), afterRestock: stats(fast.map(r => r.afterRestock)), below: fast.filter(r => r.afterRestock < price).length, belowSlow: slow.filter(r => r.afterRestock < price).length,
    served: { min: Math.min(...fast.map(r => r.served)), median: stats(fast.map(r => r.served)).median }, slowCoarse: { min: Math.min(...slow.map(r => r.afterRestock)), median: stats(slow.map(r => r.afterRestock)).median } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
export interface Gate { id: string; name: string; target: string; cells: Record<string, string>; pass: Record<string, boolean | null>; violation: Record<string, number>; ok: boolean }
export interface GateInputs { careers: Record<number, CareerMetrics>; standard?: StandardMetrics; shift1?: Shift1Metrics; config: SeedConfig }
const fmt = (n: number | null, digits = 0) => n === null ? 'never' : Number.isFinite(n) ? n.toFixed(digits) : 'n/a';
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;
/** How far a shift number is from its window, as a share of the window's bound (never = 1): the continuous part of the objective of a sweep. */
const miss = (n: number | null, lo: number, hi: number) => n === null ? 1 : n < lo ? (lo - n) / Math.max(lo, 1) : n > hi ? (n - hi) / Math.max(hi, 1) : 0;
const over = (n: number, max: number) => n > max ? (n - max) / max : 0;

/** The table of the PR: one row per gate and target, one cell per seed. `violation` is 0 for a pass, else how far the cell is from its target (a share of the target). */
export function gateTable({ careers, standard, shift1, config }: GateInputs): Gate[] {
  const seeds = Object.keys(careers).map(Number).sort((a, b) => a - b);
  const rows: Gate[] = [];
  const add = (id: string, name: string, target: string, read: (m: CareerMetrics) => { cell: string; v: number }) => {
    const cells: Record<string, string> = {}, pass: Record<string, boolean | null> = {}, violation: Record<string, number> = {};
    for (const seed of seeds) { const r = read(careers[seed]); cells[seed] = r.cell; violation[seed] = r.v; pass[seed] = r.v === 0; }
    rows.push({ id, name, target, cells, pass, violation, ok: seeds.every(s => pass[s]) });
  };
  if (standard) {
    const cells: Record<string, string> = {}, pass: Record<string, boolean | null> = {}, violation: Record<string, number> = {}, [lo, hi] = config.values.k.band;
    for (const seed of seeds) {
      const mine = standard.rows.filter(r => r.seed === seed);
      cells[seed] = mine.map(r => `${r.profile === 'cold-menu' ? 'cold' : 'full'}${r.onboardingEnabled ? '' : '/off'} ${r.k.toFixed(3)}`).join(' · ');
      violation[seed] = mine.length ? Math.max(...mine.map(r => r.k < lo ? (lo - r.k) / lo : over(r.k, hi))) : 1; pass[seed] = violation[seed] === 0;
    }
    rows.push({ id: 'k.standard', name: 'standard k (npm run sim, furnished alley)', target: `${lo.toFixed(1)}-${hi.toFixed(1)}`, cells, pass, violation, ok: seeds.every(s => pass[s]) });
  }
  add('k.gate', 'career k, standard order (D4a)', `<= ${TARGETS.kGate}`, m => ({ cell: `${m.standard.k.toFixed(3)} (raw ${m.raw.k.toFixed(2)})`, v: over(m.standard.k, TARGETS.kGate) }));
  add('value.30d', '30-day total value, standard order', `<= ${(TARGETS.totalValueMax / 1e6).toFixed(3)} tr`, m => ({ cell: `${(m.standard.totalValue / 1e6).toFixed(3)} tr (raw ${(m.raw.totalValue / 1e6).toFixed(2)})`, v: over(m.standard.totalValue, TARGETS.totalValueMax) }));
  add('lp7', 'LP7 reached at shift', `${TARGETS.lp7[0]}-${TARGETS.lp7[1]}`, m => ({ cell: fmt(m.lp.LP7), v: miss(m.lp.LP7, ...TARGETS.lp7) }));
  add('equip.max', 'all equipment at max by shift', `<= ${TARGETS.equipmentMax}`, m => ({ cell: m.equipMax === null ? `never (${m.equipMissing.join(',')})` : fmt(m.equipMax), v: miss(m.equipMax, 0, TARGETS.equipmentMax) }));
  add('tables.lv4x8', '8 tables at Lv4 by shift', `<= ${TARGETS.tables8Lv4}`, m => ({ cell: m.lv4x8 === null ? `never (${m.end.tables} tables)` : fmt(m.lv4x8), v: miss(m.lv4x8, 0, TARGETS.tables8Lv4) }));
  add('table4', 'table 4 bought at shift', `<= ${TARGETS.table4}`, m => ({ cell: fmt(m.table4), v: miss(m.table4, 0, TARGETS.table4) }));
  add('chair1', 'first second chair at shift', `${TARGETS.chair1[0]}-${TARGETS.chair1[1]}`, m => ({ cell: fmt(m.chair1), v: miss(m.chair1, ...TARGETS.chair1) }));
  add('lv2', 'first table Lv2 at shift', `<= ${TARGETS.lv2First}`, m => ({ cell: fmt(m.lv2), v: miss(m.lv2, 0, TARGETS.lv2First) }));
  add('lv4', 'first table Lv4 at shift', `<= ${TARGETS.lv4First}`, m => ({ cell: fmt(m.lv4), v: miss(m.lv4, 0, TARGETS.lv4First) }));
  add('lp1+2', 'LP1 and LP2 by shift', `<= ${TARGETS.lp2}`, m => ({ cell: `LP1 ${fmt(m.lp.LP1)} · LP2 ${fmt(m.lp.LP2)}`, v: Math.max(miss(m.lp.LP1, 0, TARGETS.lp2), miss(m.lp.LP2, 0, TARGETS.lp2)) }));
  add('lp3+4', 'LP3 and LP4 by shift', `<= ${TARGETS.lp4}`, m => ({ cell: `LP3 ${fmt(m.lp.LP3)} · LP4 ${fmt(m.lp.LP4)}`, v: Math.max(miss(m.lp.LP3, 0, TARGETS.lp4), miss(m.lp.LP4, 0, TARGETS.lp4)) }));
  add('lp5', 'LP5 by shift', `<= ${TARGETS.lp5}`, m => ({ cell: fmt(m.lp.LP5), v: miss(m.lp.LP5, 0, TARGETS.lp5) }));
  add('gap', 'longest stretch of shifts without a purchase', `<= ${TARGETS.maxGap}`, m => ({ cell: `${m.maxGap.shifts} (shifts ${m.maxGap.after}-${m.maxGap.next}, ${m.purchases} purchases)`, v: over(m.maxGap.shifts, TARGETS.maxGap) }));
  for (const [i, band] of ['shifts 1-24', 'days 8-14', 'days 15-21'].entries()) {
    const target = [DOOR_TARGETS.shifts1to24, DOOR_TARGETS.days8to14, DOOR_TARGETS.days15to21][i];
    add(`door.${band.replace(' ', '')}`, `left with penalty, ${band} (of admitted)`, `<= ${pct(target)}`, m => {
      const b = m.door.bands.find(x => x.band === band);
      return { cell: b ? `${pct(b.lostOfAdmitted)} (of arrivals ${pct(b.lostOfArrived)})` : 'n/a', v: b ? over(b.lostOfAdmitted, target) : 1 };
    });
  }
  add('door.shift1', 'shift 1: arrivals / refused pairs', `>= ${DOOR_TARGETS.firstShiftArrivals} / >= ${DOOR_TARGETS.firstShiftRefusedPairs}`, m => {
    const d = m.door.shift1;
    return { cell: d ? `${d.arrived} / ${d.refusedPairs}` : 'n/a', v: d ? Math.max(Math.max(0, DOOR_TARGETS.firstShiftArrivals - d.arrived) / DOOR_TARGETS.firstShiftArrivals, Math.max(0, DOOR_TARGETS.firstShiftRefusedPairs - d.refusedPairs) / DOOR_TARGETS.firstShiftRefusedPairs) : 1 };
  });
  add('cap', 'daily earn cap first reached at shift', `>= ${TARGETS.dailyCapNotBefore} (or never)`, m => ({ cell: m.capShift === null ? 'not reached' : fmt(m.capShift), v: m.capShift === null ? 0 : miss(m.capShift, TARGETS.dailyCapNotBefore, Infinity) }));
  add('beer', 'guests lost to beer running out (no rush), of leavers', `< ${pct(TARGETS.beerOutMax)}`, m => ({ cell: `${pct(m.beer.ofLost)} (${m.beer.guests} guests; of arrivals ${pct(m.beer.ofArrived)})`, v: m.beer.ofLost < TARGETS.beerOutMax ? 0 : Math.max(over(m.beer.ofLost, TARGETS.beerOutMax), 1e-6) }));
  if (shift1) {
    // P0 (plan section 0, section 4 row 1: "kết ca: mua bàn 2 (850-1.160 xu + 750 khởi đầu)"): the player EARNS table 2 in shift 1. The start wallet must not pay it, and the
    // wallet of every run - the worst of the fast and the 4 s service models - must have grown to its price by the time the shift is over and the beer stock is bought.
    const cells: Record<string, string> = {}, pass: Record<string, boolean | null> = {}, violation: Record<string, number> = {};
    const worst = Math.min(shift1.afterRestock.min, shift1.slowCoarse.min), shortfall = Math.max(0, shift1.price - worst) / shift1.price, paysAtStart = shift1.startCoins >= shift1.price;
    const v = shortfall + (paysAtStart ? 1 : 0);
    for (const seed of seeds) {
      cells[seed] = `start ${shift1.startCoins} ${paysAtStart ? '>=' : '<'} ${shift1.price} · end min ${worst} (fast ${shift1.afterRestock.min}, 4 s ${shift1.slowCoarse.min}) · median ${shift1.afterRestock.median} (${shift1.below}/${shift1.seeds} and ${shift1.belowSlow}/${shift1.seeds} below ${shift1.price}; takings min ${worst - shift1.startCoins})`;
      pass[seed] = v === 0; violation[seed] = v;
    }
    rows.push({ id: 'shift1.wallet', name: 'shift 1 earns table 2 (start wallet < its price, every run ends with enough)', target: `start < ${shift1.price} and every end >= ${shift1.price}`, cells, pass, violation, ok: v === 0 });
    // The goal chip suggests what an average shift reaches, capacity lane first: table 2 is the first goal of every shop whose cheapest device level costs at least as much
    // (when a device is within reach so is the table, and the capacity lane wins). A cheaper device pre-empts it on the runs whose first shift took ~1/3 of its price.
    const first: Record<string, string> = {}, firstPass: Record<string, boolean | null> = {}, firstViolation: Record<string, number> = {}, short = Math.max(0, shift1.price - shift1.cheapestDevice) / shift1.price;
    for (const seed of seeds) { first[seed] = `cheapest device level ${shift1.cheapestDevice}`; firstPass[seed] = short === 0; firstViolation[seed] = short; }
    rows.push({ id: 'shift1.firstGoal', name: 'first goal after shift 1 is table 2 (no device level cheaper)', target: `every device level >= ${shift1.price}`, cells: first, pass: firstPass, violation: firstViolation, ok: short === 0 });
  }
  return rows;
}
export const failing = (rows: Gate[]) => rows.filter(r => !r.ok).map(r => r.id);
export function formatGateTable(rows: Gate[], seeds: number[]): string[] {
  const head = ['gate', 'target', ...seeds.map(s => `seed ${s}`), 'PASS/FAIL'];
  return [head.join(' | '), ...rows.map(r => [r.name, r.target, ...seeds.map(s => `${r.cells[s] ?? 'n/a'}${r.pass[s] === false ? ' (x)' : ''}`), r.ok ? 'PASS' : 'FAIL'].join(' | '))];
}
/** What a sweep minimises: the gates that fail (each seed of a gate counts), then how far they are from their targets (sum of violations). */
export const score = (rows: Gate[]) => ({ fails: rows.reduce((n, r) => n + Object.values(r.pass).filter(p => p === false).length, 0), violation: rows.reduce((n, r) => n + Object.values(r.violation).reduce((a, b) => a + b, 0), 0) });

// ---------------------------------------------------------------------------------------------------------------------------------------------
export interface JobResult { job: string; ms: number; career?: CareerMetrics; standard?: StandardMetrics; shift1?: Shift1Metrics }
export interface JobOptions { days: number; onboardingPair: boolean; shift1Seeds: number; standardSeeds: number[]; startAt?: number; seatsFirst?: boolean }
export function runJob(job: string, patch: Patch, options: JobOptions): JobResult {
  const started = Date.now(), config = patchedConfig(patch);
  const [kind, arg] = job.split(':');
  const result: JobResult = { job, ms: 0 };
  if (kind === 'career') result.career = runCareer(config, Number(arg), options.days, options);
  else if (kind === 'standard') result.standard = runStandard(patch, options.standardSeeds, options.onboardingPair);
  else if (kind === 'shift1') result.shift1 = runShift1(config, options.shift1Seeds);
  else throw Error(`unknown job ${job}`);
  result.ms = Date.now() - started;
  return result;
}
export function mergeJobs(patch: Patch, jobs: JobResult[]) {
  const config = patchedConfig(patch), careers: Record<number, CareerMetrics> = {};
  for (const j of jobs) if (j.career) careers[j.career.seed] = j.career;
  const standard = jobs.find(j => j.standard)?.standard, shift1 = jobs.find(j => j.shift1)?.shift1;
  const rows = gateTable({ careers, standard, shift1, config });
  return { rows, failing: failing(rows), score: score(rows), careers, standard, shift1 };
}

function parseArgs(argv: string[]) {
  const option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const patch: Patch = {};
  const file = option('patch'); if (file) Object.assign(patch, JSON.parse(readFileSync(file, 'utf8')));
  for (const a of argv.filter(x => x.startsWith('--set='))) { const [path, ...rest] = a.slice(6).split('='); patch[path] = JSON.parse(rest.join('=')); }
  const seeds = (option('seeds') ?? '42,99').split(',').map(Number);
  return { patch, seeds, days: Number(option('days') ?? 30), label: option('label') ?? 'run', out: option('out'), job: option('job'),
    startAt: option('start') ? Date.parse(`${option('start')}T00:00:00+07:00`) : undefined, seatsFirst: option('bot') === 'price' ? false : undefined,
    onboardingPair: argv.includes('--onboarding-pair'), shift1: Number(option('shift1') ?? TARGETS.shift1Seeds), standard: !argv.includes('--no-standard') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const options: JobOptions = { days: args.days, onboardingPair: args.onboardingPair, shift1Seeds: args.shift1, standardSeeds: args.seeds, startAt: args.startAt, seatsFirst: args.seatsFirst };
  if (args.job) { // one job, JSON on stdout: the unit of work of the sweep driver
    console.log(JSON.stringify(runJob(args.job, args.patch, options)));
  } else {
    const jobs = [...args.seeds.map(s => `career:${s}`), ...(args.standard ? ['standard'] : []), ...(args.shift1 > 0 ? ['shift1'] : [])];
    const results = jobs.map(job => { const r = runJob(job, args.patch, options); console.error(`# ${job} ${(r.ms / 1000).toFixed(1)} s`); return r; });
    const merged = mergeJobs(args.patch, results);
    for (const line of formatGateTable(merged.rows, args.seeds)) console.log(line);
    console.log(`failing gates (${merged.score.fails} seed-cells, violation ${merged.score.violation.toFixed(3)}): ${merged.failing.join(', ') || 'none'}`);
    if (args.out) {
      mkdirSync(args.out, { recursive: true });
      writeFileSync(join(args.out, `${args.label}.json`), JSON.stringify({ label: args.label, patch: args.patch, days: args.days, seeds: args.seeds, score: merged.score, failing: merged.failing, rows: merged.rows, careers: merged.careers, standard: merged.standard, shift1: merged.shift1 }, null, 2) + '\n');
    }
  }
}
