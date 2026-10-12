// Freddie's blocky avatar and the character controller (run, jump, collide).
import * as THREE from 'three';
import { faceTexture, labelSprite, setSpriteText } from './textures.js';
import { ITEM } from '../catalog.js';

const SKIN = 0xf1c27d;
const PANTS = 0x2b3550;

export const PLAYER_R = 0.42;
export const PLAYER_H = 2.6;
const SPEED = 8.5;
const JUMP_V = 12.6;
const GRAVITY = 32;
const STEP = 0.45;
const COYOTE = 0.12;

function part(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.ground = null;
    this.sinceGround = 0;
    this.facing = Math.PI; // face away from camera (towards -z)
    this.walkPhase = 0;
    this.frozen = false;
    this.onLand = null;
    this.trailTimer = 0;

    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);

    this.skinMat = new THREE.MeshLambertMaterial({ color: SKIN });
    this.shirtMat = new THREE.MeshLambertMaterial({ color: 0x2f7cf6 });
    this.pantsMat = new THREE.MeshLambertMaterial({ color: PANTS });
    const faceMat = new THREE.MeshLambertMaterial({ color: SKIN, map: faceTexture() });

    const legGeo = [0.48, 0.95, 0.5];
    this.legL = new THREE.Group();
    this.legR = new THREE.Group();
    this.legL.position.set(-0.25, 0.95, 0);
    this.legR.position.set(0.25, 0.95, 0);
    const ll = part(...legGeo, this.pantsMat);
    const lr = part(...legGeo, this.pantsMat);
    ll.position.y = lr.position.y = -0.475;
    this.legL.add(ll);
    this.legR.add(lr);

    const torso = part(1.0, 0.95, 0.52, this.shirtMat);
    torso.position.y = 1.425;

    this.armL = new THREE.Group();
    this.armR = new THREE.Group();
    this.armL.position.set(-0.74, 1.85, 0);
    this.armR.position.set(0.74, 1.85, 0);
    const al = part(0.46, 0.95, 0.48, this.skinMat);
    const ar = part(0.46, 0.95, 0.48, this.skinMat);
    al.position.y = ar.position.y = -0.42;
    // sleeves
    const sl = part(0.5, 0.42, 0.52, this.shirtMat);
    const sr = part(0.5, 0.42, 0.52, this.shirtMat);
    sl.position.y = sr.position.y = -0.12;
    this.armL.add(al, sl);
    this.armR.add(ar, sr);

    this.head = new THREE.Group();
    this.head.position.y = 2.3;
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), [
      this.skinMat,
      this.skinMat,
      this.skinMat,
      this.skinMat,
      faceMat,
      this.skinMat,
    ]);
    headMesh.castShadow = true;
    this.head.add(headMesh);
    this.hat = new THREE.Group();
    this.hat.position.y = 0.41;
    this.head.add(this.hat);

    this.body.add(this.legL, this.legR, torso, this.armL, this.armR, this.head);

    this.nameTag = labelSprite('Player', 0.55, { size: 56, bg: 'rgba(29,35,64,0.7)', fg: '#ffffff', border: null, pad: 18 });
    this.nameTag.position.y = 3.35;
    this.group.add(this.nameTag);
  }

  setName(name) {
    setSpriteText(this.nameTag, name || 'Player', 0.55, { size: 56, bg: 'rgba(29,35,64,0.7)', fg: '#ffffff', border: null, pad: 18 });
  }

  setLook(look) {
    const shirt = ITEM[look.shirt] || ITEM['shirt-blue'];
    this.shirtMat.color.setHex(shirt.color);
    this.trail = ITEM[look.trail]?.colors || null;
    this.buildHat(look.hat);
  }

  buildHat(id) {
    while (this.hat.children.length) this.hat.remove(this.hat.children[0]);
    const add = (w, h, d, color, x, y, z, geo) => {
      const m = new THREE.Mesh(geo || new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.hat.add(m);
      return m;
    };
    switch (id) {
      case 'hat-cap':
        add(0.88, 0.22, 0.88, 0xe8423f, 0, 0.1, 0);
        add(0.8, 0.07, 0.4, 0xe8423f, 0, 0.0, 0.6);
        break;
      case 'hat-phones':
        add(0.95, 0.12, 0.2, 0x24262e, 0, 0.12, 0);
        add(0.16, 0.42, 0.42, 0x24262e, -0.5, -0.3, 0);
        add(0.16, 0.42, 0.42, 0x24262e, 0.5, -0.3, 0);
        add(0.05, 0.3, 0.3, 0x5ff2ff, -0.59, -0.3, 0);
        add(0.05, 0.3, 0.3, 0x5ff2ff, 0.59, -0.3, 0);
        break;
      case 'hat-wizard': {
        add(1.1, 0.08, 1.1, 0x5b3cc4, 0, 0.04, 0);
        const cone = add(0, 0, 0, 0x5b3cc4, 0, 0.55, 0, new THREE.ConeGeometry(0.45, 1.0, 4));
        cone.rotation.y = Math.PI / 4;
        add(0.12, 0.12, 0.05, 0xffc531, 0, 0.45, 0.33);
        break;
      }
      case 'hat-viking':
        add(0.9, 0.3, 0.9, 0x9aa3b5, 0, 0.12, 0);
        add(0.14, 0.4, 0.14, 0xfff1cc, -0.55, 0.3, 0).rotation.z = 0.5;
        add(0.14, 0.4, 0.14, 0xfff1cc, 0.55, 0.3, 0).rotation.z = -0.5;
        break;
      case 'hat-crown':
        add(0.9, 0.2, 0.9, 0xffc531, 0, 0.1, 0);
        for (const [x, z] of [
          [-0.35, -0.35],
          [0.35, -0.35],
          [-0.35, 0.35],
          [0.35, 0.35],
          [0, 0.4],
        ])
          add(0.16, 0.22, 0.16, 0xffc531, x, 0.3, z);
        add(0.12, 0.12, 0.05, 0xe8423f, 0, 0.12, 0.46);
        break;
      default:
        break;
    }
  }

  teleport(x, y, z, facing = Math.PI) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.facing = facing;
    this.onGround = false;
    this.sinceGround = 0;
    this.group.position.copy(this.pos);
  }

  box(out = new THREE.Box3()) {
    out.min.set(this.pos.x - PLAYER_R, this.pos.y, this.pos.z - PLAYER_R);
    out.max.set(this.pos.x + PLAYER_R, this.pos.y + PLAYER_H, this.pos.z + PLAYER_R);
    return out;
  }

  update(dt, { move, yaw, colliders }) {
    if (this.frozen) {
      this.animate(dt, 0);
      return;
    }
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let wx = rx * move.x + fx * move.y;
    let wz = rz * move.x + fz * move.y;
    const len = Math.hypot(wx, wz);
    if (len > 1) {
      wx /= len;
      wz /= len;
    }
    const accel = this.onGround ? 70 : 32;
    const approach = (v, target) => v + Math.max(-accel * dt, Math.min(accel * dt, target - v));
    this.vel.x = approach(this.vel.x, wx * SPEED);
    this.vel.z = approach(this.vel.z, wz * SPEED);
    if (len > 0.1) {
      const target = Math.atan2(wx, wz);
      let d = target - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(1, dt * 14);
    }

    this.sinceGround = this.onGround ? 0 : this.sinceGround + dt;
    // Jump presses are buffered briefly, and a jump just after running off an
    // edge still counts (coyote time) — both make jumping feel fair on a tablet.
    // Jump height is fixed, like Roblox, so a quick tap is a full jump.
    if (this.sinceGround < COYOTE && this.game.input.takeJump()) {
      this.vel.y = JUMP_V;
      this.onGround = false;
      this.sinceGround = 1;
      this.game.audio.jump();
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -45) this.vel.y = -45;

    const wasGround = this.onGround;
    const fallSpeed = this.vel.y;
    this.onGround = false;
    const steps = Math.ceil(dt / (1 / 90));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.pos.x += this.vel.x * h;
      this.collide(0, colliders);
      this.pos.z += this.vel.z * h;
      this.collide(2, colliders);
      this.pos.y += this.vel.y * h;
      this.collide(1, colliders);
    }
    if (this.onGround && !wasGround) {
      if (fallSpeed < -8) this.game.audio.land();
      this.onLand?.(this.ground);
    }

    this.group.position.copy(this.pos);
    this.body.rotation.y = this.facing;
    this.animate(dt, Math.hypot(this.vel.x, this.vel.z));

    if (this.trail && Math.hypot(this.vel.x, this.vel.z) > 2) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.05;
        this.game.fx.trail(this.pos, this.trail);
      }
    }
  }

  collide(axis, colliders) {
    const pmin = [this.pos.x - PLAYER_R, this.pos.y, this.pos.z - PLAYER_R];
    const pmax = [this.pos.x + PLAYER_R, this.pos.y + PLAYER_H, this.pos.z + PLAYER_R];
    const key = ['x', 'y', 'z'][axis];
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
          this.pos.y = b.max.y;
          if (this.vel.y < 0) this.vel.y = 0;
          this.onGround = true;
          this.ground = c;
        } else {
          this.pos.y = b.min.y - PLAYER_H;
          if (this.vel.y > 0) this.vel.y = 0;
        }
      } else {
        const rise = b.max.y - this.pos.y;
        if (rise > 0 && rise <= STEP && (this.sinceGround < 0.1 || this.onGround)) {
          this.pos.y = b.max.y + 0.001;
          continue;
        }
        const minA = axis === 0 ? b.min.x : b.min.z;
        const maxA = axis === 0 ? b.max.x : b.max.z;
        const pos = pmax[axis] - minA;
        const neg = maxA - pmin[axis];
        if (pos < neg) this.pos[key] -= pos + 1e-4;
        else this.pos[key] += neg + 1e-4;
        this.vel[key] = 0;
      }
      pmin[axis] = (axis === 1 ? this.pos.y : this.pos[key] - PLAYER_R);
      pmax[axis] = (axis === 1 ? this.pos.y + PLAYER_H : this.pos[key] + PLAYER_R);
    }
  }

  animate(dt, speed) {
    const moving = speed > 0.5 && this.onGround;
    this.walkPhase += dt * (moving ? speed * 1.5 : 0);
    const swing = moving ? Math.sin(this.walkPhase) * 0.8 : 0;
    const k = Math.min(1, dt * 12);
    const lerp = (obj, target) => (obj.rotation.x += (target - obj.rotation.x) * k);
    if (!this.onGround && !this.frozen) {
      lerp(this.armL, -2.6);
      lerp(this.armR, -2.6);
      lerp(this.legL, 0.4);
      lerp(this.legR, -0.3);
    } else {
      lerp(this.armL, swing);
      lerp(this.armR, -swing);
      lerp(this.legL, -swing);
      lerp(this.legR, swing);
    }
  }
}
