// The designed ladder ended with tables 7 and 8 at the same price (the solver found no difference worth a coin): a ladder in which the last rung costs the same as the one before is a
// flat spot a reader will ask about, so the last rung is tried a little dearer, on both seeds, with every row judged.
//   BASE_FILE=<patch.json> node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/final-t8.mjs --out=<dir> --seeds=42,99 --pool=8 --known-red=shift1.wallet
import { readFileSync } from 'node:fs';
import { values } from './levers.mjs';

const base = { 'shift.startingCoinsBase': 300, ...JSON.parse(readFileSync(process.env.BASE_FILE, 'utf8')) };
export default { base, axes: [
  { name: 'table 8', values: values('t8', [16000, 16500, 17000, 18000], v => ({ 'upgrades.table.tablePriceBase.6': v })) },
] };
