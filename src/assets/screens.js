// Draw functions for live screens (CRT monitors, TVs, radar scopes...). Signature:
// (g, w, h, t, ...args). Used with textures.Screen.
import { hash, clamp, lerp, E, pad2 } from '../core/util.js';

const F = (g, size, weight = 400, fam = '"IBM Plex Mono", monospace') => { g.font = `${weight} ${size}px ${fam}`; };
const SANS = '"Inter Tight", Arial, sans-serif';

function crtGlow(g, w, h) {
  const gr = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
}

// Windows-95 style desktop with a Netscape-like browser
export function browser95(g, w, h, t, o = {}) {
  g.fillStyle = '#008080'; g.fillRect(0, 0, w, h);
  const bx = w * 0.06, by = h * 0.06, bw = w * 0.88, bh = h * 0.8;
  g.fillStyle = '#c0c0c0'; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#000080'; g.fillRect(bx + 3, by + 3, bw - 6, h * 0.05);
  F(g, h * 0.035, 600, SANS); g.fillStyle = '#fff'; g.fillText(o.title || 'Netscape - [Welcome to the World Wide Web]', bx + 8, by + h * 0.04);
  g.fillStyle = '#fff'; g.fillRect(bx + 6, by + h * 0.13, bw - 12, h * 0.05);
  F(g, h * 0.03); g.fillStyle = '#000'; g.fillText(o.url || 'http://www.millennium2000.com/', bx + 10, by + h * 0.165);
  g.fillStyle = '#fff'; g.fillRect(bx + 6, by + h * 0.2, bw - 12, bh - h * 0.23);
  const cx = bx + 12, cy = by + h * 0.24;
  if (o.page === 'dotcom') {
    g.fillStyle = ['#ff6a00', '#2a6ad0', '#6a2ad0', '#0a9a4a'][(o.seed ?? 0) % 4]; g.fillRect(cx, cy, bw - 24, h * 0.12);
    F(g, h * 0.07, 800, SANS); g.fillStyle = '#fff'; g.fillText(o.brand || 'pets.com', cx + 10, cy + h * 0.09);
    F(g, h * 0.035, 400, SANS); g.fillStyle = '#333';
    ['Shop online - FREE shipping!', 'Stock quote: ▲ +312%', 'Sign up today', 'Best of the Web 1999'].forEach((s, i) => g.fillText(s, cx + 6, cy + h * (0.2 + i * 0.07)));
    g.fillStyle = '#ffd400'; g.fillRect(bx + bw * 0.62, cy + h * 0.16, bw * 0.3, h * 0.2); g.fillStyle = '#c00'; F(g, h * 0.05, 800, SANS); g.fillText('NEW!', bx + bw * 0.66, cy + h * 0.29);
  } else {
    F(g, h * 0.06, 800, SANS); g.fillStyle = '#1a1a8a'; g.fillText('Welcome to the Internet!', cx + 6, cy + h * 0.07);
    F(g, h * 0.033, 400, SANS); g.fillStyle = '#0000ee';
    ['> Search the Web', '> News', '> Email', '> Stocks', '> Chat rooms'].forEach((s, i) => g.fillText(s, cx + 12, cy + h * (0.16 + i * 0.06)));
    g.fillStyle = '#333'; g.fillText('Connected at 56,000 bps', cx + 6, by + bh - h * 0.06);
  }
  g.fillStyle = '#c0c0c0'; g.fillRect(0, h - h * 0.07, w, h * 0.07); g.fillStyle = '#008000'; g.fillRect(4, h - h * 0.06, w * 0.12, h * 0.05);
  F(g, h * 0.03, 700, SANS); g.fillStyle = '#fff'; g.fillText('Start', 10, h - h * 0.025);
  crtGlow(g, w, h);
}

// stock chart rocketing up (NASDAQ/DOW style)
export function brokerage(g, w, h, t, o = {}) {
  g.fillStyle = '#05080e'; g.fillRect(0, 0, w, h);
  F(g, h * 0.06, 700); g.fillStyle = '#9ad0ff'; g.fillText(o.label || 'NASDAQ COMPOSITE', w * 0.05, h * 0.1);
  const p = clamp(t / (o.d ?? 2.5));
  const pts = o.pts || [10, 12, 11, 14, 16, 15, 19, 23, 22, 28, 35, 33, 44, 52, 58, 70, 86, 100];
  const n = pts.length, last = p * (n - 1);
  g.strokeStyle = 'rgba(120,160,200,0.15)';
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(w * 0.05, h * (0.2 + k * 0.13)); g.lineTo(w * 0.95, h * (0.2 + k * 0.13)); g.stroke(); }
  g.strokeStyle = '#3aff7a'; g.lineWidth = h * 0.012; g.beginPath();
  for (let i = 0; i <= Math.floor(last); i++) { const x = w * 0.05 + (i / (n - 1)) * w * 0.9, y = h * 0.86 - (pts[i] / 100) * h * 0.66; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  F(g, h * 0.09, 700); g.fillStyle = '#3aff7a'; g.fillText(`${Math.round(lerp(o.v0 ?? 1200, o.v1 ?? 5048, p)).toLocaleString('en-US')} ▲`, w * 0.55, h * 0.1 + h * 0.08);
  crtGlow(g, w, h);
}

