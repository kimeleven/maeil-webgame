// t_6b058523 trusted pointer timeStamp lag probe (evidence only, not product code). node scripts/odd-ts-probe.mjs [baseUrl]
// Measures ev.timeStamp vs handler performance.now() for real CDP-dispatched (isTrusted) touch/mouse input on the odd-tile page,
// across: idle grid, tap right after grid show, during main-thread busy (synthetic busy loop), 4x CPU throttle.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname; const EV = process.env.OT_EV || `${ROOT}reboot-evidence/odd-polish/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5199); U = 'http://localhost:5199'; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: !process.env.HEADED, args: process.env.NOBLUR ? [] : [] }); const rows = []; const NOBLUR = !!process.env.NOBLUR;
async function page(touch, cpu) {
  const ctx = await b.newContext({ viewport: touch ? { width: 412, height: 915 } : { width: 1440, height: 1000 }, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await p.addInitScript(() => { window.__ts = []; window.__lt = [];
    addEventListener('pointerdown', (e) => { const now = performance.now(); __ts.push({ trusted: e.isTrusted, type: e.pointerType, ts: e.timeStamp, now, lag: now - e.timeStamp, a: window.__ot && __ot.game ? __ot.activeNow() : null, t: window.__ot && __ot.game ? __ot.activeOf(e.timeStamp) : null }); }, { capture: true });
    try { new PerformanceObserver((l) => { for (const x of l.getEntries()) __lt.push({ s: x.startTime, d: x.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {} });
  if (NOBLUR) await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'; document.head.appendChild(st); }));
  await p.goto(U + '/ko/play/odd-tile/?seed=probe'); await p.waitForFunction(() => window.__ot && __ot.ready); return { p, ctx, cdp };
}
const tapAt = async (p, touch, x, y) => (touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
const cellXY = (p, i) => p.evaluate((i) => { const r = document.querySelectorAll('#grid .cell')[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, i);
for (const [touch, cpu] of [[true, 0], [false, 0], [true, 4]]) {
  const { p, ctx } = await page(touch, cpu); const tag = `${touch ? 'touch412' : 'mouse1440'}${cpu ? '-cpu' + cpu : ''}`;
  const sb = await p.locator('#b-start').boundingBox(); await tapAt(p, touch, sb.x + sb.width / 2, sb.y + sb.height / 2);
  await p.waitForFunction(() => document.querySelectorAll('#grid .cell').length === 4);
  // A: first grid, immediately after show (first candidate case)
  let [x, y] = await cellXY(p, 3); await tapAt(p, touch, x, y); await sleep(1000);
  // B: idle taps on later grids (wait 600 ms after show)
  for (let i = 0; i < 6; i++) { await p.waitForFunction(() => __ot.game && __ot.activeNow() >= __ot.game.S.start + 300 && !__ot.game.S.inbox.length); const a = await p.evaluate(() => __ot.game.S.grid.ans); [x, y] = await cellXY(p, a); await tapAt(p, touch, x, y); await sleep(700); }
  // C: tap while main thread blocked 150 ms (simulated jank right before input delivery)
  for (let i = 0; i < 3; i++) { await p.waitForFunction(() => __ot.game && __ot.activeNow() >= __ot.game.S.start + 300 && !__ot.game.S.inbox.length); const a = await p.evaluate(() => __ot.game.S.grid.ans); [x, y] = await cellXY(p, a);
    await p.evaluate(() => setTimeout(() => { const e = performance.now() + 150; while (performance.now() < e); }, 0)); await sleep(10); await tapAt(p, touch, x, y); await sleep(700); }
  const r = await p.evaluate(() => ({ ts: __ts, lt: __lt, ev: __ot.W.ev.filter((e) => e.k === 'in'), late: __ot.game ? __ot.game.S.lateLog : [] }));
  r.ts.forEach((q, i) => rows.push({ tag, i, phase: i === 0 ? 'start-btn' : i === 1 ? 'A-first-grid' : i <= 7 ? 'B-idle' : 'C-jank150', ...q }));
  rows.push({ tag, longtasks: r.lt, inputs: r.ev, lateLog: r.late }); await ctx.close();
}
await b.close();
writeFileSync(EV + 'ts-probe' + (process.env.HEADED ? '-headed' : '') + (NOBLUR ? '-noblur' : '') + '.json', JSON.stringify({ base: U, at: new Date().toISOString(), rows }, null, 1));
for (const q of rows) if (q.phase) console.log(q.tag, q.phase, q.trusted, q.type, 'lag', q.lag.toFixed(1), 't', q.t, 'arrActive', q.a);
for (const q of rows) if (q.longtasks) console.log(q.tag, 'longtasks', JSON.stringify(q.longtasks.map((x) => Math.round(x.d))), 'lateLog', JSON.stringify(q.lateLog), 'inputs r', JSON.stringify(q.inputs.map((e) => [e.t, e.arr, e.r])));
process.exit(0);
