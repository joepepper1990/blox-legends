// LOGIC LOCK (plan §4): a door shows the question; stepping on (or tapping)
// the pad with the answer opens it. Doors can show coded lines, questions,
// stories, written sums, shape patterns and cube builds drawn flat; picture
// answers are drawn on the door with their letters, and the pads carry the
// letters.
import * as THREE from 'three';
import { runeDoorTexture } from '../engine/textures.js';
import { paintBoard, pictureOptions, stemKind } from './board.js';

export const LOGIC_LOCK = 'logic-lock';

// The door face for a question. Plain coded lines keep the carved-rune look.
export function doorTexture(q) {
  if (stemKind(q) === 'lines' && !pictureOptions(q)) return runeDoorTexture(q.door);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f63';
  g.fillRect(0, 0, 1024, 768);
  g.strokeStyle = '#5ff2ff';
  g.shadowColor = '#5ff2ff';
  g.shadowBlur = 24;
  g.lineWidth = 10;
  g.strokeRect(36, 36, 952, 696);
  g.shadowBlur = 0;
  const pics = pictureOptions(q);
  const [x, y, w, h] = pics ? [64, 60, 896, 648] : [90, 140, 844, 488];
  g.save();
  g.translate(x, y);
  paintBoard(g, q, { w, h });
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
