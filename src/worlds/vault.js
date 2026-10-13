// CODE VAULT (verbal reasoning: alphabet, letter codes, letter series)
// A corridor of stone doors. Each door has a code puzzle carved on it; step on
// the rune tile with the right answer and the door rumbles open. The alphabet
// strip is always on screen — just like the one printed on real test papers.
import * as THREE from 'three';
import { World } from './base.js';
import { platform, box, material } from '../engine/blocks.js';
import { runeDoorTexture, labelSprite } from '../engine/textures.js';
import { answerPad, chest } from './decor.js';

const DOORS = 5;
const DOOR_GAP = 13;
const FIRST_DOOR = -10;
const PAD_COLORS = [0x2f7cf6, 0xa15cff, 0xff8c42, 0x22b0a8];

export class Vault extends World {
  enter() {
    const g = this.game;
    g.setSky('#2a2350', '#ff9e6b', '#c98a8a', 40, 160);
    this.camDist = 9.5;
    this.startPitch = 0.26; // lower view keeps the carved puzzle on the door visible
    this.killY = -20;
    this.spawn.set(0, 0.2, 3);
    // Room behind the spawn point so the camera has space.
    const startZ = 16;
    const length = DOORS * DOOR_GAP + 32;
    const midZ = startZ - length / 2;
    platform(this, 11, 1, length, 0x6b6f80, 0, 0, midZ);
    for (const x of [-6, 6]) {
      const wall = box(1, 8, length, 0x575b6e);
      wall.position.set(x, 4, midZ);
      this.root.add(wall);
      this.addCollider(wall);
    }
    const back = box(11, 8, 1, 0x575b6e);
    back.position.set(0, 4, startZ + 0.5);
    this.root.add(back);
    this.addCollider(back);

    // torches
    this.flames = [];
    for (let z = startZ - 4; z > startZ - length + 4; z -= 8)
      for (const x of [-5.3, 5.3]) {
        const holder = box(0.3, 0.8, 0.3, 0x3a2a1a, { cast: false });
        holder.position.set(x, 3.6, z);
        const flame = box(0.35, 0.45, 0.35, 0xffb21f, { emissive: 0xff7a00, cast: false, plain: true });
        flame.position.set(x, 4.2, z);
        this.root.add(holder, flame);
        this.flames.push(flame);
      }

    this.doors = [];
    for (let i = 0; i < DOORS; i++) {
      const z = FIRST_DOOR - i * DOOR_GAP;
      // Plain box UVs here so the puzzle picture fills the door face once.
      const stone = material(0x4a4f63, { plain: true });
      const doorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 1), [stone, stone, stone, stone, doorMat, stone]);
      mesh.position.set(0, 4, z);
      mesh.castShadow = mesh.receiveShadow = true;
      this.root.add(mesh);
      const collider = this.addCollider(mesh);
      const num = labelSprite(`DOOR ${i + 1}`, 0.8, { size: 56, bg: '#1d2340', fg: '#5ff2ff', border: '#5ff2ff' });
      num.position.set(0, 8.7, z);
      this.root.add(num);
      this.doors.push({ z, mesh, doorMat, collider, q: null, pads: [], opening: 0, open: false, first: true });
    }

    const endZ = FIRST_DOOR - (DOORS - 1) * DOOR_GAP - 8;
    this.treasure = chest(this.root, 0, 0, endZ);
    for (let i = 0; i < 12; i++) {
      const gem = box(0.5, 0.5, 0.5, [0x5ff2ff, 0xff5a8a, 0xffc531][i % 3], { emissive: 0x222222 });
      gem.position.set((Math.random() - 0.5) * 7, 0.25, endZ - 1 + (Math.random() - 0.5) * 4);
      gem.rotation.y = Math.random() * 3;
      this.root.add(gem);
    }
    this.addTrigger([0, 1.2, endZ, 3.4, 2.4, 3], () => this.finish());

    this.current = 0;
    this.right = 0;
    this.done = false;
    this.startTime = performance.now();
    // Doors show coded lines today; more kinds arrive with the shared mechanic.
    this.startRun('vault', 'logic-lock', {
      count: (band) => (band <= 2 ? 3 : 4),
      canShow: ({ display, q }) => display.some((k) => k === 'lines' || k === 'text') && (!q || !!q.door),
    });
    this.setupDoor(0);

    g.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z, Math.PI);
    g.ui.banner('CODE VAULT', 'Crack the codes!');
    this.later(900, () =>
      g.ui.say('Read the code on the door, then step on the tile with the answer. Use the alphabet strip at the top to help!'),
    );
  }

  setupDoor(i) {
    const g = this.game;
    const door = this.doors[i];
    if (!door) return;
    door.q = this.nextQuestion();
    door.first = true;
    door.doorMat.map?.dispose();
    door.doorMat.map = runeDoorTexture(door.q.door);
    door.doorMat.needsUpdate = true;
    const n = door.q.options.length;
    const spacing = n === 3 ? 3.2 : 2.5;
    const padZ = door.z + 4.2;
    door.pads = door.q.options.map((opt, k) => {
      const pad = answerPad(this, (k - (n - 1) / 2) * spacing, 0, padZ, opt.label, {
        w: n === 3 ? 2.6 : 2.1,
        d: 2.4,
        color: PAD_COLORS[k],
        labelH: opt.label.length > 3 ? 0.95 : 1.1,
        labelY: 1.7,
      });
      pad.onStep = () => this.choose(door, k);
      this.tappable(pad.group, () => this.choose(door, k));
      return pad;
    });
    this.showQuestion(door);
  }

  showQuestion(door) {
    const g = this.game;
    const q = door.q;
    const band = this.bandOf(q.skill);
    const isPos = q.skill === 'v.alphaPos';
    g.ui.showAlpha(true, { numbers: !isPos && band <= 2, anchors: isPos || band <= 4 });
    this.present(q, `Door ${this.current + 1} of ${DOORS}`);
  }

  choose(door, k) {
    if (this.done || door.open || this.doors[this.current] !== door) return;
    const pad = door.pads[k];
    if (pad.state !== 'idle') return;
    const g = this.game;
    const q = door.q;
    const at = pad.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const r = this.answerQ(q, k, { firstTry: door.first, at });
    if (!r) return;
    if (r.correct) {
      if (door.first) this.right += 1;
      pad.setState('right');
      door.pads.forEach((p) => p !== pad && p.setState('off'));
      door.open = true;
      door.collider.active = false;
      g.audio.door();
      g.ui.hideBolt();
      this.current += 1;
      if (this.current < DOORS) this.later(700, () => this.setupDoor(this.current));
      else {
        g.ui.question('Grab the treasure!', 'You cracked every code! Grab the treasure!');
        g.ui.showAlpha(false);
      }
    } else {
      door.first = false;
      pad.setState('wrong');
      g.ui.say(this.lesson(q, r));
      if (q.hint.strip) g.ui.flashCells(q.hint.strip);
    }
  }

  // Stable hook for automated tests: answer the current door without walking.
  get test() {
    return {
      state: () => {
        const door = this.doors[this.current];
        return { current: this.current, total: this.doors.length, hasQ: !!door?.q && !door.open, done: this.done };
      },
      answer: (correct = true, { think = 4000 } = {}) => {
        const door = this.doors[this.current];
        door.q.shownAt = performance.now() - think;
        const k = correct ? door.q.answerIndex : door.pads.findIndex((p, i) => i !== door.q.answerIndex && p.state === 'idle');
        this.choose(door, k);
      },
      finish: () => this.finish(),
    };
  }

  finish() {
    if (this.done || this.current < DOORS) return;
    this.done = true;
    const g = this.game;
    this.treasure.open();
    g.ui.question(null);
    g.finishRun('vault', { title: 'Vault cracked!', right: this.right, total: DOORS, timeMs: performance.now() - this.startTime });
  }

  update(dt, t) {
    for (const door of this.doors) {
      if (door.open && door.mesh.position.y < 12) {
        door.mesh.position.y = Math.min(12, door.mesh.position.y + dt * 9);
        door.mesh.position.x = Math.sin(t * 60) * 0.04;
      }
      for (const p of door.pads) p.update(dt);
    }
    for (const [i, f] of this.flames.entries()) f.scale.y = 1 + Math.sin(t * 9 + i) * 0.2;
    this.treasure.update(dt);
  }
}
