import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveAllPorts } from './port';

// Snapshotted BEFORE any config edit (today's literal ports) so the RED run pins the true
// "before" state -- see the 5 configs' current baseURL/webServer literals.
const LITERAL_PORTS = {
  'e2e': 4178,
  'dev-identity-web': 4179,
  'dev-identity-api': 4180,
  'admin-web': 4181,
  'admin-api': 4182,
  'playable-web-0': 4209,
  'playable-api-0': 4210,
  'playable-web-1': 4211,
  'playable-api-1': 4212,
  'playable-web-2': 4213,
  'playable-api-2': 4214,
  'dev-web': 4215,
  'dev-api': 4216,
  'dev-preview': 4217,
} as const;

type Ports = Record<string, number>;

function fixtureDir(t: { after(fn: () => unknown): void }, kind: string): string {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa', `port-wire-${kind}-`));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  return dir;
}

// A real (non-worktree) `.git` directory so port.ts's isWorktreeCwd() reports false and the
// resolver falls back to DEFAULT_BASE -- mirrors the "main workspace" fixture in port.test.ts.
function mainWorkspaceDir(t: { after(fn: () => unknown): void }): string {
  const dir = fixtureDir(t, 'main');
  mkdirSync(resolve(dir, '.git'));
  return dir;
}

// Each case loads the config in its own child process (no ESM module-cache reuse across
// cases), with `cwd` controlling the worktree/main-workspace branch and `env` controlling
// TBH_PORT_BASE -- the same technique port.test.ts uses to observe env-driven differences.
function loadConfig(fileName: string, cwd: string, env: NodeJS.ProcessEnv): unknown {
  const url = pathToFileURL(resolve(fileName)).href;
  const script = `import(${JSON.stringify(url)}).then(m => process.stdout.write(JSON.stringify(m.default)));`;
  const output = execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd, env, encoding: 'utf8',
  });
  return JSON.parse(output);
}

const { CI: _CI, TBH_PORT_BASE: _TBH_PORT_BASE, ...ENV_BASE } = process.env;

function defaultCaseEnv(): NodeJS.ProcessEnv {
  return { ...ENV_BASE };
}

function overrideCaseEnv(base: string): NodeJS.ProcessEnv {
  return { ...ENV_BASE, TBH_PORT_BASE: base };
}

function assertWiredToResolver(fileName: string): void {
  const source = readFileSync(resolve(fileName), 'utf8');
  assert.match(
    source,
    /from ['"]\.\/scripts\/verify\/port['"]/,
    `${fileName} must import the resolver from ./scripts/verify/port`,
  );
  assert.match(source, /resolvePort\(/, `${fileName} must call resolvePort(...)`);
  for (const literal of new Set(Object.values(LITERAL_PORTS))) {
    assert.doesNotMatch(
      source,
      new RegExp(`\\b${literal}\\b`),
      `${fileName} must no longer hardcode literal port ${literal}`,
    );
  }
}

function expectedRoot(ports: Ports) {
  const port = ports['e2e'];
  return {
    testDir: 'apps/web/test', fullyParallel: true, timeout: 45000,
    use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
    webServer: {
      command: `VITE_TBH_LOCAL=1 VITE_TBH_RISK_PREVIEW=1 TBH_BROWSER_TEST=1 npm run dev -- --port ${port}`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: true,
    },
  };
}

function expectedDevIdentity(ports: Ports) {
  const web = ports['dev-identity-web'];
  const api = ports['dev-identity-api'];
  return {
    outputDir: '.qa/test-results-dev-identity', testDir: 'apps/web/remote-test', testMatch: 'dev-identity.spec.ts',
    workers: 1, timeout: 60000,
    use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${web}`, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
    webServer: [
      { command: 'TBH_AUTH_DEV=1 npx tsx apps/web/remote-test/server.ts', url: `http://127.0.0.1:${api}/auth/session`, reuseExistingServer: false },
      { command: `TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:${api} npm run dev -- --port ${web}`, url: `http://127.0.0.1:${web}`, reuseExistingServer: false },
    ],
  };
}

function expectedAdmin(ports: Ports) {
  const web = ports['admin-web'];
  const api = ports['admin-api'];
  return {
    outputDir: '.qa/test-results-admin', testDir: 'apps/web/admin-test', testMatch: '**/*.spec.ts',
    workers: 1, fullyParallel: false, timeout: 45000,
    use: { actionTimeout: 8000, baseURL: `http://127.0.0.1:${web}`, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
    webServer: [
      { command: 'npx tsx apps/web/admin-test/server.ts', url: `http://127.0.0.1:${api}/admin/auth`, reuseExistingServer: false },
      { command: `TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:${api} npm run dev -- --port ${web}`, url: `http://127.0.0.1:${web}/admin`, reuseExistingServer: false },
    ],
  };
}

function expectedRemote(ports: Ports) {
  const web = ports['dev-identity-web'];
  const api = ports['dev-identity-api'];
  return {
    outputDir: '.qa/test-results-remote',
    testDir: 'apps/web/remote-test', testMatch: '**/*.spec.ts', testIgnore: ['dev-identity.spec.ts', 'accessibility.spec.ts'],
    fullyParallel: false, workers: 1, timeout: 60000,
    use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${web}`, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
    webServer: [
      { command: 'npx tsx apps/web/remote-test/server.ts', url: `http://127.0.0.1:${api}/auth/session`, reuseExistingServer: false },
      { command: `TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:${api} npm run dev -- --port ${web}`, url: `http://127.0.0.1:${web}`, reuseExistingServer: false },
    ],
  };
}

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }];

