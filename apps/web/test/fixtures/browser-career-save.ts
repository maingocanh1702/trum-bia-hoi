import { simulateCareer } from '../../../../packages/engine/sim/career';
import { config, loadConfig, encodeSave, type SeedConfig } from '../../../../packages/engine/src';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';
// The subject is a career save larger than localStorage (5 MiB): it needs a busy run, and capacity demand (S3) makes the early game quieter on purpose. With the JSON 2.1.0 economy
// three days make 3.2 MiB and four 4.6 MiB, so the career runs five days (6.6 MiB, 40 shifts).
process.stdout.write(encodeSave(simulateCareer({ days: 5, seed: 42, config: loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig }).game));
