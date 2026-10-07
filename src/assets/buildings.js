// Architecture: suburban houses, Texas ranch, Pentagon, Capitol, White House, Kremlin,
// Berlin Wall, hangar, Afghan compound, One World Trade Center, memorial pools, rooms.
import * as THREE from 'three';
import { std, M, MAT, cityMaterial, waterMaterial } from './materials.js';
import { sidingTex, brickTex, concreteTex, canvasTex, tileTex, woodTex, cached, pixels } from './textures.js';
import { box, cyl, makeTree, makeBush } from './props.js';
import { rng, hash, hash2, fbm2 } from '../core/util.js';

const glowM = (c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) });

function windowTex(lit = false) {
  return cached('houseWin' + lit, () => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = lit ? '#ffcf8a' : '#1c2630'; g.fillRect(0, 0, w, h);
    if (!lit) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(160,200,230,0.5)'); gr.addColorStop(0.5, 'rgba(40,60,80,0.1)'); gr.addColorStop(1, 'rgba(120,160,190,0.3)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h / 2 - 3, w, 6);
  }, { clamp: true }));
}

// Suburban house. o: {w, d, color, roof, seed, lit, garage}
export function makeHouse(o = {}) {
  const g = new THREE.Group(); const r = rng(o.seed ?? 1);
  const W = o.w ?? 10 + r() * 3, D = o.d ?? 8 + r() * 2, H = o.h ?? 3.0;
  const col = o.color || ['#e6dcc8', '#c8d4dc', '#d8c8a8', '#f0ece2', '#b8c8b0', '#e8d0b8'][Math.floor(r() * 6)];
  const wall = M('siding' + col, () => new THREE.MeshStandardMaterial({ map: (() => { const t = sidingTex(col); t.repeat.set(2, 1); return t; })(), roughness: 0.85 }));
  const roofCol = o.roof || ['#4a4a4e', '#6a3a2a', '#3a3e4a', '#5a5048'][Math.floor(r() * 4)];
  const roofM = M('roof' + roofCol, () => std(roofCol, { r: 0.9 }));
  const trim = M('trim', () => std(0xf4f2ec, { r: 0.6 }));
  box(W, H, D, wall, 0, H / 2, 0, g);
  // gable roof
  const rs = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.5, 0), new THREE.Vector2(W / 2 + 0.5, 0), new THREE.Vector2(0, 2.4)]);
  const rg = new THREE.ExtrudeGeometry(rs, { depth: D + 1, bevelEnabled: false }); rg.translate(0, 0, -(D + 1) / 2);
  const roof = new THREE.Mesh(rg, roofM); roof.position.y = H; roof.castShadow = roof.receiveShadow = true; g.add(roof);
  // windows & door
  const wm = new THREE.MeshStandardMaterial({ map: windowTex(o.lit), roughness: 0.2, metalness: 0.2, emissive: o.lit ? 0xffb060 : 0x000000, emissiveIntensity: o.lit ? 1.2 : 0, emissiveMap: o.lit ? windowTex(true) : null });
  const win = (x, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.3), wm); p.position.set(x, 1.6, z); p.rotation.y = ry; g.add(p); };
  for (const x of [-W / 3, W / 3]) win(x, D / 2 + 0.01, 0);
  for (const x of [-W / 4, W / 4]) win(x, -D / 2 - 0.01, Math.PI);
  win(W / 2 + 0.01, 0, Math.PI / 2); win(-W / 2 - 0.01, 0, -Math.PI / 2);
  box(1.0, 2.1, 0.08, M('door' + (o.door || 'r'), () => std(o.door || ['#7a2a24', '#2a3a5a', '#2a4a34'][Math.floor(r() * 3)], { r: 0.5 })), 0, 1.05, D / 2 + 0.03, g);
  box(2.2, 0.2, 1.4, trim, 0, 0.1, D / 2 + 0.7, g); // porch step
  if (o.garage !== false) {
    const gw = 4.2;
    box(gw, H * 0.85, D * 0.75, wall, W / 2 + gw / 2, H * 0.425, D * 0.125, g);
    box(3.2, 2.2, 0.06, M('garageDoor', () => std(0xeeeae2, { r: 0.6 })), W / 2 + gw / 2, 1.1, D / 2 + 0.01, g);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.4, 0.25, D * 0.75 + 0.4), roofM); gr.position.set(W / 2 + gw / 2, H * 0.85 + 0.12, D * 0.125); g.add(gr);
  }
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

