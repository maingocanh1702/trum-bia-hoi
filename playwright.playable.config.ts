import { defineConfig } from '@playwright/test';
const viewports=[{width:390,height:844},{width:360,height:740},{width:1280,height:720}];
export default defineConfig({
  testDir:'apps/web/playable-test',testMatch:'shift.spec.ts',outputDir:'.qa/playable-results',workers:3,fullyParallel:true,timeout:25*60*1000,
  use:{locale:'vi-VN',trace:'retain-on-failure',actionTimeout:10000},
  projects:viewports.map((viewport,i)=>({name:`${viewport.width}x${viewport.height}`,use:{viewport,baseURL:`http://127.0.0.1:${4209+i*2}`}})),
  // Each viewport has its own default-config server/clock, so filters, retries and serial runs are independent.
  webServer:viewports.flatMap((_,i)=>[
    {command:`TBH_AUTH_DEV=1 TBH_PORT=${4210+i*2} TBH_ORIGIN=http://127.0.0.1:${4209+i*2} npx tsx apps/web/playable-test/server.ts`,url:`http://127.0.0.1:${4210+i*2}/auth/session`,reuseExistingServer:false},
    {command:`${i===0?'npm run build && ':''}TBH_API_TARGET=http://127.0.0.1:${4210+i*2} npx vite preview --config apps/web/vite.config.ts --port ${4209+i*2}`,url:`http://127.0.0.1:${4209+i*2}`,reuseExistingServer:false},
  ]),
});
