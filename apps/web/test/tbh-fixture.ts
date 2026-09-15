import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import type { DomainEvent } from '../../../packages/engine/src';
import type { VerifySnapshot } from '../src/verify/bridge';
// window.__TBH_VERIFY__'s type comes from apps/web/src/verify/install.ts's global
// augmentation, already part of the same tsc program -- no need to redeclare it here.

const ARTIFACTS_ROOT = 'artifacts/verification';

/** Collapses a branch name into one filesystem-safe path segment -- a branch like
 * "ap3/agent-verification-m02-tbh-fixture" must not turn into a nested directory. */
function sanitizeBranchSegment(branch: string): string {
  return branch.replace(/[\\/]+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function evidencePath(branch: string, name: string): string {
  return join(ARTIFACTS_ROOT, sanitizeBranchSegment(branch), name);
}

export function matchEvent(events: readonly DomainEvent[], type: string, since: number): DomainEvent | undefined {
  return events.find(event => event.type === type && event.at > since);
}

export interface EvaluablePage {
  evaluate<R>(pageFunction: () => R | Promise<R>): Promise<R>;
}

export interface ConsoleMessageLike {
  type(): string;
  text(): string;
}

export interface ConsoleLikePage {
  on(event: 'console', listener: (message: ConsoleMessageLike) => void): unknown;
}

export interface ScreenshotPage {
  screenshot(options: { path: string }): Promise<Buffer>;
}

export interface TbhPage extends EvaluablePage, ConsoleLikePage, ScreenshotPage {}

export interface WaitForEventOptions {
  since?: number;
}

export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

/** Polls the bridge's own event buffer through an injected page-like object -- no real browser
 * needed to exercise the loop, only something that answers `evaluate`. */
export async function waitForEvent(
  page: EvaluablePage,
  type: string,
  { since = 0 }: WaitForEventOptions = {},
  { timeoutMs = 5000, intervalMs = 50 }: PollOptions = {},
): Promise<DomainEvent | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const events = await page.evaluate(() => window.__TBH_VERIFY__!.events());
    const match = matchEvent(events, type, since);
    if (match) return match;
    if (Date.now() >= deadline) return undefined;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

export function createConsoleErrorCollector(page: ConsoleLikePage): () => string[] {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return () => [...errors];
}

export async function readSnapshot(page: EvaluablePage): Promise<VerifySnapshot> {
  return page.evaluate(() => window.__TBH_VERIFY__!.snapshot());
}

function resolveBranch(): string {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
}

export interface Tbh {
  snapshot(): Promise<VerifySnapshot>;
  waitForEvent(type: string, opts?: WaitForEventOptions): Promise<DomainEvent | undefined>;
  shot(name: string): Promise<string>;
  consoleErrors(): string[];
  evidence(dir: string): void;
}

export function createTbhFixture(page: TbhPage, branch: string = resolveBranch()): Tbh {
  let evidenceBranch = branch;
  const consoleErrors = createConsoleErrorCollector(page);
  return {
    snapshot: () => readSnapshot(page),
    waitForEvent: (type, opts) => waitForEvent(page, type, opts),
    shot: async name => {
      const target = evidencePath(evidenceBranch, name);
      await page.screenshot({ path: target });
      return target;
    },
    consoleErrors,
    evidence: dir => { evidenceBranch = dir; },
  };
}

export const test = base.extend<{ tbh: Tbh }>({
  tbh: async ({ page }, use) => {
    await use(createTbhFixture(page));
  },
});

export { expect };
