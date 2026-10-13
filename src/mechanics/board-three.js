// Boards as three.js textures and sprites (the painting is in board.js).
import * as THREE from 'three';
import { paintBoard, paintOption, paintStem, PAPER, roundRect } from './board.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};
const texture = (c) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// The whole question on one board (stem, plus picture answers if any).
export function boardTexture(q, { w = 1024, h = 768, options } = {}) {
  const [c, g] = canvas(w, h);
  paintBoard(g, q, { w, h, options });
  return texture(c);
}

// Just the stem, on a paper card.
export function stemTexture(q, { w = 1024, h = 512 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = PAPER;
  roundRect(g, 4, 4, w - 8, h - 8, 30);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#1d2340';
  g.stroke();
  paintStem(g, q, { x: w * 0.05, y: h * 0.07, w: w * 0.9, h: h * 0.86 });
  return texture(c);
}

// One answer as a card: its picture and letter.
export function optionTexture(q, opt, { size = 512 } = {}) {
  const [c, g] = canvas(size, Math.round(size * 1.25));
  g.fillStyle = 'rgba(29,35,64,0.92)';
  roundRect(g, 0, 0, size, size * 1.25, 30);
  g.fill();
  paintOption(g, q, opt, { x: size * 0.06, y: size * 0.05, w: size * 0.88, h: size * 1.15 });
  return texture(c);
}

export function sprite(tex, height, aspect) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.set(height * aspect, height, 1);
  s.renderOrder = 2;
  return s;
}
