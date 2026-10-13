// Number facts (item class "fact", plan §6.3): times tables, bonds, adding
// and taking away within 20, doubles and halves. Every fact is an item with
// a stable key, so spaced repetition can schedule each one; formats are
// different ways of asking the same fact.
import { choose, explainOptions, question, pickItem, range, rev, chance, randInt } from './util.js';

const num = (n) => String(n);

// A method line for each table, so a wrong answer always teaches.
export function tableMethod(t, a) {
  const p = a * t;
  switch (t) {
    case 2:
      return `${a} × 2 is double ${a}, which is ${p}.`;
    case 4:
      return `For × 4, double then double again: ${a} → ${a * 2} → ${p}.`;
    case 8:
      return `For × 8, double three times: ${a} → ${a * 2} → ${a * 4} → ${p}.`;
    case 5:
      return `For × 5, do × 10 then halve it: ${a * 10} → ${p}.`;
    case 10:
      return `For × 10, every digit moves up a place: ${a} becomes ${p}.`;
    case 3:
      return `Count in threes ${a} times: ${range(1, Math.min(a, 6)).map((i) => i * 3).join(', ')}${a > 6 ? ' …' : ''} → ${p}.`;
    case 6:
      return `For × 6, do × 3 then double: ${a * 3} → ${p}.`;
    case 9:
      return `For × 9, do × 10 then take away one ${a}: ${a * 10} − ${a} = ${p}.`;
    case 7:
      return `For × 7, add × 5 and × 2: ${a * 5} + ${a * 2} = ${p}.`;
    case 11:
      return a <= 9 ? `For × 11 up to 9, write the digit twice: ${a}${a}.` : `For × 11, do × 10 then add one more ${a}: ${a * 10} + ${a} = ${p}.`;
    case 12:
      return `For × 12, add × 10 and × 2: ${a * 10} + ${a * 2} = ${p}.`;
    default:
      return `${a} × ${t} = ${p}.`;
  }
}

// ---------------- times tables ----------------
export const table = {
  items: (skill, band) => range(1, band <= 1 ? 10 : 12).map((a) => `${skill.params.t}x${a}`),
  formatsAt: (skill, band) => (band <= 1 ? ['mul'] : band === 2 ? ['mul', 'missing'] : ['mul', 'missing', 'div']),
  make(skill, { band, format, count, rng, item }) {
    const t = skill.params.t;
    const key = pickItem(table, skill, band, rng, item);
    const a = Number(key.split('x')[1]);
    const p = a * t;
    const fmt = format || 'mul';
    const params = { a, t, p };
    let prompt;
    let speak;
    let answer;
    let cands;
    if (fmt === 'mul') {
      const [x, y] = chance(rng, 0.5) ? [t, a] : [a, t];
      prompt = `${x} × ${y} = ?`;
      speak = `${x} times ${y}`;
      answer = p;
      cands = [
        { v: (a + 1) * t, mis: 'tab-next' },
        { v: (a - 1) * t, mis: 'tab-prev' },
        { v: a * (t + 1), mis: 'tab-other' },
        { v: a * (t - 1), mis: 'tab-other' },
        { v: a + t, mis: 'add-not-mul' },
        { v: p + 1, mis: 'off-by-one' },
        { v: p - 1, mis: 'off-by-one' },
        { v: rev(p), mis: 'swap-digits' },
        { v: p + 10, mis: 'tens-slip' },
        { v: p - 10, mis: 'tens-slip' },
      ];
    } else if (fmt === 'missing') {
      prompt = band >= 4 && chance(rng, 0.5) ? `${t} × ? = ${p}` : `? × ${t} = ${p}`;
      speak = `What times ${t} makes ${p}?`;
      answer = a;
      cands = [
        { v: a + 1, mis: 'tab-next' },
        { v: a - 1, mis: 'tab-prev' },
        { v: p, mis: 'missing-gave-product' },
        { v: a + 2, mis: 'off-by-one' },
        { v: a - 2, mis: 'off-by-one' },
        { v: p - t, mis: 'off-by-one' },
        { v: a + 3, mis: 'off-by-one' },
        { v: t + 1, mis: 'off-by-one' },
      ];
    } else {
      prompt = `${p} ÷ ${t} = ?`;
      speak = `${p} divided by ${t}`;
      answer = a;
      cands = [
        { v: a + 1, mis: 'tab-next' },
        { v: a - 1, mis: 'tab-prev' },
        { v: t, mis: 'div-gave-divisor' },
        { v: p - t, mis: 'div-subtracted' },
        { v: a + 2, mis: 'off-by-one' },
        { v: a - 2, mis: 'off-by-one' },
        { v: a + 3, mis: 'off-by-one' },
        { v: p, mis: 'missing-gave-product' },
      ];
    }
    cands = cands.filter((c) => c.v > 0);
    const { options, answerIndex } = choose(rng, answer, cands, count);
    const method = tableMethod(t, a) + (fmt === 'div' ? ` So ${p} ÷ ${t} = ${a}.` : fmt === 'missing' ? ` So the missing number is ${a}.` : '');
    return question(skill, {
      format: fmt,
      band,
      itemKey: key,
      answer,
      prompt,
      speak,
      solved: prompt.replace('?', num(answer)),
      options,
      answerIndex,
      hint: { text: method },
      explain: explainOptions(options, { ...params, answer }),
      stem: { op: fmt, t, a },
    });
  },
};

