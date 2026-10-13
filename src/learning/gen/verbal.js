// Verbal reasoning: the alphabet, letter codes and letter series that make up
// a big share of GL-style (Kent Test) verbal reasoning. Every question carries
// `door` (the coded lines shown on a door or sign) and a hint whose `strip`
// steps animate the method on the alphabet strip.
import { choose, explainOptions, question, pickItem, pick, randInt, chance, range } from './util.js';
import { WORDS3, WORDS4, WORDS5 } from '../lexicon.js';

export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const idx = (ch) => ALPHA.indexOf(ch);
const at = (i) => ALPHA[((i % 26) + 26) % 26];
const inA = (i) => i >= 0 && i <= 25;
const spell = (s) => s.split('').join(', ');
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const stepsSpeak = (n) => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'step' : 'steps'} ${n > 0 ? 'forwards' : 'backwards'}`;
const letters = { label: (v) => v, speak: (v) => spell(v) };
const UP = (list) => list.map((x) => x.toUpperCase());
const W3 = UP(WORDS3);
const W4 = UP(WORDS4);
const W5 = UP(WORDS5);

// ---------------- alphabet order (fact) ----------------
const NEXT_MODES = { after: 1, before: -1, 'two-after': 2 };
export const alphaNext = {
  items(skill, band) {
    const lo = band <= 1 ? 2 : 0;
    const hi = band <= 1 ? 23 : 25;
    const out = [];
    for (let i = lo; i <= hi; i++) {
      if (inA(i + 1)) out.push(`after:${ALPHA[i]}`);
      if (inA(i - 1)) out.push(`before:${ALPHA[i]}`);
      if (band >= 3 && inA(i + 2)) out.push(`two-after:${ALPHA[i]}`);
    }
    return out;
  },
  formatsAt: (skill, band) => (band >= 3 ? ['after', 'before', 'two-after'] : ['after', 'before']),
  make(skill, { band, format, count, rng, item }) {
    let key = item;
    if (!key) {
      const all = alphaNext.items(skill, band).filter((k) => !format || k.startsWith(`${format}:`));
      key = pick(rng, all);
    }
    const [mode, ch] = key.split(':');
    const i = idx(ch);
    const d = NEXT_MODES[mode];
    const ans = ALPHA[i + d];
    const prompt = mode === 'two-after' ? `What letter is 2 after ${ch}?` : `What letter comes ${mode} ${ch}?`;
    const cands = [
      { v: at(i - d), mis: 'alpha-wrong-way' },
      { v: at(i + d + Math.sign(d)), mis: 'alpha-one-off' },
      mode === 'two-after' ? { v: at(i + 1), mis: 'alpha-count-start' } : { v: ch, mis: 'alpha-one-off' },
      { v: at(i + d - Math.sign(d) * 2), mis: 'alpha-one-off' },
      { v: at(i + d * 2 + Math.sign(d)), mis: 'alpha-one-off' },
    ].filter((c) => c.v !== ans);
    const { options, answerIndex } = choose(rng, ans, cands, count, letters);
    return question(skill, {
      format: mode, band, itemKey: key, answer: ans,
      prompt, speak: prompt, solved: prompt.replace('?', `: ${ans}`),
      door: [mode === 'after' ? `${ch} ?` : mode === 'before' ? `? ${ch}` : `${ch} _ ?`],
      options, answerIndex,
      hint: { text: mode === 'before' ? `Go back one letter from ${ch}: ${ans}.` : `Go forward ${d} from ${ch}: ${ans}.`, strip: [[ch, ans]] },
      explain: explainOptions(options, { answer: ans, dir: d < 0 ? 'back' : 'forward', n: d }),
      stem: { mode, ch },
    });
  },
};

// ---------------- letter positions (fact) ----------------
const ANCHORS = [4, 9, 14, 19, 24]; // E J O T Y
const nearestAnchor = (i) => ANCHORS.reduce((b, a) => (Math.abs(a - i) < Math.abs(b - i) ? a : b), ANCHORS[0]);
export const alphaPos = {
  items(skill, band) {
    const set = band <= 2 ? ANCHORS.flatMap((a) => [a - 1, a, a + 1]).filter(inA) : range(0, 25);
    return [...new Set(set)].sort((a, b) => a - b).map((i) => ALPHA[i]);
  },
  formatsAt: () => ['pos-num', 'pos-letter'],
  make(skill, { band, format, count, rng, item }) {
    const ch = pickItem(alphaPos, skill, band, rng, item);
    const i = idx(ch);
    const pos = i + 1;
    const near = nearestAnchor(i);
    const fmt = format || (chance(rng, 0.5) ? 'pos-num' : 'pos-letter');
    const how = near === i ? `${ch} is an anchor letter: ${pos}.` : `${ALPHA[near]} is ${near + 1}, and ${ch} is ${Math.abs(i - near)} ${i > near ? 'after' : 'before'} it, so ${pos}.`;
    if (fmt === 'pos-num') {
      const cands = [
        { v: pos + 1, mis: 'alpha-one-off' },
        { v: pos - 1, mis: 'alpha-one-off' },
        { v: pos + 2, mis: 'alpha-one-off' },
        { v: pos - 2, mis: 'alpha-one-off' },
        { v: pos + 5, mis: 'pos-anchor' },
        { v: pos - 5, mis: 'pos-anchor' },
      ].filter((c) => c.v >= 1 && c.v <= 26);
      const { options, answerIndex } = choose(rng, pos, cands, count);
      return question(skill, {
        format: fmt, band, itemKey: ch, answer: pos,
        prompt: `What number is ${ch} in the alphabet?`, speak: `What number is the letter ${ch} in the alphabet?`, solved: `${ch} is ${pos}`,
        door: [`${ch} = ?`], options, answerIndex,
        hint: { text: how, strip: [[ALPHA[near], ch]] },
        explain: explainOptions(options, { answer: pos, letter: ch }),
        stem: { ch },
      });
    }
    const cands = [
      { v: at(i + 1), mis: 'alpha-one-off' },
      { v: at(i - 1), mis: 'alpha-one-off' },
      { v: at(i + 2), mis: 'alpha-one-off' },
      { v: at(i - 2), mis: 'alpha-one-off' },
      { v: at(i + 5), mis: 'pos-anchor' },
    ].filter((c) => c.v !== ch);
    const { options, answerIndex } = choose(rng, ch, cands, count, letters);
    return question(skill, {
      format: fmt, band, itemKey: ch, answer: ch,
      prompt: `Which letter is number ${pos}?`, speak: `Which letter is number ${pos} in the alphabet?`, solved: `Number ${pos} is ${ch}`,
      door: [`${pos} = ?`], options, answerIndex,
      hint: { text: how, strip: [[ALPHA[near], ch]] },
      explain: explainOptions(options, { answer: ch, letter: ch }),
      stem: { pos },
    });
  },
};

// ---------------- jumping along the alphabet (procedural) ----------------
export const alphaJump = {
  formatsAt: (skill, band) => (band <= 1 ? ['jump', 'dist'] : ['jump', 'hops', 'dist']),
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, alphaJump.formatsAt(skill, band));
    const maxN = band <= 1 ? 3 : band === 2 ? 4 : band === 3 ? 5 : 6;
    if (fmt === 'jump') {
      const back = band >= 3 ? chance(rng, 0.45) : chance(rng, 0.25);
      const n = randInt(rng, back && band <= 2 ? 1 : 2, back && band <= 2 ? 2 : maxN);
      const d = back ? -n : n;
      const i = back ? randInt(rng, n, 25) : randInt(rng, 0, 25 - n);
      const ch = ALPHA[i];
      const ans = ALPHA[i + d];
      const cands = [
        { v: at(i + d - Math.sign(d)), mis: 'alpha-count-start' },
        { v: at(i + d + Math.sign(d)), mis: 'alpha-one-off' },
        inA(i - d) ? { v: ALPHA[i - d], mis: 'alpha-wrong-way' } : null,
        { v: at(i + 2 * d), mis: 'alpha-one-off' },
      ].filter((c) => c && c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count, letters);
      const prompt = `Start at ${ch}. Jump ${n} ${back ? 'backwards' : 'forwards'}. Where do you land?`;
      return question(skill, {
        format: fmt, band, itemKey: `j:${ch}:${signed(d)}`, answer: ans,
        prompt, speak: prompt, solved: `${ch} ${signed(d)} = ${ans}`,
        door: [`${ch} ${signed(d)}`], options, answerIndex,
        hint: { text: `Hop ${n} ${back ? 'back' : 'along'} from ${ch}, one letter at a time: ${range(1, n).map((k) => ALPHA[i + Math.sign(d) * k]).join(', ')}. You land on ${ans}.`, strip: range(1, n).map((k) => [ALPHA[i + Math.sign(d) * (k - 1)], ALPHA[i + Math.sign(d) * k]]) },
        explain: explainOptions(options, { answer: ans, n, dir: back ? 'back' : 'forward' }),
        stem: { ch, d },
      });
    }
    if (fmt === 'hops') {
      const n = randInt(rng, 2, maxN);
      const m = randInt(rng, 1, Math.max(1, maxN - 1));
      const backFirst = band >= 4 && chance(rng, 0.4);
      const [d1, d2] = backFirst ? [-n, m] : [n, -m];
      const lo = Math.max(0, -d1, -(d1 + d2));
      const hi = Math.min(25, 25 - d1, 25 - (d1 + d2));
      const i = randInt(rng, lo, hi);
      const ch = ALPHA[i];
      const mid = i + d1;
      const ans = ALPHA[mid + d2];
      const cands = [
        { v: ALPHA[mid], mis: 'alpha-one-off' },
        inA(i - d1 - d2) ? { v: ALPHA[i - d1 - d2], mis: 'alpha-wrong-way' } : null,
        inA(i + d1 - d2) ? { v: ALPHA[i + d1 - d2], mis: 'alpha-wrong-way' } : null,
        { v: at(mid + d2 + 1), mis: 'alpha-one-off' },
        { v: at(mid + d2 - 1), mis: 'alpha-one-off' },
      ].filter((c) => c && c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count, letters);
      const word = (d) => `${Math.abs(d)} ${d > 0 ? 'forwards' : 'back'}`;
      const prompt = `Start at ${ch}. Jump ${word(d1)}, then ${word(d2)}. Where do you land?`;
      return question(skill, {
        format: fmt, band, itemKey: `h:${ch}:${signed(d1)}:${signed(d2)}`, answer: ans,
        prompt, speak: prompt, solved: `${ch} ${signed(d1)} ${signed(d2)} = ${ans}`,
        door: [`${ch} ${signed(d1)} ${signed(d2)}`], options, answerIndex,
        hint: { text: `First jump: ${ch} → ${ALPHA[mid]}. Then ${word(d2)}: ${ALPHA[mid]} → ${ans}.`, strip: [[ch, ALPHA[mid]], [ALPHA[mid], ans]] },
        explain: explainOptions(options, { answer: ans, n: n, dir: 'forward' }),
        stem: { ch, d1, d2 },
      });
    }
    // dist: how many jumps from one letter to another
    const gap = randInt(rng, 2, band <= 1 ? 5 : band === 2 ? 7 : band === 3 ? 9 : 14);
    const i = randInt(rng, 0, 25 - gap);
    const [x, y] = band >= 4 && chance(rng, 0.4) ? [ALPHA[i + gap], ALPHA[i]] : [ALPHA[i], ALPHA[i + gap]];
    const cands = [
      { v: gap + 1, mis: 'alpha-count-start' },
      { v: gap - 1, mis: 'alpha-one-off' },
      { v: gap + 2, mis: 'alpha-one-off' },
      { v: gap - 2, mis: 'alpha-one-off' },
    ].filter((c) => c.v > 0);
    const { options, answerIndex } = choose(rng, gap, cands, count);
    const prompt = `How many jumps from ${x} to ${y}?`;
    return question(skill, {
      format: 'dist', band, itemKey: `d:${x}:${y}`, answer: gap,
      prompt, speak: `How many jumps along the alphabet from ${x} to ${y}?`, solved: `${x} to ${y} is ${gap} jumps`,
      door: [`${x} → ${y} = ?`], options, answerIndex,
      hint: { text: `Count the hops, not the letters: ${x} is ${idx(x) + 1} and ${y} is ${idx(y) + 1}, so it's ${gap} jumps.`, strip: [[x, y]] },
      explain: explainOptions(options, { answer: gap, n: gap }),
      stem: { x, y },
    });
  },
};

