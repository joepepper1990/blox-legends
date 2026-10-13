// Generator families, by the `gen` id in the skill registry. A generator has
//   formatsAt(skill, band) → formats it can ask at this band
//   items(skill, band)     → item keys (fact and authored skills only)
//   make(skill, { band, format, count, rng, item }) → a v2 question
import * as facts from './number-facts.js';
import * as verbal from './verbal.js';
import * as shape from './shape.js';
import * as y3 from './number-y3.js';
import * as cw from './code-words.js';
import * as nvr from './nvr.js';

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
  pv3: y3.pv3,
  cmp3: y3.cmp3,
  more: y3.more,
  steps: y3.steps,
  add3m: y3.add3m,
  sub3m: y3.sub3m,
  addcol: y3.addcol,
  subcol: y3.subcol,
  inverse: y3.inverse,
  double2: y3.double2,
  wp1: y3.wp1,
  syn: cw.syn,
  ant: cw.ant,
  odd: cw.odd,
  compound: cw.compound,
  nvrSeries: nvr.nvrSeries,
  nvrOdd: nvr.nvrOdd,
};

export function addGenerators(more) {
  Object.assign(GEN, more);
}
