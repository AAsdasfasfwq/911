// Procedural New York: Manhattan (downtown -> midtown), New Jersey and Brooklyn shores,
// harbour, bridges, landmarks. Thousands of buildings in a few instanced draw calls.
import * as THREE from 'three';
import { cityMaterial, std, M, waterMaterial } from './materials.js';
import { asphaltTex, concreteTex, grassTex, canvasTex, pixels } from './textures.js';
import { rng, fbm2, clamp, hash2 } from '../core/util.js';

// Manhattan outline (x east, z south; WTC North Tower at origin). Simplified but recognisable.
export const MANHATTAN = [
  [-330, 1180], [-120, 1290], [180, 1260], [480, 1080], [760, 820], [980, 520], [1150, 160], [1260, -260], [1500, -900],
  [1820, -1500], [1950, -2300], [1880, -3200], [1820, -4300], [1700, -5600], [1560, -7200], [1400, -9500],
  [-1900, -9500], [-1700, -7200], [-1500, -5600], [-1250, -4300], [-1000, -3200], [-820, -2200], [-700, -1300],
  [-620, -500], [-560, 100], [-520, 700], [-440, 1000],
];
const BROOKLYN = [[1500, 3500], [1450, 1600], [1420, 600], [1560, 100], [1700, -700], [2100, -1500], [2350, -2300], [2300, -3600], [2200, -5000], [2100, -9500], [9000, -9500], [9000, 3500]];
const JERSEY = [[-1850, 3500], [-1900, 1800], [-1800, 600], [-1820, -400], [-1950, -2000], [-2150, -4000], [-2450, -9500], [-9000, -9500], [-9000, 3500]];
const GOVERNORS = [[400, 2000], [900, 1900], [1100, 2300], [800, 2650], [380, 2500]];
const LIBERTY = [[-2350, 3350], [-2150, 3330], [-2120, 3520], [-2330, 3540]];

function inPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function distToPoly(x, z, poly) {
  let best = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

function islandMesh(poly, mat, depth = 4) {
  const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -depth + 0.02, 0);
  // planar UVs in world metres
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 60, p.getZ(i) / 60);
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// Building height model by district
function heightModel(x, z, r) {
  const d = (cx, cz, rad) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (rad * rad));
  const fidi = d(500, 450, 650);          // Financial District
  const wtcRing = d(0, 0, 500);           // around the WTC
  const civic = d(450, -500, 420);        // civic centre
  const midtown = d(150, -5600, 1500);
  const low = 1 - Math.max(fidi, midtown, civic * 0.7, wtcRing * 0.6);
  const n = 0.5 + 0.5 * fbm2(x / 400, z / 400, 3, 3);
  let h = 14 + 22 * n * low;
  h += fidi * (50 + 170 * Math.pow(r(), 1.6));
  h += wtcRing * (20 + 90 * Math.pow(r(), 2));
  h += civic * (25 + 80 * Math.pow(r(), 2));
  h += midtown * (40 + 200 * Math.pow(r(), 1.8));
  return h;
}

const PALETTE = {
  masonry: ['#8a5a48', '#9a6b52', '#7a4a3c', '#a88a6a', '#b8a080', '#c2b498', '#8e8478', '#6e6258', '#a4775c'],
  modern: ['#5a6670', '#6c7a84', '#3c4650', '#7a8a96', '#8a949a', '#4a5560', '#5f6b5a'],
  glass: ['#2c4a5e', '#335466', '#1f3a4c', '#3c5a6a', '#2a3f4f', '#406070'],
  stone: ['#bdb4a2', '#c8bfae', '#a8a090', '#d2c8b4', '#988f80'],
};

// discard a rectangle of ground (for the Ground Zero excavation)
export const HOLE = { value: new THREE.Vector4(0, 0, 0, 0) }; // x0, z0, x1, z1 (disabled when x0 == x1)
function holePatch(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHole = HOLE;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHoleW;').replace('#include <project_vertex>', `#include <project_vertex>
      vec4 hw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        hw = instanceMatrix * hw;
      #endif
      vHoleW = (modelMatrix * hw).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHoleW; uniform vec4 uHole;').replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uHole.x < uHole.z && vHoleW.x > uHole.x && vHoleW.x < uHole.z && vHoleW.z > uHole.y && vHoleW.z < uHole.w) discard;`);
  };
  m.customProgramCacheKey = () => 'hole1';
  return m;
}

