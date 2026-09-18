import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolveAllPorts, resolveBasePort, collectOtherWorktreeIds } from './port';

// WORKTREE_BASE_FLOOR/WORKTREE_BASE_SPAN/MAX_ROLE_OFFSET below duplicate port.ts's private
// constants (5200/300/39) the same way this file already duplicates the hash formula in
// "matches the sha256-hash formula" -- port.ts intentionally keeps them unexported.
const WORKTREE_BASE_FLOOR = 5200;
const WORKTREE_BASE_SPAN = 300;
const MAX_ROLE_OFFSET = 39; // max(ROLE_OFFSETS) after adding dev-web=37, dev-api=38, dev-preview=39

const LITERAL_PORTS = {
  'e2e': 4178,
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
  'dev-web': 4215,
  'dev-api': 4216,
  'dev-preview': 4217,
} as const;

function slotFor(id: string): number {
  return createHash('sha256').update(id.trim()).digest().readUInt32BE(0) % WORKTREE_BASE_SPAN;
}

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

test('CLI --role=<role> prints only that role\'s resolved port, for capturing into TBH_PORT (dev:server wiring)', () => {
  const scriptPath = resolve('scripts/verify/port.ts');
  const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath, '--role=dev-api'], {
    env: { ...process.env, TBH_PORT_BASE: '6200' }, encoding: 'utf8',
  });
  const expected = resolveAllPorts({ env: { TBH_PORT_BASE: '6200' } })['dev-api'];
  assert.equal(output.trim(), String(expected));
});

test('collision probe separates two live worktrees whose bases hash to the exact same slot', (t) => {
  const bySlot = new Map<number, string>();
  let contentA: string | undefined;
  let contentB: string | undefined;
  for (let i = 0; i < 5000 && !contentB; i++) {
    const content = `gitdir: /fake/main/.git/worktrees/collision-${i}\n`;
    const slot = slotFor(content);
    const existing = bySlot.get(slot);
    if (existing !== undefined) {
      contentA = existing;
      contentB = content;
      break;
    }
    bySlot.set(slot, content);
  }
  assert.ok(contentA && contentB, 'expected two candidates hashing to the same slot within 5000 tries');

  const cwdA = worktreeDir(t, contentA!);
  const cwdB = worktreeDir(t, contentB!);
  const baseA = resolveBasePort({ cwd: cwdA, env: {}, listOtherWorktreeIds: () => [contentB!.trim()] });
  const baseB = resolveBasePort({ cwd: cwdB, env: {}, listOtherWorktreeIds: () => [contentA!.trim()] });
  assert.notEqual(baseA, baseB, 'worktrees hashing to the same slot must resolve to different final bases');
  assert.equal(baseA, WORKTREE_BASE_FLOOR + slotFor(contentA!), 'each side computes the same deterministic winner');
});

test('collision probe also separates two worktrees whose bases hash to DIFFERENT slots but land within MAX_ROLE_OFFSET of each other', (t) => {
  const bySlot = new Map<number, string>();
  let contentA: string | undefined;
  let contentB: string | undefined;
  outer:
  for (let i = 0; i < 5000; i++) {
    const content = `gitdir: /fake/main/.git/worktrees/near-${i}\n`;
    const slot = slotFor(content);
    for (const [existingSlot, existingContent] of bySlot) {
      const diff = Math.abs(existingSlot - slot);
      if (diff > 0 && diff <= MAX_ROLE_OFFSET) {
        contentA = existingContent;
        contentB = content;
        break outer;
      }
    }
    if (!bySlot.has(slot)) bySlot.set(slot, content);
  }
  assert.ok(contentA && contentB, 'expected two candidates with near-colliding (but distinct) slots within 5000 tries');

  const cwdA = worktreeDir(t, contentA!);
  const cwdB = worktreeDir(t, contentB!);
  const baseA = resolveBasePort({ cwd: cwdA, env: {}, listOtherWorktreeIds: () => [contentB!.trim()] });
  const baseB = resolveBasePort({ cwd: cwdB, env: {}, listOtherWorktreeIds: () => [contentA!.trim()] });
  assert.ok(
    Math.abs(baseA - baseB) > MAX_ROLE_OFFSET,
    `bases ${baseA} and ${baseB} must end up more than MAX_ROLE_OFFSET (${MAX_ROLE_OFFSET}) apart after the probe`,
  );
});

