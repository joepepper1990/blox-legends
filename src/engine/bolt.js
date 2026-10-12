// Bolt, the little robot buddy who floats beside Freddie and gives hints.
import * as THREE from 'three';
import { botFaceTexture } from './textures.js';

export class Bolt {
  constructor() {
    this.group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color: 0xe8eefc });
    const trim = new THREE.MeshLambertMaterial({ color: 0x2f7cf6 });
    const face = new THREE.MeshLambertMaterial({ color: 0xffffff, map: botFaceTexture(), emissive: 0x222222 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.75), [body, body, body, body, face, body]);
    head.castShadow = true;
    this.group.add(head);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.8), trim);
    band.position.y = -0.3;
    this.group.add(band);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), trim);
    stalk.position.y = 0.55;
    this.group.add(stalk);
    this.tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x5ff2ff }),
    );
    this.tip.position.y = 0.78;
    this.group.add(this.tip);
    for (const x of [-0.52, 0.52]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.3), trim);
      ear.position.x = x;
      this.group.add(ear);
    }
    this.t = 0;
    this.pos = new THREE.Vector3();
    this.excited = 0;
  }

  place(p) {
    this.pos.set(p.x + 1.4, p.y + 3, p.z + 0.6);
    this.group.position.copy(this.pos);
  }

  cheer() {
    this.excited = 1.2;
  }

  update(dt, player, camera) {
    this.t += dt;
    // Float over Freddie's shoulder, a little to the camera's side.
    const side = new THREE.Vector3().subVectors(camera.position, player.pos).setY(0).normalize();
    const right = new THREE.Vector3(side.z, 0, -side.x);
    const target = player.pos.clone().addScaledVector(right, -1.5).addScaledVector(side, 0.6);
    target.y += 3.0 + Math.sin(this.t * 2.2) * 0.15 + (this.excited > 0 ? Math.abs(Math.sin(this.t * 14)) * 0.6 : 0);
    this.pos.lerp(target, 1 - Math.exp(-dt * 5));
    this.group.position.copy(this.pos);
    const look = Math.atan2(camera.position.x - this.pos.x, camera.position.z - this.pos.z);
    const turn = Math.atan2(Math.sin(look - this.group.rotation.y), Math.cos(look - this.group.rotation.y));
    this.group.rotation.y += turn * Math.min(1, dt * 4);
    this.excited = Math.max(0, this.excited - dt);
    this.tip.scale.setScalar(1 + Math.sin(this.t * 6) * 0.2);
  }
}
