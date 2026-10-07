// 15:41 - 17:43  25 years after: the long wars, Abbottabad, One World Trade Center, the
// memorial, a generation that never knew the world before, the responders, the end.
import * as THREE from 'three';
import { setCam } from '../core/camera.js';
import { E, clamp, lerp, hash, rng, fmtInt } from '../core/util.js';
import { C, headline, counter, smearText, meMap, pin, card, docDraw, timeline } from './infokit.js';
import { text, font, W, H } from '../core/overlay.js';
import { std, M, MAT } from '../assets/materials.js';
import { Person } from '../assets/people.js';
import { makeOneWTC } from '../assets/buildings.js';
import { canvasTex } from '../assets/textures.js';
import { dustCloud, smokePlume } from '../fx/particles.js';
import { orient } from '../sets/manhattan.js';
import { makeCar } from '../assets/vehicles.js';

const proj = (c, v) => { const p = (v.isVector3 ? v.clone() : new THREE.Vector3(...v)).project(c.cam); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z]; };
const rebuilt = (c, time = 'clear') => { c.set.setMode('rebuilt'); c.set.setTime(time); if (time === 'clear' || time === 'day') c.set.sun.userData.dir.set(0.35, 0.82, 0.45).normalize(); c.set.heroesOn = false; c.set.focus = [-40, 0, 40]; c.set.focusSize = 420; };

// label attached to a 3D point
function tag3(g, c, v, t0, label, o = {}) {
  const [x, y, z] = proj(c, v);
  if (z > 1) return;
  const p = clamp((c.lt - t0) / 0.4);
  if (p <= 0) return;
  const dx = o.dx ?? 60, dy = o.dy ?? -70;
  g.save(); g.globalAlpha = p; g.strokeStyle = o.color || '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * E.outCubic(p), y + dy * E.outCubic(p)); g.lineTo(x + dx * E.outCubic(p) + (dx > 0 ? 30 : -30), y + dy * E.outCubic(p)); g.stroke();
  g.fillStyle = o.color || '#fff'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); g.restore();
  text(g, label, x + dx + (dx > 0 ? 40 : -40), y + dy + 10, { size: o.size || 30, weight: 800, align: dx > 0 ? 'left' : 'right', color: o.color || '#fff', tracking: 0.18, p: clamp((c.lt - t0 - 0.15) / 0.4), shadow: 'rgba(0,0,0,0.7)', shadowBlur: 18 });
}

// bronze parapet panel with cut names (generic placeholder names)
function namesPanel() {
  const FIRST = ['JOHN', 'MARIA', 'DAVID', 'ANNA', 'MICHAEL', 'ELIZABETH', 'JAMES', 'ROSE', 'THOMAS', 'LINDA', 'ROBERT', 'CAROL', 'PAUL', 'KAREN', 'JOSEPH', 'DIANE', 'KEVIN', 'LAURA', 'DANIEL', 'SUSAN', 'PETER', 'MARY', 'STEVEN', 'HELEN'];
  const LAST = ['ALVAREZ', 'BRENNAN', 'CHEN', 'DOYLE', 'ESPOSITO', 'FLANAGAN', 'GRECO', 'HAYES', 'IBRAHIM', 'JOHANSSON', 'KOWALSKI', 'LOPEZ', 'MURPHY', 'NAKAMURA', 'OKAFOR', 'PATEL', 'QUINN', 'ROSSI', 'SULLIVAN', 'TORRES', 'VARGAS', 'WALSH', 'YOUNG', 'ZIMMERMAN'];
  const tex = canvasTex(2400, 900, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5a4024'); gr.addColorStop(0.5, '#7a5a34'); gr.addColorStop(1, '#4e3820');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(1776);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,220,160' : '20,12,4'},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.font = '600 64px "Inter Tight", sans-serif'; g.textBaseline = 'middle';
    for (let row = 0; row < 5; row++) {
      let x = 40 + (row % 2) * 120;
      const y = 110 + row * 170;
      while (x < w - 200) {
        const nm = FIRST[Math.floor(r() * FIRST.length)] + ' ' + String.fromCharCode(65 + Math.floor(r() * 26)) + '. ' + LAST[Math.floor(r() * LAST.length)];
        const tw = g.measureText(nm).width;
        if (x + tw > w - 30) break;
        g.fillStyle = 'rgba(255,226,170,0.35)'; g.fillText(nm, x + 2, y + 3); // lit lower bevel
        g.fillStyle = '#0b0805'; g.fillText(nm, x, y); // cut-through letters
        x += tw + 90 + r() * 40;
      }
    }
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.07, 1.6), [M('bronzeSide', () => std(0x6a4c2a, { r: 0.35, m: 0.85 })), M('bronzeSide', () => std(0x6a4c2a, { r: 0.35, m: 0.85 })),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.75, color: 0xffffff }), M('bronzeSide', () => std(0x6a4c2a, { r: 0.35, m: 0.85 })), M('bronzeSide', () => std(0x6a4c2a, { r: 0.35, m: 0.85 })), M('bronzeSide', () => std(0x6a4c2a, { r: 0.35, m: 0.85 }))]);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function whiteRose() {
  const g = new THREE.Group();
  const stemM = std(0x2f5a24, { r: 0.7 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.42, 6), stemM); stem.rotation.z = Math.PI / 2; stem.position.x = -0.22; g.add(stem);
  for (const [x, a] of [[-0.18, 0.6], [-0.3, -0.7]]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), stemM); lf.scale.set(1.4, 0.15, 0.6); lf.position.set(x, 0.01, a * 0.03); lf.rotation.y = a; g.add(lf); }
  const pet = std(0xf6f3ec, { r: 0.55 });
  const bloom = new THREE.Group(); bloom.position.set(0.0, 0.025, 0); bloom.rotation.z = -1.2; g.add(bloom);
  for (let i = 0; i < 9; i++) {
    const rr = i < 3 ? 0.012 : i < 6 ? 0.022 : 0.03;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 1.2, 0, Math.PI * 0.55), pet);
    const a = i * 2.4; p.position.set(Math.cos(a) * rr, -0.004 * i, Math.sin(a) * rr); p.rotation.set(0.3 + i * 0.05, a, 0); p.material.side = THREE.DoubleSide; bloom.add(p);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function ghostTowers() {
  const g = new THREE.Group();
  const fm = new THREE.MeshBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0.2, depthWrite: false });
  const lm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  const geo = new THREE.BoxGeometry(63.4, 417, 63.4, 1, 1, 1); geo.translate(0, 208.5, 0);
  const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(63.4, 417, 63.4, 1, 12, 1)); eg.translate(0, 208.5, 0);
  for (const [x, z] of [[0, 0], [-38, 130]]) { const t = new THREE.Group(); t.add(new THREE.Mesh(geo, fm), new THREE.LineSegments(eg, lm)); t.position.set(x, 0.6, z); g.add(t); }
  g.userData = { fm, lm };
  return g;
}
function candle(i) {
  const g = new THREE.Group();
  const h = 0.9 + hash(i * 3) * 0.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, h, 20), M('candleWax', () => new THREE.MeshStandardMaterial({ color: 0xf2e6cc, roughness: 0.55, emissive: 0x6a3a10, emissiveIntensity: 0.25 })));
  body.position.y = h / 2; body.castShadow = true; g.add(body);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 5), MAT.black()); wick.position.y = h + 0.04; g.add(wick);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4.6, 1.4) })); fl.scale.set(1, 2.4, 1); fl.position.y = h + 0.2; g.add(fl);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.7, 0.25), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.y = h + 0.22; fl.add(halo); halo.scale.set(1, 1 / 2.4, 1);
  g.userData = { fl, h };
  return g;
}

