// The hub: a floating island with three portals, the shop and the daily chest.
import * as THREE from 'three';
import { World } from './base.js';
import { island, tree, cloud, flower, portal, chest, floatingCoin } from './decor.js';
import { box } from '../engine/blocks.js';
import { labelSprite } from '../engine/textures.js';
import { openShop } from '../shop.js';
import { openParent } from '../parent.js';
import { el } from '../engine/ui.js';

const PORTALS = [
  { key: 'obby', x: -13, z: -11, rotY: 0.4, color: 0x35b6ff, title: 'GLASS BRIDGE', sub: 'Obby' },
  { key: 'vault', x: 0, z: -15, rotY: 0, color: 0xa15cff, title: 'CODE VAULT', sub: 'Crack the codes' },
  { key: 'lab', x: 13, z: -11, rotY: -0.4, color: 0xff8c42, title: 'BUILD LAB', sub: 'Builds & views' },
];

const COIN_SPOTS = [
  [-6, 1.4, 4],
  [6, 1.4, 4],
  [-16, 1.4, -2],
  [16, 1.4, -2],
  [-9, 1.4, 14],
  [9, 1.4, 14],
  [0, 1.4, -6],
  [-18, 1.4, 12],
  [18, 1.4, 14],
  [3, 5.2, 18],
];

export class Hub extends World {
  enter({ intro } = {}) {
    const g = this.game;
    const d = g.save.data;
    g.setSky('#3d9bff', '#d4f0ff', '#d4f0ff', 70, 240);
    this.spawn.set(0, 0.2, 10);
    this.killY = -25;
    island(this, 0, 0, 0, 46, 42);

    // little floating islands for fun parkour
    island(this, 3, 3, 18, 4, 4, { depth: 2 });
    island(this, -4, 1.5, 24, 4, 4, { depth: 2 });
    island(this, 6, 4.8, 25, 4, 4, { depth: 2 });

    // scenery
    for (const [x, z, s] of [
      [-19, -17, 1.1],
      [19, -17, 1],
      [-20, 3, 0.9],
      [20, 1, 1.2],
      [-8, 17, 0.8],
      [12, 17, 0.9],
      [-3, -19, 0.8],
    ])
      tree(this.root, x, 0, z, s);
    const fc = [0xff5a8a, 0xffd23f, 0xffffff, 0xa15cff, 0xff8c42];
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 36;
      if (Math.abs(x) < 4 && z > 4) continue; // keep the spawn path clear
      flower(this.root, x, 0, z, fc[i % fc.length]);
    }
    this.clouds = [
      cloud(this.root, -30, 18, -30, 1.4),
      cloud(this.root, 25, 22, -40, 1.8),
      cloud(this.root, 40, 14, 10, 1.2),
      cloud(this.root, -45, 20, 20, 1.6),
    ];
    const spawnPad = box(4, 0.3, 4, 0xffffff);
    spawnPad.position.set(0, 0.15, 10);
    this.root.add(spawnPad);
    this.addCollider(spawnPad);

    // portals
    this.portals = PORTALS.map((p) => {
      const pt = portal(this, p);
      pt.star.visible = !!d.day.stars[p.key];
      const dir = new THREE.Vector3(Math.sin(p.rotY), 0, Math.cos(p.rotY));
      const c = new THREE.Vector3(p.x, 3, p.z).addScaledVector(dir, 0.2);
      this.addTrigger([c.x, c.y, c.z, 3.6, 6, 2.2], () => this.enterPortal(p));
      return pt;
    });

    // shop booth
    const shopG = new THREE.Group();
    shopG.position.set(15, 0, 8);
    shopG.rotation.y = -Math.PI / 2;
    const counter = box(5, 1.6, 1.6, 0x9a5b2e);
    counter.position.y = 0.8;
    shopG.add(counter);
    for (const x of [-2.3, 2.3]) {
      const post = box(0.4, 4.2, 0.4, 0xfff1cc);
      post.position.set(x, 2.1, -0.6);
      shopG.add(post);
    }
    for (let i = 0; i < 6; i++) {
      const stripe = box(0.9, 0.4, 2.4, i % 2 ? 0xffffff : 0xe8423f);
      stripe.position.set(-2.25 + i * 0.9, 4.4, -0.2);
      shopG.add(stripe);
    }
    const shopSign = labelSprite('SHOP', 1.2, { size: 72, bg: '#ffc531' });
    shopSign.position.set(0, 5.6, 0);
    shopG.add(shopSign);
    this.root.add(shopG);
    this.addCollider(counter);
    this.tappable(shopG, () => openShop(g));
    this.addTrigger([13.2, 1, 8, 1.6, 2, 5], () => openShop(g));

