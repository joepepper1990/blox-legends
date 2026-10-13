// Non-verbal reasoning (Shape zone): shape series and shape odd one out,
// the first NVR types in the Kent Test. A figure is a set of features:
//   shape  circle, triangle, square, pentagon, hexagon, heptagon, octagon, star, arrow
//   fill   white, black, grey, striped
//   size   1 small, 2 medium, 3 large
//   rot    degrees (only arrows and triangles look different when turned)
//   count  how many copies of the shape are in the box (1–6)
// Series follow one to three rules; the checker (check/nvr.js) proves no
// other rule fits the shown frames.
import { choose, explainOptions, question, pick, randInt, shuffle, chance } from './util.js';

export const SHAPES = ['circle', 'triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star', 'arrow'];
const SIDES = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 };
const SYM = { circle: 0, triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, star: 5, arrow: 1 };
export const FILLS = ['white', 'black', 'grey', 'striped'];
const LETTERS = ['A', 'B', 'C', 'D'];

const canonRot = (shape, rot) => (SYM[shape] === 0 ? 0 : ((rot % (360 / SYM[shape])) + 360) % (360 / SYM[shape]));
export const figKey = (f) => `${f.shape}.${f.fill}.${f.size}.${canonRot(f.shape, f.rot)}.${f.count}`;
const SHAPE_NAME = (f) => (f.count > 1 ? `${f.count} ${f.shape}s` : `${/^[aeiou]/.test(f.shape) ? 'an' : 'a'} ${f.shape}`);

function baseFigure(rng, { shapes = SHAPES } = {}) {
  return { shape: pick(rng, shapes), fill: pick(rng, FILLS), size: 2, rot: 0, count: 1 };
}

// ---- series rules: each returns the value for frame k, or null if it can't apply
const RULES = {
  count: (rng, band) => {
    const down = band >= 4 && chance(rng, 0.5);
    const start = down ? randInt(rng, 5, 6) : 1;
    return { feature: 'count', at: (k) => start + (down ? -k : k), why: down ? 'one fewer shape each time' : 'one more shape each time' };
  },
  fill2: (rng) => {
    const [a, b] = shuffle(rng, FILLS);
    return { feature: 'fill', at: (k) => (k % 2 ? b : a), why: `the shading swaps between ${a} and ${b}` };
  },
  fill3: (rng) => {
    const c = shuffle(rng, FILLS).slice(0, 3);
    return { feature: 'fill', at: (k) => c[k % 3], why: `the shading goes ${c.join(', ')}, then round again` };
  },
  shape2: (rng) => {
    const [a, b] = shuffle(rng, SHAPES.filter((s) => s !== 'arrow'));
    return { feature: 'shape', at: (k) => (k % 2 ? b : a), why: `the shape swaps between ${a} and ${b}` };
  },
  shape3: (rng) => {
    const c = shuffle(rng, SHAPES.filter((s) => s !== 'arrow')).slice(0, 3);
    return { feature: 'shape', at: (k) => c[k % 3], why: `the shapes go ${c.join(', ')}, then round again` };
  },
  size3: (rng) => {
    const c = chance(rng, 0.5) ? [1, 2, 3] : [3, 2, 1];
    return { feature: 'size', at: (k) => c[k % 3], why: `the size goes ${c.map((x) => ['', 'small', 'medium', 'large'][x]).join(', ')}, then round again` };
  },
  rot90: (rng) => {
    const d = chance(rng, 0.7) ? 90 : -90;
    return { feature: 'rot', shape: 'arrow', at: (k) => k * d, why: `the arrow turns a quarter turn ${d > 0 ? 'clockwise' : 'anticlockwise'} each time` };
  },
  rot45: (rng) => {
    const d = chance(rng, 0.7) ? 45 : -45;
    return { feature: 'rot', shape: 'arrow', at: (k) => k * d, why: `the arrow turns an eighth of a turn ${d > 0 ? 'clockwise' : 'anticlockwise'} each time` };
  },
  sides: (rng) => {
    const start = randInt(rng, 3, 4);
    const by = Object.fromEntries(Object.entries(SIDES).map(([k, v]) => [v, k]));
    return { feature: 'shape', at: (k) => by[start + k] || null, why: 'each shape has one more side than the one before' };
  },
};
const RULES_AT = {
  1: ['count', 'fill2', 'shape2'],
  2: ['count', 'fill2', 'fill3', 'shape2', 'shape3', 'size3', 'rot90'],
  3: ['count', 'fill2', 'fill3', 'shape2', 'size3', 'rot90'],
  4: ['count', 'fill2', 'fill3', 'shape3', 'size3', 'rot90', 'rot45', 'sides'],
  5: ['count', 'fill2', 'fill3', 'shape3', 'size3', 'rot90', 'rot45', 'sides'],
};
const RULE_COUNT = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };

