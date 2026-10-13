// Every question fits the mechanic that shows it: answer labels stay legible
// over their pad or glass, and coded lines fit the door (plan §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, ZONES } from '../src/learning/skills.js';
import { GEN } from '../src/learning/gen/index.js';
import { makeItem, formatsAt } from '../src/learning/question.js';
import { MECHANICS } from '../src/mechanics/caps.js';
import { fitsMechanic } from '../src/mechanics/fit.js';
import { doorFits, labelAspect, fitLabelHeight } from '../src/engine/fit.js';
import { seeded } from '../src/learning/rng.js';

test('the fitting rules agree with what the game draws', () => {
  assert.ok(doorFits(['FISH → GJTI', 'LAMP → ?']));
  assert.ok(doorFits(['A↔Z B↔Y C↔X', 'QUEEN → ?']));
  assert.ok(!doorFits(['THIS LINE IS FAR TOO LONG FOR ANY DOOR TO SHOW']));
  assert.ok(labelAspect('WWWW') > labelAspect('iiii'));
  assert.equal(fitLabelHeight('7', 1.1, 2.35), 1.1);
});

for (const s of SKILLS.filter((x) => x.status === 'live' && GEN[x.gen])) {
  const home = ZONES[s.zone].home;
  test(`${s.id} fits its home mechanic (${home})`, () => {
    const [lo, hi] = MECHANICS[home].options;
    for (let band = 1; band <= 5; band++)
      for (let count = lo; count <= hi; count++)
        for (const format of formatsAt(s.id, band))
          for (let seed = 1; seed <= 15; seed++) {
            const q = makeItem(s.id, { band, format, count, rng: seeded(seed * 97 + band) });
            const why = fitsMechanic(q, home);
            assert.equal(why, null, `${s.id} ${format} band ${band}: ${why} — ${q.door?.join(' / ') || q.prompt}`);
          }
  });
}
