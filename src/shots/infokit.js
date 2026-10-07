// Infographic toolkit: kinetic editorial typography (overlay) + 2.5D props (maps,
// tower cutaways, tickets, gauges, dots) used by the shot list.
import * as THREE from 'three';
import { text, measure, font, FONTS, W, H } from '../core/overlay.js';
import { clamp, E, seg, lerp, hash, fmtInt, rng } from '../core/util.js';
import { canvasTex, makeCanvas } from '../assets/textures.js';
import { US, ME, SEAS, CITIES, projUS, projME } from '../assets/geo.js';
import { std, M } from '../assets/materials.js';
import { makeAirliner } from '../assets/aircraft.js';

export const C = {
  ink: '#151515', paper: '#ece9e3', red: '#c8102e', redHi: '#ff3b3b', grey: '#7a7670', white: '#f4f1ea', dim: '#9a958c', gold: '#d8b25a',
};

// ---------------- typography ----------------
// smear-in text (montage2 style): letters arrive with horizontal motion blur + fade
export function smearText(g, str, x, y, p, o = {}) {
  const size = o.size || 96;
  const dir = o.dir ?? 1;
  const n = 5;
  const base = { size, weight: o.weight ?? 800, fam: o.fam || 'sans', italic: o.italic, align: o.align || 'left', tracking: o.tracking ?? -0.02, color: o.color || C.ink, stagger: o.stagger ?? 0.55 };
  if (p >= 1) { text(g, str, x, y, { ...base, p: 1, alpha: o.alpha ?? 1, shadow: o.shadow, shadowBlur: o.shadowBlur }); return; }
  for (let k = n - 1; k >= 0; k--) {
    const pk = clamp(p - k * 0.04);
    const off = (1 - E.outExpo(pk)) * (o.dist ?? 140) * dir;
    text(g, str, x + off, y, { ...base, p: pk, alpha: (o.alpha ?? 1) * (k === 0 ? 1 : 0.18), blur: 14, shadow: k === 0 ? o.shadow : null, shadowBlur: o.shadowBlur });
  }
}

// small serif italic kicker + big bold headline (stacked), editorial look
export function headline(g, lt, small, big, o = {}) {
  const x = o.x ?? W / 2, y = o.y ?? H / 2;
  const align = o.align || 'center';
  const t0 = o.t0 ?? 0;
  const p1 = clamp((lt - t0) / 0.6), p2 = clamp((lt - t0 - (o.gap ?? 0.25)) / 0.7);
  const out = o.dur ? clamp((o.dur - lt) / 0.3) : 1;
  if (small) text(g, small, x + (o.smallDx ?? 0), y - (o.bigSize || 120) * 0.92, { size: o.smallSize || 52, weight: 400, fam: 'serif', italic: true, align, color: o.smallColor || o.color || C.ink, p: p1, blur: 10, rise: 0.3, alpha: out, stagger: 0.4 });
  if (big) smearText(g, big, x, y, p2, { size: o.bigSize || 120, align, color: o.bigColor || o.color || C.ink, alpha: out, weight: o.weight ?? 800, tracking: o.tracking ?? -0.03, shadow: o.shadow, shadowBlur: 24 });
}

// typewriter text with caret
export function typeOn(g, str, x, y, p, o = {}) {
  const n = Math.floor(str.length * clamp(p));
  const s = str.slice(0, n);
  font(g, o.size || 34, o.weight ?? 400, o.fam || 'mono');
  g.fillStyle = o.color || C.ink; g.globalAlpha = o.alpha ?? 1; g.textAlign = o.align || 'left';
  g.fillText(s, x, y);
  if (p < 1.05 && Math.floor((o.t ?? 0) * 3) % 2 === 0) { const w = g.measureText(s).width; g.fillRect(x + (o.align === 'center' ? w / 2 : w) + 4, y - (o.size || 34) * 0.8, (o.size || 34) * 0.5, (o.size || 34)); }
  g.globalAlpha = 1; g.textAlign = 'left';
}

