// Year 3 Autumn number (Autumn Woods, Number zone): place value to 1,000,
// comparing, 10/100 more or less, counting in steps, mental and column
// addition and subtraction, missing numbers, doubling and halving, and
// one-step word problems. All procedural: big item spaces, stable item keys
// and a named misconception behind every wrong option.
import { choose, explainOptions, question, pick, randInt, chance, rev } from './util.js';
import { story } from './stories.js';

const PLACES = ['hundreds', 'tens', 'ones'];
const digitsOf = (n) => String(n).split('').map(Number);
const mk = (skill, band, format, itemKey, answer, prompt, extra) =>
  question(skill, { format, band, itemKey, answer, prompt, speak: extra.speak ?? prompt.replace('?', 'what'), solved: extra.solved ?? prompt.replace('?', String(answer)), ...extra });

// A 3-digit number; `distinct` avoids repeated digits, `zeros` allows a 0.
function threeDigit(rng, { distinct = false, zeros = false } = {}) {
  for (;;) {
    const n = randInt(rng, 100, 999);
    const d = digitsOf(n);
    if (!zeros && d.includes(0)) continue;
    if (distinct && new Set(d).size !== 3) continue;
    return n;
  }
}

// ---------------- place value ----------------
export const pv3 = {
  formatsAt: (skill, band) => (band <= 1 ? ['pv-digit', 'pv-partition'] : ['pv-digit', 'pv-partition', 'pv-make']),
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, pv3.formatsAt(skill, band));
    if (fmt === 'pv-digit') {
      const n = threeDigit(rng, { zeros: band >= 3 });
      const d = digitsOf(n);
      const places = [0, 1, 2].filter((p) => d[p] !== 0 && d.filter((x) => x === d[p]).length === 1 && (band >= 2 || p < 2));
      if (!places.length) return pv3.make(skill, { band, format, count, rng });
      const p = pick(rng, places);
      const digit = d[p];
      const value = digit * 10 ** (2 - p);
      const cands = [
        { v: digit, mis: 'pv-face' },
        ...[0, 1, 2].filter((q) => q !== p).map((q) => ({ v: digit * 10 ** (2 - q), mis: 'pv-place' })),
        { v: value * 10, mis: 'pv-place' },
        { v: n, mis: 'pv-face' },
      ];
      const { options, answerIndex } = choose(rng, value, cands, count);
      return mk(skill, band, fmt, `digit:${n}:${p}`, value, `What is the value of the ${digit} in ${n}?`, {
        solved: `The ${digit} in ${n} is worth ${value}`,
        options, answerIndex,
        hint: { text: `${n} is ${d[0]} hundreds, ${d[1]} tens and ${d[2]} ones. The ${digit} is in the ${PLACES[p]} place, so it's worth ${value}.` },
        explain: explainOptions(options, { digit, place: PLACES[p], answer: value }),
        stem: { n, p },
      });
    }
    if (fmt === 'pv-partition') {
      const zeros = band >= 4;
      const n = threeDigit(rng, { zeros });
      const [h, t, o] = digitsOf(n);
      let parts = [h * 100, t * 10, o].filter((x) => x > 0);
      if (band >= 3 && chance(rng, 0.6)) parts = parts.slice().sort(() => rng() - 0.5);
      const prompt = `${parts.join(' + ')} = ?`;
      const cands = [
        { v: Number(parts.join('')), mis: 'pv-concat' },
        t === 0 ? { v: h * 10 + o, mis: 'pv-zero' } : null,
        o === 0 ? { v: h * 10 + t, mis: 'pv-zero' } : null,
        { v: rev(n), mis: 'swap-digits' },
        { v: n + 10, mis: 'tens-slip' },
        { v: n - 10, mis: 'tens-slip' },
        { v: n + 100, mis: 'pv-place' },
      ].filter((c) => c && c.v > 0 && c.v !== n);
      const { options, answerIndex } = choose(rng, n, cands, count);
      return mk(skill, band, fmt, `sum:${n}:${parts.join('+')}`, n, prompt, {
        speak: `${parts.join(' add ')}`,
        options, answerIndex,
        hint: { text: `Put each part in its place: ${h} hundreds, ${t} tens and ${o} ones make ${n}.` },
        explain: explainOptions(options, { parts: parts.join(' + '), answer: n }),
        stem: { n },
      });
    }
    // pv-make: hundreds, tens and ones (band 4+: more than 9 of a unit)
    const exchange = band >= 4 && chance(rng, 0.5);
    let h = randInt(rng, 1, 8);
    let t = randInt(rng, exchange ? 10 : 0, exchange ? 19 : 9);
    let o = randInt(rng, 0, 9);
    if (exchange && chance(rng, 0.5)) [t, o] = [randInt(rng, 0, 9), randInt(rng, 10, 19)];
    const n = h * 100 + t * 10 + o;
    if (n > 999) return pv3.make(skill, { band, format, count, rng });
    const unit = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    const prompt = `${unit(h, 'hundred', 'hundreds')}, ${unit(t, 'ten', 'tens')} and ${unit(o, 'one', 'ones')} make ?`;
    const cands = [
      { v: Number(`${h}${t}${o}`), mis: t > 9 || o > 9 ? 'pv-exchange' : 'pv-concat' },
      { v: h * 100 + o * 10 + t, mis: 'pv-place' },
      { v: n + 10, mis: 'tens-slip' },
      { v: n - 10, mis: 'tens-slip' },
      { v: n + 100, mis: 'pv-place' },
      { v: n - 100, mis: 'pv-place' },
    ].filter((c) => c.v > 0 && c.v !== n && c.v < 10000);
    const { options, answerIndex } = choose(rng, n, cands, count);
    return mk(skill, band, 'pv-make', `make:${h}:${t}:${o}`, n, prompt, {
      speak: `${unit(h, 'hundred', 'hundreds')}, ${unit(t, 'ten', 'tens')} and ${unit(o, 'one', 'ones')} make what number?`,
      solved: `They make ${n}`,
      options, answerIndex,
      hint: { text: t > 9 || o > 9 ? `Exchange first: ten ${o > 9 ? 'ones make a ten' : 'tens make a hundred'}. ${h * 100} + ${t * 10} + ${o} = ${n}.` : `${h * 100} + ${t * 10} + ${o} = ${n}.` },
      explain: explainOptions(options, { parts: `${h * 100} + ${t * 10} + ${o}`, answer: n }),
      stem: { h, t, o },
    });
  },
};

