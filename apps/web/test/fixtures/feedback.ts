import legacy from '../../../../packages/engine/test/fixtures/legacy-feedback-v25.json';
import { decodeSave, encodeSave, freshnessMs, menuReport, orderPreparation } from '../../../../packages/engine/src';
import { feedbackGame, feedbackCommand, firstOrder } from '../../../../packages/engine/test/fixtures/feedback';

const mode = process.argv[2] ?? 'empty';
const g = mode.startsWith('legacy') ? decodeSave(legacy.save) : feedbackGame(raw => {
  if (mode !== 'ready') raw.inventory.startingStock.bia[0] = 0;
  if (mode === 'loss-vs-stale') raw.inventory.startingStock.bia[0] = 1;
  if (mode === 'queue') { raw.onboarding.enabled = false; raw.spawn.baseMs = raw.rush.none.floorMs = 500; raw.spawn.warmupMult = 1; }
  if (mode === 'maxed') { raw.onboarding.enabled = false; raw.spawn.baseMs = raw.rush.none.floorMs = 500; raw.spawn.warmupMult = 1; raw.patience.thuongMs = 600000; raw.upgrades.table.maxTables = raw.upgrades.table.startingTables; raw.runtime.initialTableLevel = raw.upgrades.table.levels.length; }
});
if (mode.startsWith('legacy')) {
  feedbackCommand(g, { type: 'activity', active: true });
  const unknown = menuReport(g.world, g.config)!.losses.unknown;
  const goal = mode === 'legacy-tie' ? unknown : mode === 'legacy-known' ? unknown + 1 : 1;
  const end = g.world.now + 180000;
  while (menuReport(g.world, g.config)!.losses.beerStock < goal && g.world.now < end) g.advance(g.world.now + 100);
  if (menuReport(g.world, g.config)!.losses.beerStock !== goal) throw Error('real-history loss fixture did not reach requested boundary');
}
else if (mode === 'queue' || mode === 'maxed') { feedbackCommand(g, { type: 'startShift' }); g.advance(g.world.now + 180000); }
else {
  const order = firstOrder(g);
  if (mode === 'loss-vs-stale') {
    g.advance(order.items[0].readyAt! + freshnessMs(g.world, g.config));
    feedbackCommand(g, { type: 'serve', tableId: g.world.tables[0].id, orderId: order.id });
    g.advance(g.world.now + 90000);
  }
  if (mode === 'ready') g.advance(order.items[0].readyAt!);
  if (mode === 'loss') { feedbackCommand(g, { type: 'endShift' }); g.advance(order.placedAt + order.patienceMs + g.config.values.patience.graceMs + 10000); }
}
console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, report: menuReport(g.world, g.config), stale: g.world.serves.filter(serve => serve.stale).length, cause: orderPreparation(g.world, g.config, g.world.tables[0].order) }));
