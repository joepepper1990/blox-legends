// Glass Bridge layout. Pure numbers, shared by the world (three.js) and the
// level test that proves the course can be crossed (tests/levels.test.js).
export const OBBY = Object.freeze({
  ROWS: 8,
  ROW_GAP: 6, // centre to centre, so 3 units of open air between rows
  FIRST_Z: -8,
  PANEL: 3, // glass panels are PANEL × PANEL, top at y = 0
  PAD: { w: 12, h: 1.4, d: 9 }, // start and finish platforms, top at y = 0
  START_Z: 0.5,
  SPAWN: [0, 0.2, 2],
  KILL_Y: -14,
});

export const rowZ = (i) => OBBY.FIRST_Z - i * OBBY.ROW_GAP;
export const finishZ = () => rowZ(OBBY.ROWS - 1) - 7.5;
export const panelX = (n, k) => (k - (n - 1) / 2) * (n === 2 ? 4.6 : 3.8);
