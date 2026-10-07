// 5:52 - 7:01  Twenty-four hours before: the storm, an ordinary evening, Portland,
// the Pentagon speech, the guards in the towers.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, smearText, mark, underline, card, docDraw } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { Screen } from '../assets/textures.js';
import { fbm1 } from '../core/util.js';
import { Person } from '../assets/people.js';

export default function day(D, film) {
  // thunderstorm over the East Coast
  D.shot('a thunderstorm is moving', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'rainStorm', mood: 'tension',
    enter: (c) => { c.set.setTime('storm'); c.set.rainOn = 0.5; c.set.lightning = [c.shot.t0 + 1.4, c.shot.t0 + 3.0]; c.set.boltPos = [-1800, 0, -3200]; c.set.focus = [0, 0, 0]; c.set.focusSize = 2000; },
    cam: { p: [[2600, 900, 4200], [2400, 860, 3900]], l: [[0, 300, 0], [0, 300, 0]], fov: 42 },
    sfx: [[1.5, 'thunder', { gain: 0.6 }], [3.1, 'thunder', { gain: 0.4 }]],
  });
  D.shot('rain pours down', {
    set: 'nyc', in: 'whip',
    enter: (c) => { c.set.setTime('storm'); c.set.rainOn = 1; c.set.trafficOn = true; c.set.focus = [165, 0, 80]; c.set.focusSize = 80; },
    cam: { p: [[170, 1.2, 140], [170, 1.4, 128]], l: [[160, 4, 60], [158, 6, 50]], fov: 44, shake: 0.3 },
    post: { exposure: 1.5 },
  });
  D.shot('thunder rolls overhead', {
    set: 'nyc', in: 'flash',
    enter: (c) => { c.set.setTime('storm'); c.set.rainOn = 0.6; c.set.lightning = [c.shot.t0 + 0.3]; c.set.boltPos = [-500, 0, -900]; c.set.focus = [0, 0, 60]; c.set.focusSize = 400; },
    cam: { p: [[520, 120, 720], [500, 126, 690]], l: [[-20, 300, 40], [-20, 310, 40]], fov: 34, shake: 0.2, impact: { t: 0.35, amp: 0.6, decay: 5 } },
    sfx: [[0.35, 'thunder', { gain: 0.8 }]],
  });
  // ordinary evening
  D.shot("it's an otherwise ordinary", {
    set: 'suburb:rain', in: 'fade', inDur: 0.3, bed: 'rainSoft', mood: 'somber',
    cam: { p: [[8, 4, 30], [6, 4.5, 24]], l: [[-24, 3, 0], [-24, 3, -4]], fov: 40 },
  });
  D.shot('people come home', {
    set: 'suburb:rain', in: 'whip',
    enter: (c) => { const p = new Person({ seed: 3101, jacket: '#2a2e36' }); c.set.addExtra(p.root); c.set.walker = p; const umb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, side: THREE.DoubleSide })); umb.position.y = 0.55; p.j.wrR.add(umb); },
    update: (c) => { const p = c.set.walker; p.root.position.set(-6 + c.lt * 1.2, 0, -14); p.root.rotation.y = Math.PI / 2; p.pose('walk', c.T, { speed: 0.9 }); p.j.shR.rotation.x = -1.4; p.j.elR.rotation.x = -1.2; },
    cam: { p: [[2, 1.4, -8], [1.5, 1.5, -9]], l: [[-4, 1.4, -14], [-2, 1.5, -14]], fov: 36, shake: 0.25 },
    post: { dof: { focus: 7, aperture: 5, maxR: 8 } },
    sfx: [[0, 'footstepsWet', { dur: 2 }]],
  });
  D.shot('eat dinner at restaurants', {
    set: 'rooms', in: 'whip', bed: 'restaurant',
    enter: (c) => c.set.pod('diner:night'),
    cam: D.pc({ p: [[-1.2, 1.5, 0.8], [-0.9, 1.4, 0.4]], l: [[0, 0.9, -2], [0, 0.9, -2]], fov: 40, shake: 0.15 }),
  });
  D.shot('watch evening tv', {
    set: 'rooms', in: 'whip', bed: 'tvLaugh',
    enter: (c) => { const P = c.set.pod('living'); P.feed = null; P.tvMat.userData.U.uHasFeed.value = 0; P.tvMat.userData.U.uHasGfx.value = 0; P.tvMat.userData.U.uGain.value = 0.9; P.chyronFn = null; },
    cam: D.pc({ p: [[1.5, 1.1, -1.6], [1.4, 1.1, -1.3]], l: [[0, 0.9, 1.2], [0, 0.9, 1.2]], fov: 40, shake: 0.12 }),
  });
  D.shot('put their children to bed', {
    set: 'rooms', in: 'whip', bed: 'nightRoom',
    enter: (c) => c.set.pod('bedroom'),
    cam: D.pc({ p: [[1.4, 1.3, 0.8], [1.2, 1.25, 0.5]], l: [[0, 0.6, -1.2], [0, 0.6, -1.2]], fov: 40, shake: 0.1 }),
    post: { dof: { focus: 2.2, aperture: 5, maxR: 8 } },
  });
  D.shot('millions of americans set', {
    set: 'rooms', in: 'whip', bed: 'nightRoom',
    enter: (c) => c.set.pod('nightstand'),
    cam: D.pc({ p: [[0.18, 0.75, 0.55], [0.15, 0.72, 0.45]], l: [[0, 0.6, 0.05], [0, 0.6, 0.05]], fov: 34, shake: 0.08 }),
    post: { dof: { focus: 0.45, aperture: 7, maxR: 10 } },
    sfx: [[1.2, 'alarmSet', {}]],
  });
  D.shot('lay out their clothes', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('planner'),
    cam: D.pc({ p: [[0.1, 1.25, 0.45], [0.18, 1.1, 0.28]], l: [[0.12, 0.79, 0.05], [0.16, 0.79, 0.04]], fov: 34, shake: 0.08 }),
    post: { dof: { focus: 0.5, aperture: 6, maxR: 9 } },
    sfx: [[0.1, 'pageFlip', {}]],
  });
  // Atta and Alomari in Portland, Maine
  D.shot('mohammed atta and abdulaziz', {
    set: 'suburb:portland', in: 'fade', inDur: 0.3, bed: 'nightStreet', mood: 'dark',
    cam: { p: [[-8, 2, 70], [-9, 2.1, 66]], l: [[-22, 2, 50], [-22, 2.2, 48]], fov: 40, shake: 0.2 },
  });
  D.loc(D.peek('mohammed atta and abdulaziz') + 0.6, 5.2, 'Portland, Maine — September 10');
  D.shot('they eat at a cheap', {
    set: 'rooms', in: 'whip', bed: 'restaurant',
    enter: (c) => c.set.pod('pizza'),
    cam: D.pc({ p: [[3.2, 1.6, 2.2], [2.9, 1.5, 1.9]], l: [[1.5, 0.9, 0.5], [1.5, 0.9, 0.5]], fov: 38, shake: 0.15 }),
  });
  D.shot('stop at an atm', {
    set: 'rooms', in: 'whip', bed: 'nightStreet',
    enter: (c) => c.set.pod('atm'),
    cam: D.pc({ p: [[0.35, 1.7, 0.9], [0.3, 1.65, 0.8]], l: [[0, 1.45, 0.16], [0, 1.45, 0.16]], fov: 34, shake: 0.1 }),
    sfx: [[0.3, 'atmBeeps', {}]],
  });
  D.shot('and shop at a local', {
    set: 'rooms', in: 'whip', bed: 'store',
    enter: (c) => c.set.pod('store:night'),
    cam: D.pc({ p: [[-1.2, 2.2, 7], [-1, 2.1, 6]], l: [[0, 1.2, 0], [0, 1.2, 0]], fov: 44 }),
  });
  // CCTV look
  D.shot('security footage later', {
    set: 'rooms', in: 'glitch', bed: 'cctvHum', mood: 'dark',
    enter: (c) => c.set.pod('atm'),
    cam: D.pc({ p: [[1.6, 3.2, 3.2], [1.6, 3.2, 3.2]], l: [[0, 1.0, 0.5], [0, 1.0, 0.5]], fov: 52, shake: 0 }),
    post: { mono: 1, scan: 1, grain: 0.12, contrast: 1.25, vignette: 0.4, distort: 0.18, bloomStr: 0.2, sharpen: 0 },
    overlay: (c, g) => { font(g, 34, 600, 'mono'); g.fillStyle = '#e8e8e8'; g.fillText(`09/10/01  21:4${Math.floor(1 + c.lt / 10)}:${String(Math.floor(c.lt * 1 + 12) % 60).padStart(2, '0')}`, 80, 1000); g.fillText('CAM 02', 80, 80); if (Math.floor(c.T * 2) % 2) { g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(1820, 70, 12, 0, Math.PI * 2); g.fill(); } },
  });
  D.shot('completely calm', {
    set: 'rooms', in: 'glitch',
    enter: (c) => c.set.pod('store:night'),
    cam: D.pc({ p: [[2, 4.4, -2], [2, 4.4, -2]], l: [[0, 1, 3], [0, 1, 3]], fov: 50, shake: 0 }),
    post: { mono: 1, scan: 1, grain: 0.12, contrast: 1.25, vignette: 0.4, distort: 0.18, bloomStr: 0.2, sharpen: 0 },
    overlay: (c, g) => { font(g, 34, 600, 'mono'); g.fillStyle = '#e8e8e8'; g.fillText(`09/10/01  22:0${Math.floor(2 + c.lt / 10)}:${String(Math.floor(c.lt + 31) % 60).padStart(2, '0')}`, 80, 1000); g.fillText('CAM 07', 80, 80); },
  });
  // less than 24 hours to live
  D.shot('they know they have', {
    set: 'info:dark', in: 'fade', inDur: 0.3, mood: 'dark',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const secs = Math.max(0, 24 * 3600 - 13 * 3600 - Math.floor(c.lt * 1));
      const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
      text(g, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 960, 600, { size: 200, weight: 300, fam: 'cond', align: 'center', color: '#f4f1ea', tracking: 0.05, p: clamp(c.lt / 0.5), blur: 14 });
      text(g, 'LESS THAN 24 HOURS', 960, 720, { size: 40, weight: 800, align: 'center', color: '#ff3a2a', tracking: 0.35, p: clamp((c.lt - 0.6) / 0.5) });
    },
    sfx: [[0, 'clockTicks', { dur: 5 }], [0, 'heartbeat', { n: 4 }]],
  });
  // Pentagon: Rumsfeld's speech on bureaucracy
  D.shot('that same evening at the pentagon', {
    set: 'pentagon:dusk', in: 'fade', inDur: 0.3, bed: 'eveningAmb', mood: 'tension',
    cam: { p: [[-700, 200, 600], [-640, 180, 540]], l: [[0, 20, 0], [0, 20, 0]], fov: 36 },
  });
  D.shot('secretary donald rumsfeld', {
    set: 'rooms', in: 'whip', bed: 'hall',
    enter: (c) => c.set.pod('hall'),
    cam: D.pc({ p: [[2.5, 2.0, 2.0], [2.0, 1.9, 1.0]], l: [[0, 2.0, -5.5], [0, 2.0, -5.5]], fov: 32, shake: 0.15 }),
    post: { dof: { focus: 7, aperture: 4, maxR: 7 } },
    sfx: [[0.2, 'speechMurmur', { dur: 3 }]],
  });
  D.shot('the department\'s own bureaucracy', {
    set: 'rooms', in: 'whip',
    enter: (c) => c.set.pod('hall'),
    cam: D.pc({ p: [[-6, 3.2, 6], [-5, 3.0, 5]], l: [[0, 1.5, -4], [0, 1.5, -4]], fov: 40, shake: 0.15 }),
  });
  D.shot('with accounting systems', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      text(g, 'transactions that could not be tracked', 960, 330, { size: 44, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp(c.lt / 0.5), blur: 8 });
      smearText(g, '$ TRILLIONS', 960, 580, clamp((c.lt - 0.4) / 0.6), { size: 190, align: 'center', color: '#ffd27a', shadow: 'rgba(0,0,0,0.8)' });
      // ledger rows dissolving
      for (let i = 0; i < 9; i++) { const y = 700 + i * 34; const a = clamp(0.8 - (c.lt - 1 - i * 0.12)); g.globalAlpha = a * 0.6; g.fillStyle = '#5a5650'; g.fillRect(560, y, 800 * (0.4 + hash(i) * 0.6), 12); }
      g.globalAlpha = 1;
    },
    sfx: [[0.4, 'boomSoft', {}]],
  });
  // WTC security guards on evening rounds
  D.shot('in new york world trade', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'rainSoft', mood: 'somber',
    enter: (c) => { c.set.setTime('night'); c.set.rainOn = 0.4; c.set.focus = [0, 0, 60]; c.set.focusSize = 300; },
    cam: { p: [[300, 40, 500], [280, 50, 470]], l: [[-20, 300, 60], [-20, 320, 60]], fov: 34 },
  });
  D.shot('security guards make', {
    set: 'rooms', in: 'whip', bed: 'lobby',
    enter: (c) => c.set.pod('lobby'),
    cam: D.pc({ p: [[3, 1.6, -4], [2.4, 1.6, -3]], l: [[0, 1.4, 2], [0, 1.4, 1]], fov: 40, shake: 0.2 }),
    post: { exposure: 1.2 },
    sfx: [[0, 'footstepsEcho', { dur: 3 }]],
  });
  D.card('one hour before', '1 HOUR', 'BEFORE THE ATTACKS');
}
