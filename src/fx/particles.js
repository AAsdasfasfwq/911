// Billboard particle renderer (instanced quads, premultiplied blending with emission,
// pseudo-spherical lighting, fog) + analytic emitters. Particle state is computed on the
// CPU as a pure function of time and depth-sorted every frame.
import * as THREE from 'three';
import { puffAtlas, sparkTex } from '../assets/textures.js';
import { hash, clamp, lerp } from '../core/util.js';

const VS = /* glsl */`
attribute vec3 iPos; attribute vec4 iCol; attribute vec4 iMisc; attribute vec3 iEmit;
varying vec2 vUv; varying vec2 vC; varying vec4 vCol; varying vec3 vEmit; varying float vFrame; varying float vFogDepth; varying float vNearFade; varying float vLit;
uniform float uStretch;
void main(){
  float size = iMisc.x, rot = iMisc.y;
  vec2 c = position.xy;
  float cr = cos(rot), sr = sin(rot);
  vec2 rc = vec2(c.x * cr - c.y * sr, c.x * sr + c.y * cr);
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  mv.xy += rc * size;
  vUv = uv; vC = c * 2.0; vCol = iCol; vEmit = iEmit; vFrame = iMisc.z; vLit = iMisc.w;
  vFogDepth = -mv.z;
  vNearFade = clamp((-mv.z - size * 0.35) / max(size * 0.9, 0.01), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const FS = /* glsl */`
