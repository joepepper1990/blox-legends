// One-step story problems. Every template makes its operation clear with the
// words a Year 3 child learns to look for ("altogether", "left", "each",
// "shared equally"); the checker (check/number.js) reads the same words to
// work out the answer independently.
import { choose, explainOptions, question, pick } from './util.js';

const NAMES = ['Sam', 'Ali', 'Mia', 'Leo', 'Zara', 'Ben', 'Ava', 'Raj', 'Ella', 'Tom', 'Kai', 'Isla', 'Noah', 'Ruby', 'Omar', 'Lily'];
const THINGS = ['stickers', 'marbles', 'shells', 'cards', 'sweets', 'beads', 'stamps', 'books', 'conkers', 'coins', 'apples', 'pencils'];

const T = {
  add: [
    (n, x, a, b) => `${n} has ${a} ${x}. ${n} gets ${b} more. How many ${x} does ${n} have altogether?`,
    (n, x, a, b) => `A box holds ${a} ${x}. ${n} adds ${b} more. How many ${x} are in the box in total?`,
    (n, x, a, b) => `${n} collects ${a} ${x} on Monday and ${b} on Tuesday. How many ${x} is that altogether?`,
  ],
  sub: [
    (n, x, a, b) => `${n} has ${a} ${x} and gives away ${b}. How many ${x} are left?`,
    (n, x, a, b) => `There are ${a} ${x} in a jar. ${n} takes out ${b}. How many ${x} are left in the jar?`,
    (n, x, a, b) => `A shop has ${a} ${x}. It sold ${b} of them. How many ${x} are left?`,
  ],
  diff: [
    (n, x, a, b, m) => `${n} has ${a} ${x}. ${m} has ${b} ${x}. How many more ${x} does ${n} have than ${m}?`,
  ],
  need: [
    (n, x, a, b) => `${n} needs ${a} ${x}. ${n} has ${b} so far. How many more ${x} does ${n} need?`,
  ],
  mul: [
    (n, x, a, b) => `${n} has ${a} bags with ${b} ${x} in each bag. How many ${x} are there altogether?`,
    (n, x, a, b) => `${n} puts ${x} in ${a} rows of ${b}. How many ${x} are there?`,
  ],
  div: [
    (n, x, a, b) => `${a} ${x} are shared equally between ${b} friends. How many ${x} does each friend get?`,
    (n, x, a, b) => `${n} puts ${a} ${x} into equal groups of ${b}. How many groups are there?`,
  ],
  twice: [(n, x, a, b, m) => `${n} has ${a} ${x}. ${m} has twice as many. How many ${x} does ${m} have?`],
  half: [(n, x, a, b, m) => `${n} has ${a} ${x}. ${m} has half as many. How many ${x} does ${m} have?`],
};

const ANSWER = { add: (a, b) => a + b, sub: (a, b) => a - b, diff: (a, b) => a - b, need: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b, twice: (a) => a * 2, half: (a) => a / 2 };
const WRONG = {
  add: (a, b) => [{ v: a - b, mis: 'wp-wrong-op' }, { v: a * b, mis: 'wp-wrong-op' }],
  sub: (a, b) => [{ v: a + b, mis: 'wp-wrong-op' }],
  diff: (a, b) => [{ v: a + b, mis: 'wp-wrong-op' }],
  need: (a, b) => [{ v: a + b, mis: 'wp-wrong-op' }, { v: b, mis: 'bond-gave-part' }],
  mul: (a, b) => [{ v: a + b, mis: 'wp-wrong-op' }, { v: a * b + b, mis: 'tab-next' }],
  div: (a, b) => [{ v: a - b, mis: 'wp-wrong-op' }, { v: a * b, mis: 'wp-wrong-op' }],
  twice: (a) => [{ v: a + 2, mis: 'double-add-two' }, { v: a / 2, mis: 'wp-wrong-op' }],
  half: (a) => [{ v: a * 2, mis: 'half-doubled' }, { v: a - 2, mis: 'half-sub-two' }],
};
const WHY = {
  add: 'more are added, so we add.',
  sub: 'some are taken away, so we subtract.',
  diff: '"how many more" means find the difference, so we subtract.',
  need: '"how many more" means find the difference, so we subtract.',
  mul: 'equal groups, so we multiply.',
  div: 'sharing into equal groups, so we divide.',
  twice: 'twice as many means double.',
  half: 'half as many means halve.',
};
const SYM = { add: '+', sub: '−', diff: '−', need: '−', mul: '×', div: '÷' };

export function story(skill, band, format, op, a, b, count, rng) {
  const n = pick(rng, NAMES);
  const m = pick(rng, NAMES.filter((x) => x !== n));
  const x = pick(rng, THINGS);
  const k = Math.floor(rng() * T[op].length);
  const text = T[op][k](n, x, a, b, m);
  const ans = ANSWER[op](a, b);
  const cands = [...WRONG[op](a, b), { v: ans + 1, mis: 'off-by-one' }, { v: ans - 1, mis: 'off-by-one' }, { v: ans + 10, mis: 'tens-slip' }].filter(
    (c) => Number.isInteger(c.v) && c.v > 0 && c.v !== ans,
  );
  const { options, answerIndex } = choose(rng, ans, cands, count);
  const sum = SYM[op] ? `${a} ${SYM[op]} ${b} = ${ans}` : `${op === 'twice' ? 'double' : 'half of'} ${a} = ${ans}`;
  return question(skill, {
    format,
    band,
    tpl: `${op}${k}`,
    itemKey: `${op}|${a}|${SYM[op] ? b : ''}`,
    answer: ans,
    prompt: text,
    speak: text,
    solved: `${text} ${ans}.`,
    display: { prose: [text] },
    options,
    answerIndex,
    hint: { text: `In this story ${WHY[op]} ${sum}.` },
    explain: explainOptions(options, { answer: ans, why: WHY[op] }),
    stem: { op, a, b },
  });
}
