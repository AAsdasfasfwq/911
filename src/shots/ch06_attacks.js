// 8:12 - 11:38  The attacks: Flight 11, the North Tower, live television, Flight 175,
// the Pentagon, airspace closure, the South Tower collapse, Flight 93, the North Tower.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash, fbm1 } from '../core/util.js';
import { C, headline, counter, smearText, mark, strike, underline, slabTower, usMap, arc3, pin, dotGrid, pointer } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { fireball, smokePlume, dustCloud, flames } from '../fx/particles.js';
import { floorY } from '../assets/wtc.js';
import { CITIES, projUS } from '../assets/geo.js';
import { orient } from '../sets/manhattan.js';
import { Person } from '../assets/people.js';

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// paths ending at the impact point
const AA11 = [[420, 540, -7000], [260, 480, -4200], [130, 425, -2100], [45, 380, -720], [6, 362, -32]];
const UA175 = [[-3200, 620, 7000], [-2300, 470, 4200], [-1050, 365, 2100], [-330, 318, 860], [-22, 303, 162]];
const curves = new Map();
function curveOf(pts) { if (!curves.has(pts)) { const c = new THREE.CatmullRomCurve3(pts.map(V3)); curves.set(pts, { c, L: c.getLength() }); } return curves.get(pts); }
// place plane so that it reaches the end of `pts` at time tImp travelling at `speed`
function flyTo(plane, pts, tImp, T, speed, bank = 0) {
  const { c, L } = curveOf(pts);
  const u = 1 - ((tImp - T) * speed) / L;
  if (u > 1 || u < 0) { plane.visible = false; return null; }
  const p = c.getPointAt(u), t = c.getTangentAt(u);
  plane.position.copy(p); orient(plane, t, typeof bank === 'function' ? bank(u, tImp - T) : bank); plane.visible = true;
  return p;
}
const bankS = (u, left) => -0.62 * E.ioCubic(clamp(1 - left / 4.5));
const bankN = (u, left) => -0.18 * E.ioCubic(clamp(1 - left / 3));

function impactFxN(set, t0, scale = 1) {
  set.extra.push((bb, sT) => fireball(bb, sT, { t0, pos: [6, 362, -40], dir: [0.1, 0.35, -1], count: Math.round(620 * scale), speed: 85, life: 11, size: [10, 105], bias: 0.55, hotTime: 2.0, buoy: 4, seed: 101, heat: 1.2 }));
  set.extra.push((bb, sT) => fireball(bb, sT, { t0: t0 + 0.25, pos: [10, 360, 36], dir: [0.2, 0.3, 1], count: Math.round(260 * scale), speed: 55, life: 9, size: [8, 70], bias: 0.6, hotTime: 1.6, buoy: 4, seed: 102 }));
  set.extra.push((bb, sT) => fireball(bb, sT, { t0: t0 + 0.15, pos: [36, 362, 0], dir: [1, 0.3, 0], count: Math.round(160 * scale), speed: 45, life: 8, size: [8, 60], bias: 0.6, hotTime: 1.4, buoy: 4, seed: 103 }));
  set.debrisSpec = { pos: [6, 362, -36], t0, dir: [0, 0.2, -1], speed: 60, count: 500, size: 1.4, g: 9.8, spin: 6, seed: 7, spawn: 0.4 };
  set.paperSpec = { pos: [6, 362, -36], t0: t0 + 0.4, dir: [0, 0.1, -1], speed: 30, count: 900, size: 1, kind: 'paper', wind: [6, 0, 4], fall: 1.4, seed: 8, spawn: 6 };
}
function impactFxS(set, t0, scale = 1) {
  set.extra.push((bb, sT) => fireball(bb, sT, { t0: t0 + 0.12, pos: [-14, 302, 92], dir: [0.35, 0.25, -1], count: Math.round(760 * scale), speed: 105, life: 12, size: [12, 125], bias: 0.6, hotTime: 2.3, buoy: 4.5, seed: 201, heat: 1.3, spreadTime: 0.5 }));
  set.extra.push((bb, sT) => fireball(bb, sT, { t0: t0 + 0.2, pos: [-2, 302, 120], dir: [1, 0.25, -0.2], count: Math.round(520 * scale), speed: 95, life: 11, size: [12, 110], bias: 0.6, hotTime: 2.0, buoy: 4.5, seed: 202, heat: 1.2 }));
  set.extra.push((bb, sT) => fireball(bb, sT, { t0, pos: [-22, 303, 168], dir: [0, 0.3, 1], count: Math.round(220 * scale), speed: 40, life: 8, size: [8, 60], bias: 0.5, hotTime: 1.2, buoy: 3, seed: 203 }));
  set.debrisSpec = { pos: [-14, 302, 95], t0: t0 + 0.1, dir: [0.4, 0.2, -1], speed: 80, count: 600, size: 1.5, g: 9.8, spin: 6, seed: 17, spawn: 0.4 };
  set.paperSpec = { pos: [-10, 302, 100], t0: t0 + 0.5, dir: [0.4, 0.1, -1], speed: 35, count: 900, size: 1, kind: 'paper', wind: [6, 0, 4], fall: 1.4, seed: 18, spawn: 6 };
}