export function makeCity(opts = {}) {
  const group = new THREE.Group();
  const r = rng(opts.seed ?? 911);
  const mat = cityMaterial({ lit: 0.35 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
  const items = [];
  const exclude = opts.exclude || ((x, z) => x > -150 && x < 130 && z > -140 && z < 260); // WTC superblock
  const add = (x, z, w, d, h, style) => {
    const pal = style === 0 ? PALETTE.glass : style === 1 ? PALETTE.masonry : style === 2 ? PALETTE.modern : PALETTE.stone;
    items.push({ x, z, w, d, h, c: new THREE.Color(pal[Math.floor(r() * pal.length)]) });
  };
  // Manhattan street grid: avenues every ~260m (x), streets every ~80m (z) — rotated slightly downtown
  const avW = 30, stW = 18;
  const pads = [];
  const bw = 230, bd = 62;
  const zMin = opts.zMin ?? -8000, zMax = 1300;
  for (let z = zMax; z > zMin; z -= bd + stW) {
    const farK = clamp((-z - 2500) / 6000); // thin out far north for perf
    for (let x = -1900; x < 2000; x += bw + avW) {
      const bx = x + bw / 2, bz = z - bd / 2;
      if (!inPoly(bx, bz, MANHATTAN)) continue;
      if (distToPoly(bx, bz, MANHATTAN) < 40) continue;
      pads.push([bx, bz, bw, bd]);
      // split block into lots
      let cx = x;
      while (cx < x + bw - 10) {
        const lw = Math.min(x + bw - cx, 18 + r() * 55);
        const lx = cx + lw / 2;
        cx += lw;
        if (exclude(lx, bz)) continue;
        if (!inPoly(lx, bz, MANHATTAN)) continue;
        if (farK > 0 && r() < farK * 0.35) continue;
        // parks
        if (Math.hypot(lx - 380, bz + 820) < 120) continue; // city hall park
        if (Math.hypot(lx - 40, bz - 1150) < 260) continue; // battery park
        if (Math.hypot(lx + 400, bz + 2600) < 120) continue; // washington sq
        const h = heightModel(lx, bz, r);
        const tall = h > 90;
        const style = tall ? (r() < 0.55 ? 0 : r() < 0.5 ? 2 : 3) : (r() < 0.6 ? 1 : r() < 0.5 ? 3 : 2);
        const depth = bd * (0.55 + r() * 0.42);
        const zz = bz + (r() - 0.5) * (bd - depth);
        add(lx, zz, lw - 2, depth, h, style);
        // setbacks for tall towers (wedding cake)
        if (h > 120 && r() < 0.6) {
          add(lx, zz, (lw - 2) * 0.7, depth * 0.7, h * (1.08 + r() * 0.15), style);
          if (r() < 0.5) add(lx, zz, (lw - 2) * 0.4, depth * 0.4, h * (1.2 + r() * 0.15), style);
        }
      }
    }
  }
  // Battery Park City (west of WTC) + World Financial Center
  for (let z = 1000; z > -700; z -= 70) for (let x = -500; x < -300; x += 70) {
    if (!inPoly(x, z, MANHATTAN) || distToPoly(x, z, MANHATTAN) < 35) continue;
    if (x > -330 && z > -120 && z < 300) continue;
    add(x + r() * 10, z, 40 + r() * 15, 40 + r() * 15, 40 + r() * 70, r() < 0.5 ? 1 : 3);
  }
  const wfc = [[-390, -60, 60, 60, 190], [-410, 80, 70, 60, 225], [-400, 220, 60, 55, 175], [-360, 330, 50, 50, 140]];
  for (const b of wfc) add(b[0], b[1], b[2], b[3], b[4], 2);
  // Brooklyn + Jersey low-rise rows near the waterline
  const shore = (poly, x0, x1, z0, z1, hBase, hVar, tallP) => {
    for (let z = z0; z > z1; z -= 46) for (let x = x0; x < x1; x += 52) {
      const px = x + r() * 12, pz = z + r() * 10;
      if (!inPoly(px, pz, poly) || distToPoly(px, pz, poly) < 30) continue;
      if (r() < 0.12) continue;
      let h = hBase + r() * hVar; if (r() < tallP) h += 40 + r() * 90;
      add(px, pz, 28 + r() * 16, 30 + r() * 12, h, r() < 0.7 ? 1 : 3);
    }
  };
  shore(BROOKLYN, 1400, 3400, 2400, -4000, 8, 18, 0.03);
  shore(JERSEY, -3800, -1800, 2400, -4000, 8, 16, 0.04);

  const inst = new THREE.InstancedMesh(boxGeo, mat, items.length);
  const d = new THREE.Object3D();
  items.forEach((b, i) => { d.position.set(b.x, 0, b.z); d.scale.set(b.w, b.h, b.d); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, b.c); });
  inst.castShadow = true; inst.receiveShadow = true;
  group.add(inst);

  // rooftop clutter: water towers & HVAC boxes on mid-rises
  const wtGeo = new THREE.CylinderGeometry(2.4, 2.4, 4.5, 10); wtGeo.translate(0, 4.5, 0);
  const wtRoof = new THREE.ConeGeometry(2.7, 2, 10); wtRoof.translate(0, 7.7, 0);
  const legs = new THREE.CylinderGeometry(0.15, 0.15, 2.3, 4); legs.translate(0, 1.1, 0);
  const wtMat = M('waterTower', () => std(0x7a5a3e, { r: 0.85 }));
  const roofBits = items.filter((b) => b.h < 90 && b.h > 18 && b.z > -4000);
  const wts = roofBits.filter((_, i) => hash2(i, 3) < 0.28);
  const wt = new THREE.InstancedMesh(wtGeo, wtMat, wts.length);
  const wtr = new THREE.InstancedMesh(wtRoof, wtMat, wts.length);
  wts.forEach((b, i) => { d.position.set(b.x + (hash2(i, 5) - 0.5) * b.w * 0.5, b.h, b.z + (hash2(i, 7) - 0.5) * b.d * 0.5); d.scale.set(1, 1, 1); d.updateMatrix(); wt.setMatrixAt(i, d.matrix); wtr.setMatrixAt(i, d.matrix); });
  wt.castShadow = true; group.add(wt, wtr);
  const hv = roofBits.filter((_, i) => hash2(i, 9) < 0.5);
  const hvGeo = new THREE.BoxGeometry(1, 1, 1); hvGeo.translate(0, 0.5, 0);
  const hvm = new THREE.InstancedMesh(hvGeo, M('hvac', () => std(0x8a8c8e, { r: 0.6, m: 0.4 })), hv.length);
  hv.forEach((b, i) => { d.position.set(b.x + (hash2(i, 11) - 0.5) * b.w * 0.4, b.h, b.z + (hash2(i, 13) - 0.5) * b.d * 0.4); d.scale.set(4 + hash2(i, 1) * 6, 2 + hash2(i, 2) * 2.5, 3 + hash2(i, 3) * 5); d.updateMatrix(); hvm.setMatrixAt(i, d.matrix); });
  group.add(hvm);

  // ground: islands + water
  const groundMat = M('cityGround', () => {
    const t = canvasTex(512, 512, (g, w, h) => {
      pixels(g, w, h, (x, y) => { const v = 58 + hash2(x, y) * 14 + fbm2(x / 64, y / 64, 4, 3) * 10; return [v, v, v * 1.04]; });
    });
    t.repeat.set(1, 1);
    return holePatch(new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  });
  for (const poly of [MANHATTAN, BROOKLYN, JERSEY, GOVERNORS, LIBERTY]) group.add(islandMesh(poly, groundMat, 5));
  // sidewalk pads per block
  const padGeo = new THREE.BoxGeometry(1, 1, 1); padGeo.translate(0, 0.5, 0);
  const padMat = M('padMat', () => { const t = concreteTex(0.85); return holePatch(new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, color: 0xb8b4ac })); });
  const padM = new THREE.InstancedMesh(padGeo, padMat, pads.length);
  pads.forEach((b, i) => { d.position.set(b[0], 0, b[1]); d.scale.set(b[2] + 6, 0.25, b[3] + 6); d.updateMatrix(); padM.setMatrixAt(i, d.matrix); });
  padM.receiveShadow = true; group.add(padM);
  // parks
  const park = M('parkGrass', () => { const t = grassTex(); t.repeat.set(20, 20); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); });
  for (const [x, z, rad] of [[380, -820, 120], [40, 1120, 230], [-400, -2600, 110], [800, 2250, 260]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(rad, 32), park); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.12, z); p.receiveShadow = true; group.add(p);
  }
  // park trees (instanced spheres)
  const treeGeo = new THREE.IcosahedronGeometry(1, 1); treeGeo.translate(0, 1.2, 0);
  const trees = new THREE.InstancedMesh(treeGeo, M('parkTree', () => std(0x3f6a34, { r: 0.9, flat: true })), 600);
  let ti = 0;
  for (const [x, z, rad] of [[380, -820, 110], [40, 1120, 220], [-400, -2600, 100]]) for (let k = 0; k < 180 && ti < 600; k++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * rad;
    d.position.set(x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr); const s = 4 + r() * 4; d.scale.set(s, s * 1.1, s); d.updateMatrix(); trees.setMatrixAt(ti++, d.matrix);
  }
  trees.count = ti; trees.castShadow = true; group.add(trees);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), waterMaterial(0x16303c, { rep: 400, r: 0.08, bump: 0.25 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.2; water.receiveShadow = true;
  holePatch(water.material);
  group.add(water);

  // landmarks
  const lm = makeLandmarks(mat);
  group.add(lm);
  const bridges = makeBridges();
  group.add(bridges);

  return { group, mat, inst, water, items };
}

function makeLandmarks(cityMat) {
  const g = new THREE.Group();
  const stone = M('lmStone', () => std(0xb8ae9c, { r: 0.75 }));
  const steel = M('lmSteel', () => std(0xc8ccd0, { r: 0.3, m: 0.9 }));
  const box = (x, z, w, d, y0, h, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  // Empire State Building
  const es = [-300, -5600];
  const esm = cityMaterial(); esm.color.set(0xb7ac98);
  const tiers = [[90, 60, 0, 25], [70, 50, 25, 255], [50, 36, 255, 290], [36, 26, 290, 320], [18, 14, 320, 360]];
  for (const [w, d, y0, y1] of tiers) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, d), esm); m.position.set(es[0], (y0 + y1) / 2, es[1]); m.castShadow = true; g.add(m); }
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.5, 60, 8), steel); sp.position.set(es[0], 390, es[1]); g.add(sp);
  // Chrysler
  const ch = [500, -6100];
  box(ch[0], ch[1], 45, 45, 0, 200, M('chryslerBody', () => std(0xb0a898, { r: 0.6 })));
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(14 - i * 2.4, 16 - i * 2.4, 14, 8, 1, false), steel); c.position.set(ch[0], 207 + i * 14, ch[1]); g.add(c); }
  const csp = new THREE.Mesh(new THREE.ConeGeometry(2.5, 50, 8), steel); csp.position.set(ch[0], 310, ch[1]); g.add(csp);
  // Woolworth Building (gothic)
  const ww = [330, -330];
  box(ww[0], ww[1], 60, 45, 0, 110, stone);
  box(ww[0], ww[1], 30, 30, 110, 80, stone);
  const wwt = new THREE.Mesh(new THREE.ConeGeometry(17, 50, 4), M('copperGreen', () => std(0x5f8f7f, { r: 0.6, m: 0.3 }))); wwt.rotation.y = Math.PI / 4; wwt.position.set(ww[0], 215, ww[1]); g.add(wwt);
  // 40 Wall St (pyramid spire)
  const fw = [720, 380];
  box(fw[0], fw[1], 40, 40, 0, 220, stone);
  const fwt = new THREE.Mesh(new THREE.ConeGeometry(22, 60, 4), M('copperGreen2', () => std(0x4f8070, { r: 0.6, m: 0.3 }))); fwt.rotation.y = Math.PI / 4; fwt.position.set(fw[0], 250, fw[1]); g.add(fwt);
  // Statue of Liberty (stylised)
  const sl = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 47, 8), stone); ped.position.y = 23.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4, 7, 34, 10), M('libertyCopper', () => std(0x6fa891, { r: 0.55, m: 0.2 }))); body.position.y = 64;
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), body.material); head.position.y = 84;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 14, 6), body.material); arm.position.set(3, 88, 0); arm.rotation.z = -0.2;
  const torch = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffa040, emissiveIntensity: 4 })); torch.position.set(4.5, 96, 0);
  sl.add(ped, body, head, arm, torch);
  sl.position.set(-2240, 0, 3440);
  sl.traverse((o) => (o.castShadow = true));
  g.add(sl);
  return g;
}