// ---------------- comparing and ordering ----------------
export const cmp3 = {
  formatsAt: (skill, band, count = 3) => (count > 3 ? ['cmp-big', 'cmp-small'] : ['cmp-big', 'cmp-small', 'cmp-sign']),
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, cmp3.formatsAt(skill, band));
    if (fmt === 'cmp-sign') {
      if (count > 3) throw new Error('only three signs');
      const a = threeDigit(rng, { zeros: band >= 3 });
      let b;
      const r = rng();
      if (band >= 2 && r < 0.15) b = a;
      else if (r < 0.6) b = Number(String(a)[0] + String(a)[2] + String(a)[1]); // same digits, tens and ones swapped
      else b = threeDigit(rng, { zeros: band >= 3 });
      const sign = a < b ? '<' : a > b ? '>' : '=';
      const flip = sign === '<' ? '>' : sign === '>' ? '<' : '<';
      const cands = [{ v: flip, mis: 'cmp-sign-flip' }, { v: sign === '=' ? '>' : '=', mis: 'cmp-ones-first' }];
      const words = { '<': 'less than', '>': 'more than', '=': 'equals' };
      const { options, answerIndex } = choose(rng, sign, cands, count, { speak: (v) => words[v] });
      return mk(skill, band, fmt, `sign:${a}:${b}`, sign, `${a} ? ${b}`, {
        speak: `Which sign goes between ${a} and ${b}: less than, more than or equals?`,
        solved: `${a} ${sign} ${b}`,
        options, answerIndex,
        hint: { text: `Compare the hundreds first, then the tens, then the ones. ${a} is ${words[sign]} ${b}. The open mouth of < or > faces the bigger number.` },
        explain: explainOptions(options, { answer: sign, which: words[sign] }),
        stem: { a, b },
      });
    }
    // biggest or smallest: numbers built from the same digits trip up "ones first"
    const big = fmt === 'cmp-big';
    const d = digitsOf(threeDigit(rng, { distinct: true, zeros: band >= 3 }));
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
      .map((p) => Number(p.map((i) => d[i]).join('')))
      .filter((n) => n >= 100);
    const pool = [...new Set(band >= 4 ? [...perms, threeDigit(rng), threeDigit(rng)] : perms)];
    if (pool.length < count) throw new Error('not enough numbers');
    const set = pool.sort(() => rng() - 0.5).slice(0, count);
    const answer = big ? Math.max(...set) : Math.min(...set);
    const ones = (n) => n % 10;
    const trap = set.filter((n) => n !== answer).sort((x, y) => (big ? ones(y) - ones(x) : ones(x) - ones(y)))[0];
    const cands = set.filter((n) => n !== answer).map((n) => ({ v: n, mis: n === trap ? 'cmp-ones-first' : 'off-by-one' }));
    const { options, answerIndex } = choose(rng, answer, cands, count);
    const which = big ? 'biggest' : 'smallest';
    return mk(skill, band, fmt, `${which}:${set.slice().sort((x, y) => x - y).join(',')}`, answer, `Which number is ${which}?`, {
      speak: `Which number is ${which}?`,
      solved: `${answer} is the ${which}`,
      options, answerIndex,
      hint: { text: `Look at the hundreds first. If they're the same, look at the tens, then the ones. ${answer} is the ${which}.` },
      explain: explainOptions(options, { answer, which }),
      stem: { set },
    });
  },
};

