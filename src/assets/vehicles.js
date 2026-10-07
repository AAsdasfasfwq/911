// Vehicles built from extruded side profiles (bevelled) + wheels + emissive lights.
// Forward = +Z, ground at y = 0.
import * as THREE from 'three';
import { std, M, MAT } from './materials.js';
import { canvasTex, cached } from './textures.js';

function profileExtrude(pts, width, bevel = 0.06) {
  // pts in (z, y) side view; extrude across x
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // shape x(z-axis of car) -> world z
  g.computeVertexNormals();
  return g;
}

function wheelSet(group, positions, r = 0.34, w = 0.24) {
  const tire = new THREE.CylinderGeometry(r, r, w, 20); tire.rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 14); hub.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [x, z] of positions) {
    const t = new THREE.Mesh(tire, MAT.rubber()); t.position.set(x, r, z); t.castShadow = true; group.add(t);
    const h = new THREE.Mesh(hub, M('hub', () => std(0xb8bcc0, { r: 0.3, m: 0.9 }))); h.position.set(x, r, z); group.add(h);
    wheels.push(t, h);
  }
  return wheels;
}

const glow = (c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) });

// kind: sedan | taxi | police | suv | pickup
export function makeCar(kind = 'sedan', color) {
  const g = new THREE.Group();
  const cols = { sedan: color || '#5a6a7a', taxi: '#f2c10c', police: '#f2f2f0', suv: color || '#2a2e34', pickup: color || '#8a2a24' };
  const paint = new THREE.MeshPhysicalMaterial({ color: cols[kind], roughness: 0.28, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08 });
  const L = kind === 'suv' ? 4.8 : kind === 'pickup' ? 5.4 : 4.9, W = kind === 'suv' ? 1.95 : 1.85;
  const h0 = 0.32;
  let body, cabin;
  if (kind === 'pickup') {
    body = [[-L / 2, h0], [L / 2, h0], [L / 2, 0.95], [L / 2 - 0.9, 1.08], [-L / 2, 1.05]];
    cabin = [[-0.4, 1.04], [0.95, 1.04], [0.55, 1.72], [-0.35, 1.72]];
  } else if (kind === 'suv') {
    body = [[-L / 2, h0], [L / 2, h0], [L / 2, 0.95], [L / 2 - 0.8, 1.1], [-L / 2, 1.1]];
    cabin = [[-L / 2 + 0.15, 1.08], [L / 2 - 0.9, 1.08], [L / 2 - 1.55, 1.8], [-L / 2 + 0.2, 1.8]];
  } else {
    body = [[-L / 2, h0], [L / 2, h0], [L / 2, 0.78], [L / 2 - 1.0, 0.92], [-L / 2 + 0.3, 0.95], [-L / 2, 0.85]];
    cabin = [[-L / 2 + 0.75, 0.92], [L / 2 - 1.25, 0.92], [L / 2 - 1.95, 1.42], [-L / 2 + 1.3, 1.42]];
  }
  const b = new THREE.Mesh(profileExtrude(body, W, 0.08), paint); b.castShadow = true; b.receiveShadow = true; g.add(b);
  const c = new THREE.Mesh(profileExtrude(cabin, W - 0.12, 0.06), MAT.darkGlass()); c.castShadow = true; g.add(c);
  // roof slab
  const roofY = cabin[2][1];
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, 0.06, Math.abs(cabin[2][0] - cabin[3][0]) + 0.1), paint);
  roof.position.set(0, roofY + 0.01, (cabin[2][0] + cabin[3][0]) / 2); g.add(roof);
  const wz = L / 2 - 0.85;
  g.userData.wheels = wheelSet(g, [[W / 2 - 0.1, wz], [-W / 2 + 0.1, wz], [W / 2 - 0.1, -wz + 0.1], [-W / 2 + 0.1, -wz + 0.1]]);
  // lights
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.04), glow(0xfff4e0, 3)); hl.position.set(s * (W / 2 - 0.3), 0.72, L / 2 + 0.01); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.04), glow(0xff2010, 2)); tl.position.set(s * (W / 2 - 0.3), 0.75, -L / 2 - 0.01); g.add(tl);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.25), glow(0xfff2c0, 1.6)); sign.position.set(0, roofY + 0.15, (cabin[2][0] + cabin[3][0]) / 2); g.add(sign);
    const chk = new THREE.Mesh(new THREE.BoxGeometry(W + 0.01, 0.08, 1.6), M('taxiChk', () => std(0x111111, { r: 0.5 }))); chk.position.set(0, 0.62, 0); g.add(chk);
  }
  if (kind === 'police') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(W + 0.01, 0.12, L * 0.8), M('nypdBlue', () => std(0x1f3c8c, { r: 0.4 }))); stripe.position.set(0, 0.6, 0); g.add(stripe);
    const bar = new THREE.Group(); bar.position.set(0, roofY + 0.1, (cabin[2][0] + cabin[3][0]) / 2);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22), glow(0xff1a10, 6)); red.position.x = 0.32;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22), glow(0x2050ff, 6)); blue.position.x = -0.32;
    bar.add(red, blue); g.add(bar);
    g.userData.siren = [red, blue];
  }
  g.userData.paint = paint;
  return g;
}

