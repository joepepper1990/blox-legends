// Content validation (plan §6, H). Hard checks fail the build; report-only
// checks are written to docs/content-report.md for the grown-ups and the
// next phase. Usage:
//   node tools/validate-content.mjs            full run, writes the report
//   node tools/validate-content.mjs --quick    fewer samples, no capacity rule
//                                              (used by tests; the capacity rule
//                                              needs the full 90-day simulation)
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, SKILL_BY_ID, ZONES } from '../src/learning/skills.js';
import { GEN } from '../src/learning/gen/index.js';
import { makeItem, formatsAt, canAsk, finish } from '../src/learning/question.js';
import { verify } from '../src/learning/check/index.js';
import { FORMATS } from '../src/learning/formats.js';
import { MECHANICS } from '../src/mechanics/caps.js';
import { fitsMechanic, HIDDEN } from '../src/mechanics/fit.js';
import { OBJECTIVES } from '../src/learning/curriculum.js';
import { MISCONCEPTIONS } from '../src/learning/misconceptions.js';
import { reserveReport } from '../src/learning/assessment.js';
import { inPartition } from '../src/learning/fp.js';
import { seeded } from '../src/learning/rng.js';
import { simulate } from './sim/sim.mjs';
import '../src/learning/content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = SKILLS.filter((s) => s.status !== 'planned' && GEN[s.gen]);
const homeOf = (s) => s.home || ZONES[s.zone].home;