// big counting number
export function counter(g, lt, from, to, x, y, o = {}) {
  const p = (o.ease || E.outCubic)(clamp((lt - (o.t0 ?? 0)) / (o.d ?? 1.6)));
  const v = lerp(from, to, p);
  const str = (o.prefix || '') + (o.fmt ? o.fmt(v) : fmtInt(v)) + (o.suffix || '');
  const pin = clamp((lt - (o.t0 ?? 0)) / 0.35);
  text(g, str, x, y, { size: o.size || 220, weight: o.weight ?? 800, fam: o.fam || 'sans', align: o.align || 'center', color: o.color || C.ink, tracking: o.tracking ?? -0.03, p: pin, blur: 16, alpha: o.alpha ?? 1, stagger: 0.2, shadow: o.shadow, shadowBlur: 30 });
  return str;
}

// dotted rotating circle ornament
export function dotCircle(g, x, y, r, lt, o = {}) {
  const p = E.outCubic(clamp(lt / (o.d ?? 0.8)));
  g.save();
  g.translate(x, y); g.rotate(lt * (o.spin ?? 0.15));
  g.strokeStyle = o.color || C.ink; g.globalAlpha = (o.alpha ?? 0.8);
  g.lineWidth = o.w ?? 2.5; g.setLineDash([2, 9]);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2 * p); g.stroke();
  g.restore(); g.setLineDash([]); g.globalAlpha = 1;
}

