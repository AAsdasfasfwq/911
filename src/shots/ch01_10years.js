// 0:57 - 2:32  Ten years before: 1991, end of the Cold War, Desert Storm, US bases in
// Saudi Arabia, the rise of al-Qaeda in Afghanistan and Sudan.
import * as THREE from 'three';
import { camMove, camOrbit, setCam } from '../core/camera.js';
import { E, clamp, lerp, seg, hash } from '../core/util.js';
import { C, headline, counter, dotCircle, smearText, timeline, slabTower, meMap, usMap, arc3, pin, mark, strike, underline, pointer, extrudeMap } from './infokit.js';
import { text, W, H } from '../core/overlay.js';
import { CITIES } from '../assets/geo.js';
import { fireball, smokePlume, flames, dustCloud } from '../fx/particles.js';
import { makeTank, makeHumvee } from '../assets/vehicles.js';
import { makeCapitol, makePentagon } from '../assets/buildings.js';
import { import_orient as orient } from './ch00_intro.js';
import { Screen } from '../assets/textures.js';

export default function tenYears(D, film) {
  // "it's 1991"
  D.shot("it's 1991", {
    set: 'info:red', dt: -0.15, mood: 'hope',
    cam: { p: [[0, 0, 60], [0, 0, 56]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      smearText(g, '1991', 960, 640, clamp(c.lt / 0.5), { size: 380, align: 'center', color: '#f4f1ea', weight: 800, shadow: 'rgba(0,0,0,0.35)', dist: 220 });
      text(g, 'the year everything seemed won', 960, 760, { size: 40, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#ffd8d0', p: clamp((c.lt - 0.4) / 0.5), blur: 8 });
    },
    sfx: [[0, 'boom', { gain: 0.6 }], [0.02, 'whoosh', {}]],
  });
  // world celebrating
  D.shot('the world is celebrating', {
    set: 'europe:berlin', in: 'flash', bed: 'crowdCheer', mood: 'hope',
    cam: { p: [[-14, 5, 26], [-6, 6, 22]], l: [[0, 6, -60], [2, 10, -80]], fov: 44, shake: 0.3 },
    sfx: [[0.3, 'fireworks', { gain: 0.6 }]],
  });
  D.shot('the end of the cold war', {
    set: 'europe:berlin', in: 'whip',
    cam: { p: [[2.6, 1.6, 2.6], [2.3, 1.7, 2.3]], l: [[1.4, 1.6, 0.2], [1.3, 1.7, 0.2]], fov: 38, shake: 0.5 },
    post: { dof: { focus: 2.3, aperture: 8, maxR: 10 } },
    update: (c) => { c.set.sparkFx.push((sp, T) => { const h = Math.max(0, Math.sin(T * 6)); if (h < 0.85) return; for (let i = 0; i < 20; i++) { const p = sp.push(); if (!p) return; const a = hash(i + Math.floor(T * 12) * 31); p.x = 1.4 + (a - 0.5) * 0.4; p.y = 1.5 + hash(i * 3) * 0.3; p.z = 0.2 + hash(i * 7) * 0.4; p.s = 0.02; p.r = 0; p.a = 1; p.cr = p.cg = p.cb = 0; p.er = 6; p.eg = 4; p.eb = 2; p.f = 0; p.lit = 0; } }); },
    sfx: [[0.1, 'hammer', { n: 4, every: 0.52 }]],
  });
  // Soviet Union final months: flag lowering over the Kremlin
  D.shot('the soviet union', {
    set: 'europe:moscow', in: 'fade', inDur: 0.3, bed: 'windSoft', mood: 'somber',
    enter: (c) => { c.set.lowerT = c.shot.t0 + 0.2; },
    cam: { p: [[30, 20, 40], [24, 26, 30]], l: [[0, 72, -80], [0, 74, -80]], fov: 30 },
    sfx: [[0.2, 'flagWind', {}]],
  });
  // The Berlin Wall has fallen
  D.shot('the berlin wall has fallen', {
    set: 'europe:berlin', in: 'whip', bed: 'crowdCheer',
    enter: (c) => { c.set.fallT = c.shot.t0 + 0.4; },
    cam: { p: [[9, 1.2, 9], [7, 1.4, 8]], l: [[3.6, 2, 0], [3.6, 1.2, 0.5]], fov: 40, shake: 0.4 },
    sfx: [[1.2, 'wallFall', {}], [1.4, 'crowdCheerBurst', {}]],
  });
  // Western democracy appears to have won
  D.shot('western democracy', {
    set: 'dc:golden', in: 'whip', bed: 'windSoft', mood: 'hope',
    update: (c) => c.set.flag.position.set(6, 0, 120),
    cam: { p: [[14, 18, 132], [12, 17, 131]], l: [[6, 17.5, 120], [4, 17, 118]], fov: 32, shake: 0.2 },
    post: { dof: { focus: 9, aperture: 6, maxR: 10 } },
  });
  // The United States stands alone: carrier group
  D.shot('the united states stands', {
    set: 'carrier', in: 'whip', bed: 'ocean',
    update: (c) => { const sh = c.set.ship.position; c.set.focus = [sh.x, 20, sh.z]; },
    cam: (c) => { const z = c.set.ship.position.z; return { p: [[260, 90, z + 260], [230, 70, z + 190]], l: [[0, 20, z], [0, 20, z]], fov: 36 }; },
    sfx: [[0.4, 'jetPass', { gain: 0.5, dur: 3 }]],
  });
  // The deserts of the Middle East: armour advancing at dawn
  D.shot('in the deserts of the middle', {
    set: 'desert:storm', in: 'whip', bed: 'desertWind', mood: 'tension',
    enter: (c) => { c.set.focus = [-30, 0, 0]; c.set.focusSize = 160; },
    update: (c) => {
      c.set.tanks.forEach((t, i) => c.set.fx.push((bb, T) => dustCloud(bb, T, { t0: T - 6, count: 18, seed: i * 7, spawn: 6, speed: 4, drag: 0.4, size: [3, 14], growT: 4, alpha: 0.35, rise: 0.6, center: [t.position.x, 1, t.position.z - 4], height: 1, color: [0.85, 0.72, 0.52], life: 6, jitter: 4 })));
    },
    cam: (c) => { const z = c.set.tanks[4].position.z; return { p: [[40, 3, z + 40], [30, 4, z + 30]], l: [[-30, 3, z], [-30, 3, z - 10]], fov: 40, shake: 0.5 }; },
    sfx: [[0, 'tankRumble', { dur: 2.4 }]],
  });
  // crush the Iraqi military
  D.shot('american forces crush', {
    set: 'desert:storm', in: 'whip',
    update: (c) => {
      const e = c.set.enemy[2].position, t0 = c.shot.t0 + 0.9;
      c.set.fx.push((bb, T) => fireball(bb, T, { t0, pos: [e.x, 2.5, e.z], dir: [0, 1, 0], count: 260, speed: 30, life: 6, size: [3, 26], bias: 0.5, hotTime: 0.9, buoy: 3, seed: 5 }));
      c.set.fx.push((bb, T) => smokePlume(bb, T, { t0: t0 + 0.4, count: 90, life: 30, rise: 5, wind: [3, 0, 1], size: [3, 40], pos: [e.x, 3, e.z], spread: [3, 2, 3], color: [0.06, 0.055, 0.05], alpha: 0.9, fire: 0.8, fireFade: 20, seed: 6 }));
      const b = c.set.tanks[1]; c.set.sparkFx.push((sp, T) => { const a = T - (c.shot.t0 + 0.6); if (a < 0 || a > 0.25) return; const p = sp.push(); const bp = b.position; p.x = bp.x; p.y = bp.y + 2.3; p.z = bp.z + 8; p.s = 6 * (1 - a * 3); p.r = 0; p.a = 1; p.cr = p.cg = p.cb = 0; p.er = 9; p.eg = 6; p.eb = 3; p.f = 0; p.lit = 0; });
    },
    cam: (c) => { const e = c.set.enemy[2].position; return { p: [[e.x - 60, 6, e.z - 140], [e.x - 50, 7, e.z - 120]], l: [[e.x, 4, e.z], [e.x, 6, e.z]], fov: 30, shake: 0.4, impact: { t: 0.9, amp: 1.5, decay: 4 } }; },
    sfx: [[0.6, 'tankShot', {}], [0.9, 'explosion', { gain: 0.8 }]],
  });
  // Operation Desert Storm map
  D.shot('during operation desert storm', {
    set: 'info:dark', in: 'whip', mood: 'tension',
    enter: (c) => {
      const m = meMap(0.9, { default: 0x3a3a40 }, { iraq: 0x8a1018, kuwait: 0xd8b25a, saudi: 0x2a3a5a }); m.position.set(4, 1.2, 0); c.set.add(m); c.set.map = m;
      const a1 = arc3(m.userData.at('riyadh', 1.0).add(m.position), m.userData.at('kuwait', 1.0).add(m.position), 2.5, 0x5a9aff, 0.1, 2); c.set.add(a1);
      const a2 = arc3(m.userData.at('dhahran', 1.0).add(m.position), m.userData.at('baghdad', 1.0).add(m.position), 4, 0x5a9aff, 0.1, 2); c.set.add(a2);
      c.set.arcs = [a1, a2];
    },
    update: (c) => c.set.arcs.forEach((a, i) => a.userData.set((c.lt - 0.3 - i * 0.3) / 1.0)),
    cam: { p: [[0, -8, 52], [0, -6, 48]], l: [[1, 1, 0], [1, 1.5, 0]], fov: 22, shake: 0.1 },
    overlay: (c, g) => {
      headline(g, c.lt, 'January – February 1991', 'OPERATION DESERT STORM', { x: 96, y: 200, align: 'left', color: C.white, smallColor: '#bdb6aa', bigSize: 84 });
      text(g, 'IRAQ', 560, 430, { size: 30, weight: 800, color: '#ffb0a8', tracking: 0.25, p: clamp((c.lt - 0.5) / 0.4) });
      text(g, 'KUWAIT', 820, 620, { size: 26, weight: 800, color: '#ffe0a0', tracking: 0.25, p: clamp((c.lt - 0.7) / 0.4) });
      text(g, 'SAUDI ARABIA', 640, 860, { size: 26, weight: 800, color: '#a8c0ff', tracking: 0.25, p: clamp((c.lt - 0.9) / 0.4) });
    },
    sfx: [[0.1, 'whoosh', {}], [0.4, 'dataBlip', {}], [0.7, 'dataBlip', {}]],
  });
  // overwhelming technological superiority: night vision
  D.shot('demonstrating overwhelming', {
    set: 'desert:night', in: 'glitch', bed: 'nightBattle',
    update: (c) => {
      const t0 = c.shot.t0;
      for (let k = 0; k < 4; k++) { const tt = t0 + 0.4 + k * 0.8, x = -200 + k * 140, z = 600 + hash(k) * 300; c.set.fx.push((bb, T) => fireball(bb, T, { t0: tt, pos: [x, 3, z], dir: [0, 1, 0], count: 140, speed: 40, life: 4, size: [6, 40], bias: 0.6, hotTime: 0.8, heat: 2, seed: k * 13 })); }
      c.set.sparkFx.push((sp, T) => { for (let i = 0; i < 160; i++) { const p = sp.push(); if (!p) return; const r1 = hash(i * 3), r2 = hash(i * 7); const age = ((T * 0.9 + r1 * 3) % 3); p.x = -300 + r2 * 600 + age * 20; p.y = 2 + age * 120 * (0.6 + r1); p.z = 500 + r1 * 300; p.s = 1.6; p.r = 0; p.a = 1 - age / 3; p.cr = p.cg = p.cb = 0; p.er = 8; p.eg = 7; p.eb = 5; p.f = 0; p.lit = 0; } });
    },
    cam: { p: [[0, 12, -80], [10, 14, -60]], l: [[0, 60, 600], [20, 70, 600]], fov: 36, shake: 0.6 },
    sfx: [[0.4, 'distantBoom', {}], [1.2, 'distantBoom', {}], [2.0, 'distantBoom', {}], [2.8, 'distantBoom', {}]],
  });
  // US bases on the Arabian peninsula
  D.shot('u s military bases', {
    set: 'desert:base', in: 'whip', bed: 'baseAmb', mood: 'neutral',
    cam: { p: [[-120, 40, 140], [-90, 30, 110]], l: [[0, 6, 0], [10, 6, -10]], fov: 40 },
    sfx: [[0.3, 'jetIdle', { dur: 3 }]],
  });
  D.shot('on the arabian peninsula', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const m = meMap(1.3, { default: 0xe2ddd3 }, { saudi: 0xd8c8a8 }); m.position.set(5, 6, 0); c.set.add(m); c.set.map = m;
      c.set.pins = [];
      for (const [k, col] of [['dhahran', 0x2a5ad0], ['riyadh', 0x2a5ad0], ['kuwait', 0x2a5ad0]]) { const p = pin(col, 0.4); p.position.copy(m.userData.at(k, 1.0)).add(m.position); c.set.add(p); c.set.pins.push(p); }
      for (const k of ['mecca']) { const p = pin(0xd8b25a, 0.5); p.position.copy(m.userData.at(k, 1.0)).add(m.position); c.set.add(p); c.set.pins.push(p); }
    },
    update: (c) => c.set.pins.forEach((p, i) => { const q = E.outBack(clamp((c.lt - 0.3 - i * 0.2) / 0.5)); p.scale.setScalar(Math.max(0.001, q)); }),
    cam: { p: [[0, -4, 48], [1, -3, 44]], l: [[0, -1, 0], [1, -1.5, 0]], fov: 24, shake: 0.05 },
    overlay: (c, g) => {
      headline(g, c.lt, 'a lasting foothold', 'US BASES', { x: 96, y: 210, align: 'left', bigSize: 96 });
      text(g, '1991 →', 100, 300, { size: 30, weight: 700, color: C.red, p: clamp((c.lt - 0.5) / 0.4), tracking: 0.1 });
    },
    sfx: [[0.3, 'pinDrop', {}], [0.5, 'pinDrop', {}], [0.7, 'pinDrop', {}]],
  });
  D.shot('at the heart of the islamic', {
    set: 'info:paper', in: 'zoom',
    enter: (c) => {
      const m = meMap(1.3, { default: 0xe2ddd3 }, { saudi: 0xd8c8a8 }); m.position.set(5, 6, 0); c.set.add(m);
      const p = pin(0xd8b25a, 0.55); p.position.copy(m.userData.at('mecca', 1.0)).add(m.position); c.set.add(p);
      const q = pin(0x2a5ad0, 0.4); q.position.copy(m.userData.at('riyadh', 1.0)).add(m.position); c.set.add(q);
      const r = pin(0x2a5ad0, 0.4); r.position.copy(m.userData.at('dhahran', 1.0)).add(m.position); c.set.add(r);
    },
    cam: { p: [[-4, -8, 30], [-4.5, -8.5, 26]], l: [[-4, -3, 0], [-4.5, -3.6, 0]], fov: 24, shake: 0.05 },
    overlay: (c, g) => {
      text(g, 'MECCA', 960, 470, { size: 44, weight: 800, color: '#8a6a1a', align: 'center', tracking: 0.3, p: clamp((c.lt - 0.3) / 0.5), blur: 8 });
      text(g, 'the holiest land of Islam', 960, 525, { size: 34, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp((c.lt - 0.6) / 0.5), blur: 8 });
      dotCircle(g, 960, 610, 70, c.lt, { color: '#8a6a1a' });
    },
  });
  // This new order seems unassailable
  D.shot('this new order', {
    set: 'desert:base', in: 'whip',
    cam: { p: [[6, 1.2, 10], [5, 1.3, 9]], l: [[0, 13, 0], [0, 14, 0]], fov: 34, shake: 0.2 },
    post: { exposure: 1.05 },
  });
  // But thousands of miles from Wall Street
  D.shot('but thousands of miles', {
    set: 'nyc', in: 'fade', inDur: 0.25, bed: 'cityAmb', mood: 'tension',
    enter: (c) => { c.set.setTime('golden'); c.set.focus = [500, 0, 400]; c.set.focusSize = 600; },
    cam: { p: [[1300, 240, 1200], [1200, 230, 1100]], l: [[400, 60, 300], [380, 60, 280]], fov: 38 },
  });
  D.shot('in the mountains of afghanistan', {
    set: 'afghan:day', in: 'whip', bed: 'windMountain', mood: 'dark',
    cam: { p: [[-900, 700, 2400], [-800, 680, 2200]], l: [[300, 500, -1500], [300, 480, -1500]], fov: 40 },
  });
  D.shot('and the deserts of the middle', {
    set: 'desert:dunes', in: 'whip', bed: 'desertWind',
    cam: { p: [[-160, 14, 260], [-130, 12, 230]], l: [[-40, 2, 60], [-40, 2, 60]], fov: 36 },
    update: (c) => c.set.fx.push((bb, T) => dustCloud(bb, T, { t0: -40, count: 140, seed: 3, spawn: 60, speed: 8, drag: 0.1, size: [4, 18], growT: 8, alpha: 0.2, rise: 0.2, center: [-40, 1, 60], height: 2, color: [0.95, 0.75, 0.5], life: 12, jitter: 120, dir: [1, 0, 0] })),
  });
  // Another force is emerging: silhouettes on the ridge
  D.shot('another force is emerging', {
    set: 'afghan:dusk', in: 'fade', inDur: 0.3, mood: 'dark',
    update: (c) => c.set.fighters.forEach((p, i) => { const x = 40 + i * 2.2, z = 380; p.root.position.set(x, c.set.H(x, z), z); p.root.rotation.y = -Math.PI / 2; p.pose('walk', c.T + i * 0.4, { speed: 0.6 }); p.root.position.z += c.lt * 0.8; }),
    cam: (c) => { const y = c.set.H(48, 380); return { p: [[48, y - 6, 340], [49, y - 6, 345]], l: [[48, y + 2, 382], [49, y + 2, 384]], fov: 30, shake: 0.2 }; },
    post: { exposure: 0.85, contrast: 1.15 },
  });
  // Ideology fueled by fanaticism (cave)
  D.shot('its strength lies', {
    set: 'cave', in: 'whip', bed: 'caveAmb',
    update: (c) => {
      const L = c.set.leader; L.root.position.set(0, -0.6, -9.2); L.root.rotation.y = 0; L.pose('podium', c.T); L.setExpr(Math.floor(c.T * 3) % 2 ? 'talk' : 'stern');
      c.set.men.forEach((m, i) => { if (i) { m.root.position.set(-1.6 + (i - 1) * 1.6, -0.6, -5.2 + (i % 2) * 0.6); m.root.rotation.y = Math.PI; m.pose('sit', c.T + i, { seatH: 0.32 }); } });
    },
    cam: { p: [[2.4, 0.9, -2.5], [1.8, 0.95, -3.2]], l: [[0, 0.9, -9], [0, 0.95, -9]], fov: 40, shake: 0.2 },
    post: { dof: { focus: 6.5, aperture: 5, maxR: 8 } },
  });
  D.shot('by fanaticism', {
    set: 'cave', in: 'whip',
    update: (c) => {
      const L = c.set.leader; L.root.position.set(0, -0.6, -9.2); L.pose('podium', c.T); L.setExpr('talk');
      c.set.men.forEach((m, i) => { if (i) { m.root.position.set(-1.6 + (i - 1) * 1.6, -0.6, -5.2 + (i % 2) * 0.6); m.root.rotation.y = Math.PI; m.pose('sit', c.T + i, { seatH: 0.32 }); m.setExpr('stern'); } });
    },
    cam: { p: [[-0.4, 0.55, -3.2], [-0.2, 0.6, -3.5]], l: [[-0.1, 0.65, -5.2], [0, 0.66, -5.2]], fov: 30, shake: 0.2 },
    post: { dof: { focus: 1.8, aperture: 8, maxR: 12 } },
  });
  // Not tanks or aircraft carriers
  D.shot('rather than tanks', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const t = makeTank('abrams'); t.scale.setScalar(0.75); t.position.set(-8, -2.5, 2); t.rotation.set(0.5, -0.6, 0); c.set.add(t); c.set.tank = t;
      const h = makeHumvee(); h.scale.setScalar(0.9); h.position.set(6, -2.8, 2); h.rotation.set(0.5, 0.7, 0); c.set.add(h); c.set.hv = h;
    },
    update: (c) => { c.set.tank.rotation.y = -0.6 + c.lt * 0.2; c.set.hv.rotation.y = 0.7 - c.lt * 0.2; },
    cam: { p: [[0, 0, 60], [0, 0, 56]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      text(g, 'not', 960, 220, { size: 52, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp(c.lt / 0.4), blur: 8 });
      text(g, 'TANKS', 560, 880, { size: 72, weight: 800, align: 'center', color: C.ink, p: clamp((c.lt - 0.2) / 0.4), blur: 8 });
      text(g, 'CARRIERS', 1380, 880, { size: 72, weight: 800, align: 'center', color: C.ink, p: clamp((c.lt - 0.5) / 0.4), blur: 8 });
      strike(g, 560, 860, 300, (c.lt - 0.9) / 0.35); strike(g, 1380, 860, 420, (c.lt - 1.2) / 0.35);
    },
    sfx: [[0.9, 'scratch', {}], [1.2, 'scratch', {}]],
  });
  // A small group of men hardened by guerrilla warfare
  D.shot('a small group of men', {
    set: 'afghan:dusk', in: 'whip', mood: 'dark',
    update: (c) => c.set.fighters.forEach((p, i) => { const x = -66 + i * 1.8, z = 150 - c.lt * 1.2 - (i % 2) * 1.5; p.root.position.set(x, c.set.H(x, z), z); p.root.rotation.y = Math.PI; p.pose('walk', c.T + i * 0.3, { speed: 0.7 }); }),
    cam: { p: [[-50, 2.5, 128], [-52, 2.6, 130]], l: [[-62, 2.5, 146], [-62, 2.5, 144]], fov: 34, shake: 0.3 },
    post: { dof: { focus: 18, aperture: 5, maxR: 8 } },
  });
  // Bring the battlefield to an enemy beyond its reach: Afghanistan -> New York
  D.shot('decides to bring', {
    set: 'globe', in: 'whip', bed: 'space', mood: 'tension',
    enter: (c) => { c.set.setSun(0.6, 0.6, 0.6); c.set.arc = c.set.addArc(CITIES.kabul, CITIES.nyc, { color: 0xff2a1a, intensity: 5, width: 0.4, lift: 0.3 }); c.set.addMarker(CITIES.kabul, { color: 0xff2a1a }); },
    update: (c) => {
      c.set.earth.rotation.y = 0.7 + c.lt * 0.05;
      c.set.arc.set(E.ioCubic(clamp((c.lt - 0.3) / 3.5)));
      c.set.markers.forEach((m) => m.set(c.T));
      setCam(c, c.set.viewFrom(10, 55, 230), new THREE.Vector3(0, 15, 0), 38, 0, { shake: 0.05 });
    },
    sfx: [[0.3, 'riser', { dur: 3.5, gain: 0.5 }]],
  });
  D.shot('a deadly course', {
    set: 'globe', in: 'whip',
    enter: (c) => { c.set.setSun(0.6, 0.6, 0.6); const a = c.set.addArc(CITIES.kabul, CITIES.nyc, { color: 0xff2a1a, intensity: 5, width: 0.4, lift: 0.3 }); a.set(1); c.set.addMarker(CITIES.nyc, { color: 0xff2a1a, size: 1.1 }); },
    update: (c) => { c.set.earth.rotation.y = 0.9 + c.lt * 0.02; c.set.markers.forEach((m) => m.set(c.T)); setCam(c, c.set.viewFrom(-70, 40, 120 - c.lt * 10), c.set.point(-74, 40.7), 34, 0, { shake: 0.1 }); },
    sfx: [[0.1, 'boom', { gain: 0.5 }]],
  });
  // For now it exists only as an idea: hand drawing in a notebook
  D.shot('for now it exists', {
    set: 'cave', in: 'fade', inDur: 0.3,
    enter: (c) => {
      const scr = new Screen(512, 384, (g, w, h, t) => {
        g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(80,90,140,0.35)'; for (let y = 30; y < h; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        const p = clamp(t / 2.4);
        g.strokeStyle = '#1a1a2a'; g.lineWidth = 3; g.lineCap = 'round';
        // two tall rectangles (towers) and an aircraft outline, drawn progressively
        const segs = [[150, 320, 150, 90], [150, 90, 200, 90], [200, 90, 200, 320], [230, 320, 230, 110], [230, 110, 280, 110], [280, 110, 280, 320], [380, 150, 470, 120], [420, 110, 430, 160]];
        segs.forEach((sg, i) => { const q = clamp(p * segs.length - i); if (q <= 0) return; g.beginPath(); g.moveTo(sg[0], sg[1]); g.lineTo(lerp(sg[0], sg[2], q), lerp(sg[1], sg[3], q)); g.stroke(); });
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ map: scr.tex, roughness: 0.9 }));
      m.rotation.x = -Math.PI / 2; m.position.set(0.3, -0.56, -4.2); c.set.addExtra(m); c.set.note = scr;
    },
    update: (c) => {
      c.set.note.update(c.lt);
      const L = c.set.men[2]; L.root.position.set(0.3, -0.6, -3.55); L.root.rotation.y = Math.PI; L.pose('kneel', c.T); L.j.shR.rotation.x = -0.9; L.j.elR.rotation.x = -0.5; L.j.head.rotation.x = 0.5;
    },
    cam: { p: [[0.65, 0.2, -4.0], [0.55, 0.15, -4.05]], l: [[0.3, -0.56, -4.2], [0.3, -0.56, -4.2]], fov: 34, shake: 0.12 },
    post: { dof: { focus: 0.85, aperture: 7, maxR: 10 } },
    sfx: [[0.2, 'pencil', { dur: 2.4 }]],
  });
  // Turn commercial aviation into a weapon
  D.shot('turn commercial aviation', {
    set: 'sky:golden', in: 'whip', bed: 'windHigh', mood: 'hope',
    update: (c) => {
      const p = c.set.planes[0]; p.visible = true; p.position.set(c.lt * 40, 0, c.lt * 200); orient(p, new THREE.Vector3(0.2, 0, 1), -0.05);
      setCam(c, new THREE.Vector3(p.position.x - 40, p.position.y + 6, p.position.z - 30 + c.lt * 3), p.position.clone().add(new THREE.Vector3(0, 0, 10)), 34, 0, { shake: 0.3 });
    },
    sfx: [[0, 'jetCruise', { dur: 4 }]],
  });
  D.shot('into a weapon', {
    set: 'sky:dusk', in: 'whip', mood: 'dark',
    update: (c) => {
      const p = c.set.planes[0]; p.visible = true; p.position.set(0, 0, -300 + c.lt * 230); orient(p, new THREE.Vector3(0, -0.05, 1), 0.3 - c.lt * 0.1);
      setCam(c, new THREE.Vector3(6, -4, 60), p.position, 26 - c.lt * 4, 4, { shake: 0.5 });
    },
    post: { exposure: 0.75, contrast: 1.3, saturation: 0.6, shadowTint: [0.1, -0.03, -0.03], vignette: 0.75 },
    sfx: [[0.1, 'jetLow', { dur: 2.2 }], [1.6, 'boom', { gain: 0.7 }]],
  });
  // Caves of Afghanistan
  D.shot('in the caves of', {
    set: 'afghan:dusk', in: 'whip', bed: 'windMountain',
    cam: (c) => { const p = c.set.caveWorld; return { p: [[p.x - 40, p.y + 6, p.z + 30], [p.x - 32, p.y + 5, p.z + 22]], l: [[p.x, p.y + 6, p.z], [p.x, p.y + 6, p.z]], fov: 36 }; },
  });
  // Training camps of Sudan
  D.shot('and the training camps', {
    set: 'camp', in: 'whip', bed: 'desertWind',
    cam: { p: [[14, 3, 34], [12, 2.6, 26]], l: [[-6, 1.4, 14], [-6, 1.4, 6]], fov: 40, shake: 0.4 },
    post: { dof: { focus: 18, aperture: 4, maxR: 6 } },
    sfx: [[0, 'footstepsRun', { dur: 2.2 }]],
  });
  D.shot('the terrorist organization', {
    set: 'camp:night', in: 'fade', inDur: 0.3, bed: 'campfire', mood: 'dark',
    cam: { p: [[7, 2.2, 7], [6, 2.0, 6]], l: [[0, 0.8, 0], [0, 0.8, 0]], fov: 38, shake: 0.2 },
  });
  // Under Osama bin Laden
  D.shot('under osama', {
    set: 'cave', in: 'whip', bed: 'caveAmb',
    update: (c) => { const L = c.set.leader; L.root.position.set(0, -0.6, -8.5); L.root.rotation.y = 0.1; L.pose('stand', c.T); L.setExpr('calm'); c.set.men.forEach((m, i) => { if (i) m.root.position.set(100, 0, 0); }); },
    cam: { p: [[0.8, 0.6, -3.5], [0.5, 0.7, -5.0]], l: [[0, 1.0, -8.5], [0, 1.05, -8.5]], fov: 30, shake: 0.15 },
    post: { dof: { focus: 4, aperture: 5, maxR: 8 }, contrast: 1.18 },
    sfx: [[0.1, 'heartbeat', { n: 2 }]],
  });
  // Striking at America's heart
  D.shot('the idea of striking', {
    set: 'info:red', in: 'glitch', mood: 'tension',
    enter: (c) => {
      const m = usMap(1.0, 0x2a0a0c); m.position.set(-1, -1, 0); c.set.add(m); c.set.map = m;
      c.set.pins = [pin(0xffffff, 0.45), pin(0xffffff, 0.45)];
      c.set.pins[0].position.copy(m.userData.at('nyc', 0.6)).add(m.position); c.set.pins[1].position.copy(m.userData.at('dc', 0.6)).add(m.position);
      c.set.pins.forEach((p) => c.set.add(p));
    },
    update: (c) => c.set.pins.forEach((p, i) => p.scale.setScalar(Math.max(0.001, E.outBack(clamp((c.lt - 0.4 - i * 0.25) / 0.4))))),
    cam: { p: [[2, -5, 52], [3, -4, 46]], l: [[2, 0, 0], [3, 0.5, 0]], fov: 24, shake: 0.1 },
    overlay: (c, g) => { headline(g, c.lt, "strike at America's", 'HEART', { x: 96, y: 260, align: 'left', color: '#f4f1ea', smallColor: '#ffd0c8', bigSize: 140 }); },
    sfx: [[0.4, 'targetLock', {}], [0.65, 'targetLock', {}]],
  });
  // Destroying the symbols of its power
  D.shot('destroying the symbols', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const t1 = slabTower({ antenna: true, fh: 0.09 }); t1.position.set(-9.5, -6, 1); const t2 = slabTower({ fh: 0.09 }); t2.position.set(-6.8, -6, 0.5);
      const cap = makeCapitol(); cap.scale.setScalar(0.032); cap.position.set(1.5, -6, 1);
      const pent = makePentagon(); pent.scale.setScalar(0.022); pent.rotation.x = 0.9; pent.position.set(10, -3, 1);
      [t1, t2, cap, pent].forEach((o) => c.set.add(o)); c.set.syms = [t1, t2, cap, pent];
      const rim = new THREE.DirectionalLight(0xff2a1a, 4); rim.position.set(0, 2, -6); c.set.add(rim);
    },
    update: (c) => c.set.syms.forEach((o, i) => { o.position.y = -6 + (1 - E.outCubic(clamp((c.lt - i * 0.15) / 0.7))) * -6 + (i === 3 ? 3 : 0); }),
    cam: { p: [[0, 2, 46], [0, 1.5, 42]], l: [[0, -1, 0], [0, -1.2, 0]], fov: 26, shake: 0.08 },
    overlay: (c, g) => text(g, 'SYMBOLS OF POWER', 960, 170, { size: 64, weight: 800, align: 'center', color: '#f4f1ea', tracking: 0.12, p: clamp((c.lt - 0.4) / 0.5), blur: 10 }),
    sfx: [[0.1, 'riseHit', {}]],
  });
  // Already in the air
  D.shot('is already in the air', {
    set: 'cave', in: 'whip',
    cam: { p: [[-1.3, 0.1, -3.4], [-1.35, 0.25, -3.5]], l: [[-1.6, -0.3, -4], [-1.6, 0.2, -4]], fov: 30, shake: 0.1 },
    update: (c) => c.set.fx.push((bb, T) => smokePlume(bb, T, { t0: -10, count: 40, life: 4, rise: 0.35, wind: [0.04, 0, 0], size: [0.05, 0.5], pos: [-1.6, -0.2, -4], spread: [0.03, 0, 0.03], color: [0.5, 0.45, 0.4], alpha: 0.35, seed: 3, turb: 0.4 })),
    post: { dof: { focus: 0.6, aperture: 7, maxR: 10 } },
  });
  // Still 10 long years away
  D.shot('the tragedy is still', {
    set: 'info:dark', in: 'fade', inDur: 0.25, mood: 'somber',
    cam: { p: [[0, 0, 60], [0, 0, 58]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      timeline(g, c.lt, 260, 1660, 600, [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001], { color: '#e8e2d6', major: [1991, 2001], d: 1.0, marker: [0, 1], mt0: 0.5, md: 2.4 });
      text(g, '10 YEARS', 960, 440, { size: 110, weight: 800, align: 'center', color: '#f4f1ea', p: clamp((c.lt - 0.2) / 0.5), blur: 14, tracking: 0.05 });
    },
    sfx: [[0.5, 'clockTicks', { dur: 2.4 }]],
  });
  // Seeds of hatred
  D.shot('but the seeds of hatred', {
    set: 'desert:dunes', in: 'fade', inDur: 0.3, bed: 'desertWind', mood: 'dark',
    update: (c) => c.set.fx.push((bb, T) => dustCloud(bb, T, { t0: -40, count: 160, seed: 9, spawn: 60, speed: 10, drag: 0.1, size: [1, 6], growT: 6, alpha: 0.25, rise: 0.1, center: [-10, 0.5, 0], height: 1.5, color: [0.95, 0.75, 0.5], life: 8, jitter: 30, dir: [1, 0, 0] })),
    cam: { p: [[-10, 1.2, 14], [-8, 1.4, 11]], l: [[0, 3, 0], [0, 3.2, 0]], fov: 34, shake: 0.15 },
    post: { exposure: 0.9, contrast: 1.15, vignette: 0.6 },
  });
  D.card('one year before', '1 YEAR', 'BEFORE THE ATTACKS');
}
