// Detail kits placed inside the Manhattan set: Church St street level, office floors
// inside the towers (seen through the real facade), airliner cockpit, Ground Zero rubble,
// the rebuilt site (One WTC + memorial pools), Tribute in Light, rooftop TV cameras.
import * as THREE from 'three';
import { std, M, MAT, cityMaterial } from '../assets/materials.js';
import { Person, Crowd } from '../assets/people.js';
import { makeCar, makeFireTruck, makeAmbulance, makeBus } from '../assets/vehicles.js';
import { makeStreetLamp, makeTrafficLight, makeHydrant, makeTrash, makeNewsBox, makeTree, makeDesk, makeChair, makeCRT, makeCeilingLight, makePlant,
  makeFileCabinet, makePaperStack, makeBeam, makeFacadeRemnant, makeFlag, box, cyl, makeContactShadow, makePhone } from '../assets/props.js';
import { makeOneWTC, makeMemorialPool } from '../assets/buildings.js';
import { roadTex, concreteTex, carpetTex, tileTex, canvasTex, Screen, noiseTex } from '../assets/textures.js';
import { floorY } from '../assets/wtc.js';
import { rng, fbm2, clamp, hash } from '../core/util.js';

// ---------------- Church Street (x ~ 165) ----------------
export function makeStreet() {
  const g = new THREE.Group();
  const roadM = M('roadMat', () => { const t = roadTex(); t.repeat.set(1, 20); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 900), roadM); road.rotation.x = -Math.PI / 2; road.position.set(165, 0.3, 50); road.receiveShadow = true; g.add(road);
  const swM = M('sidewalk', () => { const t = tileTex('#b7b1a6', '#8e887d', 6); t.repeat.set(2, 90); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); });
  for (const x of [148, 182]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(8, 0.45, 900), swM); sw.position.set(x, 0.22, 50); sw.receiveShadow = true; g.add(sw); }
  // cross street (Vesey / Liberty)
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(400, 22), roadM); cross.rotation.x = -Math.PI / 2; cross.position.set(250, 0.31, -150); g.add(cross);
  const r = rng(31);
  for (let z = -300; z < 420; z += 28) {
    const l1 = makeStreetLamp(false); l1.position.set(152, 0.45, z); l1.rotation.y = Math.PI / 2; g.add(l1);
    const l2 = makeStreetLamp(false); l2.position.set(178, 0.45, z + 14); l2.rotation.y = -Math.PI / 2; g.add(l2);
    if (r() < 0.6) { const t = makeTree('oak', Math.floor(r() * 99), { h: 4 }); t.position.set(184, 0.45, z + 7); t.scale.setScalar(0.8); g.add(t); }
    if (r() < 0.25) { const h = makeHydrant(); h.position.set(179, 0.45, z + 3); g.add(h); }
    if (r() < 0.3) { const tr = makeTrash(); tr.position.set(151, 0.45, z + 9); g.add(tr); }
    if (r() < 0.2) { const nb = makeNewsBox(r() < 0.5 ? 0x1c3a8a : 0xc8232c); nb.position.set(180, 0.45, z + 18); nb.rotation.y = -Math.PI / 2; g.add(nb); }
  }
  for (const z of [-150, 250]) { const tl = makeTrafficLight(); tl.position.set(180, 0.45, z - 12); tl.rotation.y = Math.PI; g.add(tl); }
  // parked cars
  const kinds = ['sedan', 'taxi', 'suv', 'sedan', 'taxi', 'police', 'sedan'];
  const cols = ['#5a6a7a', '#8a2a24', '#2a2e34', '#c8c8c0', '#1c3a5a', '#4a4a3a'];
  for (let i = 0; i < 18; i++) {
    const c = makeCar(kinds[i % kinds.length], cols[i % cols.length]);
    const side = i % 2 ? 1 : -1;
    c.position.set(165 + side * 9.5, 0.3, -280 + i * 40 + r() * 10);
    c.rotation.y = side > 0 ? Math.PI : 0;
    g.add(c);
  }
  // moving traffic (animated by set)
  const traffic = [];
  for (let i = 0; i < 8; i++) { const c = makeCar(i % 3 === 0 ? 'taxi' : i % 3 === 1 ? 'sedan' : 'suv', cols[(i * 2) % cols.length]); c.position.set(165 + (i % 2 ? 3 : -3), 0.3, 0); g.add(c); traffic.push({ c, lane: i % 2 ? 1 : -1, off: i * 110 }); }
  const bus = makeBus('#2a5aa0'); bus.position.set(162, 0.3, 120); g.add(bus);
  // pedestrians: hero people + crowd
  const heroes = [];
  const outfits = [
    { jacket: '#24262c', seed: 11, expr: 'neutral' }, { female: true, shirt: '#c86a5a', jacket: '#3a3e48', seed: 12 }, { jacket: '#4a3e34', seed: 13, glasses: true },
    { shirt: '#9fb6d6', jacket: null, seed: 14 }, { female: true, shirt: '#efe4cf', jacket: '#1c2230', seed: 15 }, { jacket: '#1c2230', seed: 16, skin: '#7f5136' },
    { shirt: '#d6c8a8', jacket: null, seed: 17, headwear: 'cap' }, { female: true, jacket: '#5a1c2a', seed: 18, skin: '#c48a62' }, { jacket: '#2a2e36', seed: 19, hair: 'receding' },
    { shirt: '#e8e6e0', jacket: '#3a3a3e', seed: 20, female: true, skin: '#a56d4a' },
  ];
  outfits.forEach((o, i) => {
    const p = new Person(o);
    p.root.position.set(158 + (i % 5) * 4.5, 0.45, 70 + Math.floor(i / 5) * 6 + (i % 3));
    p.root.rotation.y = -Math.PI / 2 + (r() - 0.5) * 0.6;
    g.add(p.root); heroes.push(p);
    const sh = makeContactShadow(0.9, 0.9, 0.5); sh.position.set(0, 0.012, 0); p.root.add(sh);
  });
  const crowd = new Crowd(60, { seed: 4 });
  for (let i = 0; i < 60; i++) crowd.pos[i] = [146 + r() * 6 + (i % 2 ? 34 : 0), 0.45, -250 + r() * 620, (i % 2 ? 0 : Math.PI) + (r() - 0.5) * 0.3];
  g.add(crowd.group);
  return { group: g, traffic, heroes, crowd, bus };
}

