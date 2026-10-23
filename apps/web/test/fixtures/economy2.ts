import { readFileSync } from 'node:fs';
import legacy from '../../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, decodeSave, encodeSave, beerStatus, type Command } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
const mode = process.argv[2];
if (mode === 'inspect') {
  const g = decodeSave(readFileSync(0, 'utf8')), w = g.world;
  console.log(JSON.stringify({ now: w.now, version: g.config.version, raw: g.config.raw, beer: beerStatus(w, g.config), glasses: w.glasses.length, coins: w.coins, paused: !!w.paused, remaining: w.shift ? w.shift.endsAt - w.now : null }));
} else {
  const raw = mode === 'legacy' ? structuredClone(legacy) : fullHud(structuredClone(config.raw)); raw.shift.startingCoinsBase = 1000000;
  // Label-only fixture: make every cooler level purchasable without changing the release config.
  if (mode.startsWith('cooler-') && 'lifePathGate' in raw.upgrades) raw.upgrades.lifePathGate.cooler = raw.upgrades.lifePathGate.cooler.map(() => 0);
  // The cooler's own seconds per level: shift 1 of a new save keeps beer fresh since JSON 2.1.4 (`firstShift.staleDisabled`, its badge reads ∞: the spec after this one), so that rule is off here.
  if (mode.startsWith('cooler-') && 'staleDisabled' in raw.onboarding.firstShift) raw.onboarding.firstShift.staleDisabled = false;
  for (const weather of ['sunny', 'hot', 'humid', 'rain', 'cold'] as const) raw.weather[weather].weight = weather === (mode.startsWith('cooler-') ? mode.slice(7) : 'sunny') ? 1 : 0;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T04:00:00Z'));
  const send = (command: Command) => g.command({ at: g.world.now, command, idempotencyKey: `web-eco-${g.log.length}` });
  send({ type: 'startShift' });
  if (mode === 'legacy') {
    send({ type: 'endShift' }); g.advance(g.world.now + g.config.values.shift.durationMs * (1 + 1 / g.config.values.shift.regenRate));
  } else { send({ type: 'upgrade', kind: 'keg' }); send({ type: 'upgrade', kind: 'keg' }); g.advance(g.world.now + 1000); }
  console.log(JSON.stringify({ now: g.world.now, save: encodeSave(g), version: g.config.version }));
}
