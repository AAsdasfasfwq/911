// US locations: airport (tarmac/terminal), open sky (cloud deck), Pentagon, Pennsylvania
// field, Crawford ranch, suburbs, Florida flight school, Washington DC, aircraft carrier.
import * as THREE from 'three';
import { OutdoorSet, terrain } from './outdoor.js';
import { fbm2, ridged2, clamp, lerp, rng, hash, smooth, E } from '../core/util.js';
import { detailTexture, grassTex, canvasTex, roadTex, cached, concreteTex, tileTex, makeCanvas } from '../assets/textures.js';
import { M, std, MAT, waterMaterial } from '../assets/materials.js';
import { makeAirliner, makeCessna, makeF15, makeB52 } from '../assets/aircraft.js';
import { makeCar, makeTanker, makeFireTruck, makeAmbulance, sirenTick, makeHumvee } from '../assets/vehicles.js';
import { Person, Crowd } from '../assets/people.js';
import { makeTree, makeBush, makeFlag, box, cyl, makeStreetLamp, makeContactShadow, makeSign } from '../assets/props.js';
import { makeHouse, makeRanchHouse, makePentagon, makeCapitol, makeWhiteHouse, makeHangar } from '../assets/buildings.js';
import { smokePlume, fireball, flames, dustCloud, rain } from '../fx/particles.js';
import { orient } from './manhattan.js';

// ============ AIRPORT ============
export class AirportSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'dawn';
    const sky = V === 'dawn' ? 'dawn' : V === 'night' ? 'night' : 'severeClear';
    this.baseBuild(r, { sky, sunI: V === 'dawn' ? 2.6 : 3.2, sunCol: V === 'dawn' ? 0xffc08a : 0xfff0dc, hemiSky: V === 'dawn' ? 0x9ab0e0 : 0xbcd6ff, hemiGround: 0x5a5048, hemiI: 0.55, fog: V === 'dawn' ? 0xf2b88a : 0xc8dcf0, fogNear: 300, fogFar: 8000, shadowSize: 160 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), M('airfieldGrass', () => { const t = grassTex(); t.repeat.set(600, 600); return new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: 0xb8c0a0 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(700, 300), M('apronConc', () => { const t = concreteTex(0.9); t.repeat.set(40, 18); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }));
    apron.rotation.x = -Math.PI / 2; apron.position.set(0, 0.05, 40); apron.receiveShadow = true; s.add(apron);
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(60, 4000), M('runway', () => { const t = roadTex(); t.repeat.set(1, 40); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }));
    rw.rotation.x = -Math.PI / 2; rw.rotation.z = Math.PI / 2; rw.position.set(0, 0.06, 420); rw.receiveShadow = true; s.add(rw);
    // terminal with glass front
    const term = new THREE.Group();
    box(420, 22, 50, M('terminalBody', () => std(0xd8d4cc, { r: 0.6 })), 0, 11, 0, term);
    const glass = box(400, 14, 0.5, M('termGlass', () => new THREE.MeshStandardMaterial({ color: 0x5a7a90, roughness: 0.05, metalness: 0.9 })), 0, 9, 25.3, term);
    box(424, 2, 54, M('termRoof', () => std(0x8a8c90, { r: 0.4, m: 0.6 })), 0, 23, 0, term);
    term.position.set(0, 0, -110); s.add(term);
    this.planes = [];
    const kinds = ['american', 'united', 'american', 'united', 'generic'];
    for (let i = 0; i < 5; i++) {
      const p = makeAirliner(kinds[i], { gear: true });
      p.position.set(-160 + i * 80, p.userData.groundOffset, -20); p.rotation.y = 0; s.add(p); this.planes.push(p);
      // jet bridge
      const jb = box(4, 4, 26, M('jetbridge', () => std(0xc8ccd0, { r: 0.5, m: 0.4 })), -160 + i * 80 - 6, 5.5, -60, s); jb.rotation.y = 0.25;
    }
    this.tanker = makeTanker(); this.tanker.position.set(-140, 0, 8); this.tanker.rotation.y = -0.4; s.add(this.tanker);
    this.flying = makeAirliner('american'); this.flying.visible = false; s.add(this.flying);
    // terminal approach road + cars
    for (let i = 0; i < 12; i++) { const c = makeCar(['sedan', 'taxi', 'suv'][i % 3], ['#5a6a7a', '#c8c8c0', '#2a2e34', '#8a2a24'][i % 4]); c.position.set(-200 + i * 35, 0.1, -150); c.rotation.y = Math.PI / 2; s.add(c); }
    this.post = V === 'dawn' ? { temp: 0.25, exposure: 1.05 } : { temp: 0.05 };
    this.focus = [-100, 0, 0]; this.focusSize = 200;
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ SKY (cloud deck + far ground) ============
function cloudDeckTex() {
  return cached('cloudDeck', () => canvasTex(1024, 1024, (g, w, h) => {
    const img = g.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm2(x / 90, y / 90, 33, 6) * 0.5 + 0.5;
      const a = clamp((n - 0.48) * 3.5);
      const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255 * (0.75 + n * 0.25); d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
  }, { linear: false }));
}
export class SkySet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'clear';
    const sky = { clear: 'severeClear', golden: 'golden', day: 'day', dusk: 'dusk', night: 'night', dawn: 'dawn' }[V] || 'severeClear';
    this.baseBuild(r, { sky, sunI: V === 'night' ? 0.3 : 3.2, sunCol: V === 'golden' || V === 'dusk' ? 0xffc080 : 0xfff2e0, hemiSky: 0xbcd6ff, hemiGround: 0x8a8070, hemiI: 0.65, fog: V === 'golden' ? 0xffd8a8 : V === 'night' ? 0x0a1020 : 0xc8dcf2, fogExp: 0.00006, shadowSize: 80, envI: V === 'night' ? 0.3 : 1 });
    const s = this.scene;
    // far ground (patchwork farmland) 3000m below
    const fieldTex = cached('farmland', () => canvasTex(1024, 1024, (g, w, h) => {
      const R = rng(4);
      for (let i = 0; i < 400; i++) { const c = ['#6a8a4a', '#8a9a5a', '#a8a070', '#5a7a3a', '#9a8a5a', '#7a9a6a'][Math.floor(R() * 6)]; g.fillStyle = c; g.fillRect(Math.floor(R() * 16) * 64, Math.floor(R() * 16) * 64, 64 * (1 + Math.floor(R() * 2)), 64 * (1 + Math.floor(R() * 2))); }
      g.strokeStyle = 'rgba(60,60,50,0.35)'; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    }));
    const gm = new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 1 }); gm.map.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), gm); ground.rotation.x = -Math.PI / 2; ground.position.y = -3000; s.add(ground);
    // two cloud decks
    this.decks = [];
    for (const [y, op, rep] of [[-900, 0.9, 8], [-1600, 0.7, 5]]) {
      const t = cloudDeckTex().clone(); t.userData.shared = false; t.needsUpdate = true; t.repeat.set(rep, rep); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, roughness: 1, color: V === 'golden' ? 0xffe0c0 : 0xffffff }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; s.add(m); this.decks.push({ m, t, y });
    }
    if (V === 'clear') this.decks.forEach((d) => (d.m.visible = false));
    this.planes = [makeAirliner('american'), makeAirliner('united'), makeAirliner('generic')];
    this.planes.forEach((p) => { p.visible = false; s.add(p); });
    this.jets = [makeF15(), makeF15()]; this.jets.forEach((j) => { j.visible = false; s.add(j); });
    this.b52 = makeB52(); this.b52.visible = false; s.add(this.b52);
    // contrail billboards
    this.post = V === 'golden' ? { temp: 0.3, bloomStr: 0.9 } : { temp: 0.05 };
    this.focus = [0, 0, 0]; this.focusSize = 60;
  }
  reset() { super.reset(); this.planes.forEach((p) => (p.visible = false)); this.jets.forEach((j) => (j.visible = false)); this.b52.visible = false; this.contrails = []; }
  late(ctx) {
    this.decks.forEach((d, i) => d.t.offset.set(ctx.T * 0.0008 * (i + 1), ctx.T * 0.0003));
    for (const c of this.contrails || []) this.fx.push(c);
    this.baseLate(ctx);
  }
}

