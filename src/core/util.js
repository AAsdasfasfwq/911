// Shared math / easing / deterministic randomness helpers.
// Everything in the film is a pure function of time, so no Math.random() anywhere.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const fract = (x) => x - Math.floor(x);
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const E = {
  linear: (t) => t,
  outBounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  ioCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  ioQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  ioExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  ioSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

// progress of t inside [a,b] with optional easing
export function seg(t, a, b, ease = E.linear) {
  if (b <= a) return t >= b ? 1 : 0;
  return ease(clamp((t - a) / (b - a)));
}
// 0 -> 1 -> 0 envelope: rise over [a, a+r], hold, fall over [b-f, b]
export function env(t, a, b, r = 0.3, f = 0.3) {
  return Math.min(seg(t, a, a + r, E.outCubic), 1 - seg(t, b - f, b, E.inCubic));
}

// ---------- deterministic randomness ----------
export function hash(n) {
  // integer hash -> [0,1)
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function hash2(a, b) { return hash((a | 0) * 73856093 ^ (b | 0) * 19349663); }
export function hashf(x) { return hash(Math.floor(x * 1000003)); }

export function rng(seed = 1) {
  let a = (seed | 0) + 0x6d2b79f5;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  f.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += f(); return (s - 2) / 1.1547; };
  return f;
}

// smooth 1D value noise in [-1,1]
export function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i * 7919 + seed * 104729) * 2 - 1;
  const b = hash((i + 1) * 7919 + seed * 104729) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
export function fbm1(x, seed = 0, oct = 3) {
  let s = 0, amp = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += vnoise(x * fr, seed + o * 31) * amp; n += amp; amp *= 0.5; fr *= 2.03; }
  return s / n;
}
// 2D value noise for terrain etc. [-1,1]
export function vnoise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const h = (i, j) => hash2(i + seed * 1013, j - seed * 7919) * 2 - 1;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm2(x, y, seed = 0, oct = 5, lac = 2.0, gain = 0.5) {
  let s = 0, amp = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += vnoise2(x * fr, y * fr, seed + o * 17) * amp; n += amp; amp *= gain; fr *= lac; }
  return s / n;
}
export function ridged2(x, y, seed = 0, oct = 5) {
  let s = 0, amp = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { const v = 1 - Math.abs(vnoise2(x * fr, y * fr, seed + o * 17)); s += v * v * amp; n += amp; amp *= 0.5; fr *= 2.1; }
  return s / n;
}

// ---------- vectors ----------
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
export function vlerp(out, a, b, t) { return out.set(lerp(a[0] ?? a.x, b[0] ?? b.x, t), lerp(a[1] ?? a.y, b[1] ?? b.y, t), lerp(a[2] ?? a.z, b[2] ?? b.z, t)); }
export function toV(a) { return a.isVector3 ? a : _a.set(a[0], a[1], a[2]); }

// Catmull-Rom through array of [x,y,z] points (uniform), t in [0,1]
export function catmull(out, pts, t) {
  const n = pts.length;
  if (n === 1) return out.set(pts[0][0], pts[0][1], pts[0][2]);
  if (n === 2) return vlerp(out, pts[0], pts[1], t);
  const f = clamp(t) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
  const c = (k) => {
    const a0 = p0[k], a1 = p1[k], a2 = p2[k], a3 = p3[k];
    return 0.5 * (2 * a1 + (-a0 + a2) * u + (2 * a0 - 5 * a1 + 4 * a2 - a3) * u * u + (-a0 + 3 * a1 - 3 * a2 + a3) * u * u * u);
  };
  return out.set(c(0), c(1), c(2));
}

export function lerpColor(out, a, b, t) { return out.copy(a).lerp(b, t); }
export const col = (h) => new THREE.Color(h);

// format helpers
export const pad2 = (n) => String(n).padStart(2, '0');
export function fmtInt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
