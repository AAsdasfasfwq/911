// Interior "pods": many small rooms living in one scene, built lazily and shown one at a
// time (only the active pod's lights are rendered). Each pod has its own lighting rig.
import * as THREE from 'three';
import { BaseSet, envRoom, sunLight, focusSun } from '../core/stage.js';
import { makeRoom } from '../assets/buildings.js';
import { Person, Crowd } from '../assets/people.js';
import { std, M, MAT } from '../assets/materials.js';
import { box, cyl, makeDesk, makeChair, makeCRT, makeTV, makeKeyboard, makePhone, makeLamp, makeSofa, makeCubicle, makeFileCabinet, makePaperStack,
  makePlant, makeCeilingLight, makeClock, makeAlarmClock, makeFlag, makePodium, makeContactShadow, makeMetalDetector, makeXray, makeStanchion, makeBin, makeBag, makeSign, makeCrate } from '../assets/props.js';
import { Screen, canvasTex, carpetTex, tileTex, woodTex, cached, brickTex, concreteTex, makeCanvas } from '../assets/textures.js';
import * as SCR from '../assets/screens.js';
import { rng, clamp, hash, E } from '../core/util.js';
import { docDraw } from '../shots/infokit.js';

const glow = (c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });

// TV screen material: inset footage (HDR render target) + 2D graphics layer + CRT scanlines
export function tvMaterial(chyronTex) {
  const U = { tFeed: { value: null }, tGfx: { value: chyronTex || null }, uOn: { value: 1 }, uT: { value: 0 }, uGain: { value: 0.75 }, uHasGfx: { value: chyronTex ? 1 : 0 }, uHasFeed: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tFeed; uniform sampler2D tGfx; uniform float uOn; uniform float uT; uniform float uGain; uniform float uHasGfx; uniform float uHasFeed; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      void main(){
        vec2 uv = vUv; vec2 d = uv - 0.5; uv = 0.5 + d * (1.0 + dot(d,d) * 0.12);
        vec3 c = uHasFeed > 0.5 ? aces(texture2D(tFeed, uv).rgb * 1.1) : vec3(0.02, 0.03, 0.05);
        if (uHasGfx > 0.5) { vec4 gfx = texture2D(tGfx, uv); c = mix(c, gfx.rgb, gfx.a); }
        c *= 0.82 + 0.18 * sin(uv.y * 900.0);
        c *= 1.0 - smoothstep(0.35, 0.72, length(d));
        c = pow(c, vec3(2.2)) * uGain * 3.0;
        gl_FragColor = vec4(c * uOn, 1.0);
      }`,
  });
  m.userData.U = U;
  return m;
}

const PODS = {};
function pod(name, fn) { PODS[name] = fn; }

// ---------- helpers ----------
function roomLights(g, list) { const L = []; for (const [type, col, int, x, y, z, dist] of list) { let l; if (type === 'p') { l = new THREE.PointLight(col, int, dist ?? 14, 1.6); } else if (type === 's') { l = new THREE.SpotLight(col, int, dist ?? 20, 0.7, 0.6, 1.4); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0005; l.target.position.set(x, 0, z); g.add(l.target); } else if (type === 'd') { l = new THREE.DirectionalLight(col, int); l.target.position.set(0, 0, 0); g.add(l.target); } l.position.set(x, y, z); g.add(l); L.push(l); } return L; }
function windowPlane(w, h, draw, int = 1.4) { const t = canvasTex(256, 256, draw, { clamp: true }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(int, int, int), toneMapped: false })); return m; }
const daySky = (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa0e0'); gr.addColorStop(0.7, '#cfe2f5'); gr.addColorStop(1, '#8a9a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,90,100,0.6)'; for (let i = 0; i < 9; i++) g.fillRect(i * 30, h * 0.55 - hash(i) * 60, 24, 200); };
const nightCity = (g, w, h) => { g.fillStyle = '#060a16'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const bx = i * 19, bh = 60 + hash(i) * 120; g.fillStyle = '#0c1220'; g.fillRect(bx, h - bh, 17, bh); for (let k = 0; k < 30; k++) if (hash(i * 31 + k) > 0.55) { g.fillStyle = '#ffcf7a'; g.fillRect(bx + 2 + (k % 3) * 5, h - bh + 6 + Math.floor(k / 3) * 9, 3, 4); } } };
const rainWin = (g, w, h) => { nightCity(g, w, h); g.strokeStyle = 'rgba(180,200,230,0.25)'; for (let i = 0; i < 80; i++) { const x = hash(i) * w; g.beginPath(); g.moveTo(x, hash(i * 3) * h); g.lineTo(x + 2, hash(i * 3) * h + 30); g.stroke(); } };
function person(o, x, z, ry, parent) { const p = new Person(o); p.root.position.set(x, 0, z); p.root.rotation.y = ry; parent.add(p.root); const sh = makeContactShadow(0.9, 0.9, 0.45); p.root.add(sh); return p; }

// ======================= PODS =======================
pod('office90', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 8, d: 7, h: 2.9, wall: 0xd8d0c0, floor: 0x5a6070 }));
  const desk = makeDesk(); desk.position.set(0, 0, -1.6); g.add(desk);
  const scr = new Screen(512, 384, (g, w, h, t, o) => (P.mode === 'y2k' ? SCR.y2k(g, w, h, t) : SCR.browser95(g, w, h, t, o)));
  P.screens.push([scr, (T, lt) => (P.mode === 'y2k' ? scr.update(lt, { y2k: Math.floor(lt * 30) }) : scr.update(T, { page: 'home' }))]);
  const crt = makeCRT(scr.tex); crt.position.set(-0.1, 0.76, -1.75); crt.scale.setScalar(1.15); g.add(crt);
  const kb = makeKeyboard(); kb.position.set(-0.1, 0.77, -1.3); g.add(kb);
  // modem with blinking LEDs
  const modem = box(0.26, 0.05, 0.18, M('modem', () => std(0x2a2a2c, { r: 0.4 })), 0.5, 0.79, -1.5, g);
  P.leds = [];
  for (let i = 0; i < 5; i++) { const l = box(0.012, 0.012, 0.005, glow(0x40ff60, 3), 0.42 + i * 0.03, 0.805, -1.41, g); P.leds.push(l); }
  const mug = cyl(0.04, 0.035, 0.1, M('mug', () => std(0xc8232c, { r: 0.4 })), -0.65, 0.81, -1.4, g, 14);
  const phone = box(0.05, 0.12, 0.025, M('nokia', () => std(0x3a4a5a, { r: 0.4 })), 0.35, 0.78, -1.2, g); phone.rotation.x = -Math.PI / 2;
  const ch = makeChair(); ch.position.set(0, 0, -0.6); ch.rotation.y = Math.PI; g.add(ch);
  const w = windowPlane(2.4, 1.5, daySky, 1.6); w.position.set(-3.99, 1.6, -0.8); w.rotation.y = Math.PI / 2; g.add(w);
  const lamp = makeLamp({ intensity: 1.5 }); lamp.position.set(0.65, 0.76, -1.85); g.add(lamp);
  P.people.push(person({ seed: 701, jacket: null, shirt: '#9fb6d6', glasses: true }, 0, -0.75, Math.PI, g));
  P.lights = roomLights(g, [['p', 0xfff0d8, 6, 0, 2.6, 0], ['s', 0xdfeeff, 20, -3.6, 2.0, -0.8, 12]]);
  P.update = (T) => { P.people[0].pose('type', T, { seatH: 0.48 }); P.leds.forEach((l, i) => (l.visible = hash(Math.floor(T * 12) * 7 + i) > 0.4)); };
  return g;
});

pod('dotcom', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 14, d: 10, h: 3.6, wallMat: M('loftBrick', () => new THREE.MeshStandardMaterial({ map: (() => { const t = brickTex([160, 80, 60]); t.repeat.set(5, 2); return t; })(), roughness: 0.9 })), floor: 0x8a6a4a }));
  const cols = [0x2aa0c8, 0xe86a1c, 0x8a2ad0, 0x2ab85a, 0xe83a6a, 0xf2c40c];
  const brands = ['pets.com', 'e-shop.com', 'buzz.net', 'webvan.com', 'clickme.com', 'go2net.com'];
  for (let i = 0; i < 6; i++) {
    const x = -4 + (i % 3) * 4, z = -2 + Math.floor(i / 3) * 3.5;
    const d = makeDesk({ drawers: false }); d.position.set(x, 0, z); g.add(d);
    const scr = new Screen(384, 288, SCR.browser95); const k = i;
    P.screens.push([scr, (T) => scr.update(T, { page: 'dotcom', brand: brands[k], seed: k })]);
    const imac = makeCRT(scr.tex, { color: cols[i] }); imac.position.set(x, 0.76, z - 0.15); g.add(imac);
    const ch = makeChair(cols[i]); ch.position.set(x, 0, z + 0.7); ch.rotation.y = Math.PI; g.add(ch);
    P.people.push(person({ seed: 720 + i, jacket: null, shirt: ['#e8e6e0', '#2a2e36', '#c86a5a', '#9fb6d6', '#efe4cf', '#7a8a6a'][i], female: i % 2 === 1, headwear: i === 4 ? 'cap' : null }, x, z + 0.6, Math.PI, g));
  }
  // whiteboard with ".com" idea
  const wb = makeSign(canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#f8f8f6'; c.fillRect(0, 0, w, h); c.font = '700 64px "Inter Tight"'; c.fillStyle = '#2a6ad0'; c.fillText('IPO!!', 30, 90); c.fillStyle = '#c8232c'; c.fillText('.com', 260, 90); c.strokeStyle = '#1f8a4c'; c.lineWidth = 6; c.beginPath(); c.moveTo(40, 220); c.lineTo(140, 190); c.lineTo(220, 200); c.lineTo(320, 140); c.lineTo(460, 60); c.stroke(); }, { clamp: true }), 3, 1.5);
  wb.position.set(0, 1.8, -4.98); g.add(wb);
  for (let i = 0; i < 3; i++) { const l = makeCeilingLight(1.6, 0.4, 3); l.position.set(-4 + i * 4, 3.57, 0); g.add(l); }
  P.lights = roomLights(g, [['p', 0xffe8cc, 14, -3, 3, 0, 16], ['p', 0xffe8cc, 14, 3, 3, 0, 16], ['s', 0xfff2e0, 25, 0, 3.4, 2, 16]]);
  P.update = (T) => P.people.forEach((p, i) => p.pose('type', T + i, { seatH: 0.48 }));
  return g;
});

pod('invest', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 6, d: 6, h: 2.7, wall: 0xc8b89a, floor: 0x7a5a3a }));
  const d = makeDesk(); d.position.set(0, 0, -1.8); g.add(d);
  const scr = new Screen(512, 384, SCR.brokerage); P.screens.push([scr, (T, lt) => scr.update(lt, { label: 'MY PORTFOLIO', v0: 12000, v1: 48200, d: 2.4 })]);
  const crt = makeCRT(scr.tex); crt.position.set(0, 0.76, -1.95); crt.scale.setScalar(1.2); g.add(crt);
  P.people.push(person({ seed: 731, jacket: null, shirt: '#efe4cf', expr: 'smile' }, 0, -0.9, Math.PI, g));
  const lamp = makeLamp(); lamp.position.set(-0.6, 0.76, -1.9); g.add(lamp);
  P.lights = roomLights(g, [['p', 0xffd8a8, 5, 0, 2.4, 0]]);
  P.update = (T) => P.people[0].pose('sit', T, { seatH: 0.48 });
  return g;
});

pod('diner', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 10, d: 8, h: 3.0, wall: 0xe8d8b8, floorMat: M('dinerFloor', () => { const t = tileTex('#f0ece4', '#1a1a1a', 16); return new THREE.MeshStandardMaterial({ map: (() => { const c = canvasTex(256, 256, (gg, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { gg.fillStyle = (x + y) % 2 ? '#f0ece4' : '#1a1a1a'; gg.fillRect(x * 32, y * 32, 32, 32); } }); c.repeat.set(6, 6); return c; })(), roughness: 0.4 }); }) }));
  const red = M('vinylRed', () => std(0xb0222a, { r: 0.35 }));
  const chrome = MAT.chrome();
  for (let i = 0; i < 2; i++) {
    const z = -2 + i * 2.6;
    box(1.8, 0.05, 0.9, M('formica', () => std(0xe8e0d0, { r: 0.3 })), 0, 0.75, z, g); cyl(0.05, 0.05, 0.72, chrome, 0, 0.37, z, g, 8);
    for (const s of [-1, 1]) { box(1.8, 0.45, 0.6, red, 0, 0.23, z + s * 0.8, g); box(1.8, 0.75, 0.15, red, 0, 0.75, z + s * 1.1, g); }
  }
  // burger + fries + soda
  const plate = cyl(0.16, 0.14, 0.02, M('plate', () => std(0xf8f8f4, { r: 0.2 })), 0.1, 0.785, -2, g, 24);
  const bun = M('bun', () => std(0xc8842a, { r: 0.55 })), patty = M('patty', () => std(0x4a2a18, { r: 0.8 })), lettuce = M('lettuce', () => std(0x5aa83a, { r: 0.6 })), cheese = M('cheese', () => std(0xf2b818, { r: 0.4 }));
  const bb = new THREE.Group(); bb.position.set(0.1, 0.8, -2); g.add(bb);
  cyl(0.085, 0.085, 0.03, bun, 0, 0.015, 0, bb, 20); cyl(0.088, 0.088, 0.03, patty, 0, 0.045, 0, bb, 20); box(0.15, 0.006, 0.15, cheese, 0, 0.063, 0, bb); cyl(0.09, 0.09, 0.01, lettuce, 0, 0.072, 0, bb, 12);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.088, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bun); top.position.y = 0.075; top.scale.y = 0.7; bb.add(top);
  for (let i = 0; i < 14; i++) { const f = box(0.012, 0.012, 0.09, M('fry', () => std(0xf0c040, { r: 0.6 })), 0.32 + hash(i) * 0.08, 0.8 + hash(i * 3) * 0.02, -2.05 + hash(i * 5) * 0.1, g); f.rotation.set(hash(i * 7) * 0.5, hash(i * 9) * 3, 0); }
  const cup = cyl(0.045, 0.035, 0.16, M('sodaCup', () => std(0xc8232c, { r: 0.4 })), -0.3, 0.86, -2.1, g, 14);
  const neon = makeSign(canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.font = '700 80px "Bebas Neue"'; c.fillStyle = '#ff3a6a'; c.shadowColor = '#ff3a6a'; c.shadowBlur = 20; c.fillText('DINER  OPEN', 40, 95); }, { clamp: true }), 2.4, 0.6, { emissive: 2.5 });
  neon.position.set(0, 2.2, -3.98); g.add(neon);
  const w = windowPlane(3, 1.4, P.variant === 'night' ? rainWin : daySky, P.variant === 'night' ? 0.6 : 1.5); w.position.set(-4.98, 1.6, -1); w.rotation.y = Math.PI / 2; g.add(w);
  const guys = [person({ seed: 741, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' }, 0, -1.3, Math.PI, g), person({ seed: 742, jacket: null, shirt: '#3a4a6a', skin: '#c48a62' }, 0, -2.75, 0, g)];
  P.people.push(...guys);
  P.lights = roomLights(g, [['p', 0xffd8a0, 7, 0, 2.7, -2], ['p', 0xff7aa0, 3, 0, 2.1, -3.5], ['s', 0xfff0d8, 14, 1.5, 2.9, -1.5, 8]]);
  P.update = (T) => { guys[0].pose('eat', T, { seatH: 0.46 }); guys[1].pose('sit', T, { seatH: 0.46 }); };
  return g;
});

pod('gym', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 12, d: 9, h: 3.4, wall: 0x6a7a8a, floor: 0x2a2a2c }));
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), M('mirror', () => std(0xb8c8d8, { r: 0.02, m: 1 }))); mirror.position.set(0, 1.5, -4.48); g.add(mirror);
  const rack = M('rack', () => std(0x1a1a1a, { r: 0.4, m: 0.7 }));
  box(4, 0.08, 0.6, rack, 0, 0.6, -3.6, g); box(4, 0.08, 0.6, rack, 0, 0.3, -3.6, g);
  for (let i = 0; i < 10; i++) { const db = new THREE.Group(); cyl(0.07, 0.07, 0.08, MAT.black(), -0.12, 0, 0, db, 10).rotation.z = Math.PI / 2; cyl(0.07, 0.07, 0.08, MAT.black(), 0.12, 0, 0, db, 10).rotation.z = Math.PI / 2; cyl(0.015, 0.015, 0.2, MAT.chrome(), 0, 0, 0, db, 6).rotation.z = Math.PI / 2; db.position.set(-1.8 + i * 0.4, 0.7, -3.6); g.add(db); }
  const bench = box(0.35, 0.45, 1.3, M('benchPad', () => std(0x1a1a1e, { r: 0.6 })), 2.5, 0.225, -1, g);
  const lifter = person({ seed: 751, jacket: null, shirt: '#3a3a3e', shortSleeve: true, pants: '#2a2a2e', skin: '#c48a62' }, 0, -1.5, 0, g);
  const db1 = new THREE.Group(); for (const x of [-0.1, 0.1]) cyl(0.06, 0.06, 0.07, MAT.black(), x, 0, 0, db1, 10).rotation.z = Math.PI / 2; lifter.j.wrL.add(db1); db1.position.y = -0.07;
  const db2 = db1.clone(); lifter.j.wrR.add(db2);
  P.people.push(lifter);
  for (let i = 0; i < 4; i++) { const l = makeCeilingLight(2, 0.3, 3.5); l.position.set(-3 + i * 2, 3.37, -1); g.add(l); }
  P.lights = roomLights(g, [['p', 0xe8f0ff, 12, 0, 3, 0, 14], ['s', 0xffffff, 18, -2, 3.2, 1, 10]]);
  P.update = (T) => lifter.pose('lift', T);
  return g;
});

pod('store', (P) => {
  const g = new THREE.Group();
  const night = P.variant === 'night';
  g.add(makeRoom({ w: 10, d: 30, h: 5, wall: 0xe8e8e2, floor: 0xd8d4cc }));
  const shelfM = M('shelf', () => std(0xd8d8d4, { r: 0.6, m: 0.3 }));
  const r = rng(77);
  const boxGeo = new THREE.BoxGeometry(0.3, 0.38, 0.22);
  const palette = [0xc8232c, 0x2a6ad0, 0xf2c40c, 0x2ab85a, 0xe86a1c, 0xffffff, 0x8a2ad0, 0x1a1a1a];
  for (const sx of [-2.2, 2.2]) {
    box(0.6, 2.2, 26, shelfM, sx, 1.1, 0, g);
    const im = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), 600);
    const d = new THREE.Object3D(); const c = new THREE.Color(); let n = 0;
    for (let lvl = 0; lvl < 5; lvl++) for (let k = 0; k < 120 && n < 600; k++) { d.position.set(sx + (sx < 0 ? 0.35 : -0.35), 0.3 + lvl * 0.42, -12.5 + k * 0.21); d.scale.set(1, 0.7 + r() * 0.5, 1); d.updateMatrix(); im.setMatrixAt(n, d.matrix); im.setColorAt(n, c.set(palette[Math.floor(r() * palette.length)])); n++; }
    im.count = n; im.castShadow = true; g.add(im);
  }
  // cart
  const cart = new THREE.Group(); const wire = M('cartWire', () => std(0xc0c4c8, { r: 0.3, m: 0.9, extra: { wireframe: true } }));
  box(0.55, 0.45, 0.9, wire, 0, 0.75, 0, cart); box(0.5, 0.03, 0.03, MAT.chrome(), 0, 1.05, 0.5, cart); cart.position.set(0, 0, 2); g.add(cart);
  for (let i = 0; i < 6; i++) { const l = makeCeilingLight(2.5, 0.35, night ? 3 : 3.5); l.position.set(0, 4.95, -10 + i * 4); g.add(l); }
  P.people.push(person({ seed: 761, jacket: '#2a2e36', skin: '#c48a62' }, 0, 3, Math.PI, g));
  if (night) P.people.push(person({ seed: 762, jacket: null, shirt: '#3a3a3e', skin: '#c48a62' }, 0.7, 2.4, Math.PI, g));
  P.lights = roomLights(g, [['p', 0xf2f6ff, 12, 0, 4.5, -4, 20], ['p', 0xf2f6ff, 12, 0, 4.5, 6, 20]]);
  P.update = (T) => P.people.forEach((p, i) => { p.pose('walk', T + i, { speed: 0.6, amp: 0.6 }); p.root.position.z = 3 - ((T * 0.7 + i * 0.6) % 6); });
  return g;
});

pod('living', (P) => {
  const g = new THREE.Group();
  const night = P.variant !== 'day';
  g.add(makeRoom({ w: 7, d: 6, h: 2.7, wallMat: M('livingWall', () => new THREE.MeshStandardMaterial({ map: (() => { const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#c8b090'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(150,120,90,0.25)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 6, h); }); t.repeat.set(4, 1); return t; })(), roughness: 0.9 })), floorMat: M('livingCarpet', () => { const t = carpetTex([140, 110, 90], [130, 100, 82]); t.repeat.set(5, 5); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }) }));
  const sofa = makeSofa(0x4a5a6a); sofa.position.set(0, 0, 1.5); sofa.rotation.y = Math.PI; g.add(sofa);
  const stand = box(1.2, 0.5, 0.5, M('tvStand', () => std(0x4a3424, { r: 0.6, map: woodTex([110, 70, 40]) })), 0, 0.25, -2.2, g);
  P.chyron = new Screen(512, 384, SCR.newsChyron);
  P.tvMat = tvMaterial(P.chyron.tex);
  const tv = makeTV(null, { w: 0.9, h: 0.7 }); tv.position.set(0, 0.5, -2.2); g.add(tv);
  tv.userData.screen.material = P.tvMat;
  P.tv = tv;
  const lamp = makeLamp({ intensity: night ? 1.2 : 0.4 }); lamp.position.set(-1.6, 0, 1.6); lamp.scale.setScalar(1.6); g.add(lamp);
  const w = windowPlane(1.6, 1.3, night ? nightCity : daySky, night ? 0.5 : 1.4); w.position.set(3.49, 1.5, 0); w.rotation.y = -Math.PI / 2; g.add(w);
  const fam = [{ seed: 771, jacket: null, shirt: '#7a8a6a' }, { seed: 772, female: true, shirt: '#c86a5a', jacket: null }, { seed: 773, jacket: null, shirt: '#9fb6d6', height: 1.35 }];
  fam.forEach((o, i) => P.people.push(person(o, -0.6 + i * 0.6, 1.25, Math.PI, g)));
  // TV glow on faces
  P.tvLight = new THREE.PointLight(0x9ab8ff, 4, 6, 1.6); P.tvLight.position.set(0, 0.9, -1.6); g.add(P.tvLight);
  P.lights = roomLights(g, [['p', 0xffc890, night ? 2 : 6, -1.6, 1.5, 1.6, 8]]);
  P.update = (T, lt) => { P.people.forEach((p, i) => p.pose('sit', T + i, { seatH: 0.45 })); P.tvLight.intensity = 3 + Math.sin(T * 7) * 0.8 + hash(Math.floor(T * 10)) * 1.5; };
  return g;
});

pod('bedroom', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 5, d: 5, h: 2.6, wall: 0x8aa0c8, floor: 0x8a6a4a }));
  const bed = box(1.1, 0.45, 2.0, M('bedFrame', () => std(0xe8e0d0, { r: 0.7 })), 0, 0.22, -1, g);
  const blanket = box(1.08, 0.12, 1.4, M('blanket', () => std(0xe86a6a, { r: 0.95 })), 0, 0.5, -0.7, g);
  const pillow = box(0.6, 0.12, 0.35, M('pillow', () => std(0xf8f8f4, { r: 0.95 })), 0, 0.52, -1.75, g);
  const kid = new Person({ seed: 781, height: 1.1, jacket: null, shirt: '#f2c40c', expr: 'closed' }); kid.root.position.set(0, 0.55, -1.3); kid.root.rotation.x = -Math.PI / 2; g.add(kid.root);
  const parent = person({ seed: 782, female: true, jacket: null, shirt: '#efe4cf' }, 0.75, -0.6, -Math.PI / 2, g);
  P.people.push(kid, parent);
  const nl = cyl(0.06, 0.08, 0.15, glow(0xffc070, 2.5), -0.8, 0.6, -1.8, g, 12);
  const tab = box(0.4, 0.55, 0.4, M('nightTable', () => std(0xe8e0d0, { r: 0.6 })), -0.8, 0.27, -1.8, g);
  const w = windowPlane(1.2, 1.1, nightCity, 0.35); w.position.set(-2.49, 1.5, -0.5); w.rotation.y = Math.PI / 2; g.add(w);
  P.lights = roomLights(g, [['p', 0xffb060, 3.5, -0.8, 0.9, -1.8, 6], ['p', 0x3a5aaa, 1.2, -2, 1.5, -0.5, 6]]);
  P.update = (T) => { kid.pose('stand', T); kid.j.head.rotation.y = 0; parent.pose('crouch', T); parent.j.shR.rotation.x = -1.4; };
  return g;
});

pod('nightstand', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 4, d: 4, h: 2.6, wall: 0x3a3a4a, floor: 0x4a3a2a }));
  box(0.5, 0.55, 0.45, M('nightTable2', () => std(0x5a4030, { r: 0.6, map: woodTex([110, 70, 40]) })), 0, 0.275, 0, g);
  P.alarm = new Screen(256, 96, SCR.alarm);
  P.screens.push([P.alarm, (T, lt) => P.alarm.update(lt, { text: lt < 1.2 ? '6:15' : '6:30' })]);
  const ac = makeAlarmClock(P.alarm.tex); ac.position.set(0, 0.55, 0.05); ac.scale.setScalar(1.4); g.add(ac);
  const glass = cyl(0.035, 0.03, 0.12, MAT.glass(), 0.18, 0.61, -0.05, g, 14);
  const book = box(0.15, 0.03, 0.22, M('book', () => std(0x2a4a7a, { r: 0.7 })), -0.15, 0.565, -0.05, g);
  const hand = new Person({ seed: 791, jacket: null, shirt: '#e8e6e0' }); hand.root.position.set(0.35, -0.25, 0.65); hand.root.rotation.y = Math.PI * 0.85; g.add(hand.root); P.people.push(hand);
  P.lights = roomLights(g, [['p', 0x6a7aaa, 1.5, 0.5, 1.6, 1, 6], ['p', 0xff3a1a, 0.6, 0, 0.62, 0.3, 1.5]]);
  P.update = (T, lt) => { hand.pose('point', T); hand.j.shR.rotation.x = -1.0; hand.j.elR.rotation.x = -0.5 + Math.sin(lt * 2) * 0.05; };
  return g;
});

pod('planner', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 5, d: 5, h: 2.6, wall: 0xb8a890, floor: 0x5a4030 }));
  const d = makeDesk(); d.position.set(0, 0, 0); g.add(d);
  const pageTex = canvasTex(1024, 720, (c, w, h) => {
    c.fillStyle = '#f6f1e2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8e0cc'; c.fillRect(w / 2 - 3, 0, 6, h);
    c.font = '700 44px "Inter Tight"'; c.fillStyle = '#7a1418'; c.fillText('TUESDAY', 560, 70); c.font = '400 30px "Inter Tight"'; c.fillStyle = '#333'; c.fillText('September 11, 2001', 560, 110);
    c.font = '700 44px "Inter Tight"'; c.fillStyle = '#555'; c.fillText('MONDAY', 40, 70); c.font = '400 30px "Inter Tight"'; c.fillText('September 10, 2001', 40, 110);
    c.strokeStyle = 'rgba(80,100,160,0.35)'; c.lineWidth = 2;
    for (let y = 150; y < h - 20; y += 44) { c.beginPath(); c.moveTo(20, y); c.lineTo(w / 2 - 20, y); c.moveTo(w / 2 + 20, y); c.lineTo(w - 20, y); c.stroke(); }
    c.font = '400 34px "Special Elite", cursive'; c.fillStyle = '#1a2a6a';
    const items = [['8:00', 'gym'], ['8:30', 'train to WTC'], ['9:00', 'meeting - North Tower, 101 fl'], ['12:30', 'lunch w/ Mike'], ['3:00', 'call Mom'], ['6:00', "Emma's soccer"]];
    items.forEach(([tt, s], i) => c.fillText(`${tt}  ${s}`, 540, 185 + i * 88));
    c.fillStyle = '#5a5a5a'; ['9:30  dentist', '2:00  report due', '7:00  dinner'].forEach((s, i) => c.fillText(s, 40, 185 + i * 88));
  }, { clamp: true });
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.44), [M('plannerEdge', () => std(0xf2ecdc)), M('plannerEdge', () => std(0xf2ecdc)), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.85 }), M('plannerEdge', () => std(0xf2ecdc)), M('plannerEdge', () => std(0xf2ecdc)), M('plannerEdge', () => std(0xf2ecdc))]);
  book.position.set(0, 0.79, 0.05); g.add(book);
  const pen = cyl(0.006, 0.006, 0.14, M('pen', () => std(0x1a2a6a, { r: 0.3 })), 0.25, 0.81, 0.1, g, 8); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5;
  const mug = cyl(0.045, 0.04, 0.1, M('mug2', () => std(0xf2f2ee, { r: 0.3 })), -0.45, 0.81, -0.1, g, 14);
  // clothes on chair
  const ch = makeChair(0x3a3a3e); ch.position.set(0.9, 0, 0.4); ch.rotation.y = -0.6; g.add(ch);
  const shirt = box(0.45, 0.04, 0.55, M('shirtFold', () => std(0xf2f2f0, { r: 0.9 })), 0.9, 0.54, 0.4, g);
  const tie = box(0.06, 0.01, 0.4, M('tieFold', () => std(0x8a1c24, { r: 0.5 })), 0.9, 0.57, 0.4, g);
  const lamp = makeLamp({ intensity: 2.5 }); lamp.position.set(-0.6, 0.76, -0.25); g.add(lamp);
  P.lights = roomLights(g, [['p', 0x7a8aaa, 1, 1, 2.2, 1.5, 6]]);
  P.update = () => {};
  return g;
});

pod('sim', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 8, d: 7, h: 3.2, wall: 0x2a2c32, floor: 0x1a1a1c }));
  P.simScr = new Screen(768, 320, SCR.simView);
  P.screens.push([P.simScr, (T, lt) => P.simScr.update(T, P.simParams || {})]);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.75), new THREE.MeshBasicMaterial({ map: P.simScr.tex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
  scr.position.set(0, 1.55, -2.6); g.add(scr);
  // cockpit mock-up frame
  const dark = M('simDark', () => std(0x16181b, { r: 0.6 }));
  box(3, 0.85, 0.6, dark, 0, 0.6, -1.5, g);
  P.panel = new Screen(512, 160, (gg, w, h, t) => { gg.fillStyle = '#101216'; gg.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { gg.fillStyle = '#05070a'; gg.fillRect(12 + i * 83, 14, 74, 74); gg.fillStyle = i % 2 ? '#2a6ad0' : '#3aff7a'; gg.fillRect(20 + i * 83, 40 + Math.sin(t + i) * 10, 58, 4); } });
  P.screens.push([P.panel, (T) => P.panel.update(T)]);
  const pnl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: P.panel.tex, toneMapped: false })); pnl.position.set(0, 1.05, -1.19); pnl.rotation.x = -0.3; g.add(pnl);
  for (const s of [-1, 1]) { const seat = box(0.6, 0.5, 0.6, M('simSeat', () => std(0x2a2e34, { r: 0.8 })), s * 0.65, 0.25, -0.3, g); box(0.6, 0.9, 0.12, seat.material, s * 0.65, 0.85, 0.0, g); }
  const student = person({ seed: 801, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' }, -0.65, -0.35, Math.PI, g);
  const instr = person({ seed: 802, jacket: null, shirt: '#9fb6d6', hair: 'receding', hairColor: '#8a8a88', glasses: true, headwear: null }, 1.6, 0.4, Math.PI * 1.15, g);
  P.people.push(student, instr);
  P.lights = roomLights(g, [['p', 0x9ac0ff, 6, 0, 1.6, -1.8, 8], ['p', 0xffe0c0, 3, 1.6, 2.6, 1.2, 8]]);
  P.update = (T) => { student.pose('pilot', T, { seatH: 0.55 }); instr.pose(P.instrPose || 'arms', T); };
  return g;
});

pod('counter', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 8, d: 7, h: 3, wall: 0xd8d0b8, floor: 0x8a7a6a }));
  box(3, 1.05, 0.7, M('counterTop', () => std(0x8a6a4a, { r: 0.5, map: woodTex([150, 110, 70]) })), 0, 0.525, -1.5, g);
  // cash bills fanned
  const billTex = cached('billTex', () => canvasTex(256, 110, (c, w, h) => { c.fillStyle = '#c8d8b0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a5a3a'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#3a5a3a'; c.font = '700 40px serif'; c.fillText('100', 16, 46); c.fillText('100', w - 80, h - 16); c.beginPath(); c.ellipse(w / 2, h / 2, 30, 38, 0, 0, Math.PI * 2); c.stroke(); }, { clamp: true }));
  P.bills = [];
  for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.156, 0.066), new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.8, side: THREE.DoubleSide })); b.rotation.x = -Math.PI / 2; b.position.set(-0.3 + i * 0.012, 1.052 + i * 0.0008, -1.4); b.rotation.z = (i - 6) * 0.09; g.add(b); P.bills.push(b); }
  const poster = makeSign(canvasTex(256, 360, (c, w, h) => { c.fillStyle = '#2a6ad0'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 40px "Inter Tight"'; c.fillText('LEARN', 20, 60); c.fillText('TO FLY', 20, 105); c.fillStyle = '#f2c40c'; c.beginPath(); c.moveTo(30, 220); c.lineTo(230, 200); c.lineTo(230, 215); c.lineTo(30, 235); c.fill(); c.fillRect(110, 170, 20, 90); }, { clamp: true }), 0.9, 1.25);
  poster.position.set(-2, 1.8, -3.48); g.add(poster);
  const clerk = person({ seed: 811, jacket: null, shirt: '#e8e6e0', hair: 'receding', glasses: true }, 0.5, -2.2, 0, g);
  const cust = person({ seed: 812, jacket: null, shirt: '#3a4a6a', skin: '#c48a62' }, 0.1, -0.6, Math.PI, g);
  P.people.push(clerk, cust);
  P.lights = roomLights(g, [['s', 0xfff0d8, 18, 0, 2.9, -1, 8], ['p', 0xdfeeff, 4, 3, 2, 2, 10]]);
  P.update = (T, lt) => { clerk.pose('arms', T); cust.pose('stand', T); cust.j.shR.rotation.x = -0.8; cust.j.elR.rotation.x = -0.4; P.bills.forEach((b, i) => (b.position.x = -0.3 + i * 0.012 * (1 + E.outCubic(clamp(lt / 1.2)) * 3))); };
  return g;
});

pod('ops', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 16, d: 12, h: 4.2, wall: 0x1c2028, floor: 0x24262c }));
  P.wall = new Screen(1024, 400, SCR.opsWall);
  P.screens.push([P.wall, (T) => P.wall.update(T)]);
  const wallM = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.7), new THREE.MeshBasicMaterial({ map: P.wall.tex, toneMapped: false, color: new THREE.Color(1.2, 1.2, 1.2) }));
  wallM.position.set(0, 2.3, -5.95); wallM.scale.y = 0.75; g.add(wallM);
  const rs = [];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
    const x = -4.5 + k * 3, z = -2.5 + row * 2.4;
    const d = makeDesk({ drawers: false }); d.position.set(x, row * 0.25, z); g.add(d);
    const scr = new Screen(256, 192, (gg, w, h, t) => SCR.waveform(gg, w, h, t + k + row, { label: 'SIGINT' }));
    if ((row + k) % 2) P.screens.push([scr, (T) => scr.update(T)]); else { P.screens.push([scr, (T) => scr.update(T)]); }
    const crt = makeCRT(scr.tex, { color: 0x2a2a2c }); crt.position.set(x, 0.76 + row * 0.25, z - 0.15); g.add(crt);
    box(16, 0.25, 2.4, M('tier', () => std(0x24262c, { r: 0.9 })), 0, row * 0.25 - 0.125, z - 0.2, row ? g : null);
    if ((row * 4 + k) % 3 !== 2) rs.push(person({ seed: 821 + row * 4 + k, jacket: (row + k) % 2 ? '#24262c' : null, shirt: ['#e8e6e0', '#9fb6d6', '#efe4cf'][k % 3], female: (row + k) % 3 === 0 }, x, z + 0.55, Math.PI, g));
  }
  P.people.push(...rs);
  rs.forEach((p, i) => (p.root.position.y = Math.floor(i / 3) * 0.25));
  // rotating red warning lights
  P.beacons = [];
  for (const x of [-6, 6]) { const b = new THREE.SpotLight(0xff2010, 0, 30, 0.35, 0.5, 1); b.position.set(x, 4, -5.5); g.add(b, b.target); P.beacons.push(b); const bulb = cyl(0.12, 0.12, 0.2, glow(0xff2010, 3), x, 4, -5.6, g, 10); P.beacons.push(bulb); }
  P.lights = roomLights(g, [['p', 0x6a8ac8, 6, 0, 3.8, 0, 18], ['p', 0x3a5aff, 5, 0, 2, -5, 12]]);
  P.update = (T) => {
    rs.forEach((p, i) => p.pose('type', T + i, { seatH: 0.48 }));
    const a = T * 4;
    P.beacons.forEach((b, i) => { if (b.isSpotLight) { b.intensity = P.alert ? 60 : 0; b.target.position.set(b.position.x + Math.cos(a + i) * 6, 0, b.position.z + 6 + Math.sin(a + i) * 6); b.target.updateMatrixWorld(); } else b.visible = !!P.alert && Math.sin(a * 2) > 0; });
  };
  return g;
});

pod('intercept', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 7, d: 6, h: 2.8, wall: 0x2a2e26, floor: 0x1e1e1c }));
  const rackM = M('rackGrey', () => std(0x6a6c66, { r: 0.6, m: 0.4 }));
  for (let i = 0; i < 4; i++) {
    const rx = -2.4 + i * 1.6;
    box(1.4, 2.2, 0.6, rackM, rx, 1.1, -2.65, g);
    for (let k = 0; k < 6; k++) { const led = box(0.02, 0.02, 0.01, glow(k % 2 ? 0x40ff60 : 0xffb030, 3), rx - 0.5 + k * 0.18, 1.8, -2.34, g); }
    // reel to reel
    for (const s of [-0.3, 0.3]) { const reel = cyl(0.22, 0.22, 0.03, M('reel', () => std(0x9a9c98, { r: 0.4, m: 0.7 })), rx + s, 1.3, -2.33, g, 20); reel.rotation.x = Math.PI / 2; P.reels = P.reels || []; P.reels.push(reel); }
  }
  P.wave = new Screen(512, 256, SCR.waveform);
  P.trans = new Screen(512, 384, SCR.transcript);
  P.screens.push([P.wave, (T) => P.wave.update(T)], [P.trans, (T, lt) => P.trans.update(lt)]);
  const d = makeDesk(); d.position.set(0, 0, -0.6); g.add(d);
  const crt1 = makeCRT(P.wave.tex, { color: 0x3a3a38 }); crt1.position.set(-0.35, 0.76, -0.75); crt1.scale.setScalar(1.3); g.add(crt1);
  const crt2 = makeCRT(P.trans.tex, { color: 0x3a3a38 }); crt2.position.set(0.45, 0.76, -0.75); crt2.scale.setScalar(1.3); g.add(crt2);
  const op = person({ seed: 841, jacket: null, shirt: '#e8e6e0', glasses: true }, 0, 0.15, Math.PI, g);
  // headphones
  const hp = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 8, 20, Math.PI), MAT.black()); hp.position.set(0, 0.04, 0); op.j.head.add(hp);
  for (const s of [-1, 1]) { const cup = cyl(0.05, 0.05, 0.04, MAT.black(), s * 0.125, -0.0, 0, op.j.head, 14); cup.rotation.z = Math.PI / 2; }
  P.people.push(op);
  P.lights = roomLights(g, [['p', 0xffc890, 4, 0, 2.4, 0.5, 8], ['p', 0x5ab0ff, 3, 0, 1.2, -1.2, 5]]);
  P.update = (T) => { op.pose('type', T, { seatH: 0.48 }); (P.reels || []).forEach((r, i) => (r.rotation.y = T * (i % 2 ? 2 : 2.4))); };
  return g;
});

pod('bureau', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 5, d: 40, h: 3, wall: 0xb8b4a0, floor: 0x6a6658 }));
  for (let i = 0; i < 26; i++) for (const s of [-1, 1]) { const f = makeFileCabinet(); f.position.set(s * 2.1, 0, -18 + i * 1.4); f.rotation.y = -s * Math.PI / 2; g.add(f); if (hash(i * 3 + s) > 0.5) { const ps = makePaperStack(30 + Math.floor(hash(i) * 30), i); ps.position.set(s * 2.1, 1.3, -18 + i * 1.4); ps.scale.setScalar(1.4); g.add(ps); } }
  for (let i = 0; i < 12; i++) { const ps = makePaperStack(60, i + 50); ps.position.set((hash(i) - 0.5) * 2, 0, -15 + i * 2.5); ps.scale.setScalar(1.6); g.add(ps); }
  for (let i = 0; i < 9; i++) { const l = makeCeilingLight(1.2, 0.3, 2); l.position.set(0, 2.97, -16 + i * 4); g.add(l); }
  const doorTex = (label, col) => canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#5a4a3a'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,220,230,0.6)'; c.fillRect(30, 40, w - 60, 200); c.fillStyle = col; c.font = '800 64px "Inter Tight"'; c.textAlign = 'center'; c.fillText(label, w / 2, 165); }, { clamp: true });
  const d1 = makeSign(doorTex('FBI', '#1a2a5a'), 1.0, 2.1); d1.position.set(-2.49, 1.05, 3); d1.rotation.y = Math.PI / 2; g.add(d1);
  const d2 = makeSign(doorTex('CIA', '#5a1a1a'), 1.0, 2.1); d2.position.set(2.49, 1.05, 3); d2.rotation.y = -Math.PI / 2; g.add(d2);
  P.lights = roomLights(g, [['p', 0xf0f2e0, 6, 0, 2.6, 0, 14], ['p', 0xf0f2e0, 6, 0, 2.6, -10, 14]]);
  P.update = () => {};
  return g;
});

pod('study', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 7, d: 6, h: 3, wallMat: M('studyWall', () => new THREE.MeshStandardMaterial({ map: (() => { const t = woodTex([120, 80, 50]); t.repeat.set(3, 1); return t; })(), roughness: 0.7 })), floor: 0x5a3a24 }));
  const desk = box(2, 0.05, 1, M('studyDesk', () => std(0x5a3a24, { r: 0.35, map: woodTex([110, 70, 40]) })), 0, 0.76, -1, g);
  box(1.9, 0.72, 0.9, M('studyDeskBody', () => std(0x4a2e1c, { r: 0.5 })), 0, 0.37, -1, g);
  const folderTex = canvasTex(512, 360, (c, w, h) => { c.fillStyle = '#d8c89a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a1418'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, h - 28); c.fillStyle = '#7a1418'; c.font = '700 34px "Inter Tight"'; c.textAlign = 'center'; c.fillText('TOP SECRET', w / 2, 70); c.font = '700 30px "Special Elite"'; c.fillStyle = '#222'; c.fillText("THE PRESIDENT'S", w / 2, 160); c.fillText('DAILY BRIEF', w / 2, 200); c.font = '400 24px "Special Elite"'; c.fillText('6 August 2001', w / 2, 270); c.fillStyle = '#7a1418'; c.font = '700 26px "Inter Tight"'; c.fillText('TOP SECRET', w / 2, h - 34); }, { clamp: true });
  P.folder = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.012, 0.22), [M('fEdge', () => std(0xd8c89a)), M('fEdge', () => std(0xd8c89a)), new THREE.MeshStandardMaterial({ map: folderTex, roughness: 0.8 }), M('fEdge', () => std(0xd8c89a)), M('fEdge', () => std(0xd8c89a)), M('fEdge', () => std(0xd8c89a))]);
  P.folder.position.set(0, 0.79, -0.85); g.add(P.folder);
  P.doc = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: canvasTex(840, 1188, docDraw({ header: 'TOP SECRET', title: 'Bin Ladin Determined\nTo Strike in US', titleSize: 0.04, body: 'Clandestine, foreign government, and media reports indicate Bin Ladin since 1997 has wanted to conduct terrorist attacks in the US. FBI information since that time indicates patterns of suspicious activity in this country consistent with preparations for hijackings or other types of attacks, including recent surveillance of federal buildings in New York. The FBI is conducting approximately 70 full field investigations throughout the US that it considers Bin Ladin-related.', seed: 6 }), { clamp: true }), roughness: 0.85 }));
  P.doc.rotation.x = -Math.PI / 2; P.doc.position.set(0.3, 0.786, -0.9); P.doc.rotation.z = 0.12; g.add(P.doc);
  const lamp = makeLamp({ intensity: 2 }); lamp.position.set(-0.75, 0.78, -1.2); g.add(lamp);
  const flag = makeFlag('us', 0.9, 0.5, { poleH: 2.2, amp: 0.05 }); flag.position.set(2.6, 0, -2.6); g.add(flag);
  const w = windowPlane(2.2, 1.6, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9ac8f0'); gr.addColorStop(0.6, '#fff2d8'); gr.addColorStop(1, '#c8a870'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#7a8a4a'; for (let i = 0; i < 10; i++) c.fillRect(i * 28, h * 0.62 - hash(i) * 20, 22, 30); }, 2.2);
  w.position.set(0, 1.7, -2.99); g.add(w);
  const man = person({ seed: 851, jacket: null, shirt: '#d8e0ea', hair: 'side', hairColor: '#6a6a66' }, 0, -0.25, Math.PI, g);
  P.people.push(man);
  P.lights = roomLights(g, [['s', 0xfff0d0, 30, 0, 2.6, -2.8, 8], ['p', 0xffd8a8, 3, -1, 2.2, 1, 8]]);
  P.update = (T) => { man.pose('read', T, { sit: true, seatH: 0.5 }); P.flagTick && P.flagTick(T); };
  return g;
});

pod('booking', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 5, d: 5, h: 2.6, wall: 0x7a7468, floor: 0x4a443a }));
  const d = makeDesk(); d.position.set(0, 0, -1.3); g.add(d);
  P.scr = new Screen(512, 384, SCR.booking); P.screens.push([P.scr, (T, lt) => P.scr.update(lt)]);
  const crt = makeCRT(P.scr.tex); crt.position.set(0, 0.76, -1.45); crt.scale.setScalar(1.25); g.add(crt);
  const kb = makeKeyboard(); kb.position.set(0, 0.77, -1.0); g.add(kb);
  const man = person({ seed: 861, jacket: null, shirt: '#3a3a3e', skin: '#c48a62' }, 0, -0.35, Math.PI, g);
  P.people.push(man);
  P.lights = roomLights(g, [['p', 0x9ab8e0, 2.5, 0, 1.2, -1.0, 4], ['p', 0x5a5a6a, 1.2, 1.5, 2.2, 1, 6]]);
  P.update = (T) => man.pose('type', T, { seatH: 0.48 });
  return g;
});

pod('evidence', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 5, d: 5, h: 2.8, wall: 0x8a8c88, floor: 0x5a5c58 }));
  box(1.8, 0.05, 1, M('steelTable', () => std(0xb8bcc0, { r: 0.35, m: 0.8 })), 0, 0.85, 0, g);
  const laptop = new THREE.Group(); laptop.position.set(0, 0.88, 0);
  box(0.34, 0.025, 0.25, M('laptopBody', () => std(0x2a2a2c, { r: 0.4 })), 0, 0, 0, laptop);
  const lid = box(0.34, 0.25, 0.015, M('laptopBody', () => std(0x2a2a2c, { r: 0.4 })), 0, 0.12, -0.125, laptop); lid.rotation.x = -0.3;
  g.add(laptop);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.38), new THREE.MeshPhysicalMaterial({ color: 0xeef2f6, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false })); bag.position.set(0, 1.0, -0.02); g.add(bag);
  const tag = makeSign(canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#f2d24a'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '800 34px "Inter Tight"'; c.fillText('EVIDENCE', 16, 46); c.font = '400 22px "IBM Plex Mono"'; c.fillText('CASE 265A-MP', 16, 90); c.fillText('08/16/2001', 16, 124); }, { clamp: true }), 0.16, 0.1);
  tag.rotation.x = -Math.PI / 2; tag.position.set(0.32, 0.879, 0.2); tag.rotation.z = -0.3; g.add(tag);
  P.lights = roomLights(g, [['s', 0xf2f6ff, 25, 0, 2.7, 0.3, 6], ['p', 0x6a7a9a, 1.5, 2, 2, 2, 8]]);
  P.update = () => {};
  return g;
});

pod('pizza', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 8, d: 7, h: 3, wall: 0xd8b878, floor: 0x7a3a2a }));
  box(4, 1.0, 0.7, M('pizzaCounter', () => std(0xc8232c, { r: 0.4 })), 0, 0.5, -2.6, g);
  const menu = makeSign(canvasTex(512, 200, (c, w, h) => { c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h); c.font = '700 34px "Bebas Neue"'; c.fillStyle = '#f2c40c'; ['SLICE ......... $1.50', 'SODA .......... $0.99', 'PIE ........... $9.00', 'CALZONE ....... $4.50'].forEach((s, i) => c.fillText(s, 30, 46 + i * 42)); }, { clamp: true }), 3, 1.2, { emissive: 1.3 });
  menu.position.set(0, 2.2, -3.48); g.add(menu);
  const neon = makeSign(canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.font = '700 96px "Bebas Neue"'; c.fillStyle = '#ff5a2a'; c.shadowColor = '#ff5a2a'; c.shadowBlur = 24; c.fillText('PIZZA', 150, 100); }, { clamp: true }), 1.6, 0.4, { emissive: 3 });
  neon.position.set(-3.99, 2.1, 0); neon.rotation.y = Math.PI / 2; g.add(neon);
  const t = box(1, 0.04, 0.8, M('pizzaTable', () => std(0xe8e0d0, { r: 0.3 })), 1.5, 0.74, 0.5, g); cyl(0.04, 0.04, 0.72, MAT.chrome(), 1.5, 0.36, 0.5, g, 8);
  const pz = cyl(0.17, 0.17, 0.015, M('pizzaTop', () => std(0xe8a030, { r: 0.6 })), 1.5, 0.77, 0.5, g, 24);
  const a = person({ seed: 871, jacket: '#2a2e36', skin: '#c48a62' }, 1.5, 1.1, Math.PI, g);
  const b = person({ seed: 872, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' }, 1.5, -0.1, 0, g);
  P.people.push(a, b);
  const w = windowPlane(3, 1.6, rainWin, 0.45); w.position.set(3.99, 1.5, 0); w.rotation.y = -Math.PI / 2; g.add(w);
  P.lights = roomLights(g, [['p', 0xffd090, 6, 0, 2.7, 0, 10], ['p', 0xff6a3a, 3, -3.5, 2, 0, 6]]);
  P.update = (T) => { a.pose('eat', T, { seatH: 0.46 }); b.pose('sit', T + 1, { seatH: 0.46 }); };
  return g;
});

pod('atm', (P) => {
  const g = new THREE.Group();
  const wall = box(8, 5, 0.5, M('bankWall', () => new THREE.MeshStandardMaterial({ map: (() => { const t = concreteTex(0.9); t.repeat.set(3, 2); return t; })(), roughness: 0.8, color: 0xb8b0a0 })), 0, 2.5, -0.25, g);
  const gr = box(8, 0.05, 6, M('sidewalkNight', () => std(0x3a3a3c, { r: 0.6 })), 0, 0, 2.5, g);
  P.scr = new Screen(320, 240, SCR.atm); P.screens.push([P.scr, (T) => P.scr.update(T)]);
  box(0.9, 1.2, 0.2, M('atmBody', () => std(0x2a2e36, { r: 0.4, m: 0.4 })), 0, 1.3, 0.05, g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshBasicMaterial({ map: P.scr.tex, toneMapped: false })); s.position.set(0, 1.45, 0.16); g.add(s);
  const keypad = box(0.3, 0.02, 0.18, M('keypad', () => std(0x8a8c90, { r: 0.4, m: 0.6 })), 0, 1.1, 0.22, g);
  const sign = makeSign(canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#0a3a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 80px "Inter Tight"'; c.fillText('ATM  24h', 60, 95); }, { clamp: true }), 1.2, 0.3, { emissive: 2 });
  sign.position.set(0, 2.3, 0.02); g.add(sign);
  const a = person({ seed: 881, jacket: '#2a2e36', skin: '#c48a62' }, -0.05, 0.75, Math.PI, g);
  const b = person({ seed: 882, jacket: null, shirt: '#e8e6e0', skin: '#c48a62' }, 0.8, 1.4, Math.PI * 1.2, g);
  P.people.push(a, b);
  P.lights = roomLights(g, [['p', 0x9ac0ff, 3, 0, 1.6, 0.6, 4], ['s', 0xffc890, 20, 0, 4.5, 2, 8]]);
  P.update = (T) => { a.pose('stand', T); a.j.shR.rotation.x = -1.1; a.j.elR.rotation.x = -0.4; b.pose('stand', T + 2); };
  return g;
});

pod('hall', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 20, d: 16, h: 6, wall: 0x2a3448, floor: 0x3a2a24 }));
  const seal = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1a2a5a'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#d8b25a'; c.lineWidth = 10; c.stroke(); c.fillStyle = '#d8b25a'; c.font = '700 22px "Inter Tight"'; c.textAlign = 'center'; c.fillText('DEPARTMENT OF DEFENSE', 128, 60); c.beginPath(); c.moveTo(128, 90); c.lineTo(170, 170); c.lineTo(86, 170); c.closePath(); c.fill(); }, { clamp: true });
  const pd = makePodium(seal); pd.position.set(0, 0.4, -5); g.add(pd);
  box(8, 0.4, 3, M('stage', () => std(0x2a1a14, { r: 0.6 })), 0, 0.2, -5.5, g);
  for (const x of [-3, 3]) { const f = makeFlag('us', 1.2, 0.7, { poleH: 3, amp: 0.05 }); f.position.set(x, 0.4, -6.5); g.add(f); }
  const back = makeSign(seal, 2.5, 2.5); back.position.set(0, 3.2, -7.95); g.add(back);
  const sp = person({ seed: 891, jacket: '#1c2230', hair: 'receding', hairColor: '#c9c6c0', glasses: true, tie: '#1c2a5a' }, 0, -5.6, 0, g); sp.root.position.y = 0.4;
  P.people.push(sp);
  const crowd = new Crowd(70, { seed: 33, shirts: ['#1c2230', '#24262c', '#3a3e48', '#4a5a3a', '#e8e6e0'] });
  for (let i = 0; i < 70; i++) crowd.pos[i] = [-6 + (i % 10) * 1.3, 0, -1 + Math.floor(i / 10) * 1.2, Math.PI];
  g.add(crowd.group); P.crowd = crowd;
  P.lights = roomLights(g, [['s', 0xfff2e0, 60, 0, 5.5, -2, 14], ['p', 0x5a6a9a, 8, 0, 5, 4, 20]]);
  P.update = (T) => { sp.pose('podium', T); sp.setExpr(Math.floor(T * 3) % 2 ? 'talk' : 'stern'); crowd.update(T, 'stand'); };
  return g;
});

pod('lobby', (P) => {
  const g = new THREE.Group();
  const marble = M('lobbyMarble', () => { const t = tileTex('#c8c0b0', '#a8a090', 4); t.repeat.set(8, 8); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.1 }); });
  g.add(makeRoom({ w: 24, d: 30, h: 12, wall: 0x8a8478, floorMat: marble }));
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const door = box(1.6, 2.6, 0.1, MAT.chrome(), s * 6, 1.3, -12 + i * 3.4, g); door.rotation.y = Math.PI / 2; }
  for (let i = 0; i < 6; i++) { const col = box(1.2, 12, 1.2, M('lobbyCol', () => std(0xb8bcc0, { r: 0.3, m: 0.8 })), -10 + i * 4, 6, -14.4, g); }
  for (let i = 0; i < 5; i++) box(0.3, 1, 0.8, MAT.chrome(), -4 + i * 2, 0.5, 6, g);
  const guard = person({ seed: 901, jacket: '#1a2030', pants: '#1a2030', headwear: 'cap', capColor: '#1a2030', skin: '#7f5136' }, 0, 2, Math.PI, g);
  const fl = new THREE.SpotLight(0xfff4e0, 40, 30, 0.25, 0.4, 1.2); fl.castShadow = true; guard.j.wrR.add(fl); fl.position.set(0, -0.1, 0.05); const flt = new THREE.Object3D(); flt.position.set(0, -1, 4); guard.j.wrR.add(flt); fl.target = flt;
  P.people.push(guard);
  P.lights = roomLights(g, [['p', 0x3a4a7a, 6, 0, 10, 0, 40], ['p', 0xffd8a0, 4, 8, 3, -10, 14]]);
  P.update = (T, lt) => { guard.pose('walk', T, { speed: 0.7, amp: 0.6 }); guard.root.position.z = 4 - lt * 0.9; guard.j.shR.rotation.x = -0.8; guard.j.elR.rotation.x = -0.3; };
  return g;
});

pod('studio', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 14, d: 10, h: 5, wall: 0x0a1428, floor: 0x14181e }));
  const desk = box(4, 0.95, 1.2, M('newsDesk', () => std(0x1a2a5a, { r: 0.25, m: 0.6 })), 0, 0.475, -1.5, g);
  box(4.1, 0.05, 1.3, M('newsDeskTop', () => std(0xd8dce4, { r: 0.15, m: 0.8 })), 0, 0.97, -1.5, g);
  P.chyron = new Screen(512, 288, SCR.newsChyron);
  P.tvMat = tvMaterial(P.chyron.tex);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), P.tvMat); wall.position.set(1.6, 2.4, -4.95); g.add(wall);
  P.wallScreen = wall;
  const anchor = person({ seed: 911, jacket: '#1c2230', tie: '#8a1c24', hair: 'side', hairColor: '#4a3a2a' }, -0.7, -1.9, 0, g);
  P.people.push(anchor);
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.3), glow(0xfff4e0, 4)); l.position.set(-4 + i * 2, 4.7, 2); g.add(l); }
  P.lights = roomLights(g, [['s', 0xfff4e8, 60, -0.7, 4.5, 2, 12], ['p', 0x4a7aff, 8, 0, 3, -4, 12], ['p', 0xffd0b0, 6, -3, 2, 1, 10]]);
  P.update = (T) => { anchor.pose('sit', T, { seatH: 0.5 }); anchor.j.shL.rotation.x = anchor.j.shR.rotation.x = -0.7; anchor.setExpr(Math.floor(T * 4) % 3 ? 'talk' : 'worried'); };
  return g;
});

pod('tvwall', (P) => {
  const g = new THREE.Group();
  const facade = box(14, 6, 0.5, M('storeFacade', () => std(0x2a2a2e, { r: 0.6 })), 0, 3, -2.25, g);
  box(14, 0.1, 8, M('sidewalkDay', () => std(0x9a968e, { r: 0.8 })), 0, 0, 2, g);
  P.chyron = new Screen(512, 384, SCR.newsChyron);
  P.tvMat = tvMaterial(P.chyron.tex);
  const tvs = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const tv = makeTV(null, { w: 1.0, h: 0.78 }); tv.position.set(-4.4 + c * 2.2, 0.6 + r * 1.05, -1.8); g.add(tv);
    tv.userData.screen.material = P.tvMat; tvs.push(tv);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.6), MAT.glass()); glass.position.set(0, 2, -1.2); g.add(glass);
  const people = [];
  for (let i = 0; i < 7; i++) { const p = person({ seed: 921 + i, female: i % 3 === 1, jacket: i % 2 ? '#2a2e36' : null }, -3 + i * 1.0, 0.5 + (i % 2) * 0.7, Math.PI, g); people.push(p); }
  P.people.push(...people);
  P.lights = roomLights(g, [['d', 0xfff2e0, 2.2, 3, 8, 8], ['p', 0x9ab8ff, 8, 0, 1.8, -0.6, 8]]);
  P.update = (T) => people.forEach((p, i) => { p.pose(i % 3 === 0 ? 'coverMouth' : i % 3 === 1 ? 'handsHead' : 'stand', T + i); p.setExpr('shock'); });
  return g;
});

pod('atc', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 14, d: 10, h: 3.2, wall: 0x14181c, floor: 0x16181a }));
  P.radars = [];
  for (let i = 0; i < 4; i++) {
    const x = -4.5 + i * 3;
    const con = box(2.2, 1.0, 1.2, M('atcConsole', () => std(0x3a4044, { r: 0.6 })), x, 0.5, -2, g);
    const scr = new Screen(512, 512, SCR.radar); P.radars.push(scr);
    const k = i;
    P.screens.push([scr, (T) => scr.update(T, { blips: (P.blips && k === 1) ? P.blips : P.blipsBase[k] })]);
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) }));
    s.position.set(x, 1.12, -1.75); s.rotation.x = -0.9; g.add(s);
    const c = person({ seed: 931 + i, jacket: null, shirt: ['#e8e6e0', '#9fb6d6', '#efe4cf', '#d6c8a8'][i], glasses: i === 1 }, x, -0.85, Math.PI, g);
    const hs = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 16, Math.PI), MAT.black()); hs.position.y = 0.03; c.j.head.add(hs);
    P.people.push(c);
  }
  P.blipsBase = [0, 1, 2, 3].map((k) => Array.from({ length: 7 }, (_, i) => ({ x: (hash(i * 7 + k) - 0.5) * 1.5, y: (hash(i * 13 + k) - 0.5) * 1.5, label: ['UAL93', 'DAL1989', 'USA583', 'AAL77', 'COA12', 'NWA45', 'TWA88'][(i + k) % 7], alt: `${280 + (i * 10)}`, trail: [0.01, 0.005] })));
  P.lights = roomLights(g, [['p', 0x3aff8a, 5, 0, 1.6, -1.2, 10], ['p', 0x5a6a8a, 3, 0, 3, 3, 14]]);
  P.update = (T) => P.people.forEach((p, i) => { p.pose('sit', T + i, { seatH: 0.5 }); p.j.shL.rotation.x = p.j.shR.rotation.x = -0.9; p.j.head.rotation.x = 0.35; });
  return g;
});

pod('bunker', (P) => {
  const g = new THREE.Group();
  const conc = M('bunkerConcrete', () => new THREE.MeshStandardMaterial({ map: (() => { const t = concreteTex(0.7); t.repeat.set(4, 2); return t; })(), roughness: 0.9 }));
  g.add(makeRoom({ w: 6, d: 20, h: 4, wallMat: conc, floorMat: conc }));
  // massive round blast door
  P.door = new THREE.Group(); P.door.position.set(0, 2, -9.6);
  const d = cyl(1.9, 1.9, 0.9, M('blastDoor', () => std(0x6a6c6e, { r: 0.4, m: 0.8 })), 0, 0, 0, P.door, 40); d.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const bolt = cyl(0.1, 0.1, 0.3, MAT.chrome(), Math.cos(i * 0.785) * 1.6, Math.sin(i * 0.785) * 1.6, 0.5, P.door, 10); bolt.rotation.x = Math.PI / 2; }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 24), MAT.chrome()); wheel.position.z = 0.5; P.door.add(wheel); P.wheel = wheel;
  g.add(P.door);
  P.red = [];
  for (let i = 0; i < 4; i++) { const l = cyl(0.08, 0.08, 0.15, glow(0xff2010, 3), 2.9, 3.5, -8 + i * 5, g, 10); l.rotation.z = Math.PI / 2; P.red.push(l); }
  const officials = [];
  for (let i = 0; i < 4; i++) officials.push(person({ seed: 941 + i, jacket: ['#1c2230', '#24262c', '#1a2030', '#3a3e48'][i], female: i === 2 }, -0.8 + (i % 2) * 1.4, -2 - i * 1.6, Math.PI, g));
  P.people.push(...officials);
  P.lights = roomLights(g, [['p', 0xff3020, 8, 0, 3.6, -4, 14], ['p', 0xb8c0d0, 3, 0, 3.6, 4, 12]]);
  P.update = (T, lt) => { officials.forEach((p, i) => { p.pose('walk', T + i, { speed: 1.2 }); p.root.position.z = -2 - i * 1.6 - lt * 1.4; }); P.red.forEach((l, i) => (l.visible = Math.sin(T * 6 + i) > 0)); };
  return g;
});

pod('classroom', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 6, d: 6, h: 3, wall: 0xd8dce0, floor: 0x9a8a72 }));
  box(1.4, 0.04, 0.8, M('schoolDesk', () => std(0xc8a878, { r: 0.5 })), 0, 0.74, 0, g);
  const bookTex = canvasTex(1400, 980, (c, w, h) => {
    c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#e4e0d6'; c.fillRect(w / 2 - 4, 0, 8, h);
    c.fillStyle = '#7a1418'; c.font = '800 46px "Inter Tight"'; c.fillText('CHAPTER 14', 60, 90);
    c.fillStyle = '#111'; c.font = '700 52px "Playfair Display"'; c.fillText('September 11, 2001', 60, 160);
    c.fillStyle = '#333'; c.font = '400 26px "Inter Tight"';
    const lines = ['On the morning of September 11, 2001, nineteen', 'hijackers took control of four commercial airliners.', 'Two were flown into the Twin Towers of the World', 'Trade Center in New York City, one into the', 'Pentagon, and one crashed in a field near', 'Shanksville, Pennsylvania. Nearly 3,000 people', 'were killed. The attacks led to the War on', 'Terror and reshaped security around the world.'];
    lines.forEach((l, i) => c.fillText(l, 60, 230 + i * 40));
    // photo: twin towers silhouette
    c.fillStyle = '#9ac0e8'; c.fillRect(w / 2 + 60, 80, 560, 520);
    c.fillStyle = '#5a6a7a'; for (let i = 0; i < 20; i++) c.fillRect(w / 2 + 60 + i * 28, 480 - hash(i) * 120, 24, 200);
    c.fillStyle = '#c8ccd0'; c.fillRect(w / 2 + 260, 160, 60, 440); c.fillRect(w / 2 + 340, 180, 60, 420); c.fillRect(w / 2 + 288, 110, 4, 50);
    c.fillStyle = '#333'; c.font = 'italic 400 22px "Playfair Display"'; c.fillText('The World Trade Center, 2000.', w / 2 + 60, 640);
  }, { clamp: true });
  const book = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.43), new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.85 })); book.rotation.x = -Math.PI / 2; book.position.set(0, 0.765, 0.05); g.add(book);
  const phone = box(0.075, 0.008, 0.15, M('smartphone', () => std(0x111114, { r: 0.2, m: 0.5 })), 0.45, 0.765, 0.1, g); phone.rotation.y = 0.3;
  const st = person({ seed: 951, jacket: null, shirt: '#e86a1c', female: true }, 0, 0.6, Math.PI, g);
  P.people.push(st);
  P.lights = roomLights(g, [['s', 0xfff6ea, 20, 0, 2.8, 0.8, 6], ['p', 0xdfeeff, 3, -2.5, 2, -1, 8]]);
  P.update = (T) => st.pose('read', T, { sit: true, seatH: 0.48 });
  return g;
});

pod('newspaper', (P) => {
  const g = new THREE.Group();
  g.add(makeRoom({ w: 6, d: 6, h: 3, wall: 0x6a5040, floor: 0x3a2a1e }));
  const tbl = cyl(0.45, 0.45, 0.03, M('cafeTable', () => std(0x2a2a2a, { r: 0.3, m: 0.6 })), 0, 0.74, 0, g, 30);
  const paperTex = canvasTex(1100, 1500, (c, w, h) => {
    c.fillStyle = '#efeadd'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#111'; c.font = '700 120px "Playfair Display", serif'; c.textAlign = 'center'; c.fillText('Le Monde', w / 2, 140);
    c.fillRect(40, 170, w - 80, 4); c.font = '400 26px "Inter Tight"'; c.fillText('MERCREDI 12 SEPTEMBRE 2001', w / 2, 210); c.fillRect(40, 228, w - 80, 2);
    c.font = '800 96px "Playfair Display", serif'; c.fillText('Nous sommes tous', w / 2, 360); c.fillText('Américains', w / 2, 470);
    c.fillStyle = '#5a6a7a'; c.fillRect(80, 520, w - 160, 560);
    c.fillStyle = '#8a8a88'; for (let i = 0; i < 30; i++) c.fillRect(80 + i * 32, 900 - hash(i) * 200, 28, 200 + hash(i) * 200);
    c.fillStyle = '#2a2a2a'; c.fillRect(420, 600, 80, 480); c.fillRect(560, 640, 80, 440);
    c.fillStyle = 'rgba(40,40,40,0.65)'; c.beginPath(); c.ellipse(560, 600, 300, 120, -0.3, 0, Math.PI * 2); c.fill();
    c.textAlign = 'left'; c.fillStyle = '#333'; c.font = '400 20px "Inter Tight"';
    for (let col = 0; col < 3; col++) for (let i = 0; i < 14; i++) c.fillRect(80 + col * 320, 1120 + i * 26, 280 - hash(i + col) * 60, 10);
  }, { clamp: true });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9, side: THREE.DoubleSide }));
  paper.rotation.x = -Math.PI / 2 + 0.1; paper.position.set(0, 0.77, 0.05); g.add(paper); P.paper = paper;
  const cup = cyl(0.04, 0.03, 0.06, M('espresso', () => std(0xf2f2ee, { r: 0.3 })), 0.3, 0.79, -0.15, g, 14);
  const candle = cyl(0.03, 0.03, 0.12, M('candle', () => std(0xf2ecdc, { r: 0.6 })), -0.3, 0.82, -0.2, g, 12);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow(0xffa040, 6)); flame.scale.y = 2; flame.position.set(-0.3, 0.905, -0.2); g.add(flame);
  P.lights = roomLights(g, [['p', 0xffb060, 2.5, -0.3, 1.1, -0.2, 4], ['p', 0xffd8a0, 4, 1, 2.6, 1, 8]]);
  P.update = (T) => { flame.scale.y = 2 + Math.sin(T * 13) * 0.3; };
  return g;
});

pod('flyers', (P) => {
  const g = new THREE.Group();
  const faded = P.variant === 'faded';
  box(16, 6, 0.6, M('flyerBrick', () => new THREE.MeshStandardMaterial({ map: (() => { const t = brickTex([130, 64, 50]); t.repeat.set(5, 2); return t; })(), roughness: 0.9 })), 0, 3, -0.3, g);
  box(16, 0.1, 6, M('sidewalkDay2', () => std(0x8a867e, { r: faded ? 0.25 : 0.85, m: faded ? 0.2 : 0 })), 0, 0, 3, g);
  const r = rng(5);
  const flyerTex = (i) => canvasTex(300, 400, (c, w, h) => {
    c.fillStyle = faded ? '#d8d4c4' : '#f8f6ee'; c.fillRect(0, 0, w, h);
    c.fillStyle = faded ? '#8a6a6a' : '#b01018'; c.font = '800 54px "Inter Tight"'; c.textAlign = 'center'; c.fillText('MISSING', w / 2, 62);
    const hue = (i * 53) % 360; c.fillStyle = `hsl(${hue},20%,${faded ? 60 : 45}%)`; c.fillRect(50, 85, 200, 170);
    c.fillStyle = `hsl(${(i * 37) % 40 + 20},35%,${faded ? 75 : 62}%)`; c.beginPath(); c.ellipse(150, 165, 48, 60, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a3030'; c.beginPath(); c.ellipse(150, 120, 52, 30, 0, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = faded ? '#7a7a7a' : '#222'; c.font = '700 22px "Inter Tight"'; c.fillText('HAVE YOU SEEN', w / 2, 290); c.font = '400 18px "Inter Tight"';
    for (let k = 0; k < 4; k++) c.fillRect(40 + hash(i + k) * 20, 310 + k * 20, 220 - hash(i * 3 + k) * 60, 8);
    if (faded) { c.fillStyle = 'rgba(120,110,90,0.35)'; for (let k = 0; k < 30; k++) c.fillRect(hash(i * 5 + k) * w, hash(i * 7 + k) * h, 4, 40 + hash(k) * 80); }
  }, { clamp: true });
  for (let i = 0; i < 64; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: flyerTex(i % 16), roughness: 0.85, side: THREE.DoubleSide }));
    f.position.set(-6 + (i % 16) * 0.75 + (r() - 0.5) * 0.2, 1.1 + Math.floor(i / 16) * 0.5 + (r() - 0.5) * 0.12, 0.01 + i * 0.0005);
    f.rotation.z = (r() - 0.5) * 0.15;
    if (faded) { f.rotation.x = (r() - 0.5) * 0.3; if (r() < 0.25) f.visible = false; }
    g.add(f); P.flyers = P.flyers || []; P.flyers.push([f, f.position.clone(), f.rotation.clone(), f.visible]);
  }
  // candles & flowers on the ground
  P.flames = [];
  for (let i = 0; i < 40; i++) {
    const x = -6 + r() * 12, z = 0.3 + r() * 0.9;
    const cd = cyl(0.04, 0.04, 0.1 + r() * 0.1, M('candleRed' + (i % 3), () => std([0xc8232c, 0xf2ecdc, 0x2a4a8a][i % 3], { r: 0.6, transparent: true, opacity: 0.85 })), x, 0.1, z, g, 10);
    if (!faded) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), glow(0xffa040, 6)); fl.position.set(x, 0.22 + 0.05, z); fl.scale.y = 2; g.add(fl); P.flames.push(fl); }
  }
  for (let i = 0; i < 20; i++) { const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), M('flower' + (i % 3), () => std([0xf2f2f2, 0xd83a5a, 0xf2c40c][i % 3], { r: 0.7 }))); fl.position.set(-6 + r() * 12, 0.12, 0.3 + r() * 0.5); fl.rotation.z = Math.PI / 2 + (r() - 0.5); g.add(fl); }
  const hand = new Person({ seed: 961, female: true, jacket: '#3a3e48' }); hand.root.position.set(1.2, 0, 0.85); hand.root.rotation.y = Math.PI; g.add(hand.root); P.people.push(hand);
  P.reset = () => { for (const [f, pos, rot, vis] of P.flyers) { f.position.copy(pos); f.rotation.copy(rot); f.visible = vis; } };
  P.lights = roomLights(g, faded ? [['d', 0xc8d0dc, 1.6, 2, 6, 6]] : [['d', 0xffd8a8, 2.2, -3, 5, 6], ['p', 0xffa040, 2, 0, 0.5, 1.2, 6]]);
  P.update = (T, lt) => { P.flames.forEach((f, i) => (f.scale.y = 2 + Math.sin(T * 11 + i) * 0.35)); hand.pose('stand', T); hand.j.shL.rotation.x = -1.6 - Math.sin(lt * 2) * 0.05; hand.j.shR.rotation.x = -1.6; hand.j.elL.rotation.x = -0.4; hand.j.elR.rotation.x = -0.4; hand.root.visible = !!P.showHand; };
  return g;
});

pod('security', (P) => {
  // airport checkpoint (2001 / modern variant)
  const g = new THREE.Group();
  const modern = P.variant === 'modern';
  g.add(makeRoom({ w: 24, d: 18, h: 5, wall: 0xd8d8d2, floorMat: M('terminalFloor', () => { const t = tileTex('#c8c4bc', '#a8a49c', 6); t.repeat.set(8, 6); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.1 }); }) }));
  P.xray = new Screen(512, 320, SCR.xray);
  P.screens.push([P.xray, (T, lt) => P.xray.update(lt, { ok: P.xrayOk })]);
  for (let i = 0; i < 2; i++) {
    const x = -3 + i * 6;
    const md = makeMetalDetector(); md.position.set(x, 0, 0); g.add(md);
    const xr = makeXray(i === 0 ? P.xray.tex : null); xr.position.set(x - 1.8, 0, 0.5); g.add(xr);
    for (let k = 0; k < 5; k++) { const st = makeStanchion(); st.position.set(x - 0.6 + (k % 2) * 1.2, 0, 2 + k * 1.1); g.add(st); }
  }
  if (modern) { const scanner = new THREE.Group(); const sm = M('scannerBody', () => std(0xe8e8e8, { r: 0.4 })); box(0.4, 2.4, 1.6, sm, -1.1, 1.2, 0, scanner); box(0.4, 2.4, 1.6, sm, 1.1, 1.2, 0, scanner); box(2.6, 0.3, 1.6, sm, 0, 2.5, 0, scanner); scanner.position.set(6, 0, -1); g.add(scanner);
    for (let i = 0; i < 6; i++) { const b = makeBin(); b.position.set(-4.8, 0.8, -1.5 + i * 0.5); g.add(b); }
  }
  const pax = [];
  for (let i = 0; i < (modern ? 16 : 10); i++) { const p = person({ seed: 970 + i, female: i % 3 === 1, jacket: i % 2 ? '#2a2e36' : null, shirt: ['#e8e6e0', '#9fb6d6', '#c86a5a', '#efe4cf'][i % 4], skin: ['#f1c7a5', '#c48a62', '#7f5136', '#e8b896'][i % 4] }, -3 + (i % 2) * 0.4, 1.5 + i * 0.9, Math.PI, g); pax.push(p); }
  const tsa = [person({ seed: 990, jacket: modern ? '#1c2a4a' : '#e8e6e0', pants: '#1c2230' }, -4.4, 0.2, Math.PI / 2, g), person({ seed: 991, jacket: modern ? '#1c2a4a' : '#e8e6e0', pants: '#1c2230', female: true }, -2.0, -1.0, Math.PI, g)];
  P.people.push(...pax, ...tsa);
  const bags = []; for (let i = 0; i < 4; i++) { const b = makeBag([0x2a2a3a, 0x5a2a2a, 0x2a4a3a, 0x3a3a3a][i], i); g.add(b); bags.push(b); }
  for (let i = 0; i < 6; i++) { const l = makeCeilingLight(2.5, 0.6, 3); l.position.set(-6 + (i % 3) * 6, 4.97, -3 + Math.floor(i / 3) * 6); g.add(l); }
  const board = makeSign(canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#0a1a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd400'; c.font = '700 52px "Inter Tight"'; c.fillText('SECURITY CHECKPOINT', 20, 70); c.fillStyle = '#fff'; c.font = '400 30px "Inter Tight"'; c.fillText(modern ? 'REMOVE SHOES • LIQUIDS 3-1-1' : 'GATES  B1 - B32', 20, 125); }, { clamp: true }), 4, 1.25, { emissive: 1.5 });
  board.position.set(0, 4, -8.9); g.add(board);
  P.lights = roomLights(g, [['p', 0xf6f8ff, 14, -3, 4.5, 2, 22], ['p', 0xf6f8ff, 14, 4, 4.5, 2, 22], ['d', 0xfff2e0, 1.2, 4, 10, 8]]);
  P.update = (T, lt) => {
    pax.forEach((p, i) => { const q = (lt * 0.5 + i * 0.6); p.pose(i === 0 ? 'walk' : 'stand', T + i, { speed: 0.6, amp: 0.6 }); if (i === 0) p.root.position.z = 1.2 - Math.min(q, 2.6); });
    tsa[0].pose('arms', T); tsa[1].pose('stand', T);
    bags.forEach((b, i) => { b.position.set(-4.8, 0.82, 2.4 - ((lt * 0.35 + i * 1.1) % 4.4)); });
  };
  return g;
});

pod('cabin', (P) => {
  // airliner cabin (Boeing 757/767), looking forward
  const g = new THREE.Group();
  const shellM = M('cabinShell', () => std(0xe8e4dc, { r: 0.7, side: THREE.BackSide }));
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 30, 32, 1, true), shellM); shell.rotation.x = Math.PI / 2; shell.position.set(0, 1.2, -10); g.add(shell);
  box(4.6, 0.05, 30, M('cabinCarpet', () => { const t = carpetTex([40, 50, 90], [36, 44, 80]); t.repeat.set(4, 30); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }), 0, 0.0, -10, g);
  const seatM = M('seatFab', () => std(0x2a3a6a, { r: 0.9 }));
  const seatM2 = M('seatFabBiz', () => std(0x5a2a3a, { r: 0.85 }));
  const r = rng(3);
  P.pax = [];
  for (let row = 0; row < 14; row++) {
    const z = -2 - row * 0.85 + (row < 3 ? -0.3 * row : -1);
    const biz = row < 3;
    for (const sx of biz ? [-1.3, -0.7, 0.7, 1.3] : [-1.5, -1.0, -0.5, 0.5, 1.0, 1.5]) {
      const s = new THREE.Group();
      box(biz ? 0.55 : 0.46, 0.12, 0.5, biz ? seatM2 : seatM, 0, 0.45, 0, s);
      box(biz ? 0.55 : 0.46, 0.75, 0.1, biz ? seatM2 : seatM, 0, 0.85, 0.25, s);
      box(biz ? 0.5 : 0.4, 0.15, 0.08, M('headrest', () => std(0xe8e4dc, { r: 0.8 })), 0, 1.15, 0.27, s);
      s.position.set(sx, 0, z); s.rotation.y = 0; g.add(s);
      if (r() < 0.75) { const p = new Person({ seed: 1000 + row * 7 + Math.round(sx * 10), female: r() < 0.45, jacket: r() < 0.4 ? '#2a2e36' : null, skin: ['#f1c7a5', '#e8b896', '#c48a62', '#7f5136'][Math.floor(r() * 4)] }); p.root.position.set(sx, 0, z - 0.05); p.root.rotation.y = Math.PI; g.add(p.root); P.pax.push(p); }
    }
  }
  // overhead bins + windows
  for (const s of [-1, 1]) {
    box(0.8, 0.45, 28, M('bins', () => std(0xf2f0ea, { r: 0.6 })), s * 1.75, 2.15, -10, g);
    for (let i = 0; i < 18; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.35), glow(P.variant === 'dark' ? 0x6a7a9a : 0xcfe4ff, P.variant === 'dark' ? 1.2 : 3)); w.position.set(s * 2.25, 1.35, -1.5 - i * 0.9); w.rotation.y = -s * Math.PI / 2; g.add(w); }
  }
  // cockpit door + bulkhead
  box(4.8, 2.6, 0.12, M('bulkhead', () => std(0xd8d2c6, { r: 0.6 })), 0, 1.3, 0.4, g);
  P.cdoor = new THREE.Group(); P.cdoor.position.set(-0.45, 0, 0.32);
  box(0.9, 2.0, 0.06, M('cockpitDoor', () => std(0xc8c0b0, { r: 0.5 })), 0.45, 1.0, 0, P.cdoor);
  box(0.06, 0.12, 0.06, MAT.chrome(), 0.8, 1.0, -0.04, P.cdoor);
  g.add(P.cdoor);
  P.lights = roomLights(g, [['p', 0xfff2dc, 6, 0, 2.2, -3, 10], ['p', 0xfff2dc, 6, 0, 2.2, -9, 10], ['p', 0xfff2dc, 4, 0, 2.2, -14, 10]]);
  P.red = new THREE.PointLight(0xff2010, 0, 14, 1.4); P.red.position.set(0, 2.2, -5); g.add(P.red);
  P.update = (T, lt) => { P.pax.forEach((p, i) => p.pose(P.paxPose ? P.paxPose(i, T) : 'sit', T + i, { seatH: 0.47 })); };
  return g;
});

// ======================= SET =======================
export class RoomsSet extends BaseSet {
  constructor(v) { super(v); this.near = 0.05; this.far = 300; }
  build(r) {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x000000);
    s.environment = envRoom(r, 'roomsEnv', { wall: 0x5a524a });
    s.environmentIntensity = 0.45;
    this.hemi = new THREE.HemisphereLight(0xc8d0e0, 0x3a3028, 0.35); s.add(this.hemi);
    this.pods = {};
    this.podIndex = 0;
    this.post = { vignette: 0.45, bloomStr: 0.6, exposure: 1.05 };
  }
  // get (build if needed) a pod by name[:variant]; becomes the only visible pod
  pod(key) {
    let P = this.pods[key];
    if (!P) {
      const [name, variant] = key.split(':');
      const fn = PODS[name];
      if (!fn) throw new Error('unknown pod ' + name);
      P = { name, variant, people: [], screens: [], update: () => {}, lights: [] };
      const g = fn(P);
      g.position.set(this.podIndex * 200, 0, 0);
      this.podIndex++;
      P.group = g; P.origin = g.position.clone();
      P.homes = [...P.people, ...(P.pax || [])].map((q) => [q, q.root.position.clone(), q.root.rotation.clone()]);
      this.scene.add(g);
      this.pods[key] = P;
    }
    for (const k in this.pods) this.pods[k].group.visible = this.pods[k] === P;
    this.active = P;
    // default per-shot state (shots override after calling pod())
    Object.assign(P, { mode: null, alert: false, simParams: null, instrPose: 'arms', feed: null, chyronFn: null, blips: null, xrayOk: false, paxPose: null, showHand: false });
    P.people.forEach((p) => p.setExpr(p.o.expr || 'neutral'));
    for (const [q, pos, rot] of P.homes) { q.root.position.copy(pos); q.root.rotation.copy(rot); q.root.visible = true; q.setExpr(q.o.expr || 'neutral'); }
    for (const [scr] of P.screens) scr.last = -1;
    if (P.reset) P.reset();
    return P;
  }
  reset() { for (const k in this.pods) this.pods[k].group.visible = false; this.active = null; this.hemi.intensity = 0.35; }
  // pod-local -> world coordinates helper for cameras
  w(p) { const o = this.active.origin; return [p[0] + o.x, p[1] + o.y, p[2] + o.z]; }
  update(ctx) {
    const P = this.active;
    if (!P) return;
    P.update(ctx.T, ctx.lt, ctx);
    for (const [scr, fn] of P.screens) fn(ctx.T, ctx.lt);
    if (P.chyron && P.chyronFn) P.chyronFn(ctx);
  }
  preRender(r, ctx) {
    const P = this.active;
    if (P && P.feed) P.feed(r, ctx);
  }
}
