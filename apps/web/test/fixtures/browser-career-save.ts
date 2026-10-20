import { simulateCareer } from '../../../../packages/engine/sim/career';
import { config, loadConfig, encodeSave, type SeedConfig } from '../../../../packages/engine/src';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';
// The subject is a career save larger than localStorage: it needs a busy three days, and capacity demand (S3) makes the early game quieter on purpose.
process.stdout.write(encodeSave(simulateCareer({ days: 3, seed: 42, config: loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig }).game));
