// The scheduler (plan §6.3, §7): what comes next, and which items may be used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, nextItem, noteAnswer, planNext, frontier, newAllowance, isStuck, serve } from '../src/learning/scheduler.js';
import { SKILLS } from '../src/learning/skills.js';
import { stageOf } from '../src/learning/learner.js';
import { buildAssessment, bossReadiness } from '../src/learning/assessment.js';
import { applyAttempt, freshLearn, dayOf } from '../src/learning/learner.js';
import { upgradeLearn } from '../src/learning/migrate-learn.js';
import { makeRegistry } from '../src/learning/registry.js';
import { SKILL_BY_ID } from '../src/learning/skills.js';
import { inPartition, inReserve } from '../src/learning/fp.js';
import { seeded } from '../src/learning/rng.js';
import { readFileSync } from 'node:fs';

const reg = makeRegistry();
const DATE = new Date(2026, 9, 13, 16);
const DAY = dayOf(DATE.getTime());
const ALL = ['live', 'ready'];

function ctxFor(mech, learn = freshLearn(), { statuses = ALL, seed = 1, seen = new Map() } = {}) {
  return { learn, seen, session: createSession({ mech, statuses }), reg, rng: seeded(seed), date: DATE, day: DAY, prefs: {}, settings: {}, today: { d: DAY, n: {} } };
}
// Answer an item as given (right or wrong) and feed it back.
function answer(ctx, got, right = true, extra = {}) {
  const { q, plan, u } = got;
  const a = { t: Date.now(), d: ctx.day, s: q.skill, k: q.itemKey, fp: q.fp, fpv: 2, fm: q.format, b: q.band, m: ctx.session.mech, n: q.options.length, pu: plan.pu, c: right ? 1 : 0, f: 1, u, rg: 0, ...(plan.tm ? { tm: plan.tm } : {}), ...extra };
  if (!right) a.mis = q.options.find((o, i) => i !== q.answerIndex && o.mis)?.mis;
  ctx.learn = applyAttempt(ctx.learn, a, reg);
  ctx.seen.set(q.fp, ctx.day);
  noteAnswer(ctx, a);
  return a;
}
const play = (ctx, n, right = () => true) => Array.from({ length: n }, (_, i) => {
  const got = nextItem(ctx);
  answer(ctx, got, right(i, got));
  return got;
});

test('practice never uses boss items: the partition and the reserve stay unseen', () => {
  for (const mech of ['choice-path', 'logic-lock', 'pattern-plates']) {
    for (let seed = 1; seed <= 6; seed++) {
      const ctx = ctxFor(mech, freshLearn(), { seed });
      for (const { q } of play(ctx, 30)) {
        const cls = SKILL_BY_ID[q.skill].cls;
        if (cls === 'procedural') assert.ok(!inPartition(q.fp), `${q.skill} ${q.itemKey} is a boss item`);
        if (cls === 'authored') assert.ok(!inReserve(q.skill, q.itemKey), `${q.skill} ${q.itemKey} is reserved`);
      }
    }
  }
});

test('new realms wait: next year’s tables are not taught in Year 3 Autumn, unless already started', () => {
  const ctx = ctxFor('choice-path');
  const ids = new Set(play(ctx, 200).map((g) => g.q.skill));
  for (const id of ['m.x6', 'm.x7', 'm.x9', 'm.x11', 'm.x12']) assert.ok(!ids.has(id), id);
  // v1 progress on the 6 times table keeps it reachable
  const v1 = { skills: { 'm.x6': { n: 6, c: 4, ema: 0.7 } } };
  const ctx2 = ctxFor('choice-path', upgradeLearn(v1, DATE.getTime()));
  assert.ok(frontier(ctx2).some((s) => s.id === 'm.x6'));
});

test('prerequisites come first: the 5s wait for the 10s', () => {
  const ctx = ctxFor('choice-path');
  const first = play(ctx, 6).map((g) => g.q.skill);
  assert.ok(!first.includes('m.x5'), first.join(' '));
  assert.ok(frontier(ctx).slice(0, 3).every((s) => s.pre.every((p) => !['m.x10'].includes(p)) || ctx.learn.sk['m.x10']?.ms?.prac !== undefined));
});

test('a skill carried over from v1 is checked first, and the check is three questions', () => {
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/r0/v1-save.json', import.meta.url), 'utf8')).learn;
  const ctx = ctxFor('choice-path', upgradeLearn(v1, DATE.getTime()));
  ctx.rng = () => 0; // "due first"
  const got = play(ctx, 3);
  assert.deepEqual(got.map((g) => g.plan.pu), ['check', 'check', 'check']);
  assert.equal(new Set(got.map((g) => g.q.skill)).size, 1);
  assert.equal(ctx.learn.sk[got[0].q.skill].uv, 0, 'passed: verified');
});

test('a mistake brings a follow-up on the same skill 1–3 questions later', () => {
  const ctx = ctxFor('logic-lock');
  const first = nextItem(ctx);
  answer(ctx, first, false);
  const next = [nextItem(ctx), nextItem(ctx), nextItem(ctx)];
  const f = next.findIndex((g) => g.plan.pu === 'follow');
  assert.ok(f >= 0, next.map((g) => g.plan.pu).join(' '));
  assert.equal(next[f].q.skill, first.q.skill);
  assert.notEqual(next[f].q.itemKey, first.q.itemKey, 'a different question');
});