export function sirenTick(car, t) {
  const s = car.userData.siren;
  if (!s) return;
  const a = Math.sin(t * 14) > 0;
  s[0].visible = a; s[1].visible = !a;
}

export function makeFireTruck() {
  const g = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: 0xb01218, roughness: 0.3, metalness: 0.4, clearcoat: 1 });
  const chrome = MAT.chrome();
  const body = new THREE.Mesh(profileExtrude([[-4.5, 0.6], [2.2, 0.6], [2.2, 2.6], [-4.5, 2.6]], 2.4, 0.06), red); g.add(body);
  const cab = new THREE.Mesh(profileExtrude([[2.2, 0.6], [4.4, 0.6], [4.4, 2.0], [4.0, 3.0], [2.2, 3.0]], 2.4, 0.08), red); g.add(cab);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.05), MAT.darkGlass()); ws.position.set(0, 2.45, 4.25); ws.rotation.x = -0.4; g.add(ws);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 1.2), MAT.darkGlass()); sw.position.set(s * 1.22, 2.4, 3.2); g.add(sw); }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.15, 8.8), M('ftStripe', () => std(0xf0f0e8, { r: 0.3 }))); stripe.position.set(0, 1.2, -0.05); g.add(stripe);
  // ladder
  const lad = new THREE.Group(); lad.position.set(0, 2.9, -1);
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 8), chrome); rail.position.x = s * 0.45; lad.add(rail); }
  for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), chrome); r.rotation.z = Math.PI / 2; r.position.z = -3.8 + i * 0.5; lad.add(r); }
  g.add(lad);
  const bar = new THREE.Group(); bar.position.set(0, 3.1, 3.6);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.25), glow(0xff1a10, 6)); r1.position.x = 0.5;
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.25), glow(0xff1a10, 6)); r2.position.x = -0.5;
  bar.add(r1, r2); g.add(bar);
  g.userData.siren = [r1, r2];
  g.userData.wheels = wheelSet(g, [[1.15, 3.3], [-1.15, 3.3], [1.15, -2.2], [-1.15, -2.2], [1.15, -3.4], [-1.15, -3.4]], 0.5, 0.35);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeAmbulance() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: 0.3, metalness: 0.3, clearcoat: 1 });
  g.add(new THREE.Mesh(profileExtrude([[-3.2, 0.5], [1.4, 0.5], [1.4, 2.7], [-3.2, 2.7]], 2.2, 0.06), white));
  g.add(new THREE.Mesh(profileExtrude([[1.4, 0.5], [3.0, 0.5], [3.0, 1.3], [2.4, 2.1], [1.4, 2.1]], 2.1, 0.08), white));
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 0.05), MAT.darkGlass()); ws.position.set(0, 1.75, 2.75); ws.rotation.x = -0.75; g.add(ws);
  const st = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.25, 6.2), M('ambStripe', () => std(0xc8232c, { r: 0.4 }))); st.position.set(0, 1.3, -0.1); g.add(st);
  const bar = new THREE.Group(); bar.position.set(0, 2.15, 2.0);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.22), glow(0xff1a10, 6)); r1.position.x = 0.35;
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.22), glow(0xffffff, 5)); r2.position.x = -0.35;
  bar.add(r1, r2); g.add(bar);
  g.userData.siren = [r1, r2];
  wheelSet(g, [[1.0, 2.0], [-1.0, 2.0], [1.0, -2.2], [-1.0, -2.2]], 0.4, 0.28);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

