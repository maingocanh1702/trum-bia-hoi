import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDoctor, defaultRunners, scanEnginePurity, type DoctorRunners } from './doctor';

function tempDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `doctor-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

// A fully green baseline so each test below only ever overrides the one runner it means to
// break -- a failure elsewhere would mean the test is pinning the wrong branch.
function happyRunners(overrides: Partial<DoctorRunners> = {}): DoctorRunners {
  const real = defaultRunners();
  return {
    git: overrides.git ?? {
      headSha: () => 'sha-good',
      branch: () => 'feature-x',
      worktreePath: () => '/worktree/good',
    },
    exec: overrides.exec ?? {
      checkConfig: () => ({ code: 0 }),
      mapCoverage: () => ({ code: 0 }),
    },
    fetch: overrides.fetch ?? {
      bridgeVersion: () => ({ commit: 'sha-good', worktree: '/worktree/good' }),
      serverHealth: () => true,
      consoleErrors: () => [],
    },
    fs: overrides.fs ?? real.fs,
  };
}

test('STALE BUILD: bridge version().commit != injected HEAD sha fails the bridge line and the overall result', (t) => {
  const root = tempDir(t, 'stale-build');
  const runners = happyRunners({
    fetch: {
      bridgeVersion: () => ({ commit: 'sha-stale', worktree: '/worktree/good' }),
      serverHealth: () => true,
      consoleErrors: () => [],
    },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners });
  const bridgeLines = result.lines.filter((l) => l.group === 'bridge');
  assert.ok(bridgeLines.some((l) => !l.ok && /STALE BUILD/.test(l.label)));
  assert.equal(result.ok, false);
});

test('WRONG INSTANCE: bridge version().worktree != injected current worktree path fails the bridge line and the overall result', (t) => {
  const root = tempDir(t, 'wrong-instance');
  const runners = happyRunners({
    fetch: {
      bridgeVersion: () => ({ commit: 'sha-good', worktree: '/worktree/bad' }),
      serverHealth: () => true,
      consoleErrors: () => [],
    },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners });
  const bridgeLines = result.lines.filter((l) => l.group === 'bridge');
  assert.ok(bridgeLines.some((l) => !l.ok && /WRONG INSTANCE/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a red check:config (injected non-zero exit) fails the binding line and the overall result', (t) => {
  const root = tempDir(t, 'check-config-red');
  const runners = happyRunners({ exec: { checkConfig: () => ({ code: 1 }), mapCoverage: () => ({ code: 0 }) } });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /check:config/.test(l.label)));
  assert.equal(result.ok, false);
});

test('an engine-purity breach in a FAKE packages/engine/src fixture fails the binding line, never touching the real one', (t) => {
  const root = tempDir(t, 'purity-breach');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(
    resolve(engineSrcDir, 'bad.ts'),
    ["import React from 'react';", 'export function bad() {', '  return window.location.href + Date.now() + Math.random();', '}', ''].join('\n'),
  );
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /bad\.ts/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a file named rng.ts is exempt from the engine-purity scan, matching the real rng.ts exemption', (t) => {
  const root = tempDir(t, 'purity-rng-exempt');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'rng.ts'), 'export const x = Math.random();\n');
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a map-coverage failure (injected non-zero exit) fails the map line and the overall result', (t) => {
  const root = tempDir(t, 'map-fail');
  const runners = happyRunners({ exec: { checkConfig: () => ({ code: 0 }), mapCoverage: () => ({ code: 1 }) } });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const mapLines = result.lines.filter((l) => l.group === 'map');
  assert.ok(mapLines.some((l) => !l.ok));
  assert.equal(result.ok, false);
});

test('overall result is ok (and exit code would be 0) only when every line passes', (t) => {
  const root = tempDir(t, 'all-green');
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners: happyRunners() });
  assert.equal(result.ok, true);
  assert.ok(result.lines.length > 0);
  assert.ok(result.lines.every((l) => l.ok));
});

test('--engine-only skips the server/bridge/console groups entirely, running only repo/deps/binding/map', (t) => {
  const root = tempDir(t, 'engine-only');
  // Deliberately broken fetch runner -- if server/bridge/console ran, this would fail the result.
  const runners = happyRunners({
    fetch: {
      bridgeVersion: () => ({ commit: 'sha-stale', worktree: '/worktree/bad' }),
      serverHealth: () => false,
      consoleErrors: () => ['boom'],
    },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const skippedGroups = result.lines.filter((l) => l.group === 'server' || l.group === 'bridge' || l.group === 'console');
  assert.deepEqual(skippedGroups, []);
  assert.equal(result.ok, true);
});

test('writes the full text report to artifacts/verification/<branch>/doctor.txt, branch read from the injected git runner', (t) => {
  const root = tempDir(t, 'report');
  const runners = happyRunners({
    git: { headSha: () => 'sha-good', branch: () => 'my-weird-branch', worktreePath: () => '/worktree/good' },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners });
  const reportPath = resolve(root, 'artifacts/verification/my-weird-branch/doctor.txt');
  assert.ok(existsSync(reportPath));
  assert.equal(readFileSync(reportPath, 'utf8'), result.text);
});

test('the default engine-purity scan finds no violations in the real packages/engine/src (sanity check)', () => {
  const runners = defaultRunners();
  const violations = scanEnginePurity(resolve('packages/engine/src'), runners.fs);
  assert.deepEqual(violations, []);
});

test('package.json exposes a verify:doctor script that runs doctor.ts', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts['verify:doctor'], 'string');
  assert.match(pkg.scripts['verify:doctor'], /scripts\/verify\/doctor\.ts/);
});

test('.gitignore ignores the verification artifacts directory', () => {
  const gitignore = readFileSync(resolve('.gitignore'), 'utf8');
  assert.match(gitignore, /artifacts\/verification\//);
});
