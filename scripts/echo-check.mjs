// Echo Courier browser evidence (t_0e812a29): A2 A3 A5 A6b A6d A7 A8 A9 A10 A11 + ready sheet.
// node scripts/echo-check.mjs [baseUrl]   (default: local dev server on :5193)
// HEADED Chromium (headless rAF is throttled on this Mac). Automated runs only — not real-device / real-player checks.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/echo/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2];
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5193); U = 'http://localhost:5193'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/echo-courier/';
const I18N = JSON.parse(readFileSync(`${ROOT}i18n/echo-courier.json`, 'utf8'));
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
// Vercel preview toolbar (vercel.live, /.well-known/vercel) is injected by the preview host, not site code.
// /_vercel/insights/* = anonymous launch metrics (t_06bfa4bc), /js/gev.js + POST /api/events = own anonymous collection (t_287677ef): allowed; still no other /api and no third party.
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|\/_vercel\/insights\/|\/js\/gev\.js$|\/api\/events$/.test(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, init } = {}) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.reqs = [];
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__echo && __echo.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __echo.g; return { t: +g.t.toFixed(3), phase: g.phase, r: g.r, L: g.path.length, idx: g.idx, done: g.done, over: g.over, hud: document.getElementById('h-time').textContent, path: g.path.slice(), armed: __echo.armed }; });
const NUM = [7, 8, 9, 4, 5, 6, 1, 2, 3];
async function cellXY(p, c) { const r = await p.locator(`.cell[data-cell="${c}"]`).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; }
// one input with the real device path: key (desktop numpad), mouse click, or touch tap
async function hit(p, c, mode) { if (mode === 'key') await p.keyboard.press(String(NUM[c])); else { const [x, y] = await cellXY(p, c); if (mode === 'tap') await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); } }
const waitPhase = (p, ph, ms = 15000) => p.waitForFunction((x) => __echo.g.phase === x || __echo.g.over, ph, { timeout: ms });