// contrail emitter helper for sky shots: obj (moving), returns fx fn
export function contrail(getPos, t0, o = {}) {
  return (bb, T) => {
    const n = o.n ?? 160, life = o.life ?? 6;
    for (let i = 0; i < n; i++) {
      const age = (i / n) * life;
      const tt = T - age;
      if (tt < t0) continue;
      const p0 = getPos(tt);
      for (const side of o.sides || [0]) {
        const p = bb.push(); if (!p) return;
        p.x = p0[0] + side[0]; p.y = p0[1] + side[1] + age * 0.3; p.z = p0[2] + side[2];
        p.s = (o.s0 ?? 2) + age * (o.grow ?? 2); p.r = i; p.a = (o.a ?? 0.5) * (1 - age / life);
        p.cr = p.cg = p.cb = 0.95; p.er = p.eg = p.eb = 0; p.f = i % 4; p.lit = 1;
      }
    }
  };
}

// ============ PENTAGON ============
export class PentagonSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'clear';
    this.baseBuild(r, { sky: V === 'dusk' ? 'dusk' : 'severeClear', sunI: V === 'dusk' ? 1.6 : 3.3, sunCol: V === 'dusk' ? 0xff9a6a : 0xfff0dc, hemiSky: 0xbcd6ff, hemiGround: 0x5a6048, hemiI: 0.6, fog: V === 'dusk' ? 0xc08070 : 0xc8dcf2, fogNear: 600, fogFar: 9000, shadowSize: 420 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), M('pentGrass', () => { const t = grassTex(); t.repeat.set(500, 500); return new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: 0xc8d0b0 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    this.pent = makePentagon(); s.add(this.pent);
    // highway (I-395 / Route 27) west side
    const hw = new THREE.Mesh(new THREE.PlaneGeometry(40, 5000), M('hwRoad', () => { const t = roadTex(); t.repeat.set(2, 60); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }));
    hw.rotation.x = -Math.PI / 2; hw.position.set(-360, 0.1, 0); hw.rotation.z = 0.15; s.add(hw);
    this.cars = [];
    for (let i = 0; i < 14; i++) { const c = makeCar(['sedan', 'suv', 'sedan', 'pickup'][i % 4], ['#5a6a7a', '#c8c8c0', '#2a2e34', '#8a2a24', '#1c3a5a'][i % 5]); s.add(c); this.cars.push(c); }
    const R = rng(3);
    for (let i = 0; i < 160; i++) { const a = R() * 6.28, rr = 380 + R() * 900; const t = makeTree('oak', i); t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); t.scale.setScalar(1.5); s.add(t); }
    // DC skyline far (Washington monument + Capitol dome)
    const wm = box(17, 169, 17, M('monument', () => std(0xf2ece0, { r: 0.6 })), 2200, 84, -2600, s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(12, 17, 4), wm.material); tip.position.set(2200, 177, -2600); tip.rotation.y = Math.PI / 4; s.add(tip);
    this.plane = makeAirliner('american'); this.plane.visible = false; s.add(this.plane);
    this.trucks = [makeFireTruck(), makeFireTruck(), makeAmbulance()]; this.trucks.forEach((t, i) => { t.position.set(-150 + i * 6, 0, 80 + i * 14); t.rotation.y = 1.9; t.visible = false; s.add(t); });
    // impact point: west facade (x negative)
    this.impact = [-112, 12, 36]; this.faceN = [-0.95, 0, 0.31]; this.faceT = [0.31, 0, 0.95];
    this.post = { temp: 0.05 };
    this.focus = [-80, 0, 0]; this.focusSize = 260;
  }
  reset() { super.reset(); this.plane.visible = false; this.trucks.forEach((t) => (t.visible = false)); this.impactT = null; this.burning = 0; }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.cars.forEach((c, i) => { const z = ((i * 260 + T * 22 * (i % 2 ? 1 : -1)) % 3000 + 3000) % 3000 - 1500; c.position.set(-360 + (i % 2 ? 6 : -6) + z * -0.15, 0.1, z); c.rotation.y = i % 2 ? 0.15 : Math.PI + 0.15; });
    this.trucks.forEach((t) => sirenTick(t, T));
    const ip = this.impact;
    if (this.impactT != null) {
      const t0 = this.impactT;
      const fn = this.faceN, ft = this.faceT;
      this.fx.push((bb, TT) => fireball(bb, TT, { t0, pos: [ip[0] + fn[0] * 6, ip[1], ip[2] + fn[2] * 6], dir: [fn[0] * 0.6, 0.6, fn[2] * 0.6], count: 460, speed: 70, life: 9, size: [8, 75], bias: 0.5, hotTime: 1.4, buoy: 4, seed: 77 }));
      this.fx.push((bb, TT) => smokePlume(bb, TT, { t0: t0 + 0.5, count: 260, life: 60, rise: 6, wind: [8, 0, 4], size: [12, 160], pos: (r1) => [ip[0] + ft[0] * (r1 - 0.5) * 50, ip[1], ip[2] + ft[2] * (r1 - 0.5) * 50], spread: [10, 6, 10], color: [0.07, 0.065, 0.06], alpha: 0.9, fire: 0.8, fireFade: 40, seed: 78, startup: 2 }));
      this.fx.push((bb, TT) => flames(bb, TT, { t0: t0 + 1, count: 60, life: 1.3, size: 7, rise: 4, pos: (r1, r2) => [ip[0] + fn[0] * 2 + ft[0] * (r1 - 0.5) * 60, 2 + r2 * 18, ip[2] + fn[2] * 2 + ft[2] * (r1 - 0.5) * 60], heat: 0.8, seed: 79 }));
    }
    if (this.burning) {
      const fn = this.faceN, ft = this.faceT;
      this.fx.push((bb, TT) => smokePlume(bb, TT, { t0: -100, count: 300, life: 60, rise: 6, wind: [8, 0, 4], size: [12, 160], pos: (r1) => [ip[0] + ft[0] * (r1 - 0.5) * 50, ip[1], ip[2] + ft[2] * (r1 - 0.5) * 50], spread: [10, 6, 10], color: [0.07, 0.065, 0.06], alpha: 0.9, fire: 0.8, fireFade: 40, seed: 88 }));
      this.fx.push((bb, TT) => flames(bb, TT, { t0: -10, count: 60, life: 1.3, size: 7, rise: 4, pos: (r1, r2) => [ip[0] + fn[0] * 2 + ft[0] * (r1 - 0.5) * 60, 2 + r2 * 18, ip[2] + fn[2] * 2 + ft[2] * (r1 - 0.5) * 60], heat: 0.8, seed: 89 }));
    }
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ PENNSYLVANIA FIELD ============
export class FieldSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'severeClear', sunI: 3.2, sunCol: 0xfff0dc, hemiSky: 0xbcd6ff, hemiGround: 0x5a6a40, hemiI: 0.6, fog: 0xc8dcf0, fogNear: 400, fogFar: 9000, shadowSize: 200 });
    this.setSky('severeClear', { horizon: '#a8cce8' });
    const s = this.scene;
    const H = (x, z) => fbm2(x / 700, z / 700, 5, 4) * 40 + fbm2(x / 150, z / 150, 6, 3) * 4;
    this.H = H;
    s.add(terrain({
      size: 12000, seg: 240, height: H,
      colors: (x, z, y) => { const f = Math.floor(x / 160) * 31 + Math.floor(z / 120) * 17; const k = hash(f); const c = k < 0.3 ? [0.55, 0.6, 0.3] : k < 0.6 ? [0.42, 0.55, 0.26] : k < 0.8 ? [0.7, 0.62, 0.38] : [0.5, 0.45, 0.3]; const n = fbm2(x / 30, z / 30, 2, 2) * 0.05; return [c[0] + n, c[1] + n, c[2] + n]; },
      tex: detailTexture('field', 14, 3, 0.35), texRep: 900,
    }));
    const R = rng(9);
    // tree lines (autumn hints)
    for (let i = 0; i < 260; i++) { const line = Math.floor(R() * 6); const x = -1500 + line * 600 + (R() - 0.5) * 60, z = -2000 + R() * 4000; const t = makeTree(R() < 0.25 ? 'autumn' : 'oak', i, { h: 9 }); t.position.set(x, H(x, z), z); t.scale.setScalar(1.6); s.add(t); }
    // farm: barn + silo + farmhouse
    const farm = new THREE.Group(); const red = M('barnRed', () => std(0x8a2a22, { r: 0.85 }));
    box(20, 10, 30, red, 0, 5, 0, farm); const rs = new THREE.Shape([new THREE.Vector2(-11, 0), new THREE.Vector2(11, 0), new THREE.Vector2(0, 7)]); const rg = new THREE.ExtrudeGeometry(rs, { depth: 31, bevelEnabled: false }); rg.translate(0, 0, -15.5); const rf = new THREE.Mesh(rg, M('barnRoof', () => std(0x4a4a4c, { r: 0.6, m: 0.4 }))); rf.position.y = 10; farm.add(rf);
    cyl(4, 4, 22, M('silo', () => std(0xb8bcc0, { r: 0.4, m: 0.6 })), 16, 11, 0, farm, 18);
    const fh = makeHouse({ seed: 5, color: '#f0ece2', garage: false }); fh.position.set(-40, 0, 20); farm.add(fh);
    farm.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    farm.position.set(-300, H(-300, -400), -400); s.add(farm);
    this.plane = makeAirliner('united', { length: 47.3 }); this.plane.visible = false; s.add(this.plane);
    this.crater = [0, H(0, 0), 0];
    this.post = { temp: 0.08 };
    this.focus = [0, 0, 0]; this.focusSize = 300;
  }
  reset() { super.reset(); this.plane.visible = false; this.impactT = null; }
  update(ctx) {
    this.baseUpdate(ctx);
    if (this.impactT != null) {
      const t0 = this.impactT, c = this.crater;
      this.fx.push((bb, TT) => fireball(bb, TT, { t0, pos: [c[0], c[1] + 3, c[2]], dir: [0.3, 1, -0.2], count: 420, speed: 55, life: 8, size: [8, 60], bias: 0.65, hotTime: 1.3, buoy: 5, seed: 93 }));
      this.fx.push((bb, TT) => smokePlume(bb, TT, { t0: t0 + 0.6, count: 260, life: 70, rise: 9, wind: [6, 0, 3], size: [10, 170], pos: [c[0], c[1] + 4, c[2]], spread: [20, 4, 20], color: [0.12, 0.11, 0.1], alpha: 0.85, fire: 0.6, fireFade: 40, seed: 94, startup: 2 }));
    }
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ CRAWFORD RANCH ============
export class RanchSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'desert', sunI: 3.6, sunCol: 0xfff0d0, hemiSky: 0xd0e0f0, hemiGround: 0x8a7a50, hemiI: 0.6, fog: 0xf0e0c0, fogNear: 300, fogFar: 5000, shadowSize: 80 });
    this.setSky('desert', { sunDir: [0.3, 0.85, 0.3], zenith: '#3a7ad0', horizon: '#f2e6c8' });
    const s = this.scene;
    const H = (x, z) => fbm2(x / 500, z / 500, 2, 3) * 12;
    this.H = H;
    s.add(terrain({ size: 8000, seg: 160, height: H, colors: (x, z) => { const n = fbm2(x / 30, z / 30, 9, 3) * 0.1; return [0.72 + n, 0.64 + n, 0.38 + n]; }, tex: detailTexture('ranch', 12, 11, 0.4), texRep: 500 }));
    this.house = makeRanchHouse(); this.house.position.set(0, H(0, 0), 0); s.add(this.house);
    const R = rng(12);
    for (let i = 0; i < 80; i++) { const x = (R() - 0.5) * 600, z = (R() - 0.5) * 600; if (Math.hypot(x, z) < 30) continue; const t = makeTree('olive', i, { color: 0x5a6a3a, h: 4 }); t.position.set(x, H(x, z), z); s.add(t); }
    this.truck = makeCar('pickup', '#e8e8e4'); this.truck.position.set(18, H(18, 16), 16); this.truck.rotation.y = -0.6; s.add(this.truck);
    this.man = new Person({ seed: 1601, jacket: null, shirt: '#e8eef4', pants: '#3a4a6a', headwear: 'cap', capColor: '#e8e4dc', hair: 'side', hairColor: '#6a6a66' });
    s.add(this.man.root);
    const fenceM = M('fenceWood', () => std(0x8a7a5a, { r: 0.9 }));
    for (let i = 0; i < 40; i++) { cyl(0.08, 0.1, 1.4, fenceM, -60 + i * 3, H(-60 + i * 3, 30) + 0.7, 30, s, 6); }
    box(120, 0.08, 0.08, fenceM, 0, H(0, 30) + 1.1, 30, s); box(120, 0.08, 0.08, fenceM, 0, H(0, 30) + 0.6, 30, s);
    this.post = { temp: 0.35, saturation: 1.05, exposure: 1.08, highTint: [0.04, 0.02, -0.03] };
    this.focus = [0, 0, 10]; this.focusSize = 60;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.man.pose('walk', T, { speed: 0.8 }); this.man.root.position.set(-6 + (ctx.lt * 1.1), this.H(0, 12), 12); this.man.root.rotation.y = Math.PI / 2;
    // heat shimmer dust
    this.fx.push((bb, TT) => dustCloud(bb, TT, { t0: -30, count: 60, seed: 5, spawn: 60, speed: 2, drag: 0.3, size: [4, 14], growT: 6, alpha: 0.12, rise: 0.4, center: [0, 1, 20], height: 1, color: [0.9, 0.8, 0.6], life: 10, jitter: 80 }));
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ SUBURB ============
export class SuburbSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'florida';
    const night = V === 'night' || V === 'portland' || V === 'rain';
    const sky = night ? 'night' : V === 'dusk' ? 'dusk' : V === 'golden' ? 'golden' : 'day';
    this.baseBuild(r, { sky, sunI: night ? 0.25 : V === 'dusk' ? 1.6 : V === 'golden' ? 2.6 : 3.3, sunCol: V === 'golden' || V === 'dusk' ? 0xffb878 : night ? 0x8aa0ff : 0xfff2e0, hemiSky: night ? 0x2a3a5a : 0xbcd6ff, hemiGround: 0x4a5a3a, hemiI: night ? 0.25 : 0.65, fog: night ? 0x0c1220 : V === 'golden' ? 0xf2c890 : 0xcfe2f5, fogNear: 200, fogFar: night ? 1200 : 4000, shadowSize: 90, envI: night ? 0.3 : 1 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), M('lawnBig', () => { const t = grassTex(); t.repeat.set(300, 300); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 1200), M('subRoad', () => { const t = roadTex(); t.repeat.set(1, 30); return new THREE.MeshStandardMaterial({ map: t, roughness: night ? 0.3 : 0.85, metalness: night ? 0.3 : 0 }); }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.05; road.receiveShadow = true; s.add(road);
    const R = rng(V === 'florida' ? 4 : 7);
    this.houses = [];
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, z = -280 + Math.floor(i / 2) * 26;
      const h = makeHouse({ seed: i + 3, lit: night });
      h.position.set(side * 24, 0, z); h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; s.add(h); this.houses.push(h);
      const drive = box(5, 0.06, 12, M('driveway', () => std(0xa8a49c, { r: 0.85 })), side * 11, 0.03, z + 3, s);
      if (R() < 0.6) { const c = makeCar(['sedan', 'suv', 'pickup'][Math.floor(R() * 3)], ['#5a6a7a', '#c8c8c0', '#8a2a24', '#2a2e34', '#1c3a5a'][Math.floor(R() * 5)]); c.position.set(side * 11, 0, z + 3); c.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; s.add(c); }
      const tr = makeTree(V === 'florida' ? 'palm' : 'oak', i, { h: 6 }); tr.position.set(side * 9, 0, z - 8); s.add(tr);
      if (V === 'flags' || (V !== 'florida' && R() < 0.3)) { const f = makeFlag('us', 1.5, 0.8, { poleH: 2.5, amp: 0.8 }); f.position.set(side * 13.5, 0, z - 4); f.rotation.y = side > 0 ? Math.PI : 0; s.add(f); (this.flags ||= []).push(f); }
      for (let k = 0; k < 2; k++) { const b = makeBush(i * 3 + k); b.position.set(side * 16, 0, z - 3 + k * 4); s.add(b); }
    }
    if (V === 'florida') { // apartment complex
      const apt = new THREE.Group(); const wallM = M('aptWall', () => std(0xf0e0c0, { r: 0.85 }));
      box(60, 10, 14, wallM, 0, 5, 0, apt); for (let f = 0; f < 3; f++) box(60, 0.3, 2.5, M('aptBalc', () => std(0xd8d0c0, { r: 0.7 })), 0, 3 + f * 3.2, 8, apt);
      const doors = M('aptDoor', () => std(0x2a5a7a, { r: 0.5 })); for (let i = 0; i < 10; i++) for (let f = 0; f < 3; f++) box(1, 2.1, 0.1, doors, -27 + i * 6, 1.05 + f * 3.2, 7.05, apt);
      apt.position.set(-60, 0, 120); apt.rotation.y = Math.PI / 2; s.add(apt); this.apt = apt;
      for (let i = 0; i < 10; i++) { const p = makeTree('palm', 50 + i); p.position.set(-40 + (i % 2) * 6, 0, 80 + i * 8); s.add(p); }
    }
    if (V === 'night' || V === 'portland' || V === 'rain') {
      for (let i = 0; i < 16; i++) { const l = makeStreetLamp(true); l.position.set(6.5, 0, -200 + i * 30); l.rotation.y = -Math.PI / 2; s.add(l); const pl = new THREE.PointLight(0xffc890, 30, 30, 1.6); pl.position.set(4.8, 7, -200 + i * 30); s.add(pl); }
    }
    if (V === 'night') { // motel + police (Minnesota)
      const motel = new THREE.Group(); box(50, 7, 12, M('motelWall', () => std(0xc8b8a0, { r: 0.85 })), 0, 3.5, 0, motel);
      const sign = makeSign(canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.font = '700 90px "Bebas Neue"'; c.fillStyle = '#ff3a3a'; c.shadowColor = '#ff3a3a'; c.shadowBlur = 20; c.fillText('MOTEL', 120, 115); }, { clamp: true }), 6, 1.9, { emissive: 3 });
      sign.position.set(0, 9, 6.1); motel.add(sign); for (let i = 0; i < 8; i++) box(1, 2.1, 0.1, M('motelDoor', () => std(0x5a2a2a, { r: 0.5 })), -21 + i * 6, 1.05, 6.05, motel);
      motel.position.set(-40, 0, -20); motel.rotation.y = Math.PI / 2; s.add(motel);
      this.police = [makeCar('police'), makeCar('police'), makeCar('sedan', '#2a2e34')]; this.police.forEach((c, i) => { c.position.set(-26, 0, -30 + i * 9); c.rotation.y = Math.PI / 2 + (i - 1) * 0.3; s.add(c); });
      this.agents = [];
      for (let i = 0; i < 3; i++) { const p = new Person({ seed: 1700 + i, jacket: '#1c2230', pants: '#1c2230' }); p.root.position.set(-30 + i * 1.5, 0, -18 + i); p.root.rotation.y = -Math.PI / 2; s.add(p.root); this.agents.push(p); }
      this.redBlue = [new THREE.PointLight(0xff2010, 0, 30, 1.6), new THREE.PointLight(0x2050ff, 0, 30, 1.6)]; this.redBlue.forEach((l, i) => { l.position.set(-26, 2.5, -30 + i * 9); s.add(l); });
    }
    if (V === 'portland' || V === 'rain') {
      // small commercial strip at night
      const strip = new THREE.Group(); const sw = M('stripWall', () => std(0x5a5048, { r: 0.85 }));
      box(80, 6, 12, sw, 0, 3, 0, strip);
      const names = [['PIZZA', '#ff5a2a'], ['BANK', '#2a8aff'], ['DELI', '#3aff7a'], ['LAUNDRY', '#ff3aaa']];
      names.forEach(([n, c], i) => { const sg = makeSign(canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.font = '700 96px "Bebas Neue"'; g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 22; g.textAlign = 'center'; g.fillText(n, w / 2, 100); }, { clamp: true }), 5, 1.25, { emissive: 3 }); sg.position.set(-30 + i * 20, 5, 6.1); strip.add(sg); const win = box(14, 3, 0.1, M('stripWin' + i, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.6) })), -30 + i * 20, 2, 6.05, strip); });
      strip.position.set(-30, 0, 40); strip.rotation.y = Math.PI / 2; s.add(strip);
      this.walkers = [new Person({ seed: 1801, jacket: '#2a2e36', skin: '#c48a62' }), new Person({ seed: 1802, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' })];
      this.walkers.forEach((p) => s.add(p.root));
      this.rainOn = 1;
    }
    this.kids = [];
    if (V === 'golden' || V === 'flags') {
      for (let i = 0; i < 4; i++) { const p = new Person({ seed: 1900 + i, height: i < 2 ? 1.25 : 1.75, female: i % 2 === 1, jacket: null, shirt: ['#f2c40c', '#e86a1c', '#9fb6d6', '#efe4cf'][i], expr: 'smile' }); s.add(p.root); this.kids.push(p); }
    }
    this.post = night ? { exposure: 1.3, temp: -0.1, vignette: 0.55 } : V === 'golden' ? { temp: 0.3, exposure: 1.05 } : { temp: 0.1 };
    this.focus = [0, 0, 0]; this.focusSize = 80;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    (this.flags || []).forEach((f) => f.userData.tick(T));
    if (this.police) { this.police.forEach((c) => sirenTick(c, T)); const a = Math.sin(T * 12) > 0; this.redBlue[0].intensity = a ? 40 : 0; this.redBlue[1].intensity = a ? 0 : 40; this.agents.forEach((p, i) => p.pose(i === 1 ? 'arms' : 'stand', T + i)); }
    if (this.walkers) this.walkers.forEach((p, i) => { p.pose('walk', T + i * 0.5, { speed: 0.9 }); p.root.position.set(-18 + i * 0.8, 0, 60 - ((ctx.lt * 1.3) % 40) + i * 0.6); p.root.rotation.y = Math.PI; });
    if (this.rainOn) this.sparkFx.push((sp, TT, cam) => rain(sp, TT, cam, { count: 1200, radius: 30, height: 30, speed: 24, alpha: 0.25, size: 0.4, wind: 2 }));
    this.kids.forEach((p, i) => { p.root.position.set(-20 + Math.sin(T * 0.8 + i) * 3, 0, -40 + i * 2.5 + Math.cos(T * 0.6 + i) * 2); p.root.rotation.y = Math.sin(T * 0.8 + i) > 0 ? 1.5 : -1.5; p.pose(i < 2 ? 'run' : 'stand', T + i); });
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ FLIGHT SCHOOL (Florida) ============
export class FlightSchoolSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'day', sunI: 3.4, sunCol: 0xfff2dc, hemiSky: 0xbcd6ff, hemiGround: 0x6a7a4a, hemiI: 0.65, fog: 0xd8e8f8, fogNear: 300, fogFar: 6000, shadowSize: 90 });
    this.setSky('day', { cloudCov: 0.35, cloudScale: 1.2 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), M('fsGrass', () => { const t = grassTex(); t.repeat.set(400, 400); return new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: 0xc8d0a0 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(30, 1600), M('fsRunway', () => { const t = roadTex(); t.repeat.set(1, 20); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); }));
    rw.rotation.x = -Math.PI / 2; rw.position.set(80, 0.05, 0); rw.receiveShadow = true; s.add(rw);
    const taxi = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), M('fsTaxi', () => std(0x5a5a58, { r: 0.85 }))); taxi.rotation.x = -Math.PI / 2; taxi.rotation.z = Math.PI / 2; taxi.position.set(20, 0.04, 0); s.add(taxi);
    for (let i = 0; i < 3; i++) { const h = makeHangar([0xd8d8d0, 0xe8e4d8, 0xc8d0d8][i]); h.position.set(-40 + i * 34, 0, -40); s.add(h); }
    const office = box(20, 4, 10, M('fsOffice', () => std(0xf2ecdc, { r: 0.8 })), -50, 2, 10, s);
    const sign = makeSign(canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#f8f6f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f3c8c'; c.font = '800 64px "Inter Tight"'; c.fillText('FLIGHT TRAINING', 24, 82); c.fillStyle = '#c8232c'; c.fillRect(24, 96, 460, 8); }, { clamp: true }), 8, 2);
    sign.position.set(-50, 5.5, 15.1); s.add(sign);
    this.cessnas = [];
    for (let i = 0; i < 5; i++) { const c = makeCessna(); c.position.set(-20 + i * 14, c.userData.groundOffset, 30); c.rotation.y = Math.PI; s.add(c); this.cessnas.push(c); }
    this.taxiing = makeCessna(); s.add(this.taxiing);
    const R = rng(6);
    for (let i = 0; i < 40; i++) { const p = makeTree('palm', i + 30); p.position.set(-120 + R() * 60, 0, -100 + R() * 220); s.add(p); }
    this.windsock = new THREE.Group(); cyl(0.05, 0.05, 6, MAT.chrome(), 0, 3, 0, this.windsock, 6); const sock = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 10, 1, true), M('sock', () => std(0xff6a1c, { r: 0.7, side: THREE.DoubleSide }))); sock.rotation.z = Math.PI / 2; sock.position.set(1.1, 5.8, 0); this.windsock.add(sock); this.windsock.position.set(40, 0, 40); s.add(this.windsock);
    this.trainees = [new Person({ seed: 2001, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' }), new Person({ seed: 2002, jacket: null, shirt: '#3a4a6a', skin: '#c48a62' }), new Person({ seed: 2003, jacket: null, shirt: '#d6c8a8', skin: '#a56d4a' })];
    this.trainees.forEach((p) => s.add(p.root));
    this.post = { temp: 0.15, saturation: 1.12 };
    this.focus = [0, 0, 20]; this.focusSize = 70;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.cessnas.forEach((c, i) => (c.userData.prop.rotation.z = i === 2 ? T * 40 : 0));
    const c = this.taxiing; c.position.set(40 - (ctx.lt * 6), c.userData.groundOffset, 0); c.rotation.y = -Math.PI / 2; c.userData.prop.rotation.z = T * 50;
    this.windsock.rotation.y = Math.sin(T * 0.7) * 0.2;
    this.trainees.forEach((p, i) => { p.root.position.set(-30 + i * 1.2, 0, 22 - ctx.lt * 0.8 + i * 0.4); p.root.rotation.y = 0.3; p.pose('walk', T + i, { speed: 0.8 }); });
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ WASHINGTON DC ============
export class DCSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'day';
    const sky = V === 'dusk' ? 'dusk' : V === 'night' ? 'night' : V === 'golden' ? 'golden' : 'day';
    this.baseBuild(r, { sky, sunI: V === 'dusk' ? 1.5 : V === 'night' ? 0.3 : V === 'golden' ? 2.6 : 3.2, sunCol: V === 'golden' || V === 'dusk' ? 0xffb070 : 0xfff2e0, hemiSky: 0xbcd6ff, hemiGround: 0x5a6a40, hemiI: 0.6, fog: V === 'dusk' ? 0xc08070 : V === 'golden' ? 0xf2c890 : 0xcfe2f5, fogNear: 400, fogFar: 7000, shadowSize: 200 });
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), M('mallGrass', () => { const t = grassTex(); t.repeat.set(400, 400); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    this.capitol = makeCapitol(); this.capitol.position.set(0, 0, 0); s.add(this.capitol);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(60, 1800), M('mallPath', () => std(0xd8d0c0, { r: 0.9 }))); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.05, 900); s.add(path);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(120, 400), waterMaterial(0x2a4a5a, { rep: 8, r: 0.04, bump: 0.08 })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.1, 300); s.add(pool);
    const wm = box(17, 169, 17, M('monument2', () => std(0xf2ece0, { r: 0.6 })), 0, 84, 1600, s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(12, 17, 4), wm.material); tip.position.set(0, 177, 1600); tip.rotation.y = Math.PI / 4; s.add(tip);
    this.wh = makeWhiteHouse(); this.wh.position.set(-700, 0, 1500); this.wh.rotation.y = Math.PI / 2; s.add(this.wh);
    const R = rng(4);
    for (let i = 0; i < 120; i++) { const x = (R() < 0.5 ? -1 : 1) * (60 + R() * 40), z = 120 + R() * 1400; const t = makeTree('oak', i, { h: 8 }); t.position.set(x, 0, z); t.scale.setScalar(1.4); s.add(t); }
    this.flag = makeFlag('us', 4, 2.1, { poleH: 20 }); this.flag.position.set(0, 60, -20); s.add(this.flag);
    this.post = V === 'golden' ? { temp: 0.3 } : { temp: 0.05 };
    this.focus = [0, 0, 60]; this.focusSize = 220;
  }
  reset() { super.reset(); this.flag.position.set(0, 60, -20); }
  update(ctx) { this.baseUpdate(ctx); this.flag.userData.tick(ctx.T); }
  late(ctx) { this.baseLate(ctx); }
}

