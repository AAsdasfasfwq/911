// Procedural canvas textures (all deterministic, cached and shared between sets).
import * as THREE from 'three';
import { rng, fbm2, vnoise2, hash2, clamp } from '../core/util.js';

const cache = new Map();
export function cached(key, fn) {
  if (!cache.has(key)) { const v = fn(); if (v && v.isTexture) v.userData.shared = true; cache.set(key, v); }
  return cache.get(key);
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function canvasTex(w, h, draw, o = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  draw(g, w, h, c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = o.aniso ?? 8;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  if (o.nearest) { t.magFilter = THREE.NearestFilter; }
  t.needsUpdate = true;
  return t;
}

// Fill a canvas with per-pixel function f(x,y)->[r,g,b,a] (0..255)
export function pixels(g, w, h, f) {
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = f(x, y), i = (y * w + x) * 4;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3] ?? 255;
  }
  g.putImageData(img, 0, 0);
}

// tileable fbm (wraps by sampling noise on a torus-like domain via periodic lattice)
function tfbm(x, y, period, seed, oct = 5) {
  let s = 0, a = 0.5, n = 0, p = period;
  for (let o = 0; o < oct; o++) {
    s += pnoise(x * (p / period), y * (p / period), p, seed + o * 31) * a;
    n += a; a *= 0.5; p *= 2;
  }
  return s / n;
}
function pnoise(x, y, P, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const h = (i, j) => hash2(((i % P) + P) % P + seed * 1013, ((j % P) + P) % P - seed * 7919) * 2 - 1;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

// generic tileable noise texture (grayscale), used for roughness / dirt / variation
export function noiseTex(size = 256, period = 8, seed = 1, oct = 5, linear = true) {
  return cached(`noise${size}_${period}_${seed}_${oct}`, () => canvasTex(size, size, (g, w, h) => {
    pixels(g, w, h, (x, y) => { const v = clamp(0.5 + tfbm(x / w * period, y / h * period, period, seed, oct) * 0.9) * 255; return [v, v, v, 255]; });
  }, { linear }));
}

// soft puff atlas 2x2 for smoke / dust / fire
export function puffAtlas() {
  return cached('puffAtlas', () => {
    const S = 512, half = 256;
    return canvasTex(S, S, (g) => {
      const img = g.createImageData(S, S); const d = img.data;
      for (let k = 0; k < 4; k++) {
        const ox = (k % 2) * half, oy = Math.floor(k / 2) * half;
        for (let y = 0; y < half; y++) for (let x = 0; x < half; x++) {
          const u = (x + 0.5) / half * 2 - 1, v = (y + 0.5) / half * 2 - 1;
          const r = Math.sqrt(u * u + v * v);
          const n = fbm2(u * 2.2 + k * 7.1, v * 2.2 - k * 3.3, 11 + k, 6);
          const n2 = fbm2(u * 6 + k, v * 6 - k, 41 + k, 4);
          let a = clamp(1 - r * (1.05 - 0.45 * n)) ;
          a = Math.pow(a, 1.35) * clamp(0.55 + n * 1.3 + n2 * 0.35);
          a = clamp(a * 1.6);
          const i = ((oy + y) * S + ox + x) * 4;
          const shade = clamp(0.72 + n * 0.5 + n2 * 0.2);
          d[i] = d[i + 1] = d[i + 2] = shade * 255; d[i + 3] = a * 255;
        }
      }
      g.putImageData(img, 0, 0);
    }, { linear: true, clamp: true });
  });
}

// streak / spark texture
export function sparkTex() {
  return cached('spark', () => canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { linear: true, clamp: true }));
}

export function radialTex(key = 'radial', inner = 'rgba(0,0,0,0.65)', outer = 'rgba(0,0,0,0)') {
  return cached('rad_' + key, () => canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { clamp: true }));
}

