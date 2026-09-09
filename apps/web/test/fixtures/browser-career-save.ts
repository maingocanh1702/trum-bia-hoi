import { simulateCareer } from '../../../../packages/engine/sim/career';
import { encodeSave } from '../../../../packages/engine/src';
process.stdout.write(encodeSave(simulateCareer({ days: 3, seed: 42 }).game));