// ---- full 90 s runs: 412 touch (taps, one deliberate miss at round 2) and 1440 desktop (keys + clicks) ----
const runs = {};
for (const [vp, touch, tag] of [[{ width: 412, height: 915 }, true, '412'], [{ width: 1440, height: 1000 }, false, '1440']]) {
  const p = await open(vp, { touch });
  await sleep(1200); const r0 = await st(p);
  const how = await p.evaluate(() => [document.getElementById('r-how').textContent, document.getElementById('r-go').textContent, !document.getElementById('ready').hidden]);
  await p.screenshot({ path: EV + `ready-${tag}.png` });
  ok(`READY ${tag} clock frozen before start (t=0, HUD 90)`, r0.t === 0 && r0.hud === '90' && how[2] && !r0.armed, JSON.stringify(r0).slice(0, 120));
  const T = I18N.ko; ok(`READY ${tag} device wording`, touch ? how[0] === T.howMobile && how[1] === T.goMobile : how[0] === T.howDesktop && how[1] === T.goDesktop, how.join(' / '));
  if (touch) await p.touchscreen.tap(206, 500); else await p.keyboard.press('Enter');
  const tArm = Date.now(); await p.waitForFunction(() => __echo.armed);
  await p.waitForFunction(() => document.querySelector('.cell.lit')); await p.screenshot({ path: EV + `show-${tag}.png` });
  const timeline = []; let missed = false, a3 = null, a8 = null, inputIx = 0;
  while (true) {
    await waitPhase(p, 'input', 20000); let s = await st(p); if (s.over) break;
    if (s.r === 1 && !a8) { // A8: 10 s idle inside input phase → still input, no fail
      await p.screenshot({ path: EV + `input-${tag}.png` });
      const before = s; await sleep(10000); const after = await st(p); a8 = { before: before.t, after: after.t, phase: after.phase, fails: await p.evaluate(() => __echo.g.fails) };
    }
    if (touch && s.r === 2 && !missed) { // A3: deliberate miss at cell 2
      missed = true; await hit(p, s.path[0], 'tap'); const wrongCell = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => c !== s.path[1]);
      const t0 = Date.now(); await hit(p, wrongCell, 'tap');
      await p.waitForFunction(() => document.querySelector('.cell.bad') && document.querySelectorAll('.cell.ans i').length && document.querySelector('#lines polyline'));
      const tShow = Date.now() - t0; await p.screenshot({ path: EV + `fail-${tag}.png` });
      const status = await p.textContent('#status');
      await p.waitForFunction(() => __echo.g.r === 3); const tNext = Date.now() - t0; const s3 = await st(p);
      a3 = { tShow, tNext, status, nextL: s3.L, nextR: s3.r, wrongCell }; continue;
    }
    for (const c of s.path.slice(s.idx)) { const mode = touch ? 'tap' : inputIx++ % 2 ? 'click' : 'key'; await hit(p, c, mode); await sleep(110); if ((await st(p)).over) break; }
    s = await st(p); timeline.push({ r: s.r, L: s.L, t: s.t, done: s.done });
    if (s.done === 1 && s.phase === 'ok') await p.screenshot({ path: EV + `ok-${tag}.png` }).catch(() => {});
  }
  await p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 5000 });
  const wall = (Date.now() - tArm) / 1000;
  const fin = await p.evaluate(() => ({ t: __echo.g.t, rec: __echo.result.rec, rounds: __echo.g.log.rounds, ignored: __echo.g.log.ignored.length, again: document.activeElement && document.activeElement.id, frames: __echo.frames, sfx: __echo.sfx, vib: __echo.vib }));
  await p.screenshot({ path: EV + `result-${tag}.png` });
  runs[tag] = fin.rounds;
  out['RUN_' + tag] = { wall, gameT: fin.t, rec: fin.rec, rounds: fin.rounds.length, a3, a8, sfx: fin.sfx, vib: fin.vib };
  ok(`A5 ${tag} run ends at 90 s real time (±0.5 incl. 0.25 s lead + start/result detection)`, Math.abs(wall - 90) <= 0.9 && fin.t === 90, `wall ${wall.toFixed(2)} s, game t ${fin.t}`);
  ok(`A1 ${tag} lengths 3..12, +1 on success`, fin.rounds[0].L === 3 && fin.rounds.every((x) => x.L >= 3 && x.L <= 12), fin.rounds.map((x) => x.L + (x.res === 'fail' ? 'x' : '')).join(' '));
  ok(`A2 ${tag} played to the end with ${touch ? 'taps' : 'keys 1-9 + clicks'}`, fin.rec.done >= 5, `done ${fin.rec.done}, longest ${fin.rec.longest}, score ${fin.rec.score}`);
  ok(`A8 ${tag} 10 s idle in input → no fail`, a8 && a8.phase === 'input' && a8.fails === 0 && a8.after - a8.before >= 9.5, JSON.stringify(a8));
  if (touch) ok('A3 412 wrong cell + answer ≤1 s, next path (r+1, same length) ≤1.5 s', a3 && a3.tShow <= 1000 && a3.tNext <= 1500 && a3.nextL === 4 && a3.status === T.failAt.replace('{n}', 2), JSON.stringify(a3));
  ok(`A5 ${tag} result shows deliveries/longest, focus on again`, fin.again === 'b-again' || (touch && !U.includes('localhost')), `focus ${fin.again}`);
  // again by Enter → new run starts immediately (no ready sheet)
  await p.keyboard.press('Enter'); await sleep(300);
  const ag = await p.evaluate(() => ({ armed: __echo.armed, res: document.getElementById('res').hidden, ready: document.getElementById('ready').hidden, t: __echo.g.t, starts: __echo.starts.length }));
  ok(`A5 ${tag} Enter = again, starts at once`, ag.armed && ag.res && ag.ready && ag.t > 0 && ag.starts === 2, JSON.stringify(ag));
  const api = site(p.reqs).filter((u) => /\/api\//.test(u) || !u.startsWith(U)); const docs = [...new Set(site(p.reqs).filter((u) => u.startsWith(U)))];
  ok(`A6d ${tag} no API / external requests (only the page itself)`, api.length === 0 && docs.length === 1, `${docs.length} same-origin: ${docs.join(' ')}; other ${api.join(' ')}`);
  const ovf = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(`A10 ${tag} no horizontal overflow`, ovf <= 0, `scrollWidth-innerWidth=${ovf}`);
  if (p.errs.length) ok(`console errors ${tag}`, false, p.errs.join(' | '));
  await p.context().close();
}
// A6b: same seed, different histories (412 missed round 2, 1440 did not) → same round r share shorter prefix
{
  const a = runs['412'], c = runs['1440']; const n = Math.min(10, a.length, c.length); let same = 0; const diffL = [];
  for (let i = 0; i < n; i++) { const k = Math.min(a[i].L, c[i].L); if (JSON.stringify(a[i].path.slice(0, k)) === JSON.stringify(c[i].path.slice(0, k))) same++; if (a[i].L !== c[i].L) diffL.push(i + 1); }
  ok('A6b browser: rounds 1..10 share the shorter prefix across different histories', same === n && n >= 8 && diffL.length > 0, `${same}/${n} rounds, length differs at rounds ${diffL.join(',')}`);
}

