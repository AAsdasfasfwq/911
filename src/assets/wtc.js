// World Trade Center: twin towers (with damage + collapse controls), plaza, WTC 3-7.
import * as THREE from 'three';
import { towerMaterial, std, M, cityMaterial } from './materials.js';
import { tileTex, concreteTex } from './textures.js';
import { clamp, E } from '../core/util.js';

export const TOWER_W = 63.4, TOWER_H = 417, FLOOR_H = 3.79;
export const floorY = (n) => (n - 1) * FLOOR_H; // bottom of floor n

export class Tower {
  constructor({ antenna = false, name = 'tower' } = {}) {
    this.group = new THREE.Group();
    this.group.name = name;
    const geo = new THREE.BoxGeometry(TOWER_W, TOWER_H, TOWER_W, 1, 1, 1);
    geo.translate(0, TOWER_H / 2, 0);
    this.mat = towerMaterial();
    this.mat2 = towerMaterial();
    this.body = new THREE.Mesh(geo, this.mat);
    this.body.castShadow = true; this.body.receiveShadow = true;
    this.group.add(this.body);
    // top block (used for collapse; hidden by clip otherwise)
    this.topPivot = new THREE.Group();
    this.group.add(this.topPivot);
    this.top = new THREE.Mesh(geo, this.mat2);
    this.top.castShadow = true;
    this.topPivot.add(this.top);
    this.top.visible = false;
    // roof structures
    const roofMat = M('wtcRoof', () => std(0x4a4b4e, { r: 0.8, m: 0.3 }));
    const rf = new THREE.Mesh(new THREE.BoxGeometry(46, 6, 30), roofMat);
    rf.position.set(0, TOWER_H + 3, 0); rf.castShadow = true;
    this.topPivot.add(rf);
    this.roofParts = [rf];
    if (antenna) {
      const am = M('antenna', () => std(0xd8dade, { r: 0.4, m: 0.9 }));
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 30, 12), am);
      base.position.set(0, TOWER_H + 6 + 15, 0);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 80, 10), am);
      mast.position.set(0, TOWER_H + 36 + 40, 0);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, 14, 6), am);
      tip.position.set(0, TOWER_H + 116 + 7, 0);
      const rings = [];
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.6 - i * 0.3, 0.25, 6, 18), am); r.rotation.x = Math.PI / 2; r.position.set(0, TOWER_H + 40 + i * 14, 0); rings.push(r); }
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.6, 0.4) }));
      beacon.position.set(0, TOWER_H + 131, 0);
      this.beacon = beacon;
      for (const o of [base, mast, tip, ...rings, beacon]) { o.castShadow = true; this.topPivot.add(o); this.roofParts.push(o); }
    }
    this.impactY = 0;
    this.reset();
  }

  get U() { return this.mat.userData.U; }

  reset() {
    for (const m of [this.mat, this.mat2]) {
      const U = m.userData.U;
      U.uDmg.value = 0; U.uDmg2.value = 0; U.uSoot.value = 0; U.uClip.value = 1e5; U.uClipLo.value = -1e5; U.uDust.value = 0; U.uNight.value = 0; U.uFire.value = 1;
    }
    this.group.visible = true;
    this.body.visible = true;
    this.top.visible = false;
    this.topPivot.position.set(0, 0, 0); this.topPivot.rotation.set(0, 0, 0);
    for (const r of this.roofParts) r.visible = true;
  }

  // face: [nx, nz] outward normal of struck face; floors [lo, hi]; u: horizontal centre (local, along face); tilt: wing slant
  setDamage(amount, face, floors, uCentre = 0, tilt = 0.18, slot = 1, seed = 1) {
    const yc = (floorY(floors[0]) + floorY(floors[1] + 1)) / 2;
    const hh = (floorY(floors[1] + 1) - floorY(floors[0])) / 2;
    for (const m of [this.mat, this.mat2]) {
      const U = m.userData.U;
      if (slot === 1) {
        U.uDmg.value = amount; U.uDmgFace.value.set(face[0], face[1], 0, seed); U.uDmgC.value.set(uCentre, yc, 29, hh); U.uDmgTilt.value = tilt;
      } else {
        U.uDmg2.value = amount; U.uDmg2Face.value.set(face[0], face[1], 0, seed); U.uDmg2C.value.set(uCentre, yc, 29, hh);
      }
    }
    this.impactY = Math.max(this.impactY, yc);
  }
  setSoot(v) { this.mat.userData.U.uSoot.value = v; this.mat2.userData.U.uSoot.value = v; }
  setNight(v, lit = 0.3) { for (const m of [this.mat, this.mat2]) { m.userData.U.uNight.value = v; m.userData.U.uLit.value = lit; } }
  setDust(v) { for (const m of [this.mat, this.mat2]) m.userData.U.uDust.value = v; }
  setFire(v) { for (const m of [this.mat, this.mat2]) m.userData.U.uFire.value = v; }
  tick(t) { this.mat.userData.U.uTime.value = t; this.mat2.userData.U.uTime.value = t; if (this.beacon) this.beacon.visible = Math.sin(t * 3.2) > 0.2; }

  // Collapse: p in [0,1]. breakY = floor where it fails, tilt (radians) for top block, tiltAxis [x,z]
  setCollapse(p, breakY, tilt = 0, tiltAxis = [1, 0]) {
    if (p <= 0) { this.mat.userData.U.uClip.value = 1e5; this.top.visible = false; for (const r of this.roofParts) r.visible = true; return; }
    // front descends ~ free-fall-ish accelerating
    const front = breakY * (1 - E.inQuad(clamp(p)));
    const drop = breakY - front;
    this.mat.userData.U.uClip.value = front;
    this.top.visible = true;
    const U2 = this.mat2.userData.U;
    U2.uClipLo.value = Math.max(breakY, front + drop + 6 * p);
    // top block crumbles: shorten from bottom as it goes
    U2.uClip.value = 1e5;
    const pv = this.topPivot;
    pv.position.set(0, -drop, 0);
    const ti = tilt * E.outQuad(clamp(p * 3));
    pv.rotation.set(tiltAxis[1] * ti, 0, -tiltAxis[0] * ti);
    // rotate around the break line: shift so pivot is at breakY
    const off = new THREE.Vector3(0, breakY, 0).applyEuler(pv.rotation);
    pv.position.x += 0 - off.x; pv.position.y += breakY - off.y; pv.position.z += 0 - off.z;
    const vanish = clamp((p - 0.55) / 0.35);
    this.top.visible = vanish < 1;
    U2.uClip.value = TOWER_H + 200 - vanish * (TOWER_H + 220);
    for (const r of this.roofParts) r.visible = vanish < 0.4;
    if (p >= 1) { this.top.visible = false; this.body.visible = front > 2; }
  }
  // world position of a point on a face at floor n (for FX)
  facePoint(face, floor, u = 0, out = new THREE.Vector3()) {
    const y = floorY(floor) + FLOOR_H / 2;
    const nx = face[0], nz = face[1];
    out.set(nx * TOWER_W / 2 + (-nz) * u, y, nz * TOWER_W / 2 + nx * u);
    return this.group.localToWorld(out);
  }
}

