// Rhythm Garden late-delivery browser check (t_2b703714). node scripts/rhythm-late-check.mjs [baseUrl]
// Real browser input via CDP with an explicit platform timestamp EARLIER than delivery, so the frame driver runs first
// (frame-first ordering) — the case that used to give miss + stray. Automated only: not a real device, not human feel.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/rhythm/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5198); U = 'http://localhost:5198'; }
const PATH = '/ko/play/rhythm-garden/?seed=late';
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
const rows = [], fails = [];
// target: beat index 1 (t=2001, w=160). Beat 0 is left untapped (1 real miss) in every case. wilts = wilts on beats 0–1 + stray.
// mode edge: raw = t+w (window edge); onbeat: raw = t. d = intended delivery delay after raw.
const CASES = [
  ['edge', 39, 'key'], ['edge', 40, 'key'], ['edge', 41, 'key'], ['edge', 161, 'key'], ['edge', 240, 'key'], ['edge', 250, 'key'],
  ['onbeat', 160, 'key'], ['onbeat', 161, 'key'], ['onbeat', 240, 'key'], ['onbeat', 250, 'key'], ['edge', 41, 'touch'], ['onbeat', 250, 'touch'],
  ['edge', 320, 'key'],   // beyond HORIZON 250 → miss final, stale tap discarded (single penalty)
  ['outside', 41, 'key'], // raw = t+w+1: genuinely outside → miss + stray (2), same as on-time delivery
];
for (const [mode, d, dev] of CASES) {
  const touch = dev === 'touch';
  const ctx = await b.newContext({ viewport: touch ? { width: 412, height: 915 } : { width: 1440, height: 960 }, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + PATH); await p.waitForFunction(() => window.__rg && __rg.ready); await p.bringToFront();
  const cdp = await ctx.newCDPSession(p);
  await p.keyboard.press('Enter'); await p.waitForFunction(() => __rg.g.phase === 'play');
  const B = await p.evaluate(() => __rg.g.chart.beats[1]); const raw = mode === 'edge' ? B.t + B.w : mode === 'onbeat' ? B.t : B.t + B.w + 1;
  // wait until active time = raw + d (frames keep running → the window closes at raw+40 for edge cases)
  const pre = await p.evaluate((at) => new Promise((r) => { const f = () => { const a = __rg.act(performance.now()); if (a >= at) r({ a, res1: __rg.g.res[1], now: __rg.g.now, wilts: __rg.g.wilts }); else requestAnimationFrame(f); }; f(); }), raw + d - 3);
  const epoch = await p.evaluate((raw) => (performance.timeOrigin + __rg.T0 + __rg.P + raw) / 1000, raw);
  if (touch) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 500 }], timestamp: epoch }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: epoch + 0.03 }); }
  else { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, timestamp: epoch }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, timestamp: epoch + 0.03 }); }
  await p.waitForTimeout(120);
  const post = await p.evaluate(() => { const g = __rg.g; const e = __rg.evlog.filter((x) => x.k === 'down').pop(); return { e, res1: g.res[1], wilts: g.events.filter((x) => x.a === 'wilt' && x.k <= 1).length, causes: __rg.E.causes(g).n, ev: g.events.filter((x) => x.a !== 'pass').map((x) => `${x.a}:${x.why || ''}:${x.k}`) }; });
  const e = post.e || {}; const dm = e.recv - e.raw;
  let expect, pass;
  if (mode === 'outside') { expect = 'miss+stray (wilts 3)'; pass = post.wilts === 3 && post.causes.stray === 1; }
  else if (dm > 250) { expect = 'miss final, tap stale (wilts 2, stray 0)'; pass = post.wilts === 2 && post.causes.stray === 0 && e.path === 'stale'; }
  else { expect = mode === 'edge' ? 'good, wilts 1 (beat0 only)' : 'perfect, wilts 1'; pass = post.wilts === 1 && post.res1 === (mode === 'edge' ? 'good' : 'perfect') && post.causes.stray === 0; }
  if (errs.length) pass = false;
  const row = { case: `${dev} ${mode} d=${d}`, rawTs: e.raw, recv: e.recv, frameAtDelivery: e.frameAt, measuredDelay: dm, frameFirst: e.frameAt > e.raw, provisionalBefore: pre.res1, path: e.path, judged: e.r, why: e.why, revoked: e.revoked, res1: post.res1, wilts: post.wilts, stray: post.causes.stray, expect, pass, errs };
  rows.push(row); if (!pass) fails.push(row.case);
  console.log(`${pass ? '✔' : '✘'} ${row.case}: raw ${e.raw} recv ${e.recv} (Δ${dm}) frame ${e.frameAt} provisional=${pre.res1} path=${e.path} → ${e.r}${e.why ? '/' + e.why : ''} res1=${post.res1} wilts=${post.wilts} stray=${post.causes.stray} | expect ${expect}`);
  await ctx.close();
}
await b.close();
writeFileSync(`${EV}late-${tag}.json`, JSON.stringify({ base: U, at: new Date().toISOString(), rows, fails }, null, 1));
console.log(`${rows.length - fails.length}/${rows.length} pass → reboot-evidence/rhythm/late-${tag}.json`);
process.exit(fails.length ? 1 : 0);
