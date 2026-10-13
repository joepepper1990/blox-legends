// Making questions (Question v2). makeItem asks the skill's generator for a
// question, fingerprints it, and checks it with the independent checkers
// before anyone sees it: a question that fails is thrown away and another is
// made. `accept(q)` lets the scheduler reject items (already seen, in the
// boss partition, or unsuitable for the mechanic).
import { SKILL_BY_ID } from './skills.js';
import { GEN } from './gen/index.js';
import { verify } from './check/index.js';
import { fpOf, FPV } from './fp.js';
import { pick, lvlToBand } from './gen/util.js';

export function generatorFor(skillId) {
  const skill = SKILL_BY_ID[skillId];
  if (!skill) throw new Error(`Unknown skill ${skillId}`);
  const gen = GEN[skill.gen];
  if (!gen) throw new Error(`No generator for ${skillId}`);
  return { skill, gen };
}

export function formatsAt(skillId, band) {
  const { skill, gen } = generatorFor(skillId);
  return gen.formatsAt(skill, band).filter((f) => skill.formats.includes(f));
}

// Fact and authored skills list their items; procedural ones don't.
export function itemsOf(skillId, band) {
  const { skill, gen } = generatorFor(skillId);
  return gen.items ? gen.items(skill, band) : null;
}

export function finish(q) {
  q.fp = fpOf(q.skill, q.itemKey);
  q.fpv = FPV;
  q.solved ??= q.prompt;
  q.explain ??= {};
  return q;
}

const warned = new Set();
export const rejected = { count: 0 };

export function makeItem(skillId, { band = 3, format, count = 3, rng = Math.random, item, accept = () => true, tries = 40 } = {}) {
  const { skill, gen } = generatorFor(skillId);
  let last = null;
  for (let i = 0; i < tries; i++) {
    const fmt = format || pick(rng, formatsAt(skillId, band));
    let q;
    try {
      q = finish(gen.make(skill, { band, format: fmt, count, rng, item }));
    } catch (e) {
      last = e;
      continue;
    }
    const v = verify(q);
    if (!v.ok) {
      rejected.count += 1;
      last = new Error(`${skillId}: ${v.reason}`);
      if (!warned.has(skillId)) {
        warned.add(skillId);
        console.warn(`Question rejected by its checker (${skillId}): ${v.reason}`);
      }
      continue;
    }
    if (!accept(q)) {
      last = new Error(`${skillId}: no acceptable item`);
      continue;
    }
    return q;
  }
  throw last || new Error(`Could not make a question for ${skillId}`);
}

// The v1 interface (level 0..1) used by the original worlds until they move
// to the scheduler.
export function makeQuestion(skillId, lvl, count, rng = Math.random) {
  return makeItem(skillId, { band: lvlToBand(lvl), count, rng });
}