// Texas ranch house (single storey, long, wide porch, metal roof)
export function makeRanchHouse() {
  const g = new THREE.Group();
  const stone = M('ranchStone', () => new THREE.MeshStandardMaterial({ map: (() => { const t = brickTex([190, 170, 140]); t.repeat.set(4, 1); return t; })(), roughness: 0.9 }));
  const roofM = M('ranchRoof', () => std(0x6a7a6e, { r: 0.45, m: 0.6 }));
  const wood = M('ranchWood', () => std(0x8a6a48, { r: 0.7, map: woodTex([140, 100, 64]) }));
  box(24, 3.2, 10, stone, 0, 1.6, 0, g);
  const rs = new THREE.Shape([new THREE.Vector2(-13.5, 0), new THREE.Vector2(13.5, 0), new THREE.Vector2(0, 2.2)]);
  const rg = new THREE.ExtrudeGeometry(rs, { depth: 15, bevelEnabled: false }); rg.translate(0, 0, -7.5);
  const roof = new THREE.Mesh(rg, roofM); roof.position.y = 3.2; g.add(roof);
  for (let i = 0; i < 7; i++) cyl(0.12, 0.12, 3.0, wood, -11 + i * 3.66, 1.5, 7, g, 8);
  box(24, 0.25, 4, wood, 0, 0.12, 7, g);
  const wm = new THREE.MeshStandardMaterial({ map: windowTex(false), roughness: 0.2 });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.5), wm); p.position.set(-9 + i * 4.5, 1.7, 5.01); g.add(p); }
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

// The Pentagon (5 concentric rings, courtyard). Centre at origin, radius ~ 140m (outer apothem 140)
export function makePentagon() {
  const g = new THREE.Group();
  const wallM = M('pentWall', () => { const m = cityMaterial({ lit: 0.1 }); m.color.set(0xc8c0ae); return m; });
  const roofM = M('pentRoof', () => std(0x4a4c4e, { r: 0.85 }));
  const ring = (R, w, h) => {
    const outer = [], inner = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + Math.PI / 2; outer.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)); inner.push(new THREE.Vector2(Math.cos(a) * (R - w), Math.sin(a) * (R - w))); }
    const sh = new THREE.Shape(outer); sh.holes.push(new THREE.Path(inner.reverse()));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, [roofM, wallM]); m.castShadow = m.receiveShadow = true;
    return m;
  };
  const Rs = [152, 128, 106, 86, 68];
  Rs.forEach((R, i) => { const m = ring(R, i === 0 ? 14 : 12, 23.5); g.add(m); });
  // light wells between rings (dark gaps) are implied; courtyard grass
  const yard = new THREE.Mesh(new THREE.CircleGeometry(52, 5), M('pentYard', () => std(0x4a7a3a, { r: 1 })));
  yard.rotation.x = -Math.PI / 2; yard.rotation.z = Math.PI / 2; yard.position.y = 0.2; g.add(yard);
  // lawn + parking around
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(330, 40), M('pentLawn', () => std(0x5a7a40, { r: 1 })));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.05; lawn.receiveShadow = true; g.add(lawn);
  const lots = M('parkingLot', () => { const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#4a4a4c'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(230,230,220,0.7)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 2, h * 0.4); for (let x = 0; x < w; x += 16) c.fillRect(x, h * 0.6, 2, h * 0.4); }); t.repeat.set(10, 4); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); });
  for (const [x, z, w, d, ry] of [[-230, -60, 160, 220, 0.2], [230, 40, 160, 260, -0.15], [0, 260, 300, 120, 0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lots); p.rotation.x = -Math.PI / 2; p.rotation.z = ry; p.position.set(x, 0.1, z); p.receiveShadow = true; g.add(p);
  }
  return g;
}

export function makeCapitol() {
  const g = new THREE.Group();
  const marble = M('marble', () => std(0xf0ece2, { r: 0.55 }));
  box(230, 22, 70, marble, 0, 11, 0, g);
  box(80, 30, 60, marble, 0, 15, 5, g);
  for (let i = 0; i < 16; i++) cyl(1.2, 1.2, 18, marble, -36 + i * 4.8, 9 + 22, 36, g, 12);
  const drum = cyl(26, 28, 26, marble, 0, 30 + 13, 0, g, 36);
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; cyl(0.8, 0.8, 22, marble, Math.cos(a) * 29, 43, Math.sin(a) * 29, g, 8); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(27, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), marble); dome.position.y = 56; dome.scale.y = 1.25; g.add(dome);
  cyl(5, 5, 14, marble, 0, 96, 0, g, 16);
  const statue = cyl(0.8, 1.2, 6, M('bronzeStat', () => std(0x4a3a2a, { r: 0.4, m: 0.6 })), 0, 106, 0, g, 8);
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

export function makeWhiteHouse() {
  const g = new THREE.Group(); const wh = M('whMarble', () => std(0xf6f4ee, { r: 0.5 }));
  box(52, 18, 26, wh, 0, 9, 0, g);
  const portico = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 18, 24, 1, false, -Math.PI / 2, Math.PI), wh); portico.position.set(0, 9, -13); g.add(portico);
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i + 0.5) / 6 * Math.PI; cyl(0.7, 0.7, 16, wh, Math.sin(a) * 15, 8, -13 - Math.cos(a) * 15 * -1 * -1, g, 10); }
  box(54, 1.5, 28, wh, 0, 18.75, 0, g);
  const wm = new THREE.MeshStandardMaterial({ map: windowTex(false), roughness: 0.2 });
  for (let i = 0; i < 8; i++) for (const y of [5, 13]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), wm); p.position.set(-21 + i * 6, y, 13.01); g.add(p); }
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

