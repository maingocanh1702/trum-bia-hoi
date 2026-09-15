import { defineConfig } from '@playwright/test';
import { resolvePort } from './scripts/verify/port';
const webPort = resolvePort('dev-identity-web');
const apiPort = resolvePort('dev-identity-api');
export default defineConfig({
  outputDir: '.qa/test-results-remote',
  testDir: 'apps/web/remote-test', testMatch: '**/*.spec.ts', testIgnore: ['dev-identity.spec.ts', 'accessibility.spec.ts'], fullyParallel: false, workers: 1, timeout: 60000,
  use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${webPort}`, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npx tsx apps/web/remote-test/server.ts', url: `http://127.0.0.1:${apiPort}/auth/session`, reuseExistingServer: false },
    { command: `TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:${apiPort} npm run dev -- --port ${webPort}`, url: `http://127.0.0.1:${webPort}`, reuseExistingServer: false },
  ],
});
