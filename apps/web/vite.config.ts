import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': { target: process.env.TBH_API_TARGET ?? 'http://127.0.0.1:5175', rewrite: path => path.replace(/^\/api/, '') } }, hmr: process.env.TBH_BROWSER_TEST === '1' ? false : undefined, ws: process.env.TBH_BROWSER_TEST === '1' ? false : undefined },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
