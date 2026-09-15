import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Resolved once at config-load time so a stale dev/preview server is detectable via version().
let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
const worktree = process.cwd();

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: { __TBH_COMMIT__: JSON.stringify(commit), __TBH_WORKTREE__: JSON.stringify(worktree) },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': { target: process.env.TBH_API_TARGET ?? 'http://127.0.0.1:5175', rewrite: path => path.replace(/^\/api/, '') } }, hmr: process.env.TBH_BROWSER_TEST === '1' ? false : undefined, ws: process.env.TBH_BROWSER_TEST === '1' ? false : undefined },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
