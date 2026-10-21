import type { Economy } from '../../src';

/**
 * D8 (plan S5): the first `shift.noCooldownFirstShifts` shifts of a save open without the 30-minute stamina cooldown. Its own subject is tested in
 * no-cooldown.test.ts; a suite whose subject is the cooldown itself (a refused opening, offline rest, a failed pin) calls this on the config it builds,
 * so the second shift still asks for the stamina it was written for. 0 switches the allowance off; a pin without the key is untouched.
 */
export function fullCooldown<T extends Economy>(raw: T): T {
  const shift = raw.shift as { noCooldownFirstShifts?: number };
  if (shift.noCooldownFirstShifts !== undefined) shift.noCooldownFirstShifts = 0;
  return raw;
}
