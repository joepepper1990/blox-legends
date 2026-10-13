// CHOICE PATH (plan §4): jump onto the glass with the right answer. Words go
// on labels over the glass, picture answers on cards; a question's picture
// goes in the question panel beside its words. The Glass Bridge lays these
// out.
import * as THREE from 'three';
import { optionTexture } from './board-three.js';
import { paintStem, stemKind } from './board.js';

export const CHOICE_PATH = 'choice-path';

// A picture answer standing over its glass.
export function glassCard(q, opt) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: optionTexture(q, opt, { size: 384 }), transparent: true }));
  s.scale.set(1.9, 2.4, 1);
  s.position.y = 1.45;
  return s;
}

// The question's picture for the question panel (null for plain questions).
export function questionPicture(q) {
  if (stemKind(q) === 'text') return null;
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 300;
  paintStem(c.getContext('2d'), q, { x: 10, y: 10, w: 700, h: 280 });
  return c;
}
