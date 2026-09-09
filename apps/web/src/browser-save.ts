import { saveMetadata, type Game } from '../../../packages/engine/src';

// config-exempt: browser persistence schema and IO chunk size, not economy parameters.
const DATABASE = 'tbh.career.v1', VERSION = 1, CHUNK = 1000;
const STORES = ['head', 'commands', 'events', 'backups'];
type Head = { revision: number | string; metadata: ReturnType<typeof saveMetadata>; now: number; commands: number; events: number };
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
function complete(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? Error('storage:aborted')); });
}
function unpack(keys: IDBValidKey[], chunks: unknown[][], expected: number) {
  const rows: unknown[] = [];
  if (!Number.isSafeInteger(expected) || expected < 0) throw Error('storage:corrupt');
  chunks.forEach((chunk, i) => {
    if (keys[i] !== rows.length || !Array.isArray(chunk) || !chunk.length || chunk.length > CHUNK) throw Error('storage:corrupt');
    rows.push(...chunk);
  });
  if (rows.length !== expected) throw Error('storage:corrupt');
  return rows;
}

/** One loaded archive revision owns a writer. Other tabs must reload, never overwrite it. */
export class BrowserSave {
  private head: Head | null = null;
  private game: Game | null = null;
  private pending: Promise<void> | null = null;
  private again = false;
  private replacing = false;
  private legacy: string | null = null;
  recoveryText: string | null = null;
  private constructor(private db: IDBDatabase) { db.onversionchange = () => db.close(); }
  static async open() {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DATABASE, VERSION);
      let blocked = false;
      req.onupgradeneeded = () => { for (const name of STORES) req.result.createObjectStore(name); };
      req.onblocked = () => { blocked = true; reject(Error('storage:blocked')); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { if (blocked) req.result.close(); else resolve(req.result); };
    });
    return new BrowserSave(db);
  }
  close() { this.db.close(); }
  async read(): Promise<string | null> {
    if (this.game) throw Error('storage:writerAlreadyLoaded');
    const tx = this.db.transaction(['head', 'commands', 'events'], 'readonly'), done = complete(tx);
    const head = request<Head | undefined>(tx.objectStore('head').get('current'));
    const commands = request<unknown[][]>(tx.objectStore('commands').getAll()), commandKeys = request(tx.objectStore('commands').getAllKeys());
    const events = request<unknown[][]>(tx.objectStore('events').getAll()), eventKeys = request(tx.objectStore('events').getAllKeys());
    const [h, cs, ck, es, ek] = await Promise.all([head, commands, commandKeys, events, eventKeys, done]);
    this.head = h ?? null;
    try {
      if (h === undefined) { if (cs.length || es.length) throw Error('storage:corrupt'); return null; }
      if (!(typeof h.revision === 'number' && Number.isSafeInteger(h.revision) && h.revision > 0) && !(typeof h.revision === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(h.revision))) throw Error('storage:corrupt');
      return JSON.stringify({ ...h.metadata, log: unpack(ck, cs, h.commands), events: unpack(ek, es, h.events), now: h.now });
    } catch {
      // Keep all surviving raw rows before exposing recovery; this is forensic data, not a trusted game.
      this.recoveryText = JSON.stringify({ format: 'tbh.indexeddb-backup.v1', head: h ?? null, commandKeys: ck, commands: cs, eventKeys: ek, events: es });
      throw Error('storage:corrupt');
    }
  }
  migrateLegacy(text: string) { if (this.head) throw Error('storage:alreadyMigrated'); this.legacy = text; }
  get saving() { return this.pending !== null || this.replacing; }
  save(game: Game): Promise<void> {
    if (this.replacing) return Promise.reject(Error('storage:replacing'));
    if (this.recoveryText !== null) return Promise.reject(Error('storage:corrupt'));
    if (!this.game && this.head && (this.head.metadata.seed !== game.seed || this.head.metadata.createdAt !== game.createdAt || this.head.metadata.playerId !== game.playerId)) return Promise.reject(Error('storage:wrongGame'));
    if (this.game && this.game !== game) return Promise.reject(Error('storage:wrongGame'));
    this.game = game; this.again = true;
    if (!this.pending) this.pending = (async () => {
      try { while (this.again) { this.again = false; await this.commit(game); } }
      finally { this.pending = null; }
    })();
    return this.pending;
  }
  async replace(game: Game, original: string | null) {
    if (this.replacing) throw Error('storage:replacing');
    this.replacing = true;
    try { if (this.pending) await this.pending; await this.commit(game, true, original); this.game = game; }
    finally { this.replacing = false; }
  }
  private async commit(game: Game, replacing = false, backup: string | null = null) {
    const previous = this.head;
    const commandsFrom = replacing ? 0 : previous?.commands ?? 0, eventsFrom = replacing ? 0 : previous?.events ?? 0;
    if (game.log.length < commandsFrom || game.world.events.length < eventsFrom) throw Error('storage:historyTruncated');
    const next: Head = { revision: crypto.randomUUID(), metadata: saveMetadata(game), now: game.world.now, commands: game.log.length, events: game.world.events.length };
    const commands = game.log.slice(commandsFrom), events = game.world.events.slice(eventsFrom);
    // Copy only new immutable log/event rows; do not serialize the whole career for autosave.
    const tx = this.db.transaction(STORES, 'readwrite', { durability: 'strict' }), done = complete(tx);
    let failure: unknown;
    const check = tx.objectStore('head').get('current');
    check.onsuccess = () => {
      try {
        const unchanged = this.recoveryText !== null ? JSON.stringify(check.result ?? null) === JSON.stringify(previous) : (check.result?.revision ?? 0) === (previous?.revision ?? 0);
        if (!unchanged) throw Error('storage:conflict');
        if (replacing) { tx.objectStore('commands').clear(); tx.objectStore('events').clear(); }
        const original = replacing ? backup : this.legacy;
        if (original !== null) tx.objectStore('backups').add(original, crypto.randomUUID());
        for (let offset = 0; offset < commands.length; offset += CHUNK) tx.objectStore('commands').add(commands.slice(offset, offset + CHUNK), commandsFrom + offset);
        for (let offset = 0; offset < events.length; offset += CHUNK) tx.objectStore('events').add(events.slice(offset, offset + CHUNK), eventsFrom + offset);
        tx.objectStore('head').put(next, 'current');
      } catch (error) { failure = error; tx.abort(); }
    };
    try { await done; } catch (error) { throw failure ?? error; }
    this.head = next; this.legacy = null; this.recoveryText = null;
  }
}

/** Read-only export path, also used by browser checks; no game state or writer cursor is exposed. */
export async function readBrowserSave() {
  const store = await BrowserSave.open();
  try { return await store.read(); } finally { store.close(); }
}