export function validate({ quick = false, capacity = !quick } = {}) {
  const fail = [];
  const notes = {};

  // 1. Registry: every reference resolves, prerequisites form no cycle.
  for (const s of SKILLS) {
    for (const f of s.formats) if (!FORMATS[f]) fail.push(`${s.id}: unknown format ${f}`);
    for (const t of s.transfer) {
      if (!MECHANICS[t.mech]) fail.push(`${s.id}: unknown mechanic ${t.mech}`);
      if (!FORMATS[t.format]) fail.push(`${s.id}: unknown transfer format ${t.format}`);
    }
    for (const p of s.pre) if (!SKILL_BY_ID[p]) fail.push(`${s.id}: unknown prerequisite ${p}`);
    if (s.status === 'live' && !GEN[s.gen]) fail.push(`${s.id}: live without a generator`);
  }
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 2) return;
    if (state[id] === 1) return fail.push(`prerequisite cycle: ${[...path, id].join(' → ')}`);
    state[id] = 1;
    for (const p of SKILL_BY_ID[id]?.pre || []) visit(p, [...path, id]);
    state[id] = 2;
  };
  for (const s of SKILLS) visit(s.id, []);

  // 2. Year 3 Autumn: every objective is covered by built skills, and every
  //    core skill of the term belongs to an objective.
  const y3 = OBJECTIVES.filter((o) => o.realm === 'y3-aut');
  for (const o of y3) {
    if (!o.skills?.length) fail.push(`${o.id}: no skills`);
    for (const id of o.skills || []) {
      const s = SKILL_BY_ID[id];
      if (!s || !GEN[s.gen]) fail.push(`${o.id}: skill ${id} is not built`);
      else if (s.status !== 'live' && s.zone !== 'word') fail.push(`${o.id}: skill ${id} is not live`);
    }
  }
  const mapped = new Set(y3.flatMap((o) => o.skills || []));
  for (const s of SKILLS.filter((x) => x.realm === 'y3-aut' && x.core)) if (!mapped.has(s.id)) fail.push(`${s.id}: core Year 3 Autumn skill in no objective`);
  notes.objectives = { total: y3.length, word: y3.filter((o) => o.zone === 'word').length };

  // 3. Checkers agree with every generated item: bands × counts × formats.
  const seeds = quick ? 4 : 25;
  let checked = 0;
  for (const s of BUILT) {
    const mechs = [homeOf(s), ...s.transfer.map((t) => t.mech)].filter(Boolean);
    const counts = [...new Set((mechs.length ? mechs : ['logic-lock']).flatMap((m) => range(...MECHANICS[m].options)))];
    for (let band = 1; band <= 5; band++)
      for (const count of counts)
        for (const f of formatsAt(s.id, band, count).filter((x) => canAsk(s.id, x, band, count)))
          for (let i = 1; i <= seeds; i++) {
            try {
              const q = makeItem(s.id, { band, count, format: f, rng: seeded(i * 7919 + band * 31 + count) });
              const v = verify(q);
              if (!v.ok) fail.push(`${s.id} ${f} band ${band}: ${v.reason}`);
              checked++;
            } catch (e) {
              fail.push(`${s.id} ${f} band ${band} ×${count}: ${e.message}`);
            }
          }
  }
  notes.checked = checked;

  // 4. Fit: every built skill in its home world and wherever its transfer
  //    formats send it. Items that are only turned away one at a time (a cube
  //    hidden in a flat picture) are counted, not failed, if rare.
  const fitRows = [];
  for (const s of BUILT) {
    const ctxs = [...(homeOf(s) ? [{ mech: homeOf(s), format: null }] : []), ...s.transfer];
    for (const t of ctxs) {
      const [lo, hi] = MECHANICS[t.mech].options;
      let made = 0;
      let soft = 0;
      for (let band = 1; band <= 5; band++)
        for (let count = lo; count <= hi; count++) {
          const fmts = t.format ? [t.format] : formatsAt(s.id, band, count);
          for (const f of fmts.filter((x) => canAsk(s.id, x, band, count)))
            for (let i = 1; i <= (quick ? 2 : 6); i++) {
              const q = makeItem(s.id, { band, count, format: f, rng: seeded(i * 104729 + band) });
              const why = fitsMechanic(q, t.mech);
              made++;
              if (why === HIDDEN) soft++;
              else if (why) fail.push(`${s.id} ${f} in ${t.mech}: ${why}`);
            }
        }
      if (made && soft / made > 0.5) fail.push(`${s.id} in ${t.mech}: ${soft}/${made} items turned away`);
      fitRows.push({ skill: s.id, mech: t.mech, format: t.format || 'home', made, soft });
    }
  }
  notes.fit = fitRows;

  // 5. Misconceptions: every one explains itself.
  const any = new Proxy({}, { get: (_, k) => (k === Symbol.toPrimitive ? () => 2 : k === 'toString' ? () => '2' : 2) });
  for (const [id, m] of Object.entries(MISCONCEPTIONS)) {
    let text = '';
    try {
      text = m.explain(any);
    } catch (e) {
      fail.push(`misconception ${id}: ${e.message}`);
    }
    if (!text || /undefined|NaN/.test(text)) fail.push(`misconception ${id}: explanation "${text}"`);
  }
  notes.misconceptions = Object.keys(MISCONCEPTIONS).length;

  // 6. Authored banks last at least 14 days at their daily allowance
  //    (playable banks; Word zone banks are reported until its portals).
  const reserve = reserveReport();
  for (const r of reserve.rows) {
    const playable = SKILL_BY_ID[r.skill].status === 'live';
    if (playable && r.days < 14) fail.push(`${r.skill}: bank lasts ${r.days} days at ${r.allowance} new a day`);
  }
  notes.reserve = reserve;

  // 7. Capacity rule (plan §6.3): for each procedural skill and band, the
  //    item space S must satisfy S ≥ 3·(D + 0.15·S), D = items demanded in 90
  //    days by a heavy player. S is sampled until it is proven big enough.
  notes.capacity = [];
  if (!capacity) return { ok: fail.length === 0, fail, notes };
  const days = 90;
  const heavy = simulate({ persona: 'heavy', days, seed: 11, statuses: ['live'] });
  const scale = 90 / days;
  const capRows = [];
  for (const [key, fps] of Object.entries(heavy.stats.demand)) {
    const [id, bandStr] = key.split('|');
    const s = SKILL_BY_ID[id];
    const band = Number(bandStr);
    const D = Math.ceil(fps.size * scale);
    const need = Math.ceil((3 * D) / (1 - 0.45));
    const { distinct, samples } = sampleSpace(s, band, need, 12000);
    const ok = distinct >= need;
    capRows.push({ skill: id, band, demand: D, need, found: distinct, samples, ok });
    if (!ok) fail.push(`${id} band ${band}: capacity ${distinct} < ${need} needed for ${D} items in 90 days`);
  }
  notes.capacity = capRows.sort((a, b) => a.skill.localeCompare(b.skill) || a.band - b.band);
  notes.gapBreaks = heavy.stats.gapBreaks;
  notes.heavyAnswered = heavy.stats.answered;

  return { ok: fail.length === 0, fail, notes };
}

