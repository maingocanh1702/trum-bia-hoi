import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDoctor, defaultRunners, exitCodeFor, scanEnginePurity, resolveEngineOnly, type DoctorRunners } from './doctor';

function tempDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `doctor-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

const VALID_SHA = 'a'.repeat(40);

// A fully green baseline so each test below only ever overrides the one runner it means to
// break -- a failure elsewhere would mean the test is pinning the wrong branch. `root` is the
// test's own tempdir; the git worktree/sha defaults are wired to genuinely match it so the new
// repo/deps falsifiable checks pass by default too.
function happyRunners(root: string, overrides: Partial<DoctorRunners> = {}): DoctorRunners {
  const real = defaultRunners();
  return {
    git: overrides.git ?? {
      headSha: () => VALID_SHA,
      branch: () => 'feature-x',
      worktreePath: () => root,
    },
    exec: overrides.exec ?? {
      checkConfig: () => ({ code: 0 }),
      checkI18n: () => ({ code: 0 }),
      mapCoverage: () => ({ code: 0 }),
    },
    fetch: overrides.fetch ?? {
      bridgeVersion: () => ({ commit: VALID_SHA, worktree: root }),
      serverHealth: () => true,
      consoleErrors: () => [],
    },
    fs: overrides.fs ?? { ...real.fs, pathExists: () => true },
  };
}

test('STALE BUILD: bridge version().commit != injected HEAD sha fails the bridge line and the overall result', (t) => {
  const root = tempDir(t, 'stale-build');
  const runners = happyRunners(root, {
    fetch: {
      bridgeVersion: () => ({ commit: 'sha-stale', worktree: root }),
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
  const runners = happyRunners(root, {
    fetch: {
      bridgeVersion: () => ({ commit: VALID_SHA, worktree: '/worktree/bad' }),
      serverHealth: () => true,
      consoleErrors: () => [],
    },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners });
  const bridgeLines = result.lines.filter((l) => l.group === 'bridge');
  assert.ok(bridgeLines.some((l) => !l.ok && /WRONG INSTANCE/.test(l.label)));
  assert.equal(result.ok, false);
});

test('repo: a HEAD sha that is not a 40-hex commit sha fails the repo line and the overall result', (t) => {
  const root = tempDir(t, 'repo-bad-sha');
  const runners = happyRunners(root, {
    git: { headSha: () => 'not-a-sha', branch: () => 'feature-x', worktreePath: () => root },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const repoLines = result.lines.filter((l) => l.group === 'repo');
  assert.ok(repoLines.some((l) => !l.ok && /INVALID SHA/.test(l.label)));
  assert.equal(result.ok, false);
});

test('repo: an injected worktreePath that is not the resolved cwd fails the repo line and the overall result', (t) => {
  const root = tempDir(t, 'repo-wrong-root');
  const runners = happyRunners(root, {
    git: { headSha: () => VALID_SHA, branch: () => 'feature-x', worktreePath: () => '/some/other/root' },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const repoLines = result.lines.filter((l) => l.group === 'repo');
  assert.ok(repoLines.some((l) => !l.ok && /WRONG ROOT/.test(l.label)));
  assert.equal(result.ok, false);
});

test('deps: a missing node_modules (injected filesystem check) fails the deps line and the overall result', (t) => {
  const root = tempDir(t, 'deps-missing-node-modules');
  const runners = happyRunners(root, { fs: { ...defaultRunners().fs, pathExists: () => false } });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const depsLines = result.lines.filter((l) => l.group === 'deps');
  assert.ok(depsLines.some((l) => !l.ok && /MISSING node_modules/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a red check:config (injected non-zero exit) fails the binding line and the overall result', (t) => {
  const root = tempDir(t, 'check-config-red');
  const runners = happyRunners(root, {
    exec: { checkConfig: () => ({ code: 1 }), checkI18n: () => ({ code: 0 }), mapCoverage: () => ({ code: 0 }) },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /check:config/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a red check:i18n (injected non-zero exit) fails the binding line and the overall result', (t) => {
  const root = tempDir(t, 'check-i18n-red');
  const runners = happyRunners(root, {
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /custom-rng\.ts/.test(l.label)));
  assert.equal(result.ok, false);
});

test('the rng.ts exemption only applies at the engine-src root -- a nested packages/engine/src/**/rng.ts still fails', (t) => {
  const root = tempDir(t, 'purity-nested-rng-not-exempt');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  const nestedDir = resolve(engineSrcDir, 'sub');
  mkdirSync(nestedDir, { recursive: true });
  writeFileSync(resolve(nestedDir, 'rng.ts'), 'export const x = Math.random();\n');
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /rng\.ts: Math\.random\(\)/.test(l.label)));
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /side-effect\.ts: react import/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a `react/jsx-runtime` subpath import is caught by module-specifier prefix matching', (t) => {
  const root = tempDir(t, 'purity-react-jsx-runtime');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'jsx.ts'), ['import "react/jsx-runtime";', 'export const x = 1;', ''].join('\n'));
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /jsx\.ts: react import/.test(l.label)));
  assert.equal(result.ok, false);
});

test('a string literal spelling `from \'react\'` is not mistaken for a real import', (t) => {
  const root = tempDir(t, 'purity-react-string-literal');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'note.ts'), "export const note = \"from 'react'\";\n");
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a regex literal containing the word "window" is not flagged -- only a bare identifier use is', (t) => {
  const root = tempDir(t, 'purity-regex-literal');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'regex.ts'), 'export const re = /window/;\n');
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('an object literal key named window passes -- it is a property label, not a global reference', (t) => {
  const root = tempDir(t, 'purity-object-key-window');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'obj-key.ts'), 'export const cfg = { window: 1 };\n');
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a parameter named window passes as a declaration and shadows the global for its own function body', (t) => {
  const root = tempDir(t, 'purity-parameter-window');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'param.ts'), ['export function f(window: number) {', '  return window;', '}', ''].join('\n'));
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('template interpolation keeps expressions live -- `${Date.now()}` and `${window.x}` both fail even wrapped in a template string', (t) => {
  const root = tempDir(t, 'purity-template-interpolation');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'tmpl.ts'), 'export const s = `${Date.now()} ${window.x}`;\n');
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /tmpl\.ts: Date\.now\(\)/.test(l.label)));
  assert.ok(bindingLines.some((l) => !l.ok && /tmpl\.ts.*window global/.test(l.label)));
  assert.equal(result.ok, false);
});

