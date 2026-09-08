import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, signboardQuote, WEATHER, type Command } from '../../../../packages/engine/src';
const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 1000000; raw.signboard.styles.golden.repBase = 1;
for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
const send = (command: Command) => { const r = g.command({ command, at: g.world.now, idempotencyKey: `sign-fixture-${g.log.length}` }); assert.ok(r.ok, r.reason ?? 'fixture command'); };
while (g.world.equipment.stall < raw.signboard.gate.stallLevel) send({ type: 'upgrade', kind: 'stall' });
send({ type: 'startShift' }); g.advance(g.world.now + 11000);
const table = g.world.tables.find(t => t.order)!; assert.ok(table.order!.items.every(i => i.state === 'ready'));
if (process.argv.includes('installed')) { send({ type: 'installSignboard' }); send({ type: 'setSignboard', style: 'neon' }); }
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, install: signboardQuote(g.world, g.config).cost, neon: g.config.values.signboard.styles.neon.priceBase, golden: g.config.values.signboard.styles.golden.priceBase, reputationGate: g.config.values.signboard.styles.golden.repBase }));
