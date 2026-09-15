import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDoctor, defaultRunners, exitCodeFor, scanEnginePurity, type DoctorRunners } from './doctor';

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
      checkI18n: () => ({ code: 0 }),
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
  const runners = happyRunners({
    exec: { checkConfig: () => ({ code: 1 }), checkI18n: () => ({ code: 0 }), mapCoverage: () => ({ code: 0 }) },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /check:config/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a red check:i18n (injected non-zero exit) fails the binding line and the overall result', (t) => {
  const root = tempDir(t, 'check-i18n-red');
  const runners = happyRunners({
    exec: { checkConfig: () => ({ code: 0 }), checkI18n: () => ({ code: 1 }), mapCoverage: () => ({ code: 0 }) },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /check:i18n/.test(l.label)));
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

test('the rng.ts exemption is an exact filename match, not a suffix match -- custom-rng.ts still fails', (t) => {
  const root = tempDir(t, 'purity-rng-suffix-not-exempt');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'custom-rng.ts'), 'export const x = Math.random();\n');
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /custom-rng\.ts/.test(l.label)));
  assert.equal(result.ok, false);
});

test('engine-purity scan flags document/localStorage/sessionStorage/indexedDB, not only window', (t) => {
  const root = tempDir(t, 'purity-dom-globals');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(
    resolve(engineSrcDir, 'dom.ts'),
    ['export function touch() {', '  return document.title + localStorage.length + sessionStorage.length + indexedDB.name;', '}', ''].join('\n'),
  );
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  const purityLine = bindingLines.find((l) => /dom\.ts/.test(l.label));
  assert.ok(purityLine && !purityLine.ok);
  assert.match(purityLine!.label, /document global/);
  assert.match(purityLine!.label, /localStorage global/);
  assert.match(purityLine!.label, /sessionStorage global/);
  assert.match(purityLine!.label, /indexedDB global/);
});

test('a bare side-effect `import "react"` is flagged even without a `from` clause', (t) => {
  const root = tempDir(t, 'purity-bare-react-import');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'side-effect.ts'), ['import "react";', 'export const x = 1;', ''].join('\n'));
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /side-effect\.ts: react import/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a local `window` shadow only exempts its own enclosing scope -- a real global window read in a different function still fails', (t) => {
  const root = tempDir(t, 'purity-window-shadow-scoped');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(
    resolve(engineSrcDir, 'mixed-window.ts'),
    [
      'export function shadowed() {',
      '  const window = { startsAt: 1 };',
      '  return window.startsAt;',
      '}',
      '',
      'export function unshadowed() {',
      '  return window.location.href;',
      '}',
      '',
    ].join('\n'),
  );
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /mixed-window\.ts.*window global/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a `//` inside a string literal (e.g. a URL) is not mistaken for a comment start -- a real Date.now() later on the same line still fails', (t) => {
  const root = tempDir(t, 'purity-url-string-comment');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(
    resolve(engineSrcDir, 'url.ts'),
    ['export function stamp() {', '  const u = "http://example"; return Date.now();', '}', ''].join('\n'),
  );
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /url\.ts: Date\.now\(\)/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a harmless string literal containing the word "window" is not flagged -- only a bare identifier use is', (t) => {
  const root = tempDir(t, 'purity-window-string-literal');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'label.ts'), 'export const label = "window";\n');
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a `window` shadow whose block opens and closes on the same line still exits its scope -- a later top-level `window` read still fails', (t) => {
  const root = tempDir(t, 'purity-window-shadow-one-line');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(
    resolve(engineSrcDir, 'one-line-shadow.ts'),
    [
      'if (true) { const window = { x: 1 }; void window.x; }',
      'export function real() {',
      '  return window.location.href;',
      '}',
      '',
    ].join('\n'),
  );
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /one-line-shadow\.ts.*window global/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a dynamic `import("react")` is flagged, not only static import/from/require forms', (t) => {
  const root = tempDir(t, 'purity-dynamic-react-import');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'dynamic.ts'), ['export async function load() {', "  return import('react');", '}', ''].join('\n'));
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /dynamic\.ts: react import/.test(l.label)));
  assert.equal(result.ok, false);
});

test('the purity scan does not follow a symlink under packages/engine/src out of the tree', (t) => {
  const root = tempDir(t, 'purity-symlink');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  const outsideDir = resolve(root, 'outside');
  mkdirSync(outsideDir, { recursive: true });
  writeFileSync(resolve(outsideDir, 'escaped.ts'), 'export const x = window;\n');
  symlinkSync(outsideDir, resolve(engineSrcDir, 'linked'));
  const runners = happyRunners();
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a map-coverage failure (injected non-zero exit) fails the map line and the overall result', (t) => {
  const root = tempDir(t, 'map-fail');
  const runners = happyRunners({
    exec: { checkConfig: () => ({ code: 0 }), checkI18n: () => ({ code: 0 }), mapCoverage: () => ({ code: 1 }) },
  });
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

test('exitCodeFor maps the report ok flag to the process exit code the CLI actually uses', () => {
  assert.equal(exitCodeFor({ ok: true }), 0);
  assert.equal(exitCodeFor({ ok: false }), 1);
});

test('the default fetch adapter fails closed for server/bridge/console -- it never fabricates a PASS it did not check', () => {
  const runners = defaultRunners();
  assert.equal(runners.fetch.serverHealth(), false);
  assert.equal(runners.fetch.bridgeVersion(), null);
  assert.ok(runners.fetch.consoleErrors().length > 0);
});

test('control characters in injected bridge/console text are escaped so they cannot forge extra report lines', (t) => {
  const root = tempDir(t, 'injection');
  const runners = happyRunners({
    fetch: {
      bridgeVersion: () => ({ commit: 'sha-good', worktree: '/worktree/good' }),
      serverHealth: () => true,
      consoleErrors: () => ['boom\n✓ forged bridge line'],
    },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners });
  const physicalLines = result.text.split('\n').filter((l) => l.length > 0);
  assert.equal(physicalLines.length, result.lines.length);
  assert.match(result.text, /boom\\x0a/);
  assert.ok(!physicalLines.some((l) => /^✓ forged bridge line$/.test(l)));
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
