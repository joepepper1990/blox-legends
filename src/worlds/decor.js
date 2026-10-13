// Reusable scenery and interactive pieces.
import * as THREE from 'three';
import { box, platform, material } from '../engine/blocks.js';
import { labelSprite, setSpriteText, swirlTexture, glowTexture } from '../engine/textures.js';
import { fitLabelHeight } from '../engine/fit.js';

// Pad labels are drawn like this; validate-content checks answers fit.
export const PAD_LABEL = { size: 80, letterSpacing: 8 };

export function island(world, x, top, z, w, d, { grass = 0x5cc35a, dirt = 0x8a5a36, depth = 4 } = {}) {
  const g = platform(world, w, 1, d, grass, x, top, z);
  const under = box(w - 0.6, depth, d - 0.6, dirt);
  under.position.set(x, top - 1 - depth / 2, z);
  world.root.add(under);
  const under2 = box(w - 3, 2, d - 3, dirt);
  under2.position.set(x, top - 1 - depth - 1, z);
  world.root.add(under2);
  return g;
}

export function tree(root, x, y, z, s = 1) {
  const trunk = box(0.8 * s, 3 * s, 0.8 * s, 0x7a4b2a);
  trunk.position.set(x, y + 1.5 * s, z);
  const leaves = box(3.2 * s, 2.6 * s, 3.2 * s, 0x3fa34d);
  leaves.position.set(x, y + 3.8 * s, z);
  const top = box(2 * s, 1.2 * s, 2 * s, 0x4fbf5c);
  top.position.set(x, y + 5.6 * s, z);
  root.add(trunk, leaves, top);
}

export function cloud(root, x, y, z, s = 1) {
  const g = new THREE.Group();
  const white = material(0xffffff, { plain: true });
  for (const [dx, dy, dz, w, h, d] of [
    [0, 0, 0, 6, 1.6, 3.4],
    [1.5, 0.9, 0.2, 3.4, 1.4, 2.6],
    [-2, 0.5, -0.3, 2.6, 1.2, 2.4],
  ]) {
    const m = box(w * s, h * s, d * s, 0xffffff, { material: white, cast: false, receive: false });
    m.position.set(dx * s, dy * s, dz * s);
    g.add(m);
  }
  g.position.set(x, y, z);
  root.add(g);
  return g;
}

export function flower(root, x, y, z, color) {
  const stem = box(0.12, 0.5, 0.12, 0x2f8f3a, { cast: false });
  stem.position.set(x, y + 0.25, z);
  const head = box(0.36, 0.3, 0.36, color, { cast: false });
  head.position.set(x, y + 0.6, z);
  root.add(stem, head);
}

// A glowing portal with a sign. Walk into it to travel.
export function portal(world, { x, z, y = 0, rotY = 0, color, title, sub }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const frameColor = 0x2b3550;
  const post = (px) => {
    const m = box(1, 6, 1, frameColor);
    m.position.set(px, 3, 0);
    g.add(m);
  };
  post(-2.6);
  post(2.6);
  const top = box(6.2, 1, 1.2, frameColor);
  top.position.set(0, 6.5, 0);
  g.add(top);
  const base = box(6.6, 0.4, 2.4, color);
  base.position.set(0, 0.2, 0);
  g.add(base);
  const tex = swirlTexture(`#${color.toString(16).padStart(6, '0')}`);
  const surf = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 5.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  surf.position.set(0, 3.2, 0);
  g.add(surf);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(`#${color.toString(16).padStart(6, '0')}`), transparent: true, opacity: 0.6, depthWrite: false }),
  );
  glow.scale.set(9, 9, 1);
  glow.position.set(0, 3.2, -0.2);
  g.add(glow);
  const sign = labelSprite(sub ? [title, sub] : title, sub ? 2.2 : 1.3, { size: 64, lineGap: 1.15 });
  sign.position.set(0, 8.6, 0);
  g.add(sign);
  const star = labelSprite('★', 1.1, { bg: null, border: null, fg: '#ffc531', size: 100 });
  star.position.set(0, 10.4, 0);
  star.visible = false;
  g.add(star);
  world.root.add(g);
  // posts are solid
  world.root.updateMatrixWorld(true);
  for (const child of g.children.filter((c) => c.geometry?.parameters?.height === 6)) world.addCollider(child);
  return {
    group: g,
    surf,
    glow,
    sign,
    star,
    tex,
    setClosed(closed) {
      surf.material.opacity = closed ? 0.25 : 0.85;
      glow.visible = !closed;
    },
    update(dt) {
      tex.offset.x += dt * 0.15;
      tex.rotation += dt * 0.3;
      tex.center.set(0.5, 0.5);
      glow.material.opacity = 0.45 + Math.sin(performance.now() / 300) * 0.15;
    },
  };
}

