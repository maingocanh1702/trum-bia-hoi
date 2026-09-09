import type { Config } from './config';
import { requirementStatus } from './progression';
import type { WorldView } from './types';

/** One quote feeds buttons and commands; stock ownership outlives consumption. */
export function flyerQuote(w: WorldView, c: Config) {
  const definition = c.values.unlocks.flyer, stock = w.flyers ?? 0, cost = definition.repBase;
  const used = w.shift?.flyersUsed ?? 0, campaign = w.shift?.flyer;
  const requirement = requirementStatus(w, c, definition.gate);
  const safeStock = Number.isSafeInteger(stock) && stock >= 0 && stock <= definition.stockCap;
  const safeRep = Number.isSafeInteger(w.reputation) && w.reputation >= cost && (!w.shift || w.phase === 'resting' || Number.isSafeInteger(w.shift.stats.rep - cost));
  const buyReason = !requirement.met ? 'featureLocked' : !safeStock ? 'flyerStockInvalid' : stock >= definition.stockCap ? 'flyerStockFull' : !safeRep ? 'reputationRequired' : null;
  const useReason = !w.active || w.phase !== 'open' || !w.shift ? 'flyerOpenShift' : !requirement.met ? 'featureLocked' : campaign ? 'flyerActive' : !Number.isSafeInteger(used) || used < 0 || used >= definition.perShift ? 'flyerUsed' : !safeStock || stock === 0 ? 'flyerEmpty' : !Number.isSafeInteger(w.now + definition.campaignMs) ? 'flyerClock' : null;
  return { stock, cost, used, requirement, buyReason, useReason, remainingMs: campaign ? Math.max(0, campaign.end - w.now) : 0 };
}
