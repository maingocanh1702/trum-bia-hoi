// The P0 plan plus the numbers the brief does NOT name as levers but that decide who can be served in shift 1: the group size (`spawn.pPair`, a pair has no table of two chairs
// and is turned away), the arrival pace per customer (`spawn.baseMs`) and the beer share of a single guest. They are owner design values of Wave 2 (S1, S3, D12-D19): this plan only
// shows what it would take, it is not a license to move them.
import { values } from './levers.mjs';
import { named } from './p0.mjs';

export default {
  base: { 'shift.startingCoinsBase': 300 },
  coordinates: [
    ...named,
    { name: 'pPair (not named)', values: values('pPair', [0, 0.1, 0.2, 0.35, 0.5], v => ({ 'spawn.pPair': v })) },
    { name: 'spawn.baseMs (not named)', values: values('ms', [4000, 6000, 8000, 10500], v => ({ 'spawn.baseMs': v })) },
    { name: 'solo pBeer (not named)', values: values('pBeer', [0.5, 0.7, 0.85, 1], v => ({ 'upgrades.table.orderShape.solo.pBeer': v })) },
  ],
};
