// Procedural aircraft: Boeing 767 (American / United liveries), Boeing 757, Cessna 172,
// F-15, B-52, C-17, Black Hawk helicopter. Units: metres. Nose points to +Z, up is +Y.
import * as THREE from 'three';
import { std, M, MAT } from './materials.js';
import { canvasTex, cached } from './textures.js';

// ---------- geometry helpers ----------
function airfoil(n = 12) {
  // closed loop: TE -> upper -> LE -> lower -> TE ; returns [c, t] with t normalized thickness (per unit thickness ratio)
  const pts = [];
  const tc = (c) => 5 * (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4);
  for (let i = 0; i <= n; i++) { const c = 1 - (1 - Math.cos((i / n) * Math.PI)) / 2; pts.push([c, tc(c)]); }
  for (let i = 1; i < n; i++) { const c = (1 - Math.cos((i / n) * Math.PI)) / 2; pts.push([c, -tc(c)]); }
  return pts;
}
const AF = airfoil(12);

// sections: [{le:[x,y,z], chord, thk, cdir:[..], tdir:[..]}]
export function loft(sections, capEnd = true) {
  const pos = [], idx = [];
  const P = AF.length;
  for (const s of sections) {
    for (const [c, t] of AF) {
      pos.push(
        s.le[0] + s.cdir[0] * c * s.chord + s.tdir[0] * t * s.chord * s.thk,
        s.le[1] + s.cdir[1] * c * s.chord + s.tdir[1] * t * s.chord * s.thk,
        s.le[2] + s.cdir[2] * c * s.chord + s.tdir[2] * t * s.chord * s.thk,
      );
    }
  }
  for (let k = 0; k < sections.length - 1; k++) for (let i = 0; i < P; i++) {
    const a = k * P + i, b = k * P + ((i + 1) % P), c = (k + 1) * P + i, d = (k + 1) * P + ((i + 1) % P);
    idx.push(a, c, b, b, c, d);
  }
  if (capEnd) {
    const base = (sections.length - 1) * P;
    const cx = [0, 0, 0];
    for (let i = 0; i < P; i++) for (let j = 0; j < 3; j++) cx[j] += pos[(base + i) * 3 + j] / P;
    const ci = pos.length / 3; pos.push(...cx);
    for (let i = 0; i < P; i++) idx.push(base + i, base + ((i + 1) % P), ci);
  }
  // make faces point outward regardless of span direction (signed volume test)
  const n = pos.length / 3;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; }
  cx /= n; cy /= n; cz /= n;
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ax = pos[a] - cx, ay = pos[a + 1] - cy, az = pos[a + 2] - cz;
    const bx = pos[b] - cx, by = pos[b + 1] - cy, bz = pos[b + 2] - cz;
    const qx = pos[c] - cx, qy = pos[c + 1] - cy, qz = pos[c + 2] - cz;
    vol += ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// fuselage by lathe; profile [[z, r, yOffset]] from tail (z=0) to nose (z=L)
function fuselage(profile, segs = 36) {
  const pts = profile.map(([z, r]) => new THREE.Vector2(Math.max(r, 0.001), z));
  const g = new THREE.LatheGeometry(pts, segs);
  g.rotateX(Math.PI / 2);
  // lathe axis was y -> now z. apply vertical offsets (tail upsweep) and UVs (u along, v around)
  const p = g.attributes.position, uv = g.attributes.uv;
  const L = profile[profile.length - 1][0];
  const yOff = (z) => {
    for (let i = 0; i < profile.length - 1; i++) {
      const [z0, , y0 = 0] = profile[i], [z1, , y1 = 0] = profile[i + 1];
      if (z >= z0 && z <= z1) return y0 + (y1 - y0) * ((z - z0) / (z1 - z0 || 1));
    }
    return 0;
  };
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    p.setY(i, p.getY(i) + yOff(z));
    uv.setXY(i, z / L, uv.getX(i));
  }
  g.translate(0, 0, -L / 2);
  g.computeVertexNormals();
  return g;
}

function nacelle(len = 5, r = 1.4) {
  const prof = [[0, r * 0.62], [0.4, r * 0.8], [1.6, r], [len * 0.75, r * 0.95], [len, r * 0.7]];
  const g = fuselage(prof, 24);
  return g;
}

