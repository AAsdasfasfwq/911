// SFX recipes: each one-shot is synthesized into its own buffer (see engine.js).
// recipe: { len(p) seconds, pre seconds of lead-in before the cue time, wet reverb send, gain, fn(s, t, p) }
import { midiF } from './synth.js';

const D = (p, d) => p.dur ?? d;
const rep = (n, f) => { for (let i = 0; i < n; i++) f(i); };

// shared building blocks ------------------------------------------------------
function whoosh(s, t, d, f0, f1, g, pan0 = -0.7, pan1 = 0.7) {
  s.noise('pink', t, d, { type: 'bandpass', f: f0, f1, q: 1.1, g, a: d * 0.45, r: d * 0.5, pan: pan0, pan1 });
  s.noise('white', t + d * 0.2, d * 0.6, { type: 'bandpass', f: f0 * 2, f1: f1 * 2, q: 2, g: g * 0.3, a: d * 0.25, r: d * 0.3, pan: pan0, pan1 });
}
function jet(s, t, d, o = {}) {
  const g = o.g ?? 0.5, p0 = o.pan0 ?? -0.9, p1 = o.pan1 ?? 0.9;
  s.noise('pink', t, d, { type: 'bandpass', f: o.f0 ?? 900, f1: o.f1 ?? 260, q: 0.6, g, a: d * (o.att ?? 0.45), r: d * 0.5, pan: p0, pan1: p1 });
  s.noise('brown', t, d, { type: 'lowpass', f: 300, g: g * 0.9, a: d * (o.att ?? 0.45), r: d * 0.55, pan: p0 * 0.6, pan1: p1 * 0.6 });
  s.osc('sawtooth', t, d, { f: o.w0 ?? 2300, f1: o.w1 ?? 1300, lp: 3500, g: g * 0.05, a: d * 0.4, r: d * 0.5, pan: p0, pan1: p1 });
  s.noise('white', t + d * 0.25, d * 0.5, { type: 'highpass', f: 2500, g: g * 0.25, a: d * 0.25, r: d * 0.25, pan: p0 * 0.5, pan1: p1 * 0.5 });
}
function babble(s, t, d, o = {}) {
  const n = o.n ?? 8, g = o.g ?? 0.08;
  rep(n, (i) => {
    const f = (o.f ?? 650) * (0.7 + s.R() * 0.8);
    s.noise('pink', t + s.R() * 0.3, d, { type: 'bandpass', f, f1: f * (0.8 + s.R() * 0.5), q: o.q ?? 3, g: g * (0.6 + s.R() * 0.6), a: o.a ?? 0.3, r: o.r ?? 0.6, pan: (s.R() - 0.5) * 1.4, am: o.rate ?? (3.5 + s.R() * 2.5), amDepth: 0.9, amJitter: 0.8 });
  });
}
function scream(s, t, d, g, f = 900) {
  s.osc('sawtooth', t, d, { f, f1: f * (0.75 + s.R() * 0.3), bp: 1100 + s.R() * 600, q: 5, g, a: 0.08, r: d * 0.5, vib: [5 + s.R() * 2, 40], pan: (s.R() - 0.5) * 1.2 });
}
function steps(s, t, d, rate, o = {}) {
  const n = Math.floor(d * rate);
  rep(n, (i) => {
    const tt = t + i / rate + (s.R() - 0.5) * 0.04, pan = (i % 2 ? 0.15 : -0.15) + (o.pan ?? 0);
    s.thump(tt, { f: 90, f1: 50, dur: 0.12, g: (o.g ?? 0.25) * (0.8 + s.R() * 0.4), pan });
    s.noise(o.kind ?? 'white', tt, o.crunch ?? 0.09, { type: 'bandpass', f: o.f ?? 1800, q: 0.9, g: (o.g ?? 0.25) * (o.cg ?? 0.6), a: 0.002, r: 0.07, pan });
  });
}
function chirp(s, t, o = {}) {
  const f = o.f ?? (2600 + s.R() * 1800), n = o.n ?? (2 + Math.floor(s.R() * 4));
  rep(n, (i) => s.osc('sine', t + i * (0.07 + s.R() * 0.05), 0.06, { f, f1: f * (1.2 + s.R() * 0.4), g: o.g ?? 0.04, a: 0.005, r: 0.04, pan: o.pan ?? 0 }));
}
function crackles(s, t, d, rate, g) {
  const n = Math.floor(d * rate);
  rep(n, () => { const tt = t + s.R() * d; s.click(tt, { f: 1500 + s.R() * 3500, q: 1.2, g: g * (0.3 + s.R()), dur: 0.004 + s.R() * 0.01, pan: (s.R() - 0.5) * 1.2 }); });
}
function radio(s, t, d, g) {
  s.osc('sine', t, 0.08, { f: 1450, g: g * 0.5, a: 0.002, r: 0.03 });
  s.noise('white', t + 0.08, d - 0.1, { type: 'bandpass', f: 1400, q: 0.8, g: g * 0.25, a: 0.02, r: 0.05 });
  s.noise('pink', t + 0.1, d - 0.2, { type: 'bandpass', f: 900, f1: 1300, q: 2.5, g: g * 1.1, a: 0.02, r: 0.05, am: 4.5, amDepth: 0.95, amJitter: 1.2 });
  s.osc('sine', t + d - 0.08, 0.06, { f: 1200, g: g * 0.4, a: 0.002, r: 0.03 });
}
function bell(s, t, f, g, dur = 5, pan = 0) {
  s.partials(t, f, [0.5, 1, 1.19, 1.5, 2.0, 2.52, 3.0, 4.07], { g, dur, amps: [0.6, 1, 0.55, 0.4, 0.35, 0.25, 0.2, 0.12], decays: [dur * 1.3, dur, dur * 0.7, dur * 0.55, dur * 0.45, dur * 0.35, dur * 0.3, dur * 0.2], pan });
}
function piano(s, t, f, g, dur = 3, pan = 0) {
  s.partials(t, f, [1, 2, 3, 4, 5.02], { g, dur, amps: [1, 0.45, 0.22, 0.12, 0.06], decays: [dur, dur * 0.7, dur * 0.45, dur * 0.3, dur * 0.2], wave: 'sine', pan, spread: 3 });
  s.noise('white', t, 0.02, { type: 'bandpass', f: f * 4, q: 1, g: g * 0.15, a: 0.001, r: 0.015, pan });
}
function dtmf(s, t, d, i, g) {
  const lo = [697, 770, 852, 941], hi = [1209, 1336, 1477];
  s.osc('sine', t, d, { f: lo[i % 4], g, a: 0.003, r: 0.01, lin: true }); s.osc('sine', t, d, { f: hi[(i * 7) % 3], g, a: 0.003, r: 0.01, lin: true });
}
function rumble(s, t, d, g, lp = 180) {
  s.noise('brown', t, d, { type: 'lowpass', f: lp, q: 0.5, g, a: d * 0.2, r: d * 0.4, am: 1.3, amDepth: 0.35, amJitter: 1 });
  s.noise('pink', t, d, { type: 'lowpass', f: lp * 3, g: g * 0.3, a: d * 0.2, r: d * 0.4 });
}
function metalHit(s, t, g, f = 420) {
  s.partials(t, f, [1, 1.47, 2.09, 2.76, 3.9], { g, dur: 1.4, amps: [1, 0.7, 0.5, 0.35, 0.2], wave: 'triangle', spread: 10 });
  s.noise('white', t, 0.06, { type: 'bandpass', f: 2500, q: 1, g: g * 0.8, a: 0.001, r: 0.05 });
}
function engine(s, t, d, f, g, o = {}) {
  s.osc('sawtooth', t, d, { f, f1: o.f1 ?? f, lp: o.lp ?? 260, g, a: o.a ?? 0.4, r: o.r ?? 0.6, pan: o.pan0 ?? 0, pan1: o.pan1 ?? 0, am: o.am, amDepth: 0.4 });
  s.osc('sawtooth', t, d, { f: f * 1.51, f1: (o.f1 ?? f) * 1.51, lp: (o.lp ?? 260) * 0.8, g: g * 0.5, a: o.a ?? 0.4, r: o.r ?? 0.6, pan: o.pan0 ?? 0, pan1: o.pan1 ?? 0 });
  s.noise('brown', t, d, { type: 'lowpass', f: (o.lp ?? 260) * 1.5, g: g * 1.2, a: o.a ?? 0.4, r: o.r ?? 0.6, pan: o.pan0 ?? 0, pan1: o.pan1 ?? 0 });
}

