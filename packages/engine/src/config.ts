import seed from '../../../docs/config/economy.tbh.json';

export type Economy = typeof seed;
export type Dish = keyof Economy['menu'];
export type Equipment = 'keg' | 'washer' | 'cooler' | 'stall' | 'kitchen';
export type CustomerType = keyof Economy['customerTypes'];
export type SeatedType = Exclude<CustomerType, 'shipper'>;
export type Weather = 'sunny' | 'hot' | 'humid' | 'rain' | 'cold';
export type Rush = 'none' | 'peak' | 'light' | 'heavy' | 'lunch_light' | 'football';
export const DISHES = Object.keys(seed.menu) as Dish[];
export const EQUIPMENT: Equipment[] = ['keg', 'washer', 'cooler', 'stall', 'kitchen'];
export const WEATHER: Weather[] = ['sunny', 'hot', 'humid', 'rain', 'cold'];

/** Complete snapshots only: a partial or malformed config must never become live. */
function shape(value: unknown, expected: unknown, path: string): void {
  if (expected === null) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) throw Error(`config:${path}`);
  } else if (Array.isArray(expected)) {
    if (!Array.isArray(value) || value.length !== expected.length) throw Error(`config:${path}:array`);
    expected.forEach((v, i) => shape(value[i], v, `${path}.${i}`));
  } else if (typeof expected === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`config:${path}:object`);
    const e = expected as Record<string, unknown>, v = value as Record<string, unknown>;
    if (Object.keys(e).some(k => !(k in v)) || Object.keys(v).some(k => !(k in e))) throw Error(`config:${path}:keys`);
    for (const k of Object.keys(e)) shape(v[k], e[k], path ? `${path}.${k}` : k);
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
  if (!c._meta.version.trim() || c.k.value < c.k.band[0] || c.k.value > c.k.band[1]) throw Error('config:k');
  positive(c.k.anchorValuePerServe, 'anchor');
  positive(c.shift.durationMs, 'shift.durationMs');
  const rested = c.shift.wellRested;
  whole(rested.durationMs, 'wellRested.durationMs', 1);
  if (rested.mult < 1 || !Number.isSafeInteger(rested.requiresRestHours * 3600000)) throw Error('config:wellRested'); // config-exempt: hours to milliseconds
  if (c.tip.wellRestedMult !== rested.mult || c.tip.wellRestedDurationMs !== rested.durationMs || c.tip.wellRestedKeyedBy !== 'open-day') throw Error('config:wellRestedAliases');
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
  const initialTable = c.upgrades.table.levels[c.runtime.initialTableLevel - 1];
  if (!initialTable) throw Error('config:initialTableLevel');
  whole(c.upgrades.table.startingTables, 'startingTables', 1);
  whole(c.upgrades.table.maxTables, 'maxTables', c.upgrades.table.startingTables);
  c.upgrades.table.levels.forEach((table, index) => {
    if (table.level !== index + 1) throw Error('config:tableLevelOrder');
    whole(table.capacity, 'table.capacity', 1); whole(table.priceBase, 'table.priceBase');
    if (index > 0 && table.capacity <= c.upgrades.table.levels[index - 1].capacity) throw Error('config:tableCapacityOrder');
  });
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
  if (c.onboarding.firstShift.firstGroupSize > initialTable.capacity || c.onboarding.firstShift.guaranteedFirstGroupWithinMs < c.runtime.tableSeatingMs) throw Error('config:firstGroup');
  if (!DISHES.every(d => c.menu[d].unlock.kitchenLevel < c.upgrades.kitchen.priceBase.length)) throw Error('config:menuKitchenLevel');
  for (const p of [c.tip.patienceThreshold, c.demandMix.pMoi, c.demandMix.pNemGivenMoi, c.demandMix.pSecondRound]) {
    if (p < 0 || p > 1) throw Error('config:probability');
  }
  for (const w of WEATHER) for (const key of ['freshnessMult', 'patienceMult', 'spawnIntervalMult'] as const) positive(c.weather[w][key], `weather.${w}.${key}`);
  for (const values of [c.upgrades.keg.pourMs, c.upgrades.keg.pourSlots, c.upgrades.washer.washMs, c.upgrades.washer.slots, c.upgrades.stall.stockCap]) {
    values.forEach(v => positive(v, 'equipment'));
  }
  for (const d of DISHES) {
    positive(c.menu[d].price, `menu.${d}.price`);
    for (const k of ['price', 'unitCost', 'bulkCost'] as const) whole(c.menu[d][k], `menu.${d}.${k}`);
    if (c.menu[d].bulkCost > c.menu[d].unitCost || c.menu[d].unitCost > c.menu[d].price) throw Error(`config:menu.${d}:costs`);
  }
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
  shape(input, seed, '');
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
export const config = loadConfig();
