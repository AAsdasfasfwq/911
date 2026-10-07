// 7:01 - 8:12  One hour before: severe clear, airport security in 2001, boarding,
// the workday begins at the World Trade Center.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, smearText, mark, strike, underline, infoPlane, slabTower } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { import_orient as orient } from './ch00_intro.js';

export default function hour(D, film) {
  D.shot('the overnight storm', {
    set: 'nyc', in: 'fade', inDur: 0.5, bed: 'morningCity', mood: 'hope',
    enter: (c) => { c.set.setTime('dawn'); c.set.focus = [0, 0, 300]; c.set.focusSize = 1200; },
    cam: { p: [[2600, 300, 1800], [2450, 290, 1650]], l: [[0, 250, 0], [0, 250, 0]], fov: 32 },
  });
  D.shot('september 11 dawns', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.setTime('dawn'); c.set.focus = [0, 0, 60]; c.set.focusSize = 500; },
    cam: { p: [[1550, 8, 400], [1520, 10, 360]], l: [[0, 200, 40], [0, 210, 40]], fov: 30 },
    sfx: [[0.2, 'birds', { dur: 3 }]],
  });
  D.loc(D.peek('september 11 dawns') + 0.4, 4.6, 'New York — Tuesday, September 11, 2001');
  D.shot('the sky is a brilliant', {
    set: 'nyc', in: 'whip', bed: 'cityAmb',
    enter: (c) => { c.set.setTime('clear'); c.set.focus = [-20, 300, 60]; c.set.focusSize = 300; },
    cam: { p: [[30, 2, -60], [28, 2, -62]], l: [[-10, 300, 50], [-30, 420, 80]], fov: 52, ease: E.ioCubic },
  });
  D.shot('pilots have a name', {
    set: 'sky:clear', in: 'whip', bed: 'cockpitAmb',
    update: (c) => { const p = c.set.planes[0]; p.visible = true; p.position.set(0, 0, c.lt * 200); orient(p, new THREE.Vector3(0, 0, 1), 0); setCam(c, new THREE.Vector3(p.position.x + 30, 8, p.position.z - 40), new THREE.Vector3(p.position.x, 0, p.position.z + 40), 40, 0, { shake: 0.3 }); },
  });
  D.shot('severe clear', {
    set: 'info:blue', in: 'whip', dt: -0.15,
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d5fd8'); gr.addColorStop(1, '#8fc0f2'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      smearText(g, 'SEVERE CLEAR', 960, 590, clamp(c.lt / 0.6), { size: 200, align: 'center', color: '#ffffff', shadow: 'rgba(0,30,80,0.4)' });
      text(g, 'pilot slang: perfect visibility', 960, 680, { size: 40, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#e8f2ff', p: clamp((c.lt - 0.6) / 0.5) });
    },
    sfx: [[0, 'whooshBright', {}]],
  });
  D.shot('perfect flying weather', {
    set: 'sky:clear', in: 'whip',
    update: (c) => { const p = c.set.planes[1]; p.visible = true; p.position.set(c.lt * 30, c.lt * 20, c.lt * 190); orient(p, new THREE.Vector3(0.15, 0.1, 1), -0.2); setCam(c, new THREE.Vector3(p.position.x - 50, p.position.y - 25, p.position.z + 70), p.position, 34, 0, { shake: 0.25 }); },
    sfx: [[0, 'jetPass', { dur: 2.5, gain: 0.6 }]],
  });
  // 7:45 a.m. airports
  D.shot('7 45', {
    set: 'airport:morning', in: 'whip', bed: 'airportAmb', mood: 'tension',
    cam: { p: [[-30, 3, -170], [-20, 3.5, -165]], l: [[-40, 8, -110], [-40, 9, -110]], fov: 46 },
  });
  D.stamp(D.peek('7 45') + 0.6, 4.2, '7', 45, { label: 'Boston • Newark • Washington' });
  D.shot('boston newark and washington thousands', {
    set: 'rooms', in: 'whip', bed: 'terminal',
    enter: (c) => c.set.pod('security'),
    cam: D.pc({ p: [[6, 3.6, 9], [4, 3.2, 8]], l: [[-2, 1, 0], [-2, 1, 0]], fov: 44 }),
  });
  D.shot('in 2001 it\'s routine', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('security'),
    cam: D.pc({ p: [[-1.4, 1.6, 4.4], [-1.6, 1.6, 3.9]], l: [[-3, 1.4, 0], [-3, 1.4, 0]], fov: 40, shake: 0.2 }),
    post: { dof: { focus: 4, aperture: 5, maxR: 8 } },
  });
  // what was allowed in 2001
  D.shot('no body scanners', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      text(g, 'airport security, 2001', 960, 200, { size: 50, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp(c.lt / 0.5), blur: 8 });
      const items = [['BODY SCANNERS', false, c.shot.tA], ['SHOES OFF', false, c.shot.tB], ['LIQUIDS', true, c.shot.tC], ['SMALL KNIVES', true, c.shot.tD]];
      items.forEach(([s, ok, ta], i) => {
        const lt = c.T - ta;
        const x = i % 2 ? 1260 : 420, y = 470 + Math.floor(i / 2) * 260;
        text(g, s, x + 90, y + 26, { size: 68, weight: 800, align: 'left', color: lt > 0 ? C.ink : 'rgba(0,0,0,0.12)', p: 1 });
        if (lt > 0) mark(g, x, y, ok, lt / 0.3, { size: 50 });
        text(g, ok ? 'ALLOWED' : 'NONE', x + 90, y + 80, { size: 26, weight: 700, color: ok ? '#1f8a4c' : C.red, tracking: 0.3, p: clamp((lt - 0.2) / 0.3) });
      });
    },
  });
  { const s = D.last; s.tA = D.peek('no body scanners'); s.tB = D.peek('no taking off'); s.tC = D.peek('liquids'); s.tD = D.peek('and small knives'); s.sfx = [[s.tA - s.t0, 'buzz', {}], [s.tB - s.t0, 'buzz', {}], [s.tC - s.t0, 'ding', {}], [s.tD - s.t0, 'ding', {}]]; }
  // through the metal detectors
  D.shot('the terrorists walk', {
    set: 'rooms', in: 'whip', bed: 'terminal', mood: 'dark',
    enter: (c) => { const P = c.set.pod('security'); },
    cam: D.pc({ p: [[-3, 1.3, -2.6], [-3, 1.35, -2.4]], l: [[-3, 1.2, 1.2], [-3, 1.25, 0.8]], fov: 36, shake: 0.15 }),
    post: { dof: { focus: 3.4, aperture: 5, maxR: 8 } },
    sfx: [[1.5, 'detectorChime', {}]],
  });
  D.shot('some have box cutters', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('security'),
    cam: D.pc({ p: [[-4.6, 1.5, -0.1], [-4.55, 1.45, -0.2]], l: [[-3.95, 1.13, -0.25], [-3.95, 1.13, -0.25]], fov: 30, shake: 0.08 }),
    post: { dof: { focus: 0.7, aperture: 6, maxR: 9 } },
    sfx: [[0.2, 'xrayHum', { dur: 3 }]],
  });
  D.shot('under the security rules', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('security'); P.xrayOk = true; },
    cam: D.pc({ p: [[-4.6, 1.5, -0.1], [-4.6, 1.5, -0.1]], l: [[-3.95, 1.13, -0.25], [-3.95, 1.13, -0.25]], fov: 34, shake: 0.06 }),
    overlay: (c, g) => text(g, 'PERMITTED', 1400, 300, { size: 64, weight: 800, color: '#3aff7a', align: 'center', tracking: 0.25, p: clamp((c.lt - 0.6) / 0.4), shadow: 'rgba(0,0,0,0.7)' }),
    sfx: [[0.6, 'ding', {}]],
  });
  // passengers settle into their seats
  D.shot('passengers settle', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'cabinIdle', mood: 'somber',
    enter: (c) => c.set.pod('cabin'),
    cam: D.pc({ p: [[0, 1.7, -14], [0, 1.65, -12.5]], l: [[0, 1.2, 0], [0, 1.2, 0]], fov: 46, shake: 0.12 }),
  });
  // four flights
  D.shot('the 19 terrorists are spread', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const kinds = ['american', 'united', 'american', 'united'];
      c.set.pl = kinds.map((k, i) => { const p = infoPlane(k, 0.17); p.rotation.set(-0.4, -Math.PI / 2 + 0.3, 0); p.position.set(-11 + i * 7.3, 1.5, 1.5); c.set.add(p); return p; });
    },
    update: (c) => c.set.pl.forEach((p, i) => { const q = E.outCubic(clamp((c.lt - c.shot.tf[i]) / 0.6)); p.position.y = 1.5 + (1 - q) * 14; p.rotation.y = -Math.PI / 2 + 0.3 + Math.sin(c.T * 0.5 + i) * 0.05; }),
    cam: { p: [[0, -2, 50], [0, -1.6, 47]], l: [[0, 0, 0], [0, 0, 0]], fov: 24, shake: 0.05 },
    overlay: (c, g) => {
      const fl = [['11', 'AMERICAN', '#c8232c'], ['175', 'UNITED', '#3a6ad0'], ['77', 'AMERICAN', '#c8232c'], ['93', 'UNITED', '#3a6ad0']];
      fl.forEach(([n, a, col], i) => { const lt = c.T - c.shot.t0 - c.shot.tf[i]; const x = 340 + i * 413; text(g, n, x, 790, { size: 120, weight: 800, align: 'center', color: '#f4f1ea', p: clamp(lt / 0.4), blur: 12 }); text(g, a, x, 850, { size: 26, weight: 800, align: 'center', color: col, tracking: 0.3, p: clamp((lt - 0.2) / 0.4) }); });
      text(g, '4 FLIGHTS  •  19 HIJACKERS', 960, 200, { size: 48, weight: 800, align: 'center', color: '#f4f1ea', tracking: 0.12, p: clamp(c.lt / 0.5), blur: 8 });
    },
  });
  { const s = D.last; const t = [D.peek('11 175') , D.peek('175 77'), D.peek('77 and 93'), D.peek('and 93')]; s.tf = [t[0] - s.t0, t[1] - s.t0, t[2] - s.t0, t[3] + 0.2 - s.t0]; s.sfx = s.tf.map((x) => [x, 'thump', {}]); }
  D.shot('they take seats in business', {
    set: 'rooms', in: 'whip', bed: 'cabinIdle', mood: 'dark',
    enter: (c) => c.set.pod('cabin'),
    cam: D.pc({ p: [[0.3, 1.5, -3.5], [0.25, 1.48, -3.0]], l: [[-0.3, 1.2, 0.4], [-0.3, 1.2, 0.4]], fov: 40, shake: 0.12 }),
    post: { dof: { focus: 3.4, aperture: 5, maxR: 8 }, contrast: 1.1 },
  });
  // the workday at the WTC
  D.shot('at the world trade center the workday', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'cityAmb', mood: 'hope',
    enter: (c) => { c.set.setTime('clear'); c.set.focus = [-30, 0, 60]; c.set.focusSize = 160; },
    update: (c) => c.set.street.heroes.forEach((p, i) => { p.root.position.set(-110 + (i % 5) * 3, 0.6, 40 + Math.floor(i / 5) * 10 - c.lt * 1.4); p.root.rotation.y = Math.PI; p.pose('walk', c.T + i * 0.3); }),
    cam: { p: [[-96, 1.7, 30], [-98, 1.8, 26]], l: [[-60, 30, 90], [-60, 40, 90]], fov: 46, shake: 0.25 },
  });
  // high-speed elevators (cutaway)
  D.shot('high speed elevators', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const t = slabTower({ antenna: true, fh: 0.13, w: 3 }); t.position.set(-2, -7.5, 0.6); c.set.add(t); c.set.tw = t;
      c.set.cars = [];
      for (let i = 0; i < 6; i++) { const car = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0xc8102e, emissiveIntensity: 0.6 })); car.position.set(-2.9 + i * 0.36, -7, 1.45); c.set.add(car); c.set.cars.push(car); }
    },
    update: (c) => c.set.cars.forEach((car, i) => { const sp = 3 + (i % 3); const h = ((c.lt * sp + i * 2.3) % 14); car.position.y = -7.3 + h; }),
    cam: { p: [[0, 0, 44], [0, 0.5, 41]], l: [[0, 0, 0], [0, 0.5, 0]], fov: 24, shake: 0.04 },
    overlay: (c, g) => {
      headline(g, c.lt, '99 elevators per tower', '1,600 FT / MIN', { x: 1320, y: 560, align: 'left', bigSize: 96 });
      text(g, 'express cars to the sky lobbies on 44 and 78', 1320, 640, { size: 30, weight: 500, color: C.grey, p: clamp((c.lt - 0.8) / 0.5) });
    },
    sfx: [[0.1, 'elevatorDing', {}]],
  });
  D.card('the attacks at', 'THE ATTACKS', '', { bigSize: 150, smallFirst: false, accent: '#e0262e', mood: 'dark' });
}