export default function attacks(D, film) {
  const st = film.story;
  st.impactN = D.peek('slams into') + 0.25;
  st.impactS = D.peek('tears into the south') + 0.2;
  st.collapseS = D.peek('begins to collapse') + 0.4;
  st.collapseN = D.peek('the north tower falls') + 0.5;
  st.collapseDur = 11;

  // ---------------- 8:14 Flight 11 ----------------
  D.shot('8 14', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'atcRoom', mood: 'tension',
    enter: (c) => { const P = c.set.pod('atc'); },
    cam: D.pc({ p: [[6, 2.4, 3.5], [4.5, 2.2, 2.8]], l: [[-1.5, 1.0, -1.8], [-1.5, 1.0, -1.8]], fov: 40, shake: 0.2 }),
    sfx: [[0.1, 'radioChatter', { dur: 3 }]],
  });
  D.stamp(D.peek('8 14'), 3.6, '8', 14, { label: 'Boston air traffic control' });
  D.shot('lose contact with', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('atc'); P.blips = [{ x: 0.1, y: -0.2, label: 'AAL11', alt: '290', trail: [0.01, -0.006] }, ...P.blipsBase[1].slice(0, 4)]; },
    update: (c) => { const P = c.set.active; if (P.blips) P.blips[0].lost = c.lt > 1.0; P.blips[0].alert = c.lt > 1.0; },
    cam: D.pc({ p: [[-1.5, 1.55, -1.25], [-1.5, 1.5, -1.38]], l: [[-1.5, 1.1, -1.75], [-1.5, 1.1, -1.75]], fov: 38, shake: 0.1 }),
    sfx: [[1.0, 'radarLost', {}]],
  });
  D.shot('the plane makes a sharp', {
    set: 'sky:clear', in: 'whip', bed: 'windHigh',
    update: (c) => { const p = c.set.planes[0]; p.visible = true; const a = c.lt * 0.35; p.position.set(Math.sin(a) * 300, 0, Math.cos(a) * 300 - 300); orient(p, new THREE.Vector3(Math.cos(a), -0.02, -Math.sin(a)), -0.85); setCam(c, new THREE.Vector3(p.position.x - 60, p.position.y + 30, p.position.z + 50), p.position, 34, 0, { shake: 0.4 }); },
    sfx: [[0, 'jetBank', { dur: 2.6 }]],
  });
  // inside the cabin (no violence shown: light, haze, fear)
  D.shot('inside terrorists armed', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'cabinTense', mood: 'dark',
    enter: (c) => { const P = c.set.pod('cabin:dark'); P.paxPose = (i, T) => (i % 3 === 0 ? 'coverMouth' : 'sit'); P.people.forEach((p) => p.setExpr('worried')); P.cdoor.rotation.y = 0; },
    update: (c) => { const P = c.set.active; P.red.intensity = 6 + Math.sin(c.T * 3) * 3; },
    cam: D.pc({ p: [[0, 1.6, -9], [0, 1.6, -7.5]], l: [[0, 1.3, 0.4], [0, 1.3, 0.4]], fov: 40, shake: 0.3 }),
    post: { exposure: 0.85, saturation: 0.7, contrast: 1.2, vignette: 0.7, shadowTint: [0.06, -0.02, -0.02] },
    sfx: [[0.2, 'heartbeat', { n: 4 }]],
  });
  D.shot('sprayed tear', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('cabin:dark'); P.paxPose = (i) => (i % 2 ? 'coverMouth' : 'handsHead'); P.people.forEach((p) => p.setExpr('shock')); },
    update: (c) => { const P = c.set.active; P.red.intensity = 6 + Math.sin(c.T * 3) * 3; },
    cam: D.pc({ p: [[0.6, 1.4, -6], [0.5, 1.4, -5.6]], l: [[-0.8, 1.0, -5], [-0.8, 1.0, -4.8]], fov: 38, shake: 0.5 }),
    post: { exposure: 0.95, saturation: 0.6, contrast: 1.1, vignette: 0.7, bloomStr: 1.6, bloomThreshold: 0.5 },
    sfx: [[0.1, 'hiss', { dur: 2 }]],
  });
  D.shot('forced passengers to the back', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('cabin:dark'); P.paxPose = () => 'crouch'; P.people.forEach((p) => p.setExpr('shock')); },
    cam: D.pc({ p: [[0, 1.9, -3], [0, 1.85, -4]], l: [[0, 0.9, -14], [0, 0.9, -14]], fov: 42, shake: 0.35 }),
    post: { exposure: 0.85, saturation: 0.6, contrast: 1.2, vignette: 0.75 },
  });
  D.shot('and locked themselves inside', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('cabin:dark'); P.paxPose = () => 'sit'; },
    update: (c) => { const P = c.set.active; P.cdoor.rotation.y = -1.2 * (1 - E.inQuad(clamp((c.lt - 0.2) / 0.35))); },
    cam: D.pc({ p: [[0.2, 1.4, -1.6], [0.15, 1.4, -1.4]], l: [[0, 1.2, 0.35], [0, 1.2, 0.35]], fov: 36, shake: 0.2, impact: { t: 0.55, amp: 1.2, decay: 6 } }),
    post: { exposure: 0.8, saturation: 0.6, contrast: 1.25, vignette: 0.75 },
    sfx: [[0.55, 'doorSlam', {}], [0.6, 'lockClick', {}]],
  });
  // Atta at the controls
  D.shot('ata is at the controls', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'cockpitWind', mood: 'dark',
    update: (c) => {
      const s = c.set, p = s.aa11;
      flyTo(p, AA11, st.impactN, c.T, 195, bankN);
      p.userData.cockpit.visible = true;
      const eye = D.local(p, [0.45, 0.95, 18.0]), look = D.local(p, [0.2, 0.4, 80]);
      c.cam.position.copy(eye); c.cam.up.set(0, 1, 0).applyQuaternion(p.quaternion); c.cam.lookAt(look); c.cam.fov = 58; c.cam.near = 0.1; c.cam.far = 30000;
      c.cam.rotateZ(fbm1(c.T * 3, 5, 2) * 0.004); c.cam.updateMatrixWorld();
    },
  });
  // 8:46 approach
  D.shot('at 8 46', {
    set: 'nyc', in: 'whip', bed: 'jetApproach', mood: 'dark',
    enter: (c) => { c.set.focus = [0, 0, -800]; c.set.focusSize = 900; },
    update: (c) => {
      const p = c.set.aa11; flyTo(p, AA11, st.impactN, c.T, 195, bankN);
      setCam(c, D.local(p, [8, 6, -60]), D.local(p, [0, 0, 200]), 38, 0, { shake: 0.4 });
    },
    sfx: [[0, 'jetLow', { dur: 2.2, gain: 0.9 }]],
  });
  D.stamp(D.peek('at 8 46') + 0.1, 3.2, '8', 46, { ss: 0 });
  D.shot('manhattan shutters', {
    set: 'nyc', in: 'whip', bed: 'cityAmb',
    enter: (c) => { c.set.focus = [165, 0, 60]; c.set.focusSize = 120; },
    update: (c) => {
      flyTo(c.set.aa11, AA11, st.impactN, c.T, 195, bankN);
      c.set.street.heroes.forEach((p, i) => { p.pose('lookUp', c.T + i, { shade: i % 3 === 0, point: i % 4 === 1 }); p.setExpr(i % 2 ? 'worried' : 'shock'); p.root.rotation.y = Math.PI * 0.95; });
    },
    cam: { p: [[168, 1.0, 66], [168, 1.2, 64]], l: [[150, 120, -300], [140, 200, -400]], fov: 52, shake: 0.6 },
    sfx: [[0.2, 'jetRoar', { dur: 2.2, gain: 1 }]],
  });
  D.shot('a massive boeing', {
    set: 'nyc', in: 'whip',
    update: (c) => { const p = c.set.aa11; flyTo(p, AA11, st.impactN, c.T, 195, bankN); setCam(c, D.local(p, [-45, -6, -20 + c.lt * 10]), D.local(p, [0, 0, 6]), 40, 0, { shake: 0.8 }); c.set.focus = [p.position.x, 300, p.position.z]; c.set.focusSize = 200; },
    sfx: [[0, 'jetPass', { dur: 2.0, gain: 1 }]],
  });
  D.shot('traveling at more than', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.focus = [0, 300, -300]; c.set.focusSize = 500; },
    update: (c) => { const p = c.set.aa11; flyTo(p, AA11, st.impactN, c.T, 195, bankN); setCam(c, D.local(p, [0, 7, -48]), new THREE.Vector3(6, 362, -32), 34, 0, { shake: 0.7 }); },
    overlay: (c, g) => {
      const left = st.impactN - c.T;
      const a = clamp(c.lt / 0.3);
      g.globalAlpha = a; font(g, 30, 700, 'mono'); g.fillStyle = '#ff4a3a'; g.fillText('AAL 11', 120, 140);
      counter(g, 0.0 + c.lt, 380, 435, 120, 300, { size: 150, align: 'left', d: 0.8, color: '#ffffff', suffix: '', shadow: 'rgba(0,0,0,0.6)' });
      text(g, 'MPH', 120, 360, { size: 40, weight: 800, color: '#ff4a3a', tracking: 0.3, p: a });
      text(g, `${Math.max(0, Math.round(left * 195))} m`, 120, 450, { size: 54, weight: 600, fam: 'mono', color: '#ffffff', p: a, shadow: 'rgba(0,0,0,0.6)' });
      g.globalAlpha = 1;
    },
    sfx: [[0, 'jetRoar', { dur: 3.2, gain: 1 }]],
  });
  // IMPACT
  D.shot('slams into', {
    set: 'nyc', in: 'whip', bed: 'aftermath', mood: 'impact',
    enter: (c) => { c.set.focus = [0, 330, 0]; c.set.focusSize = 260; },
    update: (c) => {
      const sT = st.impactN - 0.35 + c.lt * (c.lt < 1.2 ? 0.6 : 1.0) - (c.lt >= 1.2 ? 1.2 * 0.4 : 0);
      c.set.storyOverride = sT;
      flyTo(c.set.aa11, AA11, st.impactN, sT, 195, bankN);
      impactFxN(c.set, st.impactN);
      c.set.flashLight.position.set(6, 365, -60); c.set.flashLight.intensity = Math.max(0, 1 - (sT - st.impactN) * 1.5) * 4e5 * (sT > st.impactN ? 1 : 0);
    },
    cam: { p: [[760, 300, -980], [740, 305, -950]], l: [[0, 360, 0], [0, 362, 0]], fov: 26, shake: 0.3, impact: { t: 0.3, amp: 2.2, decay: 2.5 } },
    post: (c) => ({ flash: Math.max(0, 0.6 - Math.abs(c.lt - 0.35) * 2), bloomStr: 1.1 }),
    sfx: [[0.3, 'impact', { gain: 1.0 }], [0.35, 'boom', { gain: 1.0 }], [1.2, 'debrisRain', { dur: 3 }]],
  });
  // floors 93-99
  D.shot('between the 93rd', {
    set: 'info:dark', in: 'whip', mood: 'somber',
    enter: (c) => {
      const t = slabTower({ antenna: true, fh: 0.14, w: 3 }); t.position.set(-2, -8.2, 0.6); c.set.add(t); c.set.tw = t;
      for (let i = 92; i < 99; i++) t.userData.color(i, 0xd8281e);
    },
    cam: { p: [[2, 4, 40], [1.5, 4.5, 37]], l: [[-1, 4, 0], [-1, 4.5, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => {
      pointer(g, 870, 260, 1180, 260, (c.lt - 0.3) / 0.4, { color: '#ff4a3a', w: 3 });
      text(g, 'FLOORS 93 – 99', 1200, 272, { size: 56, weight: 800, color: '#ff4a3a', p: clamp((c.lt - 0.5) / 0.4), tracking: 0.05 });
      text(g, 'North Tower • 8:46:40 AM', 1200, 330, { size: 32, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 0.8) / 0.4) });
    },
    sfx: [[0.3, 'thump', {}]],
  });
  D.shot('at first no one', {
    set: 'nyc', in: 'whip', bed: 'streetPanic', mood: 'tension',
    enter: (c) => { c.set.focus = [165, 0, 60]; c.set.focusSize = 120; c.set.trafficOn = false; },
    update: (c) => c.set.street.heroes.forEach((p, i) => { p.pose('lookUp', c.T + i, { shade: i % 3 === 0 }); p.setExpr(i % 2 ? 'worried' : 'shock'); p.root.rotation.y = -Math.PI / 2 + 0.3; }),
    cam: { p: [[172, 1.6, 92], [172, 1.65, 88]], l: [[160, 2.5, 74], [160, 3, 72]], fov: 34, shake: 0.4 },
    post: { dof: { focus: 18, aperture: 6, maxR: 9 } },
  });
  // News breaks in
  const feedN = (o = {}) => (r, ctx) => {
    const P = ctx.set.active;
    if (!P.rt) P.rt = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType });
    film.renderInset(ctx, 'nyc', (sub) => {
      sub.set.storyOverride = o.story ? o.story(ctx) : ctx.T;
      if (o.extra) o.extra(sub);
      const cp = o.cam || [[640, 330, 1100], [0, 300, 40]];
      sub.cam.position.set(...cp[0]); sub.cam.lookAt(...cp[1]); sub.cam.fov = o.fov || 24; sub.cam.near = 2; sub.cam.far = 20000; sub.cam.updateProjectionMatrix(); sub.cam.updateMatrixWorld();
    }, P.rt);
    P.tvMat.userData.U.tFeed.value = P.rt.texture; P.tvMat.userData.U.uHasFeed.value = 1; P.tvMat.userData.U.uHasGfx.value = 1; P.tvMat.userData.U.uGain.value = 0.7;
  };
  D.shot('morning news anchors', {
    set: 'rooms', in: 'whip', bed: 'newsStudio',
    enter: (c) => { const P = c.set.pod('studio'); P.feed = feedN(); P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'BREAKING NEWS', sub: 'EXPLOSION AT WORLD TRADE CENTER  •  NEW YORK  •  LIVE', time: '8:52 AM' }); },
    cam: D.pc({ p: [[0.6, 1.5, 2.4], [0.4, 1.45, 2.0]], l: [[0.2, 1.6, -3], [0.2, 1.6, -3]], fov: 40, shake: 0.15 }),
    sfx: [[0, 'newsSting', {}]],
  });
  D.shot("we're getting reports", {
    set: 'rooms', in: 'whip', bed: 'tvRoom',
    enter: (c) => { const P = c.set.pod('living:day'); P.feed = feedN({ cam: [[520, 380, 820], [0, 340, 0]], fov: 20 }); P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'BREAKING NEWS', sub: 'PLANE CRASHES INTO WORLD TRADE CENTER  •  LIVE PICTURES', time: '8:53 AM' }); },
    cam: D.pc({ p: [[0.25, 0.95, -0.9], [0.18, 0.92, -1.15]], l: [[0, 0.82, -2.1], [0, 0.82, -2.1]], fov: 36, shake: 0.08 }),
    post: { dof: { focus: 1.0, aperture: 5, maxR: 8 } },
  });
  D.shot('around the world millions', {
    set: 'globe', in: 'whip', bed: 'space',
    enter: (c) => { c.set.setSun(0.2, 0.4, 1); ['london', 'paris', 'tokyo', 'moscow', 'rio', 'sydney', 'cairo', 'delhi', 'beijing', 'mexico', 'johannesburg', 'berlin'].forEach((k) => c.set.addMarker(CITIES[k], { color: 0xffd080, size: 0.6 })); },
    update: (c) => { c.set.earth.rotation.y = 0.2 + c.lt * 0.06; c.set.markers.forEach((m) => m.set(c.T)); setCam(c, c.set.viewFrom(20, 35, 230), new THREE.Vector3(0, 0, 0), 38, 0, { shake: 0.05 }); },
  });
  D.shot('must be a terrible', {
    set: 'rooms', in: 'whip', bed: 'tvRoom',
    enter: (c) => { const P = c.set.pod('living:day'); P.feed = feedN({ cam: [[520, 380, 820], [0, 340, 0]], fov: 20 }); P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'BREAKING NEWS', sub: 'AN ACCIDENT?  •  SMALL PLANE?  •  LIVE FROM NEW YORK', time: '8:55 AM' }); P.people.forEach((p) => p.setExpr('worried')); },
    cam: D.pc({ p: [[1.4, 1.0, -1.5], [1.2, 1.0, -1.2]], l: [[0, 0.95, 1.2], [0, 0.95, 1.2]], fov: 38, shake: 0.12 }),
  });
  D.shot('thick black smoke', {
    set: 'nyc', in: 'whip', bed: 'fireHigh', mood: 'somber',
    enter: (c) => { c.set.focus = [0, 340, 0]; c.set.focusSize = 200; },
    cam: { p: [[300, 420, -360], [285, 412, -345]], l: [[0, 365, -20], [0, 368, -20]], fov: 30, shake: 0.2 },
  });
  D.shot('every camera in new york', {
    set: 'nyc', in: 'whip', bed: 'cityAmb',
    enter: (c) => { c.set.cams.group.visible = true; c.set.cams.group.rotation.y = 0.75; c.set.focus = [420, 72, 420]; c.set.focusSize = 40; },
    update: (c) => c.set.cams.crew.forEach((p, i) => p.pose('stand', c.T + i)),
    cam: (c) => { const g = c.set.cams.group; return { p: [D.local(g, [10, 2.2, 8]).toArray(), D.local(g, [8, 2.2, 7]).toArray()], l: [[0, 360, 0], [0, 360, 0]], fov: 40, shake: 0.2 }; },
    post: { dof: { focus: 9, aperture: 3, maxR: 6 } },
    sfx: [[0.3, 'cameraShutter', {}], [0.9, 'cameraShutter', {}]],
  });
  D.shot('hundreds of people inside', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'fireDistant', mood: 'somber',
    cam: { p: [[480, 380, -600], [470, 378, -590]], l: [[0, 365, -20], [0, 365, -20]], fov: 18, shake: 0.15 },
    post: { saturation: 0.55, contrast: 1.1, exposure: 0.9 },
  });
  D.shot('those above the impact', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { const t = slabTower({ antenna: true, fh: 0.14, w: 3 }); t.position.set(-2, -8.2, 0.6); c.set.add(t); c.set.tw = t; for (let i = 92; i < 99; i++) t.userData.color(i, 0xd8281e); },
    update: (c) => { const t = c.set.tw; for (let i = 99; i < 110; i++) t.userData.color(i, clamp((c.lt - 0.3) / 0.6) > (i - 99) / 11 ? 0xffb030 : 0xb8bcc2); },
    cam: { p: [[2, 5.5, 34], [1.5, 6, 32]], l: [[-1, 5.5, 0], [-1, 6, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => { text(g, 'TRAPPED', 1260, 300, { size: 110, weight: 800, color: '#ffb030', p: clamp((c.lt - 0.6) / 0.5), blur: 14 }); text(g, 'floors 100 – 110', 1260, 370, { size: 36, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 0.9) / 0.4) }); },
  });
  D.shot('every stairway has been', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const xs = [700, 960, 1220];
      ['A', 'B', 'C'].forEach((s, i) => {
        const x = xs[i];
        g.strokeStyle = '#e8e2d6'; g.lineWidth = 10; g.beginPath(); g.moveTo(x, 980); g.lineTo(x, 120); g.stroke();
        text(g, `STAIRWELL ${s}`, x, 1040, { size: 26, weight: 800, align: 'center', color: '#bdb6aa', tracking: 0.2, p: 1 });
        const q = clamp((c.lt - 0.4 - i * 0.35) / 0.3);
        if (q > 0) { g.fillStyle = '#111114'; g.fillRect(x - 30, 330, 60, 120); g.save(); g.translate(x, 390); g.scale(q, q); g.strokeStyle = '#ff3a2a'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-40, -40); g.lineTo(40, 40); g.moveTo(40, -40); g.lineTo(-40, 40); g.stroke(); g.restore(); }
      });
      g.fillStyle = 'rgba(216,40,30,0.25)'; g.fillRect(560, 330, 800, 120);
      text(g, 'IMPACT ZONE', 1560, 400, { size: 34, weight: 800, color: '#ff4a3a', tracking: 0.2, p: clamp((c.lt - 0.2) / 0.4) });
      text(g, 'no way down', 1560, 450, { size: 34, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 1.6) / 0.4) });
    },
    sfx: [[0.4, 'thump', {}], [0.75, 'thump', {}], [1.1, 'thump', {}]],
  });
  D.shot('temperatures from the burning', {
    set: 'info:red', in: 'whip', mood: 'tension',
    enter: (c) => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 14, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })); tube.position.set(-7, 0.5, 1.5); c.set.add(tube);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 16), new THREE.MeshStandardMaterial({ color: 0xff5a10, emissive: 0xff3a00, emissiveIntensity: 1.5 })); bulb.position.set(-7, -7.3, 1.5); c.set.add(bulb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1, 24), new THREE.MeshStandardMaterial({ color: 0xff7a10, emissive: 0xff5a00, emissiveIntensity: 2 })); col.position.set(-7, -6, 1.5); c.set.add(col); c.set.col = col;
    },
    update: (c) => { const q = E.ioCubic(clamp((c.lt - 0.2) / 2.6)); const h = 0.5 + q * 12.5; c.set.col.scale.y = h; c.set.col.position.y = -6.4 + h / 2; },
    cam: { p: [[0, 0, 44], [0, 0, 41]], l: [[0, 0, 0], [0, 0, 0]], fov: 24, shake: 0.04 },
    overlay: (c, g) => {
      counter(g, c.lt, 70, 1800, 1260, 520, { size: 200, d: 2.6, t0: 0.2, color: '#ffffff', suffix: '°F', shadow: 'rgba(0,0,0,0.4)' });
      text(g, '≈ 1,000 °C', 1260, 600, { size: 44, weight: 700, align: 'center', color: '#ffd0c0', p: clamp((c.lt - 0.8) / 0.4) });
      text(g, 'steel loses about half its strength at 1,100 °F', 1260, 690, { size: 32, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#ffd8d0', p: clamp((c.lt - 2.4) / 0.5), blur: 8 });
    },
    sfx: [[0.2, 'fireRoar', { dur: 3 }]],
  });
  // South Tower: people watching the North Tower burn
  D.shot('in the south tower people', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'officeTense', mood: 'tension',
    enter: (c) => { c.set.officeS.group.visible = true; c.set.focus = [-38, 280, 100]; c.set.focusSize = 120; },
    update: (c) => c.set.officeS.people.forEach((p, i) => { p.root.position.set(27.5 - (i % 2) * 1.2, 0, -12 + i * 3.2); p.root.rotation.y = Math.PI / 2; p.pose(i % 3 === 0 ? 'coverMouth' : i % 3 === 1 ? 'lookUp' : 'stand', c.T + i, { headPitch: -0.3 }); p.setExpr(i % 2 ? 'shock' : 'worried'); }),
    cam: { p: [[-30, 270.6, 117], [-31, 270.7, 115]], l: [[-28, 300, 40], [-26, 310, 30]], fov: 48, shake: 0.25 },
    post: { exposure: 1.05 },
  });
  D.shot('in horror at the burning', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.officeS.group.visible = true; },
    update: (c) => c.set.officeS.people.forEach((p, i) => { p.root.position.set(27.5 - (i % 2) * 1.2, 0, -12 + i * 3.2); p.root.rotation.y = Math.PI / 2; p.pose(i === 3 ? 'handsHead' : 'lookUp', c.T + i); p.setExpr('shock'); }),
    cam: { p: [[-36.5, 270.8, 101.4], [-36.6, 270.85, 101.6]], l: [[-35, 270.75, 103.5], [-35, 270.8, 103.6]], fov: 30, shake: 0.2 },
    post: { dof: { focus: 1.9, aperture: 8, maxR: 12 } },
  });
  D.shot('an announcement comes', {
    set: 'nyc', in: 'whip', bed: 'officeTense',
    enter: (c) => { c.set.officeS.group.visible = true; },
    cam: { p: [[-45, 270.2, 116], [-44.8, 270.3, 116.2]], l: [[-44, 272.0, 114], [-44, 272.05, 114]], fov: 34, shake: 0.12 },
    sfx: [[0.1, 'paChime', {}], [0.6, 'paVoice', { dur: 2.8 }]],
  });
  D.shot('please remain at your desks', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.officeS.group.visible = true; },
    update: (c) => c.set.officeS.people.forEach((p, i) => { const q = clamp(c.lt / 2.5); p.root.position.set(27.5 - q * (6 + i), 0, -12 + i * 3.2); p.root.rotation.y = -Math.PI / 2; p.pose('walk', c.T + i, { speed: 0.6, amp: 0.6 }); p.setExpr('worried'); }),
    cam: { p: [[-50, 271, 110], [-49, 271, 111]], l: [[-38, 270.5, 104], [-38, 270.5, 104]], fov: 46, shake: 0.2 },
  });
  D.shot('many obey', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.officeS.group.visible = true; },
    update: (c) => { const p = c.set.officeS.people[0]; p.root.position.set(12 - 0.95, 0, -14 + 0.3); p.root.rotation.y = Math.PI / 2; p.pose('type', c.T, { seatH: 0.48 }); p.setExpr('worried'); },
    cam: { p: [[-33.5, 270.5, 117.5], [-33.6, 270.45, 117.3]], l: [[-38 - 13.7, 270.1, 130 - 11.05], [-51.7, 270.1, 119]], fov: 36, shake: 0.12 },
  });
  // ---------------- 9:03 Flight 175 ----------------
  D.shot('then at 903', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'harborTense', mood: 'tension',
    enter: (c) => { c.set.focus = [-200, 200, 600]; c.set.focusSize = 900; },
    update: (c) => flyTo(c.set.ua175, UA175, st.impactS, c.T, 240, bankS),
    cam: { p: [[700, 120, 2300], [680, 125, 2240]], l: [[-300, 300, 300], [-300, 300, 300]], fov: 34, shake: 0.2 },
  });
  D.stamp(D.peek('then at 903') + 0.3, 3.4, '9', 3, { ss: 0 });
  D.shot('second boeing airliner', {
    set: 'nyc', in: 'whip', bed: 'jetApproach',
    update: (c) => { const p = c.set.ua175; flyTo(p, UA175, st.impactS, c.T, 240, bankS); setCam(c, D.local(p, [30, -4, 40]), D.local(p, [0, 0, -10]), 34, 0, { shake: 0.6 }); c.set.focus = [p.position.x, 300, p.position.z]; c.set.focusSize = 200; },
    sfx: [[0, 'jetPass', { dur: 2.4, gain: 1 }]],
  });
  D.shot('banks smoothly', {
    set: 'nyc', in: 'whip',
    update: (c) => { const p = c.set.ua175; flyTo(p, UA175, st.impactS, c.T, 240, bankS); setCam(c, D.local(p, [-12, 10, -70]), new THREE.Vector3(-30, 310, 130), 36, 0, { shake: 0.6 }); c.set.focus = [-30, 300, 130]; c.set.focusSize = 400; },
    sfx: [[0, 'jetRoar', { dur: 2.2, gain: 1 }]],
  });
  D.shot('tears into the south', {
    set: 'nyc', in: 'whip', bed: 'aftermath', mood: 'impact',
    enter: (c) => { c.set.focus = [-20, 300, 100]; c.set.focusSize = 300; },
    update: (c) => {
      const sT = st.impactS - 0.4 + c.lt * 0.75;
      c.set.storyOverride = sT;
      flyTo(c.set.ua175, UA175, st.impactS, sT, 240, bankS);
      impactFxS(c.set, st.impactS);
      c.set.flashLight.position.set(-10, 305, 90); c.set.flashLight.intensity = sT > st.impactS ? Math.max(0, 1 - (sT - st.impactS) * 1.2) * 5e5 : 0;
    },
    cam: { p: [[1250, 260, 600], [1235, 262, 590]], l: [[-30, 320, 100], [-30, 322, 100]], fov: 22, shake: 0.3, impact: { t: 0.4, amp: 2.5, decay: 2.5 } },
    post: (c) => ({ flash: Math.max(0, 0.65 - Math.abs(c.lt - 0.45) * 2), bloomStr: 1.2 }),
    sfx: [[0.4, 'impact', { gain: 1.0 }], [0.45, 'boom', { gain: 1.0 }], [1.0, 'debrisRain', { dur: 3 }]],
  });
  D.shot('at tremendous speed', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.focus = [-20, 300, 100]; c.set.focusSize = 300; },
    update: (c) => { const sT = st.impactS + 0.1 + c.lt * 0.5; c.set.storyOverride = sT; impactFxS(c.set, st.impactS); },
    cam: { p: [[420, 250, -320], [410, 252, -310]], l: [[-20, 300, 90], [-20, 302, 90]], fov: 30, shake: 0.4 },
    post: { bloomStr: 1.1 },
    sfx: [[0, 'fireRoar', { dur: 2 }]],
  });
  D.shot('millions watch it happen', {
    set: 'rooms', in: 'whip', bed: 'streetPanic',
    enter: (c) => { const P = c.set.pod('tvwall'); P.feed = feedN({ story: (ctx) => st.impactS - 1.2 + ((ctx.lt * 0.8) % 3.5), extra: (sub) => { impactFxS(sub.set, st.impactS); flyTo(sub.set.ua175, UA175, st.impactS, sub.set.storyOverride, 240, bankS); }, cam: [[1250, 260, 600], [-30, 320, 100]], fov: 22 }); P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'SECOND PLANE HITS', sub: 'LIVE  •  NEW YORK CITY  •  WORLD TRADE CENTER', time: '9:03 AM' }); },
    cam: D.pc({ p: [[-1.5, 1.6, 3.5], [-1.0, 1.6, 3.0]], l: [[0, 1.6, -1.8], [0, 1.6, -1.8]], fov: 42, shake: 0.2 }),
    post: { dof: { focus: 3.4, aperture: 4, maxR: 7 } },
  });
  D.shot('a fireball erupts', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.focus = [-10, 300, 100]; c.set.focusSize = 200; },
    update: (c) => { const sT = st.impactS + 0.05 + c.lt * 0.35; c.set.storyOverride = sT; impactFxS(c.set, st.impactS, 1.2); },
    cam: { p: [[180, 330, -60], [176, 331, -56]], l: [[-10, 300, 100], [-10, 300, 100]], fov: 34, shake: 0.5, impact: { t: 0.05, amp: 1.5, decay: 1.5 } },
    post: { bloomStr: 1.3, exposure: 1.05 },
    sfx: [[0, 'fireballRoar', { dur: 2.2 }]],
  });
  D.shot('in that instant the world', {
    set: 'nyc', in: 'whip', bed: 'streetPanic', mood: 'somber',
    enter: (c) => { c.set.focus = [165, 0, 60]; c.set.focusSize = 120; c.set.trafficOn = false; c.set.emergency.visible = true; },
    update: (c) => c.set.street.heroes.forEach((p, i) => { p.pose(i % 3 === 0 ? 'handsHead' : i % 3 === 1 ? 'coverMouth' : 'lookUp', c.T + i); p.setExpr('shock'); p.root.rotation.y = -Math.PI / 2 + 0.2; }),
    cam: { p: [[178, 0.9, 98], [177, 1.0, 95]], l: [[150, 30, 50], [140, 60, 40]], fov: 46, shake: 0.4 },
  });
  D.shot('any hope that this', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'fireDistant',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 0, 60]; c.set.focusSize = 600; },
    cam: { p: [[1600, 300, 1300], [1560, 295, 1260]], l: [[-20, 260, 60], [-20, 260, 60]], fov: 26, shake: 0.15 },
    post: { saturation: 0.65, contrast: 1.1 },
  });
  D.shot('everyone understands america', {
    set: 'rooms', in: 'glitch', bed: 'newsStudio', mood: 'tension',
    enter: (c) => { const P = c.set.pod('studio'); P.feed = feedN({ cam: [[1600, 300, 1300], [-20, 260, 60]], fov: 20 }); P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'AMERICA UNDER ATTACK', sub: 'TWO PLANES HIT WORLD TRADE CENTER  •  LIVE', time: '9:05 AM' }); },
    cam: D.pc({ p: [[3.2, 2.2, 1.5], [2.8, 2.1, 0.8]], l: [[1.6, 2.4, -4.9], [1.6, 2.4, -4.9]], fov: 40, shake: 0.2 }),
    sfx: [[0, 'newsSting', {}]],
  });
  D.shot('chaos spreads across', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m); c.set.map = m; },
    cam: { p: [[0, -5, 44], [0, -4, 41]], l: [[0, 0, 0], [0, 0.3, 0]], fov: 26, shake: 0.06 },
    overlay: (c, g) => {
      const src = [[1520, 430], [1470, 520]];
      for (let k = 0; k < 6; k++) { const ph = (c.lt * 0.6 + k / 6) % 1; for (const [x, y] of src) { g.strokeStyle = `rgba(255,60,40,${(1 - ph) * 0.8})`; g.lineWidth = 4; g.beginPath(); g.arc(x, y, ph * 900, 0, Math.PI * 2); g.stroke(); } }
      text(g, 'AMERICA UNDER ATTACK', 960, 160, { size: 64, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.1, p: clamp(c.lt / 0.5), blur: 10 });
    },
    sfx: [[0, 'sirens', { dur: 3.2 }]],
  });
  // ---------------- 9:37 Pentagon ----------------
  D.shot('at 9 37', {
    set: 'pentagon', in: 'fade', inDur: 0.25, bed: 'highway', mood: 'tension',
    enter: (c) => { c.set.focus = [0, 0, 0]; c.set.focusSize = 300; },
    cam: { p: [[-1000, 260, 600], [-960, 250, 580]], l: [[0, 0, 0], [0, 0, 0]], fov: 34 },
  });
  D.stamp(D.peek('at 9 37'), 3.2, '9', 37, { label: 'Arlington, Virginia' });
  const PENT = [[-2962, 260, 966], [-1537, 110, 501], [-587, 30, 191], [-112, 12, 36]];
  D.shot('a third plane flight 77', {
    set: 'pentagon', in: 'whip', bed: 'jetApproach',
    update: (c) => { const p = c.set.plane; flyTo(p, PENT, st.pentT, c.T, 240, 0); setCam(c, new THREE.Vector3(-640, 3, 330), p.position, 30, 0, { shake: 0.6 }); },
    sfx: [[0, 'jetRoar', { dur: 2.2, gain: 1 }]],
  });
  st.pentT = D.peek('crashes into the') + 0.5;
  D.shot('crashes into the', {
    set: 'pentagon', in: 'whip', bed: 'aftermath', mood: 'impact',
    enter: (c) => { c.set.impactT = st.pentT; c.set.focus = [-112, 0, 36]; c.set.focusSize = 200; },
    update: (c) => flyTo(c.set.plane, PENT, st.pentT, c.T, 240, 0),
    cam: { p: [[-560, 60, -300], [-545, 58, -290]], l: [[-112, 12, 36], [-112, 14, 36]], fov: 28, shake: 0.3, impact: { t: 0.6, amp: 2, decay: 2.5 } },
    post: (c) => ({ flash: Math.max(0, 0.5 - Math.abs(c.lt - 0.6) * 2) }),
    sfx: [[0.6, 'impact', { gain: 0.9 }], [0.62, 'boom', { gain: 0.9 }]],
  });
  D.shot('the headquarters of the u', {
    set: 'pentagon', in: 'whip', bed: 'fireDistant',
    enter: (c) => { c.set.burning = 1; c.set.trucks.forEach((t) => (t.visible = true)); },
    cam: { p: [[300, 520, 500], [280, 510, 480]], l: [[-60, 0, 0], [-60, 0, 0]], fov: 34 },
  });
  D.shot('the most heavily protected', {
    set: 'pentagon', in: 'whip', bed: 'sirens',
    enter: (c) => { c.set.burning = 1; c.set.trucks.forEach((t) => (t.visible = true)); c.set.focus = [-130, 0, 60]; c.set.focusSize = 80; },
    cam: { p: [[-200, 4, 130], [-195, 4.5, 126]], l: [[-112, 14, 36], [-112, 15, 36]], fov: 36, shake: 0.35 },
  });
  // airspace shut down
  D.shot('an order goes out', {
    set: 'rooms', in: 'whip', bed: 'atcRoom', mood: 'tension',
    enter: (c) => { const P = c.set.pod('atc'); },
    cam: D.pc({ p: [[-6, 1.8, 2.5], [-5, 1.7, 2]], l: [[0, 1.2, -2], [0, 1.2, -2]], fov: 38, shake: 0.2 }),
    sfx: [[0.1, 'radioChatter', { dur: 3 }], [0.4, 'alarmShort', {}]],
  });
  D.shot('thousands of planes are', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m); },
    cam: { p: [[0, -5, 44], [0, -4, 41]], l: [[0, 0, 0], [0, 0.3, 0]], fov: 26, shake: 0.04 },
    overlay: (c, g) => drawAirTraffic(g, c.lt, 4500, 1.0),
    sfx: [[0.1, 'dataRain', { dur: 4 }]],
  });
  // ---------------- 9:59 South Tower collapse ----------------
  D.shot('at 9 59', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'fireDistant', mood: 'dread',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 0, 60]; c.set.focusSize = 700; },
    cam: { p: [[1700, 60, 900], [1690, 62, 890]], l: [[-20, 260, 60], [-20, 262, 60]], fov: 24 },
  });
  D.stamp(D.peek('at 9 59'), 3.4, '9', 59, { ss: 0 });
  D.shot('the south tower begins', {
    set: 'nyc', in: 'whip', bed: 'collapse', mood: 'impact',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [-38, 200, 130]; c.set.focusSize = 300; },
    cam: { p: [[1050, 180, 520], [1046, 178, 518]], l: [[-38, 280, 130], [-38, 270, 130]], fov: 24, shake: 0.3, impact: { t: 0.5, amp: 0.8, decay: 0.8 } },
    sfx: [[0.3, 'collapseRumble', { dur: 6 }]],
  });
  D.shot('it has stood for just', {
    set: 'info:dark', in: 'whip', mood: 'somber',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const m = Math.round(lerp(0, 56, E.outCubic(clamp(c.lt / 1.8))));
      text(g, `${m}`, 960, 600, { size: 300, weight: 800, align: 'center', color: '#f4f1ea', p: clamp(c.lt / 0.4), blur: 16 });
      text(g, 'MINUTES', 960, 690, { size: 46, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.4, p: clamp((c.lt - 0.4) / 0.4) });
      text(g, '9:03 → 9:59', 960, 770, { size: 34, fam: 'mono', weight: 600, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 0.8) / 0.4) });
    },
    sfx: [[0, 'clockTicks', { dur: 2 }]],
  });
  D.shot('its steel frame can no', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { const t = slabTower({ fh: 0.14, w: 3 }); t.position.set(-1.5, -8.2, 0.6); c.set.add(t); c.set.tw = t; },
    update: (c) => { const t = c.set.tw; for (let i = 74; i < 88; i++) { const k = clamp((c.lt - 0.2) / 2) * (1 - Math.abs(i - 81) / 9); t.userData.color(i, new THREE.Color().setRGB(0.7 + k * 0.3, 0.72 - k * 0.5, 0.75 - k * 0.7).getHex()); } t.rotation.z = Math.sin(c.T * 18) * 0.002 * clamp(c.lt - 2); },
    cam: { p: [[1, 2.5, 30], [0.5, 2.6, 27]], l: [[-1.5, 2.5, 0], [-1.5, 2.6, 0]], fov: 26, shake: 0.08 },
    overlay: (c, g) => {
      text(g, 'STEEL WEAKENS', 1240, 420, { size: 80, weight: 800, color: '#ffb030', p: clamp((c.lt - 0.6) / 0.5), blur: 10 });
      text(g, 'the floors above become a falling weight', 1240, 480, { size: 34, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 1.2) / 0.5) });
    },
    sfx: [[0.5, 'metalGroan', { dur: 3 }]],
  });
  D.shot('110 stories of glass', {
    set: 'nyc', in: 'whip', bed: 'collapse', mood: 'impact',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [-38, 150, 130]; c.set.focusSize = 400; },
    update: (c) => { c.set.storyOverride = st.collapseS - 0.5 + c.lt * 2.2; },
    cam: { p: [[700, 140, 1100], [690, 142, 1090]], l: [[-38, 220, 130], [-38, 180, 130]], fov: 26, shake: 0.4, impact: { t: 0.6, amp: 1.2, decay: 0.5 } },
    overlay: (c, g) => { const a = clamp((c.lt - 0.5) / 0.4); g.globalAlpha = a; text(g, '110 STORIES', 96, 160, { size: 54, weight: 800, color: '#ffffff', p: a, shadow: 'rgba(0,0,0,0.6)' }); text(g, '10 SECONDS', 96, 220, { size: 54, weight: 800, color: '#ff4a3a', p: clamp((c.lt - 1.6) / 0.4), shadow: 'rgba(0,0,0,0.6)' }); g.globalAlpha = 1; },
    sfx: [[0, 'collapseRoar', { dur: 4.5 }]],
  });
  D.shot('a tidal wave of ash', {
    set: 'nyc', in: 'whip', bed: 'dustWave',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [165, 0, 100]; c.set.focusSize = 120; c.set.trafficOn = false; },
    update: (c) => {
      c.set.storyOverride = st.collapseS + 7 + c.lt * 1.2;
      c.set.street.heroes.forEach((p, i) => { p.root.position.set(160 + (i % 5) * 3, 0.45, 110 + i * 1.5 + c.lt * 4.5); p.root.rotation.y = 0; p.pose('run', c.T + i * 0.3); p.setExpr('shock'); });
      const k = clamp((c.lt - 0.6) / 2.4);
      c.set.extra.push((bb, sT) => dustCloud(bb, sT, { t0: st.collapseS + 6.5, count: 420, seed: 77, spawn: 3, speed: 30, drag: 0.02, size: [12, 40], growT: 6, alpha: 0.95, rise: 0.3, center: [165, 6, 40], height: 26, color: [0.58, 0.56, 0.52], floor: 2, dir: [0, 0, 1], jitter: 24 }));
    },
    cam: { p: [[166, 1.8, 175], [166, 1.8, 172]], l: [[164, 6, 80], [164, 8, 80]], fov: 50, shake: 0.7 },
    post: (c) => ({ fade: 0, fadeCol: [0.55, 0.53, 0.5], flash: 0 }),
    sfx: [[0, 'dustRoar', { dur: 3.5 }], [0.2, 'screamsDistant', {}]],
  });
  D.shot('engulfs lower manhattan', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 0, 300]; c.set.focusSize = 1200; },
    update: (c) => { c.set.storyOverride = st.collapseS + 18 + c.lt * 3; },
    cam: { p: [[2200, 700, 2400], [2150, 690, 2340]], l: [[0, 100, 200], [0, 100, 200]], fov: 34 },
  });
  // ---------------- Flight 93 ----------------
  D.shot('meanwhile aboard the fourth', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'cabinTense', mood: 'tension',
    enter: (c) => { const P = c.set.pod('cabin'); P.paxPose = (i) => (i % 2 ? 'phone' : 'sit'); P.people.forEach((p, i) => p.setExpr(i % 2 ? 'worried' : 'sad')); },
    cam: D.pc({ p: [[0.2, 1.5, -11], [0.1, 1.45, -9.6]], l: [[-0.8, 1.1, -6], [-0.8, 1.1, -6]], fov: 38, shake: 0.25 }),
    post: { saturation: 0.75 },
    sfx: [[0.2, 'phoneVoices', { dur: 3 }]],
  });
  D.shot('through cell phone calls', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('cabin'); P.paxPose = (i) => (i % 2 ? 'phone' : 'sit'); P.people.forEach((p) => p.setExpr('worried')); },
    cam: D.pc({ p: [[-0.35, 1.25, -4.55], [-0.38, 1.24, -4.62]], l: [[-1.0, 1.15, -4.85], [-1.0, 1.15, -4.85]], fov: 32, shake: 0.15 }),
    post: { dof: { focus: 0.7, aperture: 8, maxR: 12 }, saturation: 0.75 },
  });
  D.shot('they realize their plane', {
    set: 'info:dark', in: 'whip', mood: 'tension',
    enter: (c) => {
      const m = usMap(2.6, 0x2a2c32); m.position.set(-12, -1.5, 0); c.set.add(m); c.set.map = m;
      const pts = [[-74.17, 40.69], [-78, 41.0], [-81.5, 41.3], [-80.5, 40.6], [-78.9, 40.05]].map(([lo, la]) => m.userData.atLL(lo, la, 0.8).add(m.position));
      const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 100, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0x5a9aff, emissive: 0x3a7aff, emissiveIntensity: 1.5 })); tube.geometry.setDrawRange(0, 0); c.set.add(tube); c.set.route = tube;
      const dc = m.userData.at('dc', 0.8).add(m.position); const dash = arc3(pts[4], dc, 1.0, 0xff3a2a, 0.08, 2.5); c.set.add(dash); c.set.dash = dash;
      const p1 = pin(0xff3a2a, 0.5); p1.position.copy(dc); c.set.add(p1); c.set.dcPin = p1;
    },
    update: (c) => { const n = c.set.route.geometry.index.count; c.set.route.geometry.setDrawRange(0, Math.floor(clamp(c.lt / 2.2) * n / 6) * 6); c.set.dash.userData.set((c.lt - 2.4) / 1.6); c.set.dcPin.scale.setScalar(Math.max(0.001, E.outBack(clamp((c.lt - 3.6) / 0.5)))); },
    cam: { p: [[-2, -3, 30], [-1, -2, 27]], l: [[-2, 0, 0], [-1, 0, 0]], fov: 28, shake: 0.05 },
    overlay: (c, g) => {
      text(g, 'FLIGHT 93', 160, 200, { size: 70, weight: 800, color: '#f4f1ea', p: clamp(c.lt / 0.4), blur: 10 });
      text(g, 'Newark → San Francisco', 160, 250, { size: 32, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 0.3) / 0.4) });
      text(g, 'TURNS BACK TOWARD WASHINGTON', 160, 330, { size: 36, weight: 800, color: '#ff4a3a', tracking: 0.08, p: clamp((c.lt - 2.2) / 0.4) });
      text(g, 'THE CAPITOL? THE WHITE HOUSE?', 1180, 860, { size: 40, weight: 800, color: '#ffffff', align: 'center', tracking: 0.06, p: clamp((c.lt - 4.0) / 0.5), blur: 8 });
    },
  });
  D.shot('they make the heroic', {
    set: 'rooms', in: 'whip', bed: 'cabinTense', mood: 'hero',
    enter: (c) => { const P = c.set.pod('cabin'); P.paxPose = (i) => (i < 8 ? 'stand' : 'sit'); P.people.forEach((p) => p.setExpr('stern')); },
    update: (c) => { const P = c.set.active; P.pax.forEach((p, i) => { if (i < 8) { p.root.position.x = lerp(p.root.position.x, 0, 0.0); p.root.rotation.y = 0; } }); },
    cam: D.pc({ p: [[0, 0.7, -3.6], [0, 0.75, -3.2]], l: [[0, 1.6, -9], [0, 1.65, -9]], fov: 40, shake: 0.5 }),
    post: { exposure: 1.1, temp: 0.25, saturation: 0.85, contrast: 1.15 },
    sfx: [[0.1, 'riser', { dur: 2.8, gain: 0.6 }]],
  });
  D.shot('at 10 03', {
    set: 'field', in: 'whip', bed: 'windHigh', mood: 'tension',
    update: (c) => { const p = c.set.plane; p.visible = true; const u = c.lt; p.position.set(-1400 + u * 220, 1500 - u * 140, -900 + u * 120); orient(p, new THREE.Vector3(1, -0.55, 0.5), Math.PI * 0.4 + Math.sin(c.T * 2) * 0.2); setCam(c, new THREE.Vector3(p.position.x - 120, p.position.y + 40, p.position.z - 160), p.position, 30, 0, { shake: 0.8 }); },
    sfx: [[0, 'jetDive', { dur: 3 }]],
  });
  D.stamp(D.peek('at 10 03'), 3.2, '10', 3, { label: 'Shanksville, Pennsylvania' });
  st.fieldT = D.peek('it crashes in a field') + 0.6;
  D.shot('the hijackers drive the plane', {
    set: 'field', in: 'whip',
    update: (c) => { const p = c.set.plane; const left = st.fieldT - c.T; if (left < 0) { p.visible = false; return; } p.visible = true; const d = new THREE.Vector3(0.55, -0.8, 0.25).normalize(); const cr = c.set.crater; p.position.copy(d.clone().multiplyScalar(-left * 250)).add(new THREE.Vector3(cr[0], cr[1] + 3, cr[2])); orient(p, d, Math.PI * 0.9); },
    cam: { p: [[-420, 40, -260], [-410, 38, -250]], l: [[-200, 300, -60], [-60, 60, -20]], fov: 32, shake: 0.6 },
    sfx: [[0, 'jetScream', { dur: 3.2 }]],
  });
  D.shot('it crashes in a field', {
    set: 'field', in: 'whip', bed: 'fieldWind', mood: 'impact',
    enter: (c) => { c.set.impactT = st.fieldT; },
    cam: { p: [[-1300, 30, -700], [-1290, 30, -690]], l: [[0, 30, 0], [0, 34, 0]], fov: 26, shake: 0.2, impact: { t: 0.6, amp: 0.8, decay: 2 } },
    sfx: [[0.6, 'distantImpact', { gain: 0.9 }]],
  });
  D.shot('no one survives', {
    set: 'dc:golden', in: 'fade', inDur: 0.5, bed: 'windSoft', mood: 'hero',
    cam: { p: [[0, 4, 420], [0, 8, 360]], l: [[0, 50, 0], [0, 56, 0]], fov: 32 },
    post: { exposure: 1.05, temp: 0.3 },
  });
  // ---------------- 10:28 North Tower ----------------
  D.shot('at 10 28', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'collapse', mood: 'dread',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 200, 0]; c.set.focusSize = 500; },
    cam: { p: [[-900, 160, -1500], [-890, 162, -1490]], l: [[0, 260, 0], [0, 230, 0]], fov: 22, shake: 0.3, impact: { t: 3.0, amp: 0.8, decay: 0.8 } },
    sfx: [[1.3, 'collapseRoar', { dur: 5 }]],
  });
  D.stamp(D.peek('at 10 28'), 3.0, '10', 28, { ss: 0 });
  D.shot('the landmarks that defined', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'aftermath', mood: 'somber',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 0, 300]; c.set.focusSize = 1500; },
    cam: { p: [[-2300, 40, 800], [-2260, 42, 780]], l: [[0, 150, 0], [0, 150, 0]], fov: 30 },
    post: { saturation: 0.6, contrast: 1.08 },
  });
  // 102 minutes, 2,977 lives
  D.shot('in 102 minutes', {
    set: 'info:dark', in: 'fade', inDur: 0.3, mood: 'grief',
    enter: (c) => { const g = dotGrid(2977, 99, 0.28, 0xfff2d8); g.position.set(0, 0.6, 0.5); c.set.add(g); c.set.dots = g; },
    update: (c) => c.set.dots.userData.set((c.lt - 2.0) / 3.2),
    cam: { p: [[0, 0, 60], [0, 0, 56]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const a1 = clamp(c.lt / 0.5) * clamp((2.1 - c.lt) / 0.3);
      if (a1 > 0) { text(g, '102', 960, 590, { size: 280, weight: 800, align: 'center', color: '#f4f1ea', alpha: a1 }); text(g, 'MINUTES', 960, 680, { size: 46, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.4, alpha: a1 }); }
      if (c.lt > 2.0) { counter(g, c.lt, 0, 2977, 960, 1010, { t0: 2.0, d: 3.2, size: 90, color: '#f4f1ea' }); }
      if (c.lt > 5.4) text(g, 'lives', 1180, 1010, { size: 40, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((c.lt - 5.4) / 0.5) });
    },
    sfx: [[0, 'pianoNote', { n: 3 }]],
  });
  D.card('one hour after', '1 HOUR', 'AFTER THE ATTACKS', { mood: 'grief' });
}

