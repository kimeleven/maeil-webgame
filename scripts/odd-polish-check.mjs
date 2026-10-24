// Odd Tile polish evidence (t_6b058523). node scripts/odd-polish-check.mjs [baseUrl]   (HEADED=1 for GPU/vsync fps)
// Automated Chromium only — answers are read from the engine (NOT human play, NOT fun, NOT real devices, NOT independent QA).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = process.env.OT_EV || `${ROOT}reboot-evidence/odd-polish/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const TAG = (U ? 'preview' : 'local') + (process.env.HEADED ? '-headed' : '');
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5195); U = 'http://localhost:5195'; }
const SKIP = process.env.SKIP_TOOLBAR ? { 'x-vercel-skip-toolbar': '1' } : {};
const out = { base: U, tag: TAG, at: new Date().toISOString(), skipToolbarHeader: !!process.env.SKIP_TOOLBAR }; const fails = [];
const ok = (n, c, d = '') => { console[c ? 'log' : 'error'](`${c ? '✔' : '✘'} ${n}${d ? ' — ' + d : ''}`); if (!c) fails.push(n); out[n] = { pass: !!c, detail: d }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: !process.env.HEADED, channel: "chrome" });
async function open(vp, touch, path = '/ko/play/odd-tile/?seed=polish', dpr, cpu) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr, acceptDownloads: true });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(String(e)));
  if (cpu) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  if (process.env.SKIP_TOOLBAR) await p.setExtraHTTPHeaders({ 'x-vercel-skip-toolbar': '1' });
  await p.goto(U + path); await p.waitForFunction(() => window.__ot && __ot.ready); p.ctx = ctx; return p;
}
const tapSel = async (p, sel, touch) => { const r = await p.locator(sel).boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };

// ---- 1. tutorial glyphs: inside cell, ×2, one odd canvas, render difference (new canvas) ----
for (const [vp, touch, dpr] of [[{ width: 360, height: 780 }, true, 3], [{ width: 412, height: 915 }, true, 2.625], [{ width: 1440, height: 1000 }, false, 1]]) {
  const p = await open(vp, touch, undefined, dpr); await p.waitForFunction(() => __ot.acState && __ot.acState !== 'none', null, { timeout: 8000 }).catch(() => {}); await tapSel(p, '#b-start', touch);
  const rows = [];
  for (let k = 1; k <= 3; k++) {
    await p.waitForFunction((k) => __ot.shownK === k && document.querySelectorAll('#grid .cell').length === 4, k);
    if (k === 1) await p.screenshot({ path: `${EV}tutorial-${vp.width}.png` });
    rows.push(await p.evaluate(() => {
      const cv = [...document.querySelectorAll('#grid .cell canvas')], g = __ot.game.S.grid;
      const data = cv.map((c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
      const sig = data.map((d) => { let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 3]) >>> 0; return h; });
      const odd = sig.map((s, i) => i).filter((i) => sig.filter((x) => x === sig[i]).length === 1);
      // edge band: any opaque pixel within 2 px of the canvas border = clipped glyph
      const edge = data.map((d, j) => { const w = cv[j].width; let n = 0; for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if ((x < 2 || y < 2 || x >= w - 2 || y >= w - 2) && d[(y * w + x) * 4 + 3] > 0) n++; return n; });
      const px = cv[0].width, r = __ot.diffRatio(g.base, g.odd, px);
      return { k: g.k, ans: g.ans, odd, ratio: g.odd.scale / g.base.scale, base: g.base.scale, px, diff: Math.round(r * 1e4) / 1e4, edge };
    }));
    await p.evaluate((pt) => { const cs = document.querySelectorAll('#grid .cell'); cs[__ot.game.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: pt })); }, touch ? 'touch' : 'mouse');
  }
  out[`tut-${vp.width}`] = rows;
  ok(`T1 tutorial ${vp.width}px DPR${dpr}: answers BR/TL/TR, ×2 (0.4→0.8), exactly one distinct canvas = answer, no pixel in 2px edge band, diff ≥3%`,
    rows.map((r) => r.ans).join() === '3,0,1' && rows.every((r) => r.ratio === 2 && r.base === 0.4 && r.odd.length === 1 && r.odd[0] === r.ans && r.edge.every((e) => e === 0) && r.diff >= 0.03), JSON.stringify(rows.map((r) => [r.k, r.ans, r.odd, r.diff, r.edge.join('/')])));
  // hint: touch shows tap text, mouse shows keyboard text
  const h = await p.evaluate(() => [...document.querySelectorAll('.under .hint > span')].map((s) => [s.className, getComputedStyle(s).display !== 'none', s.textContent]));
  ok(`T2 hint ${vp.width}px ${touch ? 'touch' : 'mouse'}: ${touch ? 'tap' : 'keyboard'} hint visible only`, h.length === 2 && h.find((x) => x[0] === (touch ? 'k-tap' : 'k-kbd'))[1] && !h.find((x) => x[0] === (touch ? 'k-kbd' : 'k-tap'))[1], JSON.stringify(h));
  ok(`T3 pageerror 0 (${vp.width})`, p.errs.length === 0, p.errs.join('|')); await p.ctx.close();
}
// ready-screen hint on touch before any touch (media query only)
{ const p = await open({ width: 412, height: 915 }, true); await p.screenshot({ path: `${EV}ready-412-touchhint.png` }); const v = await p.evaluate(() => [...document.querySelectorAll('#ready .small > span')].map((s) => [s.className, getComputedStyle(s).display !== 'none'])); ok('T2b ready sheet (touch, before first touch): tap hint via media query', JSON.stringify(v) === '[["k-kbd",false],["k-tap",true]]', JSON.stringify(v)); await p.ctx.close(); }