// recipes ---------------------------------------------------------------------
export const SFX = {
  // ---- impacts ----
  boom: { len: () => 4.5, wet: 0.35, fn: (s, t, p) => s.boom(t, { g: 0.85, dur: 3.6 }) },
  impact: { len: () => 4, wet: 0.35, fn: (s, t) => { s.boom(t, { g: 0.8, dur: 3, f: 75 }); metalHit(s, t, 0.08, 180); } },
  impactDeep: { len: () => 6, wet: 0.45, fn: (s, t) => { s.boom(t, { g: 0.9, dur: 5, f: 55, f1: 24, lp: 300 }); s.osc('sine', t, 4, { f: 41, g: 0.35, a: 0.02, r: 3.5 }); } },
  impactSoft: { len: () => 3, wet: 0.4, fn: (s, t) => s.boom(t, { g: 0.45, dur: 2.4, f: 85, f1: 40, lp: 350, click: false }) },
  softHit: { len: () => 2.5, wet: 0.45, fn: (s, t) => { s.boom(t, { g: 0.32, dur: 2, f: 95, f1: 45, lp: 300, click: false }); s.osc('sine', t, 1.6, { f: 587, g: 0.025, a: 0.005, r: 1.5 }); } },
  boomSoft: { len: () => 3.5, wet: 0.4, fn: (s, t) => s.boom(t, { g: 0.45, dur: 3, f: 70, lp: 280, click: false }) },
  thump: { len: () => 0.8, wet: 0.2, fn: (s, t) => { s.thump(t, { f: 120, f1: 45, dur: 0.35, g: 0.5 }); s.noise('brown', t, 0.25, { type: 'lowpass', f: 400, g: 0.3, r: 0.2 }); } },
  distantBoom: { len: () => 4.5, wet: 0.6, fn: (s, t, p) => { const g = 0.45 * (p.gain ?? 1); s.noise('brown', t, 3.6, { type: 'lowpass', f: 260, f1: 70, g, a: 0.03, r: 3, pan: (s.R() - 0.5) * 1.2 }); s.osc('sine', t, 2.4, { f: 52, f1: 30, g: g * 0.6, a: 0.02, r: 2.2 }); } },
  distantImpact: { len: () => 4.5, wet: 0.6, fn: (s, t) => { s.noise('brown', t, 3.5, { type: 'lowpass', f: 300, f1: 80, g: 0.5, a: 0.02, r: 3 }); s.osc('sine', t, 2.2, { f: 55, f1: 30, g: 0.3, a: 0.02, r: 2 }); } },
  explosion: { len: () => 6, wet: 0.4, fn: (s, t) => { s.boom(t, { g: 0.95, dur: 4.5, f: 60, lp: 900 }); s.noise('pink', t + 0.05, 4, { type: 'lowpass', f: 2500, f1: 400, g: 0.45, a: 0.01, r: 3.5 }); crackles(s, t + 0.2, 3.5, 30, 0.2); } },
  fireballRoar: { len: () => 6, wet: 0.35, fn: (s, t, p) => { s.noise('brown', t, 5, { type: 'lowpass', f: 900, f1: 250, g: 0.75, a: 0.15, r: 4 }); s.noise('pink', t, 4.5, { type: 'bandpass', f: 600, f1: 250, q: 0.6, g: 0.4, a: 0.25, r: 3.5, am: 9, amDepth: 0.3, amJitter: 1 }); s.boom(t, { g: 0.7, dur: 3.5, f: 55 }); crackles(s, t + 0.4, 4, 18, 0.15); } },
  tankShot: { len: () => 3.5, wet: 0.5, fn: (s, t) => { s.noise('white', t, 0.12, { type: 'bandpass', f: 1400, q: 0.7, g: 0.8, a: 0.001, r: 0.1 }); s.boom(t, { g: 0.85, dur: 2.6, f: 62, f1: 32, lp: 700 }); } },
  riseHit: { len: () => 4, pre: 1.0, wet: 0.4, fn: (s, t) => { s.noise('pink', t - 1.0, 1.0, { type: 'highpass', f: 300, f1: 4000, q: 0.7, g: 0.25, a: 0.95, r: 0.03, lin: true }); s.boom(t, { g: 0.7, dur: 2.8 }); } },
  cardHit: {
    len: () => 7, pre: 1.2, wet: 0.55, gain: 0.95,
    fn: (s, t) => {
      // reverse swell into a deep, dark hit with a metallic ring and a tick
      s.noise('pink', t - 1.2, 1.2, { type: 'bandpass', f: 180, f1: 2600, q: 0.8, g: 0.22, a: 1.15, r: 0.02, lin: true });
      s.osc('sawtooth', t - 1.0, 1.0, { f: 73.4, f1: 110, lp: 300, lp1: 1600, g: 0.07, a: 0.95, r: 0.02, lin: true });
      s.boom(t, { g: 0.9, dur: 5.5, f: 58, f1: 26, lp: 320 });
      s.partials(t, 146.8, [1, 2.76, 5.4, 8.93], { g: 0.05, dur: 5, amps: [1, 0.5, 0.3, 0.15], wave: 'sine', spread: 6 });
      s.click(t, { f: 5000, g: 0.25, dur: 0.008 });
      s.osc('sine', t + 0.02, 3, { f: 1174.7, g: 0.012, a: 0.01, r: 2.8 });
    },
  },
  paperThud: { len: () => 0.8, wet: 0.2, fn: (s, t) => { s.thump(t, { f: 140, f1: 60, dur: 0.2, g: 0.35 }); s.noise('white', t, 0.12, { type: 'lowpass', f: 1600, g: 0.2, r: 0.1 }); } },
  wallFall: { len: () => 4, wet: 0.4, fn: (s, t) => { rumble(s, t, 3, 0.6, 250); rep(8, (i) => s.thump(t + 0.2 + s.R() * 1.8, { f: 160, f1: 60, dur: 0.25, g: 0.35 })); s.boom(t + 0.4, { g: 0.6, dur: 2.5 }); } },
  blastDoor: { len: () => 3.5, wet: 0.5, fn: (s, t) => { s.thump(t, { f: 90, f1: 40, dur: 0.6, g: 0.7 }); metalHit(s, t, 0.12, 110); s.noise('brown', t, 1.2, { type: 'bandpass', f: 120, q: 6, g: 0.4, r: 1 }); } },
  doorSlam: { len: () => 1.6, wet: 0.35, fn: (s, t) => { s.thump(t, { f: 130, f1: 55, dur: 0.3, g: 0.6 }); s.noise('pink', t, 0.15, { type: 'bandpass', f: 320, q: 1.5, g: 0.5, r: 0.12 }); } },
  stamp: { len: () => 1, wet: 0.25, fn: (s, t) => { s.thump(t, { f: 160, f1: 70, dur: 0.18, g: 0.55 }); s.noise('white', t, 0.06, { type: 'bandpass', f: 2200, q: 0.8, g: 0.35, r: 0.05 }); } },
  hammer: { len: () => 1.5, wet: 0.35, fn: (s, t) => { metalHit(s, t, 0.12, 900); s.thump(t, { f: 200, f1: 90, dur: 0.1, g: 0.3 }); } },

  // ---- whooshes / transitions ----
  whoosh: { len: (p) => 1.0, wet: 0.2, gain: 0.8, fn: (s, t) => whoosh(s, t, 0.75, 300, 2600, 0.35) },
  swish: { len: () => 0.6, wet: 0.15, fn: (s, t) => whoosh(s, t, 0.38, 900, 4500, 0.28, 0.6, -0.6) },
  whooshBright: { len: () => 1.2, wet: 0.3, fn: (s, t) => { whoosh(s, t, 0.9, 700, 6000, 0.3); s.osc('sine', t + 0.4, 0.6, { f: 1760, f1: 2637, g: 0.02, a: 0.2, r: 0.3 }); } },
  zoomOut: { len: (p) => D(p, 1.4) + 0.3, wet: 0.3, fn: (s, t, p) => whoosh(s, t, D(p, 1.4), 3500, 250, 0.25, 0.3, -0.3) },
  windGust: { len: () => 3, wet: 0.2, fn: (s, t) => s.noise('pink', t, 2.6, { type: 'bandpass', f: 350, f1: 900, fd: 1.2, q: 0.9, g: 0.35, a: 1.1, r: 1.2, pan: -0.5, pan1: 0.5 }) },
  fadeAir: { len: (p) => D(p, 1.4) + 0.4, wet: 0.5, fn: (s, t, p) => { s.noise('white', t, D(p, 1.4), { type: 'highpass', f: 2500, f1: 6000, g: 0.08, a: D(p, 1.4) * 0.6, r: 0.5 }); s.osc('sine', t, D(p, 1.4), { f: 1318.5, g: 0.012, a: 0.6, r: 0.6 }); } },
  mapShift: { len: (p) => D(p, 1.8) + 0.5, wet: 0.3, fn: (s, t, p) => { const d = D(p, 1.8); s.noise('brown', t, d, { type: 'lowpass', f: 300, g: 0.35, a: 0.3, r: 0.6 }); whoosh(s, t + 0.2, d * 0.7, 200, 900, 0.18); rep(5, (i) => s.thump(t + 0.3 + i * d / 6, { f: 150, f1: 70, dur: 0.12, g: 0.15 })); } },
  cardSlide: { len: () => 0.8, wet: 0.15, fn: (s, t) => { s.noise('white', t, 0.35, { type: 'bandpass', f: 2600, f1: 1800, q: 0.9, g: 0.18, a: 0.05, r: 0.2, pan: 0.4, pan1: -0.1 }); s.thump(t + 0.33, { f: 200, f1: 90, dur: 0.08, g: 0.12 }); } },
  cardsFan: { len: () => 1.0, wet: 0.15, fn: (s, t) => rep(6, (i) => s.noise('white', t + i * 0.07, 0.09, { type: 'bandpass', f: 3000, q: 1, g: 0.1, a: 0.01, r: 0.06, pan: -0.6 + i * 0.24 })) },
  paperSlide: { len: () => 1.0, wet: 0.15, fn: (s, t) => { s.noise('white', t, 0.55, { type: 'bandpass', f: 2200, f1: 1500, q: 0.8, g: 0.16, a: 0.1, r: 0.3, pan: 0.5, pan1: 0 }); s.thump(t + 0.5, { f: 180, f1: 80, dur: 0.1, g: 0.12 }); } },

  // ---- aircraft ----
  jetPass: { len: (p) => D(p, 3.2) + 0.5, wet: 0.35, fn: (s, t, p) => jet(s, t, D(p, 3.2), { g: 0.5 }) },
  jetRoar: { len: (p) => D(p, 3.2) + 0.5, wet: 0.35, fn: (s, t, p) => jet(s, t, D(p, 3.2), { g: 0.65, f0: 700, f1: 300, att: 0.35 }) },
  jetLow: { len: (p) => D(p, 3) + 0.5, wet: 0.35, fn: (s, t, p) => jet(s, t, D(p, 3), { g: 0.55, f0: 500, f1: 180, w0: 1600, w1: 900 }) },
  jetRoarLow: { len: (p) => D(p, 3) + 0.5, wet: 0.35, fn: (s, t, p) => jet(s, t, D(p, 3), { g: 0.55, f0: 450, f1: 220, w0: 1400, w1: 1100, pan0: -0.3, pan1: 0.3, att: 0.2 }) },
  jetIdle: { len: (p) => D(p, 3) + 0.5, wet: 0.25, fn: (s, t, p) => { const d = D(p, 3); s.osc('sawtooth', t, d, { f: 1850, lp: 3000, g: 0.025, a: 0.5, r: 0.6 }); s.osc('sine', t, d, { f: 2730, g: 0.01, a: 0.5, r: 0.6 }); s.noise('pink', t, d, { type: 'lowpass', f: 600, g: 0.2, a: 0.5, r: 0.6 }); } },
  jetCruise: { len: (p) => D(p, 3) + 0.5, wet: 0.2, fn: (s, t, p) => { const d = D(p, 3); s.noise('pink', t, d, { type: 'lowpass', f: 700, g: 0.3, a: 0.6, r: 0.8 }); s.noise('brown', t, d, { type: 'lowpass', f: 160, g: 0.3, a: 0.6, r: 0.8 }); } },
  jetScream: { len: (p) => D(p, 2.6) + 0.3, wet: 0.3, fn: (s, t, p) => { const d = D(p, 2.6); s.osc('sawtooth', t, d, { f: 1300, f1: 3400, lp: 5000, g: 0.06, a: d * 0.9, r: 0.05, lin: true }); s.noise('pink', t, d, { type: 'bandpass', f: 400, f1: 1600, q: 0.6, g: 0.6, a: d * 0.9, r: 0.05, lin: true }); s.noise('brown', t, d, { type: 'lowpass', f: 400, g: 0.6, a: d * 0.8, r: 0.05, lin: true }); } },
  jetDive: { len: (p) => D(p, 2.5) + 0.5, wet: 0.3, fn: (s, t, p) => { const d = D(p, 2.5); s.osc('sawtooth', t, d, { f: 2600, f1: 1100, lp: 4000, g: 0.05, a: 0.4, r: 0.6 }); jet(s, t, d, { g: 0.5, f0: 1100, f1: 350 }); } },
  jetBank: { len: (p) => D(p, 2.2) + 0.5, wet: 0.3, fn: (s, t, p) => { const d = D(p, 2.2); whoosh(s, t, d * 0.6, 300, 1500, 0.25); jet(s, t, d, { g: 0.4, f0: 800, f1: 400 }); } },
  fighterFlyby: { len: () => 3, wet: 0.35, fn: (s, t) => { jet(s, t, 2.2, { g: 0.75, f0: 1400, f1: 220, att: 0.55 }); crackles(s, t + 1.0, 1.0, 40, 0.15); } },
  bomberDrone: { len: (p) => D(p, 3) + 0.6, wet: 0.3, fn: (s, t, p) => { const d = D(p, 3); [55, 57.3, 82.5].forEach((f, i) => s.osc('sawtooth', t, d, { f, lp: 320, g: 0.08, a: 0.7, r: 0.8, am: 6 + i, amDepth: 0.35, pan: (i - 1) * 0.4 })); s.noise('brown', t, d, { type: 'lowpass', f: 250, g: 0.3, a: 0.7, r: 0.8 }); } },
  catapultLaunch: { len: (p) => D(p, 2.5) + 0.8, wet: 0.3, fn: (s, t, p) => { s.noise('white', t, 0.9, { type: 'highpass', f: 1500, g: 0.4, a: 0.02, r: 0.6 }); s.thump(t, { f: 90, f1: 40, dur: 0.5, g: 0.5 }); jet(s, t + 0.2, D(p, 2.5), { g: 0.6, f0: 500, f1: 900, w0: 1200, w1: 2600, att: 0.25, pan0: -0.2, pan1: 0.8 }); } },
  propPlane: { len: () => 4, wet: 0.25, fn: (s, t) => { s.osc('sawtooth', t, 3.5, { f: 95, f1: 82, lp: 1200, g: 0.08, a: 1.2, r: 1.5, am: 32, amDepth: 0.5, pan: -0.8, pan1: 0.8 }); s.noise('pink', t, 3.5, { type: 'bandpass', f: 500, q: 0.8, g: 0.1, a: 1.2, r: 1.5, pan: -0.8, pan1: 0.8 }); } },
  heliApproach: { len: (p) => D(p, 3) + 0.6, wet: 0.3, fn: (s, t, p) => { const d = D(p, 3); s.noise('pink', t, d, { type: 'bandpass', f: 220, q: 0.9, g: 0.55, a: d * 0.8, r: 0.4, am: 19, amDepth: 0.85, pan: -0.6, pan1: 0.2 }); s.noise('brown', t, d, { type: 'lowpass', f: 160, g: 0.4, a: d * 0.8, r: 0.4, am: 19, amDepth: 0.6 }); s.osc('sawtooth', t, d, { f: 880, f1: 960, lp: 2000, g: 0.015, a: d * 0.8, r: 0.4 }); } },

  // ---- UI / data / infographics ----
  dataBlip: { len: () => 0.4, wet: 0.2, gain: 0.8, fn: (s, t) => { s.osc('sine', t, 0.06, { f: 1250, f1: 1700, g: 0.07, a: 0.002, r: 0.04 }); s.osc('sine', t + 0.055, 0.07, { f: 2500, g: 0.04, a: 0.002, r: 0.05 }); } },
  pop: { len: () => 0.4, wet: 0.2, fn: (s, t) => { s.osc('sine', t, 0.1, { f: 650, f1: 260, g: 0.16, a: 0.002, r: 0.08 }); s.click(t, { f: 2500, g: 0.1 }); } },
  pinDrop: { len: () => 1.2, wet: 0.35, fn: (s, t) => { s.osc('sine', t, 0.5, { f: 1100, f1: 1500, fd: 0.05, g: 0.07, a: 0.002, r: 0.45 }); s.thump(t, { f: 180, f1: 70, dur: 0.12, g: 0.2 }); } },
  tick: { len: () => 0.2, wet: 0.1, fn: (s, t) => s.click(t, { f: 3500, g: 0.2, dur: 0.008 }) },
  marker: { len: () => 0.8, wet: 0.1, fn: (s, t) => s.noise('white', t, 0.4, { type: 'bandpass', f: 3200, q: 3, g: 0.07, a: 0.02, r: 0.1, am: 20, amDepth: 0.5 }) },
  markerDraw: { len: () => 0.8, wet: 0.1, fn: (s, t) => s.noise('white', t, 0.45, { type: 'bandpass', f: 2800, q: 3, g: 0.07, a: 0.02, r: 0.1, am: 16, amDepth: 0.5, amJitter: 0.5 }) },
  ding: { len: () => 2, wet: 0.4, fn: (s, t) => s.partials(t, 1046.5, [1, 2.0, 2.76, 4.1], { g: 0.05, dur: 1.6 }) },
  beep: { len: () => 0.4, wet: 0.15, fn: (s, t) => s.osc('square', t, 0.14, { f: 1000, lp: 3000, g: 0.03, a: 0.003, r: 0.01, lin: true }) },
  ping: { len: () => 1.5, wet: 0.5, fn: (s, t) => s.osc('sine', t, 1.0, { f: 1400, g: 0.06, a: 0.002, r: 0.95 }) },
  targetLock: { len: () => 1.4, wet: 0.2, fn: (s, t) => { rep(3, (i) => s.osc('square', t + i * 0.12, 0.06, { f: 1500 + i * 250, lp: 4000, g: 0.025, a: 0.002, r: 0.01, lin: true })); s.osc('square', t + 0.4, 0.7, { f: 2200, lp: 4000, g: 0.025, a: 0.002, r: 0.02, lin: true }); } },
  buzz: { len: () => 0.6, wet: 0.15, fn: (s, t) => s.osc('sawtooth', t, 0.32, { f: 118, lp: 1600, g: 0.07, a: 0.005, r: 0.02, lin: true }) },
  countUp: { len: (p) => D(p, 1.4) + 0.3, wet: 0.15, fn: (s, t, p) => { const d = D(p, 1.4), n = Math.floor(d * 22); rep(n, (i) => s.osc('sine', t + i / 22, 0.025, { f: 1800 + i * 25, g: 0.03, a: 0.001, r: 0.02 })); } },
  tickRun: { len: (p) => D(p, 1.8) + 0.3, wet: 0.15, fn: (s, t, p) => { const d = D(p, 1.8), n = Math.floor(d * 15); rep(n, (i) => s.click(t + i / 15 * (1 + i / n * 0.6) * 0.75, { f: 3800, g: 0.14 * (1 - i / n * 0.5), dur: 0.006 })); } },
  clockTicks: { len: (p) => D(p, 3) + 0.4, wet: 0.35, fn: (s, t, p) => { const n = Math.ceil(D(p, 3)); rep(n, (i) => { s.click(t + i, { f: i % 2 ? 2600 : 3400, g: 0.18, dur: 0.01 }); s.osc('sine', t + i, 0.08, { f: i % 2 ? 1900 : 2300, g: 0.02, a: 0.001, r: 0.07 }); }); } },
  clockFast: { len: (p) => D(p, 2) + 0.3, wet: 0.25, fn: (s, t, p) => { const n = Math.floor(D(p, 2) * 9); rep(n, (i) => s.click(t + i / 9, { f: i % 2 ? 2600 : 3400, g: 0.12, dur: 0.008 })); whoosh(s, t, D(p, 2), 300, 1200, 0.08); } },
  dataRain: { len: (p) => D(p, 2) + 0.3, wet: 0.25, fn: (s, t, p) => { const d = D(p, 2), n = Math.floor(d * 26); rep(n, () => { const f = 900 + s.R() * 2600; s.osc('sine', t + s.R() * d, 0.04, { f, f1: f * 1.3, g: 0.025, a: 0.001, r: 0.03, pan: (s.R() - 0.5) * 1.6 }); }); } },
  glitch: { len: () => 0.6, wet: 0.1, fn: (s, t) => { rep(6, (i) => s.osc('square', t + i * 0.04, 0.035, { f: 200 + s.R() * 3000, lp: 6000, g: 0.04, a: 0.001, r: 0.005, lin: true, pan: (s.R() - 0.5) * 1.5 })); s.noise('white', t, 0.25, { type: 'bandpass', f: 3000, q: 0.5, g: 0.1, a: 0.001, r: 0.02, am: 40, amDepth: 1 }); } },
  servo: { len: () => 0.9, wet: 0.15, fn: (s, t) => s.osc('sawtooth', t, 0.55, { f: 380, f1: 620, fd: 0.3, bp: 900, q: 1.5, g: 0.06, a: 0.03, r: 0.12 }) },
  servoMany: { len: (p) => D(p, 2) + 0.5, wet: 0.2, fn: (s, t, p) => rep(8, (i) => s.osc('sawtooth', t + s.R() * D(p, 2) * 0.7, 0.45, { f: 300 + s.R() * 200, f1: 600 + s.R() * 300, bp: 900, q: 1.5, g: 0.03, a: 0.03, r: 0.1, pan: (s.R() - 0.5) * 1.6 })) },
  detectorChime: { len: () => 1.5, wet: 0.3, fn: (s, t) => { s.osc('sine', t, 0.3, { f: 880, g: 0.06, a: 0.005, r: 0.25 }); s.osc('sine', t + 0.25, 0.6, { f: 660, g: 0.06, a: 0.005, r: 0.55 }); } },
  metalDetectorBeep: { len: () => 1.2, wet: 0.25, fn: (s, t) => rep(3, (i) => s.osc('square', t + i * 0.22, 0.14, { f: 1760, lp: 3500, g: 0.03, a: 0.003, r: 0.01, lin: true })) },
  atmBeeps: { len: () => 1.5, wet: 0.15, fn: (s, t) => rep(4, (i) => s.osc('square', t + i * 0.25, 0.1, { f: 1200, lp: 3000, g: 0.025, a: 0.002, r: 0.01, lin: true })) },
  alarmShort: { len: () => 1.0, wet: 0.3, fn: (s, t) => rep(4, (i) => s.osc('square', t + i * 0.15, 0.13, { f: i % 2 ? 660 : 880, lp: 2500, g: 0.035, a: 0.003, r: 0.01, lin: true })) },
  alarm: { len: (p) => D(p, 2) + 0.4, wet: 0.35, fn: (s, t, p) => { const n = Math.ceil(D(p, 2) / 0.6); rep(n, (i) => s.osc('sawtooth', t + i * 0.6, 0.5, { f: 520, f1: 760, lp: 2200, g: 0.04, a: 0.01, r: 0.05 })); } },
  alarmSet: { len: () => 1.4, wet: 0.2, fn: (s, t) => rep(5, (i) => s.osc('sine', t + i * 0.12, 0.08, { f: 900 + i * 150, g: 0.04, a: 0.002, r: 0.05 })) },
  alarmPulse: { len: () => 1.6, wet: 0.35, fn: (s, t) => rep(2, (i) => s.osc('sawtooth', t + i * 0.5, 0.4, { f: 220, lp: 900, g: 0.06, a: 0.02, r: 0.15 })) },
  elevatorDing: { len: () => 2, wet: 0.4, fn: (s, t) => { s.partials(t, 1318.5, [1, 2.0, 3.0], { g: 0.05, dur: 1.4 }); s.partials(t + 0.35, 1046.5, [1, 2.0, 3.0], { g: 0.05, dur: 1.6 }); } },
  paChime: { len: () => 2.4, wet: 0.5, fn: (s, t) => [784, 659.3, 523.3].forEach((f, i) => s.partials(t + i * 0.32, f, [1, 2, 3], { g: 0.05, dur: 1.5 })) },
  cashRegister: { len: () => 1.6, wet: 0.3, fn: (s, t) => { s.partials(t, 2093, [1, 1.5, 2.2], { g: 0.04, dur: 1.2 }); s.noise('white', t + 0.15, 0.3, { type: 'bandpass', f: 1500, q: 1, g: 0.1, r: 0.15 }); s.thump(t + 0.3, { f: 150, f1: 70, dur: 0.12, g: 0.2 }); } },
  cashCount: { len: () => 1.5, wet: 0.15, fn: (s, t) => rep(10, (i) => s.noise('white', t + i * 0.1, 0.05, { type: 'bandpass', f: 3000, q: 1, g: 0.08, a: 0.002, r: 0.04 })) },
  lockClick: { len: () => 0.5, wet: 0.2, fn: (s, t) => { s.click(t, { f: 4200, q: 4, g: 0.2 }); s.click(t + 0.05, { f: 2400, q: 4, g: 0.15 }); } },
  cameraShutter: { len: () => 0.6, wet: 0.15, fn: (s, t) => { s.click(t, { f: 3000, g: 0.2 }); s.noise('white', t + 0.02, 0.08, { type: 'bandpass', f: 1800, q: 1, g: 0.06 }); s.click(t + 0.11, { f: 2500, g: 0.15 }); } },
  radarLost: { len: () => 2.5, wet: 0.5, fn: (s, t) => { s.osc('sine', t, 1.2, { f: 1200, f1: 600, g: 0.06, a: 0.005, r: 1 }); s.noise('white', t + 0.6, 1.4, { type: 'bandpass', f: 2000, q: 0.6, g: 0.05, a: 0.3, r: 0.6 }); } },
  xrayHum: { len: (p) => D(p, 2.5) + 0.3, wet: 0.15, fn: (s, t, p) => { s.osc('sawtooth', t, D(p, 2.5), { f: 120, lp: 600, g: 0.03, a: 0.2, r: 0.3 }); s.osc('sine', t, D(p, 2.5), { f: 60, g: 0.04, a: 0.2, r: 0.3 }); } },
  modem: { len: () => 3, wet: 0.15, fn: (s, t) => { rep(7, (i) => dtmf(s, t + i * 0.1, 0.07, i, 0.03)); s.osc('sine', t + 0.8, 0.6, { f: 2100, g: 0.03, a: 0.01, r: 0.02, lin: true }); rep(10, (i) => s.osc('square', t + 1.4 + i * 0.12, 0.1, { f: 900 + s.R() * 2000, lp: 3500, g: 0.02, a: 0.002, r: 0.01, lin: true })); s.noise('white', t + 1.6, 1.0, { type: 'bandpass', f: 1800, q: 1, g: 0.04, a: 0.05, r: 0.3 }); } },
  phoneDial: { len: () => 1.4, wet: 0.15, fn: (s, t) => rep(7, (i) => dtmf(s, t + i * 0.15, 0.1, i * 3 + 1, 0.03)) },
  newsSting: { len: () => 3.5, wet: 0.45, fn: (s, t) => { [0, 3, 7, 12].forEach((n, i) => s.osc('sawtooth', t, 1.6, { f: midiF(n + 12), lp: 2600, lp1: 900, g: 0.04, a: 0.01, r: 1.2, pan: (i - 1.5) * 0.3 })); s.boom(t, { g: 0.55, dur: 2.2, f: 80 }); whoosh(s, t - 0.0, 0.5, 600, 3000, 0.15); } },
  keyboardBurst: { len: (p) => D(p, 1.5) + 0.3, wet: 0.1, fn: (s, t, p) => { const d = D(p, 1.5), n = Math.floor(d * 11); rep(n, (i) => s.click(t + i / 11 + s.R() * 0.04, { f: 2200 + s.R() * 1800, q: 2, g: 0.12, dur: 0.015 })); } },
  typewriter: { len: (p) => D(p, 1.6) + 0.8, wet: 0.2, fn: (s, t, p) => { const d = D(p, 1.6), n = Math.floor(d * 9); rep(n, (i) => { const tt = t + i / 9 + s.R() * 0.03; s.click(tt, { f: 1800, q: 1.5, g: 0.22, dur: 0.02 }); s.thump(tt, { f: 220, f1: 120, dur: 0.05, g: 0.1 }); }); s.partials(t + d + 0.05, 2637, [1, 2.4], { g: 0.04, dur: 0.8 }); } },
  tape: { len: () => 1.2, wet: 0.1, fn: (s, t) => { s.click(t, { f: 1600, q: 3, g: 0.25 }); s.noise('white', t + 0.05, 0.8, { type: 'highpass', f: 3000, g: 0.03, a: 0.05, r: 0.2 }); } },
  scratch: { len: () => 0.8, wet: 0.1, fn: (s, t) => s.noise('white', t, 0.5, { type: 'bandpass', f: 2600, q: 2.5, g: 0.08, a: 0.02, r: 0.1, am: 14, amDepth: 0.7, amJitter: 1 }) },
  pencil: { len: () => 0.8, wet: 0.1, fn: (s, t) => s.noise('white', t, 0.5, { type: 'bandpass', f: 3400, q: 3, g: 0.06, a: 0.02, r: 0.1, am: 10, amDepth: 0.6, amJitter: 1 }) },
  quill: { len: () => 1.4, wet: 0.15, fn: (s, t) => s.noise('white', t, 1.0, { type: 'bandpass', f: 3800, q: 3, g: 0.06, a: 0.05, r: 0.2, am: 7, amDepth: 0.7, amJitter: 1 }) },
  pageFlip: { len: () => 0.8, wet: 0.15, fn: (s, t) => s.noise('white', t, 0.35, { type: 'bandpass', f: 2500, f1: 1200, q: 0.8, g: 0.13, a: 0.03, r: 0.2, am: 25, amDepth: 0.4, pan: 0.4, pan1: -0.4 }) },
  pageTurn: { len: () => 0.8, wet: 0.15, fn: (s, t) => s.noise('white', t, 0.4, { type: 'bandpass', f: 2300, f1: 1100, q: 0.8, g: 0.13, a: 0.05, r: 0.2, am: 22, amDepth: 0.4, pan: 0.3, pan1: -0.3 }) },
  paperTear: { len: () => 1, wet: 0.15, fn: (s, t) => s.noise('white', t, 0.6, { type: 'bandpass', f: 1800, f1: 2800, q: 1.2, g: 0.12, a: 0.02, r: 0.1, am: 30, amDepth: 0.8, amJitter: 1.5 }) },
  bagRustle: { len: () => 1.2, wet: 0.1, fn: (s, t) => s.noise('white', t, 0.8, { type: 'bandpass', f: 2600, q: 1, g: 0.08, a: 0.05, r: 0.2, am: 18, amDepth: 0.8, amJitter: 1.5 }) },
  binSlide: { len: () => 1.2, wet: 0.15, fn: (s, t) => { s.noise('pink', t, 0.6, { type: 'lowpass', f: 1200, g: 0.15, a: 0.05, r: 0.2, pan: -0.4, pan1: 0.3 }); s.thump(t + 0.55, { f: 200, f1: 90, dur: 0.1, g: 0.18 }); } },

  // ---- people ----
  cough: { len: () => 1.4, wet: 0.25, fn: (s, t) => rep(2, (i) => { s.noise('pink', t + i * 0.32, 0.22, { type: 'bandpass', f: 700, q: 1.6, g: 0.25, a: 0.005, r: 0.15 }); s.noise('white', t + i * 0.32, 0.12, { type: 'bandpass', f: 1800, q: 1, g: 0.08, a: 0.005, r: 0.1 }); }) },
  heartbeat: { len: (p) => D(p, 2.2) + 0.5, wet: 0.2, fn: (s, t, p) => { const n = Math.ceil(D(p, 2.2) / 0.9); rep(n, (i) => { s.thump(t + i * 0.9, { f: 62, f1: 38, dur: 0.22, g: 0.55 }); s.thump(t + i * 0.9 + 0.22, { f: 55, f1: 35, dur: 0.2, g: 0.38 }); }); } },
  crowdPanic: { len: (p) => D(p, 2.5) + 0.8, wet: 0.35, fn: (s, t, p) => { const d = D(p, 2.5); babble(s, t, d, { n: 10, g: 0.07, f: 900, rate: 6 }); rep(3, () => scream(s, t + s.R() * d * 0.6, 0.6 + s.R() * 0.6, 0.012, 800 + s.R() * 500)); } },
  crowdCheerBurst: { len: () => 3.5, wet: 0.4, fn: (s, t) => { babble(s, t, 2.8, { n: 12, g: 0.08, f: 800, rate: 3, a: 0.2, r: 1.5 }); s.noise('pink', t, 2.8, { type: 'bandpass', f: 1200, q: 0.5, g: 0.18, a: 0.2, r: 1.6 }); rep(2, (i) => s.osc('sine', t + 0.3 + i * 0.6, 0.4, { f: 2400, f1: 3000, g: 0.02, a: 0.02, r: 0.2 })); } },
  screamsDistant: { len: (p) => D(p, 2.5) + 1, wet: 0.6, fn: (s, t, p) => rep(4, () => scream(s, t + s.R() * D(p, 2.5) * 0.7, 0.7 + s.R() * 0.5, 0.01, 700 + s.R() * 500)) },
  speechMurmur: { len: (p) => D(p, 3) + 0.8, wet: 0.35, fn: (s, t, p) => babble(s, t, D(p, 3), { n: 6, g: 0.05, f: 550 }) },
  footstepsWet: { len: (p) => D(p, 2.5) + 0.3, wet: 0.3, fn: (s, t, p) => steps(s, t, D(p, 2.5), 2, { g: 0.2, kind: 'white', f: 2600, crunch: 0.12, cg: 0.8 }) },
  footstepsRun: { len: (p) => D(p, 2.5) + 0.3, wet: 0.3, fn: (s, t, p) => steps(s, t, D(p, 2.5), 3.3, { g: 0.22, f: 1500 }) },
  footstepsEcho: { len: (p) => D(p, 2.5) + 0.6, wet: 0.6, fn: (s, t, p) => steps(s, t, D(p, 2.5), 1.8, { g: 0.2, f: 2400, cg: 0.4 }) },
  bootsGravel: { len: (p) => D(p, 2.5) + 0.3, wet: 0.2, fn: (s, t, p) => steps(s, t, D(p, 2.5), 1.9, { g: 0.22, kind: 'pink', f: 1300, crunch: 0.16, cg: 0.9 }) },
  radioChatter: { len: (p) => D(p, 1.8) + 0.3, wet: 0.15, fn: (s, t, p) => radio(s, t, D(p, 1.8), 0.12) },
  policeRadio: { len: (p) => D(p, 2) + 0.3, wet: 0.15, fn: (s, t, p) => radio(s, t, D(p, 2), 0.12) },
  radioStatic: { len: (p) => D(p, 1.5) + 0.3, wet: 0.1, fn: (s, t, p) => { s.noise('white', t, D(p, 1.5), { type: 'bandpass', f: 1600, q: 0.7, g: 0.07, a: 0.02, r: 0.1 }); crackles(s, t, D(p, 1.5), 20, 0.1); } },
  phoneVoices: { len: (p) => D(p, 2.5) + 0.3, wet: 0.1, fn: (s, t, p) => babble(s, t, D(p, 2.5), { n: 3, g: 0.06, f: 1100, q: 5 }) },
  paVoice: { len: (p) => D(p, 2.5) + 1, wet: 0.7, fn: (s, t, p) => { s.partials(t, 659, [1, 2], { g: 0.04, dur: 0.8 }); babble(s, t + 0.6, D(p, 2.5), { n: 2, g: 0.07, f: 700, q: 4 }); } },
  relief: { len: () => 3, wet: 0.4, fn: (s, t) => babble(s, t, 2.2, { n: 10, g: 0.06, f: 500, rate: 1.5, a: 0.3, r: 1.4 }) },
  micThump: { len: () => 1.2, wet: 0.4, fn: (s, t) => { s.thump(t, { f: 90, f1: 50, dur: 0.25, g: 0.3 }); s.osc('sine', t + 0.1, 0.8, { f: 2450, g: 0.006, a: 0.3, r: 0.4 }); } },

  // ---- environment ----
  thunder: { len: () => 7, wet: 0.5, fn: (s, t) => { s.noise('white', t, 0.25, { type: 'highpass', f: 800, g: 0.35, a: 0.002, r: 0.2 }); s.noise('brown', t + 0.05, 6, { type: 'lowpass', f: 380, f1: 120, g: 0.8, a: 0.15, r: 5, am: 2.2, amDepth: 0.6, amJitter: 1.5 }); } },
  rainHeavy: { len: (p) => D(p, 2) + 0.5, wet: 0.2, fn: (s, t, p) => { const d = D(p, 2); s.noise('white', t, d, { type: 'highpass', f: 900, g: 0.18, a: 0.3, r: 0.4 }); s.noise('pink', t, d, { type: 'bandpass', f: 400, q: 0.6, g: 0.1, a: 0.3, r: 0.4 }); crackles(s, t, d, 60, 0.05); } },
  fireRoar: { len: (p) => D(p, 3) + 0.6, wet: 0.3, fn: (s, t, p) => { const d = D(p, 3); s.noise('brown', t, d, { type: 'lowpass', f: 600, g: 0.5, a: 0.4, r: 0.6, am: 7, amDepth: 0.35, amJitter: 1 }); s.noise('pink', t, d, { type: 'bandpass', f: 500, q: 0.6, g: 0.2, a: 0.4, r: 0.6, am: 11, amDepth: 0.4, amJitter: 1 }); crackles(s, t, d, 14, 0.15); } },
  fireCrackle: { len: (p) => D(p, 3) + 0.4, wet: 0.2, fn: (s, t, p) => { const d = D(p, 3); s.noise('brown', t, d, { type: 'lowpass', f: 400, g: 0.2, a: 0.3, r: 0.4 }); crackles(s, t, d, 22, 0.2); } },
  birds: { len: () => 3, wet: 0.4, fn: (s, t) => rep(4, () => chirp(s, t + s.R() * 2.2, { pan: (s.R() - 0.5) * 1.4 })) },
  flagFlap: { len: (p) => D(p, 2.5) + 0.3, wet: 0.2, fn: (s, t, p) => s.noise('pink', t, D(p, 2.5), { type: 'bandpass', f: 650, q: 0.8, g: 0.2, a: 0.2, r: 0.3, am: 6, amDepth: 0.85, amJitter: 1.4 }) },
  flagWind: { len: (p) => D(p, 3) + 0.3, wet: 0.2, fn: (s, t, p) => { s.noise('pink', t, D(p, 3), { type: 'bandpass', f: 650, q: 0.8, g: 0.18, a: 0.3, r: 0.3, am: 5, amDepth: 0.85, amJitter: 1.4 }); s.noise('pink', t, D(p, 3), { type: 'bandpass', f: 400, q: 0.7, g: 0.12, a: 0.5, r: 0.5 }); } },
  debrisRain: { len: (p) => D(p, 3) + 0.5, wet: 0.35, fn: (s, t, p) => { const d = D(p, 3); rep(Math.floor(d * 14), () => { const tt = t + s.R() * d; if (s.R() < 0.5) metalHit(s, tt, 0.015, 600 + s.R() * 1500); else s.thump(tt, { f: 160, f1: 70, dur: 0.1, g: 0.12, pan: (s.R() - 0.5) * 1.4 }); }); s.noise('pink', t, d, { type: 'lowpass', f: 1200, g: 0.12, a: 0.2, r: 0.5 }); } },
  dustRoar: { len: (p) => D(p, 6) + 1, wet: 0.35, fn: (s, t, p) => { const d = D(p, 6); s.noise('brown', t, d, { type: 'lowpass', f: 500, f1: 260, g: 0.75, a: d * 0.25, r: d * 0.5 }); s.noise('pink', t, d, { type: 'lowpass', f: 1600, f1: 500, g: 0.3, a: d * 0.3, r: d * 0.5 }); } },
  collapseRoar: { len: (p) => D(p, 12) + 2, wet: 0.4, fn: (s, t, p) => { const d = D(p, 12); rumble(s, t, d, 0.8, 220); s.noise('pink', t + 0.5, d * 0.9, { type: 'lowpass', f: 1400, f1: 400, g: 0.4, a: d * 0.2, r: d * 0.5 }); rep(16, (i) => { const tt = t + s.R() * d * 0.8; s.thump(tt, { f: 90, f1: 40, dur: 0.5, g: 0.3 }); if (i % 3 === 0) metalHit(s, tt, 0.02, 200 + s.R() * 300); }); rep(3, (i) => s.osc('sawtooth', t + 1 + i * 2.5, 2.2, { f: 70 + s.R() * 30, f1: 50, bp: 300, q: 4, g: 0.05, a: 0.4, r: 1 })); s.boom(t, { g: 0.6, dur: 5, f: 45 }); } },
  collapseRumble: { len: (p) => D(p, 5) + 1.5, wet: 0.4, fn: (s, t, p) => { rumble(s, t, D(p, 5), 0.6, 200); s.boom(t, { g: 0.4, dur: 3, f: 45 }); } },
  metalGroan: { len: () => 4, wet: 0.5, fn: (s, t) => { s.osc('sawtooth', t, 3, { f: 72, f1: 52, bp: 260, bp1: 180, q: 6, g: 0.12, a: 0.6, r: 1.2, vib: [0.8, 30] }); s.osc('sawtooth', t + 0.4, 2.4, { f: 110, f1: 96, bp: 420, q: 8, g: 0.06, a: 0.5, r: 1 }); } },
  metalCreak: { len: () => 2, wet: 0.4, fn: (s, t) => s.osc('sawtooth', t, 1.3, { f: 260, f1: 210, bp: 900, q: 10, g: 0.06, a: 0.2, r: 0.4, vib: [7, 60] }) },
  rubbleDig: { len: (p) => D(p, 2.5) + 0.5, wet: 0.25, fn: (s, t, p) => { const d = D(p, 2.5); rep(Math.floor(d * 2.2), (i) => { const tt = t + i / 2.2 + s.R() * 0.1; s.noise('white', tt, 0.25, { type: 'bandpass', f: 1300, q: 1, g: 0.15, a: 0.01, r: 0.15 }); s.thump(tt + 0.2, { f: 150, f1: 70, dur: 0.12, g: 0.15 }); }); rep(Math.floor(d * 5), () => metalHit(s, t + s.R() * d, 0.008, 1200 + s.R() * 2000)); } },
  rubbleSlide: { len: (p) => D(p, 3) + 0.6, wet: 0.3, fn: (s, t, p) => { const d = D(p, 3); s.noise('pink', t, d, { type: 'lowpass', f: 1600, f1: 600, g: 0.3, a: 0.2, r: 1 }); rep(Math.floor(d * 12), () => s.thump(t + s.R() * d, { f: 200, f1: 90, dur: 0.08, g: 0.1, pan: (s.R() - 0.5) })); } },
  liquidFill: { len: () => 2, wet: 0.25, fn: (s, t) => rep(16, (i) => { const f = 300 + i * 30 + s.R() * 200; s.osc('sine', t + i * 0.09, 0.06, { f, f1: f * 1.6, g: 0.03, a: 0.003, r: 0.05 }); }) },
  pumpHum: { len: (p) => D(p, 3) + 0.4, wet: 0.2, fn: (s, t, p) => engine(s, t, D(p, 3), 50, 0.06, { lp: 300 }) },
  hiss: { len: () => 1.2, wet: 0.2, fn: (s, t) => s.noise('white', t, 0.8, { type: 'highpass', f: 4000, g: 0.12, a: 0.05, r: 0.4 }) },
  sirens: { len: (p) => D(p, 3) + 0.8, wet: 0.5, fn: (s, t, p) => { const d = D(p, 3); s.osc('triangle', t, d, { f: 720, lp: 2400, g: 0.04, a: 0.4, r: 0.6, vib: [0.35, 700] }); s.osc('triangle', t + 0.3, d, { f: 960, lp: 2400, g: 0.025, a: 0.4, r: 0.6, vib: [0.5, 500], pan: 0.4 }); } },
  fireworks: { len: () => 4, wet: 0.5, fn: (s, t, p) => { const g = 0.3 * (p.gain ?? 1); rep(6, (i) => { const tt = t + i * 0.45 + s.R() * 0.2; s.osc('sine', tt, 0.6, { f: 900, f1: 2400, g: 0.008, a: 0.05, r: 0.1 }); s.boom(tt + 0.6, { g: g * 0.6, dur: 1.2, f: 90, lp: 900 }); crackles(s, tt + 0.7, 0.9, 30, g * 0.4); }); } },
  bellToll: { len: () => 7, wet: 0.6, fn: (s, t, p) => bell(s, t, 196, 0.06 * (p.gain ?? 1), 6) },
  ghostShimmer: { len: () => 3.5, wet: 0.7, fn: (s, t) => [1760, 2217.5, 2637, 3520].forEach((f, i) => s.osc('sine', t + i * 0.15, 2.6, { f, g: 0.008, a: 1.0, r: 1.4, am: 5 + i, amDepth: 0.5, pan: (i - 1.5) * 0.5 })) },
  beamOn: { len: () => 5, wet: 0.6, fn: (s, t) => { s.boom(t, { g: 0.55, dur: 3.5, f: 50, lp: 250, click: false }); s.osc('sawtooth', t, 4, { f: 110, lp: 300, lp1: 1200, g: 0.04, a: 1.5, r: 2 }); s.osc('sine', t + 0.4, 3.5, { f: 1760, g: 0.008, a: 1.4, r: 1.8 }); } },
  riser: { len: (p) => D(p, 2) + 0.3, wet: 0.3, fn: (s, t, p) => { const d = D(p, 2); s.noise('pink', t, d, { type: 'bandpass', f: 300, f1: 4000, q: 0.9, g: 0.25, a: d * 0.95, r: 0.03, lin: true }); s.osc('sawtooth', t, d, { f: 110, f1: 440, lp: 1500, g: 0.03, a: d * 0.95, r: 0.03, lin: true }); } },
  riseSwell: { len: (p) => D(p, 2.5) + 1.5, wet: 0.5, fn: (s, t, p) => { const d = D(p, 2.5); [0, 7, 12, 15, 19].forEach((n, i) => s.osc('sawtooth', t, d + 1, { f: midiF(n - 12 + 3), lp: 400, lp1: 2400, g: 0.02, a: d * 0.8, r: 1.2, pan: (i - 2) * 0.3 })); } },
  tensionRise: { len: (p) => D(p, 3) + 0.4, wet: 0.4, fn: (s, t, p) => { const d = D(p, 3); [0, 1, 6].forEach((n, i) => s.osc('sawtooth', t, d, { f: midiF(n), f1: midiF(n + 5), lp: 600, lp1: 2000, g: 0.025, a: d * 0.9, r: 0.1, pan: (i - 1) * 0.5 })); s.noise('pink', t, d, { type: 'highpass', f: 1500, f1: 5000, g: 0.06, a: d * 0.9, r: 0.1 }); } },
  lowDrone: { len: (p) => D(p, 3) + 1, wet: 0.5, fn: (s, t, p) => { const d = D(p, 3); s.osc('sine', t, d, { f: 43.65, g: 0.15, a: d * 0.4, r: 1 }); s.osc('sawtooth', t, d, { f: 43.65, lp: 180, g: 0.05, a: d * 0.4, r: 1 }); } },
  pianoNote: { len: () => 4, wet: 0.5, fn: (s, t) => piano(s, t, midiF(12), 0.08, 3.5) },
  endTone: { len: () => 7, wet: 0.7, fn: (s, t) => { [-12, -5, 0, 3, 14].forEach((n, i) => s.osc('triangle', t, 5.5, { f: midiF(n), lp: 1400, g: 0.025, a: 1.4, r: 3, pan: (i - 2) * 0.3 })); bell(s, t + 0.2, 146.8, 0.03, 6); piano(s, t + 0.6, midiF(14), 0.04, 4); } },
  surveillanceHum: { len: (p) => D(p, 2) + 0.3, wet: 0.15, fn: (s, t, p) => { s.osc('sawtooth', t, D(p, 2), { f: 60, lp: 500, g: 0.03, a: 0.1, r: 0.2 }); s.noise('white', t, D(p, 2), { type: 'bandpass', f: 4000, q: 2, g: 0.015, a: 0.1, r: 0.2 }); } },
  humveePass: { len: () => 3.5, wet: 0.25, fn: (s, t) => { engine(s, t, 3, 62, 0.08, { f1: 52, lp: 350, a: 1.2, r: 1.4, pan0: -0.8, pan1: 0.8 }); s.noise('pink', t, 3, { type: 'bandpass', f: 900, q: 0.6, g: 0.1, a: 1.2, r: 1.4, pan: -0.8, pan1: 0.8 }); } },
  convoyRumble: { len: (p) => D(p, 3) + 0.8, wet: 0.25, fn: (s, t, p) => { const d = D(p, 3); engine(s, t, d, 55, 0.08, { lp: 300, a: 0.8, r: 0.8, am: 3 }); s.noise('pink', t, d, { type: 'bandpass', f: 700, q: 0.5, g: 0.12, a: 0.8, r: 0.8 }); } },
  tankRumble: { len: (p) => D(p, 3) + 0.8, wet: 0.25, fn: (s, t, p) => { const d = D(p, 3); engine(s, t, d, 42, 0.1, { lp: 260, a: 0.6, r: 0.8, am: 7 }); rep(Math.floor(d * 6), () => metalHit(s, t + s.R() * d, 0.008, 300 + s.R() * 400)); } },
  distantGunfire: { len: () => 3.5, wet: 0.6, fn: (s, t) => rep(3, (b) => { const t0 = t + b * 0.9 + s.R() * 0.3, n = 3 + Math.floor(s.R() * 5); rep(n, (i) => { s.noise('white', t0 + i * 0.09, 0.05, { type: 'lowpass', f: 1400, g: 0.18, a: 0.001, r: 0.045, pan: -0.5 + b * 0.5 }); s.thump(t0 + i * 0.09, { f: 100, f1: 50, dur: 0.1, g: 0.12 }); }); }) },
  gunSuppressed: { len: () => 1, wet: 0.35, fn: (s, t) => { s.noise('white', t, 0.07, { type: 'bandpass', f: 1300, q: 0.9, g: 0.35, a: 0.001, r: 0.06 }); s.thump(t, { f: 160, f1: 80, dur: 0.08, g: 0.25 }); s.click(t + 0.05, { f: 3500, q: 3, g: 0.12 }); } },
};

// fallback by name keywords so new cue names still make a sensible sound
export function recipeFor(type) {
  if (SFX[type]) return SFX[type];
  const k = type.toLowerCase();
  if (/boom|impact|hit|explo/.test(k)) return SFX.impactSoft;
  if (/jet|plane|fighter/.test(k)) return SFX.jetPass;
  if (/crowd|cheer/.test(k)) return SFX.crowdCheerBurst;
  if (/beep|blip|ping/.test(k)) return SFX.dataBlip;
  if (/click|tick/.test(k)) return SFX.tick;
  return SFX.whoosh;
}
