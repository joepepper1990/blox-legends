// The game's save store (Standalone mode): IndexedDB is the primary store.
// It keeps the same small API the game already uses (data, dirty, write,
// rollDay) and adds an append-only learning log, daily snapshots, v1 import
// and a salted PIN hash kept only on this iPad.
//
// Standalone mode = this iPad is the single authority for the economy. When
// cloud sync arrives, one iPad's standalone economy is contributed once
// (plan §19.2), so there are never two authorities.

import { DB } from './db.js';
import { defaults, mergeDeep, rollDayData, today } from '../save.js';
import { LocalSave, readMirror, writeMirror } from './local-save.js';
import { V1_LOCAL_KEY, parseV1Code, mergeV1, v1Summary } from './migrate-v1.js';
import { sha256Hex } from './crypto.js';
import { APP_VERSION, DATA_SCHEMA } from '../version.js';

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const DAILY_SNAPSHOTS = 14;
const SAFETY_SNAPSHOTS = 5;

export class Store {
  // Open the IndexedDB store, or fall back to v1's localStorage store.
  static async open({ idb = globalThis.indexedDB, storage = globalThis.localStorage } = {}) {
    const store = new Store(new DB(idb), storage);
    try {
      await store.load();
      return store;
    } catch (e) {
      console.warn('IndexedDB unavailable, using localStorage fallback', e);
      const local = new LocalSave(storage);
      local.warning = 'Saving in basic mode on this iPad. Backups still work.';
      return local;
    }
  }

  constructor(db, storage) {
    this.mode = 'idb';
    this.db = db;
    this.storage = storage;
    this.data = defaults();
    this.dirty = false;
    this.pending = []; // attempts in the current run, not yet logged
    this.chain = Promise.resolve(); // serialises writes
    this.meta = {};
    this.readOnly = false;
    this.persisted = false;
    this.lastSnapshotDay = '';
  }

  async load() {
    await this.db.open();
    const metas = await this.db.getAll('meta');
    for (const m of metas) this.meta[m.k] = m;
    const schema = this.meta.schema?.v || 0;
    if (schema > DATA_SCHEMA) {
      // Data written by a newer app version: never overwrite it.
      this.readOnly = true;
      this.warning = 'This iPad has data from a newer version of the game. Please update.';
    }
    if (!this.meta.device) await this.putMeta({ k: 'device', id: uuid(), created: Date.now() });
    if (!this.meta.profile) await this.putMeta({ k: 'profile', id: uuid(), created: Date.now(), mode: 'standalone' });
    if (!this.meta.counter) await this.putMeta({ k: 'counter', n: 0 });
    if (!this.meta.migrations) await this.putMeta({ k: 'migrations', keys: [] });
    if (!this.readOnly && schema < DATA_SCHEMA) await this.putMeta({ k: 'schema', v: DATA_SCHEMA, app: APP_VERSION });

    const state = await this.db.get('state', 'game');
    const mirror = readMirror(this.storage);
    if (!this.readOnly && mirror?.fallback && mirror.savedAt >= (state?.updatedAt || 0)) {
      await this.adoptFallback(mirror);
    } else if (state?.data) {
      this.data = mergeDeep(defaults(), state.data);
    } else {
      await this.migrateLocalV1();
    }
    await this.adoptPlainPin();
    this.mirror(state?.updatedAt || Date.now());
    this.rollDay();
    const snaps = await this.db.getAll('snapshots');
    this.lastSnapshotDay = snaps.filter((s) => s.id.startsWith('day-')).map((s) => s.id.slice(4)).sort().pop() || '';
    try {
      this.persisted = (await navigator.storage?.persisted?.()) || false;
    } catch {
      /* not supported */
    }
  }

  get deviceId() {
    return this.meta.device.id;
  }
  get profileId() {
    return this.meta.profile.id;
  }

  async putMeta(m) {
    this.meta[m.k] = m;
    await this.db.put('meta', m);
  }

  // First run on this origin: bring over a v1 save if one exists. The v1 key
  // is left untouched so nothing is ever lost.
  async migrateLocalV1() {
    let raw = null;
    try {
      raw = this.storage?.getItem(V1_LOCAL_KEY);
    } catch {
      /* blocked */
    }
    if (!raw || this.meta.migrations.keys.includes('v1:local')) {
      this.dirty = true;
      return;
    }
    let v1;
    try {
      v1 = JSON.parse(raw);
    } catch {
      this.warning = 'The old save on this iPad could not be read. Use "Progress from the old game" to bring it over.';
      this.dirty = true;
      return;
    }
    await this.applyV1(v1, 'v1:local');
  }

