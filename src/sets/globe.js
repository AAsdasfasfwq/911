// Earth from orbit: procedural continents, day/night terminator with city lights,
// clouds, atmosphere glow, stars, animated great-circle arcs and pulsing markers.
import * as THREE from 'three';
import { BaseSet } from '../core/stage.js';
import { CONTINENTS, CITIES, US, lonLatToVec3 } from '../assets/geo.js';
import { canvasTex, cached, makeCanvas } from '../assets/textures.js';
import { rng, clamp, hash2, fbm2, E } from '../core/util.js';

const R = 100;

function drawPoly(g, poly, W, H) {
  g.beginPath();
  poly.forEach(([lon, lat], i) => { const x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath();
}

function earthTextures() {
  return cached('earthTex', () => {
    const W = 2048, H = 1024, NW = 4096, NH = 2048;
    // land mask
    const mask = makeCanvas(W, H); const mg = mask.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H); mg.fillStyle = '#fff';
    for (const k in CONTINENTS) { drawPoly(mg, CONTINENTS[k], W, H); mg.fill(); }
    const md = mg.getImageData(0, 0, W, H).data;
    // day texture
    const day = makeCanvas(W, H); const dg = day.getContext('2d');
    const img = dg.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      const lat = 90 - (y / H) * 180;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const land = md[i] > 127;
        const n = fbm2(x / 90, y / 90, 3, 4), n2 = fbm2(x / 20, y / 20, 9, 3);
        if (land) {
          const al = Math.abs(lat);
          // biome tint: deserts near 20-30, forest tropics/temperate, ice poles
          let r = 72, gg = 96, b = 52;
          const desert = Math.exp(-((al - 24) ** 2) / 60) * (0.6 + n);
          r = r + desert * 110; gg = gg + desert * 70; b = b + desert * 40;
          if (al > 62) { const ice = clamp((al - 62) / 10); r = r + (235 - r) * ice; gg = gg + (240 - gg) * ice; b = b + (245 - b) * ice; }
          const v = 0.85 + n * 0.3 + n2 * 0.15;
          d[i] = r * v; d[i + 1] = gg * v; d[i + 2] = b * v;
        } else {
          const v = 0.9 + n * 0.12;
          d[i] = 10 * v; d[i + 1] = 38 * v; d[i + 2] = 78 * v;
        }
        d[i + 3] = 255;
      }
    }
    dg.putImageData(img, 0, 0);
    // coast glow line
    dg.strokeStyle = 'rgba(60,120,150,0.5)'; dg.lineWidth = 3;
    for (const k in CONTINENTS) { drawPoly(dg, CONTINENTS[k], W, H); dg.stroke(); }
    // night lights
    const night = makeCanvas(NW, NH); const ng = night.getContext('2d');
    ng.fillStyle = '#000'; ng.fillRect(0, 0, NW, NH);
    const r = rng(42);
    for (let k = 0; k < 26000; k++) {
      const x = r() * NW, y = NH * 0.1 + r() * NH * 0.62;
      const i = (((y / 2) | 0) * W + ((x / 2) | 0)) * 4;
      if (md[i] < 127) continue;
      const lon = x / NW * 360 - 180, lat = 90 - y / NH * 180;
      let dens = 0.08;
      for (const c in CITIES) { const [cl, ca] = CITIES[c]; const dd = (cl - lon) ** 2 + (ca - lat) ** 2; dens += Math.exp(-dd / 30) * 1.2; }
      if (lon > -125 && lon < -67 && lat > 25 && lat < 49) dens += 0.5 * (lon > -100 ? 1 : 0.4);
      if (lon > -10 && lon < 40 && lat > 36 && lat < 60) dens += 0.6;
      if (lon > 100 && lon < 145 && lat > 20 && lat < 45) dens += 0.35;
      if (lon > 68 && lon < 90 && lat > 8 && lat < 32) dens += 0.4;
      if (r() > dens * 0.7) continue;
      const s = 0.8 + r() * 2.2;
      ng.fillStyle = `rgba(255,${190 + r() * 40 | 0},${110 + r() * 40 | 0},${0.35 + r() * 0.5})`;
      ng.fillRect(x, y, s, s);
    }
    for (const c in CITIES) { const [lon, lat] = CITIES[c]; const x = (lon + 180) / 360 * NW, y = (90 - lat) / 180 * NH; const gr = ng.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, 'rgba(255,220,150,0.9)'); gr.addColorStop(1, 'rgba(255,180,90,0)'); ng.fillStyle = gr; ng.fillRect(x - 16, y - 16, 32, 32); }
    // clouds
    const cl = makeCanvas(1024, 512); const cg = cl.getContext('2d'); const ci = cg.createImageData(1024, 512); const cd = ci.data;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) {
      const n = fbm2(x / 38, y / 22, 17, 6) * 0.5 + 0.5 + fbm2(x / 9, y / 6, 19, 3) * 0.12;
      const a = clamp((n - 0.6) * 2.6) * 0.85;
      const i = (y * 1024 + x) * 4; cd[i] = cd[i + 1] = cd[i + 2] = 255; cd[i + 3] = a * 255;
    }
    cg.putImageData(ci, 0, 0);
    const mk = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.userData.shared = true; return t; };
    return { day: mk(day), night: mk(night), clouds: mk(cl, false) };
  });
}

