// Sound engine: turns the film's cue list (shot sfx, ambience beds, mood music) into audio.
// Rendering is offline (OfflineAudioContext) in fixed chunks with a pre-roll, so the export
// is deterministic; the real-time preview plays the very same rendered chunks.
import { SR, Syn, reverbIR } from './synth.js';
import { recipeFor } from './sfx.js';
import { buildBed, buildMusic } from './beds.js';
import { clamp } from '../core/util.js';

const PRE = 18;          // seconds rendered before each chunk and thrown away (tails, compressor)
const SFX_GAIN = 0.32;
const BED_GAIN = 0.85;
const MUSIC_GAIN = 0.75;

export class SoundEngine {
  constructor(film, total, script) {
    this.film = film; this.total = total; this.sampleRate = SR;
    this.events = film.sfx.map((e, i) => {
      const R = recipeFor(e.type);
      const p = e.params || {};
      const pre = R.pre ?? 0;
      return { i, t: e.t, type: e.type, p, R, pre, start: e.t - pre, end: e.t - pre + R.len(p) + pre, gain: (R.gain ?? 1) * (p.gain ?? 1), wet: R.wet ?? 0.25, buf: null };
    });
    // ambience beds: runs of consecutive shots sharing a bed name
    this.beds = [];
    this.moods = [];
    let cur = null, mood = null;
    for (const s of film.shots) {
      if (s.bed) {
        if (cur && cur.name === s.bed && Math.abs(cur.s1 - s.t0) < 0.01) cur.s1 = s.t1;
        else { cur = { name: s.bed, s0: s.t0, s1: s.t1, seed: (this.beds.length * 131 + 7) % 997 }; this.beds.push(cur); }
      } else cur = null;
      if (s.mood && (!mood || mood.name !== s.mood)) { if (mood) mood.s1 = s.t0; mood = { name: s.mood, s0: s.t0, s1: total, seed: this.moods.length * 17 + 3 }; this.moods.push(mood); }
    }
    // chapter cards: music dips so the card hit speaks
    this.cards = film.shots.filter((s) => s.name && s.name.startsWith('card ')).map((s) => [s.t0, s.t1]);
    // narration: duck music & beds under speech
    const W = script ? script.words : [];
    const sp = [];
    for (const w of W) { const a = w.s - 0.12, b = w.e + 0.25; if (sp.length && a <= sp[sp.length - 1][1] + 0.35) sp[sp.length - 1][1] = Math.max(sp[sp.length - 1][1], b); else sp.push([a, b]); }
    this.speech = sp;
    this.preview = null;
  }

