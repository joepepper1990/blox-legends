// The learner model: stage rules (plan §7), retention checks, misconceptions,
// purity, replay from the log, and migration of v1 and R0 progress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAttempt, freshLearn, stageOf, replay, checkDue, RULES, dayOf } from '../src/learning/learner.js';
import { upgradeLearn, isV1Mastered } from '../src/learning/migrate-learn.js';
import { makeRegistry } from '../src/learning/registry.js';
import { seeded } from '../src/learning/rng.js';

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/r0/${f}`, import.meta.url), 'utf8'));

// A small registry for rule tests: one skill of each class.
const REG = {
  skill: (id) =>
    ({
      'p.one': { cls: 'procedural', target: 3, appliedMechs: 2, zone: 'number' },
      'f.one': { cls: 'fact', target: 3, appliedMechs: 2, zone: 'number' },
      'a.one': { cls: 'authored', target: 3, appliedMechs: 1, zone: 'code' },
    })[id],
  items: (id) => (id === 'f.one' ? Array.from({ length: 10 }, (_, i) => `k${i}`) : []),
};

let clock = 0;
const A = (o = {}) => ({ t: ++clock, d: 0, s: 'p.one', k: `i${clock}`, fm: 'x', b: 3, m: 'logic-lock', n: 3, pu: 'learn', c: 1, f: 1, u: 1, rg: 0, ...o });
const run = (list, state = freshLearn(), reg = REG) => list.reduce((s, a) => applyAttempt(s, a, reg), state);
const stage = (s, id = 'p.one') => stageOf(s.sk[id]).stage;
const times = (n, o) => Array.from({ length: n }, () => A(o));

// Reach Accurate on day 0 with eight unseen first-try rights.
const accurate = (o = {}) => run(times(8, o));
const check = (results, d, o = {}) => results.map((c) => A({ pu: 'check', c, d, ...o }));

test('Introduced, then Practising after three first-try rights', () => {
  let s = run([A({ c: 0 })]);
  assert.equal(stage(s), 'introduced');
  s = run(times(2), s);
  assert.equal(stage(s), 'introduced');
  s = run([A({ f: 0 })], s); // right on a second try doesn't count
  assert.equal(stage(s), 'introduced');
  s = run([A()], s);
  assert.equal(stage(s), 'practising');
});

test('rapid guesses earn no evidence of any kind', () => {
  const s = run(times(20, { rg: 1, pu: 'transfer' }));
  const sk = s.sk['p.one'];
  assert.equal(stage(s), 'introduced');
  assert.equal(sk.pf, 0);
  assert.deepEqual(sk.ev, []);
  assert.deepEqual(sk.tr, {});
  assert.deepEqual(s.rc, {});
});

test('Accurate needs 7 of 8 unseen first-try answers at the target band with 3+ options', () => {
  assert.equal(stage(accurate()), 'accurate');
  assert.equal(stage(run([...times(7), A({ c: 0 })])), 'accurate');
  assert.equal(stage(run([...times(6), A({ c: 0 }), A({ c: 0 })])), 'practising');
  assert.equal(stage(accurate({ n: 2 })), 'practising', 'two options are too lucky');
  assert.equal(stage(accurate({ u: 0 })), 'practising', 'seen items prove memory, not skill');
  assert.equal(stage(accurate({ b: 2 })), 'practising', 'below the target band');
  assert.equal(stage(accurate({ f: 0 })), 'introduced');
});

test('a memoriser (right only on items seen before) never reaches Accurate', () => {
  const rng = seeded(4);
  const list = Array.from({ length: 300 }, () => {
    const u = rng() < 0.4 ? 1 : 0;
    return A({ u, c: u ? (rng() < 0.4 ? 1 : 0) : 1 });
  });
  assert.equal(stage(run(list)), 'practising');
});

test('facts are Accurate on coverage (80% of items right in 30 days) and accuracy (90%)', () => {
  const F = (k, o = {}) => A({ s: 'f.one', k, u: 0, ...o });
  let s = run(Array.from({ length: 12 }, (_, i) => F(`k${i % 7}`)));
  assert.equal(stage(s, 'f.one'), 'practising', '7 of 10 items is not enough');
  s = run([F('k7'), F('k8')], s);
  assert.equal(stage(s, 'f.one'), 'accurate');
  // accurate answers long ago don't count as coverage
  const old = run(Array.from({ length: 12 }, (_, i) => F(`k${i % 10}`, { d: 0 })));
  const later = run([F('k0', { d: 40 })], { ...old, sk: { ...old.sk, 'f.one': { ...old.sk['f.one'], ms: { ...old.sk['f.one'].ms, acc: undefined } } } });
  assert.notEqual(later.sk['f.one'].ms.acc, 40);
});

test('Applied needs 3 right transfer answers across the required number of worlds', () => {
  let s = accurate();
  s = run(times(3, { pu: 'transfer', m: 'pattern-plates' }), s);
  assert.equal(stage(s), 'accurate', 'one world only');
  s = run([A({ pu: 'transfer', m: 'choice-path' })], s);
  assert.equal(stage(s), 'applied');
  // a skill that may use one world
  let a = run(times(8, { s: 'a.one' }));
  a = run(times(3, { s: 'a.one', pu: 'transfer', m: 'choice-path' }), a);
  assert.equal(stage(a, 'a.one'), 'applied');
});

test('checks at 3, 7 and 21 days: Retained, then Mastered no sooner than 28 days', () => {
  let s = accurate();
  s = run(times(4, { pu: 'transfer', m: 'choice-path' }).concat(times(2, { pu: 'transfer', m: 'pattern-plates' })), s);
  const sk = () => s.sk['p.one'];
  assert.deepEqual([sk().chk.step, sk().chk.due], [1, 3]);
  assert.ok(!checkDue(sk(), 2) && checkDue(sk(), 3));
  s = run(check([1, 1, 1], 3), s);
  assert.deepEqual([sk().chk.step, sk().chk.due], [2, 10]);
  s = run(check([1, 1, 1], 10), s);
  assert.equal(stage(s), 'retained');
  assert.deepEqual([sk().chk.step, sk().chk.due], [3, 31]);
  s = run(check([1, 1, 1], 31), s);
  assert.equal(stage(s), 'mastered');
  assert.equal(sk().ms.mas, 31);
  assert.ok(sk().ms.mas - sk().ms.acc >= RULES.masteredAfter);
  assert.deepEqual([sk().chk.step, sk().chk.due], [4, 61]);
  // a failed review after Mastered: Needs refresh, cleared by a 3/3 check
  s = run(check([0, 1, 0], 61), s);
  assert.equal(stageOf(sk()).refresh, true);
  s = run(times(3, { d: 62 }), s); // the practice owed first
  s = run(check([1, 1, 1], 62), s);
  assert.equal(stageOf(sk()).refresh, false);
  assert.equal(stage(s), 'mastered');
});

test('2 of 3 asks again; 1 of 3 steps back a check and owes practice', () => {
  let s = run(check([1, 0, 1], 3), accurate());
  const sk = () => s.sk['p.one'];
  assert.deepEqual([sk().chk.step, sk().chk.res], [1, []]);
  s = run(check([1, 1, 1], 3), s);
  s = run(check([0, 0, 1], 10), s);
  assert.deepEqual([sk().chk.step, sk().chk.pr], [1, 3]);
  assert.ok(!checkDue(sk(), 99), 'practice comes before the next check');
  s = run(times(3, { d: 10 }), s);
  assert.ok(checkDue(sk(), 13));
  assert.equal(stage(s), 'accurate');
});

test('practising during a gap restarts it (not for facts, which keep item schedules)', () => {
  let s = run([A({ d: 2 })], accurate());
  assert.equal(s.sk['p.one'].chk.due, 5);
});

test('guessing through a check: chance of a pass is about 1 in 21 (3 options) and 1 in 55 (4)', () => {
  for (const [opts, expect] of [[3, 1 / 21], [4, 1 / 55]]) {
    const rng = seeded(opts);
    const base = accurate();
    let passes = 0;
    const trials = 3000;
    for (let i = 0; i < trials; i++) {
      let s = base;
      while (s.sk['p.one'].chk.step === 1 && !s.sk['p.one'].chk.pr) s = run([A({ pu: 'check', d: 3, n: opts, c: rng() < 1 / opts ? 1 : 0 })], s);
      if (s.sk['p.one'].chk.step === 2) passes++;
    }
    const p = passes / trials;
    assert.ok(Math.abs(p - expect) < 0.015, `${opts} options: ${p.toFixed(3)} vs ${expect.toFixed(3)}`);
  }
});

test('misconceptions: open on the mistake, followed up the same day, fixed by a next-day recheck', () => {
  let s = run([A({ c: 0, mis: 'tab-next', d: 5 })]);
  assert.deepEqual(s.mis['p.one']['tab-next'], [1, 5, 6, 'open']);
  s = run([A({ tm: 'tab-next', d: 5, pu: 'follow' })], s);
  assert.equal(s.mis['p.one']['tab-next'][3], 'followed');
  s = run([A({ tm: 'tab-next', d: 6, pu: 'recheck' })], s);
  assert.equal(s.mis['p.one']['tab-next'][3], 'fixed');
});

test('the band goes up after 3 rights at it and down after 2 wrongs', () => {
  let s = run(times(3, { b: 1 }));
  assert.equal(s.sk['p.one'].b, 2);
  s = run(times(2, { b: 2, c: 0 }), s);
  assert.equal(s.sk['p.one'].b, 1);
});

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

// A long random log over real skills, with the real registry.
function randomLog(seed, n) {
  const rng = seeded(seed);
  const ids = ['m.x3', 'm.bonds10', 'v.syn', 's.rotY', 'e.spell34', 'unknown.id'];
  const purposes = ['learn', 'learn', 'review', 'check', 'transfer', 'follow', 'recheck', 'fill'];
  return Array.from({ length: n }, (_, i) => ({
    t: 1_800_000_000_000 + i * 3_600_000,
    d: 20000 + Math.floor(i / 25),
    s: ids[Math.floor(rng() * ids.length)],
    k: `k${Math.floor(rng() * 12)}`,
    fm: 'x',
    b: 1 + Math.floor(rng() * 5),
    m: ['choice-path', 'logic-lock', 'pattern-plates'][Math.floor(rng() * 3)],
    n: 2 + Math.floor(rng() * 3),
    pu: purposes[Math.floor(rng() * purposes.length)],
    c: rng() < 0.8 ? 1 : 0,
    f: rng() < 0.9 ? 1 : 0,
    u: rng() < 0.6 ? 1 : 0,
    rg: rng() < 0.05 ? 1 : 0,
    fl: rng() < 0.5 ? Math.floor(800 + rng() * 4000) : null,
    mis: rng() < 0.3 ? 'off-by-one' : undefined,
    tm: rng() < 0.1 ? 'off-by-one' : undefined,
  }));
}

test('pure: the state and the attempt are never changed', () => {
  const reg = makeRegistry();
  let s = deepFreeze(freshLearn());
  for (const a of randomLog(7, 400)) s = deepFreeze(applyAttempt(s, deepFreeze(a), reg));
  assert.equal(s.cnt, 400);
});

test('replaying the log rebuilds exactly the same state, from scratch or from a baseline', () => {
  const reg = makeRegistry();
  const log = randomLog(11, 1500);
  let live = freshLearn();
  for (const a of log) live = applyAttempt(live, structuredClone(a), reg);
  assert.deepEqual(replay(null, structuredClone(log), reg), live);
  const baseline = structuredClone(replay(null, log.slice(0, 700), reg));
  assert.deepEqual(replay(baseline, log.slice(700), reg), live);
  // JSON round trip (as stored) changes nothing
  assert.deepEqual(JSON.parse(JSON.stringify(live)), JSON.parse(JSON.stringify(replay(null, log, reg))));
});

test('v1 progress becomes the new model: mastered → Accurate (unverified) with a check due', () => {
  const now = Date.UTC(2026, 9, 13, 9);
  const today = dayOf(now);
  const v1 = fixture('v1-save.json').learn;
  const up = upgradeLearn(structuredClone(v1), now);
  for (const [id, r] of Object.entries(v1.skills)) {
    const st = stageOf(up.sk[id]);
    if (isV1Mastered(r)) {
      assert.deepEqual(st, { stage: 'accurate', unverified: true, refresh: false }, id);
      assert.ok(checkDue(up.sk[id], today), `${id}: check due now`);
    } else if (r.c >= 3) assert.equal(st.stage, 'practising', id);
    else assert.equal(st.stage, r.n ? 'introduced' : 'new', id);
    assert.equal(up.sk[id].n, r.n);
  }
  assert.ok(up.sk['m.bond10'], 'unknown ids are kept');
  assert.equal(up.sk['m.add20'].n, 5, 'partial records are kept');
  assert.deepEqual(up.mig.legacy, v1);
  assert.deepEqual(up.rc.number, v1.recent.maths);
  // idempotent
  assert.equal(upgradeLearn(up, now + 1e9), up);
  // the R0 save on this iPad upgrades the same way
  const r0 = fixture('r0-idb.json').state.data.learn;
  assert.equal(Object.keys(upgradeLearn(r0, now).sk).length, Object.keys(r0.skills).length);
});

test('a carried-over skill is verified by passing its check, or drops to Practising', () => {
  const reg = makeRegistry();
  const now = Date.UTC(2026, 9, 13, 9);
  const d = dayOf(now);
  const up = upgradeLearn(fixture('v1-save.json').learn, now);
  const pass = ['m.x2', 'm.x2', 'm.x2'].reduce((s, id) => applyAttempt(s, A({ s: id, pu: 'check', d }), reg), up);
  assert.deepEqual(stageOf(pass.sk['m.x2']), { stage: 'accurate', unverified: false, refresh: false });
  assert.equal(pass.sk['m.x2'].ms.acc, d, 'the 28-day clock starts now');
  const fail = [0, 0, 1].reduce((s, c) => applyAttempt(s, A({ s: 'm.x2', pu: 'check', d, c }), reg), up);
  assert.equal(stageOf(fail.sk['m.x2']).stage, 'practising');
});

test('migration never throws, whatever it is given', () => {
  for (const junk of [null, undefined, 'x', 5, [], { skills: 5 }, { skills: { a: null, b: 'x', c: { n: 'many' } } }, { recent: { maths: 'oops' } }]) {
    const up = upgradeLearn(junk, 0);
    assert.equal(up.v, 2);
    assert.ok(up.sk && up.mig);
  }
});
