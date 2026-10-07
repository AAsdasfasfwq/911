// Low-level Web Audio synthesis helpers shared by SFX recipes, ambience beds and music.
// All randomness is seeded so every render produces the same samples.
import { rng } from '../core/util.js';

export const SR = 48000;
const NOISE_LEN = 8;

let NOISE = null;
export function noiseBuffers() {
  if (NOISE) return NOISE;
  const n = NOISE_LEN * SR, F = 4800;
  const mk = (seed, gen) => {
    const R = rng(seed), tmp = new Float32Array(n + F);
    gen(tmp, R);
    // fold the tail over the head so the buffer loops without a seam
    for (let i = 0; i < F; i++) { const k = i / F; tmp[i] = tmp[i] * k + tmp[n + i] * (1 - k); }
    const b = new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: SR });
    b.getChannelData(0).set(tmp.subarray(0, n));
    return b;
  };
  const white = mk(11, (d, R) => { for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * 0.6; });
  const pink = mk(12, (d, R) => {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = R() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16; b6 = w * 0.115926;
    }
  });
  const brown = mk(13, (d, R) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (R() * 2 - 1)) / 1.02; d[i] = l * 4.2; } });
  NOISE = { white, pink, brown, len: NOISE_LEN };
  return NOISE;
}

let IR = null;
export function reverbIR() {
  if (IR) return IR;
  const len = Math.floor(3.4 * SR);
  const b = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: SR });
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch), R = rng(500 + ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const decay = Math.exp(-t * 2.1);
      const k = 0.15 + 0.8 * Math.exp(-t * 1.6); // darker tail
      lp = lp + k * ((R() * 2 - 1) - lp);
      d[i] = lp * decay * (t < 0.012 ? t / 0.012 : 1);
    }
    // a few early reflections
    for (const [dt, a] of [[0.011, 0.5], [0.019, 0.35], [0.027, 0.3], [0.041, 0.22], [0.057, 0.16]]) { const i = Math.floor((dt + ch * 0.003) * SR); d[i] += a; }
  }
  IR = b;
  return IR;
}

const curveCache = new Map();
function distCurve(k) {
  if (curveCache.has(k)) return curveCache.get(k);
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
  curveCache.set(k, c);
  return c;
}

export const midiF = (semiFromD3) => 146.832 * Math.pow(2, semiFromD3 / 12);

