import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeQuestion, SKILLS } from '../src/learning/index.js';
import { seeded } from '../src/learning/rng.js';
import { ALPHA } from '../src/learning/gen-verbal.js';
import { rotate, sameShape, ROTATIONS, ROTS_Y, _internal as sp } from '../src/learning/gen-spatial.js';

const LEVELS = [0, 0.3, 0.5, 0.6, 0.8, 0.9, 1];
const COUNTS = { maths: [2, 3], verbal: [3, 4], spatial: [3, 4] };
const idx = (c) => ALPHA.indexOf(c);
const mod = (n) => ((n % 26) + 26) % 26;

function mathsAnswer(prompt) {
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(prompt))) return +m[1] * +m[2];
  if ((m = /^\? × (\d+) = (\d+)$/.exec(prompt))) return +m[2] / +m[1];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(prompt))) return +m[1] / +m[2];
  if ((m = /^(\d+) \+ \? = (\d+)$/.exec(prompt))) return +m[2] - +m[1];
  if ((m = /^(\d+) \+ (\d+) = \?$/.exec(prompt))) return +m[1] + +m[2];
  if ((m = /^(\d+) − (\d+) = \?$/.exec(prompt))) return +m[1] - +m[2];
  if ((m = /^Double (\d+) = \?$/.exec(prompt))) return +m[1] * 2;
  if ((m = /^Half of (\d+) = \?$/.exec(prompt))) return +m[1] / 2;
  throw new Error(`Unparsed maths prompt: ${prompt}`);
}

function verbalAnswer(q) {
  const p = q.prompt;
  let m;
  if ((m = /^What letter comes after (\w)\?$/.exec(p))) return ALPHA[idx(m[1]) + 1];
  if ((m = /^What letter comes before (\w)\?$/.exec(p))) return ALPHA[idx(m[1]) - 1];
  if ((m = /^What letter is 2 after (\w)\?$/.exec(p))) return ALPHA[idx(m[1]) + 2];
  if ((m = /^Start at (\w)\. Jump (\d) (forwards|backwards)/.exec(p)))
    return ALPHA[idx(m[1]) + (m[3] === 'forwards' ? +m[2] : -m[2])];
  if ((m = /^What number is (\w) in the alphabet\?$/.exec(p))) return String(idx(m[1]) + 1);
  if ((m = /^Which letter is number (\d+)\?$/.exec(p))) return ALPHA[+m[1] - 1];
  if ((m = /^If (\w+) is written as (\w+), how is (\w+) written\?$/.exec(p))) {
    const shifts = [...m[1]].map((c, k) => mod(idx(m[2][k]) - idx(c)));
    return [...m[3]].map((c, k) => ALPHA[mod(idx(c) + shifts[k])]).join('');
  }
  if ((m = /^If (\w+) is written as (\w+), what does (\w+) mean\?$/.exec(p))) {
    const shifts = [...m[1]].map((c, k) => mod(idx(m[2][k]) - idx(c)));
    return [...m[3]].map((c, k) => ALPHA[mod(idx(c) - shifts[k])]).join('');
  }
  if ((m = /^Mirror code: .* What is (\w+)\?$/.exec(p))) return [...m[1]].map((c) => ALPHA[25 - idx(c)]).join('');
  if ((m = /^What comes next\? (.*), \?$/.exec(p))) {
    const items = m[1].split(', ');
    if (items[0].length === 1) {
      const d = items.slice(1).map((c, k) => idx(c) - idx(items[k]));
      const next = d[0] === d[1] && d[1] === d[2] ? d[0] : d[1];
      assert.equal(d[0], d[2], `series period: ${p}`);
      return ALPHA[idx(items[3]) + next];
    }
    const d0 = idx(items[1][0]) - idx(items[0][0]);
    const d1 = idx(items[1][1]) - idx(items[0][1]);
    assert.equal(idx(items[2][0]) - idx(items[1][0]), d0, p);
    assert.equal(idx(items[2][1]) - idx(items[1][1]), d1, p);
    return ALPHA[idx(items[2][0]) + d0] + ALPHA[idx(items[2][1]) + d1];
  }
  throw new Error(`Unparsed verbal prompt: ${p}`);
}

for (const skill of SKILLS) {
  test(`${skill.id}: every question has exactly one right answer`, () => {
    let made = 0;
    for (const lvl of LEVELS)
      for (const count of COUNTS[skill.area])
        for (let seed = 1; seed <= 60; seed++) {
          const q = makeQuestion(skill.id, lvl, count, seeded(seed * 7919 + count * 31 + Math.round(lvl * 100)));
          made++;
          assert.equal(q.options.length, count, `${skill.id} option count`);
          assert.ok(q.answerIndex >= 0 && q.answerIndex < count);
          assert.ok(q.prompt && q.speak && q.hint?.text, 'prompt, speak and hint present');
          const labels = q.options.map((o) => o.label);
          if (skill.area !== 'spatial' || q.kind === 'count')
            assert.equal(new Set(labels).size, count, `distinct options: ${labels} for ${q.prompt}`);

          if (skill.area === 'maths') {
            const expected = mathsAnswer(q.prompt);
            assert.equal(q.options[q.answerIndex].value, expected, q.prompt);
            assert.ok(Number.isInteger(expected) && expected >= 0, q.prompt);
            q.options.forEach((o) => assert.ok(o.value >= 0, `no negative options: ${q.prompt}`));
          } else if (skill.area === 'verbal') {
            const expected = verbalAnswer(q);
            assert.equal(q.options[q.answerIndex].label, expected, q.prompt);
            assert.ok(q.options.every((o) => /^[A-Z0-9]+$/.test(o.label)), `clean labels: ${labels}`);
            assert.ok(Array.isArray(q.door) && q.door.length >= 1);
            assert.ok(q.hint.strip.every(([a, b]) => idx(a) >= 0 && idx(b) >= 0), 'strip letters valid');
          } else if (q.kind === 'count') {
            assert.equal(q.options[q.answerIndex].value, q.target.length);
          } else if (q.kind === 'rotate') {
            const rots = skill.id === 's.rotY' ? ROTS_Y : ROTATIONS;
            const matches = q.options.map((o) => sameShape(rotate(o.cubes, o.rot), q.target, rots));
            assert.deepEqual(
              matches.map((v, i) => (v ? i : -1)).filter((i) => i >= 0),
              [q.answerIndex],
              'only the answer can be turned to match',
            );
            assert.ok(sp.connected(q.target));
            q.options.forEach((o) => assert.ok(sp.connected(o.cubes), 'options stay in one piece'));
          } else if (q.kind === 'top') {
            const g = sp.footprint(q.target);
            const keys = q.options.map((o) => sp.gridKey(o.grid));
            assert.equal(keys[q.answerIndex], sp.gridKey(g));
            assert.equal(new Set(keys).size, count, 'distinct plans');
          }
        }
    assert.ok(made > 0);
  });
}
