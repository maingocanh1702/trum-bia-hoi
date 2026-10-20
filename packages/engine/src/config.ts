import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';

export type Economy = typeof seed | typeof capacityModel | typeof legacy;
/** Economy 2.x snapshot (life-path device gates): the current seat model or a pinned 2.0 capacity model. */
export function isEconomy2(c: Economy): c is typeof seed | typeof capacityModel { return Object.hasOwn(c.upgrades, 'lifePathGate'); }
/** Seat model v3.3 (rules 28): a table owns 1-2 chairs; table levels no longer decide capacity. */
export function isSeatModel(c: Economy): c is typeof seed { return Object.hasOwn(c.upgrades.table, 'chairPriceBase'); }
/** A pair is the largest group and the most chairs one table holds; every table comes with one chair. */
export const PAIR = 2, CHAIRS_WITH_TABLE = 1; // config-exempt: structural seat-model shape (plan D13/D17, FEEDBACK II.2 v3.3), not tuning
/** Largest group a snapshot can seat. */
export function groupLimit(c: Economy): number {
  return isSeatModel(c) ? PAIR : Math.max(...c.upgrades.table.levels.map(t => t.capacity));
}
export type Dish = keyof Economy['menu'];
export type Equipment = 'keg' | 'washer' | 'cooler' | 'stall' | 'kitchen';
export type CustomerType = keyof Economy['customerTypes'];
export type SeatedType = Exclude<CustomerType, 'shipper'>;
export type Weather = 'sunny' | 'hot' | 'humid' | 'rain' | 'cold';
export type Rush = 'none' | 'peak' | 'light' | 'heavy' | 'lunch_light' | 'football';
export const DISHES = Object.keys(seed.menu) as Dish[];
export const EQUIPMENT: Equipment[] = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
export const WEATHER: Weather[] = ['sunny', 'hot', 'humid', 'rain', 'cold'];
export const RUSH_TYPES = Object.entries(seed.rush).filter(([, r]) => typeof r === 'object' && 'floorMs' in r).map(([kind]) => kind) as Rush[];

/** Unrounded per-customer cadence: ordinary baseline precedes weather; active rush keeps its hard floor. */
export function arrivalIntervalMs(c: Economy, weather: Weather, kind: Rush, campaign = false): number {
  const rush = c.rush[kind];
  const interval = (kind === 'none' ? Math.max(c.spawn.baseMs, rush.floorMs) : c.spawn.baseMs) * c.weather[weather].spawnIntervalMult * rush.spawnIntervalMult * (campaign ? c.unlocks.flyer.spawnIntervalMult : 1);
  return kind === 'none' ? interval : Math.max(interval, rush.floorMs);
}

/**
 * Capacity demand (plan D19, rules 28): while the shop owns fewer than `refTables` tables the gap to the next group grows by
 * min(maxMult, max(1, refTables / tables)). A snapshot pinned before the key (JSON <= 2.0.21), a capacity pin and a 1.x pin have none: x1.
 */
export function capacityDemandMult(c: Economy, tables: number): number {
  const demand = (c.spawn as { capacityDemand?: { refTables: number; maxMult: number } }).capacityDemand;
  return demand ? Math.min(demand.maxMult, Math.max(1, demand.refTables / Math.max(1, tables))) : 1;
}

type SeatTable = typeof seed.upgrades.table;
export type TableUpgrade = SeatTable['tableUpgrade'];
export type ChairUpgrade = SeatTable['chairUpgrade'];
/** What a table of some level gives the group that sits down at it (plan D14/D19). */
export interface TableBenefit { extraRounds: number; pExtraMoi: number; tipMult: number }
const NO_BENEFIT: Readonly<TableBenefit> = Object.freeze({ extraRounds: 0, pExtraMoi: 0, tipMult: 1 }); // config-exempt: the neutral benefit of level 1 and of a snapshot without the ladder
/** The S4 table-level ladder (rules 28); null on a snapshot from before it (JSON <= 2.0.22), on a capacity pin and on a 1.x pin. */
export function tableUpgrade(c: Economy): TableUpgrade | null { return Object.hasOwn(c.upgrades.table, 'tableUpgrade') ? (c.upgrades.table as SeatTable).tableUpgrade : null; }
/** The S4 chair-level ladder (rules 28); null wherever `tableUpgrade` is. */
export function chairUpgrade(c: Economy): ChairUpgrade | null { return Object.hasOwn(c.upgrades.table, 'chairUpgrade') ? (c.upgrades.table as SeatTable).chairUpgrade : null; }
/** Total benefit of a table level (benefits stack: each ladder row lists the sum). Level 1, a level without a row and every older snapshot: none. */
export function tableBenefit(c: Economy, level: number): TableBenefit {
  const row = tableUpgrade(c)?.levels.find(l => l.level === level);
  return row ? { extraRounds: row.extraRounds, pExtraMoi: row.pExtraMoi, tipMult: row.tipMult } : NO_BENEFIT;
}
/** The benefit a level adds to the one below it, named by its key (analytics `table_upgraded.what`). */
export function tableBenefitGained(c: Economy, level: number): keyof TableBenefit | 'none' {
  const now = tableBenefit(c, level), before = tableBenefit(c, level - 1);
  return (['extraRounds', 'pExtraMoi', 'tipMult'] as const).find(key => now[key] !== before[key]) ?? 'none';
}
/** Order-patience multiplier of a chair level (D15): 1 at level 1 and on every snapshot without the chair ladder. */
export function chairPatienceMult(c: Economy, level: number): number { return chairUpgrade(c)?.levels.find(l => l.level === level)?.patienceMult ?? 1; }

