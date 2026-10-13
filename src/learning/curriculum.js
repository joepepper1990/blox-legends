// The curriculum map: what each term should teach (plan §3 spine), mapped to
// skills. Year 3 Autumn is complete; later terms are listed from the approved
// spine and get skills when their content pack is built.
//
// Objective ids are stable (the Term Tracker remembers progress by them).
// Statements paraphrase the National Curriculum programme of study and the
// GL / Shepway question types they feed.

export const OBJECTIVES = [
  // ---------------- Year 3 Autumn: Autumn Woods ----------------
  // Number
  { id: 'y3a.n1', realm: 'y3-aut', zone: 'number', text: 'Know the value of each digit in a 3-digit number (hundreds, tens, ones)', skills: ['m.pv3'] },
  { id: 'y3a.n2', realm: 'y3-aut', zone: 'number', text: 'Compare and order numbers up to 1,000', skills: ['m.cmp3'] },
  { id: 'y3a.n3', realm: 'y3-aut', zone: 'number', text: 'Find 10 or 100 more or less than a number', skills: ['m.more'] },
  { id: 'y3a.n4', realm: 'y3-aut', zone: 'number', text: 'Count in 4s, 8s, 50s and 100s', skills: ['m.steps'] },
  { id: 'y3a.n5', realm: 'y3-aut', zone: 'number', text: 'Add and subtract ones, tens or hundreds to and from a 3-digit number in your head', skills: ['m.add3m', 'm.sub3m'] },
  { id: 'y3a.n6', realm: 'y3-aut', zone: 'number', text: 'Add and subtract 3-digit numbers with the column method', skills: ['m.addcol', 'm.subcol'] },
  { id: 'y3a.n7', realm: 'y3-aut', zone: 'number', text: 'Solve missing-number problems using inverse operations', skills: ['m.inverse'] },
  { id: 'y3a.n8', realm: 'y3-aut', zone: 'number', text: 'Recall multiplication and division facts for the 3, 4 and 8 times tables', skills: ['m.x3', 'm.x4', 'm.x8'] },
  { id: 'y3a.n9', realm: 'y3-aut', zone: 'number', text: 'Solve one-step problems with addition, subtraction, multiplication and division', skills: ['m.wp1'] },
  { id: 'y3a.n10', realm: 'y3-aut', zone: 'number', text: 'Double and halve numbers mentally', skills: ['m.double2'] },
  // Word (Word portals arrive in R0.9)
  { id: 'y3a.w1', realm: 'y3-aut', zone: 'word', text: 'Use the prefixes un-, dis-, mis-, re-, in- and im-', skills: ['e.prefix'] },
  { id: 'y3a.w2', realm: 'y3-aut', zone: 'word', text: 'Add -ly to make adverbs, with the spelling rules', skills: ['e.ly'] },
  { id: 'y3a.w3', realm: 'y3-aut', zone: 'word', text: 'Spell words from the Year 3/4 statutory list', skills: ['e.spell34'] },
  { id: 'y3a.w4', realm: 'y3-aut', zone: 'word', text: 'Use a or an correctly', skills: ['e.aan'] },
  { id: 'y3a.w5', realm: 'y3-aut', zone: 'word', text: 'Join ideas with conjunctions (when, if, because, although)', skills: ['e.conj'] },
  { id: 'y3a.w6', realm: 'y3-aut', zone: 'word', text: 'Show where and when with prepositions', skills: ['e.prep'] },
  { id: 'y3a.w7', realm: 'y3-aut', zone: 'word', text: 'Show how, when and where with adverbs', skills: ['e.adverb'] },
  // Code (verbal reasoning)
  { id: 'y3a.c1', realm: 'y3-aut', zone: 'code', text: 'Alphabet order, jumps and letter positions', skills: ['v.alphaNext', 'v.alphaJump', 'v.alphaPos'] },
  { id: 'y3a.c2', realm: 'y3-aut', zone: 'code', text: 'Letter codes: write and crack them', skills: ['v.code1', 'v.codeN', 'v.decode', 'v.mirror'] },
  { id: 'y3a.c3', realm: 'y3-aut', zone: 'code', text: 'Letter series and letter-pair series', skills: ['v.series', 'v.pairs'] },
  { id: 'y3a.c4', realm: 'y3-aut', zone: 'code', text: 'Words with the closest meaning (synonyms)', skills: ['v.syn'] },
  { id: 'y3a.c5', realm: 'y3-aut', zone: 'code', text: 'Words with the opposite meaning (antonyms)', skills: ['v.ant'] },
  { id: 'y3a.c6', realm: 'y3-aut', zone: 'code', text: 'Odd ones out', skills: ['v.odd'] },
  { id: 'y3a.c7', realm: 'y3-aut', zone: 'code', text: 'Compound words', skills: ['v.compound'] },
  // Shape (non-verbal and spatial reasoning)
  { id: 'y3a.s1', realm: 'y3-aut', zone: 'shape', text: 'Non-verbal series: what comes next?', skills: ['s.nvrSeries'] },
  { id: 'y3a.s2', realm: 'y3-aut', zone: 'shape', text: 'Non-verbal odd one out', skills: ['s.nvrOdd'] },
  { id: 'y3a.s3', realm: 'y3-aut', zone: 'shape', text: 'Count the cubes in 3D builds, including hidden ones', skills: ['s.count2', 's.count3'] },
  { id: 'y3a.s4', realm: 'y3-aut', zone: 'shape', text: 'Recognise builds that are turned, and views from above', skills: ['s.rotY', 's.rot3', 's.top'] },

  // ---------------- Foundations (Year 2, checked on the way) ----------------
  { id: 'f.n1', realm: 'found', zone: 'number', text: 'Number bonds to 10, 20 and 100; add and subtract within 20', skills: ['m.bonds10', 'm.bonds100', 'm.add20', 'm.sub20'] },
  { id: 'f.n2', realm: 'found', zone: 'number', text: '2, 5 and 10 times tables; doubles and halves', skills: ['m.x2', 'm.x5', 'm.x10', 'm.double'] },
  { id: 'f.c1', realm: 'found', zone: 'code', text: 'Alphabet order', skills: ['v.alphaNext'] },
  { id: 'f.s1', realm: 'found', zone: 'shape', text: 'Count cubes in simple builds', skills: ['s.count1'] },
];