const EARTH_VS = /* glsl */`
varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = /* glsl */`
uniform sampler2D tDay; uniform sampler2D tNight; uniform vec3 sunDir; uniform float nightBoost; uniform float dayK; uniform vec3 camPos;
varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  float l = dot(n, normalize(sunDir));
  float dayF = smoothstep(-0.12, 0.25, l);
  vec3 day = texture2D(tDay, vUv).rgb;
  vec3 col = day * (0.04 + max(l, 0.0) * 1.6) * dayK;
  // specular glint on ocean
  vec3 v = normalize(camPos - vW);
  vec3 h = normalize(normalize(sunDir) + v);
  float ocean = step(day.b, day.r * 0.0 + 0.5) * step(day.r, 0.12);
  col += vec3(1.0, 0.9, 0.7) * pow(max(dot(n, h), 0.0), 80.0) * 0.8 * ocean * dayF;
  vec3 lights = texture2D(tNight, vUv).rgb * (1.0 - dayF) * nightBoost * 3.0;
  col += lights;
  // terminator warm band
  col += vec3(0.9, 0.35, 0.1) * exp(-pow(l * 7.0, 2.0)) * 0.12 * dayK;
  gl_FragColor = vec4(col, 1.0);
}`;
const ATMO_FS = /* glsl */`
uniform vec3 sunDir; uniform vec3 camPos; uniform float k;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(camPos - vW);
  float rim = pow(1.0 - abs(dot(n, v)), 3.0);
  float l = dot(n, normalize(sunDir));
  vec3 col = mix(vec3(0.08, 0.2, 0.6), vec3(0.35, 0.65, 1.2), smoothstep(-0.3, 0.6, l)) * rim * (0.25 + smoothstep(-0.4, 0.4, l));
  col += vec3(1.0, 0.45, 0.15) * rim * exp(-pow(l * 5.0, 2.0)) * 0.6;
  gl_FragColor = vec4(col * k, 1.0);
}`;

export class GlobeSet extends BaseSet {
  constructor(v) { super(v); this.near = 0.5; this.far = 5000; }
  build() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x000000);
    const tx = earthTextures();
    this.earthU = { tDay: { value: tx.day }, tNight: { value: tx.night }, sunDir: { value: new THREE.Vector3(1, 0.2, 0.4) }, nightBoost: { value: 1 }, dayK: { value: 1 }, camPos: { value: new THREE.Vector3() } };
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: this.earthU }));
    s.add(this.earth);
    this.cloudMat = new THREE.MeshStandardMaterial({ alphaMap: tx.clouds, transparent: true, color: 0xffffff, roughness: 1, depthWrite: false, opacity: 0.6 });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 48), this.cloudMat);
    s.add(this.clouds);
    this.atmoU = { sunDir: this.earthU.sunDir, camPos: this.earthU.camPos, k: { value: 1.4 } };
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 96, 48), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: ATMO_FS, uniforms: this.atmoU, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false }));
    s.add(this.atmo);
    this.atmo2 = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: ATMO_FS, uniforms: { ...this.atmoU, k: { value: 0.6 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.atmo2);
    this.sun = new THREE.DirectionalLight(0xfff4e8, 3); s.add(this.sun);
    s.add(new THREE.AmbientLight(0x223355, 0.15));
    // stars
    const r = rng(9), N = 6000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * rr * 2500, u * 2500, Math.sin(a) * rr * 2500], i * 3);
      const b = 0.4 + r() * 1.6, t = r();
      col.set([b * (0.85 + t * 0.15), b * 0.92, b * (1.0 + (1 - t) * 0.2)], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
    s.add(this.stars);
    this.fx = new THREE.Group(); this.earth.add(this.fx);
    this.post = { bloomStr: 0.8, vignette: 0.5, exposure: 1.0 };
  }
  reset() {
    while (this.fx.children.length) { const c = this.fx.children.pop(); c.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    this.arcs = []; this.markers = [];
    this.earth.rotation.set(0, 0, 0);
    this.earthU.nightBoost.value = 1; this.earthU.dayK.value = 1;
    this.setSun(1, 0.2, 0.4);
  }
  setSun(x, y, z) { this.earthU.sunDir.value.set(x, y, z).normalize(); this.sun.position.copy(this.earthU.sunDir.value).multiplyScalar(1000); }
  // world position of lon/lat on the (rotating) earth surface
  point(lon, lat, h = 0) { this.earth.updateMatrixWorld(); const p = new THREE.Vector3(...lonLatToVec3(lon, lat, R + h)); return this.earth.localToWorld(p); }
  // camera position looking at a lon/lat from distance d (world, assumes earth rotation applied)
  viewFrom(lon, lat, d) { return this.point(lon, lat, d); }

  addArc(a, b, o = {}) {
    const va = new THREE.Vector3(...lonLatToVec3(a[0], a[1], 1)), vb = new THREE.Vector3(...lonLatToVec3(b[0], b[1], 1));
    const pts = [];
    const ang = va.angleTo(vb);
    const lift = o.lift ?? Math.min(0.35, ang * 0.25);
    for (let i = 0; i <= 96; i++) {
      const t = i / 96;
      const v = new THREE.Vector3().copy(va).lerp(vb, t).normalize();
      // slerp-ish
      const q = new THREE.Quaternion().setFromUnitVectors(va, vb);
      const s = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), q, t);
      v.copy(va).applyQuaternion(s);
      v.multiplyScalar(R * (1.005 + Math.sin(t * Math.PI) * lift));
      pts.push(v);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 160, o.width ?? 0.35, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xff3020).multiplyScalar(o.intensity ?? 4), transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.geometry.setDrawRange(0, 0);
    this.fx.add(mesh);
    const arc = { mesh, curve, total: geo.index.count, set: (p) => { mesh.geometry.setDrawRange(0, Math.floor(clamp(p) * geo.index.count / 6) * 6); } };
    this.arcs.push(arc);
    return arc;
  }
  addMarker(lonlat, o = {}) {
    const g = new THREE.Group();
    const p = new THREE.Vector3(...lonLatToVec3(lonlat[0], lonlat[1], R * 1.003));
    g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2));
    const col = new THREE.Color(o.color ?? 0xff3020).multiplyScalar(o.intensity ?? 4);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(o.size ?? 0.8, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.25, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.add(dot, ring);
    this.fx.add(g);
    const m = { g, dot, ring, size: o.size ?? 0.8, set: (T, a = 1) => { const ph = (T * 0.8) % 1; const s = (o.size ?? 0.8) * (1.5 + ph * 5); ring.scale.setScalar(s); ring.material.opacity = (1 - ph) * a; dot.material.opacity = a; } };
    this.markers.push(m);
    return m;
  }
  late(ctx) {
    this.earthU.camPos.value.copy(ctx.cam.position);
    this.clouds.rotation.y = ctx.T * 0.004;
    this.stars.position.copy(ctx.cam.position);
  }
}
