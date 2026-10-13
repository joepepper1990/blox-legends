// Simulated learners on the real scheduler and real questions (plan §7, E).
// Short runs here; long runs: node tools/sim/sim.mjs 90
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, PERSONAS } from '../tools/sim/sim.mjs';
import { SKILL_BY_ID } from '../src/learning/skills.js';
import { QUOTA } from '../src/learning/scheduler.js';
import { RULES } from '../src/learning/learner.js';

const runs = {};
const sim = (persona, days) => (runs[`${persona}${days}`] ||= simulate({ persona, days, seed: 3 }));
const reached = (r, stages, cls) =>
  Object.entries(r.stages).filter(([id, st]) => stages.includes(st) && (!cls || cls.includes(SKILL_BY_ID[id]?.cls))).map(([id]) => id);

test('every kind of learner plays for weeks without the scheduler ever stalling', () => {
  for (const p of Object.keys(PERSONAS)) {
    const r = sim(p, p === 'heavy' ? 10 : 30);
    assert.equal(r.stats.stalls, 0, p);
    assert.ok(r.stats.answered >= PERSONAS[p].perDay * (p === 'heavy' ? 10 : 30) * 0.95, p);
  }
});

test('per-run quotas hold: 1 follow-up, 1 recheck, 2 reviews, 1 transfer, one check', () => {
  for (const p of ['average', 'slow', 'heavy']) {
    const m = sim(p, p === 'heavy' ? 10 : 30).stats.maxPerRun;
    for (const k of ['follow', 'recheck', 'review', 'transfer']) assert.ok((m[k] || 0) <= QUOTA[k], `${p}: ${k} ${m[k]}`);
    assert.ok((m.check || 0) <= QUOTA.check + 2, `${p}: check ${m.check}`);
  }
});

test('follow-ups come 1–3 questions after the mistake', () => {
  const gaps = sim('average', 30).stats.followGaps;
  assert.ok(gaps.length > 20);
  assert.ok(gaps.every((g) => g >= 1 && g <= 3), JSON.stringify(gaps.filter((g) => g < 1 || g > 3)));
});

test('rapid guesses earn nothing: a guesser never gets past Introduced', () => {
  const r = sim('gamer', 30);
  assert.equal(r.stats.rapid, r.stats.answered);
  assert.deepEqual(reached(r, ['practising', 'accurate', 'applied', 'retained', 'mastered']), []);
});

test('a memoriser never reaches Accurate on a skill that needs understanding', () => {
  const r = sim('memoriser', 60);
  assert.deepEqual(reached(r, ['accurate', 'applied', 'retained', 'mastered'], ['procedural', 'authored']), []);
});

test('a forgetter never reaches Retained', () => {
  assert.deepEqual(reached(sim('forgetter', 60), ['retained', 'mastered']), []);
});

test('learners progress, and Mastered never comes sooner than 28 days after Accurate', () => {
  const avg = sim('average', 30);
  assert.ok(reached(avg, ['accurate', 'applied', 'retained', 'mastered']).length >= 5, 'average learner: Accurate on 5+ skills in 30 days');
  const fast = sim('fast', 75);
  const mastered = reached(fast, ['mastered']);
  assert.ok(mastered.length >= 1, 'a fast learner masters something in 75 days');
  for (const id of mastered) {
    const ms = fast.learn.sk[id].ms;
    assert.ok(ms.mas - ms.acc >= RULES.masteredAfter, `${id}: ${ms.acc} → ${ms.mas}`);
  }
});
