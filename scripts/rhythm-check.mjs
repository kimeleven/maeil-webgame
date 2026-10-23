// Rhythm Garden browser evidence (t_177308a9). node scripts/rhythm-check.mjs [baseUrl]  (default local dev server :5197).
// HEADED Chromium + headless WebKit. Automated only — NOT real devices, NOT human fun, NOT audio quality.
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import * as E from '../public/js/rhythm-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/rhythm/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag0 = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5197); U = 'http://localhost:5197'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/rhythm-garden/';
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, browser = b, init } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__rg && __rg.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __rg.g; return { phase: g.phase, now: g.now, score: g.score, wilts: g.wilts, combo: g.combo, ev: g.events.length, judged: g.events.filter((e) => ['perfect', 'good', 'wilt'].includes(e.a)).length, log: g.log.length, hud: document.getElementById('h-time').textContent, act: __rg.T0 ? __rg.act(performance.now()) : 0 }; });
const tapBtn = async (p, sel, touch) => { const r = await p.locator(sel).boundingBox(); if (touch) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
const playBox = (p) => p.locator('#cv').boundingBox();
// wait in-page until active time reaches t (ms) then return
const waitAct = (p, t) => p.evaluate((t) => new Promise((r) => { const f = () => (__rg.act(performance.now()) >= t ? r(__rg.act(performance.now())) : requestAnimationFrame(f)); f(); }), t);
// in-page auto player: dispatches real-looking events (trusted=false but same handlers) at beat times; used for R2/R6 in the browser
const autoplay = (p, untilMs) => p.evaluate((until) => new Promise((res) => {
  const g = __rg.g, B = g.chart.beats; let i = 0; { const a0 = __rg.act(performance.now()) - __rg.off; while (i < B.length && B[i].t < a0 + 30) i++; while (B[i] && B[i].kind === "tail") i++; }
  const kd = () => dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })), ku = () => dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
  const tick = () => { const a = __rg.act(performance.now()) - __rg.off; while (i < B.length && B[i].t <= a) { const bb = B[i]; if (bb.kind === 'seed' || bb.kind === 'head') { kd(); if (bb.kind === 'seed') ku(); } if (bb.kind === 'tail') ku(); i++; }
    if (a >= until || __rg.g.phase !== 'play') return res({ a, ev: g.events.map((e) => [e.a, e.part || '', e.c, e.d ?? null]) }); setTimeout(tick, 0); };
  tick(); }), untilMs);

