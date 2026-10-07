// 12:33 - 13:38  Twenty-four hours after: Ground Zero, the flyers, solidarity, the turn to war.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, smearText, meMap, pin } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { CITIES } from '../assets/geo.js';

export default function dayAfter(D, film) {
  const gz = (c, time = 'day') => { c.set.setMode('rubble'); c.set.setTime(time); c.set.cityDust = 0.25; c.set.focus = [-20, 0, 65]; c.set.focusSize = 160; };
  D.shot('smoke is still rising', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'groundZero', mood: 'grief',
    enter: (c) => { gz(c, 'day'); c.set.rubbleSmoke = 0.7; c.set.focusSize = 400; },
    cam: { p: [[900, 520, 1300], [860, 500, 1240]], l: [[-20, 100, 60], [-20, 120, 60]], fov: 34 },
  });
  D.loc(D.peek('smoke is still rising') + 0.2, 2.6, 'Ground Zero — September 12');
  D.shot('rescue workers firefighters', {
    set: 'nyc', in: 'whip', bed: 'groundZero',
    enter: (c) => gz(c),
    update: (c) => { const H = c.set.rubble.H; c.set.rubble.workers.forEach((w, i) => { const x = -40 + i * 1.6, z = 92 + (i % 2) * 1.2; w.root.position.set(x, H(x, z), z); w.root.rotation.y = Math.PI / 2; }); },
    cam: (c) => { const y = c.set.rubble.H(-30, 92); return { p: [[-14, y + 5, 104], [-17, y + 4.5, 101]], l: [[-34, y, 92], [-34, y + 0.5, 92]], fov: 42, shake: 0.3 }; },
    post: { dof: { focus: 18, aperture: 4, maxR: 7 } },
  });
  D.shot('dig through the rubble', {
    set: 'nyc', in: 'whip',
    enter: (c) => gz(c),
    update: (c) => { const H = c.set.rubble.H; c.set.rubble.workers.forEach((w, i) => { const x = -40 + i * 1.6, z = 92 + (i % 2) * 1.2; w.root.position.set(x, H(x, z), z); w.root.rotation.y = Math.PI / 2; }); },
    cam: (c) => { const y = c.set.rubble.H(-36.8, 92); return { p: [[-35.6, y + 1.2, 93.6], [-35.4, y + 1.15, 93.4]], l: [[-37.5, y + 0.3, 92.4], [-37.4, y + 0.3, 92.4]], fov: 34, shake: 0.3 }; },
    post: { dof: { focus: 2.2, aperture: 7, maxR: 10 } },
    sfx: [[0, 'rubbleDig', { dur: 2.4 }]],
  });
  D.shot('hoping to find survivors', {
    set: 'nyc', in: 'whip', bed: 'groundZero',
    enter: (c) => gz(c, 'smoke'),
    cam: { p: [[30, 6, 130], [24, 6.5, 120]], l: [[-30, 14, 30], [-30, 15, 30]], fov: 36, shake: 0.15 },
  });
  D.shot('many of them will soon', {
    set: 'nyc', in: 'fade', inDur: 0.3, mood: 'somber',
    enter: (c) => gz(c, 'smoke'),
    update: (c) => { const w = c.set.rubble.workers[0]; const y = c.set.rubble.H(-30, 80); w.root.position.set(-30, y, 80); w.root.rotation.y = 0.3; w.pose('stand', c.T); w.setExpr('sad'); },
    cam: (c) => { const y = c.set.rubble.H(-30, 80); return { p: [[-29.55, y + 1.65, 81.05], [-29.6, y + 1.66, 81.0]], l: [[-30, y + 1.6, 80], [-30, y + 1.6, 80]], fov: 32, shake: 0.15 }; },
    post: { dof: { focus: 1.1, aperture: 8, maxR: 12 }, saturation: 0.6 },
    sfx: [[0.6, 'cough', {}]],
  });
  D.shot('after exposure to the toxic', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const geo = new THREE.IcosahedronGeometry(0.25, 0); const mats = [0x8a8a8a, 0x6a6058, 0xb8b0a0, 0x5a7a8a].map((x) => new THREE.MeshStandardMaterial({ color: x, roughness: 0.7, metalness: 0.2 }));
      c.set.parts = []; for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(geo, mats[i % 4]); m.scale.setScalar(0.4 + hash(i) * 1.6); m.position.set((hash(i * 3) - 0.5) * 30, (hash(i * 7) - 0.5) * 16, hash(i * 11) * 6); c.set.add(m); c.set.parts.push(m); }
    },
    update: (c) => c.set.parts.forEach((m, i) => { m.rotation.set(c.T * 0.3 + i, c.T * 0.2 + i * 2, 0); m.position.y += Math.sin(c.T + i) * 0.002; }),
    cam: { p: [[0, 0, 30], [0, 0, 27]], l: [[0, 0, 0], [0, 0, 0]], fov: 30, shake: 0.05 },
    post: { dof: { focus: 27, aperture: 6, maxR: 10 } },
    overlay: (c, g) => {
      text(g, 'TOXIC DUST', 960, 520, { size: 120, weight: 800, align: 'center', color: '#f4f1ea', p: clamp(c.lt / 0.5), blur: 14, shadow: 'rgba(0,0,0,0.8)' });
      text(g, 'asbestos  •  lead  •  pulverized glass  •  concrete', 960, 600, { size: 34, weight: 500, align: 'center', color: '#ffb0a0', tracking: 0.05, p: clamp((c.lt - 0.6) / 0.6) });
    },
  });
  D.shot('thousands of flyers', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'streetSomber', mood: 'grief',
    enter: (c) => c.set.pod('flyers'),
    cam: D.pc({ p: [[-5, 1.6, 4.5], [-3.5, 1.6, 4.2]], l: [[-2, 1.6, 0], [-0.5, 1.6, 0]], fov: 40, shake: 0.15 }),
  });
  D.shot('families whose loved ones', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('flyers'),
    cam: D.pc({ p: [[-3.5, 1.5, 1.2], [-1.0, 1.5, 1.2]], l: [[-3.5, 1.5, 0], [-1.0, 1.5, 0]], fov: 32, shake: 0.12 }),
    post: { dof: { focus: 1.2, aperture: 6, maxR: 9 } },
  });
  D.shot('print their photographs', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('flyers'); P.showHand = true; },
    cam: D.pc({ p: [[1.8, 1.55, 1.6], [1.7, 1.55, 1.45]], l: [[1.2, 1.5, 0], [1.2, 1.5, 0]], fov: 34, shake: 0.12 }),
    post: { dof: { focus: 1.4, aperture: 6, maxR: 9 } },
    sfx: [[0.4, 'tape', {}]],
  });
  D.shot('walls around the world', {
    set: 'europe:paris', in: 'fade', inDur: 0.3, bed: 'vigil', mood: 'grief',
    cam: { p: [[0, 1.2, 14], [0, 1.4, 12]], l: [[0, 30, -500], [0, 34, -500]], fov: 40, shake: 0.12 },
    post: { dof: { focus: 12, aperture: 4, maxR: 7 } },
  });
  D.shot('the french newspaper', {
    set: 'rooms', in: 'whip', bed: 'cafe',
    enter: (c) => c.set.pod('newspaper'),
    cam: D.pc({ p: [[0.6, 1.3, 0.8], [0.45, 1.2, 0.6]], l: [[0, 0.77, 0.05], [0, 0.77, 0.05]], fov: 38, shake: 0.1 }),
    post: { dof: { focus: 1.0, aperture: 5, maxR: 8 } },
  });
  D.loc(D.peek('the french newspaper') + 0.3, 3.0, 'Paris — September 12, 2001');
  D.shot('today we are all americans', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('newspaper'),
    cam: D.pc({ p: [[0.0, 1.05, 0.12], [0.0, 1.0, 0.1]], l: [[0, 0.78, -0.02], [0, 0.78, -0.03]], fov: 40, shake: 0.06 }),
  });
  D.shot('even some of america\'s', {
    set: 'globe', in: 'whip', bed: 'space',
    enter: (c) => { c.set.setSun(0.5, 0.5, 0.8); ['tehran', 'tripoli', 'havana', 'moscow', 'beijing', 'cairo', 'delhi', 'tokyo', 'london', 'berlin', 'rome', 'madrid', 'istanbul', 'seoul', 'mexico', 'buenos', 'sydney', 'lagos', 'jakarta', 'mumbai'].forEach((k, i) => { const m = c.set.addMarker(CITIES[k], { color: 0xfff0c0, size: 0.6 }); m.delay = i * 0.15; }); },
    update: (c) => { c.set.earth.rotation.y = -0.6 + c.lt * 0.05; c.set.markers.forEach((m) => m.set(c.T, clamp((c.lt - m.delay) / 0.4))); setCam(c, c.set.viewFrom(40, 25, 250), new THREE.Vector3(0, 0, 0), 38, 0, { shake: 0.05 }); },
    overlay: (c, g) => text(g, 'CONDOLENCES FROM AROUND THE WORLD', 960, 980, { size: 34, weight: 800, align: 'center', color: '#fff0c0', tracking: 0.2, p: clamp((c.lt - 0.5) / 0.5) }),
  });
  D.shot('but within the united states', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'windSoft', mood: 'rage',
    enter: (c) => gz(c, 'golden'),
    cam: (c) => { const y = c.set.rubble.H(-8, 40) - 0.3; return { p: [[-5.5, y + 2.0, 44.5], [-5.8, y + 2.1, 44.2]], l: [[-7.6, y + 4.4, 40], [-7.6, y + 4.5, 40]], fov: 36, shake: 0.15 }; },
    post: { temp: 0.25, contrast: 1.12, dof: { focus: 5, aperture: 6, maxR: 9 } },
  });
  D.shot('a quiet searing rage', {
    set: 'nyc', in: 'whip',
    enter: (c) => gz(c, 'golden'),
    update: (c) => { const w = c.set.rubble.workers[3]; const y = c.set.rubble.H(-24, 70); w.root.position.set(-24, y, 70); w.root.rotation.y = 0.6; w.pose('stand', c.T); w.setExpr('stern'); },
    cam: (c) => { const y = c.set.rubble.H(-24, 70); return { p: [[-23.5, y + 1.68, 71.0], [-23.6, y + 1.67, 70.9]], l: [[-24, y + 1.62, 70], [-24, y + 1.62, 70]], fov: 30, shake: 0.12 }; },
    post: { dof: { focus: 1.1, aperture: 8, maxR: 12 }, temp: 0.2, contrast: 1.15 },
    sfx: [[0.1, 'lowDrone', { dur: 2.6 }]],
  });
  D.shot('intelligence agencies have already', {
    set: 'rooms', in: 'whip', bed: 'opsRoom', mood: 'tension',
    enter: (c) => { const P = c.set.pod('ops'); P.alert = true; },
    cam: D.pc({ p: [[-4, 2.6, 2], [-3, 2.5, 1.2]], l: [[0, 2.3, -5.9], [0, 2.3, -5.9]], fov: 40, shake: 0.2 }),
  });
  D.shot('laden and al', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const m = meMap(1.6, { default: 0xe2ddd3 }, { afghanistan: 0x6a1a1a }); m.position.set(-11, -2, 0); c.set.add(m); c.set.map = m;
      for (const k of ['kabul', 'kandahar']) { const p = pin(0x111111, 0.45); p.position.copy(m.userData.at(k, 1.0)).add(m.position); c.set.add(p); }
    },
    cam: { p: [[2, -4, 34], [1.5, -3.5, 31]], l: [[1, 0, 0], [1, 0.2, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => { headline(g, c.lt, 'sheltered by the Taliban', 'AFGHANISTAN', { x: 120, y: 240, align: 'left', bigSize: 110 }); text(g, 'AL-QAEDA', 1480, 520, { size: 44, weight: 800, color: C.red, tracking: 0.2, p: clamp((c.lt - 0.9) / 0.4) }); },
    sfx: [[0.5, 'pinDrop', {}], [0.8, 'pinDrop', {}]],
  });
  D.shot('the machinery of war', {
    set: 'carrier:dusk', in: 'whip', bed: 'carrierDeck', mood: 'war',
    update: (c) => { const sh = c.set.ship.position; c.set.focus = [sh.x + 40, 20, sh.z]; c.set.focusSize = 80; },
    cam: (c) => { const z = c.set.ship.position.z; return { p: [[110, 21.5, z + 5], [104, 21.6, z + 3]], l: [[40, 21, z - 10], [30, 21, z - 10]], fov: 40, shake: 0.3 }; },
    sfx: [[0.3, 'jetIdle', { dur: 3 }]],
  });
  D.card('one month after', '1 MONTH', 'AFTER THE ATTACKS', { mood: 'war' });
}