export function makeKremlinTower() {
  const g = new THREE.Group();
  const brick = M('kremlinBrick', () => new THREE.MeshStandardMaterial({ map: (() => { const t = brickTex([150, 50, 40]); t.repeat.set(3, 6); return t; })(), roughness: 0.85 }));
  const green = M('kremlinRoof', () => std(0x2a5a4a, { r: 0.6, m: 0.2 }));
  box(18, 40, 18, brick, 0, 20, 0, g); box(14, 14, 14, brick, 0, 47, 0, g); box(10, 10, 10, brick, 0, 59, 0, g);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(7.5, 26, 8), green); sp.position.y = 77; g.add(sp);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), glowM(0xff2020, 4)); star.position.y = 93; star.scale.set(1, 1, 0.35); g.add(star);
  // clock face
  const clock = new THREE.Mesh(new THREE.CircleGeometry(4, 24), M('kremlinClock', () => std(0x1a1a1a, { r: 0.4 }))); clock.position.set(0, 47, 7.02); g.add(clock);
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  // wall
  for (const s of [-1, 1]) { box(60, 14, 5, brick, s * 39, 7, 0, g); for (let i = 0; i < 12; i++) box(2, 2.4, 5.2, brick, s * (12 + i * 4.8), 15.2, 0, g); }
  return g;
}

function graffitiTex(seed) {
  return cached('graffiti' + seed, () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d8d4c8'; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    const cols = ['#e83a3a', '#2a6ae8', '#f2c40c', '#2ab85a', '#e86ac8', '#111', '#f28a1c', '#7a3ae8'];
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = 6 + r() * 18; g.lineCap = 'round';
      g.beginPath(); let x = r() * w, y = h * 0.35 + r() * h * 0.6; g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 160; y += (r() - 0.5) * 120; g.quadraticCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 80, x, y); }
      g.stroke();
    }
    g.font = 'bold 72px "Bebas Neue", Impact, sans-serif';
    const words = ['FREIHEIT', 'WIR SIND EIN VOLK', 'BERLIN', 'LOVE', 'PEACE', '1989', 'NO MORE WALLS'];
    for (let i = 0; i < 3; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.save(); g.translate(30 + r() * 200, 260 + i * 90); g.rotate((r() - 0.5) * 0.2); g.fillText(words[Math.floor(r() * words.length)], 0, 0); g.restore(); }
    // weathering
    pixels(g, w, h, (x, y) => { const d = g.__d || (g.__d = g.getImageData(0, 0, w, h).data); const i = (y * w + x) * 4; const n = hash2(x >> 1, y >> 1) * 18; return [d[i] - n, d[i + 1] - n, d[i + 2] - n]; });
  }));
}
export function makeWallSegment(seed = 1) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: graffitiTex(seed), roughness: 0.9 });
  box(1.2, 3.6, 0.25, m, 0, 1.8, 0, g);
  const capM = M('wallCap', () => std(0xd8d4c8, { r: 0.9 }));
  const capG = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12); capG.rotateZ(Math.PI / 2);
  const c = new THREE.Mesh(capG, capM); c.position.y = 3.7; g.add(c);
  box(1.2, 0.2, 1.6, capM, 0, 0.1, 0.6, g);
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

