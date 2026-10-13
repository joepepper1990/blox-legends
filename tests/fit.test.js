// Every question fits the mechanic that shows it: answer labels stay legible
// over their pad or glass, and coded lines fit the door (plan §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, ZONES } from '../src/learning/skills.js';
import { GEN } from '../src/learning/gen/index.js';
import { makeItem, formatsAt, canAsk } from '../src/learning/question.js';
import { MECHANICS } from '../src/mechanics/caps.js';
import { fitsMechanic, HIDDEN } from '../src/mechanics/fit.js';
import { doorFits, labelAspect, fitLabelHeight } from '../src/engine/fit.js';
import { seeded } from '../src/learning/rng.js';

test('the fitting rules agree with what the game draws', () => {
  assert.ok(doorFits(['FISH → GJTI', 'LAMP → ?']));
  assert.ok(doorFits(['A↔Z B↔Y C↔X', 'QUEEN → ?']));
  assert.ok(!doorFits(['THIS LINE IS FAR TOO LONG FOR ANY DOOR TO SHOW']));
  assert.ok(labelAspect('WWWW') > labelAspect('iiii'));
  assert.equal(fitLabelHeight('7', 1.1, 2.35), 1.1);
});

// Every built skill, live or ready, in its home mechanic and wherever its
// transfer formats send it (plan §4: label fit for each format × mechanic).
// An item may be turned away for a reason that only affects that item (a
// cube hidden in a flat picture); the runtime then asks for another, so that
// must stay rare. Any other misfit is a content error.
const tried = (s, mech, formatsFor) => {
  const [lo, hi] = MECHANICS[mech].options;
  let made = 0;
  let soft = 0;
  for (let band = 1; band <= 5; band++)
    for (let count = lo; count <= hi; count++)
      for (const format of formatsFor(band, count).filter((f) => canAsk(s.id, f, band, count)))
        for (let seed = 1; seed <= 15; seed++) {
          const q = makeItem(s.id, { band, format, count, rng: seeded(seed * 97 + band) });
          const why = fitsMechanic(q, mech);
          made++;
          if (why === HIDDEN) {
            soft++;
            const again = makeItem(s.id, { band, format, count, rng: seeded(seed * 97 + band), accept: (x) => fitsMechanic(x, mech) === null });
            assert.equal(fitsMechanic(again, mech), null);
            continue;
          }
          assert.equal(why, null, `${s.id} ${format} in ${mech} band ${band}: ${why} — ${q.door?.join(' / ') || q.prompt}`);
        }
  assert.ok(soft / made <= 0.5, `${s.id} in ${mech}: ${soft} of ${made} items turned away`);
};

for (const s of SKILLS.filter((x) => x.status !== 'planned' && GEN[x.gen])) {
  const home = s.home || ZONES[s.zone].home;
  if (home)
    test(`${s.id} fits its home mechanic (${home})`, () => tried(s, home, (band, count) => formatsAt(s.id, band, count)));
  for (const t of s.transfer)
    test(`${s.id} transfer ${t.format} fits ${t.mech}`, () => tried(s, t.mech, () => [t.format]));
}