export function makeBus(color = '#2a5aa0') {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 });
  g.add(new THREE.Mesh(profileExtrude([[-6, 0.45], [6, 0.45], [6, 3.0], [-6, 3.0]], 2.55, 0.1), paint));
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.58, 1.0, 11.2), MAT.darkGlass()); win.position.set(0, 2.1, 0); g.add(win);
  wheelSet(g, [[1.15, 4], [-1.15, 4], [1.15, -3.6], [-1.15, -3.6]], 0.5, 0.3);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makeTanker() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xe8e8e4, roughness: 0.35, metalness: 0.4 });
  g.add(new THREE.Mesh(profileExtrude([[2.5, 0.5], [5.0, 0.5], [5.0, 1.6], [4.4, 2.6], [2.5, 2.6]], 2.4, 0.08), white));
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 6.5, 6, 18), MAT.chrome()); tank.rotation.x = Math.PI / 2; tank.position.set(0, 1.8, -1.6); g.add(tank);
  wheelSet(g, [[1.1, 4], [-1.1, 4], [1.1, -2.5], [-1.1, -2.5], [1.1, -3.6], [-1.1, -3.6]], 0.5, 0.3);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- military ----------
function camoTex(base = [190, 160, 110]) {
  return cached('camo' + base, () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    const cols = [[base[0] * 0.8, base[1] * 0.78, base[2] * 0.7], [base[0] * 1.08, base[1] * 1.05, base[2] * 1.0], [base[0] * 0.65, base[1] * 0.6, base[2] * 0.55]];
    for (let i = 0; i < 70; i++) { const c = cols[i % 3]; g.fillStyle = `rgb(${c.map((x) => x | 0)})`; g.beginPath(); g.ellipse((i * 97) % w, (i * 53) % h, 10 + (i % 5) * 6, 6 + (i % 3) * 5, i, 0, Math.PI * 2); g.fill(); }
  }));
}

export function makeTank(kind = 'abrams') {
  const g = new THREE.Group();
  const isA = kind === 'abrams';
  const tex = camoTex(isA ? [196, 170, 120] : [120, 120, 90]);
  const hm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.15 });
  const hull = new THREE.Mesh(profileExtrude([[-3.9, 0.5], [3.4, 0.5], [3.9, 1.2], [3.5, 1.65], [-3.9, 1.65]], 3.6, 0.08), hm); g.add(hull);
  // tracks
  const trackM = M('track', () => std(0x2a2724, { r: 0.95 }));
  for (const s of [-1, 1]) {
    const tr = new THREE.Mesh(profileExtrude([[-4.0, 0.12], [3.6, 0.12], [4.1, 0.75], [3.8, 1.05], [-4.0, 1.05], [-4.3, 0.6]], 0.65, 0.05), trackM); tr.position.x = s * 1.55; g.add(tr);
    for (let i = 0; i < 7; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.67, 14), M('roadwheel', () => std(0x3a3630, { r: 0.8 }))); w.rotation.z = Math.PI / 2; w.position.set(s * 1.55, 0.45, -3.2 + i * 1.07); g.add(w); }
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 7.6), hm); skirt.position.set(s * 1.9, 1.15, 0); g.add(skirt);
  }
  // turret
  const tur = new THREE.Group(); tur.position.set(0, 1.65, -0.3);
  const tshape = isA ? [[-2.6, 0], [2.0, 0], [2.6, 0.35], [2.2, 0.85], [-2.6, 0.85]] : [[-1.8, 0], [1.8, 0], [1.5, 0.7], [0, 0.95], [-1.5, 0.7]];
  const t = new THREE.Mesh(profileExtrude(tshape, isA ? 3.2 : 2.6, 0.1), hm); tur.add(t);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 12), hm); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.48, 4.6); tur.add(barrel);
  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), hm); mantlet.position.set(0, 0.45, 2.4); tur.add(mantlet);
  if (isA) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.35, 12), hm); cup.position.set(0.7, 1.0, -0.4); tur.add(cup); }
  g.add(tur);
  g.userData.turret = tur; g.userData.barrel = barrel;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeHumvee() {
  const g = new THREE.Group();
  const hm = new THREE.MeshStandardMaterial({ map: camoTex([196, 170, 120]), roughness: 0.85 });
  g.add(new THREE.Mesh(profileExtrude([[-2.4, 0.55], [2.4, 0.55], [2.4, 1.15], [1.0, 1.3], [-2.4, 1.3]], 2.15, 0.06), hm));
  g.add(new THREE.Mesh(profileExtrude([[-1.6, 1.28], [0.9, 1.28], [0.7, 1.95], [-1.5, 1.95]], 2.0, 0.05), hm));
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.04), MAT.darkGlass()); ws.position.set(0, 1.62, 0.83); ws.rotation.x = -0.3; g.add(ws);
  wheelSet(g, [[1.0, 1.6], [-1.0, 1.6], [1.0, -1.6], [-1.0, -1.6]], 0.45, 0.35);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export { camoTex, profileExtrude };
