// Fallback store for when IndexedDB can't be opened. It offers the same API
// as Store, so backups, restore and v1 import still work.
//
// It saves to its own "mirror" key and never writes to the v1 save. It
// starts from the newest copy it can find: the mirror (kept up to date by the
// IndexedDB store), otherwise the v1 save. Anything played here is marked
// `fallback: true` and adopted by the IndexedDB store the next time it opens.
import { defaults, mergeDeep, rollDayData } from '../save.js';
import { V1_LOCAL_KEY, parseV1Code, mergeV1, v1Summary } from './migrate-v1.js';
import { sha256Hex } from './crypto.js';

export const MIRROR_KEY = 'blox-legends-mirror';

export function readMirror(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(MIRROR_KEY);
    const m = raw && JSON.parse(raw);
    return m && m.data ? m : null;
  } catch {
    return null;
  }
}

export function writeMirror(storage, mirror) {
  try {
    storage?.setItem(MIRROR_KEY, JSON.stringify(mirror));
    return true;
  } catch {
    return false; // full or blocked: IndexedDB is still the real save
  }
}

export class LocalSave {
  constructor(storage = globalThis.localStorage) {
    this.mode = 'local';
    this.storage = storage;
    this.data = defaults();
    this.pending = [];
    this.meta = { migrations: { keys: [] }, profile: { id: 'local', created: Date.now() } };
    const mirror = readMirror(storage);
    if (mirror) {
      this.data = mergeDeep(defaults(), mirror.data);
      this.meta.migrations.keys = mirror.migrations || [];
    } else {
      try {
        const raw = storage?.getItem(V1_LOCAL_KEY);
        if (raw) {
          const v1 = JSON.parse(raw);
          this.data = mergeV1(this.data, v1);
          if (v1.settings?.pin) this.data.settings.pin = v1.settings.pin;
          this.meta.migrations.keys = ['v1:local'];
        }
      } catch {
        /* blocked storage or damaged v1 save: start fresh, v1 key untouched */
      }
    }
    // The PIN stays in plain text here, as in v1; the IndexedDB store moves it
    // to a salted hash when it adopts this save.
    this.rollDay();
    this.dirty = false;
  }
  get deviceId() {
    return 'local';
  }
  get profileId() {
    return this.meta.profile.id;
  }
  rollDay() {
    if (rollDayData(this.data)) this.dirty = true;
  }
  snapshotData() {
    return JSON.parse(JSON.stringify(this.data));
  }
  write() {
    const ok = writeMirror(this.storage, {
      savedAt: Date.now(),
      fallback: true,
      data: this.snapshotData(),
      migrations: this.meta.migrations.keys,
    });
    if (ok) this.dirty = false;
    return Promise.resolve();
  }
  recordAttempt() {}
  endRun() {
    this.pending = [];
    return this.write();
  }
  getOps() {
    return Promise.resolve([]);
  }
  listSnapshots() {
    return Promise.resolve([]);
  }
  saveSafetySnapshot() {
    return Promise.resolve();
  }
  async replaceAll({ data, migrations }) {
    this.data = mergeDeep(defaults(), data);
    this.meta.migrations.keys = migrations || [];
    await this.write();
  }
  async importV1Code(code) {
    const v1 = parseV1Code(code);
    const key = `v1:${(await sha256Hex(String(code).trim())).slice(0, 16)}`;
    if (this.meta.migrations.keys.includes(key)) throw new Error('This progress has already been imported.');
    const pin = this.data.settings.pin;
    this.data = mergeV1(this.data, v1);
    if (pin) this.data.settings.pin = pin;
    this.meta.migrations.keys.push(key);
    await this.write();
    return v1Summary(v1);
  }
  async reset() {
    const keep = { settings: this.data.settings, name: this.data.name };
    this.data = mergeDeep(defaults(), keep);
    await this.write();
  }
  requestPersist() {
    return Promise.resolve(false);
  }
}
