import assert from 'node:assert/strict';
import { isSeatModel, buyTableQuote, buyChairQuote, type Game, type Command } from '../src/index';

/**
 * The scenario of the standard sims (plan S5): a new shop is one table with one chair (rules 28, S1), which is offered a guest every ~42 s (S3) and cannot
 * serve the 1000 guests the k measurement wants inside its sampling budget. The standard profile is therefore the complete FIRST alley the seat model
 * builds before anything else: `chairsAfterTables` tables (four at the first location) with their second chair each, every device at its starting
 * level, the starting wallet. The shop is furnished with the engine's own commands (the tray follows the chairs); the wallet is topped up by exactly the
 * price of each purchase so the sim starts with the coins a new shop has (a measurement wallet, like every `w.unlocks.push` of these sims: the history is
 * not meant to be replayed from a fresh save). Nothing about HOW k is measured changes: mean(payment + tip) / anchor.
 * A capacity pin (JSON 2.0.4) and a 1.x pin start furnished already and are left alone.
 */
export function furnishFirstAlley(game: Game): void {
  const w = game.world, config = game.config;
  if (!isSeatModel(config.values)) return;
  const buy = (command: Command, cost: number) => {
    w.coins += cost;
    const result = game.command({ idempotencyKey: `furnish-${game.log.length}`, at: w.now, command });
    assert.ok(result.ok, `furnish ${command.type}: ${result.reason}`);
  };
  const wanted = Math.min(config.values.upgrades.table.chairsAfterTables, buyTableQuote(w, config).slots);
  while (w.tables.length < wanted) buy({ type: 'buyTable' }, buyTableQuote(w, config).cost!);
  for (const table of [...w.tables]) {
    const quote = buyChairQuote(w, config, table);
    if (quote.cost !== null && (quote.ok || quote.reason === 'notEnoughCoins')) buy({ type: 'buyChair', tableId: table.id }, quote.cost); // only the wallet is missing: top it up
  }
}
