// Polish of candidate B (plan S5): the same set with round numbers where the sweep left a rounding artefact (the location ramp has three decimals and the Locations sheet prints the
// multiplier as stored; table 8 came out as 31 300). One coordinate whose values are whole candidates, judged on both seeds.
import { readFileSync } from 'node:fs';
const b = JSON.parse(readFileSync(new URL('./candidate-b.json', import.meta.url), 'utf8'));
const ramp = steps => Object.fromEntries(steps.map((m, i) => [`locations.list.${i + 1}.mult`, m]));
export default {
  base: b,
  coordinates: [{
    name: 'polish',
    values: [
      { label: 'B', patch: {} },
      { label: 'ramp 2dp near B', patch: ramp([1.02, 1.04, 1.06, 1.08, 1.09, 1.11, 1.13, 1.15]) },
      { label: 'ramp 2dp near B + table 8 31250', patch: { ...ramp([1.02, 1.04, 1.06, 1.08, 1.09, 1.11, 1.13, 1.15]), 'upgrades.table.tablePriceBase.6': 31250 } },
      { label: 'B + table 8 31250', patch: { 'upgrades.table.tablePriceBase.6': 31250 } },
      { label: 'ramp 0.02 to 1.15', patch: ramp([1.02, 1.04, 1.06, 1.08, 1.10, 1.12, 1.14, 1.15]) },
      { label: 'ramp 0.0175', patch: ramp([1.02, 1.04, 1.05, 1.07, 1.09, 1.11, 1.12, 1.14]) },
    ],
  }],
};
