// The skill registry: every small thing the Kent Test / Shepway Test relies
// on, from Year 2 foundations to test standard.
//
// Ids are STABLE: they are stored in saves and in the learning log, so an id
// is never renamed, reused or removed (tests/registry.test.js checks this
// against src/learning/ids-lock.js).
//
// Fields
//   id        stable id; prefix = subject (m maths, v verbal reasoning,
//             s spatial / non-verbal, e English)
//   zone      number | word | code | shape  (the realm zone that trains it)
//   area      legacy world grouping (maths | verbal | spatial | english)
//   strand    curriculum strand, for the dashboard and the Term Tracker
//   realm     the term it belongs to (see calendar.js REALMS)
//   cls       fact | procedural | authored  (plan §6.3: repetition rules)
//   core      needed for boss readiness (plan §7)
//   gen       generator family (gen/index.js)
//   formats   practice formats (formats.js)
//   home      the mechanic it is mostly practised in (default: its zone's)
//   transfer  [{mech, format}] contexts that count towards "Applied"
//   appliedMechs  how many different mechanics its transfer answers must
//             come from for "Applied" (2, or 1 where only one other world can
//             show it yet: a story needs a board, a view from above a 3D build)
//   target    the band (1–5) at which Accurate is judged for this realm
//   pre       skills that should be at Practising or above first
//   status    live (scheduled now) | ready (built and validated, not yet
//             scheduled) | planned
//
// Order inside a zone matters: the curriculum order the scheduler follows.

export const ZONES = {
  number: { name: 'Number', home: 'choice-path', legacy: 'maths' },
  word: { name: 'Word', home: null, legacy: 'english' }, // Word portals arrive in R0.9
  code: { name: 'Code', home: 'logic-lock', legacy: 'verbal' },
  shape: { name: 'Shape', home: 'pattern-plates', legacy: 'spatial' },
};

// Legacy grouping used by the original three worlds and the dashboard.
export const AREAS = {
  maths: { name: 'Maths', world: 'obby', zone: 'number' },
  verbal: { name: 'Verbal reasoning', world: 'vault', zone: 'code' },
  spatial: { name: 'Spatial reasoning', world: 'lab', zone: 'shape' },
};

const N = (o) => ({ zone: 'number', area: 'maths', appliedMechs: 2, ...o });
const V = (o) => ({ zone: 'code', area: 'verbal', appliedMechs: 2, ...o });
const S = (o) => ({ zone: 'shape', area: 'spatial', appliedMechs: 2, ...o });
const E = (o) => ({ zone: 'word', area: 'english', appliedMechs: 2, ...o });

// Transfer contexts (plan §7 "Applied": 3 correct across 2 mechanics).
// `glass`, `door` and `board` show a practice item in the Glass Bridge, Code
// Vault or Build Lab; `word`, `array`, `tenframe` and `complete` are new
// questions that use the skill another way.
const NUM_T = [{ mech: 'logic-lock', format: 'word' }, { mech: 'pattern-plates', format: 'board' }];
const NUM_SHOW_T = [{ mech: 'logic-lock', format: 'door' }, { mech: 'pattern-plates', format: 'board' }];
const TABLE_T = [{ mech: 'pattern-plates', format: 'array' }, { mech: 'logic-lock', format: 'word' }];
const CODE_T = [{ mech: 'choice-path', format: 'glass' }, { mech: 'pattern-plates', format: 'board' }];
const WORD_VR_T = [{ mech: 'choice-path', format: 'glass' }, { mech: 'pattern-plates', format: 'board' }];
const CUBE_T = [{ mech: 'choice-path', format: 'glass' }, { mech: 'pattern-plates', format: 'complete' }];
const SHAPE_T = [{ mech: 'choice-path', format: 'glass' }, { mech: 'logic-lock', format: 'door' }];

const table = (t, realm, pre, extra = {}) =>
  N({
    id: `m.x${t}`,
    strand: 'mult-facts',
    name: `${t} times table`,
    realm,
    cls: 'fact',
    gen: 'table',
    params: { t },
    formats: ['mul', 'missing', 'div'],
    transfer: TABLE_T,
    target: 3,
    pre,
    status: 'live',
    ...extra,
  });

