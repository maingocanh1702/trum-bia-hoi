import { simulateCareer } from '../../../../packages/engine/sim/career';
import { config, loadConfig, encodeSave, type SeedConfig } from '../../../../packages/engine/src';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';
// The subject is a career save larger than localStorage (5 MiB): it needs a busy few days, and capacity demand (S3) makes the early game quieter on purpose. With the sealed
// 2.1.0 economy (the protocol bot buys tables 2-8 first) three days are 3.7 MiB, four are 5.07 and five are 8.3: five days keep a wide margin over the quota.
process.stdout.write(encodeSave(simulateCareer({ days: 5, seed: 42, config: loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig }).game));
