// Shared PBR materials + procedural shader materials (city facades, WTC cladding, water).
import * as THREE from 'three';
import { cached, noiseTex, asphaltTex, concreteTex } from './textures.js';

export function std(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.7, metalness: o.m ?? 0.0, ...o.extra });
  if (o.map) m.map = o.map;
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
  if (o.side) m.side = o.side;
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 1; m.depthWrite = o.depthWrite ?? false; }
  if (o.flat) m.flatShading = true;
  return m;
}
// shared cached material by key
export function M(key, fn) {
  return cached('mat_' + key, () => { const m = fn(); m.userData.shared = true; return m; });
}

export const MAT = {
  skinTones: ['#f1c7a5', '#e0ac85', '#c98e66', '#a86f4c', '#7d4f35', '#f5d2b8'],
  glass: () => M('glass', () => new THREE.MeshPhysicalMaterial({ color: 0x8fb4c8, roughness: 0.05, metalness: 0.1, transmission: 0, transparent: true, opacity: 0.35, depthWrite: false, envMapIntensity: 1.5 })),
  darkGlass: () => M('darkGlass', () => new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.9 })),
  chrome: () => M('chrome', () => new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.15, metalness: 1 })),
  black: () => M('black', () => new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.6 })),
  rubber: () => M('rubber', () => new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 })),
  asphalt: () => M('asphalt', () => { const t = asphaltTex(); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, color: 0xffffff }); }),
  concrete: () => M('concrete', () => new THREE.MeshStandardMaterial({ map: concreteTex(), roughness: 0.9 })),
};