// ---------------- office floor inside a tower ----------------
// tower: Tower instance; floor number; face: 'n','s','e','w' window wall; o: {people, lit}
export function makeOfficeFloor(tower, floor, face, o = {}) {
  const g = new THREE.Group();
  const y0 = floorY(floor) + 0.02;
  const H = 3.0;
  const r = rng(o.seed ?? floor);
  // local frame: window wall at +X (x = 31.0), interior towards -X; rotate per face
  const inner = new THREE.Group(); g.add(inner);
  const carpet = M('officeCarpet', () => { const t = carpetTex([96, 90, 84], [86, 80, 74]); t.repeat.set(12, 12); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 62), carpet); fl.rotation.x = -Math.PI / 2; fl.position.set(16, 0, 0); fl.receiveShadow = true; inner.add(fl);
  const ceilT = M('ceilTile', () => { const t = tileTex('#e8e6e0', '#b8b6b0', 8); t.repeat.set(10, 20); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); });
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(30, 62), ceilT); ce.rotation.x = Math.PI / 2; ce.position.set(16, H, 0); inner.add(ce);
  // back wall (core) and side walls
  const wallM = M('officeWall', () => std(0xd8d2c6, { r: 0.9 }));
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(62, H), wallM); bw.rotation.y = Math.PI / 2; bw.position.set(2, H / 2, 0); inner.add(bw);
  // facade columns (inside view): narrow windows between 1.02m-spaced columns
  const colGeo = new THREE.BoxGeometry(0.5, H, 0.46);
  const colM = M('wtcColIn', () => std(0x9a9890, { r: 0.6, m: 0.3 }));
  const n = 61;
  const cols = new THREE.InstancedMesh(colGeo, colM, n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { d.position.set(31.35, H / 2, -30.6 + i * 1.02); d.updateMatrix(); cols.setMatrixAt(i, d.matrix); }
  cols.castShadow = true; inner.add(cols);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 62), colM); sill.position.set(31.2, 0.375, 0); inner.add(sill);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 62), colM); head.position.set(31.2, H - 0.27, 0); inner.add(head);
  // desks in rows facing window
  const screens = [];
  const people = [];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) {
    const x = 12 + row * 5.5, z = -14 + k * 5.4 + (row % 2) * 1.3;
    const desk = makeDesk(); desk.position.set(x, 0, z); desk.rotation.y = -Math.PI / 2; inner.add(desk);
    const scr = new Screen(256, 192, (gg, w, h, t, mode) => drawTicker(gg, w, h, t, (row * 7 + k) % 5));
    screens.push(scr);
    const crt = makeCRT(scr.tex); crt.position.set(x - 0.2, 0.76, z); crt.rotation.y = Math.PI / 2; inner.add(crt);
    const ch = makeChair(); ch.position.set(x - 0.95, 0, z); ch.rotation.y = -Math.PI / 2; inner.add(ch);
    if (r() < 0.5) { const ps = makePaperStack(8 + Math.floor(r() * 12), row * 9 + k); ps.position.set(x + 0.1, 0.76, z + 0.55); inner.add(ps); }
    if (r() < 0.3) { const ph = makePhone(); ph.position.set(x + 0.1, 0.76, z - 0.6); inner.add(ph); }
  }
  for (let i = 0; i < 4; i++) { const p = makePlant(); p.position.set(28, 0, -20 + i * 13); inner.add(p); }
  for (let i = 0; i < 3; i++) { const f = makeFileCabinet(); f.position.set(3, 0, -10 + i * 7); f.rotation.y = Math.PI / 2; inner.add(f); }
  // ceiling lights
  const lights = [];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) { const cl = makeCeilingLight(1.2, 0.6, 2.2); cl.position.set(8 + i * 6, H - 0.03, -15 + k * 6); inner.add(cl); }
  for (let i = 0; i < 3; i++) { const pl = new THREE.PointLight(0xffecd6, 22, 26, 1.5); pl.position.set(10 + i * 8, H - 0.4, 0); inner.add(pl); lights.push(pl); }
  const wl = new THREE.DirectionalLight(0xdfeeff, 1.4); wl.position.set(60, 2.2, 0); wl.target.position.set(0, 0.5, 0); inner.add(wl, wl.target); lights.push(wl);
  // people
  const outfits = o.outfits || [
    { jacket: '#24262c', seed: 51 }, { female: true, jacket: '#3a3e48', shirt: '#efe4cf', seed: 52 }, { jacket: null, shirt: '#9fb6d6', seed: 53, glasses: true },
    { jacket: '#4a3e34', seed: 54, skin: '#7f5136' }, { female: true, shirt: '#c86a5a', jacket: null, seed: 55 }, { jacket: '#1c2230', seed: 56, hair: 'receding' },
    { jacket: null, shirt: '#e8e6e0', seed: 57, skin: '#c48a62' }, { female: true, jacket: '#5a1c2a', seed: 58 },
  ];
  outfits.forEach((oo, i) => { const p = new Person(oo); inner.add(p.root); people.push(p); });
  // orient to face
  const rot = { e: 0, n: Math.PI / 2, w: Math.PI, s: -Math.PI / 2 }[face];
  inner.rotation.y = rot;
  g.position.set(tower.group.position.x, y0, tower.group.position.z);
  g.visible = false;
  return { group: g, inner, people, screens, lights, y0, face };
}