  // Progress played while IndexedDB couldn't be opened (see local-save.js).
  // It's a newer copy of the whole state, so it replaces, never adds.
  async adoptFallback(mirror) {
    this.data = mergeDeep(defaults(), mirror.data);
    const keys = [...new Set([...this.meta.migrations.keys, ...(mirror.migrations || [])])];
    await this.appendOp('adopt.fallback', { savedAt: mirror.savedAt }, {
      withState: true,
      metas: [{ k: 'migrations', keys }],
    });
  }

  // Keep a copy of the latest state in localStorage. If IndexedDB ever fails
  // to open, the fallback store starts from this instead of an old save.
  mirror(savedAt) {
    writeMirror(this.storage, { savedAt, fallback: false, data: this.data, migrations: this.meta.migrations.keys });
  }

  async applyV1(v1, key) {
    if (this.meta.migrations.keys.includes(key)) throw new Error('This progress has already been imported.');
    const plainPin = v1.settings?.pin;
    // The PIN hash is worked out first so it's saved in the same transaction
    // as the import: a crash can't leave the progress without its PIN.
    const pin = plainPin && !this.meta.pin ? await pinMeta(plainPin) : null;
    this.data = mergeV1(this.data, v1);
    await this.appendOp('import.v1', { key, ...v1Summary(v1) }, {
      withState: true,
      metas: [{ k: 'migrations', keys: [...this.meta.migrations.keys, key] }, ...(pin ? [pin] : [])],
    });
  }

  // Import progress from the old game's grown-ups "backup code".
  async importV1Code(code) {
    const v1 = parseV1Code(code);
    const key = `v1:${(await sha256Hex(String(code).trim())).slice(0, 16)}`;
    await this.applyV1(v1, key);
    return v1Summary(v1);
  }

  // v1 kept the PIN in plain text inside the game data. Move it to a salted
  // hash on this iPad only.
  async adoptPlainPin() {
    const pin = this.data.settings?.pin;
    if (pin === undefined) return;
    delete this.data.settings.pin;
    if (pin && !this.meta.pin) await this.setPin(pin);
    this.dirty = true;
  }

  rollDay() {
    if (rollDayData(this.data)) this.dirty = true;
  }

  // Append one op to the learning log. The counter, the op and (optionally)
  // the game state are written in ONE transaction, so a crash can never leave
  // a gap or a half-saved run.
  async appendOp(kind, payload, { withState = false, metas = [] } = {}) {
    if (this.readOnly) return null;
    const run = async () => {
      const t0 = Date.now();
      let written = null;
      // Appends are serialised through this.chain, so the in-memory counter is
      // exact; all requests are issued synchronously (Safari-safe transactions).
      const n = (this.meta.counter?.n || 0) + 1;
      written = { d: this.deviceId, n, t: t0, k: kind, v: 1, p: payload };
      const state = withState ? { k: 'game', data: this.snapshotData(), updatedAt: t0 } : null;
      await this.db.tx(['meta', 'ops', 'state'], 'readwrite', (t) => {
        const metaStore = t.objectStore('meta');
        t.objectStore('ops').put(written);
        metaStore.put({ k: 'counter', n });
        for (const m of metas) metaStore.put(m);
        if (state) t.objectStore('state').put(state);
      });
      this.meta.counter = { k: 'counter', n: written.n };
      for (const m of metas) this.meta[m.k] = m;
      if (withState) {
        this.dirty = false;
        this.mirror(t0);
      }
      return written;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => {});
    return p;
  }