// ---------------- 10 or 100 more or less ----------------
export const more = {
  formatsAt: () => ['more', 'less'],
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, more.formatsAt(skill, band));
    const step = pick(rng, [10, 100]);
    const sign = fmt === 'more' ? 1 : -1;
    for (let tries = 0; tries < 200; tries++) {
      const n = randInt(rng, 100, 999);
      const ans = n + sign * step;
      if (ans < 0 || ans > 999) continue;
      const placeDigit = Math.floor(n / step) % 10;
      const crosses = sign > 0 ? placeDigit === 9 : placeDigit === 0;
      if (band <= 1 && crosses) continue;
      if (band >= 3 && !crosses && chance(rng, 0.5)) continue;
      const otherStep = step === 10 ? 100 : 10;
      const cands = [
        { v: n + sign * otherStep, mis: 'more-wrong-place' },
        { v: n + sign, mis: 'more-wrong-place' },
        { v: n - sign * step, mis: 'more-direction' },
        crosses ? { v: n - sign * step * 9, mis: 'more-no-bridge' } : null,
        { v: ans + sign * step, mis: 'off-by-one' },
      ].filter((c) => c && c.v >= 0 && c.v <= 9999 && c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count);
      const place = step === 10 ? 'tens' : 'hundreds';
      return mk(skill, band, fmt, `${fmt}:${step}:${n}`, ans, `What is ${step} ${fmt} than ${n}?`, {
        solved: `${step} ${fmt} than ${n} is ${ans}`,
        options, answerIndex,
        hint: { text: `${step} ${fmt} changes the ${place} digit by one${crosses ? ' — and here it crosses into the next ' + (step === 10 ? 'hundred' : 'thousand') : ''}: ${n} → ${ans}.` },
        explain: explainOptions(options, { answer: ans, n, step, dir: fmt, place }),
        stem: { n, step, fmt },
      });
    }
    throw new Error('no number fits');
  },
};

