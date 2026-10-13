// Rebuilding the learner state from the learning log (plan §10.2). The log
// holds every attempt; ops that replace the learning state wholesale (an
// upgrade baseline, an old-game import, adopting the fallback copy, a reset)
// carry that state. Replaying = the latest such state, then every attempt
// logged after it, in order.
import { applyAttempt, freshLearn } from '../learning/learner.js';

const CARRIES_STATE = new Set(['learn.baseline', 'import.v1', 'adopt.fallback', 'reset']);

export function rebuildLearn(ops, reg) {
  const sorted = [...ops].sort((a, b) => a.t - b.t || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0) || a.n - b.n);
  let start = -1;
  sorted.forEach((o, i) => {
    if (CARRIES_STATE.has(o.k) && o.p?.learn) start = i;
  });
  let learn = start >= 0 ? structuredClone(sorted[start].p.learn) : freshLearn();
  for (const o of sorted.slice(start + 1)) {
    if (o.k !== 'run' && o.k !== 'run.part') continue;
    for (const a of o.p?.a || []) if (a.d !== undefined && a.pu) learn = applyAttempt(learn, a, reg);
  }
  return learn;
}
