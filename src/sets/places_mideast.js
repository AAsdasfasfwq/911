// Middle East / Central Asia locations: Desert Storm battlefield, US base, dunes, ruins,
// convoy; Afghan mountains & villages; the cave; Sudan training camp; Kabul airport 2021;
// Abbottabad compound (night).
import * as THREE from 'three';
import { OutdoorSet, terrain } from './outdoor.js';
import { fbm2, ridged2, clamp, lerp, rng, hash, smooth } from '../core/util.js';
import { detailTexture, sandTex, canvasTex, rockTex, cached } from '../assets/textures.js';
import { M, std, MAT } from '../assets/materials.js';
import { makeTank, makeHumvee, makeCar, profileExtrude, camoTex } from '../assets/vehicles.js';
import { makeF15, makeC17, makeHeli } from '../assets/aircraft.js';
import { Person, Crowd } from '../assets/people.js';
import { makeTent, makeSandbags, makeBarrel, makeCrate, makeFlag, makeTree, makeBush, box, cyl, makeLamp, makeContactShadow } from '../assets/props.js';
import { makeMudHouse, makeCompound, makeHangar } from '../assets/buildings.js';
import { smokePlume, fireball, flames, dustCloud, Chunks } from '../fx/particles.js';

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ============ DESERT ============
export class DesertSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'storm';
    const night = V === 'night';
    const sky = night ? 'nvg' : V === 'dunes' ? 'golden' : V === 'ruins' ? 'smoke' : 'desert';
    this.baseBuild(r, { sky, sunI: night ? 0.3 : V === 'dunes' ? 2.6 : 3.3, sunCol: night ? 0x8aa0ff : V === 'dunes' ? 0xffc880 : 0xfff0d6, hemiSky: night ? 0x203040 : 0xd8e0e8, hemiGround: 0xa08a6a, hemiI: night ? 0.25 : 0.65, fog: night ? 0x0a120c : V === 'ruins' ? 0x9a9080 : 0xe8d6b0, fogNear: 300, fogFar: night ? 2500 : 7000, shadowSize: 140, envI: night ? 0.3 : 1 });
    const s = this.scene;
    const ground = terrain({
      size: 9000, seg: 220,
      height: (x, z) => { const d = Math.hypot(x, z); const flat = smooth(clamp((d - 150) / 400)); return (fbm2(x / 260, z / 260, 4, 4) * 9 + Math.abs(fbm2(x / 90, z / 140, 9, 3)) * 5) * (V === 'dunes' ? 2.5 : 1) * (0.25 + 0.75 * flat) + (ridged2(x / 900, z / 900, 2, 3) * 30) * smooth(clamp((d - 1500) / 1500)); },
      colors: (x, z, y, sl) => { const n = fbm2(x / 50, z / 50, 6, 3) * 0.08; const k = 0.82 + n + y * 0.002; return night ? [0.06 * k, 0.07 * k, 0.05 * k] : [0.86 * k, 0.72 * k, 0.52 * k]; },
      tex: detailTexture('sand', 12, 7, 0.4), texRep: 600,
    });
    s.add(ground);
    this.ground = ground;
    const H = (x, z) => ground.userData.height(x, z);
    this.H = H;
    this.items = new THREE.Group(); s.add(this.items);
    const R = rng(11);
    if (V === 'storm' || V === 'night') {
      this.tanks = [];
      for (let i = 0; i < 9; i++) { const t = makeTank('abrams'); t.position.set(-60 + (i % 3) * 30 + R() * 6, 0, -40 - Math.floor(i / 3) * 40); this.items.add(t); this.tanks.push(t); }
      this.enemy = [];
      for (let i = 0; i < 5; i++) { const t = makeTank('t72'); t.position.set(-80 + i * 40, 0, 420 + R() * 30); t.rotation.y = Math.PI + (R() - 0.5) * 0.4; this.items.add(t); this.enemy.push(t); }
      this.jets = [makeF15(), makeF15(), makeF15()]; for (const j of this.jets) { j.visible = false; s.add(j); }
      this.oilFires = [[-900, 1800], [-300, 2400], [600, 2100], [1300, 2600], [-1600, 2900]];
    }
    if (V === 'base') {
      for (let i = 0; i < 12; i++) { const t = makeTent(0xc8b48a, 6, 9); t.position.set(-80 + (i % 6) * 9, 0, -30 - Math.floor(i / 6) * 14); this.items.add(t); }
      for (let i = 0; i < 3; i++) { const h = makeHangar(0xc8c0a8); h.position.set(40 + i * 36, 0, -60); this.items.add(h); }
      this.jets = [];
      for (let i = 0; i < 6; i++) { const j = makeF15(); j.position.set(20 + i * 18, 1.6, 10); j.rotation.y = Math.PI; this.items.add(j); this.jets.push(j); }
      for (let i = 0; i < 5; i++) { const h = makeHumvee(); h.position.set(-40 + i * 7, 0, 20); h.rotation.y = 0.3; this.items.add(h); }
      this.flag = makeFlag('us', 3.2, 1.7, { poleH: 14, amp: 1 }); this.flag.position.set(0, 0, 0); this.items.add(this.flag);
      for (let i = 0; i < 8; i++) { const sb = makeSandbags(8, i); sb.position.set(-20 + i * 5, 0, 40); this.items.add(sb); }
      for (let i = 0; i < 6; i++) { const b = makeBarrel([0x3a5a3a, 0x6a6a5a, 0x2a3a2a][i % 3]); b.position.set(-30 + i * 1.2, 0, 32); this.items.add(b); }
      // guard tower
      const tw = new THREE.Group(); const wd = M('towerWood', () => std(0x8a7048, { r: 0.85 }));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.12, 0.12, 8, wd, x * 1.4, 4, z * 1.4, tw, 6);
      box(3.6, 0.2, 3.6, wd, 0, 8, 0, tw); box(3.6, 1, 0.1, wd, 0, 8.6, 1.8, tw); const rf = box(4, 0.15, 4, wd, 0, 10.2, 0, tw);
      tw.position.set(-110, 0, 60); this.items.add(tw);
      this.troops = [];
      for (let i = 0; i < 6; i++) { const p = new Person({ seed: 1200 + i, jacket: '#b8a07a', pants: '#b8a07a', headwear: 'military', helmetColor: '#a8906a', shirt: '#b8a07a' }); p.root.position.set(-10 + i * 2.5, 0, 25 + (i % 2) * 2); p.root.rotation.y = Math.PI; this.items.add(p.root); this.troops.push(p); }
    }
    if (V === 'dunes') {
      const tree = new THREE.Group(); const bark = M('deadBark', () => std(0x5a4a3a, { r: 0.95 }));
      const trunk = cyl(0.25, 0.4, 4, bark, 0, 2, 0, tree, 7); trunk.rotation.z = 0.1;
      for (let i = 0; i < 6; i++) { const br = cyl(0.05, 0.14, 2.4, bark, 0, 3 + i * 0.25, 0, tree, 5); br.rotation.set(R() * 1.2 - 0.6, R() * 6, 0.6 + R() * 0.6); br.position.x = Math.sin(i) * 0.6; }
      tree.position.set(0, H(0, 0), 0); this.items.add(tree);
      const pk = makeCar('pickup', '#d8d0c0'); pk.position.set(-60, H(-60, 80), 80); pk.rotation.y = 0.7; this.items.add(pk); this.pickup = pk;
    }
    if (V === 'ruins') {
      const conc = M('ruinConc', () => std(0xb8ab98, { r: 0.95 }));
      for (let i = 0; i < 22; i++) {
        const x = -150 + (i % 6) * 50 + R() * 10, z = -80 + Math.floor(i / 6) * 60 + R() * 10;
        const h = 6 + R() * 18; const b = new THREE.Group();
        box(18, h, 14, conc, 0, h / 2, 0, b);
        // broken top: chunks missing
        for (let k = 0; k < 5; k++) box(4 + R() * 4, 2 + R() * 4, 4 + R() * 4, M('ruinDark', () => std(0x2a2622, { r: 0.95 })), (R() - 0.5) * 14, h - 1 + R(), (R() - 0.5) * 10, b);
        for (let k = 0; k < 8; k++) box(1.4, 1.4, 0.1, M('winHole', () => std(0x0a0a0a, { r: 1 })), (k % 4 - 1.5) * 4, 2.5 + Math.floor(k / 4) * 4, 7.05, b);
        b.position.set(x, 0, z); b.rotation.y = R() * 0.3; this.items.add(b);
      }
      for (let i = 0; i < 30; i++) { const c = box(2 + R() * 3, 0.6 + R() * 1.4, 2 + R() * 3, conc, -150 + R() * 300, 0.4, -100 + R() * 250, this.items); c.rotation.set(R(), R() * 3, R()); }
      const car = makeCar('sedan', '#2a2420'); car.position.set(10, 0, 40); car.rotation.set(0, 0.6, 0.2); this.items.add(car);
    }
    if (V === 'convoy') {
      this.convoy = [];
      for (let i = 0; i < 6; i++) { const h = makeHumvee(); this.items.add(h); this.convoy.push(h); }
      const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 6000), M('desertRoad', () => std(0x5a5450, { r: 0.9 }))); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.3, 0); road.receiveShadow = true; this.items.add(road);
      this.soldiers = [];
      for (let i = 0; i < 4; i++) { const p = new Person({ seed: 1250 + i, jacket: '#b8a07a', pants: '#b8a07a', headwear: 'military', helmetColor: '#a8906a', vest: '#8a7a5a', expr: 'sad' }); this.items.add(p.root); this.soldiers.push(p); }
    }
    this.post = night ? { nvg: 1, grain: 0.09, exposure: 2.2, bloomStr: 1.0, vignette: 0.6, scan: 0.25 } : { temp: 0.2, exposure: 1.0, saturation: 1.05 };
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T, V = this.variant;
    if (this.tanks) this.tanks.forEach((t, i) => { const z = -40 - Math.floor(i / 3) * 40 + T * 5 % 400; t.position.z = z; t.position.y = this.H(t.position.x, z); });
    if (this.flag) this.flag.userData.tick(T);
    if (this.troops) this.troops.forEach((p, i) => p.pose(i % 3 ? 'stand' : 'walk', T + i));
    if (this.convoy) this.convoy.forEach((h, i) => { h.position.set(i % 2 ? 2.5 : -2.5, 0.3, -T * 9 % 3000 + i * 22); h.rotation.y = Math.PI; });
    if (this.soldiers) this.soldiers.forEach((p, i) => { const z = 40 - i * 5 - ((T * 1.2) % 60); p.root.position.set(8 + (i % 2) * 1.6, 0.3, z); p.root.rotation.y = Math.PI; p.pose('walk', T + i, { speed: 0.7 }); });
    // oil well fires & battle smoke
    if (this.oilFires) for (const [x, z] of this.oilFires) {
      const k = Math.floor(x * 7 + z);
      this.fx.push((bb, TT) => smokePlume(bb, TT, { t0: -200, count: 120, life: 70, rise: 9, wind: [6, 0, 2], size: [30, 260], pos: [x, 10, z], spread: [20, 10, 20], color: [0.05, 0.045, 0.04], alpha: 0.9, fire: 1.2, fireFade: 25, seed: k }));
    }
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ AFGHAN MOUNTAINS ============
export class AfghanSet extends OutdoorSet {
  build(r) {
    const V = this.variant || 'dusk';
    const night = V === 'night';
    const sky = night ? 'nvg' : V === 'dusk' ? 'golden' : 'desert';
    this.baseBuild(r, { sky, sunI: night ? 0.25 : V === 'dusk' ? 2.4 : 3.2, sunCol: night ? 0x8aa0ff : V === 'dusk' ? 0xffb878 : 0xfff0d6, hemiSky: night ? 0x203040 : 0xc8d0dc, hemiGround: 0x8a7458, hemiI: night ? 0.2 : 0.6, fog: night ? 0x080c0a : V === 'dusk' ? 0xe8b88a : 0xd8ccb4, fogNear: 400, fogFar: 9000, shadowSize: 200, envI: night ? 0.3 : 1 });
    if (V === 'dusk') this.setSky('golden', { sunDir: [-0.8, 0.12, 0.3], horizon: '#ffb070', hazeCol: '#ffc890' });
    const s = this.scene;
    const H = (x, z) => {
      const valley = Math.exp(-Math.pow(x / 260, 2)) * (1 - smooth(clamp(Math.abs(z) / 3000)));
      const m = ridged2(x / 1100, z / 1100, 3, 6) * 900 + fbm2(x / 400, z / 400, 5, 4) * 120;
      return Math.max(0, m * (1 - valley * 0.95) - 120 + valley * 20);
    };
    this.H = H;
    const ground = terrain({
      size: 14000, seg: 320, height: H,
      colors: (x, z, y, sl) => {
        if (night) return [0.05, 0.06, 0.05];
        const n = fbm2(x / 80, z / 80, 3, 3) * 0.1;
        let c = [0.62 + n, 0.5 + n, 0.38 + n];
        if (sl > 0.35) c = [0.48 + n, 0.4 + n, 0.33 + n];
        if (y > 700 + fbm2(x / 200, z / 200, 8, 2) * 120) { const k = clamp((y - 700) / 200); c = [lerp(c[0], 0.94, k), lerp(c[1], 0.95, k), lerp(c[2], 0.98, k)]; }
        return c;
      },
      tex: detailTexture('rock', 10, 21, 0.45), texRep: 900, cast: true,
    });
    s.add(ground);
    this.items = new THREE.Group(); s.add(this.items);
    const R = rng(21);
    // village in the valley
    for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 220, z = -200 + R() * 500; const m = makeMudHouse(i); m.position.set(x, H(x, z), z); m.rotation.y = R() * 0.5; this.items.add(m); }
    for (let i = 0; i < 30; i++) { const x = (R() - 0.5) * 300, z = -300 + R() * 700; const t = makeTree(i % 3 ? 'olive' : 'pine', i); t.position.set(x, H(x, z), z); t.scale.setScalar(0.8); this.items.add(t); }
    // cave mouth on the slope
    const cx = 330, cz = -120, cy = H(cx, cz);
    this.cave = new THREE.Group(); this.cave.position.set(cx, cy, cz); this.cave.rotation.y = -Math.PI / 2;
    const dark = new THREE.Mesh(new THREE.CircleGeometry(8, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x020202 })); dark.position.set(0, 0.2, 0); dark.scale.set(1.2, 1.4, 1); this.cave.add(dark);
    const rockM = M('caveRock', () => new THREE.MeshStandardMaterial({ map: (() => { const t = rockTex(); t.repeat.set(2, 2); return t; })(), roughness: 0.95, flatShading: true }));
    for (let i = 0; i < 14; i++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + R() * 5, 1), rockM); const a = Math.PI * (i / 13); rk.position.set(Math.cos(a) * 11, Math.sin(a) * 12, -1 + R() * 2); rk.scale.set(1, 0.8, 1.4); rk.castShadow = true; this.cave.add(rk); }
    const lantern = new THREE.PointLight(0xffa050, night ? 0 : 6, 20, 1.5); lantern.position.set(0, 3, -4); this.cave.add(lantern);
    this.items.add(this.cave);
    this.caveWorld = new THREE.Vector3(cx, cy, cz);
    // fighters on the ridge (silhouettes)
    this.fighters = [];
    for (let i = 0; i < 6; i++) { const p = new Person({ seed: 1300 + i, headwear: i % 2 ? 'turban' : null, turbanColor: ['#2a2a2a', '#e8e0d0', '#5a4a3a'][i % 3], beard: 'long', beardColor: '#1a1612', robe: '#6a5a4a', shirt: '#5a4a3a', jacket: i % 3 === 0 ? '#5a5a3a' : null, skin: '#a56d4a', hair: 'short', hairColor: '#1a1612' }); this.items.add(p.root); this.fighters.push(p); }
    this.fighterHome = this.fighters.map((p, i) => [p, new THREE.Vector3(-20 + i * 1.5, H(-20 + i * 1.5, 120), 120), Math.PI]);
    // soviet tank wreck
    const wreck = makeTank('t72'); wreck.traverse((o) => { if (o.material) o.material = M('rust', () => std(0x6a3a22, { r: 0.95, m: 0.3 })); }); wreck.position.set(-60, H(-60, 140), 140); wreck.rotation.set(0.08, 1.2, 0.12); wreck.userData.turret.rotation.y = 0.8; this.items.add(wreck);
    this.wreck = wreck;
    // patrol (outpost variant)
    if (V === 'outpost' || V === 'day') {
      this.soldiers = [];
      for (let i = 0; i < 5; i++) { const p = new Person({ seed: 1350 + i, jacket: '#8a8460', pants: '#8a8460', shirt: '#8a8460', headwear: 'military', helmetColor: '#6a6448', vest: '#5a5a40' }); this.items.add(p.root); this.soldiers.push(p); }
      this.hv = makeHumvee(); this.items.add(this.hv);
    }
    this.post = night ? { nvg: 1, grain: 0.09, exposure: 2.4, bloomStr: 1.2, vignette: 0.6, scan: 0.25 } : V === 'dusk' ? { temp: 0.35, exposure: 1.0, saturation: 1.1, highTint: [0.05, 0.02, -0.02] } : { temp: 0.15 };
    this.focus = [0, 0, 0]; this.focusSize = 260;
  }
  reset() { super.reset(); for (const [p, pos, ry] of this.fighterHome) { p.root.position.copy(pos); p.root.rotation.set(0, ry, 0); } }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    if (this.soldiers) this.soldiers.forEach((p, i) => { const z = 60 - i * 4 - (T * 1.3) % 30; p.root.position.set((i % 2 ? 2 : -2), this.H(i % 2 ? 2 : -2, z), z); p.root.rotation.y = Math.PI; p.pose('walk', T + i, { speed: 0.8 }); });
    if (this.hv) { this.hv.position.set(6, this.H(6, 30), 30); this.hv.rotation.y = Math.PI; }
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ CAVE ============
export class CaveSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'golden', sunI: 2.0, sunCol: 0xffb070, hemiSky: 0x3a3028, hemiGround: 0x1a1410, hemiI: 0.15, fog: 0x0e0b08, fogNear: 4, fogFar: 60, shadowSize: 20, envI: 0.25, particles: 600 });
    const s = this.scene;
    s.background = new THREE.Color(0x050403);
    // tunnel: displaced cylinder (inside view)
    const geo = new THREE.CylinderGeometry(5, 5, 40, 64, 40, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const n = fbm2(a * 3, y / 4, 3, 5) * 1.6 + fbm2(a * 9, y / 1.5, 7, 3) * 0.4;
      const rr = 5 + n;
      p.setXYZ(i, Math.cos(a) * rr, y, Math.sin(a) * rr * 0.75);
    }
    geo.computeVertexNormals();
    const rockM = new THREE.MeshStandardMaterial({ map: (() => { const t = rockTex(); t.repeat.set(4, 6); return t; })(), roughness: 0.95, side: THREE.BackSide, color: 0xb09078, bumpMap: detailTexture('caveBump', 8, 5, 0.6), bumpScale: 3 });
    const tun = new THREE.Mesh(geo, rockM); tun.rotation.x = Math.PI / 2; tun.position.set(0, 2.5, -10); tun.receiveShadow = true; s.add(tun);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(7.5, 24), rockM.clone()); cap.material.side = THREE.DoubleSide; cap.position.set(0, 2.5, -29.6); s.add(cap);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 40), M('caveFloor', () => std(0x5a4a3a, { r: 1 }))); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.6, -10); floor.receiveShadow = true; s.add(floor);
    // rugs, cushions, maps, lanterns
    const rugTex = canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#7a1a1a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8a050'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#1a2a5a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, 50 + i * 50); g.lineTo(w / 2 + 50, 75 + i * 50); g.lineTo(w / 2, 100 + i * 50); g.lineTo(w / 2 - 50, 75 + i * 50); g.fill(); } }, { clamp: true });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, -0.58, -6); rug.receiveShadow = true; s.add(rug);
    for (let i = 0; i < 4; i++) { const c = box(0.8, 0.3, 0.5, M('cushion' + i, () => std([0x8a3a2a, 0x3a5a3a, 0x6a4a2a, 0x2a3a6a][i], { r: 0.95 })), -1.2 + (i % 2) * 2.4, -0.45, -4.5 - Math.floor(i / 2) * 2.5, s); }
    const mapTex = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#d8c8a0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6a5a3a'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(hash(i) * w, hash(i * 3) * h); g.bezierCurveTo(hash(i * 5) * w, hash(i * 7) * h, hash(i * 9) * w, hash(i * 11) * h, hash(i * 13) * w, hash(i * 17) * h); g.stroke(); } g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(w * 0.7, h * 0.35, 8, 0, Math.PI * 2); g.fill(); }, { clamp: true });
    const map = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 })); map.position.set(-3.1, 1.6, -8); map.rotation.y = 1.1; s.add(map);
    this.lanterns = [];
    for (const [x, y, z] of [[-1.6, 0.0, -4], [1.8, 0.2, -9], [-0.5, 2.8, -13]]) {
      const l = new THREE.Group(); cyl(0.12, 0.14, 0.32, M('lanternGlass', () => std(0xffd080, { r: 0.3, emissive: 0xff9a40, ei: 3 })), 0, 0, 0, l, 10); cyl(0.14, 0.14, 0.04, MAT.black(), 0, 0.18, 0, l, 10);
      const pl = new THREE.PointLight(0xff9a48, 9, 14, 1.6); pl.castShadow = true; pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -0.002; pl.position.y = 0.05; l.add(pl);
      l.position.set(x, y - 0.4, z); s.add(l); this.lanterns.push(pl);
    }
    // men
    this.men = [];
    const looks = [
      { seed: 1401, headwear: 'turban', turbanColor: '#ece6da', beard: 'long', beardColor: '#2a2420', robe: '#ece6da', jacket: '#6a6448', skin: '#c48a62', height: 1.93, hairColor: '#1a1612', expr: 'calm' }, // leader
      { seed: 1402, headwear: 'turban', turbanColor: '#2a2a2a', beard: 'long', beardColor: '#1a1612', robe: '#5a4a3a', shirt: '#5a4a3a', jacket: null, skin: '#a56d4a', expr: 'stern' },
      { seed: 1403, headwear: null, beard: 'short', beardColor: '#1a1612', robe: '#6a5a4a', shirt: '#6a5a4a', jacket: null, skin: '#a56d4a', expr: 'stern', hairColor: '#1a1612' },
      { seed: 1404, headwear: 'turban', turbanColor: '#5a4a3a', beard: 'long', beardColor: '#1a1612', robe: '#3a3a30', shirt: '#3a3a30', jacket: null, skin: '#c48a62', expr: 'neutral' },
    ];
    looks.forEach((o, i) => { const p = new Person(o); s.add(p.root); this.men.push(p); });
    this.leader = this.men[0];
    this.menHome = [[0, -0.6, -9.2, 0], [-1.6, -0.6, -5.2, Math.PI], [0, -0.6, -5.8, Math.PI], [1.6, -0.6, -5.2, Math.PI]];
    // light shaft from the cave mouth
    this.post = { vignette: 0.65, exposure: 1.15, temp: 0.3, contrast: 1.12, bloomStr: 0.9, grain: 0.05 };
    this.focus = [0, 0, -8]; this.focusSize = 14;
    this.sun.position.set(0, 3, 30);
  }
  reset() { super.reset(); this.men.forEach((p, i) => { const h = this.menHome[i]; p.root.position.set(h[0], h[1], h[2]); p.root.rotation.set(0, h[3], 0); p.setExpr(p.o.expr || 'neutral'); }); }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.men.forEach((p, i) => p.pose(i === 0 ? 'stand' : 'sit', T + i, { seatH: 0.32 }));
    this.lanterns.forEach((l, i) => (l.intensity = 8 + Math.sin(T * 9 + i * 2) * 0.8 + Math.sin(T * 23 + i) * 0.5));
    // dust motes in lantern light
    this.fx.push((bb, TT) => {
      for (let i = 0; i < 260; i++) {
        const p = bb.push(); if (!p) return;
        const r1 = hash(i * 3), r2 = hash(i * 7), r3 = hash(i * 11);
        p.x = (r1 - 0.5) * 6 + Math.sin(TT * 0.2 + i) * 0.3; p.y = -0.4 + ((r2 * 4 + TT * 0.05 * (0.5 + r3)) % 4); p.z = -2 - r3 * 14;
        p.s = 0.03; p.r = 0; p.a = 0.6; p.cr = 1; p.cg = 0.8; p.cb = 0.6; p.er = 0.8; p.eg = 0.5; p.eb = 0.25; p.f = 0; p.lit = 0;
      }
    });
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ TRAINING CAMP (Sudan) ============
export class CampSet extends OutdoorSet {
  build(r) {
    const night = this.variant === 'night';
    this.baseBuild(r, { sky: night ? 'night' : 'desert', sunI: night ? 0.3 : 3.2, sunCol: night ? 0x8aa0ff : 0xfff0d6, hemiSky: night ? 0x202838 : 0xd8e0e8, hemiGround: 0x8a7458, hemiI: night ? 0.2 : 0.6, fog: night ? 0x0a0c12 : 0xe8d8b8, fogNear: 200, fogFar: 4000, shadowSize: 80, envI: night ? 0.3 : 1 });
    const s = this.scene;
    const H = (x, z) => fbm2(x / 200, z / 200, 3, 3) * 3 + ridged2(x / 900, z / 900, 6, 3) * 60 * smooth(clamp((Math.hypot(x, z) - 600) / 900));
    this.H = H;
    s.add(terrain({ size: 6000, seg: 160, height: H, colors: (x, z, y) => { const n = fbm2(x / 40, z / 40, 2, 3) * 0.08; return night ? [0.08, 0.07, 0.06] : [0.8 + n, 0.62 + n, 0.44 + n]; }, tex: detailTexture('sand2', 12, 9, 0.4), texRep: 400 }));
    this.items = new THREE.Group(); s.add(this.items);
    const R = rng(31);
    for (let i = 0; i < 10; i++) { const t = makeTent(0xb8a07a, 5, 7); t.position.set(-40 + (i % 5) * 9, 0, -40 - Math.floor(i / 5) * 12); t.rotation.y = 0.05; this.items.add(t); }
    for (let i = 0; i < 6; i++) { const m = makeMudHouse(i + 40, { h: 3 }); m.position.set(20 + (i % 3) * 12, 0, -30 - Math.floor(i / 3) * 14); this.items.add(m); }
    // obstacle course
    const wd = M('obsWood', () => std(0x7a6040, { r: 0.9 }));
    for (let i = 0; i < 6; i++) { cyl(0.08, 0.08, 2.4, wd, -20 + i * 2.5, 1.2, 10, this.items, 6); cyl(0.08, 0.08, 2.4, wd, -20 + i * 2.5, 1.2, 11.5, this.items, 6); box(0.1, 0.1, 1.6, wd, -20 + i * 2.5, 2.4, 10.75, this.items); }
    for (let i = 0; i < 8; i++) { const tire = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.18, 8, 16), MAT.rubber()); tire.rotation.x = Math.PI / 2; tire.position.set(-5 + (i % 2) * 1.0, 0.18, 16 + i * 1.0); this.items.add(tire); }
    this.runners = [];
    for (let i = 0; i < 10; i++) { const p = new Person({ seed: 1500 + i, headwear: i % 3 ? null : 'turban', turbanColor: '#2a2a2a', beard: i % 2 ? 'short' : 'long', beardColor: '#1a1612', shirt: ['#6a6448', '#5a4a3a', '#8a7a5a'][i % 3], jacket: null, pants: '#4a4434', skin: ['#a56d4a', '#7f5136', '#5e3b28'][i % 3], hairColor: '#1a1612' }); this.items.add(p.root); this.runners.push(p); }
    if (night) {
      const fire = new THREE.PointLight(0xff8a3a, 30, 30, 1.6); fire.position.set(0, 1, 0); this.items.add(fire); this.fire = fire;
      for (let i = 0; i < 8; i++) { const lg = cyl(0.12, 0.12, 1.2, M('log', () => std(0x2a1a10, { r: 1 })), Math.cos(i) * 0.4, 0.15, Math.sin(i) * 0.4, this.items, 6); lg.rotation.set(Math.PI / 2, 0, i * 0.8); }
    }
    this.post = night ? { exposure: 1.3, temp: 0.1, vignette: 0.55 } : { temp: 0.25 };
    this.focus = [0, 0, 0]; this.focusSize = 60;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    const night = this.variant === 'night';
    this.runners.forEach((p, i) => {
      if (night) { const a = (i / this.runners.length) * Math.PI * 2; p.root.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2); p.root.rotation.y = -a - Math.PI / 2; p.pose('sit', T + i, { seatH: 0.3 }); }
      else { const z = 30 - ((T * 4 + i * 2.2) % 50); p.root.position.set(-6 + (i % 2) * 1.3, 0, z); p.root.rotation.y = Math.PI; p.pose('run', T + i * 0.3); }
    });
    if (this.fire) { this.fire.intensity = 26 + Math.sin(T * 13) * 4 + Math.sin(T * 31) * 3; this.fx.push((bb, TT) => flames(bb, TT, { t0: -10, count: 40, life: 0.9, size: 0.8, rise: 1.6, pos: (r1, r2) => [(r1 - 0.5) * 0.8, 0.2, (r2 - 0.5) * 0.8], heat: 0.8, seed: 3 })); }
    if (!night) this.fx.push((bb, TT) => dustCloud(bb, TT, { t0: -30, count: 120, seed: 4, spawn: 60, speed: 3, drag: 0.3, size: [2, 8], growT: 6, alpha: 0.25, rise: 0.2, center: [-6, 0.5, 10], height: 0.5, color: [0.8, 0.68, 0.5], life: 10, jitter: 20 }));
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ KABUL AIRPORT 2021 ============
export class KabulSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'desert', sunI: 3.0, sunCol: 0xfff0d8, hemiSky: 0xd0d8e0, hemiGround: 0x8a7a68, hemiI: 0.6, fog: 0xd8d0c0, fogNear: 400, fogFar: 9000, shadowSize: 140 });
    const s = this.scene;
    const H = (x, z) => Math.max(0, ridged2(x / 1400, z / 1400, 4, 5) * 900 - 250) * smooth(clamp((Math.hypot(x, z - 1500) - 1500) / 1200));
    s.add(terrain({ size: 14000, seg: 200, height: H, colors: (x, z, y, sl) => { const n = fbm2(x / 60, z / 60, 2, 3) * 0.06; return y > 600 ? [0.9, 0.9, 0.92] : [0.62 + n, 0.55 + n, 0.46 + n]; }, tex: detailTexture('kabul', 10, 13, 0.35), texRep: 700 }));
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), M('apron', () => std(0x8a8680, { r: 0.85 }))); apron.rotation.x = -Math.PI / 2; apron.position.y = 0.25; apron.receiveShadow = true; s.add(apron);
    this.c17 = makeC17(); this.c17.position.set(0, 4.2, 0); this.c17.rotation.y = 0.4; s.add(this.c17);
    const term = box(160, 18, 30, M('kabulTerminal', () => std(0xd8d0c0, { r: 0.8 })), -60, 9, -160, s);
    this.crowd = new Crowd(420, { seed: 77 });
    const R = rng(5);
    for (let i = 0; i < 420; i++) { const a = R() * Math.PI * 2, rr = 12 + Math.sqrt(R()) * 70; this.crowd.pos[i] = [Math.cos(a) * rr - 20, 0.25, Math.sin(a) * rr + 20, R() * 6.28]; }
    s.add(this.crowd.group);
    this.helis = [makeHeli(0x3a3e30), makeHeli(0x3a3e30)]; this.helis.forEach((h) => s.add(h));
    this.post = { temp: 0.15, saturation: 1.0, contrast: 1.08 };
    this.focus = [0, 0, 0]; this.focusSize = 120;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.crowd.update(T, 'walk', { speed: 0.15 });
    this.helis.forEach((h, i) => { h.position.set(-200 + i * 60 + Math.sin(T * 0.2 + i) * 20, 60 + i * 15, -100 + T * 3 % 200); h.userData.rotor.rotation.y = T * 40; h.userData.tr.rotation.x = T * 60; });
    this.fx.push((bb, TT) => dustCloud(bb, TT, { t0: -30, count: 160, seed: 9, spawn: 60, speed: 6, drag: 0.2, size: [6, 30], growT: 8, alpha: 0.3, rise: 0.4, center: [-20, 1, 20], height: 2, color: [0.75, 0.7, 0.62], life: 14, jitter: 80 }));
  }
  late(ctx) { this.baseLate(ctx); }
}

