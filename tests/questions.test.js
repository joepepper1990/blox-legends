// Question v2: every generated question is checked by an independent checker
// (right answer, exactly one right option, no ambiguity), fingerprints are
// stable, and the checkers are proven not to be rubber stamps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS } from '../src/learning/skills.js';
import { GEN } from '../src/learning/gen/index.js';
import { makeItem, finish, formatsAt, itemsOf } from '../src/learning/question.js';
import { verify } from '../src/learning/check/index.js';
import { fpOf, FPV, inPartition } from '../src/learning/fp.js';
import { MECHANICS } from '../src/mechanics/caps.js';
import { ZONES } from '../src/learning/skills.js';
import { seeded } from '../src/learning/rng.js';
import '../src/learning/content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = SKILLS.filter((s) => s.status !== 'planned' && GEN[s.gen]);
const SEEDS = Number(process.env.Q_SEEDS || 25);

// Option counts a skill can be asked with: its home mechanic and wherever it
// travels for transfer.
function countsFor(s) {
  const mechs = [ZONES[s.zone].home, ...s.transfer.map((t) => t.mech)].filter(Boolean);
  const set = new Set();
  for (const m of mechs.length ? mechs : ['logic-lock']) {
    const [lo, hi] = MECHANICS[m].options;
    for (let c = lo; c <= hi; c++) set.add(c);
  }
  return [...set];
}

for (const s of BUILT) {
  test(`${s.id}: every question is right, with exactly one right option`, () => {
    let made = 0;
    for (let band = 1; band <= 5; band++)
      for (const count of countsFor(s))
        for (const format of formatsAt(s.id, band))
          for (let seed = 1; seed <= SEEDS; seed++) {
            const rng = seeded(seed * 7919 + band * 131 + count * 31 + format.length * 7);
            const q = finish(GEN[s.gen].make(s, { band, format, count, rng }));
            const v = verify(q);
            assert.ok(v.ok, `${s.id} ${format} band ${band}: ${v.reason}\n${q.prompt} [${q.options.map((o) => o.label).join(' | ')}] → ${q.answerIndex}`);
            assert.equal(q.options.length, count);
            assert.equal(q.format, format);
            assert.ok(s.formats.includes(q.format), `${q.format} is one of ${s.id}'s formats`);
            assert.match(q.fp, /^[0-9a-f]{8}$/);
            made++;
          }
    assert.ok(made > 0);
  });
}

test('fact skills list their items, and asking for an item gives that item', () => {
  for (const s of BUILT.filter((x) => x.cls === 'fact')) {
    for (const band of [1, 3, 5]) {
      const items = itemsOf(s.id, band);
      assert.ok(items.length > 0, s.id);
      assert.equal(new Set(items).size, items.length, `${s.id}: duplicate items`);
      for (const item of items.slice(0, 12)) {
        const q = makeItem(s.id, { band, item, count: 3, rng: seeded(item.length * 13 + band) });
        assert.equal(q.itemKey, item);
      }
    }
  }
});

test('fingerprints ignore wrong options, order and presentation, but not the item', () => {
  for (const s of BUILT.filter((x) => x.cls === 'fact')) {
    const item = itemsOf(s.id, 3)[0];
    const fps = new Set();
    for (let seed = 1; seed <= 20; seed++) for (const count of [3, 4]) fps.add(makeItem(s.id, { band: 3, item, count, rng: seeded(seed) }).fp);
    assert.equal(fps.size, 1, `${s.id}: one item, one fingerprint`);
    const other = itemsOf(s.id, 3)[1];
    assert.notEqual(makeItem(s.id, { band: 3, item: other, rng: seeded(1) }).fp, [...fps][0]);
  }
  // 3 × 7 and 7 × 3 are the same fact.
  const seen = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const q = makeItem('m.x3', { band: 3, item: '3x7', format: 'mul', rng: seeded(seed) });
    seen.add(q.prompt.split(' = ')[0]);
    assert.equal(q.fp, fpOf('m.x3', '3x7'));
  }
  assert.ok(seen.size === 2, 'both orders were shown');
});

test('fingerprints are stable across versions (golden vectors)', () => {
  assert.equal(FPV, 2);
  assert.equal(fpOf('m.x3', '3x7'), '86bb4f9d');
  assert.equal(fpOf('v.code1', 'CAT|1|DOG|0'), '891204b3');
  assert.equal(fpOf('s.count1', '000.100'), '525ddaa3');
  assert.equal(fpOf('v.alphaPos', 'E'), '1b79dcd5');
});

test('about 15% of every procedural skill is kept back for bosses', () => {
  for (const s of BUILT.filter((x) => x.cls === 'procedural')) {
    for (const band of [1, 3, 5]) {
      const fps = new Set();
      for (let seed = 1; seed <= 1500 && fps.size < 1200; seed++) {
        try {
          fps.add(finish(GEN[s.gen].make(s, { band, format: formatsAt(s.id, band)[seed % formatsAt(s.id, band).length], count: 3, rng: seeded(seed * 31 + band) })).fp);
        } catch {
          /* rare generator retry */
        }
      }
      if (fps.size < 300) continue; // tiny spaces are reported by the capacity check instead
      const share = [...fps].filter(inPartition).length / fps.size;
      assert.ok(share > 0.11 && share < 0.19, `${s.id} band ${band}: ${(share * 100).toFixed(1)}% in the boss partition`);
    }
  }
});

test('checkers never import the generators', () => {
  const dir = join(ROOT, 'src', 'learning', 'check');
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const [, path] of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.match(path, /^\.\/[a-z-]+\.js$/, `${f} imports ${path}`);
  }
});

test('checkers catch a wrong answer, a changed question and a broken option', () => {
  let stems = 0;
  let stemCaught = 0;
  for (const s of BUILT) {
    for (let seed = 1; seed <= 12; seed++) {
      const q = makeItem(s.id, { band: 1 + (seed % 5), count: countsFor(s).at(-1), rng: seeded(seed * 17) });
      const a = structuredClone(q);
      a.answerIndex = (q.answerIndex + 1) % q.options.length;
      assert.equal(verify(a).ok, false, `${s.id}: wrong answer index not caught`);
      const b = structuredClone(q);
      const o = b.options[b.answerIndex];
      if (q.kind === 'rotate') o.cubes = o.cubes.map(([x, y, z]) => [-x, y, z]);
      else if (q.kind === 'top') o.grid = o.grid.map((r) => r.map((v) => 1 - v));
      else o.label = `${o.label}9`;
      if (!(q.kind === 'top' && !o.grid.flat().some(Boolean))) assert.equal(verify(b).ok, false, `${s.id}: broken right answer not caught`);
      if (!q.kind && /\d/.test(q.prompt)) {
        const c = structuredClone(q);
        c.prompt = q.prompt.replace(/\d+/, (d) => String(Number(d) + 3));
        stems++;
        if (!verify(c).ok) stemCaught++;
      }
    }
  }
  assert.ok(stemCaught / stems > 0.9, `changed questions caught ${stemCaught}/${stems}`);
});
