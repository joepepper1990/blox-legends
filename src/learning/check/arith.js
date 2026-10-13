// A tiny arithmetic evaluator for checking questions independently of the
// generators: it reads the equation the child actually sees.

const OPS = { '+': [1, (a, b) => a + b], '−': [1, (a, b) => a - b], '-': [1, (a, b) => a - b], '×': [2, (a, b) => a * b], '÷': [2, (a, b) => a / b] };

export function tokens(text) {
  const out = [];
  const re = /\s*(\d[\d,]*|[+\-−×÷()?])/y;
  let m;
  let i = 0;
  const s = text.trim();
  while (i < s.length) {
    re.lastIndex = i;
    m = re.exec(s);
    if (!m) return null;
    out.push(/^\d/.test(m[1]) ? Number(m[1].replace(/,/g, '')) : m[1]);
    i = re.lastIndex;
    while (s[i] === ' ') i++;
  }
  return out;
}

// Shunting-yard evaluation; returns NaN for anything malformed.
export function evaluate(toks) {
  const out = [];
  const ops = [];
  const apply = () => {
    const op = ops.pop();
    const b = out.pop();
    const a = out.pop();
    if (a === undefined || b === undefined) return false;
    out.push(OPS[op][1](a, b));
    return true;
  };
  for (const t of toks) {
    if (typeof t === 'number') out.push(t);
    else if (t === '(') ops.push(t);
    else if (t === ')') {
      while (ops.length && ops.at(-1) !== '(') if (!apply()) return NaN;
      if (ops.pop() !== '(') return NaN;
    } else if (OPS[t]) {
      while (ops.length && ops.at(-1) !== '(' && OPS[ops.at(-1)][0] >= OPS[t][0]) if (!apply()) return NaN;
      ops.push(t);
    } else return NaN;
  }
  while (ops.length) if (!apply()) return NaN;
  return out.length === 1 ? out[0] : NaN;
}

// "a op b = c" with exactly one "?" somewhere: which candidate values make it
// true? Words the game uses are turned into symbols first.
export function solveEquation(text, candidates) {
  const norm = text
    .replace(/^Double (\d+)/, '2 × $1')
    .replace(/^Half of (\d+)/, '$1 ÷ 2');
  const sides = norm.split('=');
  if (sides.length !== 2 || (norm.match(/\?/g) || []).length !== 1) return null;
  const L = tokens(sides[0]);
  const R = tokens(sides[1]);
  if (!L || !R) return null;
  return candidates.map((v) => {
    const sub = (ts) => ts.map((t) => (t === '?' ? v : t));
    const l = evaluate(sub(L));
    const r = evaluate(sub(R));
    return Number.isFinite(l) && Number.isFinite(r) && Math.abs(l - r) < 1e-9;
  });
}
