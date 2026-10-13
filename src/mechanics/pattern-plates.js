// PATTERN PLATES (plan §4): step on the plate in front of your answer. Builds
// stand in 3D; anything else goes on a board at the back, and picture
// answers stand over their plates. The Build Lab lays these out.
import * as THREE from 'three';
import { cubeBuild, box } from '../engine/blocks.js';
import { stemTexture, optionTexture } from './board-three.js';

export const PATTERN_PLATES = 'pattern-plates';

// Blocks inside a see-through w × d × h frame ("how many more fill it?").
export function frameBuild(q, size = 1) {
  const b = cubeBuild(q.target, 0xff8c42, size);
  const { w, d, h } = q.frame;
  const centre = b.userData.centre;
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w * size, h * size, d * size)),
    new THREE.LineBasicMaterial({ color: 0x2f7cf6 }),
  );
  frame.position.set(((w - 1) / 2 - centre[0]) * size, ((h - 1) / 2 - centre[1]) * size, ((d - 1) / 2 - centre[2]) * size);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w * size, h * size, d * size),
    new THREE.MeshLambertMaterial({ color: 0x9fd7ff, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  glass.position.copy(frame.position);
  b.add(frame, glass);
  return b;
}

// The question board on two legs; its bottom edge stays above the cards.
export function questionBoard(q, { y = 5.2, z = -11, w = 10, h = 5 } = {}) {
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: stemTexture(q, { w: 1024, h: 512 }) }));
  board.position.set(0, y, z);
  const legs = [-w * 0.45, w * 0.45].map((x) => {
    const leg = box(0.4, y - h / 2 - 0.2, 0.4, 0x5b6478);
    leg.position.set(x, (y - h / 2 - 0.2) / 2, z - 0.1);
    return leg;
  });
  return { board, legs };
}

// A picture answer on a small stand.
export function answerCard(q, opt, { x, z = -5, y = 2 } = {}) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ map: optionTexture(q, opt), transparent: true }));
  card.position.set(x, y, z);
  const stand = box(0.3, 0.8, 0.3, 0x5b6478);
  stand.position.set(x, 0.4, z);
  return { card, stand };
}
