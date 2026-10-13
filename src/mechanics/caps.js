// What each gameplay mechanic can show and accept (plan §4: each mechanic
// declares its formats and label sizes; content that doesn't fit is rejected
// by validation). Mechanic ids are stable (they're in the learning log).
//
//   options     how many answers it can lay out [min, max]
//   evidenceMin answers with fewer options than this don't count as evidence
//               for Accurate or for checks (a 2-way guess is too lucky)
//   label       answer labels: drawn `height` tall with `font`, shrunk to fit
//               `maxWidth` (by option count); never smaller than minHeight
//   lines       how many coded lines it can show (door lines, sign lines)
//   display     display kinds it can show (see formats.js)
//   pictures    display kinds it draws flat rather than as a 3D scene
//   input       'tap': the answer moment is a tap or a step, so its time is
//               the thinking time; 'commit': the answer is a jump, and the
//               time to get there is taken off (moveAllowanceMs)
//   lookahead   how many items it asks for before they're shown
export const MECHANICS = {
  'choice-path': {
    name: 'Choice Path',
    options: [2, 3],
    evidenceMin: 3,
    label: { height: 1.3, maxWidth: { 2: 3.1, 3: 3.1 }, minHeight: 0.8, font: { size: 90, letterSpacing: 4 } },
    lines: 2,
    display: ['text', 'lines', 'cubes', 'builds', 'figure', 'grid'],
    // the row sign and the cards over the glass are flat drawings
    pictures: ['cubes', 'builds'],
    input: 'commit',
    lookahead: 1,
    moveAllowanceMs: 1100, // the quickest row-to-row move is ~1.2 s (tests/levels.test.js)
  },
  'logic-lock': {
    name: 'Logic Lock',
    options: [3, 4],
    evidenceMin: 3,
    label: { height: 1.1, maxWidth: { 3: 2.9, 4: 2.35 }, minHeight: 0.6, font: { size: 80, letterSpacing: 8 } },
    lines: 3,
    display: ['text', 'lines', 'prose', 'column', 'grid', 'figure', 'cubes', 'builds'],
    // builds and cubes are drawn on the door as flat pictures
    // (engine/iso-draw.js), so every cube must be visible in the drawing
    pictures: ['cubes', 'builds'],
    input: 'tap',
    lookahead: 0,
  },
  'pattern-plates': {
    name: 'Pattern Plates',
    options: [3, 4],
    evidenceMin: 3,
    label: { height: 0.9, maxWidth: { 3: 2.6, 4: 2.4 }, minHeight: 0.6, font: { size: 80, letterSpacing: 8 } },
    // a board above the plates shows coded lines, a sum or a short story
    lines: 3,
    display: ['text', 'lines', 'prose', 'column', 'cubes', 'builds', 'grid', 'figure'],
    input: 'tap',
    lookahead: 0,
  },
};

// The worlds that host each mechanic today.
export const WORLD_MECHANIC = { obby: 'choice-path', vault: 'logic-lock', lab: 'pattern-plates' };
