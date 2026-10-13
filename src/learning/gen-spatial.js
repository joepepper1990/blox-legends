// Spatial reasoning generators (Build Lab). Builds are lists of integer cube
// coordinates [x, y, z]; y is up and +z faces the player ("the front").
//
// The rotation questions use the 24 rotations of a cube so distractors can be
// proven wrong: a mirror image or a moved block can never be turned into the
// target, and the tests check that for every generated question.

import { randInt, pick, chance, shuffle, buildOptions } from './rng.js';

// ---------- rotation maths ----------
const mul = (a, b) =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
const RX = [
  [1, 0, 0],
  [0, 0, -1],
  [0, 1, 0],
];
const RY = [
  [0, 0, 1],
  [0, 1, 0],
  [-1, 0, 0],
];
const I3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function allRotations() {
  const seen = new Map();
  const queue = [I3];
  while (queue.length) {
    const m = queue.shift();
    const k = JSON.stringify(m);
    if (seen.has(k)) continue;
    seen.set(k, m);
    queue.push(mul(RX, m), mul(RY, m));
  }
  return [...seen.values()];
}
export const ROTATIONS = allRotations(); // 24 matrices
export const Y_TURNS = [mul(RY, I3), mul(RY, mul(RY, I3)), mul(RY, mul(RY, mul(RY, I3)))]; // 90, 180, 270

export const rotate = (cubes, m) =>
  cubes.map(([x, y, z]) => [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ]);

export function normalize(cubes) {
  const min = [0, 1, 2].map((a) => Math.min(...cubes.map((c) => c[a])));
  return cubes
    .map((c) => c.map((v, a) => v - min[a]))
    .sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
}
const key = (cubes) => JSON.stringify(normalize(cubes));
export const ROTS_Y = [I3, ...Y_TURNS];
export const canonical = (cubes, rots = ROTATIONS) => rots.map((m) => key(rotate(cubes, m))).sort()[0];
export const mirror = (cubes) => cubes.map(([x, y, z]) => [-x, y, z]);
export const sameShape = (a, b, rots = ROTATIONS) => canonical(a, rots) === canonical(b, rots);

const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const cubeKey = (c) => c.join(',');

function connected(cubes) {
  const set = new Set(cubes.map(cubeKey));
  const seen = new Set([cubeKey(cubes[0])]);
  const stack = [cubes[0]];
  while (stack.length) {
    const c = stack.pop();
    for (const d of NEIGHBOURS) {
      const k = cubeKey([c[0] + d[0], c[1] + d[1], c[2] + d[2]]);
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(k.split(',').map(Number));
      }
    }
  }
  return seen.size === cubes.length;
}

function inBox(c, size) {
  return c.every((v) => v >= 0 && v < size);
}

export function randomPolycube(rng, n, size = 3, flat = false) {
  const start = flat ? [1, 0, 1] : [1, 1, 1];
  const cubes = [start];
  const set = new Set([cubeKey(start)]);
  let guard = 0;
  while (cubes.length < n && guard++ < 500) {
    const base = pick(rng, cubes);
    const d = pick(rng, NEIGHBOURS);
    if (flat && d[1] !== 0) continue;
    const c = [base[0] + d[0], base[1] + d[1], base[2] + d[2]];
    if (!inBox(c, flat ? Math.max(size, 4) : size)) continue;
    if (set.has(cubeKey(c))) continue;
    set.add(cubeKey(c));
    cubes.push(c);
  }
  return normalize(cubes);
}

// Move one cube to a different spot while staying connected.
function movedVariant(rng, cubes, rots) {
  for (let tries = 0; tries < 100; tries++) {
    const without = shuffle(rng, cubes).slice(1);
    if (!connected(without)) continue;
    const set = new Set(without.map(cubeKey));
    const spots = [];
    for (const c of without)
      for (const d of NEIGHBOURS) {
        const n = [c[0] + d[0], c[1] + d[1], c[2] + d[2]];
        if (!set.has(cubeKey(n))) spots.push(n);
      }
    const result = normalize([...without, pick(rng, spots)]);
    if (!sameShape(result, cubes, rots)) return result;
  }
  return null;
}

const LETTERS = ['A', 'B', 'C', 'D'];

