// Question formats. A format is a way of asking about a skill. Format ids are
// stable (they're stored in the learning log).
//
//   answer        number | letters | word | choice (picture options A–D)
//   direct        a direct-recall format: its answer times count towards
//                 fluency (plan §7, facts must be quick as well as right)
//   minMs         answers faster than this are rapid guesses: no evidence,
//                 no coins (plan §7, §8.1)
//   speakOptions  read the options aloud (never for spelling!)
//   transfer      used only to show the skill in a new context ("Applied")
//   minOptions    fewest options the format makes sense with
//   presentation  a transfer that shows a practice item in another world;
//                 its display needs are those of the item's own format
//   display       what a mechanic must be able to show: text (a short
//                 prompt), lines (1–2 short coded lines), prose (a few
//                 sentences), column (a written sum), cubes, builds, grid,
//                 figure (non-verbal shapes)

const f = (answer, o = {}) => ({ answer, direct: false, minMs: 900, speakOptions: true, transfer: false, display: ['text'], minOptions: 2, ...o });

export const FORMATS = {
  // ---- number facts ----
  mul: f('number', { direct: true, minMs: 600 }),
  missing: f('number', { direct: true, minMs: 700 }),
  div: f('number', { direct: true, minMs: 700 }),
  bond: f('number', { direct: true, minMs: 600 }),
  add: f('number', { direct: true, minMs: 600 }),
  sub: f('number', { direct: true, minMs: 600 }),
  double: f('number', { direct: true, minMs: 600 }),
  half: f('number', { direct: true, minMs: 600 }),
  // ---- number procedures ----
  'pv-digit': f('number', { minMs: 1000 }),
  'pv-partition': f('number', { minMs: 1000 }),
  'pv-make': f('number', { minMs: 1000 }),
  'cmp-big': f('number', { minMs: 1000 }),
  'cmp-small': f('number', { minMs: 1000 }),
  'cmp-sign': f('letters', { minMs: 1000 }),
  more: f('number', { minMs: 900 }),
  less: f('number', { minMs: 900 }),
  'steps-next': f('number', { minMs: 1000, display: ['text', 'lines'] }),
  'steps-missing': f('number', { minMs: 1000, display: ['text', 'lines'] }),
  'col-add': f('number', { minMs: 1500, display: ['column'] }),
  'col-sub': f('number', { minMs: 1500, display: ['column'] }),
  'missing-add': f('number', { minMs: 1200 }),
  'missing-sub': f('number', { minMs: 1200 }),
  // ---- alphabet and codes ----
  after: f('letters', { direct: true, minMs: 600, display: ['text', 'lines'] }),
  before: f('letters', { direct: true, minMs: 600, display: ['text', 'lines'] }),
  'two-after': f('letters', { direct: true, minMs: 700, display: ['text', 'lines'] }),
  jump: f('letters', { minMs: 900, display: ['text', 'lines'] }),
  hops: f('letters', { minMs: 1000, display: ['text', 'lines'] }),
  dist: f('number', { minMs: 1000, display: ['text', 'lines'] }),
  'pos-num': f('number', { direct: true, minMs: 600, display: ['text', 'lines'] }),
  'pos-letter': f('letters', { direct: true, minMs: 600, display: ['text', 'lines'] }),
  code: f('letters', { minMs: 1200, display: ['lines'] }),
  decode: f('letters', { minMs: 1200, display: ['lines'] }),
  series: f('letters', { minMs: 1000, display: ['lines'] }),
  pairs: f('letters', { minMs: 1000, display: ['lines'] }),
  mirror: f('letters', { minMs: 1200, display: ['lines'] }),
  unmirror: f('letters', { minMs: 1200, display: ['lines'] }),
  // ---- word-based reasoning ----
  syn: f('word', { minMs: 1200, display: ['text', 'lines'] }),
  ant: f('word', { minMs: 1200, display: ['text', 'lines'] }),
  odd: f('word', { minMs: 1500, display: ['text', 'lines'], minOptions: 3 }),
  compound: f('word', { minMs: 1200, display: ['text', 'lines'] }),
  // ---- shape ----
  count: f('number', { minMs: 1200, display: ['cubes'] }),
  rotate: f('choice', { minMs: 1500, display: ['cubes', 'builds'] }),
  top: f('choice', { minMs: 1500, display: ['cubes', 'grid'] }),
  'nvr-series': f('choice', { minMs: 1500, display: ['figure'] }),
  'nvr-odd': f('choice', { minMs: 1500, display: ['figure'] }),
  // ---- English ----
  spell: f('word', { minMs: 1200, speakOptions: false }),
  'prefix-make': f('word', { minMs: 1200 }),
  'prefix-meaning': f('word', { minMs: 1500 }),
  ly: f('word', { minMs: 1200, speakOptions: false }),
  aan: f('word', { minMs: 900 }),
  gap: f('word', { minMs: 1500, display: ['prose'] }),
  // ---- transfer contexts (plan §7 "Applied") ----
  // New questions that use the skill in another way:
  word: f('number', { minMs: 2500, display: ['prose'] }),
  array: f('number', { minMs: 1500, transfer: true, display: ['cubes'] }),
  tenframe: f('number', { minMs: 1200, transfer: true, display: ['cubes'] }),
  complete: f('number', { minMs: 1500, transfer: true, display: ['cubes'] }),
  // The same kind of item shown in another world (`base` is the practice
  // format it was made with): on the Glass Bridge, a Code Vault door, or a
  // Build Lab board.
  glass: f('letters', { minMs: 1200, transfer: true, presentation: true }),
  door: f('letters', { minMs: 1200, transfer: true, presentation: true }),
  board: f('letters', { minMs: 1200, transfer: true, presentation: true }),
};

export const isTransferFormat = (id) => !!FORMATS[id]?.transfer;
// What a question needs from a mechanic (presentation transfers keep the
// needs of the item they show).
export const displayOf = (q) => FORMATS[q.base || q.format]?.display || ['text'];
