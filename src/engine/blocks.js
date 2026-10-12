// Block builders. Every part is a box with the stud texture tiled once per
// world unit, so big and small parts share the same chunky look.
import * as THREE from 'three';
import { studTexture } from './textures.js';

const matCache = new Map();

export function material(color, opts = {}) {
  const k = JSON.stringify([color, opts]);
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshLambertMaterial({
    color,
    map: opts.plain ? null : studTexture(),
    transparent: !!opts.opacity && opts.opacity < 1,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  m.userData.shared = true;
  matCache.set(k, m);
  return m;
}

// Box geometry with UVs scaled to its size so the texture tiles per unit.
export function boxGeometry(w, h, d, tile = 1) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // Face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
  uv.needsUpdate = true;
  return geo;
}

export function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(boxGeometry(w, h, d, opts.tile ?? 1), opts.material ?? material(color, opts));
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  if (opts.at) mesh.position.set(...opts.at);
  return mesh;
}

// Solid static block that the player can stand on. Positioned by its top
// centre, which is how levels are easiest to lay out.
export function platform(world, w, h, d, color, x, top, z, opts = {}) {
  const mesh = box(w, h, d, color, opts);
  mesh.position.set(x, top - h / 2, z);
  world.root.add(mesh);
  const collider = world.addCollider(mesh, opts);
  return { mesh, collider };
}

const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d2340 });
edgeMat.userData.shared = true;

// A build made of unit cubes with dark outlines (for the Build Lab).
export function cubeBuild(cubes, color = 0xff8c42, size = 1) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  const n = cubes.length;
  const centre = [0, 1, 2].map((a) => cubes.reduce((s, c) => s + c[a], 0) / n);
  const geo = new THREE.BoxGeometry(size * 0.98, size * 0.98, size * 0.98);
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
  const mat = new THREE.MeshLambertMaterial({ color });
  for (const c of cubes) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set((c[0] - centre[0]) * size, (c[1] - centre[1]) * size, (c[2] - centre[2]) * size);
    m.userData.cube = c;
    const e = new THREE.LineSegments(edges, edgeMat);
    m.add(e);
    inner.add(m);
  }
  group.userData.inner = inner;
  group.userData.centre = centre;
  return group;
}

export function rotationQuaternion(m) {
  const mat = new THREE.Matrix4().set(
    m[0][0], m[0][1], m[0][2], 0,
    m[1][0], m[1][1], m[1][2], 0,
    m[2][0], m[2][1], m[2][2], 0,
    0, 0, 0, 1,
  );
  return new THREE.Quaternion().setFromRotationMatrix(mat);
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        // Shared cached materials stay alive; one-off ones (sprites, labels) go.
        if (m.userData.shared) continue;
        if (m.map && !m.map.userData.shared) m.map.dispose();
        m.dispose();
      }
    }
  });
}
