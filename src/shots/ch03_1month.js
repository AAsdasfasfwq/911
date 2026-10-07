// 4:13 - 5:52  One month before: Crawford, the August 6 PDB, ticket purchases, flight
// plans and fuel, the Moussaoui arrest.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, smearText, mark, strike, underline, card, docDraw, ticketDraw, usMap, arc3, pin, pointer, typeOn, infoPlane } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { CITIES } from '../assets/geo.js';
import { canvasTex } from '../assets/textures.js';
import { import_orient as orient } from './ch00_intro.js';

export default function oneMonth(D, film) {
  D.shot("it's a hot stifling", {
    set: 'ranch', in: 'fade', inDur: 0.3, bed: 'cicadas', mood: 'somber',
    cam: { p: [[-120, 3, 160], [-110, 4, 140]], l: [[0, 6, 0], [0, 7, 0]], fov: 34 },
    post: { zoomBlur: 0.0, exposure: 1.12, highTint: [0.06, 0.03, -0.03] },
  });
  D.shot('president george w', {
    set: 'ranch', in: 'whip',
    cam: { p: [[40, 8, 70], [34, 7, 60]], l: [[0, 3, 0], [0, 3, 0]], fov: 36 },
  });
  D.loc(D.peek('president george w') + 0.4, 5.6, 'Crawford, Texas — August 2001');
  D.shot('vacation at his ranch', {
    set: 'ranch', in: 'whip',
    cam: { p: [[2, 1.5, 22], [3, 1.6, 21]], l: [[-2, 1.4, 12], [0, 1.4, 12]], fov: 34, shake: 0.2 },
    post: { dof: { focus: 9, aperture: 5, maxR: 8 } },
  });
  // August 6, 2001: calendar page
  D.shot('on august 6 2001', {
    set: 'info:paper', in: 'whip', mood: 'tension',
    enter: (c) => {
      const cal = card(7, 8.5, (g, w, h) => {
        g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h * 0.22);
        g.fillStyle = '#fff'; g.font = `800 ${h * 0.11}px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText('AUGUST', w / 2, h * 0.15);
        g.fillStyle = '#111'; g.font = `800 ${h * 0.5}px ${FONTS.sans}`; g.fillText('6', w / 2, h * 0.75);
        g.fillStyle = '#555'; g.font = `500 ${h * 0.07}px ${FONTS.sans}`; g.fillText('MONDAY • 2001', w / 2, h * 0.9);
      }, { thick: 0.1 });
      cal.position.set(-4, 0, 1); cal.rotation.z = -0.05; c.set.add(cal); c.set.cal = cal;
    },
    update: (c) => { c.set.cal.rotation.x = (1 - E.outBack(clamp(c.lt / 0.6))) * -1.2; },
    cam: { p: [[0, 0, 40], [0, 0, 37]], l: [[0, 0, 0], [0, 0, 0]], fov: 24, shake: 0.05 },
    overlay: (c, g) => headline(g, c.lt, 'one month before', '36 DAYS', { x: 1340, y: 600, align: 'left', bigSize: 110, t0: 0.3 }),
    sfx: [[0.05, 'pageFlip', {}]],
  });
  // PDB lands on his desk
  D.shot("the president's daily brief", {
    set: 'rooms', in: 'whip', bed: 'roomTone',
    enter: (c) => c.set.pod('study'),
    update: (c) => { const P = c.set.active; const q = E.outCubic(clamp(c.lt / 0.9)); P.folder.position.set(0.0 + (1 - q) * 0.6, 0.79 + (1 - q) * 0.25, -0.85 + (1 - q) * 0.3); P.folder.rotation.y = (1 - q) * 0.6; },
    cam: D.pc({ p: [[0.9, 1.45, 0.1], [0.75, 1.4, -0.1]], l: [[0.05, 0.79, -0.85], [0.05, 0.79, -0.85]], fov: 36, shake: 0.12 }),
    post: { dof: { focus: 1.2, aperture: 6, maxR: 9 } },
    sfx: [[0.8, 'paperThud', {}]],
  });
  D.shot('a classified intelligence', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('study'),
    cam: D.pc({ p: [[0.05, 1.15, -0.6], [0.04, 1.05, -0.68]], l: [[0.02, 0.79, -0.86], [0.02, 0.79, -0.86]], fov: 32, shake: 0.08 }),
    post: { dof: { focus: 0.35, aperture: 7, maxR: 10 } },
  });
  D.shot("on the work of the nation's", {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const agencies = [['CIA', 560], ['FBI', 960], ['NSA', 1360]];
      agencies.forEach(([a, x], i) => { const q = E.outBack(clamp((c.lt - i * 0.2) / 0.5)); g.strokeStyle = '#d8b25a'; g.lineWidth = 4; g.beginPath(); g.arc(x, 520, 110 * q, 0, Math.PI * 2); g.stroke(); text(g, a, x, 548, { size: 72, weight: 800, align: 'center', color: '#f4f1ea', p: clamp((c.lt - 0.2 - i * 0.2) / 0.4) }); });
      text(g, 'all sources, one daily briefing', 960, 760, { size: 40, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 0.7) / 0.5), blur: 8 });
    },
  });
  // "Bin Ladin Determined to Strike in US"
  D.shot('one item carries', {
    set: 'rooms', in: 'whip', mood: 'tension',
    enter: (c) => c.set.pod('study'),
    cam: D.pc({ p: [[0.45, 1.05, -0.65], [0.38, 0.98, -0.75]], l: [[0.3, 0.786, -0.9], [0.3, 0.786, -0.9]], fov: 34, shake: 0.1 }),
    post: { dof: { focus: 0.3, aperture: 6, maxR: 9 } },
  });
  D.shot('bin laden determined', {
    set: 'info:paper', in: 'zoom',
    enter: (c) => {
      const doc = card(12, 16, docDraw({ header: 'FOR THE PRESIDENT ONLY — 6 AUGUST 2001', title: 'Bin Ladin Determined\nTo Strike in US', titleSize: 0.045, body: 'Clandestine, foreign government, and media reports indicate Bin Ladin since 1997 has wanted to conduct terrorist attacks in the US. Bin Ladin implied in US television interviews in 1997 and 1998 that his followers would follow the example of World Trade Center bomber Ramzi Yousef and "bring the fighting to America."', stamp: 'TOP SECRET', seed: 8 }), { thick: 0.04, ppu: 70 });
      doc.position.set(0, -3, 0.5); doc.rotation.z = 0.04; c.set.add(doc);
    },
    cam: { p: [[-3.5, 3.6, 12], [-3.2, 3.4, 10]], l: [[-2, 3.4, 0], [-1.8, 3.3, 0]], fov: 26, shake: 0.06 },
    post: { dof: { focus: 10.5, aperture: 4, maxR: 8 } },
    sfx: [[0.1, 'typewriter', { dur: 2.5 }]],
  });
  // suspicious individuals ... hijackings (highlighted)
  D.shot('the report mentions', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const doc = card(12, 16, docDraw({ title: '...', titleSize: 0.03, body: 'FBI information since that time indicates patterns of suspicious activity in this country consistent with preparations for hijackings or other types of attacks, including recent surveillance of federal buildings in New York. A clandestine source said in 1998 that a Bin Ladin cell in New York was recruiting Muslim-American youth for attacks. We have not been able to corroborate some of the more sensational threat reporting, such as that from a service in 1998 saying that Bin Ladin wanted to hijack a US aircraft to gain the release of "Blind Shaykh" Umar Abd al-Rahman and other US-held extremists.', seed: 9 }), { thick: 0.04, ppu: 70 });
      doc.position.set(0, 0, 0.5); c.set.add(doc);
    },
    cam: { p: [[0, 1, 26], [0.5, 0.6, 23]], l: [[0, 0.8, 0], [0.4, 0.5, 0]], fov: 30, shake: 0.06 },
    overlay: (c, g) => {
      const marks = [[620, 380, 560, 0.3], [460, 450, 420, 1.2], [900, 560, 380, 2.4], [500, 700, 520, 3.6]];
      marks.forEach(([x, y, w, t]) => { const q = E.ioCubic(clamp((c.lt - t) / 0.6)); g.fillStyle = 'rgba(255,220,40,0.42)'; g.fillRect(x, y, w * q, 34); });
      text(g, 'HIJACKINGS', 1500, 900, { size: 64, weight: 800, align: 'center', color: C.red, p: clamp((c.lt - 3.6) / 0.5), blur: 10 });
    },
    sfx: [[0.3, 'marker', {}], [1.2, 'marker', {}], [2.4, 'marker', {}], [3.6, 'marker', {}]],
  });
  // no dates, no targets, no names
  D.shot('but its language is broad', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const t0 = c.shot.t0;
      const times = [D.S.peek ? 0 : 0];
      text(g, 'the language was broad', 960, 250, { size: 52, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp(c.lt / 0.5), blur: 8 });
      const items = [['DATES', c.shot.tDates], ['TARGETS', c.shot.tTargets], ['NAMES', c.shot.tNames]];
      items.forEach(([s, ta], i) => {
        const lt = c.T - ta;
        const x = 480 + i * 480;
        text(g, s, x, 580, { size: 88, weight: 800, align: 'center', color: lt > 0 ? C.ink : 'rgba(0,0,0,0.15)', p: 1, alpha: 1 });
        if (lt > 0) { strike(g, x, 555, 360, lt / 0.3); mark(g, x, 720, false, lt / 0.3, { size: 44 }); }
      });
    },
  });
  { const s = D.last; s.tDates = D.peek('no dates') ; s.tTargets = D.peek('no targets'); s.tNames = D.peek('no names'); s.sfx = [[s.tDates - s.t0, 'buzz', {}], [s.tTargets - s.t0, 'buzz', {}], [s.tNames - s.t0, 'buzz', {}]]; }
  // Booking the flights
  D.shot('by early september', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'roomTone', mood: 'dark',
    enter: (c) => c.set.pod('booking'),
    cam: D.pc({ p: [[1.2, 1.4, 0.8], [1.0, 1.35, 0.5]], l: [[0, 1.0, -1.2], [0, 1.0, -1.2]], fov: 38, shake: 0.15 }),
    post: { dof: { focus: 1.6, aperture: 5, maxR: 8 } },
    sfx: [[0.2, 'keyboardBurst', { dur: 2.5 }]],
  });
  D.shot('booking their flights', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('booking'),
    cam: D.pc({ p: [[0.1, 1.18, -0.95], [0.05, 1.15, -1.0]], l: [[0, 1.08, -1.45], [0, 1.08, -1.45]], fov: 34, shake: 0.08 }),
    sfx: [[1.8, 'ding', {}]],
  });
  // 19 one-way tickets
  D.shot('they deliberately buy', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const fl = [['11', 'BOS', 'LAX', 'AA'], ['175', 'BOS', 'LAX', 'UA'], ['77', 'IAD', 'LAX', 'AA'], ['93', 'EWR', 'SFO', 'UA']];
      c.set.tix = [];
      for (let i = 0; i < 19; i++) { const f = fl[i % 4]; const m = card(6, 2.4, ticketDraw(i, { flight: f[0], from: f[1], to: f[2], airline: f[3] }), { thick: 0.02, ppu: 100 }); c.set.add(m); c.set.tix.push(m); }
    },
    update: (c) => c.set.tix.forEach((m, i) => { const q = E.outCubic(clamp((c.lt - i * 0.08) / 0.9)); const a = (i - 9) * 0.09 * q; m.position.set(-4 + Math.sin(a) * 9, -6 + Math.cos(a) * 9 - 9 + (1 - q) * -6, 0.5 + i * 0.03); m.rotation.z = -a; }),
    cam: { p: [[0, -1, 46], [0, -0.5, 42]], l: [[-2, -1, 0], [-2, -0.6, 0]], fov: 24, shake: 0.05 },
    overlay: (c, g) => {
      counter(g, c.lt, 0, 19, 1460, 560, { size: 260, d: 1.6, color: '#f4f1ea' });
      text(g, 'ONE-WAY TICKETS', 1460, 650, { size: 46, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.12, p: clamp((c.lt - 0.6) / 0.4), blur: 8 });
      text(g, 'American Airlines • United Airlines', 1460, 720, { size: 32, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 1.2) / 0.5), blur: 8 });
    },
    sfx: [[0.1, 'cardsFan', { dur: 1.6 }]],
  });
  // seats near the cockpit
  D.shot('they choose seats', {
    set: 'info:paper', in: 'whip',
    enter: (c) => { const p = infoPlane('american', 0.3); p.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); p.position.set(0, 0, 2); c.set.add(p); c.set.pl = p; },
    cam: { p: [[0, 0, 44], [2, 0, 40]], l: [[0, 0, 0], [2, 0, 0]], fov: 24, shake: 0.04 },
    overlay: (c, g) => {
      // seat map drawn over the fuselage (nose to the right)
      const x0 = 520, x1 = 1440, y = 540;
      for (let r = 0; r < 26; r++) for (let s = 0; s < 6; s++) {
        const x = x1 - 120 - r * 32, yy = y - 54 + s * 21 + (s > 2 ? 8 : 0);
        const front = r < 4;
        const a = clamp((c.lt - 0.4 - r * 0.02) / 0.3);
        g.globalAlpha = a; g.fillStyle = front ? (c.lt > 1.6 ? '#c8102e' : '#8a867e') : 'rgba(40,40,44,0.35)'; g.fillRect(x, yy, 22, 15);
      }
      g.globalAlpha = 1;
      if (c.lt > 2.2) pointer(g, x1 - 120, y, x1 - 10, y, (c.lt - 2.2) / 0.6, { color: C.red, w: 4 });
      headline(g, c.lt, 'first & business class', 'CLOSEST TO THE COCKPIT', { x: 960, y: 900, bigSize: 74, t0: 1.5 });
    },
    sfx: [[1.6, 'dataBlip', {}], [2.2, 'swish', {}]],
  });
  // routes
  D.shot('the flights depart from', {
    set: 'info:dark', in: 'whip', mood: 'tension',
    enter: (c) => {
      const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m); c.set.map = m;
      const routes = [['boston', 'la', 0xc8232c], ['boston', 'la', 0x3a6ad0], ['dulles', 'la', 0xc8232c], ['newark', 'sf', 0x3a6ad0]];
      c.set.routes = routes.map(([a, b, col], i) => { const A = m.userData.at(a, 0.7).add(m.position), B = m.userData.at(b, 0.7).add(m.position); A.y += i % 2 ? 0.25 : -0.25; const r = arc3(A, B, 3 + i * 0.8, col, 0.07, 2.5); c.set.add(r); return r; });
      c.set.pins = ['boston', 'newark', 'dulles', 'la', 'sf'].map((k) => { const p = pin(0xf4f1ea, 0.3); p.position.copy(m.userData.at(k, 0.6)).add(m.position); c.set.add(p); return p; });
    },
    update: (c) => { c.set.routes.forEach((r, i) => r.userData.set((c.lt - 0.8 - i * 0.25) / 2.6)); c.set.pins.forEach((p, i) => p.scale.setScalar(Math.max(0.001, E.outBack(clamp((c.lt - i * 0.15) / 0.4))))); },
    cam: { p: [[0, -6, 46], [0, -5, 42]], l: [[0, 0, 0], [0, 0.4, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => {
      const lbl = [['BOSTON', 1640, 360, 0.2], ['NEWARK', 1620, 470, 0.35], ['WASHINGTON', 1600, 560, 0.5], ['LOS ANGELES', 280, 700, 2.0], ['SAN FRANCISCO', 250, 520, 2.3]];
      lbl.forEach(([s, x, y, t]) => text(g, s, x, y, { size: 28, weight: 800, color: '#f4f1ea', tracking: 0.18, align: 'center', p: clamp((c.lt - t) / 0.4), blur: 6 }));
    },
    sfx: [[0.8, 'swish', {}], [1.05, 'swish', {}], [1.3, 'swish', {}], [1.55, 'swish', {}]],
  });
  D.shot('these routes are chosen', {
    set: 'info:dark', in: 'zoom',
    enter: (c) => {
      const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m);
      const A = m.userData.at('boston', 0.7).add(m.position), B = m.userData.at('la', 0.7).add(m.position); const r = arc3(A, B, 3, 0xff8a2a, 0.12, 3.5); r.userData.set(1); c.set.add(r);
    },
    cam: { p: [[0, -6, 36], [0, -5, 33]], l: [[0, 0.5, 0], [0, 0.6, 0]], fov: 26, shake: 0.05 },
    overlay: (c, g) => { counter(g, c.lt, 0, 2600, 960, 220, { size: 120, d: 1.2, color: '#ffb060', suffix: ' MILES' }); text(g, 'coast to coast', 960, 290, { size: 40, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 0.5) / 0.5) }); },
  });
  // full fuel loads
  D.shot('planes flying across', {
    set: 'airport:dawn', in: 'whip', bed: 'airportAmb',
    cam: { p: [[-150, 2, 26], [-147, 2.2, 24]], l: [[-160, 3, 0], [-158, 3.2, -2]], fov: 40, shake: 0.2 },
    post: { dof: { focus: 18, aperture: 4, maxR: 7 } },
    sfx: [[0.1, 'pumpHum', { dur: 3 }]],
  });
  D.shot('tens of thousands', {
    set: 'info:dark', in: 'whip',
    enter: (c) => {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 12, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      glass.position.set(-6, 0, 1); c.set.add(glass);
      const fuel = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 1, 48), new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xff7a10, emissiveIntensity: 1.2, roughness: 0.2, transparent: true, opacity: 0.9 }));
      fuel.position.set(-6, -6, 1); c.set.add(fuel); c.set.fuel = fuel;
      for (let k = 0; k < 6; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.05, 6, 48), new THREE.MeshStandardMaterial({ color: 0x9a9690, metalness: 0.8, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.set(-6, -6 + k * 2.4, 1); c.set.add(ring); }
    },
    update: (c) => { const q = E.ioCubic(clamp((c.lt - 0.2) / 2.4)); const h = Math.max(0.01, q * 11); c.set.fuel.scale.y = h; c.set.fuel.position.y = -6 + h / 2; },
    cam: { p: [[2, 1, 46], [2, 1, 43]], l: [[0, 0, 0], [0, 0, 0]], fov: 24, shake: 0.04 },
    overlay: (c, g) => {
      counter(g, c.lt, 0, 10000, 1300, 520, { size: 170, d: 2.4, t0: 0.2, color: '#ffb060', prefix: '≈' });
      text(g, 'GALLONS OF JET FUEL', 1300, 600, { size: 42, weight: 800, align: 'center', color: '#f4f1ea', tracking: 0.12, p: clamp((c.lt - 0.6) / 0.4) });
      text(g, 'in each aircraft', 1300, 660, { size: 36, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 1.0) / 0.4) });
    },
    sfx: [[0.2, 'liquidFill', { dur: 2.4 }]],
  });
  D.shot('for a few thousand', {
    set: 'info:paper', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => { headline(g, c.lt, 'all for a few', 'THOUSAND DOLLARS', { x: 960, y: 580, bigSize: 120 }); },
    sfx: [[0.1, 'cashRegister', {}]],
  });
  // four massive guided incendiary weapons
  D.shot('the terrorists have legally', {
    set: 'airport:dawn', in: 'whip', mood: 'dark',
    cam: { p: [[-40, 1.2, 60], [-60, 1.4, 58]], l: [[-80, 8, -20], [-90, 9, -20]], fov: 34, shake: 0.2 },
    post: { contrast: 1.15, saturation: 0.85, vignette: 0.6 },
  });
  D.shot('they intend to turn', {
    set: 'airport:dawn', in: 'whip',
    cam: { p: [[-250, 60, 220], [-240, 62, 205]], l: [[-60, 0, -20], [-60, 0, -20]], fov: 34 },
    post: { contrast: 1.2, saturation: 0.7, exposure: 0.85, vignette: 0.7, shadowTint: [0.06, -0.02, -0.02] },
    overlay: (c, g) => { text(g, '4', 960, 600, { size: 300, weight: 800, align: 'center', color: 'rgba(255,255,255,0.9)', p: clamp((c.lt - 0.6) / 0.5), blur: 16, shadow: 'rgba(0,0,0,0.6)' }); text(g, 'AIRCRAFT', 960, 680, { size: 40, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.4, p: clamp((c.lt - 0.9) / 0.5) }); },
    sfx: [[0.6, 'boom', { gain: 0.6 }]],
  });
  // Moussaoui arrested in Minnesota
  D.shot('in august the fbi', {
    set: 'suburb:night', in: 'fade', inDur: 0.3, bed: 'nightStreet', mood: 'tension',
    cam: { p: [[-14, 1.8, -8], [-16, 1.9, -10]], l: [[-28, 1.4, -22], [-28, 1.4, -24]], fov: 38, shake: 0.25 },
    sfx: [[0, 'policeRadio', { dur: 3 }]],
  });
  D.loc(D.peek('in august the fbi') + 0.4, 4.0, 'Eagan, Minnesota — August 16, 2001');
  D.shot('another flight student', {
    set: 'rooms', in: 'whip', bed: 'simRoom',
    enter: (c) => { const P = c.set.pod('sim'); P.instrPose = 'phone'; P.people[1].setExpr('worried'); },
    cam: D.pc({ p: [[2.5, 1.6, 1.6], [2.3, 1.62, 1.4]], l: [[1.6, 1.6, 0.4], [1.6, 1.62, 0.4]], fov: 32, shake: 0.12 }),
    post: { dof: { focus: 1.5, aperture: 6, maxR: 9 } },
    sfx: [[0.2, 'phoneDial', {}]],
  });
  D.shot('his computer is seized', {
    set: 'rooms', in: 'whip', bed: 'roomTone',
    enter: (c) => c.set.pod('evidence'),
    cam: D.pc({ p: [[0.8, 1.5, 0.9], [0.6, 1.4, 0.7]], l: [[0, 0.95, 0], [0, 0.95, 0]], fov: 36, shake: 0.1 }),
    post: { dof: { focus: 1.1, aperture: 6, maxR: 9 } },
    sfx: [[0.1, 'bagRustle', {}]],
  });
  D.shot('but legal obstacles', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const w = card(10, 13, docDraw({ header: 'UNITED STATES DISTRICT COURT', title: 'SEARCH WARRANT', titleSize: 0.06, body: 'Application for a search warrant: laptop computer belonging to the subject. Probable cause: (pending). Authorization: (pending). Signature of the judge: ______________________', seed: 11 }), { thick: 0.04, ppu: 70 });
      w.position.set(-3, 0, 0.5); w.rotation.z = -0.03; c.set.add(w);
    },
    cam: { p: [[0, 0, 40], [0, 0, 37]], l: [[0, 0, 0], [0, 0, 0]], fov: 24, shake: 0.04 },
    overlay: (c, g) => {
      const q = clamp((c.lt - 1.0) / 0.15);
      if (c.lt > 1.0) { g.save(); g.translate(820, 560); g.rotate(-0.2); g.scale(1 + (1 - q) * 0.5, 1 + (1 - q) * 0.5); g.strokeStyle = C.red; g.lineWidth = 12; g.strokeRect(-330, -80, 660, 160); g.fillStyle = C.red; g.font = `800 110px ${FONTS.sans}`; g.textAlign = 'center'; g.fillText('NO WARRANT', 0, 38); g.restore(); }
      text(g, 'the laptop stays sealed', 1500, 560, { size: 44, fam: 'serif', italic: true, weight: 400, align: 'center', color: C.ink, p: clamp((c.lt - 1.6) / 0.5), blur: 8 });
    },
    sfx: [[1.0, 'stamp', {}]],
  });
  D.card('24 hours before', '24 HOURS', 'BEFORE THE ATTACKS');
}
