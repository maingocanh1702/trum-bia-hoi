import { defineConfig } from '@playwright/test';
import { resolvePort } from './scripts/verify/port';
const port = resolvePort('e2e');
export default defineConfig({
  testDir: 'apps/web/test', fullyParallel: true, timeout: 45000,
  use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: { command: `VITE_TBH_LOCAL=1 VITE_TBH_RISK_PREVIEW=1 TBH_BROWSER_TEST=1 npm run dev -- --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
});
