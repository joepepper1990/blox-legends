// Compatibility with data written by earlier versions. The fixtures in
// tests/fixtures/r0/ were written by the real v1/R0 code (tools/fixtures/
// make-r0.mjs) and are never regenerated, so these tests prove every later
// version can still read them without losing progress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDBFactory } from 'fake-indexeddb';
import { Store } from '../src/data/store.js';
import { DB } from '../src/data/db.js';
import { decodeBackup, restoreBackup, readEnvelope } from '../src/data/backup.js';
import { V1_LOCAL_KEY } from '../src/data/migrate-v1.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'r0');
const fixture = (name) => readFileSync(join(dir, name));
const manifest = JSON.parse(fixture('manifest.json'));

class MemStorage {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
  removeItem(k) {
    this.m.delete(k);
  }
}
const env = () => ({ idb: new IDBFactory(), storage: new MemStorage() });

// Rebuild an iPad's IndexedDB exactly as the R0 app left it.
async function r0Device() {
  const e = env();
  const dump = JSON.parse(fixture('r0-idb.json'));
  const db = new DB(e.idb);
  await db.open();
  await db.tx(['meta', 'state', 'ops'], 'readwrite', (t) => {
    for (const m of dump.meta) t.objectStore('meta').put(m);
    t.objectStore('state').put(dump.state);
    for (const o of dump.ops) t.objectStore('ops').put(o);
  });
  db.db.close();
  return { e, dump };
}

test('a v1 save on the iPad is migrated with nothing lost', async () => {
  const e = env();
  const v1 = JSON.parse(fixture('v1-save.json'));
  e.storage.setItem(V1_LOCAL_KEY, JSON.stringify(v1));
  const s = await Store.open(e);
  assert.equal(s.data.coins, manifest.v1Save.coins);
  assert.equal(s.data.xp, manifest.v1Save.xp);
  assert.deepEqual(s.data.owned, v1.owned);
  assert.deepEqual(s.data.look, v1.look);
  assert.deepEqual(s.data.best, v1.best);
  assert.equal(s.data.totals.answered, v1.totals.answered);
  assert.equal(s.data.history.length >= v1.history.length, true);
  assert.equal(s.data.settings.dailyMin, 30, "the parent's daily limit carries over");
  assert.equal(await s.verifyPin(manifest.v1Save.pin), true);
  for (const id of Object.keys(v1.learn.skills)) assert.ok(s.data.learn.skills[id], `learning record ${id} kept`);
  assert.equal(e.storage.getItem(V1_LOCAL_KEY), JSON.stringify(v1), 'v1 save left untouched');
});

test('a v1 backup code is imported once', async () => {
  const s = await Store.open(env());
  const code = fixture('v1-code.txt').toString();
  const sum = await s.importV1Code(code);
  assert.equal(sum.coins, manifest.v1Code.coins);
  assert.equal(s.data.coins, manifest.v1Code.coins);
  assert.ok(s.data.owned.includes('hat-crown'));
  await assert.rejects(s.importV1Code(code), /already/);
});

test('an R0 iPad opens with all its progress, log and identity', async () => {
  const { e, dump } = await r0Device();
  const s = await Store.open(e);
  const m = manifest.r0;
  assert.equal(s.data.coins, m.coins);
  assert.equal(s.data.xp, m.xp);
  assert.equal(s.data.name, m.name);
  assert.equal(s.data.owned.length, m.owned);
  assert.equal(s.profileId, m.profile);
  assert.equal(s.deviceId, m.device);
  for (const id of Object.keys(dump.state.data.learn.skills)) assert.ok(s.data.learn.skills[id], `learning record ${id} kept`);
  const ops = await s.getOps();
  assert.equal(ops.length, m.ops);
  // The log continues without a gap or a clash.
  s.recordAttempt({ s: 'm.x5', c: 1, f: 1, ms: 2000, fp: 'x', coins: 5 });
  const op = await s.endRun('obby');
  assert.equal(op.n, Math.max(...ops.map((o) => o.n)) + 1);
});

for (const [file, passphrase] of [['r0-plain.bloxbak', undefined], ['r0-pass.bloxbak', manifest.passphrase]]) {
  test(`an R0 backup file (${file}) restores completely`, async () => {
    const bytes = new Uint8Array(fixture(file));
    const env0 = await readEnvelope(bytes);
    assert.equal(env0.summary.coins, manifest.r0.coins, 'preview shows the right coins');
    if (passphrase) await assert.rejects(decodeBackup(bytes, { passphrase: 'wrong' }), /Wrong passphrase/);
    const decoded = await decodeBackup(bytes, { passphrase });
    const s = await Store.open(env());
    await restoreBackup(s, decoded);
    assert.equal(s.data.coins, manifest.r0.coins);
    assert.equal(s.data.xp, manifest.r0.xp);
    assert.equal(s.data.owned.length, manifest.r0.owned);
    assert.equal(s.profileId, manifest.r0.profile);
    assert.notEqual(s.deviceId, manifest.r0.device, 'restored iPad gets its own device id');
    assert.equal((await s.getOps()).length, manifest.r0.ops);
    assert.equal(Object.keys(s.data.learn.skills).length, manifest.r0.skills);
  });
}
