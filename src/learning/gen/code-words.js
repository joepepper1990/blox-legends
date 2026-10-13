// Word-based verbal reasoning questions from the authored banks: synonyms,
// antonyms, odd one out and compound words (item class "authored").
import { SYNONYMS, ANTONYMS, ODD_ONE_OUT, COMPOUNDS } from '../banks/code-words.js';
import { choose, explainOptions, question, pick, shuffle } from './util.js';

const maxLevel = (band) => (band <= 2 ? 1 : band === 3 ? 2 : 3);
const byId = (bank) => Object.fromEntries(bank.map((i) => [i.id, i]));
const words = { label: (v) => v, speak: (v) => v };

function bankGen(bank, format, build) {
  const ids = byId(bank);
  return {
    items: (skill, band) => bank.filter((i) => i.level <= maxLevel(band)).map((i) => i.id),
    formatsAt: () => [format],
    make(skill, { band, count, rng, item }) {
      const it = ids[item] || pick(rng, bank.filter((i) => i.level <= maxLevel(band)));
      return build(skill, band, it, count, rng);
    },
  };
}

const tagged = (list, mark, misMarked, misOther) =>
  list.map((w) => (w[0] === mark ? { v: w.slice(1), mis: misMarked } : { v: w, mis: misOther }));

export const syn = bankGen(SYNONYMS, 'syn', (skill, band, it, count, rng) => {
  const { options, answerIndex } = choose(rng, it.answer, tagged(it.wrong, '!', 'syn-opposite', 'syn-related'), count, words);
  const prompt = `Which word means the same as ${it.word}?`;
  return question(skill, {
    format: 'syn', band, itemKey: it.id, answer: it.answer, prompt, speak: prompt, solved: `${it.answer} means the same as ${it.word}`,
    door: [it.word.toUpperCase(), '= ?'], options, answerIndex,
    hint: { text: `Try each word in a sentence instead of ${it.word}. Only ${it.answer} keeps the same meaning.` },
    explain: explainOptions(options, { word: it.word, answer: it.answer }),
    stem: { word: it.word },
  });
});

export const ant = bankGen(ANTONYMS, 'ant', (skill, band, it, count, rng) => {
  const { options, answerIndex } = choose(rng, it.answer, tagged(it.wrong, '=', 'ant-same', 'ant-related'), count, words);
  const prompt = `Which word means the opposite of ${it.word}?`;
  return question(skill, {
    format: 'ant', band, itemKey: it.id, answer: it.answer, prompt, speak: prompt, solved: `${it.answer} is the opposite of ${it.word}`,
    door: [it.word.toUpperCase(), '↔ ?'], options, answerIndex,
    hint: { text: `Opposites are as different as they can be, like hot and cold. The opposite of ${it.word} is ${it.answer}.` },
    explain: explainOptions(options, { word: it.word, answer: it.answer }),
    stem: { word: it.word },
  });
});

export const odd = bankGen(ODD_ONE_OUT, 'odd', (skill, band, it, count, rng) => {
  if (count < 3) throw new Error('an odd one out needs at least three words');
  const members = shuffle(rng, it.words).slice(0, count - 1);
  const { options, answerIndex } = choose(rng, it.odd, members.map((w) => ({ v: w, mis: 'odd-other-group' })), count, words);
  const prompt = 'Which word is the odd one out?';
  return question(skill, {
    format: 'odd', band, itemKey: it.id, answer: it.odd, prompt, speak: `Which word is the odd one out? ${options.map((o) => o.label).join(', ')}`,
    solved: `${it.odd} is the odd one out: the others are ${it.group}`,
    options, answerIndex,
    hint: { text: `Find what most of the words have in common: they are ${it.group}. ${it.odd} is not.` },
    explain: explainOptions(options, { group: it.group, answer: it.odd }),
    stem: { group: it.group },
  });
});

export const compound = bankGen(COMPOUNDS, 'compound', (skill, band, it, count, rng) => {
  const { options, answerIndex } = choose(rng, it.answer, it.wrong.map((w) => ({ v: w, mis: 'compound-not-word' })), count, words);
  const prompt = `Which word can go after ${it.first} to make one new word?`;
  return question(skill, {
    format: 'compound', band, itemKey: it.id, answer: it.answer, prompt, speak: prompt, solved: `${it.first} + ${it.answer} = ${it.first}${it.answer}`,
    door: [`${it.first.toUpperCase()} + ?`], options, answerIndex,
    hint: { text: `Say each one joined on: ${it.first}${options.map((o) => o.label).join(`, ${it.first}`)}. Only ${it.first}${it.answer} is a real word.` },
    explain: explainOptions(options, { first: it.first, answer: it.answer }),
    stem: { first: it.first },
  });
});