export const SKILLS = [
  // ================= NUMBER (Glass Bridge) =================
  N({ id: 'm.bonds10', strand: 'add-facts', name: 'Number bonds to 10 and 20', realm: 'found', cls: 'fact', gen: 'bonds10', formats: ['bond'], transfer: [{ mech: 'pattern-plates', format: 'tenframe' }, { mech: 'logic-lock', format: 'word' }], target: 2, pre: [], status: 'live' }),
  N({ id: 'm.add20', strand: 'add-facts', name: 'Adding within 20', realm: 'found', cls: 'fact', gen: 'add20', formats: ['add'], transfer: NUM_T, target: 2, pre: ['m.bonds10'], status: 'live' }),
  table(2, 'found', []),
  table(10, 'found', []),
  table(5, 'found', ['m.x10']),
  N({ id: 'm.sub20', strand: 'add-facts', name: 'Taking away within 20', realm: 'found', cls: 'fact', gen: 'sub20', formats: ['sub'], transfer: NUM_T, target: 2, pre: ['m.add20'], status: 'live' }),
  table(3, 'y3-aut', ['m.x2'], { core: true }),
  table(4, 'y3-aut', ['m.x2'], { core: true }),
  N({ id: 'm.double', strand: 'add-facts', name: 'Doubles to 20 and halves to 40', realm: 'found', cls: 'fact', gen: 'double', formats: ['double', 'half'], transfer: NUM_T, target: 2, pre: ['m.x2', 'm.add20'], status: 'live' }),
  table(8, 'y3-aut', ['m.x4'], { core: true }),
  N({ id: 'm.bonds100', strand: 'add-facts', name: 'Number bonds to 100', realm: 'found', cls: 'fact', gen: 'bonds100', formats: ['bond'], transfer: NUM_T, target: 3, pre: ['m.bonds10', 'm.x10'], status: 'live' }),
  table(6, 'y4-aut', ['m.x3']),
  table(9, 'y4-aut', ['m.x10', 'm.x3']),
  table(11, 'y4-aut', ['m.x10']),
  table(7, 'y4-aut', ['m.x5', 'm.x2']),
  table(12, 'y4-aut', ['m.x10', 'm.x6']),
  // ---- Year 3 Autumn ----
  N({ id: 'm.pv3', strand: 'place-value', name: 'Place value in 3-digit numbers', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'pv3', formats: ['pv-digit', 'pv-partition', 'pv-make'], transfer: NUM_SHOW_T, target: 3, pre: [], status: 'live' }),
  N({ id: 'm.cmp3', strand: 'place-value', name: 'Comparing and ordering numbers to 1,000', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'cmp3', formats: ['cmp-big', 'cmp-small', 'cmp-sign'], transfer: NUM_SHOW_T, target: 3, pre: ['m.pv3'], status: 'live' }),
  N({ id: 'm.more', strand: 'place-value', name: '10 or 100 more or less', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'more', formats: ['more', 'less'], transfer: NUM_SHOW_T, target: 3, pre: ['m.pv3'], status: 'live' }),
  N({ id: 'm.steps', strand: 'place-value', name: 'Counting in 4s, 8s, 50s and 100s', realm: 'y3-aut', cls: 'procedural', gen: 'steps', formats: ['steps-next', 'steps-missing'], transfer: NUM_SHOW_T, target: 3, pre: ['m.x4'], status: 'live' }),
  N({ id: 'm.add3m', strand: 'add-sub', name: 'Adding ones, tens or hundreds to a 3-digit number', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'add3m', formats: ['add'], transfer: NUM_T, target: 3, pre: ['m.pv3', 'm.add20'], status: 'live' }),
  N({ id: 'm.sub3m', strand: 'add-sub', name: 'Taking ones, tens or hundreds from a 3-digit number', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'sub3m', formats: ['sub'], transfer: NUM_T, target: 3, pre: ['m.pv3', 'm.sub20'], status: 'live' }),
  N({ id: 'm.addcol', strand: 'add-sub', name: 'Column addition with exchange', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'addcol', formats: ['col-add'], home: 'logic-lock', transfer: NUM_T, target: 3, pre: ['m.add3m'], status: 'live' }),
  N({ id: 'm.subcol', strand: 'add-sub', name: 'Column subtraction with exchange', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'subcol', formats: ['col-sub'], home: 'logic-lock', transfer: NUM_T, target: 3, pre: ['m.sub3m'], status: 'live' }),
  N({ id: 'm.inverse', strand: 'add-sub', name: 'Missing numbers and inverse operations', realm: 'y3-aut', cls: 'procedural', gen: 'inverse', formats: ['missing-add', 'missing-sub'], transfer: NUM_SHOW_T, target: 3, pre: ['m.add3m', 'm.sub3m'], status: 'live' }),
  N({ id: 'm.double2', strand: 'add-sub', name: 'Doubling and halving bigger numbers', realm: 'y3-aut', cls: 'procedural', gen: 'double2', formats: ['double', 'half'], transfer: NUM_T, target: 3, pre: ['m.double', 'm.pv3'], status: 'live' }),
  N({ id: 'm.wp1', strand: 'problems', name: 'One-step word problems', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'wp1', formats: ['word'], home: 'logic-lock', transfer: [{ mech: 'pattern-plates', format: 'board' }], appliedMechs: 1, target: 3, pre: ['m.add3m', 'm.sub3m', 'm.x3'], status: 'live' }),

  // ================= CODE (Code Vault) =================
  V({ id: 'v.alphaNext', strand: 'alphabet', name: 'Alphabet order', realm: 'found', cls: 'fact', gen: 'alphaNext', formats: ['after', 'before', 'two-after'], transfer: CODE_T, target: 2, pre: [], status: 'live' }),
  V({ id: 'v.alphaJump', strand: 'alphabet', name: 'Jumping along the alphabet', realm: 'y3-aut', cls: 'procedural', gen: 'alphaJump', formats: ['jump', 'hops', 'dist'], transfer: CODE_T, target: 3, pre: ['v.alphaNext'], status: 'live' }),
  V({ id: 'v.alphaPos', strand: 'alphabet', name: 'Letter positions (E5 J10 O15 T20 Y25)', realm: 'y3-aut', cls: 'fact', gen: 'alphaPos', formats: ['pos-num', 'pos-letter'], transfer: CODE_T, target: 3, pre: ['v.alphaNext'], status: 'live' }),
  V({ id: 'v.code1', strand: 'codes', name: 'Letter codes (+1 / −1)', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'code1', formats: ['code'], transfer: CODE_T, target: 3, pre: ['v.alphaJump'], status: 'live' }),
  V({ id: 'v.series', strand: 'series', name: 'Letter series', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'series', formats: ['series'], transfer: CODE_T, target: 3, pre: ['v.alphaJump'], status: 'live' }),
  V({ id: 'v.codeN', strand: 'codes', name: 'Letter codes (bigger jumps)', realm: 'y3-aut', cls: 'procedural', gen: 'codeN', formats: ['code'], transfer: CODE_T, target: 3, pre: ['v.code1'], status: 'live' }),
  V({ id: 'v.decode', strand: 'codes', name: 'Cracking a code backwards', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'decode', formats: ['decode'], transfer: CODE_T, target: 3, pre: ['v.code1'], status: 'live' }),
  V({ id: 'v.pairs', strand: 'series', name: 'Letter pair series', realm: 'y3-aut', cls: 'procedural', gen: 'pairs', formats: ['pairs'], transfer: CODE_T, target: 3, pre: ['v.series'], status: 'live' }),
  V({ id: 'v.mirror', strand: 'codes', name: 'Mirror codes (A↔Z)', realm: 'y3-aut', cls: 'procedural', gen: 'mirror', formats: ['mirror', 'unmirror'], transfer: CODE_T, target: 3, pre: ['v.codeN', 'v.alphaPos'], status: 'live' }),
  // ---- Year 3 Autumn word-based reasoning (authored banks) ----
  V({ id: 'v.syn', strand: 'vocab', name: 'Words that mean the same (synonyms)', realm: 'y3-aut', cls: 'authored', core: true, gen: 'syn', formats: ['syn'], transfer: WORD_VR_T, target: 3, pre: [], status: 'live' }),
  V({ id: 'v.ant', strand: 'vocab', name: 'Opposites (antonyms)', realm: 'y3-aut', cls: 'authored', core: true, gen: 'ant', formats: ['ant'], transfer: WORD_VR_T, target: 3, pre: [], status: 'live' }),
  V({ id: 'v.odd', strand: 'vocab', name: 'Odd one out (words)', realm: 'y3-aut', cls: 'authored', core: true, gen: 'odd', formats: ['odd'], transfer: WORD_VR_T, target: 3, pre: ['v.syn'], status: 'live' }),
  V({ id: 'v.compound', strand: 'vocab', name: 'Compound words', realm: 'y3-aut', cls: 'authored', gen: 'compound', formats: ['compound'], transfer: WORD_VR_T, target: 3, pre: [], status: 'live' }),

  // ================= SHAPE (Build Lab) =================
  S({ id: 's.count1', strand: 'cubes', name: 'Counting blocks', realm: 'found', cls: 'procedural', gen: 'count1', formats: ['count'], transfer: CUBE_T, target: 2, pre: [], status: 'live' }),
  S({ id: 's.rotY', strand: 'cubes', name: 'Same build, turned round', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'rotY', formats: ['rotate'], transfer: SHAPE_T, target: 3, pre: [], status: 'live' }),
  S({ id: 's.top', strand: 'cubes', name: 'Bird’s-eye view', realm: 'y3-aut', cls: 'procedural', gen: 'top', formats: ['top'], transfer: [{ mech: 'choice-path', format: 'glass' }], appliedMechs: 1, target: 3, pre: ['s.count1'], status: 'live' }),
  S({ id: 's.count2', strand: 'cubes', name: 'Counting hidden blocks', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'count2', formats: ['count'], transfer: CUBE_T, target: 3, pre: ['s.count1'], status: 'live' }),
  S({ id: 's.rot3', strand: 'cubes', name: 'Same build, any turn', realm: 'y3-aut', cls: 'procedural', gen: 'rot3', formats: ['rotate'], transfer: SHAPE_T, target: 3, pre: ['s.rotY'], status: 'live' }),
  S({ id: 's.count3', strand: 'cubes', name: 'Counting tall builds', realm: 'y3-aut', cls: 'procedural', gen: 'count3', formats: ['count'], transfer: CUBE_T, target: 3, pre: ['s.count2'], status: 'live' }),
  // ---- Year 3 Autumn non-verbal reasoning ----
  S({ id: 's.nvrSeries', strand: 'nvr', name: 'Shape patterns: what comes next?', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'nvrSeries', formats: ['nvr-series'], transfer: SHAPE_T, target: 3, pre: [], status: 'live' }),
  S({ id: 's.nvrOdd', strand: 'nvr', name: 'Shape odd one out', realm: 'y3-aut', cls: 'procedural', core: true, gen: 'nvrOdd', formats: ['nvr-odd'], transfer: SHAPE_T, target: 3, pre: [], status: 'live' }),

  // ================= WORD (Word portals arrive in R0.9) =================
  E({ id: 'e.spell34', strand: 'spelling', name: 'Year 3/4 spelling words', realm: 'y3-aut', cls: 'fact', core: true, gen: 'spell34', formats: ['spell'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.prefix', strand: 'spelling', name: 'Prefixes: un-, dis-, mis-, re-, in-, im-', realm: 'y3-aut', cls: 'authored', core: true, gen: 'prefix', formats: ['prefix-make', 'prefix-meaning'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.ly', strand: 'spelling', name: 'Adding -ly', realm: 'y3-aut', cls: 'fact', gen: 'ly', formats: ['ly'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.aan', strand: 'grammar', name: 'a or an', realm: 'y3-aut', cls: 'authored', gen: 'aan', formats: ['aan'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.conj', strand: 'grammar', name: 'Conjunctions (when, if, because, although)', realm: 'y3-aut', cls: 'authored', core: true, gen: 'conj', formats: ['gap'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.prep', strand: 'grammar', name: 'Prepositions', realm: 'y3-aut', cls: 'authored', gen: 'prep', formats: ['gap'], transfer: [], target: 3, pre: [], status: 'ready' }),
  E({ id: 'e.adverb', strand: 'grammar', name: 'Adverbs of time, place and manner', realm: 'y3-aut', cls: 'authored', gen: 'adverb', formats: ['gap'], transfer: [], target: 3, pre: [], status: 'ready' }),
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// Skills the game schedules now.
export const isLive = (s) => s.status === 'live';
export const liveSkills = () => SKILLS.filter(isLive);

// Legacy: the original worlds pick from these (live only, in order).
export const skillsInArea = (area) => SKILLS.filter((s) => s.area === area && isLive(s));
export const skillsInZone = (zone) => SKILLS.filter((s) => s.zone === zone);