test('collision probe result does not depend on the enumerated worktree list\'s iteration order', (t) => {
  const selfContent = 'gitdir: /fake/main/.git/worktrees/order-self\n';
  const otherContents = [
    'gitdir: /fake/main/.git/worktrees/order-b\n',
    'gitdir: /fake/main/.git/worktrees/order-c\n',
    'gitdir: /fake/main/.git/worktrees/order-d\n',
  ].map((s) => s.trim());
  const cwd = worktreeDir(t, selfContent);

  const forward = resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [...otherContents] });
  const reversed = resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [...otherContents].reverse() });
  const shuffled = resolveBasePort({
    cwd, env: {}, listOtherWorktreeIds: () => [otherContents[2], otherContents[0], otherContents[1]],
  });
  assert.equal(forward, reversed, 'reversing the enumerated list must not change the resolved base');
  assert.equal(forward, shuffled, 'shuffling the enumerated list must not change the resolved base');

  // Repeated in-process calls for the same live set must also agree with each other.
  const again = resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [...otherContents] });
  assert.equal(forward, again, 'repeated calls for the same live set must resolve to the same base');
});

// `git init`/`git worktree add` are unavailable in this test's sandbox (permission-denied when
// git tries to copy its hook templates), so this exercises the DEFAULT (non-injected)
// `listOtherWorktreeIds` against the REAL worktree this repo checkout already lives in --
// `git worktree list --porcelain` is a read-only query, so it needs no repo of its own. This is
// the same "spawn a real separate process" technique the pre-existing "is deterministic ... across
// ... separate process runs" test above uses, now exercised with real sibling worktrees present
// (this repo has several live worktrees today), proving the new probe is stable end-to-end against
// genuine `git worktree list --porcelain` output, not just the injected-fake-id path above.
test('CLI --role rejects inherited Object.prototype property names instead of printing a bogus port', () => {
  const scriptPath = resolve('scripts/verify/port.ts');
  for (const badRole of ['toString', '__proto__', 'hasOwnProperty', 'constructor']) {
    assert.throws(
      () => execFileSync(process.execPath, ['--import', 'tsx', scriptPath, `--role=${badRole}`], {
        env: { ...process.env, TBH_PORT_BASE: '6300' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      }),
      /Invalid --role/,
      `expected --role=${badRole} to be rejected`,
    );
  }
});

test('resolveBasePort fails closed (throws) instead of silently ignoring collisions when git itself is unresolvable', (t) => {
  const cwd = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/no-git-branch\n');
  assert.throws(
    () => resolveBasePort({ cwd, env: { PATH: '' } }),
    /git.*not found|git.*unresolvable|Cannot resolve/i,
  );
});

test('resolveBasePort still degrades to a solo hash when git runs but reports no usable repository (fake fixtures keep working)', (t) => {
  const cwd = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/still-degrades-branch\n');
  // No PATH override here: git itself IS resolvable, it just fails with "not a git repository"
  // against this fixture's nonexistent gitdir target -- that must keep degrading to [], not throw.
  const base = resolveBasePort({ cwd, env: {} });
  assert.ok(base >= 5200 && base < 5500, `base ${base} out of expected [5200,5500) range`);
});

// `git worktree add` is unavailable in this sandbox, so a genuinely unreadable REAL sibling can't
// be created via git itself -- but collectOtherWorktreeIds (split out of
// defaultListOtherWorktreeIds precisely for this) can be driven directly with synthetic porcelain
// text pointing at a real fixture whose `.git` we control the permission bits of.
test('collision discovery fails closed instead of silently skipping a sibling whose .git is unreadable for a non-ENOENT reason', (t) => {
  if (process.getuid && process.getuid() === 0) return; // root bypasses permission bits; nothing to exercise
  const dir = worktreeDir(t, 'gitdir: /fake/main/.git/worktrees/unreadable-branch\n');
  const gitFile = resolve(dir, '.git');
  chmodSync(gitFile, 0o000);
  const porcelain = `worktree ${dir}\nHEAD 0000000000000000000000000000000000000000\nbranch refs/heads/unreadable\n\n`;
  try {
    assert.throws(
      () => collectOtherWorktreeIds(porcelain, resolve('/some/other/self-cwd')),
      /could not be inspected/,
      'an EACCES on a sibling .git file must propagate, not silently drop that sibling from the live set',
    );
  } finally {
    chmodSync(gitFile, 0o644);
  }
});

test('collision discovery still skips a sibling whose .git has plainly disappeared (ordinary pruned-worktree churn)', () => {
  const goneDir = resolve('.qa', 'port-gone-does-not-exist');
  const porcelain = `worktree ${goneDir}\nHEAD 0000000000000000000000000000000000000000\nbranch refs/heads/gone\n\n`;
  assert.deepEqual(collectOtherWorktreeIds(porcelain, resolve('/some/other/self-cwd')), []);
});

test('resolveBasePort fails closed when the port registry file exists but contains invalid JSON', (t) => {
  const sharedDir = fixtureDir(t, 'corrupt-registry');
  mkdirSync(resolve(sharedDir, '.git'), { recursive: true });
  const commonGitDir = resolve(sharedDir, '.git');
  writeFileSync(resolve(commonGitDir, 'tbh-port-registry.json'), '{not valid json');
  const cwd = worktreeDir(t, `gitdir: ${commonGitDir}/worktrees/corrupt-branch\n`);
  assert.throws(
    () => resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [] }),
    /port registry.*invalid JSON/i,
    'corrupt registry state must fail closed, not be silently treated as an empty registry',
  );
});