// ---------------- letter codes (procedural) ----------------
function encode(word, shifts, wrap) {
  let out = '';
  for (let i = 0; i < word.length; i++) {
    const j = idx(word[i]) + shifts[i % shifts.length];
    if (!wrap && !inA(j)) return null;
    out += at(j);
  }
  return out;
}
const listFor = (len) => (len === 5 ? W5 : len === 4 ? W4 : W3);
function pickWord(rng, len, shifts, wrap, avoid = []) {
  const list = listFor(len);
  for (let tries = 0; tries < 400; tries++) {
    const w = pick(rng, list);
    if (avoid.includes(w)) continue;
    if (encode(w, shifts, wrap) !== null && encode(w, shifts.map((s) => -s), wrap) !== null) return w;
  }
  throw new Error('No word fits shifts');
}

function codeQuestion(skill, band, fmt, rng, count, { shifts, wrap, len }) {
  const w1 = pickWord(rng, len, shifts, wrap);
  const w2 = pickWord(rng, len, shifts, wrap, [w1]);
  const c1 = encode(w1, shifts, wrap);
  const c2 = encode(w2, shifts, wrap);
  const all = (n) => shifts.map((s) => s + n);
  const cands = [
    { v: encode(w2, shifts.map((s) => -s), true), mis: 'code-wrong-way' },
    { v: encode(w2, all(1), true), mis: 'code-wrong-size' },
    { v: encode(w2, all(-1), true), mis: 'code-wrong-size' },
    ...[...w2].map((_, k) => ({ v: encode(w2, [...w2].map((__, m) => (m === k ? 0 : shifts[m % shifts.length])), true), mis: 'code-one-letter' })),
    { v: w2, mis: 'code-one-letter' },
  ];
  const { options, answerIndex } = choose(rng, c2, cands, count, letters);
  const same = shifts.every((s) => s === shifts[0]);
  const how = same ? stepsSpeak(shifts[0]) : [...w1].map((ch, k) => `${ch}→${c1[k]} (${signed(shifts[k % shifts.length])})`).join(', ');
  const rule = same ? `${w1[0]} → ${c1[0]} is ${how}. Every letter moves the same way` : `Each letter moves a different amount: ${how}`;
  return question(skill, {
    format: fmt, band, itemKey: `${w1}|${shifts.join(',')}|${w2}|${wrap ? 1 : 0}`, answer: c2,
    prompt: `If ${w1} is written as ${c1}, how is ${w2} written?`,
    speak: `If ${spell(w1)} is written as ${spell(c1)}, how is ${spell(w2)} written?`,
    solved: `${w2} is written as ${c2}`,
    door: [`${w1} → ${c1}`, `${w2} → ?`], options, answerIndex,
    hint: { text: `${rule}. So ${[...w2].map((ch, k) => `${ch}→${c2[k]}`).join(', ')}. The answer is ${c2}.${wrap ? ' (After Z, go back round to A.)' : ''}`, strip: [...w2].map((ch, k) => [ch, c2[k]]) },
    explain: explainOptions(options, { answer: c2, how }),
    stem: { w1, c1, w2, shifts, wrap },
  });
}

