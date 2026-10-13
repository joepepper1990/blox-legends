// The shared board painter (plan §4): every way a question can look, drawn
// on a 2D canvas, so a Code Vault door, a Build Lab board and a Glass Bridge
// sign all show a question the same way.
//
//   stem      coded lines, a short question, a story, a written column sum,
//             a shape pattern, or a cube build drawn flat
//   options   words or numbers, or pictures: shapes, cube builds, views
//             from above, each with its letter
import { drawSeries, drawFigure, drawBox } from '../engine/nvr-draw.js';
import { drawBuild } from '../engine/iso-draw.js';
import { doorSizePx, DOOR_FIT } from '../engine/fit.js';

const FONT = "'Lexend', Verdana, sans-serif";
const INK = '#1d2340';
export const PAPER = '#fff8e7';

const turn = (m, cubes) => (m ? cubes.map((c) => [0, 1, 2].map((r) => m[r][0] * c[0] + m[r][1] * c[1] + m[r][2] * c[2])) : cubes);

// Options shown as pictures rather than words?
export const pictureOptions = (q) => q.options.some((o) => o.figure || o.cubes || o.grid);

// What the stem is made of.
export function stemKind(q) {
  if (q.frames) return 'series';
  if (q.kind === 'tenframe') return 'tenframe';
  if (q.kind === 'nvr-odd') return 'text';
  if (q.target && q.kind !== 'top') return 'build';
  if (q.target && q.kind === 'top') return 'build';
  if (q.display?.column) return 'column';
  if (q.display?.prose) return 'prose';
  if (q.door) return 'lines';
  return 'text';
}

function fitText(g, text, maxW, maxPx, minPx = 24) {
  let px = maxPx;
  for (; px > minPx; px -= 2) {
    g.font = `700 ${px}px ${FONT}`;
    if (g.measureText(text).width <= maxW) break;
  }
  return px;
}

function centred(g, text, cx, cy) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cx, cy);
}

// Coded lines, spaced like carved runes (the same rule as the door fit check).
function paintLines(g, lines, { x, y, w, h }) {
  const scale = w / DOOR_FIT.widthPx;
  const size = Math.min(doorSizePx(lines) * scale, (h / lines.length) * 0.7);
  g.font = `700 ${size}px ${FONT}`;
  g.fillStyle = INK;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  lines.forEach((line, i) => {
    const cy = y + h / 2 + (i - (lines.length - 1) / 2) * size * 1.35;
    const chars = [...line];
    const width = chars.reduce((s, ch) => s + g.measureText(ch).width, 0) + DOOR_FIT.gapEm * size * (chars.length - 1);
    let cx = x + w / 2 - width / 2;
    for (const ch of chars) {
      g.fillText(ch, cx, cy);
      cx += g.measureText(ch).width + DOOR_FIT.gapEm * size;
    }
  });
}

function paintWrapped(g, text, { x, y, w, h }, maxPx = 64) {
  let px = maxPx;
  let lines = [text];
  for (; px >= 26; px -= 2) {
    g.font = `700 ${px}px ${FONT}`;
    lines = wrapCanvas(g, text, w);
    if (lines.length * px * 1.3 <= h) break;
  }
  g.fillStyle = INK;
  lines.forEach((l, i) => centred(g, l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * px * 1.3));
}

function wrapCanvas(g, text, w) {
  const out = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > w) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// A written sum: digits in columns, an answer line, and a box for the answer.
function paintColumn(g, rows, { x, y, w, h }) {
  const n = Math.max(...rows.map((r) => r.length));
  const cell = Math.min(w / (n + 1.5), h / (rows.length + 1.6));
  const px = cell * 1.1;
  g.font = `700 ${px}px ${FONT}`;
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const left = x + w / 2 - ((n + 0.5) * cell) / 2;
  rows.forEach((r, i) => {
    const padded = r.padStart(n, ' ');
    [...padded].forEach((ch, j) => ch !== ' ' && g.fillText(ch, left + (j + 0.5) * cell, y + (i + 0.6) * cell));
  });
  const lineY = y + (rows.length + 0.15) * cell;
  g.lineWidth = Math.max(4, cell * 0.08);
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(left - cell * 0.2, lineY);
  g.lineTo(left + (n + 0.2) * cell, lineY);
  g.stroke();
  g.fillStyle = '#ff8c42';
  g.fillText('?', left + (n - 0.5) * cell, lineY + cell * 0.65);
}

