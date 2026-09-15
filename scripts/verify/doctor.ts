import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
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
  checkI18n(cwd: string): ExecResult;
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

const REACT_IMPORT =
  /(?:\bimport\s*\(\s*['"]react(?:-dom)?['"]|\bimport\s+['"]react(?:-dom)?['"]|\bfrom\s*['"]react(?:-dom)?['"]|\brequire\(\s*['"]react(?:-dom)?['"]\s*\))/;
// Tolerate stray whitespace around the dot/parens -- `Date . now ( )` is valid JS and must not
// slip past a scanner that only recognises the no-space spelling.
const DATE_NOW = /\bDate\s*\.\s*now\s*\(\s*\)/;
const MATH_RANDOM = /\bMath\s*\.\s*random\s*\(\s*\)/;
const DOM_GLOBALS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'document', pattern: /\bdocument\b/ },
  { name: 'localStorage', pattern: /\blocalStorage\b/ },
  { name: 'sessionStorage', pattern: /\bsessionStorage\b/ },
  { name: 'indexedDB', pattern: /\bindexedDB\b/ },
];

// One left-to-right scan tracking comment/string state, instead of a `//`-anywhere regex --
// a `//` inside a string (e.g. a URL literal) must not swallow the rest of the line as a
// "comment" and hide a real violation that follows it on the same line. Produces two views:
// `forImport` (comments blanked, string/template bodies left intact -- the import-specifier
// check needs to read inside the quotes) and `forGlobals` (comments AND string/template bodies
// blanked -- so a harmless string literal like `"window"` can never trip the DOM-global scan).
// Newlines always pass through unmodified in both views so reported line numbers stay accurate.
function tokenizeSource(src: string): { forImport: string; forGlobals: string } {
  let forImport = '';
  let forGlobals = '';
  type State = 'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'template';
  let state: State = 'code';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '\n') {
      forImport += '\n';
      forGlobals += '\n';
      if (state === 'line-comment') state = 'code';
      continue;
    }
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line-comment';
        forImport += ' ';
        forGlobals += ' ';
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block-comment';
        forImport += ' ';
        forGlobals += ' ';
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template';
        forImport += ch;
        forGlobals += ' ';
        continue;
      }
      forImport += ch;
      forGlobals += ch;
      continue;
    }
    if (state === 'line-comment') {
      forImport += ' ';
      forGlobals += ' ';
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        state = 'code';
        forImport += ' ';
        forGlobals += ' ';
        i++;
      } else {
        forImport += ' ';
        forGlobals += ' ';
      }
      continue;
    }
    // Inside a single/double/template string body.
    const closer = state === 'single' ? "'" : state === 'double' ? '"' : '`';
    if (ch === '\\' && next !== undefined && next !== '\n') {
      forImport += ch + next;
      forGlobals += '  ';
      i++;
      continue;
    }
    if (ch === closer) {
      state = 'code';
      forImport += ch;
      forGlobals += ' ';
      continue;
    }
    forImport += ch;
    forGlobals += ' ';
  }
  return { forImport, forGlobals };
}

// `window` used as a bare identifier is the DOM global UNLESS the enclosing block declares its
// own local `window` binding (e.g. packages/engine/src/seasons.ts's `const window =
// seasonWindow(...)`). Tracked with a brace-depth stack (not a per-line scan) so a shadow that
// opens and closes on the very same physical line still gets popped -- a line-granular scan
// misses that case and leaves every later top-level `window` read in the file wrongly exempted.
const WINDOW_TOKEN = /\{|\}|\b(?:const|let|var)\s+window\b|\bwindow\b/g;

function scanWindowUsage(relPath: string, maskedCode: string): string[] {
  const hits: string[] = [];
  let depth = 0;
  const shadowStack: number[] = [];
  let line = 1;
  let scanPos = 0;
  WINDOW_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WINDOW_TOKEN.exec(maskedCode))) {
    for (let i = scanPos; i < match.index; i++) if (maskedCode[i] === '\n') line++;
    scanPos = match.index;
    const token = match[0];
    if (token === '{') {
      depth++;
    } else if (token === '}') {
      depth--;
      while (shadowStack.length > 0 && depth < shadowStack[shadowStack.length - 1]) shadowStack.pop();
    } else if (token !== 'window') {
      shadowStack.push(depth);
    } else if (shadowStack.length === 0) {
      hits.push(`${relPath}:${line}: window global`);
    }
  }
  return hits;
}

