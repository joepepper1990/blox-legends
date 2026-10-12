import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mastery, INTERVALS } from '../src/learning/mastery.js';
import { SKILLS, skillsInArea } from '../src/learning/skills.js';
import { seeded } from '../src/learning/rng.js';

function sim(accuracy, steps, area, seed = 3) {
  let t = 1_000_000;
  const m = new Mastery({}, () => t);
  const rng = seeded(seed);
  const asked = new Set();
  for (let i = 0; i < steps; i++) {
    const id = m.pick(area, rng);
    asked.add(id);
    m.record(id, rng() < accuracy, 3000);
    t += 20_000;
  }
  return { m, asked };
}

test('starts with skills that have no prerequisites', () => {
  const m = new Mastery({});
  for (const area of ['maths', 'verbal', 'spatial']) {
    const first = m.pick(area, seeded(1));
    assert.deepEqual(SKILLS.find((s) => s.id === first).pre, [], `${area} starts at a root skill`);
  }
});

test('a child who knows it all races through the map (placement)', () => {
  for (const area of ['maths', 'verbal', 'spatial']) {
    const { m } = sim(1, 6 * skillsInArea(area).length, area);
    const p = m.areaProgress(area);
    assert.equal(p.mastered, p.total, `${area} fully mastered`);
  }
});

test('a struggling child stays on early skills and gets more review', () => {
  const { m, asked } = sim(0.45, 200, 'maths');
  assert.ok(asked.size < skillsInArea('maths').length, 'does not race ahead');
  assert.ok(m.recentAccuracy('maths') < 0.7);
});

test('wrong answers pull a skill back for sooner review', () => {
  let t = 0;
  const m = new Mastery({}, () => t);
  for (let i = 0; i < 8; i++) m.record('m.x2', true);
  const boxBefore = m.rec('m.x2').box;
  m.record('m.x2', false);
  assert.ok(m.rec('m.x2').box <= boxBefore - 2 || m.rec('m.x2').box === 0);
  assert.equal(m.rec('m.x2').due, t + INTERVALS[m.rec('m.x2').box]);
});

test('locked skills open once prerequisites are secure', () => {
  const m = new Mastery({});
  assert.equal(m.isUnlocked('m.x4'), false);
  for (let i = 0; i < 6; i++) m.record('m.x2', true);
  assert.equal(m.isUnlocked('m.x4'), true);
});