export function makeHangar(color = 0xd8d8d0) {
  const g = new THREE.Group();
  const m = M('hangar' + color, () => std(color, { r: 0.6, m: 0.3 }));
  const sh = new THREE.Shape(); sh.moveTo(-15, 0); sh.lineTo(15, 0); sh.lineTo(15, 6); sh.quadraticCurveTo(0, 14, -15, 6); sh.lineTo(-15, 0);
  const hole = new THREE.Path(); hole.moveTo(-11, 0.01); hole.lineTo(11, 0.01); hole.lineTo(11, 7); hole.lineTo(-11, 7); hole.lineTo(-11, 0.01); sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 30, bevelEnabled: false }); geo.translate(0, 0, -30);
  const h = new THREE.Mesh(geo, m); h.castShadow = h.receiveShadow = true; g.add(h);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), M('hangarIn', () => std(0x3a3a3a, { r: 0.9 }))); back.position.set(0, 6, -29.9); g.add(back);
  return g;
}

function mudTex() {
  return cached('mud', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => { const n = fbm2(x / 60, y / 60, 3, 4), f = hash2(x, y) * 0.1; const v = 0.75 + n * 0.3 + f; return [176 * v, 146 * v, 108 * v]; });
  }));
}
export function makeMudHouse(seed = 1, o = {}) {
  const g = new THREE.Group(); const r = rng(seed);
  const m = M('mudWall', () => new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 0.95 }));
  const W = o.w ?? 6 + r() * 5, D = o.d ?? 5 + r() * 4, H = o.h ?? 3 + r() * 1.5;
  box(W, H, D, m, 0, H / 2, 0, g);
  box(W + 0.3, 0.3, D + 0.3, m, 0, H + 0.15, 0, g);
  const dark = M('mudDoor', () => std(0x2a2018, { r: 0.9 }));
  box(1.0, 1.9, 0.05, dark, (r() - 0.5) * W * 0.5, 0.95, D / 2 + 0.03, g);
  for (let i = 0; i < 2; i++) box(0.6, 0.6, 0.05, dark, -W / 3 + i * W * 0.66, H * 0.65, D / 2 + 0.03, g);
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}
// Abbottabad-style walled compound (3-storey house, high walls)
export function makeCompound() {
  const g = new THREE.Group();
  const wall = M('compWall', () => new THREE.MeshStandardMaterial({ map: (() => { const t = concreteTex(0.95); t.repeat.set(6, 1); return t; })(), roughness: 0.95, color: 0xd8ccb8 }));
  const L = 70, W = 45, H = 4.5;
  box(L, H, 0.5, wall, 0, H / 2, -W / 2, g); box(L, H, 0.5, wall, 0, H / 2, W / 2, g);
  box(0.5, H, W, wall, -L / 2, H / 2, 0, g); box(0.5, H, W, wall, L / 2, H / 2, 0, g);
  box(0.5, H, 20, wall, 5, H / 2, -12, g);
  const house = M('compHouse', () => std(0xe0d8c8, { r: 0.85 }));
  box(18, 9.5, 14, house, -15, 4.75, 5, g); box(10, 3, 8, house, -18, 11, 4, g);
  const winM = M('compWin', () => std(0x141414, { r: 0.5 }));
  for (let i = 0; i < 4; i++) for (const y of [2, 5.5]) box(1.2, 1.2, 0.05, winM, -21 + i * 4, y, 12.03, g);
  g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return g;
}

