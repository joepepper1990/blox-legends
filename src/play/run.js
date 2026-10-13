// One run in one world: asks the scheduler for each question, times the
// answer, decides whether it was a rapid guess, and records a full attempt
// (plan §7, §8.1). Worlds only lay out the question and report which option
// was chosen.
//
// Timing:
//   shownAt   the question appears        readyAt  the read-aloud finishes
//   tap worlds (Code Vault, Build Lab): the answer moment is the tap or step
//   commit worlds (Glass Bridge): getting to the glass takes time, so the
//     quickest possible move (moveAllowanceMs) is taken off; only an answer
//     faster than any real move can be a rapid guess
//   fluency   counts in his favour: from whichever is later, the question
//             appearing or the read-aloud ending
// Rapid guesses earn no evidence and no coins; three in a row bring a
// friendly "slow down" from Bolt and a 3-second pause.
import { createSession, nextItem, noteAnswer } from '../learning/scheduler.js';
import { applyAttempt, dayOf } from '../learning/learner.js';
import { FORMATS } from '../learning/formats.js';
import { MECHANICS } from '../mechanics/caps.js';

export const SLOW_DOWN_AFTER = 3;
export const SLOW_DOWN_MS = 3000;

export class Run {
  constructor(game, world, mech, { canShow = null, count } = {}) {
    this.game = game;
    this.world = world;
    this.mech = mech;
    this.caps = MECHANICS[mech];
    this.session = createSession({ mech, statuses: game.statuses, canShow, count });
    this.rapidRow = 0;
  }

  ctx() {
    const g = this.game;
    const now = Date.now();
    const d = dayOf(now);
    if (g.todayCounts?.d !== d) g.todayCounts = { d, n: {} };
    return {
      learn: g.save.data.learn,
      seen: g.save.seen,
      session: this.session,
      reg: g.reg,
      rng: Math.random,
      date: new Date(now),
      day: d,
      prefs: g.save.data.prefs || {},
      settings: g.save.data.settings || {},
      today: g.todayCounts,
    };
  }

  next() {
    const { q, plan, u } = nextItem(this.ctx());
    q.plan = plan;
    q.u = u;
    return q;
  }

  // The question is now on screen (and being read aloud).
  shown(q, spoken) {
    const g = this.game;
    q.shownAt = performance.now();
    q.readyAt = q.shownAt + g.speech.estimateMs(spoken);
    g.speech.speak(spoken, { onend: () => (q.readyAt = Math.min(q.readyAt, performance.now())) });
  }

  // Option k chosen. Returns what the world needs for feedback.
  answer(q, k, { firstTry = true } = {}) {
    const g = this.game;
    const now = performance.now();
    const correct = k === q.answerIndex;
    const fmt = FORMATS[q.format] || {};
    const commit = this.caps.input === 'commit';
    const allowance = commit ? this.caps.moveAllowanceMs : 0;
    const rt = Math.max(0, now - (q.shownAt ?? now));
    const rapid = firstTry && (commit ? rt < allowance : rt < (fmt.minMs || 0));
    const fromReady = now - Math.max(q.shownAt ?? now, Math.min(q.readyAt ?? 0, now));
    const fl = fmt.direct && correct && firstTry && !rapid ? Math.round(Math.max(0, Math.min(rt, fromReady) - allowance)) : null;
    const t = Date.now();
    const chosen = q.options[k];
    const coins = rapid ? 0 : correct ? (firstTry ? 5 : 1) : 0;
    const a = {
      t,
      d: dayOf(t),
      s: q.skill,
      k: q.itemKey,
      fp: q.fp,
      fpv: q.fpv,
      fm: q.format,
      b: q.band,
      m: this.mech,
      n: q.options.length,
      pu: q.plan?.pu || 'learn',
      c: correct ? 1 : 0,
      f: firstTry ? 1 : 0,
      u: q.u ?? 1,
      rg: rapid ? 1 : 0,
      h: firstTry ? 0 : 1,
      rt: Math.round(rt),
      fl,
      via: this.world,
      coins,
      ...(!correct && chosen?.mis ? { mis: chosen.mis } : {}),
      ...(q.plan?.tm ? { tm: q.plan.tm } : {}),
    };
    const ctx = this.ctx();
    g.save.data.learn = applyAttempt(g.save.data.learn, a, g.reg);
    ctx.learn = g.save.data.learn;
    g.save.recordAttempt(a, this.world);
    if (firstTry) g.save.seen?.set(q.fp, a.d);
    noteAnswer(ctx, a);
    g.todayCounts.n[q.skill] = (g.todayCounts.n[q.skill] || 0) + 1;
    this.rapidRow = rapid ? this.rapidRow + 1 : 0;
    const slowDown = this.rapidRow >= SLOW_DOWN_AFTER;
    if (slowDown) this.rapidRow = 0;
    return {
      correct,
      rapid,
      coins,
      xp: rapid ? 0 : correct ? (firstTry ? 10 : 3) : 0,
      attempt: a,
      // the worked explanation of the mistake he made, if it's a known one
      explain: !correct && chosen?.mis ? q.explain?.[chosen.mis] || null : null,
      slowDown,
    };
  }
}
