import { existsSync, readFileSync, statSync } from 'node:fs';
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
// on failure this returns [] (degrade to "no known siblings"), never the enclosing real repo's
// worktree list -- see port.test.ts's fake-worktree fixtures, which rely on exactly this.
function defaultListOtherWorktreeIds(cwd: string): string[] {
  let output: string;
  try {
    output = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return [];
  }
  const resolvedCwd = resolve(cwd);
  const ids: string[] = [];
  for (const path of parseWorktreeListPaths(output)) {
    const resolvedPath = resolve(path);
    if (resolvedPath === resolvedCwd) continue;
    try {
      // The main worktree's `.git` is a directory, not a file -- it always resolves to
      // DEFAULT_BASE (never the hashed scheme), and DEFAULT_BASE(4178) sits >1000 below
      // WORKTREE_BASE_FLOOR(5200), so it can never collide with a worktree base by construction.
      if (!isWorktreeCwd(resolvedPath)) continue;
      ids.push(getWorktreeIdentifier(resolvedPath));
    } catch {
      // Unreadable/pruned/permission-denied worktree entry (e.g. `prunable gitdir file points to
      // non-existent location`, or a sibling this OS user can't stat) -- skip it rather than fail
      // the whole resolution over one stale or inaccessible entry.
    }
  }
  return ids;
}

// Deterministically assigns each id a base: sorted by id (never by enumeration/insertion order,
// so the result never depends on `git worktree list`'s iteration order or which side calls this),
// each id starts at its own hashed slot and, if that slot is within MAX_ROLE_OFFSET of an
// already-assigned base (a real role-port collision, not just an exact base match), probes
// forward one port at a time until it finds a base that collides with none of them.
function assignBasesForIds(ids: string[]): Map<string, number> {
  const sortedIds = [...new Set(ids)].sort();
  const assignedBases: number[] = [];
  const result = new Map<string, number>();
  for (const id of sortedIds) {
    let candidate = WORKTREE_BASE_FLOOR + hashToRange(id, WORKTREE_BASE_SPAN);
    while (assignedBases.some((base) => Math.abs(base - candidate) <= MAX_ROLE_OFFSET)) {
      candidate += 1;
    }
    assignedBases.push(candidate);
    result.set(id, candidate);
  }
  return result;
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
  const listOtherWorktreeIds = opts.listOtherWorktreeIds ?? defaultListOtherWorktreeIds;
  const otherIds = listOtherWorktreeIds(cwd).filter((id) => id !== selfId);
  const assigned = assignBasesForIds([selfId, ...otherIds]);
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
  if (!(role in ROLE_OFFSETS)) {
    throw new Error(`Invalid --role "${role}": must be one of ${Object.keys(ROLE_OFFSETS).join(', ')}`);
  }
  return role as PortRole;
}

if (isMainModule()) {
  const role = parseRoleFlag(process.argv.slice(2));
  if (role !== undefined) {
    console.log(resolvePort(role));
  } else {
    const ports = resolveAllPorts();
    for (const [role, port] of Object.entries(ports)) {
      console.log(`${role}\t${port}`);
    }
  }
}
