// Juicy feedback: confetti bursts, rising "+5" text, glass shards, trails.
import * as THREE from 'three';
import { labelSprite } from './textures.js';

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.sprites = [];
    this.mats = new Map();
  }

  mat(color, opacity = 1) {
    const k = `${color}:${opacity}`;
    if (!this.mats.has(k))
      this.mats.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    return this.mats.get(k);
  }

  spawn(pos, color, { size = 0.22, vel, life = 1.1, gravity = 18, spin = 8 } = {}) {
    if (this.parts.length > 400) return;
    const m = new THREE.Mesh(cubeGeo, this.mat(color));
    m.position.copy(pos);
    m.scale.setScalar(size);
    this.scene.add(m);
    this.parts.push({ m, vel, life, max: life, gravity, spin, size });
  }

  burst(pos, colors = [0xffc531, 0x2fbf71, 0x2f7cf6, 0xe8423f, 0x8a4fff], n = 28, power = 9) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 0.5 + Math.random();
      const v = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).multiplyScalar(power * (0.4 + Math.random() * 0.6));
      this.spawn(pos, colors[i % colors.length], { vel: v, size: 0.16 + Math.random() * 0.16 });
    }
  }

  coins(pos, n = 8) {
    this.burst(pos, [0xffc531, 0xffe066, 0xc98a00], n, 7);
  }

  shatter(mesh, color = 0x9cdcff) {
    const p = new THREE.Vector3();
    mesh.getWorldPosition(p);
    const sx = mesh.geometry.parameters?.width ?? 2;
    const sz = mesh.geometry.parameters?.depth ?? 2;
    for (let i = 0; i < 26; i++) {
      const q = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * sx, 0, (Math.random() - 0.5) * sz));
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
      this.spawn(q, color, { vel: v, size: 0.25 + Math.random() * 0.35, life: 1.4, gravity: 22 });
    }
  }

  trail(pos, colors) {
    const q = pos.clone();
    q.x += (Math.random() - 0.5) * 0.5;
    q.z += (Math.random() - 0.5) * 0.5;
    q.y += 0.3 + Math.random() * 0.6;
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8, (Math.random() - 0.5) * 0.6);
    this.spawn(q, colors[Math.floor(Math.random() * colors.length)], { vel: v, size: 0.18, life: 0.7, gravity: 0, spin: 3 });
  }

  text(pos, str, color = '#ffc531') {
    const s = labelSprite(str, 0.9, { bg: null, fg: color, size: 90, border: null, depthTest: false, renderOrder: 5 });
    s.position.copy(pos);
    this.scene.add(s);
    this.sprites.push({ s, life: 1.2, max: 1.2 });
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.parts.splice(i, 1);
        continue;
      }
      if (p.vel) {
        p.vel.y -= p.gravity * dt;
        p.m.position.addScaledVector(p.vel, dt);
      }
      p.m.rotation.x += p.spin * dt;
      p.m.rotation.y += p.spin * 0.7 * dt;
      p.m.scale.setScalar(p.size * Math.min(1, (p.life / p.max) * 2));
    }
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.s);
        s.s.material.map.dispose();
        s.s.material.dispose();
        this.sprites.splice(i, 1);
        continue;
      }
      s.s.position.y += dt * 1.6;
      s.s.material.opacity = Math.min(1, (s.life / s.max) * 2);
    }
  }

  clear() {
    for (const p of this.parts) this.scene.remove(p.m);
    for (const s of this.sprites) this.scene.remove(s.s);
    this.parts = [];
    this.sprites = [];
  }
}
