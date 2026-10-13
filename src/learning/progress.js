// Reading progress for the grown-ups' dashboard and the Term Tracker.
import { SKILLS, ZONES, SKILL_BY_ID, isLive } from './skills.js';
import { stageOf, STAGES, median } from './learner.js';
import { MISCONCEPTIONS } from './misconceptions.js';
import { OBJECTIVES, objectivesFor } from './curriculum.js';
import { termAt, currentRealm, REALMS, REALM_INDEX, TERM_NAMES } from './calendar.js';
import { rateText } from './stats.js';

const SECURE = ['accurate', 'applied', 'retained', 'mastered'];
const secure = (st) => SECURE.includes(st.stage) && !st.unverified;
const shown = (s) => isLive(s) || s.zone === 'word'; // Word skills are listed, waiting for their portals

export function skillSummary(learn) {
  return SKILLS.filter(shown).map((s) => {
    const sk = learn.sk?.[s.id];
    const st = stageOf(sk);
    const fl = sk?.fl?.length ? median(sk.fl) : sk?.v1ms || 0;
    const mis = Object.entries(learn.mis?.[s.id] || {})
      .filter(([, r]) => r[3] !== 'fixed')
      .map(([id, r]) => ({ id, name: MISCONCEPTIONS[id]?.name || id, n: r[0], state: r[3] }));
    return {
      ...s,
      stage: st.stage,
      unverified: st.unverified,
      refresh: st.refresh,
      n: sk?.n || 0,
      c: sk?.c || 0,
      ms: fl,
      band: sk?.b || 1,
      newRate: rateText(sk?.nw),
      recallRate: rateText(sk?.dr),
      mis,
      live: isLive(s),
    };
  });
}

// Share of an area's or zone's live skills that are secure, with partial
// credit for each stage on the way.
function progressOf(list) {
  const done = list.filter((s) => secure(s)).length;
  const credit = list.reduce((sum, s) => sum + Math.min(1, STAGES.indexOf(s.stage) / STAGES.indexOf('accurate')), 0);
  return { secure: done, total: list.length, pct: list.length ? credit / list.length : 0 };
}
export const areaProgress = (learn, area) => progressOf(skillSummary(learn).filter((s) => s.area === area && s.live));
export const zoneProgress = (learn, zone) => progressOf(skillSummary(learn).filter((s) => s.zone === zone && s.live));

// Checks passed out of checks finished, across every skill.
export function retention(learn) {
  let passed = 0;
  let failed = 0;
  for (const sk of Object.values(learn.sk || {})) {
    passed += sk.ck?.[0] || 0;
    failed += sk.ck?.[1] || 0;
  }
  return { passed, total: passed + failed };
}

export const ZONE_LIST = Object.entries(ZONES);

// The Term Tracker: where the school year is, and how this term's
// objectives are going against how much of the term he has been playing for
// (someone who starts mid-term isn't "behind" on day one).
export function termTracker(learn, date = new Date(), prefs = {}, { startedAt = 0 } = {}) {
  const cohort = prefs.cohort ?? 2026;
  const t = termAt(date, cohort);
  const realm = currentRealm(date, prefs);
  const info = REALMS[REALM_INDEX[realm]];
  const objectives = objectivesFor(realm).map((o) => {
    const skills = (o.skills || []).map((id) => ({ id, name: SKILL_BY_ID[id]?.name || id, ...stageOf(learn.sk?.[id]) }));
    const waiting = o.zone === 'word';
    const status = !skills.length
      ? 'later'
      : skills.every((s) => secure(s))
        ? 'secure'
        : skills.some((s) => s.stage !== 'new')
          ? 'started'
          : 'not started';
    return { ...o, skills, status, waiting };
  });
  const counted = objectives.filter((o) => !o.waiting && o.status !== 'later');
  const progress = prefs.termOverride ? 1 : t.progress;
  const from = Math.max(t.start.getTime(), startedAt || 0);
  const to = t.end.getTime() + 86400000;
  const playing = prefs.termOverride ? 1 : t.holiday ? 1 : Math.min(1, Math.max(0, (date - from) / Math.max(1, to - from)));
  const expected = Math.round(playing * counted.length);
  const actual = counted.filter((o) => o.status === 'secure').length;
  const verdict = !counted.length ? 'no content yet' : actual >= expected + 2 ? 'ahead' : actual >= expected ? 'on track' : actual >= expected - 2 ? 'a little behind' : 'behind';
  return {
    cohort,
    yearGroup: t.yearGroup,
    term: TERM_NAMES[t.term],
    holiday: t.holiday,
    progress,
    realm,
    realmName: info?.name || realm,
    override: !!prefs.termOverride,
    objectives,
    expected,
    actual,
    total: counted.length,
    verdict,
  };
}

export const REALM_OPTIONS = REALMS.map((r) => ({ id: r.id, name: r.name }));
export const ALL_OBJECTIVES = OBJECTIVES;
