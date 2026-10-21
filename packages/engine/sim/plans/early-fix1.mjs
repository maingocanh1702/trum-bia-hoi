// Early-game fine grid (review round 1 of S5): around a designed ladder (autopilot-logs/scratch/solve-ladder.mts: every rung priced so that the strict seat-saving bot buys its table at a
// target shift) the rungs 5-8 are tried on both seeds together, because one rung's price is a cliff for one seed and not for the other (a purchase falls to the next shift when the
// wallet is a few coins short) and the purchase gap needs BOTH seeds to land within 8 shifts of the last purchase.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/early-fix1.mjs --out=<dir> --days=12 --shift1=0 --skip-standard --seeds=42,99 --pool=10
//        --gates=table4,chair1,lv2,lp1+2,lp3+4,gap,door.shifts1-24
import { readFileSync } from 'node:fs';
import { values } from './levers.mjs';

const base = { 'shift.startingCoinsBase': 300, ...JSON.parse(readFileSync(process.env.BASE_FILE, 'utf8')) };
base['shift.startingCoinsBase'] = 300;
const at = (obj, path) => obj[path];
const around = (name, i, list) => ({ name, values: values(name, list, v => ({ [`upgrades.table.tablePriceBase.${i}`]: v })) });
const mid = i => at(base, `upgrades.table.tablePriceBase.${i}`);
const spread = (i, deltas) => deltas.map(d => Math.round((mid(i) + d) / 100) * 100);
export default { base, axes: [
  around('table 5', 3, spread(3, [-400, 0, 400])),
  around('table 6', 4, spread(4, [-1000, -700, -400, 0])),
  around('table 7', 5, spread(5, [-300, 0, 700, 1300, 1900])),
  around('table 8', 6, spread(6, [0, 700, 1300])),
] };
