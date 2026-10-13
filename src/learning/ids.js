// Every kind of id that is stored in saves or in the learning log, gathered in
// one place so the id lock (ids-lock.js) can guard them.
import { SKILLS } from './skills.js';
import { FORMATS } from './formats.js';
import { MECHANICS } from '../mechanics/caps.js';
import { OBJECTIVES } from './curriculum.js';
import { REALMS } from './calendar.js';

const extra = { misconceptions: [], items: [] };

// Content modules register their stable ids here when they load.
export function registerIds(kind, ids) {
  extra[kind] = [...new Set([...(extra[kind] || []), ...ids])];
}

export function currentIds() {
  return {
    skills: SKILLS.map((s) => s.id),
    formats: Object.keys(FORMATS),
    mechanics: Object.keys(MECHANICS),
    objectives: OBJECTIVES.map((o) => o.id),
    realms: REALMS.map((r) => r.id),
    ...extra,
  };
}
