import { defineConfig } from '@playwright/test';
import { resolvePort } from './scripts/verify/port';
const webPort = resolvePort('admin-web');
const apiPort = resolvePort('admin-api');
export default defineConfig({outputDir:'.qa/test-results-admin',testDir:'apps/web/admin-test',testMatch:'**/*.spec.ts',workers:1,fullyParallel:false,timeout:45000,
 use:{actionTimeout:8000,baseURL:`http://127.0.0.1:${webPort}`,viewport:{width:390,height:844},trace:'retain-on-failure'},
 webServer:[{command:'npx tsx apps/web/admin-test/server.ts',url:`http://127.0.0.1:${apiPort}/admin/auth`,reuseExistingServer:false},
 {command:`TBH_BROWSER_TEST=1 TBH_API_TARGET=http://127.0.0.1:${apiPort} npm run dev -- --port ${webPort}`,url:`http://127.0.0.1:${webPort}/admin`,reuseExistingServer:false}]});
