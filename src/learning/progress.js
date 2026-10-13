// Reading progress for the grown-ups' dashboard from the learner model.
import { SKILLS, AREAS, isLive } from './skills.js';
import { stageOf, STAGES, median } from './learner.js';

const SECURE = ['accurate', 'applied', 'retained', 'mastered'];

export function skillSummary(learn) {
  return SKILLS.filter(isLive).map((s) => {
    const sk = learn.sk?.[s.id];
    const st = stageOf(sk);
    const fl = sk?.fl?.length ? median(sk.fl) : sk?.v1ms || 0;
    return { ...s, stage: st.stage, unverified: st.unverified, refresh: st.refresh, n: sk?.n || 0, c: sk?.c || 0, ms: fl, band: sk?.b || 1 };
  });
}

// Share of an area's live skills that are secure (Accurate or beyond), with
// partial credit for each stage on the way.
export function areaProgress(learn, area) {
  const list = skillSummary(learn).filter((s) => s.area === area);
  const secure = list.filter((s) => SECURE.includes(s.stage) && !s.unverified).length;
  const credit = list.reduce((sum, s) => sum + Math.min(1, STAGES.indexOf(s.stage) / STAGES.indexOf('accurate')), 0);
  return { secure, total: list.length, pct: list.length ? credit / list.length : 0 };
}

export const AREA_LIST = Object.entries(AREAS);
