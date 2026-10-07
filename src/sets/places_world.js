// Europe: Berlin Wall night (1989-91 celebrations), Red Square at dusk (Soviet flag),
// Paris solidarity vigil (2001).
import * as THREE from 'three';
import { OutdoorSet } from './outdoor.js';
import { rng, hash, clamp, fbm2 } from '../core/util.js';
import { M, std, MAT } from '../assets/materials.js';
import { Person, Crowd } from '../assets/people.js';
import { makeWallSegment, makeKremlinTower } from '../assets/buildings.js';
import { makeFlag, box, cyl, makeStreetLamp, makeTree } from '../assets/props.js';
import { tileTex, concreteTex, canvasTex, brickTex } from '../assets/textures.js';
import { fireworks, smokePlume } from '../fx/particles.js';

export class EuropeSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'berlin';
    if (V === 'berlin') this.buildBerlin(r);
    else if (V === 'moscow') this.buildMoscow(r);
    else this.buildParis(r);
  }
  buildBerlin(r) {
    this.baseBuild(r, { sky: 'night', sunI: 0.3, sunCol: 0x9ab0ff, hemiSky: 0x2a3a5a, hemiGround: 0x1a1612, hemiI: 0.3, fog: 0x10141e, fogNear: 60, fogFar: 900, shadowSize: 40, envI: 0.35, sparks: 4000 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), M('berlinGround', () => { const t = tileTex('#4a4844', '#3a3834', 10); t.repeat.set(200, 200); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    this.segs = [];
    for (let i = 0; i < 60; i++) { const w = makeWallSegment(i % 8); w.position.set(-36 + i * 1.2, 0, 0); s.add(w); this.segs.push(w); }
    // toppling segment
    this.fall = makeWallSegment(3); this.fall.position.set(3.6, 0, 0); s.add(this.fall);
    this.segs[33].visible = false;
    // Brandenburg Gate (silhouette)
    const sand = M('gateSand', () => std(0xc8b898, { r: 0.8 }));
    const gate = new THREE.Group();
    for (let i = 0; i < 6; i++) cyl(1.0, 1.1, 14, sand, -15 + i * 6, 7, 0, gate, 14);
    box(40, 4, 10, sand, 0, 16, 0, gate); box(16, 3, 8, sand, 0, 19.5, 0, gate);
    gate.position.set(0, 0, -120); s.add(gate);
    const gl = new THREE.SpotLight(0xffd8a0, 400, 200, 0.5, 0.6, 1.2); gl.position.set(0, 2, -90); gl.target.position.set(0, 12, -120); s.add(gl, gl.target);
    // crowds on both sides and atop the wall
    this.crowd = new Crowd(380, { seed: 89, shirts: ['#3a3e48', '#5a4a3a', '#2a2e36', '#6a2a2a', '#4a5a6a', '#8a7a5a', '#1c2a4a'] });
    const R = rng(7);
    for (let i = 0; i < 380; i++) { const top = i < 40; this.crowd.pos[i] = top ? [-30 + R() * 60, 3.85, (R() - 0.5) * 0.3, R() * 6.28] : [-40 + R() * 80, 0, (R() < 0.5 ? -1 : 1) * (2 + R() * 18), R() < 0.5 ? 0 : Math.PI]; }
    s.add(this.crowd.group);
    this.heroes = [];
    const looks = [{ seed: 2201, jacket: '#3a3e48', expr: 'smile' }, { seed: 2202, female: true, jacket: '#6a2a2a', expr: 'smile' }, { seed: 2203, jacket: '#2a2e36', headwear: 'cap', expr: 'smile' }, { seed: 2204, jacket: '#4a5a6a', expr: 'smile' }];
    looks.forEach((o, i) => { const p = new Person(o); p.root.position.set(-2 + i * 1.3, 3.85, 0); s.add(p.root); this.heroes.push(p); });
    this.hammerer = new Person({ seed: 2210, jacket: '#5a4a3a', expr: 'stern' }); this.hammerer.root.position.set(1.5, 0, 1.0); this.hammerer.root.rotation.y = Math.PI; s.add(this.hammerer.root);
    const hammer = new THREE.Group(); cyl(0.02, 0.02, 0.5, M('hammerHandle', () => std(0x6a4a2a, { r: 0.8 })), 0, -0.25, 0, hammer, 6); box(0.08, 0.08, 0.16, MAT.chrome(), 0, -0.5, 0, hammer); this.hammerer.j.wrR.add(hammer);
    for (let i = 0; i < 10; i++) { const l = makeStreetLamp(true); l.position.set(-40 + i * 9, 0, 14); l.rotation.y = Math.PI; s.add(l); const pl = new THREE.PointLight(0xffc890, 25, 26, 1.6); pl.position.set(-40 + i * 9, 7, 12.3); s.add(pl); }
    this.flags = [];
    for (let i = 0; i < 3; i++) { const f = makeFlag('de', 1.4, 0.8, { poleH: 2.4, amp: 1 }); this.flags.push(f); s.add(f); }
    this.bursts = [];
    for (let i = 0; i < 40; i++) this.bursts.push({ t: i * 0.7 + hash(i) * 0.5, pos: [-120 + hash(i * 3) * 240, 60 + hash(i * 5) * 50, -200 - hash(i * 7) * 150], color: [[1, 0.3, 0.2], [0.3, 0.6, 1], [1, 0.85, 0.3], [0.4, 1, 0.5], [1, 0.4, 0.9]][i % 5], n: 70, speed: 30 });
    this.post = { exposure: 1.35, temp: 0.05, bloomStr: 1.1, vignette: 0.5 };
    this.focus = [0, 2, 0]; this.focusSize = 30;
    this.kind = 'berlin';
  }
  buildMoscow(r) {
    this.baseBuild(r, { sky: 'dusk', sunI: 1.3, sunCol: 0xff9a70, hemiSky: 0x5a6a9a, hemiGround: 0x2a2228, hemiI: 0.45, fog: 0x8a6a7a, fogNear: 200, fogFar: 2500, shadowSize: 120 });
    this.setSky('dusk', { cloudCov: 0.45, sunDir: [-0.9, 0.06, 0.3] });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), M('cobble', () => { const t = tileTex('#4a4440', '#2a2624', 32); t.repeat.set(120, 120); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    this.tower = makeKremlinTower(); this.tower.position.set(0, 0, -80); s.add(this.tower);
    // dome (St Basil-like silhouette)
    const domeCols = [0xc8232c, 0x2a8a4a, 0xf2c40c, 0x2a6ad0];
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(5 + (i === 2 ? 3 : 0), 16, 12), M('onion' + i, () => std(domeCols[i % 4], { r: 0.4, m: 0.3 }))); d.scale.y = 1.4; d.position.set(-160 + i * 12, 40 + (i === 2 ? 14 : 0), -220); s.add(d); cyl(4, 5, 30 + (i === 2 ? 14 : 0), M('basilBody', () => std(0xb84a3a, { r: 0.8 })), -160 + i * 12, 15 + (i === 2 ? 7 : 0), -220, s, 10); }
    this.flagPole = new THREE.Group(); cyl(0.1, 0.12, 18, MAT.chrome(), 0, 9, 0, this.flagPole, 8); this.flagPole.position.set(0, 60, -80); s.add(this.flagPole);
    this.sov = makeFlag('ussr', 4.5, 2.6, { pole: false, amp: 0.9 }); this.flagPole.add(this.sov);
    this.post = { temp: 0.1, exposure: 1.15, vignette: 0.5, saturation: 1.05 };
    this.focus = [0, 20, -80]; this.focusSize = 80;
    this.kind = 'moscow';
  }
  buildParis(r) {
    this.baseBuild(r, { sky: 'dusk', sunI: 1.0, sunCol: 0xff9a70, hemiSky: 0x3a4a7a, hemiGround: 0x1a1618, hemiI: 0.4, fog: 0x4a3a5a, fogNear: 100, fogFar: 2500, shadowSize: 40, envI: 0.6 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), M('parisGround', () => { const t = tileTex('#5a544c', '#3a3630', 16); t.repeat.set(160, 160); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // Eiffel tower lattice (simplified)
    const iron = M('eiffel', () => std(0x6a5a44, { r: 0.6, m: 0.5 }));
    const et = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(3, 9, 120, 4, 6, true), iron); leg.position.set(Math.cos(a) * 30, 60, Math.sin(a) * 30); leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); et.add(leg);
    }
    box(70, 5, 70, iron, 0, 58, 0, et); box(40, 4, 40, iron, 0, 116, 0, et);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 14, 180, 4), iron); spire.position.y = 205; et.add(spire);
    const lights = new THREE.PointLight(0xffc070, 600, 400, 1.4); lights.position.set(0, 120, 30); et.add(lights);
    et.position.set(0, 0, -500); s.add(et);
    for (let i = 0; i < 14; i++) { const b = new THREE.Group(); const w = 26 + hash(i) * 10; box(w, 22, 18, M('haussmann', () => std(0xd8c8a8, { r: 0.8 })), 0, 11, 0, b); box(w, 4, 18, M('mansard', () => std(0x4a5060, { r: 0.6, m: 0.3 })), 0, 24, 0, b); for (let k = 0; k < 12; k++) box(1.4, 2.2, 0.1, M('parisWin', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.6) })), -w / 2 + 2 + (k % 6) * (w / 6), 6 + Math.floor(k / 6) * 6, 9.05, b); b.position.set((i % 7 - 3) * 34, 0, i < 7 ? -60 : 60); b.rotation.y = i < 7 ? 0 : Math.PI; s.add(b); }
    // candle vigil
    this.candles = [];
    const R = rng(13);
    for (let i = 0; i < 160; i++) { const x = (R() - 0.5) * 20, z = (R() - 0.5) * 8; const c = cyl(0.04, 0.04, 0.12, M('vigilCandle', () => std(0xf2ecdc, { r: 0.6 })), x, 0.06, z, s, 8); const f = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4, 1) })); f.scale.y = 2.2; f.position.set(x, 0.16, z); s.add(f); this.candles.push(f); }
    for (let i = 0; i < 6; i++) { const pl = new THREE.PointLight(0xffa040, 6, 8, 1.6); pl.position.set(-8 + i * 3.2, 0.5, 0); s.add(pl); }
    this.crowd = new Crowd(140, { seed: 21, shirts: ['#2a2e36', '#3a3e48', '#4a3a2a', '#6a2a2a', '#1c2a4a'] });
    for (let i = 0; i < 140; i++) { const a = R() * 6.28, rr = 6 + R() * 10; this.crowd.pos[i] = [Math.cos(a) * rr * 1.6, 0, Math.sin(a) * rr * 0.8, a + Math.PI / 2 + Math.PI]; }
    s.add(this.crowd.group);
    const fl = makeFlag('us', 2.2, 1.2, { poleH: 6, amp: 0.4 }); fl.position.set(-3, 0, -6); s.add(fl); this.flags = [fl];
    const fl2 = makeFlag('fr', 2.2, 1.2, { poleH: 6, amp: 0.4 }); fl2.position.set(3, 0, -6); s.add(fl2); this.flags.push(fl2);
    this.post = { exposure: 1.3, temp: 0.15, vignette: 0.55, bloomStr: 1.0 };
    this.focus = [0, 0, 0]; this.focusSize = 30;
    this.kind = 'paris';
  }
  reset() { super.reset(); this.fallT = null; this.lowerT = null; }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    if (this.kind === 'berlin') {
      this.crowd.update(T, 'cheer');
      this.heroes.forEach((p, i) => p.pose('cheer', T + i * 0.4));
      this.hammerer.pose('stand', T); this.hammerer.j.shR.rotation.x = -2.2 + Math.max(0, Math.sin(T * 6)) * 1.6; this.hammerer.j.elR.rotation.x = -0.6;
      this.flags.forEach((f, i) => { f.userData.tick(T); f.position.set(-1 + i * 2.6, 3.85, 0.2); });
      const fb = this.fallT != null ? clamp((T - this.fallT) / 1.6) : 0;
      this.fall.rotation.x = fb * fb * 1.45;
      const bursts = this.bursts;
      this.sparkFx.push((sp, TT) => fireworks(sp, TT % 28, bursts));
    } else if (this.kind === 'moscow') {
      this.sov.userData.tick(T);
      const lower = this.lowerT != null ? clamp((T - this.lowerT) / 3.5) : 0;
      this.sov.position.y = 17 - lower * 15;
    } else {
      this.candles.forEach((f, i) => (f.scale.y = 2.2 + Math.sin(T * 12 + i) * 0.4));
      this.crowd.update(T, 'stand');
      this.flags.forEach((f) => f.userData.tick(T));
    }
  }
  late(ctx) { this.baseLate(ctx); }
}
