// GLASS BRIDGE OBBY (maths fluency)
// Rows of glass panels over a cloud sea. Each row has a sum; only the panel
// with the right answer holds. A wrong panel smashes, Freddie drops onto a
// bouncy cloud, Bolt shows the method, and he tries that row again.
import * as THREE from 'three';
import { World } from './base.js';
import { platform, box } from '../engine/blocks.js';
import { labelSprite } from '../engine/textures.js';
import { fitLabelHeight } from '../engine/fit.js';
import { pictureOptions } from '../mechanics/board.js';
import { glassCard, questionPicture } from '../mechanics/choice-path.js';
import { chest, cloud } from './decor.js';
import { OBBY, rowZ, finishZ as finishZOf, panelX } from './obby-layout.js';

const { ROWS, ROW_GAP, FIRST_Z, PANEL, PAD } = OBBY;

export class Obby extends World {
  enter() {
    const g = this.game;
    g.setSky('#59b4ff', '#f2fbff', '#e6f6ff', 50, 200);
    this.camDist = 10.5;
    this.startPitch = 0.5;
    this.killY = OBBY.KILL_Y;
    this.spawn.set(...OBBY.SPAWN);

    platform(this, PAD.w, PAD.h, PAD.d, 0x8f9bb3, 0, 0, OBBY.START_Z);

    // steel beams either side, purely for looks
    const len = ROWS * ROW_GAP + 6;
    for (const x of [-5.6, 5.6]) {
      const beam = box(0.5, 0.5, len, 0x5b6478, { cast: false });
      beam.position.set(x, -0.6, FIRST_Z - len / 2 + 3);
      this.root.add(beam);
    }

    // a sea of clouds below to fall into
    for (let i = 0; i < 18; i++)
      cloud(this.root, (Math.random() - 0.5) * 40, -10 - Math.random() * 3, FIRST_Z + 6 - Math.random() * (len + 6), 1 + Math.random());

    this.rows = [];
    for (let i = 0; i < ROWS; i++) this.rows.push({ z: rowZ(i), panels: [], solved: false, q: null });

    const finishZ = finishZOf();
    platform(this, PAD.w, PAD.h, PAD.d, 0xffc531, 0, 0, finishZ);
    this.finishChest = chest(this.root, 0, 0, finishZ - 2);
    const finishSign = labelSprite('FINISH!', 1.5, { size: 72, bg: '#ffc531' });
    finishSign.position.set(0, 5, finishZ - 2);
    this.root.add(finishSign);
    this.addTrigger([0, 1.2, finishZ - 2, 3.4, 2.4, 3], () => this.finish());

    this.rowSign = labelSprite('?', 1.6, { size: 80 });
    this.rowSign.visible = false;
    this.root.add(this.rowSign);

    this.current = 0;
    this.right = 0;
    this.checkpoint = this.spawn.clone();
    this.started = false;
    this.done = false;
    this.startTime = 0;
    // Choice Path (mechanics/caps.js). Three glass panels: two-way guesses
    // are too lucky to count as evidence.
    this.startRun('obby', 'choice-path', { count: 3 });
    this.buildRow(0);
    this.buildRow(1);

    g.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z, Math.PI);
    g.player.onLand = (c) => this.landed(c);
    g.ui.banner('GLASS BRIDGE', 'Pick the right glass!');
    this.later(900, () =>
      this.intro('Jump onto the glass with the right answer. Wrong glass smashes — but don’t worry, the clouds will catch you!'));
    this.showQuestion();
  }

  buildRow(i) {
    if (i >= ROWS) return;
    const row = this.rows[i];
    if (row.q) return;
    row.q = this.nextQuestion();
    row.first = true;
    row.asked = 0;
    this.placePanels(row);
  }

  placePanels(row) {
    for (const p of row.panels) {
      this.root.remove(p.group);
      p.collider.active = false;
    }
    row.panels = [];
    const n = row.q.options.length;
    row.q.options.forEach((opt, k) => {
      const x = panelX(n, k);
      const group = new THREE.Group();
      group.position.set(x, 0, row.z);
      const mat = new THREE.MeshLambertMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.6,
        emissive: 0x2a6f9a,
        emissiveIntensity: 0.25,
      });
      const glass = new THREE.Mesh(new THREE.BoxGeometry(PANEL, 0.3, PANEL), mat);
      glass.position.y = -0.15;
      glass.receiveShadow = true;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(PANEL + 0.2, 0.18, PANEL + 0.2),
        new THREE.MeshLambertMaterial({ color: 0x5b6478 }),
      );
      frame.position.y = -0.35;
      let label;
      if (pictureOptions(row.q)) {
        label = glassCard(row.q, opt); // a picture answer stands over the glass
      } else {
        label = labelSprite(opt.label, fitLabelHeight(opt.label, 1.3, PANEL + 0.1, { size: 90 }), { size: 90 });
        label.position.y = 1.6;
      }
      label.visible = this.rows.indexOf(row) === this.current; // only the row being asked
      group.add(glass, frame, label);
      this.root.add(group);
      const collider = this.addCollider(glass);
      const panel = { group, glass, mat, label, collider, index: k, broken: false };
      collider.panel = panel;
      collider.row = row;
      row.panels.push(panel);
    });
  }

  showQuestion() {
    const g = this.game;
    const row = this.rows[this.current];
    if (!row) {
      g.ui.question(null);
      this.rowSign.visible = false;
      return;
    }
    // coded lines, a build or a pattern go in the question panel, where
    // nothing on the bridge can hide them
    const picture = questionPicture(row.q);
    this.present(row.q, `Row ${this.current + 1} of ${ROWS}`, { picture });
    this.rowSign.material.map.dispose();
    const s = labelSprite(picture ? 'Look at the picture ↑' : row.q.prompt, 1.6, { size: 80 });
    this.rowSign.material.map = s.material.map;
    this.rowSign.scale.copy(s.scale);
    this.rowSign.material.needsUpdate = true;
    this.rowSign.position.set(0, 5.2, row.z);
    this.rowSign.visible = true;
    for (const p of row.panels) p.label.visible = true;
  }

  landed(c) {
    if (!c || !c.panel || this.done) return;
    const row = c.row;
    const panel = c.panel;
    const idx = this.rows.indexOf(row);
    if (row.solved || idx !== this.current || panel.broken) return;
    if (!this.started) {
      this.started = true;
      this.startTime = performance.now();
    }
    const g = this.game;
    const at = panel.group.position.clone().add(new THREE.Vector3(0, 1, 0));
    const r = this.answerQ(row.q, panel.index, { firstTry: row.first, at });
    if (!r) return;
    if (r.correct) {
      if (row.first) this.right += 1;
      row.solved = true;
      panel.mat.color.setHex(0x8df0b4);
      panel.mat.emissive.setHex(0x22b06a);
      panel.mat.emissiveIntensity = 0.5;
      this.checkpoint.set(panel.group.position.x, 0.2, row.z);
      // the other panels fade away so the path is clear
      for (const p of row.panels)
        if (p !== panel) {
          p.collider.active = false;
          p.group.visible = false;
        }
      this.later(600, () => (panel.label.visible = false));
      this.current += 1;
      this.buildRow(this.current + 1);
      g.ui.hideBolt();
      this.showQuestion();
    } else {
      row.first = false;
      this.smash(panel, row, r);
    }
  }

  smash(panel, row, r) {
    const g = this.game;
    panel.broken = true;
    panel.mat.color.setHex(0xffb3a7);
    g.audio.smash();
    this.later(120, () => {
      panel.collider.active = false;
      panel.group.visible = false;
      g.fx.shatter(panel.glass);
    });
    // Teach: show the method and light up the right panel.
    const right = row.panels[row.q.answerIndex];
    right.mat.emissive.setHex(0x22b06a);
    right.mat.emissiveIntensity = 0.6;
    const lesson = this.lesson(row.q, r);
    g.ui.say(`${row.q.solved}. ${lesson}`, { speakText: `Oops! ${lesson}` });
  }

  onFall() {
    const g = this.game;
    g.player.teleport(this.checkpoint.x, this.checkpoint.y + 0.3, this.checkpoint.z, Math.PI);
    g.fx.burst(g.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), [0xffffff, 0xd4f0ff], 20, 6);
    // Rebuild the row: same question, glass back, answers swapped round.
    const row = this.rows[this.current];
    if (row && !row.solved && row.panels.some((p) => p.broken)) {
      row.q.options = shuffleKeep(row.q);
      this.placePanels(row);
      g.ui.question(row.q.prompt, this.spoken(row.q), `Row ${this.current + 1} of ${ROWS} — try again!`);
    }
  }

  // Stable hook for automated tests: answer the current row without walking.
  get test() {
    return {
      state: () => ({ current: this.current, total: ROWS, hasQ: !!this.rows[this.current]?.q, done: this.done }),
      answer: (correct = true, { think = 4000 } = {}) => {
        const row = this.rows[this.current];
        row.q.shownAt = performance.now() - think;
        const panel = row.panels.find((p) => !p.broken && (p.index === row.q.answerIndex) === correct);
        this.landed(panel.collider);
        if (!correct) this.later(200, () => this.onFall());
      },
      finish: () => this.finish(),
      ask: (q) => {
        const row = this.rows[this.current];
        row.q = q;
        row.first = true;
        this.placePanels(row);
        this.showQuestion();
      },
      question: () => this.rows[this.current]?.q,
    };
  }

  finish() {
    if (this.done) return;
    const g = this.game;
    if (this.current < ROWS) return;
    this.done = true;
    this.finishChest.open();
    g.ui.question(null);
    this.rowSign.visible = false;
    const timeMs = this.started ? performance.now() - this.startTime : 0;
    g.finishRun('obby', { title: 'Bridge crossed!', right: this.right, total: ROWS, timeMs });
  }

  update(dt) {
    this.finishChest.update(dt);
    if (this.started && !this.done) this.game.ui.setTimer(performance.now() - this.startTime);
    if (this.rowSign.visible) this.rowSign.position.y = 5.2 + Math.sin(performance.now() / 400) * 0.15;
  }
}

// Shuffle options but keep track of the answer.
function shuffleKeep(q) {
  const ans = q.options[q.answerIndex];
  const opts = q.options.slice();
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  q.answerIndex = opts.indexOf(ans);
  return opts;
}