export default function quarterCentury(D, film) {
  // ---- a quarter of a century ----
  D.shot('a quarter of a century', {
    set: 'info:dark', in: 'fade', inDur: 0.3, mood: 'reflect',
    enter: (c) => {
      const n = 26, geo = new THREE.BoxGeometry(0.34, 1, 0.34);
      c.set.bars = [];
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4 }));
        m.position.set(-15 + i * 1.2, -4, 1.2); m.castShadow = true; c.set.add(m); c.set.bars.push(m);
      }
    },
    update: (c) => {
      const yr = lerp(2001, 2026, E.outCubic(clamp((c.lt - 0.2) / 2.2)));
      c.set.bars.forEach((m, i) => {
        const on = clamp(yr - 2001 - i + 1);
        const h = 0.3 + on * (2.2 + i * 0.16);
        m.scale.y = h; m.position.y = -6 + h / 2;
        m.material.emissive.setRGB(1, i === 0 ? 0.2 : 0.9, i === 0 ? 0.15 : 0.8); m.material.emissiveIntensity = on * (i === 0 || i === 25 ? 1.6 : 0.35);
      });
    },
    cam: { p: [[-2, 3, 40], [2, 2, 37]], l: [[0, -1, 0], [0, -1, 0]], fov: 32, shake: 0.04 },
    overlay: (c, g) => {
      const y1 = c.T >= D.S.words.find((w) => w.w === '25' && w.s > 943).s - 0.1;
      if (!y1) counter(g, c.lt, 2001, 2026, W / 2, 330, { size: 200, d: 2.4, t0: 0.2, color: '#f4f1ea', fmt: (v) => String(Math.round(v)) });
      else {
        text(g, '25', W / 2, 360, { size: 260, weight: 800, align: 'center', color: '#f4f1ea', p: 1 });
        text(g, 'YEARS', W / 2, 440, { size: 54, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.6, p: 1 });
      }
    },
    sfx: [[0.2, 'tickRun', { dur: 2.2 }]],
  });
  D.sfx(D.peek('25 years a'), 'softHit', {});
  D.shot('a moment in history', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      // zoom out from the last 25 years to two thousand years of history
      const k = E.ioCubic(clamp((c.lt - 0.2) / 1.4));
      const span = Math.exp(lerp(Math.log(40), Math.log(2100), k));
      const x0 = 160, x1 = 1760, y = 600, end = 2026, start = end - span;
      const X = (yr) => lerp(x0, x1, (yr - start) / span);
      g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      const step = span > 600 ? 500 : span > 150 ? 50 : 5;
      for (let yr = Math.ceil(start / step) * step; yr <= end; yr += step) {
        const x = X(yr); if (x < x0 - 1) continue;
        g.fillStyle = C.ink; g.fillRect(x - 1.5, y - 14, 3, 28);
        font(g, 28, 600, 'sans'); g.textAlign = 'center'; g.fillText(String(yr), x, y + 60); g.textAlign = 'left';
      }
      const xa = Math.max(x0, X(2001)), xb = X(2026);
      g.fillStyle = C.red; g.fillRect(xa, y - 26, Math.max(3, xb - xa), 52);
      text(g, '25 YEARS', xb, y - 60, { size: 40, weight: 800, align: 'right', color: C.red, p: clamp(c.lt / 0.4) });
      headline(g, c.lt, 'in history —', 'A MOMENT', { x: 160, y: 300, align: 'left', bigSize: 110, color: C.ink, smallColor: C.grey, t0: 0.5 });
    },
    sfx: [[0.2, 'zoomOut', { dur: 1.4 }]],
  });
  D.shot('an entire era in', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const ages = [[0.5, -10, '#e8a23a'], [0.78, -3.4, '#3a6ab8'], [1.0, 3.6, '#c8102e'], [1.0, 10.2, '#2a2e36']];
      c.set.ppl = ages.map(([s, x, col], i) => { const p = new Person({ seed: 8800 + i, jacket: i === 3 ? '#4a4e58' : null, shirt: col, female: i % 2 === 1, hairColor: i === 3 ? '#9a9a96' : undefined }); p.root.scale.setScalar(s * 4.8); p.root.position.set(x, -8.2, 2.2); p.root.rotation.y = 0.15; c.set.add(p.root); return p; });
    },
    update: (c) => c.set.ppl.forEach((p, i) => { p.pose('stand', c.T + i); const k = E.outBack(clamp((c.lt - 0.15 - i * 0.22) / 0.5)); p.root.position.y = lerp(-20, -8.2, k); }),
    cam: { p: [[0, 1, 44], [0, 0.5, 41]], l: [[0, -1, 0], [0, -1, 0]], fov: 30, shake: 0.03 },
    overlay: (c, g) => {
      const x0 = 300, x1 = 1620, y = 230;
      const p = E.ioCubic(clamp((c.lt - 0.3) / 0.8));
      g.fillStyle = 'rgba(21,21,21,0.12)'; g.fillRect(x0, y - 16, (x1 - x0) * p, 32);
      const q = E.ioCubic(clamp((c.lt - 0.9) / 0.7));
      g.fillStyle = C.red; g.fillRect(x0 + (x1 - x0) * (20 / 80), y - 16, (x1 - x0) * (25 / 80) * q, 32);
      text(g, 'A HUMAN LIFE', x0, y - 40, { size: 30, weight: 800, color: C.ink, tracking: 0.25, p: clamp((c.lt - 0.2) / 0.4) });
      text(g, '25 YEARS', x0 + (x1 - x0) * (32.5 / 80), y + 70, { size: 36, weight: 800, align: 'center', color: C.red, p: clamp((c.lt - 1.2) / 0.4) });
      text(g, 'an entire era', x0 + (x1 - x0) * (32.5 / 80), y + 112, { size: 30, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.grey, p: clamp((c.lt - 1.4) / 0.4) });
    },
    sfx: [[0.15, 'pop', {}], [0.37, 'pop', {}], [0.59, 'pop', {}], [0.81, 'pop', {}]],
  });
  // ---- the war on terror by 2011 ----
  const convoyAt = (c, lt) => {
    const s = c.set; const z0 = 120 - lt * 7;
    s.convoy.forEach((h, i) => { h.position.set(i % 2 ? 2.4 : -2.4, 0.3, z0 + i * 26); h.rotation.y = Math.PI; });
    s.soldiers.forEach((p, i) => { p.root.position.set(8.2 + (i % 2) * 1.5, 0.3, 74 - i * 4.5 - lt * 1.3); p.root.rotation.y = Math.PI; p.setExpr('sad'); });
    for (let k = 0; k < 14; k++) { const z = 130 - k * 6; const tt = c.shot.t0 + (120 - z) / 7; s.fx.push((bb, T) => dustCloud(bb, T, { t0: tt - 2, count: 26, seed: 900 + k, spawn: 4, speed: 4, drag: 0.4, size: [2, 9], growT: 4, alpha: 0.42, rise: 0.4, center: [0, 0.6, z + 30], height: 0.6, color: [0.82, 0.7, 0.52], life: 8, jitter: 3 })); }
  };
  D.shot('by 2011 the war', {
    set: 'desert:convoy', in: 'fade', inDur: 0.3, bed: 'desertWind', mood: 'war',
    enter: (c) => { c.set.focus = [0, 0, 120]; c.set.focusSize = 200; },
    update: (c) => convoyAt(c, c.lt),
    cam: { p: [[-70, 34, 30], [-62, 30, 52]], l: [[0, 2, 120], [0, 2, 130]], fov: 34, shake: 0.18 },
    overlay: (c, g) => text(g, '2011', 96, 200, { size: 140, weight: 800, color: '#fff', p: clamp((c.lt - 0.2) / 0.5), blur: 14, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 30 }),
    sfx: [[0, 'convoyRumble', { dur: 3 }]],
  });
  D.shot('a series of grinding', {
    set: 'desert:convoy', in: 'whip', bed: 'desertWind',
    enter: (c) => { c.set.focus = [8, 0, 60]; c.set.focusSize = 60; },
    update: (c) => convoyAt(c, c.lt + 3.2),
    cam: (c) => { const z = 74 - (c.lt + 3.2) * 1.3; return { p: [[12.5, 1.5, z - 5.5], [12.3, 1.5, z - 7.8]], l: [[8.6, 1.4, z - 1], [8.6, 1.35, z - 3.2]], fov: 36, shake: 0.4 }; },
    post: { dof: { focus: 5.5, aperture: 4, maxR: 8 } },
    sfx: [[0, 'bootsGravel', { dur: 3.4 }], [0.6, 'humveePass', {}]],
  });
  D.shot('iraq was devastated', {
    set: 'desert:ruins', in: 'whip', bed: 'desertWind', mood: 'grief',
    enter: (c) => { c.set.focus = [0, 0, 0]; c.set.focusSize = 220; },
    update: (c) => {
      for (const [x, z, k] of [[-60, -40, 1], [40, 60, 2], [120, -120, 3], [-200, 200, 4]]) c.set.fx.push((bb, T) => smokePlume(bb, T, { t0: -60, count: 90, life: 30, rise: 5, wind: [4, 0, 1], size: [6, 70], pos: [x, 4, z], spread: [6, 2, 6], color: [0.12, 0.11, 0.1], alpha: 0.8, fire: 0.5, fireFade: 8, seed: 700 + k }));
    },
    cam: { p: [[-180, 40, 220], [-120, 32, 160]], l: [[0, 8, 0], [10, 8, -10]], fov: 36, shake: 0.15 },
    overlay: (c, g) => text(g, 'IRAQ', 96, 200, { size: 120, weight: 800, color: '#fff', p: clamp((c.lt - 0.1) / 0.5), blur: 14, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 30 }),
    sfx: [[0, 'distantBoom', {}], [0.9, 'distantBoom', { gain: 0.6 }]],
  });
  D.shot('afghanistan remained unstable', {
    set: 'afghan:day', in: 'whip', bed: 'windMountain',
    enter: (c) => { c.set.focus = [0, 0, 60]; c.set.focusSize = 300; },
    update: (c) => {
      for (const [x, z, k] of [[-80, 220, 1], [60, -150, 2]]) { const y = c.set.H(x, z); c.set.fx.push((bb, T) => smokePlume(bb, T, { t0: -60, count: 80, life: 30, rise: 5, wind: [3, 0, 1], size: [5, 60], pos: [x, y + 2, z], spread: [4, 1, 4], color: [0.15, 0.14, 0.13], alpha: 0.75, seed: 720 + k })); }
    },
    cam: (c) => { const H = c.set.H; return { p: [[220, H(220, 380) + 70, 380], [190, H(190, 360) + 64, 350]], l: [[0, 10, 60], [0, 10, 40]], fov: 36, shake: 0.2 }; },
    overlay: (c, g) => text(g, 'AFGHANISTAN', 96, 200, { size: 100, weight: 800, color: '#fff', p: clamp((c.lt - 0.1) / 0.5), blur: 14, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 30 }),
    sfx: [[0.4, 'distantGunfire', {}]],
  });
  // ---- Abbottabad, May 2011 ----
  const heliPath = (h, i, u) => {
    const a = new THREE.Vector3(-520 + i * 30, 70, 420 - i * 40), b = new THREE.Vector3(-30 + i * 22, 22 + i * 4, 30 - i * 20);
    const p = a.clone().lerp(b, u); h.position.copy(p); orient(h, b.clone().sub(a).setY(0), 0); h.rotateX(0.12 * (1 - u));
  };
  D.shot('that may u s navy seals', {
    set: 'abbottabad', in: 'glitch', bed: 'nightHeli', mood: 'tension',
    update: (c) => c.set.helis.forEach((h, i) => heliPath(h, i, clamp(0.35 + c.lt * 0.11 - i * 0.04))),
    cam: (c) => { const h = c.set.helis[0].position; return { p: [[h.x - 30, h.y + 6, h.z + 34], [h.x - 26, h.y + 5, h.z + 30]], l: [[h.x + 30, h.y - 10, h.z - 40], [h.x + 30, h.y - 12, h.z - 40]], fov: 46, shake: 0.6 }; },
    sfx: [[0, 'heliApproach', { dur: 3 }]],
  });
  D.loc(D.peek('that may u s navy seals') + 0.3, 2.3, 'Abbottabad, Pakistan — May 2, 2011');
  D.shot('killed osama bin laden', {
    set: 'abbottabad', in: 'whip', bed: 'nightHeli',
    enter: (c) => {
      const fl = []; const mm = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 8, 6) });
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mm); m.position.set(-21 + i * 4, i % 2 ? 5.5 : 2, 12.4); m.visible = false; c.set.addExtra(m); fl.push(m); }
      const L = new THREE.PointLight(0xfff0c0, 0, 30, 1.6); L.position.set(-15, 4, 14); c.set.addExtra(L); c.set.flashes = { fl, L };
    },
    update: (c) => {
      c.set.helis.forEach((h, i) => { h.position.set(-12 + i * 26, 20 + i * 3 + Math.sin(c.T * 1.3 + i) * 0.4, 6 + i * 6); h.rotation.set(0, -0.5 + i * 0.3, 0); });
      const { fl, L } = c.set.flashes; let on = 0;
      fl.forEach((m, i) => { const t = (c.lt * 7 + i * 1.7) % 6; m.visible = c.lt > 0.3 && t < 0.35; if (m.visible) on = 1; });
      L.intensity = on * 60;
    },
    cam: { p: [[30, 14, 60], [26, 13, 54]], l: [[-14, 5, 10], [-14, 5, 10]], fov: 34, shake: 0.5 },
    sfx: [[0.35, 'gunSuppressed', {}], [0.75, 'gunSuppressed', {}], [1.1, 'gunSuppressed', {}]],
  });
  D.shot('at his hideout in', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const m = meMap(1.1, { default: 0x4a4a52 }, { pakistan: 0x6a8a4a, afghanistan: 0x5a5a62 }); m.position.set(-8, 2, 0); c.set.add(m); c.set.map = m;
      const p = pin(0xff2a20, 0.45); c.set.add(p); c.set.pin = p; c.set.pinAt = m.userData.at('abbottabad', 1.0).add(m.position);
    },
    update: (c) => { const k = E.outBounce(clamp((c.lt - 0.2) / 0.6)); c.set.pin.position.copy(c.set.pinAt); c.set.pin.position.z += (1 - k) * 8; },
    cam: (c) => { const a = c.set.pinAt; return { p: [[a.x + 2, a.y - 10, 30], [a.x + 1, a.y - 8, 24]], l: [[a.x, a.y, 0], [a.x, a.y + 0.3, 0]], fov: 30, shake: 0.06 }; },
    overlay: (c, g) => {
      text(g, 'ABBOTTABAD', 1150, 470, { size: 54, weight: 800, color: '#fff', p: clamp((c.lt - 0.5) / 0.4) });
      text(g, 'PAKISTAN', 1150, 520, { size: 30, weight: 600, color: '#bdb6aa', tracking: 0.35, p: clamp((c.lt - 0.7) / 0.4) });
    },
    sfx: [[0.2, 'whoosh', {}], [0.55, 'pinDrop', {}]],
  });
  // ---- One World Trade Center ----
  D.shot('today one world trade', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'cityDay', mood: 'hope',
    enter: (c) => rebuilt(c, 'clear'),
    cam: { p: [[-22, 1.8, -116], [-28, 2.2, -121]], l: [[-110, 110, -175], [-110, 460, -175]], fov: 54, shake: 0.1, ease: E.ioCubic },
    post: { bloomStr: 0.9 },
    sfx: [[0.3, 'riseSwell', { dur: 2.5 }]],
  });
  D.shot('rises above the rebuilt', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'cityDay',
    enter: (c) => rebuilt(c, 'clear'),
    orbit: { c: [-60, 0, -40], r: [600, 540], a: [148, 168], h: [250, 225], ly: [170, 190], fov: 36, shake: 0.08 },
  });
  D.loc(D.peek('rises above the rebuilt') + 0.2, 2.3, 'New York — 2026');
  D.shot('its height is symbolic', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const k = 13 / 541;
      const fac = canvasTex(256, 1024, (g, w, h) => { g.fillStyle = '#8a8e94'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a5e64'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h); });
      const tm = new THREE.MeshStandardMaterial({ map: fac, roughness: 0.5, metalness: 0.4 });
      c.set.twins = [[-7.6, 0], [-4.4, 0.6]].map(([x, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(63.4 * k, 417 * k, 63.4 * k), tm); b.castShadow = true; b.position.set(x, -7.6 + 417 * k / 2, 1.5 + z); c.set.add(b); return b; });
      const one = makeOneWTC(); one.scale.setScalar(k); one.position.set(5.5, -7.6, 1.5); c.set.add(one); c.set.one = one;
      c.set.k = k;
    },
    update: (c) => {
      const kk = c.set.k, g1 = E.outCubic(clamp((c.lt - 0.1) / 0.8)), g2 = E.outCubic(clamp((c.lt - 0.6) / 1.2));
      c.set.twins.forEach((b) => { b.scale.y = Math.max(0.001, g1); b.position.y = -7.6 + 417 * kk * g1 / 2; });
      c.set.one.scale.set(kk, kk * Math.max(0.001, g2), kk);
    },
    cam: { p: [[0, 0, 44], [0, 0.3, 41]], l: [[0, -0.5, 0], [0, -0.3, 0]], fov: 30, shake: 0.03 },
    overlay: (c, g) => {
      const kk = c.set.k, g1 = E.outCubic(clamp((c.lt - 0.1) / 0.8)), g2 = E.outCubic(clamp((c.lt - 0.6) / 1.2));
      const [ax, ay] = proj(c, [-9.5, -7.6 + 417 * kk * g1, 1.5]);
      const [bx, by] = proj(c, [7.0, -7.6 + 541 * kk * g2, 1.5]);
      g.strokeStyle = 'rgba(21,21,21,0.5)'; g.lineWidth = 2; g.setLineDash([8, 8]);
      g.beginPath(); g.moveTo(ax - 120, ay); g.lineTo(ax + 300, ay); g.stroke();
      g.strokeStyle = 'rgba(200,16,46,0.8)'; g.beginPath(); g.moveTo(bx - 360, by); g.lineTo(bx + 120, by); g.stroke(); g.setLineDash([]);
      text(g, '1,368 FT', ax - 130, ay - 14, { size: 40, weight: 800, align: 'right', color: C.ink, p: clamp((c.lt - 0.6) / 0.4) });
      text(g, 'TWIN TOWERS', ax - 130, ay + 26, { size: 22, weight: 600, align: 'right', color: C.grey, tracking: 0.25, p: clamp((c.lt - 0.7) / 0.4) });
      const t1776 = D.S.words.find((w) => w.w === '1776').s;
      if (c.T >= t1776 - 0.15) counter(g, c.T - t1776 + 0.15, 0, 1776, bx + 140, by + 10, { size: 96, d: 1.2, align: 'left', color: C.red, fmt: (v) => fmtInt(v) + ' FT' });
      text(g, 'ONE WORLD TRADE CENTER', bx + 140, by + 56, { size: 22, weight: 600, align: 'left', color: C.grey, tracking: 0.25, p: clamp((c.lt - 1.6) / 0.4) });
    },
    sfx: [[0.1, 'riseSwell', { dur: 1.6 }]],
  });
  D.sfx(D.peek('1776'), 'impactSoft', {});
  D.shot('honoring the year the', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const d = card(9.6, 7.0, (g, w, h) => {
        g.fillStyle = '#e9dcbc'; g.fillRect(0, 0, w, h);
        const r = rng(4); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(110,80,40,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 3, 3); }
        const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,60,20,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a1e10'; g.textAlign = 'center';
        g.font = `italic 400 ${h * 0.05}px "Playfair Display", serif`; g.fillText('IN CONGRESS, July 4, 1776.', w / 2, h * 0.13);
        g.font = `700 ${h * 0.075}px "Playfair Display", serif`; g.fillText('The unanimous Declaration', w / 2, h * 0.26);
        g.font = `italic 400 ${h * 0.05}px "Playfair Display", serif`; g.fillText('of the thirteen united States of America', w / 2, h * 0.35);
        g.globalAlpha = 0.7; g.font = `italic 400 ${h * 0.026}px "Playfair Display", serif`;
        for (let i = 0; i < 14; i++) { let s = ''; for (let k = 0; k < 16; k++) s += ['when', 'in', 'the', 'course', 'of', 'human', 'events', 'it', 'becomes', 'necessary', 'for', 'one', 'people', 'to', 'dissolve'][Math.floor(r() * 15)] + ' '; g.fillText(s, w / 2, h * 0.45 + i * h * 0.034); }
        g.globalAlpha = 1;
      }, { ppu: 140 });
      d.position.set(4.5, -0.6, 1.4); d.rotation.set(-0.12, -0.25, 0.04); c.set.add(d); c.set.doc = d;
    },
    update: (c) => { const k = E.outCubic(clamp(c.lt / 0.9)); c.set.doc.position.x = lerp(20, 4.5, k); c.set.doc.rotation.z = lerp(-0.3, 0.04, k); },
    cam: { p: [[0, 0, 40], [0.5, 0, 37]], l: [[0, 0, 0], [0.8, 0, 0]], fov: 30, shake: 0.03 },
    overlay: (c, g) => {
      smearText(g, '1776', 130, 560, clamp((c.lt - 0.2) / 0.7), { size: 260, color: C.red, weight: 800 });
      text(g, 'Declaration of Independence', 140, 640, { size: 44, fam: 'serif', italic: true, weight: 400, color: C.ink, p: clamp((c.lt - 0.9) / 0.6) });
    },
    sfx: [[0.0, 'paperSlide', {}], [0.3, 'quill', {}]],
  });
  // ---- the memorial ----
  D.shot('nearby two enormous memorial', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'memorialWater', mood: 'grief',
    enter: (c) => { rebuilt(c, 'clear'); c.set.focus = [-19, 0, 65]; c.set.focusSize = 260; },
    cam: { p: [[60, 360, 160], [40, 330, 130]], l: [[-19, 0, 65], [-19, 0, 66]], fov: 34, roll: [8, 2], shake: 0.06 },
  });
  D.shot('the footprints of the', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'memorialWater',
    enter: (c) => { rebuilt(c, 'clear'); c.set.focus = [-19, 0, 65]; c.set.focusSize = 260; const gt = ghostTowers(); c.set.addExtra(gt); c.set.ghost = gt; },
    update: (c) => { const k = E.ioCubic(clamp((c.lt - 0.2) / 1.4)); c.set.ghost.children.forEach((t) => { t.scale.y = Math.max(0.001, k); }); c.set.ghost.userData.fm.opacity = 0.22 * k; c.set.ghost.userData.lm.opacity = 0.95 * k; },
    cam: { p: [[430, 120, 470], [415, 135, 455]], l: [[-19, 120, 65], [-19, 170, 65]], fov: 42, shake: 0.06 },
    sfx: [[0.2, 'ghostShimmer', {}]],
  });
  D.shot('water flows endlessly', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'memorialWater',
    enter: (c) => { rebuilt(c, 'clear'); c.set.focus = [0, 0, 0]; c.set.focusSize = 80; },
    cam: { p: [[-14, 2.3, 33.4], [-6, 2.2, 33.2]], l: [[4, -4.5, -30], [10, -4.5, -30]], fov: 34, shake: 0.06 },
    post: { dof: { focus: 60, aperture: 2, maxR: 5 } },
  });
  D.shot('and disappears into the', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'memorialWater',
    enter: (c) => { rebuilt(c, 'clear'); c.set.focus = [0, -8, 0]; c.set.focusSize = 50; },
    cam: { p: [[14, 9, 20], [10, 6, 15]], l: [[0, -11, 0], [0, -12, 0]], fov: 36, shake: 0.05 },
    post: { exposure: 0.95, vignette: 0.6 },
  });
  D.shot('edges inscribed in bronze', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'memorialWater', mood: 'grief',
    enter: (c) => {
      rebuilt(c, 'clear'); c.set.focus = [0, 1.7, 30.8]; c.set.focusSize = 12;
      const p = namesPanel(); p.position.set(0, 1.74, 30.8); c.set.addExtra(p);
      const r = whiteRose(); r.position.set(-0.35, 1.79, 30.92); r.rotation.y = 0.35; c.set.addExtra(r);
    },
    cam: { p: [[0.9, 2.35, 32.6], [0.55, 2.25, 32.3]], l: [[-0.3, 1.77, 30.9], [-0.35, 1.77, 30.9]], fov: 30, shake: 0.05 },
    post: { dof: { focus: 1.7, aperture: 8, maxR: 12 }, bloomStr: 0.6 },
  });
  D.shot('that clear september morning', {
    set: 'nyc', in: 'flash', inDur: 0.25, bed: 'morningBirds', mood: 'memory',
    enter: (c) => { c.set.storyOverride = 5; c.set.setTime('clear'); c.set.heroesOn = false; c.set.focus = [-20, 0, 60]; c.set.focusSize = 300; },
    cam: { p: [[70, 1.8, 110], [64, 2.2, 102]], l: [[-5, 240, 20], [-5, 300, 20]], fov: 46, shake: 0.06 },
    post: { temp: 0.22, bloomStr: 1.0, vignette: 0.55, saturation: 0.9, grain: 0.06 },
  });
  // ---- a generation ----
  D.shot('an entire generation has', {
    set: 'info:paper', in: 'whip', mood: 'reflect',
    enter: (c) => {
      const st = [[0.42, -11, '#e8a23a', 2001], [0.64, -4, '#3a8a5a', 2008], [0.86, 3.2, '#3a6ab8', 2016], [1.0, 10.4, '#c8102e', 2026]];
      c.set.gen = st.map(([s, x, col, yr], i) => { const p = new Person({ seed: 9100 + i, shirt: col, jacket: null }); p.root.scale.setScalar(s * 3.6); p.root.position.set(x, -8.4, 2.2); p.root.rotation.y = -0.2; c.set.add(p.root); return { p, x, yr }; });
    },
    update: (c) => c.set.gen.forEach(({ p }, i) => { p.pose('stand', c.T + i); const k = E.outBack(clamp((c.lt - 0.2 - i * 0.45) / 0.5)); p.root.position.y = lerp(-22, -8.4, k); }),
    cam: { p: [[0, 1, 44], [0, 0.5, 41]], l: [[0, -1, 0], [0, -1, 0]], fov: 30, shake: 0.03 },
    overlay: (c, g) => {
      c.set.gen.forEach(({ x, yr }, i) => { const [sx, sy] = proj(c, [x, -9.2, 2.2]); text(g, String(yr), sx, sy + 70, { size: 44, weight: 800, align: 'center', color: i === 3 ? C.red : C.ink, p: clamp((c.lt - 0.4 - i * 0.45) / 0.4) }); });
      headline(g, c.lt, 'a whole', 'GENERATION', { x: 96, y: 190, align: 'left', bigSize: 96, color: C.ink, smallColor: C.grey });
    },
    sfx: [[0.2, 'pop', {}], [0.65, 'pop', {}], [1.1, 'pop', {}], [1.55, 'pop', {}]],
  });
  D.shot("for today's 20 year", {
    set: 'rooms', in: 'whip', bed: 'classroom',
    enter: (c) => c.set.pod('classroom'),
    cam: D.pc({ p: [[1.7, 1.35, -1.3], [1.5, 1.3, -1.1]], l: [[0, 1.0, 0.35], [0, 1.0, 0.35]], fov: 38, shake: 0.08 }),
    post: { dof: { focus: 2.1, aperture: 4, maxR: 8 } },
  });
  D.shot('is a chapter in', {
    set: 'rooms', in: 'fade', inDur: 0.2, bed: 'classroom',
    enter: (c) => c.set.pod('classroom'),
    cam: D.pc({ p: [[0.3, 1.22, 0.66], [0.27, 1.17, 0.6]], l: [[-0.02, 0.765, 0.02], [-0.02, 0.765, 0.02]], fov: 34, shake: 0.05 }),
    post: { dof: { focus: 0.62, aperture: 5, maxR: 8 } },
    sfx: [[0.3, 'pageTurn', {}]],
  });
  D.shot('they never knew the', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const ph = card(6.2, 7.2, (g, w, h) => {
        g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
        const ix = w * 0.07, iy = w * 0.07, iw = w * 0.86, ih = h * 0.72;
        const sky = g.createLinearGradient(0, iy, 0, iy + ih); sky.addColorStop(0, '#5a9ad8'); sky.addColorStop(1, '#bcdcf2'); g.fillStyle = sky; g.fillRect(ix, iy, iw, ih);
        g.fillStyle = '#6a7a8a'; for (let i = 0; i < 26; i++) { const bh = ih * (0.12 + hash(i) * 0.22); g.fillRect(ix + i * iw / 26, iy + ih - bh, iw / 26 - 2, bh); }
        g.fillStyle = '#b8c0c8'; g.fillRect(ix + iw * 0.38, iy + ih * 0.12, iw * 0.11, ih * 0.88); g.fillRect(ix + iw * 0.53, iy + ih * 0.17, iw * 0.11, ih * 0.83);
        g.fillStyle = '#e8eef4'; g.fillRect(ix + iw * 0.43, iy + ih * 0.02, 3, ih * 0.1);
        g.fillStyle = '#3a5a7a'; g.fillRect(ix, iy + ih * 0.93, iw, ih * 0.07);
        g.fillStyle = '#333'; g.font = `italic 400 ${h * 0.05}px "Playfair Display", serif`; g.fillText('New York, summer 2001', ix, iy + ih + h * 0.1);
      }, { ppu: 160 });
      ph.position.set(5.2, 0, 1.6); ph.rotation.set(-0.06, -0.18, -0.08); c.set.add(ph); c.set.ph = ph;
      c.set.ph.material[4].transparent = true;
    },
    update: (c) => { const k = clamp((c.lt - 0.8) / 1.2); c.set.ph.material[4].color.setScalar(1 + k * 3); c.set.ph.rotation.z = -0.08 + c.lt * 0.02; },
    cam: { p: [[0, 0, 40], [0.4, 0, 37]], l: [[0, 0, 0], [0.6, 0, 0]], fov: 30, shake: 0.03 },
    overlay: (c, g) => headline(g, c.lt, 'they never knew', 'THE WORLD BEFORE', { x: 96, y: 560, align: 'left', bigSize: 92, color: C.ink, smallColor: C.grey }),
    sfx: [[0.6, 'fadeAir', { dur: 1.4 }]],
  });
  // ---- the new normal ----
  D.shot('long airport lines metal', {
    set: 'rooms', in: 'whip', bed: 'terminal', mood: 'tension',
    enter: (c) => c.set.pod('security:modern'),
    cam: D.pc({ p: [[-3.3, 1.7, -2.6], [-3.1, 1.65, -2.2]], l: [[-2.8, 1.3, 4], [-2.8, 1.3, 4]], fov: 40, shake: 0.12 }),
    post: { dof: { focus: 4.0, aperture: 3, maxR: 6 } },
    sfx: [[0.6, 'metalDetectorBeep', {}], [1.8, 'binSlide', {}]],
  });
  D.shot('global surveillance and', {
    set: 'globe', in: 'whip', bed: 'space',
    enter: (c) => {
      const s = c.set; s.setSun(-1, 0.1, -0.3); s.earthU.nightBoost.value = 1.6;
      const cities = ['nyc', 'london', 'paris', 'moscow', 'tokyo', 'beijing', 'delhi', 'sydney', 'rio', 'cairo', 'lagos', 'singapore', 'toronto', 'mexico', 'johannesburg', 'istanbul', 'seoul', 'mumbai', 'madrid', 'berlin', 'dubai'];
      const LL = { nyc: [-74, 40.7], london: [-0.12, 51.5], paris: [2.35, 48.85], moscow: [37.6, 55.75], tokyo: [139.7, 35.7], beijing: [116.4, 39.9], delhi: [77.2, 28.6], sydney: [151.2, -33.9], rio: [-43.2, -22.9], cairo: [31.2, 30], lagos: [3.4, 6.5], singapore: [103.8, 1.35], toronto: [-79.4, 43.7], mexico: [-99.1, 19.4], johannesburg: [28, -26.2], istanbul: [29, 41], seoul: [127, 37.6], mumbai: [72.9, 19.1], madrid: [-3.7, 40.4], berlin: [13.4, 52.5], dubai: [55.3, 25.2] };
      s.netArcs = []; const r = rng(42);
      for (let i = 0; i < 34; i++) { const a = cities[Math.floor(r() * cities.length)], b = cities[Math.floor(r() * cities.length)]; if (a === b) continue; s.netArcs.push([s.addArc(LL[a], LL[b], { color: 0x40c0ff, width: 0.22, intensity: 3.5 }), r() * 1.2]); }
      s.netMk = cities.map((k) => s.addMarker(LL[k], { color: 0x60d0ff, size: 0.7, intensity: 4 }));
    },
    update: (c) => {
      const s = c.set; s.earth.rotation.y = 0;
      s.netArcs.forEach(([a, d]) => a.set((c.lt - d * 0.6) / 0.7)); s.netMk.forEach((m, i) => m.set(c.T + i * 0.3, 1));
      const lon = lerp(-20, 10, c.lt / c.dur);
      setCam(c, s.viewFrom(lon, 25, 330), new THREE.Vector3(0, 0, 0), 34, 0, { shake: 0.03 });
    },
    overlay: (c, g) => text(g, 'GLOBAL SURVEILLANCE', W / 2, H - 120, { size: 44, weight: 800, align: 'center', color: '#bfe8ff', tracking: 0.4, p: clamp((c.lt - 0.2) / 0.5), shadow: 'rgba(40,160,255,0.6)', shadowBlur: 24 }),
    sfx: [[0, 'dataRain', { dur: 1.8 }]],
  });
  D.shot('and the constant threat', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const lv = [['SEVERE', '#c8102e'], ['HIGH', '#e8641c'], ['ELEVATED', '#e8c020'], ['GUARDED', '#2a6ad8'], ['LOW', '#2a9a4a']];
      const x = 760, y0 = 250, bh = 110;
      lv.forEach(([nm, col], i) => {
        const p = E.outCubic(clamp((c.lt - i * 0.08) / 0.4));
        g.globalAlpha = p; g.fillStyle = col; g.fillRect(x, y0 + i * (bh + 12), 400 * p, bh);
        font(g, 40, 800, 'sans'); g.fillStyle = '#fff'; g.fillText(nm, x + 30, y0 + i * (bh + 12) + 70);
      });
      g.globalAlpha = 1;
      const sel = 1 + (c.lt > 0.9 ? 0 : 1);
      const yy = y0 + lerp(4, sel, E.ioCubic(clamp((c.lt - 0.3) / 0.9))) * (bh + 12) + bh / 2;
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 20, yy); g.lineTo(x - 70, yy - 30); g.lineTo(x - 70, yy + 30); g.fill();
      text(g, 'THREAT LEVEL', x - 100, 200, { size: 30, weight: 800, color: '#bdb6aa', tracking: 0.35, p: clamp(c.lt / 0.4) });
    },
    sfx: [[0.3, 'alarmPulse', {}]],
  });
  D.shot('are simply normal to', {
    set: 'nyc', in: 'whip', bed: 'cityDay', mood: 'neutral',
    enter: (c) => {
      rebuilt(c, 'day'); c.set.focus = [168, 0, 100]; c.set.focusSize = 60;
      const pole = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.4, 10), MAT.chrome()); post.position.y = 2.7; pole.add(post);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), MAT.chrome()); arm.position.set(0, 5.2, -0.5); pole.add(arm);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.darkGlass()); dome.position.set(0, 5.1, -1.0); pole.add(dome);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), std(0xe8e8e4, { r: 0.4 })); cap.position.set(0, 5.16, -1.0); pole.add(cap);
      pole.position.set(179.5, 0.45, 112); c.set.addExtra(pole);
      const pc = makeCar('police'); pc.position.set(173.5, 0.3, 96); pc.rotation.y = Math.PI; c.set.addExtra(pc);
      const P = [];
      for (let i = 0; i < 7; i++) { const p = new Person({ seed: 9300 + i, female: i % 2 === 0, shirt: ['#e8e6e0', '#c86a5a', '#9fb6d6', '#efe4cf', '#3a6ab8', '#24262c', '#d8b25a'][i], jacket: i % 3 === 0 ? '#2a2e36' : null }); c.set.addExtra(p.root); P.push(p); }
      c.set.walkers = P;
    },
    update: (c) => c.set.walkers.forEach((p, i) => { const dir = i % 2 ? 1 : -1; const z = 112 + dir * (-14 + ((c.lt * 1.35 + i * 3.1) % 28)); p.root.position.set(180.5 + (i % 3) * 1.2, 0.45, z); p.root.rotation.y = dir > 0 ? 0 : Math.PI; p.pose(i === 2 ? 'phone' : 'walk', c.T + i); }),
    cam: { p: [[176.2, 1.6, 124], [176.0, 1.65, 121]], l: [[181, 2.6, 96], [181, 2.8, 96]], fov: 42, shake: 0.12 },
    post: { dof: { focus: 12, aperture: 2.5, maxR: 6 } },
  });
  // ---- Afghanistan: the withdrawal ----
  D.shot('the war in afghanistan ended', {
    set: 'kabul', in: 'fade', inDur: 0.3, bed: 'kabulChaos', mood: 'grief',
    update: (c) => c.set.crowd.update(c.T, 'walk', { speed: 1.4, wrap: 14 }),
    cam: { p: [[78, 34, 96], [66, 30, 84]], l: [[-12, 2, 12], [-12, 2, 12]], fov: 40, shake: 0.2 },
    sfx: [[0, 'crowdPanic', { dur: 2.4 }]],
  });
  D.loc(D.peek('the war in afghanistan ended') + 0.2, 2.2, 'Kabul — August 2021');
  D.shot('in a painful chaotic', {
    set: 'kabul', in: 'whip', bed: 'kabulChaos',
    update: (c) => {
      const s = c.set, f = new THREE.Vector3(Math.sin(0.4), 0, Math.cos(0.4)); s.c17.position.set(f.x * c.lt * 5, 4.2, f.z * c.lt * 5);
      s.crowd.update(c.T, 'walk', { speed: 2.6, wrap: 10 });
    },
    cam: (c) => { const p = c.set.c17.position; return { p: [[p.x + 62, 7, p.z + 70], [p.x + 58, 7.5, p.z + 66]], l: [[p.x, 6, p.z], [p.x, 6, p.z]], fov: 38, shake: 0.5 }; },
    sfx: [[0, 'jetRoarLow', { dur: 2.4 }], [0.3, 'crowdPanic', { dur: 2 }]],
  });
  D.shot('osama bin laden has', {
    set: 'info:dark', in: 'whip', mood: 'reflect',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      timeline(g, c.lt, 260, 1660, 640, [2011, 2014, 2017, 2020, 2023, 2026], { color: '#e8e2d6', major: [2011, 2026], d: 1.0, marker: [0, 1], mt0: 0.3, md: 2.0, mcolor: '#7a7670' });
      text(g, 'DEAD SINCE 2011', 960, 470, { size: 96, weight: 800, align: 'center', color: '#f4f1ea', p: clamp((c.lt - 0.1) / 0.5), blur: 14 });
      text(g, 'Osama bin Laden', 960, 540, { size: 40, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 0.5) / 0.5) });
    },
    sfx: [[0.3, 'tickRun', { dur: 1.8 }]],
  });
  D.shot('but the consequences of', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'memorialWater', mood: 'grief',
    enter: (c) => {
      rebuilt(c, 'golden'); c.set.focus = [0, 0, 32]; c.set.focusSize = 30;
      const P = [];
      for (let i = 0; i < 6; i++) { const p = new Person({ seed: 9400 + i, female: i % 2 === 1, jacket: ['#2a2e36', '#5a1c2a', '#24262c', '#3a3e48', '#4a4038', '#1c2230'][i] }); p.root.position.set(-7 + i * 2.6 + hash(i) * 0.8, 0.6, 33.2 + hash(i * 3) * 0.6); p.root.rotation.y = Math.PI + (hash(i * 5) - 0.5) * 0.4; c.set.addExtra(p.root); P.push(p); }
      c.set.visitors = P;
    },
    update: (c) => c.set.visitors.forEach((p, i) => { p.pose('stand', c.T + i); p.j.head.rotation.x = 0.25; if (i === 2) { p.j.shR.rotation.x = -0.9; p.j.elR.rotation.x = -0.3; } }),
    cam: { p: [[9, 1.7, 46], [7, 1.75, 43]], l: [[-25, 30, -90], [-30, 34, -90]], fov: 40, shake: 0.06 },
    post: { dof: { focus: 12, aperture: 2, maxR: 5 } },
  });
  // ---- the responders ----
  const gz = (c, time = 'day') => { c.set.setMode('rubble'); c.set.setTime(time); c.set.cityDust = 0.3; c.set.rubbleSmoke = 0.65; c.set.focus = [-20, 0, 65]; c.set.focusSize = 160; };
  D.shot('hundreds of rescue workers', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'groundZero', mood: 'grief',
    enter: (c) => gz(c, 'smoke'),
    update: (c) => { const H = c.set.rubble.H; c.set.rubble.workers.forEach((w, i) => { if (i > 5) return; const x = -38 + i * 3.4, z = 86 + (i % 2) * 2.4; w.root.position.set(x, H(x, z), z); w.root.rotation.y = Math.PI / 2 + (i % 3) * 0.4; }); },
    cam: (c) => { const y = c.set.rubble.H(-28, 100); return { p: [[-10, y + 9, 108], [-14, y + 8, 104]], l: [[-30, y, 87], [-30, y, 87]], fov: 40, shake: 0.2 }; },
    overlay: (c, g) => {
      const H = c.set.rubble.H, w = c.set.rubble.workers;
      [[0, 'FIREFIGHTERS', -70, -90], [4, 'RESCUE WORKERS', 70, -150], [2, 'POLICE', 40, -60]].forEach(([i, nm, dx, dy], k) => { const p = w[i].root.position; tag3(g, c, [p.x, p.y + 2.1, p.z], 0.5 + k * 0.35, nm, { dx, dy }); });
    },
    sfx: [[0, 'rubbleDig', { dur: 3.5 }]],
  });
  D.shot('breathe the toxic dust', {
    set: 'nyc', in: 'whip', bed: 'groundZero',
    enter: (c) => gz(c, 'smoke'),
    update: (c) => {
      const w = c.set.rubble.workers[3]; const y = c.set.rubble.H(-24, 70); w.root.position.set(-24, y, 70); w.root.rotation.y = 0.6; w.pose('stand', c.T); w.setExpr('sad');
      c.set.extra.push((bb, T) => dustCloud(bb, T, { t0: -20, count: 140, seed: 77, spawn: 20, speed: 0.6, drag: 0.2, size: [0.05, 0.4], growT: 3, alpha: 0.5, rise: 0.05, center: [-23.6, y + 1.6, 70.9], height: 0.6, color: [0.75, 0.72, 0.66], life: 12, jitter: 1.4 }));
    },
    cam: (c) => { const y = c.set.rubble.H(-24, 70); return { p: [[-23.5, y + 1.68, 71.0], [-23.6, y + 1.67, 70.9]], l: [[-24, y + 1.62, 70], [-24, y + 1.62, 70]], fov: 30, shake: 0.12 }; },
    post: { dof: { focus: 1.05, aperture: 6, maxR: 9 }, exposure: 1.15 },
    overlay: (c, g) => {
      [['ASBESTOS', 1290, 300], ['LEAD', 1420, 520], ['PULVERIZED GLASS', 1210, 760], ['BENZENE', 1500, 880]].forEach(([nm, x, y], i) => {
        const p = clamp((c.lt - 0.3 - i * 0.3) / 0.35); if (p <= 0) return;
        g.save(); g.globalAlpha = p; g.strokeStyle = '#ff4a3a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10 + (1 - p) * 30, 0, Math.PI * 2); g.stroke(); g.restore();
        text(g, nm, x + 26, y + 12, { size: 30, weight: 800, color: '#fff', tracking: 0.15, p, shadow: 'rgba(0,0,0,0.8)', shadowBlur: 16 });
      });
    },
    sfx: [[0.6, 'cough', {}], [0.3, 'dataBlip', {}], [0.6, 'dataBlip', {}], [0.9, 'dataBlip', {}], [1.2, 'dataBlip', {}]],
  });
  D.shot('have died or are', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const cols = 30, rows = 10, sx = 52, sy = 64, x0 = W / 2 - (cols - 1) * sx / 2, y0 = 300;
      for (let i = 0; i < cols * rows; i++) {
        const x = x0 + (i % cols) * sx, y = y0 + Math.floor(i / cols) * sy;
        const app = clamp((c.lt - i * 0.002) / 0.3);
        const gone = clamp((c.lt - 0.8 - hash(i * 13) * 1.8) / 0.3) * (hash(i * 7) < 0.55 ? 1 : 0);
        g.globalAlpha = app * (1 - gone * 0.75);
        g.fillStyle = gone > 0.5 ? '#7a2020' : '#e8e2d6';
        g.beginPath(); g.arc(x, y - 14, 7, 0, Math.PI * 2); g.fill(); g.fillRect(x - 7, y - 4, 14, 20);
      }
      g.globalAlpha = 1;
      text(g, 'DIED  •  STILL DYING', W / 2, 220, { size: 46, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.3, p: clamp((c.lt - 0.6) / 0.5) });
    },
    sfx: [[0.8, 'lowDrone', { dur: 2.6 }]],
  });
  D.shot('rare cancers and respiratory', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const cx = 1200, cy = 560, a = clamp(c.lt / 0.4);
      g.save(); g.globalAlpha = a; g.fillStyle = '#e8e2d6';
      g.fillRect(cx - 10, cy - 260, 20, 120); // trachea
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(cx, cy - 140); g.quadraticCurveTo(cx + s * 60, cy - 120, cx + s * 70, cy - 60); g.lineWidth = 14; g.strokeStyle = '#e8e2d6'; g.stroke();
        g.beginPath(); g.ellipse(cx + s * 150, cy + 20, 120, 210, s * -0.08, 0, Math.PI * 2); g.fillStyle = 'rgba(232,170,160,0.9)'; g.fill();
      }
      const r = rng(5);
      for (let i = 0; i < 160; i++) { const s = r() < 0.5 ? -1 : 1, an = r() * 6.28, rr = Math.sqrt(r()); const x = cx + s * 150 + Math.cos(an) * rr * 105, y = cy + 20 + Math.sin(an) * rr * 190; const p = clamp((c.lt - 0.3 - r() * 1.4) / 0.3); if (p <= 0) continue; g.fillStyle = `rgba(40,30,28,${0.85 * p})`; g.beginPath(); g.arc(x, y, 3 + r() * 9, 0, Math.PI * 2); g.fill(); }
      g.restore();
      text(g, 'RARE CANCERS', 160, 470, { size: 80, weight: 800, color: '#f4f1ea', p: clamp((c.lt - 0.1) / 0.5), blur: 12 });
      text(g, 'RESPIRATORY DISEASES', 160, 570, { size: 56, weight: 800, color: '#ff4a3a', p: clamp((c.lt - 0.9) / 0.5), blur: 12 });
    },
    sfx: [[0.2, 'heartbeat', { dur: 2 }]],
  });
  D.shot('their sacrifice did not', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'windSoft', mood: 'grief',
    enter: (c) => { gz(c, 'dusk'); c.set.rubbleSmoke = 0.4; c.set.focus = [-8, 0, 40]; c.set.focusSize = 40; },
    update: (c) => { const H = c.set.rubble.H, w = c.set.rubble.workers[0]; const x = -10.6, z = 41.6; w.root.position.set(x, H(x, z), z); w.root.rotation.y = Math.atan2(-8 - x, 40 - z) ; w.pose('salute', c.T); w.setExpr('sad'); },
    cam: (c) => { const H = c.set.rubble.H, y = Math.max(H(-4, 49), H(-5, 47)); return { p: [[-4, y + 0.9, 49], [-4.4, y + 1.0, 48.4]], l: [[-9.2, H(-9, 41) + 2.6, 40.8], [-9.2, H(-9, 41) + 2.8, 40.8]], fov: 40, shake: 0.08 }; },
    post: { dof: { focus: 4.8, aperture: 3, maxR: 6 } },
    sfx: [[0.4, 'flagFlap', { dur: 3 }]],
  });
  D.shot('it has stretched across', {
    set: 'info:dark', in: 'fade', inDur: 0.3, mood: 'reflect',
    enter: (c) => { c.set.cands = []; for (let i = 0; i < 26; i++) { const cd = candle(i); cd.position.set(-15 + i * 1.2, -5.4, 2.5 - (i % 2) * 0.5); c.set.add(cd); c.set.cands.push(cd); } },
    update: (c) => c.set.cands.forEach((cd, i) => { const on = clamp((c.lt - 0.2 - i * 0.09) / 0.2); cd.userData.fl.visible = on > 0; cd.userData.fl.scale.set(on, (2.4 + Math.sin(c.T * 13 + i) * 0.25) * on, on); }),
    cam: { p: [[-14, -3.4, 9], [6, -3.2, 8.4]], l: [[-6, -4.4, 1], [14, -4.4, 1]], fov: 36, shake: 0.04, ease: E.ioSine },
    post: { bloomStr: 1.0, dof: { focus: 8, aperture: 4, maxR: 8 } },
    overlay: (c, g) => {
      [[0, 2001], [10, 2011], [20, 2021], [25, 2026]].forEach(([i, yr]) => { const cd = c.set.cands[i]; const [x, y, z] = proj(c, [cd.position.x, cd.position.y + cd.userData.h + 1.0, cd.position.z]); if (z > 1) return; text(g, String(yr), x, y, { size: 40, weight: 800, align: 'center', color: '#f4f1ea', p: clamp((c.lt - 0.3 - i * 0.09) / 0.3), shadow: 'rgba(0,0,0,0.7)', shadowBlur: 16 }); });
      text(g, 'DECADES', W / 2, 180, { size: 64, weight: 300, align: 'center', color: '#f4f1ea', tracking: 0.6, p: clamp((c.lt - 0.6) / 0.6), blur: 14 });
    },
  });
  // ---- before / after ----
  D.shot('that morning in 2001', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'harbor', mood: 'memory',
    enter: (c) => { c.set.storyOverride = 5; c.set.setTime('clear'); c.set.focus = [-200, 0, 600]; c.set.focusSize = 1600; },
    cam: { p: [[-420, 40, 2100], [-405, 42, 2060]], l: [[-40, 220, 60], [-40, 222, 60]], fov: 30, shake: 0.06 },
    post: { temp: 0.15, saturation: 0.95, grain: 0.05 },
    overlay: (c, g) => text(g, 'BEFORE', 96, H - 110, { size: 64, weight: 300, color: '#fff', tracking: 0.5, p: clamp((c.lt - 0.2) / 0.5), shadow: 'rgba(0,0,0,0.5)', shadowBlur: 20 }),
  });
  D.shot('divided the world into', {
    set: 'nyc', in: 'flash', inDur: 0.25, bed: 'harbor',
    enter: (c) => { rebuilt(c, 'clear'); c.set.focus = [-200, 0, 600]; c.set.focusSize = 1600; },
    cam: { p: [[-405, 42, 2060], [-390, 44, 2020]], l: [[-40, 222, 60], [-40, 224, 60]], fov: 30, shake: 0.06 },
    post: { temp: 0.0, saturation: 1.0 },
    overlay: (c, g) => {
      const p = E.ioCubic(clamp((c.lt - 0.05) / 0.5));
      g.save(); g.strokeStyle = '#ff3b3b'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, H / 2 - H / 2 * p); g.lineTo(W / 2, H / 2 + H / 2 * p); g.stroke(); g.restore();
      text(g, 'AFTER', W - 96, H - 110, { size: 64, weight: 300, align: 'right', color: '#fff', tracking: 0.5, p: clamp((c.lt - 0.4) / 0.5), shadow: 'rgba(0,0,0,0.5)', shadowBlur: 20 });
    },
    sfx: [[0, 'impactSoft', {}]],
  });
  // ---- the world that emerged from the ashes ----
  D.shot('we are still living', {
    set: 'nyc', in: 'fade', inDur: 0.5, bed: 'cityDistant', mood: 'reflect',
    enter: (c) => { rebuilt(c, 'golden'); c.set.focus = [-60, 0, -60]; c.set.focusSize = 600; },
    update: (c) => {
      c.set.extra.push((bb, T, cam) => {
        const f = new THREE.Vector3(); cam.getWorldDirection(f); const rgt = new THREE.Vector3().crossVectors(f, cam.up).normalize(); const up = new THREE.Vector3().crossVectors(rgt, f);
        for (let i = 0; i < 140; i++) {
          const p = bb.push(); if (!p) return;
          const d = 4 + hash(i * 3) * 30, sx = (hash(i * 5) - 0.5) * d * 1.4, sy = ((hash(i * 7) * 2 - 1) * d * 0.6 - T * (0.3 + hash(i) * 0.4) % (d * 1.2) + d * 0.6) % (d * 1.2);
          const w = Math.sin(T * 0.7 + i) * 0.4;
          p.x = cam.position.x + f.x * d + rgt.x * (sx + w) + up.x * sy; p.y = cam.position.y + f.y * d + rgt.y * (sx + w) + up.y * sy; p.z = cam.position.z + f.z * d + rgt.z * (sx + w) + up.z * sy;
          p.s = 0.04 + hash(i * 11) * 0.08; p.r = i + T; p.a = 0.7; p.cr = p.cg = p.cb = 0.42; p.er = p.eg = p.eb = 0; p.f = i % 4; p.lit = 1;
        }
      });
    },
    cam: { p: [[420, 140, 520], [360, 190, 440]], l: [[-110, 260, -175], [-110, 300, -175]], fov: 34, shake: 0.06, ease: E.ioCubic },
    post: { bloomStr: 0.9, temp: 0.2 },
  });
  D.shot('and this story reminds', {
    set: 'nyc', in: 'fade', inDur: 0.6, bed: 'nightHarbor', mood: 'end',
    enter: (c) => { rebuilt(c, 'night'); c.set.tribute.visible = true; c.set.focus = [0, 0, 300]; c.set.focusSize = 1200; },
    update: (c) => { c.set.tribute.userData.U.uI.value = 1 - clamp((c.lt - 3.2) / 1.2) * 0.6; },
    cam: { p: [[300, 60, 1500], [380, 120, 2100]], l: [[-40, 380, 0], [-40, 520, 0]], fov: 40, shake: 0.05, ease: E.ioSine },
    post: (c) => ({ bloomStr: 1.2, fade: clamp((c.lt - (c.dur - 1.2)) / 1.2) }),
  });
  D.shot(1059.2, {
    name: 'end title', no3D: true, in: 'fade', inDur: 0.6,
    overlay: (c, g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const a = Math.min(clamp((c.lt - 0.2) / 1.0), clamp((c.dur - c.lt) / 0.8));
      text(g, 'SEPTEMBER 11, 2001', W / 2, H / 2 - 10, { size: 72, weight: 300, align: 'center', color: '#f4f1ea', tracking: 0.35, p: clamp((c.lt - 0.2) / 1.0), alpha: a, blur: 16 });
      g.globalAlpha = a * 0.9; g.fillStyle = '#d8282f'; const rw = 300 * E.ioCubic(clamp((c.lt - 0.6) / 0.8)); g.fillRect(W / 2 - rw / 2, H / 2 + 30, rw, 2); g.globalAlpha = 1;
      text(g, 'IN MEMORY OF THE 2,977', W / 2, H / 2 + 92, { size: 30, weight: 500, align: 'center', color: '#b9b4aa', tracking: 0.42, p: clamp((c.lt - 1.0) / 0.9), alpha: a });
    },
    sfx: [[0.1, 'endTone', {}]],
  });
}
