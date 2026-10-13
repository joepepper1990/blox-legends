// Generator families, by the `gen` id in the skill registry. A generator has
//   formatsAt(skill, band) → formats it can ask at this band
//   items(skill, band)     → item keys (fact and authored skills only)
//   make(skill, { band, format, count, rng, item }) → a v2 question
import * as facts from './number-facts.js';
import * as verbal from './verbal.js';
import * as shape from './shape.js';

export const GEN = {
  table: facts.table,
  bonds10: facts.bonds10,
  add20: facts.add20,
  sub20: facts.sub20,
  double: facts.double,
  bonds100: facts.bonds100,
  alphaNext: verbal.alphaNext,
  alphaPos: verbal.alphaPos,
  alphaJump: verbal.alphaJump,
  code1: verbal.code1,
  codeN: verbal.codeN,
  decode: verbal.decode,
  mirror: verbal.mirror,
  series: verbal.series,
  pairs: verbal.pairs,
  count1: shape.count1,
  count2: shape.count2,
  count3: shape.count3,
  rotY: shape.rotY,
  rot3: shape.rot3,
  top: shape.top,
};

export function addGenerators(more) {
  Object.assign(GEN, more);
}
