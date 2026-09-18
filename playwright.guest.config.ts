import { defineConfig } from '@playwright/test';
import { resolvePort } from './scripts/verify/port';
const port = resolvePort('guest-web');
export default defineConfig({
  testDir: 'apps/web/guest-test', outputDir: '.qa/guest-results', workers: 3, timeout: 300000,
  use: { baseURL: process.env.TBH_GUEST_URL ?? `http://127.0.0.1:${port}`, locale: 'vi-VN', actionTimeout: 10000, trace: 'retain-on-failure' },
  projects: [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 720 }].map(viewport => ({ name: `${viewport.width}x${viewport.height}`, use: { viewport } })),
  webServer: process.env.TBH_GUEST_URL ? undefined : { command: `npx vite preview --config apps/web/vite.config.ts --outDir ../../.qa/guest-dist --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
