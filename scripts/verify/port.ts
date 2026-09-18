import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export type PortRole =
  | 'e2e'
  | 'dev-identity-web'
  | 'dev-identity-api'
  | 'admin-web'
  | 'admin-api'
  | 'playable-web-0'
  | 'playable-api-0'
  | 'playable-web-1'
  | 'playable-api-1'
  | 'playable-web-2'
  | 'playable-api-2'
  | 'dev-web'
  | 'dev-api'
  | 'dev-preview';

export interface ResolveOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  // Injectable seam (mirrors doctor.ts's runner-injection convention) so a unit test can drive
  // the collision probe with fake worktree identifiers instead of shelling out to real git.
  // Returns the identifiers (raw `.git`-file contents, matching getWorktreeIdentifier()) of every
  // OTHER live worktree -- never including the caller's own.
  listOtherWorktreeIds?: (cwd: string) => string[];
}

// Offsets are fixed so that base=DEFAULT_BASE reproduces today's exact literal ports
// (playwright.config.ts=4178, playwright.admin.config.ts=4181/4182,
// playwright.dev-identity.config.ts/playwright.remote.config.ts=4179/4180,
// playwright.playable.config.ts=4209/4210/4211/4212/4213/4214).
//
// dev-web/dev-api/dev-preview (apps/web/vite.config.ts's server.port/proxy-default/preview.port,
// and apps/server/src/main.ts's TBH_PORT via the `dev:server` script) are NOT given the literal
// offsets that would reproduce today's 5173/5175/4173 (995/997/-5 -- the last is even negative,
// since 4173 < DEFAULT_BASE). Byte-identical reproduction of those three is explicitly not
// required (see the task's Problem/Acceptance sections); tidy offsets in the same 0-36 range as
// every other role keep MAX_ROLE_OFFSET small (39), fitting inside one 40-wide window with room
// to spare (offsets 995/997 would not fit in any fixed-width window at all).
const ROLE_OFFSETS: Record<PortRole, number> = {
  'e2e': 0,
  'dev-identity-web': 1,
  'dev-identity-api': 2,
  'admin-web': 3,
  'admin-api': 4,
  'playable-web-0': 31,
  'playable-api-0': 32,
  'playable-web-1': 33,
  'playable-api-1': 34,
  'playable-web-2': 35,
  'playable-api-2': 36,
  'dev-web': 37,
  'dev-api': 38,
  'dev-preview': 39,
};

const DEFAULT_BASE = 4178;
// A worktree base is FLOOR + WINDOW * (window index). Windows are 40 ports wide -- wider than
// MAX_ROLE_OFFSET(39), so a window holds every role -- and bases always land on a 40-grid, so two
// DISTINCT windows can never be within MAX_ROLE_OFFSET of each other: the "near collision" class
// that plagued the old 5200+hash%300 scheme (a bare per-port probe over a much narrower span) is
// gone by construction here, not by probing. WINDOWS(1250) * WINDOW(40) spans exactly
// 10000..59999. See the OWNER AMENDMENT in the task file for the full rationale.
const WORKTREE_BASE_FLOOR = 10000;
const WINDOW = 40;
const WINDOWS = 1250;
const MAX_ROLE_OFFSET = Math.max(...Object.values(ROLE_OFFSETS));
const PORT_BASE_MIN = 1;
const PORT_BASE_MAX = 65535 - MAX_ROLE_OFFSET;

function parsePortBaseOverride(raw: string): number {
  const base = Number(raw);
  if (!Number.isInteger(base) || base < PORT_BASE_MIN || base > PORT_BASE_MAX) {
    throw new Error(
      `Invalid TBH_PORT_BASE "${raw}": must be an integer in [${PORT_BASE_MIN}, ${PORT_BASE_MAX}]`,
    );
  }
  return base;
}

// `statSync` directly, never `existsSync` first: `existsSync` swallows EVERY stat failure
// (including EACCES -- e.g. a parent directory a non-root user can't traverse, like /var/root)
// and reports it identically to "doesn't exist", which would silently treat an unreadable sibling
// as absent instead of failing closed. Only ENOENT (genuinely absent -- ordinary pruned-worktree
// churn) degrades to false here; every other error (EACCES, ...) propagates to the caller.
function isWorktreeCwd(cwd: string): boolean {
  const gitPath = resolve(cwd, '.git');
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(gitPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
  return stat.isFile();
}

function getWorktreeIdentifier(cwd: string): string {
  return readFileSync(resolve(cwd, '.git'), 'utf8').trim();
}

function hashToRange(id: string, span: number): number {
  const digest = createHash('sha256').update(id).digest();
  return digest.readUInt32BE(0) % span;
}

function parseWorktreeListPaths(porcelain: string): string[] {
  return porcelain
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length).trim());
}

