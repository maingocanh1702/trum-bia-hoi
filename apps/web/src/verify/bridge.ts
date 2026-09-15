import { snapshot as engineSnapshot, type Snapshot, type DomainEvent, type WorldView } from '../../../../packages/engine/src';
import type { Connection } from '../remote';
import { readSettings, type Settings } from '../local';
import type { Session } from '../start';

declare const __TBH_COMMIT__: string;
declare const __TBH_WORKTREE__: string;

export type VerifySnapshot = Snapshot | (WorldView & { events: DomainEvent[] });
export type VerifyJournal = { nextSeq: number; pending: unknown[]; cursor: number } | null;
export interface VerifyVersion {
  schema: 1;
  commit: string;
  worktree: string;
  mode: 'local' | 'remote';
  startedAt: number;
  configVersion: string;
}

export interface VerifyBridge {
  version(): VerifyVersion;
  snapshot(): VerifySnapshot;
  events(since?: number): DomainEvent[];
  connection(): 'local' | Connection;
  journal(): VerifyJournal;
  settings(): Settings;
}

type RemoteSession = Extract<Session, { remote: unknown }>;
/** RemoteGame.journal is private; this is the narrowest read-only shape the bridge needs off it. */
type RemoteJournalHolder = { journal: VerifyJournal };

function isRemoteSession(session: Session): session is RemoteSession {
  return 'remote' in session;
}

/** Read-only runtime introspection for browser-driving tests/agents; never mutates game state. */
export function buildBridge(session: Session): Readonly<VerifyBridge> {
  const startedAt = Date.now();
  const remote = isRemoteSession(session);
  const bridge: VerifyBridge = {
    version: () => ({
      schema: 1,
      commit: typeof __TBH_COMMIT__ === 'string' ? __TBH_COMMIT__ : 'unknown',
      worktree: typeof __TBH_WORKTREE__ === 'string' ? __TBH_WORKTREE__ : 'unknown',
      mode: remote ? 'remote' : 'local',
      startedAt,
      configVersion: remote ? session.remote.config.version : session.game.config.version,
    }),
    snapshot: () => (remote ? session.remote.world : engineSnapshot(session.game)),
    events: (since = 0) => session.game.world.events.slice(since),
    connection: () => (remote ? session.remote.state : 'local'),
    journal: () => {
      if (!remote) return null;
      const journal = (session.remote as unknown as RemoteJournalHolder).journal;
      return journal ? { nextSeq: journal.nextSeq, pending: journal.pending, cursor: journal.cursor } : null;
    },
    settings: () => readSettings(),
  };
  return Object.freeze(bridge);
}