// thin line with dot ends (editorial pointer)
export function pointer(g, x1, y1, x2, y2, p, o = {}) {
  const q = E.outCubic(clamp(p));
  const xe = lerp(x1, x2, q), ye = lerp(y1, y2, q);
  g.strokeStyle = o.color || C.ink; g.lineWidth = o.w ?? 2; g.globalAlpha = o.alpha ?? 1;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(xe, ye); g.stroke();
  g.fillStyle = o.color || C.ink;
  g.beginPath(); g.arc(x1, y1, 5, 0, Math.PI * 2); g.fill();
  if (q > 0.98) { g.beginPath(); g.arc(x2, y2, 5, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}

// red marker underline sweep
export function underline(g, x, y, w, p, o = {}) {
  const q = E.ioCubic(clamp(p));
  g.fillStyle = o.color || C.red; g.globalAlpha = o.alpha ?? 1;
  g.fillRect(o.align === 'center' ? x - w / 2 : x, y, w * q, o.h ?? 10);
  g.globalAlpha = 1;
}

// cross-out stroke over a word
export function strike(g, x, y, w, p, o = {}) {
  const q = E.outCubic(clamp(p));
  g.strokeStyle = o.color || C.red; g.lineWidth = o.w ?? 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - w / 2, y + 8); g.lineTo(x - w / 2 + w * q, y - 8); g.stroke();
}

// check / cross icon
export function mark(g, x, y, ok, p, o = {}) {
  const q = E.outBack(clamp(p));
  const s = (o.size || 60) * q;
  if (s <= 0) return;
  g.save(); g.translate(x, y);
  g.fillStyle = ok ? (o.okColor || '#1f8a4c') : (o.noColor || C.red);
  g.beginPath(); g.arc(0, 0, s, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = s * 0.16; g.lineCap = 'round';
  g.beginPath();
  if (ok) { g.moveTo(-s * 0.42, 0); g.lineTo(-s * 0.1, s * 0.32); g.lineTo(s * 0.45, -s * 0.35); }
  else { g.moveTo(-s * 0.35, -s * 0.35); g.lineTo(s * 0.35, s * 0.35); g.moveTo(s * 0.35, -s * 0.35); g.lineTo(-s * 0.35, s * 0.35); }
  g.stroke(); g.restore();
}

// horizontal timeline with ticks and moving marker
export function timeline(g, lt, x0, x1, y, years, o = {}) {
  const p = E.ioCubic(clamp(lt / (o.d ?? 1.2)));
  const col = o.color || C.ink;
  g.strokeStyle = col; g.lineWidth = 3; g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, p), y); g.stroke();
  const n = years.length;
  years.forEach((yr, i) => {
    const x = lerp(x0, x1, i / (n - 1));
    const a = clamp((p - i / (n - 1)) * 6 + 0.2);
    if (a <= 0) return;
    g.globalAlpha = a; g.fillStyle = col;
    const major = o.major ? o.major.includes(yr) : i === 0 || i === n - 1;
    g.fillRect(x - 1.5, y - (major ? 22 : 10), 3, major ? 44 : 20);
    if (major || o.allLabels) { font(g, major ? 44 : 26, major ? 800 : 500, 'sans'); g.textAlign = 'center'; g.fillText(String(yr), x, y + (major ? 82 : 52)); g.textAlign = 'left'; }
  });
  g.globalAlpha = 1;
  if (o.marker != null) {
    const mp = E.ioCubic(clamp((lt - (o.mt0 ?? 0.6)) / (o.md ?? 1.6)));
    const x = lerp(lerp(x0, x1, o.marker[0]), lerp(x0, x1, o.marker[1]), mp);
    g.fillStyle = o.mcolor || C.red; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.3; g.beginPath(); g.arc(x, y, 14 + (lt * 30 % 20), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = o.mcolor || C.red; g.fillRect(lerp(x0, x1, o.marker[0]), y - 3, x - lerp(x0, x1, o.marker[0]), 6);
  }
}

// line chart drawn progressively
export function lineChart(g, lt, pts, x0, y0, w, h, o = {}) {
  const p = E.ioCubic(clamp((lt - (o.t0 ?? 0)) / (o.d ?? 1.8)));
  const n = pts.length;
  const maxV = o.max ?? Math.max(...pts), minV = o.min ?? 0;
  const X = (i) => x0 + (i / (n - 1)) * w, Y = (v) => y0 + h - ((v - minV) / (maxV - minV)) * h;
  // grid
  g.strokeStyle = o.grid || 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(x0, y0 + (h * k) / 4); g.lineTo(x0 + w, y0 + (h * k) / 4); g.stroke(); }
  const last = p * (n - 1);
  // area
  g.beginPath(); g.moveTo(X(0), y0 + h);
  for (let i = 0; i <= Math.floor(last); i++) g.lineTo(X(i), Y(pts[i]));
  const fi = Math.floor(last), fr = last - fi;
  const ex = fi < n - 1 ? lerp(X(fi), X(fi + 1), fr) : X(n - 1), ey = fi < n - 1 ? lerp(Y(pts[fi]), Y(pts[fi + 1]), fr) : Y(pts[n - 1]);
  g.lineTo(ex, ey); g.lineTo(ex, y0 + h); g.closePath();
  const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, o.fill || 'rgba(200,16,46,0.35)'); gr.addColorStop(1, 'rgba(200,16,46,0)');
  g.fillStyle = gr; g.fill();
  g.beginPath(); g.moveTo(X(0), Y(pts[0]));
  for (let i = 1; i <= fi; i++) g.lineTo(X(i), Y(pts[i]));
  g.lineTo(ex, ey);
  g.strokeStyle = o.color || C.red; g.lineWidth = o.lw ?? 6; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = o.color || C.red; g.beginPath(); g.arc(ex, ey, 11, 0, Math.PI * 2); g.fill();
  return [ex, ey];
}

