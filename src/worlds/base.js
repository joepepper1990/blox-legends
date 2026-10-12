import * as THREE from 'three';
import { disposeTree } from '../engine/blocks.js';
import { makeQuestion } from '../learning/index.js';

// Shared plumbing for every world: colliders, triggers, tappable things,
// and asking the adaptive engine for the next question.
export class World {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.colliders = [];
    this.triggers = [];
    this.tappables = [];
    this.killY = -30;
    this.spawn = new THREE.Vector3(0, 0.5, 0);
    this.startYaw = 0;
    this.timers = [];
  }

  addCollider(mesh, opts = {}) {
    this.root.updateMatrixWorld(true);
    const c = { mesh, box: new THREE.Box3().setFromObject(mesh), active: true, ...opts };
    this.colliders.push(c);
    return c;
  }

  refresh(c) {
    c.mesh.updateMatrixWorld(true);
    c.box.setFromObject(c.mesh);
  }

  // Trigger volume. `box` is a Box3, or [cx, cy, cz, w, h, d].
  addTrigger(box, onEnter, onExit) {
    const b = Array.isArray(box)
      ? new THREE.Box3(
          new THREE.Vector3(box[0] - box[3] / 2, box[1] - box[4] / 2, box[2] - box[5] / 2),
          new THREE.Vector3(box[0] + box[3] / 2, box[1] + box[4] / 2, box[2] + box[5] / 2),
        )
      : box;
    // Start "inside" if the player is already standing there, so a pad that
    // appears under his feet doesn't fire until he steps off and on again.
    const t = { box: b, onEnter, onExit, active: true, inside: this.game.player.box().intersectsBox(b) };
    this.triggers.push(t);
    return t;
  }

  removeTrigger(t) {
    this.triggers = this.triggers.filter((x) => x !== t);
  }

  tappable(obj, fn) {
    obj.userData.onTap = fn;
    this.tappables.push(obj);
  }

  later(ms, fn) {
    const id = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== id);
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  }

  // Next question for this world's area at the child's current level.
  nextQuestion(area, countFor) {
    const m = this.game.mastery;
    const skill = m.pick(area);
    const lvl = m.level(skill);
    const count = countFor(lvl, skill);
    return makeQuestion(skill, lvl, count);
  }

  // The question read aloud, followed by the choices — so reading the labels
  // is never the barrier to answering.
  spoken(q) {
    if (q.kind === 'rotate' || q.kind === 'top') return q.speak;
    const opts = q.options.map((o) => o.speak);
    const multi = opts.some((o) => o.includes(','));
    const list = multi
      ? opts.map((o, i) => (i === opts.length - 1 ? `or, ${o}` : `${o}.`)).join(' ')
      : `${opts.slice(0, -1).join(', ')} or ${opts[opts.length - 1]}`;
    const ask = /[.?!]$/.test(q.speak) ? q.speak : `${q.speak}.`;
    return `${ask} ${multi ? 'Is it:' : 'Is it'} ${list}?`;
  }

  enter() {}
  update() {}
  onFall() {
    this.game.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z, this.spawnFacing ?? Math.PI);
  }
  exit() {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    disposeTree(this.root);
  }
}
