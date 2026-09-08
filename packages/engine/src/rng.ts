/** Mulberry32. Integer operations are algorithm constants, not economy. */
export function random(state: { rng: number }): number {
  state.rng = (state.rng + 0x6D2B79F5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
export function integer(state: { rng: number }, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1));
}
export function weighted<T extends string>(state: { rng: number }, rows: [T, number][]): T {
  const sum = rows.reduce((s, [, w]) => s + w, 0);
  if (!(sum > 0)) throw Error('rng:empty-weight');
  let roll = random(state) * sum;
  for (const [key, weight] of rows) { roll -= weight; if (roll < 0) return key; }
  return rows[rows.length - 1][0];
}