export const code1 = {
  formatsAt: () => ['code'],
  make(skill, { band, count, rng }) {
    const s = band <= 2 ? 1 : pick(rng, [1, -1]);
    const len = band <= 3 ? 3 : pick(rng, [3, 4, band >= 5 ? 5 : 4]);
    return codeQuestion(skill, band, 'code', rng, count, { shifts: [s], wrap: false, len });
  },
};

const PATTERNS = [[1, 2, 3], [1, -1], [2, 1], [-1, -2, -3], [3, 2, 1], [1, 2], [2, -1], [-2, 1], [1, 3], [3, 1]];
export const codeN = {
  formatsAt: () => ['code'],
  make(skill, { band, count, rng }) {
    if (band >= 4 && chance(rng, 0.5)) {
      const shifts = pick(rng, PATTERNS);
      return codeQuestion(skill, band, 'code', rng, count, { shifts, wrap: false, len: shifts.length === 3 ? 3 : pick(rng, [3, 4]) });
    }
    const s = pick(rng, band <= 2 ? [2, 2, 3] : [2, 3, -2, -3, 4]);
    return codeQuestion(skill, band, 'code', rng, count, { shifts: [s], wrap: band >= 4, len: pick(rng, band >= 4 ? [3, 4, 5] : [3, 4]) });
  },
};