/** Decode the single supported config curve grammar; never execute formula text. */
export function dailyTargetCurve(c: Economy) {
  const match = /^base \+ \(max-base\) \* \(\(clamp\(tier,(\d+),(\d+)\)-\1\)\/(\d+)\)\^(\d+(?:\.\d+)?)$/.exec(c.quests.daily.targetCurve);
  if (!match) throw Error('config:questCurve');
  const [min, max, divisor, exponent] = match.slice(1).map(Number);
  if (![min, max, divisor].every(Number.isSafeInteger) || min < 1 || max <= min || divisor !== max - min || !Number.isFinite(exponent) || exponent <= 0) throw Error('config:questCurve');
  return { min, max, divisor, exponent };
}

/** Final dish prices; only the gross range supplied by the caller is Base-scaled. */
export function deliveryBundles(c: Economy, kitchen: number, grossRange: readonly number[]) {
  const dishes = DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= kitchen);
  const bundles: { lines: { dish: Dish; quantity: number }[]; gross: number }[] = [];
  const lines: { dish: Dish; quantity: number }[] = [];
  let work = 0;
  const walk = (index: number, remaining: number, gross: number) => {
    if (++work > 100000) throw Error('config:deliveryCatalogTooLarge'); // config-exempt: validation CPU/memory ceiling, not game tuning
    if (index === dishes.length) {
      if (remaining === 0 && gross >= grossRange[0] && gross <= grossRange[1]) bundles.push({ lines: lines.map(line => ({ ...line })), gross });
      return;
    }
    const dish = dishes[index], price = c.menu[dish].price;
    for (let quantity = 0; quantity <= Math.min(remaining, Math.floor((grossRange[1] - gross) / price)); quantity++) {
      if (quantity) lines.push({ dish, quantity });
      walk(index + 1, remaining - quantity, gross + quantity * price);
      if (quantity) lines.pop();
    }
  };
  for (let units = c.customerTypes.shipper.orderLines[0]; units <= c.customerTypes.shipper.orderLines[1]; units++) walk(0, units, 0);
  return bundles;
}

export type SignStyle = keyof Economy['signboard']['styles'];
export const SIGN_STYLES = Object.keys(seed.signboard.styles) as SignStyle[];
export function signWeightMult(definition: Economy['signboard']['styles'][SignStyle] | undefined, type: string): number {
  const key = type === 'vip' ? 'vipWeightMult' : type === 'voi' ? 'voiWeightMult' : type === 'ngoily' ? 'ngoilyWeightMult' : null;
  return key ? (definition as Record<string, number> | undefined)?.[key] ?? 1 : 1;
}

export const BUSINESS_UNLOCKS = ['phone', 'qr'] as const;
export type BusinessUnlock = typeof BUSINESS_UNLOCKS[number];
export type ProgressRequirement =
  | { kind: 'seats' | 'tables' | 'equipment' | 'stall' | 'level'; need: number; exact: boolean }
  | { kind: 'owned'; target: string }
  | { kind: 'peak'; target: string };
/** Closed config grammar; unknown tokens never become an unlocked prerequisite. */
export function parseProgressRequirement(token: string, c: Economy): ProgressRequirement {
  const shop = /^(\d+) (seats|tables)$/.exec(token), gear = /^(equipment|stall)(>=|=)(\d+)$/.exec(token);
  if (shop || gear) {
    const need = Number(shop?.[1] ?? gear![3]); // config-exempt: numbered regex capture groups
    if (!Number.isSafeInteger(need) || need < 1) throw Error('config:progressRequirementNumber');
    return { kind: shop ? shop[2] as 'seats' | 'tables' : gear![1] as 'equipment' | 'stall', need, exact: gear?.[2] === '=' };
  }
  const level = c.lifePath.findIndex(row => row.id === token);
  if (level >= 0) return { kind: 'level', need: level, exact: false };
  if (['dog', 'phone', 'qr', 'flyer', 'signboard'].includes(token)) return { kind: 'owned', target: token };
  if (token.startsWith('peak:') && c.league.tiers.some(tier => tier.id === token.slice('peak:'.length))) return { kind: 'peak', target: token.slice('peak:'.length) };
  throw Error(`config:progressRequirement:${token}`);
}

// Presentation-only thresholds added after earlier releases. Older pinned snapshots predate them and keep their raw bytes;
// a snapshot that carries one must still shape-check it, and the web client falls back to the bundled seed for the absent ones.
// The reverse holds for exactly one shape: a pre-seat snapshot from after Wave 1 (JSON 2.0.5/2.0.6) carries them although the frozen
// capacity file (2.0.4) that shapes it does not, so there, and only there, a key the expected shape lacks takes the bundled seed as its
// template. A 1.x or a seat-model snapshot never extends its shape: main refused these keys on a 1.x pin, and so does this.
const ADDED_LATER = new Set(['nextGoal', 'onboarding.loginPrompt.leaveProgress', 'onboarding.idleToGuideMs',
  'onboarding.featureReveal.hudAfterShifts', 'onboarding.featureReveal.upgradeAllAfterShifts', 'onboarding.featureReveal.journeyAfterShifts']);

// Sections that joined a governance tier after earlier releases (tier -> names); shape() lets an older pinned snapshot lack exactly these.
const TIER_SECTIONS_ADDED_LATER: Record<string, readonly string[]> = { C: ['nextGoal'] };
const valueAt = (root: unknown, path: string): unknown => path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], root);
const seedAt = (path: string): unknown => valueAt(seed, path);

