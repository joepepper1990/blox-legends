// Can this mechanic show this question properly? (plan §4: content that
// doesn't fit a mechanic is rejected.) Returns null if it fits, otherwise the
// reason. Pure: used by the scheduler at run time and by validation.
import { MECHANICS } from './caps.js';
import { FORMATS, displayOf } from '../learning/formats.js';
import { fitLabelHeight, doorFits, proseFits } from '../engine/fit.js';
import { isoClear } from '../engine/iso-draw.js';

// A reason that only rules out this particular item: the runtime asks for
// another one (makeItem's accept) instead of rejecting the content.
export const HIDDEN = 'a cube is hidden in the picture';

export function fitsMechanic(q, mechId) {
  const m = MECHANICS[mechId];
  if (!m) return `unknown mechanic ${mechId}`;
  const n = q.options.length;
  if (n < m.options[0] || n > m.options[1]) return `${n} options`;
  if (!FORMATS[q.format] || (q.base && !FORMATS[q.base])) return `unknown format ${q.base || q.format}`;
  // a presentation transfer is shown the way its original format needs
  const display = displayOf(q);
  if (!display.some((d) => m.display.includes(d))) return `can't show ${display.join('/')}`;
  const maxW = m.label.maxWidth[n];
  for (const o of q.options) {
    const h = fitLabelHeight(o.label, m.label.height, maxW, m.label.font);
    if (h < m.label.minHeight) return `answer "${o.label}" is too long`;
  }
  if (display.includes('prose') && !proseFits(q.prompt)) return 'story too long';
  if (m.pictures?.some((d) => display.includes(d))) {
    const turn = (m, cubes) => (m ? cubes.map((c) => [0, 1, 2].map((r) => m[r][0] * c[0] + m[r][1] * c[1] + m[r][2] * c[2])) : cubes);
    const builds = [q.target, ...q.options.map((o) => o.cubes && turn(o.rot, o.cubes))].filter((c) => Array.isArray(c) && c.length);
    if (builds.some((c) => !isoClear(c))) return HIDDEN;
  }
  if (q.door) {
    if (q.door.length > m.lines) return `${q.door.length} coded lines`;
    if (!doorFits(q.door)) return 'coded lines too wide';
  }
  return null;
}