export const decode = {
  formatsAt: () => ['decode'],
  make(skill, { band, count, rng }) {
    const s = band <= 2 ? pick(rng, [1, -1]) : pick(rng, [2, -2, 1, 3, -1]);
    const shifts = [s];
    const len = pick(rng, band <= 2 ? [3, 3, 4] : [3, 4, 4, 5]);
    const w1 = pickWord(rng, len, shifts, false);
    const w2 = pickWord(rng, len, shifts, false, [w1]);
    const c1 = encode(w1, shifts, false);
    const c2 = encode(w2, shifts, false);
    const cands = [
      { v: encode(c2, shifts, true), mis: 'decode-not-reversed' },
      ...[...w2].map((_, k) => ({ v: encode(w2, [...w2].map((__, m) => (m === k ? s : 0)), true), mis: 'code-one-letter' })),
      { v: c2, mis: 'code-one-letter' },
      { v: pick(rng, listFor(len).filter((x) => x !== w2 && x !== w1)), mis: 'code-wrong-size' },
    ];
    const { options, answerIndex } = choose(rng, w2, cands, count, letters);
    return question(skill, {
      format: 'decode', band, itemKey: `dec|${w1}|${s}|${w2}`, answer: w2,
      prompt: `If ${w1} is written as ${c1}, what does ${c2} mean?`,
      speak: `If ${spell(w1)} is written as ${spell(c1)}, what word is ${spell(c2)}?`,
      solved: `${c2} means ${w2}`,
      door: [`${w1} → ${c1}`, `? → ${c2}`], options, answerIndex,
      hint: { text: `The code moves ${stepsSpeak(s)}. To crack it, go the other way: ${[...c2].map((ch, k) => `${ch}→${w2[k]}`).join(', ')}. It spells ${w2}.`, strip: [...c2].map((ch, k) => [ch, w2[k]]) },
      explain: explainOptions(options, { answer: w2, how: stepsSpeak(-s) }),
      stem: { w1, c1, c2, shifts },
    });
  },
};