// thousands of aircraft dots converging to airports and disappearing
function drawAirTraffic(g, lt, n, scale) {
  const airports = [[1560, 420], [1500, 520], [1180, 470], [880, 520], [640, 470], [420, 400], [380, 640], [1000, 700], [1300, 760], [760, 760], [1700, 360], [1240, 360]];
  const p = clamp((lt - 0.3) / 4.0);
  for (let i = 0; i < 900; i++) {
    const x0 = 300 + hash(i * 3) * 1400, y0 = 300 + hash(i * 7) * 520;
    const ap = airports[i % airports.length];
    const land = clamp((p - hash(i * 11) * 0.7) / 0.3);
    if (land >= 1) continue;
    const x = lerp(x0, ap[0], E.ioCubic(land)), y = lerp(y0, ap[1], E.ioCubic(land));
    g.fillStyle = `rgba(255,220,140,${0.85 * (1 - land * 0.5)})`;
    g.fillRect(x - 2, y - 2, 4, 4);
  }
  for (const [x, y] of airports) { g.strokeStyle = 'rgba(120,180,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke(); }
  const remain = Math.round(n * (1 - E.inCubic(p)));
  text(g, `${remain.toLocaleString('en-US')}`, 160, 200, { size: 96, weight: 800, color: '#ffd27a', p: clamp(lt / 0.4) });
  text(g, 'AIRCRAFT IN US AIRSPACE', 160, 250, { size: 30, weight: 800, color: '#f4f1ea', tracking: 0.2, p: clamp(lt / 0.4) });
  text(g, 'ordered to land immediately', 160, 300, { size: 32, fam: 'serif', italic: true, weight: 400, color: '#bdb6aa', p: clamp((lt - 0.5) / 0.4) });
}
