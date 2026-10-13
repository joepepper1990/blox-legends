// What to ask next (plan §6.3, §7). For one run in one world (a mechanic):
//
//   follow-up   at most 1: a matched question 1–3 items after a mistake
//   check       a 3-item retention check that is due; a skill carried over
//               from the old game is always checked first, at the start of
//               a run
//   recheck     at most 1: yesterday's misconception, asked again
//   review      at most 2: due fact or authored items of skills already
//               Accurate
//   transfer    at most 1: a skill that is Accurate but not yet Applied, in
//               a format this world can show
//   learn       the rest: the first three skills still being learnt, in
//               curriculum order, interleaved; fact skills take due items
//               first, then new ones
//   filler      when nothing else is due: transfer items from other zones,
//               a harder band of a known skill, fact items, then a resting
//               skill (a logged "gap break"), and last the zone's first skill.
//               It never returns nothing.
//
// Items for practice are never from the boss partition or reserve, and are
// unseen where possible (the ladder: unseen → least recently seen → another
// format → another skill).
import { SKILLS, SKILL_BY_ID, ZONES } from './skills.js';
import { GEN } from './gen/index.js';
import { makeItem, formatsAt, canAsk, itemsOf } from './question.js';
import { inPartition, inReserve } from './fp.js';
import { FORMATS, displayOf } from './formats.js';
import { MECHANICS } from '../mechanics/caps.js';
import { fitsMechanic } from '../mechanics/fit.js';
import { openRealms } from './calendar.js';
import { stageOf, atLeast, checkDue, RULES } from './learner.js';

export const QUOTA = { follow: 1, check: 3, recheck: 1, review: 2, transfer: 1 };
export const SEEN_DAYS = 90;
export const DAILY_SOFT_CAP = 40; // items per skill per day before others come first
const FACT_SPACING = 5; // the same fact item no closer than this in a run
const TEMPLATE_MAX = 2; // the same story template at most twice per run

export const homeOf = (s) => s.home || ZONES[s.zone].home;
const schedulable = (s, statuses) => statuses.includes(s.status) && !!GEN[s.gen];

// `count` is the number of options, or a function of the band; `canShow(q)`
// says whether the world can draw a question (worlds gain display kinds as
// they're built).
export function createSession({ mech, statuses = ['live'], count, canShow = null } = {}) {
  return {
    mech,
    statuses,
    canShow,
    count: count ?? MECHANICS[mech].options[1],
    issued: [], // {s, k, fp, pu, fm, tpl}
    counts: { follow: 0, check: 0, recheck: 0, review: 0, transfer: 0, learn: 0, fill: 0 },
    follow: null, // {s, tm, at, avoid}
    check: null, // {s, left}
    retry: [], // authored items to ask again in another format: {s, k, fm, at}
    gapBreaks: 0,
  };
}

// Daily allowance of new authored items per skill: the playable bank must last
// at least 14 days.
const allowCache = new Map();
export function newAllowance(skillId) {
  if (!allowCache.has(skillId)) {
    const ids = itemsOf(skillId, 5) || [];
    const playable = ids.filter((id) => !inReserve(skillId, id)).length;
    allowCache.set(skillId, Math.max(1, Math.min(6, Math.floor(playable / 14))));
  }
  return allowCache.get(skillId);
}

function context(ctx) {
  const { learn, session } = ctx;
  const statuses = session.statuses;
  const open = openRealms(ctx.date, ctx.prefs || {}, ctx.settings || {});
  const sk = (id) => learn.sk[id];
  const here = SKILLS.filter((s) => schedulable(s, statuses) && homeOf(s) === session.mech);
  const isOpen = (s) => open.has(s.realm) || (sk(s.id)?.n || 0) > 0;
  // a skill already started keeps going (its v1 progress stays reachable)
  const prereqOk = (s) =>
    (sk(s.id)?.n || 0) > 0 ||
    s.pre.every((p) => {
      const ps = SKILL_BY_ID[p];
      if (!ps || !schedulable(ps, statuses)) return true;
      return atLeast(sk(p), 'practising') || stageOf(sk(p)).unverified;
    });
  const todayN = (id) => (ctx.today?.d === ctx.day ? ctx.today.n[id] || 0 : 0);
  return { statuses, sk, here, isOpen, prereqOk, todayN };
}

