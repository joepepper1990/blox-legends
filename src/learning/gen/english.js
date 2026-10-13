// Word zone questions (Year 3 Autumn English): statutory spellings, prefixes,
// adding -ly, a or an, and choosing a conjunction, preposition or adverb to
// fill a gap. Spellings and -ly are facts (each word is reviewed on its own
// spaced schedule); the rest are authored items.
import { SPELLINGS, PREFIXED, LY_WORDS, AAN_ITEMS, AN_WORDS, AN_TRICKY, A_WORDS, A_TRICKY, CONJUNCTIONS, PREPOSITIONS, ADVERBS } from '../banks/english.js';
import { choose, explainOptions, question, pick, shuffle } from './util.js';

const maxLevel = (band) => (band <= 2 ? 1 : band === 3 ? 2 : 3);
const byId = (bank) => Object.fromEntries(bank.map((i) => [i.id, i]));
const asWords = { label: (v) => v, speak: (v) => v };
const blank = (text) => text.replace('___', 'blank');

// A bank-backed generator. `room(item)` is how many options the item can
// offer; items that can't fill `count` options are left out.
function bankGen(bank, formats, build, room = () => Infinity) {
  const ids = byId(bank);
  const usable = (band, count) => bank.filter((i) => i.level <= maxLevel(band) && room(i) >= count);
  return {
    items: (skill, band, count = 3) => usable(band, count).map((i) => i.id),
    formatsAt: (skill, band, count = 3) => (usable(band, count).length ? formats : []),
    make(skill, { band, count, rng, item, format }) {
      const it = ids[item] || pick(rng, usable(band, count));
      if (!it) throw new Error(`no ${skill.id} item for ${count} options`);
      if (room(it) < count) throw new Error(`${it.id} can't offer ${count} options`);
      return build(skill, band, it, count, rng, format || formats[0]);
    },
  };
}

// ---- spelling ----
const SPELL_MIS = { d: 'spell-double', s: 'spell-sound', t: 'spell-silent', o: 'spell-order' };
export const spell34 = bankGen(SPELLINGS, ['spell'], (skill, band, it, count, rng) => {
  const { options, answerIndex } = choose(rng, it.word, it.wrong.map((w) => ({ v: w.v, mis: SPELL_MIS[w.kind] })), count, asWords);
  return question(skill, {
    format: 'spell', band, itemKey: it.id, answer: it.word,
    prompt: 'Which is the right spelling?',
    speak: `Spell ${it.word}. ${it.sentence} Which is the right spelling of ${it.word}?`,
    solved: `${it.word} is spelt ${it.word.split('').join(' ')}.`,
    options, answerIndex,
    hint: { kind: 'spell', text: `Say it slowly and look at each part of the word: ${it.word}.` },
    explain: explainOptions(options, { answer: it.word }),
    stem: { word: it.word },
  });
}, (it) => it.wrong.length + 1);

// ---- prefixes ----
const MEANING = { un: 'not', dis: 'not', in: 'not', im: 'not', re: 'again', mis: 'wrongly' };
const MEANINGS = ['not', 'again', 'wrongly', 'before'];
export const prefix = bankGen(PREFIXED, ['prefix-make', 'prefix-meaning'], (skill, band, it, count, rng, format) => {
  if (format === 'prefix-meaning') {
    const answer = MEANING[it.prefix];
    const { options, answerIndex } = choose(rng, answer, MEANINGS.filter((m) => m !== answer).map((m) => ({ v: m, mis: 'prefix-meaning' })), count, asWords);
    const prompt = `What does ${it.prefix}- mean in ${it.word}?`;
    return question(skill, {
      format, band, itemKey: it.id, answer, prompt, speak: prompt,
      solved: `${it.prefix}- means ${answer}: ${it.word} means ${answer === 'not' ? `not ${it.root}, or the opposite` : `${it.root} ${answer}`}.`,
      options, answerIndex,
      hint: { text: `Think of other words that start with ${it.prefix}-. What does ${it.prefix}- add to ${it.root}?` },
      explain: explainOptions(options, { prefix: it.prefix, word: it.word, root: it.root, answer }),
      stem: { word: it.word, prefix: it.prefix, root: it.root },
    });
  }
  const { options, answerIndex } = choose(rng, it.prefix, shuffle(rng, it.wrong).map((p) => ({ v: p, mis: 'prefix-not-word' })), count, {
    label: (p) => `${p}-`,
    speak: (p) => p,
  });
  const prompt = `Which prefix makes a real word with ${it.root}?`;
  return question(skill, {
    format: 'prefix-make', band, itemKey: it.id, answer: `${it.prefix}-`, prompt,
    speak: `Which prefix goes in front of ${it.root} to make a real word?`,
    solved: `${it.prefix} + ${it.root} = ${it.word}`,
    options, answerIndex,
    hint: { text: `Say each one in front of ${it.root}. Only ${it.word} is a real word.` },
    explain: explainOptions(options, { root: it.root, word: it.word, answer: it.prefix }),
    stem: { root: it.root },
  });
}, (it) => it.wrong.length + 1);