// ---- 2. Vercel toolbar / feedback overlay: no element covering the grid (no skip header unless SKIP_TOOLBAR) ----
{ const p = await open({ width: 412, height: 915 }, true, '/ko/play/odd-tile/?seed=cover'); await sleep(3000); await tapSel(p, '#b-start', true);
  await p.waitForFunction(() => __ot.shownK === 1); for (let k = 1; k <= 3; k++) { await p.waitForFunction((k) => __ot.shownK === k && document.querySelectorAll('#grid .cell').length === 4, k); await p.evaluate(() => document.querySelectorAll('#grid .cell')[__ot.game.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))); }
  const covers = [];
  for (const n of [3, 4]) {
    if (n === 4) await p.evaluate(() => { __ot.game.S.k = 24; }); // look-ahead only for layout: next shown grid is 4x4 (k=25)
    await p.waitForFunction((n) => document.querySelectorAll('#grid .cell').length === n * n && __ot.game.S.grid.n === n, n, { timeout: 15000 });
    covers.push(...(await p.evaluate(() => [...document.querySelectorAll('#grid .cell')].map((c, i) => { const r = c.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el && c.contains(el) ? null : { i, n: Math.sqrt(document.querySelectorAll('#grid .cell').length), by: el ? el.tagName + '.' + el.className : null }; }).filter(Boolean))));
    if (n === 4) await p.screenshot({ path: `${EV}grid16-412-toolbar.png` });
    if (n === 3) await p.evaluate(() => document.querySelectorAll('#grid .cell')[__ot.game.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })));
  }
  const live = await p.evaluate(() => ({ live: document.querySelectorAll('vercel-live-feedback,[data-vercel-toolbar],script[src*="vercel.live"]').length }));
  ok('T4 no overlay covers any 3×3/4×4 cell centre (elementFromPoint), vercel-live elements count reported', covers.length === 0, JSON.stringify({ covers, ...live })); await p.ctx.close(); }