// Skills still being learnt here, in curriculum order (stuck ones and those
// past the soft daily cap go last).
export function frontier(ctx) {
  const c = context(ctx);
  const list = c.here.filter((s) => c.isOpen(s) && c.prereqOk(s) && !atLeast(c.sk(s.id), 'accurate') && !stageOf(c.sk(s.id)).unverified);
  const late = (s) => (isStuck(c.sk(s.id)) ? 1 : 0) + (c.todayN(s.id) >= DAILY_SOFT_CAP ? 1 : 0);
  return list.map((s, i) => ({ s, i, late: late(s) })).sort((a, b) => a.late - b.late || a.i - b.i).map((x) => x.s);
}

// Many tries without reaching Practising: the parent dashboard flags it and
// the scheduler moves on to other skills first.
export const isStuck = (sk) => !!sk && sk.n >= 25 && sk.ms?.prac === undefined;

function recentAccuracy(learn, zones) {
  const r = zones.flatMap((z) => learn.rc[z] || []);
  return r.length < 5 ? 0.85 : r.reduce((a, b) => a + b, 0) / r.length;
}

// ---- choosing the plan ----
export function planNext(ctx) {
  const { learn, session, rng, day } = ctx;
  const c = context(ctx);
  const pos = session.issued.length;
  const q = session.counts;
  const plan = (s, pu, extra = {}) => ({ s: s.id || s, pu, b: bandFor(c.sk(s.id || s), SKILL_BY_ID[s.id || s], pu), ...extra });

  // 1. a follow-up after a mistake
  if (session.follow && session.follow.at <= pos && q.follow < QUOTA.follow) {
    const f = session.follow;
    session.follow = null;
    return plan(f.s, 'follow', { tm: f.tm, avoid: f.avoid });
  }
  // 2. a check already under way
  if (session.check && session.check.left > 0) return checkPlan(ctx, c, session.check.s);
  // 2b. a skill carried over from the old game is confirmed before anything
  //     else (it counts as unverified until then)
  if (q.check === 0) {
    const verify = c.here.find((s) => c.sk(s.id)?.chk?.step === 0 && checkDue(c.sk(s.id), ctx.day));
    if (verify) {
      session.check = { s: verify.id, left: RULES.checkItems - (c.sk(verify.id).chk.res?.length || 0) };
      return checkPlan(ctx, c, verify.id);
    }
  }
  // 3. something due, more often when he's finding things hard
  const front = frontier(ctx);
  const zones = [...new Set(c.here.map((s) => s.zone))];
  const reviewP = Math.min(0.6, Math.max(0.1, 0.25 + (0.85 - recentAccuracy(learn, zones)) * 1.5));
  const dueFirst = !front.length || rng() < reviewP;
  if (dueFirst) {
    const due = duePlan(ctx, c);
    if (due) return due;
  }
  // 4. a transfer item for a skill that is Accurate but not yet Applied
  if (q.transfer < QUOTA.transfer && pos >= 1) {
    const t = transferPlan(ctx, c, (sk) => atLeast(sk, 'accurate') && sk.ms?.app === undefined);
    if (t) return t;
  }
  // 5. learning: the first three, interleaved
  if (front.length) {
    const active = front.slice(0, 3);
    const weights = [0.6, 0.25, 0.15].slice(0, active.length);
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let pick = active[0];
    for (let i = 0; i < active.length; i++) {
      if ((r -= weights[i]) <= 0) {
        pick = active[i];
        break;
      }
    }
    return plan(pick, 'learn');
  }
  if (!dueFirst) {
    const due = duePlan(ctx, c);
    if (due) return due;
  }
  // 6. filler
  return fillerPlan(ctx, c, plan, day);
}

function bandFor(sk, skill, pu) {
  const b = sk?.b || 1;
  if (pu === 'check') return Math.max(b, skill.target);
  return b;
}

