// Transfer questions (plan §7 "Applied"): the skill used in a new context.
//   word      a one-step story built from the skill's own numbers
//   array     a times-table fact as rows of blocks to count
//   tenframe  a bond to 10 as blocks in a ten-frame: how many more?
//   complete  how many more blocks finish a cuboid
//   glass / door / board  a practice item shown in another world
import { FORMATS } from '../formats.js';
import { choose, explainOptions, question, pick, randInt, chance } from './util.js';
import { story } from './stories.js';
import { ROTATIONS, ROTS_Y, rotate, normalize } from '../gen-spatial.js';
import { isoClear } from '../../engine/iso-draw.js';

// On a Code Vault door or a Glass Bridge sign builds are drawn flat, so each one is turned to a view
// where no cube hides. Turning a build never changes the answer: the right
// one is still the same build turned, and a mirror image or a changed build
// still can't be turned to match.
function clearViews(q) {
  const group = q.skill === 's.rotY' ? ROTS_Y : ROTATIONS;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const best = (cubes, avoid) => {
    for (const m of group) {
      const turned = normalize(rotate(cubes, m));
      if (isoClear(turned) && !(avoid && same(turned, avoid))) return turned;
    }
    return null;
  };
  const target = best(q.target);
  if (target) q.target = target;
  for (const o of q.options) {
    // the right build must still look turned
    const shown = best(rotate(o.cubes, o.rot), normalize(q.target));
    if (shown) {
      o.cubes = shown;
      o.rot = ROTS_Y[0];
    }
  }
  return q;
}

// The numbers behind a number question, as a story.
function storyOf(q) {
  const s = q.stem || {};
  switch (s.op) {
    case 'mul':
      return ['mul', s.a, s.t];
    case 'missing':
    case 'div':
      return ['div', s.a * s.t, s.t];
    case 'bond':
      return ['need', s.target, s.a];
    case 'add':
      return s.k !== undefined ? ['add', s.n, s.k] : ['add', s.a, s.b];
    case 'sub':
      return s.k !== undefined ? ['sub', s.n, s.k] : s.s !== undefined ? ['sub', s.s, s.b] : ['sub', s.a, s.b];
    case 'double':
      return ['twice', s.n];
    case 'half':
      return ['half', s.n];
    default:
      return null;
  }
}

function word(skill, gen, { band, count, rng, item }) {
  for (let tries = 0; tries < 30; tries++) {
    const fmts = gen.formatsAt(skill, band, count);
    const base = gen.make(skill, { band, format: pick(rng, fmts), count, rng, item });
    const st = storyOf(base);
    if (!st) continue;
    const [op, a, b] = st;
    if (op === 'sub' && a - b <= 0) continue;
    return story(skill, band, 'word', op, a, b ?? 0, count, rng);
  }
  throw new Error(`No story for ${skill.id}`);
}

function array(skill, gen, { band, count, rng, item }) {
  const t = skill.params.t;
  const rows = item ? Number(item.split('x')[1]) : randInt(rng, 2, Math.max(2, Math.min(6, Math.floor(60 / t))));
  const cubes = [];
  for (let z = 0; z < rows; z++) for (let x = 0; x < t; x++) cubes.push([x, 0, z]);
  const p = rows * t;
  const cands = [
    { v: (rows + 1) * t, mis: 'tab-next' },
    { v: (rows - 1) * t, mis: 'tab-prev' },
    { v: rows + t, mis: 'add-not-mul' },
    { v: p + 1, mis: 'off-by-one' },
    { v: p - 1, mis: 'off-by-one' },
  ].filter((c) => c.v > 0);
  const { options, answerIndex } = choose(rng, p, cands, count);
  const prompt = `${rows} rows of ${t} blocks. How many blocks?`;
  return question(skill, {
    format: 'array', band, itemKey: `array:${t}x${rows}`, answer: p,
    kind: 'count', target: cubes, prompt, speak: prompt, solved: `${rows} × ${t} = ${p} blocks`,
    options, answerIndex,
    hint: { kind: 'layers', layers: [p], text: `Rows of the same size are a times table: ${rows} × ${t} = ${p}.` },
    explain: explainOptions(options, { a: rows, t, answer: p }),
    stem: { op: 'mul', a: rows, t },
  });
}