uniform sampler2D map; uniform float uAtlas; uniform vec3 uLightDir; uniform vec3 uLightCol; uniform vec3 uAmb;
uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; uniform float fogDensity; uniform float uFogMode;
varying vec2 vUv; varying vec2 vC; varying vec4 vCol; varying vec3 vEmit; varying float vFrame; varying float vFogDepth; varying float vNearFade; varying float vLit;
void main(){
  vec2 uv = vUv;
  if (uAtlas > 1.5) { float f = mod(vFrame, 4.0); uv = (uv + vec2(mod(f, 2.0), floor(f / 2.0))) * 0.5; }
  vec4 tx = texture2D(map, uv);
  float a = tx.a * vCol.a * vNearFade;
  if (a < 0.002) discard;
  float r2 = dot(vC, vC);
  vec3 nrm = normalize(vec3(vC * 0.9, sqrt(max(0.0, 1.0 - min(r2, 1.0))) + 0.25));
  float diff = clamp(dot(nrm, normalize(uLightDir)) * 0.6 + 0.45, 0.0, 1.0);
  vec3 lit = vCol.rgb * mix(vec3(1.0), uAmb + uLightCol * diff, vLit) * (0.75 + tx.r * 0.35);
  vec3 emit = vEmit * pow(tx.a, 1.4) * (0.6 + tx.r * 0.6);
  float fogF = 0.0;
  if (uFogMode > 0.5 && uFogMode < 1.5) fogF = smoothstep(fogNear, fogFar, vFogDepth);
  else if (uFogMode > 1.5) fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  lit = mix(lit, fogColor, fogF);
  emit *= 1.0 - fogF;
  gl_FragColor = vec4(lit * a + emit * vCol.a * vNearFade, a);
}`;

export class Billboards {
  constructor(max, opts = {}) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.misc = new Float32Array(max * 4); this.emit = new Float32Array(max * 3);
    const mk = (arr, n) => { const a = new THREE.InstancedBufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    g.setAttribute('iPos', mk(this.pos, 3)); g.setAttribute('iCol', mk(this.col, 4)); g.setAttribute('iMisc', mk(this.misc, 4)); g.setAttribute('iEmit', mk(this.emit, 3));
    g.instanceCount = 0;
    const additive = opts.additive;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS,
      uniforms: {
        map: { value: opts.map || puffAtlas() }, uAtlas: { value: opts.atlas ?? 4 }, uStretch: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) }, uLightCol: { value: new THREE.Color(1, 0.95, 0.9) }, uAmb: { value: new THREE.Color(0.35, 0.37, 0.42) },
        fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 }, fogDensity: { value: 0 }, uFogMode: { value: 0 },
      },
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 10;
    this.geo = g;
    this.n = 0;
    // scratch for sorting
    this.tmp = []; this.order = new Uint32Array(max); this.depth = new Float32Array(max);
    for (let i = 0; i < max; i++) this.tmp.push({ x: 0, y: 0, z: 0, s: 1, r: 0, cr: 1, cg: 1, cb: 1, a: 1, er: 0, eg: 0, eb: 0, f: 0, lit: 1 });
    this.mesh.onBeforeRender = (r, scene) => this._fog(scene);
  }
  _fog(scene) {
    const U = this.mat.uniforms, f = scene.fog;
    if (!f) { U.uFogMode.value = 0; return; }
    U.fogColor.value.copy(f.color);
    if (f.isFogExp2) { U.uFogMode.value = 2; U.fogDensity.value = f.density; }
    else { U.uFogMode.value = 1; U.fogNear.value = f.near; U.fogFar.value = f.far; }
  }
  setLight(dir, col, amb) {
    const U = this.mat.uniforms;
    if (dir) U.uLightDir.value.copy(dir);
    if (col) U.uLightCol.value.set(col);
    if (amb) U.uAmb.value.set(amb);
  }
  begin() { this.n = 0; }
  // returns a particle record to fill
  push() { if (this.n >= this.max) return null; return this.tmp[this.n++]; }
  // sort back-to-front for the camera and upload
  end(camera) {
    const n = this.n, T = this.tmp;
    const e = camera.matrixWorldInverse.elements;
    // light dir in view space
    const L = this.mat.uniforms.uLightDir.value;
    if (!this._lw) this._lw = L.clone();
    for (let i = 0; i < n; i++) {
      const p = T[i];
      this.depth[i] = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14];
      this.order[i] = i;
    }
    const ord = Array.prototype.slice.call(this.order, 0, n);
    const D = this.depth;
    ord.sort((a, b) => D[a] - D[b]);
    for (let k = 0; k < n; k++) {
      const p = T[ord[k]];
      this.pos[k * 3] = p.x; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z;
      this.col[k * 4] = p.cr; this.col[k * 4 + 1] = p.cg; this.col[k * 4 + 2] = p.cb; this.col[k * 4 + 3] = p.a;
      this.misc[k * 4] = p.s; this.misc[k * 4 + 1] = p.r; this.misc[k * 4 + 2] = p.f; this.misc[k * 4 + 3] = p.lit;
      this.emit[k * 3] = p.er; this.emit[k * 3 + 1] = p.eg; this.emit[k * 3 + 2] = p.eb;
    }
    this.geo.instanceCount = n;
    for (const k of ['iPos', 'iCol', 'iMisc', 'iEmit']) { const a = this.geo.attributes[k]; a.needsUpdate = true; a.clearUpdateRanges && a.clearUpdateRanges(); a.addUpdateRange && a.addUpdateRange(0, n * a.itemSize); }
  }
  // view-space light direction must be updated by owner each frame
  setViewLight(camera, worldDir) {
    const v = this.mat.uniforms.uLightDir.value.copy(worldDir).transformDirection(camera.matrixWorldInverse);
    return v;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

// ------------------------------------------------------------------------------------
// Emitters: all deterministic functions of time. Each writes particles into Billboards.
// ------------------------------------------------------------------------------------
const fireRamp = (x, out) => {
  // x: 0 (hot) .. 1 (cool) -> emissive rgb
  const r = lerp(9.0, 2.2, x), g = lerp(5.5, 0.45, Math.pow(x, 0.7)), b = lerp(2.2, 0.05, Math.pow(x, 0.5));
  out[0] = r; out[1] = g; out[2] = b; return out;
};
const _fr = [0, 0, 0];

// Continuous smoke plume. o: {pos:[x,y,z] | fn(i)->[x,y,z], spread:[sx,sy,sz], wind:[x,y,z], rise, life, rate, size:[s0,s1],
//   color:[r,g,b], dark, alpha, t0, fire (0..1 how much emissive near source), seed, growPow, turb}
export function smokePlume(bb, T, o) {
  const life = o.life ?? 30, count = o.count ?? 200;
  const interval = life / count;
  const t0 = o.t0 ?? -1e9;
  const seed = o.seed ?? 1;
  const intensity = o.intensity ?? 1;
  if (intensity <= 0) return;
  const wind = o.wind || [6, 0, -2], rise = o.rise ?? 8;
  const S0 = (o.size || [10, 120])[0], S1 = (o.size || [10, 120])[1];
  const col = o.color || [0.12, 0.11, 0.1];
  const startup = o.startup ?? 0;
  for (let i = 0; i < count; i++) {
    const phase = i * interval;
    const k = Math.floor((T - t0 - phase) / life);
    const age = T - t0 - phase - k * life;
    if (T - t0 - phase < 0) continue;
    if (age < 0 || age > life) continue;
    const birth = T - age;
    if (o.t1 != null && birth > o.t1) continue;
    const id = i + k * count + seed * 100003;
    const r1 = hash(id), r2 = hash(id + 11), r3 = hash(id + 23), r4 = hash(id + 37), r5 = hash(id + 51);
    const x = age / life;
    const src = typeof o.pos === 'function' ? o.pos(r1, r2, birth) : o.pos;
    const sp = o.spread || [10, 4, 10];
    const turb = o.turb ?? 1;
    const gp = o.growPow ?? 0.6;
    const riseAmt = rise * age * (1 - x * 0.35);
    const p = bb.push(); if (!p) return;
    const sideways = Math.pow(age, 1.15);
    p.x = src[0] + (r1 - 0.5) * sp[0] + wind[0] * sideways + Math.sin(age * 0.3 + r2 * 6) * turb * age * 0.4;
    p.y = src[1] + (r2 - 0.5) * sp[1] + riseAmt + wind[1] * age;
    p.z = src[2] + (r3 - 0.5) * sp[2] + wind[2] * sideways + Math.cos(age * 0.27 + r3 * 6) * turb * age * 0.4;
    p.s = (S0 + (S1 - S0) * Math.pow(x, gp)) * (0.7 + r4 * 0.6);
    p.r = r5 * 6.28 + age * (r1 - 0.5) * 0.15;
    const fadeIn = clamp(age / (life * 0.04 + 0.2)), fadeOut = 1 - Math.pow(x, 2.2);
    let su = 1;
    if (startup > 0) su = clamp((birth - t0) / startup);
    p.a = (o.alpha ?? 0.85) * fadeIn * fadeOut * intensity * (0.7 + 0.3 * r2) * su;
    const shade = 0.75 + r3 * 0.5;
    p.cr = col[0] * shade; p.cg = col[1] * shade; p.cb = col[2] * shade;
    const fire = (o.fire ?? 0) * clamp(1 - x * (o.fireFade ?? 9)) * (0.4 + r4 * 0.8);
    if (fire > 0) { fireRamp(clamp(x * 6 + r1 * 0.4), _fr); p.er = _fr[0] * fire; p.eg = _fr[1] * fire; p.eb = _fr[2] * fire; }
    else { p.er = p.eg = p.eb = 0; }
    p.f = Math.floor(r1 * 4); p.lit = o.lit ?? 1;
  }
}

// One-shot explosion fireball. o: {pos, dir:[x,y,z] (main ejection), t0, count, speed, spread (0..1 cone),
//  size:[s0,s1], life, drag, buoy, smokeCol, intensity}
export function fireball(bb, T, o) {
  const age0 = T - o.t0;
  if (age0 < 0) return;
  const count = o.count ?? 300, life = o.life ?? 9, seed = o.seed ?? 7;
  const dir = o.dir || [0, 0, 1];
  const drag = o.drag ?? 1.6, buoy = o.buoy ?? 3;
  const spd = o.speed ?? 60;
  const S = o.size || [6, 60];
  const sc = o.smokeCol || [0.09, 0.08, 0.075];
  for (let i = 0; i < count; i++) {
    const r1 = hash(i * 7 + seed), r2 = hash(i * 13 + seed + 1), r3 = hash(i * 17 + seed + 2), r4 = hash(i * 19 + seed + 3), r5 = hash(i * 23 + seed + 4);
    const delay = r5 * (o.spreadTime ?? 0.35);
    const age = age0 - delay;
    const L = life * (0.55 + r4 * 0.6);
    if (age < 0 || age > L) continue;
    // random direction biased toward dir
    const th = r1 * Math.PI * 2, cz = 1 - r2 * 2;
    const sz = Math.sqrt(1 - cz * cz);
    let dx = sz * Math.cos(th), dy = cz, dz = sz * Math.sin(th);
    const bias = o.bias ?? 0.65;
    dx = dx * (1 - bias) + dir[0] * bias; dy = dy * (1 - bias) + dir[1] * bias; dz = dz * (1 - bias) + dir[2] * bias;
    const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    const v = spd * (0.35 + r3 * 0.9);
    const travel = v * (1 - Math.exp(-drag * age)) / drag;
    const x = age / L;
    const p = bb.push(); if (!p) return;
    p.x = o.pos[0] + dx * travel + (o.wind ? o.wind[0] * age : 0);
    p.y = o.pos[1] + dy * travel + buoy * age * age * 0.5 * (0.5 + r1) + (o.wind ? o.wind[1] * age : 0);
    p.z = o.pos[2] + dz * travel + (o.wind ? o.wind[2] * age : 0);
    p.s = (S[0] + (S[1] - S[0]) * Math.pow(clamp(age / (L * 0.7)), 0.5)) * (0.6 + r4 * 0.8);
    p.r = r1 * 6.28 + age * (r2 - 0.5) * 0.4;
    const hot = clamp(1 - age / (o.hotTime ?? 1.6));
    p.a = (o.alpha ?? 0.95) * clamp(age / 0.05) * (1 - Math.pow(x, 1.8)) * (o.intensity ?? 1);
    // fire core then smoke
    const sm = clamp(age / ((o.hotTime ?? 1.6) * 1.2));
    p.cr = lerp(0.6, sc[0], sm); p.cg = lerp(0.25, sc[1], sm); p.cb = lerp(0.08, sc[2], sm);
    fireRamp(clamp(1 - hot + r3 * 0.25), _fr);
    const e = Math.pow(hot, 1.3) * (o.heat ?? 1.0) * (0.6 + r2 * 0.8);
    p.er = _fr[0] * e; p.eg = _fr[1] * e; p.eb = _fr[2] * e;
    p.f = Math.floor(r3 * 4); p.lit = 1;
  }
}

// Flames licking out of a region (short-lived additive-ish fire tongues). o: {pos:(r1,r2)->[x,y,z], count, height, size, t0, intensity}
export function flames(bb, T, o) {
  const count = o.count ?? 80, life = o.life ?? 1.6, seed = o.seed ?? 3;
  const intensity = o.intensity ?? 1;
  if (intensity <= 0 || T < (o.t0 ?? -1e9)) return;
  const interval = life / count;
  const t0 = o.t0 ?? 0;
  for (let i = 0; i < count; i++) {
    const k = Math.floor((T - t0 - i * interval) / life);
    const age = T - t0 - i * interval - k * life;
    if (T - t0 - i * interval < 0) continue;
    const id = i + k * count + seed * 7777;
    const r1 = hash(id), r2 = hash(id + 3), r3 = hash(id + 5), r4 = hash(id + 9);
    const src = o.pos(r1, r2);
    const x = age / life;
    const p = bb.push(); if (!p) return;
    const out = o.out || [0, 0, 0];
    p.x = src[0] + out[0] * age * (0.5 + r3) + Math.sin(age * 7 + r4 * 9) * 0.3;
    p.y = src[1] + (o.rise ?? 4) * age * (0.6 + r3 * 0.8);
    p.z = src[2] + out[2] * age * (0.5 + r3) + Math.cos(age * 6 + r1 * 9) * 0.3;
    p.s = (o.size ?? 5) * (0.5 + r4 * 0.8) * (0.6 + Math.sin(x * Math.PI) * 0.6);
    p.r = r2 * 6.28;
    p.a = Math.sin(x * Math.PI) * 0.9 * intensity;
    fireRamp(clamp(x * 1.1 + r3 * 0.2), _fr);
    const e = (1 - x) * 1.2 * intensity * (o.heat ?? 1);
    p.cr = 0.2; p.cg = 0.06; p.cb = 0.02;
    p.er = _fr[0] * e; p.eg = _fr[1] * e; p.eb = _fr[2] * e;
    p.f = Math.floor(r1 * 4); p.lit = 0;
  }
}

// Expanding dust cloud / pyroclastic flow. o: {center, t0, count, radius (fn of age), height, color, life, seed, dir}
export function dustCloud(bb, T, o) {
  const age0 = T - o.t0;
  if (age0 < 0) return;
  const count = o.count ?? 300, seed = o.seed ?? 21;
  const col = o.color || [0.62, 0.6, 0.56];
  for (let i = 0; i < count; i++) {
    const r1 = hash(i * 3 + seed), r2 = hash(i * 5 + seed + 1), r3 = hash(i * 7 + seed + 2), r4 = hash(i * 11 + seed + 3), r5 = hash(i * 13 + seed + 4);
    const delay = r5 * (o.spawn ?? 6);
    const age = age0 - delay;
    if (age < 0) continue;
    const ang = r1 * Math.PI * 2;
    const spd = (o.speed ?? 30) * (0.4 + r2 * 0.8);
    const dist = spd * (1 - Math.exp(-(o.drag ?? 0.12) * age)) / (o.drag ?? 0.12);
    let dx = Math.cos(ang), dz = Math.sin(ang);
    if (o.dir) { dx = dx * 0.5 + o.dir[0]; dz = dz * 0.5 + o.dir[2]; const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
    const p = bb.push(); if (!p) return;
    const srcY = typeof o.srcY === 'function' ? o.srcY(r3, T - age) : (o.center[1] + r3 * (o.height ?? 60));
    p.x = o.center[0] + dx * dist + (r4 - 0.5) * (o.jitter ?? 20);
    p.z = o.center[2] + dz * dist + (r3 - 0.5) * (o.jitter ?? 20);
    p.y = Math.max(o.floor ?? 0, srcY - (o.sink ?? 0) * age) + (o.rise ?? 2) * age * (0.3 + r2);
    p.s = ((o.size ?? [20, 90])[0] + ((o.size ?? [20, 90])[1] - (o.size ?? [20, 90])[0]) * clamp(Math.sqrt(age / (o.growT ?? 12)))) * (0.7 + r4 * 0.6);
    p.r = r2 * 6.28 + age * 0.03 * (r1 - 0.5);
    const lifeK = o.life ? clamp(1 - age / o.life) : 1;
    p.a = (o.alpha ?? 0.8) * clamp(age / 0.6) * lifeK * (0.7 + 0.3 * r1);
    const sh = 0.85 + r3 * 0.3;
    p.cr = col[0] * sh; p.cg = col[1] * sh; p.cb = col[2] * sh;
    p.er = p.eg = p.eb = 0;
    p.f = Math.floor(r4 * 4); p.lit = 1;
  }
}

// ------------------------------------------------------------------------------------
// Instanced chunk debris / falling papers (lit meshes, ballistic, deterministic).
// ------------------------------------------------------------------------------------
export class Chunks {
  constructor(max, geo, mat) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.max = max; this.dummy = new THREE.Object3D();
  }
  // o: {pos, t0, dir, speed, spread, g, count, size, spin, seed, life, kind:'debris'|'paper', wind}
  update(T, o) {
    const m = this.mesh, d = this.dummy;
    const age0 = T - o.t0;
    let n = 0;
    if (age0 >= 0) {
      const count = Math.min(this.max, o.count ?? this.max), seed = o.seed ?? 5;
      for (let i = 0; i < count; i++) {
        const r1 = hash(i * 3 + seed), r2 = hash(i * 7 + seed + 1), r3 = hash(i * 11 + seed + 2), r4 = hash(i * 13 + seed + 3), r5 = hash(i * 17 + seed + 4);
        const age = age0 - r5 * (o.spawn ?? 0.3);
        if (age < 0 || age > (o.life ?? 1e9)) continue;
        const th = r1 * Math.PI * 2, cz = 1 - r2 * 2, sz = Math.sqrt(1 - cz * cz);
        const bias = o.bias ?? 0.6, dir = o.dir || [0, 0, 1];
        let dx = sz * Math.cos(th) * (1 - bias) + dir[0] * bias, dy = cz * (1 - bias) + dir[1] * bias, dz = sz * Math.sin(th) * (1 - bias) + dir[2] * bias;
        const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
        const v = (o.speed ?? 40) * (0.3 + r3 * 0.9);
        let x, y, z;
        if (o.kind === 'paper') {
          // flutter: fast initial throw, then slow drift down with sway
          const drag = 1.2, tr = v * (1 - Math.exp(-drag * age)) / drag;
          const w = o.wind || [3, 0, 1];
          x = o.pos[0] + dx * tr + w[0] * age + Math.sin(age * (1 + r1) + r2 * 9) * 4;
          y = o.pos[1] + dy * tr - (o.fall ?? 1.2) * age + Math.sin(age * 2.1 + r3 * 7) * 0.8;
          z = o.pos[2] + dz * tr + w[2] * age + Math.cos(age * (1.3 + r2) + r1 * 9) * 4;
          d.rotation.set(age * (1 + r1 * 3), age * (0.5 + r2 * 2), age * (1 + r3 * 2));
        } else {
          const g = o.g ?? 9.8;
          x = o.pos[0] + dx * v * age; y = o.pos[1] + dy * v * age - 0.5 * g * age * age; z = o.pos[2] + dz * v * age;
          if (o.floor != null && y < o.floor) y = o.floor;
          d.rotation.set(age * (r1 - 0.5) * (o.spin ?? 8), age * (r2 - 0.5) * (o.spin ?? 8), age * (r3 - 0.5) * (o.spin ?? 8));
        }
        d.position.set(x, y, z);
        const s = (o.size ?? 1) * (0.4 + r4 * 1.2);
        d.scale.set(s, s * (o.kind === 'paper' ? 1 : 0.6 + r1), s * (o.kind === 'paper' ? 1.3 : 0.5 + r2));
        d.updateMatrix();
        m.setMatrixAt(n++, d.matrix);
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  }
}

// rain streaks around the camera (additive)
export function rain(bb, T, cam, o = {}) {
  const count = o.count ?? 900, R = o.radius ?? 40, H = o.height ?? 30, speed = o.speed ?? 22;
  const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
  for (let i = 0; i < count; i++) {
    const r1 = hash(i * 3 + 1), r2 = hash(i * 5 + 2), r3 = hash(i * 7 + 3);
    const p = bb.push(); if (!p) return;
    const yy = ((r3 * H - T * speed) % H + H) % H;
    p.x = cx + (r1 - 0.5) * R * 2 + (o.wind ?? 2) * (yy / H);
    p.z = cz + (r2 - 0.5) * R * 2;
    p.y = cy - H / 2 + yy;
    p.s = o.size ?? 0.5; p.r = 0;
    p.a = o.alpha ?? 0.25;
    p.cr = 0.6; p.cg = 0.65; p.cb = 0.75; p.er = 0.05; p.eg = 0.06; p.eb = 0.08; p.f = 0; p.lit = 0;
  }
}

export function sparkBillboards(max) { return new Billboards(max, { map: sparkTex(), atlas: 1, additive: true, renderOrder: 12 }); }

// Fireworks: bursts = [{t, pos:[x,y,z], color:[r,g,b], n, speed}]
export function fireworks(bb, T, bursts) {
  for (let b = 0; b < bursts.length; b++) {
    const B = bursts[b];
    const age0 = T - B.t;
    if (age0 < -1.2 || age0 > 4) continue;
    // rising trail
    if (age0 < 0) {
      const k = 1 + age0 / 1.2;
      const p = bb.push(); if (!p) return;
      p.x = B.pos[0]; p.y = B.pos[1] - (1 - k) * B.pos[1] * 0.6; p.z = B.pos[2]; p.s = 2.5; p.r = 0; p.a = 0.9;
      p.cr = p.cg = p.cb = 0; p.er = 4; p.eg = 3; p.eb = 2; p.f = 0; p.lit = 0;
      continue;
    }
    const n = B.n ?? 90, sp = B.speed ?? 40;
    for (let i = 0; i < n; i++) {
      const r1 = hash(i * 3 + b * 977), r2 = hash(i * 7 + b * 131);
      const th = r1 * Math.PI * 2, cz = r2 * 2 - 1, sz = Math.sqrt(1 - cz * cz);
      const v = sp * (0.85 + hash(i + b * 17) * 0.3);
      const tr = v * (1 - Math.exp(-1.6 * age0)) / 1.6;
      const fade = clamp(1 - age0 / 3.2);
      for (let k = 0; k < 3; k++) {
        const ag = Math.max(0, age0 - k * 0.06);
        const trk = v * (1 - Math.exp(-1.6 * ag)) / 1.6;
        const p = bb.push(); if (!p) return;
        p.x = B.pos[0] + sz * Math.cos(th) * trk; p.y = B.pos[1] + cz * trk - 4.9 * ag * ag * 0.35; p.z = B.pos[2] + sz * Math.sin(th) * trk;
        p.s = (k === 0 ? 2.6 : 1.8) * (B.size ?? 1); p.r = 0; p.a = fade * (k === 0 ? 1 : 0.5);
        const tw = 0.6 + 0.4 * Math.sin(T * 40 + i);
        p.cr = p.cg = p.cb = 0; p.er = B.color[0] * 6 * tw; p.eg = B.color[1] * 6 * tw; p.eb = B.color[2] * 6 * tw; p.f = 0; p.lit = 0;
      }
    }
  }
}

// jagged lightning bolt mesh (strip of quads facing +z), returns Mesh with emissive material
export function makeBolt(seed = 1, height = 1400) {
  const pts = [];
  let x = 0, y = height;
  const r = (k) => hash(seed * 1000 + k);
  for (let i = 0; i < 40; i++) { pts.push([x, y]); x += (r(i) - 0.5) * 70; y -= height / 40 * (0.6 + r(i + 50) * 0.8); }
  const pos = [], idx = [];
  pts.forEach(([px, py], i) => { const w = 3 + (1 - i / pts.length) * 4; pos.push(px - w, py, 0, px + w, py, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 7, 10), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.frustumCulled = false;
  return m;
}