function expectedPlayable(ports: Ports) {
  const webPorts = [0, 1, 2].map((i) => ports[`playable-web-${i}`]);
  const apiPorts = [0, 1, 2].map((i) => ports[`playable-api-${i}`]);
  return {
    testDir: 'apps/web/playable-test', testMatch: 'shift.spec.ts', outputDir: '.qa/playable-results',
    workers: 3, fullyParallel: true, timeout: 25 * 60 * 1000,
    use: { locale: 'vi-VN', trace: 'retain-on-failure', actionTimeout: 10000 },
    projects: VIEWPORTS.map((viewport, i) => ({
      name: `${viewport.width}x${viewport.height}`,
      use: { viewport, baseURL: `http://127.0.0.1:${webPorts[i]}` },
    })),
    webServer: VIEWPORTS.flatMap((_viewport, i) => [
      {
        command: `TBH_AUTH_DEV=1 TBH_PORT=${apiPorts[i]} TBH_ORIGIN=http://127.0.0.1:${webPorts[i]} npx tsx apps/web/playable-test/server.ts`,
        url: `http://127.0.0.1:${apiPorts[i]}/auth/session`, reuseExistingServer: false,
      },
      {
        command: `${i === 0 ? 'npm run build && ' : ''}TBH_API_TARGET=http://127.0.0.1:${apiPorts[i]} npx vite preview --config apps/web/vite.config.ts --port ${webPorts[i]}`,
        url: `http://127.0.0.1:${webPorts[i]}`, reuseExistingServer: false,
      },
    ]),
  };
}

function portFromUrl(url: string): number {
  const match = /:(\d+)/.exec(url);
  assert.ok(match, `expected a "host:port" URL, got ${url}`);
  return Number(match![1]);
}

function expectedAccessibility(ports: Ports) {
  const identity = expectedDevIdentity(ports);
  return {
    ...identity, testMatch: 'accessibility.spec.ts', outputDir: '.qa/axe-results',
    webServer: identity.webServer.map((server) => ({ ...server, command: `TBH_A11Y_TEST=1 ${server.command}` })),
  };
}

const CONFIGS: { file: string; build: (ports: Ports) => unknown }[] = [
  { file: 'playwright.config.ts', build: expectedRoot },
  { file: 'playwright.dev-identity.config.ts', build: expectedDevIdentity },
  { file: 'playwright.admin.config.ts', build: expectedAdmin },
  { file: 'playwright.remote.config.ts', build: expectedRemote },
  { file: 'playwright.playable.config.ts', build: expectedPlayable },
];

for (const { file } of CONFIGS) {
  test(`${file} imports and calls the resolver, with no leftover hardcoded literal ports`, () => {
    assertWiredToResolver(file);
  });
}

