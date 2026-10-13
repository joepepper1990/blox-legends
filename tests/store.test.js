import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { Store } from '../src/data/store.js';
import { LocalSave, MIRROR_KEY, readMirror } from '../src/data/local-save.js';
import { V1_LOCAL_KEY } from '../src/data/migrate-v1.js';
import { createBackup, decodeBackup, restoreBackup } from '../src/data/backup.js';
import { DATA_SCHEMA } from '../src/version.js';

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
const v1Save = (extra = {}) => ({
  v: 1,
  name: 'Freddie',
  coins: 82,
  xp: 228,
  owned: ['shirt-blue', 'hat-none', 'trail-none', 'hat-cap'],
  look: { shirt: 'shirt-blue', hat: 'hat-cap', trail: 'trail-none' },
  learn: { skills: { 'm.bond10': { n: 14, c: 12 } }, recent: {} },
  best: { obby: 61000, vault: 0, lab: 0 },
  settings: { readAloud: true, dailyMin: 25, pin: '1234' },
  ...extra,
});
const v1Code = (o) => Buffer.from(JSON.stringify(o)).toString('base64');

test('a fresh iPad gets a device, a profile and an empty log', async () => {
  const e = env();
  const s = await Store.open(e);
  assert.equal(s.mode, 'idb');
  assert.match(s.deviceId, /^[0-9a-f-]{36}$/);
  assert.equal(s.meta.profile.mode, 'standalone');
  assert.equal(s.meta.counter.n, 0);
  assert.equal(s.meta.schema.v, DATA_SCHEMA);
  assert.equal(s.data.coins, 0);
  assert.deepEqual(await s.getOps(), []);
});

test('the v1 save on this iPad is brought over once and left in place', async () => {
  const e = env();
  e.storage.setItem(V1_LOCAL_KEY, JSON.stringify(v1Save()));
  const s = await Store.open(e);
  assert.equal(s.data.coins, 82);
  assert.ok(s.data.owned.includes('hat-cap'));
  assert.equal(s.data.learn.sk['m.bond10'].n, 14);
  assert.equal(s.data.settings.pin, undefined, 'plain PIN removed from the game data');
  assert.ok(s.hasPin());
  assert.equal(await s.verifyPin('1234'), true);
  assert.equal(await s.verifyPin('9999'), false);
  const ops = await s.getOps();
  assert.equal(ops.length, 1);
  assert.equal(ops[0].k, 'import.v1');
  assert.ok(e.storage.getItem(V1_LOCAL_KEY), 'v1 key untouched');

  // Next launch: no second import.
  const again = await Store.open(e);
  assert.equal(again.data.coins, 82);
  assert.equal((await again.getOps()).length, 1);
  assert.equal(again.deviceId, s.deviceId);
});

test('a damaged v1 save never stops the game opening', async () => {
  const e = env();
  e.storage.setItem(V1_LOCAL_KEY, '{not json');
  const s = await Store.open(e);
  assert.equal(s.mode, 'idb');
  assert.match(s.warning, /could not be read/);
  assert.equal(e.storage.getItem(V1_LOCAL_KEY), '{not json');
});

test('a run is logged as one op together with the game state', async () => {
  const e = env();
  const s = await Store.open(e);
  s.data.coins += 15;
  s.recordAttempt({ s: 'm.x3', c: 1, f: 1, ms: 2100, fp: 'aa', coins: 5 });
  s.recordAttempt({ s: 'm.x3', c: 0, f: 1, ms: 4100, fp: 'bb', coins: 0 });
  const op = await s.endRun('obby', { done: true, right: 1, total: 2 });
  assert.equal(op.n, 1);
  assert.equal(op.k, 'run');
  assert.equal(op.p.a.length, 2);
  assert.deepEqual(s.pending, []);
  assert.equal(await s.endRun('obby'), null, 'nothing to log twice');

  const reopened = await Store.open(e);
  assert.equal(reopened.data.coins, 15);
  assert.deepEqual(await reopened.frontier(), { [s.deviceId]: 1 });
});

test('concurrent appends get gap-free numbers', async () => {
  const s = await Store.open(env());
  const ops = await Promise.all(Array.from({ length: 25 }, (_, i) => s.appendOp('test', { i })));
  assert.deepEqual(
    ops.map((o) => o.n).sort((a, b) => a - b),
    Array.from({ length: 25 }, (_, i) => i + 1),
  );
  assert.equal(s.meta.counter.n, 25);
  assert.equal((await s.getOps()).length, 25);
});

test('importing the same old-game code twice is refused', async () => {
  const s = await Store.open(env());
  const code = v1Code(v1Save({ coins: 40 }));
  const sum = await s.importV1Code(code);
  assert.equal(sum.coins, 40);
  assert.equal(s.data.coins, 40);
  await assert.rejects(s.importV1Code(code), /already been imported/);
  await assert.rejects(s.importV1Code(` ${code}\n`), /already been imported/, 'whitespace makes no difference');
  assert.equal(s.data.coins, 40);
});