// Later terms from the approved spine (plan §3). Skills are added with each
// term's content pack; until then these are "planned".
export const SPINE = {
  'y3-spr': {
    number: '2-digit × and ÷ 1-digit; length and perimeter; fractions (A); mass and capacity',
    word: '-ation, -ous, -ture/-sure, -sion; inverted commas; present perfect',
    code: 'Hidden words, missing 3-letter words, insert a letter; analogies',
    shape: 'Reflections, rotations, fold-and-punch introduction',
  },
  'y3-sum': {
    number: 'Fractions (B); money; time; angles and lines; statistics',
    word: '-tion/-ssion/-cian, ch, -gue/-que, sc, ei/eigh/ey; homophones 1',
    code: 'Letter connections, number series, word connections',
    shape: '2×2 matrices; nets',
  },
  'y4-aut': {
    number: 'Place value to 10,000; negative numbers; rounding; area; 6, 7, 9, 11, 12 times tables',
    word: 'Possessive -s; Standard English; noun phrases; fronted adverbials',
    code: 'Letters for numbers, complete the sum, move a letter',
    shape: 'Non-verbal codes and similarities; hidden shapes',
  },
  'y4-spr': {
    number: 'Factor pairs; × and ÷ by 10 and 100; short division; km; fractions; decimals (A)',
    word: 'Speech punctuation; plural possessive apostrophes; pronouns',
    code: 'Word–number codes, make a word, logic',
    shape: '3×3 matrices; fold-and-punch',
  },
  'y4-sum': {
    number: 'Decimals (B); money; time; shape and symmetry; coordinates; multiplication tables check',
    word: 'Homophones 2; Year 3/4 word list complete; spot the mistake',
    code: 'All 21 verbal reasoning types at Year 4 level',
    shape: 'Mixed non-verbal reasoning',
  },
  'y5-aut': {
    number: 'Place value to 1,000,000; Roman numerals; primes, squares and cubes; fractions (A)',
    word: '-cious/-tious, -cial/-tial; relative clauses; modal verbs',
    code: 'Kent Trials begin',
    shape: 'Kent Trials begin',
  },
  'y5-spr': {
    number: 'Long multiplication; short division; fractions × whole numbers; decimals and percentages',
    word: '-ant/-ent, -able/-ible, -fer; parenthesis',
    code: 'Test-level verbal reasoning',
    shape: 'Test-level non-verbal reasoning; spatial speed',
  },
  'y5-sum': {
    number: 'Angles; reflection and translation; decimals; volume; imperial units',
    word: 'ough, silent letters, ei after c; homophones 3; Year 5/6 list',
    code: 'Monthly Kent and Shepway mock tests; Writing Quest',
    shape: 'Monthly mock tests',
  },
  'y6-pre': {
    number: 'Year 6 pre-teach: ratio, algebra, BIDMAS, percentages of amounts, mean, triangle area, polygon angles',
    word: 'Passive, subjunctive, colons and semi-colons, hyphens',
    code: 'Weekly full mock tests',
    shape: 'Weekly full mock tests; final boss',
  },
};

export const objectivesFor = (realm) => OBJECTIVES.filter((o) => o.realm === realm);