    // daily chest
    this.dailyChest = chest(this.root, -15, 0, 8, { gold: true });
    this.dailyChest.group.rotation.y = Math.PI / 2;
    if (d.day.chest) this.dailyChest.open();
    const chestSign = labelSprite(['DAILY CHEST', 'Get all 3 ★'], 1.9, { size: 56 });
    chestSign.position.set(-15, 3.8, 8);
    this.root.add(chestSign);
    this.addTrigger([-15, 1, 8, 3, 2, 3.4], () => this.tryChest());
    this.tappable(this.dailyChest.group, () => this.tryChest());

    // records board
    const best = d.best.obby ? `${(d.best.obby / 1000).toFixed(1)}s` : '—';
    const board = labelSprite([`${d.name || 'Player'}’s records`, `Glass Bridge best: ${best}`], 1.8, { size: 52 });
    board.position.set(-10, 3.2, 1);
    this.root.add(board);

    // collectable coins (once per day each)
    d.day.hubCoins ||= [];
    this.coins = COIN_SPOTS.map(([x, y, z], i) => {
      const c = floatingCoin(this, x, y, z, (at) => {
        d.day.hubCoins.push(i);
        g.award(1, 0, at);
      });
      if (d.day.hubCoins.includes(i)) {
        c.taken = true;
        c.group.visible = false;
      }
      return c;
    });

    g.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z, Math.PI);
    this.updatePortals();
    if (!intro) this.onStart();
  }

  onStart() {
    const g = this.game;
    const d = g.save.data;
    g.refreshHud();
    if (g.timeUp()) {
      this.later(400, () => this.timeUpPanel());
      return;
    }
    const name = d.name || 'Legend';
    const stars = Object.values(d.day.stars).filter(Boolean).length;
    const lines = [
      `Hi ${name}! I’m Bolt. Pick a portal: Glass Bridge, Code Vault or Build Lab!`,
      `Welcome back, ${name}! Get a star from each portal to open the golden chest.`,
      `Ready, ${name}? Jump through a portal to start!`,
    ];
    const line =
      stars === 3
        ? `You’ve got all 3 stars today, ${name}! Play any portal to earn more coins.`
        : d.totals.runs === 0
          ? lines[0]
          : lines[1 + Math.floor(Math.random() * 2)];
    this.later(700, () => g.ui.say(line));
  }

  updatePortals() {
    const closed = this.game.timeUp();
    for (const p of this.portals) p.setClosed(closed);
  }

  enterPortal(p) {
    const g = this.game;
    if (this.leaving) return;
    if (g.timeUp()) {
      g.ui.say('The portals are recharging! Come back tomorrow for more.');
      g.player.vel.set(0, 6, 10);
      return;
    }
    this.leaving = true;
    g.audio.whoosh();
    g.player.frozen = true;
    this.later(250, () => g.go(p.key));
  }

  tryChest() {
    const g = this.game;
    const d = g.save.data;
    if (d.day.chest) {
      g.ui.say('You already opened today’s chest. A new one appears tomorrow!');
      return;
    }
    const stars = Object.values(d.day.stars).filter(Boolean).length;
    if (stars < 3) {
      g.ui.say(`You need all 3 stars to open it. You have ${stars}. Each portal gives one star a day!`);
      return;
    }
    d.day.chest = true;
    this.dailyChest.open();
    g.audio.fanfare();
    g.award(100, 50, this.dailyChest.group.position.clone().add(new THREE.Vector3(0, 2, 0)));
    g.fx.burst(this.dailyChest.group.position.clone().add(new THREE.Vector3(0, 2, 0)), undefined, 70, 12);
    g.ui.banner('DAILY CHEST!', '+100 coins');
    g.save.write();
  }

  timeUpPanel() {
    const g = this.game;
    const d = g.save.data;
    const mins = Math.round(d.day.ms / 60000);
    g.ui.overlay((p, close) => {
      p.innerHTML = `<h2>Brilliant playing today! ★</h2>
        <p>The portals are recharging. Come back tomorrow for more!</p>
        <div class="stat" style="display:flex;justify-content:space-between"><span>Questions answered</span><b>${d.day.answered}</b></div>
        <div class="stat" style="display:flex;justify-content:space-between"><span>Right first time</span><b>${d.day.correct}</b></div>
        <div class="stat" style="display:flex;justify-content:space-between"><span>Minutes played</span><b>${mins}</b></div>
        <div class="row center"></div>`;
      const ok = el('button', 'btn green', 'OK');
      ok.onclick = close;
      const more = el('button', 'btn ghost small', 'Grown-up: more time');
      more.onclick = () => {
        close();
        openParent(g, { grant: true });
      };
      p.querySelector('.row').append(ok, more);
    });
    g.speech.speak('Brilliant playing today! The portals are recharging. Come back tomorrow for more!');
  }

  update(dt) {
    for (const p of this.portals) p.update(dt);
    for (const c of this.coins) c.update(dt);
    this.dailyChest.update(dt);
    for (const [i, c] of this.clouds.entries()) {
      c.position.x += dt * (0.6 + i * 0.2);
      if (c.position.x > 70) c.position.x = -70;
    }
    this.updatePortals();
  }
}
