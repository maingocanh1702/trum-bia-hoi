import type { StartState } from '../start';
import { buildBridge, type VerifyBridge } from './bridge';

declare global {
  interface Window {
    __TBH_VERIFY__?: VerifyBridge;
  }
}

function verifyEnabled(): boolean {
  const env = (import.meta as unknown as { env?: { DEV?: boolean; VITE_TBH_VERIFY?: string } }).env;
  return Boolean(env?.DEV) || env?.VITE_TBH_VERIFY === '1';
}

/** Wires window.__TBH_VERIFY__ to the live session; no-op unless guarded env + a session is present. */
export function installVerifyBridge(state: StartState, enabled = verifyEnabled()): void {
  if (!enabled || !('session' in state)) return;
  window.__TBH_VERIFY__ = buildBridge(state.session);
}