// Y2K midnight rollover
export function y2k(g, w, h, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const after = t > 1.2;
  F(g, h * 0.07, 600); g.fillStyle = '#c8c8c8'; g.fillText('C:\\> date', w * 0.06, h * 0.15);
  F(g, h * 0.14, 700); g.fillStyle = after ? '#3aff7a' : '#ffffff';
  g.fillText(after ? '01/01/2000' : '12/31/1999', w * 0.06, h * 0.42);
  const s = after ? Math.floor(t - 1.2) : 59 - Math.max(0, Math.floor(1.2 - t)) ;
  g.fillText(after ? `00:00:${pad2(Math.min(59, s))}` : `23:59:${pad2(Math.min(59, s))}`, w * 0.06, h * 0.62);
  F(g, h * 0.07, 600); g.fillStyle = after ? '#3aff7a' : '#888';
  if (after) g.fillText('SYSTEM OK  -  Y2K COMPLIANT', w * 0.06, h * 0.82);
  if (Math.floor(t * 3) % 2) g.fillRect(w * 0.06, h * 0.88, w * 0.03, h * 0.05);
  crtGlow(g, w, h);
}

// airline booking site (generic)
export function booking(g, w, h, t, o = {}) {
  g.fillStyle = '#e8ecf2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#123a7a'; g.fillRect(0, 0, w, h * 0.13);
  F(g, h * 0.06, 800, SANS); g.fillStyle = '#fff'; g.fillText('BOOK YOUR FLIGHT ONLINE', w * 0.04, h * 0.09);
  F(g, h * 0.04, 600, SANS); g.fillStyle = '#123';
  const rows = [['FROM', 'BOSTON (BOS)'], ['TO', 'LOS ANGELES (LAX)'], ['DATE', 'TUE 11 SEP 2001'], ['TRIP', 'ONE WAY'], ['CLASS', 'BUSINESS']];
  const p = clamp(t / 2.2);
  rows.forEach(([k, v], i) => {
    const y = h * (0.24 + i * 0.12);
    g.fillStyle = '#556'; g.fillText(k, w * 0.05, y);
    g.fillStyle = '#fff'; g.fillRect(w * 0.25, y - h * 0.05, w * 0.6, h * 0.07);
    g.fillStyle = i === 3 ? '#b01018' : '#111';
    const n = Math.floor(v.length * clamp(p * rows.length - i));
    g.fillText(v.slice(0, n), w * 0.27, y);
  });
  g.fillStyle = p > 0.95 ? '#1f8a4c' : '#888'; g.fillRect(w * 0.6, h * 0.84, w * 0.3, h * 0.1);
  F(g, h * 0.045, 800, SANS); g.fillStyle = '#fff'; g.fillText(p > 0.95 ? 'CONFIRMED' : 'PURCHASE', w * 0.63, h * 0.91);
  crtGlow(g, w, h);
}

