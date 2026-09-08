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
  const scan = (v: unknown, path: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => scan(x, `${path}.${i}`));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => scan(x, `${path}.${k}`));
    if (typeof v === 'number' && v < 0 && !/reputation|reputationDelta|ignoreRepBase/.test(path)) throw Error(`config:${path}:negative`);
  };
  scan(c, '');
  if (!c._meta.version.trim() || c.k.value < c.k.band[0] || c.k.value > c.k.band[1]) throw Error('config:k');
  positive(c.k.anchorValuePerServe, 'anchor');
  positive(c.shift.durationMs, 'shift.durationMs');
  positive(c.spawn.baseMs, 'spawn.baseMs');
  positive(c.spawn.playerServeCeilingPerSec, 'serveCeiling');
  positive(c.patience.thuongMs, 'patience');
  positive(c.patience.graceMs, 'grace');
  positive(c.inventory.bulkSize, 'bulkSize');
  positive(c.runtime.queueSeatsPerSlot, 'queueSeatsPerSlot');
  positive(c.runtime.tableSeatingMs, 'seating');
  positive(c.runtime.tableCleaningMs, 'cleaning');
  for (const p of [c.tip.patienceThreshold, c.demandMix.pMoi, c.demandMix.pNemGivenMoi, c.demandMix.pSecondRound]) {
    if (p < 0 || p > 1) throw Error('config:probability');
  }
  for (const w of WEATHER) for (const key of ['freshnessMult', 'patienceMult', 'spawnIntervalMult'] as const) positive(c.weather[w][key], `weather.${w}.${key}`);
  for (const values of [c.upgrades.keg.pourMs, c.upgrades.keg.pourSlots, c.upgrades.washer.washMs, c.upgrades.washer.slots, c.upgrades.stall.stockCap]) {
    values.forEach(v => positive(v, 'equipment'));
  }
  for (const d of DISHES) {
    positive(c.menu[d].price, `menu.${d}.price`);
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
