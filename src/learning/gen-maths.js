// Maths question generators. `lvl` is the child's current mastery of the
// skill (0..1): low values keep numbers friendly, high values add missing-number
// and division forms like the ones in the Kent Test maths section.

import { randInt, pick, chance, buildOptions } from './rng.js';

const num = (n) => String(n);

function choice(skill, prompt, speak, correct, distractors, count, hint, rng) {
  const { values, answerIndex } = buildOptions(rng, correct, distractors, count);
  return {
    skill,
    prompt,
    speak,
    options: values.map((v) => ({ label: num(v), speak: num(v), value: v })),
    answerIndex,
    hint,
  };
}

// A strategy line for each table, so a wrong answer always teaches a method.
function tableHint(t, a) {
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
      return `Count in threes ${a} times: ${Array.from({ length: Math.min(a, 6) }, (_, i) => (i + 1) * 3).join(', ')}${a > 6 ? ' …' : ''} → ${p}.`;
    case 6:
      return `For × 6, do × 3 then double: ${a * 3} → ${p}.`;
    case 9:
      return `For × 9, do × 10 then take away one ${a}: ${a * 10} − ${a} = ${p}.`;
    case 7:
      return `For × 7, add × 5 and × 2: ${a * 5} + ${a * 2} = ${p}.`;
    case 11:
      return a <= 9
        ? `For × 11 up to 9, write the digit twice: ${a}${a}.`
        : `For × 11, do × 10 then add one more ${a}: ${a * 10} + ${a} = ${p}.`;
    case 12:
      return `For × 12, add × 10 and × 2: ${a * 10} + ${a * 2} = ${p}.`;
    default:
      return `${a} × ${t} = ${p}.`;
  }
}

export function genTable(skill, t, lvl, count, rng) {
  const maxA = lvl < 0.5 ? 10 : 12;
  const a = randInt(rng, lvl < 0.3 ? 1 : 2, maxA);
  const p = a * t;
  const r = rng();
  const hintText = tableHint(t, a);
  if (lvl >= 0.75 && r < 0.3) {
    // Division fact: p ÷ t = ?
    return choice(
      skill,
      `${p} ÷ ${t} = ?`,
      `${p} divided by ${t}`,
      a,
      [a + 1, a - 1, a + 2, t, a - 2].filter((v) => v > 0),
      count,
      { text: `${hintText} So ${p} ÷ ${t} = ${a}.` },
      rng,
    );
  }
  if (lvl >= 0.55 && r < 0.6) {
    // Missing factor: ? × t = p
    return choice(
      skill,
      `? × ${t} = ${p}`,
      `What times ${t} makes ${p}?`,
      a,
      [a + 1, a - 1, a + 2, a - 2, t].filter((v) => v > 0),
      count,
      { text: hintText },
      rng,
    );
  }
  const flip = chance(rng, 0.5);
  const prompt = flip ? `${t} × ${a} = ?` : `${a} × ${t} = ?`;
  const speak = flip ? `${t} times ${a}` : `${a} times ${t}`;
  const reversed = Number(String(p).split('').reverse().join(''));
  return choice(
    skill,
    prompt,
    speak,
    p,
    [(a + 1) * t, (a - 1) * t, a * (t + 1), a * (t - 1), p + 1, p - 1, a + t, reversed, p + 10, p - 10].filter(
      (v) => v > 0,
    ),
    count,
    { text: hintText },
    rng,
  );
}

function genBonds10(skill, lvl, count, rng) {
  const target = lvl < 0.5 ? 10 : pick(rng, [10, 10, 20]);
  const a = randInt(rng, 1, target - 1);
  const b = target - a;
  const steps = target === 10 ? Array.from({ length: b }, (_, i) => a + i + 1).join(', ') : '';
  return choice(
    skill,
    `${a} + ? = ${target}`,
    `${a} add what makes ${target}?`,
    b,
    [b + 1, b - 1, b + 2, b - 2, a, 10 - b].filter((v) => v >= 0),
    count,
    {
      text:
        target === 10
          ? `Count on from ${a} to 10: ${steps}. That is ${b} ${b === 1 ? 'jump' : 'jumps'}.`
          : a < 10
            ? `${a} + ${10 - a} makes 10, then 10 more makes 20. So ${10 - a} + 10 = ${b}.`
            : a === 10
              ? `10 + 10 = 20, so the answer is 10.`
              : `${a} is 10 + ${a - 10}. ${a - 10} + ${b} makes 10, so the answer is ${b}.`,
    },
    rng,
  );
}

