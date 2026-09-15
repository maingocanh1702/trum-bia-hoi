import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

export type DoctorGroup = 'repo' | 'deps' | 'binding' | 'map' | 'server' | 'bridge' | 'console';

export interface DoctorLine {
  group: DoctorGroup;
  label: string;
  ok: boolean;
}

export interface DoctorReport {
  lines: DoctorLine[];
  ok: boolean;
  text: string;
}

export interface ExecResult {
  code: number;
}

export interface BridgeVersion {
  commit: string;
  worktree: string;
}

export interface GitRunner {
  headSha(cwd: string): string;
  branch(cwd: string): string;
  worktreePath(cwd: string): string;
}

export interface ExecRunner {
  checkConfig(cwd: string): ExecResult;
  mapCoverage(cwd: string): ExecResult;
}

export interface FetchRunner {
  bridgeVersion(): BridgeVersion | null;
  serverHealth(): boolean;
  consoleErrors(): string[];
}

export interface FsRunner {
  listEngineFiles(dir: string): string[];
  readFile(path: string): string;
  writeReport(path: string, content: string): void;
}

export interface DoctorRunners {
  git: GitRunner;
  exec: ExecRunner;
  fetch: FetchRunner;
  fs: FsRunner;
}

export interface DoctorOptions {
  cwd?: string;
  engineOnly?: boolean;
  engineSrcDir?: string;
  runners: DoctorRunners;
}

function checkNodeVersion(version: string): boolean {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

const REACT_IMPORT = /(?:from\s*['"]react(?:-dom)?['"]|require\(\s*['"]react(?:-dom)?['"]\s*\))/;
// `window` used as a bare identifier is the DOM global UNLESS this file declares its own
// local `window` binding (e.g. packages/engine/src/seasons.ts's `const window = seasonWindow(...)`)
// -- that shadowing means every `window` in the file refers to the local value, not the DOM.
const LOCAL_WINDOW_DECL = /\b(?:const|let|var)\s+window\b/;
const BARE_WINDOW = /\bwindow\b/;
const DATE_NOW = /\bDate\.now\(\)/;
const MATH_RANDOM = /\bMath\.random\(\)/;

function scanFilePurity(relPath: string, src: string): string[] {
  const hits: string[] = [];
  if (REACT_IMPORT.test(src)) hits.push(`${relPath}: react import`);
  if (!LOCAL_WINDOW_DECL.test(src) && BARE_WINDOW.test(src)) hits.push(`${relPath}: window global`);
  if (DATE_NOW.test(src)) hits.push(`${relPath}: Date.now()`);
  if (MATH_RANDOM.test(src)) hits.push(`${relPath}: Math.random()`);
  return hits;
}

export function scanEnginePurity(dir: string, fs: Pick<FsRunner, 'listEngineFiles' | 'readFile'>): string[] {
  const violations: string[] = [];
  for (const file of fs.listEngineFiles(dir)) {
    if (!file.endsWith('.ts')) continue;
    if (file.endsWith('rng.ts')) continue; // documented exemption, matches scripts/check_config_coverage.py's SKIP_FILES
    violations.push(...scanFilePurity(relative(dir, file), fs.readFile(file)));
  }
  return violations;
}

function formatReport(lines: DoctorLine[]): string {
  const out: string[] = [];
  let lastGroup: DoctorGroup | null = null;
  for (const line of lines) {
    const marker = line.ok ? '✓' : '✗';
    const prefix = line.group === lastGroup ? ' '.repeat(9) : line.group.padEnd(9);
    out.push(`${prefix} ${marker} ${line.label}`);
    lastGroup = line.group;
  }
  return `${out.join('\n')}\n`;
}

export function runDoctor(opts: DoctorOptions): DoctorReport {
  const cwd = opts.cwd ?? process.cwd();
  const { runners } = opts;
  const lines: DoctorLine[] = [];

  const branch = runners.git.branch(cwd);
  const headSha = runners.git.headSha(cwd);
  const worktreePath = runners.git.worktreePath(cwd);

  lines.push({ group: 'repo', ok: true, label: `branch=${branch} head=${headSha} worktree=${worktreePath}` });

  const nodeOk = checkNodeVersion(process.version);
  lines.push({ group: 'deps', ok: nodeOk, label: `node ${process.version} (>=22.12 required)` });

  const configResult = runners.exec.checkConfig(cwd);
  lines.push({ group: 'binding', ok: configResult.code === 0, label: 'check:config' });

  const engineSrcDir = opts.engineSrcDir ?? resolve(cwd, 'packages/engine/src');
  const violations = scanEnginePurity(engineSrcDir, runners.fs);
  lines.push({
    group: 'binding',
    ok: violations.length === 0,
    label: violations.length ? `engine purity: ${violations.join('; ')}` : 'engine purity clean',
  });

  const mapResult = runners.exec.mapCoverage(cwd);
  lines.push({ group: 'map', ok: mapResult.code === 0, label: 'feature-map coverage' });

  if (!opts.engineOnly) {
    lines.push({ group: 'server', ok: runners.fetch.serverHealth(), label: 'web reachable' });

    const version = runners.fetch.bridgeVersion();
    if (version === null) {
      lines.push({ group: 'bridge', ok: false, label: 'bridge unreachable' });
    } else {
      const commitOk = version.commit === headSha;
      lines.push({
        group: 'bridge',
        ok: commitOk,
        label: commitOk ? 'version().commit == HEAD' : `STALE BUILD: commit ${version.commit} != HEAD ${headSha}`,
      });
      const worktreeOk = version.worktree === worktreePath;
      lines.push({
        group: 'bridge',
        ok: worktreeOk,
        label: worktreeOk ? 'worktree matches' : `WRONG INSTANCE: worktree ${version.worktree} != ${worktreePath}`,
      });
    }

    const errors = runners.fetch.consoleErrors();
    lines.push({
      group: 'console',
      ok: errors.length === 0,
      label: errors.length ? `console errors: ${errors.join('; ')}` : 'no console errors at boot',
    });
  }

  const ok = lines.every((line) => line.ok);
  const text = formatReport(lines);

  const reportPath = resolve(cwd, 'artifacts/verification', branch, 'doctor.txt');
  runners.fs.writeReport(reportPath, text);

  return { lines, ok, text };
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function runNpmScript(cwd: string, script: string): ExecResult {
  const result = spawnSync('npm', ['run', script], { cwd, encoding: 'utf8' });
  return { code: result.status ?? 1 };
}

export function defaultRunners(): DoctorRunners {
  return {
    git: {
      headSha: (cwd) => execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(),
      branch: (cwd) => execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' }).trim(),
      worktreePath: (cwd) => execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim(),
    },
    exec: {
      checkConfig: (cwd) => runNpmScript(cwd, 'check:config'),
      mapCoverage: (cwd) => runNpmScript(cwd, 'verify:map'),
    },
    fetch: {
      // No headless browser/dev server is available to this CLI outside a driven e2e run;
      // --engine-only exists precisely for that case. A real server/bridge integration is
      // future work (apps/web/test/tbh-fixture.ts), not this slice.
      bridgeVersion: () => null,
      serverHealth: () => false,
      consoleErrors: () => [],
    },
    fs: {
      listEngineFiles: (dir) => listFilesRecursive(dir),
      readFile: (path) => readFileSync(path, 'utf8'),
      writeReport: (path, content) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content);
      },
    },
  };
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const engineOnly = process.argv.includes('--engine-only');
  const report = runDoctor({ engineOnly, runners: defaultRunners() });
  console.log(report.text);
  process.exit(report.ok ? 0 : 1);
}
