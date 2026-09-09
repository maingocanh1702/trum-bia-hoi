import type { Config, SignStyle } from './config';
import type { WorldView } from './types';

export function signboardStyle(w: WorldView, c: Config) {
  return w.signStyle && w.unlocks.includes('signboard') ? c.values.signboard.styles[w.signStyle] : undefined;
}
/** Null means initial installation; styles are owned once and may then be equipped free. */
export function signboardQuote(w: WorldView, c: Config, style: SignStyle | null = null) {
  const installed = w.unlocks.includes('signboard'), target = style ?? 'wood', definition = c.values.signboard.styles[target];
  const owned = installed && (target === 'wood' || w.unlocks.includes(`signboard:${target}`));
  const cost = style === null ? c.values.signboard.installFeeBase + definition.priceBase : owned ? 0 : definition.priceBase;
  const requiredRep = !owned && 'repBase' in definition ? definition.repBase : 0;
  const requiredStall = c.values.signboard.gate.stallLevel, selected = w.signStyle === target;
  const safe = [cost, w.coins, ...(w.shift && w.phase !== 'resting' ? [w.shift.stats.spent + cost] : [])].every(n => Number.isSafeInteger(n) && n >= 0);
  const reason = style === null && installed ? 'signboardInstalled' : style !== null && !installed ? 'signboardRequired' : style === null && w.equipment.stall < requiredStall ? 'signboardGate' : selected ? 'signboardSelected' : w.reputation < requiredRep ? 'reputationRequired' : !safe || w.coins < cost ? 'notEnoughCoins' : null;
  return { installed, target, owned, selected, cost, requiredRep, requiredStall, reason, ok: reason === null };
}
