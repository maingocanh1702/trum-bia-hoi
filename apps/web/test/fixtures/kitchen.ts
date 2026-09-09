import { encodeSave, kitchenStatus } from '../../../../packages/engine/src';
import { kitchenGame, sendKitchen, untilKitchen } from '../../../../packages/engine/test/fixtures/kitchen';
const mode = process.argv[2] ?? 'live', g = kitchenGame(mode === 'max' ? 4 : mode === 'locked' ? 0 : 1, mode !== 'stock', mode === 'late' ? 12000 : 120000);
if (mode === 'live') untilKitchen(g, () => kitchenStatus(g.world, g.config).jobs.some(j => j.state === 'queued'));
if (mode === 'stock') untilKitchen(g, () => kitchenStatus(g.world, g.config).jobs.length > 0);
if (mode === 'max') untilKitchen(g, () => kitchenStatus(g.world, g.config).busy === g.config.values.upgrades.kitchen.slots[4]);
if (mode === 'late') { untilKitchen(g, () => kitchenStatus(g.world, g.config).jobs.some(j => j.late)); sendKitchen(g, { type: 'endShift' }); }
const status = kitchenStatus(g.world, g.config);
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, status, deadline: Math.max(...g.world.tables.filter(t => t.order).map(t => t.order!.placedAt + t.order!.patienceMs + g.config.values.patience.graceMs)) }));
