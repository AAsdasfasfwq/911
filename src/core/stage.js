// Sky dome, environment lighting (PMREM), sun rigs and base class for sets.
import * as THREE from 'three';

const SKY_VS = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FS = /* glsl */`
uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunCol;
uniform float sunSize; uniform float sunGlow; uniform float cloudCov; uniform float cloudScale; uniform float time;
uniform vec3 cloudCol; uniform vec3 cloudShade; uniform float stars; uniform float hazeH; uniform vec3 hazeCol; uniform float cloudSpeed;
uniform float flash; uniform float bright;
varying vec3 vDir;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += n2(p)*a; p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.5));
  col = mix(col, hazeCol, (1.0 - smoothstep(0.0, hazeH, abs(y))) * 0.85);
  col = mix(col, ground, smoothstep(0.0, -0.12, y));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += sunCol * (smoothstep(1.0 - 0.00004 * sunSize, 1.0 - 0.00001 * sunSize, sd) * 30.0 + pow(sd, 12.0) * sunGlow * 0.5 + pow(sd, 3.0) * sunGlow * 0.12);
  if (cloudCov > 0.0 && y > -0.02) {
    vec2 p = d.xz / (max(y, 0.0) + 0.12) * cloudScale + time * cloudSpeed * vec2(0.6, 0.25);
    float n = fbm(p);
    float c = smoothstep(1.0 - cloudCov, 1.0 - cloudCov + 0.3, n) * smoothstep(-0.02, 0.15, y);
    float n2v = fbm(p * 1.7 + 3.1);
    vec3 cc = mix(cloudShade, cloudCol, smoothstep(0.3, 0.8, n2v)) + sunCol * pow(sd, 5.0) * 0.5;
    col = mix(col, cc, c * 0.95);
  }
  if (stars > 0.0 && y > 0.0) {
    vec2 sp = d.xz / (y + 0.3) * 260.0;
    float s = step(0.9975, h21(floor(sp))) * smoothstep(0.0, 0.3, y);
    col += vec3(s) * stars * (0.6 + 0.4 * sin(time * 3.0 + h21(floor(sp)) * 40.0));
  }
  col += vec3(0.7, 0.75, 1.0) * flash;
  gl_FragColor = vec4(col * bright, 1.0);
}`;

