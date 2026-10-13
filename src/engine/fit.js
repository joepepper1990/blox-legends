// Text fitting rules shared by the game (textures, pads, glass) and by
// tools/validate-content.mjs, which proves every question's text fits the
// mechanic that shows it. Widths come from real Lexend metrics.
import { textEm } from './font-metrics.js';

// Coded lines on a door: letters spaced like runes, shrinking to fit.
export const DOOR_FIT = { widthPx: 800, maxPx: 120, minPx: 56, gapEm: 0.14, maxLines: 3 };
const widestEm = (lines) => Math.max(...lines.map((l) => textEm(l, DOOR_FIT.gapEm)));
export const doorSizePx = (lines) =>
  Math.max(DOOR_FIT.minPx, Math.min(DOOR_FIT.maxPx, Math.floor(DOOR_FIT.widthPx / widestEm(lines)), lines.length > 2 ? 84 : DOOR_FIT.maxPx));
export const doorFits = (lines) => lines.length <= DOOR_FIT.maxLines && Math.floor(DOOR_FIT.widthPx / widestEm(lines)) >= DOOR_FIT.minPx;

// A label sprite (labelTexture): width / height for a line of text.
export function labelAspect(text, { size = 72, letterSpacing = 4, pad = 28, lineGap = 1.25 } = {}) {
  const s = String(text);
  const w = textEm(s) * size + letterSpacing * Math.max(0, s.length - 1) + pad * 2;
  const h = size * lineGap + pad * 1.6;
  return w / h;
}
// The tallest a label can be while staying within maxWidth.
export const fitLabelHeight = (text, height, maxWidth, opts) => Math.min(height, maxWidth / labelAspect(text, opts));
