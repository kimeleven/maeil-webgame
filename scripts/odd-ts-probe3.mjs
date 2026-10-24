// t_6b058523 probe 3: reproduce the original R1 first-tap flow (touch start → wait first grid → immediate tap) in fresh
// contexts; record pointer lag, long tasks and AudioContext construction cost relative to the game clock. Evidence only.
import { chromium } from 'playwright'; import { writeFileSync } from 'node:fs';
const EV = process.env.OT_EV; let U = process.argv[2]; if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5196); U = 'http://localhost:5196'; }
const out = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const headless of [true, false]) { const b = await chromium.launch({ headless, channel: "chrome" });
  for (let i = 0; i < 5; i++) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
    await p.addInitScript(() => { window.__lt = []; window.__pd = []; new PerformanceObserver((l) => { for (const x of l.getEntries()) __lt.push([Math.round(x.startTime), Math.round(x.duration)]); }).observe({ type: 'longtask' });
      const A = window.AudioContext; if (A) window.AudioContext = function (...a) { const t = performance.now(); const c = new A(...a); window.__ac = [Math.round(t), Math.round(performance.now() - t)]; return c; };
      addEventListener('pointerdown', (e) => __pd.push([Math.round(e.timeStamp), Math.round(performance.now())]), true); });
    await p.goto(U + '/ko/play/odd-tile/?seed=check'); await p.waitForFunction(() => window.__ot && __ot.ready);
    await p.waitForFunction(() => __ot.acState && __ot.acState !== 'none', null, { timeout: 8000 });
    const pre = await p.evaluate(() => __ot.acState); const s = await p.locator('#b-start').boundingBox(); await p.touchscreen.tap(s.x + s.width / 2, s.y + s.height / 2);
    await p.waitForFunction(() => document.querySelectorAll('#grid .cell').length === 4, null, { polling: 'raf' });
    const c = await p.evaluate(() => { const r = document.querySelectorAll('#grid .cell')[3].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.touchscreen.tap(c[0], c[1]); await sleep(400);
    const r = await p.evaluate(() => ({ lt: __lt, ac: window.__ac, pd: __pd, t0perf: Math.round(performance.now() - __ot.activeNow()), ins: __ot.W.ev.filter((e) => e.k === 'in'), log: __ot.game.S.log.map((e) => e.kind), late: __ot.game.S.lateLog, acState: __ot.acState }));
    r.mode = headless ? 'headless' : 'headed'; r.pre = pre; out.push(r); console.log(r.mode, 'pre', pre, 'ac', JSON.stringify(r.ac), 'state', r.acState, 'lt', JSON.stringify(r.lt), 'pd', JSON.stringify(r.pd), 'ins', JSON.stringify(r.ins.map((e) => [e.t, e.arr, e.r])), r.log.join(','));
    await ctx.close(); }
  await b.close(); }
writeFileSync(EV + 'ts-probe3' + (process.env.TAG || '') + '.json', JSON.stringify(out, null, 1)); process.exit(0);
