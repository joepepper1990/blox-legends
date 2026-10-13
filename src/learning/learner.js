// The learner model (plan §7): what he knows, how well, and what is due.
// `applyAttempt(state, attempt, reg)` is a pure reducer: the same log of
// attempts always rebuilds the same state (tests replay it), and the input
// state is never changed. Stages are worked out from milestones when asked
// (`stageOf`), never stored.
//
// Attempt (created once per answer, self-describing):
//   t   time (ms)            d   local day number (dayOf), fixed at creation
//   s   skill id             k   item key         fp/fpv  fingerprint
//   fm  format               b   band 1–5         m   mechanic id
//   n   how many options     pu  purpose: learn | review | check | transfer |
//                                follow | recheck | fill | boss
//   c   right (1/0)          f   first try (1/0)  u   unseen when served (1/0)
//   rg  rapid guess (1/0)    h   hint used (1/0)  rt  response time (ms)
//   fl  fluency time (ms, direct formats only)   mis misconception chosen
//   tm  misconception this item targets (follow-ups and rechecks)
//   via world/mode           coins
//
// Learn state v2:
//   sk[id]   per skill: n, c, b (band), bs (band streak), pf (first-try
//            rights), ev (last evidence results), ms {intro, prac, acc, app,
//            ret, c21, mas} (days), uv (Accurate unverified, from v1), rf
//            (needs refresh), chk {step, due, gapFrom, res, pr}, tr {mech:
//            [right, asked]} and tl (last transfer answers, [right, mech]),
//            fa (recent fact results), fl (fluency samples), last (day)
//   it[id][key]  facts and authored items: [box, due, lastDay, n, c, lastRightDay]
//   mis[id][misId]  [n, lastDay, recheckDay, state: open|followed|fixed]
//   rc[zone] recent results    al {d, n: {id: new items today}}
export const LEARN_V = 2;
export const DAY_MS = 86400000;
export const dayOf = (t, tzOffsetMin = new Date(t).getTimezoneOffset()) => Math.floor((t - tzOffsetMin * 60000) / DAY_MS);

export const RULES = {
  practising: 3, // first-try rights (not rapid guesses)
  accurate: { window: 8, need: 7 }, // unseen, first-try, at or above the target band
  facts: { days: 30, coverage: 0.8, accuracy: 0.9, window: 20, minAnswers: 10 },
  // Over the last 8 transfer answers, rights minus twice the wrongs reach 4:
  // a 1-in-3 guesser gets there about 1 time in 22 (like passing a check by
  // luck); someone right 85% of the time after about 7 answers.
  applied: { window: 8, score: 4 },
  checkItems: 3,
  gaps: [3, 7, 21], // retention checks after Accurate (days without practice)
  reviews: [30, 60, 90], // calendar reviews after Mastered
  masteredAfter: 28, // days after a verified Accurate
  fluency: { samples: 10, keep: 15, medianMs: 3000, relaxedMs: 5000 },
  evidenceMin: 3, // fewer options than this is too lucky to count
  boxes: [0, 1, 3, 7, 14, 30], // spaced-repetition gaps for items (days)
  recent: 20,
};
// Check steps: 0 verifies a skill carried over from v1; 1–3 are the gap
// checks; 4–6 the reviews after Mastered (6 repeats every 90 days).
const STEP_VERIFY = 0;
const STEP_REVIEW = 4;

export function freshLearn() {
  return { v: LEARN_V, sk: {}, it: {}, mis: {}, rc: {}, al: { d: 0, n: {} }, cnt: 0 };
}
export function freshSkill() {
  return { n: 0, c: 0, b: 1, bs: 0, pf: 0, ev: [], ms: {}, uv: 0, rf: 0, chk: null, tr: {}, tl: [], fa: [], fl: [], last: null };
}

const push = (arr, v, max) => {
  const out = [...arr, v];
  return out.length > max ? out.slice(out.length - max) : out;
};
const sum = (a) => a.reduce((x, y) => x + y, 0);
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const checkGap = (step) => RULES.gaps[step - 1];

// Did this attempt count as evidence? (first try, thought about, enough options)
const solid = (a) => a.f === 1 && !a.rg && (a.n || 0) >= RULES.evidenceMin;

