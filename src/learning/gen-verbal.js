// Verbal reasoning generators: the alphabet and letter-code families that make
// up a big share of GL-style (Kent Test) verbal reasoning questions.
//
// Every question carries `door` (lines shown on the vault door) and a hint with
// `strip` steps so the alphabet strip can animate the method.

import { randInt, pick, chance, buildOptions } from './rng.js';

export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const idx = (ch) => ALPHA.indexOf(ch);
const at = (i) => ALPHA[((i % 26) + 26) % 26];
const spell = (s) => s.split('').join(', ');

const WORDS3 = [
  'CAT', 'DOG', 'SUN', 'HAT', 'PIG', 'BUS', 'CUP', 'RED', 'MAP', 'HOP', 'BIG', 'FOX', 'BOX', 'JAM', 'NET',
  'PEN', 'BED', 'LEG', 'TEN', 'RUN', 'SIT', 'TOP', 'MUD', 'HEN', 'BAG', 'LOG', 'POT', 'FAN', 'WEB', 'NUT',
  'RAT', 'CAR', 'ARM', 'EGG', 'OWL', 'ANT', 'GEM', 'KIT', 'LID', 'MOP',
];
const WORDS4 = [
  'FISH', 'SHIP', 'FROG', 'DUCK', 'LAMP', 'DESK', 'GOLD', 'MILK', 'BELL', 'STAR', 'TREE', 'BOAT', 'COIN',
  'GAME', 'JUMP', 'KING', 'LION', 'MOON', 'NEST', 'ROCK', 'SNOW', 'TAIL', 'WOLF', 'HILL', 'CAKE', 'DRUM',
];

// Shift each letter by shifts[i % shifts.length]. Returns null if a letter
// would run off the end of the alphabet and wrapping is not allowed.
function encode(word, shifts, wrap) {
  let out = '';
  for (let i = 0; i < word.length; i++) {
    const j = idx(word[i]) + shifts[i % shifts.length];
    if (!wrap && (j < 0 || j > 25)) return null;
    out += at(j);
  }
  return out;
}

