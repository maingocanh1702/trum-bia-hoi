import { isSeatModel, type Config } from './config';
import type { WorldView } from './types';

/**
 * Instant pour (plan S2, FEEDBACK II.1): from rules 28 a ready beer and a clean glass are a ready beer in the same tick, so the tap
 * queue (`pourSlots`, `pourMs`) is off the serving path; both keys stay in the config for every older pin and replay. The gate is the
 * pinned config, so a read-only consumer (the UI) can tell which pour it is looking at: a seat-model snapshot only ever runs at rules >= 28
 * (`replay()` refuses older entries for one); a capacity pin may run at rules 28 and keeps its tap until the opening that adopts the seat
 * model; a seat snapshot with the keg refill switched off (`refillEnabled`, Tier B) has no reserve to pour from and keeps the tap too.
 */
export const instantPour = (c: Config) => c.values.upgrades.keg.refillEnabled && isSeatModel(c.values);

/** Beer already on a tray lives outside the tank, so a large table can assemble across batches. */
export function beerStatus(w: WorldView, c: Config) {
  const keg = c.values.upgrades.keg, level = w.equipment.keg - 1;
  const reserved = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state))
    .flatMap(t => t.order!.items).filter(i => i.dish === 'bia' && i.glassId && ['preparing', 'ready'].includes(i.state)).length;
  const available = w.beer?.ready ?? 0, batch = w.beer?.batch;
  const pouring = w.tables.flatMap(t => t.order?.items ?? []).filter(i => i.dish === 'bia' && i.state === 'preparing').length;
  const instant = instantPour(c), stored = keg.refillEnabled ? available : reserved;
  // Instant pour: a guest gets as many beers as there are both ready beers and clean glasses (what "rót sẵn" must say).
  const serveNow = instant ? Math.min(available, w.glasses.filter(g => g.state === 'clean').length) : stored;
  return { pouring, tapSlots: keg.pourSlots[level], pourMs: keg.pourMs[level], enabled: keg.refillEnabled, instant, serveNow, available, reserved, stored,
    capacity: keg.refillEnabled ? keg.kegStorage[level] : keg.pourSlots[level],
    batchSize: keg.refillEnabled ? keg.kegBatch[level] : keg.pourSlots[level],
    durationMs: keg.refillEnabled ? keg.refillMs[level] : keg.pourMs[level],
    busy: batch?.quantity ?? 0, remainingMs: batch ? Math.max(0, batch.readyAt - w.now) : 0,
    progress: batch ? Math.min(1, Math.max(0, (w.now - batch.startedAt) / (batch.readyAt - batch.startedAt))) : 0 };
}

export function washerStatus(w: WorldView, c: Config) {
  const washing = w.glasses.filter(g => g.state === 'washing'), first = washing[0];
  return { clean: w.glasses.filter(g => g.state === 'clean').length, capacity: w.glasses.length,
    queued: w.glasses.filter(g => g.state === 'dirty').length, busy: washing.length,
    batchSize: c.values.upgrades.washer.slots[w.equipment.washer - 1],
    durationMs: c.values.upgrades.washer.washMs[w.equipment.washer - 1],
    remainingMs: first?.readyAt == null ? 0 : Math.max(0, first.readyAt - w.now),
    progress: first?.readyAt == null || first.startedAt == null ? undefined : Math.min(1, Math.max(0, (w.now - first.startedAt) / (first.readyAt - first.startedAt))) };
}