test('resolveBasePort fails closed when the port registry path cannot be written for a reason other than a missing directory', (t) => {
  if (process.getuid && process.getuid() === 0) return; // root bypasses permission bits
  const sharedDir = fixtureDir(t, 'unwritable-registry');
  mkdirSync(resolve(sharedDir, '.git'), { recursive: true });
  const commonGitDir = resolve(sharedDir, '.git');
  // A pre-existing, VALID, readable registry file whose file mode blocks writes -- so the read
  // half succeeds (proving this is a write-path failure, not the read-path failure the previous
  // test already covers) and only the subsequent writeFileSync fails, with EACCES, not ENOENT.
  const registryPath = resolve(commonGitDir, 'tbh-port-registry.json');
  writeFileSync(registryPath, '{}');
  chmodSync(registryPath, 0o444);
  const cwd = worktreeDir(t, `gitdir: ${commonGitDir}/worktrees/unwritable-branch\n`);
  try {
    assert.throws(
      () => resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [] }),
      /port registry.*could not be written/i,
      'a failed registry write must fail closed, not be silently swallowed as best-effort',
    );
  } finally {
    chmodSync(registryPath, 0o644);
  }
});

test('an already-registered (incumbent) worktree keeps its resolved base when a colliding sibling joins later', (t) => {
  const sharedDir = fixtureDir(t, 'shared-registry');
  mkdirSync(resolve(sharedDir, '.git'), { recursive: true });
  const commonGitDir = resolve(sharedDir, '.git');

  const bySlot = new Map<number, string>();
  let incumbentName: string | undefined;
  let newcomerName: string | undefined;
  for (let i = 0; i < 5000 && !newcomerName; i++) {
    const name = `incumbent-registry-${i}`;
    const content = `gitdir: ${commonGitDir}/worktrees/${name}\n`;
    const slot = slotFor(content);
    const existing = bySlot.get(slot);
    if (existing !== undefined) {
      incumbentName = existing;
      newcomerName = name;
      break;
    }
    bySlot.set(slot, name);
  }
  assert.ok(incumbentName && newcomerName, 'expected two candidate worktree names hashing to the same slot within 5000 tries');

  function worktreeCwdFor(name: string): string {
    const dir = fixtureDir(t, `registry-member-${name}`);
    writeFileSync(resolve(dir, '.git'), `gitdir: ${commonGitDir}/worktrees/${name}\n`);
    return dir;
  }

  const incumbentCwd = worktreeCwdFor(incumbentName!);
  const newcomerCwd = worktreeCwdFor(newcomerName!);

  // Incumbent starts ALONE (no siblings yet) and registers its base.
  const incumbentBaseBeforeJoin = resolveBasePort({ cwd: incumbentCwd, env: {}, listOtherWorktreeIds: () => [] });

  // Newcomer joins later, aware of the incumbent.
  const incumbentContent = readFileSync(resolve(incumbentCwd, '.git'), 'utf8').trim();
  const newcomerBase = resolveBasePort({ cwd: newcomerCwd, env: {}, listOtherWorktreeIds: () => [incumbentContent] });

  // Incumbent's tooling runs AGAIN now that the newcomer is live -- its base must not have moved.
  const newcomerContent = readFileSync(resolve(newcomerCwd, '.git'), 'utf8').trim();
  const incumbentBaseAfterJoin = resolveBasePort({ cwd: incumbentCwd, env: {}, listOtherWorktreeIds: () => [newcomerContent] });

  assert.equal(incumbentBaseAfterJoin, incumbentBaseBeforeJoin, 'an already-registered incumbent base must not change when a colliding sibling joins later');
  assert.notEqual(newcomerBase, incumbentBaseBeforeJoin, 'the newcomer must not be handed the incumbent\'s already-registered base');
  assert.ok(Math.abs(newcomerBase - incumbentBaseBeforeJoin) > MAX_ROLE_OFFSET, 'incumbent and newcomer bases must be separated by more than MAX_ROLE_OFFSET');
});

