import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';
const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.patience.thuongMs = 1000000;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
g.command({ idempotencyKey: 'rush-fixture-start', at: g.world.now, command: { type: 'startShift' } });
const [first, second] = g.world.shift!.rushes;
g.advance(first.start - raw.rush.schedule.warningMs - 1000);
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, first, second, warningMs: raw.rush.schedule.warningMs }));