// ATC radar scope. o.blips: [{x,y,label,lost}]
export function radar(g, w, h, t, o = {}) {
  g.fillStyle = '#020a05'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
  g.strokeStyle = 'rgba(80,255,140,0.25)'; g.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(cx, cy, (R * k) / 4, 0, Math.PI * 2); g.stroke(); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  // coast lines (stylised)
  g.strokeStyle = 'rgba(80,255,140,0.35)'; g.beginPath(); g.moveTo(cx - R * 0.9, cy + R * 0.2); g.bezierCurveTo(cx - R * 0.3, cy + R * 0.1, cx + R * 0.1, cy + R * 0.5, cx + R * 0.6, cy + R * 0.75); g.stroke();
  const sweep = (t * 1.6) % (Math.PI * 2);
  const gr = g.createConicGradient ? g.createConicGradient(sweep - 1.2, cx, cy) : null;
  if (gr) { gr.addColorStop(0, 'rgba(60,255,120,0)'); gr.addColorStop(0.18, 'rgba(60,255,120,0.35)'); gr.addColorStop(0.19, 'rgba(60,255,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); }
  const blips = o.blips || [];
  F(g, h * 0.032, 600);
  for (const b of blips) {
    const x = cx + b.x * R, y = cy + b.y * R;
    const a = (Math.atan2(y - cy, x - cx) + Math.PI * 2) % (Math.PI * 2);
    const since = ((sweep - a) + Math.PI * 2) % (Math.PI * 2);
    const glow = 0.35 + 0.65 * Math.exp(-since * 1.5);
    g.fillStyle = b.alert ? `rgba(255,70,50,${glow})` : `rgba(120,255,160,${glow})`;
    g.fillRect(x - 4, y - 4, 8, 8);
    if (b.trail) { for (let k = 1; k < 5; k++) { g.globalAlpha = 0.5 / k; g.fillRect(x - b.trail[0] * k * 10 - 2, y - b.trail[1] * k * 10 - 2, 4, 4); } g.globalAlpha = 1; }
    if (!b.lost) { g.fillStyle = b.alert ? '#ff5a3a' : '#9affc0'; g.fillText(b.label || '', x + 10, y - 8); if (b.alt) g.fillText(b.alt, x + 10, y + 16); }
    else { g.fillStyle = Math.floor(t * 4) % 2 ? '#ff3a2a' : 'rgba(255,58,42,0.3)'; g.fillText('?? ' + (b.label || ''), x + 10, y - 8); }
  }
  crtGlow(g, w, h);
}

// flight sim outside view + HUD
export function simView(g, w, h, t, o = {}) {
  const roll = o.roll ?? Math.sin(t * 0.6) * 0.35, pitch = o.pitch ?? 0;
  g.save(); g.translate(w / 2, h / 2 + pitch * h); g.rotate(roll);
  const sky = g.createLinearGradient(0, -h, 0, 0); sky.addColorStop(0, '#2a5ab0'); sky.addColorStop(1, '#9ac8f0');
  g.fillStyle = sky; g.fillRect(-w * 1.5, -h * 1.5, w * 3, h * 1.5);
  const gnd = g.createLinearGradient(0, 0, 0, h); gnd.addColorStop(0, '#6a8a5a'); gnd.addColorStop(1, '#3a5a2a');
  g.fillStyle = gnd; g.fillRect(-w * 1.5, 0, w * 3, h * 1.5);
  g.strokeStyle = 'rgba(255,255,255,0.15)'; for (let i = -10; i < 10; i++) { g.beginPath(); g.moveTo(i * 60, 0); g.lineTo(i * 260, h); g.stroke(); }
  g.restore();
  g.strokeStyle = '#4aff8a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.4, h / 2); g.lineTo(w * 0.47, h / 2); g.moveTo(w * 0.53, h / 2); g.lineTo(w * 0.6, h / 2); g.stroke();
  F(g, h * 0.045, 600); g.fillStyle = '#4aff8a';
  g.fillText(`ALT ${Math.round(o.alt ?? 31000 + Math.sin(t) * 40)}`, w * 0.04, h * 0.1); g.fillText(`SPD ${o.spd ?? 480} KT`, w * 0.04, h * 0.17); g.fillText(`HDG ${String(o.hdg ?? Math.round(240 + t * 6) % 360).padStart(3, '0')}`, w * 0.8, h * 0.1);
}

// x-ray baggage screen with a box cutter silhouette
export function xray(g, w, h, t, o = {}) {
  g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
  const off = (o.scroll ?? t * 0.25) % 1.4;
  g.save(); g.translate(w * (1.1 - off), 0);
  const bag = (x, y, bw, bh) => { g.fillStyle = 'rgba(255,170,60,0.45)'; g.fillRect(x, y, bw, bh); g.strokeStyle = 'rgba(80,140,255,0.9)'; g.lineWidth = 6; g.strokeRect(x, y, bw, bh); };
  bag(-w * 0.15, h * 0.2, w * 0.5, h * 0.6);
  g.fillStyle = 'rgba(80,200,120,0.7)'; g.fillRect(-w * 0.1, h * 0.3, w * 0.18, h * 0.12); g.fillRect(w * 0.05, h * 0.5, w * 0.12, h * 0.2);
  g.fillStyle = 'rgba(255,140,40,0.8)'; g.beginPath(); g.ellipse(w * 0.1, h * 0.35, w * 0.06, h * 0.05, 0.4, 0, Math.PI * 2); g.fill();
  // box cutter: dark blue (metal) blade + handle
  g.save(); g.translate(w * 0.0, h * 0.62); g.rotate(-0.35);
  g.fillStyle = 'rgba(30,60,220,0.95)'; g.fillRect(0, 0, w * 0.16, h * 0.045);
  g.beginPath(); g.moveTo(w * 0.16, 0); g.lineTo(w * 0.22, h * 0.012); g.lineTo(w * 0.16, h * 0.045); g.fill();
  g.restore();
  g.restore();
  F(g, h * 0.05, 600); g.fillStyle = '#c8d0ff'; g.fillText('LANE 3   07:48', w * 0.04, h * 0.08);
  if (o.ok) { g.fillStyle = '#3aff7a'; g.fillText('CLEAR', w * 0.8, h * 0.08); }
}

// audio waveform / intercept station
export function waveform(g, w, h, t, o = {}) {
  g.fillStyle = '#04070a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,200,255,0.12)';
  for (let x = 0; x < w; x += w / 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let ch = 0; ch < 2; ch++) {
    const cy = h * (0.32 + ch * 0.36);
    g.strokeStyle = ch ? '#ffb030' : '#4ad0ff'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < w; x += 2) {
      const tt = t * 2 + x / w * 6;
      const env = Math.max(0, Math.sin(tt * 1.7 + ch) * 0.6 + Math.sin(tt * 0.6) * 0.5);
      const v = (hash(Math.floor(x + t * 300) + ch * 999) - 0.5) * env * h * 0.28;
      x ? g.lineTo(x, cy + v) : g.moveTo(x, cy + v);
    }
    g.stroke();
  }
  F(g, h * 0.045, 600); g.fillStyle = '#ff4a3a';
  if (Math.floor(t * 2) % 2) g.fillText('● REC', w * 0.04, h * 0.08);
  g.fillStyle = '#9ad8ff'; g.fillText(o.label || 'INTERCEPT  CH-07  31.415 MHz', w * 0.25, h * 0.08);
}

// transcript typed out
export function transcript(g, w, h, t, o = {}) {
  g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, w, h);
  F(g, h * 0.05, 600, '"Special Elite", monospace'); g.fillStyle = '#7a1418'; g.fillText('TRANSCRIPT  //  SECRET', w * 0.05, h * 0.1);
  const lines = o.lines || ['[A] ...the big wedding is coming...', '[B] when?', '[A] soon. there will be a celebration.', '[B] ...understood...'];
  F(g, h * 0.05, 400, '"Special Elite", monospace');
  let chars = Math.floor(t * 18);
  lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, chars)); chars -= l.length; g.fillStyle = l.includes('wedding') || l.includes('celebration') ? '#b01018' : '#222'; g.fillText(s, w * 0.05, h * (0.24 + i * 0.13)); });
}

