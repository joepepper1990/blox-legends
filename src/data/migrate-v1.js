// Bringing v1 progress (the original game) into v2. Pure functions, so the
// merge rules are unit-tested. A v1 import is applied at most once per source
// (the caller records its migration key).

import { defaults, mergeDeep } from '../save.js';
import { upgradeLearn } from '../learning/migrate-learn.js';
import { mergeLearn, upgradeData } from './upgrade.js';

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
  return !d.coins && !d.xp && !(d.totals?.answered > 0) && Object.keys(d.learn?.skills || {}).length === 0 && Object.keys(d.learn?.sk || {}).length === 0;
}

// Merge rules when the current profile already has progress:
//   coins and XP add up; owned items combine; best times keep the faster;
//   each skill keeps the record with more attempts; totals add; settings and
//   the current look/name stay as they are.
// The old game's learning records are upgraded to the new learner model
// first (skills it had mastered come across as Accurate, to be checked).
export function mergeV1(current, v1in, now = Date.now()) {
  const { learn: v1learn, ...rest } = v1in || {};
  const v1 = mergeDeep(defaults(), rest);
  v1.learn = upgradeLearn(v1learn, now);
  if (isFresh(current)) {
    const out = mergeDeep(defaults(), { ...v1, learn: undefined });
    out.learn = v1.learn;
    out.name = v1.name || current.name;
    // The parent's choices in the old game (daily limit, read-aloud) carry over.
    out.settings = { ...current.settings, ...v1.settings };
    delete out.settings.pin; // PINs are stored per iPad, hashed (never in game data)
    return out;
  }
  const out = structuredClone(upgradeData(current, now));
  out.coins = (out.coins || 0) + (v1.coins || 0);
  out.xp = (out.xp || 0) + (v1.xp || 0);
  out.owned = [...new Set([...(out.owned || []), ...(v1.owned || [])])];
  for (const k of Object.keys(v1.best || {})) {
    const a = out.best?.[k] || 0;
    const b = v1.best[k] || 0;
    out.best[k] = a && b ? Math.min(a, b) : a || b;
  }
  out.learn = mergeLearn(out.learn, v1.learn);
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
