// Minimal IndexedDB wrapper. iPadOS can drop the database connection when the
// app is suspended ("connection is closing"), so every call reopens and
// retries once instead of failing.

export const DB_NAME = 'blox-legends';
export const DB_VERSION = 1;

// Stores:
//   meta      { k, ... }            device id, op counter, migrations, PIN hash
//   state     { k:'game', data }    the current game state (Standalone mode authority)
//   ops       { d, n, t, k, v, p }  append-only learning log, keyed [device, n]
//   snapshots { id, created, ... }  daily + safety snapshots
function upgrade(db) {
  if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
  if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'k' });
  if (!db.objectStoreNames.contains('ops')) db.createObjectStore('ops', { keyPath: ['d', 'n'] });
  if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
}

const req = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

export class DB {
  constructor(idb = globalThis.indexedDB, name = DB_NAME) {
    this.idb = idb;
    this.name = name;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    if (!this.idb) throw new Error('IndexedDB unavailable');
    const r = this.idb.open(this.name, DB_VERSION);
    r.onupgradeneeded = () => upgrade(r.result);
    this.db = await new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
    });
    this.db.onversionchange = () => {
      this.db.close();
      this.db = null;
    };
    this.db.onclose = () => (this.db = null);
    return this.db;
  }

  // Run fn(tx) inside one transaction; resolves when the transaction commits.
  async tx(stores, mode, fn) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const db = await this.open();
        const t = db.transaction(stores, mode);
        const done = new Promise((resolve, reject) => {
          t.oncomplete = () => resolve();
          t.onabort = () => reject(t.error || new Error('Transaction aborted'));
          t.onerror = () => reject(t.error);
        });
        done.catch(() => {}); // handled below; avoids an unhandled rejection if fn throws
        const result = await fn(t);
        await done;
        return result;
      } catch (e) {
        const lost = e && /closing|closed|InvalidState|connection/i.test(`${e.name} ${e.message}`);
        if (attempt === 0 && lost) {
          this.db = null; // reopen and retry once
          continue;
        }
        throw e;
      }
    }
    return undefined;
  }

  get(store, key) {
    return this.tx([store], 'readonly', (t) => req(t.objectStore(store).get(key)));
  }
  getAll(store) {
    return this.tx([store], 'readonly', (t) => req(t.objectStore(store).getAll()));
  }
  count(store) {
    return this.tx([store], 'readonly', (t) => req(t.objectStore(store).count()));
  }
  put(store, value) {
    return this.tx([store], 'readwrite', (t) => req(t.objectStore(store).put(value)));
  }
  delete(store, key) {
    return this.tx([store], 'readwrite', (t) => req(t.objectStore(store).delete(key)));
  }
}

export { req };
