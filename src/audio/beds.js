// Continuous ambience beds and mood music. Everything here is a pure function of absolute
// time (noise read positions, automation curves, event grids), so consecutive render
// chunks join seamlessly.
import { Syn, SR, noiseBuffers, midiF } from './synth.js';
import { clamp, lerp, hash, fbm1 } from '../core/util.js';

const CR = 25; // automation curve rate (points per second)

// helper: build an automation curve over the window from an absolute-time function
function curve(w0, w1, fn) {
  const n = Math.max(2, Math.ceil((w1 - w0) * CR) + 1), c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn(w0 + (i / (n - 1)) * (w1 - w0));
  return c;
}
function autoGain(ctx, w0, w1, fn) { const g = ctx.createGain(); g.gain.setValueCurveAtTime(curve(w0, w1, fn), 0, w1 - w0); return g; }
function autoFilter(ctx, type, w0, w1, ffn, q = 0.7) { const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueCurveAtTime(curve(w0, w1, (t) => Math.max(20, ffn(t))), 0, w1 - w0); return f; }
function loopNoise(ctx, kind, w0, w1, seed) {
  const N = noiseBuffers(), s = ctx.createBufferSource();
  s.buffer = N[kind]; s.loop = true;
  const off = (((w0 + seed * 1.618) % N.len) + N.len) % N.len;
  s.start(0, off); s.stop(w1 - w0 + 0.1);
  return s;
}
function pan(ctx, v) { const p = ctx.createStereoPanner(); p.pan.value = v; return p; }
function chain(nodes, dest) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(dest); }
// oscillator whose phase is locked to absolute time (starts on a period boundary)
function lockedOsc(ctx, type, f, w0, w1) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
  const ts = Math.ceil(w0 * f) / f - w0;
  o.start(Math.max(0, ts)); o.stop(w1 - w0 + 0.1);
  return o;
}
// deterministic sparse events on an absolute grid
function grid(w0, w1, s0, s1, rate, prob, seed, fn) {
  const a = Math.floor(Math.max(w0, s0) * rate) - 1, b = Math.ceil(Math.min(w1, s1) * rate);
  for (let k = a; k <= b; k++) {
    if (hash(k * 7919 + seed * 104729) >= prob) continue;
    const t = (k + hash(k * 31 + seed * 17)) / rate;
    if (t < w0 || t > w1 - 0.5 || t < s0 || t > s1) continue;
    fn(t, k);
  }
}

