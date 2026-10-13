// Can this mechanic show this question properly? (plan §4: content that
// doesn't fit a mechanic is rejected.) Returns null if it fits, otherwise the
// reason. Pure: used by the scheduler at run time and by validation.
import { MECHANICS } from './caps.js';
import { FORMATS } from '../learning/formats.js';
import { fitLabelHeight, doorFits } from '../engine/fit.js';

export function fitsMechanic(q, mechId) {
  const m = MECHANICS[mechId];
  if (!m) return `unknown mechanic ${mechId}`;
  const n = q.options.length;
  if (n < m.options[0] || n > m.options[1]) return `${n} options`;
  const fmt = FORMATS[q.format];
  if (!fmt) return `unknown format ${q.format}`;
  if (!fmt.display.some((d) => m.display.includes(d))) return `can't show ${fmt.display.join('/')}`;
  const maxW = m.label.maxWidth[n];
  for (const o of q.options) {
    const h = fitLabelHeight(o.label, m.label.height, maxW, m.label.font);
    if (h < m.label.minHeight) return `answer "${o.label}" is too long`;
  }
  if (q.door) {
    if (q.door.length > m.lines) return `${q.door.length} coded lines`;
    if (!doorFits(q.door)) return 'coded lines too wide';
  }
  return null;
}
