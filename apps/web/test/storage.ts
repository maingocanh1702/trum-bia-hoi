import { expect, type Page } from '@playwright/test';
export async function waitSaved(page: Page) { await expect(page.locator('.game-shell')).toHaveAttribute('data-save-state', 'saved'); }
export async function readSave(page: Page): Promise<string> {
  await waitSaved(page);
  return page.evaluate(async () => { const module = '/src/browser-save.ts'; const text = await (await import(module)).readBrowserSave(); if (text === null) throw Error('Missing committed save'); return text; });
}
export async function readBackups(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const open = indexedDB.open('tbh.career.v1'); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction('backups'), rows = tx.objectStore('backups').getAll(); rows.onsuccess = () => resolve(rows.result); rows.onerror = () => reject(rows.error); tx.oncomplete = () => db.close(); };
  }));
}
