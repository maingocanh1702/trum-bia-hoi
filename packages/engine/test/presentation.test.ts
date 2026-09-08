import { test } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../../apps/web/src/i18n/vi.json';
import en from '../../../apps/web/src/i18n/en.json';
import { advanceGuide, type Settings } from '../../../apps/web/src/local';
import { Game, config, type DomainEvent } from '../src';

test('both locales have the same nonempty keys and interpolation parameters', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(vi).sort());
  for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
    assert.ok(en[key].trim());
    assert.deepEqual(en[key].match(/\{\w+\}/g)?.sort(), vi[key].match(/\{\w+\}/g)?.sort(), key);
  }
});
test('the event-driven guide resets after serving and obeys the daily repeat cap', () => {
  const g = new Game();
  const prefs: Settings = { locale: 'vi', muted: true, welcomed: true, guideDone: true, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0 };
  const e = (type: string): DomainEvent => ({ id: type, type, at: 0, configVersion: config.version, data: {} });
  advanceGuide(prefs, g, [e('customer_left'), e('customer_left'), e('customer_served'), e('customer_left')]);
  assert.equal(prefs.guideRuns, 0);
  advanceGuide(prefs, g, [e('customer_left'), e('customer_left')]);
  assert.equal(prefs.guideRuns, 1);
  assert.equal(prefs.guideIndex, config.values.onboarding.stepGuide.steps.findIndex(s => s.waitFor === 'order_ready'));
  for (let i = 0; i < 20; i++) advanceGuide(prefs, g, [e('customer_left')]);
  assert.equal(prefs.guideRuns, config.values.onboarding.stepGuide.maxAutoRepeatsPerDay);
});