// Default `listOtherWorktreeIds`: shells out to real git. A fixture's `.git` FILE can point at a
// gitdir path that doesn't exist (this repo's own test fixtures do exactly that) -- git then
// fails outright ("fatal: not a git repository: <path>") rather than climbing up the directory
// tree looking for another repo, since the `.git` file already resolved GIT_DIR definitively. So
// on THAT specific, positively-identified failure this returns [] (degrade to "no known
// siblings"), never the enclosing real repo's worktree list -- see port.test.ts's fake-worktree
// fixtures, which rely on exactly this. Every OTHER git failure (permission denied, corrupt repo,
// unsafe-ownership refusal, ...) now fails CLOSED (throws) instead of also degrading to []: the
// registry that gives an incumbent worktree a stable base only works if sibling discovery is
// either complete or loudly incomplete, never silently incomplete -- see review round 3, finding
// "Collision safety still fails open".
function defaultListOtherWorktreeIds(cwd: string, env: NodeJS.ProcessEnv): string[] {
  let output: string;
  try {
    output = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException & { stderr?: Buffer | string };
    if (nodeErr.code === 'ENOENT') {
      throw new Error('Cannot resolve a collision-free port: the "git" executable was not found, so live sibling worktrees cannot be enumerated.');
    }
    const stderr = nodeErr.stderr ? nodeErr.stderr.toString() : '';
    if (/not a git repository/i.test(stderr)) {
      return [];
    }
    throw new Error(`Cannot resolve a collision-free port: "git worktree list --porcelain" failed unexpectedly (${(stderr || nodeErr.message).trim()}).`);
  }
  return collectOtherWorktreeIds(output, resolve(cwd));
}

