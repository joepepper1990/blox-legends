// The game shell: renderer, camera, the services every world uses, rewards,
// daily play-time limit, and switching between worlds.
import * as THREE from 'three';
import { UI, el } from './engine/ui.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { Speech } from './engine/speech.js';
import { FX } from './engine/fx.js';
import { Player } from './engine/player.js';
import { Bolt } from './engine/bolt.js';
import { gradientTexture } from './engine/textures.js';
import { Save, levelInfo, today } from './save.js';
import { Mastery } from './learning/index.js';
import { openShop } from './shop.js';
import { openParent } from './parent.js';
import { Hub } from './worlds/hub.js';
import { Obby } from './worlds/obby.js';
import { Vault } from './worlds/vault.js';
import { Lab } from './worlds/lab.js';

const WORLDS = { hub: Hub, obby: Obby, vault: Vault, lab: Lab };

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.save = new Save();
    this.mastery = new Mastery(this.save.data.learn);
    this.audio = new Audio();
    this.speech = new Speech();
    this.speech.enabled = this.save.data.settings.readAloud;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.hemi = new THREE.HemisphereLight(0xdcefff, 0x6b8f5a, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -28;
    sc.right = sc.top = 28;
    sc.near = 1;
    sc.far = 160;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.ui = new UI(uiRoot, this);
    this.input = new Input(canvas, uiRoot);
    this.fx = new FX(this.scene);
    this.player = new Player(this);
    this.bolt = new Bolt();
    this.scene.add(this.player.group, this.bolt.group);
    this.player.setLook(this.save.data.look);
    this.player.setName(this.save.data.name);

    this.camYaw = 0;
    this.camPitch = 0.42;
    this.camDist = 11;
    this.camOverride = null;
    this.raycaster = new THREE.Raycaster();

    this.world = null;
    this.worldName = '';
    this.started = false;
    this.last = performance.now();
    this.elapsed = 0;
    this.saveTimer = 0;

    this.ui.homeBtn.addEventListener('click', () => {
      this.audio.click();
      this.go('hub');
    });
    this.ui.shopBtn.addEventListener('click', () => {
      this.audio.click();
      openShop(this);
    });
    this.ui.gearBtn.addEventListener('click', () => {
      this.audio.click();
      openParent(this);
    });

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save.write();
        this.speech.stop();
      }
      this.last = performance.now();
    });
    window.addEventListener('pagehide', () => this.save.write());
    this.resize();
    this.refreshHud();
    window.__game = this; // handy for testing in a browser console

    this.go('hub', { intro: true });
    this.renderer.setAnimationLoop(() => this.frame());
    this.titleScreen();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.2 ? 72 : 60;
    this.camera.updateProjectionMatrix();
  }

  setSky(top, bottom, fog = bottom, near = 60, far = 220) {
    this.scene.background?.dispose?.();
    this.scene.background = gradientTexture(top, bottom);
    this.scene.fog = new THREE.Fog(fog, near, far);
  }

  go(name, params = {}) {
    if (this.world) {
      this.world.exit();
      this.scene.remove(this.world.root);
    }
    this.fx.clear();
    this.ui.question(null);
    this.ui.showAlpha(false);
    this.ui.hideBolt();
    this.ui.setTimer(null);
    this.camOverride = null;
    this.player.frozen = false;
    this.player.onLand = null;
    this.speech.stop();
    this.worldName = name;
    this.world = new WORLDS[name](this);
    this.scene.add(this.world.root);
    this.world.enter(params);
    this.camYaw = this.world.startYaw ?? 0;
    this.camPitch = this.world.startPitch ?? 0.42;
    this.camDist = this.world.camDist ?? 11;
    this.snapCamera();
    this.bolt.place(this.player.pos);
    this.ui.setMode({ home: name !== 'hub', shop: name === 'hub' });
  }

  snapCamera() {
    const target = this.player.pos.clone().add(new THREE.Vector3(0, 2, 0));
    this.camera.position.set(
      target.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      target.y + Math.sin(this.camPitch) * this.camDist,
      target.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
    );
    this.camera.lookAt(target);
  }

  frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    const t = this.elapsed;
    const { move, look, taps } = this.input.sample();
    const playing = this.started && !this.ui.hasOverlay();

    this.camYaw -= look.dx * 0.0065;
    this.camPitch = Math.max(0.08, Math.min(1.25, this.camPitch + look.dy * 0.0045));

    if (this.world) {
      this.player.update(dt, {
        move: playing ? move : { x: 0, y: 0 },
        yaw: this.camYaw,
        colliders: this.world.colliders,
      });
      if (this.player.pos.y < this.world.killY) this.world.onFall();
      this.checkTriggers();
      if (playing) for (const tap of taps) this.handleTap(tap);
      this.world.update(dt, t);
    }

    // camera
    const target = this.player.pos.clone().add(new THREE.Vector3(0, 2, 0));
    let desired;
    let lookAt = target;
    if (this.camOverride) {
      desired = this.camOverride.pos;
      lookAt = this.camOverride.look;
    } else {
      const dir = new THREE.Vector3(
        Math.sin(this.camYaw) * Math.cos(this.camPitch),
        Math.sin(this.camPitch),
        Math.cos(this.camYaw) * Math.cos(this.camPitch),
      );
      // Pull the camera in front of any wall between it and Freddie.
      const dist = this.cameraRoom(target, dir);
      desired = target.clone().addScaledVector(dir, dist);
      this.camBlocked = dist < this.camDist - 0.1;
    }
    const camSpeed = this.camOverride ? 4 : this.camBlocked ? 30 : 14;
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * camSpeed));
    this.camLook = (this.camLook || lookAt.clone()).lerp(lookAt, 1 - Math.exp(-dt * (this.camOverride ? 4 : 20)));
    this.camera.lookAt(this.camLook);

    this.sun.position.set(this.player.pos.x + 25, this.player.pos.y + 45, this.player.pos.z + 18);
    this.sun.target.position.copy(this.player.pos);

    this.bolt.update(dt, this.player, this.camera);
    this.fx.update(dt);

    if (playing && !document.hidden) this.tickTime(dt);
    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      if (this.save.dirty) this.save.write();
    }
    this.renderer.render(this.scene, this.camera);
  }

  cameraRoom(target, dir) {
    let dist = this.camDist;
    if (!this.world) return dist;
    const ray = (this._ray ||= new THREE.Ray());
    const hit = (this._hit ||= new THREE.Vector3());
    ray.set(target, dir);
    for (const c of this.world.colliders) {
      if (!c.active || c.box.containsPoint(target)) continue;
      if (ray.intersectBox(c.box, hit)) dist = Math.min(dist, hit.distanceTo(target));
    }
    return Math.max(2, dist - 0.4);
  }

  checkTriggers() {
    const pb = this.player.box();
    for (const tr of this.world.triggers) {
      if (!tr.active) continue;
      const inside = pb.intersectsBox(tr.box);
      if (inside && !tr.inside) tr.onEnter?.();
      else if (!inside && tr.inside) tr.onExit?.();
      tr.inside = inside;
    }
  }

  handleTap({ x, y }) {
    if (!this.world.tappables.length) return;
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.world.tappables, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.onTap) o = o.parent;
      if (o) {
        o.userData.onTap();
        return;
      }
    }
  }

  // ---------- time limit ----------
  tickTime(dt) {
    const d = this.save.data;
    this.save.rollDay();
    d.day.ms += dt * 1000;
    d.totals.ms += dt * 1000;
    this.save.dirty = true;
  }

  minutesLeft() {
    const d = this.save.data;
    if (!d.settings.dailyMin) return Infinity;
    return d.settings.dailyMin + d.day.bonusMin - d.day.ms / 60000;
  }

  timeUp() {
    return this.minutesLeft() <= 0;
  }

  // ---------- rewards & learning ----------
  refreshHud() {
    const d = this.save.data;
    this.ui.setCoins(d.coins);
    const li = levelInfo(d.xp);
    this.ui.setLevel(li.level, li.frac);
    this.ui.setStars(d.day.stars);
  }

  award(coins, xp, at) {
    const d = this.save.data;
    const before = levelInfo(d.xp).level;
    d.coins += coins;
    d.xp += xp;
    this.save.dirty = true;
    this.ui.setCoins(d.coins, coins);
    const li = levelInfo(d.xp);
    this.ui.setLevel(li.level, li.frac);
    if (coins > 0) this.audio.coin();
    if (at && coins > 0) {
      this.fx.coins(at);
      this.fx.text(at.clone().add(new THREE.Vector3(0, 1.5, 0)), `+${coins}`);
    }
    if (li.level > before) {
      setTimeout(() => {
        this.audio.levelUp();
        this.ui.banner('LEVEL UP!', `Level ${li.level}`);
        this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 2, 0)), undefined, 50, 12);
      }, 400);
    }
  }

  // Record an answer. Only the first try at a question counts towards mastery.
  answer(q, correct, ms, firstTry, at) {
    const d = this.save.data;
    this.save.rollDay();
    if (firstTry) {
      this.mastery.record(q.skill, correct, ms);
      d.day.answered += 1;
      d.totals.answered += 1;
      if (correct) {
        d.day.correct += 1;
        d.totals.correct += 1;
      }
    }
    this.save.dirty = true;
    if (correct) {
      this.audio.correct();
      this.bolt.cheer();
      this.award(firstTry ? 5 : 1, firstTry ? 10 : 3, at);
    } else {
      this.audio.wrong();
    }
  }

  // End of a run: daily star, bonus coins, personal best, results panel.
  finishRun(key, { title, right, total, timeMs }) {
    const d = this.save.data;
    this.save.rollDay();
    d.totals.runs += 1;
    const firstStar = !d.day.stars[key];
    d.day.stars[key] = true;
    let bonus = 20 + right * 2;
    if (firstStar) bonus += 30;
    let best = false;
    if (timeMs) {
      const prev = d.best[key];
      if (!prev || timeMs < prev) {
        best = !!prev; // only call it a "new best" once there's something to beat
        d.best[key] = timeMs;
      }
    }
    this.award(bonus, 30);
    this.refreshHud();
    this.save.write();
    this.audio.fanfare();
    this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 2, 0)), undefined, 60, 12);
    const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    const allStars = Object.values(d.day.stars).every(Boolean);
    setTimeout(() => {
      this.ui.overlay(
        (p, close) => {
          p.classList.add('results');
          p.innerHTML = `
            <h2></h2>
            <div class="stat"><span>Right first time</span><b>${right} / ${total}</b></div>
            ${timeMs ? `<div class="stat"><span>Time</span><b>${fmt(timeMs)}${best ? ' — new best!' : ''}</b></div>` : ''}
            <div class="stat"><span>Bonus coins</span><b>+${bonus}</b></div>
            ${firstStar ? '<div class="stat"><span>Daily star</span><b>★ earned!</b></div>' : ''}
            ${allStars && !d.day.chest ? '<p><b>All 3 stars today!</b> The golden chest in the hub is open.</p>' : ''}
            <div class="row center"></div>`;
          p.querySelector('h2').textContent = title;
          const again = el('button', 'btn green', 'Play again');
          const hub = el('button', 'btn', 'Back to hub');
          again.onclick = () => {
            close();
            this.go(key);
          };
          hub.onclick = () => {
            close();
            this.go('hub');
          };
          if (this.timeUp()) again.disabled = true;
          p.querySelector('.row').append(again, hub);
        },
        {},
      );
      this.speech.speak(`${title}! You got ${right} out of ${total} right first time.`);
    }, 900);
  }

  // ---------- title screen ----------
  titleScreen() {
    const d = this.save.data;
    this.ui.overlay(
      (p, close, o) => {
        o.classList.add('title-screen');
        p.style.background = 'transparent';
        p.style.border = 'none';
        p.style.boxShadow = 'none';
        p.innerHTML = `<div class="center-col">
            <div class="logo">BLOX <span>LEGENDS</span></div>
            <div class="tagline">Obbys · Code Vaults · Build Lab</div>
            <div class="name-row" style="width:min(420px,90%);margin-bottom:18px"></div>
          </div>`;
        const col = p.querySelector('.center-col');
        let input = null;
        if (!d.name) {
          const wrap = p.querySelector('.name-row');
          wrap.innerHTML =
            '<div style="background:var(--paper);border:4px solid var(--ink);border-radius:18px;padding:14px 16px"><label style="font-weight:700;font-size:20px">Player name</label></div>';
          input = el('input');
          input.type = 'text';
          input.maxLength = 16;
          input.placeholder = 'Type a name';
          input.autocomplete = 'off';
          Object.assign(input.style, {
            font: 'inherit',
            fontSize: '28px',
            width: '100%',
            padding: '8px 12px',
            border: '3px solid var(--ink)',
            borderRadius: '12px',
            marginTop: '6px',
          });
          wrap.firstChild.append(input);
        }
        const play = el('button', 'btn play-btn', 'PLAY');
        col.append(play);
        const start = () => {
          if (input) {
            const name = input.value.trim().slice(0, 16);
            if (!name) {
              input.focus();
              return;
            }
            d.name = name;
            this.player.setName(name);
            this.save.write();
          }
          this.audio.unlock();
          this.speech.unlock();
          this.audio.click();
          close();
          this.started = true;
          this.last = performance.now();
          this.world.onStart?.();
        };
        play.addEventListener('click', start);
        input?.addEventListener('keydown', (e) => e.key === 'Enter' && start());
      },
      {},
    );
  }

  todayKey() {
    return today();
  }
}