// ---------- liveries ----------
function liveryTex(kind) {
  return cached('livery_' + kind, () => canvasTex(2048, 512, (g, W, H) => {
    // y mapping: around 0 bottom, 0.25 left(+x), 0.5 top, 0.75 right(-x); canvas y = (1-around)*H
    const yA = (a) => (1 - a) * H;
    const isUA = kind === 'united';
    const base = kind === 'american' ? '#cfd3d8' : kind === 'united' ? '#5c636c' : kind === 'cessna' ? '#f2f2f0' : kind === 'military' ? '#7a848c' : kind === 'c17' ? '#6a7077' : '#e8e9ea';
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // subtle panel lines
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    if (kind === 'american') {
      // metallic sheen variation
      for (let x = 0; x < W; x += 128) { g.fillStyle = `rgba(255,255,255,${0.04 + (x % 256 ? 0.03 : 0)})`; g.fillRect(x, 0, 64, H); }
      const stripes = [['#c8232c', 0.0], ['#f4f4f4', 0.012], ['#1d3c8c', 0.024]];
      for (const side of [0.25, 0.75]) {
        const s = side === 0.25 ? -1 : 1; // toward bottom from window line
        for (const [c, o] of stripes) { g.fillStyle = c; const a = side - s * 0.0 + (side === 0.25 ? -0.01 - o : 0.01 + o); g.fillRect(W * 0.06, yA(a) - 5, W * 0.9, 10); }
      }
      g.fillStyle = '#b8bcc2'; g.fillRect(0, yA(0.08), W, yA(0.0) - yA(0.08)); g.fillRect(0, yA(1.0), W, yA(0.92) - yA(1.0));
    }
    if (isUA) {
      // dark navy belly, grey top, tri-stripe
      g.fillStyle = '#1b2a57';
      g.fillRect(0, yA(0.2), W, yA(0.0) - yA(0.2)); g.fillRect(0, yA(1.0), W, yA(0.8) - yA(1.0));
      for (const [c, o] of [['#e8742c', 0], ['#c8232c', 0.012], ['#3a6ad0', 0.024]]) {
        g.fillStyle = c; g.fillRect(0, yA(0.2 + o) - 4, W, 8); g.fillRect(0, yA(0.8 - o) - 4, W, 8);
      }
    }
    if (kind === 'military' || kind === 'c17') { g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 40; i++) g.fillRect((i * 137) % W, (i * 71) % H, 80, 40); }
    // passenger windows
    if (kind === 'american' || kind === 'united' || kind === 'generic') {
      g.fillStyle = '#14181d';
      for (const a of [0.285, 0.715]) {
        for (let x = W * 0.16; x < W * 0.86; x += 13) {
          if (Math.abs(x - W * 0.3) < 14 || Math.abs(x - W * 0.62) < 14 || Math.abs(x - W * 0.82) < 10) continue; // doors
          g.beginPath(); g.ellipse(x, yA(a), 3.6, 6.5, 0, 0, Math.PI * 2); g.fill();
        }
        // doors
        g.strokeStyle = 'rgba(30,30,30,0.6)'; g.lineWidth = 2;
        for (const dx of [0.3, 0.62, 0.82, 0.12]) g.strokeRect(W * dx - 10, yA(a) - 22, 20, 44);
      }
      // cockpit windows
      g.fillStyle = '#0d1116';
      for (const a of [0.32, 0.68]) { g.beginPath(); g.moveTo(W * 0.935, yA(a) - 10); g.lineTo(W * 0.965, yA(a) - 8); g.lineTo(W * 0.965, yA(a) + 6); g.lineTo(W * 0.935, yA(a) + 8); g.fill(); }
      g.beginPath(); g.moveTo(W * 0.945, yA(0.38)); g.lineTo(W * 0.967, yA(0.42)); g.lineTo(W * 0.967, yA(0.58)); g.lineTo(W * 0.945, yA(0.62)); g.fill();
    }
    if (kind === 'cessna') {
      g.fillStyle = '#1f3c8c'; g.fillRect(0, yA(0.27), W, 14); g.fillRect(0, yA(0.73), W, 14);
      g.fillStyle = '#c8232c'; g.fillRect(0, yA(0.27) + 16, W, 6); g.fillRect(0, yA(0.73) + 16, W, 6);
      g.fillStyle = '#26323e'; g.fillRect(W * 0.55, yA(0.42), W * 0.28, yA(0.3) - yA(0.42)); g.fillRect(W * 0.55, yA(0.7), W * 0.28, yA(0.58) - yA(0.7));
    }
  }, { clamp: false }));
}

