import { readFileSync } from 'node:fs';
import { loadConfig } from '../../src';

/**
 * The bundled seat seed as S3 shipped it (JSON 2.0.22): the S1 table-level ladder (`upgrades.table.levels[].priceBase`, Lv4 behind the Ket Noi badge and
 * reputation, no level benefit), no `tableUpgrade` / `chairUpgrade`, and the postmvp `upgrades.backrest`. Read from the config of the recorded history
 * (`seat-2.0.22-v28.json`, made by the S3 engine), so it is the real pin and not a hand-edited copy; its only difference from the shipped file is the larger
 * `shift.startingCoinsBase`. Suites that are about the old ladder, not about S4, run on this pin and keep every assertion.
 */
export const seat2022Raw = () => structuredClone(JSON.parse(JSON.parse(readFileSync(new URL('./seat-2.0.22-v28.json', import.meta.url), 'utf8')).save).config) as any;
export const seat2022Config = () => loadConfig(seat2022Raw());