test('apps/web/vite.config.ts imports and calls the resolver, with no leftover hardcoded dev ports', () => {
  const source = readFileSync(resolve('apps/web/vite.config.ts'), 'utf8');
  assert.match(
    source,
    /from ['"](\.\.\/\.\.\/)?scripts\/verify\/port['"]/,
    'apps/web/vite.config.ts must import the resolver from scripts/verify/port',
  );
  assert.match(source, /resolvePort\(/, 'apps/web/vite.config.ts must call resolvePort(...)');
  for (const literal of [5173, 5175, 4173]) {
    assert.doesNotMatch(
      source,
      new RegExp(`\\b${literal}\\b`),
      `apps/web/vite.config.ts must no longer hardcode literal dev port ${literal}`,
    );
  }
});

test('apps/web/vite.config.ts server/preview ports and the /api proxy default derive from the resolver', (t) => {
  const cwd = mainWorkspaceDir(t);
  const defaultPorts = resolveAllPorts({ cwd, env: {} });
  const defaultConfig = loadConfig('apps/web/vite.config.ts', cwd, defaultCaseEnv()) as {
    server: { port: number; proxy: { '/api': { target: string } } };
    preview: { port: number };
  };
  assert.equal(defaultConfig.server.port, defaultPorts['dev-web']);
  assert.equal(defaultConfig.preview.port, defaultPorts['dev-preview']);
  assert.equal(defaultConfig.server.proxy['/api'].target, `http://127.0.0.1:${defaultPorts['dev-api']}`);

  const overridePorts = resolveAllPorts({ env: { TBH_PORT_BASE: '5300' } });
  const overrideConfig = loadConfig('apps/web/vite.config.ts', resolve('.'), overrideCaseEnv('5300')) as {
    server: { port: number; proxy: { '/api': { target: string } } };
    preview: { port: number };
  };
  assert.equal(overrideConfig.server.port, overridePorts['dev-web']);
  assert.equal(overrideConfig.preview.port, overridePorts['dev-preview']);
  assert.equal(overrideConfig.server.proxy['/api'].target, `http://127.0.0.1:${overridePorts['dev-api']}`);
});

test('package.json wires dev/dev:server to the resolver-derived ports', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.match(pkg.scripts['dev'], /vite --config apps\/web\/vite\.config\.ts/);
  assert.match(
    pkg.scripts['dev:server'],
    /scripts\/verify\/port\.ts.*--role=dev-api/,
    '"dev:server" must capture a resolver-derived TBH_PORT before invoking apps/server/src/main.ts',
  );
  assert.match(pkg.scripts['dev:server'], /TBH_PORT=/);
  assert.doesNotMatch(pkg.scripts['dev:server'], /\b5175\b/);
});

test('with TBH_PORT_BASE unset, every scoped config resolves to today\'s literal ports (main workspace)', (t) => {
  const cwd = mainWorkspaceDir(t);
  const env = defaultCaseEnv();
  const ports = resolveAllPorts({ cwd, env: {} });
  assert.deepEqual(ports, LITERAL_PORTS, 'sanity: resolver itself must reproduce literals for the main workspace');
  for (const { file, build } of CONFIGS) {
    const actual = loadConfig(file, cwd, env);
    assert.deepEqual(actual, build(ports), `${file} must equal today's literals byte-for-byte when TBH_PORT_BASE is unset`);
  }
});

test('with TBH_PORT_BASE=5300, every scoped config reflects the resolver\'s derived ports', (t) => {
  const cwd = resolve('.');
  const env = overrideCaseEnv('5300');
  const ports = resolveAllPorts({ env: { TBH_PORT_BASE: '5300' } });
  for (const { file, build } of CONFIGS) {
    const actual = loadConfig(file, cwd, env);
    assert.deepEqual(actual, build(ports), `${file} must use the resolver's derived ports when TBH_PORT_BASE=5300`);
  }
  t.after(() => {}); // fixture parity with the other tests; nothing to clean up here
});

test('playable.config.ts keeps 3 distinct, non-overlapping web/api port pairs after wiring', (t) => {
  const cwd = mainWorkspaceDir(t);
  const cases: { cwd: string; env: NodeJS.ProcessEnv }[] = [
    { cwd, env: defaultCaseEnv() },
    { cwd: resolve('.'), env: overrideCaseEnv('5300') },
  ];
  for (const { cwd: caseCwd, env } of cases) {
    const actual = loadConfig('playwright.playable.config.ts', caseCwd, env) as {
      projects: { use: { baseURL: string } }[];
      webServer: { url: string }[];
    };
    const webPorts = actual.projects.map((p) => portFromUrl(p.use.baseURL));
    const apiPorts = [0, 1, 2].map((i) => portFromUrl(actual.webServer[2 * i].url));
    const all = [...webPorts, ...apiPorts];
    assert.equal(all.length, 6);
    assert.equal(new Set(all).size, 6, `expected 6 distinct ports, got ${JSON.stringify(all)}`);
  }
});

test('playwright.accessibility.config.ts is untouched but inherits the resolver-derived ports via ...identity', (t) => {
  const originalSource = readFileSync(resolve('playwright.accessibility.config.ts'), 'utf8');
  assert.equal(
    originalSource,
    "import { defineConfig } from '@playwright/test';\n"
      + "import identity from './playwright.dev-identity.config';\n"
      + 'export default defineConfig({\n'
      + "  ...identity, testMatch: 'accessibility.spec.ts', outputDir: '.qa/axe-results',\n"
      + '  webServer: (identity.webServer as { command: string; url: string; reuseExistingServer: boolean }[]).map(server => ({ ...server, command: `TBH_A11Y_TEST=1 ${server.command}` })),\n'
      + '});\n',
    'playwright.accessibility.config.ts must not be edited by this slice',
  );

  const mainCwd = mainWorkspaceDir(t);
  const defaultPorts = resolveAllPorts({ cwd: mainCwd, env: {} });
  const overridePorts = resolveAllPorts({ env: { TBH_PORT_BASE: '5300' } });

  const defaultActual = loadConfig('playwright.accessibility.config.ts', mainCwd, defaultCaseEnv());
  assert.deepEqual(defaultActual, expectedAccessibility(defaultPorts), 'accessibility config must inherit today\'s literal ports by default');

  const overrideActual = loadConfig('playwright.accessibility.config.ts', resolve('.'), overrideCaseEnv('5300'));
  assert.deepEqual(overrideActual, expectedAccessibility(overridePorts), 'accessibility config must inherit TBH_PORT_BASE=5300-derived ports');
});
