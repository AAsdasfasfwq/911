// Props library: furniture, electronics (CRT TVs / monitors with live screens), street
// furniture, trees, airport security, military camp items, flags, rubble.
import * as THREE from 'three';
import { std, M, MAT } from './materials.js';
import { flagTex, woodTex, canvasTex, cached, radialTex } from './textures.js';
import { rng, hash } from '../core/util.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o; };
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, parent, seg = 16) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o; };
export { box, cyl };

const glowM = (c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });

// ---------- office ----------
export function makeDesk(o = {}) {
  const g = new THREE.Group();
  const top = M('deskTop', () => std(0x7a5a3e, { r: 0.55, map: woodTex([150, 110, 74]) }));
  const leg = M('deskLeg', () => std(0x3a3a3c, { r: 0.4, m: 0.6 }));
  box(1.6, 0.04, 0.8, top, 0, 0.74, 0, g);
  box(0.04, 0.72, 0.75, leg, -0.76, 0.36, 0, g); box(0.04, 0.72, 0.75, leg, 0.76, 0.36, 0, g);
  box(1.5, 0.5, 0.02, leg, 0, 0.45, -0.37, g);
  if (o.drawers !== false) box(0.42, 0.6, 0.7, M('drawers', () => std(0x5a5a5e, { r: 0.5, m: 0.3 })), 0.52, 0.42, 0, g);
  return g;
}
export function makeChair(color = 0x24262c) {
  const g = new THREE.Group();
  const fab = M('chairFab' + color, () => std(color, { r: 0.85 }));
  const met = M('chairMet', () => std(0x2a2a2c, { r: 0.4, m: 0.7 }));
  box(0.5, 0.08, 0.48, fab, 0, 0.48, 0, g);
  const back = box(0.46, 0.55, 0.06, fab, 0, 0.82, -0.24, g); back.rotation.x = -0.1;
  cyl(0.03, 0.03, 0.36, met, 0, 0.27, 0, g);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const l = box(0.3, 0.03, 0.04, met, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, g); l.rotation.y = -a; }
  return g;
}
// CRT monitor with a canvas screen texture (Screen.tex)
export function makeCRT(screenTex, o = {}) {
  const g = new THREE.Group();
  const shell = M('crtShell' + (o.color || ''), () => std(o.color || 0xd8d2c4, { r: 0.6 }));
  box(0.42, 0.36, 0.38, shell, 0, 0.26, -0.05, g);
  const back = box(0.3, 0.26, 0.2, shell, 0, 0.26, -0.3, g);
  box(0.2, 0.06, 0.2, shell, 0, 0.03, -0.05, g);
  const sm = screenTex ? new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }) : MAT.darkGlass();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), sm);
  scr.position.set(0, 0.27, 0.141); g.add(scr);
  g.userData.screen = scr;
  return g;
}
// CRT television
export function makeTV(screenTex, o = {}) {
  const g = new THREE.Group();
  const shell = M('tvShell' + (o.color || ''), () => std(o.color || 0x1c1c1e, { r: 0.45, m: 0.2 }));
  const W = o.w || 0.75, H = o.h || 0.58;
  box(W, H, 0.5, shell, 0, H / 2, -0.15, g);
  box(W * 0.7, H * 0.7, 0.3, shell, 0, H / 2, -0.5, g);
  const sm = screenTex ? new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }) : MAT.darkGlass();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.84, H * 0.8), sm);
  scr.position.set(-W * 0.02, H / 2, 0.101); g.add(scr);
  box(W * 0.1, 0.02, 0.01, glowM(0xff3020, 2), W * 0.4, H * 0.1, 0.105, g);
  g.userData.screen = scr;
  return g;
}
export function makeKeyboard() { const g = new THREE.Group(); box(0.45, 0.025, 0.16, M('kb', () => std(0xd4cec0, { r: 0.6 })), 0, 0.0125, 0, g); return g; }
export function makePhone() {
  const g = new THREE.Group(); const m = M('phoneBody', () => std(0x2a2a2c, { r: 0.5 }));
  box(0.2, 0.06, 0.2, m, 0, 0.03, 0, g); const h = box(0.22, 0.04, 0.05, m, 0, 0.08, 0.04, g); return g;
}
export function makeLamp(o = {}) {
  const g = new THREE.Group();
  const met = M('lampMet', () => std(0x2a2a2a, { r: 0.4, m: 0.7 }));
  cyl(0.12, 0.14, 0.03, met, 0, 0.015, 0, g);
  cyl(0.012, 0.012, 0.5, met, 0, 0.27, 0, g);
  const shade = cyl(0.08, 0.16, 0.18, M('lampShade', () => std(0xf2e6c8, { r: 0.8, emissive: 0xffc070, ei: 0.6 })), 0, 0.55, 0, g, 18);
  shade.material.side = THREE.DoubleSide;
  const l = new THREE.PointLight(0xffc880, o.intensity ?? 2.5, 6, 2); l.position.set(0, 0.5, 0); g.add(l);
  g.userData.light = l;
  return g;
}
export function makeSofa(color = 0x6a4a3a) {
  const g = new THREE.Group(); const f = M('sofa' + color, () => std(color, { r: 0.9 }));
  box(2.0, 0.42, 0.85, f, 0, 0.25, 0, g); box(2.0, 0.55, 0.2, f, 0, 0.6, -0.33, g);
  box(0.22, 0.35, 0.85, f, -1.0, 0.55, 0, g); box(0.22, 0.35, 0.85, f, 1.0, 0.55, 0, g);
  for (const x of [-0.5, 0.5]) box(0.92, 0.12, 0.65, f, x, 0.52, 0.06, g);
  return g;
}
export function makeCubicle() {
  const g = new THREE.Group();
  const p = M('cubiclePanel', () => std(0x8a8678, { r: 0.95 }));
  box(1.8, 1.4, 0.06, p, 0, 0.7, -0.9, g); box(0.06, 1.4, 1.8, p, -0.9, 0.7, 0, g);
  const d = makeDesk({ drawers: true }); d.position.set(0, 0, -0.45); g.add(d);
  return g;
}
export function makeFileCabinet() { const g = new THREE.Group(); const m = M('fileCab', () => std(0x6a6c6e, { r: 0.5, m: 0.5 })); box(0.5, 1.3, 0.65, m, 0, 0.65, 0, g); for (let i = 0; i < 4; i++) box(0.4, 0.02, 0.02, MAT.chrome(), 0, 0.25 + i * 0.3, 0.33, g); return g; }
export function makePaperStack(n = 20, seed = 1) {
  const g = new THREE.Group(); const r = rng(seed); const m = M('paperStack', () => std(0xf2efe6, { r: 0.9 }));
  for (let i = 0; i < n; i++) { const p = box(0.21, 0.004, 0.297, m, (r() - 0.5) * 0.02, i * 0.005, (r() - 0.5) * 0.02, g); p.rotation.y = (r() - 0.5) * 0.15; }
  return g;
}
export function makePlant() {
  const g = new THREE.Group();
  cyl(0.18, 0.14, 0.35, M('pot', () => std(0x8a4a2a, { r: 0.8 })), 0, 0.175, 0, g);
  const lm = M('leaf', () => std(0x3a7a3a, { r: 0.7, flat: true }));
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.7, 4), lm); const a = (i / 9) * Math.PI * 2; l.position.set(Math.cos(a) * 0.08, 0.6, Math.sin(a) * 0.08); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); l.castShadow = true; g.add(l); }
  return g;
}
export function makeCeilingLight(w = 1.2, d = 0.6, i = 3) {
  const g = new THREE.Group();
  box(w + 0.06, 0.04, d + 0.06, M('lightFrame', () => std(0xdedede, { r: 0.5 })), 0, 0, 0, g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), glowM(0xfff6e8, i)); p.rotation.x = Math.PI / 2; p.position.y = -0.021; g.add(p);
  return g;
}
export function makeClock(o = {}) {
  const g = new THREE.Group();
  const face = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f4f1ea'; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 10, 6, 20); }
  }, { clamp: true });
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 })); g.add(f);
  const hm = M('clockHand', () => std(0x111111, { r: 0.5 }));
  const hh = new THREE.Group(), mh = new THREE.Group(), sh = new THREE.Group();
  const mk = (len, w, grp, col) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.004), col || hm); b.position.y = len / 2 - 0.01; grp.add(b); grp.position.z = 0.006; g.add(grp); };
  mk(0.09, 0.012, hh); mk(0.14, 0.008, mh); mk(0.15, 0.003, sh, M('clockSec', () => std(0xc8232c, { r: 0.5 })));
  g.userData.set = (h, m, s) => { hh.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; mh.rotation.z = -(m + s / 60) / 60 * Math.PI * 2; sh.rotation.z = -s / 60 * Math.PI * 2; };
  return g;
}
// alarm clock (digital, red LED)
export function makeAlarmClock(screen) {
  const g = new THREE.Group();
  box(0.2, 0.09, 0.09, M('alarmBody', () => std(0x1a1a1c, { r: 0.4 })), 0, 0.045, 0, g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false })); s.position.set(0, 0.048, 0.046); g.add(s);
  return g;
}

