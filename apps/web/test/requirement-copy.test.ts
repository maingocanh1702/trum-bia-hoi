import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_UNLOCKS, config, loadConfig, parseProgressRequirement, type Config } from '../../../packages/engine/src';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import vi from '../src/i18n/vi.json';
import en from '../src/i18n/en.json';

// Mirrors App.tsx requirementCopy(): a row reads `requirement.<kind>`, an owned item `requirement.<target>`, a league
// peak `league.<target>`, a level `lifePath.<id>`; life-path rows add `requirement.lifetime`. The accessibility tier
// only sees a missing key at runtime ("Missing copy"), so every token a bundled or still-pinnable config holds is swept here.
test('every progress requirement a bundled or pinned config can show has vi and en copy', () => {
  for (const c of [config, loadConfig(capacityModel), loadConfig(legacy)] as Config[]) {
    const v = c.values, keys = new Set(['requirement.lifetime', 'requirement.met', 'requirement.missing']);
    const tokens = [...v.lifePath.flatMap(row => row.requires ?? []), ...BUSINESS_UNLOCKS.flatMap(item => [v.unlocks[item].gate].flat()), v.unlocks.flyer.gate];
    for (const token of tokens) {
      const r = parseProgressRequirement(token, v);
      keys.add(`requirement.${r.kind}`);
      if (r.kind === 'owned') keys.add(`requirement.${r.target}`);
      if (r.kind === 'peak') keys.add(`league.${r.target}`);
      if (r.kind === 'level') keys.add(`lifePath.${v.lifePath[r.need].id}`);
    }
    for (const [locale, copy] of Object.entries({ vi, en }) as [string, Record<string, string>][]) {
      assert.deepEqual([...keys].filter(key => !copy[key]), [], `config ${c.version}, ${locale}`);
    }
  }
});
