// Entry point: boots fonts + scenario, builds the film, exposes seekTo/totalDuration
// for frame-exact Puppeteer rendering, and runs a real-time preview otherwise.
import * as THREE from 'three';
import { Pipeline } from './core/pipeline.js';
import { Film } from './core/film.js';
import { Script } from './core/script.js';
import { clamp } from './core/util.js';
import { registerSets } from './sets/index.js';
import { buildShots } from './shots/index.js';
import { SoundEngine } from './audio/engine.js';

const Q = new URLSearchParams(location.search);
const RENDER = Q.get('render') === '1';
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
const MB = +(Q.get('mb') || (RENDER ? 2 : 1));
const MSAA = +(Q.get('msaa') || 4);
const FPS = 30;
const SHUTTER = 0.5; // 180-degree shutter

window.__ready = false;
window.__error = null;

async function boot() {
  const fams = ['300 40px "Inter Tight"', '500 40px "Inter Tight"', '700 40px "Inter Tight"', '900 40px "Inter Tight"', 'italic 400 40px "Playfair Display"',
    '600 40px "Oswald"', '400 40px "Bebas Neue"', '400 40px "IBM Plex Mono"', '600 40px "IBM Plex Mono"', '400 40px "Special Elite"'];
  await Promise.all(fams.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;

  const json = await (await fetch('assets/scenario.json')).json();
  const script = new Script(json);

  const stage = document.getElementById('stage');
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.width = '1920px'; canvas.style.height = '1080px';
  stage.appendChild(canvas);
  const pipe = new Pipeline(canvas, W, H, { msaa: MSAA });

  const ov = document.createElement('canvas');
  ov.width = 1920; ov.height = 1080;
  const g = ov.getContext('2d');
  pipe.setOverlayCanvas(ov);

  const film = new Film();
  registerSets(film);
  const total = buildShots(film, script);
  film.finalize(total);
  if (script.misses.length) console.warn('[script] missing anchors:', script.misses);

  window.totalDuration = Math.round(total * 1000);
  window.__film = film;
  window.__fps = FPS;

  let lastOverlay = false;
  function renderFrame(T) {
    film.frameIndex++;
    const shot = film.shotAt(T);
    const N = shot.no3D ? 1 : Math.max(1, shot.mb ?? MB);
    let ctx = null;
    if (!shot.no3D) {
      for (let i = 0; i < N; i++) {
        const dt = N > 1 ? ((i + 0.5) / N - 0.5) * (SHUTTER / FPS) : 0;
        const Ts = clamp(T + dt, shot.t0, shot.t1 - 1e-4);
        ctx = film.evaluate(Ts, pipe.renderer, g, shot);
        if (ctx.set) pipe.renderScene(ctx.set.scene, ctx.cam, i, N, ctx.set.preRender ? (r) => ctx.set.preRender(r, ctx) : null);
      }
      if (N > 1) ctx = film.evaluate(T, pipe.renderer, g, shot);
    } else {
      ctx = film.evaluate(T, pipe.renderer, g, shot);
    }
    // ---- overlay ----
    g.clearRect(0, 0, 1920, 1080);
    let used = false;
    if (shot.overlay) { shot.overlay(ctx, g); used = true; }
    for (const o of film.overlays) {
      if (T >= o.t0 && T < o.t1) { o.draw(g, T - o.t0, o.t1 - o.t0, ctx); used = true; }
    }
    if (used || lastOverlay) pipe.overlayTex.needsUpdate = true;
    lastOverlay = used;
    pipe.finish(ctx.post, ctx.cam, N, T, used, !!shot.no3D);
    return shot;
  }

  // Prebuild a set (used by preview to avoid hitches and by render warmup)
  function prebuild(T) {
    const s = film.shotAt(T);
    if (s.set && !film.sets.has(s.set)) film.getSet(s.set, pipe.renderer);
  }

  window.seekTo = async (ms) => {
    try {
      const T = clamp(ms / 1000, 0, total - 1e-3);
      renderFrame(T);
      // wait for GPU to finish so the screenshot sees this frame
      pipe.renderer.getContext().finish();
    } catch (e) {
      window.__error = String(e && e.stack || e);
      throw e;
    }
  };
  window.__shotList = () => film.shots.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1, set: s.set }));

  // ---- audio (Web Audio, offline-rendered in chunks so it is identical in preview & export) ----
  const sound = new SoundEngine(film, total, script);
  window.__audio = sound;
  window.__renderAudioChunk = async (i, chunkSec) => sound.renderChunkBase64(i, chunkSec);
  window.__audioInfo = () => ({ sampleRate: sound.sampleRate, duration: total, channels: 2 });

  window.__ready = true;
  if (RENDER) return;

  // ---------------- real-time preview ----------------
  const fit = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit); fit();

  const voice = new Audio('assets/voiceover.mp3');
  voice.preload = 'auto';
  let t0 = performance.now() / 1000 - +(Q.get('t') || 0);
  let paused = false, pauseT = 0;
  const now = () => (paused ? pauseT : performance.now() / 1000 - t0);
  const startAudio = () => {
    if (paused) return;
    sound.startPreview(now());
    voice.currentTime = now();
    voice.play().catch(() => {});
  };
  startAudio();
  addEventListener('pointerdown', startAudio);
  addEventListener('keydown', (e) => {
    const T = now();
    const seek = (to) => { to = clamp(to, 0, total - 0.1); if (paused) pauseT = to; else t0 = performance.now() / 1000 - to; voice.currentTime = to; sound.startPreview(to); if (paused) renderFrame(to); };
    if (e.code === 'Space') {
      if (paused) { paused = false; t0 = performance.now() / 1000 - pauseT; startAudio(); }
      else { paused = true; pauseT = T; voice.pause(); sound.stopPreview(); }
    } else if (e.code === 'ArrowRight') seek(T + (e.shiftKey ? 30 : 5));
    else if (e.code === 'ArrowLeft') seek(T - (e.shiftKey ? 30 : 5));
    else if (e.code === 'Comma') seek(T - 1 / FPS);
    else if (e.code === 'Period') seek(T + 1 / FPS);
  });

  const dbg = Q.get('debug') === '1' ? document.createElement('div') : null;
  if (dbg) { dbg.style.cssText = 'position:absolute;left:8px;top:8px;color:#0f0;font:14px monospace;background:rgba(0,0,0,.5);padding:4px 8px'; document.body.appendChild(dbg); }

  const loop = () => {
    const T = now();
    if (!paused) {
      if (T >= total) { t0 = performance.now() / 1000; }
      const shot = renderFrame(Math.min(T, total - 0.001));
      if (Math.abs(voice.currentTime - T) > 0.25 && !voice.paused) voice.currentTime = T;
      if (dbg) dbg.textContent = `${T.toFixed(2)}s  #${shot.index} ${shot.name || ''}  [${shot.set || '-'}]`;
      prebuild(T + 2.5);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => { console.error(e); window.__error = String(e && e.stack || e); });
