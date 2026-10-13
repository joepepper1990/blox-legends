// Draws non-verbal reasoning figures on a 2D canvas: shapes, shading
// (white, black, grey, striped), sizes, turns and counts. Pure canvas, so the
// same drawing is used on Build Lab boards, Code Vault doors and in tests.
const INK = '#1d2340';
const FILL = { white: '#ffffff', black: INK, grey: '#9aa0b4' };
const SCALE = { 1: 0.5, 2: 0.72, 3: 0.95 };

function shapePath(g, shape, r) {
  g.beginPath();
  if (shape === 'circle') {
    g.arc(0, 0, r, 0, Math.PI * 2);
  } else if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (shape === 'arrow') {
    // points up when not turned
    const w = r * 0.32;
    const pts = [[0, -r], [r * 0.72, -r * 0.18], [w, -r * 0.18], [w, r], [-w, r], [-w, -r * 0.18], [-r * 0.72, -r * 0.18]];
    pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y));
  } else {
    const n = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 }[shape];
    const off = shape === 'square' ? Math.PI / 4 : 0;
    const rr = shape === 'triangle' ? r * 1.08 : r;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + off + (i * 2 * Math.PI) / n;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr * (shape === 'triangle' ? 1 : 1));
    }
  }
  g.closePath();
}

function one(g, fig, x, y, r) {
  g.save();
  g.translate(x, y);
  g.rotate(((fig.rot || 0) * Math.PI) / 180);
  shapePath(g, fig.shape, r);
  if (fig.fill === 'striped') {
    g.fillStyle = '#ffffff';
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = INK;
    g.lineWidth = Math.max(2, r * 0.09);
    for (let k = -r * 2; k < r * 2; k += r * 0.32) {
      g.beginPath();
      g.moveTo(k - r, -r * 1.2);
      g.lineTo(k + r, r * 1.2);
      g.stroke();
    }
    g.restore();
    shapePath(g, fig.shape, r);
  } else {
    g.fillStyle = FILL[fig.fill] || '#ffffff';
    g.fill();
  }
  g.strokeStyle = INK;
  g.lineWidth = Math.max(2.5, r * 0.08);
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
}

// Where the copies sit for each count (fractions of the half-size).
const SPOTS = {
  1: [[0, 0]],
  2: [[-0.45, 0], [0.45, 0]],
  3: [[0, -0.45], [-0.45, 0.4], [0.45, 0.4]],
  4: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]],
  5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
  6: [[-0.5, -0.5], [0, -0.5], [0.5, -0.5], [-0.5, 0.5], [0, 0.5], [0.5, 0.5]],
};

// Draw a figure centred at (cx, cy) inside a box `size` pixels across.
export function drawFigure(g, fig, cx, cy, size) {
  const half = size / 2;
  const spots = SPOTS[fig.count] || SPOTS[1];
  const r = half * SCALE[fig.size || 2] * (spots.length > 1 ? (spots.length > 4 ? 0.3 : 0.4) : 0.85);
  for (const [sx, sy] of spots) one(g, fig, cx + sx * half * 0.9, cy + sy * half * 0.9, r);
}

export function drawBox(g, x, y, size, { highlight = false } = {}) {
  g.fillStyle = '#fff8e7';
  g.strokeStyle = highlight ? '#ff8c42' : INK;
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, size, size, 18) : g.rect(x, y, size, size);
  g.fill();
  g.stroke();
}

// A strip of series frames followed by a "?" box.
export function drawSeries(g, frames, { cell = 200, gap = 24, pad = 24 } = {}) {
  const n = frames.length + 1;
  frames.forEach((f, i) => {
    const x = pad + i * (cell + gap);
    drawBox(g, x, pad, cell);
    drawFigure(g, f, x + cell / 2, pad + cell / 2, cell);
  });
  const x = pad + frames.length * (cell + gap);
  drawBox(g, x, pad, cell, { highlight: true });
  g.fillStyle = '#ff8c42';
  g.font = `700 ${cell * 0.6}px 'Lexend', Verdana, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', x + cell / 2, pad + cell / 2 + cell * 0.04);
  return { width: pad * 2 + n * cell + (n - 1) * gap, height: pad * 2 + cell };
}

// One option card: the figure with its letter underneath.
export function drawCard(g, fig, label, { cell = 220, pad = 18 } = {}) {
  drawBox(g, pad, pad, cell);
  drawFigure(g, fig, pad + cell / 2, pad + cell / 2, cell);
  if (label) {
    g.fillStyle = INK;
    g.font = `700 64px 'Lexend', Verdana, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, pad + cell / 2, pad * 2 + cell + 40);
  }
  return { width: pad * 2 + cell, height: pad * 3 + cell + (label ? 80 : 0) };
}
