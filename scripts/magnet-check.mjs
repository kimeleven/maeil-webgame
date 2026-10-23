// Magnet Harbor browser evidence (t_1c491685): M0 M1 M2 M3(Chromium+WebKit) M4 M5 M8 M9 M10 M12 + 6 langs.
// node scripts/magnet-check.mjs [baseUrl]   (default: local dev server on :5194)
// HEADED Chromium (headless rAF is throttled on this Mac). Automated runs only — not real-device / real-player checks.
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as E from '../public/js/magnet-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/magnet/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag0 = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5194); U = 'http://localhost:5194'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/magnet-harbor/';
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, init, browser = b } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__mh && __mh.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __mh.g; return { tick: g.tick, phase: g.phase, auto: g.cargo && g.cargo.auto, x: g.crane.x, ships: g.ships, fails: g.fails, score: g.score, hud: document.getElementById('h-time').textContent, armed: !!__mh.armed, rel: __mh.evlog.filter((e) => e.k === 'release').length, lands: __mh.evlog.filter((e) => e.k === 'land').length }; });
const box = async (p, sel) => p.locator(sel).boundingBox();
async function touchDrag(p, x0, y, x1, steps = 12) { const c = await p.ctx.newCDPSession(p); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] }); for (let i = 1; i <= steps; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y }] }); await sleep(16); } return c; }
const toShipCenter = async (p) => { const r = await box(p, '#cv'), s = r.width / 9, x = await p.evaluate(() => __mh.g.crane.x); return { r, s, dx: (4.5 - x) * s }; };

