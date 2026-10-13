// What the learner model needs to know about skills, without importing the
// generators into it: each skill's class, target band, zone and how many
// worlds "Applied" needs, and which items a fact skill has at a band.
import { SKILL_BY_ID } from './skills.js';
import { itemsOf } from './question.js';

export function makeRegistry({ relaxed = false } = {}) {
  const cache = new Map();
  return {
    relaxed,
    skill: (id) => SKILL_BY_ID[id],
    items(id, band) {
      const key = `${id}|${band}`;
      if (!cache.has(key)) cache.set(key, SKILL_BY_ID[id] ? itemsOf(id, band) || [] : []);
      return cache.get(key);
    },
  };
}
