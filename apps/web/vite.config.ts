import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { host: '127.0.0.1', port: 5173, strictPort: true, hmr: process.env.TBH_BROWSER_TEST === '1' ? false : undefined, ws: process.env.TBH_BROWSER_TEST === '1' ? false : undefined },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