// ---------------- number bonds to 10 and 20 ----------------
export const bonds10 = {
  items: (skill, band) => [...range(0, 10).map((a) => `10:${a}`), ...(band >= 2 ? range(0, 20).map((a) => `20:${a}`) : [])],
  formatsAt: () => ['bond'],
  make(skill, { band, count, rng, item }) {
    const key = pickItem(bonds10, skill, band, rng, item);
    const [target, a] = key.split(':').map(Number);
    const b = target - a;
    const prompt = `${a} + ? = ${target}`;
    const cands = [
      { v: b + 1, mis: 'off-by-one' },
      { v: b - 1, mis: 'off-by-one' },
      { v: a, mis: 'bond-gave-part' },
      target === 20 && b >= 10 ? { v: b - 10, mis: 'bond-to-ten' } : null,
      target === 20 && b < 10 ? { v: 10 - a, mis: 'bond-to-ten' } : null,
      { v: b + 2, mis: 'off-by-one' },
      { v: b - 2, mis: 'off-by-one' },
    ].filter((c) => c && c.v >= 0);
    const { options, answerIndex } = choose(rng, b, cands, count);
    return question(skill, {
      format: 'bond',
      band,
      itemKey: key,
      answer: b,
      prompt,
      speak: `${a} add what makes ${target}?`,
      solved: `${a} + ${b} = ${target}`,
      options,
      answerIndex,
      hint: { text: `Count on from ${a} to ${target}: that's ${b} more. ${a} + ${b} = ${target}.` },
      explain: explainOptions(options, { a, target, answer: b }),
      stem: { op: 'bond', target, a },
    });
  },
};

// ---------------- adding within 20 ----------------
const pairs = (band) => {
  const out = [];
  for (let a = 2; a <= 9; a++) for (let b = a; b <= 9; b++) if (band >= 2 || a + b <= 10) out.push(`${a}+${b}`);
  return out;
};
export const add20 = {
  items: (skill, band) => pairs(band),
  formatsAt: () => ['add'],
  make(skill, { band, count, rng, item }) {
    const key = pickItem(add20, skill, band, rng, item);
    let [a, b] = key.split('+').map(Number);
    if (chance(rng, 0.5)) [a, b] = [b, a];
    const s = a + b;
    const cands = [
      { v: s + 1, mis: 'off-by-one' },
      { v: s - 1, mis: 'off-by-one' },
      { v: s + 2, mis: 'off-by-one' },
      { v: s - 2, mis: 'off-by-one' },
      s > 10 ? { v: s - 10, mis: 'tens-slip' } : { v: s + 10, mis: 'tens-slip' },
      a * b <= 30 && a * b !== s ? { v: a * b, mis: 'mul-not-add' } : null,
    ].filter((c) => c && c.v > 0);
    const { options, answerIndex } = choose(rng, s, cands, count);
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const toTen = 10 - big;
    return question(skill, {
      format: 'add',
      band,
      itemKey: key,
      answer: s,
      prompt: `${a} + ${b} = ?`,
      speak: `${a} add ${b}`,
      solved: `${a} + ${b} = ${s}`,
      options,
      answerIndex,
      hint: { text: s > 10 && toTen > 0 ? `Make 10 first: ${big} + ${toTen} = 10, then ${small - toTen} more makes ${s}.` : `Count on ${small} from ${big}: ${s}.` },
      explain: explainOptions(options, { answer: s }),
      stem: { op: 'add', a, b },
    });
  },
};

// ---------------- taking away within 20 (crossing ten) ----------------
const subItems = () => {
  const out = [];
  for (let s = 11; s <= 18; s++) for (let b = s - 9; b <= 9; b++) out.push(`${s}-${b}`);
  return out;
};
export const sub20 = {
  items: () => subItems(),
  formatsAt: () => ['sub'],
  make(skill, { band, count, rng, item }) {
    const key = pickItem(sub20, skill, band, rng, item);
    const [s, b] = key.split('-').map(Number);
    const d = s - b;
    const so = s - 10;
    const cands = [
      { v: d + 1, mis: 'off-by-one' },
      { v: d - 1, mis: 'off-by-one' },
      b > so ? { v: 10 + (b - so), mis: 'sub-reverse-ones' } : null,
      s + b <= 30 ? { v: s + b, mis: 'add-not-sub' } : null,
      { v: d + 2, mis: 'off-by-one' },
      { v: d + 10, mis: 'tens-slip' },
    ].filter((c) => c && c.v >= 0);
    const { options, answerIndex } = choose(rng, d, cands, count);
    return question(skill, {
      format: 'sub',
      band,
      itemKey: key,
      answer: d,
      prompt: `${s} − ${b} = ?`,
      speak: `${s} take away ${b}`,
      solved: `${s} − ${b} = ${d}`,
      options,
      answerIndex,
      hint: { text: `Take away ${so} to get to 10, then ${b - so} more: 10 − ${b - so} = ${d}.` },
      explain: explainOptions(options, { s, b, so, bo: b, answer: d }),
      stem: { op: 'sub', s, b },
    });
  },
};

