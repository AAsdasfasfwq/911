// 14:31 - 15:39  One year after: the anniversary in the excavated pit, the reading of the
// names, faded flyers, the Tribute in Light, and Washington turning toward Iraq.
import * as THREE from 'three';
import { setCam } from '../core/camera.js';
import { E, clamp, lerp, hash, rng } from '../core/util.js';
import { C, headline, counter, smearText, meMap, card, docDraw } from './infokit.js';
import { text, font, W, H } from '../core/overlay.js';
import { std, M, MAT } from '../assets/materials.js';
import { Person } from '../assets/people.js';
import { makeTree, makeFlag } from '../assets/props.js';

const pitOn = (c, time = 'clear') => { c.set.setMode('pit'); c.set.setTime(time); if (time === 'clear') c.set.sun.userData.dir.set(0.32, 0.86, 0.4).normalize(); c.set.focus = [-12, -21, 70]; c.set.focusSize = 280; };

// clean editorial label with a leader line (used over 3D shots)
function tag(g, lt, t0, x, y, dx, dy, big, small) {
  const p = clamp((lt - t0) / 0.5);
  if (p <= 0) return;
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
  const q = E.outCubic(p);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * q, y + dy * q); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
  g.restore();
  text(g, big, x + dx + (dx < 0 ? -14 : 14), y + dy - 6, { size: 54, weight: 800, align: dx < 0 ? 'right' : 'left', color: '#fff', p: clamp((lt - t0 - 0.2) / 0.5), blur: 10, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 24 });
  text(g, small, x + dx + (dx < 0 ? -14 : 14), y + dy + 34, { size: 26, weight: 500, align: dx < 0 ? 'right' : 'left', color: 'rgba(255,255,255,0.8)', tracking: 0.2, p: clamp((lt - t0 - 0.35) / 0.5), shadow: 'rgba(0,0,0,0.6)', shadowBlur: 18 });
}

// soft rain streaks on the overlay (interior close-ups have no particle layer)
function rainOverlay(g, T, a = 1, n = 140) {
  g.save();
  g.strokeStyle = 'rgba(210,225,240,0.22)'; g.lineWidth = 1.6; g.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const sp = 900 + hash(i * 3) * 700, len = 40 + hash(i * 5) * 60;
    const x = (hash(i * 7) * (W + 200) - 100 + T * 60) % (W + 200) - 100;
    const y = ((hash(i * 11) * (H + 300) + T * sp) % (H + 300)) - 150;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 0.12, y + len); g.stroke();
  }
  g.restore();
}

function mourner(o, x, z, ry) {
  const p = new Person({ dust: false, ...o });
  p.root.position.set(x, -21, z); p.root.rotation.y = ry;
  return p;
}

