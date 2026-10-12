// Progress lives on the iPad (localStorage). There are no accounts and nothing
// is sent anywhere. The grown-ups panel can copy a backup code and restore it.

const KEY = 'blox-legends-save-v1';

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const freshDay = (date) => ({
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
    learn: { skills: {}, recent: {} },
    best: { obby: 0, vault: 0, lab: 0 },
    day: freshDay(today()),
    history: [],
    totals: { ms: 0, answered: 0, correct: 0, runs: 0 },
    settings: { readAloud: true, dailyMin: 25, pin: '' },
    created: Date.now(),
  };
}

function merge(base, data) {
  for (const k of Object.keys(data || {})) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof data[k] === 'object')
      base[k] = merge(base[k], data[k]);
    else base[k] = data[k];
  }
  return base;
}

export class Save {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(defaults(), JSON.parse(raw));
    } catch {
      /* private mode or blocked storage: play without saving */
    }
    this.rollDay();
    this.dirty = false;
  }

  rollDay() {
    const d = today();
    if (this.data.day.date !== d) {
      const old = this.data.day;
      if (old.ms > 0 || old.answered > 0)
        this.data.history.push({ date: old.date, ms: old.ms, answered: old.answered, correct: old.correct });
      this.data.history = this.data.history.slice(-120);
      this.data.day = freshDay(d);
      this.dirty = true;
    }
  }

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.dirty = false;
    } catch {
      /* ignore */
    }
  }

  exportCode() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  }

  importCode(code) {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!parsed || parsed.v !== 1) throw new Error('Not a Blox Legends backup');
    this.data = merge(defaults(), parsed);
    this.rollDay();
    this.write();
  }

  reset() {
    const keep = { settings: this.data.settings, name: this.data.name };
    this.data = merge(defaults(), keep);
    this.write();
  }
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
