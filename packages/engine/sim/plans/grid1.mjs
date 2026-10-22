// Literal-protocol grid 1 (review round 1 of S5): the STRUCTURE of the seat phase. Under the plan's own bot (seats and chairs first, direct leasing) the second chair lands right after
// table 4 (shift 9-15 on every set tried) unless more tables or dearer tables come first; the gate wants it at shift 40-56 with no stretch of more than 8 shifts without a purchase.
// Axes: slots of the first two places (the plan's `tableSlots`), the table ladder (tables 3-8), the chair ladder. Start wallet 300 base (750 xu, not a lever). Scales are relative to
// the bundled numbers (candidate C when this plan was written).
//   node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/grid1.mjs --out=artifacts/verification/feat-eco21-balance-pass/sweeps/literal/grid1 --pool=9
import { tables, chairs, values } from './levers.mjs';

const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = s0 => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i < 2 ? s0 : Math.max(n, s0)]));
export default {
  base: { 'shift.startingCoinsBase': 300 },
  axes: [
    { name: 'slots', values: values('slots', [4, 5, 6, 8], slots) },
    { name: 'tables 3-8 x', values: values('tables x', [1, 2, 3, 5], tables) },
    { name: 'chairs x', values: values('chairs x', [0.3, 0.6, 1], chairs) },
  ],
};
