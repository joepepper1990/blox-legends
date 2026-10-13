// A stable identity for a question, so the game can tell a question it has
// asked before from a new one. Option order doesn't matter (the labels are
// sorted), so reshuffling the same question gives the same fingerprint.

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function fingerprint(q) {
  if (q.fp) return q.fp;
  const labels = (q.options || []).map((o) => o.label ?? '').sort().join('|');
  const extra = q.target ? JSON.stringify(q.target) : '';
  return fnv1a(`${q.skill}|${q.prompt}|${labels}|${extra}`);
}