function drawTicker(g, w, h, t, mode) {
  g.fillStyle = '#04120a'; g.fillRect(0, 0, w, h);
  g.font = '600 14px "IBM Plex Mono", monospace';
  if (mode === 0 || mode === 3) {
    const syms = ['IBM', 'MSFT', 'GE', 'AOL', 'INTC', 'CSCO', 'XOM', 'ORCL', 'DELL', 'YHOO', 'AMZN', 'EBAY'];
    for (let i = 0; i < 9; i++) {
      const s = syms[(i + mode * 3) % syms.length], up = hash(i * 7 + mode) > 0.4;
      g.fillStyle = up ? '#3aff7a' : '#ff4a3a';
      g.fillText(`${s.padEnd(5)} ${(20 + hash(i * 13) * 120).toFixed(2)} ${up ? '+' : '-'}${(hash(i * 3) * 3).toFixed(2)}`, 10, 22 + i * 19);
    }
  } else if (mode === 1) {
    g.strokeStyle = '#3aff7a'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < w; x += 4) { const v = h * 0.6 - x * 0.25 + Math.sin(x * 0.11 + t) * 10 + hash(x) * 8; x ? g.lineTo(x, v) : g.moveTo(x, v); }
    g.stroke(); g.fillStyle = '#c8ffd8'; g.fillText('DJIA  10,033.27 ▲', 10, 20);
  } else if (mode === 2) {
    g.fillStyle = '#1a3a8a'; g.fillRect(0, 0, w, 22); g.fillStyle = '#fff'; g.fillText('Lotus Notes - Inbox', 8, 16);
    g.fillStyle = '#d8dce8'; g.fillRect(0, 22, w, h - 22);
    for (let i = 0; i < 8; i++) { g.fillStyle = i === 2 ? '#a8c0f0' : '#d8dce8'; g.fillRect(4, 28 + i * 20, w - 8, 18); g.fillStyle = '#222'; g.fillText(['Q3 report', 'Re: meeting 9am', 'Lunch?', 'Bond yields', 'FW: memo', 'Client call', 'Budget', 'Travel'][i], 10, 41 + i * 20); }
  } else {
    g.fillStyle = '#c8c4b8'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a3a8a'; g.fillRect(0, 0, w, 20); g.fillStyle = '#fff'; g.fillText('Excel - Portfolio.xls', 6, 15);
    g.strokeStyle = '#9a968c'; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, h); g.stroke(); } for (let y = 20; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#222'; g.font = '11px monospace'; for (let i = 0; i < 12; i++) for (let k = 0; k < 6; k++) g.fillText((hash(i * 31 + k) * 9999).toFixed(0), 4 + k * 40, 31 + i * 14);
  }
}

