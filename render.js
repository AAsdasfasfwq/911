#!/usr/bin/env node
// Frame-exact export: drives index.html in headless Chrome via Puppeteer, captures every
// frame at 30 fps, encodes 10-second segments with ffmpeg (resumable), renders the Web Audio
// sound design offline, and muxes it with the voiceover into a YouTube-ready 16:9 MP4.
//
//   node render.js                         full video -> out/911.mp4 (1920x1080, 30 fps)
//   node render.js --from 120 --to 180     render only a range (seconds) -> out/911_120-180.mp4
//   node render.js --workers 2             two browser pages in parallel (fast GPUs / many cores)
//   node render.js --swiftshader           software GL (servers without a GPU; slow)
//   node render.js --preview               960x540, no motion blur: quick check of the whole film
//
// Requirements: Node 18+, `npm install`, ffmpeg on PATH (or FFMPEG=/path/to/ffmpeg).
// Optional: CHROME_PATH=/path/to/chrome to use an installed Chrome instead of Puppeteer's.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const { createServer } = require('./server.js');

const FPS = 30;
const SEG = 300; // frames per segment (10 s)

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const PREVIEW = flag('preview');
const W = +opt('w', PREVIEW ? 960 : 1920), H = +opt('h', PREVIEW ? 540 : 1080);
const MB = +opt('mb', PREVIEW ? 1 : 2);          // motion-blur subframes per frame
const MSAA = +opt('msaa', 4);
const WORKERS = Math.max(1, +opt('workers', 1));
const QUALITY = +opt('quality', 95);            // JPEG quality of captured frames
const CRF = +opt('crf', PREVIEW ? 23 : 16);
const OUTDIR = path.resolve(opt('outdir', 'out'));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SFX_VOL = +opt('sfx', 0.5);               // sound design level under the narration
const LUFS = +opt('lufs', -16);                 // final loudness target (YouTube-friendly)
const VOICE_VOL = +opt('voice', 1.0);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fmtT = (s) => `${Math.floor(s / 3600)}h${String(Math.floor(s / 60) % 60).padStart(2, '0')}m${String(Math.floor(s) % 60).padStart(2, '0')}s`;

function run(cmd, args, o = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: o.stdin ? ['pipe', 'ignore', 'pipe'] : ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    p.on('error', rej);
    p.on('close', (code) => (code === 0 ? res(err) : rej(new Error(`${cmd} exited ${code}\n${err.slice(-3000)}`))));
    if (o.stdin) o.stdin(p);
  });
}

async function launch() {
  const args = ['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--hide-scrollbars', '--mute-audio'];
  if (flag('swiftshader')) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  if (process.platform === 'linux') args.push('--no-sandbox');
  return puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args, protocolTimeout: 0, defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
}