// ---------- "Which build is the same, just turned?" ----------
function genRotate(skill, lvl, count, rng, yOnly) {
  const n = yOnly ? (lvl < 0.6 ? 5 : 6) : lvl < 0.5 ? 5 : 6;
  // "Turned round" questions only ever spin about the vertical axis, so shapes
  // count as the same only if a spin (not a flip) lines them up.
  const rots = yOnly ? ROTS_Y : ROTATIONS;
  const same = (a, b) => sameShape(a, b, rots);
  for (let attempt = 0; attempt < 200; attempt++) {
    const target = randomPolycube(rng, n, 3, yOnly && lvl < 0.3 && chance(rng, 0.5));
    if (target.length !== n) continue;
    const mirrored = normalize(mirror(target));
    if (same(mirrored, target)) continue; // need a real mirror image
    const turns = yOnly ? Y_TURNS : ROTATIONS.filter((m) => key(rotate(target, m)) !== key(target));
    const correctRot = pick(rng, turns);
    if (key(rotate(target, correctRot)) === key(target)) continue; // must look different
    const distractors = [{ cubes: mirrored, why: 'mirror' }];
    for (let k = 0; k < 4 && distractors.length < count - 1 + 1; k++) {
      const m = movedVariant(rng, target, rots);
      if (!m) continue;
      if (same(m, mirrored)) continue;
      if (distractors.some((d) => same(d.cubes, m))) continue;
      distractors.push({ cubes: m, why: 'moved' });
    }
    if (distractors.length < count - 1) continue;
    const chosen = shuffle(rng, distractors).slice(0, count - 1);
    // Keep the mirror image in most rounds: it's the classic trap.
    if (!chosen.some((d) => d.why === 'mirror') && chance(rng, 0.7)) chosen[0] = distractors[0];
    const opts = [
      { cubes: target, rot: correctRot, why: 'same' },
      ...chosen.map((d) => ({ cubes: d.cubes, rot: pick(rng, yOnly ? Y_TURNS : ROTATIONS), why: d.why })),
    ];
    const order = shuffle(rng, opts);
    const answerIndex = order.findIndex((o) => o.why === 'same');
    return {
      skill,
      kind: 'rotate',
      prompt: yOnly ? 'Which build is the same, just turned round?' : 'Which build is the same, just turned?',
      speak: yOnly
        ? 'Which build is exactly the same as the big one, just turned round?'
        : 'Which build is exactly the same as the big one, just turned a different way?',
      target,
      options: order.map((o, i) => ({ label: LETTERS[i], speak: LETTERS[i], cubes: o.cubes, rot: o.rot, why: o.why })),
      answerIndex,
      hint: {
        kind: 'rotate',
        text:
          'Watch it turn back round to match! A mirror image looks close, but it can never be turned to match — it’s like a left glove and a right glove.',
      },
    };
  }
  throw new Error('Could not build rotate question');
}

// ---------- counting ----------
// Heights grid → cubes. Rows run back (z = 0) to front. Heights never go up
// towards the front, so the top of every tower can be seen.
function heightsToCubes(h) {
  const cubes = [];
  h.forEach((row, z) => row.forEach((v, x) => { for (let y = 0; y < v; y++) cubes.push([x, y, z]); }));
  return cubes;
}

function stadiumHeights(rng, w, d, maxH) {
  for (let tries = 0; tries < 200; tries++) {
    const h = [];
    for (let z = 0; z < d; z++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const behind = z === 0 ? maxH : h[z - 1][x];
        row.push(randInt(rng, z === 0 ? 1 : 0, behind));
      }
      h.push(row);
    }
    const cubes = heightsToCubes(h);
    const hidden = h.flat().some((v) => v >= 2);
    if (cubes.length >= 4 && hidden && connected(cubes)) return h;
  }
  return null;
}

function genCount(skill, lvl, count, rng, mode) {
  let cubes;
  let layers;
  if (mode === 1) {
    const n = randInt(rng, 3, lvl < 0.3 ? 7 : lvl < 0.7 ? 8 : 10);
    cubes = randomPolycube(rng, n, 4, true);
    layers = [cubes.length];
  } else {
    const sizes =
      mode === 2
        ? [[2, 2, 2], [3, 2, 2], [4, 2, 2], [2, 3, 2], [3, 3, 2], ...(lvl >= 0.6 ? [[3, 2, 3], [2, 3, 3]] : [])]
        : [[3, 2, 3], [3, 3, 3], [4, 2, 3], ...(lvl >= 0.6 ? [[4, 3, 3], [3, 3, 4], [4, 2, 4]] : [])];
    let h = null;
    let maxH = 0;
    for (let tries = 0; !h && tries < 20; tries++) {
      const [w, d, top] = pick(rng, sizes);
      maxH = top;
      h = stadiumHeights(rng, w, d, top);
    }
    if (!h) throw new Error('Could not build a counting build');
    cubes = heightsToCubes(h);
    layers = [];
    for (let y = 0; y < maxH; y++) {
      const c = cubes.filter((q) => q[1] === y).length;
      if (c) layers.push(c);
    }
  }
  const total = cubes.length;
  const tops = new Set(cubes.map((c) => `${c[0]},${c[2]}`)).size;
  const cands = [total + 1, total - 1, tops, total + 2, total - 2, total + 3].filter((v) => v > 0 && v !== total);
  const { values, answerIndex } = buildOptions(rng, total, cands, count);
  return {
    skill,
    kind: 'count',
    prompt: 'How many blocks are in this build?',
    speak:
      mode === 1
        ? 'How many blocks are in this build?'
        : 'How many blocks are in this build? Remember the hidden ones holding the others up!',
    target: cubes,
    options: values.map((v) => ({ label: String(v), speak: String(v), value: v })),
    answerIndex,
    hint: {
      kind: 'layers',
      layers,
      text:
        layers.length === 1
          ? `Count them one at a time: there are ${total}.`
          : `Count layer by layer, from the bottom: ${layers.join(' + ')} = ${total}. Every block on top needs blocks underneath holding it up.`,
    },
  };
}

