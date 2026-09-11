import { defineConfig } from '@playwright/test';
import identity from './playwright.dev-identity.config';
export default defineConfig({
  ...identity, testMatch: 'accessibility.spec.ts', outputDir: '.qa/axe-results',
  webServer: (identity.webServer as { command: string; url: string; reuseExistingServer: boolean }[]).map(server => ({ ...server, command: `TBH_A11Y_TEST=1 ${server.command}` })),
});
