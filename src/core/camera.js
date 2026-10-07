// Camera moves: keyframed dolly/crane paths, orbits, follow cams, handheld shake.
import * as THREE from 'three';
import { clamp, E, catmull, fbm1, lerp, DEG } from './util.js';

const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(), _e = new THREE.Euler();

function arr(v) { return Array.isArray(v) ? v : [v, v]; }

function sampleScalar(v, u) {
  if (typeof v === 'number') return v;
  if (v.length === 1) return v[0];
  const f = clamp(u) * (v.length - 1);
  const i = Math.min(v.length - 2, Math.floor(f));
  return lerp(v[i], v[i + 1], f - i);
}

// spec: { p:[[x,y,z],...], l:[[x,y,z],...], fov, roll, ease, t0, t1, shake, near, far }
export function camMove(ctx, spec) {
  const cam = ctx.cam;
  const t0 = spec.t0 ?? 0, t1 = spec.t1 ?? ctx.dur;
  const ease = spec.ease || E.ioSine;
  const u = ease(clamp((ctx.lt - t0) / Math.max(0.001, t1 - t0)));
  catmull(_p, spec.p, u);
  if (spec.l) catmull(_l, spec.l, spec.lookEase ? spec.lookEase(clamp((ctx.lt - t0) / Math.max(0.001, t1 - t0))) : u);
  else if (spec.dir) _l.set(_p.x + spec.dir[0], _p.y + spec.dir[1], _p.z + spec.dir[2]);
  setCam(ctx, _p, _l, sampleScalar(spec.fov ?? 40, u), sampleScalar(spec.roll ?? 0, u), spec);
  return u;
}

export function setCam(ctx, pos, look, fov = 40, roll = 0, spec = {}) {
  const cam = ctx.cam;
  cam.position.copy(pos);
  cam.up.copy(_up);
  cam.lookAt(look);
  if (roll) { cam.rotateZ(roll * DEG); }
  const sh = spec.shake ?? 0.25;
  if (sh > 0) {
    const T = ctx.T * (spec.shakeFreq ?? 1);
    const s = spec.seed ?? ctx.shot.index;
    cam.rotateY(fbm1(T * 0.9, s * 3 + 1, 3) * sh * 0.9 * DEG);
    cam.rotateX(fbm1(T * 0.8, s * 3 + 2, 3) * sh * 0.7 * DEG);
    cam.rotateZ(fbm1(T * 0.6, s * 3 + 3, 2) * sh * 0.5 * DEG);
  }
  if (spec.impact) {
    // impact shake: {t, amp, decay}
    for (const im of [].concat(spec.impact)) {
      const dt = ctx.lt - im.t;
      if (dt > 0) {
        const a = im.amp * Math.exp(-dt * (im.decay ?? 3));
        cam.rotateY(fbm1(ctx.T * 22, 91, 2) * a * DEG);
        cam.rotateX(fbm1(ctx.T * 25, 92, 2) * a * DEG);
        cam.position.y += fbm1(ctx.T * 30, 93, 2) * a * (im.pos ?? 0.05);
      }
    }
  }
  cam.fov = fov;
  cam.near = spec.near ?? ctx.set?.near ?? 0.3;
  cam.far = spec.far ?? ctx.set?.far ?? 12000;
  cam.updateMatrixWorld();
}

// orbit around center: {c:[x,y,z], r:[r0,r1], a:[deg0,deg1], h:[y0,y1], l (look offset), fov}
export function camOrbit(ctx, s) {
  const ease = s.ease || E.ioSine;
  const u = ease(clamp(ctx.lt / ctx.dur));
  const r = sampleScalar(s.r, u), a = sampleScalar(s.a, u) * DEG, h = sampleScalar(s.h, u);
  _p.set(s.c[0] + Math.sin(a) * r, s.c[1] + h, s.c[2] + Math.cos(a) * r);
  const lo = s.lo || [0, 0, 0];
  _l.set(s.c[0] + lo[0], s.c[1] + sampleScalar(s.ly ?? 0, u) + lo[1], s.c[2] + lo[2]);
  setCam(ctx, _p, _l, sampleScalar(s.fov ?? 40, u), sampleScalar(s.roll ?? 0, u), s);
  return u;
}

// follow a moving target from an offset (in target's frame or world)
export function camFollow(ctx, target, offset, lookOffset = [0, 0, 0], fov = 40, spec = {}) {
  _p.set(target.x + offset[0], target.y + offset[1], target.z + offset[2]);
  _l.set(target.x + lookOffset[0], target.y + lookOffset[1], target.z + lookOffset[2]);
  setCam(ctx, _p, _l, fov, spec.roll || 0, spec);
}

export const camTmp = { p: _p, l: _l };