// ---------------- ambience layers ----------------
// each: (ctx, dest, w0, w1, seg, env(t), o, seed)
const L = {
  wind: (ctx, dest, w0, w1, seg, env, o, sd) => {
    for (const side of [-1, 1]) {
      const n = loopNoise(ctx, 'pink', w0, w1, sd + side);
      const f = autoFilter(ctx, 'bandpass', w0, w1, (t) => (o.f ?? 550) * (1 + 0.45 * fbm1(t * 0.12, sd + side * 3)), 0.6);
      const g = autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.15) * clamp(0.65 + 0.5 * fbm1(t * 0.09, sd + 7 + side) + (o.gust ? 0.45 * Math.max(0, fbm1(t * 0.05, sd + 11)) : 0), 0.1, 1.6));
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp ?? 2500;
      chain([n, f, lp, g, pan(ctx, side * 0.45)], dest);
    }
  },
  air: (ctx, dest, w0, w1, seg, env, o, sd) => { const n = loopNoise(ctx, 'white', w0, w1, sd); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.f ?? 3000; chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.04))], dest); },
  drone: (ctx, dest, w0, w1, seg, env, o) => {
    const f = o.f ?? 36.7;
    for (const [m, gg, p] of [[1, 1, -0.2], [1.5, 0.5, 0.2], [2.005, 0.3, 0]]) { const s = lockedOsc(ctx, 'sine', f * m, w0, w1); chain([s, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.05) * gg * (0.75 + 0.25 * fbm1(t * 0.1, m * 10))), pan(ctx, p)], dest); }
  },
  city: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'brown', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp ?? 380;
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12) * (0.8 + 0.2 * fbm1(t * 0.2, sd)))], dest);
    const n2 = loopNoise(ctx, 'pink', w0, w1, sd + 3), f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = Math.min(1100, (o.lp ?? 380) * 2.6); f2.Q.value = 0.5;
    chain([n2, f2, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12) * 0.35 * (0.7 + 0.3 * fbm1(t * 0.15, sd + 5)))], dest);
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, 0.12, 0.5, sd + 21, (t) => { const f0 = 330 + hash(t * 100) * 120; S.osc('sawtooth', t - w0, 0.35 + hash(t * 7) * 0.5, { f: f0, lp: 900, g: 0.006 * env(t) * (o.g ?? 0.12) / 0.12, a: 0.02, r: 0.1, pan: hash(t * 3) - 0.5 }); });
  },
  traffic: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const S = new Syn(ctx, dest, sd);
    grid(w0 - 4, w1, seg.s0 - 4, seg.s1, 0.6, 0.7, sd, (t) => { const d = 2.5 + hash(t * 13) * 2, dir = hash(t * 5) < 0.5 ? -1 : 1; S.noise('pink', t - w0, d, { type: 'bandpass', f: 500 + hash(t * 3) * 400, f1: 260, q: 0.7, g: (o.g ?? 0.08) * env(t) * (0.5 + hash(t * 9) * 0.6), a: d * 0.5, r: d * 0.5, pan: -0.8 * dir, pan1: 0.8 * dir }); });
  },
  birds: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, 1.4, 0.45, sd, (t) => { const f = 2400 + hash(t * 11) * 2400, n = 2 + Math.floor(hash(t * 5) * 4), p = hash(t * 3) * 1.6 - 0.8; for (let i = 0; i < n; i++) S.osc('sine', t - w0 + i * 0.09, 0.06, { f: f * (1 + 0.05 * i), f1: f * 1.35, g: (o.g ?? 0.03) * env(t), a: 0.005, r: 0.04, pan: p }); });
  },
  gulls: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.25, 0.5, sd, (t) => { for (let i = 0; i < 3; i++) S.osc('sawtooth', t - w0 + i * 0.32, 0.26, { f: 1300, f1: 850, bp: 1500, q: 3, g: (o.g ?? 0.03) * env(t), a: 0.03, r: 0.1, pan: hash(t) - 0.5 }); }); },
  crickets: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, 1.6, 0.6, sd, (t) => { const f = o.cic ? 5200 : 4300 + hash(t) * 400, p = hash(t * 7) * 1.4 - 0.7; for (let i = 0; i < (o.cic ? 10 : 3); i++) S.osc('sine', t - w0 + i * (o.cic ? 0.03 : 0.07), 0.035, { f, g: (o.g ?? 0.02) * env(t), a: 0.004, r: 0.02, pan: p }); });
  },
  water: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'pink', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp ?? 2600;
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.15) * (0.85 + 0.15 * fbm1(t * 0.6, sd)))], dest);
    const n2 = loopNoise(ctx, 'white', w0, w1, sd + 9), f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 3500;
    chain([n2, f2, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.15) * 0.18)], dest);
  },
  ocean: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'pink', w0, w1, sd);
    const f = autoFilter(ctx, 'lowpass', w0, w1, (t) => 500 + 900 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.85 + fbm1(t * 0.1, sd) * 2), 2), 0.5);
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12) * (0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.85 + fbm1(t * 0.1, sd) * 2), 2)))], dest);
  },
  rain: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'white', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12))], dest);
    const n2 = loopNoise(ctx, 'pink', w0, w1, sd + 2), f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 350; f2.Q.value = 0.6;
    chain([n2, f2, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12) * 0.5)], dest);
  },
  fire: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'brown', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp ?? 700;
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.1) * (0.7 + 0.3 * fbm1(t * 3, sd)))], dest);
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, o.crackle ? 14 : 8, 0.6, sd, (t) => S.click(t - w0, { f: 1500 + hash(t * 9) * 3000, q: 1.2, g: (o.g ?? 0.1) * env(t) * (0.4 + hash(t * 3)), dur: 0.004 + hash(t * 5) * 0.01, pan: hash(t) - 0.5 }));
  },
  murmur: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const voices = o.panic ? 8 : 6;
    for (let i = 0; i < voices; i++) {
      const n = loopNoise(ctx, 'pink', w0, w1, sd + i * 3);
      const base = (o.panic ? 850 : 600) * (0.7 + hash(sd + i) * 0.7);
      const f = autoFilter(ctx, 'bandpass', w0, w1, (t) => base * (1 + 0.35 * fbm1(t * 2.5, sd + i * 7)), 3);
      const rate = o.panic ? 7 : 4;
      const g = autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.08) * 0.5 * Math.pow(clamp(0.5 + 0.7 * fbm1(t * rate, sd + i * 13)), 1.5) * (o.cheer ? 0.7 + 0.5 * Math.max(0, fbm1(t * 0.3, sd)) : 1));
      chain([n, f, g, pan(ctx, (hash(sd * 3 + i) - 0.5) * 1.4)], dest);
    }
    if (o.panic) { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.7, 0.4, sd, (t) => S.osc('sawtooth', t - w0, 0.7, { f: 750 + hash(t) * 500, f1: 600, bp: 1300, q: 5, g: 0.006 * env(t), a: 0.08, r: 0.4, vib: [6, 40], pan: hash(t * 3) - 0.5 })); }
  },
  room: (ctx, dest, w0, w1, seg, env, o, sd) => { const n = loopNoise(ctx, 'pink', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp ?? 320; chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.05))], dest); },
  hum: (ctx, dest, w0, w1, seg, env, o) => { for (const [m, gg] of [[1, 1], [2, 0.5], [3, 0.2]]) chain([lockedOsc(ctx, 'sine', (o.f ?? 60) * m, w0, w1), autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.015) * gg)], dest); },
  keyboard: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 9, 0.55, sd, (t) => S.click(t - w0, { f: 2000 + hash(t * 3) * 1500, q: 2, g: (o.g ?? 0.03) * env(t) * 2, dur: 0.012, pan: 0.3 })); },
  phones: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.15, 0.6, sd, (t) => { for (let i = 0; i < 2; i++) S.osc('sine', t - w0 + i * 0.5, 0.35, { f: 1400, g: (o.g ?? 0.02) * env(t), a: 0.005, r: 0.02, am: 20, amDepth: 1, pan: -0.5 }); }); },
  beeps: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.8, 0.5, sd, (t) => S.osc('sine', t - w0, 0.08, { f: 1000 + Math.floor(hash(t) * 4) * 250, g: (o.g ?? 0.02) * env(t), a: 0.003, r: 0.04, pan: hash(t * 3) - 0.5 })); },
  tv: (ctx, dest, w0, w1, seg, env, o, sd) => {
    for (let i = 0; i < 2; i++) { const n = loopNoise(ctx, 'pink', w0, w1, sd + i); const f = autoFilter(ctx, 'bandpass', w0, w1, (t) => 900 * (1 + 0.4 * fbm1(t * 3, sd + i)), 4); chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.04) * Math.pow(clamp(0.5 + 0.8 * fbm1(t * 4.5, sd + i * 9)), 1.5)), pan(ctx, 0.3)], dest); }
  },
  clinks: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 1.2, 0.4, sd, (t) => S.partials(t - w0, 2400 + hash(t) * 1800, [1, 2.7, 5.1], { g: (o.g ?? 0.025) * env(t), dur: 0.4, pan: hash(t * 7) - 0.5 })); },
  sirensFar: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const s = ctx.createOscillator(); s.type = 'triangle';
    s.frequency.setValueCurveAtTime(curve(w0, w1, (t) => 760 + 260 * Math.sin(t * 2 * Math.PI * 0.22 + sd)), 0, w1 - w0);
    s.start(0); s.stop(w1 - w0 + 0.1);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
    chain([s, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.03) * clamp(0.3 + 0.7 * fbm1(t * 0.07, sd)))], dest);
  },
  machinery: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const s = lockedOsc(ctx, 'sawtooth', 41, w0, w1), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    chain([s, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.05) * (0.6 + 0.4 * fbm1(t * 0.3, sd)))], dest);
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, 0.8, 0.5, sd + 1, (t) => S.partials(t - w0, 500 + hash(t) * 900, [1, 1.47, 2.09], { g: 0.01 * env(t), dur: 0.6, wave: 'triangle', pan: hash(t * 3) - 0.5 }));
  },
  jetFar: (ctx, dest, w0, w1, seg, env, o, sd) => { const n = loopNoise(ctx, 'pink', w0, w1, sd), f = autoFilter(ctx, 'bandpass', w0, w1, (t) => 380 + 200 * fbm1(t * 0.05, sd), 0.7); chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.06) * Math.pow(clamp(0.5 + 0.8 * fbm1(t * 0.04, sd + 3)), 2))], dest); },
  heli: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'pink', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 230; f.Q.value = 0.9;
    const am = ctx.createGain(); am.gain.value = 0.5;
    const lfo = lockedOsc(ctx, 'sine', 17, w0, w1), lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
    chain([n, f, am, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.12))], dest);
  },
  battle: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const S = new Syn(ctx, dest, sd);
    grid(w0, w1, seg.s0, seg.s1, 0.5, 0.6, sd, (t) => { S.noise('brown', t - w0, 2.5, { type: 'lowpass', f: 240, f1: 80, g: (o.g ?? 0.1) * env(t) * 2.5, a: 0.03, r: 2, pan: hash(t) * 1.4 - 0.7 }); });
    grid(w0, w1, seg.s0, seg.s1, 0.4, 0.5, sd + 5, (t) => { for (let i = 0; i < 5; i++) S.noise('white', t - w0 + i * 0.1, 0.04, { type: 'lowpass', f: 1200, g: (o.g ?? 0.1) * env(t) * 0.8, a: 0.001, r: 0.035, pan: hash(t * 3) - 0.5 }); });
  },
  cabin: (ctx, dest, w0, w1, seg, env, o, sd) => {
    const n = loopNoise(ctx, 'brown', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.f ?? 520;
    chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.14))], dest);
    const n2 = loopNoise(ctx, 'pink', w0, w1, sd + 4), f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1400;
    chain([n2, f2, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.14) * 0.35)], dest);
    chain([lockedOsc(ctx, 'sine', 400, w0, w1), autoGain(ctx, w0, w1, (t) => env(t) * 0.002)], dest);
  },
  drip: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.8, 0.5, sd, (t) => S.osc('sine', t - w0, 0.08, { f: 1600 + hash(t) * 600, f1: 700, g: (o.g ?? 0.03) * env(t), a: 0.001, r: 0.07, pan: hash(t * 7) - 0.5 })); },
  rumble: (ctx, dest, w0, w1, seg, env, o, sd) => { const n = loopNoise(ctx, 'brown', w0, w1, sd), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; chain([n, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.15) * (0.7 + 0.3 * fbm1(t * 0.5, sd)))], dest); },
  thunderFar: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0 - 4, w1, seg.s0 - 4, seg.s1, 0.12, 0.6, sd, (t) => S.noise('brown', t - w0, 4, { type: 'lowpass', f: 260, f1: 100, g: (o.g ?? 0.06) * env(t) * 4, a: 0.3, r: 3, am: 2, amDepth: 0.5, amJitter: 1 })); },
  radio: (ctx, dest, w0, w1, seg, env, o, sd) => { const S = new Syn(ctx, dest, sd); grid(w0, w1, seg.s0, seg.s1, 0.3, 0.5, sd, (t) => { const d = 1 + hash(t) * 1.2; S.noise('pink', t - w0, d, { type: 'bandpass', f: 1000, q: 2.5, g: (o.g ?? 0.03) * env(t) * 1.5, a: 0.02, r: 0.05, am: 4.5, amDepth: 0.95, amJitter: 1.2, pan: -0.3 }); }); },
  generator: (ctx, dest, w0, w1, seg, env, o) => { const s = lockedOsc(ctx, 'sawtooth', 50, w0, w1), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; chain([s, f, autoGain(ctx, w0, w1, (t) => env(t) * (o.g ?? 0.03))], dest); },
};

