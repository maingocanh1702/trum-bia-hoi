import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: '.qa/test-results-remote',
  testDir: 'apps/web/remote-test', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4179', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npx tsx apps/web/remote-test/server.ts', url: 'http://127.0.0.1:4180/auth/session', reuseExistingServer: false },
    { command: 'TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:4180 npm run dev -- --port 4179', url: 'http://127.0.0.1:4179', reuseExistingServer: false },
  ],
});