// ---------------- counting in 4s, 8s, 50s, 100s ----------------
export const steps = {
  formatsAt: () => ['steps-next', 'steps-missing'],
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, steps.formatsAt(skill, band));
    const step = pick(rng, band <= 1 ? [4, 100, 50] : [4, 8, 50, 100]);
    const len = pick(rng, [4, 5, 5]);
    const down = band >= 5 && chance(rng, 0.4);
    const offset = band >= 4 && step < 50 && chance(rng, 0.5) ? randInt(rng, 1, step - 1) : 0;
    const maxK = step >= 50 ? 1000 / step - len : (band <= 2 ? 12 : 25) - len;
    const k0 = randInt(rng, 0, Math.max(0, maxK));
    let seq = Array.from({ length: len }, (_, i) => offset + (k0 + i) * step);
    if (down) seq = seq.reverse();
    const gap = fmt === 'steps-next' ? len - 1 : randInt(rng, 1, len - 2);
    const ans = seq[gap];
    const shown = seq.map((v, i) => (i === gap ? '?' : String(v)));
    const d = down ? -step : step;
    const prev = gap > 0 ? seq[gap - 1] : seq[gap + 1] - d;
    const cands = [
      { v: prev + d + (step === 4 ? 1 : step === 8 ? 2 : 10), mis: 'step-wrong-size' },
      { v: prev + d - (step === 4 ? 1 : step === 8 ? 2 : 10), mis: 'step-wrong-size' },
      { v: prev + (step === 8 ? d / 2 : step === 4 ? d * 2 : d / 2), mis: 'step-wrong-size' },
      { v: ans + 1, mis: 'off-by-one' },
      { v: ans + d, mis: 'off-by-one' },
    ].filter((c) => c.v >= 0 && c.v !== ans);
    const { options, answerIndex } = choose(rng, ans, cands, count);
    const prompt = fmt === 'steps-next' ? `What comes next? ${shown.join(', ')}` : `What is missing? ${shown.join(', ')}`;
    return mk(skill, band, fmt, `${step}:${seq.join(',')}:${gap}`, ans, prompt, {
      speak: fmt === 'steps-next' ? `What comes next? ${seq.slice(0, -1).join(', ')}, then what?` : `What number is missing? ${shown.map((x) => (x === '?' ? 'something' : x)).join(', ')}`,
      solved: seq.join(', '),
      door: [shown.join('  ')],
      options, answerIndex,
      hint: { text: `The numbers go ${down ? 'down' : 'up'} in ${step}s each time, so the missing number is ${ans}.` },
      explain: explainOptions(options, { answer: ans, step }),
      stem: { step, seq, gap },
    });
  },
};

// ---------------- mental add and subtract: ones, tens or hundreds ----------------
function mental(op) {
  return {
    formatsAt: () => [op],
    make(skill, { band, count, rng }) {
      for (let tries = 0; tries < 200; tries++) {
        const n = randInt(rng, 100, 999);
        const place = pick(rng, [1, 10, 100]);
        const k = randInt(rng, 1, 9) * place;
        const ans = op === 'add' ? n + k : n - k;
        if (ans < 0 || ans > 999) continue;
        const pd = Math.floor(n / place) % 10;
        const kd = k / place;
        const crosses = op === 'add' ? pd + kd >= 10 : pd < kd;
        if (band <= 1 && crosses) continue;
        if (band >= 3 && !crosses && chance(rng, 0.6)) continue;
        const sym = op === 'add' ? '+' : '−';
        const wrongPlace = place === 10 ? [1, 100] : place === 1 ? [10] : [10];
        const cands = [
          ...wrongPlace.map((p2) => ({ v: op === 'add' ? n + kd * p2 : n - kd * p2, mis: 'more-wrong-place' })),
          crosses ? { v: op === 'add' ? ans - 10 * place : ans + 10 * place, mis: 'col-no-carry' } : null,
          { v: op === 'add' ? n - k : n + k, mis: op === 'add' ? 'sub-not-add' : 'add-not-sub' },
          { v: ans + place, mis: 'off-by-one' },
          { v: ans - place, mis: 'off-by-one' },
        ].filter((c) => c && c.v >= 0 && c.v <= 9999 && c.v !== ans);
        const { options, answerIndex } = choose(rng, ans, cands, count);
        const placeName = place === 1 ? 'ones' : place === 10 ? 'tens' : 'hundreds';
        return mk(skill, band, op, `${op}:${n}:${k}`, ans, `${n} ${sym} ${k} = ?`, {
          speak: `${n} ${op === 'add' ? 'add' : 'take away'} ${k}`,
          options, answerIndex,
          hint: { text: `Only the ${placeName} change${crosses ? ` — and they cross into the next place, so that digit changes too` : ''}: ${n} ${sym} ${k} = ${ans}.` },
          explain: explainOptions(options, { answer: ans, n, step: k, dir: op === 'add' ? 'more' : 'less', place: placeName }),
          stem: { n, k, op },
        });
      }
      throw new Error('no number fits');
    },
  };
}
export const add3m = mental('add');
export const sub3m = mental('sub');

