import { DISHES, EQUIPMENT, parseProgressRequirement, type BusinessUnlock, type Config, type Dish, type ProgressRequirement } from './config';
import { stockGiftQuote } from './rules';
import type { World } from './types';

export interface RequirementStatus { kind: 'lifetime' | ProgressRequirement['kind']; met: boolean; have?: number; need?: number; target?: string }
export function requirementStatus(w: World, c: Config, token: string): RequirementStatus {
  const r = parseProgressRequirement(token, c.values);
  if (r.kind === 'owned') return { kind: r.kind, target: r.target, met: r.target === 'dog' ? w.dogLevel > 0 : w.unlocks.includes(r.target) };
  if (r.kind === 'peak') return { kind: r.kind, target: r.target, met: c.values.league.tiers.findIndex(t => t.id === w.peakLeague) >= c.values.league.tiers.findIndex(t => t.id === r.target) };
  // The four core devices share five levels; kitchen's separate paid ladder ends at four.
  const have = r.kind === 'level' ? w.lifePath : r.kind === 'seats' ? w.tables.reduce((sum, table) => sum + table.capacity, 0) : r.kind === 'stall' ? w.equipment.stall : Math.min(...EQUIPMENT.filter(kind => kind !== 'kitchen').map(kind => w.equipment[kind]));
  return { kind: r.kind, have, need: r.need, met: r.exact ? have === r.need : have >= r.need };
}
/** Reached milestones stay reached; unclaimed rewards never hold feature access back. */
export function lifePathStatus(w: World, c: Config) {
  let level = w.lifePath;
  const rows = c.values.lifePath.map((definition, index) => {
    const requirements: RequirementStatus[] = [
      { kind: 'lifetime', have: w.lifetimeEarned, need: definition.lifetimeBase, met: w.lifetimeEarned >= definition.lifetimeBase },
      ...(definition.requires ?? []).map(token => requirementStatus({ ...w, lifePath: level }, c, token)),
    ];
    if (index === level + 1 && requirements.every(r => r.met)) level = index;
    const reached = index <= level, claimed = index === 0 || w.claimedLifePaths.includes(index);
    return { ...definition, index, requirements, reached, claimed, claimable: reached && !claimed };
  });
  return { level, rows };
}
export function unlockQuote(w: World, c: Config, item: BusinessUnlock) {
  const definition = c.values.unlocks[item];
  const requirements = [definition.gate].flat().map(token => requirementStatus(w, c, token));
  const owned = w.unlocks.includes(item), cost = definition.priceBase;
  return { owned, cost, requirements, ok: !owned && w.coins >= cost && requirements.every(r => r.met) };
}
export function lifePathRewardQuote(w: World, c: Config, level: number) {
  const row = c.values.lifePath[level];
  if (!row || level <= 0 || level > w.lifePath || w.claimedLifePaths.includes(level)) return null;
  const stock: Partial<Record<Dish, number>> = {};
  let badgeShards = 0, cosmeticTokens = 0;
  for (const token of row.extra) {
    if (token === 'badgeShard') badgeShards++;
    else if (token === 'cosmeticToken') cosmeticTokens++;
    else {
      const crate = c.values.crates[token.slice('crate.'.length) as keyof typeof c.values.crates] as Partial<Record<Dish, number>>;
      for (const dish of DISHES) stock[dish] = (stock[dish] ?? 0) + (crate[dish] ?? 0);
    }
  }
  const gift = stockGiftQuote(w, c, stock), amount = row.rewardCoinBase + gift.overflow;
  const safe = [amount, w.coins + amount, w.badgeShards + badgeShards, w.cosmeticTokens + cosmeticTokens, ...DISHES.map(d => w.inventory[d] + gift.added[d])].every(n => Number.isSafeInteger(n) && n >= 0);
  return { coin: row.rewardCoinBase, stock, ...gift, amount, badgeShards, cosmeticTokens, safe };
}