function genAdd20(skill, lvl, count, rng) {
  const a = randInt(rng, lvl < 0.4 ? 5 : 6, 9);
  const b = randInt(rng, lvl < 0.4 ? 2 : 3, 9);
  const s = a + b;
  const toTen = 10 - a;
  return choice(
    skill,
    `${a} + ${b} = ?`,
    `${a} add ${b}`,
    s,
    [s + 1, s - 1, s + 2, s - 2, s + 10, a * b > 20 ? undefined : a * b].filter((v) => v !== undefined && v > 0),
    count,
    {
      text:
        b > toTen
          ? `Make 10 first: ${a} + ${toTen} = 10, then ${b - toTen} more makes ${s}.`
          : `${a} + ${b} = ${s}.`,
    },
    rng,
  );
}

function genSub20(skill, lvl, count, rng) {
  const s = randInt(rng, 11, lvl < 0.4 ? 15 : 19);
  const b = randInt(rng, s - 9, 9);
  const d = s - b;
  return choice(
    skill,
    `${s} − ${b} = ?`,
    `${s} take away ${b}`,
    d,
    [d + 1, d - 1, d + 2, d - 2, s + b > 30 ? undefined : s + b].filter((v) => v !== undefined && v > 0),
    count,
    { text: `Think of it as adding: ${b} + ? = ${s}. ${b} + ${d} = ${s}, so the answer is ${d}.` },
    rng,
  );
}

function genDouble(skill, lvl, count, rng) {
  const halve = lvl >= 0.5 && chance(rng, 0.5);
  if (halve) {
    const tens = randInt(rng, 1, lvl < 0.8 ? 4 : 9) * 2;
    const ones = randInt(rng, 0, 4) * 2;
    const n = tens * 10 + ones;
    const h = n / 2;
    return choice(
      skill,
      `Half of ${n} = ?`,
      `What is half of ${n}?`,
      h,
      [h + 1, h - 1, h + 10, h - 10, n * 2, h + 5].filter((v) => v > 0),
      count,
      { text: `Halve the tens and the ones: half of ${tens * 10} is ${tens * 5}, half of ${ones} is ${ones / 2}. Together: ${h}.` },
      rng,
    );
  }
  const n = lvl < 0.4 ? randInt(rng, 6, 20) : randInt(rng, 11, lvl < 0.8 ? 45 : 99);
  const d = n * 2;
  const t = Math.floor(n / 10) * 10;
  const o = n % 10;
  return choice(
    skill,
    `Double ${n} = ?`,
    `What is double ${n}?`,
    d,
    [d + 1, d - 1, d + 10, d - 10, n + 2, d + 2].filter((v) => v > 0),
    count,
    { text: t > 0 ? `Double the tens and the ones: ${t * 2} + ${o * 2} = ${d}.` : `${n} + ${n} = ${d}.` },
    rng,
  );
}

function genBonds100(skill, lvl, count, rng) {
  const step = lvl < 0.5 ? 10 : 5;
  const a = randInt(rng, 1, 100 / step - 1) * step;
  const b = 100 - a;
  const nextTen = Math.ceil(a / 10) * 10;
  const hint =
    a % 10 === 0
      ? `${a / 10} tens and ${b / 10} tens make 10 tens, which is 100. So ${b}.`
      : `${a} → ${nextTen} is ${nextTen - a}, then ${nextTen} → 100 is ${100 - nextTen}. ${nextTen - a} + ${100 - nextTen} = ${b}.`;
  return choice(
    skill,
    `${a} + ? = 100`,
    `${a} add what makes 100?`,
    b,
    [b + 10, b - 10, b + 5, b - 5, 100 - a + 10, a, 110 - a].filter((v) => v > 0 && v < 100),
    count,
    { text: hint },
    rng,
  );
}

export function genMaths(skillId, lvl, count, rng) {
  const table = /^m\.x(\d+)$/.exec(skillId);
  if (table) return genTable(skillId, Number(table[1]), lvl, count, rng);
  switch (skillId) {
    case 'm.bonds10':
      return genBonds10(skillId, lvl, count, rng);
    case 'm.add20':
      return genAdd20(skillId, lvl, count, rng);
    case 'm.sub20':
      return genSub20(skillId, lvl, count, rng);
    case 'm.double':
      return genDouble(skillId, lvl, count, rng);
    case 'm.bonds100':
      return genBonds100(skillId, lvl, count, rng);
    default:
      throw new Error(`Unknown maths skill ${skillId}`);
  }
}