// Seat-model keys added after JSON 2.0.20/2.0.21. A pin is immutable, so a seat snapshot labelled before the version that introduced a group has the
// shape of the seed without it (exact: no key of the group, no tier entry), and one labelled with or after that version needs the whole group.
// `since` = the first version carrying the group, `paths` = the object keys it added, `tiers` = the names it added to the governance tier lists,
// `restore` = keys the group REPLACED: the older pin still carries them, so the older shape gets them back from the frozen capacity file (2.0.4).
const SEAT_KEYS_ADDED_LATER: readonly { since: string; paths: readonly string[]; tiers: Record<string, readonly string[]>; restore?: readonly string[] }[] = [
  { since: '2.0.22', paths: ['spawn.capacityDemand'], tiers: { A: ['spawn.capacityDemand'] } }, // plan S3, D19
  // plan S4, D14 D15 D18 D19: the table and chair ladders replace the postmvp `upgrades.backrest` placeholder (the same object in every older pin)
  { since: '2.0.23', paths: ['upgrades.table.tableUpgrade', 'upgrades.table.chairUpgrade'], tiers: { A: ['upgrades.table.tableUpgrade', 'upgrades.table.chairUpgrade'] }, restore: ['upgrades.backrest'] },
];
const versionOf = (label: unknown): number[] | null => { const m = typeof label === 'string' ? /^(\d+)\.(\d+)\.(\d+)$/.exec(label) : null; return m ? m.slice(1).map(Number) : null; };
const olderThan = (label: unknown, since: string): boolean => { const a = versionOf(label), b = versionOf(since)!; return !!a && (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) < 0; };
const ownPath = (root: unknown, path: string): boolean => path.split('.').every(key => { const has = !!root && typeof root === 'object' && Object.hasOwn(root, key); root = has ? (root as Record<string, unknown>)[key] : undefined; return has; });
const seatShapes = new Map<string, unknown>();
/** The template of a seat-model snapshot: the seed, or the seed minus the key groups that snapshot predates (cached per combination). */
function seatShape(input: unknown): unknown {
  const version = (input as { _meta?: { version?: unknown } } | null)?._meta?.version;
  const absent = SEAT_KEYS_ADDED_LATER.filter(group => olderThan(version, group.since) && group.paths.every(path => !ownPath(input, path)));
  if (!absent.length) return seed;
  const key = absent.map(group => group.since).join();
  if (!seatShapes.has(key)) {
    const older = structuredClone(seed) as Record<string, any>;
    for (const group of absent) {
      for (const path of group.paths) { const keys = path.split('.'), last = keys.pop()!; delete keys.reduce((node, k) => node[k], older)[last]; }
      for (const path of group.restore ?? []) { const keys = path.split('.'), last = keys.pop()!; keys.reduce((node, k) => node[k], older)[last] = structuredClone(valueAt(capacityModel, path)); }
      for (const [tier, names] of Object.entries(group.tiers)) older._meta.governance.tiers[tier].sections = older._meta.governance.tiers[tier].sections.filter((name: string) => !names.includes(name));
    }
    seatShapes.set(key, older);
  }
  return seatShapes.get(key);
}

/**
 * Complete snapshots only: a partial or malformed config must never become live. Keys are compared as OWN keys (`k in e` walks the
 * prototype chain, so a JSON key named `constructor` or `toString` would count as known and never be checked). `wave1` is set when
 * `expected` is the frozen capacity file, the one shape a pre-seat Wave 1 pin may extend with ADDED_LATER keys.
 */
function shape(value: unknown, expected: unknown, path: string, wave1 = false): void {
  if (expected === null) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) throw Error(`config:${path}`);
  } else if (Array.isArray(expected)) {
    // Prerequisite lists are grammatical tokens, not fixed level/capacity tables.
    if (/^lifePath\.\d+\.requires$/.test(path)) {
      if (!Array.isArray(value) || !value.every(token => typeof token === 'string')) throw Error(`config:${path}:array`);
      return; // validate() still rejects unknown tokens and dependency cycles.
    }
    // The tier registry decides who may edit which section, so a list is exact: the expected membership, minus only the sections that
    // joined that tier later (a snapshot pinned before then keeps the shorter list) and, on the capacity shape alone, plus only those
    // same sections (a pre-seat snapshot from after they joined). No duplicate, unknown, moved or missing name.
    const tier = /^_meta\.governance\.tiers\.([A-C])\.sections$/.exec(path);
    if (tier) {
      const later = TIER_SECTIONS_ADDED_LATER[tier[1]] ?? [];
      if (!Array.isArray(value) || !value.every(name => typeof name === 'string') || new Set(value).size !== value.length
        || value.some(name => !expected.includes(name) && !(wave1 && later.includes(name))) || expected.some(name => !value.includes(name) && !later.includes(name))) throw Error(`config:${path}:array`);
      return;
    }
    if (!Array.isArray(value) || value.length !== expected.length) throw Error(`config:${path}:array`);
    expected.forEach((v, i) => shape(value[i], v, `${path}.${i}`, wave1));
  } else if (typeof expected === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`config:${path}:object`);
    const e = expected as Record<string, unknown>, v = value as Record<string, unknown>, at = (k: string) => path ? `${path}.${k}` : k;
    const keys = Object.keys(e).filter(k => Object.hasOwn(v, k) || !ADDED_LATER.has(at(k))), extra = Object.keys(v).filter(k => !Object.hasOwn(e, k));
    if (keys.some(k => !Object.hasOwn(v, k)) || extra.some(k => !(wave1 && ADDED_LATER.has(at(k))))) throw Error(`config:${path}:keys`);
    for (const k of keys) shape(v[k], e[k], at(k), wave1);
    for (const k of extra) shape(v[k], seedAt(at(k)), at(k)); // an extra is an ADDED_LATER key of a Wave 1 pin: the seed's subtree is its exact shape
  } else if (typeof value !== typeof expected || (typeof value === 'number' && !Number.isFinite(value))) {
    throw Error(`config:${path}:type`);
  }
}