// ---------------- column addition and subtraction ----------------
const pad = (n, w) => String(n).padStart(w, ' ');
function noCarrySum(a, b) {
  // add each column, dropping the carries
  const A = String(a).padStart(4, '0');
  const B = String(b).padStart(4, '0');
  return Number([0, 1, 2, 3].map((i) => (Number(A[i]) + Number(B[i])) % 10).join(''));
}
function concatSum(a, b) {
  // write every column total in full, side by side
  const A = String(a).padStart(3, '0');
  const B = String(b).padStart(3, '0');
  return Number([0, 1, 2].map((i) => Number(A[i]) + Number(B[i])).join(''));
}
function smallFromBig(a, b) {
  const A = String(a).padStart(3, '0');
  const B = String(b).padStart(3, '0');
  return Number([0, 1, 2].map((i) => Math.abs(Number(A[i]) - Number(B[i]))).join(''));
}
function noDecrement(a, b) {
  // exchanges a ten (or hundred) but forgets to take it off the next column
  const A = String(a).padStart(3, '0').split('').map(Number);
  const B = String(b).padStart(3, '0').split('').map(Number);
  const out = [];
  for (let i = 2; i >= 0; i--) out[i] = A[i] < B[i] ? A[i] + 10 - B[i] : A[i] - B[i];
  return Number(out.join(''));
}
const carries = (a, b) => {
  let c = 0;
  let n = 0;
  for (let p = 1; p <= 100; p *= 10) {
    const s = (Math.floor(a / p) % 10) + (Math.floor(b / p) % 10) + c;
    c = s >= 10 ? 1 : 0;
    n += c;
  }
  return n;
};
const borrows = (a, b) => {
  let n = 0;
  let br = 0;
  for (let p = 1; p <= 100; p *= 10) {
    const d = (Math.floor(a / p) % 10) - br - (Math.floor(b / p) % 10);
    br = d < 0 ? 1 : 0;
    n += br;
  }
  return n;
};

export const addcol = {
  formatsAt: () => ['col-add'],
  make(skill, { band, count, rng }) {
    const want = band <= 1 ? 0 : band === 2 ? 1 : 2;
    for (let tries = 0; tries < 500; tries++) {
      const a = randInt(rng, 100, 899);
      const b = band >= 4 && chance(rng, 0.4) ? randInt(rng, 10, 99) : randInt(rng, 100, 899);
      const s = a + b;
      if (s > 999) continue;
      const c = carries(a, b);
      if (band <= 3 ? c !== want : c < 1) continue;
      const cands = [
        c ? { v: noCarrySum(a, b), mis: 'col-no-carry' } : null,
        c ? { v: concatSum(a, b), mis: 'col-concat' } : null,
        { v: s + 10, mis: 'tens-slip' },
        { v: s - 10, mis: 'tens-slip' },
        { v: s + 100, mis: 'pv-place' },
        { v: s + 1, mis: 'off-by-one' },
      ].filter((x) => x && x.v > 0 && x.v !== s && x.v < 100000);
      const { options, answerIndex } = choose(rng, s, cands, count);
      return mk(skill, band, 'col-add', `${Math.min(a, b)}+${Math.max(a, b)}`, s, `${a} + ${b} = ?`, {
        speak: `${a} add ${b}`,
        display: { column: [pad(a, 4), `+${pad(b, 3)}`] },
        options, answerIndex,
        hint: { text: `Add the ones, then the tens, then the hundreds. ${c ? 'When a column makes 10 or more, carry the ten into the next column. ' : ''}${a} + ${b} = ${s}.` },
        explain: explainOptions(options, { answer: s }),
        stem: { a, b, op: 'add' },
      });
    }
    throw new Error('no sum fits');
  },
};

