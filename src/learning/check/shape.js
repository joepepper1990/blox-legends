// Independent geometry checks for the cube questions. The 24 rotations are
// derived here from scratch (signed permutation matrices with determinant +1),
// not taken from the generators.
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const det3 = (m) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

export const ALL_ROTATIONS = (() => {
  const out = [];
  for (const p of PERMS)
    for (let s = 0; s < 8; s++) {
      const m = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (c === p[r] ? (s & (1 << r) ? -1 : 1) : 0)));
      if (det3(m) === 1) out.push(m);
    }
  return out;
})();
// Spins about the vertical (y) axis only.
export const Y_SPINS = ALL_ROTATIONS.filter((m) => m[1][1] === 1);

const apply = (m, cubes) => cubes.map((c) => [0, 1, 2].map((r) => m[r][0] * c[0] + m[r][1] * c[1] + m[r][2] * c[2]));
const norm = (cubes) => {
  const lo = [0, 1, 2].map((a) => Math.min(...cubes.map((c) => c[a])));
  return cubes.map((c) => c.map((v, a) => v - lo[a])).map((c) => c.join(',')).sort().join(';');
};
export const congruent = (a, b, group) => {
  if (a.length !== b.length) return false;
  const target = norm(b);
  return group.some((m) => norm(apply(m, a)) === target);
};

// Physically countable: every raised cube rests on another.
export function supported(cubes) {
  const set = new Set(cubes.map((c) => c.join(',')));
  return cubes.every(([x, y, z]) => y === 0 || set.has(`${x},${y - 1},${z}`));
}

// The view from right above, as rows back (small z) → front, columns x.
export function topView(cubes) {
  const cols = new Set(cubes.map(([x, , z]) => `${x},${z}`));
  const xs = cubes.map((c) => c[0]);
  const zs = cubes.map((c) => c[2]);
  const rows = [];
  for (let z = Math.min(...zs); z <= Math.max(...zs); z++) {
    const row = [];
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) row.push(cols.has(`${x},${z}`) ? 1 : 0);
    rows.push(row.join(''));
  }
  return rows.join('/');
}
const gridStr = (g) => g.map((r) => r.join('')).join('/');

// Indices of correct options, or null if not a shape question.
export function solveShape(q) {
  if (q.kind === 'count') {
    if (!supported(q.target)) return { correct: [], reason: 'a block is floating, so the count is a guess' };
    return { correct: q.options.map((o, i) => (Number(o.label) === q.target.length ? i : -1)).filter((i) => i >= 0) };
  }
  if (q.kind === 'tenframe' || q.kind === 'complete') {
    // Blocks sit inside a frame (w × d × h); the answer is the space left.
    const { w, d, h } = q.frame || {};
    if (!(w > 0 && d > 0 && h > 0)) return { correct: [], reason: 'no frame size' };
    const inside = q.target.every(([x, y, z]) => x >= 0 && x < w && z >= 0 && z < d && y >= 0 && y < h);
    if (!inside || !supported(q.target)) return { correct: [], reason: 'blocks outside the frame or floating' };
    if (new Set(q.target.map((c) => c.join(','))).size !== q.target.length) return { correct: [], reason: 'two blocks in one place' };
    if (q.kind === 'complete' && !/(\d+) × (\d+) × (\d+)/.test(q.prompt)) return { correct: [], reason: 'the block size is not shown' };
    if (q.kind === 'complete') {
      const [, pw, pd, ph] = /(\d+) × (\d+) × (\d+)/.exec(q.prompt).map(Number);
      if (pw !== w || pd !== d || ph !== h) return { correct: [], reason: 'the question shows a different size' };
    }
    const left = w * d * h - q.target.length;
    return { correct: q.options.map((o, i) => (Number(o.label) === left ? i : -1)).filter((i) => i >= 0) };
  }
  if (q.kind === 'rotate') {
    const group = q.skill === 's.rotY' ? Y_SPINS : ALL_ROTATIONS;
    const shown = q.options.map((o) => apply(o.rot, o.cubes));
    const correct = shown.map((c, i) => (congruent(c, q.target, group) ? i : -1)).filter((i) => i >= 0);
    // A wrong option must not be the same shape even with a full 3D turn.
    const loose = shown.map((c, i) => (congruent(c, q.target, ALL_ROTATIONS) ? i : -1)).filter((i) => i >= 0 && !correct.includes(i));
    if (q.skill !== 's.rotY' && loose.length) return { correct: [...correct, ...loose], reason: 'two builds match' };
    return { correct };
  }
  if (q.kind === 'top') {
    const want = topView(q.target);
    return { correct: q.options.map((o, i) => (gridStr(o.grid) === want ? i : -1)).filter((i) => i >= 0) };
  }
  return null;
}
