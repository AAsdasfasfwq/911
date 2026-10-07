// QA helper: render specific timestamps to JPG files. Usage: node tools_snap.js out_dir w h t1 t2 ...
const puppeteer = require('puppeteer');
const { createServer } = require('./server.js');
const fs = require('fs'); const path = require('path');
(async () => {
  const [out, w, h, ...ts] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const srv = createServer(__dirname).listen(0);
  const port = srv.address().port;
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  p.on('console', (m) => { const t = m.text(); if (!/GPU stall|swiftshader|WebGL/i.test(t)) console.log('[page]', t); });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.setViewport({ width: 1920, height: 1080 });
  await p.goto(`http://localhost:${port}/index.html?render=1&w=${w}&h=${h}&mb=${process.env.MB || 1}&msaa=${process.env.MSAA || 4}`);
  await p.waitForFunction('window.__ready === true || window.__error', { timeout: 120000 });
  const err = await p.evaluate(() => window.__error); if (err) { console.log('ERROR', err); process.exit(1); }
  for (const t of ts) {
    const t0 = Date.now();
    try { await p.evaluate((ms) => window.seekTo(ms), Math.round(+t * 1000)); } catch (e) { console.log('ERROR at', t, String(e.message).slice(0, 300)); }
    const e2 = await p.evaluate(() => window.__error); if (e2) { console.log('ERROR at', t, e2); await p.evaluate(() => (window.__error = null)); }
    await p.screenshot({ path: path.join(out, `f_${(+t).toFixed(2).padStart(8, '0')}.jpg`), type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log('t=', t, (Date.now() - t0) + 'ms');
  }
  await b.close(); srv.close();
})();
