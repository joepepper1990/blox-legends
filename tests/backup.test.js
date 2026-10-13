import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSections, joinSections, encodeBackup, decodeBackup, readEnvelope, canonical, summarize, BACKUP_FV } from '../src/data/backup.js';
import { defaults, mergeDeep } from '../src/save.js';
import { mergeV1, parseV1Code, isFresh } from '../src/data/migrate-v1.js';
import { freshSkill } from '../src/learning/learner.js';

function sampleData() {
  const d = defaults();
  d.name = 'Freddie';
  d.coins = 1234;
  d.xp = 560;
  d.owned.push('hat-cap', 'shirt-red');
  d.look.hat = 'hat-cap';
  d.learn.sk['m.x3'] = { ...freshSkill(), n: 12, c: 10, pf: 10, ms: { intro: 20000, prac: 20001 } };
  d.best.obby = 64000;
  d.totals = { ms: 3600000, answered: 300, correct: 250, runs: 30 };
  d.history = [{ date: '2026-10-12', ms: 900000, answered: 80, correct: 70 }];
  d.settings = { readAloud: true, dailyMin: 30, pin: '1234' };
  d.futureField = { pets: [{ species: 'pebble-pup', tier: 2 }] }; // a field this version doesn't know
  return d;
}
const sampleOps = () => [
  { d: 'dev-a', n: 1, t: 1, k: 'run', v: 1, p: { w: 'obby', a: [{ s: 'm.x3', c: 1, f: 1, ms: 2000, fp: 'abc', coins: 5 }] } },
  { d: 'dev-a', n: 2, t: 2, k: 'run', v: 1, p: { w: 'vault', a: [] } },
];
const header = { app: 'test', created: 1, profile: { id: 'p1' }, device: 'dev-a', frontier: { 'dev-a': 2 } };

test('sections round-trip every field, including ones this version does not know', () => {
  const d = sampleData();
  const s = splitSections(d, sampleOps(), { migrations: ['v1:local'] });
  assert.equal(s.settings.pin, undefined, 'PIN never goes into a backup');
  const back = joinSections(s);
  const expected = structuredClone(d);
  delete expected.settings.pin;
  assert.deepEqual(back, mergeDeep(defaults(), expected));
  assert.deepEqual(s.meta.migrations, ['v1:local']);
});

test('encode → decode gives identical sections; checksum detects damage', async () => {
  const s = splitSections(sampleData(), sampleOps());
  const bytes = await encodeBackup(header, s);
  assert.equal(bytes[0], 0x1f, 'gzip compressed');
  const { header: h, sections } = await decodeBackup(bytes);
  assert.equal(canonical(sections), canonical(s));
  assert.equal(h.fv, BACKUP_FV);
  assert.deepEqual(h.frontier, { 'dev-a': 2 });

  // Tamper with the content but keep the old checksum → rejected.
  const env = await readEnvelope(bytes);
  env.sections.economy.coins = 999999;
  const tampered = new TextEncoder().encode(JSON.stringify(env));
  await assert.rejects(decodeBackup(tampered), /damaged/);
});

test('passphrase-protected backups need the right passphrase', async () => {
  const s = splitSections(sampleData(), sampleOps());
  const bytes = await encodeBackup(header, s, { passphrase: 'correct horse' });
  const env = await readEnvelope(bytes);
  assert.ok(env.crypto && env.payload && !env.sections, 'content is encrypted');
  await assert.rejects(decodeBackup(bytes), /passphrase/);
  await assert.rejects(decodeBackup(bytes, { passphrase: 'wrong' }), /Wrong passphrase/);
  const { sections } = await decodeBackup(bytes, { passphrase: 'correct horse' });
  assert.equal(sections.economy.coins, 1234);
});

test('newer backup formats and non-backups are refused clearly', async () => {
  const s = splitSections(sampleData(), sampleOps());
  const bytes = await encodeBackup(header, s);
  const env = await readEnvelope(bytes);
  env.fv = BACKUP_FV + 1;
  await assert.rejects(decodeBackup(new TextEncoder().encode(JSON.stringify(env))), /newer version/);
  await assert.rejects(decodeBackup(new TextEncoder().encode('{"hello":1}')), /not a Blox Legends backup/);
});

test('summary gives a safe preview', () => {
  const sum = summarize(splitSections(sampleData(), sampleOps()), 5);
  assert.deepEqual(sum, { created: 5, name: 'Freddie', coins: 1234, level: 4, owned: 5, answered: 300, skills: 1, ops: 2 });
});

test('v1 code parsing', () => {
  const v1 = { v: 1, name: 'F', coins: 50 };
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(v1))));
  assert.deepEqual(parseV1Code(code), v1);
  assert.throws(() => parseV1Code(btoa('{"v":9}')), /old game/);
});

test('v1 import into a fresh profile replaces it (PIN removed from data)', () => {
  const v1 = { v: 1, name: 'Freddie', coins: 82, xp: 228, owned: ['shirt-blue', 'hat-cap'], settings: { pin: '1234', dailyMin: 25 } };
  const out = mergeV1(defaults(), v1);
  assert.equal(out.coins, 82);
  assert.equal(out.name, 'Freddie');
  assert.equal(out.settings.pin, undefined);
  assert.ok(out.owned.includes('hat-cap'));
});

test('v1 import into a profile with progress merges without losing anything', () => {
  const cur = sampleData();
  delete cur.settings.pin;
  assert.equal(isFresh(cur), false);
  const v1 = mergeDeep(defaults(), {
    v: 1,
    coins: 100,
    xp: 40,
    owned: ['shirt-blue', 'hat-crown'],
    best: { obby: 50000, vault: 90000 },
    learn: { skills: { 'm.x3': { n: 5, c: 5 }, 'v.code1': { n: 9, c: 8 } } },
    totals: { ms: 1000, answered: 20, correct: 15, runs: 2 },
    history: [{ date: '2026-10-11', ms: 1, answered: 1, correct: 1 }],
  });
  const out = mergeV1(cur, v1);
  assert.equal(out.coins, 1334);
  assert.equal(out.xp, 600);
  assert.ok(out.owned.includes('hat-crown') && out.owned.includes('hat-cap'));
  assert.equal(out.best.obby, 50000, 'faster time kept');
  assert.equal(out.best.vault, 90000);
  assert.equal(out.learn.sk['m.x3'].n, 12, 'record with more attempts kept');
  assert.equal(out.learn.sk['v.code1'].n, 9);
  assert.equal(out.learn.sk['v.code1'].ms.prac !== undefined, true, 'old progress comes across as Practising');
  assert.equal(out.totals.answered, 320);
  assert.deepEqual(out.history.map((h) => h.date), ['2026-10-11', '2026-10-12']);
});