  snapshotData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  // Save the current game state.
  write() {
    if (this.readOnly) return Promise.resolve();
    const run = async () => {
      const t0 = Date.now();
      await this.db.put('state', { k: 'game', data: this.snapshotData(), updatedAt: t0 });
      this.dirty = false;
      this.mirror(t0);
      await this.dailySnapshot();
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch((e) => console.warn('save failed', e));
    return p;
  }

  // ---- learning log ----
  recordAttempt(a) {
    this.pending.push({ ...a, t: Date.now() });
  }

  // Close the current run: log its attempts as one op, together with the state.
  async endRun(world, summary = null) {
    if (!this.pending.length && !summary) return null;
    const attempts = this.pending;
    this.pending = [];
    return this.appendOp('run', { w: world, a: attempts, s: summary }, { withState: true });
  }

  async getOps() {
    return this.db.getAll('ops');
  }

  // Highest op number seen from each device (used by backups and later sync).
  async frontier() {
    const out = {};
    for (const o of await this.getOps()) out[o.d] = Math.max(out[o.d] || 0, o.n);
    return out;
  }

  // ---- snapshots ----
  async dailySnapshot() {
    const day = today();
    if (this.lastSnapshotDay === day) return;
    this.lastSnapshotDay = day;
    await this.db.put('snapshots', { id: `day-${day}`, created: Date.now(), data: this.snapshotData() });
    await this.prune('day-', DAILY_SNAPSHOTS);
  }

  async saveSafetySnapshot(bytes) {
    await this.db.put('snapshots', { id: `safety-${new Date().toISOString()}`, created: Date.now(), bytes });
    await this.prune('safety-', SAFETY_SNAPSHOTS);
  }

  async listSnapshots() {
    return (await this.db.getAll('snapshots'))
      .map((s) => ({ id: s.id, created: s.created }))
      .sort((a, b) => b.created - a.created);
  }

  async prune(prefix, keep) {
    const all = (await this.db.getAll('snapshots')).filter((s) => s.id.startsWith(prefix)).sort((a, b) => b.created - a.created);
    for (const s of all.slice(keep)) await this.db.delete('snapshots', s.id);
  }

  // ---- restore (Standalone mode: replace everything, never add) ----
  // The backup's learning ops are kept exactly; this iPad gets a NEW device id
  // so its future ops can never collide with ops already in the backup.
  replaceAll(args) {
    const run = () => this.replaceAllNow(args);
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => {});
    return p;
  }

  async replaceAllNow({ data, ops, migrations, profile }) {
    const t0 = Date.now();
    const newDevice = { k: 'device', id: uuid(), created: Date.now(), restoredFrom: this.deviceId };
    await this.db.tx(['meta', 'ops', 'state'], 'readwrite', (t) => {
      const opsStore = t.objectStore('ops');
      opsStore.clear();
      for (const o of ops) opsStore.put(o);
      const meta = t.objectStore('meta');
      meta.put(newDevice);
      meta.put({ k: 'counter', n: 0 });
      meta.put({ k: 'migrations', keys: migrations || [] });
      if (profile?.id) meta.put({ k: 'profile', id: profile.id, created: profile.created || Date.now(), mode: 'standalone' });
      t.objectStore('state').put({ k: 'game', data, updatedAt: t0 });
    });
    this.data = mergeDeep(defaults(), data);
    this.meta.device = newDevice;
    this.meta.counter = { k: 'counter', n: 0 };
    this.meta.migrations = { k: 'migrations', keys: migrations || [] };
    if (profile?.id) this.meta.profile = { k: 'profile', id: profile.id, created: profile.created, mode: 'standalone' };
    this.pending = [];
    this.dirty = false;
    this.mirror(t0);
  }

  // Merge another device's learning ops without touching the economy.
  // Ops are keyed (device, n) and immutable, so re-adding one changes nothing.
  async mergeLearningOps(ops) {
    const have = new Set((await this.getOps()).map((o) => `${o.d}:${o.n}`));
    const fresh = ops.filter((o) => !have.has(`${o.d}:${o.n}`));
    if (fresh.length)
      await this.db.tx(['ops'], 'readwrite', (t) => {
        const s = t.objectStore('ops');
        for (const o of fresh) s.put(o);
      });
    return fresh.length;
  }

  // Reset progress: keeps settings and name; the log keeps a "reset" marker.
  async reset() {
    const keep = { settings: this.data.settings, name: this.data.name };
    this.data = mergeDeep(defaults(), keep);
    await this.appendOp('reset', {}, { withState: true });
  }

  // ---- PIN (hashed, this iPad only) ----
  hasPin() {
    return !!this.meta.pin;
  }
  async setPin(pin) {
    await this.putMeta(await pinMeta(pin));
  }
  async verifyPin(pin) {
    if (!this.meta.pin) return false;
    const hash = await pinHash(pin, new Uint8Array(this.meta.pin.salt), this.meta.pin.iter);
    return hash === this.meta.pin.hash;
  }
  async clearPin() {
    delete this.meta.pin;
    await this.db.delete('meta', 'pin');
  }

  async requestPersist() {
    try {
      if (navigator.storage?.persist) this.persisted = await navigator.storage.persist();
    } catch {
      /* ignore */
    }
    return this.persisted;
  }
}

const PIN_ITER = 100000;
async function pinMeta(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { k: 'pin', hash: await pinHash(pin, salt), salt: Array.from(salt), iter: PIN_ITER };
}
async function pinHash(pin, salt, iter = PIN_ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}
