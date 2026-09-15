import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createScanner, LanguageVariant, SyntaxKind, computeLineStarts } from 'typescript/unstable/ast';

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
  pathExists(path: string): boolean;
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
  nodeVersion?: string;
  runners: DoctorRunners;
}

function checkNodeVersion(version: string): boolean {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

// Class A: bare identifiers with no legitimate use in a pure engine -- a violation the moment the
// token appears anywhere in the resolved token stream (see `scanFilePurity`), no scope analysis.
const CLASS_A_IDENTIFIERS = new Set(['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'globalThis', 'process', 'fetch']);
// Class B: `Date` and `Math` are legitimate identifiers on their own -- only the member access
// named here (`Date.now`, `Math.random`) is banned, matched as a token SEQUENCE, not a call.
const DATE_MATH_PROPS: Record<string, string> = { Date: 'now', Math: 'random' };

// Exactly one entry: packages/engine/src/seasons.ts:14 `const window = seasonWindow(...)` is the
// only local shadow of a Class A name anywhere in the engine. Growing this list is a visible,
// deliberate choice -- see the "purity allowlist has exactly one entry" test.
export const PURITY_ALLOWLIST: ReadonlyArray<{ path: string; identifier: string }> = [{ path: 'seasons.ts', identifier: 'window' }];

function isAllowlisted(relPath: string, identifier: string): boolean {
  return PURITY_ALLOWLIST.some((entry) => entry.path === relPath && entry.identifier === identifier);
}

function isReactModuleSpecifier(text: string): boolean {
  return text === 'react' || text.startsWith('react/');
}

function lineOf(lineStarts: number[], pos: number): number {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

interface Tok {
  kind: number;
  value: string;
  start: number;
}

// A previous token that already denotes a complete VALUE means the next `/` is division, not the
// start of a regex literal -- the same ambiguity a real parser resolves with expression-context
// tracking; this is the standard "does a value precede?" heuristic for it.
function followsValue(kind: number): boolean {
  switch (kind) {
    case SyntaxKind.Identifier:
    case SyntaxKind.NumericLiteral:
    case SyntaxKind.BigIntLiteral:
    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral:
    case SyntaxKind.TemplateTail:
    case SyntaxKind.RegularExpressionLiteral:
    case SyntaxKind.CloseParenToken:
    case SyntaxKind.CloseBracketToken:
    case SyntaxKind.CloseBraceToken:
    case SyntaxKind.PlusPlusToken:
    case SyntaxKind.MinusMinusToken:
    case SyntaxKind.ThisKeyword:
    case SyntaxKind.SuperKeyword:
    case SyntaxKind.TrueKeyword:
    case SyntaxKind.FalseKeyword:
    case SyntaxKind.NullKeyword:
      return true;
    default:
      return false;
  }
}

// The installed `typescript@7` preview no longer ships the classic `ts.createSourceFile` parser
// as a public API -- its package "exports" map only reaches `dist/ast/*`'s node/token primitives
// (`typescript/unstable/ast`), which is a tokenizer (`createScanner`), not a full parser. This
// tokenizes the whole file up front, resolving the two ambiguities a raw token stream can't: is a
// `/` a regex literal or division (`followsValue`), and does a `}` close a template interpolation
// or a real block/object (tracked via `templateDepths`, using `reScanTemplateToken`). The result
// is a real, single-token-per-comment/string/regex/template-body stream -- those can never be
// mistaken for code, so they can never trip a false violation or hide a real one.
function tokenize(src: string): Tok[] {
  const scanner = createScanner(true, LanguageVariant.Standard, src);
  const toks: Tok[] = [];
  let depth = 0;
  const templateDepths: number[] = [];
  let kind = scanner.scan();
  while (kind !== SyntaxKind.EndOfFile) {
    if (kind === SyntaxKind.TemplateHead) {
      templateDepths.push(depth);
    } else if (kind === SyntaxKind.OpenBraceToken) {
      depth++;
    } else if (kind === SyntaxKind.CloseBraceToken) {
      if (templateDepths.length > 0 && depth === templateDepths[templateDepths.length - 1]) {
        kind = scanner.reScanTemplateToken(false);
        if (kind === SyntaxKind.TemplateTail) templateDepths.pop();
      } else {
        depth--;
      }
    } else if (kind === SyntaxKind.SlashToken || kind === SyntaxKind.SlashEqualsToken) {
      const prev = toks[toks.length - 1];
      if (!prev || !followsValue(prev.kind)) kind = scanner.reScanSlashToken();
    }
    const value =
      kind === SyntaxKind.Identifier || kind === SyntaxKind.StringLiteral || kind === SyntaxKind.NoSubstitutionTemplateLiteral
        ? scanner.getTokenValue()
        : '';
    toks.push({ kind, value, start: scanner.getTokenStart() });
    kind = scanner.scan();
  }
  return toks;
}

// `Date`/`Math` member-access matcher for Class B (see `scanFilePurity`): matches the token
// SEQUENCE identifier -> member, across every access shape `tokenize()` can produce --
// `X.m`, `X?.m`, `X["m"]`, `X?.["m"]` -- regardless of surrounding parens (`(Math.random)`) and
// regardless of whether it is ever called (`const f = Date.now` is still a violation).
function matchesBannedMember(toks: Tok[], i: number, member: string): boolean {
  const n1 = toks[i + 1];
  const n2 = toks[i + 2];
  const n3 = toks[i + 3];
  if (n1 && (n1.kind === SyntaxKind.DotToken || n1.kind === SyntaxKind.QuestionDotToken) && n2 && n2.kind === SyntaxKind.Identifier && n2.value === member) {
    return true;
  }
  if (n1 && n1.kind === SyntaxKind.OpenBracketToken && n2 && n2.kind === SyntaxKind.StringLiteral && n2.value === member && n3 && n3.kind === SyntaxKind.CloseBracketToken) {
    return true;
  }
  if (
    n1 && n1.kind === SyntaxKind.QuestionDotToken &&
    n2 && n2.kind === SyntaxKind.OpenBracketToken &&
    n3 && n3.kind === SyntaxKind.StringLiteral && n3.value === member &&
    toks[i + 4] && toks[i + 4].kind === SyntaxKind.CloseBracketToken
  ) {
    return true;
  }
  return false;
}

// Walks the resolved token stream (see `tokenize`) with a deliberately conservative, scope-free
// rule: a Class A identifier (`window`, `document`, ...) or a Class B `Date`/`Math` member access
// is a violation wherever it appears -- no scope analysis, no shadow tracking, no member/key/param
// exemptions. Because comments, strings, regex literals and template TEXT are single tokens from
// `tokenize()`, they can never match; interpolation EXPRESSIONS (`${Date.now()}`) are real tokens
// and still do. The one false positive this produces (packages/engine/src/seasons.ts's local
// `const window = ...`) is carved out by `PURITY_ALLOWLIST`, not by scanner logic.
function scanFilePurity(relPath: string, src: string): string[] {
  const hits: string[] = [];
  const lineStarts = computeLineStarts(src);
  const toks = tokenize(src);

  const hit = (pos: number, label: string) => hits.push(`${relPath}:${lineOf(lineStarts, pos)}: ${label}`);
  const hitPlain = (label: string) => hits.push(`${relPath}: ${label}`);

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];

    if (t.kind === SyntaxKind.Identifier) {
      if (CLASS_A_IDENTIFIERS.has(t.value) && !isAllowlisted(relPath, t.value)) {
        hit(t.start, `${t.value} global`);
        continue;
      }
      const member = DATE_MATH_PROPS[t.value];
      if (member && matchesBannedMember(toks, i, member)) hitPlain(`${t.value}.${member}()`);
      continue;
    }

    if ((t.kind === SyntaxKind.StringLiteral || t.kind === SyntaxKind.NoSubstitutionTemplateLiteral) && isReactModuleSpecifier(t.value)) {
      const p2 = toks[i - 2];
      const isFrom = !!prev && prev.kind === SyntaxKind.FromKeyword;
      const isBareImport = !!prev && prev.kind === SyntaxKind.ImportKeyword;
      const isDynamicImport = !!prev && prev.kind === SyntaxKind.OpenParenToken && !!p2 && p2.kind === SyntaxKind.ImportKeyword;
      const isRequire = !!prev && prev.kind === SyntaxKind.OpenParenToken && !!p2 && p2.kind === SyntaxKind.Identifier && p2.value === 'require';
      if (isFrom || isBareImport || isDynamicImport || isRequire) hitPlain('react import');
    }
  }

  return hits;
}

export function scanEnginePurity(dir: string, fs: Pick<FsRunner, 'listEngineFiles' | 'readFile'>): string[] {
  const violations: string[] = [];
  for (const file of fs.listEngineFiles(dir)) {
    if (!file.endsWith('.ts')) continue;
    const relPath = relative(dir, file);
    violations.push(...scanFilePurity(relPath, fs.readFile(file)));
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

const HEAD_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function runDoctor(opts: DoctorOptions): DoctorReport {
  const cwd = opts.cwd ?? process.cwd();
  const { runners } = opts;
  const lines: DoctorLine[] = [];

  const branch = sanitizeForReport(runners.git.branch(cwd));
  const rawHeadSha = runners.git.headSha(cwd);
  const headSha = sanitizeForReport(rawHeadSha);
  const rawWorktreePath = runners.git.worktreePath(cwd);
  const worktreePath = sanitizeForReport(rawWorktreePath);

  const headShaValid = HEAD_SHA_PATTERN.test(rawHeadSha);
  lines.push({
    group: 'repo',
    ok: headShaValid,
    label: headShaValid ? `branch=${branch} head=${headSha}` : `INVALID SHA: head=${headSha} is not a 40-hex commit sha`,
  });

  const resolvedCwd = resolve(cwd);
  const worktreeIsCwdRoot = rawWorktreePath === resolvedCwd;
  lines.push({
    group: 'repo',
    ok: worktreeIsCwdRoot,
    label: worktreeIsCwdRoot
      ? `worktree=${worktreePath}`
      : `WRONG ROOT: worktree=${worktreePath} != resolved cwd ${sanitizeForReport(resolvedCwd)}`,
  });

  const nodeVersion = opts.nodeVersion ?? process.version;
  const nodeOk = checkNodeVersion(nodeVersion);
  lines.push({ group: 'deps', ok: nodeOk, label: `node ${nodeVersion} (>=22.12 required)` });

  const nodeModulesPath = resolve(cwd, 'node_modules');
  const nodeModulesOk = runners.fs.pathExists(nodeModulesPath);
  lines.push({
    group: 'deps',
    ok: nodeModulesOk,
    label: nodeModulesOk ? 'node_modules present' : `MISSING node_modules at ${sanitizeForReport(nodeModulesPath)}`,
  });

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

  // The programmatic API defaults to engine-only too -- an omitted `engineOnly` must never fall
  // through to full mode, which needs real server/bridge/console runners this CLI cannot fabricate.
  const engineOnly = opts.engineOnly ?? true;
  if (!engineOnly) {
    lines.push({ group: 'server', ok: runners.fetch.serverHealth(), label: 'web reachable' });

    const version = runners.fetch.bridgeVersion();
    if (version === null) {
      lines.push({ group: 'bridge', ok: false, label: 'bridge unreachable' });
    } else {
      const commit = sanitizeForReport(version.commit);
      const worktree = sanitizeForReport(version.worktree);
      const commitOk = version.commit === rawHeadSha;
      lines.push({
        group: 'bridge',
        ok: commitOk,
        label: commitOk ? 'version().commit == HEAD' : `STALE BUILD: commit ${commit} != HEAD ${headSha}`,
      });
      const worktreeOk = version.worktree === rawWorktreePath;
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
      // false PASS. The shipped CLI defaults to engine-only precisely because these fail closed;
      // full mode (`--full`) is meant to run with real runners injected by that future browser
      // harness.
      bridgeVersion: () => null,
      serverHealth: () => false,
      consoleErrors: () => ['console errors not checked: no driven browser session available to this CLI'],
    },
    fs: {
      listEngineFiles: (dir) => listFilesRecursive(dir),
      readFile: (path) => readFileSync(path, 'utf8'),
      pathExists: (path) => existsSync(path),
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

// The shipped `verify:doctor` script must be a command that can genuinely pass with no browser
// or dev server available -- so engine-only is the default, and reaching the server/bridge/
// console groups (which need real runners from a browser-driving harness) requires the caller to
// opt in explicitly with `--full`. `--engine-only` is accepted too, but is already the default.
export function resolveEngineOnly(argv: string[]): boolean {
  return !argv.includes('--full');
}

if (isMainModule()) {
  const engineOnly = resolveEngineOnly(process.argv.slice(2));
  const report = runDoctor({ engineOnly, runners: defaultRunners() });
  console.log(report.text);
  process.exit(exitCodeFor(report));
}
