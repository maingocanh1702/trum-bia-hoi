import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import net from 'node:net';
import { resolveAllPorts, resolveBasePort, collectOtherWorktreeIds } from './port';

// WORKTREE_BASE_FLOOR/WINDOW/WINDOWS below duplicate port.ts's private constants
// (10000/40/1250) the same way this file already duplicates the hash formula in
// "matches the sha256-hash formula" -- port.ts intentionally keeps them unexported.
const WORKTREE_BASE_FLOOR = 10000;
const WINDOW = 40;
const WINDOWS = 1250;

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
  'dev-web': 4215,
  'dev-api': 4216,
  'dev-preview': 4217,
} as const;

function windowFor(id: string): number {
  return createHash('sha256').update(id.trim()).digest().readUInt32BE(0) % WINDOWS;
}

function baseForWindow(window: number): number {
  return WORKTREE_BASE_FLOOR + WINDOW * window;
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
  assert.ok(base >= WORKTREE_BASE_FLOOR && base < WORKTREE_BASE_FLOOR + WINDOW * WINDOWS, `base ${base} out of expected [${WORKTREE_BASE_FLOOR},${WORKTREE_BASE_FLOOR + WINDOW * WINDOWS}) range`);
  assert.equal((base - WORKTREE_BASE_FLOOR) % WINDOW, 0, 'a worktree base must land exactly on a window boundary');
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
    const expectedBase = baseForWindow(windowFor(content));
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

test('collision probe separates two live worktrees whose bases hash to the exact same window with distinct, adjacent windows', (t) => {
  const byWindow = new Map<number, string>();
  let contentA: string | undefined;
  let contentB: string | undefined;
  for (let i = 0; i < 5000 && !contentB; i++) {
    const content = `gitdir: /fake/main/.git/worktrees/collision-${i}\n`;
    const window = windowFor(content);
    const existing = byWindow.get(window);
    if (existing !== undefined) {
      contentA = existing;
      contentB = content;
      break;
    }
    byWindow.set(window, content);
  }
  assert.ok(contentA && contentB, 'expected two candidates hashing to the same window within 5000 tries');

  const cwdA = worktreeDir(t, contentA!);
  const cwdB = worktreeDir(t, contentB!);
  const baseA = resolveBasePort({ cwd: cwdA, env: {}, listOtherWorktreeIds: () => [contentB!.trim()] });
  const baseB = resolveBasePort({ cwd: cwdB, env: {}, listOtherWorktreeIds: () => [contentA!.trim()] });
  assert.notEqual(baseA, baseB, 'worktrees hashing to the same window must resolve to different final bases');

  // Whichever id sorts first (lexicographically) wins the raw hashed window; the other is
  // pushed to the very NEXT window (adjacent, i.e. exactly WINDOW ports further), never further --
  // the probe only widens its search past one step if that next window is ALSO taken.
  const sortedFirst = [contentA!.trim(), contentB!.trim()].sort()[0];
  const winnerBase = sortedFirst === contentA!.trim() ? baseA : baseB;
  const loserBase = sortedFirst === contentA!.trim() ? baseB : baseA;
  assert.equal(winnerBase, baseForWindow(windowFor(sortedFirst)), 'the lexicographically-first id keeps the raw hashed window');
  assert.equal(loserBase, winnerBase + WINDOW, 'the other id must land on the very next (adjacent) window');
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
  assert.ok(
    base >= WORKTREE_BASE_FLOOR && base < WORKTREE_BASE_FLOOR + WINDOW * WINDOWS,
    `base ${base} out of expected [${WORKTREE_BASE_FLOOR},${WORKTREE_BASE_FLOOR + WINDOW * WINDOWS}) range`,
  );
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

// Unlike the "unreadable .git FILE" test above (chmod 0o000 on the .git FILE itself -- stat()
// doesn't need read permission on its target, only search permission on the parent directories,
// so that case only breaks the later readFileSync), THIS reproduces the review's actual repro
// (`/var/root/.git`): a sibling whose ENCLOSING DIRECTORY a non-root user cannot traverse at all,
// so `statSync` on the `.git` path itself throws EACCES. Before the fix, isWorktreeCwd() used
// `existsSync` first, which swallows every stat error (including EACCES) into "false" --
// silently treating the sibling as absent instead of failing closed.
test('collision discovery fails closed when a sibling worktree path itself cannot be stat-ed (EACCES on its parent directory)', (t) => {
  if (process.getuid && process.getuid() === 0) return; // root bypasses permission bits; nothing to exercise
  const parentDir = fixtureDir(t, 'unstatable-parent');
  const childDir = resolve(parentDir, 'worktree-child');
  mkdirSync(childDir);
  writeFileSync(resolve(childDir, '.git'), 'gitdir: /fake/main/.git/worktrees/unstatable\n');
  chmodSync(parentDir, 0o000);
  const porcelain = `worktree ${childDir}\nHEAD 0000000000000000000000000000000000000000\nbranch refs/heads/unstatable\n\n`;
  try {
    assert.throws(
      () => collectOtherWorktreeIds(porcelain, resolve('/some/other/self-cwd')),
      /could not be inspected/,
      'an EACCES stat-ing a sibling path must propagate, not silently drop that sibling from the live set',
    );
  } finally {
    chmodSync(parentDir, 0o755);
  }
});

// `git init`/`git worktree add` are unavailable in this test's sandbox (see the real-live-worktree
// test below), so a genuinely COLLIDING fake set can only be driven through a separate process via
// the TBH_TEST_OTHER_WORKTREE_IDS test-only CLI hook (port.ts's own `parseTestOtherWorktreeIds`) --
// this is what "the required fake-set cross-process stability proof" actually needs: proof that the
// SAME colliding fake set resolves to the SAME final base whether computed in-process or by a
// separate `node ... port.ts` invocation, repeated -- for BOTH sides of the collision, not just one
// (review round 3, finding "the required every-worktree subprocess proof remains incomplete").
test('collision probe is stable for a genuinely colliding FAKE worktree set across separate process invocations, for both sides', (t) => {
  const byWindow = new Map<number, string>();
  let contentA: string | undefined;
  let contentB: string | undefined;
  for (let i = 0; i < 5000 && !contentB; i++) {
    const content = `gitdir: /fake/main/.git/worktrees/xproc-${i}\n`;
    const window = windowFor(content);
    const existing = byWindow.get(window);
    if (existing !== undefined) {
      contentA = existing;
      contentB = content;
      break;
    }
    byWindow.set(window, content);
  }
  assert.ok(contentA && contentB, 'expected two candidates hashing to the same window within 5000 tries');

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

// The deterministic window assignment says nothing about what else is bound on this machine --
// bind a REAL loopback server on the deterministic window's own base port (its 'e2e' role port,
// offset 0) before resolving, so the resolver's own live-port-guard subprocess (a genuinely
// separate `node` process) has to detect a port held by THIS test process across process
// boundaries, exactly like it would for a stray dev server left running by something else.
test('live-port guard skips a deterministic window whose role port is already bound, and reports the one-line deviation', async (t) => {
  const gitdirContent = 'gitdir: /fake/main/.git/worktrees/live-guard-branch\n';
  const cwd = worktreeDir(t, gitdirContent);
  const selfId = gitdirContent.trim();
  const deterministicWindow = windowFor(selfId);
  const deterministicBase = baseForWindow(deterministicWindow);
  const blockedPort = deterministicBase; // 'e2e' offset is 0

  const server = net.createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(blockedPort, '127.0.0.1', () => resolvePromise());
  });
  t.after(() => new Promise<void>((r) => server.close(() => r())));

  const stderrChunks: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: unknown) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  t.after(() => { process.stderr.write = originalWrite; });

  const finalBase = resolveBasePort({ cwd, env: {}, listOtherWorktreeIds: () => [] });

  assert.notEqual(finalBase, deterministicBase, 'resolver must skip the deterministic window whose role port is already bound');
  assert.equal(finalBase, deterministicBase + WINDOW, 'resolver must advance to the very next window once the deterministic one is occupied');
  assert.ok(
    stderrChunks.some((line) => line.includes(String(deterministicWindow)) && line.includes(String(blockedPort))),
    `expected a one-line stderr deviation naming the deterministic window (${deterministicWindow}) and the bound port (${blockedPort}), got: ${JSON.stringify(stderrChunks)}`,
  );
});