export const BEDS = {
  windSoft: [['wind', { g: 0.11, f: 480 }]],
  windHigh: [['wind', { g: 0.17, f: 850, gust: 1 }]],
  space: [['drone', { f: 36.7, g: 0.035 }], ['air', { g: 0.018, f: 4000 }]],
  cityAmb: [['city', { g: 0.13 }], ['traffic', { g: 0.06 }], ['birds', { g: 0.018 }]],
  desertWind: [['wind', { g: 0.16, f: 650, gust: 1 }]],
  windMountain: [['wind', { g: 0.17, f: 560, gust: 1 }]],
  memorialWater: [['water', { g: 0.16 }], ['city', { g: 0.05 }], ['birds', { g: 0.01 }]],
  groundZero: [['wind', { g: 0.08 }], ['machinery', { g: 0.045 }], ['city', { g: 0.04 }], ['sirensFar', { g: 0.012 }]],
  officeAmb: [['room', { g: 0.05 }], ['hum', { f: 60, g: 0.008 }], ['keyboard', { g: 0.02 }], ['phones', { g: 0.008 }]],
  nightHarbor: [['water', { g: 0.06, lp: 700 }], ['city', { g: 0.05, lp: 300 }], ['wind', { g: 0.05 }]],
  aftermath: [['sirensFar', { g: 0.025 }], ['city', { g: 0.06 }], ['wind', { g: 0.05 }]],
  terminal: [['room', { g: 0.07 }], ['murmur', { g: 0.05 }], ['hum', { f: 120, g: 0.003 }]],
  rainSoft: [['rain', { g: 0.09 }]],
  fireDistant: [['fire', { g: 0.08, lp: 500 }], ['wind', { g: 0.05 }]],
  crowdCheer: [['murmur', { g: 0.1, cheer: 1 }]],
  tvRoom: [['room', { g: 0.045 }], ['tv', { g: 0.03 }]],
  streetPanic: [['murmur', { g: 0.09, panic: 1 }], ['sirensFar', { g: 0.03 }], ['city', { g: 0.06 }]],
  roomTone: [['room', { g: 0.045 }]],
  nightStreet: [['city', { g: 0.06, lp: 300 }], ['crickets', { g: 0.008 }]],
  jetApproach: [['jetFar', { g: 0.06 }], ['wind', { g: 0.05 }]],
  harbor: [['water', { g: 0.09, lp: 1200 }], ['gulls', { g: 0.015 }], ['wind', { g: 0.05 }]],
  eveningAmb: [['city', { g: 0.05 }], ['crickets', { g: 0.012 }]],
  collapse: [['rumble', { g: 0.16 }], ['wind', { g: 0.07 }]],
  cityDay: [['city', { g: 0.11 }], ['traffic', { g: 0.06 }], ['birds', { g: 0.018 }]],
  caveAmb: [['room', { g: 0.04, lp: 260 }], ['drip', { g: 0.02 }], ['wind', { g: 0.04, lp: 400 }]],
  cabinTense: [['cabin', { g: 0.12 }]],
  airportAmb: [['room', { g: 0.06 }], ['murmur', { g: 0.035 }], ['jetFar', { g: 0.03 }]],
  suburbDay: [['birds', { g: 0.03 }], ['wind', { g: 0.04 }], ['traffic', { g: 0.02 }]],
  store: [['room', { g: 0.045 }], ['hum', { f: 120, g: 0.005 }], ['murmur', { g: 0.02 }]],
  simRoom: [['hum', { f: 60, g: 0.01 }], ['room', { g: 0.045 }], ['beeps', { g: 0.012 }]],
  restaurant: [['murmur', { g: 0.07 }], ['clinks', { g: 0.02 }]],
  opsRoom: [['room', { g: 0.045 }], ['beeps', { g: 0.012 }], ['murmur', { g: 0.03 }]],
  officeTense: [['room', { g: 0.05 }], ['keyboard', { g: 0.025 }], ['phones', { g: 0.012 }]],
  officeHum: [['room', { g: 0.05 }], ['hum', { f: 60, g: 0.01 }]],
  nightRoom: [['room', { g: 0.035 }], ['crickets', { g: 0.008 }]],
  nightHeli: [['heli', { g: 0.1 }], ['wind', { g: 0.04 }]],
  nightBattle: [['battle', { g: 0.08 }], ['wind', { g: 0.05 }]],
  newsStudio: [['room', { g: 0.035 }], ['hum', { f: 60, g: 0.005 }]],
  kabulChaos: [['murmur', { g: 0.1, panic: 1 }], ['jetFar', { g: 0.06 }], ['wind', { g: 0.05 }], ['heli', { g: 0.025 }]],
  interceptRoom: [['room', { g: 0.04 }], ['hum', { f: 60, g: 0.01 }], ['beeps', { g: 0.01 }]],
  classroom: [['room', { g: 0.04 }], ['murmur', { g: 0.012 }], ['birds', { g: 0.006 }]],
  cityDistant: [['city', { g: 0.06, lp: 320 }], ['wind', { g: 0.04 }]],
  carrierDeck: [['wind', { g: 0.12, f: 800 }], ['ocean', { g: 0.06 }], ['jetFar', { g: 0.05 }]],
  cabinIdle: [['cabin', { g: 0.1 }]],
  birds: [['birds', { g: 0.04 }], ['wind', { g: 0.035 }]],
  atcRoom: [['room', { g: 0.04 }], ['beeps', { g: 0.012 }], ['radio', { g: 0.02 }]],
  vigil: [['murmur', { g: 0.03 }], ['wind', { g: 0.035 }]],
  tvLaugh: [['room', { g: 0.04 }], ['tv', { g: 0.035 }]],
  streetSomber: [['city', { g: 0.05 }], ['wind', { g: 0.04 }]],
  sirens: [['sirensFar', { g: 0.05 }], ['city', { g: 0.05 }]],
  rainStorm: [['rain', { g: 0.15 }], ['wind', { g: 0.08 }], ['thunderFar', { g: 0.05 }]],
  ocean: [['ocean', { g: 0.11 }], ['wind', { g: 0.04 }]],
  morningCity: [['city', { g: 0.08 }], ['birds', { g: 0.025 }]],
  morningBirds: [['birds', { g: 0.045 }], ['city', { g: 0.03 }]],
  lobby: [['room', { g: 0.06 }], ['murmur', { g: 0.02 }]],
  highway: [['traffic', { g: 0.1 }], ['wind', { g: 0.04 }]],
  harborTense: [['water', { g: 0.08, lp: 1000 }], ['wind', { g: 0.06 }], ['sirensFar', { g: 0.015 }]],
  hall: [['room', { g: 0.05 }], ['murmur', { g: 0.04 }]],
  gym: [['room', { g: 0.045 }], ['tv', { g: 0.02 }]],
  fireHigh: [['fire', { g: 0.12 }], ['wind', { g: 0.1, f: 900 }]],
  fighterPass: [['jetFar', { g: 0.06 }], ['wind', { g: 0.06 }]],
  fighterCockpit: [['cabin', { g: 0.14, f: 300 }], ['radio', { g: 0.015 }]],
  fieldWind: [['wind', { g: 0.1 }], ['crickets', { g: 0.008 }]],
  emptySky: [['wind', { g: 0.08, f: 1000 }]],
  emptyAirport: [['room', { g: 0.045 }], ['wind', { g: 0.03 }]],
  dustWave: [['rumble', { g: 0.13 }], ['wind', { g: 0.1 }]],
  dustAmb: [['wind', { g: 0.07, lp: 500 }], ['sirensFar', { g: 0.01 }]],
  diner: [['murmur', { g: 0.05 }], ['clinks', { g: 0.02 }], ['hum', { f: 120, g: 0.004 }]],
  cockpitWind: [['cabin', { g: 0.16, f: 500 }]],
  cockpitAmb: [['cabin', { g: 0.11 }]],
  cicadas: [['crickets', { g: 0.03, cic: 1 }]],
  cctvHum: [['hum', { f: 60, g: 0.01 }], ['city', { g: 0.04 }]],
  candleRoom: [['room', { g: 0.03 }], ['wind', { g: 0.015 }]],
  campfire: [['fire', { g: 0.06, crackle: 1 }], ['crickets', { g: 0.01 }]],
  cafe: [['murmur', { g: 0.05 }], ['clinks', { g: 0.018 }]],
  bunker: [['room', { g: 0.04, lp: 260 }], ['hum', { f: 50, g: 0.012 }]],
  baseAmb: [['wind', { g: 0.08 }], ['jetFar', { g: 0.04 }], ['generator', { g: 0.02 }]],
  airfield: [['wind', { g: 0.08 }], ['jetFar', { g: 0.05 }]],
};

