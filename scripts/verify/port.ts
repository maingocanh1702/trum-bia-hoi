import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
// every other role keep MAX_ROLE_OFFSET small (39), so the collision probe below only needs to
// widen its search rarely, instead of ALWAYS probing (which reproducing 995/997 as offsets would
// force, since that would push MAX_ROLE_OFFSET past WORKTREE_BASE_SPAN).
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
const WORKTREE_BASE_FLOOR = 5200;
const WORKTREE_BASE_SPAN = 300;
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

function isWorktreeCwd(cwd: string): boolean {
  const gitPath = resolve(cwd, '.git');
  return existsSync(gitPath) && statSync(gitPath).isFile();
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
      // DEFAULT_BASE (never the hashed scheme), and DEFAULT_BASE(4178) sits >1000 below
      // WORKTREE_BASE_FLOOR(5200), so it can never collide with a worktree base by construction.
      if (!isWorktreeCwd(resolvedPath)) continue;
      ids.push(getWorktreeIdentifier(resolvedPath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw new Error(`Cannot resolve a collision-free port: sibling worktree "${resolvedPath}" could not be inspected (${(err as Error).message}).`);
    }
  }
  return ids;
}

// Deterministically assigns a base to every id NOT already present in `fixed`: sorted by id
// (never by enumeration/insertion order, so the result never depends on `git worktree list`'s
// iteration order or which side calls this), each new id starts at its own hashed slot and, if
// that slot is within MAX_ROLE_OFFSET of an already-assigned base (fixed or freshly assigned --
// a real role-port collision, not just an exact base match), probes forward one port at a time
// until it finds a base that collides with none of them. `fixed` entries are returned verbatim,
// NEVER re-probed -- this is what gives an already-registered (incumbent) worktree a stable base
// across the lifetime of other worktrees joining or leaving (see resolveRegisteredBases below).
function assignBasesForIds(ids: string[], fixed: Map<string, number> = new Map()): Map<string, number> {
  const result = new Map<string, number>(fixed);
  const assignedBases: number[] = [...fixed.values()];
  const newIds = [...new Set(ids)].filter((id) => !fixed.has(id)).sort();
  for (const id of newIds) {
    let candidate = WORKTREE_BASE_FLOOR + hashToRange(id, WORKTREE_BASE_SPAN);
    while (assignedBases.some((base) => Math.abs(base - candidate) <= MAX_ROLE_OFFSET)) {
      candidate += 1;
    }
    assignedBases.push(candidate);
    result.set(id, candidate);
  }
  return result;
}

// A worktree's `.git` FILE content is `gitdir: <mainRepo>/.git/worktrees/<name>` -- every sibling
// worktree of the SAME repo shares the same `<mainRepo>/.git` prefix. That shared directory is the
// one place on disk naturally reachable from every sibling without an extra `git` subprocess call
// (which would hit the exact same fake-gitdir/real-repo-contamination gotcha `defaultListOtherWorktreeIds`
// already works around). Returns undefined when the content doesn't match this shape (e.g. the
// test suite's deliberately-fake `gitdir: /fake/main/.git/worktrees/...` targets that never exist
// on disk still parse fine here -- but see loadRegistry/saveRegistry below, which degrade to a
// no-op only for that specific "directory doesn't exist" (ENOENT) case, and fail closed for any
// other read/write failure against a derived path that DOES exist on disk).
function deriveRegistryPath(gitdirContent: string): string | undefined {
  const match = /^gitdir:\s*(.+)\/worktrees\/[^/]+\/?$/.exec(gitdirContent.trim());
  return match ? resolve(match[1], 'tbh-port-registry.json') : undefined;
}

// ENOENT (no registry file yet -- first run, or a test fixture's derived path never existed on
// disk in the first place) is a legitimate, expected "empty registry" signal and degrades quietly.
// Any OTHER read failure (corrupt JSON, EACCES, a directory sitting where the file should be, ...)
// fails CLOSED instead: the registry is the only thing keeping an incumbent worktree's base from
// being silently reassigned when a sibling joins, so treating unreadable state as "empty" would
// quietly reintroduce the exact bug the registry exists to prevent.
function loadRegistry(path: string): Record<string, number> {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error(`Cannot resolve a collision-free port: the port registry "${path}" could not be read (${(err as Error).message}).`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Cannot resolve a collision-free port: the port registry "${path}" contains invalid JSON (${(err as Error).message}).`);
  }
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
}

// ENOENT here means the registry's PARENT directory doesn't exist -- exactly what every test
// fixture's fake `gitdir: /fake/main/.git/worktrees/...` target produces, since that directory
// never exists on disk. That case stays best-effort/no-op: persistence only improves stability
// over the pure-hash-and-probe fallback, it's never required for correctness of a single
// resolution. Any OTHER write failure (EACCES, EISDIR, ENOSPC, ...) means a REAL, existing
// registry location just failed to accept the incumbent's base -- silently swallowing that would
// let the next sibling's read see stale/partial state, so it fails CLOSED instead.
function saveRegistry(path: string, data: Record<string, number>): void {
  try {
    writeFileSync(path, JSON.stringify(data));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw new Error(`Cannot resolve a collision-free port: the port registry "${path}" could not be written (${(err as Error).message}).`);
  }
}

// Resolves the final base for every id in `liveIds` (self + others), preferring previously
// REGISTERED bases for ids that already have one (so an incumbent worktree's base never moves just
// because a new sibling joins later) and only handing out fresh probed bases to ids seen for the
// first time. Registry entries for ids no longer in `liveIds` are dropped (garbage-collected) so a
// removed/pruned worktree's slot is eventually reclaimed instead of leaking forever.
function resolveRegisteredBases(liveIds: string[], registryPath: string | undefined): Map<string, number> {
  const liveSet = new Set(liveIds);
  const registered = registryPath ? loadRegistry(registryPath) : {};
  const fixed = new Map<string, number>();
  for (const [id, base] of Object.entries(registered)) {
    if (liveSet.has(id) && Number.isInteger(base)) fixed.set(id, base);
  }
  const assigned = assignBasesForIds(liveIds, fixed);
  if (registryPath) saveRegistry(registryPath, Object.fromEntries(assigned));
  return assigned;
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
  const registryPath = deriveRegistryPath(selfId);
  const assigned = resolveRegisteredBases([selfId, ...otherIds], registryPath);
  return assigned.get(selfId)!;
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