export const SKY_PRESETS = {
  day: { zenith: '#2f6fd6', horizon: '#a9cdf2', ground: '#4a4f55', hazeCol: '#cfe2f5', hazeH: 0.12, sunCol: '#fff3dc', sunDir: [0.45, 0.62, 0.35], sunSize: 1, sunGlow: 0.8, cloudCov: 0.0, cloudScale: 1.2, cloudCol: '#ffffff', cloudShade: '#9fb0c8', stars: 0 },
  severeClear: { zenith: '#1d5fd8', horizon: '#8fc0f2', ground: '#4a4f55', hazeCol: '#c8e0f8', hazeH: 0.08, sunCol: '#fff6e6', sunDir: [0.65, 0.42, 0.25], sunSize: 1, sunGlow: 1.0, cloudCov: 0.0, cloudScale: 1.2, cloudCol: '#ffffff', cloudShade: '#a8b8d0', stars: 0 },
  dawn: { zenith: '#2a4e9a', horizon: '#ffb27a', ground: '#3a3330', hazeCol: '#ffcf9e', hazeH: 0.1, sunCol: '#ffd2a0', sunDir: [0.9, 0.12, 0.2], sunSize: 1.4, sunGlow: 2.2, cloudCov: 0.35, cloudScale: 0.9, cloudCol: '#ffd7b8', cloudShade: '#7a6a8a', stars: 0 },
  golden: { zenith: '#3768b8', horizon: '#ffc58a', ground: '#4a3d33', hazeCol: '#ffd9a8', hazeH: 0.12, sunCol: '#ffcf8a', sunDir: [-0.7, 0.18, 0.4], sunSize: 1.3, sunGlow: 1.8, cloudCov: 0.25, cloudScale: 0.8, cloudCol: '#fff0d8', cloudShade: '#a08c90', stars: 0 },
  dusk: { zenith: '#141c3a', horizon: '#c0607a', ground: '#191a20', hazeCol: '#d98a7a', hazeH: 0.1, sunCol: '#ff8a5a', sunDir: [-0.9, 0.03, 0.3], sunSize: 1.5, sunGlow: 1.6, cloudCov: 0.3, cloudScale: 0.8, cloudCol: '#ff9a8a', cloudShade: '#3a2a4a', stars: 0.2 },
  night: { zenith: '#03060f', horizon: '#14203a', ground: '#06070a', hazeCol: '#1f2a44', hazeH: 0.1, sunCol: '#8aa0ff', sunDir: [0.3, 0.5, -0.6], sunSize: 0.6, sunGlow: 0.05, cloudCov: 0.0, cloudScale: 1, cloudCol: '#203048', cloudShade: '#0a0f18', stars: 0.9 },
  storm: { zenith: '#1b2230', horizon: '#3c4656', ground: '#0c0e12', hazeCol: '#3a4352', hazeH: 0.15, sunCol: '#6070a0', sunDir: [0.2, 0.6, 0.3], sunSize: 0.1, sunGlow: 0.0, cloudCov: 0.95, cloudScale: 0.7, cloudCol: '#4a5466', cloudShade: '#141820', stars: 0 },
  desert: { zenith: '#3f7fd0', horizon: '#e9d2a8', ground: '#a4865e', hazeCol: '#f0dcb4', hazeH: 0.14, sunCol: '#fff0d0', sunDir: [0.5, 0.55, 0.3], sunSize: 1.2, sunGlow: 1.0, cloudCov: 0.0, cloudScale: 1, cloudCol: '#ffffff', cloudShade: '#c8b8a0', stars: 0 },
  smoke: { zenith: '#5a5650', horizon: '#9a8f80', ground: '#3a3632', hazeCol: '#a89c8a', hazeH: 0.3, sunCol: '#ffcf9a', sunDir: [0.5, 0.5, 0.3], sunSize: 0.4, sunGlow: 0.6, cloudCov: 0.0, cloudScale: 1, cloudCol: '#ffffff', cloudShade: '#888', stars: 0 },
  dust: { zenith: '#6e6a62', horizon: '#9c968a', ground: '#55524c', hazeCol: '#a7a296', hazeH: 0.6, sunCol: '#e8dcc0', sunDir: [0.4, 0.6, 0.3], sunSize: 0.0, sunGlow: 0.25, cloudCov: 0.0, cloudScale: 1, cloudCol: '#ffffff', cloudShade: '#888', stars: 0 },
  overcast: { zenith: '#6f7c8c', horizon: '#aab4c0', ground: '#3a3d42', hazeCol: '#b6bfca', hazeH: 0.2, sunCol: '#d8dde8', sunDir: [0.3, 0.7, 0.3], sunSize: 0.0, sunGlow: 0.2, cloudCov: 0.85, cloudScale: 0.6, cloudCol: '#c4cad4', cloudShade: '#6c7380', stars: 0 },
  nvg: { zenith: '#020403', horizon: '#0a120c', ground: '#030403', hazeCol: '#0c160f', hazeH: 0.1, sunCol: '#8aa0ff', sunDir: [0.3, 0.5, -0.6], sunSize: 0, sunGlow: 0, cloudCov: 0.0, cloudScale: 1, cloudCol: '#203048', cloudShade: '#0a0f18', stars: 1.4 },
};

export function makeSky(preset = 'day', radius = 15000) {
  const geo = new THREE.SphereGeometry(radius, 48, 24);
  const U = {
    zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
    hazeCol: { value: new THREE.Color() }, hazeH: { value: 0.1 },
    sunDir: { value: new THREE.Vector3(0.4, 0.6, 0.3) }, sunCol: { value: new THREE.Color() }, sunSize: { value: 1 }, sunGlow: { value: 1 },
    cloudCov: { value: 0 }, cloudScale: { value: 1 }, time: { value: 0 }, cloudCol: { value: new THREE.Color() }, cloudShade: { value: new THREE.Color() },
    stars: { value: 0 }, cloudSpeed: { value: 0.02 }, flash: { value: 0 }, bright: { value: 1 },
  };
  const m = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.userData.setPreset = (p) => applySky(mesh, p);
  applySky(mesh, preset);
  return mesh;
}