function tailTex(kind) {
  return cached('tail_' + kind, () => canvasTex(256, 256, (g, W, H) => {
    if (kind === 'american') {
      g.fillStyle = '#cfd3d8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1d3c8c'; g.fillRect(0, H * 0.35, W, H * 0.12);
      g.fillStyle = '#f4f4f4'; g.fillRect(0, H * 0.47, W, H * 0.04);
      g.fillStyle = '#c8232c'; g.fillRect(0, H * 0.51, W, H * 0.12);
    } else if (kind === 'united') {
      g.fillStyle = '#1b2a57'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#3a6ad0'; g.beginPath(); g.ellipse(W * 0.5, H * 0.5, W * 0.18, H * 0.26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8232c'; g.beginPath(); g.ellipse(W * 0.5, H * 0.5, W * 0.1, H * 0.16, 0, 0, Math.PI * 2); g.fill();
    } else { g.fillStyle = '#e8e9ea'; g.fillRect(0, 0, W, H); }
  }));
}

// ---------- Boeing 767 / 757 ----------
export function makeAirliner(kind = 'american', o = {}) {
  const L = o.length ?? 48.5, R = o.radius ?? 2.52;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const isUA = kind === 'united';
  const metal = kind === 'american';
  const skin = new THREE.MeshStandardMaterial({ map: liveryTex(kind), roughness: metal ? 0.22 : 0.4, metalness: metal ? 0.85 : 0.25, envMapIntensity: 1.2 });
  const prof = [
    [0, 0.25, 2.0], [1.5, 0.75, 1.75], [4, 1.5, 1.2], [7, 2.1, 0.55], [10, 2.45, 0.15], [12.5, R, 0],
    [L - 9, R, 0], [L - 6, R * 0.97, -0.05], [L - 3.6, R * 0.85, -0.2], [L - 1.8, R * 0.62, -0.4], [L - 0.6, R * 0.32, -0.55], [L, 0.02, -0.62],
  ];
  const fus = new THREE.Mesh(fuselage(prof, 40), skin);
  fus.castShadow = true; fus.receiveShadow = true;
  body.add(fus);
  const wingMat = new THREE.MeshStandardMaterial({ color: isUA ? 0x7e858e : 0xc2c7cc, roughness: metal ? 0.3 : 0.45, metalness: metal ? 0.8 : 0.4 });
  const half = L / 2;
  // wings (left = +x, right = -x)
  const span = o.span ?? 23.8;
  for (const s of [1, -1]) {
    const secs = [
      { le: [s * 0.5, -1.45, 3.6], chord: 9.2, thk: 0.13 },
      { le: [s * 2.4, -1.35, 3.0], chord: 8.6, thk: 0.12 },
      { le: [s * 8.5, -0.7, -2.4], chord: 5.4, thk: 0.11 },
      { le: [s * span, 0.9, -11.6], chord: 2.2, thk: 0.09 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }));
    const w = new THREE.Mesh(loft(secs), wingMat);
    w.castShadow = true; w.receiveShadow = true;
    body.add(w);
    // engine + pylon
    const eng = new THREE.Mesh(nacelle(5.2, 1.42), new THREE.MeshStandardMaterial({ color: isUA ? 0x2a3a6a : 0xb8bcc2, roughness: 0.35, metalness: metal ? 0.8 : 0.3 }));
    eng.position.set(s * 7.7, -2.55, 2.8);
    eng.castShadow = true;
    body.add(eng);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), M('fanFace', () => std(0x1a1c1f, { r: 0.4, m: 0.7 })));
    fan.position.set(s * 7.7, -2.55, 2.8 + 2.55); body.add(fan);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12), MAT.black());
    cone.rotation.x = -Math.PI / 2; cone.position.set(s * 7.7, -2.55, 2.8 - 2.9); body.add(cone);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 4.2), wingMat);
    pylon.position.set(s * 7.7, -1.5, 1.3); body.add(pylon);
    // nav light
    const nl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: s > 0 ? new THREE.Color(6, 0.2, 0.2) : new THREE.Color(0.2, 6, 0.4) }));
    nl.position.set(s * span, 0.95, -12.4); body.add(nl);
    // horizontal stabiliser
    const hs = [
      { le: [s * 0.3, 0.9, -half + 6.8], chord: 5.6, thk: 0.1 },
      { le: [s * 9.3, 1.9, -half + 1.4], chord: 1.9, thk: 0.08 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }));
    const h = new THREE.Mesh(loft(hs), wingMat); h.castShadow = true; body.add(h);
  }
  // vertical fin
  const tailMat = new THREE.MeshStandardMaterial({ map: tailTex(kind), roughness: metal ? 0.25 : 0.4, metalness: metal ? 0.8 : 0.2 });
  const vf = [
    { le: [0, 1.8, -half + 8.2], chord: 7.4, thk: 0.11 },
    { le: [0, 11.2, -half + 1.0], chord: 2.6, thk: 0.09 },
  ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [1, 0, 0] }));
  const fin = new THREE.Mesh(loft(vf), tailMat);
  // planar uv for tail texture
  {
    const p = fin.geometry.attributes.position; const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getZ(i) + half) / 10; uv[i * 2 + 1] = (p.getY(i) - 1.8) / 9.4; }
    fin.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  fin.castShadow = true; body.add(fin);
  // belly fairing
  const bf = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 9, 6, 12), wingMat);
  bf.rotation.x = Math.PI / 2; bf.scale.set(1.25, 1, 0.55); bf.position.set(0, -1.95, -0.6); body.add(bf);
  // beacon + strobes
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.3, 0.2) }));
  beacon.position.set(0, R + 0.1, 0); body.add(beacon);
  root.userData = { beacon, length: L, kind };
  // landing gear (optional, for ground)
  if (o.gear) {
    const gm = MAT.rubber(), strut = M('strut', () => std(0xa0a4a8, { r: 0.4, m: 0.8 }));
    const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 16); wheel.rotateZ(Math.PI / 2);
    const addGear = (x, z, n) => {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 8), strut); st.position.set(x, -R - 0.6, z); body.add(st);
      for (let i = 0; i < n; i++) for (const zz of [-0.7, 0.7]) { const w = new THREE.Mesh(wheel, gm); w.position.set(x + (i - (n - 1) / 2) * 0.6, -R - 1.75, z + (n > 1 ? zz : 0)); body.add(w); }
    };
    addGear(0, half - 5, 1); addGear(3, -1.5, 2); addGear(-3, -1.5, 2);
    root.userData.groundOffset = R + 2.4;
  }
  return root;
}

