import { defineConfig } from '@playwright/test';
import { resolvePort } from './scripts/verify/port';
const port = resolvePort('e2e');
export default defineConfig({
  testDir: 'apps/web/test', testMatch: 'improve-*.spec.ts', timeout: 90000,
  use: { locale: 'vi-VN', baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: { command: `VITE_TBH_LOCAL=1 npm run build && npx vite preview --config apps/web/vite.config.ts --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120000 },
});
