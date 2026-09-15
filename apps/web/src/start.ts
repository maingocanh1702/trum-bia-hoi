import { BrowserSave } from './browser-save';
import { boot, type BootSession } from './local';
import { RemoteGame } from './remote';
import { installVerifyBridge } from './verify/install';
export type RemoteSession = { remote: RemoteGame; game: RemoteGame; storage: null; original: null; error: null; legacy?: null };
export type Session = BootSession | RemoteSession;
export type StartState = { session: Session } | { local: string; legacy: string | null } | { error: string } | { reauth: RemoteGame };
async function startSession(mode?: 'local' | 'remote' | 'reauthenticate'): Promise<StartState> {
  if (mode === 'local' || import.meta.env.VITE_TBH_LOCAL === '1') return { session: await boot() };
  try {
    if (!mode && localStorage.getItem('tbh.remote.v1') === null) {
      const storage = await BrowserSave.open();
      try {
        const original = await storage.read(), legacy = localStorage.getItem('tbh.save.v1');
        if (original !== null || legacy !== null) return { local: original ?? legacy!, legacy };
      } catch (error) {
        // Reuse the established forensic download/import/reset flow; never replace a damaged archive.
        if (storage.recoveryText !== null) return { session: await boot() };
        throw error;
      } finally { storage.close(); }
    }
    const remote = await RemoteGame.open(mode === 'reauthenticate');
    if (remote.reauthenticating) return { reauth: remote };
    return { session: { remote, game: remote, storage: null, original: null, error: null } };
  } catch (error) { return { error: error instanceof Error ? error.message : 'network' }; }
}
export async function start(mode?: 'local' | 'remote' | 'reauthenticate'): Promise<StartState> {
  const state = await startSession(mode);
  // Written as a direct import.meta.env.<KEY> chain (not a destructured/aliased lookup) so Vite's
  // build-time literal replacement can constant-fold this to `false` in production, letting Rollup
  // tree-shake the call and the whole verify/bridge module graph out of the production bundle.
  if (import.meta.env.DEV || import.meta.env.VITE_TBH_VERIFY === '1') installVerifyBridge(state, true);
  return state;
}