export function applyAttempt(state, a, reg) {
  const L = state && state.v === LEARN_V ? state : freshLearn();
  const info = reg.skill(a.s) || { cls: 'procedural', target: 3, appliedMechs: 2, zone: null };
  const d = a.d;
  const sk0 = L.sk[a.s] || freshSkill();
  const sk = { ...sk0, ms: { ...sk0.ms }, tr: { ...sk0.tr }, chk: sk0.chk ? { ...sk0.chk, res: [...(sk0.chk.res || [])] } : null };

  sk.n += 1;
  if (a.c) sk.c += 1;
  if (sk.ms.intro === undefined) sk.ms.intro = d;
  const practiceDay = sk.last;
  sk.last = d;

  // ---- items (facts and authored): spaced repetition per item
  let it = L.it;
  if ((info.cls === 'fact' || info.cls === 'authored') && a.k && !a.rg) {
    const items = { ...(L.it[a.s] || {}) };
    const [box, , , n, c, lastRight] = items[a.k] || [0, d, null, 0, 0, null];
    const right = a.c && a.f;
    const nb = right ? Math.min(box + 1, RULES.boxes.length - 1) : 1;
    items[a.k] = [nb, d + RULES.boxes[nb], d, n + 1, c + (right ? 1 : 0), right ? d : lastRight];
    it = { ...L.it, [a.s]: items };
  }

  if (!a.rg) {
    // ---- Practising
    if (a.c && a.f) sk.pf += 1;
    if (sk.pf >= RULES.practising && sk.ms.prac === undefined) sk.ms.prac = d;

    // ---- band ladder (only on ordinary practice at the current band)
    if (['learn', 'review', 'fill', 'follow'].includes(a.pu) && a.b === sk.b && a.f) {
      if (a.c) {
        sk.bs = Math.max(0, sk.bs) + 1;
        if (sk.bs >= 3 && sk.b < 5) [sk.b, sk.bs] = [sk.b + 1, 0];
      } else {
        sk.bs = Math.min(0, sk.bs) - 1;
        if (sk.bs <= -2 && sk.b > 1) [sk.b, sk.bs] = [sk.b - 1, 0];
      }
    }

    // ---- Accurate evidence
    if (solid(a) && a.b >= info.target && a.pu !== 'transfer') {
      if (info.cls === 'fact') sk.fa = push(sk.fa, a.c ? 1 : 0, RULES.facts.window);
      else if (a.u) sk.ev = push(sk.ev, a.c ? 1 : 0, RULES.accurate.window);
    }

    // ---- fluency samples (direct recall formats, his thinking time only)
    if (a.c && a.f && Number.isFinite(a.fl) && a.fl > 0) sk.fl = push(sk.fl, a.fl, RULES.fluency.keep);

    // ---- transfer answers towards Applied
    if (a.pu === 'transfer' && solid(a) && a.m) {
      const [r, n] = sk.tr[a.m] || [0, 0];
      sk.tr[a.m] = [r + (a.c ? 1 : 0), n + 1];
      sk.tl = push(sk.tl || [], [a.c ? 1 : 0, a.m], RULES.applied.window);
    }
  }

  // ---- milestones that evidence can reach
  if (sk.ms.prac !== undefined && sk.ms.acc === undefined && reachedAccurate(sk, info, it[a.s], d, reg, a.s)) {
    sk.ms.acc = d;
    sk.uv = 0;
    sk.chk = { step: 1, gapFrom: d, due: d + checkGap(1), res: [] };
  }

  // ---- retention checks
  if (sk.chk) {
    if (a.pu === 'check' && solid(a)) {
      sk.chk.res.push(a.c ? 1 : 0);
      if (sk.chk.res.length >= RULES.checkItems) finishCheck(sk, d);
    } else if (a.pu !== 'check' && info.cls !== 'fact' && sk.chk.step >= 1 && sk.chk.step < STEP_REVIEW && practiceDay !== null && !sk.chk.pr) {
      // Practising during a gap restarts it: the check is about remembering.
      // (Facts keep their own item schedule; their checks use items not seen
      // for the length of the gap.)
      sk.chk.gapFrom = d;
      sk.chk.due = d + checkGap(sk.chk.step);
    }
    if (a.pu !== 'check' && sk.chk?.pr && a.c && a.f) sk.chk.pr -= 1;
  }

  // ---- Applied and Mastered
  if (sk.ms.acc !== undefined && sk.ms.app === undefined && appliedReached(sk, info)) sk.ms.app = d;
  if (sk.ms.mas === undefined && masteredReached(sk, info, d, reg)) {
    sk.ms.mas = d;
    sk.chk = { step: STEP_REVIEW, gapFrom: d, due: d + RULES.reviews[0], res: [] };
  }

  // ---- misconceptions
  let mis = L.mis;
  if ((!a.c && a.mis) || (a.tm && !a.rg)) {
    const mine = { ...(L.mis[a.s] || {}) };
    if (!a.c && a.mis) {
      const [n] = mine[a.mis] || [0];
      mine[a.mis] = [n + 1, d, d + 1, 'open'];
    }
    if (a.tm && mine[a.tm] && mine[a.tm][3] !== 'fixed') {
      const [n, last, recheck, state] = mine[a.tm];
      // right: followed up today, or fixed on a later day; wrong (in any
      // way): it stays open and is rechecked tomorrow
      if (a.c) mine[a.tm] = [n, last, recheck, d >= recheck ? 'fixed' : 'followed'];
      else if (a.mis !== a.tm) mine[a.tm] = [n, last, d + 1, state === 'followed' ? 'open' : state];
    }
    mis = { ...L.mis, [a.s]: mine };
  }

  // ---- recent results and today's new authored items
  const zone = info.zone || 'other';
  const rc = a.rg ? L.rc : { ...L.rc, [zone]: push(L.rc[zone] || [], a.c ? 1 : 0, RULES.recent) };
  let al = L.al.d === d ? L.al : { d, n: {} };
  if (info.cls === 'authored' && a.u) al = { d, n: { ...al.n, [a.s]: (al.n[a.s] || 0) + 1 } };

  return { ...L, sk: { ...L.sk, [a.s]: sk }, it, mis, rc, al, cnt: (L.cnt || 0) + 1 };
}

