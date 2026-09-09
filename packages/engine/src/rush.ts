import { isEconomy2, type Config } from './config';
import { integer, seededRng } from './rng';
import type { DomainEvent, Shift } from './types';

/** Independent schedule RNG: changing the layout cannot consume customer rolls. */
export function planRushes(c: Config, locationId: string, shiftId: string, day: string, now: number, lifePath = 0) {
  const { schedule, light, heavy } = c.values.rush, count = schedule.perShift;
  const seed = JSON.stringify([locationId, shiftId, day]);
  if (schedule.seed !== 'locationId+shiftId+dayBucket' || !Number.isSafeInteger(now + c.values.shift.durationMs)) return null;
  if (count > 10000) return null; // config-exempt: untrusted snapshot allocation bound, not gameplay tuning
  const firstMs = Math.max(schedule.noRushFirstMs, schedule.warningMs);
  const lightOnly = isEconomy2(c.values) && lifePath < c.values.rush.schedule.heavyFromLifePath;
  const maximumMs = lightOnly ? count * light.durationMs : Math.floor(count / 2) * (light.durationMs + heavy.durationMs) + count % 2 * Math.max(light.durationMs, heavy.durationMs);
  const minimumMs = firstMs + maximumMs + Math.max(0, count - 1) * schedule.warningMs;
  if (count && (!Number.isSafeInteger(minimumMs) || minimumMs > c.values.shift.durationMs)) return null;
  const rng = seededRng(seed);
  const pool: ('light' | 'heavy')[] = lightOnly ? ['light'] : ['light', 'heavy'], offset = integer(rng, 0, pool.length - 1);
  const kinds = Array.from({ length: count }, (_, i) => pool[(i + offset) % pool.length]);
  const totalMs = kinds.reduce((sum, kind) => sum + (kind === 'light' ? light : heavy).durationMs, 0);
  const slack = c.values.shift.durationMs - firstMs - totalMs - Math.max(0, count - 1) * schedule.warningMs;
  if (count && (!Number.isSafeInteger(slack) || slack < 0)) return null;
  for (let i = kinds.length - 1; i > 0; i--) { const j = integer(rng, 0, i); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const cuts = Array.from({ length: count }, () => integer(rng, 0, slack)).sort((a, b) => a - b);
  let cursor = now + firstMs;
  const rushes: Shift['rushes'] = kinds.map((kind, i) => {
    const start = cursor + cuts[i] - (cuts[i - 1] ?? 0), end = start + c.values.rush[kind].durationMs;
    cursor = end + schedule.warningMs;
    return { kind, start, end };
  });
  return { seed, rushes };
}

/** One bounded event interval owns a rush report; mirrored departure events count once. */
export function summarizeRush(events: readonly DomainEvent[], from: number) {
  let arrived = 0, rejected = 0, served = 0, lost = 0, payment = 0, tips = 0, revenue = 0, stale = 0;
  for (let i = from; i < events.length; i++) {
    const { type, data } = events[i];
    if (type === 'customer_spawned') arrived += Number(data.size);
    else if (type === 'queue_overflow') { arrived += Number(data.size); rejected += Number(data.size); }
    else if (type === 'customer_served') { served++; payment += Number(data.payment); tips += Number(data.tip); if (data.stale) stale++; }
    else if (type === 'order_served') revenue += Number(data.amount);
    else if (type === 'order_expired' || type === 'customer_left' && data.reason === 'queue') lost += Number(data.count);
  }
  return { arrived, rejected, served, lost, payment, tips, revenue, stale, staleRate: served ? stale / served : 0 };
}
