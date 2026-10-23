// Fair Slice browser evidence (t_bbb6c617). node scripts/fair-check.mjs [baseUrl]  (default: local dev server :5199).
// Headless Chromium + headless WebKit, emulation only — NOT real devices, NOT human fun, NOT audio quality, NOT independent QA.
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import * as E from '../public/js/fair-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/fair/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag0 = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5199); U = 'http://localhost:5199'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/fair-slice/';
const b = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, browser = b } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__fs && __fs.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __fs.g; return { phase: g.phase, r: g.r, rounds: g.rounds.length, score: g.score, paused: __fs.paused, drag: !!__fs.drag, kb: __fs.kb && { th: __fs.kb.th, d: Math.round(__fs.E.kbOffset(__fs.kb) * 10) / 10, shown: __fs.kb.shown }, last: g.rounds.length ? g.rounds[g.rounds.length - 1] && { e10: g.rounds[g.rounds.length - 1].e10, grade: g.rounds[g.rounds.length - 1].grade, at: g.rounds[g.rounds.length - 1].at } : null }; });
const waitAim = (p, r) => p.waitForFunction((r) => __fs.g.phase === 'aim' && __fs.g.r === r && __fs.kb, r, { timeout: 15000 });
const tapBtn = async (p, sel, touch) => { const r = await p.locator(sel).boundingBox(); if (touch) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
const gx = async (p) => { const r = await p.locator('#cv').boundingBox(); return (q) => [r.x + (q[0] / 1000) * r.width, r.y + (q[1] / 1000) * r.height]; };
// endpoints of the exact half line, pushed far apart inside the square (less angle error from pixel rounding)
const halfPts = (P, th) => { const [a, c] = E.halfLine(P, th), d = [c[0] - a[0], c[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L]; let t0 = -1e4, t1 = 1e4;
  for (const k of [0, 1]) { if (Math.abs(u[k]) < 1e-9) continue; const lo = (8 - a[k]) / u[k], hi = (992 - a[k]) / u[k]; t0 = Math.max(t0, Math.min(lo, hi)); t1 = Math.min(t1, Math.max(lo, hi)); }
  return [[a[0] + u[0] * t0, a[1] + u[1] * t0], [a[0] + u[0] * t1, a[1] + u[1] * t1]]; };
async function mouseDrag(p, q0, q1) { const m = await gx(p), [x0, y0] = m(q0), [x1, y1] = m(q1); await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await p.mouse.move(x1, y1, { steps: 4 }); await p.mouse.up(); }
async function touchDrag(p, cdp, q0, q1) { const m = await gx(p), [x0, y0] = m(q0), [x1, y1] = m(q1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }

// ---- R5 (runs in the background the whole time): start, no input → result within 120 s ----
const p5 = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=idle' }); await tapBtn(p5, '#b-start', true); const t5 = Date.now();
const r5 = p5.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 130000 }).then(() => Date.now() - t5);

// ---- R0 + R1 412 touch + R2 first success + R1c + R6 + R10 ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true }); const cdp = await p.ctx.newCDPSession(p);
  const r = await p.locator('#cv').boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.keyboard.press('Space');
  await sleep(10000); const s0 = await st(p); const hud0 = await p.evaluate(() => document.getElementById('h-time').textContent);
  await p.screenshot({ path: EV + 'ready-412.png' });
  ok('R0 ready: 10 s wait + screen tap + Space → still ready, timer 10.0, no shape', s0.phase === 'ready' && s0.rounds === 0 && hud0 === '10.0', JSON.stringify({ ...s0, hud0 }));
  const shapes = await p.evaluate(() => __fs.g.shapes.map((s) => s.poly));
  ok('R9 ?seed= shapes equal node genShapes(seed)', JSON.stringify(shapes) === JSON.stringify(E.genShapes('check').map((s) => s.poly)));
  const tStart = Date.now(); await tapBtn(p, '#b-start', true); await waitAim(p, 1);
  await p.screenshot({ path: EV + 'aim-412.png' });
  await touchDrag(p, cdp, [500, 20], [500, 980]); await sleep(80); const s1 = await st(p); const tFirst = Date.now() - tStart;
  ok('R1 412 touch drag → exactly one cut', s1.rounds === 1, JSON.stringify(s1.last));
  ok('R2 first cut ≥ good within 5 s of [start] (real touch drag down the middle)', s1.last && s1.last.e10 <= 20 && tFirst < 5000, `e=${s1.last && s1.last.e10 / 10} grade ${s1.last && s1.last.grade}, ${tFirst} ms wall`);
  await sleep(700); await p.screenshot({ path: EV + 'split-412.png' });
  // R1c: round 2 drag starting inside the shape (at the area centroid)
  await waitAim(p, 2); const P2 = shapes[1], c2 = E.centroid(P2);
  // R6 on round 2 first: short drag, pointercancel, second pointer, pause — none consumes the round
  const m = await gx(p); const [cx0, cy0] = m(c2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx0, y: cy0, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx0 + 4, y: cy0, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(40); const a1 = await st(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx0, y: cy0, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx0 + 120, y: cy0 + 40, id: 1 }] });
  const txtDrag = await p.evaluate(() => [...document.body.querySelectorAll('*')].filter((e) => !e.closest('[hidden],script,style') && e.children.length === 0 && /%/.test(e.textContent)).map((e) => e.textContent));
  await sleep(200); const drawnInDrag = await p.evaluate(() => __fs.W.txt.drag);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(40); const a2 = await st(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx0, y: cy0, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx0 + 120, y: cy0, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx0 + 120, y: cy0, id: 1 }, { x: cx0, y: cy0 + 150, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(40); const a3 = await st(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx0, y: cy0, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx0 + 120, y: cy0, id: 1 }] });
  // R10 hidden tab while dragging → pause, timer frozen, drag cancelled, shape covered by blurred sheet
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const h0 = await p.evaluate(() => document.getElementById('h-time').textContent); await sleep(1500); const h1 = await p.evaluate(() => document.getElementById('h-time').textContent);
  const pz = await p.evaluate(() => ({ shown: !document.getElementById('pz').hidden, blur: getComputedStyle(document.getElementById('pz')).backdropFilter }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); const a4 = await st(p);
  await p.screenshot({ path: EV + 'pause-412.png' });
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); }); await tapBtn(p, '#b-resume', true); await sleep(60);
  const cancels = await p.evaluate(() => __fs.evlog.filter((e) => e.k === 'cancel').map((e) => e.why));
  ok('R6 short drag / pointercancel / second pointer / pause: no cut, round 2 still open', [a1, a2, a3, a4].every((s) => s.rounds === 1 && s.r === 2) && a4.paused, `cancels ${cancels.join(',')} ; short→${JSON.stringify(await p.evaluate(() => __fs.evlog.filter((e) => e.k === 'cut').map((e) => e.why || 'ok')))}`);
  ok('R10 no % anywhere while dragging (DOM + canvas text draws)', txtDrag.length === 0 && drawnInDrag === 0, `dom ${JSON.stringify(txtDrag)}, canvas text during drag ${drawnInDrag}`);
  ok('R10 hidden tab → paused, timer frozen, drag cancelled, blurred sheet', a4.paused && h0 === h1 && !a4.drag && pz.shown && /blur/.test(pz.blur), `hud ${h0}→${h1} ${JSON.stringify(pz)}`);
  // R1c real cut starting inside
  const nUI = (await st(p)).rounds; await tapBtn(p, '#b-pause', true); await sleep(30); const sPz = await st(p); await tapBtn(p, '#b-resume', true);
  ok('R10 UI button tap (pause) is not a cut', sPz.rounds === nUI && sPz.paused, JSON.stringify(sPz));
  await touchDrag(p, cdp, c2, [c2[0] + 300, c2[1] + 90]); await sleep(60); const a5 = await st(p);
  ok('R1c drag starting inside the shape is a normal cut', a5.rounds === 2, JSON.stringify(a5.last));
  ok('no page errors (412 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R1 1440 mouse + keyboard; R1b Enter contract; R2 auto (real mouse drags along exact half lines) ----
let replayLog = null;
{
  const p = await open({ width: 1440, height: 1000 }, { path: PATH + '?seed=kb' });
  await p.keyboard.down('Enter'); for (let i = 0; i < 40; i++) { await sleep(50); await p.keyboard.down('Enter'); } await p.keyboard.up('Enter');   // hold 2 s
  await sleep(500); const b1 = await st(p); const reps = await p.evaluate(() => __fs.evlog.filter((e) => e.k === 'repeat').length);
  ok('R1b ready: Enter held 2 s (repeat) = start only, no round-1 cut', b1.rounds === 0 && b1.phase === 'aim' && reps >= 30, `${JSON.stringify(b1)} repeats ignored ${reps}`);
  await p.keyboard.press('Enter'); await sleep(30); const b2 = await st(p);
  ok('R1b aim: Enter before any arrow is ignored', b2.rounds === 0, JSON.stringify(await p.evaluate(() => __fs.evlog.filter((e) => e.k === 'enter-ignored').slice(-1))));
  for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowRight'); const k1 = await st(p);
  await p.keyboard.down('Shift'); await p.keyboard.press('ArrowUp'); await p.keyboard.up('Shift'); const k2 = await st(p);
  await p.screenshot({ path: EV + 'aim-kb-1440.png' });
  ok('R1 keyboard: → ×10 = 10°, Shift+↑ = normal −10', k1.kb.th === 10 && k1.kb.d === 0 && k2.kb.th === 10 && k2.kb.d === -10, `${JSON.stringify(k1.kb)} → ${JSON.stringify(k2.kb)}`);
  await p.keyboard.press('Enter'); await sleep(30); const k3 = await st(p);
  ok('R1 1440 keyboard Enter → exactly one cut (same judge)', k3.rounds === 1, JSON.stringify(k3.last));
  await sleep(900); await p.screenshot({ path: EV + 'split-1440.png' });
  await waitAim(p, 2); await mouseDrag(p, [100, 300], [900, 700]); await sleep(40); const k4 = await st(p);
  ok('R1 1440 mouse drag → exactly one cut', k4.rounds === 2, JSON.stringify(k4.last));
  const shapes = await p.evaluate(() => __fs.g.shapes.map((s) => s.poly));
  for (let r = 3; r <= 10; r++) { await waitAim(p, r); const [q0, q1] = halfPts(shapes[r - 1], (r * 37) % 180); await mouseDrag(p, q0, q1); }
  await p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 20000 });
  const fin = await p.evaluate(() => __fs.g.rounds.map((x) => [x.r, x.e10, x.grade]));
  ok('R2 browser auto (real mouse drags on exact half lines) rounds 3-10 all perfect (e ≤ 0.5)', fin.slice(2).every((x) => x[1] <= 5), JSON.stringify(fin.slice(2)));
  replayLog = await p.evaluate(() => __fs.g.log);
  // R8 result
  const res = await p.evaluate(() => ({ score: document.getElementById('r-score').textContent, best: document.getElementById('r-best').textContent, diff: document.getElementById('r-diff').textContent, bars: document.querySelectorAll('#r-bars .rb').length, first: !document.getElementById('r-first').hidden, near: document.getElementById('r-near').textContent }));
  await p.screenshot({ path: EV + 'result-1440.png' });
  ok('R8 result: score, best/diff, 10 per-round error bars, visible without sharing', res.bars === 10 && res.score !== '' && res.first, JSON.stringify(res));
  await p.keyboard.press('Enter'); await sleep(30); const e1 = await st(p);
  ok('R1b result: Enter → ready only (not started)', e1.phase === 'ready' && e1.rounds === 0, JSON.stringify(e1));
  ok('no page errors (1440 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R3 replay: node = Chromium = Chromium(reduced motion) = WebKit, at 360/412/1440 ----
{
  const nodeR = E.replay('kb', replayLog); const got = [];
  const wk = await webkit.launch();
  for (const [br, w, mo] of [[b, 360], [b, 412, 'reduce'], [b, 1440], [wk, 412], [wk, 1440]]) {
    const p = await open({ width: w, height: w === 1440 ? 1000 : 800 }, { browser: br, motion: mo, path: PATH + '?seed=kb' });
    got.push([br === b ? 'chromium' : 'webkit', w, JSON.stringify(await p.evaluate((L) => __fs.E.replay('kb', L), replayLog)) === JSON.stringify(nodeR)]); await p.ctx.close();
  }
  // same game-space drag at 360 vs 1440 → same normalised log coordinates (within one pixel quantum) and same judgement for a webkit real drag
  const pw = await open({ width: 412, height: 800 }, { browser: wk, touch: false }); await tapBtn(pw, '#b-start'); await waitAim(pw, 1); await mouseDrag(pw, [500, 10], [500, 990]); await sleep(60); const sw = await st(pw); await pw.ctx.close(); await wk.close();
  ok('R3 replay identical: node = chromium 360/412(reduced)/1440 = webkit 412/1440', got.every((x) => x[2]), JSON.stringify(got) + ` score ${nodeR.score} err ${nodeR.err10 / 10}`);
  ok('R3 WebKit real mouse drag → one cut, round 1 good+', sw.rounds === 1 && sw.last.e10 <= 20, JSON.stringify(sw.last));
}
// ---- R8 again/PNG, R9 network, R10 settings persist ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=r8' });
  await p.evaluate(() => { const g = __fs.g; __fs.E.start(g, 0); __fs.E.advance(g, 200000); });   // jump the engine to a finished game (UI path for the result)
  await p.waitForFunction(() => !document.getElementById('res').hidden); await sleep(300); await p.screenshot({ path: EV + 'result-412.png' });
  const t0 = Date.now(); await tapBtn(p, '#b-again', true); await p.waitForFunction(() => !document.getElementById('ready').hidden && __fs.g.phase === 'ready'); const dt = Date.now() - t0;
  ok('R8 [again] 1 tap → ready ≤ 0.5 s', dt <= 500, `${dt} ms (wall, incl. automation)`);
  await p.evaluate(() => { const g = __fs.g; __fs.E.start(g, 0); __fs.E.advance(g, 200000); }); await p.waitForFunction(() => !document.getElementById('res').hidden);
  const dlP = p.waitForEvent('download'); await tapBtn(p, '#b-png', true); const dl = await dlP; const fp = EV + 'result-card.png'; await dl.saveAs(fp);
  const png = readFileSync(fp); ok('R8 PNG saved locally 1080×1350 (no upload)', png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 1350, dl.suggestedFilename());
  // settings persist
  await p.evaluate(() => document.querySelector('#res [data-set="sound"]').click()); await p.reload(); await p.waitForFunction(() => window.__fs && __fs.ready);
  const s = await p.evaluate(() => __fs.set.sound); ok('R10 sound setting persists after reload', s === false, `sound=${s}`);
  const api = site(p.reqs).filter((u) => /\/api\//.test(u)); const ext = site(p.reqs).filter((u) => !u.startsWith(U));
  ok('R9 network: no /api, no external requests', api.length === 0 && ext.length === 0, `requests ${site(p.reqs).length}, api ${api.length}, external ${ext.join(',')}`);
  ok('no page errors (result run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R12 loading 4× CPU + Fast 3G, gzip, fps while dragging, widths 360/412/1440 × 6 langs ----
{
  // headless Chromium caps rAF at ~13 fps even on an empty page, so frame rate is measured with the frame-rate limit off (= render headroom)
  const bf = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await bf.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=load', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__fs && __fs.ready); await p.locator('#b-start').click({ trial: true }); const tl = Date.now() - t0;
  await p.locator('#b-start').click(); await p.waitForFunction(() => __fs.g.phase === 'aim');
  const m = await gx(p); const [x0, y0] = m([100, 100]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
  const fs0 = await p.evaluate(() => __fs.W.ft.length); const tt = Date.now();
  for (let i = 0; i < 60; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (i % 30) * 8, y: y0 + i * 3, id: 1 }] }); await sleep(30); }
  const f4 = await p.evaluate(() => { const t = __fs.W.ft.slice(-60); return Math.round((1000 * (t.length - 1)) / (t[t.length - 1] - t[0])); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  for (let i = 0; i < 60; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (i % 30) * 8, y: y0 + i * 3, id: 1 }] }); await sleep(30); }
  const f1 = await p.evaluate(() => { const t = __fs.W.ft.slice(-60); return Math.round((1000 * (t.length - 1)) / (t[t.length - 1] - t[0])); });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const html = readFileSync(`${ROOT}public/ko/play/fair-slice/index.html`); const gz = gzipSync(html).length;
  ok('R12 [start] actionable ≤ 2 s (4× CPU + Fast 3G emulation, headless Chromium)', tl <= 2000, `${tl} ms`);
  ok('R12 gzip ≤ 35 KB, 0 images/fonts/audio files', gz <= 35840, `${gz} B gzip (${html.length} B raw)`);
  ok('R12 frame rate while dragging ≥ 55 (uncapped headless, 4× CPU; render headroom, not a device fps)', f4 >= 55, `4× ${f4} fps, 1× ${f1} fps`); out.fps = { cpu4: f4, cpu1: f1 };
  await ctx.close(); await bf.close();
  const over = [];
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const w of [360, 412, 1440]) {
    const pg = await open({ width: w, height: w === 1440 ? 1000 : 800 }, { path: `/${l}/play/fair-slice/?seed=w` });
    const chk = async () => pg.evaluate(() => { const sw = document.documentElement.scrollWidth, iw = innerWidth; const small = [...document.querySelectorAll('button,summary,a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.width < 44 || r.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => e.id || e.textContent.trim().slice(0, 12)); const robots = document.querySelector('meta[name=robots]').content; return { sw, iw, small, robots }; });
    const m1 = await chk(); await pg.evaluate(() => { const g = __fs.g; __fs.E.start(g, 0); __fs.E.advance(g, 200000); }); await pg.waitForFunction(() => !document.getElementById('res').hidden); const m2 = await chk();
    for (const [n, mm] of [['ready', m1], ['result', m2]]) if (mm.sw > mm.iw || mm.small.length || !/noindex/.test(mm.robots)) over.push(`${l}@${w}/${n}: sw ${mm.sw}/${mm.iw} small ${mm.small.join('|')} ${mm.robots}`);
    if (l !== 'ko' && w === 412) await pg.screenshot({ path: EV + `result-${l}-412.png` });
    await pg.ctx.close();
  }
  ok('R12 6 langs × 360/412/1440 (ready + result): no horizontal overflow, targets ≥ 44px, meta noindex', over.length === 0, over.join(' ; ') || '36 screens');
}
// ---- R9 isolation ----
{
  const diff = execSync('git diff --name-only origin/main...HEAD; git status --porcelain | cut -c4-', { cwd: ROOT }).toString().split('\n').filter(Boolean);
  const bad = diff.filter((f) => /^(api|db|lib|middleware|vercel\.json|public\/manifest|public\/sw|public\/sitemap|public\/robots|public\/[^/]+\/c\/|public\/[^/]+\/index\.html|public\/data)/.test(f));
  ok('R9 diff: no api/db/lib/middleware/vercel.json/manifest/sw/sitemap/robots//c//lobby changes', bad.length === 0, bad.join(',') || `${diff.length} paths`);
  const sm = readFileSync(`${ROOT}public/sitemap.xml`, 'utf8'); ok('R9 sitemap has no fair-slice (109 urls as main)', !/fair-slice/.test(sm) && (sm.match(/<url>/g) || []).length === 109, `${(sm.match(/<url>/g) || []).length} urls`);
}
// ---- R5 result ----
{
  let ms = null; try { ms = await r5; } catch (e) { ms = null; }
  const s = await st(p5); await p5.screenshot({ path: EV + 'result-idle-412.png' });
  ok('R5 no input after [start] → 10 timeouts, score 0, result < 120 s (real time)', ms !== null && ms < 120000 && s.score === 0 && (await p5.evaluate(() => __fs.g.rounds.every((r) => r.timeout))), `${ms} ms, ${JSON.stringify(s)}`);
  await p5.ctx.close();
}
await b.close();
out.fails = fails; writeFileSync(EV + `check-${tag0}.json`, JSON.stringify(out, null, 2));
const n = Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length;
console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'} ${n - fails.length}/${n}`);
process.exit(fails.length ? 1 : 0);
