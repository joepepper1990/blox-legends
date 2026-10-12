// The skill map. Each skill is one small thing the Kent Test / Shepway Test
// relies on. `pre` lists skills that should be secure before this one opens.
// `area` decides which world trains it.
//
// Order inside an area matters: the engine teaches the earliest open skill
// first, so the list runs roughly from Year 3 basics to test standard.

export const AREAS = {
  maths: { name: 'Maths', world: 'obby' },
  verbal: { name: 'Verbal reasoning', world: 'vault' },
  spatial: { name: 'Spatial reasoning', world: 'lab' },
};

export const SKILLS = [
  // ---- Maths (Glass Bridge Obby) ----
  { id: 'm.bonds10', area: 'maths', name: 'Number bonds to 10', pre: [] },
  { id: 'm.add20', area: 'maths', name: 'Adding within 20', pre: ['m.bonds10'] },
  { id: 'm.x2', area: 'maths', name: '2 times table', pre: [] },
  { id: 'm.x10', area: 'maths', name: '10 times table', pre: [] },
  { id: 'm.x5', area: 'maths', name: '5 times table', pre: ['m.x10'] },
  { id: 'm.sub20', area: 'maths', name: 'Taking away within 20', pre: ['m.add20'] },
  { id: 'm.x3', area: 'maths', name: '3 times table', pre: ['m.x2'] },
  { id: 'm.x4', area: 'maths', name: '4 times table', pre: ['m.x2'] },
  { id: 'm.double', area: 'maths', name: 'Doubles and halves', pre: ['m.x2', 'm.add20'] },
  { id: 'm.x8', area: 'maths', name: '8 times table', pre: ['m.x4'] },
  { id: 'm.bonds100', area: 'maths', name: 'Number bonds to 100', pre: ['m.bonds10', 'm.x10'] },
  { id: 'm.x6', area: 'maths', name: '6 times table', pre: ['m.x3'] },
  { id: 'm.x9', area: 'maths', name: '9 times table', pre: ['m.x10', 'm.x3'] },
  { id: 'm.x11', area: 'maths', name: '11 times table', pre: ['m.x10'] },
  { id: 'm.x7', area: 'maths', name: '7 times table', pre: ['m.x5', 'm.x2'] },
  { id: 'm.x12', area: 'maths', name: '12 times table', pre: ['m.x10', 'm.x6'] },

  // ---- Verbal reasoning (Code Vault) ----
  { id: 'v.alphaNext', area: 'verbal', name: 'Alphabet order', pre: [] },
  { id: 'v.alphaJump', area: 'verbal', name: 'Jumping along the alphabet', pre: ['v.alphaNext'] },
  { id: 'v.alphaPos', area: 'verbal', name: 'Letter positions (E5 J10 O15 T20 Y25)', pre: ['v.alphaNext'] },
  { id: 'v.code1', area: 'verbal', name: 'Letter codes (+1 / -1)', pre: ['v.alphaJump'] },
  { id: 'v.series', area: 'verbal', name: 'Letter series', pre: ['v.alphaJump'] },
  { id: 'v.codeN', area: 'verbal', name: 'Letter codes (bigger jumps)', pre: ['v.code1'] },
  { id: 'v.decode', area: 'verbal', name: 'Cracking a code backwards', pre: ['v.code1'] },
  { id: 'v.pairs', area: 'verbal', name: 'Letter pair series', pre: ['v.series'] },
  { id: 'v.mirror', area: 'verbal', name: 'Mirror codes (A↔Z)', pre: ['v.codeN', 'v.alphaPos'] },

  // ---- Spatial reasoning (Build Lab) ----
  { id: 's.count1', area: 'spatial', name: 'Counting blocks', pre: [] },
  { id: 's.rotY', area: 'spatial', name: 'Same build, turned round', pre: [] },
  { id: 's.top', area: 'spatial', name: 'Bird’s-eye view', pre: ['s.count1'] },
  { id: 's.count2', area: 'spatial', name: 'Counting hidden blocks', pre: ['s.count1'] },
  { id: 's.rot3', area: 'spatial', name: 'Same build, any turn', pre: ['s.rotY'] },
  { id: 's.count3', area: 'spatial', name: 'Counting tall builds', pre: ['s.count2'] },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const skillsInArea = (area) => SKILLS.filter((s) => s.area === area);