test('the same fact is never asked twice within five questions', () => {
  const ctx = ctxFor('choice-path');
  const got = play(ctx, 60);
  got.forEach((g, i) => {
    if (SKILL_BY_ID[g.q.skill].cls !== 'fact') return;
    for (let j = Math.max(0, i - 4); j < i; j++) if (got[j].plan.pu !== 'follow') assert.notEqual(`${got[j].q.skill}|${got[j].q.itemKey}`, `${g.q.skill}|${g.q.itemKey}`, `at ${i}`);
  });
});

test('new word items each day stay within the allowance, so banks last 14+ days', () => {
  const ctx = ctxFor('logic-lock');
  // make the word skills reachable
  for (const id of ['v.alphaNext', 'v.alphaJump', 'v.alphaPos', 'v.code1']) ctx.learn.sk[id] = { ...(ctx.learn.sk[id] || {}), n: 5, c: 5, b: 3, bs: 0, pf: 5, ev: [], ms: { intro: DAY, prac: DAY }, tr: {}, tl: [], fa: [], fl: [] };
  for (let r = 0; r < 12; r++) {
    ctx.session = createSession({ mech: 'logic-lock', statuses: ALL });
    play(ctx, 10);
  }
  for (const id of ['v.syn', 'v.ant', 'v.odd', 'v.compound']) assert.ok((ctx.learn.al.n[id] || 0) <= newAllowance(id), `${id}: ${ctx.learn.al.n[id]} new today`);
});

test('it never returns nothing, even for someone who knows everything', () => {
  const learn = freshLearn();
  for (const s of Object.values(SKILL_BY_ID)) learn.sk[s.id] = { n: 50, c: 50, b: 5, bs: 0, pf: 50, ev: [], ms: { intro: 0, prac: 0, acc: 0, app: 0, ret: 0, c21: 0, mas: 0 }, uv: 0, rf: 0, chk: { step: 4, gapFrom: DAY, due: DAY + 30, res: [] }, tr: {}, tl: [], fa: [], fl: [], last: DAY };
  for (const mech of ['choice-path', 'logic-lock', 'pattern-plates']) {
    const ctx = ctxFor(mech, learn);
    assert.equal(play(ctx, 15).length, 15);
  }
});

test('a skill tried many times without progress is flagged and moved behind others', () => {
  assert.equal(isStuck({ n: 30, ms: {} }), true);
  assert.equal(isStuck({ n: 30, ms: { prac: 1 } }), false);
  const ctx = ctxFor('choice-path');
  ctx.learn.sk['m.bonds10'] = { n: 30, c: 5, b: 1, bs: 0, pf: 2, ev: [], ms: { intro: DAY }, tr: {}, tl: [], fa: [], fl: [] };
  assert.notEqual(frontier(ctx)[0].id, 'm.bonds10');
});

test('boss questions come only from the protected pools, and readiness ignores unverified skills', () => {
  const learn = freshLearn();
  for (const mech of ['choice-path', 'logic-lock', 'pattern-plates']) {
    const { items, usedReview } = buildAssessment({ mech, realm: 'y3-aut', n: 12, learn, rng: seeded(5), day: DAY, statuses: ALL });
    assert.equal(items.length, 12, mech);
    assert.equal(usedReview, false, mech);
    for (const q of items) {
      const cls = SKILL_BY_ID[q.skill].cls;
      if (cls === 'procedural') assert.ok(inPartition(q.fp), `${q.skill} ${q.itemKey}`);
      if (cls === 'authored') assert.ok(inReserve(q.skill, q.itemKey), `${q.skill} ${q.itemKey}`);
    }
  }
  const v1 = upgradeLearn({ skills: { 'm.x3': { n: 20, c: 19, ema: 0.95 } } }, DATE.getTime());
  const r = bossReadiness({ mech: 'choice-path', realm: 'y3-aut', learn: v1, statuses: ALL });
  assert.ok(r.missing.includes('m.x3'), 'carried over but not yet verified');
});

test('every live skill can reach Applied: its transfer formats are served in their worlds', () => {
  const missing = [];
  for (const s of SKILLS.filter((x) => x.status === 'live')) {
    for (const t of s.transfer) {
      const learn = freshLearn();
      learn.sk[s.id] = { n: 20, c: 19, b: s.target, bs: 0, pf: 19, ev: [], ms: { intro: 0, prac: 0, acc: 0 }, uv: 0, rf: 0, chk: null, tr: {}, tl: [], fa: [], fl: [], last: DAY };
      assert.equal(stageOf(learn.sk[s.id]).stage, 'accurate');
      const ctx = ctxFor(t.mech, learn, { statuses: ['live'] });
      const got = serve(ctx, { s: s.id, pu: 'transfer', b: s.target, format: t.format });
      if (!got) missing.push(`${s.id} ${t.format} in ${t.mech}`);
      else assert.equal(got.q.format, t.format);
    }
    if (s.zone !== 'word') assert.ok(new Set(s.transfer.map((t) => t.mech)).size >= s.appliedMechs, s.id);
  }
  assert.deepEqual(missing, []);
});