// ---------------- cockpit interior (child of an airliner) ----------------
export function makeCockpit() {
  const g = new THREE.Group();
  const shell = M('cockpitShell', () => std(0x3a3d42, { r: 0.7, side: THREE.DoubleSide }));
  const dark = M('cockpitDark', () => std(0x16181b, { r: 0.6 }));
  // glare shield + instrument panel
  box(3.0, 0.35, 0.9, dark, 0, 0.55, 21.35, g);
  const panelScr = new Screen(512, 160, drawPanel);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: panelScr.tex, toneMapped: false }));
  panel.position.set(0, 0.05, 20.95); panel.rotation.set(-0.25, Math.PI, 0, 'YXZ'); g.add(panel);
  box(3.2, 0.9, 0.4, dark, 0, -0.1, 21.2, g);
  // pedestal + yokes
  box(0.55, 0.7, 1.4, dark, 0, -0.55, 20.0, g);
  for (const s of [-1, 1]) {
    const col = cyl(0.04, 0.05, 0.7, dark, s * 0.6, -0.45, 20.6, g, 8); col.rotation.x = -0.4;
    const yoke = box(0.42, 0.06, 0.06, dark, s * 0.6, -0.08, 20.45, g);
    // seats
    const seat = box(0.6, 0.15, 0.6, M('pilotSeat', () => std(0x2a2e34, { r: 0.8 })), s * 0.6, -0.75, 19.3, g);
    const back = box(0.6, 0.9, 0.12, seat.material, s * 0.6, -0.25, 18.95, g); back.rotation.x = -0.12;
  }
  // window frame posts
  for (const x of [-0.05, -1.25, 1.15]) { const p = box(0.1, 0.9, 0.08, shell, x, 0.95, 21.75, g); p.rotation.z = x === -0.05 ? 0 : x * 0.3; }
  box(3.2, 0.12, 1.2, shell, 0, 1.45, 21.3, g); // roof edge
  box(3.0, 0.1, 2.5, shell, 0, 1.55, 20.0, g); // overhead
  const ovh = new Screen(256, 128, (gg, w, h) => { gg.fillStyle = '#26292e'; gg.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { gg.fillStyle = ['#c8c8c0', '#ffd04a', '#5aff7a', '#ff5a3a'][i % 4]; gg.fillRect(10 + (i % 15) * 16, 10 + Math.floor(i / 15) * 28, 6, 10); } });
  ovh.update(0);
  const ov = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: ovh.tex, toneMapped: false, color: 0x777777 })); ov.position.set(0, 1.49, 20.0); ov.rotation.x = Math.PI / 2; g.add(ov);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), shell); sw.position.set(s * 1.55, 0.2, 19.6); sw.rotation.y = s * Math.PI / 2; g.add(sw); }
  const pl = new THREE.PointLight(0xffe0c0, 3, 5, 2); pl.position.set(0, 1.2, 19.8); g.add(pl);
  const pl2 = new THREE.PointLight(0x9ab8ff, 2.5, 4, 2); pl2.position.set(0, 0.6, 20.6); g.add(pl2);
  g.userData.panel = panelScr;
  return g;
}
function drawPanel(g, w, h, t) {
  g.fillStyle = '#121418'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const x = 12 + i * 83;
    g.fillStyle = '#05070a'; g.fillRect(x, 14, 74, 74);
    if (i === 0 || i === 3) { // attitude indicator
      g.save(); g.beginPath(); g.rect(x, 14, 74, 74); g.clip(); g.translate(x + 37, 51); g.rotate(Math.sin(t * 0.4) * 0.08);
      g.fillStyle = '#2a6ad0'; g.fillRect(-60, -60, 120, 60); g.fillStyle = '#7a4a22'; g.fillRect(-60, 0, 120, 60); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-60, 0); g.lineTo(60, 0); g.stroke(); g.restore();
      g.strokeStyle = '#ffcc33'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 20, 51); g.lineTo(x + 54, 51); g.stroke();
    } else if (i === 1 || i === 4) { // nav display
      g.strokeStyle = '#3aff7a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x + 37, 80, 52, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
      g.fillStyle = '#ff3aff'; g.fillRect(x + 36, 30, 2, 40); g.fillStyle = '#fff'; g.font = '10px monospace'; g.fillText('HDG 190', x + 16, 26);
    } else { g.fillStyle = '#3aff7a'; g.font = '10px monospace'; for (let k = 0; k < 6; k++) g.fillText(['N1 92.1', 'EGT 612', 'N2 98.3', 'FF 6.2', 'OIL 72', 'VIB 0.4'][k], x + 6, 28 + k * 11); }
  }
  g.fillStyle = '#ffb030'; for (let k = 0; k < 20; k++) g.fillRect(12 + k * 24, 100, 10, 6);
}