// Synth voice factory bound to one (offline) context.
export class Syn {
  constructor(ctx, out, seed = 1) { this.ctx = ctx; this.out = out; this.R = rng(seed); this.N = noiseBuffers(); }
  // gain envelope: 0 -> g over a, hold, then decay over r (exponential by default)
  env(t, dur, g, a = 0.005, r = 0.1, lin = false) {
    const n = this.ctx.createGain(), G = n.gain;
    t = Math.max(0, t);
    G.setValueAtTime(0, t);
    G.linearRampToValueAtTime(g, t + Math.max(0.001, a));
    const hold = Math.max(t + a, t + dur - r);
    if (hold > t + a) G.setValueAtTime(g, hold);
    if (lin) G.linearRampToValueAtTime(0, t + dur);
    else { G.setTargetAtTime(0, hold, Math.max(0.002, r / 4.5)); G.setValueAtTime(0, t + dur + r * 0.2 + 0.01); }
    return n;
  }
  panner(t, dur, p0 = 0, p1 = p0) {
    const p = this.ctx.createStereoPanner();
    p.pan.setValueAtTime(Math.max(-1, Math.min(1, p0)), Math.max(0, t));
    if (p1 !== p0) p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, p1)), Math.max(0, t) + dur);
    return p;
  }
  filter(type, t, dur, f0, f1 = f0, q = 0.8, fd) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(10, f0), Math.max(0, t));
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), Math.max(0, t) + (fd ?? dur));
    return f;
  }
  shaper(k = 3) { const w = this.ctx.createWaveShaper(); w.curve = distCurve(k); w.oversample = '2x'; return w; }
  // connect a list of nodes in series, last one to dest
  wire(nodes, dest) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(dest || this.out); return nodes[0]; }

  // filtered noise burst. o: {type, f, f1, q, fd, lp, hp, g, a, r, pan, pan1, lin, rate, dest}
  noise(kind, t, dur, o = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.N[kind] || this.N.white; src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    t = Math.max(0, t);
    src.start(t, this.R() * (this.N.len - 1));
    src.stop(t + dur + 0.3);
    const chain = [src];
    if (o.type) chain.push(this.filter(o.type, t, dur, o.f ?? 1000, o.f1 ?? o.f ?? 1000, o.q ?? 0.8, o.fd));
    if (o.lp) chain.push(this.filter('lowpass', t, dur, o.lp, o.lp1 ?? o.lp, 0.7));
    if (o.hp) chain.push(this.filter('highpass', t, dur, o.hp, o.hp1 ?? o.hp, 0.7));
    if (o.am) chain.push(this.am(t, dur, o.am, o.amDepth ?? 0.8, o.amJitter ?? 0));
    chain.push(this.env(t, dur, o.g ?? 0.3, o.a ?? 0.005, o.r ?? Math.min(0.3, dur * 0.5), o.lin));
    chain.push(this.panner(t, dur, o.pan ?? 0, o.pan1 ?? o.pan ?? 0));
    this.wire(chain, o.dest);
    return src;
  }
  // amplitude modulation (flutter / syllables / rotor chop) baked as an automation curve
  am(t, dur, rate, depth = 0.8, jitter = 0) {
    const g = this.ctx.createGain();
    const n = Math.max(8, Math.ceil(dur * rate * 12)), c = new Float32Array(n);
    let ph = this.R() * 6.28;
    for (let i = 0; i < n; i++) {
      const tt = (i / (n - 1)) * dur;
      ph += (2 * Math.PI * rate * dur / (n - 1)) * (1 + (this.R() - 0.5) * jitter);
      const v = 0.5 + 0.5 * Math.sin(ph);
      c[i] = 1 - depth + depth * v * v;
    }
    g.gain.setValueCurveAtTime(c, Math.max(0, t), Math.max(0.01, dur));
    return g;
  }
  // oscillator voice. o: {f, f1, fd, g, a, r, lp, q, pan, pan1, detune, vib:[rate, cents], dist, dest, lin}
  osc(wave, t, dur, o = {}) {
    t = Math.max(0, t);
    const s = this.ctx.createOscillator();
    s.type = wave;
    s.frequency.setValueAtTime(o.f ?? 440, t);
    if (o.f1 != null && o.f1 !== o.f) s.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + (o.fd ?? dur));
    if (o.detune) s.detune.value = o.detune;
    if (o.vib) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(s.detune); l.start(t); l.stop(t + dur + 0.3); }
    s.start(t); s.stop(t + dur + 0.3);
    const chain = [s];
    if (o.dist) chain.push(this.shaper(o.dist));
    if (o.lp) chain.push(this.filter('lowpass', t, dur, o.lp, o.lp1 ?? o.lp, o.q ?? 0.7));
    if (o.bp) chain.push(this.filter('bandpass', t, dur, o.bp, o.bp1 ?? o.bp, o.q ?? 2));
    if (o.am) chain.push(this.am(t, dur, o.am, o.amDepth ?? 0.8));
    chain.push(this.env(t, dur, o.g ?? 0.2, o.a ?? 0.005, o.r ?? Math.min(0.3, dur * 0.5), o.lin));
    chain.push(this.panner(t, dur, o.pan ?? 0, o.pan1 ?? o.pan ?? 0));
    this.wire(chain, o.dest);
    return s;
  }
  // inharmonic/harmonic partials with individual decays (bells, chimes, piano, metal)
  partials(t, f0, ratios, o = {}) {
    const g0 = o.g ?? 0.1;
    ratios.forEach((r, i) => {
      const amp = (o.amps ? o.amps[i] : 1 / (1 + i * 0.7)) * g0;
      const dec = (o.decays ? o.decays[i] : (o.dur ?? 2) / (1 + i * 0.5));
      this.osc(o.wave || 'sine', t, dec, { f: f0 * r, f1: o.bend ? f0 * r * o.bend : undefined, g: amp, a: o.a ?? 0.002, r: dec * 0.9, pan: o.pan ?? 0, dest: o.dest, detune: (this.R() - 0.5) * (o.spread ?? 4) });
    });
  }
  // deep cinematic hit
  boom(t, o = {}) {
    const g = o.g ?? 0.8, d = o.dur ?? 3;
    this.osc('sine', t, d, { f: o.f ?? 68, f1: o.f1 ?? 28, fd: d * 0.7, g, a: 0.004, r: d * 0.9, dest: o.dest });
    this.osc('sine', t, d * 0.6, { f: (o.f ?? 68) * 2.02, f1: (o.f1 ?? 28) * 1.5, g: g * 0.25, a: 0.002, r: d * 0.5, dest: o.dest });
    this.noise('brown', t, d, { type: 'lowpass', f: o.lp ?? 500, f1: 70, fd: d * 0.6, g: g * 0.9, a: 0.004, r: d * 0.85, pan: o.pan, dest: o.dest });
    if (o.click !== false) this.noise('white', t, 0.12, { type: 'lowpass', f: 4000, f1: 500, g: g * 0.25, a: 0.001, r: 0.1, pan: o.pan, dest: o.dest });
  }
  click(t, o = {}) { this.noise('white', t, o.dur ?? 0.012, { type: 'bandpass', f: o.f ?? 3000, q: o.q ?? 1.5, g: o.g ?? 0.25, a: 0.0005, r: (o.dur ?? 0.012) * 0.8, pan: o.pan, dest: o.dest }); }
  thump(t, o = {}) { this.osc('sine', t, o.dur ?? 0.3, { f: o.f ?? 110, f1: o.f1 ?? 45, g: o.g ?? 0.5, a: 0.002, r: (o.dur ?? 0.3) * 0.9, pan: o.pan, dest: o.dest }); }
}
