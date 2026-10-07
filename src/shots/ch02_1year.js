// 2:32 - 4:13  One year before: the boom, the hijackers in America, flight schools,
// intelligence warnings, bureaucracy.
import * as THREE from 'three';
import { camMove, camOrbit, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, dotCircle, smearText, lineChart, mark, strike, underline, card, docDraw, pointer, typeOn } from './infokit.js';
import { text, font, W, H } from '../core/overlay.js';
import { FONTS } from '../core/overlay.js';
import { fireworks } from '../fx/particles.js';
import { import_orient as orient } from './ch00_intro.js';
import { Person } from '../assets/people.js';

export default function oneYear(D, film) {
  // New century: millennium fireworks over Manhattan
  D.shot('the new century', {
    set: 'nyc', in: 'flash', bed: 'crowdCheer', mood: 'hope',
    enter: (c) => {
      c.set.setTime('night'); c.set.focus = [0, 0, 500]; c.set.focusSize = 1000;
      const B = []; for (let i = 0; i < 30; i++) B.push({ t: c.shot.t0 + 0.1 + i * 0.12 + hash(i) * 0.2, pos: [-400 + hash(i * 3) * 900, 200 + hash(i * 5) * 160, 900 + hash(i * 7) * 400], color: [[1, 0.3, 0.2], [0.3, 0.6, 1], [1, 0.85, 0.3], [0.4, 1, 0.5], [1, 0.4, 0.9], [1, 1, 1]][i % 6], n: 110, speed: 55, size: 4 });
      c.set.fireworks = B;
    },
    cam: { p: [[700, 60, 2400], [640, 70, 2300]], l: [[-60, 260, 400], [-60, 270, 400]], fov: 40 },
    post: { bloomStr: 1.3, exposure: 1.2 },
    sfx: [[0, 'fireworks', { gain: 0.8 }], [0.1, 'crowdCheerBurst', {}]],
  });
  // Y2K never materialized
  D.shot('the dreaded y2k', {
    set: 'rooms', in: 'whip', bed: 'officeAmb',
    enter: (c) => { const P = c.set.pod('office90'); P.mode = 'y2k'; },
    cam: D.pc({ p: [[0.35, 1.12, -0.95], [0.2, 1.1, -1.12]], l: [[-0.1, 1.04, -1.75], [-0.1, 1.04, -1.75]], fov: 34, shake: 0.12 }),
    post: { dof: { focus: 0.7, aperture: 6, maxR: 9 } },
    sfx: [[1.1, 'beep', { f: 1200 }], [1.3, 'relief', {}]],
  });
  // Economic boom: NASDAQ
  D.shot('america is enjoying', {
    set: 'info:paper', in: 'whip', dt: -0.2,
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const pts = [1000, 1100, 1250, 1300, 1500, 1700, 2000, 2200, 2300, 2700, 3000, 3700, 4100, 5048];
      const [ex, ey] = lineChart(g, c.lt, pts, 200, 300, 1150, 560, { d: 2.0, max: 5400, min: 0 });
      text(g, 'NASDAQ', 200, 250, { size: 36, weight: 800, color: C.ink, tracking: 0.14, p: clamp(c.lt / 0.4) });
      counter(g, c.lt, 1000, 5048, ex + 24, ey - 24, { size: 92, align: 'left', d: 2.0, color: C.red });
      headline(g, c.lt, 'the', 'BOOM', { x: 1640, y: 640, align: 'center', bigSize: 150, t0: 0.6 });
      text(g, '1995 — MARCH 2000', 200, 920, { size: 30, weight: 600, color: C.grey, tracking: 0.12, p: clamp(c.lt / 0.4) });
    },
    sfx: [[0.1, 'countUp', { dur: 2.0 }]],
  });
  // Internet companies everywhere
  D.shot('internet companies', {
    set: 'rooms', in: 'whip', bed: 'officeAmb',
    enter: (c) => c.set.pod('dotcom'),
    cam: D.pc({ p: [[-6, 2.6, 5], [-3, 2.2, 4]], l: [[0, 0.9, -1], [1, 0.9, -1]], fov: 44, shake: 0.25 }),
    sfx: [[0.2, 'keyboardBurst', { dur: 2 }]],
  });
  D.shot('people are investing', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('invest'),
    cam: D.pc({ p: [[0.5, 1.15, -1.0], [0.35, 1.12, -1.2]], l: [[0, 1.04, -1.95], [0, 1.04, -1.95]], fov: 34, shake: 0.1 }),
    post: { dof: { focus: 0.8, aperture: 6, maxR: 8 } },
    sfx: [[0.1, 'cashRegister', {}]],
  });
  D.shot('planning vacations', {
    set: 'suburb:florida', in: 'whip', bed: 'birds',
    cam: { p: [[-30, 2.5, 70], [-28, 2.6, 66]], l: [[-60, 6, 110], [-60, 6, 110]], fov: 44 },
  });
  D.shot('buying homes', {
    set: 'suburb:golden', in: 'whip', bed: 'birds',
    enter: (c) => {
      const sign = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xf2f2ee })); post.position.y = 0.8; sign.add(post);
      const board = card(1.0, 0.6, (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `800 ${h * 0.4}px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText('SOLD', w / 2, h * 0.65); }, { thick: 0.03 });
      board.position.set(0.55, 1.3, 0); sign.add(board);
      sign.position.set(-11, 0, -22); sign.rotation.y = Math.PI / 2; c.set.addExtra(sign);
    },
    cam: { p: [[-7, 1.4, -16], [-7.5, 1.5, -17]], l: [[-11, 1.2, -22], [-11, 1.3, -22]], fov: 40, shake: 0.15 },
    post: { dof: { focus: 7, aperture: 6, maxR: 9 } },
  });
  // Feeling safe was taken for granted
  D.shot('feeling safe', {
    set: 'suburb:golden', in: 'fade', inDur: 0.3, mood: 'hope',
    cam: { p: [[-4, 1.1, -30], [-5, 1.2, -32]], l: [[-20, 1.0, -40], [-20, 1.0, -40]], fov: 36, shake: 0.2 },
    post: { dof: { focus: 16, aperture: 5, maxR: 8 } },
  });
  // But the men are already here
  D.shot('but the men who will', {
    set: 'suburb:dusk', in: 'fade', inDur: 0.4, mood: 'dark', bed: 'eveningAmb',
    enter: (c) => {
      const ps = []; for (let i = 0; i < 3; i++) { const p = new Person({ seed: 3001 + i, jacket: null, shirt: ['#3a3a3e', '#e8e6e0', '#4a5a6a'][i], skin: '#c48a62', hairColor: '#1a1612' }); c.set.addExtra(p.root); ps.push(p); }
      c.set.men = ps;
    },
    update: (c) => c.set.men.forEach((p, i) => { p.root.position.set(-4 + i * 0.9, 0, 30 - c.lt * 1.2 + (i % 2) * 0.8); p.root.rotation.y = Math.PI; p.pose('walk', c.T + i * 0.4, { speed: 0.8 }); }),
    cam: { p: [[2, 1.6, 10], [1.5, 1.6, 12]], l: [[-3, 1.4, 28], [-3, 1.4, 26]], fov: 32, shake: 0.2 },
    post: { exposure: 0.95, contrast: 1.15, dof: { focus: 18, aperture: 5, maxR: 8 } },
    sfx: [[0.2, 'lowDrone', { dur: 3 }]],
  });
  D.shot('they live openly', {
    set: 'suburb:florida', in: 'whip', bed: 'suburbDay',
    cam: { p: [[-20, 12, 160], [-24, 10, 150]], l: [[-60, 4, 120], [-60, 4, 120]], fov: 42 },
  });
  D.shot('they eat burgers', {
    set: 'rooms', in: 'whip', bed: 'diner',
    enter: (c) => c.set.pod('diner'),
    cam: D.pc({ p: [[0.55, 1.05, -1.6], [0.45, 1.0, -1.7]], l: [[0.1, 0.82, -2.0], [0.1, 0.82, -2.0]], fov: 34, shake: 0.12 }),
    post: { dof: { focus: 0.6, aperture: 7, maxR: 10 } },
  });
  D.shot('work out at gyms', {
    set: 'rooms', in: 'whip', bed: 'gym',
    enter: (c) => c.set.pod('gym'),
    cam: D.pc({ p: [[1.8, 1.4, 1.2], [1.6, 1.5, 0.8]], l: [[0, 1.3, -1.5], [0, 1.3, -1.5]], fov: 36, shake: 0.2 }),
    post: { dof: { focus: 2.8, aperture: 5, maxR: 8 } },
  });
  D.shot('go shopping', {
    set: 'rooms', in: 'whip', bed: 'store',
    enter: (c) => c.set.pod('store'),
    cam: D.pc({ p: [[0.4, 1.6, 6], [0.3, 1.6, 5.2]], l: [[0, 1.2, -6], [0, 1.2, -6]], fov: 42, shake: 0.2 }),
  });
  // Atta, al-Shehhi, Jarrah (ID cards, no faces)
  D.shot('mohammed atta marwan', {
    set: 'info:dark', in: 'whip', mood: 'dark',
    enter: (c) => {
      const names = [['MOHAMED ATTA', 'Egypt', '33'], ['MARWAN AL-SHEHHI', 'UAE', '23'], ['ZIAD JARRAH', 'Lebanon', '26']];
      c.set.cards = names.map((n, i) => {
        const m = card(5.2, 7, (g, w, h) => {
          g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#2a2a2e'; g.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.52);
          g.fillStyle = '#4a4a50'; g.beginPath(); g.ellipse(w / 2, h * 0.3, w * 0.17, h * 0.13, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.56, w * 0.3, h * 0.14, 0, Math.PI, Math.PI * 2); g.fill();
          g.fillStyle = '#d8d2c6'; g.font = `700 ${h * 0.05}px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText('?', w / 2, h * 0.33);
          g.fillStyle = '#111'; g.font = `800 ${h * 0.052}px ${FONTS.sans}`; g.fillText(n[0], w / 2, h * 0.71);
          g.fillStyle = '#7a1418'; g.font = `600 ${h * 0.04}px ${FONTS.mono}`; g.fillText(`${n[1].toUpperCase()}  •  AGE ${n[2]}`, w / 2, h * 0.8);
          g.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 0; k < 30; k++) g.fillRect(w * 0.15 + k * w * 0.023, h * 0.86, (k % 3 + 1) * 2, h * 0.07);
        }, { thick: 0.06 });
        m.position.set(-6.5 + i * 6.5, -0.5, 1); m.rotation.set(0.05, (i - 1) * -0.15, (i - 1) * 0.03); c.set.add(m); return m;
      });
    },
    update: (c) => c.set.cards.forEach((m, i) => { const q = E.outCubic(clamp((c.lt - i * 0.35) / 0.7)); m.position.y = -0.5 - (1 - q) * 14; m.rotation.z = (i - 1) * 0.03 + (1 - q) * 0.6; }),
    cam: { p: [[0, -1, 48], [0, -0.6, 44]], l: [[0, -0.5, 0], [0, -0.5, 0]], fov: 22, shake: 0.08 },
    sfx: [[0.0, 'cardSlide', {}], [0.35, 'cardSlide', {}], [0.7, 'cardSlide', {}]],
  });
  D.shot('are young educated', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      headline(g, c.lt, 'young, educated', 'NOT POOR. NOT DESPERATE.', { x: 960, y: 560, bigSize: 92 });
      text(g, 'university • languages • middle-class families', 960, 680, { size: 34, weight: 500, color: C.grey, align: 'center', tracking: 0.06, p: clamp((c.lt - 0.8) / 0.6), blur: 8 });
    },
  });
  // One specific purpose: passport stamp
  D.shot('they have come to', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const pp = card(9, 6.2, (g, w, h) => {
        g.fillStyle = '#f2ecdc'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(40,60,90,0.25)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(w * 0.7, h * 0.5, 20 + i * 14, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = '#2a3a5a'; g.font = `700 ${h * 0.05}px ${FONTS.mono}`; g.fillText('VISA', w * 0.06, h * 0.1);
        g.fillStyle = '#333'; g.font = `400 ${h * 0.04}px ${FONTS.mono}`; ['TYPE  B-1/B-2', 'ISSUED 2000', 'ENTRIES  M'].forEach((s, i) => g.fillText(s, w * 0.06, h * (0.25 + i * 0.08)));
      }, { thick: 0.05 });
      pp.position.set(0, 0, 0.5); pp.rotation.z = -0.06; c.set.add(pp);
      const stamp = card(3.6, 2.2, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.strokeStyle = '#1f4a8a'; g.lineWidth = h * 0.06; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); g.fillStyle = '#1f4a8a'; g.font = `800 ${h * 0.26}px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText('ADMITTED', w / 2, h * 0.48); g.font = `600 ${h * 0.14}px ${FONTS.mono}`; g.fillText('MIAMI  JUN 2000', w / 2, h * 0.75); }, { thick: 0.01 });
      stamp.material[4].transparent = true; stamp.position.set(1.5, -0.6, 0.62); stamp.rotation.z = 0.12; c.set.add(stamp); c.set.stamp = stamp;
    },
    update: (c) => { const q = clamp((c.lt - 0.5) / 0.12); c.set.stamp.visible = c.lt > 0.5; c.set.stamp.scale.setScalar(1 + (1 - q) * 0.6); },
    cam: { p: [[0, 0, 30], [0, 0, 27]], l: [[0, 0, 0], [0, 0, 0]], fov: 22, shake: 0.05, impact: { t: 0.55, amp: 0.6, decay: 6 } },
    sfx: [[0.5, 'stamp', {}]],
  });
  // Florida flight school, Sept 2000
  D.shot('in september 2000', {
    set: 'flightschool', in: 'whip', bed: 'airfield', mood: 'neutral',
    cam: { p: [[60, 2, 30], [50, 2.2, 22]], l: [[20, 1.5, 0], [10, 1.5, 0]], fov: 40, shake: 0.3 },
    sfx: [[0.1, 'propPlane', { dur: 3 }]],
  });
  D.loc(D.peek('in september 2000') + 0.3, 2.6, 'Venice, Florida — 2000');
  D.shot('fly commercial airliners', {
    set: 'rooms', in: 'whip', bed: 'simRoom',
    enter: (c) => { const P = c.set.pod('sim'); P.simParams = { roll: 0, spd: 480 }; P.instrPose = 'arms'; },
    cam: D.pc({ p: [[0.1, 1.5, 1.6], [0.05, 1.45, 1.2]], l: [[0, 1.4, -2.6], [0, 1.4, -2.6]], fov: 44, shake: 0.15 }),
  });
  // Instructors find it strange
  D.shot('their instructors find', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('sim'); P.simParams = {}; P.instrPose = 'arms'; P.people[1].setExpr('worried'); },
    cam: D.pc({ p: [[0.4, 1.7, 2.6], [0.6, 1.75, 2.2]], l: [[1.6, 1.62, 0.4], [1.6, 1.64, 0.4]], fov: 34, shake: 0.15 }),
    post: { dof: { focus: 2.0, aperture: 6, maxR: 9 } },
  });
  // No interest in take-off or landing
  D.shot('these students have no', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      text(g, 'what they wanted to learn', 960, 220, { size: 48, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp(c.lt / 0.5), blur: 8 });
      const rows = [['TAKE-OFF', false, 0.4], ['LANDING', false, 0.7], ['FLYING AT CRUISE', true, 1.6]];
      rows.forEach(([s, ok, t], i) => {
        const y = 420 + i * 170;
        text(g, s, 760, y + 24, { size: 72, weight: 800, align: 'left', color: ok ? C.ink : '#8a867e', p: clamp((c.lt - t) / 0.4), blur: 8 });
        mark(g, 660, y, ok, (c.lt - t - 0.15) / 0.3, { size: 46 });
        if (!ok) strike(g, 760 + 180, y + 4, 380, (c.lt - t - 0.3) / 0.3);
      });
    },
    sfx: [[0.55, 'buzz', {}], [0.85, 'buzz', {}], [1.75, 'ding', {}]],
  });
  D.shot('all they want to know', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('sim'); P.simParams = null; },
    update: (c) => { const P = c.set.active; P.simParams = { roll: Math.sin(c.lt * 1.2) * 0.5, pitch: Math.sin(c.lt * 0.8) * 0.05, hdg: Math.round(200 + c.lt * 25) % 360 }; },
    cam: D.pc({ p: [[-0.4, 1.35, 0.5], [-0.45, 1.3, 0.3]], l: [[-0.3, 1.25, -2.6], [-0.2, 1.3, -2.6]], fov: 40, shake: 0.2 }),
  });
  D.shot('steer and maneuver', {
    set: 'sky:day', in: 'whip', bed: 'windHigh',
    update: (c) => { const p = c.set.planes[2]; p.visible = true; p.position.set(Math.sin(c.lt * 0.5) * 80, 0, c.lt * 220); orient(p, new THREE.Vector3(Math.cos(c.lt * 0.5) * 0.4, 0, 1), 0.55); setCam(c, new THREE.Vector3(p.position.x + 70, 18, p.position.z - 40), p.position, 36, 0, { shake: 0.4 }); },
    sfx: [[0, 'jetCruise', { dur: 3 }]],
  });
  // A paying customer
  D.shot('but in a free country', {
    set: 'rooms', in: 'whip', bed: 'officeAmb',
    enter: (c) => c.set.pod('counter'),
    cam: D.pc({ p: [[0.7, 1.55, -0.6], [0.5, 1.45, -0.9]], l: [[-0.2, 1.05, -1.45], [-0.15, 1.05, -1.45]], fov: 36, shake: 0.15 }),
    post: { dof: { focus: 1.0, aperture: 6, maxR: 9 } },
    sfx: [[0.3, 'cashCount', { dur: 1.5 }]],
  });
  // Intelligence agencies: warning lights flashing
  D.shot('meanwhile inside the intelligence', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'opsRoom', mood: 'tension',
    enter: (c) => { const P = c.set.pod('ops'); P.alert = false; },
    cam: D.pc({ p: [[-7, 3.4, 5.5], [-5, 3.2, 5]], l: [[0, 1.8, -5], [0, 1.8, -5]], fov: 44, shake: 0.2 }),
  });
  D.shot('warning lights are flashing', {
    set: 'rooms', in: 'glitch',
    enter: (c) => { const P = c.set.pod('ops'); P.alert = true; },
    cam: D.pc({ p: [[3, 2.6, 0.5], [2, 2.5, 0]], l: [[0, 2.4, -5.9], [0, 2.4, -5.9]], fov: 40, shake: 0.3 }),
    sfx: [[0, 'alarm', { dur: 2.2 }]],
  });
  // Tenet: "the system was blinking red"
  D.shot('cia director george', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      text(g, '"', 300, 440, { size: 300, fam: 'serif', italic: true, weight: 400, color: C.red, p: clamp(c.lt / 0.3) });
      smearText(g, 'THE SYSTEM WAS', 960, 470, clamp((c.lt - 0.2) / 0.6), { size: 110, align: 'center', color: C.white });
      smearText(g, 'BLINKING RED', 960, 600, clamp((c.lt - 0.5) / 0.6), { size: 130, align: 'center', color: Math.floor(c.lt * 3) % 2 ? '#ff2a1a' : '#a01010' });
      text(g, '— George Tenet, Director of Central Intelligence', 960, 720, { size: 30, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 1.2) / 0.5), blur: 8 });
    },
    sfx: [[0.5, 'alarmShort', {}]],
  });
  // Intercepted conversations
  D.shot('intercepted conversations', {
    set: 'rooms', in: 'whip', bed: 'interceptRoom',
    enter: (c) => c.set.pod('intercept'),
    cam: D.pc({ p: [[1.6, 1.5, 1.5], [1.2, 1.4, 1.1]], l: [[0, 1.2, -0.75], [0, 1.2, -0.75]], fov: 40, shake: 0.15 }),
    sfx: [[0.1, 'radioStatic', { dur: 3 }]],
  });
  D.shot('preparing something enormous', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 56]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const n = Math.floor(clamp(c.lt / 3) * 140);
      for (let i = 0; i < n; i++) { const x = 300 + hash(i * 3) * 1320, y = 260 + hash(i * 7) * 560; const a = clamp((c.lt - i / 140 * 3) / 0.3); g.globalAlpha = a; g.fillStyle = i % 9 === 0 ? '#ff3a2a' : '#b8b0a4'; g.font = `600 16px ${FONTS.mono}`; g.fillText(['UBL', 'AQ', 'ATTACK', 'US', 'PLANES', 'SOON', 'BIG', 'WEDDING'][i % 8], x, y); }
      g.globalAlpha = 1;
      smearText(g, 'SOMETHING ENORMOUS', 960, 580, clamp((c.lt - 1.2) / 0.6), { size: 110, align: 'center', color: '#ff3a2a', shadow: 'rgba(0,0,0,0.9)' });
    },
    sfx: [[0.1, 'dataRain', { dur: 3 }]],
  });
  D.shot('intelligence agencies pick up', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('intercept'),
    cam: D.pc({ p: [[-0.25, 1.15, -0.35], [-0.3, 1.13, -0.45]], l: [[-0.35, 1.02, -0.75], [-0.35, 1.02, -0.75]], fov: 36, shake: 0.12 }),
    post: { dof: { focus: 0.45, aperture: 6, maxR: 9 } },
  });
  D.shot('a big wedding', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('intercept'),
    cam: D.pc({ p: [[0.55, 1.12, -0.38], [0.5, 1.1, -0.45]], l: [[0.45, 1.02, -0.75], [0.45, 1.02, -0.75]], fov: 34, shake: 0.1 }),
    post: { dof: { focus: 0.4, aperture: 6, maxR: 9 } },
    sfx: [[0.1, 'typewriter', { dur: 3 }]],
  });
  // Bureaucracy
  D.shot('but bureaucracy', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'officeHum', mood: 'somber',
    enter: (c) => c.set.pod('bureau'),
    cam: D.pc({ p: [[0, 1.6, 6], [0, 1.6, 2]], l: [[0, 1.4, -18], [0, 1.4, -18]], fov: 40, shake: 0.15 }),
  });
  D.shot('the failure of the fbi', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const p = E.outCubic(clamp(c.lt / 0.8));
      for (const [x, lbl, col] of [[600, 'FBI', '#1c2a5a'], [1320, 'CIA', '#5a1a1a']]) {
        g.fillStyle = col; g.beginPath(); g.arc(x, 540, 170 * p, 0, Math.PI * 2); g.fill();
        text(g, lbl, x, 575, { size: 96, weight: 800, align: 'center', color: '#fff', p: clamp((c.lt - 0.4) / 0.4) });
      }
      // broken link
      const q = clamp((c.lt - 0.8) / 0.6);
      g.setLineDash([18, 14]); g.strokeStyle = C.red; g.lineWidth = 8; g.beginPath(); g.moveTo(790, 540); g.lineTo(790 + 160 * q, 540); g.moveTo(1130, 540); g.lineTo(1130 - 160 * q, 540); g.stroke(); g.setLineDash([]);
      if (c.lt > 1.4) { mark(g, 960, 540, false, (c.lt - 1.4) / 0.3, { size: 56 }); }
      text(g, 'information not shared', 960, 860, { size: 46, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp((c.lt - 1.6) / 0.5), blur: 8 });
    },
    sfx: [[1.4, 'buzz', {}]],
  });
  D.shot('and a simple human', {
    set: 'rooms', in: 'whip', bed: 'officeHum',
    enter: (c) => { const P = c.set.pod('ops'); P.alert = false; },
    update: (c) => { const p = c.set.active.people[4]; p.setExpr('neutral'); },
    cam: D.pc({ p: [[-1.6, 1.5, 0.6], [-1.55, 1.48, 0.45]], l: [[-1.5, 1.38, 0.0], [-1.5, 1.38, 0.0]], fov: 30, shake: 0.08 }),
    post: { dof: { focus: 0.55, aperture: 8, maxR: 12 }, saturation: 0.8 },
  });
  D.shot('keep anyone from putting', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const pieces = [];
      const mkPiece = (col) => { const sh = new THREE.Shape(); sh.moveTo(-1, -1); sh.lineTo(-0.25, -1); sh.absarc(0, -1, 0.25, Math.PI, 0, true); sh.lineTo(1, -1); sh.lineTo(1, -0.25); sh.absarc(1, 0, 0.25, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(1, 1); sh.lineTo(-1, 1); sh.lineTo(-1, -1); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })); m.castShadow = true; return m; };
      const cols = [0xc8102e, 0x2a2a2e, 0xd8b25a, 0x5a6a7a, 0x8a8478, 0x2a3a5a];
      for (let i = 0; i < 6; i++) { const m = mkPiece(cols[i]); m.position.set(-8 + (i % 3) * 8, i < 3 ? 3 : -3.5, 1); m.rotation.z = hash(i) * 2; c.set.add(m); pieces.push(m); }
      c.set.pieces = pieces;
    },
    update: (c) => c.set.pieces.forEach((m, i) => { const t = c.lt; const near = 0.5 + 0.5 * Math.sin(t * 1.8 + i); m.position.x = (-8 + (i % 3) * 8) * (0.55 + near * 0.15); m.position.y = (i < 3 ? 3 : -3.5) * (0.55 + near * 0.15); m.rotation.z = hash(i) * 2 + Math.sin(t + i) * 0.2; }),
    cam: { p: [[0, -2, 40], [0, -1, 37]], l: [[0, 0, 0], [0, 0, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => text(g, 'the pieces never came together', 960, 960, { size: 46, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp((c.lt - 0.6) / 0.6), blur: 8 }),
  });
  D.card('one month before', '1 MONTH', 'BEFORE THE ATTACKS');
}