export function buildBed(ctx, dest, seg, w0, w1) {
  const layers = BEDS[seg.name] || [['room', { g: 0.04 }], ['wind', { g: 0.04 }]];
  const env = (t) => clamp((t - seg.s0) / 0.3) * clamp((seg.s1 + 0.5 - t) / 0.5);
  const a = Math.max(w0, seg.s0 - 0.1), b = Math.min(w1, seg.s1 + 0.6);
  if (b <= a) return;
  layers.forEach(([kind, o], i) => {
    const fn = L[kind]; if (!fn) return;
    const sd = (seg.seed + i * 37) % 997;
    fn(ctx, dest, w0, w1, seg, env, o, sd);
  });
}

// ---------------- music ----------------
const CH = {
  Dm: { b: -12, v: [-5, 0, 3, 7] }, Bb: { b: -16, v: [-4, 0, 3, 8] }, Gm: { b: -19, v: [-7, -4, 0, 5] }, A: { b: -17, v: [-5, -1, 2, 7] },
  F: { b: -21, v: [-9, -5, -2, 3] }, C: { b: -14, v: [-2, 2, 5, 10] }, Dm7: { b: -12, v: [-5, 0, 3, 10] }, Fmaj7: { b: -21, v: [-5, -2, 2, 3] },
  Bbmaj7: { b: -16, v: [-4, 0, 3, 7] }, Am: { b: -17, v: [-5, -2, 2, 7] }, Dmadd9: { b: -12, v: [-5, 0, 3, 14] }, Dcl: { b: -12, v: [-5, 0, 1, 7] }, Ebm: { b: -11, v: [-6, 1, 4, 8] },
};
const P = {
  MIN: ['Dm', 'Bb', 'Gm', 'A'], MAJ: ['F', 'C', 'Dm', 'Bb'], REF: ['Fmaj7', 'Dm7', 'Bbmaj7', 'C'], DARK: ['Dm', 'Dcl', 'Bb', 'A'], END: ['Dmadd9', 'Bbmaj7', 'Fmaj7', 'A'], DREAD: ['Dcl', 'Ebm', 'Dcl', 'Bb'],
};
export const MOODS = {
  hope: { prog: 'MAJ', per: 8, pad: { g: 0.032, lp: 1500 }, arp: { bpm: 84, g: 0.018 }, sub: 0.02 },
  tension: { prog: 'MIN', per: 8, pad: { g: 0.026, lp: 850 }, pulse: { bpm: 96, g: 0.03 }, trem: { g: 0.004 }, sub: 0.028 },
  grief: { prog: 'MIN', per: 10, pad: { g: 0.03, lp: 750 }, piano: { every: 2.4, g: 0.035 }, sub: 0.02 },
  dark: { prog: 'DARK', per: 12, pad: { g: 0.026, lp: 520 }, drone: { g: 0.03 }, hits: { every: 8, g: 0.12 } },
  somber: { prog: 'MIN', per: 10, pad: { g: 0.03, lp: 650 }, cello: { every: 5, g: 0.02 }, sub: 0.02 },
  war: { prog: 'MIN', per: 8, pad: { g: 0.022, lp: 800 }, taiko: { bpm: 90, g: 0.12 }, ost: { bpm: 90, g: 0.016 }, sub: 0.03 },
  reflect: { prog: 'REF', per: 9, pad: { g: 0.026, lp: 1100 }, piano: { every: 1.7, g: 0.03 }, sub: 0.015 },
  impact: { prog: 'DARK', per: 12, pad: { g: 0.022, lp: 450 }, drone: { g: 0.04 }, swell: { every: 6, g: 0.025 } },
  neutral: { prog: 'MAJ', per: 8, pad: { g: 0.022, lp: 900 }, pulse: { bpm: 80, g: 0.012 } },
  memory: { prog: 'REF', per: 9, pad: { g: 0.022, lp: 1000 }, box: { bpm: 70, g: 0.02 } },
  hero: { prog: 'MAJ', per: 8, pad: { g: 0.032, lp: 1700 }, swell: { every: 8, g: 0.022 }, taiko: { bpm: 70, g: 0.06, sparse: true }, sub: 0.025 },
  dread: { prog: 'DREAD', per: 14, pad: { g: 0.022, lp: 380 }, drone: { g: 0.04 }, trem: { g: 0.003 } },
  rage: { prog: 'DARK', per: 8, pad: { g: 0.024, lp: 1200, dist: true }, taiko: { bpm: 100, g: 0.1 }, drone: { g: 0.035 } },
  awe: { prog: 'MAJ', per: 10, pad: { g: 0.026, lp: 2200, oct: true }, shimmer: { g: 0.006 }, sub: 0.02 },
  end: { prog: 'END', per: 12, pad: { g: 0.03, lp: 900 }, piano: { every: 2.8, g: 0.032 }, sub: 0.02 },
};
const SCALE = [-12, -10, -9, -7, -5, -4, -2, 0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];