export const nvrSeries = {
  formatsAt: () => ['nvr-series'],
  make(skill, { band, count, rng }) {
    for (let tries = 0; tries < 200; tries++) {
      const names = shuffle(rng, RULES_AT[band]);
      const rules = [];
      const used = new Set();
      for (const n of names) {
        const r = RULES[n](rng, band);
        if (used.has(r.feature)) continue;
        if (r.shape && used.has('shape')) continue; // rotation needs an arrow
        if (r.feature === 'shape' && rules.some((x) => x.shape)) continue;
        rules.push(r);
        used.add(r.feature);
        if (rules.length === RULE_COUNT[band]) break;
      }
      if (rules.length < RULE_COUNT[band]) continue;
      const len = rules.some((r) => /3/.test(r.why) || r.why.includes('round again')) ? 5 : 4;
      const base = baseFigure(rng, { shapes: rules.some((r) => r.shape) ? ['arrow'] : SHAPES.filter((s) => s !== 'arrow') });
      if (rules.some((r) => r.feature === 'count')) base.size = 2;
      const frame = (k) => {
        const f = { ...base };
        for (const r of rules) {
          const v = r.at(k);
          if (v === null || v === undefined) return null;
          f[r.feature] = v;
          if (r.shape) f.shape = r.shape;
        }
        if (f.count < 1 || f.count > 6) return null;
        return f;
      };
      const frames = Array.from({ length: len + 1 }, (_, k) => frame(k));
      if (frames.some((f) => !f)) continue;
      const answer = frames[len];
      const shown = frames.slice(0, len);
      // wrong answers: break one rule at a time, or step it wrongly
      const cands = [];
      for (const r of rules) {
        const stuck = { ...answer, [r.feature]: shown[len - 1][r.feature] };
        cands.push({ v: stuck, mis: rules.length > 1 ? 'nvr-one-rule' : 'nvr-wrong-step' });
        const twice = r.at(len + 1);
        if (twice !== null && twice !== undefined) cands.push({ v: { ...answer, [r.feature]: twice }, mis: 'nvr-wrong-step' });
      }
      for (const fName of ['fill', 'size', 'count']) {
        if (rules.some((r) => r.feature === fName)) continue;
        const alt = fName === 'fill' ? pick(rng, FILLS.filter((x) => x !== answer.fill)) : fName === 'size' ? (answer.size === 2 ? 3 : 2) : answer.count + 1;
        cands.push({ v: { ...answer, [fName]: alt }, mis: 'nvr-wrong-step' });
      }
      let picked;
      try {
        picked = choose(rng, answer, shuffle(rng, cands), count, { key: figKey, label: () => '', speak: () => '' });
      } catch {
        continue;
      }
      const options = picked.options.map((o, i) => ({ label: LETTERS[i], speak: LETTERS[i], figure: o.value, ...(o.mis ? { mis: o.mis } : {}) }));
      const why = rules.map((r) => r.why).join(', and ');
      return question(skill, {
        format: 'nvr-series', band, kind: 'nvr-series', itemKey: shown.map(figKey).join('|'), answer: LETTERS[picked.answerIndex],
        prompt: 'Which picture comes next in the pattern?',
        speak: `Look at how the pictures change. Which comes next: ${options.map((o) => o.label).join(', ')}?`,
        solved: `Picture ${LETTERS[picked.answerIndex]} comes next.`,
        frames: shown, options, answerIndex: picked.answerIndex,
        hint: { kind: 'nvr', text: `Watch one thing at a time: ${why}. So next is ${SHAPE_NAME(answer)}.` },
        explain: explainOptions(options, { rules: why, rule: why }),
        stem: { rules: rules.map((r) => r.feature) },
      });
    }
    throw new Error('Could not build a shape series');
  },
};

