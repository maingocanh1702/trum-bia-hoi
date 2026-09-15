import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CoverageOptions {
  cwd?: string;
  featureMapDir?: string;
}

export type CoverageKind = 'command' | 'event' | 'test';

export interface CoverageItem {
  kind: CoverageKind;
  name: string;
}

export interface CoverageReport {
  uncited: CoverageItem[];
  total: number;
}

const TEST_DIRS = [
  'packages/engine/test',
  'apps/server/test',
  'apps/web/test',
  'apps/web/admin-test',
  'apps/web/remote-test',
  'apps/web/playable-test',
];

export const DEFAULT_FEATURE_MAP_DIR = '.claude/skills/verify-trum-bia-hoi/references/features';

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

export function collectCommandTypes(cwd: string): string[] {
  const src = readFileSync(resolve(cwd, 'packages/engine/src/types.ts'), 'utf8');
  const match = /export type Command =([\s\S]*?);\n/.exec(src);
  if (!match) throw new Error('Could not find the Command union in packages/engine/src/types.ts');
  return [...match[1].matchAll(/type:\s*'(\w+)'/g)].map((m) => m[1]);
}

export function collectEmittedEvents(cwd: string): string[] {
  const dir = resolve(cwd, 'packages/engine/src');
  const events = new Set<string>();
  for (const file of listFilesRecursive(dir)) {
    if (!file.endsWith('.ts')) continue;
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      const callSites = line.matchAll(/this\.emit\(([^,)]*)/g);
      for (const call of callSites) {
        const firstArg = call[1];
        // A ternary first-arg (`cond ? 'a' : 'b'`) may have quoted strings in `cond` too
        // (e.g. `item.dish === 'bia' ? 'beer_poured' : 'dish_ready'`); only the text after
        // the `?` holds the actual candidate event names.
        const tail = firstArg.includes('?') ? firstArg.slice(firstArg.indexOf('?') + 1) : firstArg;
        for (const literal of tail.matchAll(/'([A-Za-z_]\w*)'/g)) events.add(literal[1]);
      }
    }
  }
  return [...events];
}

export function collectTestFiles(cwd: string): string[] {
  const files: string[] = [];
  for (const dir of TEST_DIRS) {
    for (const file of listFilesRecursive(resolve(cwd, dir))) {
      if (/\.(test|spec)\.ts$/.test(file)) files.push(relative(cwd, file));
    }
  }
  return files;
}

function collectFeatureMapText(featureMapDir: string): string {
  if (!existsSync(featureMapDir)) return '';
  return listFilesRecursive(featureMapDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

export function computeCoverage(opts: CoverageOptions = {}): CoverageReport {
  const cwd = opts.cwd ?? process.cwd();
  const featureMapDir = resolve(cwd, opts.featureMapDir ?? DEFAULT_FEATURE_MAP_DIR);
  const text = collectFeatureMapText(featureMapDir);

  const items: CoverageItem[] = [
    ...collectCommandTypes(cwd).map((name): CoverageItem => ({ kind: 'command', name })),
    ...collectEmittedEvents(cwd).map((name): CoverageItem => ({ kind: 'event', name })),
    ...collectTestFiles(cwd).map((name): CoverageItem => ({ kind: 'test', name })),
  ];

  return { uncited: items.filter((item) => !text.includes(item.name)), total: items.length };
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const featureMapDir = process.argv[2] ?? process.env.MAP_COVERAGE_FEATURE_DIR;
  const report = computeCoverage(featureMapDir ? { featureMapDir } : {});
  if (report.uncited.length > 0) {
    console.log(`${report.uncited.length} uncited of ${report.total}:`);
    for (const item of report.uncited) console.log(`  [${item.kind}] ${item.name}`);
    process.exit(1);
  } else {
    console.log(`All ${report.total} commands/events/tests are cited.`);
  }
}
