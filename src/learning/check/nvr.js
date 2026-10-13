// Independent checks for non-verbal questions. Figures are compared after
// removing rotations that look identical (a square turned 90° is the same
// square). For a series, every rule family that fits each feature of the
// shown frames must predict the same next value; for an odd one out, exactly
// one feature may single out exactly one picture.
const SYMMETRY = { circle: 0, triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, star: 5, arrow: 1 };
const FEATURES = ['shape', 'fill', 'size', 'rot', 'count'];
const SIDES = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 };
const BY_SIDES = Object.fromEntries(Object.entries(SIDES).map(([k, v]) => [v, k]));

const turn = (shape, rot) => {
  const n = SYMMETRY[shape];
  if (n === undefined) return NaN;
  if (n === 0) return 0;
  const p = 360 / n;
  return ((rot % p) + p) % p;
};
const canon = (f) => ({ ...f, rot: turn(f.shape, f.rot) });
const same = (a, b) => FEATURES.every((k) => (k === 'rot' ? turn(a.shape, a.rot) === turn(b.shape, b.rot) : a[k] === b[k]));

// All values the next frame could take for one feature, by every rule that
// fits: repeating cycles of length 1–3 (seen to repeat at least once) and,
// for numbers, steady steps.
function predict(values, numeric) {
  const out = [];
  const n = values.length;
  for (let p = 1; p <= 3; p++) {
    if (n < p + 1) continue;
    if (values.every((v, i) => i < p || v === values[i - p])) out.push(values[n - p]);
  }
  if (numeric && n >= 3) {
    const d = values[1] - values[0];
    if (d !== 0 && values.every((v, i) => i === 0 || v - values[i - 1] === d)) out.push(values[n - 1] + d);
  }
  return [...new Set(out)];
}

export function solveNvr(q) {
  if (q.kind === 'nvr-series') {
    const fr = q.frames;
    if (!fr || fr.length < 3) return { correct: [], reason: 'too few frames' };
    if (fr.some((f) => Number.isNaN(turn(f.shape, f.rot)))) return { correct: [], reason: 'unknown shape' };
    // Each feature predicted on its own. Rotation is tracked as raw angle
    // steps (an arrow turning 90° each time), then compared after symmetry.
    const next = {};
    for (const k of FEATURES) {
      const vals = fr.map((f) => f[k]);
      let preds = predict(vals, k === 'count' || k === 'rot' || k === 'size');
      // Shapes can also step by their number of sides.
      if (k === 'shape' && vals.every((v) => SIDES[v])) {
        const bySides = predict(vals.map((v) => SIDES[v]), true).map((n) => BY_SIDES[n]);
        preds = [...new Set([...preds, ...bySides.filter(Boolean)])];
        if (bySides.some((x) => !x) && !preds.length) return { correct: [], reason: 'the pattern runs off the end' };
      }
      if (preds.length !== 1) return { correct: [], reason: preds.length ? `the ${k} could go two ways` : `no rule fits the ${k}` };
      next[k] = preds[0];
    }
    if (next.count < 1 || next.size < 1 || next.size > 3) return { correct: [], reason: 'the pattern runs off the end' };
    const correct = q.options.map((o, i) => (same(o.figure, next) ? i : -1)).filter((i) => i >= 0);
    return { correct };
  }
  if (q.kind === 'nvr-odd') {
    const figs = q.options.map((o) => canon(o.figure));
    if (figs.length < 3) return { correct: [], reason: 'an odd one out needs at least three pictures' };
    const singled = new Set();
    for (const k of FEATURES) {
      const vs = figs.map((f) => f[k]);
      const distinct = new Set(vs);
      if (distinct.size !== 2) continue;
      for (const v of distinct) if (vs.filter((x) => x === v).length === 1) singled.add(vs.indexOf(v));
    }
    if (singled.size === 0) return { correct: [], reason: 'nothing singles out one picture' };
    return { correct: [...singled] };
  }
  return null;
}