function checkPlan(ctx, c, id) {
  const sk = c.sk(id);
  const skill = SKILL_BY_ID[id];
  return { s: id, pu: 'check', b: Math.max(sk?.b || 1, skill.target), gap: sk?.chk ? RULES.gaps[sk.chk.step - 1] || 0 : 0 };
}

function duePlan(ctx, c) {
  const { learn, session, day } = ctx;
  const q = session.counts;
  // checks: carried-over skills first, then the oldest due
  if (q.check === 0) {
    const due = c.here
      .filter((s) => checkDue(c.sk(s.id), day))
      .sort((a, b) => (c.sk(b.id).chk.step === 0) - (c.sk(a.id).chk.step === 0) || c.sk(a.id).chk.due - c.sk(b.id).chk.due);
    if (due.length) {
      const s = due[0];
      session.check = { s: s.id, left: RULES.checkItems - (c.sk(s.id).chk.res?.length || 0) };
      return checkPlan(ctx, c, s.id);
    }
  }
  // misconception rechecks the day after
  if (q.recheck < QUOTA.recheck)
    for (const s of c.here) {
      for (const [m, [, , recheck, state]] of Object.entries(learn.mis[s.id] || {}))
        if (state !== 'fixed' && recheck <= day) return { s: s.id, pu: 'recheck', b: c.sk(s.id)?.b || 1, tm: m };
    }
  if (q.review >= QUOTA.review) return null;
  // due items of skills he already knows
  for (const s of c.here) {
    if (s.cls === 'procedural' || !atLeast(c.sk(s.id), 'accurate')) continue;
    const items = learn.it[s.id] || {};
    const due = Object.entries(items).filter(([k, r]) => r[1] <= day && r[2] < day && !(s.cls === 'authored' && inReserve(s.id, k)));
    if (due.length) {
      due.sort((a, b) => a[1][1] - b[1][1]);
      return { s: s.id, pu: 'review', b: c.sk(s.id).b, item: due[0][0] };
    }
  }
  return null;
}

function transferPlan(ctx, c, want, { otherZones = false } = {}) {
  const { learn, session, rng } = ctx;
  const cands = [];
  for (const s of SKILLS) {
    if (!schedulable(s, c.statuses)) continue;
    if (otherZones && homeOf(s) === session.mech) continue;
    const sk = learn.sk[s.id];
    if (!sk || !want(sk)) continue;
    for (const t of s.transfer)
      if (t.mech === session.mech && canAsk(s.id, t.format, sk.b, countAt(session, sk.b)) && showable(session, s.id, t.format, sk.b)) cands.push({ s, t, sk });
  }
  if (!cands.length) return null;
  const { s, t, sk } = cands[Math.floor(rng() * cands.length)];
  return { s: s.id, pu: 'transfer', b: sk.b, format: t.format };
}

function fillerPlan(ctx, c, plan, day) {
  const { learn } = ctx;
  // a. transfer items from other zones
  const t = transferPlan(ctx, c, (sk) => atLeast(sk, 'practising'), { otherZones: true });
  if (t) return { ...t, pu: 'fill' };
  const known = c.here.filter((s) => atLeast(c.sk(s.id), 'accurate') || stageOf(c.sk(s.id)).unverified);
  const resting = (s) => {
    const k = c.sk(s.id)?.chk;
    return s.cls !== 'fact' && k && k.step >= 1 && k.step <= 3 && !checkDue(c.sk(s.id), day) && !(k.pr > 0);
  };
  // b. a harder band of something he knows (not resting)
  const stretch = known.filter((s) => !resting(s) && (c.sk(s.id).b || 1) < 5);
  if (stretch.length) {
    const s = stretch[Math.floor(ctx.rng() * stretch.length)];
    return { s: s.id, pu: 'fill', b: Math.min(5, (c.sk(s.id).b || 1) + 1) };
  }
  // c. fact items (they keep their own schedule)
  const facts = known.filter((s) => s.cls === 'fact');
  if (facts.length) return plan(facts[Math.floor(ctx.rng() * facts.length)], 'fill');
  // d. a resting skill, least recently practised: breaks its gap
  const rest = known.filter(resting).sort((a, b) => (c.sk(a.id).last ?? 0) - (c.sk(b.id).last ?? 0));
  if (rest.length) {
    ctx.session.gapBreaks += 1;
    return plan(rest[0], 'fill', { gapBreak: true });
  }
  // e. the zone's first skill
  const root = c.here[0] || SKILLS.find((s) => schedulable(s, c.statuses));
  return plan(root, 'fill');
}

