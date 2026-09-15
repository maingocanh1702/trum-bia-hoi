import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  collectCommandTypes,
  collectEmittedEvents,
  collectTestFiles,
  computeCoverage,
} from './map-coverage';

function tempDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `map-coverage-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

// A fully synthetic source tree, independent of the real repo, so expectations below are
// literal constants rather than values derived from the collectors under test -- a collector
// bug that silently drops a real-repo item would otherwise go undetected because both the
// fixture and the assertion would inherit the same gap.
const EXPECTED_COMMANDS = ['startShift', 'serve', 'serveDelivery'];
// `event_multi` is only reachable via a call whose args span multiple lines; `event_a`/`event_b`
// come from a ternary whose condition side also contains string literals that must not leak in.
const EXPECTED_EVENTS = ['event_plain', 'event_multi', 'event_a', 'event_b'];
const EXPECTED_TESTS = [
  'packages/engine/test/sample.test.ts',
  'apps/server/test/sample.test.ts',
  'apps/web/test/sample.spec.ts',
  'apps/web/admin-test/sample.spec.ts',
  'apps/web/remote-test/sample.spec.ts',
  'apps/web/playable-test/sample.spec.ts',
];

function buildSyntheticRepo(root: string): void {
  const typesDir = resolve(root, 'packages/engine/src');
  mkdirSync(typesDir, { recursive: true });
  writeFileSync(
    resolve(typesDir, 'types.ts'),
    [
      'export type Command =',
      "  | { type: 'startShift' }",
      "  | { type: 'serve'; tableId: string }",
      "  | { type: 'serveDelivery'; deliveryId: string };",
      '',
    ].join('\n'),
  );
  writeFileSync(
    resolve(typesDir, 'engine.ts'),
    [
      'export class FakeEngine {',
      '  private emit(type: string, payload?: unknown) {}',
      '  plain() {',
      "    this.emit('event_plain', {});",
      '  }',
      '  multiline() {',
      '    this.emit(',
      "      'event_multi',",
      "      { note: 'payload spans lines' },",
      '    );',
      '  }',
      "  ternary(kind: 'x' | 'y') {",
      "    this.emit(kind === 'x' ? 'event_a' : 'event_b', {});",
      '  }',
      '}',
      '',
    ].join('\n'),
  );
  const testDirs = [
    ['packages/engine/test', 'sample.test.ts'],
    ['apps/server/test', 'sample.test.ts'],
    ['apps/web/test', 'sample.spec.ts'],
    ['apps/web/admin-test', 'sample.spec.ts'],
    ['apps/web/remote-test', 'sample.spec.ts'],
    ['apps/web/playable-test', 'sample.spec.ts'],
  ];
  for (const [dir, file] of testDirs) {
    mkdirSync(resolve(root, dir), { recursive: true });
    writeFileSync(resolve(root, dir, file), "test('placeholder', () => {});\n");
  }
  // Non test/spec helper file, to prove it is excluded from collectTestFiles.
  mkdirSync(resolve(root, 'apps/web/test/fixtures'), { recursive: true });
  writeFileSync(resolve(root, 'apps/web/test/fixtures', 'helper.ts'), 'export const helper = 1;\n');
}

function writeFeatureMapMarkdown(featureMapDir: string, names: string[]): void {
  mkdirSync(featureMapDir, { recursive: true });
  const lines = ['# fixture feature map', ...names.map((name) => `- \`${name}\``)];
  writeFileSync(resolve(featureMapDir, 'coverage.md'), lines.join('\n') + '\n');
}

test('collectCommandTypes lists every type literal from the Command union', (t) => {
  const root = tempDir(t, 'collect-commands');
  buildSyntheticRepo(root);
  const commands = collectCommandTypes(root);
  assert.deepEqual([...commands].sort(), [...EXPECTED_COMMANDS].sort());
});

test('collectEmittedEvents lists this.emit(...) call-site event names, including multiline and ternary first-args', (t) => {
  const root = tempDir(t, 'collect-events');
  buildSyntheticRepo(root);
  const events = collectEmittedEvents(root);
  assert.deepEqual([...events].sort(), [...EXPECTED_EVENTS].sort());
  // the ternary's condition-side literals must not leak in as fake event names
  assert.ok(!events.includes('x'));
  assert.ok(!events.includes('y'));
});

test('collectTestFiles lists every test/spec file under the six test dirs, as repo-relative paths', (t) => {
  const root = tempDir(t, 'collect-tests');
  buildSyntheticRepo(root);
  const files = collectTestFiles(root);
  assert.deepEqual([...files].sort(), [...EXPECTED_TESTS].sort());
  // non test/spec helper files must not be picked up
  assert.ok(!files.some((f) => f.endsWith('fixtures/helper.ts')));
});