// ---------- Cessna 172 ----------
export function makeCessna() {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ map: liveryTex('cessna'), roughness: 0.35, metalness: 0.1 });
  const prof = [[0, 0.12, 0.3], [1.5, 0.45, 0.2], [3.5, 0.62, 0.05], [5.2, 0.62, 0], [6.4, 0.55, -0.05], [7.2, 0.35, -0.12], [7.5, 0.06, -0.15]];
  const fus = new THREE.Mesh(fuselage(prof, 20), skin); fus.castShadow = true;
  fus.scale.set(1, 1.25, 1);
  root.add(fus);
  const wm = M('cessnaWing', () => std(0xf2f2f0, { r: 0.35 }));
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 1.55), wm); wing.position.set(0, 0.95, 0.9); wing.castShadow = true; root.add(wing);
  for (const s of [1, -1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6), wm); strut.position.set(s * 1.4, 0.15, 0.95); strut.rotation.z = s * 1.05; root.add(strut);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.5), M('cessnaTip', () => std(0xc8232c, { r: 0.4 }))); tip.position.set(s * 5.5, 0.95, 0.9); root.add(tip);
  }
  const hs = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.9), wm); hs.position.set(0, 0.05, -3.4); root.add(hs);
  const vf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.1), wm); vf.position.set(0, 0.8, -3.4); vf.rotation.x = 0.35; root.add(vf);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 1.2), MAT.darkGlass()); win.position.set(0, 0.55, 1.1); root.add(win);
  // propeller (blurred disc + blades)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false }));
  disc.position.set(0, 0.05, 3.85); root.add(disc);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.04), MAT.black()); prop.position.set(0, 0.05, 3.83); root.add(prop);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 10), M('spinner', () => std(0xc8232c, { r: 0.3 }))); spinner.rotation.x = Math.PI / 2; spinner.position.set(0, 0.05, 3.95); root.add(spinner);
  // gear
  const wheel = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14); wheel.rotateZ(Math.PI / 2);
  for (const [x, z] of [[1.1, 0.3], [-1.1, 0.3], [0, 2.8]]) {
    const w = new THREE.Mesh(wheel, MAT.rubber()); w.position.set(x, -0.95, z); root.add(w);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), wm); l.position.set(x * 0.7, -0.6, z); l.rotation.z = x * 0.4; root.add(l);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData = { prop, groundOffset: 1.17 };
  return root;
}

