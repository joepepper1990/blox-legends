// Authored banks: well-formed, stable ids, and consistent with the checker's
// separate word knowledge (check/relations.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYNONYMS, ANTONYMS, ODD_ONE_OUT, COMPOUNDS } from '../src/learning/banks/code-words.js';
import { isSynonym, isAntonym, makesCompound, oddOneOut } from '../src/learning/check/relations.js';
import { makeItem, itemsOf } from '../src/learning/question.js';
import { verify } from '../src/learning/check/index.js';
import { inReserve } from '../src/learning/fp.js';
import { seeded } from '../src/learning/rng.js';

const ALL = [...SYNONYMS, ...ANTONYMS, ...ODD_ONE_OUT, ...COMPOUNDS];

test('bank item ids are unique', () => {
  const ids = ALL.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('synonym items: the answer means the same, no wrong option does, and "!" marks real opposites', () => {
  for (const it of SYNONYMS) {
    assert.ok(isSynonym(it.word, it.answer), `${it.word} / ${it.answer}`);
    for (const w of it.wrong) {
      const word = w.replace(/^!/, '');
      assert.ok(!isSynonym(it.word, word), `${it.word}: "${word}" also means the same`);
      assert.equal(w.startsWith('!'), isAntonym(it.word, word), `${it.word}: "${word}" ${w.startsWith('!') ? 'is not' : 'is'} an opposite`);
    }
  }
});

test('antonym items: the answer is the opposite, no wrong option is, and "=" marks real synonyms', () => {
  for (const it of ANTONYMS) {
    assert.ok(isAntonym(it.word, it.answer), `${it.word} / ${it.answer}`);
    for (const w of it.wrong) {
      const word = w.replace(/^=/, '');
      assert.ok(!isAntonym(it.word, word), `${it.word}: "${word}" is also an opposite`);
      assert.equal(w.startsWith('='), isSynonym(it.word, word), `${it.word}: "${word}" ${w.startsWith('=') ? 'does not mean' : 'means'} the same`);
    }
  }
});

test('odd-one-out items: every 3- or 4-word selection has exactly one odd one out', () => {
  for (const it of ODD_ONE_OUT) {
    const pairs = [];
    for (let a = 0; a < it.words.length; a++) for (let b = a + 1; b < it.words.length; b++) pairs.push([it.words[a], it.words[b]]);
    for (const sel of [...pairs, ...[0, 1, 2, 3].map((k) => it.words.filter((_, i) => i !== k))]) {
      const { outs } = oddOneOut([...sel, it.odd]);
      assert.deepEqual(outs, [it.odd.toLowerCase()], `${it.id}: ${[...sel, it.odd].join(', ')} → ${outs.join(', ')}`);
    }
  }
});

test('compound items: the answer makes a real word and no wrong option does', () => {
  for (const it of COMPOUNDS) {
    assert.ok(makesCompound(it.first, it.answer), `${it.first}${it.answer}`);
    for (const w of it.wrong) assert.ok(!makesCompound(it.first, w), `${it.first}${w} is a real word too`);
  }
});

test('every bank item makes a verified question at every option count', () => {
  for (const skill of ['v.syn', 'v.ant', 'v.odd', 'v.compound'])
    for (const item of itemsOf(skill, 5))
      for (const count of [3, 4])
        for (let seed = 1; seed <= 3; seed++) {
          const q = makeItem(skill, { band: 5, item, count, rng: seeded(seed), tries: 1 });
          assert.equal(q.itemKey, item);
          assert.ok(verify(q).ok);
        }
});

test('about 20% of each bank is kept back for bosses, chosen by item id', () => {
  for (const [skill, bank] of [['v.syn', SYNONYMS], ['v.ant', ANTONYMS], ['v.odd', ODD_ONE_OUT], ['v.compound', COMPOUNDS]]) {
    const share = bank.filter((i) => inReserve(skill, i.id)).length / bank.length;
    assert.ok(share > 0.08 && share < 0.35, `${skill}: ${(share * 100).toFixed(0)}% reserved`);
  }
});