// ---- 3. best comparison over 5 games on 412 touch: first, same, higher, lower, mid-restart ----
async function playGame(p, mode) {
  await tapSel(p, '#b-start', true);
  if (mode === 'auto') await p.evaluate(() => new Promise((res) => { const tick = () => { if (__ot.state === 'result') return res(); const g = __ot.game; if (g && !g.S.over && __ot.activeNow() >= g.S.start + 250 && !g.S.inbox.length && __ot.shownK === g.S.k) document.querySelectorAll('#grid .cell')[g.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); setTimeout(tick, 40); }; tick(); }));
  await p.waitForFunction(() => __ot.state === 'result', null, { timeout: 75000 });
  return p.evaluate(() => ({ score: +document.getElementById('r-score').textContent, best: document.getElementById('r-best').textContent, diff: document.getElementById('r-diff').textContent, newBest: !document.getElementById('r-new').hidden, first: !document.getElementById('r-first').hidden, stored: localStorage.getItem('ot-best') }));
}
{ const p = await open({ width: 412, height: 915 }, true, '/ko/play/odd-tile/?seed=best'); await p.evaluate(() => localStorage.removeItem('ot-best')); await p.reload(); await p.waitForFunction(() => window.__ot && __ot.ready);
  const g = [];
  g.push(await playGame(p, 'idle')); await p.screenshot({ path: `${EV}best-1-first.png` }); await tapSel(p, '#b-again', true);
  g.push(await playGame(p, 'idle')); await p.screenshot({ path: `${EV}best-2-same.png` }); await tapSel(p, '#b-again', true);
  g.push(await playGame(p, 'auto')); await p.screenshot({ path: `${EV}best-3-higher.png` }); await tapSel(p, '#b-again', true);
  g.push(await playGame(p, 'idle')); await p.screenshot({ path: `${EV}best-4-lower.png` }); await tapSel(p, '#b-again', true);
  const before = await p.evaluate(() => localStorage.getItem('ot-best')); await tapSel(p, '#b-start', true); await p.waitForFunction(() => __ot.shownK === 1);
  await p.evaluate(() => document.querySelectorAll('#grid .cell')[3].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))); await sleep(500);
  await tapSel(p, '#b-pause', true); await tapSel(p, '#b-restart', true); const after = await p.evaluate(() => [localStorage.getItem('ot-best'), __ot.state]);
  out.best = { games: g, before, after }; const S3 = g[2].score;
  ok('B1 game1 first record: best —, diff —, first label', g[0].best === '—' && g[0].diff === '—' && g[0].first && !g[0].newBest, JSON.stringify(g[0]));
  ok('B2 game2 same score (0 vs 0): diff 0, not new best, best unchanged', g[1].diff === '0' && !g[1].newBest && g[1].best === '0 (0)', JSON.stringify(g[1]));
  ok('B3 game3 higher: diff +score, new best label, stored', S3 > 0 && g[2].diff === `+${S3}` && g[2].newBest && JSON.parse(g[2].stored).score === S3, JSON.stringify(g[2]));
  ok('B4 game4 lower: diff −score, no new best, best stays', g[3].diff === String(-S3) && !g[3].newBest && g[3].best.startsWith(`${S3} `) && JSON.parse(g[3].stored).score === S3, JSON.stringify(g[3]));
  ok('B5 mid-game [처음부터] → ready, best unchanged', after[0] === before && after[1] === 'ready', JSON.stringify({ before, after }));
  ok('B6 pageerror 0 over 5 games', p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); }

// ---- 4. 4×CPU: block generation time, frame gaps around generation, average fps over 20 s auto play ----
{ const p = await open({ width: 412, height: 915 }, true, '/ko/play/odd-tile/?seed=perf', 2.625, 4); await tapSel(p, '#b-start', true);
  await p.waitForFunction(() => __ot.acState && __ot.acState !== 'none', null, { timeout: 8000 }).catch(() => {});
  const r = await p.evaluate(() => new Promise((res) => { const t0 = performance.now(); const tick = () => { const g = __ot.game; if (performance.now() - t0 > 20000 || __ot.state !== 'play') { const ft = __ot.W.ft, gaps = ft.slice(1).map((x, i) => x - ft[i]); const shows = __ot.W.ev.filter((e) => e.k === 'show').map((e) => e.at); const blocks = g.deck.blocks.map((x) => Math.round(x.ms * 100) / 100); const near = gaps.filter((g, i) => shows.some((s) => Math.abs(ft[i + 1] - t0 - 0) < 0)); return res({ frames: ft.length, avgFps: (1000 * (ft.length - 1)) / (ft[ft.length - 1] - ft[0]), worstGap: Math.max(...gaps), p99: gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length * 0.99)], over50: gaps.filter((g) => g > 50).length, over100: gaps.filter((g) => g > 100).length, blocks, shows: shows.length, k: g.S.k }); }
    if (!g.S.over && __ot.activeNow() >= g.S.start + 250 && !g.S.inbox.length && __ot.shownK === g.S.k) document.querySelectorAll('#grid .cell')[g.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); setTimeout(tick, 40); }; tick(); }));
  out.perf4x = r; console.log('perf 4xCPU', JSON.stringify(r));
  ok('P1 4×CPU measured (report only; headless rAF is not device fps)', r.frames > 0, `avgFps ${r.avgFps.toFixed(1)}, worst frame gap ${r.worstGap.toFixed(1)} ms, p99 ${r.p99.toFixed(1)} ms, block gen ms ${r.blocks.join('/')}`);
  ok('P2 pageerror 0 (perf)', p.errs.length === 0, p.errs.join('|')); await p.ctx.close(); }

await b.close();
writeFileSync(`${EV}polish-${TAG}.json`, JSON.stringify(out, null, 1));
console.log(`\n${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length - fails.length}/${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length} pass (${TAG})`); process.exit(fails.length ? 1 : 0);