export function makeWTC() {
  const g = new THREE.Group();
  const north = new Tower({ antenna: true, name: 'north' });
  const south = new Tower({ antenna: false, name: 'south' });
  north.group.position.set(0, 0, 0);
  south.group.position.set(-38, 0, 130);
  g.add(north.group, south.group);
  // plaza
  const plazaMat = M('plaza', () => { const t = tileTex('#bdb6ab', '#8f887d', 16); t.repeat.set(12, 12); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }); });
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(240, 0.6, 340), plazaMat);
  plaza.position.set(-20, 0.3, 65); plaza.receiveShadow = true;
  g.add(plaza);
  // The Sphere sculpture + fountain
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(3.8, 24, 16), M('bronze', () => std(0x8a6a3a, { r: 0.35, m: 0.9 })));
  sphere.position.set(-60, 5.5, 60); sphere.castShadow = true;
  const fount = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1, 32), M('fountain', () => std(0x6a6e72, { r: 0.4 })));
  fount.position.set(-60, 0.9, 60);
  g.add(sphere, fount);
  // low WTC buildings (3,4,5,6) and WTC 7
  const lowMat = cityMaterial();
  const lows = [
    { p: [-95, 0, 175], s: [55, 88, 70], c: 0x2a2e33 }, // WTC3 Marriott
    { p: [55, 0, 185], s: [60, 36, 80], c: 0x2a2c30 }, // WTC4
    { p: [70, 0, -45], s: [70, 36, 90], c: 0x2a2c30 }, // WTC5
    { p: [-80, 0, -85], s: [70, 32, 60], c: 0x2a2c30 }, // WTC6
    { p: [-10, 0, -210], s: [100, 186, 60], c: 0x7a3b32 }, // WTC7 (red granite)
  ];
  const lowGeo = new THREE.BoxGeometry(1, 1, 1); lowGeo.translate(0, 0.5, 0);
  const lm = new THREE.InstancedMesh(lowGeo, lowMat, lows.length);
  const d = new THREE.Object3D();
  lows.forEach((b, i) => { d.position.set(...b.p); d.scale.set(...b.s); d.updateMatrix(); lm.setMatrixAt(i, d.matrix); lm.setColorAt(i, new THREE.Color(b.c)); });
  lm.castShadow = lm.receiveShadow = true;
  g.add(lm);
  return { group: g, north, south, lows: lm, lowMat, plaza, sphere };
}