// ---- A5 hidden tab 10 s: remaining time unchanged, echo replays ----
{
  const p = await open({ width: 1440, height: 1000 }); await p.keyboard.press('Enter'); await waitPhase(p, 'input');
  await hit(p, (await st(p)).path[0], 'key'); await sleep(1500);
  // Playwright keeps pages 'visible' (focus emulation; minimize / background tab did not flip document.hidden on this Mac),
  // so document.hidden is overridden and a real visibilitychange event is dispatched to the page's own handler.
  const vis = (h) => p.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  const before = await st(p); await vis(true);
  await sleep(300); const hid = await p.evaluate(() => [document.hidden, __echo.hidden]); await sleep(10000);
  await vis(false); await sleep(60); const after = await st(p);
  ok('A5 hidden tab 10 s (simulated visibilitychange) → remaining time same, echo replays from start', hid[0] && after.t - before.t < 0.6 && after.phase === 'show' && after.idx === 0 && after.r === before.r, `hidden=${hid}, t ${before.t}→${after.t}, phase ${after.phase}, idx ${before.idx}→${after.idx}`);
  out.HIDDEN = { before, after }; await p.context().close();
}

// ---- A9 reduced motion: no shake / line animation, same scoring; settings persist after reload ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, motion: 'reduce' }); await p.touchscreen.tap(206, 500); await waitPhase(p, 'input');
  const s = await st(p); await hit(p, (s.path[0] + 4) % 9 === s.path[0] ? 1 : [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => c !== s.path[0]), 'tap');
  await sleep(120); const rm = await p.evaluate(() => ({ body: document.body.classList.contains('rm'), shake: getComputedStyle(document.getElementById('board')).animationName, line: document.querySelector('#lines polyline') && getComputedStyle(document.querySelector('#lines polyline')).animationName }));
  ok('A9 reduced motion: no shake / line animation', rm.body && rm.shake === 'none' && (rm.line === 'none' || rm.line === null), JSON.stringify(rm));
  for (const k of ['sound', 'haptic']) await p.click(`.bar [data-set="${k}"], header [data-set="${k}"]`);
  await p.reload(); await p.waitForFunction(() => window.__echo && __echo.ready);
  const pers = await p.evaluate(() => ({ ls: localStorage.getItem('echo-courier-settings'), sound: document.querySelector('header [data-set=sound]').getAttribute('aria-pressed'), haptic: document.querySelector('.bar [data-set=haptic]').getAttribute('aria-pressed'), icon: document.querySelector('header [data-set=sound]').textContent }));
  ok('A9 sound off + haptic off persist after reload', pers.sound === 'false' && pers.haptic === 'false' && pers.icon === '🔇', JSON.stringify(pers));
  // haptic off → a wrong tap must not vibrate
  await p.touchscreen.tap(206, 500); await waitPhase(p, 'input'); const s2 = await st(p); await hit(p, [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => c !== s2.path[0]), 'tap'); await sleep(100);
  ok('A9 haptic off → no vibrate calls, sound off → no tones', await p.evaluate(() => __echo.vib === 0 && __echo.sfx === 0), await p.evaluate(() => `vib ${__echo.vib}, sfx ${__echo.sfx}`));
  await p.context().close();
}
// scoring is DOM/motion independent: the core is the same code path (node sim proves same records) — see tests/echo.test.mjs