test('collectCommandTypes/collectEmittedEvents also see the real repo (sanity check)', () => {
  const commands = collectCommandTypes(process.cwd());
  assert.ok(commands.includes('startShift'));
  assert.ok(commands.includes('serve'));
  assert.ok(commands.includes('emergencyPack'));
  assert.equal(new Set(commands).size, commands.length, 'no duplicate command types');
  const events = collectEmittedEvents(process.cwd());
  assert.ok(events.includes('shift_closing'));
  assert.ok(events.includes('kitchen_job_ready'));
});

test('computeCoverage reports zero uncited items against a fixture dir that mentions everything', (t) => {
  const root = tempDir(t, 'coverage-full');
  buildSyntheticRepo(root);
  const featureMapDir = resolve(root, 'feature-map');
  writeFeatureMapMarkdown(featureMapDir, [...EXPECTED_COMMANDS, ...EXPECTED_EVENTS, ...EXPECTED_TESTS]);
  const report = computeCoverage({ cwd: root, featureMapDir });
  assert.deepEqual(report.uncited, []);
  assert.equal(report.total, EXPECTED_COMMANDS.length + EXPECTED_EVENTS.length + EXPECTED_TESTS.length);
});

test('computeCoverage reports the deliberately omitted command as uncited', (t) => {
  const root = tempDir(t, 'coverage-gap');
  buildSyntheticRepo(root);
  const featureMapDir = resolve(root, 'feature-map');
  const cited = [...EXPECTED_COMMANDS, ...EXPECTED_EVENTS, ...EXPECTED_TESTS].filter((n) => n !== 'startShift');
  writeFeatureMapMarkdown(featureMapDir, cited);
  const report = computeCoverage({ cwd: root, featureMapDir });
  assert.equal(report.uncited.length, 1);
  assert.deepEqual(report.uncited[0], { kind: 'command', name: 'startShift' });
});

test('computeCoverage does not let a citation of a longer name falsely cover a shorter prefix name', (t) => {
  const root = tempDir(t, 'coverage-collision');
  buildSyntheticRepo(root);
  const featureMapDir = resolve(root, 'feature-map');
  // Cite `serveDelivery` (and everything else) but never cite `serve` on its own --
  // a naive substring match would wrongly treat `serve` as covered too.
  const cited = [...EXPECTED_COMMANDS, ...EXPECTED_EVENTS, ...EXPECTED_TESTS].filter((n) => n !== 'serve');
  writeFeatureMapMarkdown(featureMapDir, cited);
  const report = computeCoverage({ cwd: root, featureMapDir });
  assert.deepEqual(report.uncited, [{ kind: 'command', name: 'serve' }]);
});

test('computeCoverage treats a missing feature-map directory as zero citations found', (t) => {
  const root = tempDir(t, 'coverage-missing-dir');
  buildSyntheticRepo(root);
  const missing = resolve(root, 'feature-map-does-not-exist');
  const report = computeCoverage({ cwd: root, featureMapDir: missing });
  assert.equal(report.uncited.length, report.total);
  assert.ok(report.total > 0);
});

test('CLI exits 1 and lists the gap when run against an incomplete fixture directory', (t) => {
  const root = tempDir(t, 'cli-gap');
  buildSyntheticRepo(root);
  const featureMapDir = resolve(root, 'feature-map');
  const cited = [...EXPECTED_COMMANDS, ...EXPECTED_EVENTS, ...EXPECTED_TESTS].filter((n) => n !== 'startShift');
  writeFeatureMapMarkdown(featureMapDir, cited);
  const scriptPath = resolve('scripts/verify/map-coverage.ts');
  assert.throws(() => {
    execFileSync(process.execPath, ['--import', 'tsx', scriptPath, featureMapDir], { cwd: root, encoding: 'utf8' });
  }, (err: unknown) => {
    const e = err as { status?: number; stdout?: string };
    assert.equal(e.status, 1);
    assert.match(e.stdout ?? '', /startShift/);
    return true;
  });
});

test('CLI exits 0 when run against a fully-cited fixture directory', (t) => {
  const root = tempDir(t, 'cli-full');
  buildSyntheticRepo(root);
  const featureMapDir = resolve(root, 'feature-map');
  writeFeatureMapMarkdown(featureMapDir, [...EXPECTED_COMMANDS, ...EXPECTED_EVENTS, ...EXPECTED_TESTS]);
  const scriptPath = resolve('scripts/verify/map-coverage.ts');
  const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath, featureMapDir], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /0 uncited|all .* cited/i);
});

test('package.json exposes a verify:map script that runs map-coverage against the real feature-map directory', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts['verify:map'], 'string');
  assert.match(pkg.scripts['verify:map'], /scripts\/verify\/map-coverage\.ts/);
});
