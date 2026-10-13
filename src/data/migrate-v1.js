// Bringing v1 progress (the original game) into v2. Pure functions, so the
// merge rules are unit-tested. A v1 import is applied at most once per source
// (the caller records its migration key).

import { defaults, mergeDeep } from '../save.js';

export const V1_LOCAL_KEY = 'blox-legends-save-v1';

// v1's grown-ups "backup code" is base64 of the v1 save JSON.
export function parseV1Code(code) {
  const text = decodeURIComponent(escape(atob(String(code).trim())));
  const data = JSON.parse(text);
  if (!data || data.v !== 1) throw new Error('That is not a code from the old game.');
  return data;
}

// Has this profile done anything yet? (A fresh profile is simply replaced.)
export function isFresh(d) {
  return !d.coins && !d.xp && !(d.totals?.answered > 0) && Object.keys(d.learn?.skills || {}).length === 0;
}

// Merge rules when the current profile already has progress:
//   coins and XP add up; owned items combine; best times keep the faster;
//   each skill keeps the record with more attempts; totals add; settings and
//   the current look/name stay as they are.
export function mergeV1(current, v1in) {
  const v1 = mergeDeep(defaults(), v1in);
  if (isFresh(current)) {
    const out = mergeDeep(defaults(), v1);
    out.name = v1.name || current.name;
    out.settings = { ...out.settings, ...current.settings };
    delete out.settings.pin; // PINs are stored per iPad, hashed (never in game data)
    return out;
  }
  const out = structuredClone(current);
  out.coins = (out.coins || 0) + (v1.coins || 0);
  out.xp = (out.xp || 0) + (v1.xp || 0);
  out.owned = [...new Set([...(out.owned || []), ...(v1.owned || [])])];
  for (const k of Object.keys(v1.best || {})) {
    const a = out.best?.[k] || 0;
    const b = v1.best[k] || 0;
    out.best[k] = a && b ? Math.min(a, b) : a || b;
  }
  out.learn ||= { skills: {}, recent: {} };
  for (const [id, rec] of Object.entries(v1.learn?.skills || {})) {
    const mine = out.learn.skills[id];
    if (!mine || (rec.n || 0) > (mine.n || 0)) out.learn.skills[id] = rec;
  }
  for (const k of ['ms', 'answered', 'correct', 'runs']) out.totals[k] = (out.totals[k] || 0) + (v1.totals?.[k] || 0);
  const seen = new Set(out.history.map((h) => h.date));
  for (const h of v1.history || []) if (!seen.has(h.date)) out.history.push(h);
  out.history.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!out.name && v1.name) out.name = v1.name;
  return out;
}

export function v1Summary(v1) {
  return {
    name: v1.name || '',
    coins: v1.coins || 0,
    xp: v1.xp || 0,
    answered: v1.totals?.answered || 0,
    skills: Object.keys(v1.learn?.skills || {}).length,
  };
}