// One World Trade Center: square base twisting into octagonal profile, tapering, with spire
export function makeOneWTC() {
  const g = new THREE.Group();
  const H = 417, S = 61, segs = 40;
  const pos = [], idx = [];
  const ring = (t) => {
    // square at base (corners at 45deg), rotated square at top -> 8 points
    const y = t * H;
    const half = S / 2 * (1 - t * 0.5);
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = a + Math.PI / 4;
      // corner of base square
      pts.push([Math.cos(a) * half * Math.SQRT2 * (1 - t * 0.29), Math.sin(a) * half * Math.SQRT2 * (1 - t * 0.29)]);
      pts.push([Math.cos(b) * half * (1 + t * 0.0), Math.sin(b) * half * (1 + t * 0.0)]);
    }
    return pts.map(([x, z]) => [x, y, z]);
  };
  for (let k = 0; k <= segs; k++) { const r = ring(k / segs); for (const p of r) pos.push(...p); }
  for (let k = 0; k < segs; k++) for (let i = 0; i < 8; i++) {
    const a = k * 8 + i, b = k * 8 + ((i + 1) % 8), c = (k + 1) * 8 + i, d = (k + 1) * 8 + ((i + 1) % 8);
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const ng = geo.toNonIndexed(); ng.computeVertexNormals();
  const glass = new THREE.MeshStandardMaterial({ color: 0x9ab8cc, roughness: 0.06, metalness: 0.95, envMapIntensity: 1.4 });
  const tower = new THREE.Mesh(ng, glass); tower.castShadow = true; g.add(tower);
  // facets lines: subtle mullion overlay via second mesh with wireframe-ish thin edges is costly -> use top parapet + base
  box(S + 2, 56, S + 2, M('owtcBase', () => std(0xb8bcc0, { r: 0.35, m: 0.8 })), 0, 28, 0, g);
  const par = box(S * 0.5 * Math.SQRT2 * 0.71 * 1.4, 10, S * 0.5 * Math.SQRT2 * 0.71 * 1.4, M('owtcPar', () => std(0xc8ccd0, { r: 0.3, m: 0.9 })), 0, H + 5, 0, g); par.rotation.y = Math.PI / 4;
  const sp = cyl(0.8, 3.2, 124, M('owtcSpire', () => std(0xd8dade, { r: 0.3, m: 0.9 })), 0, H + 10 + 62, 0, g, 10);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), glowM(0xffffff, 8)); beacon.position.y = H + 135; g.add(beacon);
  g.userData.height = 541; // 1776 ft
  return g;
}

