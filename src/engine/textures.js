// Canvas-drawn textures, so the game ships with no image files.
import * as THREE from 'three';
import { DOOR_FIT, doorSizePx } from './fit.js';

const FONT = "'Lexend', Verdana, sans-serif";

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let studs;
// One tile per block unit: a soft bevel with a stud, tinted by material colour.
export function studTexture() {
  if (studs) return studs;
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(0,0,0,0.07)';
  g.fillRect(0, 122, 128, 6);
  g.fillRect(122, 0, 6, 128);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(0, 0, 128, 4);
  g.fillRect(0, 0, 4, 128);
  const grad = g.createRadialGradient(56, 56, 4, 64, 64, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(0,0,0,0.10)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 26, 0, Math.PI * 2);
  g.fill();
  studs = finish(c, true);
  studs.userData.shared = true;
  return studs;
}

// Rounded label with big readable text. `lines` may be a string or array.
export function labelTexture(lines, opts = {}) {
  const {
    size = 72,
    bg = '#fff8e7',
    fg = '#1d2340',
    border = '#1d2340',
    pad = 28,
    weight = 700,
    minWidth = 0,
    radius = 26,
    lineGap = 1.25,
    letterSpacing = 4,
  } = opts;
  const arr = Array.isArray(lines) ? lines : [lines];
  const [m, mg] = canvas(8, 8);
  mg.font = `${weight} ${size}px ${FONT}`;
  const widthOf = (s) => mg.measureText(s).width + letterSpacing * Math.max(0, s.length - 1);
  const textW = Math.max(...arr.map(widthOf), minWidth);
  const w = Math.ceil(textW + pad * 2);
  const h = Math.ceil(size * lineGap * arr.length + pad * 1.6);
  const [c, g] = canvas(w, h);
  if (bg) {
    g.fillStyle = bg;
    g.strokeStyle = border;
    g.lineWidth = 8;
    roundRect(g, 4, 4, w - 8, h - 8, radius);
    g.fill();
    if (border) g.stroke();
  }
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  arr.forEach((line, i) => {
    const lw = widthOf(line);
    let x = (w - lw) / 2;
    const y = h / 2 + (i - (arr.length - 1) / 2) * size * lineGap;
    if (letterSpacing) {
      for (const ch of line) {
        g.fillText(ch, x, y);
        x += mg.measureText(ch).width + letterSpacing;
      }
    } else {
      g.fillText(line, x, y);
    }
  });
  const t = finish(c);
  return { texture: t, aspect: w / h };
}

export function labelSprite(lines, height = 1, opts = {}) {
  const { texture, aspect } = labelTexture(lines, opts);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: opts.depthTest ?? true, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(height * aspect, height, 1);
  s.renderOrder = opts.renderOrder ?? 2;
  return s;
}

export function setSpriteText(sprite, lines, height, opts = {}) {
  const { texture, aspect } = labelTexture(lines, opts);
  sprite.material.map?.dispose();
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  sprite.scale.set(height * aspect, height, 1);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function faceTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#1d2340';
  g.beginPath();
  g.ellipse(42, 52, 9, 13, 0, 0, Math.PI * 2);
  g.ellipse(86, 52, 9, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(45, 47, 3.5, 0, Math.PI * 2);
  g.arc(89, 47, 3.5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1d2340';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(64, 74, 22, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  return finish(c);
}

export function botFaceTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#16203f';
  roundRect(g, 10, 22, 108, 84, 20);
  g.fill();
  g.fillStyle = '#5ff2ff';
  g.shadowColor = '#5ff2ff';
  g.shadowBlur = 16;
  roundRect(g, 30, 44, 22, 30, 8);
  g.fill();
  roundRect(g, 76, 44, 22, 30, 8);
  g.fill();
  g.fillRect(48, 86, 32, 6);
  return finish(c);
}

export function gradientTexture(top, bottom) {
  const [c, g] = canvas(4, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return finish(c);
}

export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return finish(c);
}

// Swirly portal surface; scrolled in the shader-free way by offsetting UVs.
export function swirlTexture(color) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.18})`;
    g.lineWidth = 2 + Math.random() * 6;
    g.beginPath();
    const r = 20 + Math.random() * 110;
    g.arc(128, 128, r, Math.random() * 6, Math.random() * 6 + 1.5);
    g.stroke();
  }
  return finish(c, true);
}

// A door/stone face with the puzzle written on it.
export function runeDoorTexture(lines) {
  const [c, g] = canvas(1024, 768);
  g.fillStyle = '#4a4f63';
  g.fillRect(0, 0, 1024, 768);
  for (let y = 0; y < 768; y += 96)
    for (let x = (y / 96) % 2 ? -64 : 0; x < 1024; x += 128) {
      g.fillStyle = `rgba(255,255,255,${0.03 + ((x * 7 + y) % 5) * 0.01})`;
      g.fillRect(x + 3, y + 3, 122, 90);
    }
  g.strokeStyle = '#5ff2ff';
  g.shadowColor = '#5ff2ff';
  g.shadowBlur = 24;
  g.lineWidth = 10;
  roundRect(g, 36, 36, 952, 696, 40);
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = '#fff8e7';
  roundRect(g, 90, 140, 844, 488, 30);
  g.fill();
  g.fillStyle = '#1d2340';
  g.textBaseline = 'middle';
  // Letters are spaced out like carved runes; the size shrinks so every line
  // fits the 844 px panel (DOOR_FIT is the same rule validate-content checks).
  const size = doorSizePx(lines);
  g.font = `700 ${size}px ${FONT}`;
  lines.forEach((line, i) => {
    const y = 384 + (i - (lines.length - 1) / 2) * size * 1.35;
    const chars = [...line];
    const w = chars.reduce((s, ch) => s + g.measureText(ch).width, 0) + DOOR_FIT.gapEm * size * (chars.length - 1);
    let x = 512 - w / 2;
    for (const ch of chars) {
      g.fillText(ch, x, y);
      x += g.measureText(ch).width + DOOR_FIT.gapEm * size;
    }
  });
  return finish(c);
}

// Top-view plan picture (filled squares) for bird's-eye questions.
export function gridTexture(grid, label) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cell = 90;
  const w = 512;
  const h = 512;
  const [c, g] = canvas(w, h);
  g.fillStyle = '#fff8e7';
  roundRect(g, 4, 4, w - 8, h - 8, 30);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#1d2340';
  g.stroke();
  const ox = (w - cols * cell) / 2;
  const oy = (h - 60 - rows * cell) / 2 + 10;
  grid.forEach((r, z) =>
    r.forEach((v, x) => {
      if (!v) return;
      g.fillStyle = '#ff8c42';
      g.fillRect(ox + x * cell, oy + z * cell, cell, cell);
      g.strokeStyle = '#1d2340';
      g.lineWidth = 6;
      g.strokeRect(ox + x * cell, oy + z * cell, cell, cell);
    }),
  );
  g.fillStyle = '#1d2340';
  g.font = `700 54px ${FONT}`;
  g.textBaseline = 'middle';
  const lw = g.measureText(label).width;
  g.fillText(label, w / 2 - lw / 2, h - 44);
  return finish(c);
}
