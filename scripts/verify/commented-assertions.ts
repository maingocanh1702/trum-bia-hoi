import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * A line comment put in the MIDDLE of a test line (`foo(); expect(a).toBe(1); // why  expect(b).toBe(2);`) turns every later statement of that line into
 * comment text: the assertion stays in the file, reads like a check and never runs. Review round 1 of plan S5 found two of them behind a green local tier.
 * `commentedAssertions` returns every line of a source text whose `//` comment (outside string, template and regular-expression literals) contains a call
 * that looks like an assertion; a comment that only talks about one does it without the call syntax `expect(` / `assert(` / `assert.x(`.
 */
export interface Hit { line: number; text: string }
const ASSERTION = /\b(?:expect\s*\(|assert(?:\.\w+)?\s*\()/;

/** The text of the `//` comment of one line, or null when the line has none outside a literal. */
export function lineComment(line: string): string | null {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && line[i + 1] === '/' && line[i - 1] !== ':') return line.slice(i + 2);
  }
  return null;
}

export function commentedAssertions(text: string): Hit[] {
  const hits: Hit[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const comment = lineComment(line);
    if (comment !== null && ASSERTION.test(comment) && line.slice(0, line.length - comment.length - 2).trim() !== '') hits.push({ line: index + 1, text: line.trim().slice(0, 200) });
  });
  return hits;
}

const walk = (dir: string): string[] => !existsSync(dir) ? [] : readdirSync(dir).flatMap(entry => {
  if (entry === 'node_modules' || entry === 'dist') return [];
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

/** Every test and verification source of the repo (the places an assertion lives). */
export const TEST_ROOTS = ['apps/web/test', 'apps/web/guest-test', 'apps/web/remote-test', 'apps/web/playable-test', 'apps/web/admin-test', 'apps/web/src/verify', 'apps/server/test', 'packages/engine/test', 'scripts'];

export function scanRepo(cwd = process.cwd()): { files: number; lines: number; hits: (Hit & { file: string })[] } {
  let files = 0, lines = 0;
  const hits: (Hit & { file: string })[] = [];
  for (const root of TEST_ROOTS) for (const file of walk(resolve(cwd, root))) {
    if (!/\.(?:ts|tsx|mts|mjs|js)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    files++; lines += text.split(/\r?\n/).length;
    for (const hit of commentedAssertions(text)) hits.push({ ...hit, file: relative(cwd, file).replace(/\\/g, '/') });
  }
  return { files, lines, hits };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, 'commented-assertions.ts')) {
  const { files, lines, hits } = scanRepo();
  console.log(`${files} files, ${lines} lines scanned: ${hits.length} commented-out assertion(s)`);
  for (const hit of hits) console.log(`  ${hit.file}:${hit.line}  ${hit.text}`);
  process.exit(hits.length ? 1 : 0);
}
