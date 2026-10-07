// The Film: an ordered list of shots on an absolute timeline + lazily built sets.
// evaluate(T) is a pure function of time -> deterministic seek / frame-exact render.
import * as THREE from 'three';
import { DEFAULT_POST } from './pipeline.js';
import { clamp, E } from './util.js';
import { camMove, camOrbit } from './camera.js';

export class Film {
  constructor() {
    this.shots = [];
    this.overlays = [];
    this.sfx = [];
    this.beds = [];
    this.factories = {};
    this.sets = new Map();
    this.setUse = new Map();
    this.cur = null;
    this.curSet = null;
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 20000);
    this.duration = 0;
    this.frameIndex = 0;
  }

  registerSet(name, factory) { this.factories[name] = factory; }

  // shot: {t0, set, name, enter, update, post, overlay, in, out, sfx:[[dt, type, params]], bed}
  add(shot) { this.shots.push(shot); return shot; }
  addOverlay(o) { this.overlays.push(o); return o; }
  addSfx(t, type, params = {}) { this.sfx.push({ t, type, params }); }

  finalize(duration) {
    this.shots.sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      s.index = i;
      s.t1 = i + 1 < this.shots.length ? this.shots[i + 1].t0 : duration;
      s.dur = Math.max(0.001, s.t1 - s.t0);
      s.next = this.shots[i + 1] || null;
      s.prev = this.shots[i - 1] || null;
      if (s.sfx) for (const [dt, type, params] of s.sfx) this.addSfx(s.t0 + dt, type, params || {});
    }
    for (const o of this.overlays) { if (o.t1 == null) o.t1 = o.t0 + (o.dur || 2); }
    this.sfx.sort((a, b) => a.t - b.t);
    this.duration = duration;
    // validate
    const bad = this.shots.filter((s) => s.dur < 0.25);
    if (bad.length) console.warn('[film] very short shots:', bad.map((s) => `${s.name}@${s.t0.toFixed(2)} (${s.dur.toFixed(2)}s)`));
  }

  shotAt(T) {
    const S = this.shots;
    let lo = 0, hi = S.length - 1, ans = 0;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (S[m].t0 <= T) { ans = m; lo = m + 1; } else hi = m - 1;
    }
    return S[ans];
  }

  getSet(key, renderer) {
    let set = this.sets.get(key);
    if (!set) {
      const [name, variant] = key.split(':');
      const f = this.factories[name];
      if (!f) throw new Error('Unknown set ' + name);
      set = f(variant);
      set.key = key;
      set.renderer = renderer;
      set.build(renderer);
      this.sets.set(key, set);
      this._evict(key);
    }
    this.setUse.set(key, this.frameIndex);
    return set;
  }

  _evict(keep) {
    const MAX = 7;
    if (this.sets.size <= MAX) return;
    const entries = [...this.sets.keys()].filter((k) => k !== keep).sort((a, b) => (this.setUse.get(a) || 0) - (this.setUse.get(b) || 0));
    while (this.sets.size > MAX && entries.length) {
      const k = entries.shift();
      const s = this.sets.get(k);
      if (s === this.curSet) continue;
      try { s.dispose(); } catch (e) { console.warn(e); }
      this.sets.delete(k);
    }
  }

  // Build the per-frame context and pose the world for time T (seconds).
  evaluate(T, renderer, overlayCtx, clampShot) {
    const shot = clampShot || this.shotAt(T);
    T = clamp(T, shot.t0, shot.t1 - 1e-4);
    const lt = T - shot.t0;
    const set = shot.set ? this.getSet(shot.set, renderer) : null;
    const cam = this.camera;
    const ctx = {
      T, lt, dur: shot.dur, u: lt / shot.dur, shot, set, cam, film: this,
      post: Object.assign({}, DEFAULT_POST, set?.post || {}, typeof shot.post === 'function' ? {} : shot.post || {}),
      g: overlayCtx, overlayUsed: false, renderer,
    };
    if (shot !== this.cur || set !== this.curSet) {
      if (set) set.reset && set.reset(ctx);
      shot.enter && shot.enter(ctx);
      this.cur = shot; this.curSet = set;
    }
    if (set && set.update) set.update(ctx);
    if (shot.cam) camMove(ctx, typeof shot.cam === 'function' ? shot.cam(ctx) : shot.cam);
    if (shot.orbit) camOrbit(ctx, typeof shot.orbit === 'function' ? shot.orbit(ctx) : shot.orbit);
    if (shot.update) shot.update(ctx);
    if (typeof shot.post === 'function') Object.assign(ctx.post, shot.post(ctx));
    if (set && set.late) set.late(ctx);
    cam.aspect = 16 / 9;
    cam.updateProjectionMatrix();
    this._transitions(ctx);
    return ctx;
  }

  // Render another set (e.g. news footage of the towers) into a texture for TV screens.
  // camFn(subCtx) must pose the sub camera (and may tweak the set state).
  renderInset(ctx, key, camFn, rt, o = {}) {
    const r = ctx.renderer;
    const set = this.getSet(key, r);
    if (!this._insetCam) this._insetCam = new THREE.PerspectiveCamera(40, rt.width / rt.height, 1, 20000);
    const cam = this._insetCam;
    cam.aspect = rt.width / rt.height;
    const sub = { T: o.T ?? ctx.T, lt: o.lt ?? ctx.lt, dur: ctx.dur, u: ctx.u, shot: ctx.shot, set, cam, film: this, post: {}, renderer: r, inset: true };
    if (this.curSet === set) { /* same set as main: state already posed */ } else { set.reset && set.reset(sub); }
    if (set.update) set.update(sub);
    camFn(sub);
    if (set.late) set.late(sub);
    cam.updateProjectionMatrix();
    const prevT = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(set.scene, cam);
    r.setRenderTarget(prevT);
    if (this.curSet !== set) this._dirtyInset = set;
    return rt.texture;
  }

  _transitions(ctx) {
    const { shot, lt, post } = ctx;
    const tin = shot.in, tout = shot.next?.in;
    const left = shot.dur - lt;
    const apply = (kind, x, entering) => {
      // x: 1 at the cut, 0 away from it
      if (x <= 0) return;
      switch (kind) {
        case 'flash': post.flash = Math.max(post.flash, x * (entering ? 0.9 : 0.5)); break;
        case 'flashRed': post.flash = Math.max(post.flash, x * 0.55); post.flashCol = [1, 0.25, 0.15]; break;
        case 'whip': case 'whipL': case 'whipR': case 'whipU': case 'whipD': {
          post.blurAmt = Math.max(post.blurAmt, x * 0.22);
          const d = kind === 'whipU' || kind === 'whipD' ? [0, 1] : [1, 0];
          post.blurDir = d; break;
        }
        case 'zoom': post.zoomBlur = Math.max(post.zoomBlur, x * 0.35); break;
        case 'glitch': post.glitch = Math.max(post.glitch, x); break;
        case 'fade': post.fade = Math.max(post.fade, x); break;
        case 'dip': post.fade = Math.max(post.fade, x); break;
        case 'white': post.flash = Math.max(post.flash, x); post.flashCol = [1, 1, 1]; break;
      }
    };
    const dur = (k) => (k === 'fade' ? 0.6 : k === 'dip' ? 0.35 : k === 'white' ? 0.5 : k === 'glitch' ? 0.25 : k === 'flash' ? 0.3 : 0.2);
    if (tin) { const d = shot.inDur || dur(tin); apply(tin, 1 - E.outQuad(clamp(lt / d)), true); }
    if (tout) { const d = (shot.next.outDur || dur(tout)) * (tout === 'fade' || tout === 'dip' || tout === 'white' ? 1 : 0.6); apply(tout, 1 - E.inQuad(clamp(left / d)), false); }
    if (shot.outFx) { const d = shot.outDur || dur(shot.outFx); apply(shot.outFx, 1 - E.inQuad(clamp(left / d)), false); }
  }
}
