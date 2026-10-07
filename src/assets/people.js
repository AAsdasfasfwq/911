// Stylised human characters: jointed rig, procedural faces with expressions, clothing
// variants (suits, uniforms, robes), poses/animations as pure functions of time, and
// instanced crowds for wide shots.
import * as THREE from 'three';
import { canvasTex, cached } from './textures.js';
import { M, std } from './materials.js';
import { rng, clamp, lerp, fbm1, hash } from '../core/util.js';

const SKINS = ['#f1c7a5', '#e8b896', '#d9a27c', '#c48a62', '#a56d4a', '#7f5136', '#5e3b28'];
const HAIRS = ['#1b1512', '#2b1d14', '#3d2a1c', '#5a3a22', '#8a6038', '#b88a52', '#d8c090', '#6e6a66', '#c9c6c0'];

// ---------- face texture ----------
function faceTex(skin, expr = 'neutral', o = {}) {
  const key = `face_${skin}_${expr}_${o.eye || ''}_${o.brow || ''}_${o.female ? 1 : 0}_${o.lips || ''}_${o.stubble ? 1 : 0}_${o.dust ? 1 : 0}`;
  return cached(key, () => canvasTex(1024, 512, (g, W, H) => {
    const sk = new THREE.Color(skin).getRGB({}, THREE.SRGBColorSpace);
    const skc = (k, a = 1) => `rgba(${Math.min(255, sk.r * 255 * k) | 0},${Math.min(255, sk.g * 255 * k) | 0},${Math.min(255, sk.b * 255 * k) | 0},${a})`;
    g.fillStyle = skc(1); g.fillRect(0, 0, W, H);
    const cx = 256; // face centre (u = 0.25 -> +Z)
    // soft shading: darker towards back/sides
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, skc(0.94)); gr.addColorStop(0.25, skc(1.0)); gr.addColorStop(0.5, skc(0.94)); gr.addColorStop(0.75, skc(0.92)); gr.addColorStop(1, skc(0.94));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // cheeks
    for (const s of [-1, 1]) { const r = g.createRadialGradient(cx + s * 70, 300, 2, cx + s * 70, 300, 46); r.addColorStop(0, o.female ? 'rgba(220,110,110,0.32)' : 'rgba(200,110,100,0.18)'); r.addColorStop(1, 'rgba(200,110,100,0)'); g.fillStyle = r; g.fillRect(cx + s * 70 - 50, 250, 100, 100); }
    if (o.stubble) { g.fillStyle = 'rgba(40,30,25,0.22)'; g.beginPath(); g.ellipse(cx, 340, 92, 66, 0, 0, Math.PI); g.fill(); }
    // eye sockets shading
    for (const s of [-1, 1]) { const r = g.createRadialGradient(cx + s * 50, 248, 4, cx + s * 50, 248, 34); r.addColorStop(0, skc(0.78, 0.6)); r.addColorStop(1, skc(0.78, 0)); g.fillStyle = r; g.fillRect(cx + s * 50 - 36, 210, 72, 72); }
    const E = {
      neutral: { open: 1, brow: 0, browIn: 0, mouth: 'line', mw: 26, curve: 0 },
      smile: { open: 0.85, brow: 2, browIn: 0, mouth: 'smile', mw: 32, curve: 10 },
      worried: { open: 1.05, brow: 6, browIn: 9, mouth: 'line', mw: 22, curve: -5 },
      shock: { open: 1.35, brow: 12, browIn: 4, mouth: 'O', mw: 16, curve: 0 },
      sad: { open: 0.75, brow: 4, browIn: 10, mouth: 'line', mw: 24, curve: -8 },
      stern: { open: 0.85, brow: -4, browIn: -8, mouth: 'line', mw: 26, curve: -2 },
      calm: { open: 0.7, brow: 0, browIn: 0, mouth: 'line', mw: 24, curve: 1 },
      closed: { open: 0.0, brow: 0, browIn: 2, mouth: 'line', mw: 22, curve: -2 },
      talk: { open: 1, brow: 3, browIn: 0, mouth: 'open', mw: 22, curve: 0 },
      cry: { open: 0.5, brow: 5, browIn: 12, mouth: 'open', mw: 22, curve: -9, tears: true },
    }[expr] || {};
    const eyeCol = o.eye || '#4a3424';
    for (const s of [-1, 1]) {
      const ex = cx + s * 50, ey = 248;
      const op = E.open ?? 1;
      if (op > 0.05) {
        g.save();
        g.beginPath(); g.ellipse(ex, ey, 21, 12 * op, 0, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#f4f1ec'; g.fillRect(ex - 24, ey - 16, 48, 32);
        g.fillStyle = eyeCol; g.beginPath(); g.arc(ex + s * 1, ey + 1, 9.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0c0a09'; g.beginPath(); g.arc(ex + s * 1, ey + 1, 4.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex + s * 1 - 3, ey - 3, 2.4, 0, Math.PI * 2); g.fill();
        // upper lid shadow
        g.fillStyle = 'rgba(60,35,25,0.35)'; g.fillRect(ex - 24, ey - 16, 48, 6 * op);
        g.restore();
        g.strokeStyle = 'rgba(40,24,18,0.85)'; g.lineWidth = 3.2;
        g.beginPath(); g.ellipse(ex, ey, 21, 12 * op, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        if (o.female) { g.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = Math.PI * (1.15 + k * 0.22); g.beginPath(); g.moveTo(ex + Math.cos(a) * 21, ey + Math.sin(a) * 12 * op); g.lineTo(ex + Math.cos(a) * 25, ey + Math.sin(a) * 15 * op - 3); g.stroke(); } }
      } else {
        g.strokeStyle = 'rgba(40,24,18,0.85)'; g.lineWidth = 3; g.beginPath(); g.ellipse(ex, ey + 2, 20, 6, 0, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
      }
      // brows
      const by = 218 - (E.brow || 0);
      g.strokeStyle = o.brow || '#2a1d14'; g.lineWidth = o.female ? 5 : 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - s * 22, by + (E.browIn || 0) * 0.15); g.quadraticCurveTo(ex, by - 6, ex + s * 24, by + 4 - (E.browIn || 0)); g.stroke();
      if (E.tears) { g.fillStyle = 'rgba(180,210,240,0.7)'; g.beginPath(); g.ellipse(ex + s * 8, ey + 30, 3, 9, 0, 0, Math.PI * 2); g.fill(); }
    }
    // nose shading
    g.fillStyle = skc(0.8, 0.55); g.beginPath(); g.ellipse(cx, 296, 15, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = skc(0.62, 0.7); g.beginPath(); g.ellipse(cx - 7, 299, 4, 2.5, 0, 0, Math.PI * 2); g.ellipse(cx + 7, 299, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
    // mouth
    const my = 336, mw = E.mw || 26, cv = E.curve || 0;
    const lip = o.lips || (o.female ? '#b8545a' : skc(0.66));
    g.lineCap = 'round';
    if (E.mouth === 'O') {
      g.fillStyle = '#3a1612'; g.beginPath(); g.ellipse(cx, my + 4, mw * 0.8, mw * 1.1, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = lip; g.lineWidth = 4; g.stroke();
    } else if (E.mouth === 'open') {
      g.fillStyle = '#3a1612'; g.beginPath(); g.ellipse(cx, my + 2, mw, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#eee'; g.fillRect(cx - mw * 0.6, my - 5, mw * 1.2, 4);
    } else if (E.mouth === 'smile') {
      g.strokeStyle = '#5a2620'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(cx - mw, my - 2); g.quadraticCurveTo(cx, my + cv * 1.6, cx + mw, my - 2); g.stroke();
      g.fillStyle = lip; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx, my + 8, mw * 0.6, 4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    } else {
      g.strokeStyle = '#5a2a22'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(cx - mw, my - cv * 0.5); g.quadraticCurveTo(cx, my + cv, cx + mw, my - cv * 0.5); g.stroke();
      g.fillStyle = lip; g.globalAlpha = o.female ? 0.85 : 0.35; g.beginPath(); g.ellipse(cx, my + 7, mw * 0.65, 5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    }
    if (o.dust) { g.fillStyle = 'rgba(150,145,135,0.55)'; g.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,115,108,${0.2 + hash(i) * 0.3})`; g.fillRect(hash(i * 3) * W, hash(i * 7) * H, 3 + hash(i * 5) * 6, 3 + hash(i * 9) * 6); } }
  }));
}

// ---------- geometry (shared) ----------
const G = {};
function geo(key, fn) { if (!G[key]) { G[key] = fn(); G[key].userData.shared = true; } return G[key]; }
function headGeo() {
  return geo('head', () => {
    const g = new THREE.SphereGeometry(0.115, 32, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = y < 0 ? -y / 0.115 : 0;
      x *= 0.9 * (1 - 0.22 * k); z *= 1 - 0.05 * k + (z > 0 ? 0.04 : -0.02); y *= 1.1;
      if (y < -0.08 && z > 0) z += 0.012 * (1 - Math.abs(x) / 0.06);
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  });
}
const cap = (r, l, key) => geo('cap' + key, () => { const g = new THREE.CapsuleGeometry(r, l, 8, 18); g.translate(0, -l / 2 - r * 0.4, 0); return g; });
function torsoGeo(female) {
  return geo('torso' + (female ? 'F' : 'M'), () => {
    const prof = female
      ? [[0.001, -0.02], [0.13, 0.0], [0.125, 0.1], [0.15, 0.22], [0.155, 0.3], [0.15, 0.38], [0.11, 0.44], [0.055, 0.47], [0.001, 0.475]]
      : [[0.001, -0.02], [0.14, 0.0], [0.145, 0.1], [0.165, 0.22], [0.178, 0.32], [0.175, 0.39], [0.13, 0.45], [0.06, 0.48], [0.001, 0.485]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 22);
    g.scale(1.18, 1, 0.66);
    g.computeVertexNormals();
    return g;
  });
}
function pelvisGeo() {
  return geo('pelvis', () => {
    const g = new THREE.LatheGeometry([[0.001, -0.13], [0.12, -0.12], [0.15, -0.06], [0.145, 0.02], [0.001, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    g.scale(1.12, 1, 0.72); g.computeVertexNormals(); return g;
  });
}
function shoeGeo() {
  return geo('shoe', () => { const g = new THREE.CapsuleGeometry(0.048, 0.15, 4, 10); g.rotateX(Math.PI / 2); g.scale(1.05, 0.75, 1); g.translate(0, -0.035, 0.05); return g; });
}
function handGeo() { return geo('hand', () => { const g = new THREE.SphereGeometry(0.042, 12, 10); g.scale(0.8, 1.25, 0.55); g.translate(0, -0.045, 0); return g; }); }

function mat(color, r = 0.75, m = 0) { return M(`pm_${color}_${r}_${m}`, () => std(color, { r, m })); }

// ---------- Person ----------
export class Person {
  constructor(o = {}) {
    const R = rng(o.seed ?? 1);
    this.o = o;
    const female = !!o.female;
    const skin = o.skin || SKINS[Math.floor(R() * 5)];
    const hairCol = o.hairColor || HAIRS[Math.floor(R() * 7)];
    const shirt = o.shirt || ['#e8e6e0', '#9fb6d6', '#d6c8a8', '#7a8a6a', '#c86a5a', '#4a5a7a', '#efe4cf'][Math.floor(R() * 7)];
    const pants = o.pants || ['#2a2e36', '#3a3a3e', '#4a4038', '#1e2a44', '#55504a'][Math.floor(R() * 5)];
    const jacket = o.jacket === undefined ? (R() < 0.4 ? ['#24262c', '#3a3e48', '#4a3e34', '#1c2230'][Math.floor(R() * 4)] : null) : o.jacket;
    const shoes = o.shoes || '#1a1614';
    this.root = new THREE.Group();
    const J = (this.j = {});
    const mk = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
    const mesh = (g, m, parent, cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; parent.add(me); return me; };
    const sc = o.height ? o.height / 1.78 : 1;
    this.root.scale.setScalar(sc);
    const skinM = mat(skin, 0.62);
    const shirtM = mat(shirt, 0.82);
    const pantsM = mat(pants, 0.85);
    const topCol = jacket || shirt;
    const topM = mat(topCol, jacket ? 0.7 : 0.82);
    const shoeM = mat(shoes, 0.45, 0.1);
    const hips = mk('hips', this.root, 0, 0.95, 0);
    mesh(pelvisGeo(), pantsM, hips).position.y = 0.02;
    const spine = mk('spine', hips, 0, 0.06, 0);
    const torso = mesh(torsoGeo(female), topM, spine);
    torso.position.y = 0.0;
    if (o.build) torso.scale.set(o.build, 1, o.build);
    // shirt V + tie on jacket
    if (jacket) {
      const v = new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), shirtM);
      v.position.set(0, 0.36, 0.118); v.rotation.z = -Math.PI / 2; v.scale.set(1.3, 0.85, 1); spine.add(v);
      if (o.tie !== false) { const tie = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.01), mat(o.tie || ['#8a1c24', '#1c2a5a', '#2a4a2a', '#5a1c4a'][Math.floor(R() * 4)], 0.5)); tie.position.set(0, 0.29, 0.12); tie.rotation.x = -0.12; spine.add(tie); }
    }
    if (o.robe) {
      const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.72, 18, 1, true), mat(o.robe, 0.9));
      rb.material.side = THREE.DoubleSide; rb.position.y = -0.36; rb.castShadow = true; hips.add(rb);
    }
    if (o.vest) { const ve = new THREE.Mesh(torsoGeo(female), mat(o.vest, 0.7)); ve.scale.set(1.05, 0.72, 1.07); ve.position.y = 0.06; spine.add(ve); }
    if (o.stripes) { for (const yy of [0.08, 0.2]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.035, 22, 1, true), mat('#e8e070', 0.3, 0.4)); st.scale.set(1.0, 1, 0.66); st.position.y = yy; spine.add(st); } }
    const neck = mk('neck', spine, 0, 0.47, 0);
    mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skinM, neck).position.y = 0.03;
    const head = mk('head', neck, 0, 0.17, 0.005);
    this.faceKey = { skin, female, eye: o.eye, stubble: o.stubble, dust: o.dust };
    this.headMat = new THREE.MeshStandardMaterial({ map: faceTex(skin, o.expr || 'neutral', { female, eye: o.eye, stubble: o.stubble, dust: o.dust }), roughness: 0.6 });
    this.headMesh = mesh(headGeo(), this.headMat, head);
    // nose & ears
    const nose = mesh(geo('nose', () => { const g = new THREE.SphereGeometry(0.017, 12, 10); g.scale(0.85, 1.2, 0.9); return g; }), skinM, head, false);
    nose.position.set(0, -0.022, 0.109);
    for (const s of [-1, 1]) { const e = mesh(geo('ear', () => { const g = new THREE.SphereGeometry(0.025, 8, 8); g.scale(0.45, 1, 0.8); return g; }), skinM, head, false); e.position.set(s * 0.1, -0.005, -0.005); }
    // hair / headwear
    const hairM = mat(o.dust ? '#8a857c' : hairCol, 0.85);
    const style = o.hair || (female ? ['long', 'bob', 'long'][Math.floor(R() * 3)] : ['short', 'short', 'side', 'crew', 'receding'][Math.floor(R() * 5)]);
    if (style !== 'bald' && !['turban', 'helmet', 'hardhat'].includes(o.headwear)) {
      const thetaL = style === 'receding' ? 0.36 : style === 'crew' ? 0.42 : 0.5;
      const h = mesh(new THREE.SphereGeometry(0.124, 24, 14, 0, Math.PI * 2, 0, Math.PI * thetaL), hairM, head);
      h.scale.set(0.95, 1.12, 1.04); h.rotation.x = style === 'side' ? -0.35 : -0.28; h.position.set(0, 0.012, -0.01);
      const back = mesh(new THREE.SphereGeometry(0.122, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.15, Math.PI * 0.5), hairM, head);
      back.scale.set(0.95, 1.1, 1.05); back.rotation.y = Math.PI * 0.0; back.position.set(0, 0.0, -0.008);
      if (style === 'long' || style === 'bob') {
        const len = style === 'long' ? 0.28 : 0.13;
        const lh = mesh(new THREE.CylinderGeometry(0.115, 0.13, len, 18, 1, true, Math.PI * 0.3, Math.PI * 1.4), hairM, head);
        lh.material.side = THREE.DoubleSide; lh.position.set(0, -len / 2 + 0.02, -0.012); lh.scale.set(1, 1, 0.95);
      }
    }
    if (o.headwear === 'turban') {
      const tm = mat(o.turbanColor || '#ece6da', 0.95);
      const t1 = mesh(new THREE.TorusGeometry(0.11, 0.045, 10, 22), tm, head); t1.rotation.x = Math.PI / 2; t1.position.y = 0.06; t1.scale.set(1, 1.05, 1);
      const t2 = mesh(new THREE.SphereGeometry(0.12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), tm, head); t2.position.y = 0.065; t2.scale.set(1, 0.85, 1.05);
    } else if (o.headwear === 'cap') {
      const cm = mat(o.capColor || '#1c2a4a', 0.7);
      const c1 = mesh(new THREE.SphereGeometry(0.125, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), cm, head); c1.position.y = 0.035; c1.scale.set(1, 0.8, 1.05);
      const br = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), cm, head); br.position.set(0, 0.04, 0.09); br.scale.set(1, 1, 0.9);
    } else if (o.headwear === 'helmet') {
      const hm = mat(o.helmetColor || '#1a1a1a', 0.35, 0.2);
      const h1 = mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, head); h1.position.y = 0.03; h1.scale.set(1, 0.9, 1.15);
      const brim = mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.012, 22), hm, head); brim.position.set(0, 0.035, -0.045); brim.scale.set(0.95, 1, 1.35); brim.rotation.x = -0.12;
      const shield = mesh(new THREE.BoxGeometry(0.06, 0.07, 0.01), mat('#d8c060', 0.3, 0.6), head); shield.position.set(0, 0.11, 0.145); shield.rotation.x = -0.4;
    } else if (o.headwear === 'hardhat') {
      const hm = mat(o.helmetColor || '#e8c020', 0.4);
      const h1 = mesh(new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, head); h1.position.y = 0.035; h1.scale.set(1, 0.95, 1.1);
      const brim = mesh(new THREE.CylinderGeometry(0.16, 0.165, 0.01, 22), hm, head); brim.position.set(0, 0.035, 0.02); brim.scale.set(1, 1, 1.2);
    } else if (o.headwear === 'military') {
      const hm = mat(o.helmetColor || '#6a6248', 0.8);
      const h1 = mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), hm, head); h1.position.y = 0.02; h1.scale.set(1, 0.95, 1.08);
    } else if (o.headwear === 'pilotcap') {
      const cm = mat('#1a1e2a', 0.6);
      const c1 = mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.06, 20), cm, head); c1.position.y = 0.09;
      const vis = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 14, 1, false, -Math.PI / 2, Math.PI), M('visor', () => std(0x080808, { r: 0.2 })), head); vis.position.set(0, 0.065, 0.095);
    }
    if (o.beard) {
      const bm = mat(o.beardColor || hairCol, 0.95);
      const long = o.beard === 'long';
      const b = mesh(new THREE.SphereGeometry(0.121, 20, 12, -Math.PI * 0.02, Math.PI * 1.04, Math.PI * 0.6, Math.PI * 0.4), bm, head);
      b.scale.set(0.92, 1.12, 1.04); b.position.set(0, -0.006, 0.002);
      if (long) { const lb = mesh(new THREE.ConeGeometry(0.07, 0.17, 14), bm, head); lb.rotation.x = Math.PI + 0.25; lb.position.set(0, -0.15, 0.06); lb.scale.set(1, 1, 0.7); }
      const mu = mesh(new THREE.CapsuleGeometry(0.009, 0.045, 4, 8), bm, head); mu.rotation.z = Math.PI / 2; mu.position.set(0, -0.042, 0.106);
    }
    if (o.glasses) {
      const gm = M('glassesFrame', () => std(0x181818, { r: 0.3, m: 0.5 }));
      for (const s of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 16), gm, head, false); r.position.set(s * 0.042, 0.0, 0.112); }
      const br = mesh(new THREE.BoxGeometry(0.03, 0.004, 0.004), gm, head, false); br.position.set(0, 0.004, 0.118);
    }
    // arms
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'R' : 'L';
      const sh = mk('sh' + n, spine, s * 0.19, 0.405, 0);
      mesh(new THREE.SphereGeometry(0.05, 14, 12), topM, sh);
      mesh(cap(0.047, 0.21, 'ua'), topM, sh);
      const el = mk('el' + n, sh, 0, -0.29, 0);
      mesh(new THREE.SphereGeometry(0.043, 12, 10), o.shortSleeve ? skinM : topM, el);
      mesh(cap(0.041, 0.18, 'fa'), o.shortSleeve ? skinM : topM, el);
      const wr = mk('wr' + n, el, 0, -0.26, 0);
      mesh(handGeo(), o.gloves ? mat(o.gloves, 0.7) : skinM, wr);
      // legs
      const hp = mk('hp' + n, hips, s * 0.085, -0.02, 0);
      mesh(cap(0.075, 0.33, 'th'), pantsM, hp);
      const kn = mk('kn' + n, hp, 0, -0.44, 0);
      mesh(new THREE.SphereGeometry(0.06, 12, 10), pantsM, kn);
      mesh(cap(0.057, 0.31, 'sh'), pantsM, kn);
      const an = mk('an' + n, kn, 0, -0.42, 0);
      mesh(shoeGeo(), shoeM, an);
    }
    this.carry = new THREE.Group();
    J.wrR.add(this.carry);
    this.expr = o.expr || 'neutral';
    this.seed = o.seed ?? 1;
    this.pose('stand', 0);
  }

  setExpr(e) {
    if (e === this.expr) return;
    this.expr = e;
    const k = this.faceKey;
    this.headMat.map = faceTex(k.skin, e, { female: k.female, eye: k.eye, stubble: k.stubble, dust: k.dust });
    this.headMat.needsUpdate = true;
  }

  // Poses. t = time in seconds (for idle motion / cycles), p = extra params
  pose(name, t = 0, p = {}) {
    const J = this.j;
    for (const k in J) J[k].rotation.set(0, 0, 0);
    J.hips.position.y = 0.95;
    const br = Math.sin(t * 1.6 + this.seed) * 0.012; // breathing
    const idle = (f, a, s = 0) => fbm1(t * f, this.seed * 13 + s, 2) * a;
    J.spine.rotation.x = br;
    J.head.rotation.y = idle(0.3, 0.12, 1) + (p.look || 0);
    J.head.rotation.x = idle(0.25, 0.05, 2) + (p.nod || 0);
    J.shL.rotation.z = 0.08; J.shR.rotation.z = -0.08;
    J.elL.rotation.x = -0.12; J.elR.rotation.x = -0.12;
    const walk = (speed = 1, amp = 1) => {
      const ph = t * 5.4 * speed + this.seed;
      const s = Math.sin(ph), c = Math.cos(ph);
      J.hpL.rotation.x = s * 0.45 * amp; J.hpR.rotation.x = -s * 0.45 * amp;
      J.knL.rotation.x = Math.max(0, -c) * 0.8 * amp + 0.05; J.knR.rotation.x = Math.max(0, c) * 0.8 * amp + 0.05;
      J.anL.rotation.x = -J.knL.rotation.x * 0.3; J.anR.rotation.x = -J.knR.rotation.x * 0.3;
      J.shL.rotation.x = -s * 0.4 * amp; J.shR.rotation.x = s * 0.4 * amp;
      J.elL.rotation.x = -0.3 - Math.max(0, s) * 0.3; J.elR.rotation.x = -0.3 - Math.max(0, -s) * 0.3;
      J.hips.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.025 * amp;
      J.hips.rotation.y = s * 0.06 * amp; J.spine.rotation.y = -s * 0.1 * amp;
    };
    switch (name) {
      case 'stand': break;
      case 'walk': walk(p.speed ?? 1, p.amp ?? 1); break;
      case 'run': walk(1.7, 1.5); J.spine.rotation.x = 0.25; J.elL.rotation.x = J.elR.rotation.x = -1.4; break;
      case 'stumble': walk(0.6, 0.6); J.spine.rotation.x = 0.35; J.head.rotation.x = 0.3; J.shL.rotation.x = -0.3; J.shR.rotation.x = -0.5; J.elR.rotation.x = -1.6; break;
      case 'sit':
        J.hips.position.y = p.seatH ?? 0.5;
        J.hpL.rotation.x = J.hpR.rotation.x = -1.5; J.knL.rotation.x = J.knR.rotation.x = 1.45;
        J.shL.rotation.x = J.shR.rotation.x = -0.35; J.elL.rotation.x = J.elR.rotation.x = -0.9;
        break;
      case 'type': {
        J.hips.position.y = p.seatH ?? 0.5;
        J.hpL.rotation.x = J.hpR.rotation.x = -1.5; J.knL.rotation.x = J.knR.rotation.x = 1.45;
        J.spine.rotation.x = 0.12;
        J.shL.rotation.x = J.shR.rotation.x = -0.75; J.elL.rotation.x = J.elR.rotation.x = -0.75;
        J.shL.rotation.z = 0.25; J.shR.rotation.z = -0.25;
        J.wrL.rotation.x = 0.2 + Math.sin(t * 17 + 1) * 0.12; J.wrR.rotation.x = 0.2 + Math.sin(t * 15) * 0.12;
        J.head.rotation.x = 0.12;
        break;
      }
      case 'phone':
        J.shR.rotation.x = -0.6; J.shR.rotation.z = -0.55; J.elR.rotation.x = -2.3; J.elR.rotation.y = 0.4;
        J.head.rotation.z = -0.1;
        if (p.sit) { J.hips.position.y = p.seatH ?? 0.5; J.hpL.rotation.x = J.hpR.rotation.x = -1.5; J.knL.rotation.x = J.knR.rotation.x = 1.45; }
        break;
      case 'point':
        J.shR.rotation.x = -1.45; J.elR.rotation.x = -0.1; J.shR.rotation.z = -0.15;
        break;
      case 'lookUp':
        J.head.rotation.x = -0.65 + idle(0.4, 0.04, 3); J.neck.rotation.x = -0.25; J.spine.rotation.x = -0.12;
        if (p.shade) { J.shR.rotation.x = -2.4; J.shR.rotation.z = -0.3; J.elR.rotation.x = -1.2; }
        if (p.point) { J.shL.rotation.x = -2.5; J.elL.rotation.x = -0.1; }
        break;
      case 'handsHead':
        J.head.rotation.x = -0.4; J.neck.rotation.x = -0.2;
        J.shL.rotation.x = J.shR.rotation.x = -2.6; J.shL.rotation.z = 0.5; J.shR.rotation.z = -0.5;
        J.elL.rotation.x = J.elR.rotation.x = -1.9;
        break;
      case 'coverMouth':
        J.head.rotation.x = -0.3;
        J.shR.rotation.x = -1.0; J.shR.rotation.z = 0.15; J.elR.rotation.x = -2.2;
        J.shL.rotation.x = -0.5; J.elL.rotation.x = -1.4;
        break;
      case 'arms':
        J.shL.rotation.x = J.shR.rotation.x = -0.5; J.elL.rotation.x = J.elR.rotation.x = -1.6; J.shL.rotation.z = 0.4; J.shR.rotation.z = -0.4;
        break;
      case 'dig': {
        const ph = t * 2.2 + this.seed;
        J.spine.rotation.x = 0.7 + Math.sin(ph) * 0.12; J.hpL.rotation.x = -0.5; J.hpR.rotation.x = -0.3; J.knL.rotation.x = 0.7; J.knR.rotation.x = 0.5;
        J.hips.position.y = 0.86;
        J.shL.rotation.x = J.shR.rotation.x = -1.0 + Math.sin(ph) * 0.45; J.elL.rotation.x = J.elR.rotation.x = -0.4;
        break;
      }
      case 'carry':
        walk(0.7, 0.6);
        J.shL.rotation.x = J.shR.rotation.x = -0.9; J.elL.rotation.x = J.elR.rotation.x = -0.6; J.shL.rotation.z = 0.25; J.shR.rotation.z = -0.25;
        break;
      case 'cheer': {
        const ph = t * 4 + this.seed;
        J.shL.rotation.x = J.shR.rotation.x = -2.8 + Math.sin(ph) * 0.2; J.shL.rotation.z = 0.35; J.shR.rotation.z = -0.35;
        J.elL.rotation.x = J.elR.rotation.x = -0.2; J.hips.position.y = 0.95 + Math.max(0, Math.sin(ph * 0.5)) * 0.05;
        break;
      }
      case 'podium':
        J.shL.rotation.x = -0.7; J.elL.rotation.x = -0.5; J.shR.rotation.x = -0.9 + Math.sin(t * 2.3) * 0.25; J.elR.rotation.x = -0.9 + Math.sin(t * 3.1) * 0.3;
        J.head.rotation.y = Math.sin(t * 0.7) * 0.25;
        break;
      case 'kneel':
        J.hips.position.y = 0.55; J.hpL.rotation.x = -1.4; J.knL.rotation.x = 1.5; J.hpR.rotation.x = 0.1; J.knR.rotation.x = 1.5;
        J.spine.rotation.x = 0.3; J.shL.rotation.x = J.shR.rotation.x = -0.6; J.elL.rotation.x = J.elR.rotation.x = -0.6;
        break;
      case 'pilot':
        J.hips.position.y = p.seatH ?? 0.5;
        J.hpL.rotation.x = J.hpR.rotation.x = -1.4; J.knL.rotation.x = J.knR.rotation.x = 1.2;
        J.shL.rotation.x = J.shR.rotation.x = -1.0; J.elL.rotation.x = J.elR.rotation.x = -0.7; J.shL.rotation.z = 0.15; J.shR.rotation.z = -0.15;
        break;
      case 'read':
        J.shL.rotation.x = J.shR.rotation.x = -0.9; J.elL.rotation.x = J.elR.rotation.x = -1.3; J.shL.rotation.z = 0.25; J.shR.rotation.z = -0.25;
        J.head.rotation.x = 0.45; J.head.rotation.y = 0;
        if (p.sit) { J.hips.position.y = p.seatH ?? 0.5; J.hpL.rotation.x = J.hpR.rotation.x = -1.5; J.knL.rotation.x = J.knR.rotation.x = 1.45; }
        break;
      case 'eat':
        J.hips.position.y = p.seatH ?? 0.5; J.hpL.rotation.x = J.hpR.rotation.x = -1.5; J.knL.rotation.x = J.knR.rotation.x = 1.45;
        J.shR.rotation.x = -0.9 - Math.max(0, Math.sin(t * 1.5)) * 0.5; J.elR.rotation.x = -1.6 - Math.max(0, Math.sin(t * 1.5)) * 0.5;
        J.shL.rotation.x = -0.5; J.elL.rotation.x = -1.0;
        break;
      case 'lift': { // gym: dumbbell curls
        const ph = Math.sin(t * 2.5 + this.seed);
        J.elL.rotation.x = -0.4 - (ph * 0.5 + 0.5) * 1.9; J.elR.rotation.x = -0.4 - (-ph * 0.5 + 0.5) * 1.9;
        break;
      }
      case 'salute':
        J.shR.rotation.x = -1.2; J.shR.rotation.z = -1.0; J.elR.rotation.x = -2.1; break;
      case 'crouch':
        J.hips.position.y = 0.6; J.hpL.rotation.x = J.hpR.rotation.x = -1.6; J.knL.rotation.x = J.knR.rotation.x = 2.2; J.spine.rotation.x = 0.4;
        J.shL.rotation.x = J.shR.rotation.x = -0.6; J.elL.rotation.x = J.elR.rotation.x = -0.4;
        break;
    }
    if (p.headTurn) J.head.rotation.y += p.headTurn;
    if (p.headPitch) J.head.rotation.x += p.headPitch;
  }
}

// ---------- crowds (instanced, cheap) ----------
export class Crowd {
  constructor(n, o = {}) {
    this.n = n;
    const R = rng(o.seed ?? 7);
    this.group = new THREE.Group();
    const body = new THREE.CapsuleGeometry(0.19, 0.5, 4, 10); body.translate(0, 1.18, 0); body.scale(1, 1, 0.65);
    const head = new THREE.SphereGeometry(0.115, 12, 10); head.translate(0, 1.66, 0);
    const legs = new THREE.CapsuleGeometry(0.13, 0.62, 4, 8); legs.translate(0, 0.45, 0); legs.scale(1, 1, 0.7);
    const dust = o.dust;
    const mk = (g, rough) => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: rough, color: 0xffffff }), n); m.castShadow = true; m.receiveShadow = true; this.group.add(m); return m; };
    this.body = mk(body, 0.85); this.head = mk(head, 0.6); this.legs = mk(legs, 0.85);
    const c = new THREE.Color();
    const shirts = o.shirts || ['#e8e6e0', '#9fb6d6', '#d6c8a8', '#7a8a6a', '#c86a5a', '#4a5a7a', '#24262c', '#3a3e48', '#efe4cf', '#8a3a3a'];
    for (let i = 0; i < n; i++) {
      const dk = dust ? 0.35 : 0;
      c.set(shirts[Math.floor(R() * shirts.length)]).lerp(new THREE.Color('#8f8a80'), dk); this.body.setColorAt(i, c);
      c.set(SKINS[Math.floor(R() * 6)]).lerp(new THREE.Color('#8f8a80'), dk * 1.4); this.head.setColorAt(i, c);
      c.set(['#2a2e36', '#3a3a3e', '#4a4038', '#1e2a44'][Math.floor(R() * 4)]).lerp(new THREE.Color('#8f8a80'), dk); this.legs.setColorAt(i, c);
    }
    this.pos = []; this.phase = [];
    for (let i = 0; i < n; i++) { this.pos.push([0, 0, 0, 0]); this.phase.push(R() * 10); }
    this.d = new THREE.Object3D();
  }
  // place: arrays of [x, y, z, yaw]; anim: 'stand'|'walk'|'cheer'; T time
  update(T, anim = 'stand', o = {}) {
    const d = this.d;
    for (let i = 0; i < this.n; i++) {
      const [x, y, z, yaw] = this.pos[i];
      let px = x, pz = z, py = y;
      const ph = this.phase[i];
      let fade = 1;
      if (anim === 'walk') {
        // walkers loop inside a window around their base position (frame-pure, no drift)
        const sp = o.speed ?? 1.3, L = o.wrap ?? 36;
        const off = (((sp * T + ph * 7.3) % L) + L) % L - L / 2;
        fade = clamp((L / 2 - Math.abs(off)) / 1.5);
        px += Math.sin(yaw) * off; pz += Math.cos(yaw) * off; py += Math.abs(Math.sin(T * 5 + ph)) * 0.04;
      }
      if (anim === 'cheer') py += Math.max(0, Math.sin(T * 4 + ph)) * 0.12;
      d.position.set(px, py, pz); d.rotation.set(0, yaw + Math.sin(T * 0.5 + ph) * 0.1, Math.sin(T * 5 + ph) * (anim === 'walk' ? 0.03 : 0.01));
      const s = (0.92 + hash(i * 7) * 0.16) * Math.max(0.001, fade); d.scale.set(s, s, s);
      d.updateMatrix();
      this.body.setMatrixAt(i, d.matrix); this.head.setMatrixAt(i, d.matrix); this.legs.setMatrixAt(i, d.matrix);
    }
    for (const m of [this.body, this.head, this.legs]) m.instanceMatrix.needsUpdate = true;
  }
}

export { SKINS, HAIRS };
