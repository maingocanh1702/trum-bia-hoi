import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test.beforeEach(async ({ page }) => {
  // Same origin, without mounting the app or starting its autosave timer.
  await page.route('**/__storage-test', route => route.fulfill({ contentType: 'text/html', body: '<title>Storage test</title>' }));
  await page.goto('/__storage-test');
});

test('overlapping autosaves append only new history and publish the latest committed frontier', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/test/fixtures/browser-save.ts';
    const { BrowserSave, Game, encodeSave, readBrowserSave, decodeSave } = await import(path) as typeof import('./fixtures/browser-save');
    const store = await BrowserSave.open(); await store.read();
    const game = new Game(undefined, 42, Date.UTC(2026, 8, 9));
    const send = (active: boolean) => game.command({ at: game.world.now + 1000, idempotencyKey: `activity-${game.log.length}`, command: { type: 'activity', active } });
    send(true); await store.save(game);
    const before = { commands: game.log.length, events: game.world.events.length };
    const adds: { store: string; key: IDBValidKey | undefined; count: number }[] = [];
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) { adds.push({ store: this.name, key, count: value.length }); return add.call(this, value, key); };
    send(false); const first = store.save(game), saving = store.saving;
    send(true); const second = store.save(game);
    game.advance(game.world.now + 1000); const third = store.save(game);
    await Promise.all([first, second, third]); IDBObjectStore.prototype.add = add;
    const saved = await readBrowserSave(), exact = saved === encodeSave(game);
    const worldEqual = JSON.stringify(decodeSave(saved!).world) === JSON.stringify(game.world);
    store.close();
    return { samePromise: first === second && second === third, saving, finished: !store.saving, exact, worldEqual, before, adds, commands: game.log.length, events: game.world.events.length };
  });
  expect(result).toMatchObject({ samePromise: true, saving: true, finished: true, exact: true, worldEqual: true });
  for (const name of ['commands', 'events'] as const) {
    const rows = result.adds.filter(x => x.store === name);
    expect(rows.reduce((n, x) => n + x.count, 0)).toBe(result[name] - result.before[name]);
    expect(rows.every(x => Number(x.key) >= result.before[name])).toBe(true);
  }
});

test('an aborted write or replacement keeps the old archive and retry preserves every command', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/test/fixtures/browser-save.ts';
    const { BrowserSave, Game, encodeSave, readBrowserSave } = await import(path) as typeof import('./fixtures/browser-save');
    const store = await BrowserSave.open(); await store.read(); const game = new Game(undefined, 42);
    await store.save(game); const original = encodeSave(game);
    game.command({ at: game.world.now, idempotencyKey: 'start', command: { type: 'startShift' } });
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) { if (this.name === 'events') throw new DOMException('Injected disk failure', 'QuotaExceededError'); return add.call(this, value, key); };
    const error = await store.save(game).then(() => '', (e: Error) => e.name);
    const retained = await readBrowserSave() === original;
    IDBObjectStore.prototype.add = add; await store.save(game); const retried = await readBrowserSave() === encodeSave(game);
    const old = encodeSave(game), replacement = new Game(undefined, 99);
    replacement.command({ at: replacement.world.now, idempotencyKey: 'replacement-start', command: { type: 'startShift' } });
    IDBObjectStore.prototype.add = function(value, key) { if (this.name === 'events') throw new DOMException('Injected replacement failure', 'QuotaExceededError'); return add.call(this, value, key); };
    const replaceError = await store.replace(replacement, old).then(() => '', (e: Error) => e.name);
    const replaceRetained = await readBrowserSave() === old;
    IDBObjectStore.prototype.add = add;
    const backups = () => new Promise<string[]>(resolve => { const req = indexedDB.open('tbh.career.v1'); req.onsuccess = () => { const db = req.result, tx = db.transaction('backups'), rows = tx.objectStore('backups').getAll(); rows.onsuccess = () => resolve(rows.result); tx.oncomplete = () => db.close(); }; });
    const abortedBackups = await backups(); await store.replace(replacement, old);
    const replaced = await readBrowserSave() === encodeSave(replacement), committedBackups = await backups(); store.close();
    return { error, retained, retried, replaceError, replaceRetained, abortedBackups: abortedBackups.length, replaced, backupExact: committedBackups.length === 1 && committedBackups[0] === old };
  });
  expect(result).toEqual({ error: 'QuotaExceededError', retained: true, retried: true, replaceError: 'QuotaExceededError', replaceRetained: true, abortedBackups: 0, replaced: true, backupExact: true });
});

test('two loaded revisions cannot overwrite each other and damaged chunks fail closed', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/test/fixtures/browser-save.ts';
    const { BrowserSave, Game, encodeSave, decodeSave, readBrowserSave } = await import(path) as typeof import('./fixtures/browser-save');
    const a = await BrowserSave.open(); await a.read(); const game = new Game(undefined, 42); await a.save(game);
    const b = await BrowserSave.open(), copy = decodeSave((await b.read())!);
    game.command({ at: game.world.now, idempotencyKey: 'a', command: { type: 'startShift' } }); await a.save(game);
    copy.command({ at: copy.world.now, idempotencyKey: 'b', command: { type: 'activity', active: false } });
    const conflict = await b.save(copy).then(() => '', (e: Error) => e.message), retained = await readBrowserSave() === encodeSave(game);
    a.close(); b.close();
    await new Promise<void>((resolve, reject) => { const req = indexedDB.open('tbh.career.v1'); req.onsuccess = () => { const db = req.result, tx = db.transaction('events', 'readwrite'); tx.objectStore('events').delete(0); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); }; });
    const damaged = await readBrowserSave().then(() => '', (e: Error) => e.message);
    return { conflict, retained, damaged };
  });
  expect(result).toEqual({ conflict: 'storage:conflict', retained: true, damaged: 'storage:corrupt' });
});

test('unavailable storage never boots a fresh playable game over the old save', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tbh.save.v1', 'preserve-this-original');
    Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Chưa mở được dữ liệu');
  await expect(page.locator('.game-shell')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('tbh.save.v1'))).toBe('preserve-this-original');
});

test('a real three-day career larger than localStorage survives IndexedDB close and reopen exactly', async ({ page }) => {
  test.setTimeout(120000);
  const save = execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/browser-career-save.ts'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  expect(Buffer.byteLength(save)).toBeGreaterThan(5 * 1024 * 1024);
  await page.route('**/__career.json', route => route.fulfill({ contentType: 'application/json', body: save }));
  const result = await page.evaluate(async () => {
    const path = '/test/fixtures/browser-save.ts';
    const { BrowserSave, decodeSave, encodeSave, readBrowserSave } = await import(path) as typeof import('./fixtures/browser-save');
    const source = await (await fetch('/__career.json')).text(), game = decodeSave(source);
    const store = await BrowserSave.open(); await store.read(); await store.save(game); store.close();
    const persisted = await readBrowserSave(), fresh = await BrowserSave.open(); await fresh.read();
    game.command({ at: game.world.now, idempotencyKey: 'after-reopen', command: { type: 'activity', active: false } });
    await fresh.save(game); const continued = await readBrowserSave(); fresh.close();
    return { exact: persisted === source, continued: continued === encodeSave(game), commands: game.log.length, events: game.world.events.length, shifts: game.world.completedShifts };
  });
  expect(result).toMatchObject({ exact: true, continued: true, shifts: 24 });
});
