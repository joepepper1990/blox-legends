import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS, makeBody, stepBody, FixedClock, jumpEnvelope } from '../src/engine/physics.js';

const floorTo = (zEnd) => [{ active: true, box: { min: { x: -50, y: -1, z: -1e6 }, max: { x: 50, y: 0, z: zEnd } } }];

// Run a scripted 3-second run-and-jump at a given display frame rate.
function play(fps) {
  const clock = new FixedClock();
  const body = makeBody(0, 0, 0, 0);
  const colliders = floorTo(4);
  let time = 0;
  let stepIndex = 0;
  const frame = 1 / fps;
  while (time < 3 - 1e-9) {
    const { steps } = clock.advance(frame);
    for (let i = 0; i < steps; i++) {
      // jump exactly at physics step 30, whatever the frame rate
      const jumpNow = stepIndex === 30;
      stepBody(body, { x: 0, z: 1 }, () => jumpNow, colliders);
      stepIndex++;
    }
    time += frame;
  }
  return { body, stepIndex };
}

const direct = (steps) => {
  const b = makeBody(0, 0, 0, 0);
  for (let i = 0; i < steps; i++) stepBody(b, { x: 0, z: 1 }, () => i === 30, floorTo(4));
  return b;
};

test('physics is identical at 30, 60, 120 and 144 fps', () => {
  const ref = play(60);
  assert.deepEqual(ref.body.pos, direct(ref.stepIndex).pos);
  for (const fps of [30, 120, 144]) {
    const r = play(fps);
    // Whatever the frame rate, the body follows exactly the same 60 Hz steps.
    assert.deepEqual(r.body.pos, direct(r.stepIndex).pos, `${fps} fps matches pure 60 Hz stepping`);
    assert.ok(Math.abs(r.stepIndex - ref.stepIndex) <= 1, `${fps} fps step count ${r.stepIndex} vs ${ref.stepIndex}`);
    if (r.stepIndex === ref.stepIndex) assert.deepEqual(r.body.pos, ref.body.pos);
  }
});

test('fixed clock gives the same step count regardless of frame size', () => {
  for (const fps of [24, 30, 60, 90, 120, 144]) {
    const c = new FixedClock();
    let steps = 0;
    for (let i = 0; i < fps * 10; i++) steps += c.advance(1 / fps).steps;
    assert.ok(Math.abs(steps - 600) <= 1, `${fps} fps → ${steps} steps in 10 s`);
  }
});

test('slow frames never spiral: backlog is capped', () => {
  const c = new FixedClock();
  const { steps } = c.advance(5); // a 5-second hitch
  assert.ok(steps <= 8);
  assert.equal(c.advance(0).steps, 0);
});

test('jump envelope is fixed (used to validate level gaps)', () => {
  const e = jumpEnvelope();
  // v²/2g = 12.6² / 64 ≈ 2.48 units high; ≈ 6.7 units across at full run speed.
  assert.ok(e.height > 2.3 && e.height < 2.6, `height ${e.height}`);
  assert.ok(e.distance > 6.2 && e.distance < 7.2, `distance ${e.distance}`);
});

test('landing on a platform stops the fall and reports it once', () => {
  const body = makeBody(0, 5, 0);
  let landings = 0;
  for (let i = 0; i < 120; i++) {
    const ev = stepBody(body, { x: 0, z: 0 }, () => false, floorTo(10));
    if (ev.landed) landings++;
  }
  assert.equal(body.pos.y, 0);
  assert.equal(body.onGround, true);
  assert.equal(landings, 1);
});

test('low ledges are stepped up, walls block', () => {
  const ledge = { active: true, box: { min: { x: -5, y: 0, z: -3 }, max: { x: 5, y: 0.3, z: -2 } } };
  const wall = { active: true, box: { min: { x: -5, y: 0, z: -8 }, max: { x: 5, y: 3, z: -7 } } };
  const body = makeBody(0, 0, 0);
  body.onGround = true;
  for (let i = 0; i < 180; i++) stepBody(body, { x: 0, z: -1 }, () => false, [...floorTo(10), ledge, wall]);
  assert.ok(body.pos.z > -7, 'wall stops the player');
  assert.ok(body.pos.z < -2, 'ledge was climbed');
  assert.equal(PHYS.STEP, 1 / 60);
});
