import assert from 'node:assert/strict';
import { buyChairQuote, buyTableQuote, type Command, type Game, type Result } from '../../src';

/**
 * Seat model (rules 28): fill the alley's table slots, then put a second chair on every table, through real
 * purchase commands. Suites written for the old 3-table x2-seat start use this to keep a busy shop that seats pairs.
 */
export function furnish(g: Game, send: (command: Command) => Result, chairs = true) {
  while (buyTableQuote(g.world, g.config).ok) assert.ok(send({ type: 'buyTable' }).ok);
  if (chairs) for (const table of g.world.tables) if (buyChairQuote(g.world, g.config, table).ok) assert.ok(send({ type: 'buyChair', tableId: table.id }).ok);
}