// ---------- street ----------
export function makeStreetLamp(on = false) {
  const g = new THREE.Group(); const m = M('lampPost', () => std(0x2e3a34, { r: 0.5, m: 0.6 }));
  cyl(0.09, 0.13, 7.5, m, 0, 3.75, 0, g, 10);
  const arm = box(0.08, 0.08, 1.8, m, 0, 7.4, 0.85, g);
  const head = box(0.35, 0.15, 0.6, m, 0, 7.35, 1.7, g);
  const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), on ? glowM(0xffd29a, 6) : M('bulbOff', () => std(0xdedad0, { r: 0.3 })));
  bulb.rotation.x = Math.PI / 2; bulb.position.set(0, 7.27, 1.7); g.add(bulb);
  return g;
}
export function makeTrafficLight() {
  const g = new THREE.Group(); const m = M('tlPole', () => std(0x2a2a2a, { r: 0.5, m: 0.5 }));
  cyl(0.08, 0.1, 5.2, m, 0, 2.6, 0, g, 10);
  const arm = box(0.08, 0.08, 4, m, 0, 5.1, 2, g);
  const housing = box(0.35, 1.0, 0.3, M('tlHousing', () => std(0xc8a020, { r: 0.5 })), 0, 4.55, 3.6, g);
  const cols = [0x401010, 0x403010, 0x20ff40];
  cols.forEach((c, i) => { const l = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), i === 2 ? glowM(0x40ff70, 4) : M('tlOff' + i, () => std(c, { r: 0.3 }))); l.position.set(0, 4.85 - i * 0.3, 3.76); g.add(l); });
  return g;
}
export function makeHydrant() { const g = new THREE.Group(); const m = M('hydrant', () => std(0xc8a020, { r: 0.5 })); cyl(0.12, 0.14, 0.6, m, 0, 0.3, 0, g); cyl(0.14, 0.1, 0.12, m, 0, 0.65, 0, g); box(0.38, 0.08, 0.08, m, 0, 0.4, 0, g); return g; }
export function makeTrash() { const g = new THREE.Group(); cyl(0.3, 0.27, 0.9, M('trash', () => std(0x2a4a32, { r: 0.6, m: 0.3 })), 0, 0.45, 0, g, 14); return g; }
export function makeNewsBox(color = 0x1c3a8a) { const g = new THREE.Group(); box(0.5, 1.0, 0.45, M('newsbox' + color, () => std(color, { r: 0.5 })), 0, 0.5, 0, g); return g; }
export function makeBench() {
  const g = new THREE.Group(); const w = M('benchWood', () => std(0x6a4a2a, { r: 0.7, map: woodTex([120, 80, 46]) })); const m = M('benchMet', () => std(0x1a1a1a, { r: 0.5, m: 0.6 }));
  for (let i = 0; i < 3; i++) box(1.8, 0.04, 0.1, w, 0, 0.45, -0.15 + i * 0.13, g);
  for (let i = 0; i < 2; i++) { const b = box(1.8, 0.1, 0.04, w, 0, 0.65 + i * 0.13, -0.25, g); b.rotation.x = -0.15; }
  for (const x of [-0.8, 0.8]) box(0.06, 0.45, 0.45, m, x, 0.225, 0, g);
  return g;
}
const leafMats = {};
export function makeTree(kind = 'oak', seed = 1, o = {}) {
  const g = new THREE.Group(); const r = rng(seed);
  const bark = M('bark', () => std(0x4a3628, { r: 0.95 }));
  const leafCol = o.color || (kind === 'pine' ? 0x2a4a2a : kind === 'autumn' ? [0xc86a2a, 0xd8a030, 0xa83a24, 0x8a7a2a][seed % 4] : kind === 'olive' ? 0x6a7a4a : 0x4a7a34);
  const lm = M('leaf' + leafCol, () => std(leafCol, { r: 0.85, flat: true }));
  if (kind === 'palm') {
    const H = 7 + r() * 4;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(r() * 1.5, H * 0.6, 0), new THREE.Vector3(r() * 1.2, H, r() * 0.5));
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.2, 8), M('palmBark', () => std(0x8a7458, { r: 0.95 }))); trunk.castShadow = true; g.add(trunk);
    const top = curve.getPoint(1);
    const fm = M('frond', () => std(0x4a7a2a, { r: 0.8, side: THREE.DoubleSide, flat: true }));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r();
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.8, 1, 4), fm);
      const p = fr.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -(((y + 1.9) / 3.8) ** 2) * 1.4); p.setX(k, p.getX(k) * (1 - (y + 1.9) / 4.2)); }
      fr.geometry.translate(0, 1.9, 0); fr.geometry.computeVertexNormals();
      fr.position.copy(top); fr.rotation.set(-1.15 + r() * 0.3, a, 0, 'YXZ'); fr.castShadow = true; g.add(fr);
    }
    return g;
  }
  if (kind === 'pine') {
    const H = 6 + r() * 6; cyl(0.15, 0.25, H * 0.3, bark, 0, H * 0.15, 0, g, 8);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(H * 0.28 * (1 - i * 0.2), H * 0.38, 9), lm); c.position.y = H * (0.3 + i * 0.17); c.castShadow = true; g.add(c); }
    return g;
  }
  const H = (o.h || 5) + r() * 2.5; cyl(0.14, 0.22, H * 0.5, bark, 0, H * 0.25, 0, g, 8);
  for (let i = 0; i < 6; i++) {
    const s = H * (0.22 + r() * 0.14); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), lm);
    b.position.set((r() - 0.5) * H * 0.35, H * (0.62 + r() * 0.25), (r() - 0.5) * H * 0.35); b.scale.y = 0.85; b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  return g;
}
export function makeBush(seed = 1, color = 0x3f6a2e) {
  const g = new THREE.Group(); const r = rng(seed); const lm = M('bush' + color, () => std(color, { r: 0.9, flat: true }));
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.3, 1), lm); b.position.set((r() - 0.5) * 0.9, 0.35, (r() - 0.5) * 0.9); b.castShadow = true; g.add(b); }
  return g;
}

