// Independent checks for the Word zone, from the checker's own knowledge:
// the statutory spelling list, the real words a prefix can make, the -ly
// spelling rules, a/an by first sound, in/on/at by what follows, and word
// classes for adverbs. Never the banks' answers.

// Year 3/4 statutory spelling list (National Curriculum, English Appendix 1).
const STATUTORY = new Set(
  `accident accidentally actual actually address answer appear arrive believe bicycle breath breathe build
  busy business calendar caught centre century certain circle complete consider continue decide describe
  different difficult disappear early earth eight eighth enough exercise experience experiment extreme famous
  favourite February forward forwards fruit grammar group guard guide heard heart height history imagine
  increase important interest island knowledge learn length library material medicine mention minute natural
  naughty notice occasion occasionally often opposite ordinary particular peculiar perhaps popular position
  possess possession possible potatoes pressure probably promise purpose quarter question recent regular reign
  remember sentence separate special straight strange strength suppose surprise therefore though although
  thought through various weight woman women`.split(/\s+/),
);
// Real words that look like slips of statutory words: never allowed as a
// "wrong spelling" (tests also check against a full dictionary).
const LOOKALIKES = new Set(
  `calender center favorite herd hart hight minuet resent strait threw thru tho women woman eighty ate rain rein
  reins peace piece wait weigh whether weather where wear here hear there their accept except affect effect
  breathe breath complete compleat lose loose quiet quite`.split(/\s+/),
);

// Every real word made by un-, dis-, mis-, re-, in- or im- with the roots
// used, including unusual ones, so a "wrong" prefix that secretly makes a
// word is caught.
const PREFIXED_WORDS = new Set(
  `disable disagree disappear disapprove disconnect discount dishonest dislike disobey displace
  display distrust disuse immature immobile impaint impatient imperfect impolite impossible
  impractical inaccurate inactive incomplete incorrect independent inexpensive infill inlock
  inpatient intrust invisible misbehave misbuild misconnect miscorrect miscount mishear misjudge
  mislead mislike mispaint misplace misplay misspell misstart mistell mistrust misunderstand misuse
  miswrite reactive reappear reapprove rebuild reconnect recount refill rehear reheat rejudge relock
  repack repaint replace replay respell restart retell reuse revisit rewrite unable unactive unbuild
  unexpensive unfair unfriendly unhappy unhonest unkind unlead unlike unlock unlucky unpack unpaint
  unperfect unplace unpolite unpossible unpractical unsafe unspell untidy untrust unusual unwell
  unwrite unzip`.split(/\s+/),
);
const PREFIX_MEANS = { un: 'not', dis: 'not', in: 'not', im: 'not', re: 'again', mis: 'wrongly' };

// -ly by the spelling rules (English Appendix 1, Year 3/4).
export function addLy(w) {
  const odd = { true: 'truly', whole: 'wholly', shy: 'shyly', sly: 'slyly', due: 'duly', public: 'publicly' };
  if (odd[w]) return odd[w];
  if (/ll$/.test(w)) return `${w}y`;
  if (/[bcdfghjklmnpqrstvwxz]y$/.test(w)) return `${w.slice(0, -1)}ily`;
  if (/[bcdfghjklmnpqrstvwxz]le$/.test(w)) return `${w.slice(0, -1)}y`;
  if (/ic$/.test(w)) return `${w}ally`;
  return `${w}ly`;
}

// a or an: by the first sound, for nouns the checker knows.
const NOUNS_AAN = new Set(
  `apple egg owl umbrella ink igloo elephant orange ant octopus uncle insect eagle iceberg arm oven envelope
  astronaut hour honest heir cat dog house horse banana tree rabbit pencil window ladder sock garden unicorn
  uniform ukulele unit one`.split(/\s+/),
);
export function article(word) {
  const w = word.toLowerCase();
  if (/^(hour|honest|honour|heir)/.test(w)) return 'an';
  if (/^(uni|use|usu|uk|eu|ewe|one|once)/.test(w)) return 'a';
  return /^[aeiou]/.test(w) ? 'an' : 'a';
}

// in / on / at from the words straight after the gap.
const DAYS = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
const MONTHS = /^(january|february|march|april|may|june|july|august|september|october|november|december)\b/;
export function timePlace(after) {
  const w = after.toLowerCase().replace(/^(the|my|a|an|our|your)\s+/, '');
  if (DAYS.test(w) || /^(birthday|christmas day|new year’s day)\b/.test(w)) return 'on';
  if (MONTHS.test(w) || /^(winter|summer|spring|autumn|morning|afternoon|evening)\b/.test(w) || /^\d{4}\b/.test(w)) return 'in';
  if (/^(night|midnight|noon|lunchtime|bedtime|teatime|dawn)\b/.test(w) || /o’clock|^half past|^quarter (past|to)/.test(w)) return 'at';
  if (/^(school|home|work|bus stop|door|station)\b/.test(w)) return 'at';
  if (/^(bus|train|plane|coach|bike|bicycle)\b/.test(w)) return 'on';
  if (/^(car|taxi|kitchen|box|bag|bedroom|bed|garden|classroom)\b/.test(w)) return 'in';
  return null;
}