// Split out from defaultListOtherWorktreeIds so the fail-closed policy below is unit-testable
// directly against synthetic porcelain text, without needing a real `git worktree add` (permission-
// denied in this sandbox) or mutating any real sibling worktree's `.git` file. A listed path whose
// `.git` has plainly disappeared (ENOENT -- ordinary pruned/removed-worktree churn) is skipped, the
// same as before; a listed path whose `.git` exists but can't be inspected for any OTHER reason
// (e.g. EACCES) now propagates instead of silently vanishing from the live set.
export function collectOtherWorktreeIds(porcelain: string, resolvedCwd: string): string[] {
  const ids: string[] = [];
  for (const path of parseWorktreeListPaths(porcelain)) {
    const resolvedPath = resolve(path);
    if (resolvedPath === resolvedCwd) continue;
    try {
      // The main worktree's `.git` is a directory, not a file -- it always resolves to
      // DEFAULT_BASE (never the hashed scheme), and DEFAULT_BASE(4178) sits well below
      // WORKTREE_BASE_FLOOR(10000), so it can never collide with a worktree base by construction.
      if (!isWorktreeCwd(resolvedPath)) continue;
      ids.push(getWorktreeIdentifier(resolvedPath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw new Error(`Cannot resolve a collision-free port: sibling worktree "${resolvedPath}" could not be inspected (${(err as Error).message}).`);
    }
  }
  return ids;
}

// Deterministically assigns a WINDOW INDEX (0..WINDOWS-1) to every live id: sorted by id (never
// by enumeration/insertion order, so the result never depends on `git worktree list`'s iteration
// order or which side calls this), each id in that sorted order starts at its own hashed window
// and, if that window is already taken by an earlier id in the sort, linear-probes forward
// (mod WINDOWS) to the next free window. This is a PURE function of the live id set -- every
// worktree computes the same assignment from the same list, so no shared state is needed and the
// registry this replaced is gone entirely (see the OWNER AMENDMENT in the task file).
function assignWindows(ids: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const takenWindows = new Set<number>();
  const sortedIds = [...new Set(ids)].sort();
  for (const id of sortedIds) {
    let window = hashToRange(id, WINDOWS);
    while (takenWindows.has(window)) {
      window = (window + 1) % WINDOWS;
    }
    takenWindows.add(window);
    result.set(id, window);
  }
  return result;
}

function baseForWindow(window: number): number {
  return WORKTREE_BASE_FLOOR + WINDOW * window;
}

function rolePortsForWindow(window: number): number[] {
  const base = baseForWindow(window);
  return Object.values(ROLE_OFFSETS).map((offset) => base + offset);
}

// A tiny standalone script run in a fresh `node` subprocess: for each candidate port, try to bind
// a TCP server to it on loopback, then close it immediately. Reports back (as JSON on stdout) the
// subset that were already occupied by SOME other process. This has to be a subprocess because
// Node's `net` module has no synchronous bind API, and resolveBasePort() below must stay fully
// synchronous -- it's called at module-eval time by apps/web/vite.config.ts and by every already-
// wired Playwright config (out of this slice's scope; they can't be changed to `await`).
const LIVE_PORT_PROBE_SCRIPT = `
const net = require('node:net');
const ports = JSON.parse(process.argv[1]);
const occupied = [];
let indeterminate = false;
let remaining = ports.length;
function report() { process.stdout.write(JSON.stringify({ occupied, indeterminate })); }
if (remaining === 0) { report(); process.exit(0); }
function done() { remaining -= 1; if (remaining === 0) report(); }
for (const port of ports) {
  const server = net.createServer();
  server.once('error', (err) => {
    // EADDRINUSE is a genuine "something else is bound here" signal. Any OTHER error (e.g. this
    // process's own sandbox denying bind() outright with EPERM/EACCES, unrelated to what else is
    // on the machine) means the check itself couldn't run -- that is NOT proof of occupancy.
    if (err && err.code === 'EADDRINUSE') occupied.push(port);
    else indeterminate = true;
    done();
  });
  server.listen(port, '127.0.0.1', () => { server.close(() => done()); });
}
`;

interface PortCheck {
  boundPort: number | undefined;
  // true when the bind CHECK itself couldn't run (e.g. this environment denies binding loopback
  // sockets at all) -- distinct from a clean "nothing is bound here" result.
  indeterminate: boolean;
}

function checkPorts(ports: number[]): PortCheck {
  const output = execFileSync(process.execPath, ['-e', LIVE_PORT_PROBE_SCRIPT, JSON.stringify(ports)], {
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output) as { occupied: number[]; indeterminate: boolean };
  return { boundPort: parsed.occupied[0], indeterminate: parsed.indeterminate };
}

// The deterministic window assignment above is a pure function of live worktree ids -- it says
// nothing about what else is bound on this machine right now (a stray dev server, another tool
// entirely). Test-bind every role port the deterministic window would hand out; if any is already
// in use, advance to the next window that is BOTH free on the wire AND not already claimed by a
// sibling worktree in `windows` (never hand out a window another live worktree is about to use).
// This step is inherently time-of-check/time-of-use dependent by design -- the stderr line is
// what makes a deviation visible instead of silent. If the bind check itself is unavailable in
// this environment (indeterminate), the deterministic assignment is trusted as-is -- an inability
// to double-check for stray processes must never turn into "no port can ever be resolved."
function applyLivePortGuard(deterministicWindow: number, windows: Map<string, number>, selfId: string): number {
  const claimedBySiblings = new Set(
    [...windows.entries()].filter(([id]) => id !== selfId).map(([, w]) => w),
  );
  const first = checkPorts(rolePortsForWindow(deterministicWindow));
  if (first.indeterminate || first.boundPort === undefined) return deterministicWindow;
  let window = deterministicWindow;
  for (let tries = 0; tries < WINDOWS; tries++) {
    window = (window + 1) % WINDOWS;
    if (claimedBySiblings.has(window)) continue;
    const check = checkPorts(rolePortsForWindow(window));
    if (check.indeterminate) return deterministicWindow;
    if (check.boundPort === undefined) {
      process.stderr.write(
        `tbh-port: window ${deterministicWindow} (base ${baseForWindow(deterministicWindow)}) deviated -- `
          + `port ${first.boundPort} already in use; using window ${window} (base ${baseForWindow(window)}) instead\n`,
      );
      return window;
    }
  }
  throw new Error('Cannot resolve a collision-free port: every window is either claimed by a live sibling worktree or has a port already in use.');
}

export function resolveBasePort(opts: ResolveOptions = {}): number {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  if (env.TBH_PORT_BASE !== undefined) {
    return parsePortBaseOverride(env.TBH_PORT_BASE);
  }
  if (!isWorktreeCwd(cwd)) {
    return DEFAULT_BASE;
  }
  const selfId = getWorktreeIdentifier(cwd);
  // Git subprocess PATH resolution is layered ON TOP of the real ambient environment (not
  // replaced by `opts.env`) -- callers pass `env: {}`/a stripped env to control the
  // TBH_PORT_BASE override check above, not to simulate an unusable shell PATH; only a test that
  // explicitly sets PATH (see the "fails closed when git is unresolvable" test) makes git
  // unresolvable here.
  const gitEnv = { ...process.env, ...env };
  const listOtherWorktreeIds = opts.listOtherWorktreeIds ?? ((c: string) => defaultListOtherWorktreeIds(c, gitEnv));
  const otherIds = listOtherWorktreeIds(cwd).filter((id) => id !== selfId);
  const windows = assignWindows([selfId, ...otherIds]);
  const deterministicWindow = windows.get(selfId)!;
  const finalWindow = applyLivePortGuard(deterministicWindow, windows, selfId);
  return baseForWindow(finalWindow);
}

export function resolvePort(role: PortRole, opts: ResolveOptions = {}): number {
  return resolveBasePort(opts) + ROLE_OFFSETS[role];
}

export function resolveAllPorts(opts: ResolveOptions = {}): Record<PortRole, number> {
  const base = resolveBasePort(opts);
  const result = {} as Record<PortRole, number>;
  for (const role of Object.keys(ROLE_OFFSETS) as PortRole[]) {
    result[role] = base + ROLE_OFFSETS[role];
  }
  return result;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

// `--role=<role>` prints just that role's port (no role name, no other roles) so a shell can
// capture it directly, e.g. `TBH_PORT=$(node --import tsx scripts/verify/port.ts --role=dev-api)`
// -- the `dev:server` npm script's way of feeding apps/server/src/main.ts a resolver-derived
// TBH_PORT without editing that out-of-scope file.
function parseRoleFlag(argv: string[]): PortRole | undefined {
  const flag = argv.find((arg) => arg.startsWith('--role='));
  if (flag === undefined) return undefined;
  const role = flag.slice('--role='.length);
  // An own-property check, not `role in ROLE_OFFSETS`: `in` also matches inherited
  // Object.prototype members (e.g. --role=toString or --role=__proto__), which would otherwise
  // print a bogus "port" instead of rejecting the flag.
  if (!Object.hasOwn(ROLE_OFFSETS, role)) {
    throw new Error(`Invalid --role "${role}": must be one of ${Object.keys(ROLE_OFFSETS).join(', ')}`);
  }
  return role as PortRole;
}

// Test-only hook: spawning a REAL colliding pair of `git worktree`s to prove the collision probe
// is stable across a separate process invocation is not possible in this project's sandboxed test
// environment (`git worktree add` is permission-denied there). Setting this env var to a JSON
// array of fake worktree identifiers lets a test drive the same subprocess-invocation path
// (`node ... port.ts`) with a controlled, colliding fake set instead. Never read outside of the
// CLI entrypoint below, and a no-op unless a test explicitly sets it.
function parseTestOtherWorktreeIds(env: NodeJS.ProcessEnv): string[] | undefined {
  const raw = env.TBH_TEST_OTHER_WORKTREE_IDS;
  if (raw === undefined) return undefined;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
    throw new Error('Invalid TBH_TEST_OTHER_WORKTREE_IDS: must be a JSON array of strings');
  }
  return parsed;
}

if (isMainModule()) {
  const testOtherIds = parseTestOtherWorktreeIds(process.env);
  const opts: ResolveOptions = testOtherIds !== undefined ? { listOtherWorktreeIds: () => testOtherIds } : {};
  const role = parseRoleFlag(process.argv.slice(2));
  if (role !== undefined) {
    console.log(resolvePort(role, opts));
  } else {
    const ports = resolveAllPorts(opts);
    for (const [role, port] of Object.entries(ports)) {
      console.log(`${role}\t${port}`);
    }
  }
}