// 9/11 memorial pool: square void with water cascading down walls into a central void
export function makeMemorialPool(size = 60) {
  const g = new THREE.Group();
  const granite = M('granite', () => std(0x1c1c1e, { r: 0.35, m: 0.2 }));
  const bronze = M('bronzeParapet', () => new THREE.MeshStandardMaterial({ map: namesTex(), roughness: 0.4, metalness: 0.8, color: 0x8a6a42 }));
  const S = size, depth = 9;
  // parapet with names
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(S + 3, 1.1, 1.6), bronze);
    const a = (i / 4) * Math.PI * 2;
    p.position.set(Math.sin(a) * (S / 2 + 0.8), 0.55, Math.cos(a) * (S / 2 + 0.8)); p.rotation.y = a; p.castShadow = true; g.add(p);
    p.rotation.x = 0;
  }
  // walls with waterfall
  const fall = waterfallMaterial();
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(S, depth, 1, 1), fall);
    const a = (i / 4) * Math.PI * 2;
    w.position.set(Math.sin(a) * (S / 2), -depth / 2, Math.cos(a) * (S / 2)); w.rotation.y = a + Math.PI; g.add(w);
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(S, S), waterMaterial(0x1a2a30, { rep: 10, r: 0.05, bump: 0.15 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -depth; g.add(pool);
  // inner void
  const v = S * 0.3;
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(v, 6), fall);
    const a = (i / 4) * Math.PI * 2;
    w.position.set(Math.sin(a) * (v / 2), -depth - 3, Math.cos(a) * (v / 2)); w.rotation.y = a + Math.PI; g.add(w);
  }
  const voidM = new THREE.Mesh(new THREE.PlaneGeometry(v, v), M('voidDark', () => new THREE.MeshBasicMaterial({ color: 0x020203 })));
  voidM.rotation.x = -Math.PI / 2; voidM.position.y = -depth + 0.02; g.add(voidM);
  // granite rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(v + 1, 0.3, v + 1), granite); rim.position.y = -depth + 0.05; g.add(rim);
  const voidDeep = new THREE.Mesh(new THREE.PlaneGeometry(v, v), M('voidDark2', () => new THREE.MeshBasicMaterial({ color: 0x000000 }))); voidDeep.rotation.x = -Math.PI / 2; voidDeep.position.y = -depth + 0.2; g.add(voidDeep);
  g.userData.tick = (t) => { fall.userData.U.uT.value = t; };
  return g;
}
function namesTex() {
  return cached('namesTex', () => canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#6a5034'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,14,8,0.85)';
    g.font = '600 26px "Inter Tight", sans-serif';
    // abstract engraved name blocks (not real names)
    const r = rng(77);
    for (let row = 0; row < 3; row++) {
      let x = 10;
      while (x < w - 60) { const len = 70 + r() * 110; g.fillRect(x, 22 + row * 36, len, 12); x += len + 18 + r() * 10; }
    }
  }));
}
function waterfallMaterial() {
  const U = { uT: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(h(vec2(i, 0.0)), h(vec2(i + 1.0, 0.0)), u); }
      void main(){
        float x = vUv.x * 700.0;
        float col = n1(x) * 0.6 + n1(x * 0.21 + 7.0) * 0.4;
        float d = 1.0 - vUv.y;                       // 0 at the lip, 1 at the bottom
        float flow = fract(d * 2.6 - uT * (0.75 + col * 0.45) + col * 3.0);
        float streak = smoothstep(0.0, 0.3, flow) * (1.0 - smoothstep(0.6, 1.0, flow));
        float sheet = 0.5 + 0.5 * streak * (0.55 + 0.45 * n1(x * 2.7 + 2.0));
        vec3 wall = vec3(0.03, 0.033, 0.037);
        vec3 water = vec3(0.6, 0.66, 0.7) * sheet;
        float cover = 0.5 + 0.3 * col;
        float lip = 1.0 - smoothstep(0.0, 0.035, d);
        float foam = smoothstep(0.82, 1.0, d) * (0.6 + 0.4 * n1(x * 0.7 + uT * 3.0));
        vec3 c = mix(wall, water, cover) + vec3(0.45) * lip + vec3(0.32) * foam;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  m.userData.U = U;
  return m;
}

// Interior room shell. o: {w, d, h, wall, floor, ceiling, windows: 'n'|'s'|..., winTex}
export function makeRoom(o = {}) {
  const g = new THREE.Group();
  const W = o.w ?? 10, D = o.d ?? 8, H = o.h ?? 3;
  const wallM = o.wallMat || M('roomWall' + (o.wall || ''), () => std(o.wall || 0xd8d0c4, { r: 0.9 }));
  const floorM = o.floorMat || M('roomFloor' + (o.floor || ''), () => std(o.floor || 0x6a5a4a, { r: 0.8 }));
  const ceilM = M('roomCeil' + (o.ceiling || ''), () => std(o.ceiling || 0xe8e6e0, { r: 0.95 }));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorM); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilM); ce.rotation.x = Math.PI / 2; ce.position.y = H; g.add(ce);
  const walls = {};
  const wall = (name, w, x, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallM); p.position.set(x, H / 2, z); p.rotation.y = ry; p.receiveShadow = true; g.add(p); walls[name] = p; };
  if (!o.open?.includes('n')) wall('n', W, 0, -D / 2, 0);
  if (!o.open?.includes('s')) wall('s', W, 0, D / 2, Math.PI);
  if (!o.open?.includes('w')) wall('w', D, -W / 2, 0, Math.PI / 2);
  if (!o.open?.includes('e')) wall('e', D, W / 2, 0, -Math.PI / 2);
  g.userData.walls = walls;
  return g;
}
