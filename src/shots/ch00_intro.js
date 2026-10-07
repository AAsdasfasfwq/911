// 0:00 - 0:57  Intro: the end of the 20th century, the towers, the threat taking shape.
import * as THREE from 'three';
import { camMove, camOrbit, setCam } from '../core/camera.js';
import { E, clamp, lerp, seg } from '../core/util.js';
import { C, headline, counter, dotCircle, lineChart, smearText, timeline, slabTower, infoPlane, pointer, underline } from './infokit.js';
import { makeClock } from '../assets/props.js';
import { text, W, H } from '../core/overlay.js';
import { CITIES } from '../assets/geo.js';

export default function intro(D, film) {
  // 1. Earth at the turn of the century
  D.shot('as the 20th century', {
    set: 'globe', dt: 0, in: 'fade', inDur: 1.2, bed: 'space', mood: 'hope',
    enter: (c) => { c.set.setSun(0.2, 0.35, -1); },
    update: (c) => {
      const s = c.set;
      s.earth.rotation.y = 1.9 + c.T * 0.012;
      const u = E.ioSine(clamp(c.lt / c.dur));
      const pos = new THREE.Vector3(0, 60, 330 - u * 40).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.2);
      setCam(c, pos, new THREE.Vector3(0, 40, 0), 34, 0, { shake: 0.05 });
    },
    sfx: [[0, 'riser', { dur: 2.2, gain: 0.5 }]],
  });
  // 2. Berlin, celebrations
  D.shot('humanity seemed', {
    set: 'europe:berlin', bed: 'crowdCheer', in: 'flash',
    cam: { p: [[-4, 1.4, 11], [-2.6, 1.6, 10]], l: [[0, 4.8, 0], [0.6, 5.2, -2]], fov: 40, shake: 0.4 },
    post: { dof: { focus: 10.5, aperture: 6, maxR: 8 } },
    sfx: [[0.2, 'fireworks', { gain: 0.5 }]],
  });
  // 3. Doomsday clock moves back
  D.shot('the threat of nuclear', {
    set: 'info:dark', in: 'whip', mood: 'tension',
    enter: (c) => {
      const clk = makeClock(); clk.scale.setScalar(38); clk.position.set(-6, 0.3, 1); c.set.add(clk); c.set.clk = clk;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.35, 16, 64), new THREE.MeshStandardMaterial({ color: 0x8a1018, roughness: 0.4, metalness: 0.6 })); ring.position.set(-6, 0.3, 1.2); c.set.add(ring);
    },
    update: (c) => { const p = E.ioCubic(clamp((c.lt - 0.6) / 1.6)); c.set.clk.userData.set(11, 53 - p * 10, 0); },
    cam: { p: [[2, 0.5, 52], [0, 0.2, 48]], l: [[0, 0, 0], [0, 0, 0]], fov: 20, shake: 0.1 },
    overlay: (c, g) => {
      headline(g, c.lt, 'the Doomsday Clock, 1991', 'MIDNIGHT', { x: 1240, y: 520, align: 'left', color: C.white, smallColor: '#c9c4ba', bigSize: 110 });
      const p = clamp((c.lt - 0.6) / 1.6);
      text(g, `${Math.round(7 + p * 10)} MINUTES TO`, 1240, 330, { size: 54, weight: 700, color: '#ff4a4a', p: clamp(c.lt / 0.5), blur: 8 });
    },
    sfx: [[0.6, 'clockTicks', { dur: 1.6 }]],
  });
  // 4. The western world (DC, golden)
  D.shot('the western world', {
    set: 'dc:golden', in: 'whip', mood: 'hope',
    cam: { p: [[30, 3, 230], [20, 8, 190]], l: [[0, 50, 0], [0, 58, 0]], fov: 38, ease: E.ioCubic },
    update: (c) => { c.set.flag.position.set(18, 0, 150); },
    post: { dof: { focus: 180, aperture: 3, maxR: 5 } },
  });
  // 5. Economic prosperity (Dow Jones)
  D.shot('economic prosperity', {
    set: 'info:paper', in: 'whip', dt: -0.3,
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const pts = [2634, 3169, 3301, 3754, 3834, 5117, 6448, 7908, 9181, 11497];
      const [ex, ey] = lineChart(g, c.lt, pts, 260, 330, 1100, 520, { d: 1.6, max: 12000, min: 0 });
      text(g, 'DOW JONES', 260, 270, { size: 34, weight: 800, color: C.ink, p: clamp(c.lt / 0.4), tracking: 0.12 });
      text(g, '1990 — 1999', 260, 900, { size: 30, weight: 500, color: C.grey, p: clamp(c.lt / 0.4), tracking: 0.1 });
      counter(g, c.lt, 2634, 11497, ex + 30, ey - 30, { size: 96, align: 'left', d: 1.6, color: C.red });
      text(g, 'the boom years', 1420, 330, { size: 44, weight: 400, fam: 'serif', italic: true, color: C.ink, p: clamp((c.lt - 0.6) / 0.6), blur: 8 });
    },
  });
  // 6. Technological progress (90s computer)
  D.shot('and technological progress', {
    set: 'rooms', in: 'whip', bed: 'officeAmb',
    enter: (c) => c.set.pod('office90'),
    cam: D.pc({ p: [[0.9, 1.25, -0.2], [0.55, 1.2, -0.5]], l: [[-0.1, 1.0, -1.75], [-0.1, 1.0, -1.75]], fov: 36, shake: 0.15 }),
    post: { dof: { focus: 1.2, aperture: 7, maxR: 9 } },
    sfx: [[0.1, 'modem', { dur: 2.2 }]],
  });
  // 7. History: catastrophes & world wars timeline
  D.shot('history with its global', {
    set: 'info:dark', in: 'glitch', mood: 'tension',
    cam: { p: [[0, 0, 60], [3, 0, 58]], l: [[0, 0, 0], [2, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      timeline(g, c.lt, 200, 1720, 600, [1914, 1918, 1939, 1945, 1962, 1991], { color: C.white, major: [1914, 1939, 1962, 1991], d: 1.4, allLabels: true });
      const labels = [['WORLD WAR I', 200], ['WORLD WAR II', 808], ['CUBAN MISSILE CRISIS', 1416], ['COLD WAR ENDS', 1720]];
      labels.forEach(([s, x], i) => text(g, s, x, 520, { size: 26, weight: 700, color: i === 3 ? '#ffd27a' : '#ff5a4a', align: 'center', p: clamp((c.lt - 0.25 - i * 0.28) / 0.5), blur: 8, tracking: 0.1 }));
      text(g, 'a century of catastrophe', 960, 330, { size: 56, weight: 400, fam: 'serif', italic: true, color: '#e8e2d6', align: 'center', p: clamp(c.lt / 0.6), blur: 10 });
    },
    sfx: [[0.1, 'whoosh', {}], [0.4, 'tick', {}], [0.7, 'tick', {}], [1.0, 'tick', {}], [1.3, 'tick', {}]],
  });
  // 8. A happy ending: sunrise over the planet
  D.shot('seemed to have reached', {
    set: 'globe', in: 'fade', inDur: 0.4, bed: 'space', mood: 'hope',
    enter: (c) => c.set.setSun(-0.6, 0.15, -1),
    update: (c) => {
      c.set.earth.rotation.y = 2.4 + c.T * 0.01;
      const u = E.ioSine(clamp(c.lt / c.dur));
      setCam(c, new THREE.Vector3(-20 + u * 15, 90, 210 - u * 20), new THREE.Vector3(-30, 98, 0), 30, 0, { shake: 0.05 });
    },
    post: { bloomStr: 1.2 },
  });
  // 9. In New York: aerial approach past the Statue of Liberty
  D.shot('in new york', {
    set: 'nyc', in: 'whip', bed: 'harbor', mood: 'hope',
    enter: (c) => { c.set.setTime('golden'); c.set.focus = [-800, 0, 1500]; c.set.focusSize = 2000; },
    cam: { p: [[-2420, 75, 3640], [-2180, 120, 3200]], l: [[-2240, 70, 3440], [-200, 260, 60]], fov: 40, ease: E.ioCubic, lookEase: E.ioCubic },
    post: { dof: null },
  });
  // 10. Interconnected world: arcs from New York
  D.shot('of this new interconnected', {
    set: 'globe', in: 'whip', bed: 'space',
    enter: (c) => {
      c.set.setSun(0.8, 0.4, 0.6);
      const ny = CITIES.nyc;
      ['london', 'paris', 'tokyo', 'rio', 'johannesburg', 'mumbai', 'sydney', 'moscow', 'mexico', 'toronto', 'singapore', 'cairo'].forEach((k, i) => { const a = c.set.addArc(ny, CITIES[k], { color: 0xffc070, intensity: 3, width: 0.25 }); a.delay = i * 0.12; });
      c.set.addMarker(ny, { color: 0xffd080, size: 0.9 });
    },
    update: (c) => {
      c.set.earth.rotation.y = 1.0 + c.lt * 0.04;
      c.set.arcs.forEach((a) => a.set((c.lt - a.delay) / 1.4));
      c.set.markers.forEach((m) => m.set(c.T));
      const p = c.set.viewFrom(-50, 30, 190 - c.lt * 10);
      setCam(c, p, new THREE.Vector3(0, 0, 0), 38, 0, { shake: 0.05 });
    },
    sfx: [[0.1, 'whoosh', {}], [0.3, 'ping', {}], [0.8, 'ping', {}]],
  });
  // 11. Two enormous towers piercing the sky (plaza, looking up)
  D.shot('two enormous towers', {
    set: 'nyc', in: 'whip', bed: 'cityAmb',
    enter: (c) => { c.set.setTime('clear'); c.set.focus = [-30, 0, 60]; c.set.focusSize = 300; },
    cam: { p: [[-70, 1.8, 100], [-66, 1.6, 96]], l: [[-60, 6, 60], [-20, 380, 40]], fov: 46, ease: E.ioCubic, shake: 0.2 },
    sfx: [[0.1, 'windGust', {}]],
  });
  // 12. 50,000 people worked there (cutaway)
  D.shot('50 000 people', {
    set: 'info:paper', in: 'whip', dt: -0.2,
    enter: (c) => {
      const t1 = slabTower({ antenna: true, fh: 0.12 }); t1.position.set(-9.5, -7.8, 0.8); c.set.add(t1);
      const t2 = slabTower({ fh: 0.12 }); t2.position.set(-5.6, -7.8, 0.4); c.set.add(t2);
      c.set.towers = [t1, t2];
    },
    update: (c) => {
      const p = clamp((c.lt - 0.2) / 2.2);
      c.set.towers.forEach((t, k) => { const n = t.userData.floors; for (let i = 0; i < n; i++) { const lit = hashLit(i, k) < p; t.userData.color(i, lit ? (i % 7 === 0 ? 0xc8102e : 0x2f2f33) : 0xc8ccd0); } });
    },
    cam: { p: [[0, 0, 60], [0, 0.3, 56]], l: [[0, 0, 0], [0, 0.3, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      counter(g, c.lt, 0, 50000, 1260, 560, { size: 200, d: 2.0, t0: 0.15, color: C.ink });
      text(g, 'people worked here', 1260, 650, { size: 50, weight: 400, fam: 'serif', italic: true, color: C.ink, align: 'center', p: clamp((c.lt - 0.4) / 0.6), blur: 8 });
      underline(g, 1260, 690, 420, (c.lt - 0.9) / 0.6, { align: 'center' });
      text(g, 'EVERY DAY', 1260, 780, { size: 40, weight: 800, color: C.red, align: 'center', tracking: 0.3, p: clamp((c.lt - 1.0) / 0.5), blur: 8 });
    },
    sfx: [[0.15, 'countUp', { dur: 2.0 }]],
  });
  // 13. Vital part of the global economy (office floor in the North Tower)
  D.shot('the towers were a vital', {
    set: 'nyc', in: 'whip', bed: 'officeAmb',
    enter: (c) => { c.set.officeN.group.visible = true; c.set.focus = [0, 300, 0]; c.set.focusSize = 80; },
    update: (c) => {
      const pp = c.set.officeN.people;
      pp.forEach((p, i) => {
        if (i < 4) { p.root.position.set(12 + i * 5.5 - 0.95, 0, -14 + i * 5.4 + 0.3); p.root.rotation.y = -Math.PI / 2 + Math.PI; p.pose('type', c.T + i, { seatH: 0.48 }); }
        else { p.root.position.set(8 + (i - 4) * 1.4, 0, -4 + c.lt * 0.6 * (i % 2 ? 1 : -1)); p.root.rotation.y = i % 2 ? 0 : Math.PI; p.pose('walk', c.T + i, { speed: 0.8 }); }
      });
    },
    cam: { p: [[6, 301.0, -12], [9, 301.2, -9]], l: [[31, 300.4, 6], [31, 300.6, 9]], fov: 48, shake: 0.2 },
    post: { exposure: 1.1 },
  });
  // 14. Monuments to engineering (orbit around the tops)
  D.shot('monuments to engineering', {
    set: 'nyc', in: 'whip', bed: 'windHigh',
    enter: (c) => { c.set.setTime('clear'); c.set.focus = [-20, 380, 60]; c.set.focusSize = 160; },
    orbit: { c: [-19, 360, 65], r: [260, 230], a: [200, 236], h: [60, 30], ly: [10, 30], fov: 40 },
  });
  // 15. Unshakable faith in the future (street level)
  D.shot('and to an unshakable', {
    set: 'nyc', in: 'whip', bed: 'cityAmb',
    enter: (c) => { c.set.setTime('golden'); c.set.focus = [165, 0, 80]; c.set.focusSize = 90; },
    update: (c) => c.set.street.heroes.forEach((p, i) => { p.root.position.set(156 + (i % 3) * 1.6, 0.45, 40 + i * 5 + c.lt * 1.3 * (i % 2 ? 1 : -1)); p.root.rotation.y = i % 2 ? 0 : Math.PI; p.pose('walk', c.T + i); }),
    cam: { p: [[176, 1.2, 120], [174, 1.6, 104]], l: [[150, 30, 60], [100, 160, 30]], fov: 50, shake: 0.3 },
    post: { exposure: 1.15 },
  });
  // 16. Sophisticated systems: the airport at dawn
  D.shot('no one imagined', {
    set: 'airport:dawn', in: 'fade', inDur: 0.3, bed: 'airportAmb', mood: 'tension',
    cam: { p: [[-260, 30, 150], [-220, 26, 130]], l: [[-60, 6, -20], [-40, 6, -20]], fov: 38 },
    post: { dof: { focus: 200, aperture: 3, maxR: 5 } },
  });
  D.shot('kept the modern world', {
    set: 'airport:dawn', in: 'whip',
    update: (c) => {
      const s = c.set, p = s.flying; p.visible = true;
      const u = c.lt / c.dur;
      p.position.set(-400 + u * 700, 2 + Math.max(0, u - 0.25) * 140, 420);
      const dir = new THREE.Vector3(1, Math.max(0, 0.18), 0);
      import_orient(p, dir, 0);
    },
    cam: { p: [[150, 1.8, 470], [150, 1.8, 470]], l: [[-200, 10, 420], [180, 70, 420]], fov: 40, ease: E.ioSine, shake: 0.5 },
    sfx: [[0.2, 'jetPass', { dur: 3.5, gain: 0.8 }]],
  });
  // 17. Would be turned against it: dark silhouette pass
  D.shot('would be turned against', {
    set: 'sky:golden', in: 'whip', mood: 'dark',
    update: (c) => {
      const p = c.set.planes[0]; p.visible = true;
      p.position.set(0, 0, -260 + c.lt * 160); import_orient(p, new THREE.Vector3(0, 0, 1), -0.25 + c.lt * 0.08);
      setCam(c, new THREE.Vector3(-18, -10, 30), new THREE.Vector3(p.position.x, p.position.y, p.position.z), 30, -8, { shake: 0.4 });
    },
    post: { exposure: 0.7, contrast: 1.25, saturation: 0.7, shadowTint: [0.08, -0.02, -0.02], vignette: 0.7 },
    sfx: [[0.0, 'jetLow', { dur: 1.8 }], [0.1, 'boomSoft', {}]],
  });
  // 18. Not from outer space
  D.shot('the threat wasn\'t coming', {
    set: 'globe', in: 'fade', inDur: 0.4, bed: 'space', mood: 'dark',
    enter: (c) => c.set.setSun(1, 0.1, -0.2),
    update: (c) => { c.set.earth.rotation.y = 4.0 + c.T * 0.01; const u = E.ioSine(clamp(c.lt / c.dur)); setCam(c, new THREE.Vector3(160, 40, 520 - u * 120), new THREE.Vector3(0, 0, 0), 30, 0, { shake: 0.03 }); },
    post: { exposure: 0.9 },
  });
  // 19. Taking shape in human minds: eyes in lantern light
  D.shot('it was taking shape', {
    set: 'cave', in: 'whip', bed: 'caveAmb',
    update: (c) => {
      const L = c.set.leader; L.root.position.set(0.2, -0.6, -6); L.root.rotation.y = 0.15; L.pose('stand', c.T); L.setExpr('calm');
      c.set.men.forEach((m, i) => { if (i) { m.root.position.set(-2 + i * 1.3, -0.6, -9); m.pose('sit', c.T + i, { seatH: 0.3 }); } });
    },
    cam: { p: [[0.35, 1.1, -4.85], [0.33, 1.12, -4.95]], l: [[0.2, 1.08, -6], [0.2, 1.1, -6]], fov: 28, shake: 0.15 },
    post: { dof: { focus: 1.05, aperture: 9, maxR: 12 }, exposure: 1.0 },
  });
  // 20. Far from the gleaming cities
  D.shot('far from the gleaming', {
    set: 'afghan:dusk', in: 'whip', bed: 'windMountain', mood: 'dark',
    cam: { p: [[-420, 180, 900], [-380, 170, 820]], l: [[0, 40, 0], [0, 40, 0]], fov: 38 },
  });
  // 21. Where time seemed to stand still
  D.shot('in places where time', {
    set: 'afghan:dusk', in: 'fade', inDur: 0.3,
    update: (c) => {
      const f = c.set.fighters;
      f.forEach((p, i) => { p.root.position.set(-30 + i * 1.6, c.set.H(-30 + i * 1.6, 160), 160); p.root.rotation.y = Math.PI * 0.9; p.pose(i === 2 ? 'walk' : 'stand', c.T + i, { speed: 0.5 }); });
    },
    cam: { p: [[-22, 8, 182], [-24, 8.5, 178]], l: [[-28, 4, 160], [-28, 4.5, 160]], fov: 34 },
    post: { dof: { focus: 22, aperture: 6, maxR: 8 } },
  });
  // Chapter card
  D.card('10 years before', '10 YEARS', 'BEFORE THE ATTACKS');
}

function hashLit(i, k) { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }
const _m = new THREE.Matrix4(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion();
export function import_orient(obj, dir, bank) {
  _f.copy(dir).normalize(); _r.crossVectors(new THREE.Vector3(0, 1, 0), _f).normalize(); _u.crossVectors(_f, _r).normalize();
  _m.makeBasis(_r, _u, _f); obj.quaternion.setFromRotationMatrix(_m);
  if (bank) { _q.setFromAxisAngle(_f, bank); obj.quaternion.premultiply(_q); }
}
