// Cubes and views (Build Lab): counting blocks (including hidden ones),
// recognising a build that has been turned, and the view from above. The
// geometry lives in ../gen-spatial.js; this adds the v2 fields: format,
// stable item keys and the misconception behind each wrong option.
import { genCount, genRotate, genTop, normalize, _internal as sp } from '../gen-spatial.js';
import { BAND_LVL, explainOptions } from './util.js';

const cubesKey = (cubes) => normalize(cubes).map((c) => c.join('')).join('.');
const rotKey = (m) => m.flat().join('');

function v2(skill, band, q, fields) {
  return { v: 2, cls: skill.cls, band, ...q, skill: skill.id, ...fields };
}

const counting = (mode) => ({
  formatsAt: () => ['count'],
  make(skill, { band, count, rng }) {
    const q = genCount(skill.id, BAND_LVL[band], count, rng, mode);
    const total = q.target.length;
    const tops = new Set(q.target.map((c) => `${c[0]},${c[2]}`)).size;
    for (const o of q.options) {
      if (o.value === total) continue;
      o.mis = o.value === tops && tops !== total ? 'cube-visible-only' : 'cube-one-off';
    }
    return v2(skill, band, q, {
      format: 'count',
      itemKey: cubesKey(q.target),
      answer: total,
      solved: `There are ${total} blocks.`,
      explain: explainOptions(q.options, { answer: total, layers: q.hint.layers.join(' + ') }),
      stem: { cubes: q.target.length },
    });
  },
});

const turning = (yOnly) => ({
  formatsAt: () => ['rotate'],
  make(skill, { band, count, rng }) {
    const q = genRotate(skill.id, BAND_LVL[band], count, rng, yOnly);
    const right = q.options[q.answerIndex];
    for (const o of q.options) if (o.why === 'mirror') o.mis = 'rot-mirror';
    else if (o.why === 'moved') o.mis = 'rot-moved';
    return v2(skill, band, q, {
      format: 'rotate',
      itemKey: `${cubesKey(q.target)}|${rotKey(right.rot)}`,
      answer: right.label,
      solved: `Build ${right.label} is the same, just turned.`,
      explain: explainOptions(q.options, { answer: right.label }),
      stem: { cubes: q.target.length },
    });
  },
});

export const top = {
  formatsAt: () => ['top'],
  make(skill, { band, count, rng }) {
    const q = genTop(skill.id, BAND_LVL[band], count, rng);
    const g = q.options[q.answerIndex].grid;
    const flips = new Set([sp.flipLR(g), sp.flipFB(g), sp.rot90(g)].map(sp.gridKey));
    for (const o of q.options) if (o !== q.options[q.answerIndex]) o.mis = flips.has(sp.gridKey(o.grid)) ? 'top-flipped' : 'top-changed';
    return v2(skill, band, q, {
      format: 'top',
      itemKey: cubesKey(q.target),
      answer: q.options[q.answerIndex].label,
      solved: `From above it looks like picture ${q.options[q.answerIndex].label}.`,
      explain: explainOptions(q.options, { answer: q.options[q.answerIndex].label }),
      stem: { cubes: q.target.length },
    });
  },
};

export const count1 = counting(1);
export const count2 = counting(2);
export const count3 = counting(3);
export const rotY = turning(true);
export const rot3 = turning(false);