test('backup → restore on another iPad gives the same progress and a new device id', async () => {
  const a = await Store.open(env());
  a.data.name = 'Freddie';
  a.data.coins = 777;
  a.data.owned.push('hat-crown');
  a.recordAttempt({ s: 'v.code1', c: 1, f: 1, ms: 3000, fp: 'x1', coins: 5 });
  await a.endRun('vault', { done: true, right: 1, total: 1 });
  await a.importV1Code(v1Code(v1Save({ coins: 3 })));

  const { bytes, header } = await createBackup(a, { passphrase: 'pine cone' });
  assert.equal(header.summary.coins, 780);

  const b = await Store.open(env());
  b.data.coins = 5; // whatever was on the other iPad is replaced, never added
  const decoded = await decodeBackup(bytes, { passphrase: 'pine cone' });
  await restoreBackup(b, decoded);

  assert.equal(b.data.coins, 780);
  assert.ok(b.data.owned.includes('hat-crown'));
  assert.equal(b.profileId, a.profileId);
  assert.notEqual(b.deviceId, a.deviceId);
  assert.deepEqual(await b.getOps(), await a.getOps());
  assert.ok((await b.listSnapshots()).some((x) => x.id.startsWith('safety-')), 'safety snapshot saved first');

  // The same old-game code is still recognised as imported after restore.
  await assert.rejects(b.importV1Code(v1Code(v1Save({ coins: 3 }))), /already been imported/);

  // New ops on the restored iPad can't collide with the backup's ops.
  b.recordAttempt({ s: 'v.code1', c: 1, f: 1, ms: 2000, fp: 'x2', coins: 5 });
  const op = await b.endRun('vault');
  assert.equal(op.d, b.deviceId);
  assert.equal(op.n, 1);
  assert.equal((await b.getOps()).length, 3);

  // And the restore survives a reload.
  const b2 = await Store.open({ idb: b.db.idb, storage: b.storage });
  assert.equal(b2.data.coins, 780);
  assert.equal(b2.deviceId, b.deviceId);
});

test('merging learning ops never adds the same op twice', async () => {
  const s = await Store.open(env());
  const ops = [
    { d: 'other', n: 1, t: 1, k: 'run', v: 1, p: {} },
    { d: 'other', n: 2, t: 2, k: 'run', v: 1, p: {} },
  ];
  assert.equal(await s.mergeLearningOps(ops), 2);
  assert.equal(await s.mergeLearningOps(ops), 0);
  assert.equal((await s.getOps()).length, 2);
});

test('data from a newer app version is never overwritten', async () => {
  const e = env();
  const s = await Store.open(e);
  s.data.coins = 50;
  await s.write();
  await s.putMeta({ k: 'schema', v: DATA_SCHEMA + 1 });

  const old = await Store.open(e);
  assert.equal(old.readOnly, true);
  assert.match(old.warning, /newer version/);
  old.data.coins = 0;
  await old.write();
  assert.equal(await old.appendOp('run', {}), null);

  const check = await Store.open(e);
  assert.equal(check.data.coins, 50);
});

test('if IndexedDB fails, play continues and is adopted when it works again', async () => {
  const e = env();
  const s = await Store.open(e);
  s.data.coins = 100;
  await s.write();
  assert.equal(readMirror(e.storage).fallback, false);

  const broken = { open: () => { throw new Error('IndexedDB is broken'); } };
  const warn = console.warn;
  console.warn = () => {};
  const fb = await Store.open({ idb: broken, storage: e.storage });
  console.warn = warn;
  assert.ok(fb instanceof LocalSave);
  assert.equal(fb.data.coins, 100, 'starts from the latest state, not an old save');
  fb.data.coins = 160;
  await fb.endRun('obby');
  assert.equal(readMirror(e.storage).fallback, true);
  assert.equal(e.storage.getItem(V1_LOCAL_KEY), null, 'fallback never writes the v1 key');

  const back = await Store.open(e);
  assert.equal(back.mode, 'idb');
  assert.equal(back.data.coins, 160);
  assert.ok((await back.getOps()).some((o) => o.k === 'adopt.fallback'));
  assert.equal(readMirror(e.storage).fallback, false);

  // Adopted once only.
  const again = await Store.open(e);
  assert.equal((await again.getOps()).filter((o) => o.k === 'adopt.fallback').length, 1);
});

test('fallback store supports backup, restore and old-game import', async () => {
  const storage = new MemStorage();
  storage.setItem(V1_LOCAL_KEY, JSON.stringify(v1Save()));
  const fb = new LocalSave(storage);
  assert.equal(fb.data.coins, 82);
  assert.equal(fb.data.settings.pin, '1234', 'fallback keeps the v1 PIN in place');
  await assert.rejects(fb.importV1Code(v1Code(v1Save({ coins: 82 }))).then(() => fb.importV1Code(v1Code(v1Save({ coins: 82 })))), /already/);

  const { bytes } = await createBackup(fb);
  const target = await Store.open(env());
  await restoreBackup(target, await decodeBackup(bytes));
  assert.equal(target.data.coins, fb.data.coins);
  assert.equal(target.data.settings.pin, undefined, 'PIN never travels in a backup');
  assert.ok(storage.getItem(MIRROR_KEY));
});

test('daily snapshots are kept for 14 days', async () => {
  const s = await Store.open(env());
  for (let i = 0; i < 20; i++)
    await s.db.put('snapshots', { id: `day-2026-09-${String(i + 1).padStart(2, '0')}`, created: i, data: {} });
  await s.prune('day-', 14);
  const snaps = await s.listSnapshots();
  assert.equal(snaps.length, 14);
  assert.equal(snaps.at(-1).id, 'day-2026-09-07');
});
