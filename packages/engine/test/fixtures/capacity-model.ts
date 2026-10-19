import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { loadConfig } from '../../src';
/** The last capacity-model seed (2.0.4): every rules <= 27 history was recorded with a snapshot of this shape. */
export const capacityRaw = () => structuredClone(capacityModel);
export const capacityConfig = loadConfig(capacityRaw());
