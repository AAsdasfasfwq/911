// Lower Manhattan + harbour. Time-of-day presets, twin-tower story state (impacts, smoke,
// collapse, dust) driven by story time, airliners with cockpits, street level, office
// floors inside the towers, Ground Zero, the rebuilt site, Tribute in Light, FX.
import * as THREE from 'three';
import { BaseSet, makeSky, applySky, SKY_PRESETS, envFromSky, sunLight, focusSun } from '../core/stage.js';
import { makeCity } from '../assets/city.js';
import { makeWTC, floorY } from '../assets/wtc.js';
import { makeAirliner, makeF15 } from '../assets/aircraft.js';
import { Billboards, smokePlume, flames, fireball, dustCloud, Chunks, rain, fireworks, makeBolt, sparkBillboards } from '../fx/particles.js';
import { clamp, lerp, E, seg, hash } from '../core/util.js';
import { M, std } from '../assets/materials.js';
import { makeStreet, makeOfficeFloor, makeCockpit, makeRubble, makeRebuilt, makeTribute, makeRooftopCams, makePit, PIT } from './nyc_kits.js';
import { HOLE } from '../assets/city.js';
import { sirenTick, makeFireTruck, makeAmbulance, makeCar } from '../assets/vehicles.js';

export const TIMES = {
  clear: { sky: 'severeClear', sun: [0xfff1dc, 3.4], hemi: [0xbcd6ff, 0x5a5048, 0.55], fog: [0xbfd8f2, 0.00009], night: 0, exposure: 1.0, temp: 0.05 },
  day: { sky: 'day', sun: [0xfff0d8, 3.2], hemi: [0xb8d0f0, 0x5a5048, 0.6], fog: [0xc6dcf0, 0.00011], night: 0, exposure: 1.0, temp: 0.08 },
  dawn: { sky: 'dawn', sun: [0xffc08a, 2.6], hemi: [0x8aa0d0, 0x4a3a34, 0.45], fog: [0xf2b48a, 0.00013], night: 0.25, exposure: 1.05, temp: 0.15 },
  golden: { sky: 'golden', sun: [0xffc880, 3.0], hemi: [0x9ab8e0, 0x5a4a3a, 0.5], fog: [0xf5cfa0, 0.00012], night: 0.1, exposure: 1.0, temp: 0.2 },
  dusk: { sky: 'dusk', sun: [0xff8a5a, 1.4], hemi: [0x5a6aa0, 0x2a2228, 0.35], fog: [0xb07080, 0.00012], night: 0.7, exposure: 1.1, temp: 0.05 },
  night: { sky: 'night', sun: [0x8ea8ff, 0.35], hemi: [0x30406a, 0x101014, 0.25], fog: [0x141c30, 0.00012], night: 1, exposure: 1.25, temp: -0.15 },
  storm: { sky: 'storm', sun: [0x8090b0, 0.35], hemi: [0x50607a, 0x14161a, 0.35], fog: [0x2a3240, 0.00028], night: 0.85, exposure: 1.25, temp: -0.2 },
  smoke: { sky: 'smoke', sun: [0xffd6a8, 2.2], hemi: [0xa8a49a, 0x4a4640, 0.55], fog: [0x9c9284, 0.00025], night: 0.1, exposure: 1.0, temp: 0.12 },
  dust: { sky: 'dust', sun: [0xe8dcc0, 0.8], hemi: [0x9c968a, 0x5a564e, 0.8], fog: [0x8f8a80, 0.0026], night: 0.35, exposure: 1.1, temp: 0.05 },
  overcast: { sky: 'overcast', sun: [0xd8dde8, 1.2], hemi: [0xaab4c0, 0x4a4c50, 0.7], fog: [0xaab4c0, 0.00022], night: 0.15, exposure: 1.05, temp: -0.05 },
};