// CIA ops wall: world map with red alerts
export function opsWall(g, w, h, t, o = {}) {
  g.fillStyle = '#060a12'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,150,255,0.18)';
  for (let x = 0; x < w; x += w / 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += h / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // stylised continents as dot clouds
  g.fillStyle = 'rgba(120,170,255,0.5)';
  for (let i = 0; i < 900; i++) { const x = hash(i * 3) * w, y = hash(i * 7) * h; const lat = 90 - (y / h) * 180, lon = (x / w) * 360 - 180; const land = (lon > -125 && lon < -65 && lat > 25 && lat < 50) || (lon > -10 && lon < 60 && lat > 0 && lat < 60) || (lon > 60 && lon < 140 && lat > 10 && lat < 55) || (lon > -80 && lon < -35 && lat > -50 && lat < 10) || (lon > 10 && lon < 50 && lat > -35 && lat < 0); if (land) g.fillRect(x, y, 3, 3); }
  const alerts = o.alerts || [[0.69, 0.36], [0.6, 0.4], [0.62, 0.46], [0.56, 0.52], [0.27, 0.3], [0.66, 0.38]];
  alerts.forEach(([ax, ay], i) => {
    const ph = (t * 1.3 + i * 0.37) % 1;
    g.strokeStyle = `rgba(255,50,40,${1 - ph})`; g.lineWidth = 3; g.beginPath(); g.arc(ax * w, ay * h, 6 + ph * 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(ax * w, ay * h, 6, 0, Math.PI * 2); g.fill();
  });
  F(g, h * 0.05, 700, SANS); g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3a2a' : '#7a1a12'; g.fillText('THREAT LEVEL: CRITICAL', w * 0.03, h * 0.08);
  F(g, h * 0.03, 400); g.fillStyle = '#9ab8ff'; for (let i = 0; i < 6; i++) g.fillText(`RPT-${2001}-${(i * 37 + 113) % 1000}  UBL / AQ  ${['HIGH', 'HIGH', 'SEVERE', 'HIGH', 'SEVERE', 'HIGH'][i]}`, w * 0.03, h * (0.82 + i * 0.03));
}

// TV news: inset footage texture is composited separately; this draws the chyron/graphics layer
export function newsChyron(g, w, h, t, o = {}) {
  g.clearRect(0, 0, w, h);
  const red = o.red ?? '#b01018';
  g.fillStyle = red; g.fillRect(0, h * 0.74, w, h * 0.1);
  F(g, h * 0.06, 800, SANS); g.fillStyle = '#fff'; g.fillText(o.title || 'BREAKING NEWS', w * 0.04, h * 0.815);
  g.fillStyle = 'rgba(10,20,40,0.85)'; g.fillRect(0, h * 0.84, w, h * 0.08);
  F(g, h * 0.045, 600, SANS); g.fillStyle = '#fff';
  const sub = o.sub || 'PLANE CRASHES INTO WORLD TRADE CENTER  •  NEW YORK  •  LIVE';
  const x = w - ((t * w * 0.18) % (w + g.measureText(sub).width + 200));
  g.fillText(sub, x, h * 0.895);
  g.fillStyle = '#fff'; g.fillRect(w * 0.84, h * 0.06, w * 0.12, h * 0.07); F(g, h * 0.045, 800, SANS); g.fillStyle = red; g.fillText('LIVE', w * 0.865, h * 0.115);
  if (o.time) { F(g, h * 0.04, 700, SANS); g.fillStyle = '#fff'; g.fillText(o.time, w * 0.04, h * 0.12); }
}

// digital alarm clock digits
export function alarm(g, w, h, t, o = {}) {
  g.fillStyle = '#080404'; g.fillRect(0, 0, w, h);
  F(g, h * 0.72, 700, '"Oswald", sans-serif'); g.fillStyle = '#ff2a1a'; g.textAlign = 'center';
  g.shadowColor = '#ff2a1a'; g.shadowBlur = h * 0.15;
  g.fillText(o.text || '6:30', w / 2, h * 0.78); g.shadowBlur = 0; g.textAlign = 'left';
  F(g, h * 0.14, 600, SANS); g.fillStyle = '#ff2a1a'; g.fillText('AM', w * 0.86, h * 0.3);
  if (o.alarmOn !== false) { g.beginPath(); g.arc(w * 0.06, h * 0.2, h * 0.05, 0, Math.PI * 2); g.fill(); }
}

// ATM screen
export function atm(g, w, h, t) {
  g.fillStyle = '#0a2a5a'; g.fillRect(0, 0, w, h);
  F(g, h * 0.08, 700, SANS); g.fillStyle = '#fff'; g.fillText('PLEASE TAKE YOUR CASH', w * 0.06, h * 0.2);
  F(g, h * 0.06, 500, SANS); g.fillStyle = '#9ad0ff'; g.fillText('WITHDRAWAL   $ 200.00', w * 0.06, h * 0.4); g.fillText('09/10/2001   21:41', w * 0.06, h * 0.52);
  g.fillStyle = '#ffd400'; g.fillRect(w * 0.6, h * 0.7, w * 0.34, h * 0.14); F(g, h * 0.06, 700, SANS); g.fillStyle = '#0a2a5a'; g.fillText('DONE', w * 0.7, h * 0.8);
  crtGlow(g, w, h);
}

// fighter HUD (overlay-like green symbology)
export function fighterHUD(g, w, h, t) {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#6aff9a'; g.fillStyle = '#6aff9a'; g.lineWidth = 3;
  const cx = w / 2, cy = h / 2;
  g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.moveTo(cx - 60, cy); g.lineTo(cx - 20, cy); g.moveTo(cx + 20, cy); g.lineTo(cx + 60, cy); g.stroke();
  for (let k = -3; k <= 3; k++) { if (!k) continue; const y = cy + k * 70 + (t * 8 % 70); g.beginPath(); g.moveTo(cx - 140, y); g.lineTo(cx - 60, y); g.moveTo(cx + 60, y); g.lineTo(cx + 140, y); g.stroke(); }
  F(g, 26, 600); g.fillText('450', cx - 300, cy); g.fillText('29000', cx + 230, cy); g.fillText(`HDG ${String(Math.round(40 + t * 2) % 360).padStart(3, '0')}`, cx - 60, 60);
  g.fillText('ARM', 80, h - 80); g.fillText('NOE', w - 160, h - 80);
}