// ---------------- Ground Zero rubble ----------------
export function makeRubble() {
  const g = new THREE.Group();
  const r = rng(77);
  // pile terrain
  const geo = new THREE.PlaneGeometry(320, 380, 160, 190);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const H = (wx, wz) => {
    const d1 = Math.hypot(wx, wz) / 70, d2 = Math.hypot(wx + 38, wz - 130) / 70;
    const pile = Math.max(0, 1 - Math.min(d1, d2)) ** 1.2 * 22 + Math.max(0, 1 - Math.hypot(wx + 20, wz - 60) / 150) * 8;
    const n = fbm2(wx / 9, wz / 9, 5, 5) * 4 + fbm2(wx / 2.5, wz / 2.5, 7, 3) * 1.2;
    return Math.max(0, pile + n * (pile > 1 ? 1 : 0.3)) + 0.2;
  };
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x - 20, z + 65) - 0.2); }
  geo.computeVertexNormals();
  const mat = M('rubbleMat', () => {
    const t = canvasTex(512, 512, (gg, w, h) => {
      const img = gg.createImageData(w, h); const d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const n = fbm2(x / 30, y / 30, 3, 4), f = hash(x * 1013 + y * 7);
        const rust = Math.max(0, fbm2(x / 50, y / 50, 8, 3)) * 0.8;
        const v = 0.55 + n * 0.3 + f * 0.25;
        const i = (y * w + x) * 4; d[i] = (110 + rust * 60) * v; d[i + 1] = (104 + rust * 20) * v; d[i + 2] = 96 * v; d[i + 3] = 255;
      }
      gg.putImageData(img, 0, 0);
    });
    t.repeat.set(14, 16);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, bumpMap: noiseTex(256, 16, 5, 4), bumpScale: 2 });
  });
  const pile = new THREE.Mesh(geo, mat); pile.position.set(-20, 0.2, 65); pile.receiveShadow = true; pile.castShadow = true; g.add(pile);
  // twisted beams
  for (let i = 0; i < 70; i++) {
    const b = makeBeam(8 + r() * 14, i, 0.5);
    const a = r() * Math.PI * 2, rr = r() * 110;
    b.position.set(-20 + Math.cos(a) * rr, 2 + r() * 14, 65 + Math.sin(a) * rr * 1.2);
    b.rotation.set((r() - 0.5) * 1.4, r() * 6.28, (r() - 0.5) * 1.6);
    g.add(b);
  }
  // facade remnants (iconic lattice)
  const f1 = makeFacadeRemnant(28, 14); f1.position.set(-30, 0, 30); f1.rotation.y = 0.3; g.add(f1);
  const f2 = makeFacadeRemnant(18, 10); f2.position.set(10, 0, 110); f2.rotation.y = -0.5; g.add(f2);
  // workers
  const workers = [];
  const outfit = (i) => i % 3 === 0 ? { headwear: 'helmet', jacket: '#b49a5a', pants: '#b49a5a', stripes: true, seed: 300 + i, dust: true, gloves: '#3a3a30' }
    : i % 3 === 1 ? { headwear: 'hardhat', helmetColor: '#e8c020', jacket: null, shirt: '#e86a1c', vest: '#e8e020', seed: 300 + i, dust: true }
    : { headwear: 'cap', capColor: '#1c2a4a', jacket: '#1c2a4a', pants: '#1c2a4a', seed: 300 + i, dust: true };
  for (let i = 0; i < 14; i++) { const w = new Person(outfit(i)); const a = r() * 6.28, rr = 25 + r() * 60; const x = -20 + Math.cos(a) * rr, z = 65 + Math.sin(a) * rr; w.root.position.set(x, H(x, z), z); w.root.rotation.y = r() * 6.28; g.add(w.root); workers.push(w); }
  const crowd = new Crowd(80, { seed: 9, dust: true, shirts: ['#b49a5a', '#e86a1c', '#1c2a4a', '#8a8278'] });
  for (let i = 0; i < 80; i++) { const a = r() * 6.28, rr = 30 + r() * 80; const x = -20 + Math.cos(a) * rr, z = 65 + Math.sin(a) * rr; crowd.pos[i] = [x, H(x, z), z, r() * 6.28]; }
  g.add(crowd.group);
  // flag on a bent pole (iconic)
  const flag = makeFlag('us', 1.6, 0.9, { poleH: 5, amp: 0.6 }); flag.position.set(-8, H(-8, 40) - 0.3, 40); flag.rotation.z = 0.12; g.add(flag);
  // cranes / excavators silhouettes
  const yellow = M('excavator', () => std(0xd8a020, { r: 0.6 }));
  for (const [x, z, ry] of [[90, 40, 2.2], [-120, 120, 0.7], [40, 230, -1.4]]) {
    const ex = new THREE.Group();
    box(4, 2.2, 6, yellow, 0, 1.6, 0, ex); box(2.5, 2.2, 2.5, yellow, 0, 3.6, -1, ex);
    const arm = box(0.8, 0.8, 9, yellow, 0, 6, 3.5, ex); arm.rotation.x = -0.5;
    box(4.2, 1, 6.5, MAT.rubber(), 0, 0.5, 0, ex);
    ex.position.set(x, 0, z); ex.rotation.y = ry; g.add(ex);
  }
  // burnt shell of WTC 6 / 5 (dark, gutted)
  const shell = M('burntShell', () => std(0x2a2826, { r: 0.95 }));
  box(60, 22, 70, shell, 70, 11, -45, g);
  box(60, 18, 50, shell, -80, 9, -85, g);
  g.visible = false;
  return { group: g, workers, crowd, flag, pile, H };
}