export class ManhattanSet extends BaseSet {
  constructor(v) { super(v); this.near = 1.5; this.far = 30000; this.time = 'clear'; }
  build(r) {
    const s = (this.scene = new THREE.Scene());
    this.sky = makeSky('severeClear', 20000);
    s.add(this.sky);
    this.sun = sunLight(0xffffff, 3, [0.65, 0.42, 0.25], { size: 400, mapSize: 4096, dist: 3000, bias: -0.0002, normalBias: 1.2 });
    s.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd6ff, 0x5a5048, 0.5);
    s.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0xffe2c4, 0.8); // warm bounce light from sunlit facades
    s.add(this.fill, this.fill.target);
    s.fog = new THREE.FogExp2(0xbfd8f2, 0.0001);
    const city = (this.city = makeCity({}));
    s.add(city.group);
    const wtc = (this.wtc = makeWTC());
    s.add(wtc.group);
    // airliners with cockpits
    this.aa11 = makeAirliner('american');
    this.ua175 = makeAirliner('united');
    for (const p of [this.aa11, this.ua175]) { const ck = makeCockpit(); ck.position.z = -0.6; p.add(ck); p.userData.cockpit = ck; p.visible = false; s.add(p); }
    this.jets = [makeF15(), makeF15()];
    for (const j of this.jets) { j.visible = false; s.add(j); }
    // kits
    this.street = makeStreet(); s.add(this.street.group);
    this.officeN = makeOfficeFloor(wtc.north, 80, 'e', { seed: 1 }); s.add(this.officeN.group);
    this.officeS = makeOfficeFloor(wtc.south, 72, 'n', { seed: 2 }); s.add(this.officeS.group);
    this.rubble = makeRubble(); s.add(this.rubble.group);
    this.rebuilt = makeRebuilt(); s.add(this.rebuilt);
    this.tribute = makeTribute(); s.add(this.tribute);
    this.pit = makePit(); s.add(this.pit.group);
    this.cams = makeRooftopCams(); this.cams.group.position.set(420, 72, 420); s.add(this.cams.group);
    const camBld = new THREE.Mesh(new THREE.BoxGeometry(44, 72, 34), this.city.mat); camBld.position.set(420, 36, 420); camBld.castShadow = camBld.receiveShadow = true; s.add(camBld);
    // emergency vehicles near the towers
    this.emergency = new THREE.Group();
    const evs = [];
    for (let i = 0; i < 6; i++) { const v = i % 3 === 2 ? makeAmbulance() : i % 3 === 1 ? makeCar('police') : makeFireTruck(); v.position.set(150 + (i % 2) * 8, 0.3, -60 + i * 22); v.rotation.y = (i % 2 ? 0.2 : -0.3); this.emergency.add(v); evs.push(v); }
    this.emergency.userData.vs = evs; this.emergency.visible = false; s.add(this.emergency);
    // FX
    this.bb = new Billboards(3600);
    s.add(this.bb.mesh);
    this.sparks = sparkBillboards(3000); s.add(this.sparks.mesh);
    const debGeo = new THREE.BoxGeometry(1, 1, 1);
    this.debris = new Chunks(600, debGeo, M('debris', () => std(0x2a2826, { r: 0.8, m: 0.3 })));
    this.papers = new Chunks(900, new THREE.PlaneGeometry(0.6, 0.8), M('paper', () => new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8, side: THREE.DoubleSide })));
    s.add(this.debris.mesh, this.papers.mesh);
    this.bolt = makeBolt(3, 1600); this.bolt.visible = false; s.add(this.bolt);
    this.flashLight = new THREE.PointLight(0xffc890, 0, 2500, 1.2); s.add(this.flashLight);
    this.extra = [];
    this.extras = new THREE.Group(); s.add(this.extras);
    // remember initial placement of animated people so every shot starts from the same state
    this.homes = [];
    for (const p of [...this.street.heroes, ...this.rubble.workers, ...this.officeN.people, ...this.officeS.people, ...this.cams.crew]) this.homes.push([p, p.root.position.clone(), p.root.rotation.clone(), p.o.expr || 'neutral']);
    this.setTime('clear');
  }
  addExtra(o) { this.extras.add(o); return o; }
  clearExtras() {
    while (this.extras.children.length) {
      const c = this.extras.children.pop();
      c.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) if (!m.userData.shared) m.dispose(); });
    }
  }

  setTime(name) {
    const P = TIMES[name];
    this.time = name;
    applySky(this.sky, P.sky);
    const sp = SKY_PRESETS[P.sky];
    this.sun.userData.dir.set(...sp.sunDir).normalize();
    this.sun.color.set(P.sun[0]); this.sun.intensity = P.sun[1];
    this.hemi.color.set(P.hemi[0]); this.hemi.groundColor.set(P.hemi[1]); this.hemi.intensity = P.hemi[2];
    this.baseHemi = P.hemi[2];
    this.fill.color.set(P.sun[0]); this.fill.intensity = P.sun[1] * 0.28;
    this.fill.position.set(-sp.sunDir[0], 0.35, -sp.sunDir[2]).multiplyScalar(1000);
    this.scene.fog.color.set(P.fog[0]); this.scene.fog.density = P.fog[1];
    this.scene.environment = envFromSky(this.renderer, P.sky);
    this.scene.environmentIntensity = name === 'night' || name === 'storm' ? 0.35 : name === 'dust' ? 0.6 : 1.0;
    const U = this.city.mat.userData.U;
    U.uNight.value = P.night;
    U.uLit.value = name === 'night' || name === 'storm' ? 0.14 : 0.24;
    this.wtc.lowMat.userData.U.uNight.value = P.night;
    this.post = { exposure: P.exposure, temp: P.temp };
    this.bb.setLight(null, P.sun[0], new THREE.Color(P.hemi[0]).multiplyScalar(0.55));
    this.isNight = P.night > 0.6;
  }

  reset() {
    this.clearExtras();
    for (const [p, pos, rot, ex] of this.homes) { p.root.position.copy(pos); p.root.rotation.copy(rot); p.setExpr(ex); p.root.visible = true; }
    this.setTime('clear');
    this.wtc.north.reset(); this.wtc.south.reset();
    this.wtc.group.visible = true;
    this.aa11.visible = this.ua175.visible = false;
    for (const p of [this.aa11, this.ua175]) p.userData.cockpit.visible = false;
    for (const j of this.jets) j.visible = false;
    this.storyOverride = null;
    this.extra.length = 0;
    this.fxOn = true;
    this.cityDust = 0;
    this.focus = [0, 0, 60]; this.focusSize = 450;
    this.towersGone = false;
    this.mode = 'normal';
    this.street.group.visible = true;
    this.officeN.group.visible = false; this.officeS.group.visible = false;
    this.rubble.group.visible = false; this.rebuilt.visible = false; this.tribute.visible = false; this.cams.group.visible = false;
    this.tribute.children.forEach((m) => { if (m.geometry?.type === 'BoxGeometry') m.position.y = 0.8; }); this.tribute.userData.U.uRise.value = 1e5; this.tribute.userData.U.uI.value = 1; this.tribute.userData.ghost.opacity = 0;
    this.pit.group.visible = false; HOLE.value.set(0, 0, 0, 0);
    this.emergency.visible = false;
    this.rainOn = 0; this.lightning = []; this.fireworks = null;
    this.bolt.visible = false; this.flashLight.intensity = 0;
    this.sky.material.uniforms.flash.value = 0;
    this.trafficOn = true;
    this.heroesOn = true;
    this.wtc.lows.visible = true;
    this.lowsBurnt = false;
    this.debrisSpec = null; this.paperSpec = null;
  }

  // modes: 'normal' | 'rubble' | 'rebuilt'
  setMode(m) {
    this.mode = m;
    if (m === 'rubble') { this.towersGone = true; this.rubble.group.visible = true; this.trafficOn = false; this.street.group.visible = false; this.wtc.plaza.visible = false; }
    if (m === 'rebuilt') { this.towersGone = true; this.rebuilt.visible = true; this.wtc.lows.visible = false; this.wtc.plaza.visible = false; this.wtc.sphere.visible = false; HOLE.value.set(-140, -125, 115, 250); }
    if (m === 'pit') { this.towersGone = true; this.pit.group.visible = true; this.wtc.lows.visible = false; this.wtc.plaza.visible = false; this.wtc.sphere.visible = false; HOLE.value.set(...PIT); }
    if (m === 'normal') { this.wtc.plaza.visible = true; this.wtc.sphere.visible = true; }
  }

  storyT(ctx) { return this.storyOverride != null ? this.storyOverride : ctx.T; }

  update(ctx) {
    const T = ctx.T;
    this.extra.length = 0;
    this.debrisSpec = null; this.paperSpec = null;
    this.wtc.north.tick(T); this.wtc.south.tick(T);
    if (this.city.water.material.userData.tick) this.city.water.material.userData.tick(T);
    // traffic
    for (const tr of this.street.traffic) {
      tr.c.visible = this.trafficOn;
      const L = 880;
      const z = ((tr.off + T * 9 * tr.lane) % L + L) % L - 390;
      tr.c.position.z = z; tr.c.rotation.y = tr.lane > 0 ? 0 : Math.PI;
    }
    for (const p of this.street.heroes) { p.root.visible = this.heroesOn; p.pose('stand', T); }
    this.street.crowd.update(T, 'walk', { speed: 1.2 });
    for (const v of this.emergency.userData.vs) sirenTick(v, T + v.position.z);
    if (this.officeN.group.visible) this._officeTick(this.officeN, T);
    if (this.officeS.group.visible) this._officeTick(this.officeS, T);
    if (this.rebuilt.visible) for (const p of this.rebuilt.userData.pools) p.userData.tick(T);
    this.tribute.userData.U.uT.value = T;
    this.rubble.flag.userData.tick(T);
    if (this.pit.group.visible) { this.pit.flags.forEach((f) => f.userData.tick(T)); this.pit.crowd.update(T, 'stand'); this.pit.reader.pose('podium', T); }
    for (const p of [this.aa11, this.ua175]) if (p.userData.cockpit.visible) p.userData.cockpit.userData.panel.update(T);
    if (this.rubble.group.visible) { this.rubble.workers.forEach((w, i) => w.pose(i % 4 === 3 ? 'carry' : 'dig', T + i)); this.rubble.crowd.update(T, 'stand'); }
  }

  _officeTick(of, T) {
    of.screens.forEach((s, i) => { if (i % 3 === Math.floor(T * 30) % 3) s.update(T); else if (s.last < 0) s.update(T); });
  }

  _story(ctx) {
    const N = this.wtc.north, S = this.wtc.south;
    const st = ctx.film.story || {};
    const sT = this.storyT(ctx);
    const iN = st.impactN ?? 1e9, iS = st.impactS ?? 1e9, cS = st.collapseS ?? 1e9, cN = st.collapseN ?? 1e9;
    this.state = { iN, iS, cS, cN, sT };
    N.reset(); S.reset();
    const night = TIMES[this.time].night * 0.9;
    N.setNight(night, 0.25); S.setNight(night, 0.25);
    if (sT >= iN) {
      N.setDamage(clamp((sT - iN) / 0.25), [0, -1], [93, 99], 6, 0.2, 1, 3);
      N.setSoot(clamp((sT - iN) / 25) * 0.9);
    }
    if (sT >= iS) {
      S.setDamage(clamp((sT - iS) / 0.25), [0, 1], [77, 85], -12, -0.35, 1, 7);
      S.setSoot(clamp((sT - iS) / 25) * 0.9);
    }
    if (sT >= cS) S.setCollapse(clamp((sT - cS) / (st.collapseDur ?? 11)), floorY(80), 0.32, [-0.7, 0.7]);
    if (sT >= cN) N.setCollapse(clamp((sT - cN) / (st.collapseDur ?? 11)), floorY(96), 0.05, [0.3, 0.2]);
    if (this.towersGone) { N.group.visible = false; S.group.visible = false; }
    const dusty = clamp((sT - cS) / 6);
    this.city.mat.userData.U.uDust.value = Math.max(this.cityDust, sT >= cS && !this.towersGone ? dusty * 0.55 : 0);
    if (sT >= cS && this.mode === 'normal') { this.wtc.lowMat.userData.U.uDust.value = dusty * 0.7; } else this.wtc.lowMat.userData.U.uDust.value = this.lowsBurnt ? 0.8 : 0;
  }

  // shot helpers -------------------------------------------------------------
  flyPlane(plane, pts, u, bank = 0) {
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    let curve = plane.userData.curve;
    if (!curve || plane.userData.curveKey !== pts) { curve = plane.userData.curve = new THREE.CatmullRomCurve3(pts.map((a) => new THREE.Vector3(...a))); plane.userData.curveKey = pts; }
    curve.getPointAt(clamp(u), p);
    curve.getTangentAt(clamp(u), q);
    plane.position.copy(p);
    orient(plane, q, bank);
    plane.visible = true;
    return p;
  }

  late(ctx) {
    this._story(ctx);
    const cam = ctx.cam;
    const T = ctx.T;
    this.sky.position.copy(cam.position);
    focusSun(this.sun, this.focus, this.focusSize, 3000);
    // lightning
    let flash = 0;
    for (const lt of this.lightning) { const a = T - lt; if (a >= 0 && a < 0.6) flash = Math.max(flash, (a < 0.08 ? 1 : a < 0.16 ? 0.3 : a < 0.24 ? 0.85 : Math.exp(-(a - 0.24) * 9) * 0.8)); }
    this.sky.material.uniforms.flash.value = flash * 0.9;
    this.hemi.intensity = this.baseHemi + flash * 2.5;
    this.bolt.visible = flash > 0.25;
    if (this.bolt.visible && this.boltPos) { this.bolt.position.set(...this.boltPos); this.bolt.lookAt(cam.position.x, this.bolt.position.y, cam.position.z); }
    // ---- smoke / fire / dust ----
    const bb = this.bb;
    bb.begin();
    bb.setViewLight(cam, this.sun.userData.dir);
    const { iN, iS, cS, cN, sT } = this.state;
    const wind = [13, 0.2, 8];
    if (this.fxOn && this.mode === 'normal') {
      if (sT >= iN && sT < cN + 8) {
        const k = clamp((sT - iN) / 12);
        const top = sT >= cN ? clamp(1 - (sT - cN) / 8) : 1;
        smokePlume(bb, sT, {
          t0: iN, count: 520, life: 95, rise: 2.4, wind, size: [16, 300], growPow: 0.5,
          pos: (r1, r2) => [-26 + r1 * 52, floorY(93 + r2 * 7), -30 + r2 * 60],
          spread: [30, 14, 26], color: [0.085, 0.08, 0.075], alpha: 0.9 * top, intensity: 0.4 + 0.6 * k, fire: 0.45, fireFade: 70, seed: 1, startup: 4,
        });
        flames(bb, sT, { t0: iN + 0.5, count: 90, life: 1.2, size: 4.5, heat: 0.7, rise: 5, out: [0, 0, -2], intensity: 0.9 * top, seed: 11, pos: (r1, r2) => [-26 + r1 * 52, floorY(93) + r2 * 26, -32.5] });
        flames(bb, sT, { t0: iN + 4, count: 40, life: 1.2, size: 4, heat: 0.6, rise: 5, out: [2, 0, 0], intensity: 0.6 * top, seed: 12, pos: (r1, r2) => [32.5, floorY(93) + r2 * 24, -26 + r1 * 52] });
      }
      if (sT >= iS && sT < cS + 8) {
        const k = clamp((sT - iS) / 10);
        const top = sT >= cS ? clamp(1 - (sT - cS) / 6) : 1;
        smokePlume(bb, sT, {
          t0: iS, count: 380, life: 85, rise: 2.2, wind, size: [16, 260], growPow: 0.5,
          pos: (r1, r2) => [-38 - 26 + r1 * 52, floorY(77 + r2 * 8), 130 - 30 + r2 * 60],
          spread: [30, 12, 20], color: [0.1, 0.095, 0.09], alpha: 0.85 * top, intensity: 0.4 + 0.6 * k, fire: 0.45, fireFade: 70, seed: 2, startup: 3,
        });
        flames(bb, sT, { t0: iS + 0.6, count: 80, life: 1.2, size: 4.5, heat: 0.7, rise: 5, out: [0, 0, 2], intensity: 0.9 * top, seed: 13, pos: (r1, r2) => [-38 - 31 + r1 * 50, floorY(78) + r2 * 26, 130 + 32.5] });
        flames(bb, sT, { t0: iS + 0.6, count: 40, life: 1.2, size: 4.5, heat: 0.6, rise: 5, out: [2, 0, 0], intensity: 0.8 * top, seed: 14, pos: (r1, r2) => [-38 + 32.5, floorY(79) + r2 * 24, 130 - 10 + r1 * 40] });
      }
      if (sT >= cS) this._collapseFx(bb, sT, cS, [-38, 0, 130], floorY(80), 31);
      if (sT >= cN) this._collapseFx(bb, sT, cN, [0, 0, 0], floorY(96), 41);
      if (sT >= cN + 6) smokePlume(bb, sT, { t0: cN, count: 220, life: 80, rise: 2.2, wind: [7, 0.3, 5], size: [30, 260], pos: [-20, 20, 60], spread: [160, 20, 200], color: [0.32, 0.31, 0.29], alpha: 0.75, intensity: clamp((sT - cN - 6) / 10), seed: 5 });
    }
    if (this.mode === 'rubble' && this.fxOn) {
      // smouldering pile: many small plumes
      smokePlume(bb, T, { t0: -100, count: 360, life: 60, rise: 3.2, wind: [5, 0.2, 3], size: [6, 120], growPow: 0.6, pos: (r1, r2) => [-20 + (r1 - 0.5) * 180, 10 + r2 * 10, 65 + (r2 - 0.5) * 220], spread: [10, 4, 10], color: [0.36, 0.355, 0.35], alpha: this.rubbleSmoke ?? 0.5, seed: 9 });
    }
    for (const e of this.extra) e(bb, sT, cam);
    bb.end(cam);
    // sparks: rain + fireworks
    const sp = this.sparks;
    sp.begin();
    if (this.rainOn) rain(sp, T, cam, { count: 1400, radius: 45, height: 40, speed: 26, alpha: 0.22 * this.rainOn, size: 0.45, wind: 3 });
    if (this.fireworks) fireworks(sp, T, this.fireworks);
    sp.end(cam);
    // debris + papers
    const deb = this.debrisSpec, pap = this.paperSpec;
    if (deb) this.debris.update(sT, deb); else this.debris.mesh.count = 0;
    if (pap) this.papers.update(sT, pap); else this.papers.mesh.count = 0;
  }

  _collapseFx(bb, sT, t0, c, breakY, seed) {
    const dur = 11;
    dustCloud(bb, sT, {
      t0, count: 560, seed, spawn: dur, speed: 34, drag: 0.35, size: [20, 120], growT: 10, alpha: 0.88, rise: 1.2, jitter: 40,
      center: [c[0], 0, c[2]], color: [0.6, 0.58, 0.54],
      srcY: (r3, birth) => { const q = clamp((birth - t0) / dur); return breakY * (1 - q * q) + (r3 - 0.5) * 20; },
      sink: 9, floor: 6,
    });
    dustCloud(bb, sT, {
      t0: t0 + dur * 0.55, count: 600, seed: seed + 7, spawn: 9, speed: 75, drag: 0.09, size: [40, 180], growT: 14, alpha: 0.92, rise: 0.8, jitter: 60,
      center: [c[0], 10, c[2]], height: 50, color: [0.58, 0.565, 0.53], floor: 10,
    });
  }

  dispose() { super.dispose(); this.bb.dispose(); this.sparks.dispose(); }
}

const _m4 = new THREE.Matrix4(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion();
export function orient(obj, dir, bank) {
  _f.copy(dir).normalize();
  _r.crossVectors(new THREE.Vector3(0, 1, 0), _f).normalize();
  _u.crossVectors(_f, _r).normalize();
  _m4.makeBasis(_r, _u, _f);
  obj.quaternion.setFromRotationMatrix(_m4);
  if (bank) { _q.setFromAxisAngle(_f, bank); obj.quaternion.premultiply(_q); }
}