// ---------- flags (waving shader) ----------
export function makeFlag(kind = 'us', w = 1.9, h = 1.0, o = {}) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w, h, 24, 12); geo.translate(w / 2, 0, 0);
  const m = new THREE.MeshStandardMaterial({ map: flagTex(kind), roughness: 0.8, side: THREE.DoubleSide });
  const U = { uT: { value: 0 }, uAmp: { value: o.amp ?? 1 }, uW: { value: w } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uAmp; uniform float uW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = position.x / uW;
        transformed.z += sin(position.x * 3.0 - uT * 6.0) * 0.12 * k * uAmp + sin(position.x * 7.0 + position.y * 2.0 - uT * 9.0) * 0.04 * k * uAmp;
        transformed.y -= k * k * 0.1 * (1.0 - uAmp * 0.5);`);
  };
  m.customProgramCacheKey = () => 'flag1';
  const flag = new THREE.Mesh(geo, m); flag.castShadow = true;
  if (o.pole !== false) { cyl(0.04, 0.05, o.poleH ?? 6, M('flagpole', () => std(0xd8d8d8, { r: 0.3, m: 0.9 })), 0, (o.poleH ?? 6) / 2, 0, g, 8); flag.position.y = (o.poleH ?? 6) - h / 2 - 0.1; }
  g.add(flag);
  g.userData.tick = (t) => (U.uT.value = t);
  g.userData.flag = flag;
  g.userData.U = U;
  return g;
}

// ---------- airport ----------
export function makeMetalDetector() {
  const g = new THREE.Group(); const m = M('mdBody', () => std(0xb8bcc0, { r: 0.5, m: 0.3 }));
  box(0.18, 2.1, 0.6, m, -0.5, 1.05, 0, g); box(0.18, 2.1, 0.6, m, 0.5, 1.05, 0, g); box(1.18, 0.2, 0.6, m, 0, 2.2, 0, g);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.02), glowM(0x40ff60, 3)); led.position.set(0, 2.2, 0.31); g.add(led);
  g.userData.led = led;
  return g;
}
export function makeXray(screenTex) {
  const g = new THREE.Group(); const m = M('xrayBody', () => std(0xc8ccd0, { r: 0.5, m: 0.3 }));
  box(1.0, 1.0, 1.6, m, 0, 1.2, 0, g);
  box(0.7, 0.05, 4.2, M('belt', () => std(0x1a1a1a, { r: 0.9 })), 0, 0.78, 0, g);
  box(0.9, 0.7, 4.2, M('xrayBase', () => std(0x8a8e92, { r: 0.6 })), 0, 0.4, 0, g);
  const cur = box(0.8, 0.6, 0.02, M('curtain', () => std(0x3a3a3a, { r: 0.9, transparent: true, opacity: 0.85 })), 0, 1.1, 0.81, g);
  if (screenTex) { const mon = makeCRT(screenTex, { color: 0x2a2a2c }); mon.position.set(0.85, 1.1, -0.3); mon.rotation.y = -0.6; g.add(mon); }
  return g;
}
export function makeStanchion() { const g = new THREE.Group(); cyl(0.03, 0.03, 0.95, MAT.chrome(), 0, 0.48, 0, g, 8); cyl(0.17, 0.17, 0.04, MAT.chrome(), 0, 0.02, 0, g, 16); return g; }
export function makeBin() { const g = new THREE.Group(); box(0.6, 0.12, 0.45, M('xbin', () => std(0x6a6e74, { r: 0.6 })), 0, 0.06, 0, g); return g; }
export function makeBag(color = 0x2a2a3a, seed = 1) {
  const g = new THREE.Group(); const m = M('bag' + color, () => std(color, { r: 0.85 }));
  const b = box(0.5, 0.35, 0.22, m, 0, 0.175, 0, g); const h = box(0.25, 0.04, 0.04, MAT.black(), 0, 0.38, 0, g); return g;
}

// ---------- military / desert ----------
export function makeTent(color = 0xc8b48a, w = 6, l = 8) {
  const g = new THREE.Group();
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, 1.6), new THREE.Vector2(0, 3.0), new THREE.Vector2(-w / 2, 1.6)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false }); geo.translate(0, 0, -l / 2);
  const t = new THREE.Mesh(geo, M('tent' + color, () => std(color, { r: 0.95 }))); t.castShadow = t.receiveShadow = true; g.add(t);
  return g;
}
export function makeSandbags(n = 8, seed = 2) {
  const g = new THREE.Group(); const r = rng(seed); const m = M('sandbag', () => std(0xb8a07a, { r: 0.95 }));
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.35, 3, 8), m); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 0.6); b.position.set((i % 4) * 0.62 - 0.9 + (Math.floor(i / 4) % 2) * 0.3, 0.12 + Math.floor(i / 4) * 0.2, 0); b.rotation.y = (r() - 0.5) * 0.2; b.castShadow = true; g.add(b); }
  return g;
}
export function makeBarrel(color = 0x3a5a3a) { const g = new THREE.Group(); cyl(0.3, 0.3, 0.9, M('barrel' + color, () => std(color, { r: 0.6, m: 0.4 })), 0, 0.45, 0, g, 14); return g; }
export function makeCrate(s = 1) { const g = new THREE.Group(); box(s, s * 0.7, s * 0.8, M('crate', () => std(0x8a7048, { r: 0.85, map: woodTex([150, 120, 80]) })), 0, s * 0.35, 0, g); return g; }

// ---------- debris / rubble ----------
export function makeBeam(len = 6, seed = 1, twist = 0.4) {
  // twisted I-beam (rubble) as a bent box chain
  const g = new THREE.Group(); const r = rng(seed);
  const m = M('rustSteel', () => std(0x5a4a3c, { r: 0.75, m: 0.6 }));
  const segs = 6; let x = 0, y = 0, a = 0;
  for (let i = 0; i < segs; i++) {
    const l = len / segs; a += (r() - 0.5) * twist;
    const b = new THREE.Mesh(new THREE.BoxGeometry(l * 1.05, 0.35, 0.3), m);
    b.position.set(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, 0); b.rotation.z = a; b.castShadow = true; b.receiveShadow = true; g.add(b);
    x += Math.cos(a) * l; y += Math.sin(a) * l;
  }
  return g;
}
// facade remnant (iconic WTC lattice "trident" fragment)
export function makeFacadeRemnant(h = 25, w = 12) {
  const g = new THREE.Group(); const m = M('remnantSteel', () => std(0x8a8680, { r: 0.6, m: 0.7 }));
  const n = Math.floor(w / 1.02);
  for (let i = 0; i < n; i++) {
    const hh = h * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.9 + 1.3))) * (1 - Math.abs(i - n / 2) / n * 0.6);
    const c = box(0.42, hh, 0.36, m, i * 1.02 - w / 2, hh / 2, 0, g);
    c.rotation.z = (hash(i * 3) - 0.5) * 0.05;
  }
  for (let k = 0; k < 4; k++) box(w, 0.5, 0.3, m, 0, 3 + k * 3.8, 0.1, g);
  // arches at base
  for (let i = 0; i < n / 3; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.2, 6, 12, Math.PI), m); a.position.set(i * 3.06 - w / 2 + 1.5, 5, 0); g.add(a); }
  return g;
}

// ---------- signage / boards ----------
export function makeSign(tex, w, h, o = {}) {
  const m = o.emissive ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(o.emissive, o.emissive, o.emissive) }) : new THREE.MeshStandardMaterial({ map: tex, roughness: o.r ?? 0.6 });
  if (o.transparent) { m.transparent = true; m.depthWrite = false; }
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  if (o.side) m.side = THREE.DoubleSide;
  return p;
}

// blob contact shadow under objects/people
export function makeContactShadow(w = 0.8, d = 0.8, a = 0.55) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: radialTex('shadow', `rgba(0,0,0,${a})`), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.renderOrder = 2;
  return m;
}

export function makePodium(sealTex) {
  const g = new THREE.Group(); const w = M('podiumWood', () => std(0x5a3a24, { r: 0.55, map: woodTex([110, 70, 40]) }));
  box(0.75, 1.15, 0.5, w, 0, 0.575, 0, g);
  const top = box(0.85, 0.06, 0.6, w, 0, 1.18, 0.03, g); top.rotation.x = 0.2;
  if (sealTex) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.4, metalness: 0.3 })); s.position.set(0, 0.75, 0.252); g.add(s); }
  const mic = cyl(0.008, 0.008, 0.3, MAT.black(), 0, 1.35, 0.15, g, 6); mic.rotation.x = 0.5;
  return g;
}
