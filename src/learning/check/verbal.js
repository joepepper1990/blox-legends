// Independent checks for alphabet, code and series questions. They read what
// the child sees (the prompt and the coded lines) and work the answer out from
// scratch, never using the generators. For series, every rule family that
// fits the letters shown must predict the same next letter (no ambiguity).
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const pos = (ch) => A.indexOf(ch);
const letter = (i) => (i >= 0 && i < 26 ? A[i] : null);
const wrapL = (i) => A[((i % 26) + 26) % 26];

// Each solver returns the list of answers (strings) that are correct, or null
// if the question isn't one it understands.
function seriesPredictions(seq) {
  const n = seq.length;
  const D = seq.slice(1).map((v, i) => v - seq[i]);
  const out = new Set();
  const add = (i) => {
    const l = letter(i);
    if (l) out.add(l);
  };
  if (D.every((d) => d === D[0])) add(seq[n - 1] + D[0]); // constant step
  if (D.length >= 3 && D.every((d, k) => k < 2 || d === D[k - 2])) add(seq[n - 1] + D[D.length - 2]); // alternating
  const D2 = D.slice(1).map((v, i) => v - D[i]);
  if (D.length >= 3 && D2.every((d) => d === D2[0]) && D2[0] !== 0) add(seq[n - 1] + D[D.length - 1] + D2[0]); // growing
  if (n >= 5) {
    // two series interleaved
    const even = seq.filter((_, k) => k % 2 === 0);
    const odd = seq.filter((_, k) => k % 2 === 1);
    const st = (s) => s.slice(1).map((v, i) => v - s[i]);
    const se = st(even);
    const so = st(odd);
    if (se.length >= 1 && so.length >= 1 && se.every((d) => d === se[0]) && so.every((d) => d === so[0])) {
      const next = n % 2 === 0 ? even : odd;
      const step = n % 2 === 0 ? se[0] : so[0];
      add(next[next.length - 1] + step);
    }
  }
  return [...out];
}

export function solveVerbal(q) {
  const p = q.prompt;
  let m;
  if ((m = /^What letter comes after ([A-Z])\?$/.exec(p))) return [letter(pos(m[1]) + 1)];
  if ((m = /^What letter comes before ([A-Z])\?$/.exec(p))) return [letter(pos(m[1]) - 1)];
  if ((m = /^What letter is 2 after ([A-Z])\?$/.exec(p))) return [letter(pos(m[1]) + 2)];
  if ((m = /^What number is ([A-Z]) in the alphabet\?$/.exec(p))) return [String(pos(m[1]) + 1)];
  if ((m = /^Which letter is number (\d+)\?$/.exec(p))) return [letter(Number(m[1]) - 1)];
  if ((m = /^Start at ([A-Z])\. Jump (\d+) (forwards|backwards)\. Where do you land\?$/.exec(p)))
    return [letter(pos(m[1]) + (m[3] === 'forwards' ? 1 : -1) * Number(m[2]))];
  if ((m = /^Start at ([A-Z])\. Jump (\d+) (forwards|back), then (\d+) (forwards|back)\. Where do you land\?$/.exec(p))) {
    const d1 = (m[3] === 'forwards' ? 1 : -1) * Number(m[2]);
    const d2 = (m[5] === 'forwards' ? 1 : -1) * Number(m[4]);
    const mid = pos(m[1]) + d1;
    return letter(mid) ? [letter(mid + d2)] : [];
  }
  if ((m = /^How many jumps from ([A-Z]) to ([A-Z])\?$/.exec(p))) return [String(Math.abs(pos(m[2]) - pos(m[1])))];
  if ((m = /^If ([A-Z]+) is written as ([A-Z]+), how is ([A-Z]+) written\?$/.exec(p))) {
    const [, w1, c1, w2] = m;
    if (w1.length !== c1.length || w2.length !== w1.length) return [];
    const shift = [...w1].map((ch, k) => (pos(c1[k]) - pos(ch) + 26) % 26);
    return [[...w2].map((ch, k) => wrapL(pos(ch) + shift[k])).join('')];
  }
  if ((m = /^If ([A-Z]+) is written as ([A-Z]+), what does ([A-Z]+) mean\?$/.exec(p))) {
    const [, w1, c1, c2] = m;
    if (w1.length !== c1.length || c2.length !== w1.length) return [];
    const shift = [...w1].map((ch, k) => (pos(c1[k]) - pos(ch) + 26) % 26);
    return [[...c2].map((ch, k) => wrapL(pos(ch) - shift[k])).join('')];
  }
  if ((m = /^Mirror code: A↔Z, B↔Y, C↔X… (What is|Which word is) ([A-Z]+)\?$/.exec(p)))
    return [[...m[2]].map((ch) => A[25 - pos(ch)]).join('')];
  if ((m = /^What comes next\? ((?:[A-Z]{1,2}, )+)\?$/.exec(p))) {
    const terms = m[1].split(', ').filter(Boolean);
    if (terms.every((t) => t.length === 1)) return seriesPredictions(terms.map(pos));
    if (terms.every((t) => t.length === 2)) {
      const a = seriesPredictions(terms.map((t) => pos(t[0])));
      const b = seriesPredictions(terms.map((t) => pos(t[1])));
      return a.flatMap((x) => b.map((y) => x + y));
    }
  }
  return null;
}

// Coded lines on the door must say the same as the prompt.
export function doorAgrees(q) {
  if (!q.door) return true;
  const text = q.door.join(' ');
  const caps = (q.prompt.match(/\b[A-Z]{2,}\b/g) || []).filter((w) => w !== 'A' && !/^(A↔Z|B↔Y|C↔X)$/.test(w));
  return caps.every((w) => text.includes(w));
}