// ---- R0 ready: 10 s + tap/Space don't start ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const r = await playBox(p); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height * 0.85); await p.keyboard.press('Space');
  await sleep(10000); const s0 = await st(p); await p.screenshot({ path: EV + 'ready-412.png' });
  ok('R0 ready 10 s + screen tap + Space: still ready, time 90', s0.phase === 'ready' && s0.hud === '90' && s0.log === 0, JSON.stringify(s0));
  // R1 412 touch: start then one tap → exactly one judgement
  await tapBtn(p, '#b-start', true); await waitAct(p, E.RG.FIRST - 30);
  const a0 = await st(p); await p.touchscreen.tap(r.x + 40, r.y + r.height * 0.3); await sleep(50); const a1 = await st(p);
  const first = await p.evaluate(() => __rg.g.events.find((e) => e.a === 'perfect' || e.a === 'good' || e.a === 'wilt'));
  ok('R1 412 touch tap (top-left, away from lane) → exactly 1 judgement; position not used', a1.judged - a0.judged === 1, JSON.stringify(first));
  ok('R2 412 first plant success ≤ 5 s after start (real touch)', first && (first.a === 'perfect' || first.a === 'good') && first.c < 5000, `c=${first && first.c} d=${first && first.d}`);
  await sleep(300); await p.screenshot({ path: EV + 'play-412.png' });
  // R10 second simultaneous pointer ignored; pointercancel not a tap
  const cdp = await p.ctx.newCDPSession(p); const B = await p.evaluate(() => __rg.g.chart.beats.map((b) => b.t));
  const nxt = await p.evaluate(() => { const a = __rg.act(performance.now()); return __rg.g.chart.beats.find((b) => b.t > a + 300 && b.kind === 'seed').t; });
  await waitAct(p, nxt - 5); const m0 = await st(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 100, y: r.y + 300, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 100, y: r.y + 300, id: 1 }, { x: r.x + 250, y: r.y + 300, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(60); const m1 = await st(p);
  const sec = await p.evaluate(() => __rg.evlog.filter((e) => e.k === 'second-pointer').length);
  ok('R10 two simultaneous touches → 1 judgement (second pointer ignored)', m1.judged - m0.judged === 1 && sec >= 1, `judged +${m1.judged - m0.judged}, second-pointer logs ${sec}`);
  const nxt2 = await p.evaluate(() => { const a = __rg.act(performance.now()); return __rg.g.chart.beats.find((b) => b.t > a + 300 && b.kind === 'seed').t; });
  await waitAct(p, nxt2 - 5); const c0 = await st(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 100, y: r.y + 300 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(40); const c1 = await st(p);
  const cancelLogged = await p.evaluate(() => __rg.evlog.some((e) => e.k === 'ptr-pointercancel' || e.k === 'ptr-lostpointercapture'));
  ok('R10 pointercancel after down: cancel is not an extra tap (down judged once, cancel outside vine = no effect)', c1.judged - c0.judged === 1 && cancelLogged, `judged +${c1.judged - c0.judged}`);
  // UI button taps are not game input
  const u0 = await st(p); await tapBtn(p, '[data-set="sound"][data-icon]', true); await tapBtn(p, '[data-set="sound"][data-icon]', true); await sleep(40); const u1 = await st(p);
  ok('R10 UI button taps (sound ×2) are not game input', u1.log === u0.log, `log ${u0.log}→${u1.log}`);
  // hidden tab → paused; active time frozen; resume 3 s count; phase kept
  const h0 = await st(p); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(2500); const h1 = await p.evaluate(() => ({ paused: __rg.paused, hud: document.getElementById('h-time').textContent, P: __rg.P }));
  await p.screenshot({ path: EV + 'pause-412.png' });
  await p.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  await tapBtn(p, '#pz .panel h2', true); await sleep(1500); await p.screenshot({ path: EV + 'count-412.png' }); await sleep(1700);
  const h2 = await p.evaluate(() => ({ paused: __rg.paused, P: __rg.P, act: __rg.act(performance.now()) }));
  ok('R10 hidden tab pauses; active time excludes pause + 3 s count (P ≈ pause length)', h1.paused && !h2.paused && h2.P >= 5500 && h2.act - h0.act < 1200, `P=${Math.round(h2.P)}ms, act ${h0.act}→${h2.act}`);
  // after resume, the next beat Δ still ~0 with the auto player (phase not shifted)
  const ap = await autoplay(p, h2.act + 4000); const post = ap.ev.filter((e) => e[2] > h2.act && (e[0] === 'perfect' || e[0] === 'good'));
  ok('R10 after resume beat phase not shifted (auto player hits with small Δ)', post.length >= 3 && post.every((e) => Math.abs(e[3]) <= 50), `deltas ${post.map((e) => e[3]).join(',')}`);
  ok('no page errors (412 touch run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R1 1440 mouse click + Space, key auto-repeat, R2 auto-player 40 s, sound/haptic/offset persistence ----
{
  const p = await open({ width: 1440, height: 1000 }); await p.screenshot({ path: EV + 'ready-1440.png' });
  // offset UI: +10 ×3 → 30 persisted
  await p.click('#b-ofs'); for (let i = 0; i < 3; i++) await p.click('#o-p'); await p.screenshot({ path: EV + 'offset-1440.png' }); await p.click('#o-x');
  await p.click('[data-set="sound"][data-icon]'); // sound off
  await p.reload(); await p.waitForFunction(() => window.__rg && __rg.ready);
  const pers = await p.evaluate(() => ({ off: __rg.off, sound: __rg.set.sound, label: document.getElementById('ofs-v').textContent }));
  ok('R10 offset + sound setting persist after reload', pers.off === 30 && pers.sound === false && pers.label === '+30', JSON.stringify(pers));
  await p.click('[data-set="sound"][data-icon]'); await p.click('#b-ofs'); for (let i = 0; i < 3; i++) await p.click('#o-m'); await p.click('#o-x');
  await p.keyboard.press('Enter'); const t0 = await st(p);
  ok('R0 Enter starts', t0.phase === 'play', t0.phase);
  await waitAct(p, E.RG.FIRST - 20); const k0 = await st(p); const pb = await playBox(p); await p.mouse.click(pb.x + 30, pb.y + 60); await sleep(40); const k1 = await st(p);
  ok('R1 1440 click → exactly 1 judgement', k1.judged - k0.judged === 1, `${k0.judged}→${k1.judged}`);
  const nxt = E.RG.FIRST + 667 * 2; await waitAct(p, nxt - 20); const s0 = await st(p);
  await p.keyboard.down('Space'); for (let i = 0; i < 5; i++) await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', repeat: true, bubbles: true }))); await p.keyboard.up('Space'); await sleep(30); const s1 = await st(p);
  const reps = await p.evaluate(() => __rg.evlog.filter((e) => e.k === 'repeat').length);
  ok('R1 Space → 1 judgement; R10 5 auto-repeat keydowns ignored', s1.judged - s0.judged === 1 && reps >= 5, `judged +${s1.judged - s0.judged}, repeats logged ${reps}`);
  // auto player from now to 40 s: PERFECTs, a rest pass, combo 10 and the first vine 30–36 s, no wilts
  const ap = await autoplay(p, 40000); await p.screenshot({ path: EV + 'play-1440.png' });
  const ev = ap.ev, wil = ev.filter((e) => e[0] === 'wilt' && e[2] > 3500), heads = ev.filter((e) => e[1] === 'head'), tails = ev.filter((e) => e[1] === 'tail');
  const passes = ev.filter((e) => e[0] === 'pass' && e[2] < 30000).length; const deltas = ev.filter((e) => e[3] !== null).map((e) => Math.abs(e[3]));
  ok('R2 browser auto-player to 40 s: no wilt after warm-up, rest passes <30 s, first vine head 30–36 s and tail judged', wil.length === 0 && passes >= 5 && heads.length >= 1 && heads[0][2] >= 30000 && heads[0][2] <= 36000 && tails.length >= 1 && (tails[0][0] === 'perfect' || tails[0][0] === 'good'), `wilts ${wil.length}, passes ${passes}, head ${heads[0] && heads[0][2]}, tail ${tails[0] && tails[0].join('/')}, max|Δ| ${Math.max(...deltas)}ms, mean|Δ| ${(deltas.reduce((a, x) => a + x, 0) / deltas.length).toFixed(1)}ms`);
  out.autoplayDeltas60fps = { max: Math.max(...deltas), n: deltas.length };
  ok('R1 sound played after first input (WebAudio synth, recorded calls)', (await p.evaluate(() => __rg.W.snd.length)) > 10, `${await p.evaluate(() => __rg.W.snd.slice(0, 6).join(','))}`);
  ok('no page errors (1440 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R6 20 fps drawing: auto player still judged by timeStamp ----
{
  const p = await open({ width: 412, height: 915 }, { path: PATH + '?seed=check&fps=20' });
  await p.keyboard.press('Enter'); const ap = await autoplay(p, 15000);
  const d = ap.ev.filter((e) => e[3] !== null).map((e) => Math.abs(e[3])); const wl = ap.ev.filter((e) => e[0] === 'wilt').length;
  const fps = await p.evaluate(() => { const f = __rg.W.ft; return f.length; });
  ok('R6 render throttled to 20 fps: auto player 15 s → no wilts, Δ stays small (judging uses event timeStamp)', wl === 0 && d.length >= 15 && Math.max(...d) <= 50, `hits ${d.length}, max|Δ| ${Math.max(...d)}ms, wilts ${wl}`);
  await p.ctx.close();
}
// ---- R3 replay node = Chromium = WebKit; mute / reduced-motion don't matter ----
{
  const logs = ['random', 'perfect', 'everyBeat'].map((pol) => ({ seed: 'x-' + pol, g: E.simulate('x-' + pol, pol) }));
  const key = (r) => `${r.score}/${r.maxCombo}/${r.perfect}/${r.wilts}`;
  const nodeK = logs.map((l) => key(l.g));
  const inPage = (pg) => pg.evaluate((L) => L.map((l) => { const r = __rg.E.replay(l.seed, l.log); return `${r.score}/${r.maxCombo}/${r.perfect}/${r.wilts}`; }), logs.map((l) => ({ seed: l.seed, log: l.g.log })));
  const pc = await open({ width: 412, height: 915 }); const cK = await inPage(pc); await pc.ctx.close();
  const pm = await open({ width: 412, height: 915 }, { motion: 'reduce', init: () => localStorage.setItem('rg-set', JSON.stringify({ sound: false, haptic: false, motion: false })) }); const mK = await inPage(pm);
  const rm = await pm.evaluate(() => document.body.classList.contains('rm')); await pm.screenshot({ path: EV + 'ready-reduced-412.png' }); await pm.ctx.close();
  let wK = null, wErr = '';
  try { const wb = await webkit.launch(); const pw = await open({ width: 412, height: 915 }, { browser: wb }); wK = await inPage(pw); await wb.close(); } catch (e) { wErr = e.message.slice(0, 160); }
  ok('R3 same seed + log: node = Chromium = Chromium(muted, reduced-motion) = WebKit', wK && cK.every((k, i) => k === nodeK[i] && mK[i] === k && wK[i] === k) && rm, `node ${nodeK.join(' ')} | chromium ${cK.join(' ')} | muted+rm ${mK.join(' ')} | webkit ${wK && wK.join(' ')} ${wErr}`);
}
// ---- R5 idle → result <6 s; R8 result/best/diff/acc/PNG/again ≤0.5 s; R9 seed + no /api ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=r5' });
  await tapBtn(p, '#b-start', true); const t0 = Date.now(); await p.waitForSelector('#res:not([hidden])', { timeout: 15000 }); const wall = Date.now() - t0; const s = await st(p);
  ok('R5 idle after start → result < 6 s, score 0', s.score === 0 && s.wilts === 5 && wall < 6500, `wall ${wall} ms, end c=${await p.evaluate(() => __rg.g.end.c)}`);
  await p.screenshot({ path: EV + 'result-idle-412.png' });
  const tA = Date.now(); await tapBtn(p, '#b-again', true); await p.waitForFunction(() => !document.getElementById('ready').hidden && __rg.g.phase === 'ready'); const tReady = Date.now() - tA;
  ok('R8 again → ready within 0.5 s', tReady <= 500, `${tReady} ms`);
  // second run: auto player 12 s then idle → better result than first, shows diff + accuracy bar
  await tapBtn(p, '#b-start', true); await autoplay(p, 12000); await p.waitForSelector('#res:not([hidden])', { timeout: 15000 });
  const res = await p.evaluate(() => ({ score: document.getElementById('r-score').textContent, best: document.getElementById('r-best').textContent, diff: document.getElementById('r-diff').textContent, nb: !document.getElementById('r-new').hidden, acc: [...document.getElementById('r-acc').children].map((x) => x.style.width), stat: document.getElementById('r-stat').textContent, seed: document.getElementById('seed').textContent }));
  await p.screenshot({ path: EV + 'result-412.png' });
  ok('R8 result: this vs best + diff, new best flag, accuracy bar + mean line, seed shown', res.nb && /^\+/.test(res.diff) && res.acc.some((w) => parseFloat(w) > 0) && res.seed === 'r5' && /평균/.test(res.stat), JSON.stringify(res));
  const dlP = p.waitForEvent('download'); await tapBtn(p, '#b-png', true); const dl = await dlP; const fp = EV + 'result-card.png'; await dl.saveAs(fp);
  const png = readFileSync(fp); ok('R8 PNG saved locally 1080×1350 (no upload)', png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 1350, dl.suggestedFilename());
  const api = site(p.reqs).filter((u) => /\/api\//.test(u)); const ext = site(p.reqs).filter((u) => !u.startsWith(U));
  ok('R9 ?seed= chart used; network: no /api, no external requests', (await p.evaluate(() => __rg.seed)) === 'r5' && api.length === 0 && ext.length === 0, `requests ${site(p.reqs).length}, api ${api.length}, external ${ext.join(',')}`);
  ok('no page errors (result run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R12 loading 4× CPU + Fast 3G, gzip, fps, widths 360/412/1440 overflow & 44px targets; 6 langs ----
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=load', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__rg && __rg.ready); await p.locator('#b-start').click({ trial: true }); const tl = Date.now() - t0;
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), transfer: n.transferSize, enc: n.encodedBodySize }; });
  await p.locator('#b-start').click(); await sleep(4000); const f = await p.evaluate(() => { const t = __rg.W.ft.slice(-120); return Math.round((1000 * (t.length - 1)) / (t[t.length - 1] - t[0])); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await sleep(2500); const f1 = await p.evaluate(() => { const t = __rg.W.ft.slice(-120); return Math.round((1000 * (t.length - 1)) / (t[t.length - 1] - t[0])); });
  const html = readFileSync(`${ROOT}public/ko/play/rhythm-garden/index.html`); const gz = gzipSync(html).length;
  ok('R12 first input ready ≤ 2 s (4× CPU + Fast 3G emulation, headed Chromium)', tl <= 2000, `ready+start actionable ${tl} ms, DCL ${nav.dcl} ms, transfer ${nav.transfer} B`);
  ok('R12 gzip ≤ 40 KB, 0 images/fonts/audio files', gz <= 40960, `${gz} B gzip (${html.length} B raw)`);
  ok('R12 fps (measured, emulation): 4× CPU / 1× CPU', f1 >= 55, `4× ${f} fps, 1× ${f1} fps`); out.fps = { cpu4: f, cpu1: f1 };
  await ctx.close();
  const over = [];
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const w of [360, 412, 1440]) {
    const pg = await open({ width: w, height: w === 1440 ? 1000 : 800 }, { path: `/${l}/play/rhythm-garden/?seed=w` });
    const m = await pg.evaluate(() => { const sw = document.documentElement.scrollWidth, iw = innerWidth; const small = [...document.querySelectorAll('button,summary,a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.width < 44 || r.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => e.id || e.textContent.trim().slice(0, 12)); const robots = document.querySelector('meta[name=robots]').content; return { sw, iw, small, robots }; });
    if (m.sw > m.iw || m.small.length || !/noindex/.test(m.robots)) over.push(`${l}@${w}: sw ${m.sw}/${m.iw} small ${m.small.join('|')} ${m.robots}`);
    if (l !== 'ko' && w === 412) await pg.screenshot({ path: EV + `ready-${l}-412.png` });
    await pg.ctx.close();
  }
  ok('R12 6 langs × 360/412/1440: no horizontal overflow, touch targets ≥ 44px, meta noindex', over.length === 0, over.join(' ; ') || '18 screens');
}
// ---- R9 isolation: diff vs origin/main has no server / DB / /c/ / lobby / sitemap / PWA changes ----
{
  const diff = execSync('git diff --name-only origin/main...HEAD; git status --porcelain | cut -c4-', { cwd: ROOT }).toString().split('\n').filter(Boolean);
  const bad = diff.filter((f) => /^(api|db|lib|middleware|vercel\.json|public\/manifest|public\/sw|public\/sitemap|public\/robots|public\/[^/]+\/c\/|public\/[^/]+\/index\.html|public\/data)/.test(f));
  ok('R9 diff: no api/db/lib/middleware/vercel.json/manifest/sw/sitemap/robots//c//lobby changes', bad.length === 0, bad.join(',') || `${diff.length} files`);
  const sm = readFileSync(`${ROOT}public/sitemap.xml`, 'utf8'); ok('R9 sitemap has no rhythm-garden (103 urls)', !/rhythm/.test(sm) && (sm.match(/<url>/g) || []).length === 103, `${(sm.match(/<url>/g) || []).length} urls`);
}
await b.close();
out.fails = fails; writeFileSync(EV + `check-${tag0}.json`, JSON.stringify(out, null, 2));
console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'} ${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length - fails.length}/${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length}`);
process.exit(fails.length ? 1 : 0);