export function applySky(mesh, p) {
  const P = typeof p === 'string' ? SKY_PRESETS[p] : p;
  const U = mesh.material.uniforms;
  for (const k of ['zenith', 'horizon', 'ground', 'hazeCol', 'sunCol', 'cloudCol', 'cloudShade']) if (P[k]) U[k].value.set(P[k]);
  for (const k of ['hazeH', 'sunSize', 'sunGlow', 'cloudCov', 'cloudScale', 'stars', 'cloudSpeed', 'bright']) if (P[k] != null) U[k].value = P[k];
  if (P.sunDir) U.sunDir.value.set(...P.sunDir).normalize();
  mesh.userData.preset = P;
}

export function skyPreset(name, over = {}) { return { ...SKY_PRESETS[name], ...over }; }

// Prefiltered environment map from a sky preset (+ optional extra objects like a ground disc).
const envCache = new Map();
export function envFromSky(renderer, preset, key) {
  key = key || (typeof preset === 'string' ? preset : JSON.stringify(preset));
  if (envCache.has(key)) return envCache.get(key);
  const sc = new THREE.Scene();
  const sky = makeSky(preset, 100);
  sky.material.uniforms.cloudCov.value *= 0.6;
  sc.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, 0, 0.1, 500);
  pm.dispose();
  sky.geometry.dispose(); sky.material.dispose();
  envCache.set(key, rt.texture);
  return rt.texture;
}

export function envRoom(renderer, key = 'room', opts = {}) {
  if (envCache.has(key)) return envCache.get(key);
  const sc = new THREE.Scene();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicMaterial({ color: opts.wall || 0x6a625a, side: THREE.BackSide }));
  sc.add(room);
  const lamp = (x, y, z, sx, sy, sz, c, i) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); sc.add(m); };
  lamp(0, 3.9, 0, 6, 0.1, 2, opts.ceiling || 0xfff2dd, opts.ceilI ?? 6);
  lamp(-9.9, 1.5, 0, 0.1, 3, 8, opts.window || 0xcfe4ff, opts.winI ?? 4);
  lamp(9.9, 1.0, 3, 0.1, 2, 3, opts.side || 0xffc890, opts.sideI ?? 2);
  lamp(0, -3.9, 0, 18, 0.1, 18, opts.floor || 0x3a302a, 1);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, 0.02);
  pm.dispose();
  envCache.set(key, rt.texture);
  return rt.texture;
}

export function sunLight(color, intensity, dir, opts = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(dir[0], dir[1], dir[2]).normalize().multiplyScalar(opts.dist || 1000);
  l.castShadow = opts.shadow !== false;
  if (l.castShadow) {
    l.shadow.mapSize.set(opts.mapSize || 2048, opts.mapSize || 2048);
    const s = opts.size || 200;
    Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: (opts.dist || 1000) * 2.5 });
    l.shadow.bias = opts.bias ?? -0.0004;
    l.shadow.normalBias = opts.normalBias ?? 0.6;
    l.shadow.radius = opts.radius ?? 3;
  }
  l.userData.dir = new THREE.Vector3(...dir).normalize();
  l.userData.dist = opts.dist || 1000;
  return l;
}

// Point the sun's shadow frustum at a focus area (keeps shadows crisp for every framing).
export function focusSun(l, center, size, dist) {
  dist = dist || l.userData.dist;
  const d = l.userData.dir;
  l.position.set(center[0] + d.x * dist, center[1] + d.y * dist, center[2] + d.z * dist);
  l.target.position.set(center[0], center[1], center[2]);
  l.target.updateMatrixWorld();
  if (l.castShadow) {
    const c = l.shadow.camera;
    c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = Math.max(1, dist - size * 3); c.far = dist + size * 3;
    c.updateProjectionMatrix();
  }
}

export class BaseSet {
  constructor(variant) { this.variant = variant; this.post = {}; this.near = 0.3; this.far = 12000; this.owned = []; }
  build() {}
  reset() {}
  update() {}
  own(o) { this.owned.push(o); return o; }
  dispose() {
    if (!this.scene) return;
    this.scene.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) {
        if (m.userData.shared) continue;
        for (const k in m) { const v = m[k]; if (v && v.isTexture && !v.userData.shared) v.dispose(); }
        m.dispose();
      }
    });
    for (const o of this.owned) o.dispose && o.dispose();
    this.scene = null;
  }
}
