// Bringing learning progress from the first version (and R0) into the new
// learner model (plan §16). Total and idempotent: it never throws, never
// loses a record, and running it twice changes nothing.
//
//   v1 "mastered" (n ≥ 4, smoothed accuracy ≥ 0.85) → Accurate, unverified:
//       a short check is due straight away; passing it verifies Accurate and
//       starts the 28-day clock towards Mastered; failing it means Practising
//   3 or more right answers → Practising
//   1 or more answers → Introduced
// Unknown skill ids and partial records are kept, and the raw v1 records are
// kept in learn.mig.legacy.
import { LEARN_V, freshLearn, freshSkill, dayOf, RULES } from './learner.js';
import { lvlToBand } from './gen/util.js';

const AREA_ZONE = { maths: 'number', verbal: 'code', spatial: 'shape' };
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

export const isV1Mastered = (r) => num(r?.n) >= 4 && num(r?.ema, 0.5) >= 0.85;

// Already in the new model? (Old records merged onto new defaults by
// mistake, with nothing in the new place yet, still count as old.)
export const isV2Learn = (learn) =>
  !!learn && learn.v === LEARN_V && !!learn.sk && !(Object.keys(learn.sk).length === 0 && Object.keys(learn.skills || {}).length > 0);

export function upgradeLearn(learn, now = Date.now()) {
  if (isV2Learn(learn)) return learn;
  const today = dayOf(now);
  try {
    const old = learn && typeof learn === 'object' ? learn : {};
    const out = freshLearn();
    for (const [id, r] of Object.entries(old.skills || {})) {
      if (!r || typeof r !== 'object') continue;
      const sk = freshSkill();
      sk.n = Math.max(0, Math.floor(num(r.n)));
      sk.c = Math.min(sk.n, Math.max(0, Math.floor(num(r.c))));
      sk.b = lvlToBand(num(r.ema, 0.5));
      sk.pf = sk.c;
      sk.last = r.last ? dayOf(r.last) : null;
      if (sk.n >= 1) sk.ms.intro = today;
      if (sk.pf >= RULES.practising) sk.ms.prac = today;
      if (isV1Mastered(r)) {
        sk.ms.prac = today;
        sk.uv = 1;
        sk.chk = { step: 0, gapFrom: today, due: today, res: [] };
      }
      if (num(r.ms) > 0) sk.v1ms = Math.round(r.ms);
      out.sk[id] = sk;
    }
    for (const [area, results] of Object.entries(old.recent || {})) {
      if (Array.isArray(results)) out.rc[AREA_ZONE[area] || area] = results.filter((x) => x === 0 || x === 1).slice(-RULES.recent);
    }
    out.mig = { from: 1, at: now, legacy: JSON.parse(JSON.stringify(old)) };
    return out;
  } catch {
    // Something unreadable: start fresh but keep whatever was there.
    const out = freshLearn();
    out.mig = { from: 1, at: now, failed: true, legacy: safeCopy(learn) };
    return out;
  }
}

function safeCopy(v) {
  try {
    return JSON.parse(JSON.stringify(v ?? null));
  } catch {
    return null;
  }
}
