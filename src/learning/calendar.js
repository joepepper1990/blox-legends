// School calendar → realm. Realms follow the school year (plan §3): each
// term has its realm; holidays keep the realm of the term just finished.
// Nothing here knows a date of birth: the parent sets the cohort (the school
// year, by its September, in which the player is in Year 3).
//
// Term dates are close to Kent's; the parent can override the realm from the
// Term Tracker if the school's dates differ.

export const REALMS = [
  { id: 'found', name: 'Foundations', year: 2, term: null },
  { id: 'y3-aut', name: 'Autumn Woods', year: 3, term: 'aut' },
  { id: 'y3-spr', name: 'Frost Peaks', year: 3, term: 'spr' },
  { id: 'y3-sum', name: 'Sunny Shores', year: 3, term: 'sum' },
  { id: 'y4-aut', name: 'Ninja Valley', year: 4, term: 'aut' },
  { id: 'y4-spr', name: 'Crystal Caves', year: 4, term: 'spr' },
  { id: 'y4-sum', name: 'Jungle Ruins', year: 4, term: 'sum' },
  { id: 'y5-aut', name: 'Volcano Forge', year: 5, term: 'aut' },
  { id: 'y5-spr', name: 'Sky Kingdom', year: 5, term: 'spr' },
  { id: 'y5-sum', name: 'Cyber City', year: 5, term: 'sum' },
  { id: 'y6-pre', name: 'Legends’ Citadel', year: 6, term: null },
  { id: 'league', name: 'Legends League', year: 6, term: null },
];
export const REALM_INDEX = Object.fromEntries(REALMS.map((r, i) => [r.id, i]));
export const TERM_NAMES = { aut: 'Autumn', spr: 'Spring', sum: 'Summer' };

// [month (1–12), day] term starts and ends, by the September that starts the
// school year. Years not listed use DEFAULT_TERMS.
const TERM_DATES = {
  2026: { aut: [[9, 3], [12, 18]], spr: [[1, 4], [3, 26]], sum: [[4, 12], [7, 21]] },
  2027: { aut: [[9, 2], [12, 17]], spr: [[1, 4], [3, 31]], sum: [[4, 18], [7, 21]] },
  2028: { aut: [[9, 4], [12, 20]], spr: [[1, 3], [3, 29]], sum: [[4, 16], [7, 20]] },
};
const DEFAULT_TERMS = { aut: [[9, 3], [12, 18]], spr: [[1, 4], [3, 28]], sum: [[4, 15], [7, 21]] };
// The Kent Test is in early September of Year 6.
export const TEST_DAY = [9, 10];

const day = (y, [m, d]) => new Date(y, m - 1, d);
const DAY_MS = 86400000;

// The school year a date belongs to, by its September.
export const schoolYearOf = (date) => (date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1);

function terms(sy) {
  const t = TERM_DATES[sy] || DEFAULT_TERMS;
  return [
    { term: 'aut', start: day(sy, t.aut[0]), end: day(sy, t.aut[1]) },
    { term: 'spr', start: day(sy + 1, t.spr[0]), end: day(sy + 1, t.spr[1]) },
    { term: 'sum', start: day(sy + 1, t.sum[0]), end: day(sy + 1, t.sum[1]) },
  ];
}

// Where the school year is on `date` for a player in Year 3 in the school year
// starting September `cohort`.
export function termAt(date, cohort = 2026) {
  const sy = schoolYearOf(date);
  const yearGroup = 3 + (sy - cohort);
  const list = terms(sy);
  let current = null;
  let holiday = true;
  for (const t of list) {
    if (date >= t.start) current = t;
    if (date >= t.start && date < new Date(t.end.getTime() + DAY_MS)) holiday = false;
  }
  // Before the Autumn term starts: still the summer holiday of last year.
  let term = current?.term ?? 'sum';
  let year = yearGroup;
  let span = current;
  if (!current) {
    year = yearGroup - 1;
    span = terms(sy - 1)[2];
  }
  const progress = holiday ? 1 : Math.min(1, Math.max(0, (date - span.start) / (span.end - span.start + DAY_MS)));
  return { schoolYear: sy, yearGroup: year, term, holiday, start: span.start, end: span.end, progress, realm: realmFor(year, term, holiday, date, sy) };
}

function realmFor(year, term, holiday, date, sy) {
  if (year < 3) return 'found';
  if (year <= 5) {
    // The summer holiday after Year 5: Legends' Citadel, ready for the test.
    if (year === 5 && term === 'sum' && holiday && date.getMonth() >= 6) return 'y6-pre';
    return `y${year}-${term}`;
  }
  // Year 6: the Citadel until the test, then the League.
  return date < day(sy, TEST_DAY) ? 'y6-pre' : 'league';
}

// The realm whose content should be learnt now. `prefs.termOverride` (a realm
// id) wins when the parent has set it.
export function currentRealm(date, prefs = {}) {
  if (prefs.termOverride && REALM_INDEX[prefs.termOverride] !== undefined) return prefs.termOverride;
  return termAt(date, prefs.cohort ?? 2026).realm;
}

// Realms open for NEW learning: everything up to the current realm plus the
// parent's maximum lead (default one term, plan §3). Past realms never close.
export function openRealms(date, prefs = {}, settings = {}) {
  const lead = settings.maxLead ?? 1;
  const upto = Math.min(REALMS.length - 1, REALM_INDEX[currentRealm(date, prefs)] + lead);
  return new Set(REALMS.slice(0, upto + 1).map((r) => r.id));
}