const countAt = (session, band) => (typeof session.count === 'function' ? session.count(band) : session.count);

// Could this world show the skill in this format at all?
function showable(session, skillId, format, band) {
  if (!session.canShow) return true;
  const fmt = FORMATS[format];
  const kinds = fmt.presentation ? formatsAt(skillId, band).map((f) => FORMATS[f].display) : [fmt.display];
  return kinds.some((display) => session.canShow({ format, display }));
}

// ---- making the question ----
const seenRecently = (seen, fp, day) => seen.has(fp) && day - seen.get(fp) <= SEEN_DAYS;

function pickFactItem(ctx, skill, band, avoid) {
  const { learn, session, day, rng } = ctx;
  const keys = itemsOf(skill.id, band, countAt(session, band)) || [];
  const recent = new Set(session.issued.slice(-FACT_SPACING).filter((x) => x.s === skill.id).map((x) => x.k));
  const recs = learn.it[skill.id] || {};
  const pool = keys.filter((k) => !recent.has(k) && k !== avoid && !(skill.cls === 'authored' && inReserve(skill.id, k)));
  if (!pool.length) return keys.find((k) => !(skill.cls === 'authored' && inReserve(skill.id, k))) ?? null;
  const due = pool.filter((k) => recs[k] && recs[k][1] <= day && recs[k][2] < day);
  if (due.length) return due.sort((a, b) => recs[a][1] - recs[b][1])[0];
  const fresh = pool.filter((k) => !recs[k]);
  const allowed = skill.cls !== 'authored' || (learn.al?.d === day ? learn.al.n[skill.id] || 0 : 0) < newAllowance(skill.id);
  if (fresh.length && allowed) return fresh[Math.floor(rng() * fresh.length)];
  // least recently asked
  return pool.sort((a, b) => (recs[a]?.[2] ?? -1) - (recs[b]?.[2] ?? -1))[0];
}

function itemFor(ctx, plan) {
  const skill = SKILL_BY_ID[plan.s];
  if (plan.item) return plan.item;
  if (skill.cls === 'procedural' || plan.pu === 'transfer' || (plan.format && !skill.formats.includes(plan.format))) return undefined;
  // checks on facts use items not asked for the length of the gap
  if (plan.pu === 'check' && skill.cls === 'fact' && plan.gap) {
    const recs = ctx.learn.it[skill.id] || {};
    const keys = (itemsOf(skill.id, plan.b, countAt(ctx.session, plan.b)) || []).filter((k) => !recs[k] || ctx.day - recs[k][2] >= plan.gap);
    if (keys.length) return keys[Math.floor(ctx.rng() * keys.length)];
  }
  return pickFactItem(ctx, skill, plan.b, plan.avoid);
}

