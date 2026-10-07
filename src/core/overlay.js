// 2D overlay helpers (drawn on a 1920x1080 canvas, composited inside the final shader).
import { clamp, E, hash } from './util.js';

export const W = 1920;
export const H = 1080;
export const FONTS = {
  sans: '"Inter Tight", "Helvetica Neue", Arial, sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  cond: '"Oswald", "Arial Narrow", sans-serif',
  bebas: '"Bebas Neue", "Oswald", Impact, sans-serif',
  mono: '"IBM Plex Mono", "Courier New", monospace',
  type: '"Special Elite", "Courier New", monospace',
};

export function font(g, size, weight = 700, fam = 'sans', italic = false) {
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONTS[fam] || fam}`;
}

// draw text with tracking, optional per-character reveal (p 0..1), blur-in and rise.
export function text(g, str, x, y, o = {}) {
  const size = o.size || 48;
  font(g, size, o.weight ?? 700, o.fam || 'sans', o.italic);
  g.textBaseline = o.baseline || 'alphabetic';
  const tracking = (o.tracking ?? 0) * size;
  const chars = [...str];
  const widths = chars.map((c) => g.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let cx = x;
  if (o.align === 'center') cx = x - total / 2;
  else if (o.align === 'right') cx = x - total;
  const p = o.p ?? 1;
  const n = chars.length;
  const stagger = o.stagger ?? 0.5; // fraction of time spent staggering
  g.save();
  if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.shadowBlur ?? 30; }
  for (let i = 0; i < n; i++) {
    const c = chars[i];
    const start = n > 1 ? (i / (n - 1)) * stagger : 0;
    const lp = clamp((p - start) / Math.max(0.001, 1 - stagger));
    const a = (o.alpha ?? 1) * (o.ease || E.outCubic)(lp);
    if (a > 0.003) {
      g.globalAlpha = a;
      g.fillStyle = o.color || '#fff';
      const dy = (1 - E.outCubic(lp)) * (o.rise ?? 0) * size;
      const bl = (1 - lp) * (o.blur ?? 0);
      g.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
      g.fillText(c, cx, y + dy);
    }
    cx += widths[i];
  }
  g.restore();
  g.filter = 'none';
  return total;
}

export function measure(g, str, o = {}) {
  const size = o.size || 48;
  font(g, size, o.weight ?? 700, o.fam || 'sans', o.italic);
  const tracking = (o.tracking ?? 0) * size;
  return [...str].reduce((a, c) => a + g.measureText(c).width + tracking, 0) - tracking;
}

export function rect(g, x, y, w, h, color, alpha = 1) {
  g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(x, y, w, h); g.globalAlpha = 1;
}

export function line(g, x1, y1, x2, y2, color, width = 2, alpha = 1) {
  g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1;
}

// Chapter card: pure black frame, cinematic type.
// big: "10 YEARS", small: "BEFORE THE ATTACKS"
export function chapterCard(g, lt, dur, big, small, opt = {}) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const pin = clamp(lt / 0.9);
  const pout = clamp((dur - lt) / 0.35);
  const vis = Math.min(1, pout);
  const drift = 1 + lt * 0.012;
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(drift, drift);
  const accent = opt.accent || '#d8282f';
  const y0 = opt.smallFirst ? 40 : -10;
  // big line
  text(g, big, 0, y0, { size: opt.bigSize || 150, weight: 300, tracking: 0.2, align: 'center', p: pin, blur: 22, rise: 0.25, alpha: vis, color: '#f4f1ea', stagger: 0.55 });
  // rule
  const rw = 360 * E.ioCubic(clamp((lt - 0.25) / 0.7));
  rect(g, -rw / 2, y0 + 42, rw, 2, accent, vis * 0.95);
  // small line
  const p2 = clamp((lt - 0.45) / 0.8);
  text(g, small, 0, y0 + 108, { size: opt.smallSize || 40, weight: 500, tracking: 0.42, align: 'center', p: p2, blur: 12, rise: 0.4, alpha: vis * 0.9, color: opt.smallColor || '#b9b4aa', stagger: 0.6 });
  g.restore();
  // subtle dust / film flicker
  for (let i = 0; i < 26; i++) {
    const hx = hash(i * 13 + Math.floor(lt * 12));
    const hy = hash(i * 29 + 7 + Math.floor(lt * 12));
    g.globalAlpha = 0.05 * vis * hash(i * 3 + Math.floor(lt * 24));
    g.fillStyle = '#fff';
    g.fillRect(hx * W, hy * H, 2, 2);
  }
  g.globalAlpha = 1;
}

// Corner time stamp ("8:46 AM") with live seconds, documentary style.
export function timeStamp(g, lt, dur, hh, mm, ss0 = 0, opt = {}) {
  const a = Math.min(clamp(lt / 0.4), clamp((dur - lt) / 0.3)) * (opt.alpha ?? 1);
  if (a <= 0) return;
  const secs = Math.floor(ss0 + lt * (opt.rate ?? 1));
  const m = mm + Math.floor(secs / 60), s = secs % 60;
  const x = opt.x ?? 96, y = opt.y ?? 980;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = opt.accent || '#e0262e';
  g.fillRect(x, y - 58, 6, 70);
  font(g, 64, 600, 'cond');
  g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 18;
  const str = `${hh}:${String(m).padStart(2, '0')}`;
  g.fillText(str, x + 26, y);
  const w = g.measureText(str).width;
  font(g, 30, 500, 'cond');
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillText(`:${String(s).padStart(2, '0')} ${opt.ampm || 'AM'}`, x + 34 + w, y);
  if (opt.label) { font(g, 22, 600, 'sans'); g.letterSpacing = '5px'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText(opt.label.toUpperCase(), x + 28, y - 76); g.letterSpacing = '0px'; }
  g.restore();
}

// Location tag (bottom-left, small caps), e.g. "CRAWFORD, TEXAS"
export function locTag(g, lt, dur, str, opt = {}) {
  const a = Math.min(clamp(lt / 0.5), clamp((dur - lt) / 0.3)) * (opt.alpha ?? 1);
  if (a <= 0) return;
  const x = opt.x ?? 96, y = opt.y ?? 990;
  g.save();
  g.globalAlpha = a;
  g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 16;
  const w = text(g, str.toUpperCase(), x + 22, y, { size: opt.size || 30, weight: 600, tracking: 0.28, p: clamp(lt / 0.7), blur: 8, color: '#fff', stagger: 0.5 });
  g.shadowBlur = 0;
  g.fillStyle = opt.accent || '#e0262e';
  g.fillRect(x, y - 24, 6, 28);
  g.restore();
  return w;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
