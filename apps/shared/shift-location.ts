import type { Config, World } from '../../packages/engine/src';

/** Presentation only: existing lease events bind a book to its shift, not a later move. */
export function shiftLocationReport(w: World, config: Config) {
  const shift = w.shift;
  if (!shift || shift.configVersion !== config.version) return null;
  const opened = w.events.findIndex(e => e.type === 'shift_opened' && e.data.shiftId === shift.id);
  if (opened < 0) return null; // Legacy/missing provenance must not invent a historical location.
  let prior;
  for (let i = opened - 1; i >= 0; i--) {
    if (['lease_started', 'lease_left', 'lease_expired'].includes(w.events[i].type)) { prior = w.events[i]; break; }
  }
  const fallback = config.values.locations.fallback;
  const ids = [prior?.type === 'lease_started' ? String(prior.data.locationId) : fallback];
  for (let i = opened + 1; i < w.events.length; i++) {
    const e = w.events[i];
    if (e.type === 'shift_closed' && e.data.shiftId === shift.id) break;
    // Renting/moving is allowed only at rest; calendar expiry can still occur during this shift.
    if (e.type === 'lease_expired' && ids.at(-1) !== fallback) ids.push(fallback);
  }
  const locations = ids.map(id => config.values.locations.list.find(row => row.id === id));
  if (locations.some(row => !row)) return null;
  return { shiftId: shift.id, locations: locations.map(row => ({ id: row!.id, mult: row!.mult })) };
}
