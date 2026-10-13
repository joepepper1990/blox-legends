// Word zone content: every wrong spelling is proven not to be a real English
// word (against a 275,000-word dictionary that is only used by tests), every
// right answer is real, and the checker's own word lists are complete for the
// words the banks use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SPELLINGS, PREFIXED, LY_WORDS, AAN_ITEMS, AN_WORDS, AN_TRICKY, CONJUNCTIONS, PREPOSITIONS, ADVERBS } from '../src/learning/banks/english.js';
import { addLy, article, timePlace, solveEnglish } from '../src/learning/check/english.js';
import { makeItem, itemsOf } from '../src/learning/question.js';
import { verify } from '../src/learning/check/index.js';
import { seeded } from '../src/learning/rng.js';

const require = createRequire(import.meta.url);
const DICT = new Set(require('an-array-of-english-words/index.json'));
// Proper nouns aren't in the (lower-case) dictionary.
const PROPER = new Set(['February']);
const isWord = (w) => PROPER.has(w) || DICT.has(w.toLowerCase());

// The Year 3/4 statutory list (100 entries; some cover two forms).
const STATUTORY_FORMS = 109;

test('the statutory spelling list is complete, with three non-words for each', () => {
  assert.equal(SPELLINGS.length, STATUTORY_FORMS);
  assert.equal(new Set(SPELLINGS.map((s) => s.word)).size, STATUTORY_FORMS);
  for (const s of SPELLINGS) {
    assert.ok(isWord(s.word), `${s.word} is not in the dictionary`);
    assert.ok(s.sentence.toLowerCase().includes(s.word.toLowerCase().slice(0, 5)), `${s.word}: the sentence should use the word`);
    assert.equal(new Set(s.wrong.map((w) => w.v)).size, 3, s.word);
    for (const w of s.wrong) {
      assert.ok(!isWord(w.v), `${s.word}: "${w.v}" is a real word`);
      assert.ok(['d', 's', 't', 'o'].includes(w.kind), `${s.word}: ${w.v} needs a slip kind`);
      assert.notEqual(w.v, s.word);
    }
  }
});

test('a wrong prefix never makes a real word, and the checker knows every real one', () => {
  const PRE = ['un', 'dis', 'mis', 're', 'in', 'im'];
  for (const it of PREFIXED) {
    assert.ok(isWord(it.word), it.word);
    assert.ok(it.wrong.length >= 2, `${it.word}: needs at least two wrong prefixes`);
    for (const p of it.wrong) assert.ok(!isWord(p + it.root), `${it.word}: ${p}${it.root} is a real word`);
    // the checker must agree with the dictionary for every prefix
    const q = { format: 'prefix-make', prompt: `Which prefix makes a real word with ${it.root}?`, stem: { root: it.root }, options: PRE.map((p) => ({ label: `${p}-` })) };
    const real = solveEnglish(q).correct.map((i) => PRE[i]);
    assert.deepEqual(real, PRE.filter((p) => isWord(p + it.root)), `checker word list for ${it.root}`);
  }
});

test('-ly: the rules give a real word, and every slip is not one', () => {
  for (const it of LY_WORDS) {
    const right = addLy(it.word);
    assert.ok(isWord(right), `${it.word} → ${right}`);
    for (let seed = 0; seed < 6; seed++) {
      const q = makeItem('e.ly', { band: 5, count: 4, item: it.id, rng: seeded(seed) });
      assert.equal(q.answer, right);
      for (const o of q.options) if (o.label !== right) assert.ok(!isWord(o.label), `${it.word}: "${o.label}" is a real word`);
    }
  }
});

test('a or an: the checker hears the same first sound as the bank', () => {
  const an = new Set([...AN_WORDS, ...AN_TRICKY]);
  for (const it of AAN_ITEMS) assert.equal(article(it.word), an.has(it.word) ? 'an' : 'a', it.word);
  for (const w of ['hour', 'honest', 'heir']) assert.equal(article(w), 'an');
  for (const w of ['unicorn', 'uniform', 'ukulele', 'one']) assert.equal(article(w), 'a');
});

test('in, on, at: the rules give each preposition item its answer', () => {
  for (const it of PREPOSITIONS) assert.equal(timePlace(it.text.split('___')[1].trim()), it.answer, it.id);
});

test('gap sentences: one gap, no repeats, every wrong option checked', () => {
  for (const bank of [CONJUNCTIONS, PREPOSITIONS, ADVERBS]) {
    assert.equal(new Set(bank.map((i) => i.id)).size, bank.length);
    assert.equal(new Set(bank.map((i) => i.text)).size, bank.length);
    for (const it of bank) assert.equal(it.text.split('___').length, 2, it.id);
  }
  for (const [skill, bank] of [['e.conj', CONJUNCTIONS], ['e.prep', PREPOSITIONS], ['e.adverb', ADVERBS]])
    for (const it of bank)
      for (let seed = 0; seed < 4; seed++) {
        const q = makeItem(skill, { band: 5, count: 3, item: it.id, rng: seeded(seed) });
        assert.ok(verify(q).ok, `${it.id}: ${verify(q).reason}`);
      }
});

test('every Word item can be asked at the highest band', () => {
  for (const skill of ['e.spell34', 'e.prefix', 'e.ly', 'e.aan', 'e.conj', 'e.prep', 'e.adverb']) {
    const ids = itemsOf(skill, 5, 3);
    assert.ok(ids.length >= 15, `${skill}: only ${ids.length} items`);
  }
});
