// Shared helpers for the v2 generators.
import { randInt, pick, chance, shuffle } from '../rng.js';
import { explainFor } from '../misconceptions.js';

export { randInt, pick, chance, shuffle };

// Bands 1–5 replace v1's 0–1 "level". These are the levels the v1-style
// generators were tuned for.
export const BAND_LVL = [0, 0.2, 0.4, 0.6, 0.8, 0.95];
export const lvlToBand = (lvl) => (lvl < 0.3 ? 1 : lvl < 0.5 ? 2 : lvl < 0.7 ? 3 : lvl < 0.85 ? 4 : 5);

// Multiple-choice options: the right answer plus `count - 1` distinct wrong
// ones taken (in priority order, lightly shuffled) from `cands`. A candidate
// is a value or { v, mis } where `mis` names the misconception that produces
// it (misconceptions.js).
export function choose(rng, correct, cands, count, { key = (v) => String(v), label = (v) => String(v), speak = label, extra = () => ({}) } = {}) {
  const seen = new Set([key(correct)]);
  const pool = [];
  for (const c of cands) {
    const cand = c !== null && typeof c === 'object' && 'v' in c ? c : { v: c };
    if (cand.v === undefined || cand.v === null || (typeof cand.v === 'number' && !Number.isFinite(cand.v))) continue;
    const k = key(cand.v);
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push(cand);
  }
  const head = shuffle(rng, pool.slice(0, Math.max(count + 1, 4)));
  const chosen = head.concat(pool.slice(head.length)).slice(0, count - 1);
  if (chosen.length < count - 1) throw new Error(`Not enough distractors for ${key(correct)}`);
  const all = shuffle(rng, [{ v: correct }, ...chosen]);
  const answerIndex = all.findIndex((c) => key(c.v) === key(correct));
  const options = all.map((c) => ({ label: label(c.v), speak: speak(c.v), value: c.v, ...(c.mis ? { mis: c.mis } : {}), ...extra(c.v) }));
  return { options, answerIndex };
}

// Worked explanations for each misconception present among the options.
export function explainOptions(options, params) {
  const out = {};
  for (const o of options) if (o.mis && !out[o.mis]) out[o.mis] = explainFor(o.mis, { ...params, chosen: o.value });
  return out;
}

// A v2 question shell. question.js adds the fingerprint and checks it.
export function question(skill, fields) {
  return { v: 2, skill: skill.id, cls: skill.cls, ...fields };
}

// Pick a fact item: the requested one, or a random one available at `band`.
export function pickItem(gen, skill, band, rng, item) {
  if (item !== undefined && item !== null) return item;
  return pick(rng, gen.items(skill, band));
}

export const range = (lo, hi, step = 1) => Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
export const rev = (n) => Number(String(n).split('').reverse().join(''));
