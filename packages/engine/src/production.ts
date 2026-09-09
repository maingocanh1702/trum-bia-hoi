import type { Config } from './config';
import type { World } from './types';

/** Beer already on a tray lives outside the tank, so a large table can assemble across batches. */
export function beerStatus(w: World, c: Config) {
  const keg = c.values.upgrades.keg, level = w.equipment.keg - 1;
  const reserved = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state))
    .flatMap(t => t.order!.items).filter(i => i.dish === 'bia' && i.glassId && ['preparing', 'ready'].includes(i.state)).length;
  const available = w.beer?.ready ?? 0, batch = w.beer?.batch;
  const pouring = w.tables.flatMap(t => t.order?.items ?? []).filter(i => i.dish === 'bia' && i.state === 'preparing').length;
  return { pouring, tapSlots: keg.pourSlots[level], pourMs: keg.pourMs[level], enabled: keg.refillEnabled, available, reserved, stored: keg.refillEnabled ? available : reserved,
    capacity: keg.refillEnabled ? keg.kegStorage[level] : keg.pourSlots[level],
    batchSize: keg.refillEnabled ? keg.kegBatch[level] : keg.pourSlots[level],
    durationMs: keg.refillEnabled ? keg.refillMs[level] : keg.pourMs[level],
    busy: batch?.quantity ?? 0, remainingMs: batch ? Math.max(0, batch.readyAt - w.now) : 0,
    progress: batch ? Math.min(1, Math.max(0, (w.now - batch.startedAt) / (batch.readyAt - batch.startedAt))) : 0 };
}

export function washerStatus(w: World, c: Config) {
  const washing = w.glasses.filter(g => g.state === 'washing'), first = washing[0];
  return { clean: w.glasses.filter(g => g.state === 'clean').length, capacity: w.glasses.length,
    queued: w.glasses.filter(g => g.state === 'dirty').length, busy: washing.length,
    batchSize: c.values.upgrades.washer.slots[w.equipment.washer - 1],
    durationMs: c.values.upgrades.washer.washMs[w.equipment.washer - 1],
    remainingMs: first?.readyAt == null ? 0 : Math.max(0, first.readyAt - w.now),
    progress: first?.readyAt == null || first.startedAt == null ? undefined : Math.min(1, Math.max(0, (w.now - first.startedAt) / (first.readyAt - first.startedAt))) };
}
