// 13:38 - 14:31  One month after: the fires, Enduring Freedom, the Patriot Act,
// the security state.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash } from '../core/util.js';
import { C, headline, counter, smearText, timeline, card } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { fireball, smokePlume } from '../fx/particles.js';
import { orient } from '../sets/manhattan.js';
import { std, M, MAT } from '../assets/materials.js';

function cctv() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 1.3), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.35, metalness: 0.2 })); body.position.z = 0.3; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 1.5), new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.4 })); hood.position.set(0, 0.25, 0.35); g.add(hood);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), MAT.darkGlass()); lens.rotation.x = Math.PI / 2; lens.position.z = 0.97; g.add(lens);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.4, 0.3) })); led.position.set(0.18, -0.12, 0.96); g.add(led);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x8a8c90, metalness: 0.7, roughness: 0.4 })); arm.position.set(0, 0.5, -0.1); g.add(arm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.led = led;
  return g;
}

export default function monthAfter(D, film) {
  D.shot('october 2001', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'groundZero', mood: 'grief',
    enter: (c) => { c.set.setMode('rubble'); c.set.setTime('dusk'); c.set.rubbleSmoke = 0.55; c.set.focus = [-20, 0, 65]; c.set.focusSize = 220; },
    cam: { p: [[260, 60, 300], [240, 58, 280]], l: [[-20, 10, 60], [-20, 10, 60]], fov: 36 },
  });
  D.loc(D.peek('october 2001') + 0.2, 4.4, 'Ground Zero — October 2001');
  D.shot('it will take more than three', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      counter(g, c.lt, 0, 99, 960, 600, { size: 280, d: 3.0, color: '#ffb060', shadow: 'rgba(255,90,20,0.5)' });
      text(g, 'DAYS OF FIRE', 960, 690, { size: 46, weight: 800, align: 'center', color: '#f4f1ea', tracking: 0.35, p: clamp((c.lt - 0.4) / 0.4) });
      text(g, 'the last fires were put out on December 19, 2001', 960, 770, { size: 34, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 1.6) / 0.5) });
    },
    sfx: [[0, 'fireCrackle', { dur: 4 }]],
  });
  D.shot('america has changed', {
    set: 'suburb:flags', in: 'fade', inDur: 0.3, bed: 'suburbDay', mood: 'somber',
    cam: { p: [[2, 1.6, 40], [1.5, 1.7, 30]], l: [[0, 2, -200], [0, 2, -200]], fov: 40, shake: 0.12 },
  });
  D.shot('operation enduring freedom', {
    set: 'carrier', in: 'whip', bed: 'carrierDeck', mood: 'war',
    update: (c) => {
      const s = c.set, sh = s.ship.position, j = s.launch; j.visible = true;
      const a = clamp(c.lt - 0.6); const x = -120 + 160 * a * a + (c.lt > 1.6 ? (c.lt - 1.6) * 90 : 0); const y = 21.2 + Math.max(0, c.lt - 1.6) * 18;
      j.position.set(sh.x + x, sh.y + y, sh.z - 22); orient(j, new THREE.Vector3(1, c.lt > 1.6 ? 0.18 : 0, 0), 0);
      s.focus = [sh.x - 40, 20, sh.z - 20]; s.focusSize = 90;
      s.fx.push((bb, T) => smokePlume(bb, T, { t0: -10, count: 60, life: 3, rise: 1.5, wind: [-10, 0, 0], size: [3, 14], pos: [j.position.x - 9, j.position.y, j.position.z], spread: [2, 1, 2], color: [0.85, 0.85, 0.85], alpha: c.lt > 0.6 ? 0.5 : 0.2, seed: 61 }));
    },
    cam: (c) => { const sh = c.set.ship.position; return { p: [[sh.x - 150, sh.y + 24, sh.z - 40], [sh.x - 148, sh.y + 24, sh.z - 40]], l: [[sh.x - 100, sh.y + 22, sh.z - 22], [sh.x + 40, sh.y + 30, sh.z - 22]], fov: 40, shake: 0.4, ease: E.ioCubic } },
    sfx: [[0.6, 'catapultLaunch', { dur: 2.5 }]],
  });
  D.shot('american and british aircraft', {
    set: 'afghan:night', in: 'glitch', bed: 'nightBattle',
    update: (c) => {
      for (let k = 0; k < 6; k++) { const tt = c.shot.t0 + 0.3 + k * 0.55, x = -600 + k * 260, z = -1500 - hash(k) * 800; const y = c.set.H(x, z); c.set.fx.push((bb, T) => fireball(bb, T, { t0: tt, pos: [x, y + 4, z], dir: [0, 1, 0], count: 160, speed: 50, life: 4, size: [10, 70], bias: 0.65, hotTime: 0.8, heat: 2.5, seed: 300 + k })); }
    },
    cam: { p: [[0, 900, 1200], [40, 880, 1100]], l: [[0, 200, -1600], [40, 200, -1600]], fov: 34, shake: 0.3 },
    sfx: [[0.3, 'distantBoom', {}], [0.85, 'distantBoom', {}], [1.4, 'distantBoom', {}], [1.95, 'distantBoom', {}], [2.5, 'distantBoom', {}]],
  });
  D.shot('and infrastructure in afghanistan', {
    set: 'sky:clear', in: 'whip', bed: 'windHigh',
    update: (c) => { const b = c.set.b52; b.visible = true; b.position.set(c.lt * 220, 0, 0); orient(b, new THREE.Vector3(1, 0, 0), 0); setCam(c, new THREE.Vector3(b.position.x - 80, -30, 90), b.position, 30, 0, { shake: 0.2 }); c.set.contrails = [(bb, T) => { for (let i = 0; i < 200; i++) { const age = i / 200 * 8; const p = bb.push(); if (!p) return; const x = b.position.x - age * 220; for (const off of [8, 15]) { } p.x = x - 10; p.y = b.position.y - 1 + age * 0.5; p.z = (i % 2 ? 10 : -10); p.s = 2 + age * 3; p.r = i; p.a = 0.5 * (1 - age / 8); p.cr = p.cg = p.cb = 0.97; p.er = p.eg = p.eb = 0; p.f = i % 4; p.lit = 1; } }]; },
    sfx: [[0, 'bomberDrone', { dur: 2 }]],
  });
  D.shot('the longest war in', {
    set: 'info:dark', in: 'whip', mood: 'war',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      timeline(g, c.lt, 220, 1700, 640, [2001, 2004, 2007, 2010, 2013, 2016, 2019, 2021], { color: '#e8e2d6', major: [2001, 2021], d: 1.0, marker: [0, 1], mt0: 0.4, md: 2.6, mcolor: '#ff4a3a' });
      text(g, '20 YEARS', 960, 470, { size: 130, weight: 800, align: 'center', color: '#f4f1ea', p: clamp((c.lt - 0.2) / 0.5), blur: 14 });
      text(g, 'the longest war in American history', 960, 540, { size: 38, fam: 'serif', italic: true, weight: 400, align: 'center', color: '#bdb6aa', p: clamp((c.lt - 0.7) / 0.5) });
    },
  });
  D.shot('congress passes the patriot', {
    set: 'dc', in: 'whip', bed: 'windSoft', mood: 'tension',
    cam: { p: [[160, 30, 320], [140, 34, 290]], l: [[0, 50, 0], [0, 52, 0]], fov: 34 },
  });
  D.shot('giving intelligence agencies unlimited', {
    set: 'info:dark', in: 'whip',
    cam: { p: [[0, 0, 60], [0, 0, 57]], l: [[0, 0, 0], [0, 0, 0]], fov: 17, shake: 0 },
    overlay: (c, g) => {
      const cx = 960, cy = 540;
      const n = 60;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, r = 300 + hash(i) * 140;
        const x = cx + Math.cos(a) * r * 1.4, y = cy + Math.sin(a) * r * 0.8;
        const q = clamp((c.lt - i * 0.03) / 0.4);
        g.globalAlpha = q; g.fillStyle = '#e8e2d6'; g.beginPath(); g.arc(x, y - 8, 7, 0, Math.PI * 2); g.fill(); g.fillRect(x - 6, y, 12, 14);
        const lq = clamp((c.lt - 0.8 - i * 0.02) / 0.4);
        g.strokeStyle = `rgba(255,60,40,${0.5 * lq})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(lerp(cx, x, lq), lerp(cy, y, lq)); g.stroke();
      }
      g.globalAlpha = 1;
      // the eye
      const q = E.outBack(clamp((c.lt - 0.4) / 0.6));
      g.save(); g.translate(cx, cy); g.scale(q, q);
      g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(0, 0, 120, 60, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8102e'; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); g.restore();
      text(g, 'MONITOR  •  WIRETAP  •  READ', 960, 960, { size: 40, weight: 800, align: 'center', color: '#ff4a3a', tracking: 0.2, p: clamp((c.lt - 1.2) / 0.5) });
    },
    sfx: [[0.4, 'dataRain', { dur: 3 }]],
  });
  D.shot('tap phones and read', {
    set: 'rooms', in: 'whip', bed: 'interceptRoom',
    enter: (c) => c.set.pod('intercept'),
    cam: D.pc({ p: [[-0.6, 1.35, 0.2], [-0.5, 1.3, 0.0]], l: [[0, 1.1, -0.75], [0, 1.1, -0.75]], fov: 40, shake: 0.12 }),
    post: { dof: { focus: 0.9, aperture: 5, maxR: 8 }, temp: -0.1 },
  });
  D.shot('america willingly gives', {
    set: 'info:paper', in: 'whip',
    enter: (c) => {
      const gold = new THREE.MeshStandardMaterial({ color: 0xb8964a, metalness: 0.9, roughness: 0.3 });
      const sc = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 10, 16), gold); post.position.y = -2; sc.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 0.5, 32), gold); base.position.y = -7; sc.add(base);
      const beam = new THREE.Group(); beam.position.y = 3; sc.add(beam);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 0.3), gold); beam.add(bar);
      const pans = [];
      for (const s of [-1, 1]) { const pan = new THREE.Group(); pan.position.x = s * 6.8; const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.6, 0.3, 32), gold); dish.position.y = -4; pan.add(dish); for (let k = 0; k < 3; k++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 6), gold); const a = k * 2.09; ch.position.set(Math.cos(a) * 1.0, -2, Math.sin(a) * 1.0); ch.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); pan.add(ch); } beam.add(pan); pans.push(pan); }
      sc.position.set(0, -0.5, 2); sc.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.set.add(sc); c.set.beam = beam; c.set.pans = pans;
    },
    update: (c) => { const a = -0.22 * E.outBack(clamp((c.lt - 0.6) / 1.4)) + Math.sin(c.T * 2) * 0.01; c.set.beam.rotation.z = a; c.set.pans.forEach((p) => (p.rotation.z = -a)); },
    cam: { p: [[0, 0, 44], [0, 0.4, 41]], l: [[0, -1, 0], [0, -0.8, 0]], fov: 26, shake: 0.04 },
    overlay: (c, g) => {
      const a = -0.22 * E.outBack(clamp((c.lt - 0.6) / 1.4));
      text(g, 'FREEDOM', 520, 620 - a * 380, { size: 64, weight: 800, align: 'center', color: C.ink, p: clamp(c.lt / 0.4), blur: 8 });
      text(g, 'SECURITY', 1400, 620 + a * 380, { size: 64, weight: 800, align: 'center', color: C.red, p: clamp((c.lt - 0.2) / 0.4), blur: 8 });
    },
    sfx: [[0.6, 'metalCreak', {}]],
  });
  D.shot('airports introduce strict', {
    set: 'rooms', in: 'whip', bed: 'terminal',
    enter: (c) => c.set.pod('security:modern'),
    cam: D.pc({ p: [[8, 2.4, 6], [6.5, 2.2, 5]], l: [[3, 1.2, -1], [3, 1.2, -1]], fov: 42, shake: 0.15 }),
  });
  D.shot('the age of trust', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'cityAmb', mood: 'dark',
    enter: (c) => { c.set.setTime('overcast'); const cam = cctv(); cam.position.set(176, 5.2, 90); c.set.addExtra(cam); c.set.cctv = cam; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.4, 8), MAT.chrome()); pole.position.set(176, 2.7, 89.6); c.set.addExtra(pole); c.set.focus = [176, 4, 90]; c.set.focusSize = 20; },
    update: (c) => { const k = E.ioCubic(clamp((c.lt - 0.5) / 1.6)); c.set.cctv.rotation.set(0.15, lerp(1.2, -0.25, k), 0); c.set.cctv.userData.led.visible = Math.floor(c.T * 2) % 2 === 0; },
    cam: { p: [[176.6, 5.05, 93.6], [176.5, 5.06, 93.4]], l: [[176, 5.2, 90], [176, 5.2, 90]], fov: 34, shake: 0.12 },
    post: { dof: { focus: 3.4, aperture: 6, maxR: 9 }, saturation: 0.6, temp: -0.15 },
    sfx: [[0.5, 'servo', {}]],
  });
  D.shot('an age of total surveillance', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { c.set.cams = []; for (let i = 0; i < 24; i++) { const m = cctv(); m.scale.setScalar(1.3); m.position.set(-12 + (i % 6) * 4.8, 6 - Math.floor(i / 6) * 4, 2); c.set.add(m); c.set.cams.push(m); } },
    update: (c) => c.set.cams.forEach((m, i) => { const k = E.ioCubic(clamp((c.lt - 0.2 - i * 0.06) / 0.8)); m.rotation.set(lerp(0.6, -0.08, k), lerp((hash(i) - 0.5) * 3, -m.position.x * 0.02, k), 0); m.userData.led.visible = Math.floor(c.T * 2 + i) % 2 === 0; }),
    cam: { p: [[0, 0, 40], [0, 0, 34]], l: [[0, 0, 0], [0, 0, 0]], fov: 30, shake: 0.06 },
    post: { bloomStr: 0.9 },
    sfx: [[0.2, 'servoMany', { dur: 2 }]],
  });
  D.card('one year after', '1 YEAR', 'AFTER THE ATTACKS', { mood: 'grief' });
}