// ---------- bird's-eye view ----------
function footprint(cubes) {
  const cells = new Set(cubes.map((c) => `${c[0]},${c[2]}`));
  return trimGrid(
    [0, 1, 2, 3].map((z) => [0, 1, 2, 3].map((x) => (cells.has(`${x},${z}`) ? 1 : 0))),
  );
}

function trimGrid(g) {
  let rows = g.filter((r) => r.some(Boolean));
  const cols = rows[0].map((_, x) => rows.some((r) => r[x]));
  rows = rows.map((r) => r.filter((_, x) => cols[x]));
  return rows;
}
const gridKey = (g) => g.map((r) => r.join('')).join('/');
const flipLR = (g) => g.map((r) => r.slice().reverse());
const flipFB = (g) => g.slice().reverse();
const rot90 = (g) => g[0].map((_, x) => g.map((r) => r[x]).reverse());

function toggledCell(rng, g) {
  const pad = [Array(g[0].length + 2).fill(0), ...g.map((r) => [0, ...r, 0]), Array(g[0].length + 2).fill(0)];
  for (let tries = 0; tries < 50; tries++) {
    const z = randInt(rng, 0, pad.length - 1);
    const x = randInt(rng, 0, pad[0].length - 1);
    const copy = pad.map((r) => r.slice());
    copy[z][x] = copy[z][x] ? 0 : 1;
    if (!copy.flat().some(Boolean)) continue;
    // keep it in one piece
    const cubes = [];
    copy.forEach((r, zz) => r.forEach((v, xx) => v && cubes.push([xx, 0, zz])));
    if (!connected(cubes)) continue;
    return trimGrid(copy);
  }
  return null;
}

function genTop(skill, lvl, count, rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const n = randInt(rng, 4, lvl < 0.5 ? 6 : 8);
    const flat = randomPolycube(rng, n, 3, true);
    // Raise a few columns so the build looks 3D but the view from above is the footprint.
    const cubes = [];
    for (const [x, , z] of flat) {
      const h = chance(rng, 0.4) ? randInt(rng, 2, 3) : 1;
      for (let y = 0; y < h; y++) cubes.push([x, y, z]);
    }
    const g = footprint(cubes);
    const cands = [flipLR(g), flipFB(g), rot90(g), toggledCell(rng, g), toggledCell(rng, g)].filter(Boolean);
    const distinct = [];
    const seen = new Set([gridKey(g)]);
    for (const c of cands) {
      if (seen.has(gridKey(c))) continue;
      seen.add(gridKey(c));
      distinct.push(c);
    }
    if (distinct.length < count - 1) continue;
    const { values, answerIndex } = buildOptions(rng, g, distinct, count, gridKey);
    return {
      skill,
      kind: 'top',
      prompt: 'What does it look like from right above?',
      speak: 'Imagine you are a drone flying right above this build. What would you see?',
      target: cubes,
      options: values.map((v, i) => ({ label: LETTERS[i], speak: LETTERS[i], grid: v })),
      answerIndex,
      hint: {
        kind: 'top',
        text: 'From right above you only see the top of each tower — how tall it is doesn’t matter. The side nearest you is at the bottom of the picture.',
      },
    };
  }
  throw new Error('Could not build top-view question');
}

export function genSpatial(skillId, lvl, count, rng) {
  switch (skillId) {
    case 's.count1':
      return genCount(skillId, lvl, count, rng, 1);
    case 's.count2':
      return genCount(skillId, lvl, count, rng, 2);
    case 's.count3':
      return genCount(skillId, lvl, count, rng, 3);
    case 's.rotY':
      return genRotate(skillId, lvl, count, rng, true);
    case 's.rot3':
      return genRotate(skillId, lvl, count, rng, false);
    case 's.top':
      return genTop(skillId, lvl, count, rng);
    default:
      throw new Error(`Unknown spatial skill ${skillId}`);
  }
}

export const _internal = { footprint, gridKey, connected, heightsToCubes, flipLR, flipFB, rot90 };
export { genCount, genRotate, genTop };
