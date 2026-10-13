// Character physics, stepped at a fixed 60 Hz so jumps reach exactly the same
// height and distance on every iPad, whatever its frame rate. Pure: no three.js
// and no DOM, so it can be tested in node and used to validate level layouts.
//
// A body is { pos:{x,y,z}, vel:{x,y,z}, onGround, ground, sinceGround, facing }.
// Colliders are { active, box:{ min:{x,y,z}, max:{x,y,z} } } (a THREE.Box3 fits).

export const PHYS = Object.freeze({
  STEP: 1 / 60, // seconds per physics step
  R: 0.42, // player half-width
  H: 2.6, // player height
  SPEED: 8.5, // run speed (units/s)
  JUMP_V: 12.6, // take-off speed
  GRAVITY: 32,
  STEP_UP: 0.45, // ledges this low are walked up, not jumped
  COYOTE: 0.12, // a jump just after leaving an edge still counts
  MAX_FALL: 45,
  ACCEL_GROUND: 70,
  ACCEL_AIR: 32,
  SUBSTEPS: 2, // collision sub-steps per physics step (fast falls never tunnel)
});

export function makeBody(x = 0, y = 0, z = 0, facing = Math.PI) {
  return {
    pos: { x, y, z },
    vel: { x: 0, y: 0, z: 0 },
    onGround: false,
    ground: null,
    sinceGround: 0,
    facing,
  };
}

// One fixed step. `wish` is the desired move direction in world space
// (length ≤ 1). `takeJump()` is only asked when a jump is possible, so a
// buffered press survives until landing. Returns events for sound/gameplay.
export function stepBody(body, wish, takeJump, colliders, dt = PHYS.STEP) {
  const P = PHYS;
  let wx = wish.x;
  let wz = wish.z;
  const len = Math.hypot(wx, wz);
  if (len > 1) {
    wx /= len;
    wz /= len;
  }
  const accel = body.onGround ? P.ACCEL_GROUND : P.ACCEL_AIR;
  const approach = (v, target) => v + Math.max(-accel * dt, Math.min(accel * dt, target - v));
  body.vel.x = approach(body.vel.x, wx * P.SPEED);
  body.vel.z = approach(body.vel.z, wz * P.SPEED);
  if (len > 0.1) {
    let d = Math.atan2(wx, wz) - body.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    body.facing += d * Math.min(1, dt * 14);
  }

  let jumped = false;
  body.sinceGround = body.onGround ? 0 : body.sinceGround + dt;
  if (body.sinceGround < P.COYOTE && takeJump()) {
    body.vel.y = P.JUMP_V;
    body.onGround = false;
    body.sinceGround = 1;
    jumped = true;
  }
  body.vel.y = Math.max(-P.MAX_FALL, body.vel.y - P.GRAVITY * dt);

  const wasGround = body.onGround;
  const fallSpeed = body.vel.y;
  body.onGround = false;
  const h = dt / P.SUBSTEPS;
  for (let i = 0; i < P.SUBSTEPS; i++) {
    body.pos.x += body.vel.x * h;
    collide(body, 0, colliders);
    body.pos.z += body.vel.z * h;
    collide(body, 2, colliders);
    body.pos.y += body.vel.y * h;
    collide(body, 1, colliders);
  }
  return { jumped, landed: body.onGround && !wasGround, fallSpeed };
}

const AXES = ['x', 'y', 'z'];

function collide(body, axis, colliders) {
  const P = PHYS;
  const p = body.pos;
  const pmin = [p.x - P.R, p.y, p.z - P.R];
  const pmax = [p.x + P.R, p.y + P.H, p.z + P.R];
  const key = AXES[axis];
  for (const c of colliders) {
    if (!c.active) continue;
    const b = c.box;
    if (
      pmax[0] <= b.min.x || pmin[0] >= b.max.x ||
      pmax[1] <= b.min.y || pmin[1] >= b.max.y ||
      pmax[2] <= b.min.z || pmin[2] >= b.max.z
    )
      continue;
    if (axis === 1) {
      const up = b.max.y - pmin[1];
      const down = pmax[1] - b.min.y;
      if (up <= down) {
        p.y = b.max.y;
        if (body.vel.y < 0) body.vel.y = 0;
        body.onGround = true;
        body.ground = c;
      } else {
        p.y = b.min.y - P.H;
        if (body.vel.y > 0) body.vel.y = 0;
      }
    } else {
      const rise = b.max.y - p.y;
      if (rise > 0 && rise <= P.STEP_UP && (body.sinceGround < 0.1 || body.onGround)) {
        p.y = b.max.y + 0.001;
        continue;
      }
      const minA = axis === 0 ? b.min.x : b.min.z;
      const maxA = axis === 0 ? b.max.x : b.max.z;
      const push = pmax[axis] - minA;
      const pull = maxA - pmin[axis];
      if (push < pull) p[key] -= push + 1e-4;
      else p[key] += pull + 1e-4;
      body.vel[key] = 0;
    }
    pmin[axis] = axis === 1 ? p.y : p[key] - P.R;
    pmax[axis] = axis === 1 ? p.y + P.H : p[key] + P.R;
  }
}

// Fixed-step clock: feed it real frame times, it says how many physics steps
// to run and how far between the last two steps to draw (for smooth motion).
export class FixedClock {
  constructor(step = PHYS.STEP, maxSteps = 8) {
    this.step = step;
    this.maxSteps = maxSteps;
    this.acc = 0;
  }
  advance(frameDt) {
    this.acc += Math.min(Math.max(frameDt, 0), 0.25);
    let steps = Math.floor(this.acc / this.step);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.acc = 0; // drop the backlog rather than spiral
    } else {
      this.acc -= steps * this.step;
    }
    return { steps, alpha: this.acc / this.step };
  }
}

// The furthest a running jump can carry the player (used to validate levels).
export function jumpEnvelope() {
  const body = makeBody(0, 0, 0, 0);
  body.onGround = true;
  body.vel.z = PHYS.SPEED;
  const floor = [{ active: true, box: { min: { x: -50, y: -1, z: -1e6 }, max: { x: 50, y: 0, z: 0 } } }];
  let peak = 0;
  let jumpedOnce = false;
  for (let i = 0; i < 600; i++) {
    stepBody(body, { x: 0, z: 1 }, () => (jumpedOnce ? false : (jumpedOnce = true)), floor);
    peak = Math.max(peak, body.pos.y);
    if (body.pos.y < 0) break;
  }
  return { height: peak, distance: body.pos.z };
}