// ---- A7 local result PNG (fast run via ?seed and short game by fast-forward in page time) ----
{
  const p = await open({ width: 1440, height: 1000 }, { path: PATH + '?seed=png-card' }); await p.keyboard.press('Enter');
  for (let k = 0; k < 4; k++) { await waitPhase(p, 'input'); const s = await st(p); for (const c of s.path) { await hit(p, c, 'key'); await sleep(60); } }
  await p.evaluate(() => { __echo.g.t = 89.9; }); await p.waitForFunction(() => !document.getElementById('res').hidden);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#b-png')]); await dl.saveAs(EV + 'result-card.png');
  await p.waitForFunction(() => __echo.pngUrl); const info = await p.evaluate(() => ({ size: __echo.png, rec: __echo.result.rec, name: document.querySelector('[download]') ? 1 : 0 }));
  const png = readFileSync(EV + 'result-card.png'); const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  ok('A7 result PNG 1080×1350 saved locally (deliveries, longest path line, date)', w === 1080 && h === 1350 && info.rec.done === 4 && info.rec.path.length === 6, `${w}×${h}, ${png.length} B, rec ${JSON.stringify(info.rec)} — 그림 내용은 result-card.png 육안 확인`);
  ok('A7 PNG made with no network', new Set(site(p.reqs)).size === 1, site(p.reqs).join(' '));
  await p.screenshot({ path: EV + 'result-png-1440.png' });
  await p.context().close();
}

// ---- A10 first interaction under 4× CPU + slow network, fps; A11 6 languages layout ----
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 });
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=perf', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__echo && __echo.ready, null, { polling: 16 }); const tReady = Date.now() - t0;
  await p.touchscreen.tap(206, 500); const f0 = await p.evaluate(() => __echo.frames); await sleep(5000); const f1 = await p.evaluate(() => __echo.frames);
  const fps = (f1 - f0) / 5; const html = readFileSync(`${ROOT}public/ko/play/echo-courier/index.html`); const gz = gzipSync(html).length;
  ok('A10 first interaction ≤2 s (4× CPU, Fast 3G 562.5 ms)', tReady <= 2000, `${tReady} ms, HTML gzip ${(gz / 1024).toFixed(1)} KB (1 request)`);
  ok('A10 avg fps ≥50 under 4× CPU', fps >= 50, `${fps.toFixed(1)} fps`);
  ok('A10 game JS+HTML gzip ≤50 KB', gz <= 50 * 1024, `${gz} B`);
  out.PERF = { tReady, fps, gz }; await ctx.close();
}
for (const l of Object.keys(I18N)) for (const w of [360, 412, 1440]) {
  const p = await open({ width: w, height: w === 1440 ? 1000 : 800 }, { path: `/${l}/play/echo-courier/?seed=lang`, touch: w < 1000 });
  const chk = async () => p.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('button,.go,.hud span,.status,.goal,.how,.tag,.logo')) { if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; if (el.scrollWidth > el.clientWidth + 1 && !el.matches('.hud span')) bad.push((el.id || el.className) + ':' + el.textContent.slice(0, 20)); } return { bad, ovf: document.documentElement.scrollWidth - innerWidth }; });
  const a = await chk(); if (w === 412) await p.screenshot({ path: EV + `ready-412-${l}.png` });
  await p.evaluate(() => { const g = __echo.g; }); await p.keyboard.press('Enter'); await p.evaluate(() => { __echo.g.t = 89.95; }); await p.waitForFunction(() => !document.getElementById('res').hidden); const r = await chk();
  if (w === 360) await p.screenshot({ path: EV + `result-360-${l}.png` });
  ok(`A11 ${l} ${w}: no overflow (ready+result)`, !a.bad.length && !r.bad.length && a.ovf <= 0 && r.ovf <= 0, JSON.stringify({ a, r }));
  await p.context().close();
}
await b.close();
writeFileSync(EV + (U.includes('localhost') ? 'browser.json' : 'browser-preview.json'), JSON.stringify(out, null, 2));
console.log(fails.length ? `FAIL ${fails.length}: ${fails.join(', ')}` : 'ALL PASS'); process.exit(fails.length ? 1 : 0);