// ---------- F-15 Eagle ----------
export function makeF15() {
  const root = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ map: liveryTex('military'), roughness: 0.55, metalness: 0.25 });
  const prof = [[0, 0.5, 0], [2, 0.85, 0], [9, 1.05, 0.05], [13, 0.9, 0.12], [16, 0.55, 0.2], [18.2, 0.05, 0.2]];
  const fus = new THREE.Mesh(fuselage(prof, 20), grey); fus.scale.set(1.35, 0.85, 1); root.add(fus);
  const wm = M('f15wing', () => std(0x8a949c, { r: 0.55, m: 0.25 }));
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(loft([
      { le: [s * 1.0, 0.1, 2.0], chord: 7.8, thk: 0.05 },
      { le: [s * 6.6, 0.05, -4.6], chord: 2.0, thk: 0.04 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm); root.add(w);
    const hs = new THREE.Mesh(loft([
      { le: [s * 1.2, 0.0, -5.6], chord: 3.4, thk: 0.04 },
      { le: [s * 4.3, 0.0, -8.0], chord: 1.3, thk: 0.04 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm); root.add(hs);
    const vt = new THREE.Mesh(loft([
      { le: [s * 1.3, 0.6, -4.2], chord: 3.4, thk: 0.05 },
      { le: [s * 1.6, 3.8, -6.9], chord: 1.4, thk: 0.04 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [1, 0, 0] }))), wm); root.add(vt);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 5.5), wm); intake.position.set(s * 1.25, -0.2, 2.5); root.add(intake);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.2, 14, 1, true), M('nozzle', () => std(0x3a3a3c, { r: 0.4, m: 0.9, side: THREE.DoubleSide })));
    noz.rotation.x = Math.PI / 2; noz.position.set(s * 0.6, 0, -9.4); root.add(noz);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.4) }));
    glow.position.set(s * 0.6, 0, -9.3); glow.rotation.y = Math.PI; root.add(glow);
  }
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glass());
  canopy.scale.set(0.9, 0.8, 2.6); canopy.position.set(0, 0.75, 5.2); root.add(canopy);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// ---------- B-52 ----------