function tenframe(skill, gen, { band, count, rng }) {
  const have = randInt(rng, 1, 9);
  const cubes = [];
  for (let i = 0; i < have; i++) cubes.push([i % 5, 0, Math.floor(i / 5)]);
  const ans = 10 - have;
  const cands = [
    { v: have, mis: 'bond-gave-part' },
    { v: ans + 1, mis: 'off-by-one' },
    { v: ans - 1, mis: 'off-by-one' },
    { v: ans + 2, mis: 'off-by-one' },
  ].filter((c) => c.v >= 0 && c.v !== ans);
  const { options, answerIndex } = choose(rng, ans, cands, count);
  const prompt = 'How many more blocks fill the ten-frame?';
  return question(skill, {
    format: 'tenframe', band, itemKey: `tenframe:${have}`, answer: ans,
    kind: 'tenframe', frame: { w: 5, d: 2, h: 1 }, target: cubes, prompt, speak: 'A ten-frame holds 10 blocks. How many more blocks fill it?', solved: `${have} + ${ans} = 10`,
    options, answerIndex,
    hint: { kind: 'layers', layers: [have], text: `A full ten-frame is 10. ${have} + ${ans} = 10.` },
    explain: explainOptions(options, { a: have, target: 10, answer: ans }),
    stem: { op: 'bond', target: 10, a: have },
  });
}

function complete(skill, gen, { band, count, rng }) {
  for (let tries = 0; tries < 200; tries++) {
    const w = randInt(rng, 2, band <= 2 ? 3 : 4);
    const d = randInt(rng, 2, 3);
    const h = randInt(rng, 1, band <= 2 ? 2 : 3);
    // heights never rise towards the front, so every gap can be seen
    const heights = [];
    for (let z = 0; z < d; z++) heights.push(Array.from({ length: w }, (_, x) => randInt(rng, z === 0 ? 1 : 0, z === 0 ? h : heights[z - 1][x])));
    const cubes = [];
    heights.forEach((row, z) => row.forEach((v, x) => { for (let y = 0; y < v; y++) cubes.push([x, y, z]); }));
    const full = w * d * h;
    if (cubes.length < 2 || cubes.length >= full) continue;
    const ans = full - cubes.length;
    const cands = [
      { v: cubes.length, mis: 'bond-gave-part' },
      { v: ans + 1, mis: 'cube-one-off' },
      { v: ans - 1, mis: 'cube-one-off' },
      { v: full, mis: 'cube-visible-only' },
      { v: ans + 2, mis: 'cube-one-off' },
    ].filter((c) => c.v > 0 && c.v !== ans);
    const { options, answerIndex } = choose(rng, ans, cands, count);
    const prompt = `How many more blocks make a full ${w} × ${d} × ${h} block?`;
    return question(skill, {
      format: 'complete', band, itemKey: `complete:${w}x${d}x${h}:${heights.map((r) => r.join('')).join('/')}`, answer: ans,
      kind: 'complete', frame: { w, d, h }, target: cubes, prompt,
      speak: `How many more blocks would make a full block ${w} wide, ${d} deep and ${h} high?`, solved: `${full} − ${cubes.length} = ${ans}`,
      options, answerIndex,
      hint: { kind: 'layers', layers: [cubes.length], text: `A full ${w} × ${d} × ${h} block has ${full} blocks. There are ${cubes.length}, so ${ans} more are needed.` },
      explain: explainOptions(options, { answer: ans, layers: `${full} − ${cubes.length}` }),
      stem: { full, have: cubes.length },
    });
  }
  throw new Error('Could not build a cuboid');
}

const MAKERS = { word, array, tenframe, complete };

export function makeTransfer(skill, gen, opts) {
  const fmt = FORMATS[opts.format];
  if (fmt.presentation) {
    const own = gen.formatsAt(skill, opts.band, opts.count).filter((f) => skill.formats.includes(f) && opts.count >= FORMATS[f].minOptions);
    if (!own.length) throw new Error(`${skill.id} can't be shown with ${opts.count} options`);
    const base = pick(opts.rng, own);
    const q = gen.make(skill, { ...opts, format: base });
    q.base = base;
    q.format = opts.format;
    // doors and bridge signs draw builds flat
    if ((opts.format === 'door' || opts.format === 'glass') && q.kind === 'rotate') clearViews(q);
    return q;
  }
  const maker = MAKERS[opts.format];
  if (!maker) throw new Error(`No transfer maker for ${opts.format}`);
  return maker(skill, gen, opts);
}

export { chance };