// Distinct practice items (outside the boss partition) found by sampling,
// stopping as soon as `need` are found.
function sampleSpace(skill, band, need, max) {
  const gen = GEN[skill.gen];
  const fmts = formatsAt(skill.id, band);
  const seen = new Set();
  let i = 0;
  for (; i < max && seen.size < need; i++) {
    try {
      const q = finish(gen.make(skill, { band, format: fmts[i % fmts.length], count: 3, rng: seeded(i * 2654435761 + band * 97) }));
      if (!inPartition(q.fp)) seen.add(q.fp);
    } catch {
      /* the generator's own retry; ignored here */
    }
  }
  return { distinct: seen.size, samples: i };
}

function range(lo, hi) {
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

export function reportMarkdown(res, { date = new Date() } = {}) {
  const n = res.notes;
  const lines = [];
  lines.push('# Content report', '');
  lines.push(`Generated by \`node tools/validate-content.mjs\` on ${date.toISOString().slice(0, 10)}. Hard checks: **${res.ok ? 'all passed' : `${res.fail.length} failed`}**.`, '');
  lines.push('## Hard checks', '');
  lines.push('| Check | Result |', '|---|---|');
  lines.push(`| Registry references and prerequisite order | ${res.fail.some((f) => /unknown|cycle|without a generator/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Year 3 Autumn objectives covered (${n.objectives.total}, of which ${n.objectives.word} Word) | ${res.fail.some((f) => /^y3a/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Independent checker agrees with every generated question (${n.checked} checked) | ${res.fail.some((f) => / band \d/.test(f) && !/capacity/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Every question fits each world that shows it (${n.fit.length} skill × world pairs) | ${res.fail.some((f) => / in [a-z-]+:/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Every misconception has a worked explanation (${n.misconceptions}) | ${res.fail.some((f) => /^misconception/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Playable word banks last 14+ days at their daily allowance | ${res.fail.some((f) => /bank lasts/.test(f)) ? 'failed' : 'passed'} |`);
  lines.push(`| Capacity rule S ≥ 3·(D + 0.15·S) for a heavy player over 90 days (${n.capacity.length} skill × band pairs) | ${res.fail.some((f) => /capacity/.test(f)) ? 'failed' : 'passed'} |`);
  if (res.fail.length) lines.push('', '### Failures', '', ...res.fail.map((f) => `- ${f}`));
  lines.push('', '## Report only (hard gates from R0.9)', '');
  lines.push('### Boss reserves (plan §6.4)', '');
  lines.push('| Zone | Authored items | Target | Met |', '|---|---|---|---|');
  for (const t of n.reserve.targets) lines.push(`| ${t.zone} | ${t.items} | ${t.target} | ${t.met ? 'yes' : '**no**'} |`);
  lines.push('', '| Bank | Items | Kept for bosses | Playable | New a day | Lasts (days) |', '|---|---|---|---|---|---|');
  for (const r of n.reserve.rows) lines.push(`| ${r.skill} | ${r.items} | ${r.reserved} | ${r.playable} | ${r.allowance} | ${r.days} |`);
  lines.push('', '### Word zone', '');
  lines.push('Word zone skills (spelling, prefixes, -ly, a/an, conjunctions, prepositions, adverbs) are built and checked but not yet playable: they arrive with the Word portals in R0.9. Until then they are exempt from "Applied", and the Term Tracker shows their objectives as waiting rather than behind.');
  lines.push('', '### Capacity (heavy player, 180 questions a day)', '');
  lines.push(`Simulated ${n.heavyAnswered} answers; ${n.gapBreaks} times a resting skill had to be used as filler.`, '');
  lines.push('| Skill | Band | Items needed in 90 days | Space needed | Found (sampled) |', '|---|---|---|---|---|');
  for (const c of n.capacity) lines.push(`| ${c.skill} | ${c.band} | ${c.demand} | ${c.need} | ${c.found}${c.ok ? '' : ' **short**'} |`);
  lines.push('', '### Fit: items turned away one at a time', '');
  const soft = n.fit.filter((r) => r.soft);
  lines.push(soft.length ? soft.map((r) => `- ${r.skill} (${r.format}) in ${r.mech}: ${r.soft} of ${r.made} would hide a cube in a flat picture; another item is used instead.`).join('\n') : 'None.');
  return `${lines.join('\n')}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const quick = process.argv.includes('--quick');
  const t0 = Date.now();
  const res = validate({ quick });
  if (!quick) writeFileSync(join(ROOT, 'docs', 'content-report.md'), reportMarkdown(res));
  console.log(res.ok ? `content valid (${((Date.now() - t0) / 1000).toFixed(0)}s)` : `content INVALID:\n${res.fail.join('\n')}`);
  if (!quick) console.log('report: docs/content-report.md');
  process.exit(res.ok ? 0 : 1);
}
