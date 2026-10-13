// BUILD LAB (spatial reasoning: counting cubes, rotations, views from above)
// Builds float on pedestals. Step on the pad in front of your answer.
// Wrong answers trigger a visual lesson: the build turns to match, splits into
// layers to count, or the camera flies overhead to show the bird's-eye view.
import * as THREE from 'three';
import { World } from './base.js';
import { platform, box, cubeBuild, rotationQuaternion, disposeTree } from '../engine/blocks.js';
import { labelSprite, gridTexture } from '../engine/textures.js';
import { stemTexture, optionTexture } from '../mechanics/board-three.js';
import { pictureOptions } from '../mechanics/board.js';
import { answerPad } from './decor.js';

const PUZZLES = 5;
const PAD_COLORS = [0x2f7cf6, 0xa15cff, 0xff8c42, 0x22b0a8];

export class Lab extends World {
  enter() {
    const g = this.game;
    g.setSky('#7fd0ff', '#fdf6ff', '#eef6ff', 60, 220);
    this.camDist = 12;
    this.startPitch = 0.24; // low and level, so the builds at the back stay in view
    this.killY = -20;
    this.spawn.set(0, 0.2, 6);

    platform(this, 30, 1, 30, 0xe9f1ff, 0, 0, -2);
    // blue trim and lab details
    for (const [x, z, w, d] of [
      [0, 13.2, 30.4, 0.6],
      [0, -17.2, 30.4, 0.6],
      [-15.2, -2, 0.6, 30.4],
      [15.2, -2, 0.6, 30.4],
    ]) {
      const t = box(w, 0.4, d, 0x2f7cf6);
      t.position.set(x, 0.2, z);
      this.root.add(t);
    }
    for (const x of [-13, 13]) {
      const tower = box(2, 7, 2, 0xcfdcf5);
      tower.position.set(x, 3.5, -15);
      const light = box(1.4, 0.6, 1.4, 0x5ff2ff, { emissive: 0x2aa6b8, plain: true });
      light.position.set(x, 7.3, -15);
      this.root.add(tower, light);
      this.addCollider(tower);
    }
    const sign = labelSprite(['BUILD LAB', 'Look closely!'], 2, { size: 64 });
    sign.position.set(0, 9.5, -16);
    this.root.add(sign);

    this.index = 0;
    this.right = 0;
    this.done = false;
    this.puzzle = null;
    this.startTime = performance.now();
    // Pattern Plates (mechanics/caps.js): builds in 3D, anything else on the
    // board at the back, picture answers above their plates.
    this.startRun('lab', 'pattern-plates', { count: (band) => (band <= 2 ? 3 : 4) });

    g.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z, Math.PI);
    g.ui.banner('BUILD LAB', 'Use your eyes and brain!');
    this.later(900, () => g.ui.say('Look at the big build. Then step on the pad in front of your answer. You can walk around to look!'));
    this.newPuzzle();
  }

  clearPuzzle() {
    const pz = this.puzzle;
    if (!pz) return;
    for (const p of pz.pads) this.removeTrigger(p.trigger);
    this.tappables = this.tappables.filter((o) => !pz.tapObjs.includes(o));
    this.root.remove(pz.root);
    for (const p of pz.pads) {
      this.root.remove(p.group);
      disposeTree(p.group);
    }
    disposeTree(pz.root);
    this.puzzle = null;
  }

  newPuzzle(given = null) {
    const g = this.game;
    this.clearPuzzle();
    const q = given || this.nextQuestion();
    const root = new THREE.Group();
    this.root.add(root);
    const pz = { q, root, pads: [], tapObjs: [], builds: [], first: true, wobble: this.bandOf(q.skill) <= 3 };
    this.puzzle = pz;
    const n = q.options.length;

    const pedestal = (x, z, top, w = 3.2) => {
      const m = box(w, top, w, 0xcfdcf5);
      m.position.set(x, top / 2, z);
      root.add(m);
      const rim = box(w + 0.3, 0.25, w + 0.3, 0x2f7cf6, { cast: false });
      rim.position.set(x, top, z);
      root.add(rim);
      return m;
    };

    const addPads = (z, spacing, opts = {}) =>
      q.options.forEach((opt, k) => {
        const x = (k - (n - 1) / 2) * spacing;
        const pad = answerPad(this, x, 0, z, opt.label, { w: 2.6, d: 2.4, color: PAD_COLORS[k], ...opts });
        pad.onStep = () => this.choose(k);
        this.tappable(pad.group, () => this.choose(k));
        pz.tapObjs.push(pad.group);
        pz.pads.push(pad);
      });

    if (q.kind === 'complete') {
      // blocks inside a see-through frame: how many more fill it?
      const S = 1.0;
      const b = cubeBuild(q.target, 0xff8c42, S);
      const { w, d, h } = q.frame;
      const centre = b.userData.centre;
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w * S, h * S, d * S)),
        new THREE.LineBasicMaterial({ color: 0x2f7cf6 }),
      );
      frame.position.set(((w - 1) / 2 - centre[0]) * S, ((h - 1) / 2 - centre[1]) * S, ((d - 1) / 2 - centre[2]) * S);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w * S, h * S, d * S),
        new THREE.MeshLambertMaterial({ color: 0x9fd7ff, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      glass.position.copy(frame.position);
      b.add(frame, glass);
      // turned a little so the front, side and top can all be seen
      pedestal(0, -6.5, 2, 3.4);
      b.rotation.y = 0.55;
      b.position.set(0, 2 + 0.1 + (centre[1] + 0.5) * S, -6.5);
      root.add(b);
      pz.target = b;
      pz.builds.push(b);
      addPads(-0.8, 3.4);
    } else if (q.kind === 'count') {
      pedestal(0, -6, 1.2, 5);
      const b = cubeBuild(q.target, 0xff8c42, 1.15);
      const h = Math.max(...q.target.map((c) => c[1])) + 1;
      b.position.set(0, 1.35 + (h * 1.15) / 2, -6);
      root.add(b);
      pz.target = b;
      pz.builds.push(b);
      const spacing = 3.4;
      q.options.forEach((opt, k) => {
        const pad = answerPad(this, (k - (n - 1) / 2) * spacing, 0, -0.8, opt.label, { w: 2.6, d: 2.4, color: PAD_COLORS[k] });
        pad.onStep = () => this.choose(k);
        this.tappable(pad.group, () => this.choose(k));
        pz.tapObjs.push(pad.group);
        pz.pads.push(pad);
      });
    } else if (q.kind !== 'rotate' && q.kind !== 'top') {
      // everything else is shown on the board at the back
      const tex = stemTexture(q, { w: 1024, h: 512 });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: tex }));
      const pics = pictureOptions(q);
      board.position.set(0, pics ? 6.2 : 5.2, -11);
      const legs = [-4.5, 4.5].map((x) => {
        const leg = box(0.4, board.position.y - 2.7, 0.4, 0x5b6478);
        leg.position.set(x, (board.position.y - 2.7) / 2, -11.1);
        return leg;
      });
      root.add(board, ...legs);
      pz.board = board;
      if (pictureOptions(q)) {
        const spacing = n === 3 ? 5 : 4.3;
        q.options.forEach((opt, k) => {
          const x = (k - (n - 1) / 2) * spacing;
          const card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ map: optionTexture(q, opt), transparent: true }));
          card.position.set(x, 2.0, -5);
          const stand = box(0.3, 0.8, 0.3, 0x5b6478);
          stand.position.set(x, 0.4, -5);
          root.add(card, stand);
          this.tappable(card, () => this.choose(k));
          pz.tapObjs.push(card);
        });
        addPads(-1.6, spacing, { w: 2.4, d: 2.2, labelH: 0.9, labelY: 1.3 });
      } else addPads(-0.8, n === 3 ? 3.6 : 3.1, { w: n === 3 ? 3 : 2.6 });
    } else {
      // target, raised up at the back
      pedestal(0, -11, 3.2, 4);
      const t = cubeBuild(q.target, 0xff8c42, 1.1);
      t.position.set(0, 3.2 + 2.2, -11);
      root.add(t);
      pz.target = t;
      pz.builds.push(t);
      const tl = labelSprite('THIS ONE', 0.8, { size: 56, bg: '#ff8c42', fg: '#fff' });
      tl.position.set(0, 8.3, -11);
      root.add(tl);
      pz.targetTag = tl;
      if (q.kind === 'top') {
        const arrow = labelSprite('▼ front', 0.7, { size: 52, bg: '#fff8e7' });
        arrow.position.set(0, 1.4, -8.6);
        root.add(arrow);
      }
      const spacing = n === 3 ? 5 : 4.3;
      q.options.forEach((opt, k) => {
        const x = (k - (n - 1) / 2) * spacing;
        if (q.kind === 'rotate') {
          pedestal(x, -5, 1.2, 2.8);
          const b = cubeBuild(opt.cubes, 0xff8c42, 0.62);
          b.quaternion.copy(rotationQuaternion(opt.rot));
          b.userData.baseQ = b.quaternion.clone();
          b.position.set(x, 1.2 + 1.5, -5);
          root.add(b);
          pz.builds.push(b);
          opt.build = b;
        } else {
          const stand = box(0.3, 1.6, 0.3, 0x5b6478);
          stand.position.set(x, 0.8, -5);
          const board = new THREE.Mesh(
            new THREE.PlaneGeometry(3.2, 3.2),
            new THREE.MeshBasicMaterial({ map: gridTexture(opt.grid, opt.label) }),
          );
          board.position.set(x, 3.2, -5);
          root.add(stand, board);
          opt.board = board;
        }
        const pad = answerPad(this, x, 0, -1.6, opt.label, { w: 2.4, d: 2.2, color: PAD_COLORS[k], labelH: 0.9, labelY: 1.3 });
        pad.onStep = () => this.choose(k);
        this.tappable(pad.group, () => this.choose(k));
        pz.tapObjs.push(pad.group);
        if (opt.build) {
          this.tappable(opt.build, () => this.choose(k));
          pz.tapObjs.push(opt.build);
        }
        if (opt.board) {
          this.tappable(opt.board, () => this.choose(k));
          pz.tapObjs.push(opt.board);
        }
        pz.pads.push(pad);
      });
    }
    this.present(q, `Puzzle ${this.index + 1} of ${PUZZLES}`);
  }

  choose(k) {
    const pz = this.puzzle;
    if (!pz || this.done || pz.solved) return;
    const pad = pz.pads[k];
    if (pad.state !== 'idle') return;
    const g = this.game;
    const q = pz.q;
    const at = pad.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const r = this.answerQ(q, k, { firstTry: pz.first, at });
    if (!r) return;
    if (r.correct) {
      if (pz.first) this.right += 1;
      pz.solved = true;
      pad.setState('right');
      pz.pads.forEach((p) => p !== pad && p.setState('off'));
      g.ui.hideBolt();
      this.index += 1;
      this.later(1300, () => {
        pz.vanish = 1;
      });
      this.later(1700, () => {
        if (this.index < PUZZLES) this.newPuzzle();
        else this.finish();
      });
    } else {
      pz.first = false;
      pad.setState('wrong');
      g.ui.say(this.lesson(q, r));
      this.teach(pz);
    }
  }

  // Visual lessons after a wrong answer.
  teach(pz) {
    const g = this.game;
    const q = pz.q;
    if (q.kind === 'rotate') {
      const opt = q.options[q.answerIndex];
      pz.align = { build: opt.build, t: 0 };
      pz.target.quaternion.identity();
      for (const o of q.options)
        if (o.why === 'mirror') {
          const tag = labelSprite('mirror image!', 0.6, { size: 48, bg: '#f0644f', fg: '#fff' });
          tag.position.copy(o.build.position).add(new THREE.Vector3(0, 1.9, 0));
          pz.root.add(tag);
        }
    } else if (q.kind === 'count') {
      pz.split = { t: 0, hold: 4.5 };
      const layers = q.hint.layers;
      layers.forEach((n, y) => {
        const s = labelSprite(String(n), 0.9, { size: 72, bg: '#2f7cf6', fg: '#fff' });
        s.userData.layer = y;
        s.visible = layers.length > 1;
        pz.root.add(s);
        (pz.layerTags ||= []).push(s);
      });
    } else if (q.kind === 'top') {
      const t = pz.target.position;
      g.camOverride = { pos: new THREE.Vector3(t.x, t.y + 11, t.z + 0.5), look: t.clone() };
      if (pz.targetTag) pz.targetTag.visible = false;
      this.later(3800, () => {
        g.camOverride = null;
        if (pz.targetTag) pz.targetTag.visible = true;
      });
    }
  }

  // Stable hook for automated tests: answer the current puzzle without walking.
  get test() {
    return {
      state: () => ({ current: this.index, total: PUZZLES, hasQ: !!this.puzzle && !this.puzzle.solved, done: this.done }),
      answer: (correct = true, { think = 4000 } = {}) => {
        const pz = this.puzzle;
        pz.q.shownAt = performance.now() - think;
        const k = correct ? pz.q.answerIndex : pz.pads.findIndex((p, i) => i !== pz.q.answerIndex && p.state === 'idle');
        this.choose(k);
      },
      finish: () => {}, // the lab finishes by itself after the last puzzle
      ask: (q) => this.newPuzzle(q),
      question: () => this.puzzle?.q,
    };
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const g = this.game;
    g.ui.question(null);
    g.finishRun('lab', { title: 'Lab complete!', right: this.right, total: PUZZLES, timeMs: performance.now() - this.startTime });
  }

  update(dt, t) {
    const pz = this.puzzle;
    if (!pz) return;
    for (const p of pz.pads) p.update(dt);
    // gentle wobble helps young eyes see depth; it stops at higher levels
    if (pz.wobble && !pz.align)
      pz.builds.forEach((b, i) => {
        const base = b.userData.baseQ;
        const wob = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(t * 0.8 + i) * 0.22);
        if (base) b.quaternion.copy(wob).multiply(base);
        else b.quaternion.copy(wob);
      });
    if (pz.align) {
      pz.align.t = Math.min(1, pz.align.t + dt / 1.8);
      const e = pz.align.t * pz.align.t * (3 - 2 * pz.align.t);
      pz.align.build.quaternion.copy(pz.align.build.userData.baseQ).slerp(new THREE.Quaternion(), e);
    }
    if (pz.split) {
      const s = pz.split;
      s.t += dt;
      const out = s.t < s.hold ? Math.min(1, s.t / 0.8) : Math.max(0, 1 - (s.t - s.hold) / 0.8);
      const inner = pz.target.userData.inner;
      for (const m of inner.children) {
        const y = m.userData.cube[1];
        m.position.y = (y - pz.target.userData.centre[1]) * 1.15 + y * out * 0.9;
      }
      for (const tag of pz.layerTags || []) {
        const y = tag.userData.layer;
        tag.position.set(pz.target.position.x - 3.2, pz.target.position.y + (y - pz.target.userData.centre[1]) * 1.15 + y * out * 0.9, pz.target.position.z);
        tag.material.opacity = out;
      }
      if (s.t > s.hold + 0.8) pz.split = null;
    }
    if (pz.vanish) {
      pz.vanish = Math.max(0.001, pz.vanish - dt * 3);
      for (const b of pz.builds) b.scale.setScalar(pz.vanish);
    }
  }

  exit() {
    this.game.camOverride = null;
    super.exit();
  }
}