// ------------------------------------------------------------------------------------
// City building facade shader: windows are computed procedurally from world position,
// so one InstancedMesh renders thousands of buildings with per-instance style/colour.
// Includes analytic anti-aliasing (fades the pattern to its average when sub-pixel).
// ------------------------------------------------------------------------------------
export function cityMaterial(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, envMapIntensity: opts.envI ?? 1.0 });
  const U = { uNight: { value: opts.night ?? 0 }, uLit: { value: opts.lit ?? 0.35 }, uDust: { value: 0 }, uDustCol: { value: new THREE.Color(0x8a857c) }, uWarm: { value: new THREE.Color(1.0, 0.72, 0.42) } };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; flat varying float vInst; varying float vHgt;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wpI = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpI = instanceMatrix * wpI;
          vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
          vInst = float(gl_InstanceID);
          vHgt = instanceMatrix[1][1];
        #else
          vWN = normalize(mat3(modelMatrix) * objectNormal);
          vInst = 0.0; vHgt = 1.0;
        #endif
        vWP = (modelMatrix * wpI).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; flat varying float vInst; varying float vHgt;
        uniform float uNight; uniform float uLit; uniform float uDust; uniform vec3 uDustCol; uniform vec3 uWarm;
        float hb(float n){ return fract(sin(n * 127.1) * 43758.5453); }
        float hb2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float box(vec2 f, vec2 lo, vec2 hi, vec2 fw){
          vec2 a = smoothstep(lo - fw, lo + fw, f) * (1.0 - smoothstep(hi - fw, hi + fw, f));
          return a.x * a.y;
        }
        float gWin; float gLit; float gRoof; float gAO;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 n = normalize(vWN);
          float st = floor(hb(vInst + 0.37) * 5.0);
          gWin = 0.0; gLit = 0.0; gRoof = 0.0; gAO = 1.0;
          if (abs(n.y) < 0.5) {
            vec2 tg = normalize(vec2(-n.z, n.x));
            float u = dot(vWP.xz, tg) + hb(vInst) * 50.0;
            float v = vWP.y;
            float fh = st < 0.5 ? 3.9 : (st < 1.5 ? 3.4 : (st < 2.5 ? 3.6 : (st < 3.5 ? 3.2 : 4.2)));
            float cw = st < 0.5 ? 1.55 : (st < 1.5 ? 2.4 : (st < 2.5 ? 3.0 : (st < 3.5 ? 1.9 : 2.2)));
            vec2 cell = vec2(u / cw, v / fh);
            vec2 f = fract(cell); vec2 id = floor(cell);
            vec2 fw = fwidth(cell) * 0.75 + 1e-4;
            float w; float avg;
            if (st < 0.5) { w = box(f, vec2(0.06, 0.12), vec2(0.94, 0.97), fw); avg = 0.8; }
            else if (st < 1.5) { w = box(f, vec2(0.25, 0.32), vec2(0.75, 0.86), fw); avg = 0.27; }
            else if (st < 2.5) { w = box(f, vec2(0.0, 0.38), vec2(1.0, 0.82), fw) * (1.0 - box(f, vec2(-0.02, 0.0), vec2(0.03, 1.0), fw)); avg = 0.42; }
            else if (st < 3.5) { w = box(f, vec2(0.3, 0.28), vec2(0.7, 0.8), fw); avg = 0.21; }
            else { w = box(f, vec2(0.12, 0.2), vec2(0.88, 0.9), fw) * (1.0 - box(f, vec2(0.48, 0.0), vec2(0.52, 1.0), fw)); avg = 0.62; }
            float lod = smoothstep(0.25, 0.7, max(fw.x, fw.y));
            w = mix(w, avg, lod);
            // storefront band
            if (v < 4.5) { w = box(vec2(fract(u / 7.0), v / 4.5), vec2(0.08, 0.05), vec2(0.92, 0.8), fwidth(vec2(u / 7.0, v / 4.5))) * 0.9; }
            gWin = w;
            float lr = hb2(id + vec2(vInst * 3.17, vInst * 1.13));
            float floorLit = hb2(vec2(id.y, vInst));
            gLit = step(1.0 - uLit * (0.4 + floorLit), lr) * (1.0 - lod * 0.7) + lod * uLit * 0.28;
            gLit *= step(4.5, v);
            vec3 wall = diffuseColor.rgb;
            wall *= 0.92 + 0.08 * step(0.5, fract(v / fh * 0.5 + 0.25));
            vec3 glass = st < 0.5 ? diffuseColor.rgb * 0.35 + vec3(0.02, 0.05, 0.07) : vec3(0.035, 0.045, 0.055);
            diffuseColor.rgb = mix(wall, glass, w);
            gAO = mix(0.55, 1.0, smoothstep(0.0, 14.0, v));
            diffuseColor.rgb *= gAO;
          } else {
            gRoof = 1.0;
            float nn = hb2(floor(vWP.xz * 0.5));
            diffuseColor.rgb = mix(vec3(0.28, 0.28, 0.27), vec3(0.36, 0.35, 0.33), nn) * (0.8 + 0.2 * hb(vInst));
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, uDustCol, uDust * (0.55 + 0.45 * gRoof));
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, gWin * (1.0 - uDust));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.75, gWin * (1.0 - uDust));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uWarm * gWin * gLit * uNight * 1.5 * (0.5 + 0.9 * hb(vInst * 7.0));`);
  };
  m.customProgramCacheKey = () => 'city_v3';
  return m;
}

// ------------------------------------------------------------------------------------
// WTC Twin Tower cladding: dense aluminium columns with narrow window slits, mechanical
// floor bands, base arches. Damage (impact gash, soot, internal fire) and collapse
// clipping are driven by uniforms.
// Tower local frame: x,z in [-31.7, 31.7], y in [0, 417]. Faces: +z, -z, +x, -x.
// ------------------------------------------------------------------------------------
export function towerMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xdcdcda, roughness: 0.42, metalness: 0.6, envMapIntensity: 0.8 });
  const U = {
    uNight: { value: 0 }, uLit: { value: 0.3 }, uTime: { value: 0 },
    uDmg: { value: 0 }, uDmgFace: { value: new THREE.Vector4(0, 0, 1, 0) }, // face normal xz in .xy, gash centre-u in .z(unused), seed .w
    uDmgC: { value: new THREE.Vector4(0, 360, 26, 12) }, // centre u, centre y, half width, half height
    uDmgTilt: { value: 0.18 },
    uSoot: { value: 0 }, uClip: { value: 1e5 }, uClipLo: { value: -1e5 }, uDust: { value: 0 }, uFire: { value: 1 },
    uDmg2: { value: 0 }, uDmg2Face: { value: new THREE.Vector4(0, 0, -1, 0) }, uDmg2C: { value: new THREE.Vector4(0, 350, 26, 12) },
  };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLP; varying vec3 vLN;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vLP = transformed; vLN = objectNormal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLP; varying vec3 vLN;
        uniform float uNight; uniform float uLit; uniform float uTime; uniform float uDmg; uniform vec4 uDmgFace; uniform vec4 uDmgC; uniform float uDmgTilt;
        uniform float uSoot; uniform float uClip; uniform float uClipLo; uniform float uDust; uniform float uFire;
        uniform float uDmg2; uniform vec4 uDmg2Face; uniform vec4 uDmg2C;
        float th(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float tn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(th(i), th(i+vec2(1,0)), u.x), mix(th(i+vec2(0,1)), th(i+vec2(1,1)), u.x), u.y); }
        float tfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += tn(p)*a; p *= 2.02; a *= 0.5; } return s; }
        float gW; float gL; float gHole; float gEdge; float gSootM;
        // gash mask: airplane-shaped hole (wings slanted) in facade coords (u along face, y)
        float gash(vec2 q, vec4 C, float tilt, float seed){
          vec2 d = q - C.xy;
          d.y -= d.x * tilt;
          float body = smoothstep(1.0, 0.75, length(d / vec2(C.w * 0.9, C.w * 1.3)));
          float wing = smoothstep(1.0, 0.8, abs(d.y) / (C.w * 0.32 * (1.0 - 0.55 * abs(d.x) / C.z))) * step(abs(d.x), C.z);
          float m = max(body, wing);
          float n = tfbm(q * 0.18 + seed);
          return clamp(m + (n - 0.5) * 0.9 * m, 0.0, 1.0);
        }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vLP.y > uClip || vLP.y < uClipLo) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 n = normalize(vLN);
          gW = 0.0; gL = 0.0; gHole = 0.0; gEdge = 0.0; gSootM = 0.0;
          float u; vec2 nf = vec2(0.0);
          if (abs(n.y) < 0.5) {
            nf = normalize(n.xz);
            u = dot(vLP.xz, vec2(-nf.y, nf.x));
            float v = vLP.y;
            float fh = 3.79;
            vec2 cell = vec2((u + 40.0) / 1.02, v / fh);
            vec2 f = fract(cell); vec2 id = floor(cell);
            vec2 fw = fwidth(cell) * 0.8 + 1e-4;
            float wx = smoothstep(0.30 - fw.x, 0.30 + fw.x, f.x) * (1.0 - smoothstep(0.86 - fw.x, 0.86 + fw.x, f.x));
            float wy = smoothstep(0.18 - fw.y, 0.18 + fw.y, f.y) * (1.0 - smoothstep(0.80 - fw.y, 0.80 + fw.y, f.y));
            float w = wx * wy;
            float lod = smoothstep(0.3, 0.8, fw.x);
            w = mix(w, 0.34, lod);
            float floorN = floor(v / fh);
            // mechanical floors (louvres) and lobby arches
            float mech = (step(40.0, floorN) * step(floorN, 41.0) + step(74.0, floorN) * step(floorN, 75.0) + step(107.0, floorN) * step(floorN, 109.0));
            w *= 1.0 - mech * 0.8;
            if (v < 30.0) { float ax = fract((u + 40.0) / 3.06); w = smoothstep(0.08, 0.12, ax) * (1.0 - smoothstep(0.88, 0.92, ax)) * smoothstep(0.0, 1.0, v) * (1.0 - smoothstep(27.0, 30.0, v)) * 0.9; }
            gW = w;
            float lr = th(id + floorN * 0.0173);
            gL = step(1.0 - uLit, lr) * (1.0 - lod * 0.5) + lod * uLit * 0.45;
            vec3 clad = diffuseColor.rgb * (0.94 + 0.06 * th(vec2(id.x, 7.0)));
            clad *= 1.0 - mech * 0.25;
            vec3 glass = vec3(0.025, 0.03, 0.04);
            diffuseColor.rgb = mix(clad, glass, w);
            // damage
            if (uDmg > 0.0 && dot(nf, uDmgFace.xy) > 0.7) {
              float h = gash(vec2(u, v), uDmgC, uDmgTilt, uDmgFace.w) * uDmg;
              gHole = max(gHole, h);
              float near = gash(vec2(u, v), uDmgC * vec4(1.0, 1.0, 1.35, 1.6), uDmgTilt, uDmgFace.w + 3.0) * uDmg;
              gEdge = max(gEdge, clamp(near - h, 0.0, 1.0));
            }
            if (uDmg2 > 0.0 && dot(nf, uDmg2Face.xy) > 0.7) {
              float h = gash(vec2(u, v), uDmg2C, -uDmgTilt * 1.4, uDmg2Face.w) * uDmg2;
              gHole = max(gHole, h);
              float near = gash(vec2(u, v), uDmg2C * vec4(1.0, 1.0, 1.35, 1.6), -uDmgTilt * 1.4, uDmg2Face.w + 3.0) * uDmg2;
              gEdge = max(gEdge, clamp(near - h, 0.0, 1.0));
            }
            // soot streaks above impact zones (all faces near damage height)
            float top = max(uDmgC.y * step(0.01, uDmg), uDmg2C.y * step(0.01, uDmg2));
            if (uSoot > 0.0) {
              float above = smoothstep(top - 30.0, top - 8.0, v) * (1.0 - smoothstep(top + 10.0, top + 70.0, v));
              float streak = tfbm(vec2(u * 0.12, v * 0.015 - uTime * 0.02)) ;
              gSootM = clamp(above * (0.4 + streak) * uSoot, 0.0, 0.92);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.028, 0.026), gSootM);
            }
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.012, 0.008), gHole);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.04, 0.035), gEdge * 0.85);
          } else {
            diffuseColor.rgb = vec3(0.32, 0.32, 0.33);
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.53, 0.5), uDust);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.08, gW);
        roughnessFactor = mix(roughnessFactor, 0.95, max(max(gHole, gEdge), max(gSootM, uDust)));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.0, max(max(gHole, gEdge), max(gSootM, uDust)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.5) * gW * gL * uNight * 1.6;
        if (gHole + gEdge > 0.0) {
          vec2 q = vec2(vLP.x + vLP.z, vLP.y);
          float fl = tfbm(q * 0.25 + vec2(0.0, -uTime * 1.8)) * tfbm(q * 0.6 + vec2(uTime * 0.7, -uTime * 2.6));
          float fire = smoothstep(0.08, 0.5, fl);
          vec3 fc = mix(vec3(1.6, 0.25, 0.03), vec3(5.0, 2.2, 0.5), fire);
          totalEmissiveRadiance += fc * fire * uFire * (gHole * 1.4 + gEdge * 0.8);
        }`);
  };
  m.customProgramCacheKey = () => 'wtc_v4';
  return m;
}

// Animated water (river / harbour / pools)
export function waterMaterial(color = 0x1c3a4a, o = {}) {
  const nt = noiseTex(256, 8, 77, 5, true).clone();
  nt.userData.shared = false;
  nt.needsUpdate = true;
  nt.repeat.set(o.rep ?? 60, o.rep ?? 60);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.12, metalness: 0.1, envMapIntensity: o.envI ?? 1.2 });
  m.bumpMap = nt; m.bumpScale = o.bump ?? 0.6;
  m.userData.tick = (t) => { nt.offset.set(t * 0.004, t * 0.006); };
  return m;
}