// Make the question for a plan. Returns { q, plan, u } or null if this skill
// can't be asked here at all.
export function serve(ctx, plan) {
  const { session, seen, day, rng } = ctx;
  const skill = SKILL_BY_ID[plan.s];
  const mech = session.mech;
  const top = countAt(session, plan.b);
  const counts = [top, ...range(MECHANICS[mech].options[0], top - 1).reverse()];
  const tplUsed = (tpl) => !!tpl && session.issued.filter((x) => x.tpl === tpl).length >= TEMPLATE_MAX;
  const fresh = (q) => !seenRecently(seen, q.fp, day) && !session.issued.some((x) => x.fp === q.fp);
  const base = (q) =>
    fitsMechanic(q, mech) === null &&
    !(skill.cls === 'procedural' && inPartition(q.fp)) &&
    !(skill.cls === 'authored' && inReserve(skill.id, q.itemKey)) &&
    !tplUsed(q.tpl) &&
    (!session.canShow || session.canShow({ format: q.format, display: displayOf(q), q })) &&
    q.itemKey !== plan.avoid &&
    (!plan.tm || q.options.some((o) => o.mis === plan.tm) || skill.cls !== 'procedural');
  for (const count of counts) {
    const formats = plan.format ? [plan.format] : formatsAt(skill.id, plan.b, count);
    const usable = formats.filter((f) => canAsk(skill.id, f, plan.b, count));
    if (!usable.length) continue;
    const item = itemFor(ctx, plan);
    // the ladder: unseen first, then anything not just asked, then any format
    const tries = [
      { accept: (q) => base(q) && fresh(q), format: pickFormat(usable, session, skill, rng) },
      { accept: (q) => base(q) && !session.issued.some((x) => x.fp === q.fp), format: pickFormat(usable, session, skill, rng) },
      { accept: base, format: undefined },
    ];
    for (const t of tries) {
      try {
        const q = makeItem(skill.id, { band: plan.b, format: t.format && usable.includes(t.format) ? t.format : usable[Math.floor(rng() * usable.length)], count, rng, item, accept: t.accept, tries: 30 });
        const u = !seenRecently(seen, q.fp, day) ? 1 : 0;
        session.issued.push({ s: skill.id, k: q.itemKey, fp: q.fp, pu: plan.pu, fm: q.format, tpl: q.tpl });
        session.counts[plan.pu] = (session.counts[plan.pu] || 0) + 1;
        return { q, plan, u };
      } catch {
        // next rung
      }
    }
  }
  return null;
}

const range = (lo, hi) => (hi < lo ? [] : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));

// After an error on an authored item, ask it again later in another format.
function pickFormat(usable, session, skill, rng) {
  const retry = session.retry.find((r) => r.s === skill.id && r.at <= session.issued.length);
  if (retry) {
    const other = usable.filter((f) => f !== retry.fm);
    session.retry = session.retry.filter((r) => r !== retry);
    if (other.length) return other[0];
  }
  return usable[Math.floor(rng() * usable.length)];
}

// The next question: a plan, then the item; if that skill can't be asked
// here, the plan falls through to filler and finally the zone's first skill.
export function nextItem(ctx) {
  const plan = planNext(ctx);
  const got = serve(ctx, plan);
  if (got) return got;
  if (plan.pu === 'check' && ctx.session.check) ctx.session.check = null;
  const c = context(ctx);
  for (const s of [...frontier(ctx), ...c.here]) {
    const again = serve(ctx, { s: s.id, pu: 'fill', b: c.sk(s.id)?.b || 1 });
    if (again) return again;
  }
  throw new Error(`Nothing can be asked in ${ctx.session.mech}`);
}

// Tell the session how an answer went (follow-ups, checks, retries).
export function noteAnswer(ctx, attempt) {
  const { session } = ctx;
  const skill = SKILL_BY_ID[attempt.s];
  if (attempt.pu === 'check' && session.check && session.check.s === attempt.s) {
    if (attempt.f === 1 && !attempt.rg && attempt.n >= RULES.evidenceMin) session.check.left -= 1;
    if (session.check.left <= 0) session.check = null;
  }
  if (!attempt.c && attempt.mis && session.counts.follow < QUOTA.follow && !session.follow && FORMATS[attempt.fm]) {
    const lookahead = MECHANICS[session.mech].lookahead;
    const at = session.issued.length + Math.floor(ctx.rng() * 2) + (lookahead ? 0 : 0);
    session.follow = { s: attempt.s, tm: attempt.mis, at: Math.max(at, session.issued.length), avoid: attempt.k };
  }
  if (!attempt.c && skill?.cls === 'authored') session.retry.push({ s: attempt.s, k: attempt.k, fm: attempt.fm, at: session.issued.length + 3 });
}