async function openPage(browser, port, label) {
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (/error|warn/i.test(m.type()) && !/GPU stall|swiftshader|WebGL|getImageData|willReadFrequently/i.test(t)) log(`[${label}]`, t.slice(0, 300)); });
  page.on('pageerror', (e) => log(`[${label}] page error:`, e.message));
  await page.goto(`http://localhost:${port}/index.html?render=1&w=${W}&h=${H}&mb=${MB}&msaa=${MSAA}`, { waitUntil: 'load', timeout: 0 });
  await page.waitForFunction('window.__ready === true || window.__error', { timeout: 0 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('page failed to boot:\n' + err);
  const renderer = await page.evaluate(() => { const c = document.querySelector('canvas'); const gl = c && c.getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  return { page, cdp: await page.createCDPSession(), renderer };
}

// ---------- audio ----------
async function renderAudio(page, total, file) {
  const info = await page.evaluate(() => window.__audioInfo());
  const CH = 30, n = Math.ceil(total / CH);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const b64 = await page.evaluate((i, CH) => window.__renderAudioChunk(i, CH), i, CH);
    parts.push(Buffer.from(b64, 'base64'));
    process.stdout.write(`\r  audio ${i + 1}/${n}`);
  }
  process.stdout.write('\n');
  const data = Buffer.concat(parts), sr = info.sampleRate;
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([hdr, data]));
}

// ---------- video segment ----------
async function renderSegment(w, seg, f0, f1, file, stats) {
  const tmp = file + '.part.mp4';
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', PREVIEW ? 'veryfast' : 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-r', String(FPS), '-movflags', '+faststart', tmp], {
    stdin: async (p) => {
      p.stdin.on('error', () => {});
      try {
        for (let f = f0; f < f1; f++) {
          await w.page.evaluate((ms) => window.seekTo(ms), (f * 1000) / FPS);
          const err = await w.page.evaluate(() => window.__error);
          if (err) throw new Error(`frame ${f}: ${err}`);
          const { data } = await w.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: QUALITY, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: W / 1920 }, captureBeyondViewport: false, optimizeForSpeed: true });
          const buf = Buffer.from(data, 'base64');
          if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r));
          stats.done++;
        }
      } catch (e) { stats.error = e; }
      p.stdin.end();
    },
  });
  if (stats.error) throw stats.error;
  fs.renameSync(tmp, file);
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const srv = createServer(__dirname).listen(0);
  const port = srv.address().port;
  const browser = await launch();
  const first = await openPage(browser, port, 'w0');
  const total = (await first.page.evaluate(() => window.totalDuration)) / 1000;
  log(`film ${total.toFixed(2)} s, ${W}x${H} @${FPS} fps, motion blur x${MB}, GPU: ${first.renderer}`);
  const from = Math.max(0, +opt('from', 0)), to = Math.min(total, +opt('to', total));
  const F0 = Math.floor(from * FPS), F1 = Math.ceil(to * FPS);
  const tag = from > 0 || to < total ? `_${Math.round(from)}-${Math.round(to)}` : '';
  const segDir = path.join(OUTDIR, `segments_${W}x${H}_mb${MB}`);
  fs.mkdirSync(segDir, { recursive: true });

  // 1) sound design (deterministic, cached)
  const sfxWav = path.join(OUTDIR, 'sfx.wav');
  if (!flag('no-audio') && (!fs.existsSync(sfxWav) || flag('redo-audio'))) {
    log('rendering sound design (Web Audio, offline)...');
    await renderAudio(first.page, total, sfxWav);
  }

  // 2) video segments, resumable: finished segments are skipped
  const segs = [];
  for (let s = Math.floor(F0 / SEG); s * SEG < F1; s++) segs.push(s);
  const todo = segs.filter((s) => !fs.existsSync(path.join(segDir, `seg_${String(s).padStart(5, '0')}.mp4`)));
  log(`${segs.length} segments in range, ${segs.length - todo.length} already done`);
  const workers = [first];
  for (let i = 1; i < Math.min(WORKERS, todo.length); i++) workers.push(await openPage(browser, port, 'w' + i));
  const stats = { done: 0, t0: Date.now() };
  const totalFrames = todo.length * SEG;
  const timer = setInterval(() => {
    const el = (Date.now() - stats.t0) / 1000, fps = stats.done / Math.max(1, el);
    process.stdout.write(`\r  frames ${stats.done}/${totalFrames}  ${fps.toFixed(2)} fps  elapsed ${fmtT(el)}  eta ${fmtT((totalFrames - stats.done) / Math.max(0.01, fps))}   `);
  }, 2000);
  const queue = todo.slice();
  await Promise.all(workers.map(async (w) => {
    while (queue.length) {
      const s = queue.shift();
      const file = path.join(segDir, `seg_${String(s).padStart(5, '0')}.mp4`);
      await renderSegment(w, s, s * SEG, Math.min((s + 1) * SEG, Math.ceil(total * FPS)), file, stats);
    }
  }));
  clearInterval(timer);
  process.stdout.write('\n');
  await browser.close();
  srv.close();

  // 3) concat + mux narration and sound design
  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${path.join(segDir, `seg_${String(s).padStart(5, '0')}.mp4`).replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(OUTDIR, `video${tag}.mp4`);
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const out = path.resolve(opt('out', path.join(OUTDIR, `911${tag}.mp4`)));
  const off = (F0 - Math.floor(F0 / SEG) * SEG) / FPS, dur = (F1 - F0) / FPS, start = Math.floor(F0 / SEG) * SEG / FPS;
  const voice = path.join(__dirname, 'assets', 'voiceover.mp3');
  const mix = path.join(OUTDIR, `mix${tag}.wav`);
  const aStart = (start + off).toFixed(3);
  // a) narration + sound design -> one stereo track
  const useSfx = fs.existsSync(sfxWav) && !flag('no-audio');
  const mixArgs = ['-y', '-loglevel', 'error', '-ss', aStart, '-t', dur.toFixed(3), '-i', voice];
  if (useSfx) mixArgs.push('-ss', aStart, '-t', dur.toFixed(3), '-i', sfxWav);
  const mixFilter = useSfx
    ? `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${VOICE_VOL}[v];[1:a]volume=${SFX_VOL}[s];[v][s]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur=${dur.toFixed(3)}[a]`
    : `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${VOICE_VOL},apad=whole_dur=${dur.toFixed(3)}[a]`;
  await run(FFMPEG, [...mixArgs, '-filter_complex', mixFilter, '-map', '[a]', '-t', dur.toFixed(3), '-c:a', 'pcm_s16le', '-ar', '48000', mix]);
  // b) two-pass loudness normalisation (linear, no pumping)
  const ln = `loudnorm=I=${LUFS}:TP=-1.5:LRA=11`;
  const meas = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', mix, '-af', ln + ':print_format=json', '-f', 'null', '-']);
  const js = JSON.parse(meas.slice(meas.lastIndexOf('{'), meas.lastIndexOf('}') + 1));
  const lin = `${ln}:measured_I=${js.input_i}:measured_TP=${js.input_tp}:measured_LRA=${js.input_lra}:measured_thresh=${js.input_thresh}:offset=${js.target_offset}:linear=true`;
  // c) final mux
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', off.toFixed(3), '-t', dur.toFixed(3), '-i', video, '-i', mix, '-map', '0:v', '-map', '1:a', '-af', lin + ',aresample=48000',
    '-t', dur.toFixed(3), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out]);
  log('done ->', out);
})().catch((e) => { console.error('\nRENDER FAILED:', e && e.stack || e); process.exit(1); });