function makeBridges() {
  const g = new THREE.Group();
  const stone = M('bridgeStone', () => std(0x9a8a76, { r: 0.85 }));
  const deckMat = M('bridgeDeck', () => std(0x5a5650, { r: 0.8 }));
  const cableMat = M('bridgeCable', () => std(0x4a4a4c, { r: 0.6, m: 0.6 }));
  const mk = (x0, z0, x1, z1, towerH, towerW, isSteel) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    const b = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 26), deckMat); deck.position.set(len / 2, 40, 0); b.add(deck);
    const tmat = isSteel ? cableMat : stone;
    for (const f of [0.28, 0.72]) {
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, 9), tmat); leg.position.set(len * f, towerH / 2, s * 10); b.add(leg); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(towerW, 16, 30), tmat); top.position.set(len * f, towerH - 8, 0); b.add(top);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(towerW, 8, 30), tmat); mid.position.set(len * f, 52, 0); b.add(mid);
    }
    // main cables as catenary tubes
    for (const s of [-1, 1]) {
      const pts = [];
      const a = len * 0.28, c = len * 0.72;
      pts.push(new THREE.Vector3(0, 44, s * 11));
      for (let i = 0; i <= 24; i++) { const x = a + (c - a) * i / 24, t = (x - a) / (c - a); pts.push(new THREE.Vector3(x, towerH - 4 - Math.sin(t * Math.PI) * (towerH - 50), s * 11)); }
      pts.push(new THREE.Vector3(len, 44, s * 11));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.6, 5), cableMat); b.add(tube);
    }
    b.position.set(x0, 0, z0); b.rotation.y = -ang;
    b.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    g.add(b);
  };
  mk(980, -380, 1600, -700, 84, 12, false); // Brooklyn Bridge
  mk(1400, -1300, 2050, -1700, 98, 8, true); // Manhattan Bridge
  return g;
}

export { inPoly };