// ---- adding -ly ----
// The right spelling, by rule, and the classic slips for that kind of word.
const ODD_LY = { true: 'truly', whole: 'wholly', shy: 'shyly' };
const ODD_SLIPS = {
  true: [{ v: 'truely', mis: 'ly-changed' }, { v: 'truley', mis: 'ly-changed' }, { v: 'trulley', mis: 'spell-double' }],
  whole: [{ v: 'wholely', mis: 'ly-changed' }, { v: 'wholy', mis: 'spell-double' }, { v: 'wholley', mis: 'ly-changed' }],
  shy: [{ v: 'shyley', mis: 'ly-changed' }, { v: 'shylly', mis: 'spell-double' }, { v: 'shyely', mis: 'ly-changed' }],
};
function lyForms(w) {
  if (ODD_LY[w]) return { right: ODD_LY[w], wrong: ODD_SLIPS[w] };
  if (/[^aeiou]y$/.test(w)) {
    const stem = w.slice(0, -1);
    return { right: `${stem}ily`, wrong: [{ v: `${w}ly`, mis: 'ly-kept-y' }, { v: `${stem}ly`, mis: 'ly-changed' }, { v: `${stem}illy`, mis: 'spell-double' }] };
  }
  if (/[^aeiou]le$/.test(w)) {
    const stem = w.slice(0, -1);
    return { right: `${stem}y`, wrong: [{ v: `${w}ly`, mis: 'ly-kept-le' }, { v: `${stem}ey`, mis: 'ly-kept-le' }, { v: `${w.slice(0, -2)}elly`, mis: 'ly-changed' }] };
  }
  if (/ic$/.test(w)) {
    return { right: `${w}ally`, wrong: [{ v: `${w}ly`, mis: 'ly-ic' }, { v: `${w}aly`, mis: 'spell-double' }, { v: `${w}ley`, mis: 'ly-ic' }] };
  }
  if (/l$/.test(w)) {
    return { right: `${w}ly`, wrong: [{ v: `${w.slice(0, -1)}ly`, mis: 'spell-double' }, { v: `${w}ley`, mis: 'ly-changed' }, { v: `${w}lly`, mis: 'spell-double' }] };
  }
  if (/e$/.test(w)) {
    return { right: `${w}ly`, wrong: [{ v: `${w.slice(0, -1)}ly`, mis: 'ly-changed' }, { v: `${w}ley`, mis: 'ly-changed' }, { v: `${w}lly`, mis: 'spell-double' }] };
  }
  return { right: `${w}ly`, wrong: [{ v: `${w}ley`, mis: 'ly-changed' }, { v: `${w}ily`, mis: 'ly-changed' }, { v: `${w}lly`, mis: 'spell-double' }] };
}
export const ly = bankGen(LY_WORDS, ['ly'], (skill, band, it, count, rng) => {
  const { right, wrong } = lyForms(it.word);
  const { options, answerIndex } = choose(rng, right, wrong, count, asWords);
  return question(skill, {
    format: 'ly', band, itemKey: it.id, answer: right,
    prompt: `Add -ly to ${it.word}. Which is right?`,
    speak: `Add L Y to ${it.word}. Which spelling is right?`,
    solved: `${it.word} + ly = ${right}`,
    options, answerIndex,
    hint: { text: lyHint(it.word) },
    explain: explainOptions(options, { word: it.word, answer: right }),
    stem: { word: it.word },
  });
});
function lyHint(w) {
  if (ODD_LY[w]) return `${w} is a rule-breaker: it becomes ${ODD_LY[w]}.`;
  if (/[^aeiou]y$/.test(w)) return 'If the word ends in a consonant and y, change the y to i, then add -ly.';
  if (/[^aeiou]le$/.test(w)) return 'If the word ends in -le, change the e to y.';
  if (/ic$/.test(w)) return 'If the word ends in -ic, add -ally.';
  return 'Most words just add -ly, without changing anything.';
}

