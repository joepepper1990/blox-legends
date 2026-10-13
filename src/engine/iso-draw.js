// Draws a cube build as an isometric picture on a 2D canvas, the way cube
// questions look on paper: used on Code Vault doors and Build Lab boards.
// Cubes are [x, y, z] with y up; we look from the front-right, above.
const INK = '#1d2340';
const FACE = { top: '#ffd166', right: '#f4a259', left: '#e07a5f' };
const C = Math.cos(Math.PI / 6);

// Screen position of a corner (unit = one cube edge).
const iso = (x, y, z) => [(x - z) * C, (x + z) * 0.5 - y];

function bounds(cubes) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y, z] of cubes)
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1], [0, 1, 0], [1, 1, 0], [0, 1, 1], [1, 1, 1]]) {
      const [sx, sy] = iso(x + dx, y + dy, z + dz);
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
  return { minX, maxX, minY, maxY };
}

function face(g, pts, fill) {
  g.beginPath();
  pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.stroke();
}

// Draw `cubes` centred at (cx, cy), fitting inside a `size`-pixel box.
export function drawBuild(g, cubes, cx, cy, size) {
  if (!cubes.length) return;
  const b = bounds(cubes);
  const unit = (size * 0.86) / Math.max(b.maxX - b.minX, b.maxY - b.minY);
  const ox = cx - ((b.minX + b.maxX) / 2) * unit;
  const oy = cy - ((b.minY + b.maxY) / 2) * unit;
  const P = (x, y, z) => {
    const [sx, sy] = iso(x, y, z);
    return [ox + sx * unit, oy + sy * unit];
  };
  const filled = new Set(cubes.map((c) => c.join(',')));
  const has = (x, y, z) => filled.has(`${x},${y},${z}`);
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = Math.max(1.5, unit * 0.05);
  g.lineJoin = 'round';
  // far to near: in this view, cubes with equal x+y+z never overlap
  for (const [x, y, z] of [...cubes].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))) {
    if (!has(x, y + 1, z)) face(g, [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FACE.top);
    if (!has(x + 1, y, z)) face(g, [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], FACE.right);
    if (!has(x, y, z + 1)) face(g, [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FACE.left);
  }
  g.restore();
}

// How much of each cube shows in the picture. In this view the outline of a
// cube is a hexagon of six small triangles on a fixed lattice; each triangle
// shows the nearest cube covering it. Returns, for each cube, how many
// triangles it shows (0 = completely hidden behind others).
const HEX = [[1, 0], [1, 1], [0, 1], [-1, 0], [-1, -1], [0, -1]];
export function isoShown(cubes) {
  const owner = new Map();
  cubes.forEach(([x, y, z], i) => {
    const u = x - y, v = z - y, depth = x + y + z;
    for (let k = 0; k < 6; k++) {
      const a = HEX[k], b = HEX[(k + 1) % 6];
      const key = [[u, v], [u + a[0], v + a[1]], [u + b[0], v + b[1]]].map((p) => p.join(',')).sort().join('|');
      const cur = owner.get(key);
      if (!cur || depth > cur.depth) owner.set(key, { depth, i });
    }
  });
  const shown = cubes.map(() => 0);
  for (const { i } of owner.values()) shown[i]++;
  return shown;
}
// A picture is clear if every cube can be seen, except a cube that holds up
// another (as on paper, it must be there).
export function isoClear(cubes) {
  const set = new Set(cubes.map((c) => c.join(',')));
  const shown = isoShown(cubes);
  return cubes.every(([x, y, z], i) => shown[i] > 0 || set.has(`${x},${y + 1},${z}`));
}
