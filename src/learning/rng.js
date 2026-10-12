// Small random helpers. Every generator takes an `rng` function returning
// [0, 1) so tests can pass a seeded one and get repeatable questions.

export function seeded(seed = 1) {
  // mulberry32
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const chance = (rng, p) => rng() < p;

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a multiple-choice option list: the correct answer plus `count - 1`
// distinct distractors taken from `candidates` in priority order (with a bit
// of shuffling so the same near-miss isn't always chosen).
export function buildOptions(rng, correct, candidates, count, key = (v) => String(v)) {
  const seen = new Set([key(correct)]);
  const pool = [];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push(c);
  }
  // Keep the strongest distractors near the front but vary them a little.
  const head = shuffle(rng, pool.slice(0, Math.max(count + 1, 4)));
  const chosen = head.concat(pool.slice(head.length)).slice(0, count - 1);
  if (chosen.length < count - 1) {
    throw new Error(`Not enough distractors for ${key(correct)}`);
  }
  const values = shuffle(rng, [correct, ...chosen]);
  return { values, answerIndex: values.findIndex((v) => key(v) === key(correct)) };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