function scanFilePurity(relPath: string, src: string): string[] {
  const { forImport, forGlobals } = tokenizeSource(src);
  const hits: string[] = [];
  if (REACT_IMPORT.test(forImport)) hits.push(`${relPath}: react import`);
  hits.push(...scanWindowUsage(relPath, forGlobals));
  for (const { name, pattern } of DOM_GLOBALS) {
    if (pattern.test(forGlobals)) hits.push(`${relPath}: ${name} global`);
  }
  if (DATE_NOW.test(forGlobals)) hits.push(`${relPath}: Date.now()`);
  if (MATH_RANDOM.test(forGlobals)) hits.push(`${relPath}: Math.random()`);
  return hits;
}

export function scanEnginePurity(dir: string, fs: Pick<FsRunner, 'listEngineFiles' | 'readFile'>): string[] {
  const violations: string[] = [];
  for (const file of fs.listEngineFiles(dir)) {
    if (!file.endsWith('.ts')) continue;
    if (basename(file) === 'rng.ts') continue; // exact-name exemption, matches scripts/check_config_coverage.py's SKIP_FILES
    violations.push(...scanFilePurity(relative(dir, file), fs.readFile(file)));
  }
  return violations;
}

// Text sourced from injected git/bridge/console runners is external input to this CLI; escape
// control characters so an injected newline can't forge an extra, convincing report line.
const CONTROL_CHAR_RANGE = String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127);
const CONTROL_CHAR = new RegExp('[' + CONTROL_CHAR_RANGE + ']', 'g');

function sanitizeForReport(value: string): string {
  return value.replace(CONTROL_CHAR, (ch) => `\\x${ch.codePointAt(0)!.toString(16).padStart(2, '0')}`);
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

  const branch = sanitizeForReport(runners.git.branch(cwd));
  const headSha = sanitizeForReport(runners.git.headSha(cwd));
  const worktreePath = sanitizeForReport(runners.git.worktreePath(cwd));

  lines.push({ group: 'repo', ok: true, label: `branch=${branch} head=${headSha} worktree=${worktreePath}` });

  const nodeOk = checkNodeVersion(process.version);
  lines.push({ group: 'deps', ok: nodeOk, label: `node ${process.version} (>=22.12 required)` });

  const configResult = runners.exec.checkConfig(cwd);
  lines.push({ group: 'binding', ok: configResult.code === 0, label: 'check:config' });

  const i18nResult = runners.exec.checkI18n(cwd);
  lines.push({ group: 'binding', ok: i18nResult.code === 0, label: 'check:i18n' });

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
      const commit = sanitizeForReport(version.commit);
      const worktree = sanitizeForReport(version.worktree);
      const commitOk = version.commit === headSha;
      lines.push({
        group: 'bridge',
        ok: commitOk,
        label: commitOk ? 'version().commit == HEAD' : `STALE BUILD: commit ${commit} != HEAD ${headSha}`,
      });
      const worktreeOk = version.worktree === worktreePath;
      lines.push({
        group: 'bridge',
        ok: worktreeOk,
        label: worktreeOk ? 'worktree matches' : `WRONG INSTANCE: worktree ${worktree} != ${worktreePath}`,
      });
    }

    const errors = runners.fetch.consoleErrors().map(sanitizeForReport);
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

export function exitCodeFor(report: Pick<DoctorReport, 'ok'>): number {
  return report.ok ? 0 : 1;
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    // lstat, never stat: a repo-controlled symlink under packages/engine/src must not let the
    // scanner follow it out of the tree, recurse into unrelated files, or spin on a link cycle.
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) out.push(...listFilesRecursive(full));
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
      checkI18n: (cwd) => runNpmScript(cwd, 'check:i18n'),
      mapCoverage: (cwd) => runNpmScript(cwd, 'verify:map'),
    },
    fetch: {
      // No headless browser/dev server is available to this plain-Node CLI outside a driven e2e
      // run -- `bridgeVersion()`/`consoleErrors()` need `window.__TBH_VERIFY__` evaluated inside a
      // real page, which only a browser-driving harness (apps/web/test/tbh-fixture.ts, a future
      // slice) can supply. Rather than fabricate a clean result for a check this runner never
      // performed, every default here fails closed -- an honest "unknown/unreachable", never a
      // false PASS. --engine-only exists precisely to skip this group for engine/server-only work;
      // full mode is meant to run with real runners injected by that future browser harness.
      bridgeVersion: () => null,
      serverHealth: () => false,
      consoleErrors: () => ['console errors not checked: no driven browser session available to this CLI'],
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
  process.exit(exitCodeFor(report));
}
