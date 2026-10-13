// Independent checks for number questions: they read the question as the
// child sees it and work the answer out from scratch.
import { solveEquation } from './arith.js';

const n = (s) => Number(String(s).replace(/,/g, ''));
const PLACE = { ones: 1, tens: 10, hundreds: 100 };

// Returns { correct: [option indices] } or null if not understood.
export function solveNumber(q) {
  const labels = q.options.map((o) => o.label);
  const nums = labels.map(n);
  const idxWhere = (pred) => nums.map((v, i) => (pred(v, i) ? i : -1)).filter((i) => i >= 0);
  const p = q.prompt;
  let m;

  // Written column sums: the lines are the sum, and the spoken/written
  // question must say the same sum.
  if (q.display?.column) {
    const [top, bottom] = q.display.column;
    const op = bottom.trim()[0];
    const a = n(top);
    const b = n(bottom.trim().slice(1));
    const ans = op === '+' ? a + b : a - b;
    const said = solveEquation(p, [ans]);
    if (!said || !said[0]) return { correct: [], reason: 'the question and the written sum disagree' };
    return { correct: idxWhere((v) => v === ans) };
  }
  // Story problems: the words shown must be the words asked.
  if (q.display?.prose && q.display.prose.join(' ') !== p) return { correct: [], reason: 'the story shown and the question differ' };
  // Equations with one "?".
  if (/=/.test(p) && /\?/.test(p) && /^[\d\s,×÷+−?=()]+$|^Double|^Half of/.test(p)) {
    const ok = solveEquation(p, nums);
    if (ok) return { correct: ok.map((v, i) => (v ? i : -1)).filter((i) => i >= 0) };
  }
  // Place value.
  if ((m = /^What is the value of the (\d) in ([\d,]+)\?$/.exec(p))) {
    const digits = m[2].replace(/,/g, '');
    const at = [...digits].map((d, i) => (d === m[1] ? i : -1)).filter((i) => i >= 0);
    if (at.length !== 1) return { correct: [], reason: 'digit appears more than once' };
    const value = Number(m[1]) * 10 ** (digits.length - 1 - at[0]);
    return { correct: idxWhere((v) => v === value) };
  }
  if ((m = /^(\d+) hundreds?, (\d+) tens? and (\d+) ones? make \?$/.exec(p))) {
    const v = 100 * n(m[1]) + 10 * n(m[2]) + n(m[3]);
    return { correct: idxWhere((x) => x === v) };
  }
  if ((m = /^Which number is (biggest|smallest)\?$/.exec(p))) {
    const best = m[1] === 'biggest' ? Math.max(...nums) : Math.min(...nums);
    return { correct: idxWhere((v) => v === best) };
  }
  if ((m = /^([\d,]+) \? ([\d,]+)$/.exec(p))) {
    const a = n(m[1]);
    const b = n(m[2]);
    const sign = a < b ? '<' : a > b ? '>' : '=';
    return { correct: labels.map((l, i) => (l === sign ? i : -1)).filter((i) => i >= 0) };
  }
  if ((m = /^What is (10|100) (more|less) than ([\d,]+)\?$/.exec(p))) {
    const v = n(m[3]) + (m[2] === 'more' ? 1 : -1) * n(m[1]);
    return { correct: idxWhere((x) => x === v) };
  }
  // Number sequences: constant step; "?" anywhere.
  if ((m = /^What is missing\? (.+)$/.exec(p)) || (m = /^What comes next\? ([\d, ?]+)$/.exec(p))) {
    const terms = m[1].split(',').map((t) => t.trim());
    const gap = terms.indexOf('?');
    const known = terms.map((t, i) => [i, t === '?' ? null : n(t)]).filter(([, v]) => v !== null);
    if (gap < 0 || known.length < 3) return null;
    const step = (known[1][1] - known[0][1]) / (known[1][0] - known[0][0]);
    const fits = known.every(([i, v]) => v === known[0][1] + step * (i - known[0][0]));
    if (!fits) return { correct: [], reason: 'no single step fits' };
    const v = known[0][1] + step * (gap - known[0][0]);
    return { correct: idxWhere((x) => x === v) };
  }
  // Word problems: the operation is inferred from the story's own words.
  if (q.display?.prose || q.format === 'word') return solveStory(q, nums);
  return null;
}

const ADD = /\b(altogether|in total|more arrive|join|joins|another|gets? \d+ more|buys? \d+ more|finds? \d+ more|adds? \d+ more|added|how many now)\b/i;
const SUB = /\b(left|fewer|less|eats?|gives? away|loses?|lost|spends?|flew away|fly away|sold|fall off|fell off|how many more|difference|remain|takes? out)\b/i;
const MUL = /\b(each|every|groups? of|rows? of|lots of|times|packs? of|boxes of|bags of)\b/i;
const DIV = /\b(shared? (equally|between|into)|split|share|equal groups|how many groups|into groups|per)\b/i;

function solveStory(q, nums) {
  const text = q.display?.prose ? q.display.prose.join(' ') : q.prompt;
  const values = (text.match(/\d+/g) || []).map(Number);
  if (values.length === 1 && /\btwice as many\b/i.test(text)) return { correct: nums.map((v, i) => (v === values[0] * 2 ? i : -1)).filter((i) => i >= 0) };
  if (values.length === 1 && /\bhalf as many\b/i.test(text)) return { correct: nums.map((v, i) => (v === values[0] / 2 ? i : -1)).filter((i) => i >= 0) };
  if (values.length !== 2) return { correct: [], reason: 'story needs exactly two numbers' };
  const [a, b] = values;
  // Sharing and grouping first: "shared equally between 4" etc.
  let ans;
  if (DIV.test(text)) ans = a / b;
  else if (MUL.test(text) && !SUB.test(text)) ans = a * b;
  else if (SUB.test(text) && !ADD.test(text)) ans = Math.abs(a - b);
  else if (ADD.test(text) && !SUB.test(text)) ans = a + b;
  else return { correct: [], reason: 'the story’s operation is unclear' };
  return { correct: nums.map((v, i) => (v === ans ? i : -1)).filter((i) => i >= 0) };
}

export { PLACE };