export default function yearAfter(D, film) {
  // ---- the first anniversary: the pit ----
  D.shot('on september 11th 2002', {
    set: 'nyc', in: 'fade', inDur: 0.5, bed: 'windHigh', mood: 'grief',
    enter: (c) => pitOn(c),
    cam: { p: [[300, 170, 470], [190, 115, 340]], l: [[-12, -12, 70], [-12, -16, 72]], fov: 34, shake: 0.12, ease: E.ioCubic },
    sfx: [[0.6, 'bellToll', {}]],
  });
  D.loc(D.peek('on september 11th 2002') + 0.3, 4.2, 'Ground Zero — September 11, 2002');
  D.shot('ceremony takes place', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'windHigh',
    enter: (c) => { pitOn(c); c.set.focusSize = 120; c.set.focus = [-10, -21, 80]; },
    cam: { p: [[30, -4, 150], [18, -8, 136]], l: [[-10, -17, 52], [-10, -17.5, 52]], fov: 30, shake: 0.12 },
    post: { dof: { focus: 95, aperture: 2.5, maxR: 6 } },
    sfx: [[0.2, 'flagFlap', { dur: 2.5 }]],
  });
  D.shot('ground zero is now', {
    set: 'nyc', in: 'whip', bed: 'windHigh',
    enter: (c) => pitOn(c),
    orbit: { c: [-12, -21, 62], r: [210, 190], a: [15, 42], h: [330, 300], fov: 38, shake: 0.1 },
    overlay: (c, g) => {
      tag(g, c.lt, 0.5, 760, 520, -180, -150, '16 ACRES', 'OF EMPTY GROUND');
      tag(g, c.lt, 1.1, 1180, 610, 200, 140, '70 FT', 'DEEP');
    },
    sfx: [[0.4, 'dataBlip', {}], [1.0, 'dataBlip', {}]],
  });
  // 1.8 million tons of debris: blocks raining into a pile, counter
  D.shot('cleared of millions of tons', {
    set: 'info:dark', in: 'whip', mood: 'grief',
    enter: (c) => {
      const n = 900, geo = new THREE.BoxGeometry(0.42, 0.3, 0.36);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true;
      const r = rng(31), cols = [0x8a8580, 0x6e6a66, 0x9a8a78, 0x5a5652, 0x7a5a48, 0xa8a49c];
      const data = [];
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.7);
        const h = (1 - rr) * 5.2;
        data.push({ x: Math.cos(a) * rr * 9, z: Math.sin(a) * rr * 2.2, y: -7.2 + h * r(), t: i / n * 2.0 + r() * 0.3, rx: r() * 6, ry: r() * 6 });
        im.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      }
      c.set.add(im); c.set.pile = { im, data };
    },
    update: (c) => {
      const { im, data } = c.set.pile; const d = new THREE.Object3D();
      data.forEach((b, i) => {
        const q = clamp((c.lt - b.t) / 0.45);
        const y = q < 1 ? lerp(12, b.y, q * q) : b.y;
        d.position.set(b.x, y, 2 + b.z); d.rotation.set(b.rx + (1 - q) * 3, b.ry, 0); d.scale.setScalar(q > 0 ? 1 : 0.0001); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    },
    cam: { p: [[0, 1, 42], [0, 0.5, 38]], l: [[0, -1.5, 0], [0, -2, 0]], fov: 30, shake: 0.06 },
    overlay: (c, g) => {
      counter(g, c.lt, 0, 1800000, W / 2, 300, { size: 150, d: 2.4, color: '#f4f1ea', suffix: '' });
      text(g, 'TONS OF DEBRIS REMOVED', W / 2, 380, { size: 40, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.3, p: clamp((c.lt - 0.5) / 0.5) });
    },
    sfx: [[0.0, 'rubbleSlide', { dur: 3 }]],
  });
  // ---- the reading of the names ----
  D.shot('the names of all', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'windSoft', mood: 'grief',
    enter: (c) => {
      pitOn(c); c.set.focus = [-10, -21, 60]; c.set.focusSize = 60;
      const mic = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6), MAT.chrome()); stem.position.y = 0.17; stem.rotation.x = -0.5; mic.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), MAT.black()); head.scale.set(1, 1, 1.6); head.position.set(0, 0.32, -0.09); mic.add(head);
      mic.position.set(-10, -18.45, 50.62); c.set.addExtra(mic);
    },
    update: (c) => { c.set.pit.reader.setExpr('sad'); },
    cam: { p: [[-8.55, -18.25, 52.3], [-8.65, -18.2, 52.15]], l: [[-10.1, -18.15, 50.0], [-10.1, -18.12, 50.0]], fov: 32, shake: 0.08 },
    post: { dof: { focus: 2.75, aperture: 6, maxR: 10 } },
    sfx: [[0.1, 'micThump', {}]],
  });
  D.shot('2977', {
    set: 'info:dark', in: 'fade', inDur: 0.2,
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const r = rng(9);
      g.save();
      for (let col = 0; col < 7; col++) {
        const x = 150 + col * 250, speed = 40 + col % 3 * 8;
        for (let i = 0; i < 40; i++) {
          const y = ((i * 34 + 1200 - c.lt * speed - col * 13) % 1360) - 140;
          const len = 110 + r() * 110, fn = 50 + r() * 60;
          const fade = Math.min(clamp((y - 40) / 220), clamp((1040 - y) / 220));
          const lit = Math.abs(y - 540) < 17 && col === 3;
          g.globalAlpha = 0.16 * fade * clamp(c.lt / 0.6);
          g.fillStyle = '#e8e2d6'; g.fillRect(x, y, fn, 9); g.fillRect(x + fn + 10, y, len, 9);
        }
      }
      g.restore();
      // dark band behind the number
      const gr = g.createLinearGradient(0, 380, 0, 700); gr.addColorStop(0, 'rgba(18,18,21,0)'); gr.addColorStop(0.3, 'rgba(18,18,21,0.92)'); gr.addColorStop(0.7, 'rgba(18,18,21,0.92)'); gr.addColorStop(1, 'rgba(18,18,21,0)');
      g.fillStyle = gr; g.fillRect(0, 380, W, 320);
      counter(g, c.lt, 0, 2977, W / 2, 600, { size: 230, d: 1.8, color: '#f4f1ea' });
      text(g, 'NAMES  READ  ALOUD', W / 2, 670, { size: 36, weight: 700, align: 'center', color: '#c9a45a', tracking: 0.4, p: clamp((c.lt - 0.9) / 0.5) });
    },
    sfx: [[0.0, 'softHit', {}], [0.2, 'tickRun', { dur: 1.8 }]],
  });
  // the reading lasts for hours: time-lapse, shadows sweep across the pit
  D.shot('the reading lasts for hours', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'windSoft',
    enter: (c) => pitOn(c),
    update: (c) => { const k = clamp(c.lt / c.dur); const a = lerp(-0.9, 1.1, k); c.set.sun.userData.dir.set(Math.cos(a) * 0.8, lerp(0.35, 0.62, Math.sin(k * Math.PI)), Math.sin(a) * 0.6).normalize(); },
    cam: { p: [[150, 60, 290], [146, 58, 284]], l: [[-12, -21, 70], [-12, -21, 70]], fov: 30, shake: 0 },
    overlay: (c, g) => {
      const cx = 1660, cy = 200, R = 70, a = clamp(c.lt / 0.3);
      g.save(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; g.fillStyle = '#fff'; g.fillRect(cx + Math.sin(q) * (R - 12) - 2, cy - Math.cos(q) * (R - 12) - 2, 4, 4); }
      const hm = (8 + 46 / 60) + c.lt * 2.2, mA = (hm % 1) * Math.PI * 2, hA = (hm % 12) / 12 * Math.PI * 2;
      g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(hA) * R * 0.5, cy - Math.cos(hA) * R * 0.5); g.stroke();
      g.lineWidth = 3.5; g.strokeStyle = '#ff4a3a'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(mA) * R * 0.8, cy - Math.cos(mA) * R * 0.8); g.stroke();
      g.restore();
      text(g, 'HOURS', cx, cy + R + 52, { size: 34, weight: 800, align: 'center', color: '#fff', tracking: 0.35, p: a, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 18 });
    },
    sfx: [[0, 'clockFast', { dur: 2 }]],
  });
  // the silence: mourners with bowed heads
  D.shot('apart from the names', {
    set: 'nyc', in: 'fade', inDur: 0.35, bed: 'windSoft', mood: 'grief',
    enter: (c) => {
      pitOn(c); c.set.focus = [-8, -21, 60]; c.set.focusSize = 40;
      const P = [
        mourner({ seed: 7101, female: true, jacket: '#1c2230', hair: 'long', hairColor: '#3a2a1e', expr: 'sad' }, -9.2, 60.2, Math.PI + 0.08),
        mourner({ seed: 7102, jacket: '#24262c', shirt: '#f2f2f0', expr: 'sad', hairColor: '#5a5a58' }, -7.9, 60.6, Math.PI - 0.1),
        mourner({ seed: 7103, headwear: 'helmet', jacket: '#1a1a1a', pants: '#1a1a1a', stripes: true, expr: 'sad' }, -10.6, 61.0, Math.PI + 0.15),
        mourner({ seed: 7104, female: true, jacket: '#5a1c2a', expr: 'sad' }, -6.5, 61.6, Math.PI),
      ];
      for (const p of P) c.set.addExtra(p.root);
      const rose = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 5), std(0x2a5a22, { r: 0.7 })); st.position.y = -0.2; rose.add(st);
      const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 1), std(0xf4f2ee, { r: 0.6 })); bud.scale.set(1, 1.3, 1); rose.add(bud);
      c.set.addExtra(rose); c.set.mourners = P; c.set.rose = rose;
    },
    update: (c) => {
      c.set.mourners.forEach((p, i) => { p.pose('stand', c.T + i); p.j.head.rotation.x = 0.32 + Math.sin(c.T * 0.6 + i) * 0.02; });
      const p0 = c.set.mourners[0]; p0.j.shL.rotation.x = p0.j.shR.rotation.x = -0.45; p0.j.elL.rotation.x = p0.j.elR.rotation.x = -1.05;
      c.set.rose.position.copy(D.local(p0.root, [0, 1.02, 0.24])); c.set.rose.rotation.set(0.5, 0, 0.2);
    },
    cam: { p: [[-8.4, -19.55, 57.4], [-8.6, -19.5, 57.7]], l: [[-8.6, -19.45, 60.6], [-8.6, -19.45, 60.6]], fov: 36, shake: 0.08 },
    post: { dof: { focus: 3.0, aperture: 6, maxR: 10 }, saturation: 0.8 },
    sfx: [[0.3, 'bellToll', { gain: 0.6 }]],
  });
  // ---- the faded flyers ----
  D.shot('the missing person flyers', {
    set: 'rooms', in: 'fade', inDur: 0.4, bed: 'cityDistant', mood: 'grief',
    enter: (c) => c.set.pod('flyers:faded'),
    cam: D.pc({ p: [[-5.2, 1.55, 2.3], [-1.6, 1.7, 1.8]], l: [[-3.6, 1.6, 0], [0.0, 1.7, 0]], fov: 40, shake: 0.1 }),
    post: { saturation: 0.65, temp: -0.12, dof: { focus: 2.1, aperture: 3, maxR: 6 } },
  });
  D.shot('soaked through in the rain', {
    set: 'rooms', in: 'whip', bed: 'rainSoft',
    enter: (c) => c.set.pod('flyers:faded'),
    cam: D.pc({ p: [[0.55, 1.62, 0.95], [0.5, 1.6, 0.85]], l: [[0.2, 1.55, 0], [0.2, 1.55, 0]], fov: 32, shake: 0.08 }),
    post: { saturation: 0.55, temp: -0.25, exposure: 0.92, dof: { focus: 0.9, aperture: 4, maxR: 8 } },
    overlay: (c, g) => rainOverlay(g, c.T, 1),
    sfx: [[0, 'rainHeavy', { dur: 2 }]],
  });
  D.shot('and been taken down', {
    set: 'rooms', in: 'fade', inDur: 0.15, bed: 'rainSoft',
    enter: (c) => {
      const P = c.set.pod('flyers:faded');
      let best = null, bd = 1e9;
      for (const [f, pos] of P.flyers) { if (!f.visible) continue; const d = Math.hypot(pos.x - 0.2, pos.y - 1.6); if (d < bd) { bd = d; best = [f, pos.clone()]; } }
      P.peel = best;
    },
    update: (c) => {
      const [f, pos] = c.set.active.peel;
      const k = clamp((c.lt - 0.15) / 0.9);
      f.position.set(pos.x + k * 0.1, pos.y - k * k * 1.6, pos.z + k * 0.35);
      f.rotation.set(-k * 1.2, k * 0.6, k * 0.9);
    },
    cam: D.pc({ p: [[0.75, 1.3, 1.5], [0.72, 1.2, 1.45]], l: [[0.25, 1.25, 0], [0.25, 1.05, 0]], fov: 38, shake: 0.08 }),
    post: { saturation: 0.55, temp: -0.25, exposure: 0.92 },
    overlay: (c, g) => rainOverlay(g, c.T, 0.7),
    sfx: [[0.15, 'paperTear', {}]],
  });
  D.shot('hope has given way', {
    set: 'rooms', in: 'fade', inDur: 0.4, bed: 'candleRoom', mood: 'hope',
    enter: (c) => c.set.pod('flyers'),
    cam: D.pc({ p: [[-1.6, 0.42, 2.1], [-0.7, 0.36, 1.75]], l: [[0.0, 0.22, 0.6], [0.4, 0.24, 0.6]], fov: 34, shake: 0.06 }),
    post: { dof: { focus: 1.45, aperture: 7, maxR: 12 }, bloomStr: 1.0, temp: 0.12 },
  });
  // ---- Tribute in Light ----
  const tribute = (c, time = 'night') => {
    c.set.setMode('pit'); c.set.setTime(time); c.set.tribute.visible = true; c.set.trafficOn = true;
    c.set.tribute.children.forEach((m) => { if (m.geometry?.type === 'BoxGeometry') m.position.y = -20.2; });
    c.set.focus = [0, 0, 300]; c.set.focusSize = 1200;
  };
  D.shot('two powerful beams rise', {
    set: 'nyc', in: 'fade', inDur: 0.5, bed: 'nightHarbor', mood: 'awe',
    enter: (c) => tribute(c),
    update: (c) => { const k = E.outCubic(clamp((c.lt - 0.9) / 2.2)); c.set.tribute.userData.U.uRise.value = lerp(-50, 4200, k); },
    cam: { p: [[420, 25, 2350], [400, 32, 2240]], l: [[-20, 420, 60], [-20, 560, 60]], fov: 40, shake: 0.08 },
    post: { bloomStr: 1.2 },
    sfx: [[0.9, 'beamOn', {}]],
  });
  D.shot('the tribute in', {
    set: 'nyc', in: 'fade', inDur: 0.2, bed: 'nightHarbor',
    enter: (c) => tribute(c),
    cam: { p: [[95, 3, 230], [92, 3.4, 224]], l: [[-18, 500, 62], [-18, 560, 62]], fov: 52, shake: 0.1 },
    post: { bloomStr: 1.3 },
    overlay: (c, g) => {
      text(g, 'TRIBUTE IN LIGHT', W / 2, H - 150, { size: 58, weight: 300, align: 'center', color: '#e8f0ff', tracking: 0.5, p: clamp((c.lt - 0.15) / 0.7), blur: 16, shadow: 'rgba(120,170,255,0.6)', shadowBlur: 30 });
    },
  });
  D.shot('traces the outlines of the', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'nightHarbor',
    enter: (c) => tribute(c),
    update: (c) => { c.set.tribute.userData.ghost.opacity = 0.55 * E.ioSine(clamp((c.lt - 0.5) / 1.4)); },
    orbit: { c: [-19, 160, 65], r: [760, 720], a: [196, 222], h: [40, 90], ly: [60, 90], fov: 36, shake: 0.08 },
    post: { bloomStr: 1.3 },
    sfx: [[0.5, 'ghostShimmer', {}]],
  });
  D.shot('they pierce the darkness', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'nightHarbor', mood: 'grief',
    enter: (c) => { tribute(c); c.set.tribute.userData.ghost.opacity = 0.4; },
    update: (c) => { c.set.tribute.userData.ghost.opacity = 0.4 * (1 - clamp((c.lt - 1.5) / 1.5)); },
    cam: { p: [[1150, 40, 560], [1100, 70, 520]], l: [[-19, 260, 65], [-19, 1100, 65]], fov: 44, shake: 0.08, ease: E.ioCubic },
    post: { bloomStr: 1.3 },
  });
  // ---- the world: tensions rise ----
  D.shot('meanwhile tensions around', {
    set: 'globe', in: 'whip', bed: 'space', mood: 'tension',
    enter: (c) => {
      const s = c.set; s.setSun(0.3, 0.3, 1);
      const pts = [[69.2, 34.5], [65.7, 31.6], [44.4, 33.3], [51.4, 35.7], [73.0, 33.7], [36.3, 33.5], [45.0, 15.4], [32.5, 15.6], [-77.0, 38.9], [-74.0, 40.7]];
      s.mk = pts.map((p, i) => s.addMarker(p, { color: i >= 8 ? 0xffc040 : 0xff3020, size: 0.9, intensity: 5 }));
      s.ar = [[[-77.0, 38.9], [69.2, 34.5]], [[-77.0, 38.9], [44.4, 33.3]], [[-74, 40.7], [65.7, 31.6]]].map(([a, b]) => s.addArc(a, b, { color: 0xff5030, width: 0.3, intensity: 4 }));
    },
    update: (c) => {
      const s = c.set; s.earth.rotation.y = 0;
      s.mk.forEach((m, i) => m.set(c.T + i * 0.37, clamp((c.lt - 0.2 - i * 0.18) / 0.3)));
      s.ar.forEach((a, i) => a.set((c.lt - 0.6 - i * 0.4) / 1.6));
      const lon = lerp(-30, 52, E.ioCubic(clamp(c.lt / c.dur))), lat = lerp(38, 30, clamp(c.lt / c.dur));
      setCam(c, s.viewFrom(lon, lat, 230), new THREE.Vector3(0, 0, 0), 34, 0, { shake: 0.05 });
    },
    sfx: [[0.3, 'tensionRise', { dur: 3.5 }], [0.5, 'dataBlip', {}], [0.9, 'dataBlip', {}]],
  });
  D.shot('american troops occupy', {
    set: 'afghan:outpost', in: 'whip', bed: 'windMountain', mood: 'war',
    enter: (c) => { c.set.focus = [0, 0, 40]; c.set.focusSize = 80; },
    cam: (c) => { const H = c.set.H; return { p: [[-4, H(-4, 31) + 1.2, 31], [-3.6, H(-3.6, 30) + 1.25, 30]], l: [[1, H(1, 52) + 1.5, 52], [1, H(1, 52) + 1.5, 52]], fov: 36, shake: 0.35 }; },
    sfx: [[0.1, 'bootsGravel', { dur: 2.6 }], [0.4, 'radioChatter', {}]],
  });
  D.shot('bin laden is in hiding', {
    set: 'afghan:dusk', in: 'glitch', bed: 'windMountain', mood: 'dark',
    enter: (c) => { c.set.focus = [300, 0, -300]; c.set.focusSize = 600; },
    cam: (c) => { const H = c.set.H; return { p: [[-60, H(-60, 420) + 40, 420], [-55, H(-55, 420) + 40, 420]], l: [[520, 420, -900], [700, 420, -800]], fov: 16, shake: 0.3 }; },
    post: { saturation: 0.75, grain: 0.08 },
    overlay: (c, g) => {
      const a = clamp(c.lt / 0.2);
      // a reticle sweeping the ridgelines, never locking on
      const rx = 960 + Math.sin(c.lt * 2.1) * 420 + Math.sin(c.lt * 5.3) * 40, ry = 520 + Math.sin(c.lt * 1.4 + 1) * 160;
      g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5;
      g.strokeRect(rx - 90, ry - 70, 180, 140);
      g.beginPath(); g.moveTo(rx - 130, ry); g.lineTo(rx - 100, ry); g.moveTo(rx + 100, ry); g.lineTo(rx + 130, ry); g.moveTo(rx, ry - 110); g.lineTo(rx, ry - 80); g.moveTo(rx, ry + 80); g.lineTo(rx, ry + 110); g.stroke();
      g.restore();
      text(g, 'TARGET: UBL', 96, 120, { size: 30, weight: 700, fam: 'mono', color: '#fff', p: clamp(c.lt / 0.5), alpha: a });
      text(g, 'LOCATION: UNKNOWN', 96, 162, { size: 30, weight: 700, fam: 'mono', color: '#ff4a3a', p: clamp((c.lt - 0.3) / 0.5), alpha: a });
      text(g, 'SEARCHING' + '...'.slice(0, 1 + Math.floor(c.T * 3) % 3), rx - 90, ry + 100, { size: 22, weight: 700, fam: 'mono', color: '#fff', alpha: a });
      if (Math.floor(c.T * 2) % 2 === 0) { g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(1800, 110, 12, 0, Math.PI * 2); g.fill(); }
    },
    sfx: [[0, 'glitch', {}], [0.2, 'surveillanceHum', { dur: 1.6 }]],
  });
  // ---- Washington turns toward Iraq ----
  D.shot('but the bush administration', {
    set: 'dc:dusk', in: 'whip', bed: 'eveningAmb', mood: 'tension',
    enter: (c) => {
      const s = c.set; s.focus = [-680, 0, 1500]; s.focusSize = 120;
      const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.95) });
      for (let i = 0; i < 8; i++) for (const y of [5, 13]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.6), lit); w.position.set(-686.95, y, 1500 + 21 - i * 6); w.rotation.y = Math.PI / 2; s.addExtra(w); }
      for (const [x, z, k] of [[-630, 1452, 1], [-615, 1548, 2], [-600, 1470, 3], [-588, 1535, 4], [-650, 1440, 5], [-645, 1562, 6]]) { const t = makeTree('oak', 40 + k, { h: 9 }); t.position.set(x, 0, z); t.scale.setScalar(1.5); s.addExtra(t); }
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.8, 40), std(0xe8e4dc, { r: 0.6 })); fountain.position.set(-640, 0.4, 1500); s.addExtra(fountain);
      const water = new THREE.Mesh(new THREE.CircleGeometry(6.6, 40), new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.05, metalness: 0.4 })); water.rotation.x = -Math.PI / 2; water.position.set(-640, 0.82, 1500); s.addExtra(water);
      const f = makeFlag('us', 3.2, 1.7, { poleH: 7 }); f.position.set(-700, 19.5, 1500); s.addExtra(f); s.whFlag = f;
    },
    update: (c) => c.set.whFlag.userData.tick(c.T),
    cam: { p: [[-575, 3.5, 1468], [-588, 4.2, 1478]], l: [[-700, 12, 1500], [-700, 12.5, 1500]], fov: 32, shake: 0.12 },
    post: { bloomStr: 0.9 },
  });
  D.shot('turning toward a new', {
    set: 'info:dark', in: 'whip', mood: 'war',
    enter: (c) => {
      const m = meMap(0.7, { default: 0x4a4a52 }, { afghanistan: 0x8a8a92 }); m.position.set(1, 1.0, 0); c.set.add(m); c.set.map = m;
      const ring = new THREE.Group();
      const rm = new THREE.MeshStandardMaterial({ color: 0xff2a20, emissive: 0xff2a20, emissiveIntensity: 2.2 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 8, 48), rm); ring.add(r1);
      for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), rm); const a = i * Math.PI / 2; t.position.set(Math.sin(a) * 1.9, Math.cos(a) * 1.9, 0); t.rotation.z = -a; ring.add(t); }
      c.set.add(ring); c.set.ring = ring;
      c.set.iraq = m.getObjectByName('iraq');
      c.set.tIraq = D.S.words.find((w) => w.w === 'iraq' && w.s > 930).s;
    },
    update: (c) => {
      const m = c.set.map, A = m.userData.at('kabul', 1.6).add(m.position), B = m.userData.at('baghdad', 1.6).add(m.position);
      const k = E.ioCubic(clamp((c.lt - 0.5) / 1.4));
      c.set.ring.position.copy(A).lerp(B, k); c.set.ring.position.z += Math.sin(k * Math.PI) * 1.5;
      c.set.ring.rotation.z = c.T * 0.6;
      const hit = clamp((c.T - c.set.tIraq + 0.1) / 0.3);
      const ir = c.set.iraq; ir.position.z = hit * 0.7; ir.material.color.setRGB(lerp(0.2, 0.62, hit), lerp(0.2, 0.05, hit), lerp(0.22, 0.06, hit)); ir.material.emissive.setRGB(0.5 * hit, 0.02 * hit, 0.02 * hit); ir.material.emissiveIntensity = 1;
    },
    cam: { p: [[0, -10, 62], [-1, -8, 58]], l: [[0, 1, 0], [-1, 1.2, 0]], fov: 26, shake: 0.08 },
    overlay: (c, g) => {
      const hit = c.T >= c.set.tIraq - 0.1;
      const m = c.set.map, pa = m.userData.at('kabul', 1.8).add(m.position).project(c.cam);
      text(g, 'AFGHANISTAN', (pa.x * 0.5 + 0.5) * W, (-pa.y * 0.5 + 0.5) * H - 60, { size: 26, weight: 800, align: 'center', color: '#e8e2d6', tracking: 0.25, p: clamp((c.lt - 0.2) / 0.4) });
      if (hit) {
        headline(g, c.T - c.set.tIraq + 0.1, 'the next target', 'IRAQ', { x: 96, y: 230, align: 'left', color: C.white, smallColor: '#bdb6aa', bigSize: 120, bigColor: '#ff4a3a' });
      }
    },
    sfx: [[0.5, 'servo', {}], [0.0, 'whoosh', {}]],
  });
  D.sfx(D.peek('iraq'), 'impactDeep', {});
  D.shot('the tragedy of 9', {
    set: 'info:paper', in: 'whip', mood: 'war',
    enter: (c) => {
      const d = card(6.4, 8.4, docDraw({ header: 'PUBLIC LAW 107-243', title: 'AUTHORIZATION FOR USE OF\nMILITARY FORCE AGAINST\nIRAQ RESOLUTION OF 2002', titleSize: 0.04, body: 'Whereas on September 11, 2001, terrorists took the lives of thousands of innocent people; whereas the attacks underscored the gravity of the threat posed by the acquisition of weapons of mass destruction by international terrorist organizations; whereas the President is authorized to use the Armed Forces of the United States as he determines to be necessary and appropriate in order to defend the national security of the United States against the continuing threat posed by Iraq ...', stamp: 'APPROVED', seed: 12 }), { ppu: 150 });
      d.position.set(4.2, -0.4, 1.2); d.rotation.set(-0.08, -0.22, 0.05); c.set.add(d); c.set.doc = d;
    },
    update: (c) => { const k = E.outCubic(clamp(c.lt / 0.8)); c.set.doc.position.y = lerp(-14, -0.4, k); c.set.doc.rotation.z = lerp(0.4, 0.05, k); },
    cam: { p: [[0, 0, 40], [0, 0, 37]], l: [[0, 0, 0], [0.4, 0, 0]], fov: 30, shake: 0.04 },
    overlay: (c, g) => {
      smearText(g, '9/11', 140, 470, clamp((c.lt - 0.1) / 0.6), { size: 230, color: C.ink, weight: 800 });
      text(g, 'became the', 150, 560, { size: 48, fam: 'serif', italic: true, weight: 400, color: C.grey, p: clamp((c.lt - 0.6) / 0.5) });
      smearText(g, 'JUSTIFICATION', 140, 680, clamp((c.lt - 1.2) / 0.6), { size: 104, color: C.red, weight: 800 });
    },
    sfx: [[0.0, 'paperSlide', {}], [1.2, 'stamp', {}]],
  });
  D.shot('for redrawing the geopolitical', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const m = meMap(1.0, { default: 0xe2ddd3 }, { iraq: 0xc8102e, afghanistan: 0xd8b25a }); m.position.set(2, 0.6, 0); c.set.add(m); c.set.map = m;
      c.set.pieces = m.children.map((p, i) => [p, (hash(i * 3) - 0.5) * 0.9, (hash(i * 7) - 0.5) * 0.9, (hash(i * 11) - 0.5) * 0.12, 1.2 + hash(i * 5) * 1.5]);
      // red marker strokes: new lines drawn across the region
      const mk = new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0xc8102e, emissiveIntensity: 0.4 });
      const strokes = [[[38, 37], [48, 30]], [[44, 39], [42, 30]], [[60, 37], [66, 29]], [[34, 32], [49, 33]]].map(([a, b]) => {
        const A = m.userData.atLL(a[0], a[1], 2.2).add(m.position), B = m.userData.atLL(b[0], b[1], 2.2).add(m.position);
        const curve = new THREE.LineCurve3(A, B); const geo = new THREE.TubeGeometry(curve, 30, 0.09, 6, false); const t = new THREE.Mesh(geo, mk); geo.setDrawRange(0, 0); c.set.add(t); return t;
      });
      c.set.strokes = strokes;
    },
    update: (c) => {
      c.set.pieces.forEach(([p, dx, dy, rz, lift]) => { const k = E.ioCubic(clamp((c.lt - 0.4) / 1.6)); p.position.set(dx * k, dy * k, lift * Math.sin(k * Math.PI) * 0.8); p.rotation.z = rz * k; });
      c.set.strokes.forEach((t, i) => { const k = clamp((c.lt - 0.9 - i * 0.35) / 0.5); t.geometry.setDrawRange(0, Math.floor(k * t.geometry.index.count / 6) * 6); });
    },
    cam: { p: [[0, -12, 46], [0, -9, 44]], l: [[1, 1, 0], [1, 1.5, 0]], fov: 26, shake: 0.06 },
    overlay: (c, g) => headline(g, c.lt, 'the plan to', 'REDRAW THE MIDDLE EAST', { x: 96, y: 190, align: 'left', bigSize: 80, smallSize: 44, color: C.ink, smallColor: C.grey }),
    sfx: [[0.4, 'mapShift', { dur: 1.8 }], [0.9, 'markerDraw', {}], [1.25, 'markerDraw', {}], [1.6, 'markerDraw', {}]],
  });
  D.card('25 years after', '25 YEARS', 'AFTER THE ATTACKS', { mood: 'reflect' });
}