// ============ ABBOTTABAD (night, NVG) ============
export class AbbottabadSet extends OutdoorSet {
  build(r) {
    this.baseBuild(r, { sky: 'nvg', sunI: 1.1, sunCol: 0x9ab0ff, hemiSky: 0x3a5068, hemiGround: 0x1a2018, hemiI: 1.0, fog: 0x0a120c, fogNear: 300, fogFar: 3000, shadowSize: 120, envI: 0.4 });
    const s = this.scene;
    const H = (x, z) => fbm2(x / 300, z / 300, 2, 3) * 6 + Math.max(0, ridged2(x / 1200, z / 1200, 7, 4) * 700 - 200) * smooth(clamp((Math.hypot(x, z) - 900) / 900));
    s.add(terrain({ size: 10000, seg: 200, height: H, colors: (x, z) => { const n = fbm2(x / 40, z / 40, 3, 3) * 0.05; return [0.24 + n, 0.25 + n, 0.2 + n]; }, tex: detailTexture('abb', 10, 17, 0.4), texRep: 600 }));
    this.compound = makeCompound(); s.add(this.compound);
    const R = rng(8);
    for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 600, z = (R() - 0.5) * 600; if (Math.hypot(x, z) < 70) continue; const m = makeMudHouse(i + 100, { h: 6 + R() * 4 }); m.position.set(x, H(x, z), z); s.add(m); }
    for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 500, z = (R() - 0.5) * 500; if (Math.hypot(x, z) < 50) continue; const t = makeTree('pine', i); t.position.set(x, H(x, z), z); s.add(t); }
    // a few lit windows / yard lights that bloom through night vision
    const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.6) });
    for (const [x, y, z] of [[-17, 2, 12.06], [-9, 5.5, 12.06], [-21, 5.5, 12.06]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), lit); w.position.set(x, y, z); this.compound.add(w); }
    for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 700, z = (R() - 0.5) * 700; if (Math.hypot(x, z) < 80) continue; const l = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lit); l.position.set(x, H(x, z) + 3 + R() * 3, z); s.add(l); }
    this.helis = [makeHeli(0x1a1c1e), makeHeli(0x1a1c1e)]; this.helis.forEach((h) => s.add(h));
    this.post = { nvg: 1, grain: 0.1, exposure: 2.6, bloomStr: 1.2, vignette: 0.65, scan: 0.25, contrast: 1.1 };
    this.focus = [0, 0, 0]; this.focusSize = 90;
  }
  update(ctx) {
    this.baseUpdate(ctx);
    const T = ctx.T;
    this.helis.forEach((h, i) => { h.userData.rotor.rotation.y = T * 40 + i; h.userData.tr.rotation.x = T * 60; });
  }
  late(ctx) { this.baseLate(ctx); }
}
