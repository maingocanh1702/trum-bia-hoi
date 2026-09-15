import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, snapshot as engineSnapshot, type DomainEvent, type WorldView } from '../../../../packages/engine/src';
import { buildBridge } from './bridge';
import type { BootSession } from '../local';
import type { RemoteSession } from '../start';
import type { Connection } from '../remote';

// readSettings() (called by bridge.settings()) reads a bare `localStorage` global; node --test
// has no browser storage, so install a minimal in-memory stand-in the same way a browser would.
const store = new Map<string, string>();
const localStorageStub: Storage = {
  getItem: key => (store.has(key) ? store.get(key)! : null),
  setItem: (key, value) => { store.set(key, value); },
  removeItem: key => { store.delete(key); },
  clear: () => { store.clear(); },
  key: index => [...store.keys()][index] ?? null,
  get length() { return store.size; },
};
(globalThis as unknown as { localStorage: Storage }).localStorage = localStorageStub;

function fakeLocalSession() {
  const game = new Game();
  const calls = { command: 0, advance: 0, save: 0 };
  const originalCommand = game.command.bind(game);
  game.command = ((...args: Parameters<Game['command']>) => { calls.command++; return originalCommand(...args); }) as Game['command'];
  const originalAdvance = game.advance.bind(game);
  game.advance = ((...args: Parameters<Game['advance']>) => { calls.advance++; return originalAdvance(...args); }) as Game['advance'];
  const storage = { save: (..._args: unknown[]) => { calls.save++; return Promise.resolve(); } };
  const session = { game, storage, original: null, error: null } as unknown as BootSession;
  return { session, calls };
}

function fakeRemoteSession() {
  const calls = { command: 0 };
  const world: WorldView & { events: DomainEvent[] } = {
    now: 1000, playerId: 'guest-1', phase: 'resting', coins: 0, reputation: 0, seasonEarned: 0, lifetimeEarned: 0,
    staminaMs: 0, staminaAnchorMs: 0, staminaAnchorAt: 0, completedShifts: 0, active: true, lastServedAt: null,
    restStartedAt: 0, wellRestedDays: {}, dayEarned: {}, dayShifts: {}, inventory: {} as WorldView['inventory'],
    equipment: {} as WorldView['equipment'], tables: [], glasses: [], queue: [], shift: null, serves: [],
    events: [{ id: 'event-1', type: 'shift_opened', at: 1000, configVersion: 'v1', idempotencyKey: 'k1', data: {} }],
    lostStreak: 0, delivery: null, nextDeliveryAt: null, dogLevel: 0, claimedLifePaths: [], badgeShards: 0,
    cosmeticTokens: 0, peakLeague: null, location: 'via_he', lifePath: 0, unlocks: [], badges: [],
  };
  const remote = {
    world,
    state: 'online' as Connection,
    config: { version: 'remote-config-v1' },
    journal: { nextSeq: 5, pending: [{ clientSeq: 4 }], cursor: 3 },
    command: (..._args: unknown[]) => { calls.command++; return Promise.resolve({ ok: true }); },
  };
  const session = { remote, game: remote, storage: null, original: null, error: null } as unknown as RemoteSession;
  return { session, remote, calls };
}

test('buildBridge(session) exposes exactly the six read-only keys', () => {
  const { session } = fakeLocalSession();
  const bridge = buildBridge(session);
  assert.deepStrictEqual(Object.keys(bridge).sort(), ['connection', 'events', 'journal', 'settings', 'snapshot', 'version'].sort());
});

test('bridge is frozen', () => {
  const { session } = fakeLocalSession();
  const bridge = buildBridge(session);
  assert.ok(Object.isFrozen(bridge));
});

test('local: snapshot() equals the engine\'s own snapshot(session.game)', () => {
  const { session } = fakeLocalSession();
  const bridge = buildBridge(session);
  assert.deepStrictEqual(bridge.snapshot(), engineSnapshot(session.game));
});

test('local: connection() is the literal "local"', () => {
  const { session } = fakeLocalSession();
  assert.strictEqual(buildBridge(session).connection(), 'local');
});

test('local: journal() is null', () => {
  const { session } = fakeLocalSession();
  assert.strictEqual(buildBridge(session).journal(), null);
});

test('local: version() reports mode local and the game\'s own config version', () => {
  const { session } = fakeLocalSession();
  const version = buildBridge(session).version();
  assert.strictEqual(version.schema, 1);
  assert.strictEqual(version.mode, 'local');
  assert.strictEqual(version.configVersion, session.game.config.version);
  assert.strictEqual(typeof version.commit, 'string');
  assert.strictEqual(typeof version.worktree, 'string');
  assert.strictEqual(typeof version.startedAt, 'number');
});

