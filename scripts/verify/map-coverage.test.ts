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

function fixtureDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `map-coverage-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

function writeFullyCitedMarkdown(featureMapDir: string, omit: string[] = []): void {
  mkdirSync(featureMapDir, { recursive: true });
  const commands = collectCommandTypes(process.cwd()).filter((name) => !omit.includes(name));
  const events = collectEmittedEvents(process.cwd()).filter((name) => !omit.includes(name));
  const tests = collectTestFiles(process.cwd()).filter((name) => !omit.includes(name));
  const lines = [
    '# fixture feature map',
    '## commands',
    ...commands.map((name) => `- \`${name}\``),
    '## events',
    ...events.map((name) => `- \`${name}\``),
    '## tests',
    ...tests.map((name) => `- \`${name}\``),
  ];
  writeFileSync(resolve(featureMapDir, 'coverage.md'), lines.join('\n') + '\n');
}

test('collectCommandTypes lists every type literal from the Command union', () => {
  const commands = collectCommandTypes(process.cwd());
  assert.ok(commands.includes('startShift'));
  assert.ok(commands.includes('serve'));
  assert.ok(commands.includes('emergencyPack'));
  assert.equal(new Set(commands).size, commands.length, 'no duplicate command types');
});

test('collectEmittedEvents lists this.emit(...) call-site event names, including ternary first-args', () => {
  const events = collectEmittedEvents(process.cwd());
  assert.ok(events.includes('shift_closing'));
  assert.ok(events.includes('kitchen_job_ready'));
  // ternary first-arg case: this.emit(item.dish === 'bia' ? 'beer_poured' : 'dish_ready', ...)
  assert.ok(events.includes('beer_poured'));
  assert.ok(events.includes('dish_ready'));
  // the ternary's condition-side literal must not leak in as a fake event name
  assert.ok(!events.includes('bia'));
});

test('collectTestFiles lists every test/spec file under the six test dirs, as repo-relative paths', () => {
  const files = collectTestFiles(process.cwd());
  assert.ok(files.includes('packages/engine/test/game.test.ts'));
  assert.ok(files.includes('apps/server/test/store.test.ts'));
  assert.ok(files.includes('apps/web/test/kitchen.spec.ts'));
  assert.ok(files.includes('apps/web/admin-test/admin.spec.ts'));
  assert.ok(files.includes('apps/web/remote-test/remote.spec.ts'));
  assert.ok(files.includes('apps/web/playable-test/shift.spec.ts'));
  // non test/spec helper files must not be picked up
  assert.ok(!files.some((f) => f.endsWith('fixtures/menu.ts')));
  assert.ok(!files.some((f) => f.endsWith('admin-test/server.ts')));
});

test('computeCoverage reports zero uncited items against a fixture dir that mentions everything', (t) => {
  const dir = fixtureDir(t, 'full');
  writeFullyCitedMarkdown(dir);
  const report = computeCoverage({ cwd: process.cwd(), featureMapDir: dir });
  assert.deepEqual(report.uncited, []);
  assert.ok(report.total > 0);
});

test('computeCoverage reports the deliberately omitted command as uncited', (t) => {
  const dir = fixtureDir(t, 'gap');
  writeFullyCitedMarkdown(dir, ['startShift']);
  const report = computeCoverage({ cwd: process.cwd(), featureMapDir: dir });
  assert.equal(report.uncited.length, 1);
  assert.deepEqual(report.uncited[0], { kind: 'command', name: 'startShift' });
});

test('computeCoverage treats a missing feature-map directory as zero citations found', () => {
  const missing = resolve('.qa', 'map-coverage-does-not-exist');
  const report = computeCoverage({ cwd: process.cwd(), featureMapDir: missing });
  assert.equal(report.uncited.length, report.total);
  assert.ok(report.total > 0);
});

test('CLI exits 1 and lists the gap when run against an incomplete fixture directory', (t) => {
  const dir = fixtureDir(t, 'cli-gap');
  writeFullyCitedMarkdown(dir, ['startShift']);
  const scriptPath = resolve('scripts/verify/map-coverage.ts');
  assert.throws(() => {
    execFileSync(process.execPath, ['--import', 'tsx', scriptPath, dir], { encoding: 'utf8' });
  }, (err: unknown) => {
    const e = err as { status?: number; stdout?: string };
    assert.equal(e.status, 1);
    assert.match(e.stdout ?? '', /startShift/);
    return true;
  });
});

test('CLI exits 0 when run against a fully-cited fixture directory', (t) => {
  const dir = fixtureDir(t, 'cli-full');
  writeFullyCitedMarkdown(dir);
  const scriptPath = resolve('scripts/verify/map-coverage.ts');
  const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath, dir], { encoding: 'utf8' });
  assert.match(output, /0 uncited|all .* cited/i);
});

test('package.json exposes a verify:map script that runs map-coverage against the real feature-map directory', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts['verify:map'], 'string');
  assert.match(pkg.scripts['verify:map'], /scripts\/verify\/map-coverage\.ts/);
});
