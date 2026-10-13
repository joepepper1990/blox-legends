// Simulated learners (plan §7, E): personas answer real questions chosen by
// the real scheduler, so the stage rules, checks, quotas and item supply are
// exercised over weeks of play. Used by tests/sim.test.js (short runs) and
// from the command line for long runs:
//   node tools/sim/sim.mjs [days] [persona]
import { applyAttempt, freshLearn, stageOf, dayOf } from '../../src/learning/learner.js';
import { makeRegistry } from '../../src/learning/registry.js';
import { createSession, nextItem, noteAnswer } from '../../src/learning/scheduler.js';
import { FORMATS } from '../../src/learning/formats.js';
import { SKILL_BY_ID } from '../../src/learning/skills.js';
import { seeded } from '../../src/learning/rng.js';

// How each kind of learner behaves.
//   learn   how much one answer teaches (0–1)
//   tau     days for knowledge to fade by e (forgetting)
//   rapid   share of answers that are rapid guesses
//   memo    right only on items seen before (memorises answers, not skills)
//   perDay  questions a day
export const PERSONAS = {
  fast: { learn: 0.18, tau: 120, rapid: 0, perDay: 45 },
  average: { learn: 0.09, tau: 60, rapid: 0, perDay: 45 },
  slow: { learn: 0.04, tau: 40, rapid: 0, perDay: 45 },
  memoriser: { learn: 0, tau: 60, rapid: 0, perDay: 45, memo: true },
  forgetter: { learn: 0.12, tau: 1.5, rapid: 0, perDay: 45 },
  gamer: { learn: 0.09, tau: 60, rapid: 1, perDay: 45 },
  heavy: { learn: 0.09, tau: 60, rapid: 0, perDay: 180 },
};

const MECHS = ['choice-path', 'logic-lock', 'pattern-plates'];
const RUN = 10;
export const START = new Date(2026, 8, 7, 16); // first week of Year 3

export function simulate({ persona = 'average', days = 30, seed = 1, statuses = ['live', 'ready'] } = {}) {
  const P = typeof persona === 'string' ? PERSONAS[persona] : persona;
  const rng = seeded(seed);
  const reg = makeRegistry();
  let learn = freshLearn();
  const seen = new Map();
  const know = {}; // skill → { k, last }
  const memo = new Set();
  const stats = { answered: 0, rapid: 0, byPurpose: {}, gapBreaks: 0, demand: {}, milestones: [], stalls: 0, maxPerRun: {}, followGaps: [] };
  let t = START.getTime();
  for (let day = 0; day < days; day++) {
    const date = new Date(START.getTime() + day * 86400000);
    const d = dayOf(date.getTime());
    const today = { d, n: {} };
    for (let i = 0; i < P.perDay; i += RUN) {
      const mech = MECHS[(i / RUN) % MECHS.length];
      const session = createSession({ mech, statuses });
      const ctx = { learn, seen, session, reg, rng, date, day: d, prefs: {}, settings: {}, today };
      for (let j = 0; j < RUN; j++) {
        let got;
        try {
          got = nextItem(ctx);
        } catch {
          stats.stalls++;
          break;
        }
        const { q, plan, u } = got;
        const n = q.options.length;
        // facts and authored items are learnt one by one; procedures as a whole
        const itemWise = SKILL_BY_ID[q.skill].cls !== 'procedural' && plan.pu !== 'transfer';
        const kn = (know[itemWise ? `${q.skill}|${q.itemKey}` : q.skill] ||= { k: 0.05, last: d });
        kn.k *= Math.exp(-(d - kn.last) / P.tau);
        kn.last = d;
        const rapid = rng() < P.rapid;
        let p;
        if (rapid) p = 1 / n;
        else if (P.memo) p = memo.has(q.fp) ? 0.97 : 1 / n;
        else p = 1 / n + (1 - 1 / n) * Math.min(1, kn.k * (1.15 - 0.07 * q.band));
        const right = rng() < p;
        const wrongOpt = q.options.find((o, x) => x !== q.answerIndex && o.mis);
        const direct = FORMATS[q.format]?.direct;
        const a = {
          t: (t += 20000), d, s: q.skill, k: q.itemKey, fp: q.fp, fpv: q.fpv, fm: q.format, b: q.band, m: mech, n,
          pu: plan.pu, c: right ? 1 : 0, f: 1, u, rg: rapid ? 1 : 0, h: 0, rt: rapid ? 300 : 4000,
          fl: direct && !rapid ? Math.round(1500 + 3000 * (1 - kn.k)) : null,
          ...(right ? {} : wrongOpt ? { mis: wrongOpt.mis } : {}),
          ...(plan.tm ? { tm: plan.tm } : {}),
        };
        const before = stageOf(learn.sk[q.skill]).stage;
        learn = applyAttempt(learn, a, reg);
        ctx.learn = learn;
        const after = stageOf(learn.sk[q.skill]).stage;
        if (after !== before) stats.milestones.push({ day, s: q.skill, stage: after });
        noteAnswer(ctx, a);
        if (!right) session.issued[session.issued.length - 1].wrong = true;
        seen.set(q.fp, d);
        memo.add(q.fp);
        today.n[q.skill] = (today.n[q.skill] || 0) + 1;
        if (!rapid) kn.k += (itemWise ? 2 : 1) * P.learn * (1 - kn.k);
        stats.answered++;
        if (rapid) stats.rapid++;
        stats.byPurpose[plan.pu] = (stats.byPurpose[plan.pu] || 0) + 1;
        if (SKILL_BY_ID[q.skill].cls === 'procedural' && plan.pu !== 'transfer') {
          const key = `${q.skill}|${q.band}`;
          (stats.demand[key] ||= new Set()).add(q.fp);
        }
      }
      stats.gapBreaks += session.gapBreaks;
      for (const [pu, n] of Object.entries(session.counts)) stats.maxPerRun[pu] = Math.max(stats.maxPerRun[pu] || 0, n);
      // how far after a mistake its follow-up came
      session.issued.forEach((x, i) => {
        if (x.pu !== 'follow') return;
        const back = session.issued.slice(0, i).map((y, j) => [y, j]).reverse().find(([y]) => y.s === x.s && y.wrong);
        if (back) stats.followGaps.push(i - back[1]);
      });
    }
  }
  const stages = {};
  for (const [id, sk] of Object.entries(learn.sk)) stages[id] = stageOf(sk).stage;
  return { learn, stats, stages };
}

// ---- command line ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const days = Number(process.argv[2] || 90);
  const only = process.argv[3];
  for (const name of only ? [only] : Object.keys(PERSONAS)) {
    const t0 = Date.now();
    const { stats, stages } = simulate({ persona: name, days, seed: 7 });
    const count = {};
    for (const st of Object.values(stages)) count[st] = (count[st] || 0) + 1;
    console.log(`${name.padEnd(10)} ${days}d  answered ${stats.answered}  stalls ${stats.stalls}  gap breaks ${stats.gapBreaks}  ${JSON.stringify(count)}  ${JSON.stringify(stats.byPurpose)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
