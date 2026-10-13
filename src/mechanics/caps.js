// What each gameplay mechanic can show and accept (plan §4: each mechanic
// declares its formats and label sizes; content that doesn't fit is rejected
// by validation). Mechanic ids are stable (they're in the learning log).
//
//   options     how many answers it can lay out [min, max]
//   evidenceMin answers with fewer options than this don't count as evidence
//               for Accurate or for checks (a 2-way guess is too lucky)
//   label       the widest answer label, in em of the label font
//   lines       coded lines it can show: count and width in em
//   display     display kinds it can show (see formats.js)
//   input       'tap': the answer moment is a tap or a step, so its time is
//               the thinking time; 'commit': the answer is a jump, and the
//               time to get there is taken off (moveAllowanceMs)
//   lookahead   how many items it asks for before they're shown
export const MECHANICS = {
  'choice-path': {
    name: 'Choice Path',
    options: [2, 3],
    evidenceMin: 3,
    label: { maxEm: 4.2 },
    lines: { count: 2, maxEm: 15 },
    display: ['text', 'lines', 'cubes', 'builds', 'figure', 'grid'],
    input: 'commit',
    lookahead: 1,
    moveAllowanceMs: 1200, // checked by tests/levels.test.js
  },
  'logic-lock': {
    name: 'Logic Lock',
    options: [3, 4],
    evidenceMin: 3,
    label: { maxEm: 5.6 },
    lines: { count: 2, maxEm: 15 },
    display: ['text', 'lines', 'prose', 'column', 'grid', 'figure'],
    input: 'tap',
    lookahead: 0,
  },
  'pattern-plates': {
    name: 'Pattern Plates',
    options: [3, 4],
    evidenceMin: 3,
    label: { maxEm: 3 },
    lines: { count: 0, maxEm: 0 },
    display: ['text', 'cubes', 'builds', 'grid', 'figure'],
    input: 'tap',
    lookahead: 0,
  },
};

// The worlds that host each mechanic today.
export const WORLD_MECHANIC = { obby: 'choice-path', vault: 'logic-lock', lab: 'pattern-plates' };