function pickWord(rng, len, shifts, wrap, avoid = []) {
  const list = len === 4 ? WORDS4 : WORDS3;
  for (let tries = 0; tries < 200; tries++) {
    const w = pick(rng, list);
    if (avoid.includes(w)) continue;
    if (encode(w, shifts, wrap) !== null && encode(w, shifts.map((s) => -s), wrap) !== null) return w;
  }
  throw new Error('No word fits shifts');
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const stepsSpeak = (n) => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'step' : 'steps'} ${n > 0 ? 'forwards' : 'backwards'}`;

function letterOptions(rng, correct, candidates, count) {
  const { values, answerIndex } = buildOptions(rng, correct, candidates, count);
  return { options: values.map((v) => ({ label: v, speak: spell(v), value: v })), answerIndex };
}

function genAlphaNext(skill, lvl, count, rng) {
  const mode = lvl < 0.35 ? pick(rng, ['after', 'after', 'before']) : pick(rng, ['after', 'before', lvl > 0.6 ? 'two' : 'before']);
  const i = randInt(rng, 2, 23);
  const ch = ALPHA[i];
  const ans = mode === 'after' ? ALPHA[i + 1] : mode === 'before' ? ALPHA[i - 1] : ALPHA[i + 2];
  const prompt = mode === 'two' ? `What letter is 2 after ${ch}?` : `What letter comes ${mode} ${ch}?`;
  const { options, answerIndex } = letterOptions(
    rng,
    ans,
    [ALPHA[i - 1], ALPHA[i + 1], ALPHA[i + 2], ALPHA[i - 2], ch, ALPHA[i + 3]].filter(Boolean),
    count,
  );
  const target = idx(ans);
  return {
    skill,
    prompt,
    speak: prompt,
    door: [mode === 'before' ? `? ${ch}` : mode === 'after' ? `${ch} ?` : `${ch} _ ?`],
    options,
    answerIndex,
    hint: {
      text: `Find ${ch} on the alphabet strip, then look ${mode === 'before' ? 'one to the left' : mode === 'after' ? 'one to the right' : 'two to the right'}: ${ans}.`,
      strip: [[ch, ans]],
    },
  };
}

function genAlphaJump(skill, lvl, count, rng) {
  const n = randInt(rng, 2, lvl < 0.5 ? 3 : 5);
  const back = lvl >= 0.4 && chance(rng, 0.45);
  const step = back ? -n : n;
  const i = back ? randInt(rng, n, 25) : randInt(rng, 0, 25 - n);
  const ch = ALPHA[i];
  const ans = ALPHA[i + step];
  const prompt = `Start at ${ch}. Jump ${n} ${back ? 'backwards' : 'forwards'}. Where do you land?`;
  const { options, answerIndex } = letterOptions(
    rng,
    ans,
    [at(i + step + 1), at(i + step - 1), at(i - step), at(i + step + (back ? -1 : 1) * 1), at(i + step * 2)],
    count,
  );
  const path = [];
  for (let k = 0; k < n; k++) path.push([at(i + (back ? -k : k)), at(i + (back ? -k - 1 : k + 1))]);
  return {
    skill,
    prompt,
    speak: `Start at ${ch}. Jump ${n} ${back ? 'backwards' : 'forwards'}. Where do you land?`,
    door: [`${ch} ${signed(step)}`],
    options,
    answerIndex,
    hint: { text: `Hop one letter at a time and count: ${path.map((p) => p[1]).join(', ')}. You land on ${ans}.`, strip: path },
  };
}

function genAlphaPos(skill, lvl, count, rng) {
  const anchors = [4, 9, 14, 19, 24]; // E J O T Y
  const i = lvl < 0.5 ? pick(rng, anchors) + pick(rng, [-1, 0, 1]) : randInt(rng, 0, 25);
  const ch = ALPHA[i];
  const pos = i + 1;
  const near = anchors.reduce((b, a) => (Math.abs(a - i) < Math.abs(b - i) ? a : b));
  const hintText =
    near === i
      ? `${ch} is an anchor letter: E is 5, J is 10, O is 15, T is 20, Y is 25.`
      : `Use the anchors (E5, J10, O15, T20, Y25). ${ALPHA[near]} is ${near + 1}, so ${ch} is ${pos}.`;
  if (chance(rng, 0.5)) {
    const near5 = [pos + 1, pos - 1, pos + 2, pos - 2, pos + 5, pos - 5].filter((v) => v >= 1 && v <= 26);
    const { values, answerIndex } = buildOptions(rng, pos, near5, count);
    return {
      skill,
      prompt: `What number is ${ch} in the alphabet?`,
      speak: `What number is the letter ${ch} in the alphabet?`,
      door: [`${ch} = ?`],
      options: values.map((v) => ({ label: String(v), speak: String(v), value: v })),
      answerIndex,
      hint: { text: hintText, strip: [[ALPHA[near], ch]] },
    };
  }
  const { options, answerIndex } = letterOptions(
    rng,
    ch,
    [at(i + 1), at(i - 1), at(i + 2), at(i - 2), at(i + 5)],
    count,
  );
  return {
    skill,
    prompt: `Which letter is number ${pos}?`,
    speak: `Which letter is number ${pos} in the alphabet?`,
    door: [`${pos} = ?`],
    options,
    answerIndex,
    hint: { text: hintText, strip: [[ALPHA[near], ch]] },
  };
}

function codeQuestion(skill, rng, count, { shifts, wrap, len }) {
  const w1 = pickWord(rng, len, shifts, wrap);
  const w2 = pickWord(rng, len, shifts, wrap, [w1]);
  const c1 = encode(w1, shifts, wrap);
  const c2 = encode(w2, shifts, wrap);
  const all = (n) => shifts.map((s) => s + n);
  const candidates = [
    encode(w2, shifts.map((s) => -s), true),
    encode(w2, all(1), true),
    encode(w2, all(-1), true),
    // One letter not moved — a very common slip.
    ...[...w2].map((_, k) => encode(w2, [...w2].map((__, m) => (m === k ? 0 : shifts[m % shifts.length])), true)),
    w2,
  ];
  const { options, answerIndex } = letterOptions(rng, c2, candidates, count);
  const same = shifts.every((s) => s === shifts[0]);
  const rule = same
    ? `${w1[0]} → ${c1[0]} is ${stepsSpeak(shifts[0])}. Every letter moves the same way`
    : `Each letter moves a different amount: ${[...w1].map((ch, k) => `${ch}→${c1[k]} (${signed(shifts[k % shifts.length])})`).join(', ')}`;
  const steps = [...w2].map((ch, k) => `${ch}→${c2[k]}`).join(', ');
  return {
    skill,
    prompt: `If ${w1} is written as ${c1}, how is ${w2} written?`,
    speak: `If ${spell(w1)} is written as ${spell(c1)}, how is ${spell(w2)} written?`,
    door: [`${w1} → ${c1}`, `${w2} → ?`],
    options,
    answerIndex,
    hint: {
      text: `${rule}. So ${steps}. The answer is ${c2}.${wrap ? ' (After Z, go back round to A.)' : ''}`,
      strip: [...w2].map((ch, k) => [ch, c2[k]]),
    },
  };
}

function genCode1(skill, lvl, count, rng) {
  const s = lvl < 0.4 ? 1 : pick(rng, [1, -1]);
  return codeQuestion(skill, rng, count, { shifts: [s], wrap: false, len: lvl < 0.7 ? 3 : pick(rng, [3, 4]) });
}

function genCodeN(skill, lvl, count, rng) {
  if (lvl >= 0.8 && chance(rng, 0.5)) {
    const shifts = pick(rng, [
      [1, 2, 3],
      [1, -1],
      [2, 1],
      [-1, -2, -3],
      [3, 2, 1],
    ]);
    return codeQuestion(skill, rng, count, { shifts, wrap: false, len: 3 });
  }
  const s = pick(rng, [2, 3, -2, lvl > 0.5 ? -3 : 2]);
  return codeQuestion(skill, rng, count, { shifts: [s], wrap: lvl >= 0.65, len: pick(rng, [3, 4]) });
}

function genDecode(skill, lvl, count, rng) {
  const s = lvl < 0.5 ? pick(rng, [1, -1]) : pick(rng, [2, -2, 1, 3]);
  const shifts = [s];
  const len = pick(rng, [3, 3, 4]);
  const w1 = pickWord(rng, len, shifts, false);
  const w2 = pickWord(rng, len, shifts, false, [w1]);
  const c1 = encode(w1, shifts, false);
  const c2 = encode(w2, shifts, false);
  const list = len === 4 ? WORDS4 : WORDS3;
  const candidates = [
    encode(c2, shifts, true), // moved the wrong way
    // One letter left in code form.
    ...[...w2].map((_, k) => encode(w2, [...w2].map((__, m) => (m === k ? s : 0)), true)),
    pick(rng, list.filter((w) => w !== w2 && w !== w1)),
    c2,
  ];
  const { options, answerIndex } = letterOptions(rng, w2, candidates, count);
  return {
    skill,
    prompt: `If ${w1} is written as ${c1}, what does ${c2} mean?`,
    speak: `If ${spell(w1)} is written as ${spell(c1)}, what word is ${spell(c2)}?`,
    door: [`${w1} → ${c1}`, `? → ${c2}`],
    options,
    answerIndex,
    hint: {
      text: `The code moves ${stepsSpeak(s)}. To crack it, go the other way: ${[...c2].map((ch, k) => `${ch}→${w2[k]}`).join(', ')}. It spells ${w2}.`,
      strip: [...c2].map((ch, k) => [ch, w2[k]]),
    },
  };
}

function genSeries(skill, lvl, count, rng) {
  const alt = lvl >= 0.8 && chance(rng, 0.4);
  const steps = alt ? pick(rng, [[1, 2], [2, 1], [1, 3]]) : [randInt(rng, 1, lvl < 0.5 ? 2 : 3)];
  const back = lvl >= 0.5 && chance(rng, 0.4);
  const dir = back ? -1 : 1;
  const span = (steps.reduce((a, b) => a + b, 0) / steps.length) * 4 + 3;
  const start = back ? randInt(rng, Math.ceil(span), 25) : randInt(rng, 0, Math.floor(25 - span));
  const seq = [start];
  for (let k = 0; k < 4; k++) seq.push(seq[k] + dir * steps[k % steps.length]);
  const shown = seq.slice(0, 4).map((i) => ALPHA[i]);
  const ans = ALPHA[seq[4]];
  const last = seq[3];
  const { options, answerIndex } = letterOptions(
    rng,
    ans,
    [at(seq[4] + 1), at(seq[4] - 1), at(last + dir * (steps[0] + 1)), at(last + dir * Math.max(1, steps[0] - 1)), at(last - dir * steps[0])],
    count,
  );
  const gaps = shown.slice(1).map((ch, k) => `${shown[k]}→${ch} (${signed(dir * steps[k % steps.length])})`).join(', ');
  return {
    skill,
    prompt: `What comes next? ${shown.join(', ')}, ?`,
    speak: `What comes next? ${shown.join(', ')}, then what?`,
    door: [`${shown.join('  ')}  ?`],
    options,
    answerIndex,
    hint: {
      text: `Count the jumps: ${gaps}. The next jump is ${signed(dir * steps[3 % steps.length])}, so ${ALPHA[last]}→${ans}.`,
      strip: [[ALPHA[last], ans]],
    },
  };
}

function genPairs(skill, lvl, count, rng) {
  const kind = lvl < 0.4 ? 'run' : pick(rng, ['run', 'mirror', 'mixed']);
  let pairs;
  if (kind === 'run') {
    const s = randInt(rng, 0, 15);
    pairs = [0, 1, 2, 3].map((k) => at(s + 2 * k) + at(s + 2 * k + 1));
  } else if (kind === 'mirror') {
    const s = randInt(rng, 0, 8);
    pairs = [0, 1, 2, 3].map((k) => at(s + k) + at(25 - s - k));
  } else {
    const s = randInt(rng, 0, 10);
    const t = randInt(rng, s + 1, 12);
    pairs = [0, 1, 2, 3].map((k) => at(s + k) + at(t + 2 * k));
  }
  const ans = pairs[3];
  const shown = pairs.slice(0, 3);
  const a = idx(ans[0]);
  const b = idx(ans[1]);
  const { options, answerIndex } = letterOptions(
    rng,
    ans,
    [at(a) + at(b + 1), at(a + 1) + at(b), at(a) + at(b - 1), ans[1] + ans[0], at(a - 1) + at(b)],
    count,
  );
  const why = {
    run: 'The letters just keep going in order, two at a time',
    mirror: 'The first letter moves forwards one step and the second letter moves backwards one step',
    mixed: 'Watch each letter on its own: the first moves +1 each time and the second moves +2',
  }[kind];
  return {
    skill,
    prompt: `What comes next? ${shown.join(', ')}, ?`,
    speak: `What comes next? ${shown.map(spell).join('; ')}; then what?`,
    door: [`${shown.join('  ')}  ?`],
    options,
    answerIndex,
    hint: {
      text: `${why}. So the next pair is ${ans}.`,
      strip: [
        [shown[2][0], ans[0]],
        [shown[2][1], ans[1]],
      ],
    },
  };
}

function genMirror(skill, lvl, count, rng) {
  const w = pick(rng, lvl < 0.6 ? WORDS3 : WORDS4);
  const m = [...w].map((ch) => at(25 - idx(ch))).join('');
  const candidates = [
    encode(w, [1], true),
    encode(w, [-1], true),
    ...[...w].map((_, k) => [...w].map((ch, j) => (j === k ? at(26 - idx(ch)) : at(25 - idx(ch)))).join('')),
    [...m].reverse().join(''),
  ];
  const { options, answerIndex } = letterOptions(rng, m, candidates, count);
  return {
    skill,
    prompt: `Mirror code: A↔Z, B↔Y, C↔X… What is ${w}?`,
    speak: `In a mirror code, A swaps with Z, B swaps with Y, and so on. What is the code for ${spell(w)}?`,
    door: ['A↔Z  B↔Y  C↔X', `${w} → ?`],
    options,
    answerIndex,
    hint: {
      text: `Mirror partners add up to 27. ${[...w].map((ch) => `${ch} is ${idx(ch) + 1}, so its partner is ${26 - idx(ch)}: ${at(25 - idx(ch))}`).join('. ')}. The answer is ${m}.`,
      strip: [...w].map((ch, k) => [ch, m[k]]),
    },
  };
}

export function genVerbal(skillId, lvl, count, rng) {
  switch (skillId) {
    case 'v.alphaNext':
      return genAlphaNext(skillId, lvl, count, rng);
    case 'v.alphaJump':
      return genAlphaJump(skillId, lvl, count, rng);
    case 'v.alphaPos':
      return genAlphaPos(skillId, lvl, count, rng);
    case 'v.code1':
      return genCode1(skillId, lvl, count, rng);
    case 'v.codeN':
      return genCodeN(skillId, lvl, count, rng);
    case 'v.decode':
      return genDecode(skillId, lvl, count, rng);
    case 'v.series':
      return genSeries(skillId, lvl, count, rng);
    case 'v.pairs':
      return genPairs(skillId, lvl, count, rng);
    case 'v.mirror':
      return genMirror(skillId, lvl, count, rng);
    default:
      throw new Error(`Unknown verbal skill ${skillId}`);
  }
}

export const _internal = { encode, WORDS3, WORDS4 };