function paintGrid(g, grid, cx, cy, size) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cell = (size * 0.8) / Math.max(rows, cols);
  const ox = cx - (cols * cell) / 2;
  const oy = cy - (rows * cell) / 2;
  grid.forEach((r, z) =>
    r.forEach((v, gx) => {
      if (!v) return;
      g.fillStyle = '#ff8c42';
      g.fillRect(ox + gx * cell, oy + z * cell, cell, cell);
      g.strokeStyle = INK;
      g.lineWidth = Math.max(3, cell * 0.06);
      g.strokeRect(ox + gx * cell, oy + z * cell, cell, cell);
    }),
  );
}

// Paint the question's stem inside a box.
export function paintStem(g, q, box) {
  const kind = stemKind(q);
  const { x, y, w, h } = box;
  if (kind === 'series') {
    const n = q.frames.length + 1;
    const cell = Math.min((w - 24 * (n - 1) - 48) / n, h - 48);
    g.save();
    g.translate(x + (w - (n * cell + (n - 1) * 24 + 48)) / 2, y + (h - cell - 48) / 2);
    drawSeries(g, q.frames, { cell, gap: 24, pad: 24 });
    g.restore();
    return;
  }
  if (kind === 'tenframe') {
    // a ten-frame: 5 × 2 boxes, counters in the filled ones
    const cell = Math.min(w / 5.4, h / 2.4);
    const ox = x + w / 2 - cell * 2.5;
    const oy = y + h / 2 - cell;
    const filled = new Set(q.target.map(([cx, , cz]) => `${cx},${cz}`));
    g.lineWidth = Math.max(4, cell * 0.06);
    g.strokeStyle = INK;
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 5; c++) {
        g.fillStyle = '#ffffff';
        g.fillRect(ox + c * cell, oy + r * cell, cell, cell);
        g.strokeRect(ox + c * cell, oy + r * cell, cell, cell);
        if (filled.has(`${c},${r}`)) {
          g.fillStyle = '#ff8c42';
          g.beginPath();
          g.arc(ox + (c + 0.5) * cell, oy + (r + 0.5) * cell, cell * 0.36, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      }
    return;
  }
  if (kind === 'build') {
    const size = Math.min(w, h);
    drawBuild(g, q.target, x + w / 2, y + h / 2, size * 0.95);
    // a view from above needs to know which side is the front: in this
    // drawing the front faces down and to the left
    if (q.kind === 'top') {
      g.fillStyle = '#ff8c42';
      g.font = `700 ${size * 0.11}px ${FONT}`;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText('front ↗', x + w / 2 - size * 0.62, y + h / 2 + size * 0.38);
    }
    return;
  }
  if (kind === 'column') return paintColumn(g, q.display.column, box);
  if (kind === 'prose') return paintWrapped(g, q.display.prose.join(' '), box, 58);
  if (kind === 'lines') return paintLines(g, q.door, box);
  return paintWrapped(g, q.prompt, box, 72);
}

// Paint one option as a card: its picture (or words) and its letter.
export function paintOption(g, q, opt, { x, y, w, h }) {
  const size = Math.min(w, h - h * 0.22);
  const cx = x + w / 2;
  const cy = y + size / 2;
  g.save();
  drawBox(g, cx - size / 2, y, size);
  if (opt.figure) drawFigure(g, opt.figure, cx, cy, size);
  else if (opt.cubes) drawBuild(g, turn(opt.rot, opt.cubes), cx, cy, size * 0.9);
  else if (opt.grid) paintGrid(g, opt.grid, cx, cy, size);
  else {
    g.fillStyle = INK;
    fitText(g, String(opt.label), size * 0.85, size * 0.4);
    centred(g, String(opt.label), cx, cy);
  }
  g.fillStyle = '#ffffff';
  g.font = `700 ${h * 0.17}px ${FONT}`;
  centred(g, opt.label, cx, y + size + h * 0.12);
  g.restore();
}

// A whole board: the stem, and (for picture answers) the option cards.
export function paintBoard(g, q, { w, h, frame = true, options = pictureOptions(q) }) {
  if (frame) {
    g.fillStyle = PAPER;
    roundRect(g, 0, 0, w, h, 30);
    g.fill();
  }
  if (!options) return paintStem(g, q, { x: w * 0.06, y: h * 0.08, w: w * 0.88, h: h * 0.84 });
  const stemH = stemKind(q) === 'text' ? h * 0.22 : h * 0.46;
  paintStem(g, q, { x: w * 0.05, y: h * 0.03, w: w * 0.9, h: stemH });
  const n = q.options.length;
  const cw = (w * 0.94) / n;
  const top = h * 0.05 + stemH;
  g.fillStyle = '#4a4f63';
  roundRect(g, w * 0.02, top - h * 0.01, w * 0.96, h - top - h * 0.01, 20);
  g.fill();
  q.options.forEach((o, i) => paintOption(g, q, o, { x: w * 0.03 + i * cw + cw * 0.06, y: top + h * 0.02, w: cw * 0.88, h: h - top - h * 0.04 }));
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