function reachedAccurate(sk, info, items, d, reg, id) {
  if (info.cls === 'fact') {
    const F = RULES.facts;
    if (sk.fa.length < F.minAnswers || sum(sk.fa) / sk.fa.length < F.accuracy) return false;
    const keys = reg.items(id, info.target) || [];
    if (!keys.length) return false;
    const recent = keys.filter((k) => items?.[k] && items[k][5] !== null && d - items[k][5] <= F.days).length;
    return recent / keys.length >= F.coverage;
  }
  const A = RULES.accurate;
  return sk.ev.length >= A.window && sum(sk.ev.slice(-A.window)) >= A.need;
}

function appliedReached(sk, info) {
  const last = sk.tl || [];
  const right = last.filter((x) => x[0]);
  const score = right.length - 2 * (last.length - right.length);
  return score >= RULES.applied.score && new Set(right.map((x) => x[1])).size >= (info.appliedMechs || 2);
}

function masteredReached(sk, info, d, reg) {
  if (sk.uv || sk.ms.acc === undefined || sk.ms.app === undefined || sk.ms.c21 === undefined) return false;
  if (d - sk.ms.acc < RULES.masteredAfter) return false;
  if (info.cls === 'fact') {
    const F = RULES.fluency;
    if (sk.fl.length < F.samples) return false;
    if (median(sk.fl) > (reg.relaxed ? F.relaxedMs : F.medianMs)) return false;
  }
  return true;
}

// Three check answers are in: 3/3 passes, 2/3 asks again, 1/3 or 0/3 fails.
function finishCheck(sk, d) {
  const right = sum(sk.chk.res);
  const step = sk.chk.step;
  if (right === RULES.checkItems - 1) {
    sk.chk.res = [];
    return;
  }
  if (right === RULES.checkItems) {
    sk.rf = 0;
    if (step === STEP_VERIFY) {
      sk.uv = 0;
      sk.ms.acc = d;
      sk.chk = { step: 1, gapFrom: d, due: d + checkGap(1), res: [] };
    } else if (step < STEP_REVIEW - 1) {
      if (step === 2) sk.ms.ret = d;
      sk.chk = { step: step + 1, gapFrom: d, due: d + checkGap(step + 1), res: [] };
    } else if (step === STEP_REVIEW - 1) {
      sk.ms.c21 = d;
      // Mastered (and its reviews) follows once everything else is in place.
      sk.chk = sk.ms.mas !== undefined ? { step: STEP_REVIEW, gapFrom: d, due: d + RULES.reviews[0], res: [] } : null;
    } else {
      const next = Math.min(step + 1, STEP_REVIEW + RULES.reviews.length - 1);
      sk.chk = { step: next, gapFrom: d, due: d + RULES.reviews[next - STEP_REVIEW], res: [] };
    }
    return;
  }
  // failed
  if (step === STEP_VERIFY) {
    // carried over from v1 but not shown now: back to Practising
    sk.uv = 0;
    delete sk.ms.acc;
    sk.ev = [];
    sk.fa = [];
    sk.chk = null;
  } else if (step < STEP_REVIEW) {
    const back = Math.max(1, step - 1);
    sk.chk = { step: back, gapFrom: d, due: d + checkGap(back), res: [], pr: 3 };
  } else {
    sk.rf = 1;
    sk.chk = { step, gapFrom: d, due: d + 1, res: [], pr: 3 };
  }
}

// ---- reading the state ----
export const STAGES = ['new', 'introduced', 'practising', 'accurate', 'applied', 'retained', 'mastered'];

export function stageOf(sk) {
  if (!sk || !sk.n) return { stage: 'new', unverified: false, refresh: false };
  const ms = sk.ms || {};
  let stage = 'introduced';
  if (ms.prac !== undefined) stage = 'practising';
  if (sk.uv) return { stage: 'accurate', unverified: true, refresh: false };
  if (stage === 'practising' && ms.acc !== undefined) stage = 'accurate';
  if (stage === 'accurate' && ms.app !== undefined) stage = 'applied';
  if (stage === 'applied' && ms.ret !== undefined) stage = 'retained';
  if (stage === 'retained' && ms.mas !== undefined) stage = 'mastered';
  return { stage, unverified: false, refresh: !!sk.rf };
}

export const atLeast = (sk, stage) => STAGES.indexOf(stageOf(sk).stage) >= STAGES.indexOf(stage);
export const checkDue = (sk, today) => !!sk?.chk && sk.chk.due <= today && !(sk.chk.pr > 0);
export const itemDue = (rec, today) => !!rec && rec[1] <= today;

// Rebuild state from a baseline and the attempts after it.
export function replay(baseline, attempts, reg) {
  return attempts.reduce((s, a) => applyAttempt(s, a, reg), baseline || freshLearn());
}