// ---- odd one out: one feature singles out one picture; other features
// that vary never single anyone out (2–2 splits or all different).
export const nvrOdd = {
  formatsAt: () => ['nvr-odd'],
  make(skill, { band, count, rng }) {
    if (count < 3) throw new Error('an odd one out needs at least three pictures');
    for (let tries = 0; tries < 300; tries++) {
      const feature = pick(rng, band <= 1 ? ['shape', 'fill'] : ['shape', 'fill', 'count', 'size']);
      const base = baseFigure(rng, { shapes: SHAPES.filter((s) => s !== 'arrow') });
      const figs = Array.from({ length: count }, () => ({ ...base }));
      const oddAt = randInt(rng, 0, count - 1);
      const values = {
        shape: SHAPES.filter((s) => s !== 'arrow'),
        fill: FILLS,
        count: [1, 2, 3, 4],
        size: [1, 2, 3],
      };
      // Sizes are only compared on matching shapes, small against large.
      if (feature === 'size') base.size = pick(rng, [1, 3]);
      if (feature === 'size') figs.forEach((g) => (g.size = base.size));
      const other = feature === 'size' ? 4 - base.size : pick(rng, values[feature].filter((v) => v !== base[feature]));
      figs[oddAt][feature] = other;
      // noise: features that vary without singling anyone out
      const noisy = ['shape', 'fill', 'count', 'size'].filter((f) => f !== feature && !(feature === 'size' && f === 'shape'));
      const noise = shuffle(rng, noisy).slice(0, band <= 2 ? 1 : 2);
      for (const f of noise) {
        const vals = shuffle(rng, values[f]);
        let pattern;
        if (count === 4 && vals.length >= 2 && chance(rng, 0.5)) pattern = shuffle(rng, [vals[0], vals[0], vals[1], vals[1]]);
        else if (vals.length >= count) pattern = vals.slice(0, count);
        else continue;
        figs.forEach((g, i) => (g[f] = pattern[i]));
      }
      if (new Set(figs.map(figKey)).size !== count) continue;
      // the rule feature must be the only one that singles out one picture
      const singles = ['shape', 'fill', 'count', 'size'].filter((f) => {
        const vs = figs.map((g) => g[f]);
        return vs.some((v) => vs.filter((x) => x === v).length === 1) && new Set(vs).size === 2;
      });
      if (singles.length !== 1 || singles[0] !== feature) continue;
      const options = figs.map((g, i) => ({ label: LETTERS[i], speak: LETTERS[i], figure: g, ...(i !== oddAt ? { mis: 'nvr-odd-other' } : {}) }));
      const rule = feature === 'count' ? `the others all have ${base.count} shape${base.count > 1 ? 's' : ''}` : feature === 'size' ? 'the others are all the same size' : feature === 'fill' ? `the others are all ${base.fill}` : `the others are all ${base.shape}s`;
      return question(skill, {
        format: 'nvr-odd', band, kind: 'nvr-odd', itemKey: figs.map(figKey).sort().join('|') + `|${figKey(figs[oddAt])}`, answer: LETTERS[oddAt],
        prompt: 'Which picture is the odd one out?',
        speak: `Three pictures share something. Which one is the odd one out: ${options.map((o) => o.label).join(', ')}?`,
        solved: `Picture ${LETTERS[oddAt]} is the odd one out: ${rule}.`,
        options, answerIndex: oddAt,
        hint: { kind: 'nvr', text: `Some things change on all of them, so they don't matter. Look for the one thing the others share: ${rule}.` },
        explain: explainOptions(options, { rule }),
        stem: { feature },
      });
    }
    throw new Error('Could not build an odd-one-out');
  },
};
