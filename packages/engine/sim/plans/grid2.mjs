// Literal-protocol grid 2 (review round 1 of S5): grid 1 showed that with the plan's strict seat-saving bot the first second chair lands right after the LAST table the first place
// allows, and that every purchase before it must come within 8 shifts of the one before (phone is the only filler): chair 1 at shift 40-56 asks for about 6-7 table purchases before it,
// i.e. 6-7 table slots in the first places, a table ladder in which each rung costs about 7-8 shifts of the income at that size (x2.5-4 the sealed ladder), and chairs that are
// cheap once the tables are done (so that LP2 follows by shift 48). Axes: slots of the first places, table ladder, chair ladder, lease length. Start wallet 300 base.
//   node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/grid2.mjs --out=artifacts/verification/feat-eco21-balance-pass/sweeps/literal/grid2 --pool=5
import { tables, chairs, values } from './levers.mjs';

const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = s0 => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i < 2 ? s0 : Math.max(n, s0)]));
export default {
  base: { 'shift.startingCoinsBase': 300 },
  axes: [
    { name: 'slots', values: values('slots', [6, 7], slots) },
    { name: 'tables 3-8 x', values: values('tables x', [2.5, 3, 4], tables) },
    { name: 'chairs x', values: values('chairs x', [0.3, 0.45, 0.6], chairs) },
    { name: 'lease days', values: values('lease', [2, 3], v => ({ 'locations.leaseDays': v })) },
  ],
};
