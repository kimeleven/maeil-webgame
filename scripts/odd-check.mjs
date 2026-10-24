// Odd Tile browser evidence (t_2964ede9). node scripts/odd-check.mjs [baseUrl]  (default: local dev server :5198).
// Headless Chromium + WebKit emulation only — NOT real devices, NOT human fun, NOT audio quality, NOT independent QA.
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as E from '../public/js/odd-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/odd/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag0 = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5198); U = 'http://localhost:5198'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const PATH = '/ko/play/odd-tile/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = (reqs) => reqs.filter((u) => !/vercel\.live|\/\.well-known\/vercel|_next-live/.test(u));
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const b = await chromium.launch(); const wk = await webkit.launch();
async function open(vp, { touch = false, path = PATH + '?seed=check', motion, browser = b, dpr } = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch && browser === b, acceptDownloads: true, reducedMotion: motion || 'no-preference', deviceScaleFactor: dpr });
  const p = await ctx.newPage(); p.errs = []; p.reqs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); await p.waitForFunction(() => window.__ot && __ot.ready);
  return p;
}
const st = (p) => p.evaluate(() => { const g = __ot.game; return { state: __ot.state, k: g && g.S.k, found: g && g.S.found, score: g && g.S.score, log: g ? g.S.log.map((e) => e.kind) : [], cells: document.querySelectorAll('#grid .cell').length, time: document.getElementById('h-time').textContent }; });
const tapBtn = async (p, sel, touch) => { const r = await p.locator(sel).boundingBox(); if (touch) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
const cellXY = async (p, i) => { const r = await p.locator(`#grid .cell >> nth=${i}`).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const waitGrid = (p, k) => p.waitForFunction((k) => { const g = __ot.game; return g && g.S.k === k && __ot.shownK === k && __ot.activeNow() >= g.S.start && document.querySelectorAll('#grid .cell').length === g.S.grid.n ** 2 && !document.querySelector('#grid .cell.ok,#grid .cell.bad,#grid .cell.show'); }, k, { timeout: 15000 });
const ans = (p) => p.evaluate(() => __ot.game.S.grid.ans);
const inputsOf = (p) => p.evaluate(() => __ot.W.ev.filter((e) => e.k === 'in').map((e) => ({ t: e.t, cell: e.i, arr: e.arr })));
const logOf = (p) => p.evaluate(() => __ot.game.replayLog());

// ---- R5 (background, Chromium 412): start, no input → result; logical end 60000, display ≥ T+G and < T+G+frame gap ----
const p5 = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=idle' }); await tapBtn(p5, '#b-start', true);
const r5 = p5.waitForFunction(() => __ot.state === 'result', null, { timeout: 75000 }).then(() => p5.evaluate(() => { const W = __ot.W, at = W.ev.find((e) => e.k === 'result').at, S = __ot.game.S, ft = W.ft, gaps = ft.slice(1).map((x, i) => x - ft[i]); return { at, endLogical: S.endLogical, resultAt: S.resultAt, found: S.found, score: S.score, maxGap: Math.max(...gaps.slice(-50)) }; }));

// ---- R0, R1 412 touch, R2, R1b keyboard, R6, R8, R9 ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  await p.touchscreen.tap(206, 500); await p.keyboard.press('Space'); await sleep(10000);
  const s0 = await st(p); await p.screenshot({ path: EV + 'ready-412.png' });
  ok('R0 ready: 10 s + screen tap + Space → still ready, 60.0, no grid', s0.state === 'ready' && s0.cells === 0 && s0.time === '60.0' && !s0.k, JSON.stringify(s0));
  const deck = await p.evaluate(() => { const d = __ot.E.makeDeck('check'); return Array.from({ length: 60 }, (_, i) => d.grid(i + 1)).map((g) => [g.n, g.ans, g.attr, g.base.shape]); });
  const nd = E.makeDeck('check'); ok('R9 ?seed= grid order equals node makeDeck(seed) (k1–60)', JSON.stringify(deck) === JSON.stringify(Array.from({ length: 60 }, (_, i) => nd.grid(i + 1)).map((g) => [g.n, g.ans, g.attr, g.base.shape])));
  const t0 = Date.now(); await tapBtn(p, '#b-start', true); await waitGrid(p, 1); await p.screenshot({ path: EV + 'grid1-412.png' });
  const [x, y] = await cellXY(p, 3); await p.touchscreen.tap(x, y); await sleep(150); const s1 = await st(p); const dt = Date.now() - t0;
  ok('R1 412 touch tap → exactly one judgement', s1.log.filter((k) => k !== 'void').length === 1, JSON.stringify(s1.log));
  ok('R2 [start] → bottom-right tap → grid 1 hit within 5 s', s1.log[0] === 'hit' && dt < 5000, `${dt} ms wall`);
  // R6: confirmed then pointercancel / pointerup: unchanged; tapping during feedback anim not carried
  await p.evaluate(() => { const c = document.querySelectorAll('#grid .cell')[3]; c.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); });
  await waitGrid(p, 2); const s2 = await st(p);
  ok('R6 pointercancel after confirm no change; anim-time tap not carried to grid 2', s2.log.length === 1 && s2.log[0] === 'hit' && s2.k === 2, JSON.stringify(s2.log));
  // R6 15 ms other-cell → void (crafted timeStamps via the real DOM handler)
  const v = await p.evaluate(() => { const cs = document.querySelectorAll('#grid .cell'), a = __ot.game.S.grid.ans, o = (a + 1) % 4, n = performance.now();
    const fire = (i, ts) => { const e = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 9 + i }); Object.defineProperty(e, 'timeStamp', { value: ts }); cs[i].dispatchEvent(e); };
    fire(a, n); fire(o, n + 15); return { a, o }; });
  await sleep(200); const s3 = await st(p); ok('R6 t0 + 15 ms other cell → void, still waiting (not miss)', s3.log.at(-1) === 'void' && s3.k === 2, JSON.stringify(s3.log));
  await p.evaluate(() => { const cs = document.querySelectorAll('#grid .cell'), a = __ot.game.S.grid.ans, n = performance.now(); const fire = (i, ts) => { const e = new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 30 + i }); Object.defineProperty(e, 'timeStamp', { value: ts }); cs[i].dispatchEvent(e); }; fire(a, n); fire((a + 1) % 4, n + 16); });
  await sleep(200); const s4 = await st(p); ok('R6 t0 + 16 ms other cell → t0 confirmed', s4.log.at(-1) === 'hit', JSON.stringify(s4.log));
  ok('R3a page log == node replay of the same admitted inputs', JSON.stringify(await logOf(p)) === JSON.stringify(E.replay('check', await inputsOf(p)).game.replayLog().slice(0, (await logOf(p)).length)));
  await p.screenshot({ path: EV + 'play-412.png' });
  ok('page errors 0 (412)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R1 1440 mouse + keyboard; R1b Enter / Space hold; arrows only move ----
{
  const p = await open({ width: 1440, height: 1000 });
  await p.keyboard.press('Enter'); await waitGrid(p, 1); const sA = await st(p);
  ok('R1b Enter in ready → start only (no selection)', sA.state === 'play' && sA.log.length === 0 && (await p.evaluate(() => __ot.W.ev.filter((e) => e.k === 'in').length)) === 0);
  await p.keyboard.press('Enter'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await sleep(200);
  const sB = await st(p); ok('R1/R1b Enter during wait no-op; arrows move focus only, no judgement', sB.log.length === 0 && (await p.evaluate(() => __ot.focus)) === 3, `focus ${await p.evaluate(() => __ot.focus)}`);
  // Space hold 3 s: one real keydown then repeats
  await p.keyboard.down(' '); for (let i = 0; i < 30; i++) { await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true }))); await sleep(100); } await p.keyboard.up(' ');
  const sC = await st(p); const ins = await p.evaluate(() => __ot.W.ev.filter((e) => e.k === 'in'));
  ok('R1b Space held 3 s → only grid 1 gets one selection (keyboard, same judge)', ins.length === 1 && sC.log[0] === 'hit' && ins[0].src === 'key', JSON.stringify({ log: sC.log, n: ins.length }));
  await waitGrid(p, 2); const a2 = await ans(p); const [x, y] = await cellXY(p, a2); await p.mouse.click(x, y); await sleep(150);
  ok('R1 1440 mouse click → one judgement (hit)', (await st(p)).log[1] === 'hit');
  await p.screenshot({ path: EV + 'play-1440.png' });
  ok('page errors 0 (1440)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R6d pause causes × boundaries, through real DOM handlers ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=pause' });
  await tapBtn(p, '#b-start', true);
  const causes = ['button', 'key', 'hidden', 'blur'];
  const res = {};
  for (const [ci, cause] of causes.entries()) {
    const kGrid = await p.evaluate(() => __ot.game.S.k); await waitGrid(p, kGrid);
    // ① E1: t0 then pause after ~8 ms of active time, no input; long real pause; resume → exactly one hit commit after
    const r1 = await p.evaluate(async (cause) => {
      const cs = () => document.querySelectorAll('#grid .cell'); const a = __ot.game.S.grid.ans;
      const fire = (i, ts) => { const e = new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 50 + i }); Object.defineProperty(e, 'timeStamp', { value: ts }); cs()[i].dispatchEvent(e); };
      const doPause = () => { if (cause === 'button') document.getElementById('b-pause').click(); else if (cause === 'key') dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); else if (cause === 'hidden') { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; } else dispatchEvent(new Event('blur')); };
      const n0 = performance.now(); fire(a, n0); while (performance.now() < n0 + 8); doPause();
      const commitsBefore = __ot.W.ev.filter((e) => e.k === 'commit').length, downAfter = document.querySelectorAll('#grid .cell.down').length, state = __ot.state, t0 = __ot.game.S.inbox[0] && __ot.game.S.inbox[0].t;
      await new Promise((r) => setTimeout(r, 600)); const during = __ot.W.ev.filter((e) => e.k === 'commit').length - commitsBefore;
      document.getElementById('b-resume').click(); await new Promise((r) => setTimeout(r, 300));
      const after = __ot.W.ev.filter((e) => e.k === 'commit'); const last = after.at(-1);
      return { state, downAfter, during, kept: t0 !== undefined, lastKind: last.kind, commits: after.length - commitsBefore, selAfter: __ot.W.ev.filter((e) => e.k === 'in').slice(-1)[0].i === a };
    }, cause);
    res[cause] = { E1: r1 };
    ok(`R6d① E1 pause(${cause}) in collect window: paused, pressed cleared, candidate kept, no commit during pause, one hit after resume`, r1.state === 'paused' && r1.downAfter === 0 && r1.kept && r1.during === 0 && r1.lastKind === 'hit' && r1.commits === 1, JSON.stringify(r1));
    // ② E3: t1 = t0+15 (< tp = t0+20) arriving during pause → void ; tp = t0+70 → late_drop, t0 hit
    for (const tpd of [20, 70]) {
      const k = await p.evaluate(() => __ot.game.S.k); await p.waitForFunction((k) => __ot.game.S.k > k || (__ot.activeNow() >= __ot.game.S.start && !document.querySelector('#grid .cell.ok,#grid .cell.bad,#grid .cell.show')), k, { timeout: 15000 });
      await waitGrid(p, await p.evaluate(() => __ot.game.S.k));
      const r = await p.evaluate(async ({ cause, tpd }) => {
        const cs = () => document.querySelectorAll('#grid .cell'); const a = __ot.game.S.grid.ans, o = (a + 1) % cs().length;
        const fire = (i, ts) => { const e = new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 70 + i }); Object.defineProperty(e, 'timeStamp', { value: ts }); cs()[i].dispatchEvent(e); };
        const doPause = () => { if (cause === 'button') document.getElementById('b-pause').click(); else if (cause === 'key') dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true })); else if (cause === 'hidden') { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; } else dispatchEvent(new Event('blur')); };
        const n0 = performance.now(); const nlog = __ot.game.S.log.length; fire(a, n0); while (performance.now() < n0 + tpd); doPause(); fire(o, n0 + 15);
        await new Promise((r) => setTimeout(r, 300)); dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await new Promise((r) => setTimeout(r, 250));
        return { kinds: __ot.game.S.log.slice(nlog).map((e) => e.kind), pausedDrop: __ot.W.pausedDrop };
      }, { cause, tpd });
      res[cause]['E3_' + tpd] = r;
      ok(`R6d② E3 pause(${cause}) tp=t0+${tpd}: t1=t0+15 arriving in pause → ${tpd === 20 ? 'void' : 'late_drop, t0 hit'}`, tpd === 20 ? r.kinds[0] === 'void' : r.kinds[0] === 'hit', JSON.stringify(r));
      if (tpd === 20) { await p.waitForFunction(() => __ot.game.S.log.at(-1).kind !== 'void', null, { timeout: 8000 }); }
    }
  }
  // ③ committed then pause → unchanged; ⑥ paused input = paused_drop; Enter resume no selection; held Space before pause no selection
  {
    await waitGrid(p, await p.evaluate(() => __ot.game.S.k));
    const r = await p.evaluate(async () => {
      const cs = () => document.querySelectorAll('#grid .cell'); const a = __ot.game.S.grid.ans, k = __ot.game.S.k;
      cs()[a].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 91 }));
      await new Promise((r) => setTimeout(r, 120)); const before = JSON.stringify(__ot.game.S.log.at(-1)); const snd = __ot.W.snd.length, sc = __ot.game.S.score;
      dispatchEvent(new Event('blur')); const pd0 = __ot.W.pausedDrop; cs()[(a + 1) % cs().length].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 92 }));
      dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); const pd = __ot.W.pausedDrop - pd0;
      const nIn = __ot.W.ev.filter((e) => e.k === 'in').length; dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await new Promise((r) => setTimeout(r, 50));
      return { same: JSON.stringify(__ot.game.S.log.filter((e) => e.k === k && e.kind !== 'void').at(-1)) === before, sc: __ot.game.S.score === sc, snd: __ot.W.snd.length === snd, pd, newIn: __ot.W.ev.filter((e) => e.k === 'in').length - nIn, state: __ot.state };
    });
    ok('R6d③⑥ committed then pause: judgement/sound/score unchanged; taps+Space in pause = paused_drop; Enter resumes without selection', r.same && r.sc && r.snd && r.pd === 2 && r.newIn === 0 && r.state === 'play', JSON.stringify(r));
  }
  // ⑤ D boundary through DOM: D-1 judged, D miss (crafted timestamps, arrival < t+66)
  {
    const r = await p.evaluate(async () => {
      const out = [];
      for (const off of [-1, 0]) {
        await new Promise((res) => { const w = () => { const g = __ot.game.S; if (__ot.activeNow() >= g.start && !document.querySelector('#grid .cell.ok,#grid .cell.bad,#grid .cell.show') && !g.inbox.length) res(); else setTimeout(w, 5); }; w(); });
        const S = __ot.game.S, D = S.start + S.grid.dl, k = S.k, a = S.grid.ans;
        await new Promise((res) => { const w = () => (__ot.activeNow() >= D + off + 5 ? res() : setTimeout(w, 1)); w(); });
        // translate active time → perf timestamp (no pause since)
        const ts = performance.now() - (__ot.activeNow() - (D + off));
        const e = new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 99 }); Object.defineProperty(e, 'timeStamp', { value: ts }); document.querySelectorAll('#grid .cell')[a].dispatchEvent(e);
        await new Promise((res) => setTimeout(res, 150)); const ent = __ot.game.S.log.filter((x) => x.k === k && x.kind !== 'void').at(-1); out.push({ off, kind: ent && ent.kind, t: __ot.activeOf(ts) - D });
      }
      return out;
    });
    ok('R6d⑤ through DOM: D−1 tap judged (hit), D tap → miss', r[0].kind === 'hit' && r[1].kind === 'miss', JSON.stringify(r));
  }
  out.R6d_detail = res; ok('page errors 0 (pause)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
}
// ---- R7d renderer uniqueness: all (row, attr, shape, base dots) at 44/78/88 × DPR 1/2/3; X never generated; injected failure → glyph fallback ----
{
  const p = await open({ width: 412, height: 915 });
  const r = await p.evaluate(() => {
    const { ROWS, VALID, SHAPES, glyphPair, isValid } = __ot.E, rows = [];
    for (const row of Object.keys(ROWS)) for (const attr of Object.keys(ROWS[row])) for (const shape of SHAPES) {
      let min = 1; for (const bd of attr === 'dots' ? [0] : [1, 2, 3, 4]) { const [b, o] = glyphPair(shape, attr, ROWS[row][attr], bd); for (const px of [44, 78, 88]) for (const dpr of [1, 2, 3]) min = Math.min(min, __ot.diffRatio(b, o, px * dpr)); }
      rows.push({ row, attr, shape, valid: isValid(row, attr, shape), min: Math.round(min * 10000) / 100 });
    }
    return rows;
  });
  const bad = r.filter((x) => x.valid && x.min < 3);
  writeFileSync(EV + 'r7d-table.json', JSON.stringify(r, null, 1));
  ok('R7d renderer: every O combo ≥ 3% at 44/78/88 px × DPR 1/2/3', bad.length === 0, `O ${r.filter((x) => x.valid).length}, min O ${Math.min(...r.filter((x) => x.valid).map((x) => x.min))}%, X ${r.filter((x) => !x.valid).map((x) => `${x.row}/${x.attr}/${x.shape}=${x.min}%`).join(' ')}${bad.length ? ' BAD ' + JSON.stringify(bad) : ''}`);
  let xGen = 0; for (let s = 0; s < 100; s++) { const d = E.makeDeck(`x${s}`); d.ensure(15); for (const bl of d.blocks) for (const g of bl.grids) if (!E.isValid(g.row, g.attr, g.base.shape)) xGen++; }
  ok('R7d X combos generated 0 (seed 100 × blocks 0–15)', xGen === 0);
  const f = await p.evaluate(async () => { __ot.W.renderFail = true; document.getElementById('b-start').click(); await new Promise((r) => setTimeout(r, 100));
    // play through tutorial quickly to reach generated grid 4
    for (let i = 0; i < 3; i++) { await new Promise((res) => { const w = () => (__ot.activeNow() >= __ot.game.S.start && document.querySelectorAll('#grid .cell').length ? res() : setTimeout(w, 10)); w(); }); document.querySelectorAll('#grid .cell')[__ot.game.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise((r) => setTimeout(r, 120)); }
    await new Promise((res) => { const w = () => (__ot.game.S.k === 4 ? res() : setTimeout(w, 10)); w(); });
    const g = __ot.game.S.grid, raw = __ot.game.deck.grid(4); return { glyph: g.glyph, attr: g.attr, ans: g.ans, rawAns: raw.ans, ev: __ot.W.ev.filter((e) => e.k === 'glyph').map((e) => e.v) }; });
  ok('R7d injected render-check failure → glyph=fallback:k (size attr), answer cell unchanged', f.glyph === 'fallback:4' && f.attr === 'size' && f.ans === f.rawAns, JSON.stringify(f));
  const chk = await p.evaluate(() => __ot.W.renderChecks.slice(0, 3)); out.renderChecks = chk;
  await p.ctx.close();
}
// ---- R8 result, again, PNG, best; R10 settings persist; restart doesn't touch best ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true, path: PATH + '?seed=res' });
  // fast-forward: drive a short game by tapping answers until result (real 60 s)
  await tapBtn(p, '#b-start', true);
  const drive = p.evaluate(async () => { while (__ot.state !== 'result') { const g = __ot.game; if (g && !g.S.over && __ot.activeNow() >= g.S.start && !g.S.inbox.length && document.querySelectorAll('#grid .cell').length === g.S.grid.n ** 2 && !document.querySelector('#grid .cell.ok,#grid .cell.bad,#grid .cell.show')) { await new Promise((r) => setTimeout(r, 400)); if (__ot.game && __ot.activeNow() >= __ot.game.S.start && !__ot.game.S.over) document.querySelectorAll('#grid .cell')[__ot.game.S.grid.ans].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); } await new Promise((r) => setTimeout(r, 30)); } });
  await drive; await sleep(300); await p.screenshot({ path: EV + 'result-412.png' });
  const R = await p.evaluate(() => ({ score: document.getElementById('r-score').textContent, found: document.getElementById('r-found').textContent, acc: document.getElementById('r-acc').textContent, combo: document.getElementById('r-combo').textContent, line: document.getElementById('r-line').textContent, best: localStorage.getItem('ot-best'), first: !document.getElementById('r-first').hidden }));
  ok('R8 result: score, found, accuracy, max combo, per-grid line, first record (no share needed)', +R.found > 10 && R.acc.endsWith('%') && R.line.length >= +R.found && R.first && JSON.parse(R.best).score === +R.score, JSON.stringify(R));
  const dl = p.waitForEvent('download'); await tapBtn(p, '#b-png', true); const d = await dl; const fp = EV + 'share-1080x1350.png'; await d.saveAs(fp);
  const buf = readFileSync(fp); ok('R8 PNG local download 1080×1350', buf.readUInt32BE(16) === 1080 && buf.readUInt32BE(20) === 1350, d.suggestedFilename());
  const ta = Date.now(); await tapBtn(p, '#b-again', true); await p.waitForFunction(() => __ot.state === 'ready'); const again = Date.now() - ta;
  ok('R8 [again] → ready within 0.5 s', again < 500, `${again} ms`);
  // restart from pause doesn't change best
  const best0 = await p.evaluate(() => localStorage.getItem('ot-best')); await tapBtn(p, '#b-start', true); await waitGrid(p, 1); await tapBtn(p, '#b-pause', true); await tapBtn(p, '#b-restart', true);
  ok('R8 pause → [restart] → ready, best unchanged', (await p.evaluate(() => __ot.state)) === 'ready' && (await p.evaluate(() => localStorage.getItem('ot-best'))) === best0);
  // R10 settings persist
  await p.evaluate(() => { document.querySelector('header [data-set=sound]').click(); }); await p.reload(); await p.waitForFunction(() => window.__ot && __ot.ready);
  ok('R10 sound toggle persists after reload', (await p.evaluate(() => document.querySelector('header [data-set=sound]').getAttribute('aria-pressed'))) === 'false');
  const ext = site(p.reqs).filter((u) => /\/api\//.test(u) || !u.startsWith(U)); ok('R9 network: /api 0, external 0', ext.length === 0, ext.join(' '));
  await p.ctx.close();
}
// ---- R10 hidden tab: clock freezes + grid hidden; reduced motion: no breathing animation ----
{
  const p = await open({ width: 412, height: 915 }, { motion: 'reduce' });
  await p.click('#b-start'); await waitGrid(p, 1);
  const r = await p.evaluate(async () => { const anim = getComputedStyle(document.querySelector('#grid .cell.breathe')).animationName; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden;
    const a = __ot.activeNow(); await new Promise((r) => setTimeout(r, 1000)); const b = __ot.activeNow(); const pz = document.getElementById('pz'); const covered = !pz.hidden && getComputedStyle(pz).backdropFilter.includes('blur');
    document.getElementById('b-resume').click(); await new Promise((r) => setTimeout(r, 200)); return { anim, frozen: a === b, covered, after: __ot.activeNow() - b }; });
  ok('R10 hidden → clock frozen, grid covered by blur sheet, resumes; reduced motion → no breathe animation', r.frozen && r.covered && r.after > 100 && r.anim === 'none', JSON.stringify(r));
  await p.ctx.close();
}
// ---- R3 cross-browser: same seed + same input log → same judgements (Chromium/WebKit, 360/412/1440) ----
{
  const logs = {}; const script = [[300, 'ans'], [1500, 'ans'], [900, 'wrong'], [200, 'ans']];
  for (const [bn, br] of [['chromium', b], ['webkit', wk]]) for (const w of [360, 412, 1440]) {
    const p = await open({ width: w, height: w === 1440 ? 1000 : 800 }, { browser: br, path: PATH + '?seed=r3' }); await p.click('#b-start');
    for (const [wait, kind] of script) { const k = await p.evaluate(() => __ot.game.S.k); try { await waitGrid(p, k); } catch (e) { console.error('R3 wait fail', bn, w, JSON.stringify(await p.evaluate(() => ({ k: __ot.game.S.k, st: __ot.state, now: __ot.activeNow(), start: __ot.game.S.start, n: document.querySelectorAll('#grid .cell').length, cls: [...document.querySelectorAll('#grid .cell')].map((c) => c.className).join('|') })))); throw e; } await sleep(wait); await p.evaluate((kind) => { const g = __ot.game.S.grid; const i = kind === 'ans' ? g.ans : (g.ans + 1) % (g.n * g.n); document.querySelectorAll('#grid .cell')[i].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, kind); await sleep(120); }
    const L = await logOf(p), ins = await inputsOf(p); const node = E.replay('r3', ins).game.replayLog().slice(0, L.length);
    logs[`${bn}-${w}`] = { kinds: L.map((e) => e.kind).join(','), same: JSON.stringify(node) === JSON.stringify(L) };
    if (w === 360) { await p.screenshot({ path: EV + `play-360-${bn}.png` }); }
    await p.ctx.close();
  }
  const kinds = new Set(Object.values(logs).map((x) => x.kinds));
  ok('R3 replay: page log == node replay of its admitted inputs in Chromium+WebKit × 360/412/1440; same script → same kinds', Object.values(logs).every((x) => x.same) && kinds.size === 1, JSON.stringify(logs));
}
// ---- R12 load (4× CPU + Fast 3G), gzip, fps headroom; 6 langs × 360/412/1440 overflow 0, targets ≥ 44 px, noindex ----
{
  const html = readFileSync(`${ROOT}public/ko/play/odd-tile/index.html`); const gz = gzipSync(html).length;
  const p = await open({ width: 412, height: 915 }, { touch: true }); const cdp = await p.ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 });
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=load', { waitUntil: 'commit' }); await p.waitForFunction(() => window.__ot && __ot.ready); const tReady = Date.now() - t0;
  await p.click('#b-start'); await waitGrid(p, 1);
  const fps = await p.evaluate(async () => { const s = __ot.W.ft.length; await new Promise((r) => setTimeout(r, 3000)); const ft = __ot.W.ft.slice(s); return ft.length / ((ft.at(-1) - ft[0]) / 1000); });
  const gen = await p.evaluate(() => { const d = __ot.E.makeDeck('perf'); d.ensure(15); return Math.max(...d.blocks.map((x) => x.ms)); });
  ok('R12 4×CPU + Fast3G: [start] usable < 2 s, gzip ≤ 30 KB', tReady < 2000 && gz <= 30 * 1024, `ready ${tReady} ms, gzip ${(gz / 1024).toFixed(1)} KB, raf ${fps.toFixed(1)} fps (headless, not device), worst block gen ${gen.toFixed(2)} ms @4×CPU`);
  out.R12 = { tReady, gz, fps, gen }; await p.ctx.close();
  const lay = [];
  for (const l of LANGS) for (const [w, h] of [[360, 760], [412, 915], [1440, 1000]]) {
    const q = await open({ width: w, height: h }, { path: `/${l}/play/odd-tile/?seed=lay` });
    const chk = async (ph) => q.evaluate((ph) => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const small = [...document.querySelectorAll('button,summary,a,.cell')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map((e) => e.id || e.className || e.tagName);
      return { ph, over: document.documentElement.scrollWidth - innerWidth, small }; }, ph);
    const a = await chk('ready'); await q.click('#b-start'); await q.waitForFunction(() => document.querySelectorAll('#grid .cell').length > 0); const bq = await chk('play');
    const noindex = await q.evaluate(() => document.querySelector('meta[name=robots]').content);
    lay.push({ l, w, a, b: bq, noindex });
    if (l === 'pt-br' && w === 360) await q.screenshot({ path: EV + 'ready-pt-br-360.png' });
    await q.ctx.close();
  }
  const badL = lay.filter((x) => x.a.over > 0 || x.b.over > 0 || x.a.small.length || x.b.small.length || !/noindex/.test(x.noindex));
  ok('R12 6 langs × 360/412/1440: overflow 0, targets ≥ 44 px, noindex', badL.length === 0, badL.length ? JSON.stringify(badL) : `${lay.length} layouts`);
  const sm = readFileSync(`${ROOT}public/sitemap.xml`, 'utf8'); ok('R9 sitemap has no odd-tile, 109 urls', !sm.includes('odd-tile') && (sm.match(/<loc>/g) || []).length === 109);
}
const v5 = await r5; ok('R5 idle: logical end 60000, 0/0, result display ≥ T+G and < T+G+frame gap', v5.endLogical === 60000 && v5.found === 0 && v5.score === 0 && v5.at >= 60050 && v5.at < 60050 + v5.maxGap + 1, JSON.stringify(v5));
await p5.ctx.close();
// larger screenshots for PO
{ const p = await open({ width: 1440, height: 1000 }, { path: '/en/play/odd-tile/?seed=check' }); await p.screenshot({ path: EV + 'ready-1440.png' }); await p.click('#b-start'); await waitGrid(p, 1); await p.screenshot({ path: EV + 'grid1-1440.png' }); await p.ctx.close(); }
await b.close(); await wk.close();
out.fails = fails; writeFileSync(EV + `check-${tag0}.json`, JSON.stringify(out, null, 1));
console.log(`\n${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length - fails.length}/${Object.keys(out).filter((k) => out[k] && out[k].pass !== undefined).length} pass (${tag0})`);
process.exit(fails.length ? 1 : 0);
