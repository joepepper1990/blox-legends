import { genMaths } from './gen-maths.js';
import { genVerbal } from './gen-verbal.js';
import { genSpatial } from './gen-spatial.js';
import { SKILL_BY_ID } from './skills.js';

// Make one question for a skill at the child's current level.
export function makeQuestion(skillId, lvl, count, rng = Math.random) {
  const area = SKILL_BY_ID[skillId]?.area;
  if (area === 'maths') return genMaths(skillId, lvl, count, rng);
  if (area === 'verbal') return genVerbal(skillId, lvl, count, rng);
  if (area === 'spatial') return genSpatial(skillId, lvl, count, rng);
  throw new Error(`Unknown skill ${skillId}`);
}

export { Mastery } from './mastery.js';
export { SKILLS, AREAS, SKILL_BY_ID } from './skills.js';
