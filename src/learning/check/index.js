// verify(q): is this question right, and is exactly one option right?
// Checkers live in this folder and never import the generators (a test scans
// the imports), so a generator bug can't hide behind its own logic.
import { solveNumber } from './number.js';
import { solveVerbal, doorAgrees } from './verbal.js';
import { solveShape } from './shape.js';

const SOLVERS = {
  m: (q) => solveNumber(q),
  v: (q) => {
    const answers = solveVerbal(q);
    if (answers === null) return null;
    return { correct: q.options.map((o, i) => (answers.includes(o.label) ? i : -1)).filter((i) => i >= 0), answers };
  },
  s: (q) => solveShape(q),
};
const extra = {}; // content packs add solvers for their own formats

export function addSolver(prefix, fn) {
  extra[prefix] = fn;
}

export function verify(q) {
  const fail = (reason) => ({ ok: false, reason });
  if (!q || q.v !== 2) return fail('not a v2 question');
  if (!q.prompt || !q.speak) return fail('missing prompt or speech');
  if (!q.hint?.text) return fail('missing hint');
  if (!q.itemKey) return fail('missing item key');
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) return fail('needs 2–4 options');
  if (!(q.answerIndex >= 0 && q.answerIndex < q.options.length)) return fail('answer index out of range');
  const labels = q.options.map((o) => String(o.label));
  if (new Set(labels).size !== labels.length) return fail('two options look the same');
  if (q.options.some((o) => o.mis && !q.explain?.[o.mis])) return fail('a misconception has no explanation');
  if (!doorAgrees(q)) return fail('door lines disagree with the question');
  const solver = extra[q.skill] || extra[q.skill.split('.')[0]] || SOLVERS[q.skill.split('.')[0]];
  const res = solver ? solver(q) : null;
  if (!res) return fail('no checker understands this question');
  if (res.reason && !res.correct.length) return fail(res.reason);
  if (res.correct.length === 0) return fail('no option is right');
  if (res.correct.length > 1) return fail(`${res.correct.length} options are right${res.reason ? `: ${res.reason}` : ''}`);
  if (res.correct[0] !== q.answerIndex) return fail('the marked answer is wrong');
  return { ok: true };
}
