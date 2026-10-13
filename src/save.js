// Game-state shape and helpers shared by the save stores.
import { freshLearn } from './learning/learner.js';
// The primary store is IndexedDB (src/data/store.js); src/data/local-save.js is
// the v1-style localStorage fallback for browsers without IndexedDB.

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const freshDay = (date) => ({
  date,
  ms: 0,
  answered: 0,
  correct: 0,
  bonusMin: 0,
  stars: { obby: false, vault: false, lab: false },
  chest: false,
});

export function defaults() {
  return {
    v: 1,
    name: '',
    coins: 0,
    xp: 0,
    owned: ['shirt-blue', 'hat-none', 'trail-none'],
    look: { shirt: 'shirt-blue', hat: 'hat-none', trail: 'trail-none' },
    learn: freshLearn(),
    best: { obby: 0, vault: 0, lab: 0 },
    day: freshDay(today()),
    history: [],
    totals: { ms: 0, answered: 0, correct: 0, runs: 0 },
    settings: { readAloud: true, dailyMin: 25 },
    created: Date.now(),
  };
}

export function mergeDeep(base, data) {
  for (const k of Object.keys(data || {})) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]))
      base[k] = mergeDeep(base[k], data[k]);
    else base[k] = data[k];
  }
  return base;
}

// Start a new day: yesterday's totals go into history. Returns true if changed.
export function rollDayData(data) {
  const d = today();
  if (data.day.date === d) return false;
  const old = data.day;
  if (old.ms > 0 || old.answered > 0)
    data.history.push({ date: old.date, ms: old.ms, answered: old.answered, correct: old.correct });
  data.history = data.history.slice(-1200);
  data.day = freshDay(d);
  return true;
}

// Levels get a little longer each time.
export function levelInfo(xp) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = 100 + (level - 1) * 40;
  }
  return { level, into: rest, need, frac: rest / need };
}
