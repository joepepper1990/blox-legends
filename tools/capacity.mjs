// Item-space capacity per skill and band (plan §6.3 capacity rule).
// Procedural skills: distinct item fingerprints seen in N samples, a lower
// bound on the space. Fact and authored skills: the size of the item set.
//   node tools/capacity.mjs [samples] [--json]
import { SKILLS } from '../src/learning/skills.js';
import { GEN } from '../src/learning/gen/index.js';
import { finish, formatsAt, itemsOf } from '../src/learning/question.js';
import { seeded } from '../src/learning/rng.js';
import '../src/learning/content.js';

export function capacity(skill, band, samples = 6000) {
  if (skill.cls !== 'procedural') return { kind: 'set', size: itemsOf(skill.id, band)?.length ?? 0 };
  const gen = GEN[skill.gen];
  const fmts = formatsAt(skill.id, band);
  const seen = new Set();
  let made = 0;
  for (let i = 1; i <= samples; i++) {
    try {
      const q = finish(gen.make(skill, { band, format: fmts[i % fmts.length], count: 3, rng: seeded(i * 2654435761 + band) }));
      seen.add(q.fp);
      made++;
    } catch {
      /* generator retry; ignored here */
    }
  }
  // Rough total via the share of repeats (Good–Turing style): if almost
  // nothing repeated, the space is far bigger than the sample.
  return { kind: 'sampled', distinct: seen.size, samples: made, saturated: seen.size < made * 0.5 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const samples = Number(process.argv[2]) || 6000;
  const out = {};
  for (const s of SKILLS.filter((x) => GEN[x.gen] && x.status !== 'planned')) {
    out[s.id] = {};
    for (let band = 1; band <= 5; band++) out[s.id][band] = capacity(s, band, samples);
    if (!process.argv.includes('--json')) {
      const row = [1, 2, 3, 4, 5].map((b) => {
        const c = out[s.id][b];
        return c.kind === 'set' ? `${c.size}` : `${c.distinct}${c.saturated ? '*' : ''}`;
      });
      console.log(`${s.id.padEnd(12)} ${s.cls.padEnd(10)} ${row.map((r) => r.padStart(6)).join(' ')}`);
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out));
}