export const subcol = {
  formatsAt: () => ['col-sub'],
  make(skill, { band, count, rng }) {
    for (let tries = 0; tries < 800; tries++) {
      const a = band >= 4 && chance(rng, 0.4) ? randInt(rng, 1, 9) * 100 + randInt(rng, 0, 9) : randInt(rng, 200, 999);
      const b = randInt(rng, 100, a - 1);
      const d = a - b;
      const br = borrows(a, b);
      const want = band <= 1 ? 0 : band === 2 ? 1 : null;
      if (want !== null && br !== want) continue;
      if (want === null && br < 1) continue;
      const cands = [
        br ? { v: smallFromBig(a, b), mis: 'col-small-from-big' } : null,
        br ? { v: noDecrement(a, b), mis: 'col-no-decrement' } : null,
        { v: d + 10, mis: 'tens-slip' },
        { v: d - 10, mis: 'tens-slip' },
        { v: a + b, mis: 'add-not-sub' },
        { v: d + 1, mis: 'off-by-one' },
      ].filter((x) => x && x.v >= 0 && x.v !== d && x.v < 10000);
      const { options, answerIndex } = choose(rng, d, cands, count);
      return mk(skill, band, 'col-sub', `${a}-${b}`, d, `${a} − ${b} = ?`, {
        speak: `${a} take away ${b}`,
        display: { column: [pad(a, 4), `−${pad(b, 3)}`] },
        options, answerIndex,
        hint: { text: `Start with the ones. If the top digit is smaller, exchange a ten from the next column (and take one off that column). ${a} − ${b} = ${d}.` },
        explain: explainOptions(options, { answer: d }),
        stem: { a, b, op: 'sub' },
      });
    }
    throw new Error('no sum fits');
  },
};

// ---------------- missing numbers (inverse) ----------------
export const inverse = {
  formatsAt: () => ['missing-add', 'missing-sub'],
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, inverse.formatsAt(skill, band));
    const unit = band <= 1 ? 100 : band === 2 ? 10 : 1;
    const top = band <= 2 ? 1000 : 999;
    const total = Math.min(top, randInt(rng, 2, Math.floor(top / unit)) * unit);
    const part = randInt(rng, 1, Math.max(1, total / unit - 1)) * unit;
    const missing = total - part;
    if (missing <= 0) return inverse.make(skill, { band, format, count, rng });
    let prompt;
    let inverseText;
    let wrongOp;
    if (fmt === 'missing-add') {
      prompt = chance(rng, 0.5) ? `? + ${part} = ${total}` : `${part} + ? = ${total}`;
      inverseText = `${total} − ${part}`;
      wrongOp = total + part;
    } else if (chance(rng, 0.5)) {
      prompt = `${total} − ? = ${part}`;
      inverseText = `${total} − ${part}`;
      wrongOp = total + part;
    } else {
      // ? − part = missing  → ? = missing + part = total
      prompt = `? − ${part} = ${missing}`;
      inverseText = `${missing} + ${part}`;
      wrongOp = Math.abs(missing - part);
    }
    const ans = prompt.startsWith('? −') ? total : missing;
    const cands = [
      { v: wrongOp, mis: 'inv-wrong-op' },
      { v: ans + 10, mis: 'tens-slip' },
      { v: ans - 10, mis: 'tens-slip' },
      { v: ans + 100, mis: 'pv-place' },
      { v: ans + 1, mis: 'off-by-one' },
    ].filter((c) => c.v > 0 && c.v !== ans && c.v < 10000);
    const { options, answerIndex } = choose(rng, ans, cands, count);
    return mk(skill, band, fmt, `${prompt.replace(/\s/g, '')}`, ans, prompt, {
      speak: prompt.replace('?', 'what number').replace('−', 'take away').replace('+', 'add').replace('=', 'equals'),
      options, answerIndex,
      hint: { text: `Use the inverse: ${inverseText} = ${ans}. Check: put ${ans} back in and the sum works.` },
      explain: explainOptions(options, { answer: ans, inverse: `${inverseText} = ${ans}` }),
      stem: { total, part },
    });
  },
};

