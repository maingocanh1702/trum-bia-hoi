import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../../../packages/engine/src';
import { installVerifyBridge } from './install';
import type { BootSession } from '../local';
import type { StartState } from '../start';

function fakeWindow(): { __TBH_VERIFY__?: unknown } {
  return {};
}

function sessionState(seed: number): StartState {
  const game = new Game(undefined, seed, 0, `guest-${seed}`);
  const storage = { save: () => Promise.resolve() };
  const session = { game, storage, original: null, error: null } as unknown as BootSession;
  return { session };
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = fakeWindow();
});

test('guard off: writes nothing to the fake window', () => {
  installVerifyBridge(sessionState(1), false);
  assert.strictEqual('__TBH_VERIFY__' in (globalThis as unknown as { window: object }).window, false);
});

test('guard on + a StartState with a session: sets window.__TBH_VERIFY__ to buildBridge(state.session)', () => {
  const state = sessionState(7);
  installVerifyBridge(state, true);
  const win = (globalThis as unknown as { window: { __TBH_VERIFY__?: { snapshot(): { seed?: number }; connection(): string } } }).window;
  assert.ok(win.__TBH_VERIFY__);
  assert.strictEqual(win.__TBH_VERIFY__!.connection(), 'local');
  assert.strictEqual(win.__TBH_VERIFY__!.snapshot().seed, 7);
});

test('guard on + {local,legacy} (session-less): writes nothing', () => {
  const state = { local: '{}', legacy: null } as StartState;
  installVerifyBridge(state, true);
  assert.strictEqual('__TBH_VERIFY__' in (globalThis as unknown as { window: object }).window, false);
});

test('guard on + {error} (session-less): writes nothing', () => {
  const state = { error: 'network' } as StartState;
  installVerifyBridge(state, true);
  assert.strictEqual('__TBH_VERIFY__' in (globalThis as unknown as { window: object }).window, false);
});

test('guard on + {reauth} (session-less): writes nothing', () => {
  const state = { reauth: {} } as unknown as StartState;
  installVerifyBridge(state, true);
  assert.strictEqual('__TBH_VERIFY__' in (globalThis as unknown as { window: object }).window, false);
});

test('calling installVerifyBridge twice with two different sessions leaves the second one installed', () => {
  installVerifyBridge(sessionState(11), true);
  installVerifyBridge(sessionState(22), true);
  const win = (globalThis as unknown as { window: { __TBH_VERIFY__?: { snapshot(): { seed?: number } } } }).window;
  assert.strictEqual(win.__TBH_VERIFY__!.snapshot().seed, 22);
});
