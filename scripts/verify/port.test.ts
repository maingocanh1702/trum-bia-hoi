import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolveAllPorts } from './port';

const LITERAL_PORTS = {
  'e2e': 4178,
  'guest-web': 4183,
  'dev-identity-web': 4179,
  'dev-identity-api': 4180,
  'admin-web': 4181,
  'admin-api': 4182,
  'playable-web-0': 4209,
  'playable-api-0': 4210,
  'playable-web-1': 4211,
  'playable-api-1': 4212,
  'playable-web-2': 4213,
  'playable-api-2': 4214,
} as const;

function fixtureDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `port-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

function mainWorkspaceDir(t: { after(fn: () => unknown): void }): string {
  const dir = fixtureDir(t, 'main');
  mkdirSync(resolve(dir, '.git'));
  return dir;
}

function worktreeDir(t: { after(fn: () => unknown): void }, gitdirContent: string): string {
  const dir = fixtureDir(t, 'worktree');
  writeFileSync(resolve(dir, '.git'), gitdirContent);
  return dir;
}

test("resolves exactly today's literal ports in the main workspace with no override", (t) => {
  const cwd = mainWorkspaceDir(t);
  const ports = resolveAllPorts({ cwd, env: {} });
  assert.deepEqual(ports, LITERAL_PORTS);
});

test('resolves a hashed base plus fixed collision-free per-role offsets in a worktree', (t) => {
  const cwd = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/fake-branch\n');
  const ports = resolveAllPorts({ cwd, env: {} });
  const base = ports['e2e']; // offset('e2e') is 0 by construction
  assert.ok(base >= 5200 && base < 5500, `base ${base} out of expected [5200,5500) range`);
  assert.notEqual(base, LITERAL_PORTS['e2e'], 'worktree base must differ from the main-workspace default');
  for (const role of Object.keys(LITERAL_PORTS) as (keyof typeof LITERAL_PORTS)[]) {
    const offset = LITERAL_PORTS[role] - LITERAL_PORTS['e2e'];
    assert.equal(ports[role], base + offset, `role ${role} offset mismatch`);
  }
  const distinct = new Set(Object.values(ports));
  assert.equal(distinct.size, Object.keys(ports).length, 'resolved ports must be collision-free');
});

test('worktree base matches the sha256-hash formula for independently computed identifiers', (t) => {
  const gitdirContents = [
    'gitdir: /fake/main/.git/worktrees/fake-branch\n',
    'gitdir: /fake/main/.git/worktrees/other-branch\n',
  ];
  for (const content of gitdirContents) {
    const cwd = worktreeDir(t, content);
    const ports = resolveAllPorts({ cwd, env: {} });
    const digest = createHash('sha256').update(content.trim()).digest();
    const expectedBase = 5200 + (digest.readUInt32BE(0) % 300);
    assert.equal(ports['e2e'], expectedBase, `base mismatch for identifier "${content.trim()}"`);
  }
});

test('rejects invalid TBH_PORT_BASE overrides instead of producing unusable ports', (t) => {
  const cwd = mainWorkspaceDir(t);
  for (const invalid of ['', 'nope', ' ', '0', '12.5', '-1', '65500']) {
    assert.throws(
      () => resolveAllPorts({ cwd, env: { TBH_PORT_BASE: invalid } }),
      /Invalid TBH_PORT_BASE/,
      `expected rejection for TBH_PORT_BASE="${invalid}"`,
    );
  }
});

test('honours TBH_PORT_BASE override with the same offsets in both the main workspace and a worktree', (t) => {
  const mainCwd = mainWorkspaceDir(t);
  const worktreeCwd = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/other-branch\n');
  const mainPorts = resolveAllPorts({ cwd: mainCwd, env: { TBH_PORT_BASE: '6000' } });
  const worktreePorts = resolveAllPorts({ cwd: worktreeCwd, env: { TBH_PORT_BASE: '7000' } });
  for (const role of Object.keys(LITERAL_PORTS) as (keyof typeof LITERAL_PORTS)[]) {
    const offset = LITERAL_PORTS[role] - LITERAL_PORTS['e2e'];
    assert.equal(mainPorts[role], 6000 + offset);
    assert.equal(worktreePorts[role], 7000 + offset);
  }
});

test('is deterministic for the same worktree across repeated calls and separate process runs', (t) => {
  const cwd = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/deterministic-branch\n');
  const first = resolveAllPorts({ cwd, env: {} });
  const second = resolveAllPorts({ cwd, env: {} });
  assert.deepEqual(first, second);

  const { TBH_PORT_BASE, ...envWithoutOverride } = process.env;
  const scriptPath = resolve('scripts/verify/port.ts');
  const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath], {
    cwd, env: envWithoutOverride, encoding: 'utf8',
  });
  const fromSeparateProcess: Record<string, number> = {};
  for (const line of output.trim().split('\n').filter(Boolean)) {
    const [role, port] = line.split('\t');
    fromSeparateProcess[role] = Number(port);
  }
  assert.deepEqual(fromSeparateProcess, first);
});

test('package.json exposes a verify:port script that runs the resolver directly', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts['verify:port'], 'string');
  assert.match(pkg.scripts['verify:port'], /scripts\/verify\/port\.ts/);
});

test('npm run verify:port executes the resolver and prints the resolved ports', () => {
  const override = '6100';
  const output = execFileSync('npm', ['run', 'verify:port'], {
    env: { ...process.env, TBH_PORT_BASE: override },
    encoding: 'utf8',
  });
  const fromNpmScript: Record<string, number> = {};
  for (const line of output.split('\n')) {
    const match = /^([\w-]+)\t(\d+)$/.exec(line.trim());
    if (match) fromNpmScript[match[1]] = Number(match[2]);
  }
  const expected = resolveAllPorts({ env: { TBH_PORT_BASE: override } });
  assert.deepEqual(fromNpmScript, expected);
});