// ---------------- doubling and halving bigger numbers ----------------
export const double2 = {
  formatsAt: () => ['double', 'half'],
  make(skill, { band, format, count, rng }) {
    const fmt = format || pick(rng, double2.formatsAt(skill, band));
    if (fmt === 'double') {
      const n = band <= 2 ? randInt(rng, 11, 49) : band === 3 ? randInt(rng, 21, 99) : band === 4 ? randInt(rng, 20, 99) * 5 : randInt(rng, 101, 499);
      const ans = n * 2;
      const tens = n - (n % 10);
      const cands = [
        { v: ans + 10, mis: 'tens-slip' },
        { v: ans - 10, mis: 'tens-slip' },
        { v: n + 2, mis: 'double-add-two' },
        { v: tens * 2 + (n % 10), mis: 'off-by-one' },
        { v: ans + 1, mis: 'off-by-one' },
      ].filter((c) => c.v > 0 && c.v !== ans);
      const { options, answerIndex } = choose(rng, ans, cands, count);
      return mk(skill, band, 'double', `d:${n}`, ans, `Double ${n} = ?`, {
        speak: `What is double ${n}?`,
        options, answerIndex,
        hint: { text: `Double the tens and the ones separately: double ${tens} is ${tens * 2}, double ${n % 10} is ${(n % 10) * 2}. Together ${ans}.` },
        explain: explainOptions(options, { n, answer: ans }),
        stem: { n, op: 'double' },
      });
    }
    const n = band <= 2 ? randInt(rng, 11, 49) * 2 : band === 3 ? randInt(rng, 50, 99) * 2 : band === 4 ? randInt(rng, 2, 99) * 10 : randInt(rng, 100, 499) * 2;
    const ans = n / 2;
    const cands = [
      { v: ans + 10, mis: 'tens-slip' },
      { v: ans - 10, mis: 'tens-slip' },
      { v: n - 2, mis: 'half-sub-two' },
      { v: n * 2, mis: 'half-doubled' },
      { v: ans + 5, mis: 'off-by-one' },
      { v: ans + 1, mis: 'off-by-one' },
    ].filter((c) => c.v > 0 && c.v !== ans);
    const { options, answerIndex } = choose(rng, ans, cands, count);
    return mk(skill, band, 'half', `h:${n}`, ans, `Half of ${n} = ?`, {
      speak: `What is half of ${n}?`,
      options, answerIndex,
      hint: { text: `Halve it in parts you can halve easily, then add: half of ${n} is ${ans}, because ${ans} + ${ans} = ${n}.` },
      explain: explainOptions(options, { n, answer: ans }),
      stem: { n, op: 'half' },
    });
  },
};

// ---------------- one-step word problems ----------------
export const wp1 = {
  formatsAt: () => ['word'],
  make(skill, { band, count, rng }) {
    const op = pick(rng, band <= 1 ? ['add', 'sub'] : ['add', 'sub', 'mul', 'div', 'diff']);
    let a;
    let b;
    if (op === 'mul' || op === 'div') {
      const t = pick(rng, band <= 2 ? [2, 5, 10, 3, 4] : [3, 4, 8, 2, 5, 10]);
      const k = randInt(rng, 2, band <= 2 ? 10 : 12);
      [a, b] = op === 'mul' ? [k, t] : [k * t, t];
    } else {
      const big = band <= 2 ? 99 : 999;
      a = randInt(rng, band <= 2 ? 20 : 120, big);
      b = randInt(rng, band <= 2 ? 3 : 15, op === 'add' ? Math.min(big, 999 - a) : a - 1);
    }
    return story(skill, band, 'word', op, a, b, count, rng);
  },
};