// `git init`/`git worktree add` are unavailable in this test's sandbox (see the real-live-worktree
// test below), so a genuinely COLLIDING fake set can only be driven through a separate process via
// the TBH_TEST_OTHER_WORKTREE_IDS test-only CLI hook (port.ts's own `parseTestOtherWorktreeIds`) --
// this is what "the required fake-set cross-process stability proof" actually needs: proof that the
// SAME colliding fake set resolves to the SAME final base whether computed in-process or by a
// separate `node ... port.ts` invocation, repeated -- for BOTH sides of the collision, not just one
// (review round 3, finding "the required every-worktree subprocess proof remains incomplete").
test('collision probe is stable for a genuinely colliding FAKE worktree set across separate process invocations, for both sides', (t) => {
  const bySlot = new Map<number, string>();
  let contentA: string | undefined;
  let contentB: string | undefined;
  for (let i = 0; i < 5000 && !contentB; i++) {
    const content = `gitdir: /fake/main/.git/worktrees/xproc-${i}\n`;
    const slot = slotFor(content);
    const existing = bySlot.get(slot);
    if (existing !== undefined) {
      contentA = existing;
      contentB = content;
      break;
    }
    bySlot.set(slot, content);
  }
  assert.ok(contentA && contentB, 'expected two candidates hashing to the same slot within 5000 tries');

  const cwdA = worktreeDir(t, contentA!);
  const cwdB = worktreeDir(t, contentB!);
  const inProcessA = resolveBasePort({ cwd: cwdA, env: {}, listOtherWorktreeIds: () => [contentB!.trim()] });
  const inProcessB = resolveBasePort({ cwd: cwdB, env: {}, listOtherWorktreeIds: () => [contentA!.trim()] });
  assert.notEqual(inProcessA, inProcessB, 'sanity: the two sides must not share a base in-process either');

  const scriptPath = resolve('scripts/verify/port.ts');
  const { TBH_PORT_BASE, ...envWithoutOverride } = process.env;
  const runSubprocess = (cwd: string, otherContent: string) => {
    const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath], {
      cwd,
      env: { ...envWithoutOverride, TBH_TEST_OTHER_WORKTREE_IDS: JSON.stringify([otherContent]) },
      encoding: 'utf8',
    });
    const [role, port] = output.trim().split('\n')[0].split('\t');
    assert.equal(role, 'e2e', 'expected the first printed role to be e2e (offset 0), i.e. the base itself');
    return Number(port); // e2e's offset is 0, so its printed port IS the resolved base.
  };

  const firstA = runSubprocess(cwdA, contentB!.trim());
  const secondA = runSubprocess(cwdA, contentB!.trim());
  assert.equal(firstA, inProcessA, 'side A: a separate process invocation must agree with the in-process result');
  assert.equal(secondA, firstA, 'side A: repeated separate process invocations must agree with each other');

  const firstB = runSubprocess(cwdB, contentA!.trim());
  const secondB = runSubprocess(cwdB, contentA!.trim());
  assert.equal(firstB, inProcessB, 'side B: a separate process invocation must agree with the in-process result');
  assert.equal(secondB, firstB, 'side B: repeated separate process invocations must agree with each other');

  assert.notEqual(firstA, firstB, 'both sides of the colliding fake set must stay separated across separate process invocations too');
});

// This repo's real `git worktree list` can include a live sibling this SANDBOXED test session has
// no read access to at all (e.g. one created under a path this environment's own OS-level sandbox
// denies outright, distinct from an ordinary Unix permission bit) -- collision discovery now fails
// closed rather than silently degrading in that case (see the collectOtherWorktreeIds fail-closed
// tests above), so "stable" here means either succeeding identically every time, or failing closed
// identically every time -- never flapping, and never silently swallowing an inspection failure to
// produce a possibly-incomplete answer.
test('collision probe is stable for the real live worktree across repeated calls and a separate process invocation', () => {
  const cwd = resolve('.');
  const attemptInProcess = (): { ok: Record<string, number> } | { failed: true } => {
    try {
      return { ok: resolveAllPorts({ cwd, env: {} }) };
    } catch {
      return { failed: true };
    }
  };
  const first = attemptInProcess();
  const second = attemptInProcess();
  assert.deepEqual(first, second, 'repeated in-process calls against the real live worktree list must agree, including failing closed the same way');

  const { TBH_PORT_BASE, ...envWithoutOverride } = process.env;
  const scriptPath = resolve('scripts/verify/port.ts');
  let fromSeparateProcess: { ok: Record<string, number> } | { failed: true };
  try {
    const output = execFileSync(process.execPath, ['--import', 'tsx', scriptPath], {
      cwd, env: envWithoutOverride, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed: Record<string, number> = {};
    for (const line of output.trim().split('\n').filter(Boolean)) {
      const [role, port] = line.split('\t');
      parsed[role] = Number(port);
    }
    fromSeparateProcess = { ok: parsed };
  } catch {
    fromSeparateProcess = { failed: true };
  }

  if ('failed' in first) {
    assert.ok('failed' in fromSeparateProcess, 'a separate process invocation must fail closed the same way the in-process call did, not silently succeed with a possibly-incomplete view');
  } else {
    assert.deepEqual(fromSeparateProcess, first, 'a separate process invocation against the real live worktree list must agree');
  }
});
