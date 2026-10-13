// Level validation: the Glass Bridge can be crossed with base movement only,
// at any frame rate, with a 15% safety margin on every jump (plan §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS, makeBody, stepBody, FixedClock, jumpEnvelope } from '../src/engine/physics.js';
import { OBBY, rowZ, finishZ, panelX } from '../src/worlds/obby-layout.js';
import { MECHANICS } from '../src/mechanics/caps.js';

const boxAt = (cx, top, cz, w, h, d) => ({
  active: true,
  box: { min: { x: cx - w / 2, y: top - h, z: cz - d / 2 }, max: { x: cx + w / 2, y: top, z: cz + d / 2 } },
});

// Build the course with `n` panels per row; `pick(i)` is the right panel in row i.
function course(n, pick) {
  const start = boxAt(0, 0, OBBY.START_Z, OBBY.PAD.w, OBBY.PAD.h, OBBY.PAD.d);
  const finish = boxAt(0, 0, finishZ(), OBBY.PAD.w, OBBY.PAD.h, OBBY.PAD.d);
  const colliders = [start, finish];
  const path = [start];
  for (let i = 0; i < OBBY.ROWS; i++) {
    for (let k = 0; k < n; k++) {
      const c = boxAt(panelX(n, k), 0, rowZ(i), OBBY.PANEL, 0.3, OBBY.PANEL);
      colliders.push(c);
      if (k === pick(i)) path.push(c);
    }
  }
  path.push(finish);
  return { colliders, path };
}

const centre = (c) => ({ x: (c.box.min.x + c.box.max.x) / 2, z: (c.box.min.z + c.box.max.z) / 2 });
const inside = (c, x, z, pad = 0) =>
  x > c.box.min.x + pad && x < c.box.max.x - pad && z > c.box.min.z + pad && z < c.box.max.z - pad;

// A simple player: after landing, step to the middle of the glass to line up,
// then run at the next glass and jump at the edge. Input is read once per
// rendered frame, like the real game.
function cross({ colliders, path }, fps) {
  const body = makeBody(...OBBY.SPAWN);
  const clock = new FixedClock();
  let target = 1;
  let linedUp = true; // the spawn point is already a good run-up
  let jumpQueued = false;
  const takeJump = () => (jumpQueued ? ((jumpQueued = false), true) : false);
  const landings = [];
  const arrivals = []; // seconds at which each glass on the path is reached
  for (let frame = 0; frame < fps * 120; frame++) {
    const support = body.onGround ? body.ground : null;
    if (support && !linedUp) {
      const mid = centre(support);
      if (Math.hypot(mid.x - body.pos.x, mid.z - body.pos.z) < 0.3) linedUp = true;
    }
    const goal = linedUp ? centre(path[target]) : centre(support || path[target - 1]);
    const dx = goal.x - body.pos.x;
    const dz = goal.z - body.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const wish = { x: dx / len, z: dz / len };
    if (support && linedUp && support !== path[target]) {
      // Jump just before the edge: look one frame ahead.
      const ahead = (PHYS.SPEED / fps) * 1.5;
      if (!inside(support, body.pos.x + wish.x * ahead, body.pos.z + wish.z * ahead)) jumpQueued = true;
    }
    const { steps } = clock.advance(1 / fps);
    for (let s = 0; s < steps; s++) {
      const r = stepBody(body, wish, takeJump, colliders);
      if (r.landed) {
        landings.push(body.ground);
        if (body.ground === path[target]) {
          target += 1;
          linedUp = false;
          arrivals.push(frame / fps);
        }
        else if (body.ground !== path[target - 1]) return { ok: false, why: `landed on the wrong glass before target ${target}` };
        if (target === path.length) return { ok: true, seconds: frame / fps, landings, arrivals };
      }
      if (body.pos.y < OBBY.KILL_Y) return { ok: false, why: `fell before target ${target}` };
    }
  }
  return { ok: false, why: `timed out at target ${target}` };
}

const ROUTES = {
  'straight, 2 panels': [2, () => 0],
  'zig-zag, 2 panels': [2, (i) => i % 2],
  'straight, 3 panels (middle)': [3, () => 1],
  'zig-zag, 3 panels (far left ↔ far right)': [3, (i) => (i % 2 ? 2 : 0)],
};

for (const fps of [30, 60, 120]) {
  for (const [name, [n, pick]] of Object.entries(ROUTES)) {
    test(`Glass Bridge can be crossed at ${fps} fps: ${name}`, () => {
      const r = cross(course(n, pick), fps);
      assert.ok(r.ok, r.why);
    });
  }
}

// Air time needed when aiming from the middle of one glass at the middle of
// the next: the open gap along that line, less the player's footprint (you
// stand on an edge until your whole width is off it, and land as soon as
// any of it is over the next one).
function aimGap(a, b) {
  const p = centre(a);
  const q = centre(b);
  const d = { x: q.x - p.x, z: q.z - p.z };
  const len = Math.hypot(d.x, d.z);
  const slab = (c, axis) => {
    const lo = (c.box.min[axis] - p[axis]) / d[axis];
    const hi = (c.box.max[axis] - p[axis]) / d[axis];
    return d[axis] === 0 ? [-Infinity, Infinity] : [Math.min(lo, hi), Math.max(lo, hi)];
  };
  const leaveA = Math.min(slab(a, 'x')[1], slab(a, 'z')[1]);
  const enterB = Math.max(slab(b, 'x')[0], slab(b, 'z')[0]);
  return Math.max(0, (enterB - leaveA) * len - 2 * PHYS.R);
}

test('every Glass Bridge jump fits inside the jump range with a 15% margin', () => {
  const reach = jumpEnvelope().distance / 1.15;
  const gap = aimGap;
  let worst = 0;
  for (const n of [2, 3]) {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        const { path } = course(n, (i) => (i % 2 ? b : a));
        for (let i = 1; i < path.length; i++) worst = Math.max(worst, gap(path[i - 1], path[i]));
      }
    }
  }
  assert.ok(worst <= reach, `widest gap ${worst.toFixed(2)} > safe reach ${reach.toFixed(2)}`);
});

// Rapid guesses on the Glass Bridge (plan §8.1): reaching the next glass takes
// time, so an answer only counts as a rapid guess if it came faster than the
// quickest possible move. The allowance must never be longer than that move.
test('the Glass Bridge move allowance is no longer than the quickest row-to-row move', () => {
  let quickest = Infinity;
  for (const fps of [30, 60, 120])
    for (const [n, pick] of Object.values(ROUTES)) {
      const r = cross(course(n, pick), fps);
      for (let i = 2; i < r.arrivals.length - 1; i++) quickest = Math.min(quickest, r.arrivals[i] - r.arrivals[i - 1]);
    }
  const allowance = MECHANICS['choice-path'].moveAllowanceMs / 1000;
  assert.ok(allowance <= quickest, `allowance ${allowance}s > quickest move ${quickest.toFixed(2)}s`);
  assert.ok(allowance >= quickest * 0.6, `allowance ${allowance}s is far below the quickest move ${quickest.toFixed(2)}s`);
});