// ---------------- mirror codes (procedural) ----------------
const mirrorOf = (w) => [...w].map((ch) => at(25 - idx(ch))).join('');
export const mirror = {
  formatsAt: (skill, band) => (band <= 2 ? ['mirror'] : ['mirror', 'unmirror']),
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, mirror.formatsAt(skill, band));
    const w = pick(rng, band <= 1 ? W3 : band <= 3 ? [...W3, ...W4] : [...W3, ...W4, ...W5]);
    const m = mirrorOf(w);
    const [given, ans] = fmt === 'mirror' ? [w, m] : [m, w];
    const cands = [
      { v: encode(given, [1], true), mis: 'mirror-shift' },
      { v: encode(given, [-1], true), mis: 'mirror-shift' },
      ...[...given].map((_, k) => ({ v: [...given].map((ch, j) => (j === k ? at(26 - idx(ch)) : at(25 - idx(ch)))).join(''), mis: 'series-one-off' })),
      { v: [...ans].reverse().join(''), mis: 'series-wrong-step' },
    ];
    const { options, answerIndex } = choose(rng, ans, cands, count, letters);
    const prompt = fmt === 'mirror' ? `Mirror code: A↔Z, B↔Y, C↔X… What is ${w}?` : `Mirror code: A↔Z, B↔Y, C↔X… Which word is ${m}?`;
    return question(skill, {
      format: fmt, band, itemKey: w, answer: ans,
      prompt,
      speak: fmt === 'mirror' ? `In a mirror code, A swaps with Z, B swaps with Y, and so on. What is the code for ${spell(w)}?` : `In a mirror code, A swaps with Z, B swaps with Y, and so on. Which word is ${spell(m)}?`,
      solved: `${w} ↔ ${m}`,
      door: ['A↔Z B↔Y C↔X', fmt === 'mirror' ? `${w} → ?` : `? → ${m}`], options, answerIndex,
      hint: { text: `Mirror partners add up to 27. ${[...given].map((ch) => `${ch} is ${idx(ch) + 1}, so its partner is ${26 - idx(ch)}: ${at(25 - idx(ch))}`).join('. ')}. The answer is ${ans}.`, strip: [...given].map((ch, k) => [ch, ans[k]]) },
      explain: explainOptions(options, { answer: ans, how: 'swapping each letter with its partner' }),
      stem: { w, fmt },
    });
  },
};

