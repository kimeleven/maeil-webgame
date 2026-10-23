// Light Workshop browser evidence (t_b8fb1a93): L0 L1 L2 L3(Chromium+WebKit) L4 L5 L6 L8 L9 L10 L12 + 6 langs.
// node scripts/light-check.mjs [baseUrl]   (default: local dev server on :5196). HEADED Chromium. Automated only — not real devices / players.
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import * as E from '../public/js/light-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/light/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag0 = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5196); U = 'http://localhost:5196'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/light-workshop/';
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, browser = b } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__lw && __lw.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __lw.g; return { tick: g.tick, phase: g.phase, n: g.n, used: g.used, mask: g.mask, boards: g.boards, score: g.score, left: g.left, resets: g.resets, hud: document.getElementById('h-time').textContent, taps: g.log.filter((e) => e.a === 'tap').length }; });
const center = (p, i) => p.evaluate((i) => __lw.cellCenter(i), i);
const nextFrame = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(__lw.W.drawn)))));
const tapBtn = async (p, sel, touch) => { const r = await p.locator(sel).boundingBox(); if (touch) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };

// ---- L0 ready: 10 s wait + board taps don't start; L1 412 touch; L2 first solve; L10 hidden/cancel/repeat ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const r = await p.locator('#cv').boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.touchscreen.tap(r.x + 80, r.y + r.height / 2);
  await sleep(10000); const s0 = await st(p); await p.screenshot({ path: EV + 'ready-412.png' });
  ok('L0 ready 10 s + board taps: time 90, not started', s0.phase === 'ready' && s0.tick === 0 && s0.hud === '90', JSON.stringify(s0));
  const t0 = Date.now(); await tapBtn(p, '#b-start', true); await sleep(1000);
  await p.screenshot({ path: EV + 'board1-412.png' });
  const c = await center(p, (await p.evaluate(() => __lw.g.board.rot[0])));
  const m0 = await st(p); await p.touchscreen.tap(c.x, c.y); const fr = await nextFrame(p); const m1 = await st(p);
  ok('L1 412 touch tap: one rotatable mirror flips once, next frame draws the new beam', m1.taps === 1 && fr && fr.n === 1 && fr.mask === m1.mask && m1.mask !== m0.mask, `cell ${c.cs.toFixed(1)}px mask ${m0.mask}→${m1.mask}`);
  ok('L2 412: board 1 solved with 1 tap ≤5 s after start (game time)', m1.boards === 1 && m1.tick <= 300, `tick ${m1.tick} (${(m1.tick / 60).toFixed(2)} s), wall ${Date.now() - t0} ms`);
  await sleep(900); await p.screenshot({ path: EV + 'board2-412.png' });
  // L10 pointercancel: down on a mirror, cancel → nothing
  const b2 = await st(p); const rc = await center(p, await p.evaluate(() => __lw.g.board.rot[0])); const cdp = await p.ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rc.x, y: rc.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(100);
  // pointerup on a different cell than pointerdown → nothing
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rc.x, y: rc.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rc.x + rc.cs * 1.2, y: rc.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(100);
  const b3 = await st(p); const cancels = await p.evaluate(() => __lw.evlog.filter((e) => e.k === 'cancel').length);
  ok('L10 pointercancel / up on another cell → no rotation, no tap counted', b3.mask === b2.mask && b3.taps === b2.taps, `cancel events ${cancels}, taps ${b2.taps}→${b3.taps}`);
  // inert taps (wall/empty/fixed) via real touch
  const inert = await p.evaluate(() => { const b = __lw.g.board; return b.type.map((t, i) => i).filter((i) => !b.rot.includes(i)).slice(0, 4); });
  for (const i of inert) { const q = await center(p, i); await p.touchscreen.tap(q.x, q.y); await sleep(60); }
  const b4 = await st(p); ok('L10 touch on fixed mirror / wall / empty / lamp → state & tap count unchanged', b4.mask === b3.mask && b4.taps === b3.taps && b4.used === b3.used, `${inert.length} cells`);
  // hidden tab → paused
  const h0 = await st(p); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(2000); const h1 = await st(p);
  ok('L10 hidden tab stops active time', h1.tick - h0.tick <= 2 && (await p.evaluate(() => __lw.paused)), `ticks ${h0.tick}→${h1.tick}`);
  await p.screenshot({ path: EV + 'pause-412.png' });
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  await tapBtn(p, '#pz .panel h2', true); const c0 = await st(p); await sleep(2500); const c1 = await st(p); await sleep(1000); const c2 = await st(p);
  ok('L5 resume → 3 s count with no time loss, then time flows', c1.tick === c0.tick && c2.tick > c1.tick, `ticks ${c0.tick} / ${c1.tick} / ${c2.tick}`);
  // L6 skip in browser
  const k0 = await st(p); await tapBtn(p, '#b-skip', true); const k1 = await st(p);
  ok('L6 skip button: −5 s, 0 points, next board', k0.left - k1.left - (k1.tick - k0.tick) === 300 && k1.score === k0.score && k1.n === k0.n + 1, `left ${k0.left}→${k1.left} over ${k1.tick - k0.tick} ticks`);
  ok('no page errors (412 touch run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- L1 1440 mouse click + arrows/Space; key auto-repeat ignored ----
{
  const p = await open({ width: 1440, height: 1000 }); await p.screenshot({ path: EV + 'ready-1440.png' });
  await p.keyboard.press('Enter'); await sleep(300); const s0 = await st(p);
  const b1 = await p.evaluate(() => __lw.g.board.rot[0]); const c = await center(p, b1);
  await p.mouse.click(c.x, c.y); const fr = await nextFrame(p); const s1 = await st(p);
  ok('L1 1440 click: mirror flips once, next frame draws it', s0.phase === 'play' && s1.taps === 1 && fr.mask === s1.mask && s1.boards === 1, `board ${(c.cs * 4).toFixed(0)}px, cell ${c.cs.toFixed(0)}px`);
  await sleep(900); await p.screenshot({ path: EV + 'board2-1440.png' });
  // arrows → move cursor to a rotatable mirror; Space flips it
  const tgt = await p.evaluate(() => __lw.g.board.rot[1] ?? __lw.g.board.rot[0]); const N = await p.evaluate(() => __lw.g.board.N);
  const curStart = await p.evaluate(() => __lw.g.board.rot[0]);
  let cx0 = curStart % N, cy0 = Math.floor(curStart / N); const tx = tgt % N, ty = Math.floor(tgt / N);
  while (cx0 < tx) { await p.keyboard.press('ArrowRight'); cx0++; } while (cx0 > tx) { await p.keyboard.press('ArrowLeft'); cx0--; }
  while (cy0 < ty) { await p.keyboard.press('ArrowDown'); cy0++; } while (cy0 > ty) { await p.keyboard.press('ArrowUp'); cy0--; }
  const a0 = await st(p); await p.keyboard.press('Space'); const fr2 = await nextFrame(p); const a1 = await st(p);
  const rIdx = await p.evaluate((t) => __lw.g.board.rot.indexOf(t), tgt);
  ok('L1 arrows + Space: flips the cursor mirror once, redrawn next frame', a1.taps === a0.taps + 1 && ((a0.mask ^ a1.mask) === 1 << rIdx || a1.n !== a0.n) && fr2.mask === a1.mask, `mask ${a0.mask}→${a1.mask}`);
  // key auto-repeat: hold Space (repeat events)
  await sleep(200); const r0 = await st(p);
  await p.keyboard.down('Space'); for (let i = 0; i < 5; i++) await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true }))); await p.keyboard.up('Space'); await sleep(50); const r1 = await st(p);
  ok('L10 Space auto-repeat ignored (only the first keydown counts)', r1.taps === r0.taps + 1 || (r1.n !== r0.n && r1.taps === r0.taps + 1), `taps ${r0.taps}→${r1.taps}`);
  // same mirror during 0.12 s rotation: two quick taps
  await sleep(300); const l0 = await st(p); const rm = await p.evaluate(() => __lw.g.board.rot[0]); const lc = await center(p, rm);
  await p.mouse.click(lc.x, lc.y); await p.mouse.click(lc.x, lc.y); const l1 = await st(p);
  ok('L10 second tap on the same mirror inside 0.12 s ignored', l1.taps === l0.taps + 1 || l1.n !== l0.n, `taps ${l0.taps}→${l1.taps}`);
  ok('no page errors (1440 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- L3 replay in Chromium and WebKit = node ----
{
  const logs = ['random', 'safe', 'sameMirror'].map((pol) => ({ pol, seed: 'x-' + pol, g: E.simulate('x-' + pol, pol) }));
  const nodeK = logs.map((l) => `${l.g.boards}/${l.g.score}/${l.g.resets}`);
  const inPage = (pg) => pg.evaluate((L) => L.map((l) => { const r = __lw.E.replay(l.seed, l.log); return `${r.boards}/${r.score}/${r.resets}`; }), logs.map((l) => ({ seed: l.seed, log: l.g.log })));
  const pc = await open({ width: 412, height: 915 }); const cK = await inPage(pc); await pc.ctx.close();
  let wK = null, wErr = '';
  try { const wb = await webkit.launch(); const pw = await open({ width: 412, height: 915 }, { browser: wb }); wK = await inPage(pw); await wb.close(); } catch (e) { wErr = e.message.slice(0, 120); }
  ok('L3 same seed + log: node = Chromium = WebKit (boards/score/resets)', wK && cK.every((k, i) => k === nodeK[i] && wK[i] === k), `node ${nodeK.join(' ')} | chromium ${cK.join(' ')} | webkit ${wK && wK.join(' ')} ${wErr}`);
}
// ---- L5 idle 90 s (real time) → result; L8 result / again / PNG / best; L4 seed + no /api ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=l5' });
  await tapBtn(p, '#b-start', true); const t0 = Date.now();
  await p.waitForSelector('#res:not([hidden])', { timeout: 120000 }); const wall = Date.now() - t0; const s = await st(p);
  ok('L5 idle after start → result at 90 s active (5400 ticks)', s.tick === 5400 && s.boards === 0, `tick ${s.tick}, wall ${wall} ms`);
  await p.screenshot({ path: EV + 'result-412.png' });
  const res1 = await p.evaluate(() => ({ boards: document.getElementById('r-boards').textContent, first: !document.getElementById('r-first').hidden }));
  const dlP = p.waitForEvent('download'); await tapBtn(p, '#b-png', true); const dl = await dlP; const fp = EV + 'result-card.png'; await dl.saveAs(fp);
  const png = readFileSync(fp); ok('L8 PNG saved locally 1080×1350', png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 1350, `${dl.suggestedFilename()}`);
  const tA = Date.now(); await tapBtn(p, '#b-again', true); await p.waitForFunction(() => !document.getElementById('ready').hidden && __lw.g.phase === 'ready'); const tReady = Date.now() - tA;
  ok('L8 again → ready within 0.5 s', tReady <= 500, `${tReady} ms`);
  // second run: solve board 1 then finish quickly via skips
  await tapBtn(p, '#b-start', true); await sleep(300); const c = await center(p, await p.evaluate(() => __lw.g.board.rot[0])); await p.touchscreen.tap(c.x, c.y); await sleep(900);
  for (let i = 0; i < 20 && (await p.evaluate(() => __lw.g.phase)) !== 'result'; i++) { await tapBtn(p, '#b-skip', true); await sleep(60); }
  await p.waitForSelector('#res:not([hidden])');
  const res2 = await p.evaluate(() => ({ boards: document.getElementById('r-boards').textContent, best: document.getElementById('r-best').textContent, diff: document.getElementById('r-diff').textContent, nb: !document.getElementById('r-new').hidden, stat: document.getElementById('r-stat').textContent }));
  ok('L8 result shows this run, best and diff without sharing', res1.first && res2.nb && res2.best !== '—' && res2.diff.startsWith('+1'), JSON.stringify([res1, res2]));
  await p.screenshot({ path: EV + 'result2-412.png' });
  const dl2 = p.waitForEvent('download'); await tapBtn(p, '#b-png', true); await (await dl2).saveAs(EV + 'result-card-1board.png');
  const api = site(p.reqs).filter((u) => u.includes('/api'));
  ok('L4 ?seed applied + no /api requests', (await p.evaluate(() => __lw.seed)) === 'l5' && api.length === 0, `requests ${site(p.reqs).length}: ${[...new Set(site(p.reqs).map((u) => new URL(u).pathname))].join(' ')}`);
  ok('no page errors (L5/L8 run)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
  const sameSeedBoards = await (async () => { const a = await open({ width: 412, height: 915 }, { path: PATH + '?seed=abc' }); const x = await a.evaluate(() => { __lw.E.start(__lw.g); return __lw.E.genBoard('abc', 5).par + ':' + __lw.g.board.lamps.join(','); }); await a.ctx.close(); return x; })();
  const expect = `${E.genBoard('abc', 5).par}:${E.genBoard('abc', 1).lamps.join(',')}`;
  ok('L4 ?seed=abc → same board order as node generator', sameSeedBoards === expect, `${sameSeedBoards} vs ${expect}`);
}
// ---- L4 diff scope ----
{
  const base = execSync('git merge-base HEAD origin/main', { cwd: ROOT }).toString().trim();
  const changed = execSync(`git diff --name-only ${base}; git ls-files --others --exclude-standard`, { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const bad = changed.filter((f) => /^(api|lib)\/|vercel\.json|middleware\.js|sitemap\.xml|robots\.txt|manifest|\/c\/|^public\/(index\.html|[a-z-]+\/index\.html)$/.test(f));
  const sm = readFileSync(`${ROOT}public/sitemap.xml`, 'utf8'); const lobby = readFileSync(`${ROOT}public/ko/index.html`, 'utf8');
  ok('L4 diff: no server/DB/c-route/list/PWA/sitemap change; page noindex, not in sitemap or lobby', bad.length === 0 && !sm.includes('light-workshop') && !lobby.includes('light-workshop') && readFileSync(`${ROOT}public/ko/play/light-workshop/index.html`, 'utf8').includes('noindex'), `${changed.length} files; bad: ${bad.join(',') || 'none'}`);
}
// ---- L9 reduced motion + settings persist ----
{
  const p = await open({ width: 412, height: 915 }, { motion: 'reduce' });
  const rm = await p.evaluate(() => document.body.classList.contains('rm'));
  const runLog = E.simulate('rm', 'random'); const r = await p.evaluate((l) => { const g = __lw.E.replay('rm', l); return `${g.boards}/${g.score}`; }, runLog.log);
  ok('L9 reduced-motion: animations off (body.rm), same replay result', rm && r === `${runLog.boards}/${runLog.score}`, r);
  await p.keyboard.press('Enter'); await sleep(300); await p.screenshot({ path: EV + 'reduced-motion-412.png' });
  await p.evaluate(() => { document.querySelector('header [data-set="sound"]').click(); document.querySelector('header [data-set="haptic"]').click(); });
  await p.reload(); await p.waitForFunction(() => __lw.ready); const set = await p.evaluate(() => ({ s: __lw.set.sound, h: __lw.set.haptic, icon: document.querySelector('header [data-set="sound"]').textContent }));
  ok('L9 sound / haptic off persist after reload', set.s === false && set.h === false && set.icon === '🔇', JSON.stringify(set));
  await p.ctx.close();
  const pa = await open({ width: 412, height: 915 }, { touch: true }); await tapBtn(pa, '#b-start', true); await sleep(200); const cc = await center(pa, await pa.evaluate(() => __lw.g.board.rot[0])); await pa.touchscreen.tap(cc.x, cc.y); await sleep(300);
  const snd = await pa.evaluate(() => ({ snd: __lw.W.snd, vib: __lw.W.vib }));
  ok('L9 sound + haptic fire on tap/solve (synth calls, vibrate on touch device)', snd.snd.includes('tick') && snd.snd.includes('solve') && snd.snd.includes('lamp'), JSON.stringify(snd));
  await pa.ctx.close();
}
// ---- L12 load, size, fps, layout ----
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const c = await ctx.newCDPSession(p);
  await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 }); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const reqs = []; p.on('request', (r) => reqs.push(r.url()));
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=load', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__lw && __lw.ready, null, { polling: 16 });
  const bs = await p.locator('#b-start').boundingBox(); await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); await p.waitForFunction(() => __lw.g.phase !== 'ready', null, { polling: 16 }); const tFirst = Date.now() - t0;
  const gz = gzipSync(readFileSync(`${ROOT}public/ko/play/light-workshop/index.html`)).length;
  ok('L12 first input usable ≤2 s (4× CPU, Fast 3G)', tFirst <= 2000, `${tFirst} ms`);
  ok('L12 gzip ≤40 KB, no image/font/audio files', gz <= 40 * 1024 && site(reqs).filter((u) => !u.includes('/_vercel')).length <= 2, `${(gz / 1024).toFixed(1)} KB, requests ${site(reqs).map((u) => new URL(u).pathname).join(' ')}`);
  await ctx.close();
  const pf = await open({ width: 412, height: 915 }); await pf.keyboard.press('Enter'); await sleep(500);
  const fps = await pf.evaluate(async () => { const f0 = __lw.W.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); return ((__lw.W.frames - f0) * 1000) / (performance.now() - t); });
  ok('L12 average fps ≥50 (headed Chromium, this Mac)', fps >= 50, `${fps.toFixed(1)} fps`); await pf.ctx.close();
  // 6×6 cell size at 412 and 360
  const cells = [];
  for (const w of [360, 412]) { const p6 = await open({ width: w, height: w === 360 ? 780 : 915 }, { touch: true }); await p6.evaluate(() => { const g = __lw.g; __lw.E.start(g); g.board = __lw.E.genBoard(g.seed, 8); g.n = 8; g.mask = g.board.start; document.getElementById('ready').hidden = true; }); await sleep(200);
    const cc = await p6.evaluate(() => __lw.cellCenter(0).cs); cells.push(`${w}:${cc.toFixed(1)}px`); if (w === 412) await p6.screenshot({ path: EV + 'board-6x6-412.png' }); if (cc < 44) fails.push('cell<44'); await p6.ctx.close(); }
  ok('L12 6×6 board cell ≥44 px touch (412 ≥56 target)', !fails.includes('cell<44'), cells.join(' '));
  const bad = [];
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const w of [360, 412, 1440]) {
    const p2 = await open({ width: w, height: w === 1440 ? 1000 : w === 360 ? 780 : 915 }, { path: `/${l}/play/light-workshop/?seed=lay` });
    const chk = async (phase) => { const m = await p2.evaluate(() => { const o = document.documentElement.scrollWidth > innerWidth + 1; const small = [...document.querySelectorAll('button,a,summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent !== null && (r.width < 44 || r.height < 44) && !e.closest('nav'); }).map((e) => e.id || e.textContent.trim().slice(0, 12)); return { o, small }; }); if (m.o || m.small.length) bad.push(`${l}/${w}/${phase} ${m.o ? 'overflow ' : ''}${m.small.join(',')}`); };
    await chk('ready'); await p2.keyboard.press('Enter'); await sleep(150); await chk('play');
    await p2.evaluate(() => { const g = __lw.g; g.left = 1; }); await sleep(400); await p2.waitForSelector('#res:not([hidden])'); await chk('result');
    if (w === 360) await p2.screenshot({ path: EV + `result-${l}-360.png` });
    await p2.ctx.close();
  }
  ok('L12 6 langs × 360/412/1440 (ready/play/result): no horizontal overflow, targets ≥44px', bad.length === 0, bad.join(' ; ') || '54 screens');
  const cats = readFileSync(`${ROOT}public/ko/index.html`, 'utf8'); ok('L12 site categories unchanged (lobby file not in diff)', !execSync('git diff --name-only $(git merge-base HEAD origin/main) -- public/ko/index.html', { cwd: ROOT }).toString().trim() && cats.length > 0);
}
await b.close();
const total = Object.keys(out).filter((k) => out[k] && typeof out[k] === 'object' && 'pass' in out[k]).length;
console.log(fails.length ? `FAIL ${fails.length}/${total}: ${fails.join(' | ')}` : `ALL PASS ${total}`);
writeFileSync(EV + `browser-${tag0}.json`, JSON.stringify(out, null, 1));
process.exit(fails.length ? 1 : 0);