// ---- M0 ready state: 10 s wait, drag does not start ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const r = await box(p, '#cv'); const c = await touchDrag(p, r.x + 60, r.y + r.height * 0.8, r.x + 300); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.mouse.move(r.x + 50, r.y + 400); await sleep(10000); const s = await st(p);
  await p.screenshot({ path: EV + 'ready-412.png' });
  ok('M0 ready 10 s: time 90, gauge untouched, drag does not start', s.tick === 0 && s.hud === '90' && !s.armed && s.phase === 'ready', JSON.stringify(s));
  await p.ctx.close();
}
// ---- M1/M2 412 touch: start button tap → drag to ship → lift = one release, first landing ≤5 s ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const bs = await box(p, '#b-start'); await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); const t0 = Date.now();
  await p.waitForFunction(() => __mh.armed); await sleep(300);
  const { r, dx } = await toShipCenter(p); const y = r.y + r.height * 0.5;
  const c = await touchDrag(p, r.x + 40, y, r.x + 40 + dx); await sleep(900); // let the strong-damped swing settle
  const mid = await st(p); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(600);
  const s = await st(p), tl = (Date.now() - t0) / 1000; await p.screenshot({ path: EV + 'play-412.png' });
  ok('M1 412 touch drag moves crane, lift = 1 release', mid.x > 3 && s.rel === 1 && mid.rel === 0, `crane x ${mid.x}, releases ${s.rel}`);
  ok('M2 412 first landing within 5 s of start', s.lands === 1 && tl <= 5, `lands ${s.lands} at ~${tl.toFixed(2)} s wall, game ${(s.tick / 60).toFixed(2)} s`);
  // M10 pointercancel: drag then cancel → no release
  await sleep(500); const before = await st(p); const c2 = await touchDrag(p, r.x + 200, y, r.x + 150); await c2.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(300);
  const after = await st(p); ok('M10 pointercancel ends drag without release', after.rel === before.rel, `releases ${before.rel}→${after.rel}, cancels ${await p.evaluate(() => __mh.cancels)}`);
  // M10 UI buttons (pause) are not game input; pause stops active time & auto gauge
  const pb = await box(p, '#b-pause'); const a0 = await st(p); await p.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2); await sleep(1500); const a1 = await st(p);
  ok('M10 pause tap: no release, time & auto drop frozen', a1.rel === a0.rel && a1.tick - a0.tick <= 2 && a1.auto === (await st(p)).auto, `ticks ${a0.tick}→${a1.tick}, auto ${a1.auto}`);
  await p.screenshot({ path: EV + 'pause-412.png' });
  const pz = await box(p, '#pz .panel'); await p.touchscreen.tap(pz.x + 20, pz.y + 20); await sleep(1000); const a2 = await st(p); await sleep(2600); const a3 = await st(p);
  ok('M10 resume: 3 s countdown before time flows', a2.tick - a1.tick <= 2 && a3.tick > a2.tick, `during countdown +${a2.tick - a1.tick} ticks, after +${a3.tick - a2.tick}`);
  await p.ctx.close();
}
// ---- M1 1440 mouse drag/release and ←/→ + Space; M10 key repeat; M10 cooldown input ----
{
  const p = await open({ width: 1440, height: 1000 });
  await p.keyboard.press('Space'); await p.waitForFunction(() => __mh.armed); await sleep(200);
  const { r, dx } = await toShipCenter(p); const y = r.y + r.height * 0.5;
  await p.mouse.move(r.x + 40, y); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(r.x + 40 + (dx * i) / 12, y); await sleep(16); }
  await sleep(800); const mid = await st(p); await p.mouse.up(); await sleep(500); const s1 = await st(p);
  ok('M1 1440 mouse drag moves crane, mouse-up = 1 release', mid.x > 3 && mid.rel === 0 && s1.rel === 1, `crane x ${mid.x}, releases ${s1.rel}`);
  // cooldown: Space right after release does nothing
  await p.waitForFunction(() => __mh.g.cargo); await p.keyboard.press('Space'); await sleep(60); const c0 = await st(p); await p.keyboard.press('Space'); await sleep(200); const c1 = await st(p);
  ok('M10 input inside 0.6 s cooldown does not release', c1.rel === c0.rel, `releases ${c0.rel}→${c1.rel}`);
  await p.waitForFunction(() => __mh.g.cargo);
  const k0 = await st(p); await p.keyboard.down('ArrowRight'); await sleep(300); await p.keyboard.up('ArrowRight'); const k1 = await st(p);
  await p.keyboard.down('ArrowLeft'); await sleep(150); await p.keyboard.up('ArrowLeft'); const k2 = await st(p);
  ok('M1 1440 ←/→ move crane', k1.x > k0.x && k2.x < k1.x, `x ${k0.x}→${k1.x}→${k2.x}`);
  await sleep(700); const r0 = await st(p);
  await p.evaluate(() => { for (let i = 0; i < 5; i++) dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true })); }); await sleep(200);
  const r1 = await st(p); ok('M10 Space auto-repeat ignored', r1.rel === r0.rel, `releases ${r0.rel}→${r1.rel}`);
  await p.keyboard.press('Space'); await sleep(200); const r2 = await st(p); ok('M1 1440 Space = 1 release', r2.rel === r1.rel + 1, `releases ${r1.rel}→${r2.rel}`);
  // M10 hidden tab → paused (document.hidden overridden: Playwright keeps pages visible)
  await sleep(800); const h0 = await st(p);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(3000); const h1 = await st(p);
  ok('M10 hidden tab stops active time and auto drop', h1.tick - h0.tick <= 2 && h1.rel === h0.rel, `ticks ${h0.tick}→${h1.tick}`);
  await p.screenshot({ path: EV + 'play-1440.png' });
  await p.ctx.close();
}
// ---- M5 idle after start (412 & real time), blink, result; M8 result + again; PNG; best/diff ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=m5' });
  const bs = await box(p, '#b-start'); await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); const t0 = Date.now();
  await p.waitForFunction(() => __mh.evlog.some((e) => e.k === 'release'), null, { timeout: 15000 });
  const tRel = (Date.now() - t0) / 1000; const ev1 = await p.evaluate(() => __mh.evlog.filter((e) => e.k === 'ready' || e.k === 'release').slice(0, 2));
  await p.waitForFunction(() => __mh.g.cargo && __mh.g.cargo.auto < 100); await p.screenshot({ path: EV + 'blink-412.png' });
  await p.waitForFunction(() => __mh.g.over, null, { timeout: 40000 }); const tEnd = (Date.now() - t0) / 1000;
  const s = await st(p), blink = await p.evaluate(() => __mh.blinkSeen);
  ok('M5 idle: auto drop 360 ticks after ready, blink seen, result <30 s', ev1[1].tick - ev1[0].tick === 360 && ev1[1].why === 'auto' && blink && tEnd < 30 && s.ships === 0, `first auto drop ${tRel.toFixed(2)} s wall (tick ${ev1[1].tick}), result ${tEnd.toFixed(2)} s, game ${(s.tick / 60).toFixed(2)} s`);
  await p.waitForSelector('#res:not([hidden])'); await p.screenshot({ path: EV + 'result-412.png' });
  const res1 = await p.evaluate(() => ({ ships: document.getElementById('r-ships').textContent, best: document.getElementById('r-best').textContent, first: !document.getElementById('r-first').hidden }));
  const dlP = p.waitForEvent('download'); const pg = await box(p, '#b-png'); await p.touchscreen.tap(pg.x + pg.width / 2, pg.y + pg.height / 2); const dl = await dlP; const fp = EV + 'result-card.png'; await dl.saveAs(fp);
  const png = readFileSync(fp); const wpx = png.readUInt32BE(16), hpx = png.readUInt32BE(20);
  ok('M8 PNG saved locally 1080×1350', wpx === 1080 && hpx === 1350 && dl.suggestedFilename() === 'magnet-harbor-m5.png', `${dl.suggestedFilename()} ${wpx}×${hpx}`);
  const ag = await box(p, '#b-again'); const tA = Date.now(); await p.touchscreen.tap(ag.x + ag.width / 2, ag.y + ag.height / 2);
  await p.waitForFunction(() => !document.getElementById('ready').hidden && __mh.g.phase === 'ready'); const tReady = Date.now() - tA;
  ok('M8 again → ready within 0.5 s', tReady <= 500, `${tReady} ms`);
  // second run: one landing then idle → compare with best
  await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); await p.waitForFunction(() => __mh.armed); await sleep(200);
  const { r, dx } = await toShipCenter(p); const c = await touchDrag(p, r.x + 40, r.y + r.height / 2, r.x + 40 + dx); await sleep(900); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForFunction(() => __mh.g.over, null, { timeout: 40000 }); await p.waitForSelector('#res:not([hidden])');
  const res2 = await p.evaluate(() => ({ score: document.getElementById('r-score').textContent, best: document.getElementById('r-best').textContent, diff: document.getElementById('r-diff').textContent, nb: !document.getElementById('r-new').hidden }));
  ok('M8 result shows this run, best and diff without sharing', res1.first && res2.best && res2.diff && res2.nb, JSON.stringify([res1, res2]));
  await p.screenshot({ path: EV + 'result2-412.png' });
  ok('M4 seed query + no /api requests', (await p.evaluate(() => __mh.seed)) === 'm5' && !site(p.reqs).some((u) => u.includes('/api')), `requests ${site(p.reqs).length}: ${site(p.reqs).map((u) => new URL(u).pathname).join(' ')}`);
  ok('no page errors (M5/M8 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- M3 replay Chromium vs WebKit vs node; M9 reduced motion gives same result ----
{
  const seeds = ['m3-a', 'm3-b', 'm3-c', '2026-10-23'];
  const logs = seeds.map((s) => E.simulate(s, 'safe').log);
  const key = (g) => JSON.stringify([g.placed, g.score, g.ships, g.fails]);
  const nodeK = seeds.map((s, i) => key(E.replay(s, logs[i])));
  const inPage = (p) => p.evaluate(([seeds, logs]) => seeds.map((s, i) => { const g = __mh.E.replay(s, logs[i]); return JSON.stringify([g.placed, g.score, g.ships, g.fails]); }), [seeds, logs]);
  const pc = await open({ width: 412, height: 915 }); const cK = await inPage(pc); await pc.ctx.close();
  const pr = await open({ width: 412, height: 915 }, { motion: 'reduce' }); const rK = await inPage(pr); const rm = await pr.evaluate(() => document.body.classList.contains('rm')); await pr.screenshot({ path: EV + 'reduced-412.png' }); await pr.ctx.close();
  let wK = null, wErr = '';
  try { const wb = await webkit.launch(); const pw = await open({ width: 412, height: 915 }, { browser: wb }); wK = await inPage(pw); await wb.close(); } catch (e) { wErr = e.message.slice(0, 120); }
  const sum = seeds.map((s, i) => `${s}: ${JSON.parse(nodeK[i])[2]} ships/${JSON.parse(nodeK[i])[1]} pts`).join(', ');
  ok('M3 same seed+log: node = Chromium = WebKit (boxes, score)', cK.every((k, i) => k === nodeK[i]) && wK && wK.every((k, i) => k === nodeK[i]), `${sum}${wErr ? ' webkit err ' + wErr : ''}`);
  ok('M9 reduced motion: body.rm on, judgement identical', rm && rK.every((k, i) => k === nodeK[i]), `rm=${rm}`);
}
// ---- M9/M10 settings persist (sound, haptic) after reload ----
{
  const p = await open({ width: 1440, height: 1000 });
  await p.click('header [data-set="sound"]'); await p.click('header [data-set="haptic"]'); await p.reload(); await p.waitForFunction(() => __mh.ready);
  const s = await p.evaluate(() => ({ sound: __mh.set.sound, haptic: __mh.set.haptic, icon: document.querySelector('header [data-set="sound"]').textContent, vib: typeof navigator.vibrate }));
  ok('M9/M10 mute & haptic-off persist after reload', s.sound === false && s.haptic === false && s.icon === '🔇', JSON.stringify(s));
  await p.ctx.close();
}
// ---- M12 load budget: 4× CPU + Fast 3G, start button usable; gzip; fps; overflow & 44px in 6 langs × 3 widths ----
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const c = await ctx.newCDPSession(p);
  await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 }); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=load', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__mh && __mh.ready, null, { polling: 16 });
  const bs = await p.locator('#b-start').boundingBox(); await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); await p.waitForFunction(() => __mh.armed, null, { polling: 16 }); const tFirst = Date.now() - t0;
  const gz = gzipSync(readFileSync(`${ROOT}public/ko/play/magnet-harbor/index.html`)).length;
  ok('M12 first input usable ≤2 s (4× CPU, Fast 3G)', tFirst <= 2000, `${tFirst} ms`);
  ok('M12 gzip ≤60 KB, 1 request', gz <= 60 * 1024, `${(gz / 1024).toFixed(1)} KB`);
  await ctx.close();
  const pf = await open({ width: 412, height: 915 }); await pf.keyboard.press('Space'); await sleep(500);
  const fps = await pf.evaluate(async () => { const f0 = __mh.W.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); return ((__mh.W.frames - f0) * 1000) / (performance.now() - t); });
  ok('M12 average fps ≥50 (headed Chromium, this Mac)', fps >= 50, `${fps.toFixed(1)} fps`); await pf.ctx.close();
  const bad = [];
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const w of [360, 412, 1440]) {
    const p2 = await open({ width: w, height: w === 1440 ? 1000 : w === 360 ? 780 : 915 }, { touch: w < 1000, path: `/${l}/play/magnet-harbor/?seed=lang` });
    const chk = async (phase) => { const m = await p2.evaluate(() => { const o = document.documentElement.scrollWidth > innerWidth + 1; const small = [...document.querySelectorAll('button,a,summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent !== null && (r.width < 44 || r.height < 44) && !e.closest('nav'); }).map((e) => e.id || e.textContent.trim().slice(0, 12)); return { o, small }; }); if (m.o || m.small.length) bad.push(`${l}/${w}/${phase} ${m.o ? 'overflow ' : ''}${m.small.join(',')}`); };
    await chk('ready'); if (l === 'ko' || w === 360) await p2.screenshot({ path: EV + `ready-${l}-${w}.png` });
    await p2.evaluate(() => { const g = __mh.g; __mh.E.start(g); g.phase = 'result'; g.over = true; document.getElementById('ready').hidden = true; __mh.finish(); });
    await sleep(300); await p2.waitForSelector('#res:not([hidden])'); await chk('result'); if (w === 360) await p2.screenshot({ path: EV + `result-${l}-${w}.png` });
    if (p2.errs.length) bad.push(`${l}/${w} errors ${p2.errs.join('|')}`);
    await p2.ctx.close();
  }
  ok('M12 6 langs × 360/412/1440: no horizontal overflow, targets ≥44px', bad.length === 0, bad.join(' ; ') || '36 screens');
}
await b.close();
writeFileSync(EV + `browser-${tag0}.json`, JSON.stringify(out, null, 1));
console.log(fails.length ? `FAIL ${fails.length}: ${fails.join(' | ')}` : `ALL PASS ${Object.keys(out).length - 2}`);
process.exit(fails.length ? 1 : 0);
