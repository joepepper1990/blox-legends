// Boss assessments (plan §6.4). Bosses ask what practice never shows:
//   procedural skills  items from the 15% fingerprint partition
//   authored skills    items from the 20% reserve of each bank
//   facts              delayed recall: items not asked for at least 3 days
// so a boss win shows real learning, not memory of practised items. The Boss
// Arena itself arrives in R0.9; this builds and checks its question sets.
import { SKILLS, SKILL_BY_ID } from './skills.js';
import { GEN } from './gen/index.js';
import { makeItem, formatsAt, itemsOf, canAsk } from './question.js';
import { inPartition, inReserve } from './fp.js';
import { MECHANICS } from '../mechanics/caps.js';
import { fitsMechanic } from '../mechanics/fit.js';
import { stageOf } from './learner.js';
import { newAllowance, homeOf } from './scheduler.js';

export const DELAYED_DAYS = 3;
const MIN_RESERVE = { code: 300, word: 80 }; // plan §6.4 targets (reported in R0.8)

const bossSkills = (mech, realm, statuses) =>
  SKILLS.filter((s) => statuses.includes(s.status) && GEN[s.gen] && homeOf(s) === mech && s.realm === realm);

export function buildAssessment({ mech, realm, n = 10, learn, seen = new Map(), rng, day, statuses = ['live'] }) {
  const skills = bossSkills(mech, realm, statuses);
  const count = MECHANICS[mech].options[1];
  const items = [];
  let usedReview = false;
  const asked = new Set();
  for (let i = 0; items.length < n && i < n * 6 && skills.length; i++) {
    const s = skills[i % skills.length];
    const band = Math.max(s.target, learn.sk[s.id]?.b || 1);
    const formats = formatsAt(s.id, band, count).filter((f) => canAsk(s.id, f, band, count));
    if (!formats.length) continue;
    const fits = (q) => fitsMechanic(q, mech) === null && !asked.has(q.fp);
    let item;
    let accept;
    if (s.cls === 'procedural') accept = (q) => fits(q) && inPartition(q.fp) && !seen.has(q.fp);
    else if (s.cls === 'authored') {
      const reserve = (itemsOf(s.id, band, count) || []).filter((id) => inReserve(s.id, id) && !asked.has(id));
      item = reserve[Math.floor(rng() * reserve.length)];
      accept = (q) => fits(q) && inReserve(s.id, q.itemKey);
    } else {
      const recs = learn.it[s.id] || {};
      const delayed = (itemsOf(s.id, band, count) || []).filter((k) => !recs[k] || day - recs[k][2] >= DELAYED_DAYS);
      item = delayed[Math.floor(rng() * delayed.length)];
      accept = fits;
    }
    let q = null;
    if (item !== undefined || s.cls === 'procedural') {
      try {
        q = makeItem(s.id, { band, count, rng, item, accept, tries: 60 });
      } catch {
        q = null;
      }
    }
    if (!q) {
      // nothing protected left for this skill: an ordinary item, and say so
      try {
        q = makeItem(s.id, { band, count, rng, accept: fits, tries: 30 });
        usedReview = true;
      } catch {
        continue;
      }
    }
    asked.add(q.fp);
    asked.add(q.itemKey);
    items.push(q);
  }
  return { items, usedReview };
}

// Is this realm's boss ready to be faced? Every core skill must be Accurate
// and verified (skills carried over from v1 must pass their check first).
export function bossReadiness({ mech, realm, learn, statuses = ['live'] }) {
  const core = bossSkills(mech, realm, statuses).filter((s) => s.core);
  const missing = core.filter((s) => {
    const st = stageOf(learn.sk[s.id]);
    return st.unverified || !['accurate', 'applied', 'retained', 'mastered'].includes(st.stage);
  });
  return { ready: core.length > 0 && missing.length === 0, have: core.length - missing.length, need: core.length, missing: missing.map((s) => s.id) };
}

// How big each authored bank is, how much is kept for bosses, and how long
// the rest lasts at the daily allowance of new items.
export function reserveReport() {
  const rows = [];
  for (const s of SKILLS.filter((x) => x.cls === 'authored' && GEN[x.gen])) {
    const ids = itemsOf(s.id, 5) || [];
    const reserved = ids.filter((id) => inReserve(s.id, id)).length;
    const playable = ids.length - reserved;
    const allowance = newAllowance(s.id);
    rows.push({ skill: s.id, zone: s.zone, items: ids.length, reserved, playable, allowance, days: Math.floor(playable / allowance) });
  }
  const byZone = {};
  for (const r of rows) byZone[r.zone] = (byZone[r.zone] || 0) + r.items;
  const targets = Object.entries(MIN_RESERVE).map(([zone, min]) => ({ zone, items: byZone[zone] || 0, target: min, met: (byZone[zone] || 0) >= min }));
  return { rows, targets };
}

export const skillName = (id) => SKILL_BY_ID[id]?.name || id;
