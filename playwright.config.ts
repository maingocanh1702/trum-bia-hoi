import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'apps/web/test', fullyParallel: true, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4178', trace: 'retain-on-failure' },
  webServer: { command: 'TBH_BROWSER_TEST=1 npm run dev -- --port 4178', url: 'http://127.0.0.1:4178', reuseExistingServer: !process.env.CI },
});
