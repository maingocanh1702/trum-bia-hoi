// Literal-protocol grid 3 (review round 1 of S5): grid 2 had slots 6-7 with dear tables and chairs at x0.3-x0.6 of the sealed ladder, and LP2 / Lv2 came late because the chair
// phase after the last table was still long. The structure the strict seat-saving bot needs: slow, dear tables (each rung about 7-8 shifts of the income at that size), then chairs
// that cost almost nothing next to that income (all bought within a shift or two of the last table), then the devices at once. Axes: slots, table ladder, chair ladder, lease days.
//   node --import tsx packages/engine/sim/balance-grid.ts --plan=packages/engine/sim/plans/grid3.mjs --out=artifacts/verification/feat-eco21-balance-pass/sweeps/literal/grid3 --pool=5
import { tables, chairs, values } from './levers.mjs';

const W9_SLOTS = [4, 4, 5, 6, 6, 7, 8, 8, 8];
const slots = s0 => Object.fromEntries(W9_SLOTS.map((n, i) => [`locations.list.${i}.tableSlots`, i < 2 ? s0 : Math.max(n, s0)]));
export default {
  base: { 'shift.startingCoinsBase': 300 },
  axes: [
    { name: 'slots', values: values('slots', [6, 7], slots) },
    { name: 'tables 3-8 x', values: values('tables x', [2, 2.5, 3, 3.5], tables) },
    { name: 'chairs x', values: values('chairs x', [0.1, 0.15, 0.2, 0.3], chairs) },
    { name: 'lease days', values: values('lease', [2, 3], v => ({ 'locations.leaseDays': v })) },
  ],
};
