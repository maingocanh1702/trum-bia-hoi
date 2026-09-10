import { test } from 'node:test';
import { canInvite } from '../../../apps/web/src/login-prompt';
import assert from 'node:assert/strict';
import vi from '../../../apps/web/src/i18n/vi.json';
import en from '../../../apps/web/src/i18n/en.json';
import { advanceGuide, readSettings, type Settings } from '../../../apps/web/src/local';
import { Game, config, loadConfig, type DomainEvent } from '../src';

test('both locales have the same nonempty keys and interpolation parameters', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(vi).sort());
  for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
    assert.ok(en[key].trim());
    assert.deepEqual(en[key].match(/\{\w+\}/g)?.sort(), vi[key].match(/\{\w+\}/g)?.sort(), key);
  }
});
test('the event-driven guide resets after serving and obeys the daily repeat cap', () => {
  const g = new Game();
  const prefs: Settings = { locale: 'vi', localeAccepted: true, muted: true, welcomed: true, guideDone: true, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0, loginPromptPlayer: '', loginPromptShift: 0 };
  const e = (type: string): DomainEvent => ({ id: type, type, at: 0, configVersion: config.version, idempotencyKey: `test:${type}`,  data: {} });
  advanceGuide(prefs, g, [e('customer_left'), e('customer_left'), e('customer_served'), e('customer_left')]);
  assert.equal(prefs.guideRuns, 0);
  advanceGuide(prefs, g, [e('customer_left'), e('customer_left')]);
  assert.equal(prefs.guideRuns, 1);
  assert.equal(prefs.guideIndex, config.values.onboarding.stepGuide.steps.findIndex(s => s.waitFor === 'order_ready'));
  for (let i = 0; i < 20; i++) advanceGuide(prefs, g, [e('customer_left')]);
  assert.equal(prefs.guideRuns, config.values.onboarding.stepGuide.maxAutoRepeatsPerDay);
});


test('a three-customer queue loss triggers the three-customer guide immediately', () => {
  const g = new Game();
  const prefs: Settings = { locale: 'vi', localeAccepted: true, muted: true, welcomed: true, guideDone: true, guideIndex: null, guideRuns: 0, guideDay: '', lostStreak: 0, loginPromptPlayer: '', loginPromptShift: 0 };
  advanceGuide(prefs, g, [{ id: 'queue-loss', type: 'customer_left', at: 0, configVersion: config.version, idempotencyKey: 'queue-loss', data: { count: 3, reason: 'queue' } }]);
  assert.equal(prefs.guideRuns, 1);
});


test('guest login invitations share the configured completed-shift cooldown without blocking account access', () => {
  const raw = structuredClone(config.raw), prefs = readSettings();
  raw.onboarding.loginPrompt.cooldownShifts = 2;
  const g = new Game(loadConfig(raw));
  assert.equal(canInvite(prefs, g, true, 'firstShift'), false);
  assert.equal(canInvite(prefs, g, true, 'leave'), false);
  assert.equal(canInvite(prefs, g, true, 'leaderboard'), true);
  g.world.lifetimeEarned = 1;
  assert.equal(canInvite(prefs, g, true, 'leave'), true);
  g.world.completedShifts = 1;
  assert.equal(canInvite(prefs, g, true, 'firstShift'), true);
  prefs.loginPromptPlayer = g.world.playerId; prefs.loginPromptShift = 1;
  for (const shifts of [1, 2, 3]) {
    g.world.completedShifts = shifts;
    for (const touchpoint of ['leaderboard', 'leave'] as const) {
      assert.equal(canInvite(prefs, g, true, touchpoint), shifts === 3);
      assert.equal(canInvite(prefs, g, false, touchpoint), false);
    }
  }
  assert.equal(canInvite(prefs, g, true, 'firstShift'), false);
  const fresh = new Game(g.config, 1, 0, 'new-guest-visit'); fresh.world.completedShifts = 1;
  assert.equal(canInvite(prefs, fresh, true, 'firstShift'), true);
  for (const [key, touchpoint] of [['afterFirstShift', 'firstShift'], ['onLeaderboardOpen', 'leaderboard'], ['onLeaveWithProgress', 'leave']] as const) {
    const disabled = structuredClone(raw); disabled.onboarding.loginPrompt[key] = false;
    const game = { world: fresh.world, config: loadConfig(disabled) };
    assert.equal(canInvite(prefs, game, true, touchpoint), false);
  }
  raw.onboarding.enabled = false;
  for (const touchpoint of ['firstShift', 'leaderboard', 'leave'] as const) assert.equal(canInvite(prefs, { world: fresh.world, config: loadConfig(raw) }, true, touchpoint), false);
});

test('departure invitations honor both configurable thresholds and read old raw pins unchanged', () => {
  const raw = structuredClone(config.raw), prefs = readSettings();
  assert.ok('leaveProgress' in raw.onboarding.loginPrompt);
  raw.onboarding.loginPrompt.leaveProgress = { minCompletedShifts: 4, minLifetimeEarned: 250 };
  const g = new Game(loadConfig(raw)); g.world.completedShifts = 3; g.world.lifetimeEarned = 249;
  assert.equal(canInvite(prefs, g, true, 'leave'), false);
  g.world.lifetimeEarned = 250; assert.equal(canInvite(prefs, g, true, 'leave'), true);
  g.world.lifetimeEarned = 0; g.world.completedShifts = 4; assert.equal(canInvite(prefs, g, true, 'leave'), true);
  const old = structuredClone(raw); delete (old.onboarding.loginPrompt as any).leaveProgress; old._meta.version = 'old-presentation-pin';
  const original = JSON.stringify(old), pinned = loadConfig(old);
  assert.equal(JSON.stringify(pinned.raw), original);
  g.world.completedShifts = 0; g.world.lifetimeEarned = 1;
  assert.equal(canInvite(prefs, { world: g.world, config: pinned }, true, 'leave'), true);
  for (const value of [null, {}, { minCompletedShifts: 1 }, { minCompletedShifts: 0, minLifetimeEarned: 1 }, { minCompletedShifts: 1, minLifetimeEarned: 1.5 }]) {
    (raw.onboarding.loginPrompt as any).leaveProgress = value; assert.throws(() => loadConfig(raw), /config:/);
  }
});