// ---------------- rebuilt WTC site (2010s-2020s) ----------------
export function makeRebuilt() {
  const g = new THREE.Group();
  const one = makeOneWTC(); one.position.set(-110, 0, -175); g.add(one);
  const pools = [makeMemorialPool(60), makeMemorialPool(60)];
  pools[0].position.set(0, 0.6, 0); pools[1].position.set(-38, 0.6, 130);
  g.add(pools[0], pools[1]);
  // plaza paving + trees grid
  const pav = M('memPaving2', () => { const t = tileTex('#a8a49a', '#8a867e', 10); t.repeat.set(0.12, 0.1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); });
  // plaza slab with the two square voids cut out (the city ground is discarded under it via HOLE)
  const sh = new THREE.Shape();
  const [px0, pz0, px1, pz1] = [-142, -127, 117, 252];
  sh.moveTo(px0, -pz0); sh.lineTo(px1, -pz0); sh.lineTo(px1, -pz1); sh.lineTo(px0, -pz1); sh.closePath();
  for (const [cx, cz] of [[0, 0], [-38, 130]]) { const h = new THREE.Path(); const e = 30.1; h.moveTo(cx - e, -(cz - e)); h.lineTo(cx - e, -(cz + e)); h.lineTo(cx + e, -(cz + e)); h.lineTo(cx + e, -(cz - e)); h.closePath(); sh.holes.push(h); }
  const pgeo = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }); pgeo.rotateX(-Math.PI / 2);
  const plaza = new THREE.Mesh(pgeo, pav); plaza.receiveShadow = true;
  g.add(plaza);
  // dark granite liners under the slab edge so the voids never show the void below
  const darkM = M('granite', () => std(0x1c1c1e, { r: 0.35, m: 0.2 }));
  for (const [cx, cz] of [[0, 0], [-38, 130]]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(61, 61), darkM); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, -9.6, cz); g.add(fl); }
  const r = rng(5);
  const treeGeo = new THREE.IcosahedronGeometry(3.2, 1); treeGeo.translate(0, 6.5, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 5, 6); trunkGeo.translate(0, 2.5, 0);
  const tm = new THREE.InstancedMesh(treeGeo, M('memTree', () => std(0x4a7a34, { r: 0.85, flat: true })), 260);
  const tt = new THREE.InstancedMesh(trunkGeo, M('bark2', () => std(0x4a3628, { r: 0.95 })), 260);
  const d = new THREE.Object3D(); let n = 0;
  for (let x = -135; x <= 95; x += 11) for (let z = -100; z <= 235; z += 11) {
    if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
    if (Math.abs(x + 38) < 40 && Math.abs(z - 130) < 40) continue;
    if (n >= 260) break;
    d.position.set(x + (r() - 0.5) * 2, 0.6, z + (r() - 0.5) * 2); d.scale.setScalar(0.8 + r() * 0.35); d.rotation.y = r() * 6; d.updateMatrix(); tm.setMatrixAt(n, d.matrix); tt.setMatrixAt(n, d.matrix); n++;
  }
  tm.count = tt.count = n; tm.castShadow = true; g.add(tm, tt);
  // new towers (3, 4, 7 WTC) glass
  const glass = M('newGlass', () => new THREE.MeshStandardMaterial({ color: 0x8aa8c0, roughness: 0.08, metalness: 0.95 }));
  for (const [x, z, w, dd, h] of [[110, 60, 50, 50, 300], [100, 190, 50, 45, 288], [-10, -260, 70, 45, 226]]) box(w, h, dd, glass, x, h / 2, z, g);
  // Oculus (white ribs)
  const ribM = M('oculus', () => std(0xf2f2ee, { r: 0.4 }));
  for (let i = 0; i < 18; i++) { const rib = box(1.2, 30, 2, ribM, 75 + (i - 9) * 4, 14, 120, g); rib.rotation.z = (i < 9 ? -1 : 1) * (0.5 + Math.abs(i - 9) * 0.06); }
  // museum pavilion
  const pav2 = box(30, 14, 20, glass, -60, 7, 75, g); pav2.rotation.y = 0.4;
  g.userData.pools = pools;
  g.userData.one = one;
  g.visible = false;
  return g;
}

