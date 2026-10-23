// Sort Rail browser evidence (t_3f092e76). node scripts/sort-check.mjs [baseUrl] [--webkit]
// Chromium (default) or WebKit. Automated emulation only — NOT real devices, NOT human fun, NOT audio/haptic quality.
import { chromium, webkit } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as E from '../public/js/sort-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/sort/`; mkdirSync(EV, { recursive: true });
const args = process.argv.slice(2); const WK = args.includes('--webkit'); let U = args.find((a) => !a.startsWith('--'));
const tag0 = (U ? 'preview' : 'local') + (WK ? '-webkit' : '');
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5199); U = 'http://localhost:5199'; }
const out = { base: U, browser: WK ? 'webkit' : 'chromium', at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const PATH = (l = 'ko', s = 'check') => `/${l}/play/sort-rail/?seed=${s}`;
const B = await (WK ? webkit : chromium).launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
async function open(vp, { touch = false, path = PATH(), motion } = {}) {
  const ctx = await B.newContext({ viewport: vp, hasTouch: touch, isMobile: touch && !WK, acceptDownloads: true, reducedMotion: motion || 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  await ctx.route(/vercel\.live/, (r) => r.abort()); // Vercel preview-only feedback toolbar: not the game, absent in production (its WebKit keydown handler throws on window targets)
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__sr && __sr.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __sr.g, c = g.cur; return { phase: g.phase, k: g.k, correct: g.correct, judged: g.judged, score: g.score, log: g.log.length, hud: document.getElementById('h-time').textContent, paused: __sr.paused, G: g.phase === 'ready' ? 0 : __sr.gt(), s: c && c.s, ans: c && c.ans, pend: !!(c && c.pend), notice: !!__sr.notice, last: g.log.at(-1) }; });
// wait until the current parcel is visible (game clock ≥ its start) and press its answer by key (synthetic, same task)
const waitShown = (p, ms = 8000) => p.waitForFunction(() => { const g = __sr.g, c = g.cur; return g.phase === 'wait' && c && !c.pend && !__sr.frozen && __sr.gt() >= c.s + 5; }, null, { timeout: ms });
const key = (p, k) => p.evaluate((k) => dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
const ARROW = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];
async function answer(p, wrong = false) { await waitShown(p); const a = await p.evaluate(() => __sr.g.cur.ans); await key(p, ARROW[wrong ? (a + 1) % 3 : a]); }

// ---- R0 / R1 / R1b / R2 (412 touch) ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const r = await p.locator('#play').boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height * 0.8); await p.tap('.rail[data-lane="1"]');
  await sleep(10000); const s0 = await st(p); await p.screenshot({ path: EV + 'ready-412.png' });
  ok('R0 ready: 10 s + screen/rail tap → still ready, clock 90, no parcel', s0.phase === 'ready' && s0.hud === '90' && s0.log === 0 && await p.locator('#parcel').isHidden(), JSON.stringify(s0));
  await p.keyboard.down('Enter'); for (let i = 0; i < 6; i++) { await p.keyboard.down('Enter'); await sleep(40); } await p.keyboard.up('Enter');
  const s1 = await st(p); ok('R1b ready Enter (+ held repeat) → start only, no choice', s1.phase === 'wait' && s1.log === 0 && !s1.pend, JSON.stringify(s1));
  await waitShown(p); await p.keyboard.press('Enter'); const s2 = await st(p); ok('R1b wait Enter → nothing', !s2.pend && s2.log === 0, JSON.stringify(s2));
  await sleep(200); await p.screenshot({ path: EV + 'tutorial-412.png' });
  const tg = await p.evaluate(() => __sr.gt()); await p.tap('.rail[data-lane="1"]');
  await p.waitForFunction(() => __sr.g.log.length >= 1); const s3 = await st(p);
  ok('R2 real tap ↓ (center) → parcel 1 correct < 5 s after start', s3.last.res === 'ok' && s3.last.t0 < 5000, `t0=${s3.last.t0?.toFixed(0)} tapAt≈${tg.toFixed(0)}`);
  await sleep(60); await p.screenshot({ path: EV + 'judge-ok-412.png' });
  const evs = await p.evaluate(() => __sr.evlog.filter((e) => e.k === 'in' || e.k === 'commit').map((e) => ({ k: e.k, at: e.at ?? e.e.commitAt, src: e.src, t: e.t, ca: e.e && e.e.commitAt })));
  const inE = evs.find((e) => e.k === 'in'), cE = evs.find((e) => e.k === 'commit');
  ok('R6b feedback commit after receive deadline (commitAt = max(t0+W+G, arrival)), one sound per commit', cE && Math.abs(cE.ca - Math.max(inE.t + 66, inE.at)) < 1e-6 && (await p.evaluate(() => __sr.W.snd.length)) === 1, JSON.stringify({ inE, cE }));
  // R1b hold ↓ through parcel 2 (ans L): first keydown only → parcel 2 wrong(C), parcel 3 missed (repeat ignored)
  await waitShown(p); await p.keyboard.down('ArrowDown'); for (let i = 0; i < 60; i++) { await p.keyboard.down('ArrowDown'); await sleep(50); } await p.keyboard.up('ArrowDown');
  await p.waitForFunction(() => __sr.g.log.length >= 2); const L2 = await p.evaluate(() => __sr.g.log.slice(1, 3).map((e) => [e.k, e.res, e.lane]));
  const reps = await p.evaluate(() => __sr.evlog.filter((e) => e.k === 'repeat').length);
  ok('R1b hold ↓ 3 s → only first keydown used (parcel 2 C), repeats ignored, next not fed', L2[0][2] === 1 && reps > 20 && (!L2[1] || L2[1][1] !== 'ok' || L2[1][2] !== 1), JSON.stringify({ L2, reps }));
  p.errsAll = p.errs; out.errors412 = p.errs; await p.ctx.close();
}
// ---- R1 1440 mouse click + keyboard all map to same judge ----
{
  const p = await open({ width: 1440, height: 1000 });
  await p.click('#b-start'); await waitShown(p); await p.click('.rail[data-lane="1"]'); await p.waitForFunction(() => __sr.g.log.length >= 1);
  await waitShown(p); await p.keyboard.press('ArrowLeft'); await p.waitForFunction(() => __sr.g.log.length >= 2);
  await waitShown(p); await p.keyboard.press('ArrowRight'); await p.waitForFunction(() => __sr.g.log.length >= 3);
  const L = await p.evaluate(() => __sr.g.log.map((e) => [e.res, e.lane]));
  const src = await p.evaluate(() => __sr.evlog.filter((e) => e.k === 'in').map((e) => e.src[0] + e.tag[0]));
  ok('R1 1440 click ↓ + keys ← → → C,L,R choices via the same input()', JSON.stringify(L) === '[["ok",1],["ok",0],["ok",2]]', JSON.stringify({ L, src }));
  await sleep(300); await p.screenshot({ path: EV + 'play-1440.png' });
  // R6 synthetic two inputs in the same task (Δ<16ms) → both void, parcel still waiting
  await waitShown(p); const k0 = await p.evaluate(() => __sr.g.k);
  await p.evaluate(() => { dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); });
  await sleep(150); const v = await p.evaluate(() => ({ k: __sr.g.k, voids: __sr.g.cur.voids, log: __sr.g.log.length, tags: __sr.evlog.filter((e) => e.k === 'in').slice(-2).map((e) => e.tag) }));
  ok('R6 two inputs within 16 ms → both void, same parcel waiting, no commit', v.k === k0 && v.voids === 2 && v.log === 3 && v.tags.join() === 'pending,void', JSON.stringify(v));
  // R6 pause while pending: freeze, input while paused dropped, resume → commit with t0
  await answer(p); const before = await p.evaluate(() => __sr.g.log.length);  // finish the waiting parcel (fresh press)
  await p.waitForFunction((n) => __sr.g.log.length > n, before); await waitShown(p);
  const pr = await p.evaluate(() => { const a = __sr.g.cur.ans; dispatchEvent(new KeyboardEvent('keydown', { key: ['ArrowLeft', 'ArrowDown', 'ArrowRight'][a] })); dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); return { t0: __sr.g.cur.pend && __sr.g.cur.pend.t, G: __sr.gt(), n: __sr.g.log.length }; });
  await sleep(700); await key(p, 'ArrowLeft'); const mid = await p.evaluate(() => ({ G: __sr.gt(), n: __sr.g.log.length, paused: __sr.paused, drop: __sr.evlog.at(-1), hid: getComputedStyle(document.querySelector('#p-sym')).visibility }));
  await p.screenshot({ path: EV + 'paused-1440.png' }); await p.keyboard.press('Enter'); await p.waitForFunction((n) => __sr.g.log.length > n, pr.n);
  const after = await p.evaluate(() => __sr.g.log.at(-1));
  ok('R6/R10 pause during W: clock frozen, symbol hidden, paused input dropped, resume → t0 committed', mid.paused && Math.abs(mid.G - pr.G) < 1 && mid.n === pr.n && mid.drop.k === 'in-dropped' && mid.hid === 'hidden' && after.t0 === pr.t0 && after.res === 'ok', JSON.stringify({ pr, mid, after: [after.res, after.t0] }));
  // R4b: drive to parcel 25 → notice once, clock frozen 1.5 s, rule strip gains !→↓, no "!" before 25
  for (let i = 0; i < 40; i++) { const k = await p.evaluate(() => __sr.g.k); if (k >= 25) break; await answer(p); await p.waitForFunction((k) => __sr.g.k > k || __sr.notice, k, { timeout: 8000 }); }
  await p.waitForFunction(() => __sr.notice, null, { timeout: 8000 });
  const n0 = await p.evaluate(() => ({ G: __sr.gt(), s: __sr.g.cur.s, hud: document.getElementById('h-time').textContent, k: __sr.g.k })); await p.screenshot({ path: EV + 'notice-1440.png' });
  await key(p, 'ArrowDown'); await sleep(1000); const n1 = await p.evaluate(() => ({ G: __sr.gt(), notice: !!__sr.notice, pend: !!__sr.g.cur.pend }));
  await p.waitForFunction(() => !__sr.notice, null, { timeout: 3000 }); const n2 = await p.evaluate(() => ({ notices: __sr.evlog.filter((e) => e.k === 'notice').length, ends: __sr.evlog.filter((e) => e.k === 'notice' || e.k === 'notice-end').map((e) => e.at), rb: !document.getElementById('rule-b').hidden, bangBefore: __sr.g.log.filter((e) => e.k < 25).length }));
  const dur = n2.ends[1] - n2.ends[0];
  ok('R4b notice before parcel 25 exactly once, game clock frozen at s, input during notice dropped, ~1.5 s', n0.k === 25 && n0.G === n0.s && n1.G === n0.s && n1.notice && !n1.pend && n2.notices === 1 && dur >= 1490 && dur < 1700 && n2.rb, JSON.stringify({ n0, n1, n2, dur }));
  const blocks = await p.evaluate(() => { const g = __sr.g; return [...g.blocks.entries()].map(([b, r]) => [b, r.block.map((x) => [x.k, x.bang])]); });
  ok('R4b no "!" parcel before 25 (blocks in this game)', blocks.every(([, bl]) => bl.every(([k, bang]) => k >= 25 || !bang)), '');
  await waitShown(p); await sleep(150); await p.screenshot({ path: EV + 'rule-b-1440.png' });
  // R9 same seed → same parcels as node generate
  const same = await p.evaluate(() => JSON.stringify([...__sr.g.blocks.values()].slice(0, 3).map((r) => r.block)));
  let prev = [0, 2], nb = []; for (let b = 0; b < 3; b++) { const r = E.generate('check', b, prev); nb.push(r.block); prev = r.block.slice(-2).map((x) => x.ans); }
  ok('R9/R3 ?seed=check parcels == node generate (same order)', same === JSON.stringify(nb), '');
  ok('R9 no /api or external request', site(p.reqs).every((u) => u.startsWith(U) && !u.includes('/api')), site(p.reqs).filter((u) => !u.startsWith(U) || u.includes('/api')).join(' '));
  // R10 hidden tab → pause; blur → pause
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const h = await p.evaluate(() => ({ paused: __sr.paused, why: __sr.evlog.filter((e) => e.k === 'pause').at(-1).why, G: __sr.gt() })); await sleep(500); const h2 = await p.evaluate(() => __sr.gt());
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); }); await p.click('#b-resume');
  await p.evaluate(() => dispatchEvent(new Event('blur'))); const bl = await p.evaluate(() => ({ paused: __sr.paused, why: __sr.evlog.filter((e) => e.k === 'pause').at(-1).why })); await p.click('#b-resume');
  ok('R10 hidden → pause (clock stops), blur → pause, resume continues', h.paused && h.why === 'hidden' && Math.abs(h2 - h.G) < 1 && bl.paused && bl.why === 'blur', JSON.stringify({ h, h2, bl }));
  // R8 restart from pause → ready, best untouched
  await p.click('#b-pause'); await p.click('#b-restart'); const rs = await p.evaluate(() => ({ phase: __sr.g.phase, best: localStorage.getItem('sr-best') }));
  ok('R8 [처음부터] → ready, best not written', rs.phase === 'ready' && rs.best === null, JSON.stringify(rs));
  // settings persist
  await p.click('.ic[data-set="sound"]'); await p.reload(); await p.waitForFunction(() => window.__sr && __sr.ready);
  const ss = await p.evaluate(() => ({ sound: __sr.set.sound, btn: document.querySelector('.ic[data-set="sound"]').textContent })); await p.click('.ic[data-set="sound"]');
  ok('R10 mute persists after reload', ss.sound === false && ss.btn === '🔇', JSON.stringify(ss));
  // grayscale screenshot evidence: symbols + ✓/✕ glyphs remain
  await p.click('#b-start'); await p.addStyleTag({ content: 'html{filter:grayscale(1)}' }); await answer(p, true);
  const gs = await (await p.waitForFunction(() => { const o = document.querySelector('.rail.ok'), b = document.querySelector('.rail.bad'); return o && b && { rails: [...document.querySelectorAll('.rail i')].map((x) => x.textContent), okMark: getComputedStyle(o, '::after').content, badMark: getComputedStyle(b, '::after').content }; }, null, { timeout: 3000 })).jsonValue();
  await p.screenshot({ path: EV + 'grayscale-1440.png' });
  ok('R10 grayscale: wrong answer shows ✕ on chosen + ✓ on correct rail (glyphs), rail symbols as text', gs && gs.rails.every((x) => x.length === 1) && gs.okMark.includes('✓') && gs.badMark.includes('✕'), JSON.stringify(gs));
  out.errors1440 = p.errs; ok('no page errors (412/1440 flows)', p.errs.length === 0, p.errs.join(' | ')); await p.ctx.close();
}
// ---- reduced motion ----
{
  const p = await open({ width: 412, height: 915 }, { motion: 'reduce' }); await p.click('#b-start'); await waitShown(p);
  const rm = await p.evaluate(() => ({ rm: document.body.classList.contains('rm'), anim: document.getElementById('parcel').classList.contains('in') }));
  ok('R10 reduced motion: no slide-in animation', rm.rm && !rm.anim, JSON.stringify(rm)); await p.ctx.close();
}
// ---- R5 / R8 / R12 overflow: 6 languages idle full games in parallel (90 s), result panel at 360 ----
{
  const pages = await Promise.all(LANGS.map((l) => open({ width: 360, height: 780 }, { touch: true, path: PATH(l, 'idle') })));
  const t0 = Date.now(); await Promise.all(pages.map((p) => p.click('#b-start')));
  await Promise.all(pages.map((p) => p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 120000 })));
  const wall = Date.now() - t0; const ko = pages[0];
  const r = await ko.evaluate(() => ({ nz: (() => { const a = __sr.evlog.filter((e) => e.k === 'notice' || e.k === 'notice-end').map((e) => e.at); return a.length === 2 ? a[1] - a[0] : 0; })(), end: __sr.g.end, score: __sr.g.score, correct: __sr.g.correct, resAt: __sr.evlog.find((e) => e.k === 'result').at, startAt: __sr.evlog.find((e) => e.k === 'start').at, dots: document.getElementById('r-dots').textContent }));
  const lag = r.resAt - r.startAt - 90050 - r.nz;
  ok('R5 idle: result at logical 90 s + G, 0 correct 0 pts (display lag recorded)', r.end.at === 90050 && r.score === 0 && r.correct === 0 && lag >= -1 && lag < 200, JSON.stringify({ end: r.end, lag: +lag.toFixed(1), notice: +r.nz.toFixed(1), wall }));
  for (const [i, p] of pages.entries()) { await p.screenshot({ path: `${EV}result-${LANGS[i]}-360.png` }); }
  const ov = await Promise.all(pages.map((p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, small: [...document.querySelectorAll('#res button:not([hidden]), .rail, .ic:not([hidden])')].filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44)).map((b) => b.id || b.className) }))));
  ok('R12 360 result: no horizontal overflow, targets ≥ 44 px (6 languages)', ov.every((o) => o.sw <= o.w && o.small.length === 0), JSON.stringify(ov));
  // R8: again → ready < 0.5 s; PNG download local only
  const dl = ko.waitForEvent('download'); await ko.click('#b-png'); const d = await dl; await d.saveAs(EV + 'result-card.png');
  const t = await ko.evaluate(async () => { const a = performance.now(); document.getElementById('b-again').click(); await new Promise(requestAnimationFrame); return { ms: performance.now() - a, phase: __sr.g.phase, ready: !document.getElementById('ready').hidden }; });
  ok('R8 result visible without sharing; PNG local download; [다시] → ready < 0.5 s', d.suggestedFilename() === 'sort-rail-idle.png' && t.ms < 500 && t.phase === 'ready' && t.ready, JSON.stringify({ file: d.suggestedFilename(), t }));
  ok('R9 idle pages: no /api request (6 langs)', pages.every((p) => site(p.reqs).every((u) => !u.includes('/api'))), '');
  ok('no page errors (6 lang idle)', pages.every((p) => p.errs.length === 0), pages.map((p) => p.errs.join('|')).join(' '));
  await Promise.all(pages.map((p) => p.ctx.close()));
}
// ---- R12 layout: 360/412/1440 × 6 langs ready + play, no overflow ----
{
  const rows = [];
  for (const vp of [{ width: 360, height: 740 }, { width: 412, height: 915 }, { width: 1440, height: 1000 }]) for (const l of LANGS) {
    const p = await open(vp, { path: PATH(l) }); const a = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth + [...document.querySelectorAll('.top *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).length * 1e4, w: innerWidth }));
    await p.click('#b-start'); await waitShown(p); const b = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, rails: [...document.querySelectorAll('.rail')].map((r) => [Math.round(r.getBoundingClientRect().width), Math.round(r.getBoundingClientRect().height)]) }));
    if (l === 'ko' || l === 'pt-br') await p.screenshot({ path: `${EV}play-${l}-${vp.width}.png` });
    rows.push({ l, w: vp.width, ready: a.sw <= a.w, play: b.sw <= b.w, rails: b.rails }); await p.ctx.close();
  }
  ok('R12 360/412/1440 × 6 langs: no horizontal overflow (incl. header items), rails ≥ 64 px tall & ≥ 44 px wide', rows.every((r) => r.ready && r.play && r.rails.every(([w, h]) => w >= 44 && h >= 64)), JSON.stringify(rows.filter((r) => !(r.ready && r.play)).concat(rows.filter((r) => r.w === 360).slice(0, 1))));
}
// ---- R12 size / load / fps (Chromium only: CDP throttling) ----
{
  const html = await (await fetch(U + PATH('ko'))).text(); const gz = gzipSync(Buffer.from(html)).length;
  ok('R12 page gzip ≤ 30 KB (single HTML, 0 images/fonts/audio files)', gz <= 30 * 1024, `${gz} B gzip, ${html.length} B raw`);
  if (!WK) {
    const HB = await chromium.launch({ headless: false, args: ['--window-position=0,0'] }); const p0 = await HB.newContext({ viewport: { width: 412, height: 915 } }); const p = await p0.newPage(); const c = await p0.newCDPSession(p);
    await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 });
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await p.route(/vercel\.live|\/\.well-known\/vercel/, (r) => r.abort()); /* Vercel preview-only feedback toolbar (not part of the game, absent in production) */ const reqs = []; p.on('request', (r) => reqs.push(r.url()));
    const t0 = Date.now(); await p.goto(U + PATH('ko', 'load')); await p.waitForFunction(() => window.__sr && __sr.ready); const tReady = Date.now() - t0;
    await p.click('#b-start'); await p.waitForFunction(() => __sr.g.phase === 'wait' && !document.getElementById('parcel').hidden); const tStart = Date.now() - t0;
    const f0 = await p.evaluate(() => __sr.W.frames); await sleep(3000); const f1 = await p.evaluate(() => __sr.W.frames);
    const fps = (f1 - f0) / 3; const gen = await p.evaluate(() => Math.max(...__sr.g.genMs));
    ok('R12 Fast 3G + 4× CPU: [시작] response ≤ 2 s from navigation, requests = 1 document (Vercel preview toolbar blocked)', tStart <= 2000 && site(reqs).length === 1, JSON.stringify({ tReady, tStart, reqs: site(reqs).length, urls: reqs.map((u) => u.slice(0, 90)) }));
    ok('R12 avg fps ≥ 55 (4× CPU emulation, HEADED Chromium; headless rAF is throttled ~11 fps)', fps >= 55, `fps ${fps.toFixed(1)} · worst block gen ${gen.toFixed(3)} ms`);
    out.load = { tReady, tStart, fps, gen, gz }; await p0.close(); await HB.close();
  }
}
// ---- R3/R5 20 fps vs 60 fps page: same admitted log replayed in-page → same result as node ----
{
  const inputs = E.simulate('fps', (p) => ({ t: p.s + 300, lane: p.k % 4 ? p.ans : (p.ans + 1) % 3 })).inputs.map((x, i) => (i % 6 === 0 ? { ...x, at: x.at + 45 } : x));
  const node = E.replay('fps', inputs).summary; const res = [];
  for (const fps of [20, 60]) { const p = await open({ width: 412, height: 915 }, { path: PATH('ko', 'fps') + `&fps=${fps}` }); res.push(await p.evaluate((inp) => __sr.E.replay('fps', inp, Array.from({ length: 2000 }, (_, i) => i * 50)).summary, inputs)); await p.ctx.close(); }
  ok('R3/R5/R6b same admitted log in browser (20/60 fps frame lists) == node replay', JSON.stringify(res[0]) === JSON.stringify(node) && JSON.stringify(res[1]) === JSON.stringify(node), `score ${node.score} correct ${node.correct}/${node.judged} late ${node.late}`);
  // real-time 20 fps page: real keyboard play, then the page's own admitted log replayed in node gives the same judgments
  const p = await open({ width: 412, height: 915 }, { path: PATH('ko', 'fps') + '&fps=20' }); await p.click('#b-start');
  for (let i = 0; i < 12; i++) { await answer(p, i % 5 === 4); await p.waitForFunction((n) => __sr.g.log.length > n, i, { timeout: 8000 }); }
  const live = await p.evaluate(() => ({ ins: __sr.evlog.filter((e) => e.k === 'in').map((e) => ({ t: e.t, at: e.at, lane: e.lane })), log: __sr.g.log.map((e) => [e.k, e.res, e.lane, e.t0, e.pts]), fr: __sr.W.frames, ft: __sr.W.ft.slice(-40) }));
  const rep = E.replay('fps', live.ins); const ftd = live.ft.slice(1).map((x, i) => x - live.ft[i]); const avg = ftd.reduce((a, b) => a + b, 0) / ftd.length;
  ok('R3 live 20 fps page log == node replay of its admitted inputs (first 12 parcels)', JSON.stringify(rep.g.log.slice(0, 12).map((e) => [e.k, e.res, e.lane, e.t0, e.pts])) === JSON.stringify(live.log.slice(0, 12)), `avg frame ${avg.toFixed(1)} ms`);
  await p.ctx.close();
}
await B.close();
out.fails = fails; out.total = Object.keys(out).filter((k) => out[k] && typeof out[k] === 'object' && 'pass' in out[k]).length;
writeFileSync(`${EV}sort-check-${tag0}.json`, JSON.stringify(out, null, 1));
console.log(`\n${tag0}: ${out.total - fails.length}/${out.total} pass`); process.exit(fails.length ? 1 : 0);