export function chest(root, x, y, z, { gold = false } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const wood = gold ? 0xffc531 : 0x9a5b2e;
  const trim = gold ? 0xfff1cc : 0xffc531;
  const base = box(2.2, 1.2, 1.5, wood);
  base.position.y = 0.6;
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.2, -0.75);
  const lid = box(2.2, 0.6, 1.5, wood);
  lid.position.set(0, 0.3, 0.75);
  lidPivot.add(lid);
  const band = box(0.3, 1.25, 1.55, trim);
  band.position.y = 0.6;
  const lock = box(0.4, 0.45, 0.2, trim);
  lock.position.set(0, 1.1, 0.8);
  g.add(base, lidPivot, band, lock);
  root.add(g);
  let opening = 0;
  return {
    group: g,
    opened: false,
    open() {
      this.opened = true;
      opening = 1;
    },
    update(dt) {
      if (opening > 0) {
        lidPivot.rotation.x = Math.max(-1.9, lidPivot.rotation.x - dt * 5);
      }
    },
  };
}

// A floor pad you answer by stepping on (or tapping). Label floats above.
export function answerPad(world, x, y, z, label, { w = 2, d = 2, color = 0x2f7cf6, labelH = 1.1, labelY = 1.5, grid } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat);
  mesh.position.y = 0.1;
  mesh.receiveShadow = true;
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.2, 0.12, d + 0.2),
    new THREE.MeshLambertMaterial({ color: 0x1d2340 }),
  );
  rim.position.y = 0.04;
  g.add(rim, mesh);
  let sprite = null;
  if (label !== null && label !== undefined) {
    // Long answers shrink to stay over their own pad.
    sprite = labelSprite(String(label), fitLabelHeight(String(label), labelH, w * 1.12, PAD_LABEL), PAD_LABEL);
    sprite.position.y = labelY;
    g.add(sprite);
  }
  world.root.add(g);
  const pad = {
    group: g,
    mesh,
    sprite,
    state: 'idle',
    baseColor: color,
    bob: Math.random() * 6,
    setLabel(text) {
      setSpriteText(sprite, String(text), labelH, { size: 80, letterSpacing: 8 });
    },
    setState(s) {
      pad.state = s;
      const c = s === 'right' ? 0x22b06a : s === 'wrong' ? 0xf0644f : s === 'off' ? 0x8a8fa8 : color;
      mat.color.setHex(c);
      mat.emissive.setHex(c);
      mat.emissiveIntensity = s === 'right' ? 0.6 : 0.25;
      if (sprite) sprite.material.opacity = s === 'wrong' || s === 'off' ? 0.35 : 1;
    },
    update(dt) {
      pad.bob += dt * 2;
      if (sprite && pad.state === 'idle') sprite.position.y = labelY + Math.sin(pad.bob) * 0.08;
      if (pad.state === 'wrong') g.position.y += (y - 0.15 - g.position.y) * Math.min(1, dt * 6);
    },
  };
  pad.trigger = world.addTrigger([x, y + 0.6, z, w * 0.9, 1.2, d * 0.9], () => pad.onStep?.());
  return pad;
}

// Spinning coin you can collect.
export function floatingCoin(world, x, y, z, onGet) {
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc531, emissive: 0x8a5d00, emissiveIntensity: 0.4 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 20), coinMat);
  m.rotation.x = Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  g.position.set(x, y, z);
  world.root.add(g);
  const c = { group: g, taken: false, t: Math.random() * 6 };
  c.trigger = world.addTrigger([x, y, z, 1.4, 2.4, 1.4], () => {
    if (c.taken) return;
    c.taken = true;
    g.visible = false;
    onGet?.(g.position.clone());
  });
  c.update = (dt) => {
    c.t += dt;
    g.rotation.y += dt * 3;
    g.position.y = y + Math.sin(c.t * 2) * 0.2;
  };
  return c;
}
