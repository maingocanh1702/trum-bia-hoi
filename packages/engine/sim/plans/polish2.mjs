// Polish 2 (plan S5): round (two-decimal) location ramps around candidate B, whose ramp has three decimals. The first four round ramps all lost two seed-99 cells
// (the purchase rhythm and the days 8-14 door): the trajectories are chaotic in one coin, so this tries the floor and the ceiling of each step.
import { readFileSync } from 'node:fs';
const b = JSON.parse(readFileSync(new URL('./candidate-b.json', import.meta.url), 'utf8'));
const exact = [1.019, 1.038, 1.056, 1.075, 1.094, 1.112, 1.131, 1.15];
const floor = exact.map(m => Math.floor(m * 100) / 100), ceil = exact.map(m => Math.ceil(m * 100) / 100);
const combos = [];
let state = 20261020;
const random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
const seen = new Set();
while (combos.length < 16) {
  const steps = exact.map((_, i) => random() < 0.5 ? floor[i] : ceil[i]);
  const key = steps.join();
  if (seen.has(key) || steps.some((m, i) => i && m < steps[i - 1])) continue; // a ramp never goes down
  seen.add(key); combos.push(steps);
}
export default {
  base: b,
  coordinates: [{
    name: 'round ramps',
    values: combos.map(steps => ({ label: steps.join(' '), patch: Object.fromEntries(steps.map((m, i) => [`locations.list.${i + 1}.mult`, m])) })),
  }],
};
