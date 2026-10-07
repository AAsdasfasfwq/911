// 11:38 - 12:33  One hour after: the dust, empty skies, fighters, bunkers, the world watching.
import * as THREE from 'three';
import { camMove, setCam } from '../core/camera.js';
import { E, clamp, lerp, hash, fbm1 } from '../core/util.js';
import { C, headline, counter, smearText, usMap } from './infokit.js';
import { text, font, FONTS, W, H } from '../core/overlay.js';
import { Person, Crowd } from '../assets/people.js';
import { dustCloud, smokePlume } from '../fx/particles.js';
import { orient } from '../sets/manhattan.js';
import * as SCR from '../assets/screens.js';

export default function hourAfter(D, film) {
  const st = film.story;
  const after = (c) => st.collapseN + 90 + c.T * 0.0;
  D.shot('11 30', {
    set: 'nyc', in: 'fade', inDur: 0.3, bed: 'aftermath', mood: 'grief',
    enter: (c) => { c.set.setTime('smoke'); c.set.cityDust = 0.6; c.set.focus = [0, 0, 300]; c.set.focusSize = 1500; },
    update: (c) => { c.set.storyOverride = st.collapseN + 60 + c.lt; },
    cam: { p: [[1800, 900, 2600], [1720, 880, 2500]], l: [[0, 60, 200], [0, 60, 200]], fov: 34 },
    post: { saturation: 0.6, contrast: 1.05 },
  });
  D.stamp(D.peek('11 30'), 5.2, '11', 30, { label: 'Lower Manhattan' });
  D.shot('lower manhattan is dark', {
    set: 'nyc', in: 'whip', bed: 'dustAmb',
    enter: (c) => { c.set.setTime('dust'); c.set.trafficOn = false; c.set.heroesOn = false; c.set.cityDust = 0.85; c.set.towersGone = true; c.set.focus = [165, 0, 100]; c.set.focusSize = 100; },
    update: (c) => { c.set.storyOverride = st.collapseN + 120; c.set.extra.push((bb, sT, cam) => dustCloud(bb, c.T, { t0: c.T - 30, count: 160, seed: 5, spawn: 60, speed: 2, drag: 0.2, size: [6, 22], growT: 6, alpha: 0.35, rise: 0.2, center: [cam.position.x, 2, cam.position.z - 20], height: 12, color: [0.6, 0.58, 0.54], life: 20, jitter: 70 })); },
    cam: { p: [[168, 1.7, 170], [168, 1.8, 160]], l: [[160, 20, 40], [160, 30, 40]], fov: 46, shake: 0.2 },
  });
  D.shot('the dust is so thick', {
    set: 'nyc', in: 'whip',
    enter: (c) => {
      c.set.setTime('dust'); c.set.trafficOn = false; c.set.heroesOn = false; c.set.cityDust = 0.85; c.set.towersGone = true; c.set.street.group.visible = true; c.set.focus = [165, 0, 120]; c.set.focusSize = 40;
      const p = new Person({ seed: 4001, jacket: '#3a3e48', dust: true, expr: 'cry' }); p.root.position.set(170, 0.45, 120); p.root.rotation.y = 0.2; c.set.addExtra(p.root); c.set.hero = p;
    },
    update: (c) => { const p = c.set.hero; p.pose('coverMouth', c.T); p.root.position.z = 120 + c.lt * 0.6; c.set.storyOverride = st.collapseN + 120; },
    cam: { p: [[170.5, 1.6, 122.6], [170.4, 1.62, 122.3]], l: [[170, 1.55, 120.6], [170, 1.58, 121]], fov: 34, shake: 0.3 },
    post: { dof: { focus: 1.6, aperture: 7, maxR: 10 }, saturation: 0.55 },
    sfx: [[0.3, 'cough', {}], [1.6, 'cough', {}]],
  });
  D.shot('and coats their bodies', {
    set: 'nyc', in: 'whip',
    enter: (c) => {
      c.set.setTime('dust'); c.set.trafficOn = false; c.set.heroesOn = false; c.set.cityDust = 0.85; c.set.towersGone = true; c.set.focus = [165, 0, 120]; c.set.focusSize = 40;
      const p = new Person({ seed: 4002, jacket: '#24262c', tie: '#8a1c24', dust: true, expr: 'sad' }); p.root.position.set(166, 0.45, 118); c.set.addExtra(p.root); c.set.hero = p;
    },
    update: (c) => { c.set.hero.pose('stumble', c.T); c.set.hero.root.position.z = 118 + c.lt * 0.5; c.set.storyOverride = st.collapseN + 120; },
    cam: { p: [[166.3, 1.75, 121.5], [166.2, 1.7, 121.2]], l: [[166, 1.4, 118.4], [166, 1.3, 118.6]], fov: 38, shake: 0.25 },
    post: { saturation: 0.4, dof: { focus: 3, aperture: 6, maxR: 9 } },
  });
  D.shot('survivors stumble through', {
    set: 'nyc', in: 'fade', inDur: 0.3,
    enter: (c) => {
      c.set.setTime('dust'); c.set.trafficOn = false; c.set.heroesOn = false; c.set.cityDust = 0.85; c.set.towersGone = true; c.set.focus = [165, 0, 150]; c.set.focusSize = 60;
      const cr = new Crowd(70, { seed: 41, dust: true }); for (let i = 0; i < 70; i++) cr.pos[i] = [158 + hash(i) * 16, 0.45, 100 + hash(i * 3) * 60, 0.05 * (hash(i * 7) - 0.5)]; c.set.addExtra(cr.group); c.set.cr = cr;
      c.set.ppl = []; for (let i = 0; i < 4; i++) { const p = new Person({ seed: 4010 + i, dust: true, jacket: ['#3a3e48', '#24262c', null, '#4a3e34'][i], shirt: '#d8d4cc', expr: 'sad' }); c.set.addExtra(p.root); c.set.ppl.push(p); }
    },
    update: (c) => { c.set.cr.update(c.lt, 'walk', { speed: 0.6 }); c.set.ppl.forEach((p, i) => { p.root.position.set(162 + i * 2.2, 0.45, 150 + c.lt * 0.6 - i); p.pose('stumble', c.T + i * 0.7); }); c.set.storyOverride = st.collapseN + 120; },
    cam: { p: [[166, 1.5, 170], [166, 1.5, 168]], l: [[166, 1.6, 140], [166, 1.6, 140]], fov: 40, shake: 0.25 },
    post: { saturation: 0.45 },
  });
  // empty skies
  D.shot('for the first time in aviation', {
    set: 'sky:clear', in: 'fade', inDur: 0.3, bed: 'emptySky', mood: 'somber',
    update: (c) => setCam(c, new THREE.Vector3(0, -2600, 0), new THREE.Vector3(200, 0, 400), 60, 0, { shake: 0.05 }),
  });
  D.shot('are empty of civilian', {
    set: 'info:dark', in: 'whip',
    enter: (c) => { const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m); },
    cam: { p: [[0, -5, 44], [0, -4, 41]], l: [[0, 0, 0], [0, 0.3, 0]], fov: 26, shake: 0.04 },
    overlay: (c, g) => { counter(g, c.lt, 0, 0, 960, 560, { size: 260, d: 0.1, color: '#f4f1ea' }); text(g, 'CIVILIAN AIRCRAFT IN THE AIR', 960, 650, { size: 40, weight: 800, align: 'center', color: '#ffd27a', tracking: 0.15, p: clamp((c.lt - 0.3) / 0.4) }); },
  });
  D.shot('only military fighter', {
    set: 'nyc', in: 'whip', bed: 'fighterPass', mood: 'tension',
    enter: (c) => { c.set.setTime('smoke'); c.set.focus = [0, 0, 0]; c.set.focusSize = 1200; },
    update: (c) => {
      c.set.storyOverride = st.collapseN + 200;
      c.set.jets.forEach((j, i) => { j.visible = true; const t = c.lt; j.position.set(-1400 + t * 260 + i * -40, 700 + i * 20, -600 + t * 120 + i * 40); orient(j, new THREE.Vector3(1, 0, 0.45), -0.25); });
      const j = c.set.jets[0]; setCam(c, new THREE.Vector3(j.position.x - 30, j.position.y + 12, j.position.z - 60), new THREE.Vector3(0, 100, 100), 40, 0, { shake: 0.5 });
    },
    sfx: [[0, 'fighterFlyby', { dur: 3.4 }]],
  });
  D.shot('with orders to shoot down', {
    set: 'sky:clear', in: 'whip', bed: 'fighterCockpit',
    update: (c) => { const j = c.set.jets[0]; j.visible = true; j.position.set(c.lt * 220, 0, 0); orient(j, new THREE.Vector3(1, 0, 0), 0.05); const eye = D.local(j, [0, 1.2, 4.6]); setCam(c, eye, D.local(j, [0, 0.8, 200]), 62, 0, { shake: 0.25 }); const p = c.set.planes[2]; p.visible = true; p.position.set(1800 + c.lt * 180, 30, 40); orient(p, new THREE.Vector3(1, 0, 0), 0); },
    overlay: (c, g) => { const t = c.lt; g.save(); g.globalAlpha = 0.9; SCR.fighterHUD(g, W, H, t); g.restore(); },
    post: { exposure: 1.05 },
  });
  D.shot('the country is paralyzed', {
    set: 'airport:morning', in: 'fade', inDur: 0.3, bed: 'emptyAirport', mood: 'somber',
    cam: { p: [[-260, 10, 180], [-240, 10, 170]], l: [[-60, 5, -20], [-60, 5, -20]], fov: 34 },
    post: { saturation: 0.7 },
  });
  D.shot('government officials have', {
    set: 'rooms', in: 'whip', bed: 'bunker', mood: 'tension',
    enter: (c) => c.set.pod('bunker'),
    update: (c) => { const P = c.set.active; P.door.position.x = lerp(4, 0, E.ioCubic(clamp((c.lt - 1.2) / 1.6))); P.wheel.rotation.z = c.lt * 2; },
    cam: D.pc({ p: [[1.6, 1.7, 2], [1.2, 1.6, 0.5]], l: [[0, 1.6, -9.6], [0, 1.7, -9.6]], fov: 40, shake: 0.2 }),
    sfx: [[1.2, 'blastDoor', { dur: 1.8 }]],
  });
  D.shot('rumors spread of more', {
    set: 'info:dark', in: 'glitch',
    enter: (c) => { const m = usMap(1.05, 0x2a2c32); m.position.set(0.5, -1, 0); c.set.add(m); },
    cam: { p: [[0, -5, 44], [0, -4, 41]], l: [[0, 0, 0], [0, 0.3, 0]], fov: 26, shake: 0.06 },
    overlay: (c, g) => {
      const cities = [['CHICAGO', 1180, 440], ['LOS ANGELES', 380, 650], ['SAN FRANCISCO', 330, 520], ['SEATTLE', 420, 300], ['HOUSTON', 960, 760], ['ATLANTA', 1300, 680], ['DENVER', 700, 510]];
      cities.forEach(([s, x, y], i) => { const t = c.lt - i * 0.25; if (t < 0) return; const blink = Math.floor(c.T * 4 + i) % 2; g.fillStyle = blink ? '#ff3a2a' : '#7a1a12'; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); text(g, s + ' ?', x + 20, y + 8, { size: 24, weight: 800, color: '#f4f1ea', tracking: 0.1, p: clamp(t / 0.3) }); });
      text(g, 'MORE ATTACKS?', 960, 180, { size: 72, weight: 800, align: 'center', color: '#ff4a3a', p: clamp(c.lt / 0.4), blur: 10 });
    },
    sfx: [[0.1, 'radioStatic', { dur: 2.5 }]],
  });
  const feedCollapse = (r, ctx) => {
    const P = ctx.set.active;
    if (!P.rt) P.rt = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType });
    film.renderInset(ctx, 'nyc', (sub) => { sub.set.setTime('smoke'); sub.set.storyOverride = st.collapseS - 1 + ((ctx.lt * 1.4) % 9); sub.cam.position.set(1050, 180, 520); sub.cam.lookAt(-38, 230, 130); sub.cam.fov = 26; sub.cam.near = 2; sub.cam.far = 20000; sub.cam.updateProjectionMatrix(); sub.cam.updateMatrixWorld(); }, P.rt);
    P.tvMat.userData.U.tFeed.value = P.rt.texture; P.tvMat.userData.U.uHasFeed.value = 1; P.tvMat.userData.U.uHasGfx.value = 1; P.tvMat.userData.U.uGain.value = 0.75;
  };
  D.shot('around the world people sit', {
    set: 'rooms', in: 'fade', inDur: 0.3, bed: 'tvRoom', mood: 'grief',
    enter: (c) => { const P = c.set.pod('living'); P.feed = feedCollapse; P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'ATTACK ON AMERICA', sub: 'WORLD TRADE CENTER COLLAPSES  •  PENTAGON HIT  •  LIVE', time: '' }); P.people.forEach((p) => p.setExpr('shock')); },
    cam: D.pc({ p: [[0.6, 1.05, -1.4], [0.5, 1.02, -1.2]], l: [[0, 0.95, 1.2], [0, 0.95, 1.2]], fov: 34, shake: 0.08 }),
  });
  D.shot('overwhelmed by horror', {
    set: 'rooms', in: 'whip',
    enter: (c) => { const P = c.set.pod('living'); P.feed = feedCollapse; P.chyronFn = (ctx) => P.chyron.update(ctx.T, { title: 'ATTACK ON AMERICA', sub: 'WORLD TRADE CENTER COLLAPSES  •  LIVE', time: '' }); P.people.forEach((p) => p.setExpr('cry')); },
    cam: D.pc({ p: [[-0.7, 1.0, 0.2], [-0.62, 1.0, 0.35]], l: [[-0.6, 1.02, 1.25], [-0.6, 1.02, 1.25]], fov: 30, shake: 0.08 }),
    post: { dof: { focus: 0.9, aperture: 8, maxR: 12 } },
  });
  D.shot('no one knows whether', {
    set: 'nyc', in: 'fade', inDur: 0.4, bed: 'eveningAmb', mood: 'grief',
    enter: (c) => { c.set.setTime('dusk'); c.set.focus = [0, 0, 0]; c.set.focusSize = 1500; },
    update: (c) => { c.set.storyOverride = st.collapseN + 300; },
    cam: { p: [[1900, 30, 300], [1860, 34, 290]], l: [[0, 200, 0], [0, 220, 0]], fov: 28 },
    post: { saturation: 0.8 },
  });
  D.card('24 hours after', '24 HOURS', 'AFTER THE ATTACKS', { mood: 'grief' });
}
