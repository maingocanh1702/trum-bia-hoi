import type { Economy } from '../../src';

/**
 * Capacity demand (plan S3, D19) thins the early game: one table is offered a guest a quarter as often. Its own subject is tested in
 * capacity-demand.test.ts; a suite about something else (weather and rush cadence, flyers, grace, close fees, tray mix ...) calls this on the
 * config it builds, so it keeps the guests per minute it was written for. maxMult 1 switches the scaling off; a pin without the key is untouched.
 */
export function steadyDemand<T extends Economy>(raw: T): T {
  const spawn = raw.spawn as { capacityDemand?: { maxMult: number } };
  if (spawn.capacityDemand) spawn.capacityDemand.maxMult = 1;
  return raw;
}
