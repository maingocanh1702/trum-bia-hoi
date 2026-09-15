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
  runners: DoctorRunners;
}

function checkNodeVersion(version: string): boolean {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

const DOM_GLOBAL_NAMES = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'indexedDB']);
const DATE_MATH_PROPS: Record<string, string> = { Date: 'now', Math: 'random' };

function isReactModuleSpecifier(text: string): boolean {
  return text === 'react' || text.startsWith('react/') || text === 'react-dom' || text.startsWith('react-dom/');
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
    const value = kind === SyntaxKind.Identifier || kind === SyntaxKind.StringLiteral ? scanner.getTokenValue() : '';
    toks.push({ kind, value, start: scanner.getTokenStart() });
    kind = scanner.scan();
  }
  return toks;
}

// Walks the resolved token stream (see `tokenize`) to flag react imports, `Date.now()` /
// `Math.random()` calls (including optional chaining and computed member access) and bare
// references to a DOM global. A brace-depth shadow stack tracks local `const/let/var` bindings
// and `function` parameters that shadow a DOM-global name (e.g. packages/engine/src/seasons.ts's
// local `const window = ...`), matching real JS block scoping closely enough for this narrow
// purity check; property names (`foo.window`), object-literal keys (`{ window: 1 }`) and
// declaration sites are recognised from local token context and never treated as a reference.
function scanFilePurity(relPath: string, src: string): string[] {
  const hits: string[] = [];
  const lineStarts = computeLineStarts(src);
  const toks = tokenize(src);

  const hit = (pos: number, label: string) => hits.push(`${relPath}:${lineOf(lineStarts, pos)}: ${label}`);
  const hitPlain = (label: string) => hits.push(`${relPath}: ${label}`);

  let depth = 0;
  let parenDepth = 0;
  let awaitingParamOpen = false;
  let paramParenDepth = -1;
  let pendingParamShadows: string[] | null = null;
  let awaitingFunctionBody: string[] | null = null;
  const shadowStack: Array<{ depth: number; name: string }> = [];
  const isShadowed = (name: string) => shadowStack.some((s) => s.name === name);

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];
    const next = toks[i + 1];

    if (t.kind === SyntaxKind.FunctionKeyword) {
      awaitingParamOpen = true;
    } else if (t.kind === SyntaxKind.OpenParenToken) {
      parenDepth++;
      if (awaitingParamOpen) {
        awaitingParamOpen = false;
        pendingParamShadows = [];
        paramParenDepth = parenDepth;
      }
      const p1 = prev;
      const p2 = toks[i - 2];
      const p3 = toks[i - 3];
      const p4 = toks[i - 4];
      if (
        p1 && p2 && p3 &&
        p1.kind === SyntaxKind.Identifier &&
        (p2.kind === SyntaxKind.DotToken || p2.kind === SyntaxKind.QuestionDotToken) &&
        p3.kind === SyntaxKind.Identifier &&
        DATE_MATH_PROPS[p3.value] === p1.value
      ) {
        hitPlain(`${p3.value}.${p1.value}()`);
      } else if (
        p1 && p2 && p3 && p4 &&
        p1.kind === SyntaxKind.CloseBracketToken &&
        p2.kind === SyntaxKind.StringLiteral &&
        p3.kind === SyntaxKind.OpenBracketToken &&
        p4.kind === SyntaxKind.Identifier &&
        DATE_MATH_PROPS[p4.value] === p2.value
      ) {
        hitPlain(`${p4.value}.${p2.value}()`);
      }
    } else if (t.kind === SyntaxKind.CloseParenToken) {
      if (pendingParamShadows !== null && parenDepth === paramParenDepth) {
        awaitingFunctionBody = pendingParamShadows;
        pendingParamShadows = null;
        paramParenDepth = -1;
      }
      parenDepth--;
    } else if (t.kind === SyntaxKind.OpenBraceToken) {
      depth++;
      if (awaitingFunctionBody) {
        for (const name of awaitingFunctionBody) shadowStack.push({ depth, name });
        awaitingFunctionBody = null;
      }
    } else if (t.kind === SyntaxKind.CloseBraceToken) {
      depth--;
      while (shadowStack.length > 0 && shadowStack[shadowStack.length - 1].depth > depth) shadowStack.pop();
    } else if (t.kind === SyntaxKind.SemicolonToken) {
      awaitingFunctionBody = null; // an overload signature ending in `;` never gets a body to shadow
    } else if (t.kind === SyntaxKind.StringLiteral && isReactModuleSpecifier(t.value)) {
      const p1 = prev;
      const p2 = toks[i - 2];
      const isFrom = !!p1 && p1.kind === SyntaxKind.FromKeyword;
      const isBareImport = !!p1 && p1.kind === SyntaxKind.ImportKeyword;
      const isDynamicImport = !!p1 && p1.kind === SyntaxKind.OpenParenToken && !!p2 && p2.kind === SyntaxKind.ImportKeyword;
      const isRequire = !!p1 && p1.kind === SyntaxKind.OpenParenToken && !!p2 && p2.kind === SyntaxKind.Identifier && p2.value === 'require';
      if (isFrom || isBareImport || isDynamicImport || isRequire) hitPlain('react import');
    } else if (t.kind === SyntaxKind.Identifier) {
      if (
        prev &&
        (prev.kind === SyntaxKind.ConstKeyword || prev.kind === SyntaxKind.LetKeyword || prev.kind === SyntaxKind.VarKeyword) &&
        DOM_GLOBAL_NAMES.has(t.value)
      ) {
        shadowStack.push({ depth, name: t.value });
        continue;
      }
      if (
        pendingParamShadows !== null &&
        parenDepth === paramParenDepth &&
        DOM_GLOBAL_NAMES.has(t.value) &&
        prev && (prev.kind === SyntaxKind.OpenParenToken || prev.kind === SyntaxKind.CommaToken) &&
        next &&
        (next.kind === SyntaxKind.ColonToken ||
          next.kind === SyntaxKind.CommaToken ||
          next.kind === SyntaxKind.CloseParenToken ||
          next.kind === SyntaxKind.EqualsToken)
      ) {
        pendingParamShadows.push(t.value);
        continue;
      }
      if (prev && (prev.kind === SyntaxKind.DotToken || prev.kind === SyntaxKind.QuestionDotToken)) continue; // e.g. `foo.window`
      if (
        prev &&
        (prev.kind === SyntaxKind.OpenBraceToken || prev.kind === SyntaxKind.CommaToken) &&
        next &&
        next.kind === SyntaxKind.ColonToken
      )
        continue; // object-literal key, e.g. `{ window: 1 }`
      if (DOM_GLOBAL_NAMES.has(t.value) && !isShadowed(t.value)) hit(t.start, `${t.value} global`);
    }
  }

  return hits;
}

export function scanEnginePurity(dir: string, fs: Pick<FsRunner, 'listEngineFiles' | 'readFile'>): string[] {
  const violations: string[] = [];
  for (const file of fs.listEngineFiles(dir)) {
    if (!file.endsWith('.ts')) continue;
    const relPath = relative(dir, file);
    if (relPath === 'rng.ts') continue; // exact relative-path exemption at the engine-src root only
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

  const nodeOk = checkNodeVersion(process.version);
  lines.push({ group: 'deps', ok: nodeOk, label: `node ${process.version} (>=22.12 required)` });

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

  if (!opts.engineOnly) {
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
