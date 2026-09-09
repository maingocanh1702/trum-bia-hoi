import { readFileSync } from 'node:fs';
import { decodeSave, encodeSave, menuReport } from '../../../../packages/engine/src';
import { kitchenGame, sendKitchen } from '../../../../packages/engine/test/fixtures/kitchen';
import { playMenu } from '../../../../packages/engine/test/fixtures/menu';

const mode = process.argv[2] ?? 'live';
const g = mode.startsWith('legacy') ? decodeSave(readFileSync(`packages/engine/test/fixtures/legacy-kitchen-${mode === 'legacy-closed' ? 'expired' : 'queued'}-v13.json`, 'utf8')) : kitchenGame(2);
if (mode === 'live') {
  playMenu(g, () => menuReport(g.world, g.config)!.rows.every(r => r.sold > 0));
  sendKitchen(g, { type: 'endShift' });
}
const save = encodeSave(g), now = g.world.now, report = menuReport(g.world, g.config);
const target = now + 300000;
if (mode === 'live') g.advance(target);
process.stdout.write(JSON.stringify({ save, now, report, target, after: menuReport(g.world, g.config) }));