export function makeB52() {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: liveryTex('c17'), roughness: 0.6, metalness: 0.2 });
  const prof = [[0, 0.3, 0.4], [3, 1.5, 0.3], [10, 1.6, 0], [38, 1.7, 0], [44, 1.4, 0.1], [47, 0.6, 0.6], [48, 0.1, 0.6]];
  root.add(new THREE.Mesh(fuselage(prof, 24), mat));
  const wm = M('b52wing', () => std(0x6a7077, { r: 0.6 }));
  for (const s of [1, -1]) {
    root.add(new THREE.Mesh(loft([
      { le: [s * 1.5, 1.2, 4], chord: 11, thk: 0.1 },
      { le: [s * 28, -0.6, -14], chord: 3.5, thk: 0.07 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm));
    for (const sp of [8, 15]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 5, 12), wm);
      pod.rotation.x = Math.PI / 2; pod.position.set(s * sp, -0.8, 4 - sp * 0.62); root.add(pod);
    }
    root.add(new THREE.Mesh(loft([
      { le: [s * 0.5, 1, -18], chord: 5, thk: 0.08 },
      { le: [s * 7.5, 1, -22], chord: 2, thk: 0.06 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm));
  }
  root.add(new THREE.Mesh(loft([
    { le: [0, 1.4, -15], chord: 9, thk: 0.08 },
    { le: [0, 13.5, -21.5], chord: 3.5, thk: 0.06 },
  ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [1, 0, 0] }))), wm));
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// ---------- C-17 ----------
export function makeC17() {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: liveryTex('c17'), roughness: 0.6, metalness: 0.15 });
  const prof = [[0, 0.6, 1.5], [4, 2.4, 0.8], [10, 3.3, 0], [44, 3.4, 0], [49, 2.8, 0.2], [52, 1.2, 0.6], [53, 0.3, 0.8]];
  root.add(new THREE.Mesh(fuselage(prof, 32), mat));
  const wm = M('c17wing', () => std(0x6a7077, { r: 0.6 }));
  for (const s of [1, -1]) {
    root.add(new THREE.Mesh(loft([
      { le: [s * 1.5, 3.0, 4.5], chord: 10, thk: 0.11 },
      { le: [s * 25, 2.0, -5.5], chord: 3, thk: 0.08 },
    ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm));
    for (const sp of [8, 14.5]) {
      const pod = new THREE.Mesh(nacelle(5, 1.2), wm); pod.position.set(s * sp, 0.9, 5 - sp * 0.35); root.add(pod);
    }
  }
  root.add(new THREE.Mesh(loft([
    { le: [0, 3.0, -17], chord: 9, thk: 0.1 },
    { le: [0, 12, -23], chord: 5, thk: 0.08 },
  ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [1, 0, 0] }))), wm));
  for (const s of [1, -1]) root.add(new THREE.Mesh(loft([
    { le: [0, 12, -21.5], chord: 5, thk: 0.07 },
    { le: [s * 9, 12.3, -25], chord: 2.2, thk: 0.06 },
  ].map((x) => ({ ...x, cdir: [0, 0, -1], tdir: [0, 1, 0] }))), wm));
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

// ---------- Black Hawk helicopter ----------
export function makeHeli(color = 0x24282a) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
  body.scale.set(1.3, 1.25, 3.4); body.position.set(0, 0, 1); root.add(body);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 8, 10), mat); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.4, -5.5); root.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 1.2), mat); fin.position.set(0, 1.4, -9.4); fin.rotation.x = -0.3; root.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.9), mat); stab.position.set(0, 0.5, -9.2); root.add(stab);
  const win = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), MAT.darkGlass());
  win.scale.set(1.1, 0.9, 1.4); win.rotation.x = 1.2; win.position.set(0, 0.25, 3.2); root.add(win);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.9, 8), mat); mast.position.set(0, 1.55, 0.6); root.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 2.0, 0.6);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 8.1), MAT.black()); b.position.z = 4.1; const p = new THREE.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); rotor.add(p); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(8.2, 32), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  root.add(rotor);
  const tr = new THREE.Group(); tr.position.set(0.25, 1.6, -9.6);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.18), MAT.black()); const p = new THREE.Group(); p.rotation.x = i * Math.PI / 2; b.position.y = 0.8; p.add(b); tr.add(p); }
  root.add(tr);
  for (const s of [1, -1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.8), mat); sk.position.set(s * 1.1, -1.4, 1.0); root.add(sk); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData = { rotor, tr };
  return root;
}

// Orient an object so its +Z (nose) points along velocity with bank angle (radians, + = right wing down)
const _m = new THREE.Matrix4(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3(), _q = new THREE.Quaternion();
export function orientAlong(obj, dir, bank = 0, pitchUp = new THREE.Vector3(0, 1, 0)) {
  _f.copy(dir).normalize();
  _r.crossVectors(pitchUp, _f).normalize(); // left wing direction (+x)
  if (_r.lengthSq() < 1e-6) _r.set(1, 0, 0);
  _u.crossVectors(_f, _r).normalize();
  _m.makeBasis(_r, _u, _f);
  obj.quaternion.setFromRotationMatrix(_m);
  if (bank) { _q.setFromAxisAngle(_f, bank); obj.quaternion.premultiply(_q); }
}