// ----- surfaces -----
export function asphaltTex() {
  return cached('asphalt', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 16, y / h * 16, 16, 3, 4), f = hash2(x, y) * 0.12;
      const v = 52 + n * 30 + f * 60;
      return [v, v * 1.01, v * 1.04];
    });
  }));
}
export function concreteTex(tone = 1) {
  return cached('concrete' + tone, () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 8, y / h * 8, 8, 5, 5), f = hash2(x * 3, y * 7) * 0.08;
      const v = (150 + n * 40 + f * 50) * tone;
      return [v * 1.02, v, v * 0.96];
    });
    g.strokeStyle = 'rgba(40,40,40,0.25)'; g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
  }));
}
export function sandTex() {
  return cached('sand', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 6, y / h * 6, 6, 9, 5), r = tfbm(x / w * 24 + n, y / h * 3, 24, 4, 3) * 0.5, f = hash2(x, y) * 0.1;
      const v = 0.75 + n * 0.25 + r * 0.15 + f;
      return [205 * v, 172 * v, 120 * v];
    });
  }));
}
export function grassTex() {
  return cached('grass', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 8, y / h * 8, 8, 12, 5), f = hash2(x, y);
      const v = 0.75 + n * 0.35 + f * 0.18;
      return [70 * v, 118 * v, 48 * v];
    });
  }));
}
export function dirtTex() {
  return cached('dirt', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 8, y / h * 8, 8, 21, 5), f = hash2(x, y) * 0.15;
      const v = 0.7 + n * 0.4 + f;
      return [110 * v, 88 * v, 66 * v];
    });
  }));
}
export function rockTex() {
  return cached('rock', () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 6, y / h * 6, 6, 33, 6), c = Math.abs(tfbm(x / w * 12, y / h * 12, 12, 34, 3));
      const v = 0.65 + n * 0.45 - (c < 0.04 ? 0.25 : 0);
      return [140 * v, 118 * v, 96 * v];
    });
  }));
}
export function carpetTex(c1 = [120, 30, 36], c2 = [80, 20, 26]) {
  return cached('carpet' + c1 + c2, () => canvasTex(256, 256, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const f = hash2(x, y) * 0.25, p = ((Math.floor(x / 32) + Math.floor(y / 32)) % 2) ? 1 : 0;
      const c = p ? c1 : c2, v = 0.85 + f;
      return [c[0] * v, c[1] * v, c[2] * v];
    });
  }));
}
export function woodTex(base = [120, 78, 44]) {
  return cached('wood' + base, () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * 2, y / h * 24, 24, 7, 4);
      const ring = 0.5 + 0.5 * Math.sin((y / h) * 120 + n * 8);
      const plank = (Math.floor(x / 64) % 2) * 0.06;
      const v = 0.75 + ring * 0.2 + n * 0.2 - plank + hash2(x, y) * 0.05;
      return [base[0] * v, base[1] * v, base[2] * v];
    });
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 2, h);
  }));
}
export function sidingTex(color = '#e6dcc8') {
  return cached('siding' + color, () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.85, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = gr; g.fillRect(0, y, w, 16);
    }
  }));
}
export function brickTex(base = [150, 70, 52]) {
  return cached('brick' + base, () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = 'rgb(170,165,155)'; g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let y = 0; y < h; y += 16) for (let x = -32; x < w; x += 64) {
      const off = (y / 16) % 2 ? 32 : 0, v = 0.8 + r() * 0.35;
      g.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`;
      g.fillRect(x + off + 2, y + 2, 60, 12);
    }
  }));
}
export function tileTex(c = '#d8d4cc', line = '#9a968e', n = 8) {
  return cached('tile' + c + line + n, () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    pixels(g, w, h, (x, y) => { const base = hexToRgb(c), f = 0.92 + hash2(x >> 2, y >> 2) * 0.08 + tfbm(x / w * 4, y / h * 4, 4, 2, 3) * 0.05; return [base[0] * f, base[1] * f, base[2] * f]; });
    g.strokeStyle = line; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke(); }
  }));
}
export function hexToRgb(h) { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; }

// road with lane markings (u across, v along)
export function roadTex() {
  return cached('road', () => canvasTex(256, 1024, (g, w, h) => {
    pixels(g, w, h, (x, y) => { const n = tfbm(x / w * 4, y / h * 16, 16, 3, 4), f = hash2(x, y) * 0.12; const v = 50 + n * 25 + f * 50; return [v, v, v * 1.03]; });
    g.fillStyle = 'rgba(235,235,225,0.85)';
    for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 3, y, 6, 64);
    g.fillStyle = 'rgba(230,190,60,0.85)'; g.fillRect(8, 0, 5, h); g.fillRect(w - 13, 0, 5, h);
  }));
}

// US flag (50 stars, 13 stripes)
export function flagTex(kind = 'us') {
  return cached('flag_' + kind, () => canvasTex(760, 400, (g, w, h) => {
    if (kind === 'us') {
      for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#b4202c'; g.fillRect(0, i * h / 13, w, h / 13 + 1); }
      g.fillStyle = '#2a3268'; g.fillRect(0, 0, w * 0.4, h * 7 / 13);
      g.fillStyle = '#f4f1ea';
      for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
        const x = (c * 2 + (r % 2 ? 2 : 1)) * (w * 0.4 / 12), y = (r + 1) * (h * 7 / 13) / 10;
        star(g, x, y, 9);
      }
    } else if (kind === 'ussr') {
      g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd400'; star(g, 110, 70, 22);
      g.font = 'bold 90px serif'; g.fillText('☭', 60, 200);
    } else if (kind === 'fr') {
      g.fillStyle = '#1f3c8c'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#f4f1ea'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#d0202c'; g.fillRect(2 * w / 3, 0, w / 3, h);
    } else if (kind === 'uk') {
      g.fillStyle = '#1f2f6c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f4f1ea'; g.lineWidth = 80; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.strokeStyle = '#c8102e'; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.fillStyle = '#f4f1ea'; g.fillRect(w / 2 - 60, 0, 120, h); g.fillRect(0, h / 2 - 60, w, 120);
      g.fillStyle = '#c8102e'; g.fillRect(w / 2 - 36, 0, 72, h); g.fillRect(0, h / 2 - 36, w, 72);
    } else if (kind === 'de') {
      g.fillStyle = '#111'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#d0202c'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#f2c400'; g.fillRect(0, 2 * h / 3, w, h / 3);
    } else if (kind === 'ru') {
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#1f3c9c'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#d0202c'; g.fillRect(0, 2 * h / 3, w, h / 3);
    } else if (kind === 'iraq') {
      g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#f4f1ea'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#111'; g.fillRect(0, 2 * h / 3, w, h / 3);
      g.fillStyle = '#2a7a3a'; for (let i = 0; i < 3; i++) star(g, w * (0.3 + i * 0.2), h / 2, 22);
    }
  }));
}
export function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// Text label texture for in-world signs / screens / documents
export function textTex(w, h, draw, o = {}) { return canvasTex(w, h, draw, { clamp: true, ...o }); }

// Dynamic canvas screen (updated per frame by owner)
export class Screen {
  constructor(w, h, draw) {
    this.c = makeCanvas(w, h); this.g = this.c.getContext('2d'); this.draw = draw;
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.last = -1;
  }
  update(t, ...args) {
    const q = Math.round(t * 30);
    if (q === this.last && !args.length) return;
    this.last = q;
    this.draw(this.g, this.c.width, this.c.height, t, ...args);
    this.tex.needsUpdate = true;
  }
  dispose() { this.tex.dispose(); }
}

// tileable grey detail map (values around 0.8-1.0) for multiplying vertex-coloured terrain
export function detailTexture(key = 'detail', period = 16, seed = 3, amp = 0.35) {
  return cached('detail_' + key, () => canvasTex(512, 512, (g, w, h) => {
    pixels(g, w, h, (x, y) => {
      const n = tfbm(x / w * period, y / h * period, period, seed, 5);
      const f = hash2(x, y) * 0.06;
      const v = clamp(0.88 + n * amp + f) * 255;
      return [v, v, v];
    });
  }, { linear: false }));
}
