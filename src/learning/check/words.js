// Independent checks for word-based reasoning, using the checker's own word
// knowledge (relations.js), never the banks' answers.
import { isSynonym, isAntonym, knowsWord, oddOneOut, inSomeCategory, makesCompound, knowsCompounds } from './relations.js';

const idx = (q, pred) => q.options.map((o, i) => (pred(String(o.label)) ? i : -1)).filter((i) => i >= 0);

export function solveWords(q) {
  const s = q.stem || {};
  // A door, if shown, must show the word the question is about.
  const shown = s.word || s.first;
  if (q.door && shown && !q.door[0].toLowerCase().includes(shown.toLowerCase())) return { correct: [], reason: 'the door shows a different word' };
  switch (q.base || q.format) {
    case 'syn': {
      if (!knowsWord(s.word)) return { correct: [], reason: `the lexicon doesn't know "${s.word}"` };
      if (!q.prompt.includes(s.word)) return { correct: [], reason: 'the word asked about is not shown' };
      return { correct: idx(q, (w) => isSynonym(s.word, w)) };
    }
    case 'ant': {
      if (!knowsWord(s.word)) return { correct: [], reason: `the lexicon doesn't know "${s.word}"` };
      if (!q.prompt.includes(s.word)) return { correct: [], reason: 'the word asked about is not shown' };
      return { correct: idx(q, (w) => isAntonym(s.word, w)) };
    }
    case 'odd': {
      if (q.options.length < 3) return { correct: [], reason: 'an odd one out needs at least three words' };
      const unknown = q.options.map((o) => String(o.label)).filter((w) => !inSomeCategory(w));
      if (unknown.length) return { correct: [], reason: `the lexicon doesn't know ${unknown.join(', ')}` };
      const { outs, groups } = oddOneOut(q.options.map((o) => String(o.label)));
      if (groups === 0) return { correct: [], reason: 'no category fits three of the words' };
      if (outs.length > 1) return { correct: [], reason: `different groupings single out ${outs.join(' and ')}` };
      return { correct: idx(q, (w) => w.toLowerCase() === outs[0]) };
    }
    case 'compound': {
      if (!knowsCompounds(s.first)) return { correct: [], reason: `no compound list for "${s.first}"` };
      if (!q.prompt.includes(s.first)) return { correct: [], reason: 'the first word is not shown' };
      return { correct: idx(q, (w) => makesCompound(s.first, w)) };
    }
    default:
      return null;
  }
}