// ---------------- 3D props ----------------
function shapeFrom(poly, proj, scale, cx = 0, cy = 0) {
  return new THREE.Shape(poly.map(([lon, lat]) => { const [x, y] = proj(lon, lat); return new THREE.Vector2((x - cx) * scale, (y - cy) * scale); }));
}
export function extrudeMap(poly, proj, scale, color, depth = 0.4, o = {}) {
  const sh = shapeFrom(poly, proj, scale, o.cx, o.cy);
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0.0, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 0 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function usMap(scale = 0.32, color = 0xf4f1ea) {
  const g = new THREE.Group();
  const m = extrudeMap(US, projUS, scale, color, 0.5);
  g.add(m);
  g.userData.at = (name, z = 0.65) => { const [lon, lat] = CITIES[name]; const [x, y] = projUS(lon, lat); return new THREE.Vector3(x * scale, y * scale, z); };
  g.userData.atLL = (lon, lat, z = 0.65) => { const [x, y] = projUS(lon, lat); return new THREE.Vector3(x * scale, y * scale, z); };
  return g;
}
export function meMap(scale = 0.42, colors = {}, highlight = {}) {
  const g = new THREE.Group();
  for (const k in ME) {
    const hl = highlight[k];
    const col = hl || colors[k] || colors.default || 0xe6e1d8;
    const m = extrudeMap(ME[k], projME, scale, col, hl ? 0.9 : 0.4, { emissive: hl ? col : 0, ei: hl ? 0.25 : 0 });
    m.name = k; g.add(m);
  }
  g.userData.at = (name, z = 1.0) => { const [lon, lat] = CITIES[name]; const [x, y] = projME(lon, lat); return new THREE.Vector3(x * scale, y * scale, z); };
  g.userData.atLL = (lon, lat, z = 1.0) => { const [x, y] = projME(lon, lat); return new THREE.Vector3(x * scale, y * scale, z); };
  return g;
}

// arc (tube) between two 3D points, drawn progressively
export function arc3(a, b, height, color, width = 0.08, intensity = 1) {
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.z += height;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const geo = new THREE.TubeGeometry(curve, 80, width, 6, false);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const total = geo.index.count;
  m.userData.set = (p) => geo.setDrawRange(0, Math.floor(clamp(p) * total / 6) * 6);
  m.userData.curve = curve;
  m.userData.set(0);
  return m;
}
export function pin(color = 0xc8102e, s = 0.35) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(s, 20, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.3 }));
  head.position.z = s * 2.6; head.castShadow = true; g.add(head);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.12, s * 0.02, s * 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 }));
  needle.rotation.x = Math.PI / 2; needle.position.z = s * 1.3; g.add(needle);
  return g;
}

// stylised tower made of floor slabs (for cutaways)
export function slabTower(o = {}) {
  const g = new THREE.Group();
  const floors = o.floors ?? 110, fh = o.fh ?? 0.13, w = o.w ?? 2.2;
  const geo = new THREE.BoxGeometry(w, fh * 0.82, w * 0.5);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const im = new THREE.InstancedMesh(geo, mat, floors);
  const d = new THREE.Object3D(); const c = new THREE.Color();
  for (let i = 0; i < floors; i++) { d.position.set(0, i * fh + fh / 2, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(o.color ?? 0xb8bcc2)); }
  im.castShadow = true; im.receiveShadow = true;
  g.add(im);
  g.userData = { im, floors, fh, w, color: (i, col) => { im.setColorAt(i, c.set(col)); im.instanceColor.needsUpdate = true; }, height: floors * fh };
  // core columns
  const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, floors * fh, w * 0.2), new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.7 }));
  core.position.y = floors * fh / 2; core.position.z = -0.05; g.add(core);
  if (o.antenna) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.8, roughness: 0.3 })); a.position.y = floors * fh + 1.75; g.add(a); }
  return g;
}

