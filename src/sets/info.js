// Infographic studio (2.5D): a backdrop wall the 3D props float in front of, with soft
// drop shadows (editorial "paper" look), a dark variant and a deep-red variant.
// Visible area at z=0 is 32 x 18 units with the default camera.
import * as THREE from 'three';
import { BaseSet, envRoom, sunLight, focusSun } from '../core/stage.js';
import { canvasTex, cached, pixels, makeCanvas } from '../assets/textures.js';
import { hash2, fbm2, clamp } from '../core/util.js';

const BG = {
  paper: { base: [236, 233, 227], spot: 1.0, light: 2.4, amb: 0.95, shadow: 0.45 },
  dark: { base: [18, 18, 21], spot: 1.0, light: 2.2, amb: 0.45, shadow: 0.7 },
  red: { base: [120, 12, 16], spot: 1.0, light: 2.4, amb: 0.6, shadow: 0.6 },
  blue: { base: [16, 26, 44], spot: 1.0, light: 2.2, amb: 0.5, shadow: 0.6 },
};

function bgTex(kind) {
  return cached('infoBg_' + kind, () => canvasTex(1024, 576, (g, w, h) => {
    const b = BG[kind].base;
    pixels(g, w, h, (x, y) => {
      const n = fbm2(x / 160, y / 160, 5, 4) * 0.5 + hash2(x, y) * 0.5;
      const dx = (x - w * 0.5) / w, dy = (y - h * 0.45) / h;
      const vig = 1 - Math.min(1, (dx * dx + dy * dy) * (kind === 'paper' ? 0.5 : 1.6));
      const k = (kind === 'paper' ? 0.96 + vig * 0.05 : 0.55 + vig * 0.6) + (n - 0.5) * (kind === 'paper' ? 0.035 : 0.08);
      return [b[0] * k, b[1] * k, b[2] * k];
    });
  }, { clamp: true }));
}

export class InfoSet extends BaseSet {
  constructor(v) { super(v || 'paper'); this.near = 1; this.far = 400; }
  build(r) {
    const kind = this.variant || 'paper';
    const P = BG[kind];
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color().setRGB(P.base[0] / 255, P.base[1] / 255, P.base[2] / 255, THREE.SRGBColorSpace);
    s.environment = envRoom(r, 'infoRoom', { wall: kind === 'paper' ? 0xe8e4dc : 0x303036 });
    s.environmentIntensity = kind === 'paper' ? 0.6 : 0.5;
    this.wallMat = new THREE.MeshStandardMaterial({ map: bgTex(kind), roughness: 1, metalness: 0 });
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 52), this.wallMat);
    this.wall.receiveShadow = true;
    s.add(this.wall);
    this.key = sunLight(0xffffff, P.light, [-0.45, 0.7, 1.0], { size: 26, mapSize: 2048, dist: 120, bias: -0.0005, normalBias: 0.05, radius: 8 });
    this.key.shadow.radius = 12; this.key.shadow.blurSamples = 16;
    s.add(this.key, this.key.target);
    focusSun(this.key, [0, 0, 0], 26, 120);
    this.hemi = new THREE.HemisphereLight(0xffffff, kind === 'paper' ? 0xd8d0c4 : 0x202024, P.amb);
    s.add(this.hemi);
    this.props = new THREE.Group();
    s.add(this.props);
    this.post = kind === 'paper'
      ? { bloomStr: 0.15, vignette: 0.12, contrast: 1.02, saturation: 1.05, grain: 0.02, exposure: 1.0, ca: 0.0006, distort: 0.0 }
      : { bloomStr: 0.6, vignette: 0.45, contrast: 1.06, saturation: 1.1, grain: 0.03, exposure: 1.0, ca: 0.001, distort: 0.0 };
    this.kind = kind;
  }
  reset() {
    while (this.props.children.length) {
      const c = this.props.children.pop();
      c.traverse((o) => {
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        const ms = o.material ? [].concat(o.material) : [];
        for (const m of ms) { if (!m.userData.shared) { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); } }
      });
    }
    this.wall.visible = true;
  }
  add(o) { this.props.add(o); return o; }
}