// ---------------- Tribute in Light ----------------
const BEAM_VS = `varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const BEAM_FS = `uniform float uI; uniform float uH; uniform float uT; uniform float uRise; varying vec3 vP; varying vec3 vN; varying vec3 vW;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
  void main(){
    float y = clamp(vP.y / uH + 0.5, 0.0, 1.0);
    float tip = 1.0 - smoothstep(uRise - 260.0, uRise, vW.y);
    if (tip <= 0.0) discard;
    float edge = pow(abs(dot(normalize(vN), vec3(0.0, 0.0, 1.0))), 1.5);
    float fall = exp(-y * 2.4) * 0.9 + 0.1 * (1.0 - y);
    float haze = 0.75 + 0.25 * n2(vec2(vW.y * 0.01 - uT * 0.2, vW.x * 0.02));
    vec3 col = vec3(0.55, 0.75, 1.25) * uI * fall * haze * (0.35 + 0.65 * edge) * tip;
    gl_FragColor = vec4(col, 1.0);
  }`;
export function makeTribute() {
  const g = new THREE.Group();
  const U = { uI: { value: 1 }, uH: { value: 4000 }, uT: { value: 0 }, uRise: { value: 1e5 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, uniforms: U, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of [[0, 0], [-38, 130]]) {
    const geo = new THREE.CylinderGeometry(34, 26, 4000, 4, 1, true); geo.rotateY(Math.PI / 4);
    const b = new THREE.Mesh(geo, mat); b.position.set(x, 2000, z); b.frustumCulled = false; g.add(b);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(12, 10, 4000, 4, 1, true), mat); core.position.copy(b.position); g.add(core);
    // light banks on the ground
    const bank = new THREE.Mesh(new THREE.BoxGeometry(48, 1.2, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 4, 6) })); bank.position.set(x, 0.8, z); g.add(bank);
  }
  // ghost outlines of the towers
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(63.4, 417, 63.4, 1, 6, 1));
  const lm = new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 0.8, 1.4), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const [x, z] of [[0, 0], [-38, 130]]) { const l = new THREE.LineSegments(edges, lm); l.position.set(x, 208.5, z); g.add(l); }
  g.userData = { U, ghost: lm };
  g.visible = false;
  return g;
}

// ---------------- rooftop TV cameras ----------------
export function makeRooftopCams() {
  const g = new THREE.Group();
  const roof = box(40, 1, 30, M('roofTop', () => std(0x5a5a58, { r: 0.9 })), 0, 0, 0, g);
  const crew = [];
  for (let i = 0; i < 4; i++) {
    const cam = new THREE.Group();
    const legs = M('tripod', () => std(0x1a1a1a, { r: 0.5, m: 0.5 }));
    for (let k = 0; k < 3; k++) { const l = cyl(0.025, 0.025, 1.5, legs, 0, 0.7, 0, cam, 6); const a = k * 2.1; l.position.set(Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
    box(0.35, 0.4, 0.75, M('tvCamBody', () => std(0x26282c, { r: 0.4, m: 0.3 })), 0, 1.6, 0, cam);
    const lens = cyl(0.11, 0.13, 0.5, MAT.black(), 0, 1.6, 0.55, cam, 14); lens.rotation.x = Math.PI / 2;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), MAT.darkGlass()); glass.position.set(0, 1.6, 0.81); cam.add(glass);
    cam.position.set(-12 + i * 7, 0.5, 4); cam.rotation.y = Math.PI + (i - 1.5) * 0.08;
    g.add(cam);
    const op = new Person({ seed: 600 + i, jacket: ['#2a2e36', '#4a3e34', '#1c2230', '#3a3e48'][i], headwear: i % 2 ? 'cap' : null });
    op.root.position.set(-12 + i * 7, 0.5, 4.9); op.root.rotation.y = Math.PI; g.add(op.root); crew.push(op);
  }
  g.visible = false;
  return { group: g, crew };
}

// ---------------- the excavation pit (2002) ----------------
export const PIT = [-135, -120, 110, 245];
export function makePit() {
  const g = new THREE.Group();
  const [x0, z0, x1, z1] = PIT, D = 21;
  const wallM = M('slurryWall', () => {
    const t = canvasTex(512, 256, (gg, w, h) => {
      const img = gg.createImageData(w, h); const d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm2(x / 40, y / 60, 4, 4) * 0.12, drip = Math.max(0, fbm2(x / 6, y / 120, 9, 3)) * 0.25 * (y / h); const v = 0.42 + n - drip + hash(x * 7 + y * 131) * 0.05; const i = (y * w + x) * 4; d[i] = 110 * v * 1.6; d[i + 1] = 104 * v * 1.6; d[i + 2] = 96 * v * 1.6; d[i + 3] = 255; }
      gg.putImageData(img, 0, 0);
    });
    t.repeat.set(8, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  });
  const W = x1 - x0, L = z1 - z0;
  const walls = [[W, (x0 + x1) / 2, z0, 0], [W, (x0 + x1) / 2, z1, Math.PI], [L, x0, (z0 + z1) / 2, Math.PI / 2], [L, x1, (z0 + z1) / 2, -Math.PI / 2]];
  for (const [w, x, z, ry] of walls) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, D), wallM); m.position.set(x, -D / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); }
  const floorM = M('pitFloor', () => { const t = canvasTex(512, 512, (gg, w, h) => { const img = gg.createImageData(w, h); const d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm2(x / 30, y / 30, 2, 4) * 0.15 + hash(x * 3 + y * 977) * 0.08; const v = 0.75 + n; const i = (y * w + x) * 4; d[i] = 120 * v; d[i + 1] = 104 * v; d[i + 2] = 86 * v; d[i + 3] = 255; } gg.putImageData(img, 0, 0); }); t.repeat.set(10, 14); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set((x0 + x1) / 2, -D, (z0 + z1) / 2); fl.receiveShadow = true; g.add(fl);
  // ramp from the south-west corner
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 120), floorM); ramp.position.set(x0 + 10, -D / 2, z1 - 70); ramp.rotation.x = -Math.atan2(D, 120); ramp.receiveShadow = ramp.castShadow = true; g.add(ramp);
  // rim fence + flags
  const fenceM = M('pitFence', () => std(0x6a6c6e, { r: 0.5, m: 0.5, transparent: true, opacity: 0.55 }));
  for (const [w, x, z, ry] of walls) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), fenceM); f.position.set(x, 1.2, z); f.rotation.y = ry; g.add(f); }
  const flags = [];
  for (let i = 0; i < 8; i++) { const f = makeFlag('us', 1.8, 1.0, { poleH: 7, amp: 0.7 }); f.position.set(x0 + 20 + i * 30, 0, z0 - 4); g.add(f); flags.push(f); }
  // ceremony at the bottom
  const crowd = new Crowd(320, { seed: 77, shirts: ['#1c2230', '#24262c', '#3a3e48', '#2a2e36', '#f2f2f0', '#5a1c2a'] });
  const r = rng(12);
  for (let i = 0; i < 320; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 34; crowd.pos[i] = [-10 + Math.cos(a) * rr * 1.4, -D, 90 + Math.sin(a) * rr * 0.78, Math.PI + (r() - 0.5) * 0.4]; }
  g.add(crowd.group);
  const stage = box(14, 1.2, 6, M('stageWood', () => std(0x3a2a20, { r: 0.7 })), -10, -D + 0.6, 50, g);
  const reader = new Person({ seed: 5001, jacket: '#1c2230', female: true });
  reader.root.position.set(-10, -D + 1.2, 50); g.add(reader.root);
  const pod = box(0.7, 1.15, 0.5, M('podiumDark', () => std(0x2a1a14, { r: 0.6 })), -10, -D + 1.8, 50.7, g);
  const bf = makeFlag('us', 6, 3.2, { poleH: 1, amp: 0.2, pole: false }); bf.position.set(-13, -D + 9, 47.5); g.add(bf); flags.push(bf);
  // trucks & excavators at work
  const yellow = M('excavator', () => std(0xd8a020, { r: 0.6 }));
  for (const [x, z, ry] of [[60, 0, 0.6], [80, 160, 2.2], [-100, -60, -0.8]]) { const ex = new THREE.Group(); box(4, 2.2, 6, yellow, 0, 1.6, 0, ex); box(2.5, 2.2, 2.5, yellow, 0, 3.6, -1, ex); const arm = box(0.8, 0.8, 9, yellow, 0, 6, 3.5, ex); arm.rotation.x = -0.5; box(4.2, 1, 6.5, MAT.rubber(), 0, 0.5, 0, ex); ex.position.set(x, -D, z); ex.rotation.y = ry; g.add(ex); }
  g.visible = false;
  return { group: g, crowd, reader, flags, D };
}
