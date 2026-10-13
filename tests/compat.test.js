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
  for (const [id, r] of Object.entries(v1.learn.skills)) assert.equal(s.data.learn.sk[id]?.n, r.n, `learning record ${id} kept`);
  assert.deepEqual(s.data.learn.mig.legacy, v1.learn, 'the old records are kept as they were');
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
  for (const [id, r] of Object.entries(dump.state.data.learn.skills)) assert.equal(s.data.learn.sk[id]?.n, r.n, `learning record ${id} kept`);
  // upgraded once: a safety copy of the old data, and a baseline in the log
  const ops = await s.getOps();
  assert.equal(ops.length, m.ops + 1);
  const base = ops.find((o) => o.k === 'learn.baseline');
  assert.ok(base && base.p.upTo === Math.max(...dump.ops.map((o) => o.n)));
  const snaps = await s.listSnapshots();
  assert.ok(snaps.some((x) => x.id.startsWith('safety-upgrade-')));
  // opening again changes nothing
  s.db.db.close();
  const again = await Store.open(e);
  assert.equal((await again.getOps()).length, m.ops + 1);
  assert.deepEqual(again.data.learn, s.data.learn);
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
    const ops = await s.getOps();
    assert.equal(ops.length, manifest.r0.ops + 1, 'every op kept, plus the upgrade baseline');
    assert.equal(ops.filter((o) => o.k === 'learn.baseline').length, 1);
    assert.equal(Object.keys(s.data.learn.sk).length, manifest.r0.skills);
  });
}

test('after the upgrade, the log rebuilds the learning state exactly (baseline + new answers)', async () => {
  const { applyAttempt, dayOf } = await import('../src/learning/learner.js');
  const { makeRegistry } = await import('../src/learning/registry.js');
  const { rebuildLearn } = await import('../src/data/replay.js');
  const reg = makeRegistry();
  const { e } = await r0Device();
  const s = await Store.open(e);
  const t0 = Date.now();
  for (let i = 0; i < 12; i++) {
    const a = { t: t0 + i, d: dayOf(t0), s: i % 2 ? 'm.x2' : 's.count1', k: `k${i % 5}`, fp: `f${i}`, fpv: 2, fm: 'x', b: 2, m: 'logic-lock', n: 3, pu: i % 4 === 3 ? 'check' : 'learn', c: i % 3 ? 1 : 0, f: 1, u: 1, rg: 0 };
    s.data.learn = applyAttempt(s.data.learn, a, reg);
    s.recordAttempt(a, 'vault');
    if (i === 5) await s.write(); // part-way through the run
  }
  await s.endRun('vault', { done: true });
  assert.deepEqual(rebuildLearn(await s.getOps(), reg), s.data.learn);
});
