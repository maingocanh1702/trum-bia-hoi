import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DomainEvent } from '../../../packages/engine/src';
import {
  evidencePath,
  matchEvent,
  waitForEvent,
  createConsoleErrorCollector,
  readSnapshot,
  createTbhFixture,
  type EvaluablePage,
  type ConsoleLikePage,
  type ConsoleMessageLike,
  type TbhPage,
} from './tbh-fixture';

function fakeEvent(overrides: Partial<DomainEvent>): DomainEvent {
  return { id: 'event-1', type: 'shift_opened', at: 0, configVersion: 'v1', idempotencyKey: 'k1', data: {}, ...overrides };
}

test('evidencePath(branch, name) returns a path under artifacts/verification/<branch>/', () => {
  assert.strictEqual(evidencePath('main', 'before.png'), 'artifacts/verification/main/before.png');
});

test('evidencePath sanitises a branch containing "/" into a single safe path segment', () => {
  const path = evidencePath('ap3/agent-verification-m02-tbh-fixture', 'serve.png');
  assert.strictEqual(path, 'artifacts/verification/ap3-agent-verification-m02-tbh-fixture/serve.png');
  // No literal "/" left inside the branch segment -- it must not become a nested directory.
  const withoutRoot = path.slice('artifacts/verification/'.length);
  const branchSegment = withoutRoot.split('/')[0];
  assert.strictEqual(withoutRoot.split('/').length, 2);
  assert.ok(!branchSegment.includes('/'));
});

test('evidencePath sanitises a traversal-shaped shot name into a single safe segment', () => {
  const path = evidencePath('main', '../../../package.json');
  assert.notStrictEqual(path, 'package.json');
  assert.strictEqual(path, 'artifacts/verification/main/..-..-..-package.json');
  // Still confined to exactly one segment under the branch directory.
  const withoutRoot = path.slice('artifacts/verification/main/'.length);
  assert.ok(!withoutRoot.includes('/'));
});

test('matchEvent selects the first event of the given type strictly after `since`', () => {
  const events = [
    fakeEvent({ id: 'e1', type: 'coin_gain', at: 10 }),
    fakeEvent({ id: 'e2', type: 'order_served', at: 20 }),
    fakeEvent({ id: 'e3', type: 'coin_gain', at: 30 }),
  ];
  const match = matchEvent(events, 'coin_gain', 20);
  assert.strictEqual(match?.id, 'e3');
});

test('matchEvent returns undefined when no event matches both type and since', () => {
  const events = [fakeEvent({ id: 'e1', type: 'coin_gain', at: 10 })];
  assert.strictEqual(matchEvent(events, 'coin_gain', 10), undefined);
  assert.strictEqual(matchEvent(events, 'order_served', 0), undefined);
});

test('waitForEvent polls an injected page-like object via evaluate until a match appears', async () => {
  const early = [fakeEvent({ id: 'e1', type: 'shift_opened', at: 10 })];
  const late = [...early, fakeEvent({ id: 'e2', type: 'coin_gain', at: 20 })];
  let calls = 0;
  const page: EvaluablePage = { evaluate: async <R>() => (calls++ === 0 ? early : late) as unknown as R };
  const match = await waitForEvent(page, 'coin_gain', { since: 15 }, { timeoutMs: 500, intervalMs: 1 });
  assert.ok(calls >= 2, 'evaluate must be polled more than once before the match appears');
  assert.strictEqual(match?.id, 'e2');
});

test('waitForEvent resolves undefined once the timeout elapses with no match', async () => {
  const page: EvaluablePage = { evaluate: async <R>() => [] as unknown as R };
  const match = await waitForEvent(page, 'coin_gain', { since: 0 }, { timeoutMs: 30, intervalMs: 5 });
  assert.strictEqual(match, undefined);
});

test('createConsoleErrorCollector keeps only error-level console messages, in order', () => {
  let handler: ((message: ConsoleMessageLike) => void) | undefined;
  const page: ConsoleLikePage = { on: (_event, listener) => { handler = listener; } };
  const consoleErrors = createConsoleErrorCollector(page);
  assert.ok(handler, 'collector must subscribe to console messages on construction');
  handler!({ type: () => 'log', text: () => 'booting' });
  handler!({ type: () => 'error', text: () => 'first error' });
  handler!({ type: () => 'warning', text: () => 'a warning' });
  handler!({ type: () => 'error', text: () => 'second error' });
  assert.deepStrictEqual(consoleErrors(), ['first error', 'second error']);
});

test('readSnapshot(page) evaluates window.__TBH_VERIFY__.snapshot() through the page, not by launching anything', async () => {
  const sentinel = { economy: { coins: 42 } };
  const calls: Array<{ fn: unknown; arg: unknown }> = [];
  (globalThis as { window?: unknown }).window = { __TBH_VERIFY__: { snapshot: () => sentinel } };
  try {
    const page: EvaluablePage = {
      evaluate: async <R>(fn: () => R | Promise<R>, arg?: unknown) => {
        calls.push({ fn, arg });
        return await fn();
      },
    };
    const result = await readSnapshot(page);
    assert.strictEqual(result, sentinel);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(typeof calls[0].fn, 'function');
    assert.strictEqual(calls[0].arg, undefined);
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
});

function fakeTbhPage(): TbhPage & { shots: { path: string }[] } {
  const shots: { path: string }[] = [];
  return {
    shots,
    evaluate: async <R>() => [] as unknown as R,
    on: () => {},
    screenshot: async options => { shots.push(options); return Buffer.from(''); },
  };
}

test('createTbhFixture(page) exposes exactly the five tbh methods', () => {
  const tbh = createTbhFixture(fakeTbhPage(), 'test-branch');
  assert.deepStrictEqual(
    Object.keys(tbh).sort(),
    ['consoleErrors', 'evidence', 'shot', 'snapshot', 'waitForEvent'].sort(),
  );
});

test('tbh.shot(name) screenshots to the evidence path for the current branch', async () => {
  const page = fakeTbhPage();
  const tbh = createTbhFixture(page, 'ap3/agent-verification-m02-tbh-fixture');
  const target = await tbh.shot('serve.png');
  assert.strictEqual(target, 'artifacts/verification/ap3-agent-verification-m02-tbh-fixture/serve.png');
  assert.deepStrictEqual(page.shots, [{ path: target }]);
});

test('tbh.evidence(dir) overrides the branch segment used by later shot() calls', async () => {
  const page = fakeTbhPage();
  const tbh = createTbhFixture(page, 'main');
  tbh.evidence('custom-dir');
  const target = await tbh.shot('after.png');
  assert.strictEqual(target, 'artifacts/verification/custom-dir/after.png');
});

test('tbh.consoleErrors() reflects the fixture\'s own page, not a separate collector', () => {
  const page = fakeTbhPage();
  const tbh = createTbhFixture(page, 'main');
  assert.deepStrictEqual(tbh.consoleErrors(), []);
});
