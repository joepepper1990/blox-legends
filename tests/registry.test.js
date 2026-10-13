import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_BY_ID, ZONES } from '../src/learning/skills.js';
import { FORMATS } from '../src/learning/formats.js';
import { MECHANICS } from '../src/mechanics/caps.js';
import { REALMS, REALM_INDEX, termAt, currentRealm, openRealms } from '../src/learning/calendar.js';
import { OBJECTIVES, SPINE } from '../src/learning/curriculum.js';
import { IDS_LOCK } from '../src/learning/ids-lock.js';
import { currentIds } from '../src/learning/ids.js';
import '../src/learning/content.js'; // registers content ids (items, misconceptions)

const CLASSES = ['fact', 'procedural', 'authored'];
const STATUS = ['live', 'ready', 'planned'];
// Skills whose "Applied" stage can't be reached until their portals exist.
const NO_TRANSFER_YET = new Set(SKILLS.filter((s) => s.zone === 'word').map((s) => s.id));

// The 31 skills of the first version: their ids are in saves and logs.
const V1_IDS = 'm.bonds10 m.add20 m.x2 m.x10 m.x5 m.sub20 m.x3 m.x4 m.double m.x8 m.bonds100 m.x6 m.x9 m.x11 m.x7 m.x12 v.alphaNext v.alphaJump v.alphaPos v.code1 v.series v.codeN v.decode v.pairs v.mirror s.count1 s.rotY s.top s.count2 s.rot3 s.count3'.split(' ');

test('every skill is fully described', () => {
  const ids = new Set();
  for (const s of SKILLS) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.match(s.id, /^[mvse]\.[A-Za-z0-9]+$/, s.id);
    assert.ok(ZONES[s.zone], `${s.id}: zone`);
    assert.ok(s.strand && s.name, `${s.id}: strand and name`);
    assert.ok(REALM_INDEX[s.realm] !== undefined, `${s.id}: realm ${s.realm}`);
    assert.ok(CLASSES.includes(s.cls), `${s.id}: class`);
    assert.ok(STATUS.includes(s.status), `${s.id}: status`);
    assert.ok(s.gen, `${s.id}: generator`);
    assert.ok(s.formats.length > 0 && s.formats.every((f) => FORMATS[f]), `${s.id}: formats`);
    assert.ok(Number.isInteger(s.target) && s.target >= 1 && s.target <= 5, `${s.id}: target band`);
    for (const t of s.transfer) {
      assert.ok(MECHANICS[t.mech], `${s.id}: transfer mechanic ${t.mech}`);
      assert.ok(FORMATS[t.format], `${s.id}: transfer format ${t.format}`);
    }
  }
});

test('the first version’s 31 skill ids still exist and are live', () => {
  for (const id of V1_IDS) assert.equal(SKILL_BY_ID[id]?.status, 'live', id);
});

test('prerequisites exist, come from the same or an earlier realm, and never loop', () => {
  for (const s of SKILLS)
    for (const p of s.pre) {
      assert.ok(SKILL_BY_ID[p], `${s.id} needs unknown ${p}`);
      assert.ok(REALM_INDEX[SKILL_BY_ID[p].realm] <= REALM_INDEX[s.realm], `${s.id} needs ${p} from a later realm`);
      if (s.status === 'live') assert.equal(SKILL_BY_ID[p].status, 'live', `live ${s.id} needs non-live ${p}`);
    }
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 2) return;
    assert.notEqual(state[id], 1, `prerequisite loop: ${[...path, id].join(' → ')}`);
    state[id] = 1;
    for (const p of SKILL_BY_ID[id].pre) visit(p, [...path, id]);
    state[id] = 2;
  };
  for (const s of SKILLS) visit(s.id, []);
});

test('every skill can reach "Applied" in at least two mechanics (Word zone waits for its portals)', () => {
  for (const s of SKILLS) {
    if (NO_TRANSFER_YET.has(s.id)) continue;
    const mechs = new Set(s.transfer.map((t) => t.mech));
    assert.ok(mechs.size >= 2, `${s.id}: transfer contexts in ${[...mechs].join(', ') || 'none'}`);
  }
});