// ============ CARRIER ============
export class CarrierSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'day';
    this.baseBuild(r, { sky: V === 'dusk' ? 'dusk' : V === 'golden' ? 'golden' : 'day', sunI: V === 'dusk' ? 1.6 : 3.2, sunCol: V === 'golden' || V === 'dusk' ? 0xffb070 : 0xfff2e0, hemiSky: 0xbcd6ff, hemiGround: 0x2a3a4a, hemiI: 0.6, fog: V === 'dusk' ? 0xb07a70 : 0xc8d8e8, fogNear: 500, fogFar: 9000, shadowSize: 220 });
    const s = this.scene;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), waterMaterial(0x14304a, { rep: 1200, r: 0.06, bump: 0.5 })); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; s.add(sea); this.sea = sea;
    const ship = new THREE.Group();
    const hull = M('hullGrey', () => std(0x6a7078, { r: 0.6, m: 0.3 }));
    const deckM = M('deckDark', () => { const t = canvasTex(512, 2048, (g, w, h) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8e8e0'; g.lineWidth = 6; g.setLineDash([60, 40]); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); g.setLineDash([]); g.strokeStyle = '#f2c40c'; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.2, h); g.lineTo(w * 0.6, 0); g.stroke(); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.15})`; g.fillRect(hash(i * 3) * w, hash(i * 7) * h, 60, 200); } }); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); });
    const hshape = new THREE.Shape([new THREE.Vector2(-150, -18), new THREE.Vector2(130, -18), new THREE.Vector2(165, 0), new THREE.Vector2(130, 18), new THREE.Vector2(-150, 18)]);
    const hg = new THREE.ExtrudeGeometry(hshape, { depth: 20, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); hg.translate(0, -2, 0);
    ship.add(new THREE.Mesh(hg, hull));
    const deck = new THREE.Mesh(new THREE.BoxGeometry(320, 1.2, 76), deckM); deck.position.set(0, 18.6, 0); deck.rotation.y = 0; ship.add(deck);
    const island = new THREE.Group(); box(28, 18, 10, hull, 0, 9, 0, island); box(18, 8, 8, hull, 0, 22, 0, island); cyl(0.6, 0.6, 14, hull, 0, 32, 0, island, 8); island.position.set(30, 19, 30); ship.add(island);
    ship.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    s.add(ship); this.ship = ship;
    this.jets = [];
    for (let i = 0; i < 8; i++) { const j = makeF15(); j.position.set(-120 + i * 18, 21.2, -22 + (i % 2) * 6); j.rotation.y = Math.PI / 2 + 0.6; ship.add(j); this.jets.push(j); }
    this.launch = makeF15(); s.add(this.launch);
    this.crew = [];
    for (let i = 0; i < 6; i++) { const p = new Person({ seed: 2101 + i, jacket: null, shirt: ['#f2c40c', '#c8232c', '#2a6ad0', '#2ab85a', '#f2f2f0', '#8a2ad0'][i], pants: '#2a2e36', headwear: 'hardhat', helmetColor: ['#f2c40c', '#c8232c', '#2a6ad0', '#2ab85a', '#f2f2f0', '#8a2ad0'][i] }); ship.add(p.root); p.root.position.set(60 + i * 6, 19.2, -10 + (i % 3) * 5); this.crew.push(p); }
    this.escort = new THREE.Group(); box(140, 14, 18, hull, 0, 5, 0, this.escort); box(20, 14, 10, hull, 10, 16, 0, this.escort); this.escort.position.set(-600, 0, -500); s.add(this.escort);
    this.post = { temp: 0.05 };
    this.focus = [0, 20, 0]; this.focusSize = 180;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.sea.material.userData.tick?.(T);
    this.ship.position.set(0, Math.sin(T * 0.4) * 0.4, -T * 8 % 1000);
    this.ship.rotation.z = Math.sin(T * 0.3) * 0.006;
    this.crew.forEach((p, i) => p.pose(i % 2 ? 'point' : 'stand', T + i));
    // catapult steam
    const sp = this.ship.position;
    this.fx.push((bb, TT) => smokePlume(bb, TT, { t0: -20, count: 50, life: 4, rise: 2, wind: [-6, 0, 0], size: [2, 10], pos: [sp.x + 80, 19.5, sp.z - 20], spread: [60, 0.5, 2], color: [0.9, 0.9, 0.9], alpha: 0.4, seed: 44 }));
  }
  late(ctx) { this.baseLate(ctx); }
}