  speechAt(t) {
    // 0..1 with soft edges; binary search the merged intervals
    const S = this.speech; let lo = 0, hi = S.length - 1, best = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (S[m][0] <= t + 0.3) { best = m; lo = m + 1; } else hi = m - 1; }
    let v = 0;
    for (let k = Math.max(0, best - 1); k <= Math.min(S.length - 1, best + 1); k++) { const [a, b] = S[k]; v = Math.max(v, Math.min(clamp((t - a + 0.12) / 0.12), clamp((b + 0.3 - t) / 0.3))); }
    return v;
  }
  cardAt(t) { let v = 0; for (const [a, b] of this.cards) v = Math.max(v, Math.min(clamp((t - a + 0.3) / 0.3), clamp((b + 0.6 - t) / 0.6))); return v; }

  async eventBuffer(ev) {
    if (ev.buf) return ev.buf;
    const len = Math.max(0.05, ev.end - ev.start);
    const ctx = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const out = ctx.createGain(); out.connect(ctx.destination);
    const s = new Syn(ctx, out, 1000 + ev.i * 7);
    try { ev.R.fn(s, ev.pre, ev.p); } catch (e) { console.warn('[audio] recipe failed', ev.type, e); }
    ev.buf = await ctx.startRendering();
    return ev.buf;
  }

  // render absolute window [a, b) and return an AudioBuffer of exactly that span
  async renderWindow(a, b) {
    const w0 = a - PRE, w1 = b;
    const ctx = new OfflineAudioContext(2, Math.ceil((w1 - w0) * SR), SR);
    // master chain: buses -> glue compressor -> limiter
    const master = ctx.createGain(); master.gain.value = 0.9;
    const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -20; glue.knee.value = 10; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.3;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    master.connect(glue); glue.connect(lim); lim.connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = reverbIR(); const verbOut = ctx.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut); verbOut.connect(master);
    const sfx = ctx.createGain(); sfx.gain.value = SFX_GAIN; sfx.connect(master);
    const curve = (fn) => { const n = Math.ceil((w1 - w0) * 50) + 1, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = fn(w0 + (i / (n - 1)) * (w1 - w0)); return c; };
    const bed = ctx.createGain(); bed.gain.setValueCurveAtTime(curve((t) => BED_GAIN * (1 - 0.4 * this.speechAt(t)) * (1 - 0.7 * this.cardAt(t))), 0, w1 - w0); bed.connect(master);
    const bedVerb = ctx.createGain(); bedVerb.gain.value = 0.15; bed.connect(bedVerb); bedVerb.connect(verb);
    const mus = ctx.createGain(); mus.gain.setValueCurveAtTime(curve((t) => MUSIC_GAIN * (1 - 0.38 * this.speechAt(t)) * (1 - 0.65 * this.cardAt(t))), 0, w1 - w0); mus.connect(master);
    const musVerb = ctx.createGain(); musVerb.gain.value = 0.35; mus.connect(musVerb); musVerb.connect(verb);
    // one-shots
    for (const ev of this.events) {
      if (ev.end < w0 || ev.start >= w1) continue;
      const buf = await this.eventBuffer(ev);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = ev.gain;
      src.connect(g); g.connect(sfx);
      if (ev.wet > 0) { const wg = ctx.createGain(); wg.gain.value = ev.wet; g.connect(wg); wg.connect(verb); }
      const when = ev.start - w0;
      if (when >= 0) src.start(when); else src.start(0, -when);
    }
    // beds & music
    for (const seg of this.beds) if (seg.s1 + 0.6 > w0 && seg.s0 < w1) buildBed(ctx, bed, seg, w0, w1);
    for (const seg of this.moods) if (seg.s1 + 3 > w0 && seg.s0 < w1) buildMusic(ctx, mus, seg, w0, w1);
    const full = await ctx.startRendering();
    // drop the pre-roll
    const off = Math.round(PRE * SR), n = Math.round((b - a) * SR);
    const out = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: SR });
    for (let ch = 0; ch < 2; ch++) out.getChannelData(ch).set(full.getChannelData(ch).subarray(off, off + n));
    // free event buffers that are fully in the past
    for (const ev of this.events) if (ev.buf && ev.end < a - 2) ev.buf = null;
    return out;
  }

  // export: chunk i of length chunkSec as base64 little-endian int16 interleaved stereo
  async renderChunkBase64(i, chunkSec = 30) {
    const a = i * chunkSec, b = Math.min(this.total, a + chunkSec);
    if (b <= a) return '';
    const buf = await this.renderWindow(a, b);
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
    const bytes = new Uint8Array(n * 4), dv = new DataView(bytes.buffer);
    for (let k = 0; k < n; k++) {
      dv.setInt16(k * 4, Math.max(-32768, Math.min(32767, Math.round(L[k] * 32767))), true);
      dv.setInt16(k * 4 + 2, Math.max(-32768, Math.min(32767, Math.round(R[k] * 32767))), true);
    }
    let s = '';
    for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return btoa(s);
  }

  // ---------------- real-time preview ----------------
  startPreview(T) {
    this.stopPreview();
    const ac = (this.ac ||= new AudioContext({ sampleRate: SR }));
    if (ac.state === 'suspended') ac.resume();
    const CH = 8, token = {};
    this.preview = token;
    const t0 = ac.currentTime + 0.25; // context time corresponding to film time T
    const play = async (a) => {
      if (this.preview !== token || a >= this.total) return;
      const lead = t0 + (a - T) - ac.currentTime;
      if (lead > 5) { setTimeout(() => play(a), (lead - 5) * 1000); return; }
      const b = Math.min(this.total, a + CH);
      const buf = await this.renderWindow(a, b);
      if (this.preview !== token) return;
      const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
      const when = t0 + (a - T);
      if (when < ac.currentTime) src.start(ac.currentTime, ac.currentTime - when); else src.start(when);
      token.srcs = (token.srcs || []).concat(src);
      play(b);
    };
    play(T);
  }
  stopPreview() {
    if (this.preview) { for (const s of this.preview.srcs || []) { try { s.stop(); } catch (e) { /* already stopped */ } } }
    this.preview = null;
  }
}