function chordAt(cfg, t) { const prog = P[cfg.prog]; const k = Math.floor(t / cfg.per); return CH[prog[((k % prog.length) + prog.length) % prog.length]]; }

export function buildMusic(ctx, dest, seg, w0, w1) {
  const cfg = MOODS[seg.name] || MOODS.neutral;
  const S = new Syn(ctx, dest, seg.seed);
  const env = (t) => clamp((t - seg.s0) / 2.0) * clamp((seg.s1 + 2.5 - t) / 2.5);
  const s0 = seg.s0, s1 = seg.s1 + 2.5;
  const at = (t) => t - w0;
  // pads: one chord per period, overlapping release
  const per = cfg.per;
  for (let k = Math.floor(seg.s0 / per); k * per < seg.s1; k++) {
    const t0 = k * per, t = Math.max(t0, seg.s0);
    if (t < w0 || t >= w1 || t >= seg.s1) continue;
    const ch = chordAt(cfg, t0), L = Math.min(t0 + per + 3.5, seg.s1 + 2.5) - t, e = 1;
    if (L < 0.6) continue;
    ch.v.forEach((n, i) => {
      const f = midiF(n + (cfg.pad.oct ? 12 : 0));
      for (const dt of [-7, 7]) S.osc('sawtooth', at(t), L, { f, detune: dt, lp: cfg.pad.lp, q: 0.6, g: cfg.pad.g * 0.5 * e, a: 2.4, r: 3.2, pan: (i - 1.5) * 0.35, dist: cfg.pad.dist ? 2 : 0 });
      if (cfg.pad.oct) S.osc('sine', at(t), L, { f: f * 2, g: cfg.pad.g * 0.25 * e, a: 2.6, r: 3.2, pan: (1.5 - i) * 0.35 });
    });
    if (cfg.sub) S.osc('sine', at(t), L, { f: midiF(ch.b), g: cfg.sub * e, a: 2, r: 3 });
    if (cfg.drone) { S.osc('sine', at(t), L, { f: midiF(ch.b - 12 < -30 ? ch.b : ch.b - 12), g: cfg.drone.g * e, a: 3, r: 3 }); S.osc('sawtooth', at(t), L, { f: midiF(ch.b), lp: 160, g: cfg.drone.g * 0.6 * e, a: 3, r: 3 }); }
    if (cfg.hits && k % Math.round(cfg.hits.every / per || 1) === 0) S.boom(at(t), { g: cfg.hits.g * e, dur: 4, f: 48, f1: 26, lp: 220, click: false });
    if (cfg.swell) S.osc('sawtooth', at(t) + per - cfg.swell.every * 0.6, cfg.swell.every * 0.62, { f: midiF(ch.v[2] + 12), lp: 400, lp1: 2200, g: cfg.swell.g * e, a: cfg.swell.every * 0.55, r: 0.15 });
    if (cfg.shimmer) [24, 31, 36].forEach((n, i) => S.osc('sine', at(t), L, { f: midiF(ch.v[i % 4] + n), g: cfg.shimmer.g * e, a: 3, r: 3, am: 3 + i, amDepth: 0.5, pan: (i - 1) * 0.6 }));
  }
  const notes = (rate, fn) => { for (let k = Math.floor(Math.max(w0, s0) * rate); k / rate < Math.min(w1, s1); k++) { const t = k / rate; if (t < w0 || t < s0) continue; const e = env(t); if (e > 0.01) fn(t, k, e); } };
  if (cfg.pulse) notes(cfg.pulse.bpm / 30, (t, k, e) => { const ch = chordAt(cfg, t); const n = k % 4 === 3 ? ch.b + 19 : ch.b + 12; S.osc('square', at(t), 0.22, { f: midiF(n), lp: 420, g: cfg.pulse.g * e * (k % 2 ? 0.7 : 1), a: 0.004, r: 0.18 }); });
  if (cfg.ost) notes(cfg.ost.bpm / 15, (t, k, e) => { const ch = chordAt(cfg, t); const n = [12, 12, 19, 12][k % 4] + ch.b; S.osc('sawtooth', at(t), 0.14, { f: midiF(n), lp: 700, g: cfg.ost.g * e, a: 0.004, r: 0.1, pan: -0.2 }); });
  if (cfg.arp) notes(cfg.arp.bpm / 30, (t, k, e) => { const ch = chordAt(cfg, t); const n = ch.v[[0, 1, 2, 3, 2, 1][k % 6]] + 12; S.osc('triangle', at(t), 0.5, { f: midiF(n), lp: 2500, g: cfg.arp.g * e, a: 0.004, r: 0.45, pan: (k % 2 ? 0.3 : -0.3) }); });
  if (cfg.box) notes(cfg.box.bpm / 60, (t, k, e) => { if (hash(k * 3 + 1) < 0.25) return; const ch = chordAt(cfg, t); const n = ch.v[Math.floor(hash(k * 7) * 4)] + 24; S.partials(at(t), midiF(n), [1, 3.0, 5.2], { g: cfg.box.g * e, dur: 1.4, wave: 'sine', pan: hash(k) - 0.5 }); });
  if (cfg.piano) notes(1 / cfg.piano.every, (t, k, e) => {
    if (hash(k * 13 + 5) < 0.2) return;
    const ch = chordAt(cfg, t); const tt = t + (hash(k * 3) - 0.5) * 0.3;
    if (tt < w0) return;
    const n = ch.v[Math.floor(hash(k * 7) * 4)] + 12 + (hash(k * 11) < 0.3 ? 12 : 0);
    S.partials(at(tt), midiF(n), [1, 2, 3, 4.01], { g: cfg.piano.g * e, dur: 3.2, amps: [1, 0.4, 0.18, 0.08], decays: [3.2, 2.2, 1.4, 0.9], pan: (hash(k) - 0.5) * 0.6, spread: 3 });
    if (hash(k * 17) < 0.35) S.partials(at(tt) + 0.02, midiF(ch.b + 24), [1, 2], { g: cfg.piano.g * e * 0.5, dur: 3.5, amps: [1, 0.3], decays: [3.5, 2] });
  });
  if (cfg.cello) notes(1 / cfg.cello.every, (t, k, e) => { const ch = chordAt(cfg, t); const n = SCALE[Math.floor(hash(k * 5) * 7) + 4] - 12 + (ch.b > -14 ? 0 : 0); S.osc('sawtooth', at(t), cfg.cello.every + 0.8, { f: midiF(n), lp: 900, g: cfg.cello.g * e, a: 1.2, r: 1.4, vib: [5, 12], pan: 0.2 }); });
  if (cfg.trem) notes(1 / 6, (t, k, e) => { const f = midiF(26 + (k % 2)); [f, f * 1.06].forEach((ff, i) => S.osc('sine', at(t), 6.5, { f: ff, g: cfg.trem.g * e, a: 2, r: 2, am: 7 + i, amDepth: 0.7, pan: i ? 0.5 : -0.5 })); });
  if (cfg.taiko) notes(cfg.taiko.bpm / 60, (t, k, e) => {
    const pat = cfg.taiko.sparse ? [1, 0, 0, 0, 0, 0, 0, 0] : [1, 0, 0, 1, 0, 0, 1, 0];
    if (!pat[k % 8]) return;
    S.osc('sine', at(t), 0.9, { f: 95, f1: 48, fd: 0.25, g: cfg.taiko.g * e, a: 0.002, r: 0.8 });
    S.noise('brown', at(t), 0.4, { type: 'lowpass', f: 600, f1: 150, g: cfg.taiko.g * 0.6 * e, a: 0.002, r: 0.35 });
  });
}