// ---- a or an ----
const NEEDS_AN = new Set([...AN_WORDS, ...AN_TRICKY]);
export const aan = bankGen(AAN_ITEMS, ['aan'], (skill, band, it, count, rng) => {
  const need = NEEDS_AN.has(it.word) ? 'an' : 'a';
  // the other kind of word: plain ones first, letter-tricks at higher bands
  const plain = need === 'an' ? A_WORDS : AN_WORDS;
  const tricky = need === 'an' ? A_TRICKY : AN_TRICKY;
  const cands = [
    ...(band >= 3 ? shuffle(rng, tricky).slice(0, 1).map((w) => ({ v: w, mis: 'aan-letter' })) : []),
    ...shuffle(rng, plain).map((w) => ({ v: w, mis: 'aan-sound' })),
  ];
  const { options, answerIndex } = choose(rng, it.word, cands, count, asWords);
  const prompt = `Which word needs ‘${need}’ in front of it?`;
  return question(skill, {
    format: 'aan', band, itemKey: it.id, answer: it.word, prompt,
    speak: `Which word needs ${need === 'an' ? 'an' : 'a'} in front of it? ${options.map((o) => o.label).join(', ')}`,
    solved: `${need} ${it.word}`,
    options, answerIndex,
    hint: { text: 'Listen to the first sound, not the first letter. “an” goes before a vowel sound, like an hour or an egg.' },
    explain: explainOptions(options, { need, answer: it.word }),
    stem: { need },
  });
});

// ---- filling a gap: conjunctions, prepositions, adverbs ----
function gap(misFor) {
  return (skill, band, it, count, rng) => {
    const { options, answerIndex } = choose(rng, it.answer, shuffle(rng, it.wrong).map((w) => ({ v: w, mis: misFor(it, w) })), count, asWords);
    return question(skill, {
      format: 'gap', band, itemKey: it.id, answer: it.answer,
      prompt: it.text,
      speak: `${blank(it.text)} Which word fills the blank? ${options.map((o) => o.label).join(', ')}`,
      solved: it.text.replace('___', it.answer),
      options, answerIndex,
      hint: { text: 'Read the sentence with each word in the gap. Which one makes sense?' },
      explain: explainOptions(options, { answer: it.answer, text: it.text.replace('___', it.answer) }),
      stem: { text: it.text },
    });
  };
}
export const conj = bankGen(CONJUNCTIONS, ['gap'], gap(() => 'conj-meaning'), (it) => it.wrong.length + 1);
const prepWrong = (it) => ['in', 'on', 'at'].filter((p) => p !== it.answer);
export const prep = bankGen(
  PREPOSITIONS.map((p) => ({ ...p, wrong: prepWrong(p) })),
  ['gap'],
  gap((it) => (/(bus|train|plane|car|kitchen|box|bed|school|home|stop)\b/.test(it.text) ? 'prep-place' : 'prep-time')),
  () => 3,
);
export const adverb = bankGen(
  ADVERBS,
  ['gap'],
  gap((it, w) => (it.kind === 'time' ? 'adverb-time' : w === it.wrong[0] ? 'adverb-adjective' : 'adverb-noun')),
  (it) => it.wrong.length + 1,
);