// ---------------- letter series (procedural) ----------------
// Families: constant step, alternating steps, growing steps, two series
// interleaved. The checker (check/verbal.js) proves the rule is the only one
// that fits.
function seriesSpec(rng, band) {
  const fams = ['const'];
  if (band >= 3) fams.push('alt');
  if (band >= 4) fams.push('grow', 'inter');
  const fam = pick(rng, fams);
  const dir = band >= 2 && chance(rng, 0.4) ? -1 : 1;
  const len = fam === 'inter' ? 6 : band <= 1 ? pick(rng, [4, 5]) : pick(rng, [4, 5, 5, 6]);
  let steps;
  if (fam === 'const') steps = [randInt(rng, 1, band <= 1 ? 3 : band === 2 ? 4 : 5)];
  else if (fam === 'alt') steps = pick(rng, [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]]);
  else if (fam === 'grow') steps = [1, 2, 3, 4, 5].slice(0, len);
  else steps = null;
  return { fam, dir, len, steps };
}

export const series = {
  formatsAt: () => ['series'],
  make(skill, { band, count, rng }) {
    for (let tries = 0; tries < 100; tries++) {
      const { fam, dir, len, steps } = seriesSpec(rng, band);
      let seq;
      let why;
      if (fam === 'inter') {
        // Two series take turns: e.g. A Z B Y C X ?
        const a = randInt(rng, 0, 8);
        const b = randInt(rng, 17, 25);
        const sa = pick(rng, [1, 2]);
        const sb = -pick(rng, [1, 2]);
        seq = range(0, len).map((k) => (k % 2 === 0 ? a + (k / 2) * sa : b + ((k - 1) / 2) * sb));
        why = `Two patterns take turns: one goes ${signed(sa)}, the other ${signed(sb)}`;
      } else {
        const st = (k) => (fam === 'grow' ? steps[k] : steps[k % steps.length]);
        const span = range(0, len - 1).reduce((s, k) => s + st(k), 0);
        const start = dir > 0 ? randInt(rng, 0, 25 - span) : randInt(rng, span, 25);
        if (!inA(start)) continue;
        seq = [start];
        for (let k = 0; k < len; k++) seq.push(seq[k] + dir * st(k));
        why = fam === 'const' ? `Every jump is ${signed(dir * steps[0])}` : fam === 'alt' ? `The jumps take turns: ${steps.map((s) => signed(dir * s)).join(', ')}` : 'Each jump is one bigger than the last';
      }
      if (!seq.every(inA)) continue;
      const shown = seq.slice(0, len).map((i) => ALPHA[i]);
      const ansI = seq[len];
      const ans = ALPHA[ansI];
      const last = seq[len - 1];
      const step = ansI - last;
      const cands = [
        { v: at(ansI + 1), mis: 'series-one-off' },
        { v: at(ansI - 1), mis: 'series-one-off' },
        { v: at(last + step + Math.sign(step)), mis: 'series-wrong-step' },
        { v: at(last - step), mis: 'series-wrong-step' },
        fam !== 'inter' ? { v: at(last + (seq[len - 1] - seq[len - 2])), mis: 'series-wrong-step' } : { v: at(seq[len - 1] + 1), mis: 'series-wrong-step' },
        { v: at(ansI + 2), mis: 'series-one-off' },
        { v: at(ansI - 2), mis: 'series-one-off' },
      ].filter((c) => c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count, letters);
      return question(skill, {
        format: 'series', band, itemKey: `${fam}|${shown.join('')}`, answer: ans,
        prompt: `What comes next? ${shown.join(', ')}, ?`,
        speak: `What comes next? ${shown.join(', ')}, then what?`,
        solved: `${shown.join(', ')}, ${ans}`,
        door: [`${shown.join('  ')}  ?`], options, answerIndex,
        hint: { text: `${why}. So ${ALPHA[last]} → ${ans}.`, strip: [[ALPHA[last], ans]] },
        explain: explainOptions(options, { answer: ans, how: why.toLowerCase() }),
        stem: { fam, shown },
      });
    }
    throw new Error('Could not build a series');
  },
};