// textured card (ticket, document, ID card)
export function card(w, h, draw, o = {}) {
  const tex = canvasTex(Math.round(w * (o.ppu ?? 160)), Math.round(h * (o.ppu ?? 160)), draw, { clamp: true });
  const geo = new THREE.BoxGeometry(w, h, o.thick ?? 0.02);
  const side = new THREE.MeshStandardMaterial({ color: o.edge ?? 0xf2efe8, roughness: 0.8 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: o.r ?? 0.75, metalness: o.m ?? 0 });
  const m = new THREE.Mesh(geo, [side, side, side, side, front, side]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function ticketDraw(i, o = {}) {
  return (g, w, h) => {
    g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = o.airline === 'UA' ? '#1b2a57' : '#c8232c'; g.fillRect(0, 0, w, h * 0.22);
    g.fillStyle = '#fff'; g.font = `800 ${h * 0.12}px ${FONTS.sans}`; g.fillText(o.airline === 'UA' ? 'BOARDING PASS' : 'BOARDING PASS', w * 0.05, h * 0.15);
    g.fillStyle = '#222'; g.font = `600 ${h * 0.09}px ${FONTS.mono}`;
    g.fillText(`FLT ${o.flight || '11'}`, w * 0.05, h * 0.36);
    g.fillText(`${o.from || 'BOS'}  >  ${o.to || 'LAX'}`, w * 0.05, h * 0.5);
    g.fillText(`SEAT ${o.seat || (2 + (i % 8)) + 'B'}`, w * 0.05, h * 0.64);
    g.fillText('11 SEP 2001', w * 0.05, h * 0.78);
    g.fillStyle = '#c8102e'; g.font = `800 ${h * 0.1}px ${FONTS.sans}`; g.fillText('ONE WAY', w * 0.6, h * 0.5);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(w * 0.78, h * 0.25); g.lineTo(w * 0.78, h); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 40; k++) { g.fillStyle = '#222'; g.fillRect(w * 0.82 + k * w * 0.004, h * 0.32, (k % 3 + 1) * w * 0.0015, h * 0.55); }
  };
}

// paper document with typewritten lines
export function docDraw(o = {}) {
  return (g, w, h) => {
    g.fillStyle = o.bg || '#f4f0e6'; g.fillRect(0, 0, w, h);
    const r = rng(o.seed ?? 3);
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 2, 2); }
    let y = h * 0.08;
    if (o.header) { g.fillStyle = '#7a1418'; g.font = `700 ${h * 0.03}px ${FONTS.type}`; g.textAlign = 'center'; g.fillText(o.header, w / 2, y); g.textAlign = 'left'; y += h * 0.05; }
    if (o.title) { g.fillStyle = '#111'; g.font = `400 ${h * (o.titleSize ?? 0.042)}px ${FONTS.type}`; const lines = o.title.split('\n'); for (const l of lines) { g.fillText(l, w * 0.08, y + h * 0.03); y += h * 0.05; } y += h * 0.02; }
    g.fillStyle = 'rgba(25,25,25,0.85)';
    g.font = `400 ${h * 0.022}px ${FONTS.type}`;
    const words = (o.body || 'lorem').split(' ');
    let line = '';
    for (const wd of words) {
      const test = line + wd + ' ';
      if (g.measureText(test).width > w * 0.84) { g.fillText(line, w * 0.08, y); y += h * 0.032; line = wd + ' '; if (y > h * 0.9) break; }
      else line = test;
    }
    if (y <= h * 0.9) g.fillText(line, w * 0.08, y);
    if (o.redactions) { g.fillStyle = '#111'; for (const [ry, rx, rw] of o.redactions) g.fillRect(w * rx, h * ry, w * rw, h * 0.022); }
    if (o.stamp) { g.save(); g.translate(w * 0.7, h * 0.12); g.rotate(-0.18); g.strokeStyle = '#b01018'; g.lineWidth = h * 0.006; g.strokeRect(-w * 0.2, -h * 0.03, w * 0.4, h * 0.06); g.fillStyle = '#b01018'; g.font = `800 ${h * 0.035}px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText(o.stamp, 0, h * 0.013); g.restore(); }
  };
}

// grid of glowing dots (e.g. 2,977 lives), revealed progressively
export function dotGrid(n, cols, spacing, color = 0xffffff) {
  const geo = new THREE.SphereGeometry(spacing * 0.3, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 2.5, roughness: 0.5 });
  const im = new THREE.InstancedMesh(geo, mat, n);
  const d = new THREE.Object3D();
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) { d.position.set((i % cols - cols / 2) * spacing, (rows / 2 - Math.floor(i / cols)) * spacing, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.count = 0;
  im.userData.set = (p) => { im.count = Math.floor(clamp(p) * n); };
  return im;
}

export function infoPlane(kind = 'american', s = 0.06) {
  const p = makeAirliner(kind);
  p.scale.setScalar(s);
  return p;
}