function validate(c: Economy): void {
  const positive = (n: number, path: string) => { if (!(n > 0)) throw Error(`config:${path}:positive`); };
  const whole = (n: number, path: string, min = 0) => { if (!Number.isSafeInteger(n) || n < min) throw Error(`config:${path}:integer`); };
  const scan = (v: unknown, path: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => scan(x, `${path}.${i}`));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => scan(x, `${path}.${k}`));
    if (typeof v === 'number' && v < 0 && !/reputation|reputationDelta|ignoreRepBase/.test(path)) throw Error(`config:${path}:negative`);
  };
  scan(c, '');
  if (isEconomy2(c)) {
    for (const p of [c.demandMix.pHotGivenMoi, c.demandMix.pHotGivenMoiSpecial]) if (p < 0 || p > 1) throw Error('config:hotProbability');
    const level = (n: number) => { whole(n, 'lifePathGate'); if (n >= c.lifePath.length) throw Error('config:lifePathGate'); };
    for (const kind of EQUIPMENT) c.upgrades.lifePathGate[kind].forEach(level);
    level(c.rush.schedule.heavyFromLifePath);
    c.upgrades.kitchen.portionsPerPan.forEach((n, i) => whole(n, 'kitchen.portionsPerPan', i ? 1 : 0));
    if (c.upgrades.kitchen.portionsPerPan[0] !== 0) throw Error('config:kitchen.lockedPan');
    whole(Math.round(c.glasses.priceBase * c.k.value) * c.glasses.buyCap, 'glasses.maximumPurchase');
    for (const location of c.locations.list) {
      level(location.gateLifePath);
      if (location.gate !== (location.gateLifePath ? c.lifePath[location.gateLifePath].id : null)) throw Error('config:locationGateAlias');
    }
    if (new Set(c.locations.list.map(row => row.id)).size !== c.locations.list.length ||
      !c.locations.list.some(row => row.id === c.locations.fallback && row.rentPerDayBase === 0 && row.gateLifePath === 0)) throw Error('config:locationIdentity');
    // Conservative whole-order bound: include onboarding, every customer/rush/weather, QR and rest bonus.
    const gross = Math.max(c.menu.bia.price + Math.max(...DISHES.map(d => c.menu[d].price)), c.onboarding.firstShift.firstOrder.reduce((sum, d) => sum + c.menu[d as Dish].price, 0));
    const customers = Object.values(c.customerTypes).filter(t => 'paymentMult' in t);
    const payMult = Math.max(...customers.map(t => t.paymentMult)) * Math.max(...RUSH_TYPES.map(r => c.rush[r].paymentMult));
    const tipMult = Math.max(...customers.map(t => t.tipMult)) * Math.max(...RUSH_TYPES.map(r => c.rush[r].tipMult)) * Math.max(...WEATHER.map(w => c.weather[w].tipMult)) * Math.max(1, c.tip.qrMult);
    for (const location of c.locations.list) {
      const payment = Math.ceil(gross * payMult * location.mult), tip = Math.ceil(Math.ceil(payment * c.tip.rate) * tipMult);
      whole(Math.ceil((payment + tip) * c.shift.wellRested.mult) * groupLimit(c), 'locations.maximumService');
      if (!location.id.trim() || location.mult <= 0) throw Error('config:locationIdentity');
      whole(location.rentPerDayBase, 'locations.rent');
      const rent = Math.round(location.rentPerDayBase * c.k.value) * c.locations.leaseDays;
      whole(rent + Math.round(rent * c.locations.depositRate), 'locations.total');
    }
    whole(c.locations.leaseDays * 86400000, 'locations.duration', 1); // config-exempt: calendar days to milliseconds
    whole(c.locations.leaseDays, 'locations.leaseDays', 1);
    if (c.locations.depositRate < 0 || c.locations.depositRate > 1) throw Error('config:depositRate');
  }
  if (isSeatModel(c)) {
    // Every alley seats the starting tables, every reachable table/chair has a price and chairs open somewhere.
    const table = c.upgrades.table, slots = c.locations.list.map(row => row.tableSlots);
    slots.forEach(n => whole(n, 'locations.tableSlots', table.startingTables));
    // tablePriceBase[n-2] prices the n-th table (the first is free); chairPriceBase holds one second chair per table.
    if (table.tablePriceBase.length < Math.max(...slots) - 1 || table.chairPriceBase.length < Math.max(...slots)) throw Error('config:seatPriceLadder');
    for (const price of [...table.tablePriceBase, ...table.chairPriceBase]) { whole(price, 'table.seatPrice'); whole(Math.round(price * c.k.value), 'table.scaledSeatPrice'); }
    whole(table.chairsAfterTables, 'table.chairsAfterTables', 1);
    if (table.chairsAfterTables > Math.min(...slots)) throw Error('config:chairsAfterTables');
    for (const p of [c.spawn.pPair, table.orderShape.solo.pBeer, table.orderShape.pair.pMoi]) if (p < 0 || p > 1) throw Error('config:seatProbability');
    // Capacity demand (S3): a whole reference shop of at least one table; a multiplier below one would speed arrivals up, never slow them.
    if (Object.hasOwn(c.spawn, 'capacityDemand')) {
      whole(c.spawn.capacityDemand.refTables, 'spawn.capacityDemand.refTables', 1);
      if (!Number.isFinite(c.spawn.capacityDemand.maxMult) || c.spawn.capacityDemand.maxMult < 1) throw Error('config:spawn.capacityDemand.maxMult');
    }
    // Table and chair levels (S4): levels in order from 2, whole prices that stay whole once scaled, a gate inside the life path, benefits that only grow.
    const gate = (n: number) => { whole(n, 'lifePathGate'); if (n >= c.lifePath.length) throw Error('config:lifePathGate'); };
    const prices = (row: { priceBase: number; stepBase: number }, at: string) => {
      for (const key of ['priceBase', 'stepBase'] as const) { whole(row[key], `${at}.${key}`); whole(Math.round(row[key] * c.k.value), `${at}.scaled${key}`); }
    };
    if (Object.hasOwn(table, 'tableUpgrade')) {
      let before: { extraRounds: number; pExtraMoi: number; tipMult: number } = { extraRounds: 0, pExtraMoi: 0, tipMult: 1 };
      table.tableUpgrade.levels.forEach((row, i) => {
        const at = `tableUpgrade.levels.${i}`;
        if (row.level !== i + 2) throw Error('config:upgrades.table.tableUpgrade:levelOrder');
        prices(row, at); gate(row.lifePathGate); whole(row.extraRounds, `${at}.extraRounds`);
        if (!(row.pExtraMoi >= 0 && row.pExtraMoi <= 1)) throw Error('config:upgrades.table.tableUpgrade:pExtraMoi');
        if (!(Number.isFinite(row.tipMult) && row.tipMult >= 1)) throw Error('config:upgrades.table.tableUpgrade:tipMult');
        if (row.extraRounds < before.extraRounds || row.pExtraMoi < before.pExtraMoi || row.tipMult < before.tipMult) throw Error('config:upgrades.table.tableUpgrade:benefitOrder');
        before = row;
      });
    }
    if (Object.hasOwn(table, 'chairUpgrade')) {
      prices(table.chairUpgrade, 'chairUpgrade');
      let before = 1; // level 1: the chairs every table starts with
      table.chairUpgrade.levels.forEach((row, i) => {
        if (row.level !== i + 2) throw Error('config:upgrades.table.chairUpgrade:levelOrder');
        gate(row.lifePathGate);
        if (!(Number.isFinite(row.patienceMult) && row.patienceMult >= before)) throw Error('config:upgrades.table.chairUpgrade:patienceMult');
        before = row.patienceMult;
      });
    }
  }
  if (!c._meta.version.trim() || c.k.value < c.k.band[0] || c.k.value > c.k.band[1]) throw Error('config:k');
  positive(c.k.anchorValuePerServe, 'anchor');
  positive(c.shift.durationMs, 'shift.durationMs');
  const rested = c.shift.wellRested;
  whole(rested.durationMs, 'wellRested.durationMs', 1);
  if (rested.mult < 1 || !Number.isSafeInteger(rested.requiresRestHours * 3600000)) throw Error('config:wellRested'); // config-exempt: hours to milliseconds
  if (c.tip.wellRestedMult !== rested.mult || c.tip.wellRestedDurationMs !== rested.durationMs || c.tip.wellRestedKeyedBy !== 'open-day') throw Error('config:wellRestedAliases');
  whole(c.rush.schedule.warningMs, 'rush.warningMs');
  whole(c.rush.schedule.perShift, 'rush.perShift');
  whole(c.rush.schedule.noRushFirstMs, 'rush.noRushFirstMs');
  for (const kind of ['light', 'heavy', 'lunch_light'] as const) whole(c.rush[kind].durationMs, `rush.${kind}.durationMs`, 1);
  positive(c.spawn.baseMs, 'spawn.baseMs');
  positive(c.spawn.playerServeCeilingPerSec, 'serveCeiling');
  positive(c.patience.thuongMs, 'patience');
  positive(c.patience.graceMs, 'grace');
  positive(c.inventory.bulkSize, 'bulkSize');
  positive(c.runtime.queueSeatsPerSlot, 'queueSeatsPerSlot');
  positive(c.runtime.tableSeatingMs, 'seating');
  positive(c.runtime.tableCleaningMs, 'cleaning');
  whole(c.runtime.initialEquipmentLevel, 'initialEquipmentLevel', 1);
  whole(c.runtime.initialKitchenLevel, 'initialKitchenLevel');
  whole(c.runtime.initialTableLevel, 'initialTableLevel', 1);
  for (const kind of EQUIPMENT) {
    const level = kind === 'kitchen' ? c.runtime.initialKitchenLevel : c.runtime.initialEquipmentLevel;
    if (level >= c.upgrades[kind].priceBase.length + (kind === 'kitchen' ? 0 : 1)) throw Error(`config:${kind}:initialLevel`);
    c.upgrades[kind].priceBase.forEach((price, index) => { if (kind !== 'kitchen' || index !== 0) whole(price as number, `${kind}.priceBase`); });
  }
  c.dog.levels.forEach((dog, index) => {
    if (dog.level !== index + 1) throw Error('config:dogLevelOrder');
    whole(dog.coinBase, 'dog.coinBase'); whole(Math.round(dog.coinBase * c.k.value), 'dog.scaledCost');
    whole(dog.hp, 'dog.hp', 1); whole(dog.atk, 'dog.atk', 1);
    for (const [dish, quantity] of Object.entries(dog.materials)) {
      if (!DISHES.includes(dish as Dish)) throw Error('config:dogMaterial');
      whole(quantity, `dog.materials.${dish}`, 1);
    }
  });
  if (new Set(c.league.tiers.map(tier => tier.id)).size !== c.league.tiers.length) throw Error('config:leagueIds');
  c.lifePath.forEach((row, index) => {
    if (row.id !== `LP${index}` || (index === 0 ? row.lifetimeBase !== 0 : row.lifetimeBase <= c.lifePath[index - 1].lifetimeBase)) throw Error('config:lifePathOrder');
    for (const [name, value] of Object.entries({ lifetime: row.lifetimeBase, reward: row.rewardCoinBase })) {
      whole(value, `lifePath.${name}`); whole(Math.round(value * c.k.value), `lifePath.scaled${name}`);
    }
    for (const token of row.requires ?? []) {
      const requirement = parseProgressRequirement(token, c);
      if (requirement.kind === 'level' && requirement.need >= index) throw Error('config:lifePathCycle');
    }
    for (const reward of row.extra) if (!['badgeShard', 'cosmeticToken', ...Object.keys(c.crates).map(key => `crate.${key}`)].includes(reward)) throw Error('config:lifePathReward');
    const stock: Partial<Record<Dish, number>> = {};
    let maximumCredit = Math.round(row.rewardCoinBase * c.k.value);
    for (const reward of row.extra) if (reward.startsWith('crate.')) {
      const crate = c.crates[reward.slice('crate.'.length) as keyof typeof c.crates] as Partial<Record<Dish, number>>;
      for (const dish of DISHES) stock[dish] = (stock[dish] ?? 0) + (crate[dish] ?? 0);
    }
    for (const dish of DISHES) { whole(stock[dish] ?? 0, 'lifePath.rewardStock'); maximumCredit += (stock[dish] ?? 0) * c.menu[dish].unitCost; }
    whole(maximumCredit, 'lifePath.maximumCredit');

  });
  for (const item of BUSINESS_UNLOCKS) {
    whole(c.unlocks[item].priceBase, `unlocks.${item}`); whole(Math.round(c.unlocks[item].priceBase * c.k.value), `unlocks.scaled${item}`);
    for (const token of [c.unlocks[item].gate].flat()) parseProgressRequirement(token, c);
  }
  const flyer = c.unlocks.flyer;
  whole(flyer.repBase, 'flyer.repBase'); whole(Math.round(flyer.repBase * c.k.value), 'flyer.scaledCost');
  whole(flyer.campaignMs, 'flyer.campaignMs', 1); whole(flyer.stockCap, 'flyer.stockCap', 1); whole(flyer.perShift, 'flyer.perShift', 1);
  positive(flyer.spawnIntervalMult, 'flyer.spawnIntervalMult'); parseProgressRequirement(flyer.gate, c);
  // Levels also require their predecessor: an unlock cannot depend on a level that needs it.
  const dependencies = new Map<string, string[]>(c.lifePath.map((row, index) => [row.id, [
    ...(index ? [c.lifePath[index - 1].id] : []), ...(row.requires ?? []),
  ]]));
  for (const item of BUSINESS_UNLOCKS) dependencies.set(item, [c.unlocks[item].gate].flat());
  dependencies.set('flyer', [flyer.gate]);
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (key: string) => {
    if (visited.has(key) || !dependencies.has(key)) return;
    if (visiting.has(key)) throw Error('config:progressionCycle');
    visiting.add(key);
    for (const dependency of dependencies.get(key)!) visit(dependency);
    visiting.delete(key); visited.add(key);
  };
  if (isEconomy2(c)) for (const row of c.lifePath) for (const token of row.requires ?? []) {
    const r = parseProgressRequirement(token, c);
    if (r.kind === 'equipment' || r.kind === 'stall') {
      const kinds = EQUIPMENT.filter(kind => r.kind === 'stall' ? kind === 'stall' : kind !== 'kitchen');
      dependencies.set(token, kinds.flatMap(kind => c.upgrades.lifePathGate[kind].slice(0, r.need)).filter(n => n > 0).map(n => c.lifePath[n].id));
    }
  }
  for (const key of dependencies.keys()) visit(key);
  for (const crate of Object.values(c.crates)) for (const amount of Object.values(crate)) whole(amount, 'crate');
  if (c.ledgers.countedSources.some(source => !seed.ledgers.countedSources.includes(source))) throw Error('config:countedSources');
  if (!c.upgrades.table.levels[c.runtime.initialTableLevel - 1]) throw Error('config:initialTableLevel');
  whole(c.upgrades.table.startingTables, 'startingTables', 1);
  c.upgrades.table.levels.forEach((table, index) => {
    if (table.level !== index + 1) throw Error('config:tableLevelOrder');
    whole(table.priceBase, 'table.priceBase');
  });
  if (!isSeatModel(c)) {
    whole(c.upgrades.table.maxTables, 'maxTables', c.upgrades.table.startingTables);
    const levels = c.upgrades.table.levels;
    levels.forEach((table, index) => {
      whole(table.capacity, 'table.capacity', 1);
      if (index > 0 && table.capacity <= levels[index - 1].capacity) throw Error('config:tableCapacityOrder');
    });
  }
  for (const weather of WEATHER) for (const kind of RUSH_TYPES) for (const campaign of [false, true]) {
    const interval = arrivalIntervalMs(c, weather, kind, campaign);
    whole(Math.round(interval), 'spawn.interval', 1);
    whole(Math.round(interval * (c.spawn.perCustomer ? groupLimit(c) : 1)), 'spawn.groupInterval', 1);
    if (isSeatModel(c) && Object.hasOwn(c.spawn, 'capacityDemand')) whole(Math.round(interval * (c.spawn.perCustomer ? groupLimit(c) : 1) * c.spawn.capacityDemand.maxMult), 'spawn.demandInterval', 1);
  }
  for (const [dish, stock] of Object.entries(c.inventory.startingStock)) {
    stock.forEach(n => whole(n, `startingStock.${dish}`));
    if (stock[0] > c.upgrades.stall.stockCap[c.runtime.initialEquipmentLevel - 1]) throw Error('config:initialStockCap');
  }
  for (const [name, n] of Object.entries({ start: c.glasses.start, buyCap: c.glasses.buyCap, storageCap: c.glasses.storageCap, priceBase: c.glasses.priceBase })) whole(n, `glasses.${name}`);
  whole(c.shift.startingCoinsBase, 'startingCoinsBase'); whole(c.shift.dailyEarnCapBase, 'dailyEarnCapBase');
  whole(c.inventory.bulkSize, 'bulkSize', 1);
  if (c.audio.masterGainDefault > 1) throw Error('config:audioGain');
  if (!WEATHER.some(w => c.weather[w].weight > 0) || !Object.values(c.customerTypes).some(t => t.usesTable && t.weight > 0)) throw Error('config:spawnWeights');
  whole(c.onboarding.firstShift.firstGroupSize, 'firstGroupSize', 1);
  if ('leaveProgress' in c.onboarding.loginPrompt) {
    whole(c.onboarding.loginPrompt.leaveProgress.minCompletedShifts, 'loginPrompt.minCompletedShifts', 1);
    whole(c.onboarding.loginPrompt.leaveProgress.minLifetimeEarned, 'loginPrompt.minLifetimeEarned', 1);
  }
  if ('idleToGuideMs' in c.onboarding) whole(c.onboarding.idleToGuideMs, 'onboarding.idleToGuideMs', 1);
  if ('nextGoal' in c && !(Number.isFinite(c.nextGoal.reachMult) && c.nextGoal.reachMult > 0)) throw Error('config:nextGoal.reachMult');
  const reveal: Record<string, number> = c.onboarding.featureReveal;
  for (const key of ['hudAfterShifts', 'upgradeAllAfterShifts', 'journeyAfterShifts']) if (key in reveal) whole(reveal[key], `featureReveal.${key}`);
  // The forced first guest must fit a new table; at one chair that guest's tray is one item (D14).
  const firstSeats = isSeatModel(c) ? CHAIRS_WITH_TABLE : c.upgrades.table.levels[c.runtime.initialTableLevel - 1].capacity;
  if (c.onboarding.firstShift.firstGroupSize > firstSeats || c.onboarding.firstShift.guaranteedFirstGroupWithinMs < c.runtime.tableSeatingMs ||
    isSeatModel(c) && c.onboarding.firstShift.firstOrder.length !== 1) throw Error('config:firstGroup');
  if (!DISHES.every(d => c.menu[d].unlock.kitchenLevel < c.upgrades.kitchen.priceBase.length)) throw Error('config:menuKitchenLevel');
  for (const p of [c.tip.patienceThreshold, c.demandMix.pMoi, c.demandMix.pNemGivenMoi, c.demandMix.pSecondRound]) {
    if (p < 0 || p > 1) throw Error('config:probability');
  }
  for (const w of WEATHER) for (const key of ['freshnessMult', 'patienceMult', 'spawnIntervalMult'] as const) positive(c.weather[w][key], `weather.${w}.${key}`);
  for (const values of [c.upgrades.keg.pourMs, c.upgrades.keg.pourSlots, c.upgrades.washer.washMs, c.upgrades.washer.slots, c.upgrades.stall.stockCap]) {
    values.forEach(v => positive(v, 'equipment'));
  }
  for (const values of [c.upgrades.keg.kegStorage, c.upgrades.keg.kegBatch, c.upgrades.keg.refillMs, c.upgrades.washer.slots, c.upgrades.washer.washMs]) {
    values.forEach(v => whole(v, 'equipment.batch', 1));
  }
  if (c.upgrades.keg.kegBatch.some((n, i) => n > c.upgrades.keg.kegStorage[i])) throw Error('config:kegBatchCapacity');
  for (const d of DISHES) {
    positive(c.menu[d].price, `menu.${d}.price`);
    for (const k of ['price', 'unitCost', 'bulkCost'] as const) whole(c.menu[d][k], `menu.${d}.${k}`);
    if (c.menu[d].bulkCost > c.menu[d].unitCost || c.menu[d].unitCost > c.menu[d].price) throw Error(`config:menu.${d}:costs`);
  }
  whole(c.signboard.gate.stallLevel, 'signboard.stallLevel', 1);
  if (c.signboard.gate.stallLevel > c.upgrades.stall.priceBase.length) throw Error('config:signboardGate');
  if (c.upgrades.stall.signboardGateLevel !== c.signboard.gate.stallLevel) throw Error('config:signboardGateAlias');
  whole(c.signboard.installFeeBase, 'signboard.installFee');
  whole(Math.round(c.signboard.installFeeBase * c.k.value) + Math.round(c.signboard.styles.wood.priceBase * c.k.value), 'signboard.installCost');
  for (const style of SIGN_STYLES) {
    const definition = c.signboard.styles[style];
    for (const amount of [definition.priceBase, 'repBase' in definition ? definition.repBase : 0]) {
      whole(amount, 'signboard.price'); whole(Math.round(amount * c.k.value), 'signboard.scaledPrice');
    }
    for (const weather of WEATHER) for (const rush of Object.values(c.rush).filter(r => typeof r === 'object' && 'floorMs' in r)) {
      const weights = Object.entries(c.customerTypes).filter(([, t]) => t.usesTable && t.weight > 0).map(([type, t]) => ({ type, weight: t.weight * ((c.weather[weather].customerWeightMult as Record<string, number>)[type] ?? 1) * (type === 'voi' && 'voiWeightMult' in rush ? Number(rush.voiWeightMult) : 1) * signWeightMult(definition, type) }));
      const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
      const postCap = weights.reduce((sum, entry) => sum + (entry.type === 'vip' ? 0 : entry.weight), 0);
      const capCanExclude = groupLimit(c) > c.customerTypes.vip.maxPerGroupPhase2;
      if (!Number.isFinite(total) || total <= 0 || (capCanExclude && postCap <= 0)) throw Error('config:signboardWeights');
    }
  }
  for (const amount of c.quests.loginTrackRepBase) { whole(amount, 'attendance.reward'); whole(Math.round(amount * c.k.value), 'attendance.scaledReward'); }
  dailyTargetCurve(c);
  const daily = c.quests.daily;
  if (daily.seed !== seed.quests.daily.seed || daily.count !== daily.buckets.length + daily.fixed.length || c.shift.dayRollover.tz !== seed.shift.dayRollover.tz) throw Error('config:dailyShape');
  const poolKeys = seed.quests.daily.buckets.map(b => Object.keys(b.pool).sort().join(','));
  daily.buckets.forEach((bucket, i) => {
    if (bucket.id !== seed.quests.daily.buckets[i].id || Object.keys(bucket.pool).sort().join(',') !== poolKeys[i]) throw Error('config:questPool');
    for (const [type, range] of Object.entries(bucket.pool)) {
      if (!range) continue;
      (range as number[]).forEach(n => whole(n, 'quest.target', 1));
      if (range[1] < range[0]) throw Error('config:questRange');
      whole(Math.ceil(range[1] * (type === 'earn_coins_base' ? c.k.value : 1)), 'quest.scaledTarget', 1);
    }
    if ('zeroLossWindowMs' in bucket) whole(bucket.zeroLossWindowMs!, 'quest.zeroLossWindow', 1);
  });
  daily.fixed.forEach((row, i) => {
    if (row.id !== seed.quests.daily.fixed[i].id || row.id === 'gift_3' && row.uniqueRecipients !== true) throw Error('config:questFixed');
    whole(row.target, 'quest.fixedTarget', 1);
  });
  for (const row of [...daily.buckets, ...daily.fixed]) for (const amount of [row.rewardCoinBase, row.rewardRepBase]) { whole(amount, 'quest.reward'); whole(Math.round(amount * c.k.value), 'quest.scaledReward'); }
  whole(daily.bonusAll5.flyer, 'quest.bonusFlyer'); whole(daily.bonusAll5.badgeShard, 'quest.bonusShard');
  if (daily.bonusAll5.flyer > c.unlocks.flyer.stockCap || c.unlocks.flyer.freeOnDaily5of5 !== (daily.bonusAll5.flyer > 0)) throw Error('config:questBonusCapacity');
  const seasons = c.league.seasons, epoch = Date.parse(seasons.epochUtc);
  if (!Number.isSafeInteger(epoch) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(seasons.epochUtc) || new Date(epoch).toISOString().replace('.000Z', 'Z') !== seasons.epochUtc || seasons.tz !== seed.league.seasons.tz) throw Error('config:seasonEpoch'); // config-exempt: ISO UTC date grammar and precision
  for (const kind of ['ranking', 'contest'] as const) {
    whole(seasons[kind].days, 'season.days', 1);
    const duration = seasons[kind].days * 86400000; // config-exempt: milliseconds in a VN calendar day
    whole(duration, 'season.duration', 1);
    if (!Number.isSafeInteger(epoch + duration) || !Number.isSafeInteger(epoch - duration)) throw Error('config:seasonDuration');
  }
  c.league.tiers.forEach((tier, index) => {
    whole(tier.minSeasonEarnedBase, 'league.threshold'); whole(Math.round(tier.minSeasonEarnedBase * c.k.value), 'league.scaledThreshold');
    if (index === 0 ? tier.minSeasonEarnedBase !== 0 : tier.minSeasonEarnedBase <= c.league.tiers[index - 1].minSeasonEarnedBase) throw Error('config:leagueOrder');
  });
  const shipper = c.customerTypes.shipper, grossRange = shipper.grossBase.map(n => Math.round(n * c.k.value));
  for (const n of [...shipper.orderLines, ...shipper.grossBase, ...grossRange, shipper.spawnIntervalMs, shipper.deadlineMs]) whole(n, 'shipper.range', 1);
  if (shipper.orderLines[0] > shipper.orderLines[1] || grossRange[0] > grossRange[1] || shipper.requires !== 'phone') throw Error('config:shipper');
  for (const rate of [shipper.netRate, shipper.missPenaltyRate]) if (rate < 0 || rate > 1) throw Error('config:shipperRate');
  whole(Math.round(Math.round(grossRange[1] * shipper.netRate) * rested.mult), 'shipper.maximumCredit');
  for (const weather of WEATHER) {
    positive(c.weather[weather].shipperMult, 'shipper.weather');
    whole(Math.round(shipper.spawnIntervalMs / c.weather[weather].shipperMult), 'shipper.interval', 1);
    positive(c.signboard.styles.neon.shipperMult, 'signboard.shipperMult');
    whole(Math.round(shipper.spawnIntervalMs / c.weather[weather].shipperMult / c.signboard.styles.neon.shipperMult), 'signboard.shipperInterval', 1);
  }
  for (let kitchen = c.runtime.initialKitchenLevel; kitchen < c.upgrades.kitchen.priceBase.length; kitchen++) if (!deliveryBundles(c, kitchen, grossRange).length) throw Error('config:deliveryCatalogEmpty');
  if (c.glasses.start > c.glasses.storageCap || c.glasses.buyCap > c.glasses.storageCap) throw Error('config:glasses');
  for (const [segment, max] of Object.entries(c.shift.dailyShiftCap)) {
    const free = c.entitlements.freeSessionsPerDay.bySegment[segment as keyof typeof c.shift.dailyShiftCap];
    if (!Number.isInteger(max) || max < 0 || free !== max) throw Error('config:freeShiftCaps');
  }
  if (c.entitlements.mode !== 'free' || c.entitlements.sessionPass.enabled) throw Error('config:freeOnly');
  // A legal/content hold cannot be overridden by an ordinary economy import.
  if (c.lottery.legalGate || c.risk.inspection.enabled) throw Error('config:heldFeature');
}

