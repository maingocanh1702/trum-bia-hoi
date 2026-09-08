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

/** Final dish prices; only the gross range supplied by the caller is Base-scaled. */
export function deliveryBundles(c: Economy, kitchen: number, grossRange: readonly number[]) {
  const dishes = DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= kitchen);
  const bundles: { lines: { dish: Dish; quantity: number }[]; gross: number }[] = [];
  const lines: { dish: Dish; quantity: number }[] = [];
  let work = 0;
  const walk = (index: number, remaining: number, gross: number) => {
    // config-exempt: CPU/memory ceiling for untrusted configuration validation, not game tuning.
    if (++work > 100000) throw Error('config:deliveryCatalogTooLarge');
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
  | { kind: 'seats' | 'equipment' | 'stall' | 'level'; need: number; exact: boolean }
  | { kind: 'owned'; target: string }
  | { kind: 'peak'; target: string };
/** Closed config grammar; unknown tokens never become an unlocked prerequisite. */
export function parseProgressRequirement(token: string, c: Economy): ProgressRequirement {
  const seats = /^(\d+) seats$/.exec(token), gear = /^(equipment|stall)(>=|=)(\d+)$/.exec(token);
  if (seats || gear) {
    const need = Number(seats?.[1] ?? gear![3]);
    if (!Number.isSafeInteger(need) || need < 1) throw Error('config:progressRequirementNumber');
    return { kind: seats ? 'seats' : gear![1] as 'equipment' | 'stall', need, exact: gear?.[2] === '=' };
  }
  const level = c.lifePath.findIndex(row => row.id === token);
  if (level >= 0) return { kind: 'level', need: level, exact: false };
  if (['dog', 'phone', 'qr', 'flyer', 'signboard'].includes(token)) return { kind: 'owned', target: token };
  if (token.startsWith('peak:') && c.league.tiers.some(tier => tier.id === token.slice('peak:'.length))) return { kind: 'peak', target: token.slice('peak:'.length) };
  throw Error(`config:progressRequirement:${token}`);
}

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
  // Levels also require their predecessor: an unlock cannot depend on a level that needs it.
  const dependencies = new Map<string, string[]>(c.lifePath.map((row, index) => [row.id, [
    ...(index ? [c.lifePath[index - 1].id] : []), ...(row.requires ?? []),
  ]]));
  for (const item of BUSINESS_UNLOCKS) dependencies.set(item, [c.unlocks[item].gate].flat());
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (key: string) => {
    if (visited.has(key) || !dependencies.has(key)) return;
    if (visiting.has(key)) throw Error('config:progressionCycle');
    visiting.add(key);
    for (const dependency of dependencies.get(key)!) visit(dependency);
    visiting.delete(key); visited.add(key);
  };
  for (const key of dependencies.keys()) visit(key);
  for (const crate of Object.values(c.crates)) for (const amount of Object.values(crate)) whole(amount, 'crate');
  if (c.ledgers.countedSources.some(source => !seed.ledgers.countedSources.includes(source))) throw Error('config:countedSources');
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
      const capCanExclude = c.upgrades.table.levels.some(t => t.capacity > c.customerTypes.vip.maxPerGroupPhase2);
      if (!Number.isFinite(total) || total <= 0 || (capCanExclude && postCap <= 0)) throw Error('config:signboardWeights');
    }
  }
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