// ---------------- doubles to 20 and halves to 40 ----------------
export const double = {
  items: (skill, band) => {
    const top = band <= 1 ? 10 : 20;
    return [...range(1, top).map((n) => `d:${n}`), ...range(1, top).map((n) => `h:${n * 2}`)];
  },
  formatsAt: () => ['double', 'half'],
  make(skill, { band, format, count, rng, item }) {
    const fmt = format || (chance(rng, 0.5) ? 'double' : 'half');
    let key = item;
    if (!key) {
      const all = double.items(skill, band).filter((k) => k.startsWith(fmt === 'double' ? 'd:' : 'h:'));
      key = all[randInt(rng, 0, all.length - 1)];
    }
    const kind = key[0];
    const n = Number(key.slice(2));
    if (kind === 'd') {
      const ans = n * 2;
      const cands = [
        { v: ans + 1, mis: 'off-by-one' },
        { v: ans - 1, mis: 'off-by-one' },
        { v: n + 2, mis: 'double-add-two' },
        { v: ans + 2, mis: 'off-by-one' },
        { v: ans - 2, mis: 'off-by-one' },
        { v: ans + 10, mis: 'tens-slip' },
      ].filter((c) => c.v > 0);
      const { options, answerIndex } = choose(rng, ans, cands, count);
      return question(skill, {
        format: 'double', band, itemKey: key, answer: ans,
        prompt: `Double ${n} = ?`, speak: `What is double ${n}?`, solved: `Double ${n} = ${ans}`,
        options, answerIndex,
        hint: { text: n > 10 ? `Double the tens and the ones: double ${n - (n % 10)} is ${2 * (n - (n % 10))}, double ${n % 10} is ${2 * (n % 10)}, so ${ans}.` : `${n} + ${n} = ${ans}.` },
        explain: explainOptions(options, { n, answer: ans }),
        stem: { op: 'double', n },
      });
    }
    const ans = n / 2;
    const cands = [
      { v: ans + 1, mis: 'off-by-one' },
      { v: ans - 1, mis: 'off-by-one' },
      { v: n - 2, mis: 'half-sub-two' },
      { v: n * 2, mis: 'half-doubled' },
      { v: ans + 2, mis: 'off-by-one' },
      { v: ans + 10, mis: 'tens-slip' },
    ].filter((c) => c.v > 0 && c.v !== ans);
    const { options, answerIndex } = choose(rng, ans, cands, count);
    return question(skill, {
      format: 'half', band, itemKey: key, answer: ans,
      prompt: `Half of ${n} = ?`, speak: `What is half of ${n}?`, solved: `Half of ${n} = ${ans}`,
      options, answerIndex,
      hint: { text: `Half of ${n} is the number that doubles to make ${n}: ${ans} + ${ans} = ${n}.` },
      explain: explainOptions(options, { n, answer: ans }),
      stem: { op: 'half', n },
    });
  },
};

// ---------------- number bonds to 100 ----------------
export const bonds100 = {
  items: (skill, band) => range(band >= 3 ? 5 : 10, 95, band >= 3 ? 5 : 10).filter((a) => a < 100).map((a) => `100:${a}`),
  formatsAt: () => ['bond'],
  make(skill, { band, count, rng, item }) {
    const key = pickItem(bonds100, skill, band, rng, item);
    const a = Number(key.split(':')[1]);
    const b = 100 - a;
    const cands = [
      { v: b + 10, mis: a % 10 ? 'bond100-both-ten' : 'tens-slip' },
      { v: b - 10, mis: 'tens-slip' },
      { v: b + 5, mis: 'off-by-one' },
      { v: b - 5, mis: 'off-by-one' },
      { v: a, mis: 'bond-gave-part' },
    ].filter((c) => c.v > 0 && c.v < 100);
    const { options, answerIndex } = choose(rng, b, cands, count);
    return question(skill, {
      format: 'bond', band, itemKey: key, answer: b,
      prompt: `${a} + ? = 100`, speak: `${a} add what makes 100?`, solved: `${a} + ${b} = 100`,
      options, answerIndex,
      hint: { text: a % 10 === 0 ? `Tens bond to 10 tens: ${a / 10} + ${b / 10} = 10, so ${a} + ${b} = 100.` : `Make the next ten first: ${a} + ${10 - (a % 10)} = ${a + 10 - (a % 10)}, then ${100 - (a + 10 - (a % 10))} more. That's ${b}.` },
      explain: explainOptions(options, { a, target: 100, answer: b }),
      stem: { op: 'bond', target: 100, a },
    });
  },
};