// ---------------- letter-pair series (procedural) ----------------
export const pairs = {
  formatsAt: () => ['pairs'],
  make(skill, { band, count, rng }) {
    const steps = band <= 2 ? [[1, 1], [2, 2], [1, 2], [2, 1]] : [[1, 1], [2, 2], [1, 2], [2, 1], [1, -1], [-1, 1], [2, -1], [1, 3], [3, 1], [-1, -2], [2, -2]];
    for (let tries = 0; tries < 100; tries++) {
      const [s1, s2] = pick(rng, steps);
      const shownN = band <= 2 ? 3 : pick(rng, [3, 4]);
      const a0 = randInt(rng, 0, 25);
      const b0 = randInt(rng, 0, 25);
      const terms = range(0, shownN).map((k) => [a0 + s1 * k, b0 + s2 * k]);
      if (!terms.every(([a, b]) => inA(a) && inA(b))) continue;
      const str = terms.map(([a, b]) => ALPHA[a] + ALPHA[b]);
      const ans = str[shownN];
      const shown = str.slice(0, shownN);
      const [a, b] = terms[shownN];
      const cands = [
        { v: at(a) + at(b + 1), mis: 'series-one-off' },
        { v: at(a + 1) + at(b), mis: 'series-one-off' },
        { v: at(a) + at(b - 1), mis: 'series-one-off' },
        { v: ans[1] + ans[0], mis: 'series-wrong-step' },
        { v: at(a - s1) + at(b - s2), mis: 'series-wrong-step' },
        { v: at(a + s2) + at(b + s1), mis: 'series-wrong-step' },
      ].filter((c) => c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count, letters);
      const why = `Watch each letter on its own: the first moves ${signed(s1)} each time and the second moves ${signed(s2)}`;
      return question(skill, {
        format: 'pairs', band, itemKey: shown.join(''), answer: ans,
        prompt: `What comes next? ${shown.join(', ')}, ?`,
        speak: `What comes next? ${shown.map(spell).join('; ')}; then what?`,
        solved: `${shown.join(', ')}, ${ans}`,
        door: [`${shown.join('  ')}  ?`], options, answerIndex,
        hint: { text: `${why}. So the next pair is ${ans}.`, strip: [[shown.at(-1)[0], ans[0]], [shown.at(-1)[1], ans[1]]] },
        explain: explainOptions(options, { answer: ans, how: why.toLowerCase() }),
        stem: { shown, s1, s2 },
      });
    }
    throw new Error('Could not build pairs');
  },
};