// Word classes for the adverb items.
const ADJECTIVES = new Set(
  'polite gentle peaceful beautiful patient angry careful happy graceful proud greedy eager silent brave secret sudden'.split(' '),
);
const NOUNS = new Set(
  'politeness gentleness peace beauty patience anger care happiness grace pride greed eagerness silence bravery secrecy suddenness'.split(' '),
);
const PAST = new Set(['yesterday']);
const FUTURE = new Set(['tomorrow', 'soon', 'later']);
const PERFECT = new Set(['already']);
const isAdverbOf = (w) => [...ADJECTIVES].some((a) => addLy(a) === w);

// Joining words by what they mean, and which meaning each conjunction
// item needs (a separate key, written apart from the bank's answers).
const JOINS = {
  cause: ['because', 'as', 'since'],
  contrast: ['although', 'though', 'even though'],
  result: ['so'],
  warning: ['or', 'otherwise'],
  before: ['before'],
  after: ['after', 'once'],
};
const CONJ_NEEDS = {
  'conj.coat': 'cause', 'conj.baby': 'cause', 'conj.window': 'cause', 'conj.tired': 'cause', 'conj.thirsty': 'cause',
  'conj.beach': 'contrast', 'conj.race': 'contrast', 'conj.tea': 'contrast', 'conj.pie': 'contrast',
  'conj.dark': 'result', 'conj.hungry': 'result', 'conj.rain': 'result', 'conj.late': 'result',
  'conj.hurry': 'warning', 'conj.coldOr': 'warning',
  'conj.teeth': 'before', 'conj.wash': 'before',
  'conj.dinner': 'after',
};

const labels = (q) => q.options.map((o) => String(o.label));
const where = (q, pred) => labels(q).map((l, i) => (pred(l) ? i : -1)).filter((i) => i >= 0);

export function solveEnglish(q) {
  const s = q.stem || {};
  switch (q.format) {
    case 'spell': {
      if (!STATUTORY.has(s.word)) return { correct: [], reason: `${s.word} is not on the statutory list` };
      if (!q.speak.includes(s.word)) return { correct: [], reason: 'the word is not said aloud' };
      const real = labels(q).filter((l) => l !== s.word && (STATUTORY.has(l) || LOOKALIKES.has(l.toLowerCase())));
      if (real.length) return { correct: [], reason: `${real.join(', ')} is a real word` };
      return { correct: where(q, (l) => l === s.word) };
    }
    case 'prefix-make': {
      if (!q.prompt.includes(s.root)) return { correct: [], reason: 'the root word is not shown' };
      return { correct: where(q, (l) => PREFIXED_WORDS.has(l.replace(/-$/, '') + s.root)) };
    }
    case 'prefix-meaning': {
      if (!PREFIXED_WORDS.has(s.word) || !s.word.startsWith(s.prefix)) return { correct: [], reason: `${s.word} is not a known ${s.prefix}- word` };
      if (!q.prompt.includes(s.word) || !q.prompt.includes(`${s.prefix}-`)) return { correct: [], reason: 'the word or prefix is not shown' };
      return { correct: where(q, (l) => l === PREFIX_MEANS[s.prefix]) };
    }
    case 'ly': {
      const m = /^Add -ly to (\w+)\./.exec(q.prompt);
      if (!m) return { correct: [], reason: 'the word is not shown' };
      return { correct: where(q, (l) => l === addLy(m[1])) };
    }
    case 'aan': {
      const m = /needs ‘(an|a)’/.exec(q.prompt);
      if (!m) return { correct: [], reason: 'the question does not say a or an' };
      const unknown = labels(q).filter((l) => !NOUNS_AAN.has(l));
      if (unknown.length) return { correct: [], reason: `unknown word ${unknown.join(', ')}` };
      return { correct: where(q, (l) => article(l) === m[1]) };
    }
    case 'gap': {
      const text = q.prompt;
      if (text.split('___').length !== 2) return { correct: [], reason: 'the sentence needs exactly one gap' };
      if (q.skill === 'e.conj') {
        const need = CONJ_NEEDS[q.itemKey];
        if (!need) return { correct: [], reason: 'no meaning recorded for this sentence' };
        return { correct: where(q, (l) => JOINS[need].includes(l.toLowerCase())) };
      }
      if (q.skill === 'e.prep') {
        const after = text.split('___')[1].trim();
        const want = timePlace(after);
        if (!want) return { correct: [], reason: `no rule for "${after}"` };
        return { correct: where(q, (l) => l === want) };
      }
      if (q.skill === 'e.adverb') {
        const words = labels(q).map((l) => l.toLowerCase());
        if (words.every((w) => PAST.has(w) || FUTURE.has(w) || PERFECT.has(w))) {
          const t = text.toLowerCase();
          const fits = /\bwill\b/.test(t) ? FUTURE : /\b(have|has) ___/.test(t) ? PERFECT : /\b(went|was|were|did|had|\w+ed)\b/.test(t) ? PAST : null;
          if (!fits) return { correct: [], reason: 'cannot tell when the sentence happens' };
          return { correct: where(q, (l) => fits.has(l.toLowerCase())) };
        }
        const unknown = words.filter((w) => !isAdverbOf(w) && !ADJECTIVES.has(w) && !NOUNS.has(w));
        if (unknown.length) return { correct: [], reason: `unknown word ${unknown.join(', ')}` };
        return { correct: where(q, (l) => isAdverbOf(l.toLowerCase())) };
      }
      return null;
    }
    default:
      return null;
  }
}