test('ids are locked: none removed or reused, every new one recorded', () => {
  const now = currentIds();
  for (const [kind, ids] of Object.entries(now)) {
    const locked = new Set(IDS_LOCK[kind] || []);
    const missing = ids.filter((id) => !locked.has(id));
    assert.deepEqual(missing, [], `new ${kind} not in the lock — run node tools/ids-lock.mjs`);
  }
  for (const [kind, locked] of Object.entries(IDS_LOCK)) {
    if (kind === 'retired') continue;
    const have = new Set(now[kind] || []);
    const gone = locked.filter((id) => !have.has(id) && !IDS_LOCK.retired[id]);
    assert.deepEqual(gone, [], `${kind} removed without being retired`);
  }
});

test('Year 3 Autumn is fully mapped to skills, and every skill to an objective', () => {
  const ids = new Set();
  for (const o of OBJECTIVES) {
    assert.ok(!ids.has(o.id), `duplicate objective ${o.id}`);
    ids.add(o.id);
    assert.ok(ZONES[o.zone], o.id);
    assert.ok(o.skills.length > 0, `${o.id} has skills`);
    for (const s of o.skills) {
      assert.ok(SKILL_BY_ID[s], `${o.id}: unknown skill ${s}`);
      assert.equal(SKILL_BY_ID[s].zone, o.zone, `${o.id}: ${s} is in another zone`);
    }
  }
  const y3a = OBJECTIVES.filter((o) => o.realm === 'y3-aut');
  for (const zone of Object.keys(ZONES)) assert.ok(y3a.some((o) => o.zone === zone), `Y3 Autumn has ${zone} objectives`);
  const mapped = new Set(OBJECTIVES.flatMap((o) => o.skills));
  for (const s of SKILLS.filter((x) => x.realm === 'y3-aut' || x.realm === 'found')) assert.ok(mapped.has(s.id), `${s.id} is in an objective`);
  for (const r of REALMS.slice(2, 11)) assert.ok(SPINE[r.id], `spine covers ${r.id}`);
});

const at = (y, m, d) => new Date(y, m - 1, d, 12);
test('the school calendar puts each date in the right realm', () => {
  const cases = [
    [at(2026, 8, 20), 'found', 2],
    [at(2026, 9, 2), 'found', 2],
    [at(2026, 9, 3), 'y3-aut', 3],
    [at(2026, 10, 13), 'y3-aut', 3],
    [at(2026, 12, 25), 'y3-aut', 3],
    [at(2027, 1, 4), 'y3-spr', 3],
    [at(2027, 4, 2), 'y3-spr', 3],
    [at(2027, 4, 20), 'y3-sum', 3],
    [at(2027, 8, 10), 'y3-sum', 3],
    [at(2027, 9, 10), 'y4-aut', 4],
    [at(2028, 2, 1), 'y4-spr', 4],
    [at(2029, 6, 1), 'y5-sum', 5],
    [at(2029, 7, 25), 'y6-pre', 5],
    [at(2029, 9, 5), 'y6-pre', 6],
    [at(2029, 9, 20), 'league', 6],
  ];
  for (const [date, realm, year] of cases) {
    const t = termAt(date, 2026);
    assert.equal(t.realm, realm, `${date.toDateString()} → ${t.realm}`);
    assert.equal(t.yearGroup, year, `${date.toDateString()} year group`);
  }
  const mid = termAt(at(2026, 10, 27), 2026);
  assert.ok(mid.progress > 0.3 && mid.progress < 0.6 && !mid.holiday);
  assert.equal(termAt(at(2026, 12, 25), 2026).holiday, true);
  // A later cohort is simply shifted by a year.
  assert.equal(termAt(at(2027, 10, 1), 2027).realm, 'y3-aut');
});

test('realms open by calendar within the parent’s lead, and can be overridden', () => {
  const d = at(2026, 10, 13);
  assert.deepEqual([...openRealms(d)], ['found', 'y3-aut', 'y3-spr']);
  assert.deepEqual([...openRealms(d, {}, { maxLead: 0 })], ['found', 'y3-aut']);
  assert.equal(currentRealm(d, { termOverride: 'y3-spr' }), 'y3-spr');
  assert.equal(currentRealm(d, { termOverride: 'nonsense' }), 'y3-aut');
});