/** Apply Base scaling once, including numeric arrays/maps; formula strings remain inert. */
function scale(v: unknown, k: number, base = false): unknown {
  if (typeof v === 'number') return base ? Math.round(v * k) : v;
  if (Array.isArray(v)) return v.map(x => scale(x, k, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, value]) => [key, key === '_meta' ? value : scale(value, k, base || key.endsWith('Base'))]));
  return v;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

export function loadConfig(input: unknown = seed) {
  // Generation by marker: 1.x has no life-path gates, the 2.0 capacity model has no chair prices.
  const upgrades = (input as Economy)?.upgrades ?? {}, table = (upgrades as { table?: object }).table ?? {};
  const template = !Object.hasOwn(upgrades, 'lifePathGate') ? legacy : Object.hasOwn(table, 'chairPriceBase') ? seatShape(input) : capacityModel;
  shape(input, template, '', template === capacityModel);
  const raw = structuredClone(input) as Economy;
  validate(raw);
  const values = freeze(scale(raw, raw.k.value) as Economy);
  return Object.freeze({
    version: raw._meta.version, raw: freeze(raw), values,
    get(path: string): unknown {
      let value: unknown = values;
      for (const key of path.split('.')) {
        if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) throw Error(`config:missing:${path}`);
        value = (value as Record<string, unknown>)[key];
      }
      return value;
    },
  });
}
export type Config = ReturnType<typeof loadConfig>;
/** Immutable snapshot identity ignores object-key order, while array order remains meaningful. */
export const configContent = (c: Config) => JSON.stringify(c.raw, (_, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
/** The bundled registry seed: loadConfig() validated it against the seat-model shape, so its type is that shape. */
export type SeedConfig = Omit<Config, 'raw' | 'values'> & { readonly raw: typeof seed; readonly values: typeof seed };
export const config = loadConfig() as SeedConfig;
