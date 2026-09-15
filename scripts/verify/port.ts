import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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
  | 'playable-api-2';

export interface ResolveOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

// Offsets are fixed so that base=DEFAULT_BASE reproduces today's exact literal ports
// (playwright.config.ts=4178, playwright.admin.config.ts=4181/4182,
// playwright.dev-identity.config.ts/playwright.remote.config.ts=4179/4180,
// playwright.playable.config.ts=4209/4210/4211/4212/4213/4214).
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
};

const DEFAULT_BASE = 4178;
const WORKTREE_BASE_FLOOR = 5200;
const WORKTREE_BASE_SPAN = 300;

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

export function resolveBasePort(opts: ResolveOptions = {}): number {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  if (env.TBH_PORT_BASE !== undefined && env.TBH_PORT_BASE !== '') {
    return Number(env.TBH_PORT_BASE);
  }
  if (isWorktreeCwd(cwd)) {
    return WORKTREE_BASE_FLOOR + hashToRange(getWorktreeIdentifier(cwd), WORKTREE_BASE_SPAN);
  }
  return DEFAULT_BASE;
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

if (isMainModule()) {
  const ports = resolveAllPorts();
  for (const [role, port] of Object.entries(ports)) {
    console.log(`${role}\t${port}`);
  }
}