test('Date?.now() with optional chaining still fails', (t) => {
  const root = tempDir(t, 'purity-optional-chain-date-now');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'opt.ts'), ['export function stamp() {', '  return Date?.now();', '}', ''].join('\n'));
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /opt\.ts: Date\.now\(\)/.test(l.label)));
  assert.equal(result.ok, false);
});

test('Math["random"]() with computed member access still fails', (t) => {
  const root = tempDir(t, 'purity-computed-math-random');
  const engineSrcDir = resolve(root, 'packages/engine/src');
  mkdirSync(engineSrcDir, { recursive: true });
  writeFileSync(resolve(engineSrcDir, 'computed.ts'), ['export function roll() {', '  return Math["random"]();', '}', ''].join('\n'));
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.some((l) => !l.ok && /computed\.ts: Math\.random\(\)/.test(l.label)));
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
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
  const runners = happyRunners(root);
  const result = runDoctor({ cwd: root, engineSrcDir, engineOnly: true, runners });
  const bindingLines = result.lines.filter((l) => l.group === 'binding');
  assert.ok(bindingLines.every((l) => l.ok));
  assert.equal(result.ok, true);
});

test('a map-coverage failure (injected non-zero exit) fails the map line and the overall result', (t) => {
  const root = tempDir(t, 'map-fail');
  const runners = happyRunners(root, {
    exec: { checkConfig: () => ({ code: 0 }), checkI18n: () => ({ code: 0 }), mapCoverage: () => ({ code: 1 }) },
  });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly: true, runners });
  const mapLines = result.lines.filter((l) => l.group === 'map');
  assert.ok(mapLines.some((l) => !l.ok));
  assert.equal(result.ok, false);
});

test('overall result is ok (and exit code would be 0) only when every line passes', (t) => {
  const root = tempDir(t, 'all-green');
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), runners: happyRunners(root) });
  assert.equal(result.ok, true);
  assert.ok(result.lines.length > 0);
  assert.ok(result.lines.every((l) => l.ok));
});

test('--engine-only skips the server/bridge/console groups entirely, running only repo/deps/binding/map', (t) => {
  const root = tempDir(t, 'engine-only');
  // Deliberately broken fetch runner -- if server/bridge/console ran, this would fail the result.
  const runners = happyRunners(root, {
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
  const runners = happyRunners(root, {
    git: { headSha: () => VALID_SHA, branch: () => 'my-weird-branch', worktreePath: () => root },
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

test('resolveEngineOnly defaults to true (engine-only) with no flags -- this is the shipped verify:doctor argv', () => {
  assert.equal(resolveEngineOnly([]), true);
});

test('resolveEngineOnly is false only when --full is explicitly passed, opting into server/bridge/console for a caller with real runners', () => {
  assert.equal(resolveEngineOnly(['--full']), false);
});

test('resolveEngineOnly still treats an explicit --engine-only as engine-only', () => {
  assert.equal(resolveEngineOnly(['--engine-only']), true);
});

test('the shipped default argv (no flags) drives an all-green in-memory run to exit 0, proving verify:doctor can actually pass without a browser', (t) => {
  const root = tempDir(t, 'shipped-default-green');
  const engineOnly = resolveEngineOnly([]);
  // The real fail-closed fetch adapter is wired in on purpose -- since the shipped argv resolves
  // to engine-only, it must never be reached, and the run must still exit 0.
  const runners = happyRunners(root, { fetch: defaultRunners().fetch });
  const result = runDoctor({ cwd: root, engineSrcDir: resolve(root, 'packages/engine/src'), engineOnly, runners });
  assert.equal(exitCodeFor(result), 0);
});

test('control characters in injected bridge/console text are escaped so they cannot forge extra report lines', (t) => {
  const root = tempDir(t, 'injection');
  const runners = happyRunners(root, {
    fetch: {
      bridgeVersion: () => ({ commit: VALID_SHA, worktree: root }),
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
