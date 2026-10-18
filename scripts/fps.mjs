// B11 fps check: mobile emulation (390x844 dpr3, touch) + CDP 4x CPU throttle, page-level rAF average over 5s.
// node scripts/fps.mjs [--headed]   (headed = real GPU compositor; default headless with GPU flags)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { startServer } from './dev.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const headed = process.argv.includes('--headed');
const { server, url: U } = await startServer(0);
const browser = await chromium.launch(headed ? { headless: false, channel: 'chrome' } : { args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(U + '/ko/play/gate-rush/?seed=fps', { waitUntil: 'networkidle' });
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.click('.gmodal .btn');
await p.waitForTimeout(3500); // let adaptive quality settle (2s window)
const r = await p.evaluate(() => new Promise((res) => {
  const ts = []; const t0 = performance.now();
  const f = (t) => {
    ts.push(t);
    if (t - t0 < 5000) return requestAnimationFrame(f);
    const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
    res({ frames: ts.length, avgFps: (ts.length - 1) / ((ts.at(-1) - ts[0]) / 1000), p95FrameMs: d[Math.floor(d.length * 0.95)], gameFps: window.__gameFps || 0, lowFx: !!window.__gameLowFx });
  };
  requestAnimationFrame(f);
}));
const gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
const out = { date: new Date().toISOString(), mode: headed ? 'headed' : 'headless', throttle: '4x CPU', viewport: '390x844@3x', gpu, ...r, pass: r.avgFps >= 50 };
console.log(JSON.stringify(out, null, 2));
writeFileSync(ROOT + `reboot-evidence/fps-${out.mode}.json`, JSON.stringify(out, null, 2));
await browser.close(); server.close();
process.exit(out.pass ? 0 : 1);