test('version() returns the exact compile-time __TBH_COMMIT__/__TBH_WORKTREE__ constants, not a hard-coded fallback', () => {
  const globals = globalThis as unknown as { __TBH_COMMIT__?: string; __TBH_WORKTREE__?: string };
  const previousCommit = globals.__TBH_COMMIT__, previousWorktree = globals.__TBH_WORKTREE__;
  globals.__TBH_COMMIT__ = 'deadbeefcafe';
  globals.__TBH_WORKTREE__ = '/fake/seeded/worktree';
  try {
    const { session } = fakeLocalSession();
    const version = buildBridge(session).version();
    assert.strictEqual(version.commit, 'deadbeefcafe');
    assert.strictEqual(version.worktree, '/fake/seeded/worktree');
  } finally {
    globals.__TBH_COMMIT__ = previousCommit;
    globals.__TBH_WORKTREE__ = previousWorktree;
  }
});

test('remote: snapshot() derives from session.remote.world, not the engine snapshot()', () => {
  const { session, remote } = fakeRemoteSession();
  const bridge = buildBridge(session);
  assert.deepStrictEqual(bridge.snapshot(), remote.world);
  // The engine snapshot() shape (schema/configVersion/logLength/...) must not appear here.
  assert.ok(!('schema' in (bridge.snapshot() as object)));
});

test('remote: connection() is session.remote.state', () => {
  const { session } = fakeRemoteSession();
  assert.strictEqual(buildBridge(session).connection(), 'online');
});

test('remote: journal() reads {nextSeq,pending,cursor} off the private journal field', () => {
  const { session } = fakeRemoteSession();
  assert.deepStrictEqual(buildBridge(session).journal(), { nextSeq: 5, pending: [{ clientSeq: 4 }], cursor: 3 });
});

test('remote: version() reports mode remote and the remote config version', () => {
  const { session, remote } = fakeRemoteSession();
  const version = buildBridge(session).version();
  assert.strictEqual(version.mode, 'remote');
  assert.strictEqual(version.configVersion, remote.config.version);
});

test('none of the six bridge methods ever calls command/advance/persist/replaceSave', () => {
  const local = fakeLocalSession();
  const localBridge = buildBridge(local.session);
  localBridge.version(); localBridge.snapshot(); localBridge.events(); localBridge.events(1);
  localBridge.connection(); localBridge.journal(); localBridge.settings();
  assert.strictEqual(local.calls.command, 0);
  assert.strictEqual(local.calls.advance, 0);
  assert.strictEqual(local.calls.save, 0);

  const remote = fakeRemoteSession();
  const remoteBridge = buildBridge(remote.session);
  remoteBridge.version(); remoteBridge.snapshot(); remoteBridge.events(); remoteBridge.events(1);
  remoteBridge.connection(); remoteBridge.journal(); remoteBridge.settings();
  assert.strictEqual(remote.calls.command, 0);
});

test('none of the six bridge methods ever writes localStorage or opens IndexedDB, for local or remote', () => {
  let localWrites = 0, indexedDbOpens = 0;
  const originalSetItem = localStorageStub.setItem, originalRemoveItem = localStorageStub.removeItem, originalClear = localStorageStub.clear;
  localStorageStub.setItem = (...args: Parameters<Storage['setItem']>) => { localWrites++; return originalSetItem(...args); };
  localStorageStub.removeItem = (...args: Parameters<Storage['removeItem']>) => { localWrites++; return originalRemoveItem(...args); };
  localStorageStub.clear = (...args: Parameters<Storage['clear']>) => { localWrites++; return originalClear(...args); };
  (globalThis as unknown as { indexedDB: { open: (...args: unknown[]) => never } }).indexedDB = {
    open: (): never => { indexedDbOpens++; throw new Error('the read-only bridge must never open IndexedDB'); },
  };
  try {
    const local = fakeLocalSession();
    const localBridge = buildBridge(local.session);
    localBridge.version(); localBridge.snapshot(); localBridge.events(); localBridge.events(1);
    localBridge.connection(); localBridge.journal(); localBridge.settings();

    const remote = fakeRemoteSession();
    const remoteBridge = buildBridge(remote.session);
    remoteBridge.version(); remoteBridge.snapshot(); remoteBridge.events(); remoteBridge.events(1);
    remoteBridge.connection(); remoteBridge.journal(); remoteBridge.settings();

    assert.strictEqual(localWrites, 0);
    assert.strictEqual(indexedDbOpens, 0);
  } finally {
    localStorageStub.setItem = originalSetItem;
    localStorageStub.removeItem = originalRemoveItem;
    localStorageStub.clear = originalClear;
    delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
  }
});

test('remote: snapshot()/events()/journal() are detached from the live session — mutating a result never taints it', () => {
  const { session, remote } = fakeRemoteSession();
  const bridge = buildBridge(session);

  const snap = bridge.snapshot() as WorldView & { events: DomainEvent[] };
  (snap as { coins: number }).coins = 999999;
  assert.strictEqual(remote.world.coins, 0);
  assert.deepStrictEqual(bridge.snapshot(), remote.world);

  const events = bridge.events();
  events[0].type = 'tampered';
  assert.strictEqual(remote.world.events[0].type, 'shift_opened');

  const journal = bridge.journal()!;
  journal.pending.push({ tampered: true });
  assert.strictEqual(remote.journal.pending.length, 1);
});
