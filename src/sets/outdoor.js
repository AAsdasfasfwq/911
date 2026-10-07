// Shared outdoor base: sky dome, sun with focused shadows, bounce fill, fog, env map,
// heightfield terrain, particle FX layers.
import * as THREE from 'three';
import { BaseSet, makeSky, applySky, SKY_PRESETS, envFromSky, sunLight, focusSun, skyPreset } from '../core/stage.js';
import { Billboards, sparkBillboards, Chunks } from '../fx/particles.js';
import { fbm2, ridged2, clamp, lerp } from '../core/util.js';
import { canvasTex, cached, pixels } from '../assets/textures.js';
import { M, std } from '../assets/materials.js';

export class OutdoorSet extends BaseSet {
  constructor(v) { super(v); this.near = 0.5; this.far = 20000; }
  baseBuild(r, o = {}) {
    const s = (this.scene = new THREE.Scene());
    this.skyName = o.sky || 'day';
    this.sky = makeSky(o.sky || 'day', 15000);
    s.add(this.sky);
    this.sun = sunLight(o.sunCol ?? 0xfff2e0, o.sunI ?? 3, SKY_PRESETS[o.sky || 'day'].sunDir, { size: o.shadowSize ?? 120, mapSize: o.mapSize ?? 4096, dist: 1500, bias: -0.0003, normalBias: 0.5 });
    s.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(o.hemiSky ?? 0xbcd6ff, o.hemiGround ?? 0x6a5a48, o.hemiI ?? 0.6);
    s.add(this.hemi);
    this.fill = new THREE.DirectionalLight(o.sunCol ?? 0xfff2e0, (o.sunI ?? 3) * 0.22);
    const sd = SKY_PRESETS[o.sky || 'day'].sunDir;
    this.fill.position.set(-sd[0], 0.4, -sd[2]).multiplyScalar(100);
    s.add(this.fill, this.fill.target);
    s.fog = o.fogExp ? new THREE.FogExp2(o.fog ?? 0xcfe2f5, o.fogExp) : new THREE.Fog(o.fog ?? 0xcfe2f5, o.fogNear ?? 200, o.fogFar ?? 6000);
    s.environment = envFromSky(r, o.sky || 'day');
    s.environmentIntensity = o.envI ?? 1;
    this.bb = new Billboards(o.particles ?? 2400); s.add(this.bb.mesh);
    this.sparks = sparkBillboards(o.sparks ?? 1500); s.add(this.sparks.mesh);
    this.bb.setLight(null, o.sunCol ?? 0xfff2e0, new THREE.Color(o.hemiSky ?? 0xbcd6ff).multiplyScalar(0.55));
    this.focus = o.focus || [0, 0, 0]; this.focusSize = o.shadowSize ?? 120;
    this.fx = [];
    this.sparkFx = [];
    this.extras = new THREE.Group(); s.add(this.extras);
  }
  reset() { this.clearExtras(); }
  clearExtras() {
    if (!this.extras) return;
    while (this.extras.children.length) {
      const c = this.extras.children.pop();
      c.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) if (!m.userData.shared) m.dispose(); });
    }
  }
  addExtra(o) { this.extras.add(o); return o; }
  setSky(name, over) {
    const P = over ? skyPreset(name, over) : name;
    applySky(this.sky, P);
    const sp = typeof P === 'string' ? SKY_PRESETS[P] : P;
    this.sun.userData.dir.set(...sp.sunDir).normalize();
    this.scene.environment = envFromSky(this.renderer, P, typeof P === 'string' ? P : JSON.stringify(P));
  }
  baseUpdate(ctx) { this.fx.length = 0; this.sparkFx.length = 0; }
  baseLate(ctx) {
    const cam = ctx.cam;
    this.sky.position.copy(cam.position);
    this.sky.material.uniforms.time.value = ctx.T;
    focusSun(this.sun, this.focus, this.focusSize, 1500);
    this.bb.begin(); this.bb.setViewLight(cam, this.sun.userData.dir);
    for (const f of this.fx) f(this.bb, ctx.T, cam);
    this.bb.end(cam);
    this.sparks.begin();
    for (const f of this.sparkFx) f(this.sparks, ctx.T, cam);
    this.sparks.end(cam);
  }
  update(ctx) { this.baseUpdate(ctx); }
  late(ctx) { this.baseLate(ctx); }
  dispose() { super.dispose(); this.bb.dispose(); this.sparks.dispose(); }
}

// Heightfield terrain. o: {size, seg, height(x,z)->y, colors: fn(x,z,y,slope)->[r,g,b] (0..1), tex, texRep}
export function terrain(o) {
  const size = o.size ?? 2000, seg = o.seg ?? 256;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, o.height(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  if (o.colors) {
    const n = geo.attributes.normal; const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const c = o.colors(p.getX(i), p.getZ(i), p.getY(i), 1 - n.getY(i)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: !!o.colors, roughness: o.rough ?? 0.95, color: 0xffffff });
  if (o.tex) { mat.map = o.tex; mat.map.repeat.set(o.texRep ?? 80, o.texRep ?? 80); }
  if (o.bump) { mat.bumpMap = o.bump; mat.bumpScale = o.bumpScale ?? 1; }
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true; m.castShadow = !!o.cast;
  m.userData.height = o.height;
  return m;
}

