// Honest numbers for the grown-ups (plan §12): a rate is shown with its
// uncertainty, and not at all until there's enough to go on.
export const MIN_SAMPLE = 5;

// Wilson score interval for k successes in n tries (95% by default).
export function wilson(k, n, z = 1.96) {
  if (!n) return { p: null, lo: 0, hi: 1 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, lo: Math.max(0, (c - r) / d), hi: Math.min(1, (c + r) / d) };
}

// "80% (58–92%)", or a note that there isn't enough yet.
export function rateText(results) {
  const n = results?.length || 0;
  if (n < MIN_SAMPLE) return n ? `${n} so far` : '—';
  const k = results.reduce((a, b) => a + b, 0);
  const w = wilson(k, n);
  const pc = (x) => Math.round(x * 100);
  return `${pc(w.p)}% (${pc(w.lo)}–${pc(w.hi)}%)`;
}
