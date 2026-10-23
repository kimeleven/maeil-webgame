// Magnet Harbor completeness evidence (t_4f4be7d2): first-landing guide, real success landing on 412 touch & 1440 keyboard
// (ArrowRight + Space), real failures → result tip by cause + "cells/cols to next boat", restart, PERFECT streak label.
// node scripts/magnet-learn.mjs [baseUrl]  (default: local dev server :5195). HEADED Chromium. Automated, not real-device/real-player.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import * as E from '../public/js/magnet-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/magnet/learn/`; mkdirSync(EV, { recursive: true });
const T = JSON.parse(readFileSync(`${ROOT}i18n/magnet-harbor.json`, 'utf8'));
let U = process.argv[2]; const tag = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5195); U = 'http://localhost:5195'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
async function open(vp, { touch = false, path = '/ko/play/magnet-harbor/?seed=learn' } = {}) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage(); p.errs = []; p.ctx = ctx;
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(U + path); await p.waitForFunction(() => window.__mh && __mh.ready); return p;
}
const st = (p) => p.evaluate(() => { const g = __mh.g; const ev = __mh.evlog; return { tick: g.tick, phase: g.phase, x: g.crane.x, th: g.th, fails: g.fails, score: g.score, cargo: !!g.cargo, aim: __mh.aim, tier: __mh.aimTier, lands: ev.filter((e) => e.k === 'land'), falls: ev.filter((e) => e.k === 'fall').map((e) => e.why), rel: ev.filter((e) => e.k === 'release').length }; });
const cvBox = (p) => p.locator('#cv').boundingBox();
async function touch(p) { const c = await p.ctx.newCDPSession(p); return { c, async down(x, y) { await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); }, async move(x, y) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); }, async up() { await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } }; }
// drag (relative) so the crane goes to world x `to`, hold until the swing settles, then lift
async function dragTo(p, tc, to, hold = 900) {
  const r = await cvBox(p), s = r.width / 9, y = r.y + r.height * 0.5, x0 = r.x + r.width / 2;
  await p.waitForFunction(() => !!__mh.g.cargo, null, { timeout: 5000 });
  const cx = (await st(p)).x; await tc.down(x0, y);
  for (let i = 1; i <= 12; i++) { await tc.move(x0 + ((to - cx) * s * i) / 12, y); await sleep(16); }
  await sleep(hold); const mid = await st(p); await tc.up(); await sleep(700); return mid;
}

// ---- A. 412 touch: ready guide → success landing → 3 sea misses → result tip → restart ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  await sleep(400); await p.screenshot({ path: EV + 'a1-ready-guide-412.png' });
  const guide = await p.evaluate(() => { const e = document.getElementById('r-guide'), r = e.getBoundingClientRect(), pb = document.querySelector('#ready .panel').getBoundingClientRect().bottom, cv = document.getElementById('cv').getBoundingClientRect(); return { text: e.textContent, vis: r.height > 0, combo: document.getElementById('r-combo').textContent, panelBottom: Math.round(pb), greenCellsTop: Math.round(cv.top + cv.height * 0.8 - cv.width / 9) }; });
  ok('A1 412 ready screen shows landing-width guide + streak rule, panel leaves green deck cells visible', guide.vis && guide.text === T.ko.guide && guide.combo === T.ko.comboRule && guide.panelBottom < guide.greenCellsTop, JSON.stringify(guide));
  const bs = await p.locator('#b-start').boundingBox(); await p.touchscreen.tap(bs.x + bs.width / 2, bs.y + bs.height / 2); await p.waitForFunction(() => __mh.armed);
  const tc = await touch(p);
  const mid = await dragTo(p, tc, 4.0); await p.screenshot({ path: EV + 'a2-landed-412.png' });
  const s1 = await st(p);
  ok('A2 412 touch drag → aim ✓ over ship → lift → real landing', mid.aim === true && mid.tier === 'good' && s1.lands.length === 1 && s1.rel === 1, `crane x ${mid.x}, aim ${mid.aim}/${mid.tier}, land ${JSON.stringify(s1.lands[0] || null)}, score ${s1.score}`);
  // three deliberate misses: park the crane far left (x≈0.3, off the ship) and lift
  for (let k = 0; k < 3; k++) { const m = await dragTo(p, tc, 0.3, 1100); out[`A3 miss ${k}`] = { aim: m.aim, x: m.x }; if (k === 0) await p.screenshot({ path: EV + 'a3-aim-miss-412.png' }); }
  await p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 8000 }).catch(() => {});
  const s2 = await st(p); const tip = await p.evaluate(() => ({ ...__mh.tip, k: document.getElementById('r-tipk').textContent, nearShown: !document.getElementById('r-near').hidden }));
  await p.screenshot({ path: EV + 'a4-result-sea-412.png' });
  ok('A3 412 off-ship releases → 3 sea drops → result', s2.phase === 'result' && s2.falls.filter((w) => w === 'sea').length === 3, `falls ${s2.falls.join(',')}, aim before miss ${out['A3 miss 0'].aim}`);
  ok('A4 result tip = sea cause + cells/cols to next boat', tip.why === 'sea' && tip.text === T.ko.tipSea && tip.nearShown && /칸/.test(tip.near), JSON.stringify(tip));
  const ag = await p.locator('#b-again').boundingBox(); await p.touchscreen.tap(ag.x + ag.width / 2, ag.y + ag.height / 2); await sleep(300);
  const s3 = await p.evaluate(() => ({ phase: __mh.g.phase, ready: !document.getElementById('ready').hidden, res: !document.getElementById('res').hidden }));
  await p.screenshot({ path: EV + 'a5-restart-412.png' });
  ok('A5 412 [again] → ready screen (guide back)', s3.phase === 'ready' && s3.ready && !s3.res, JSON.stringify(s3));
  ok('A no page errors', p.errs.length === 0, p.errs.join(' | ')); await p.ctx.close();
}
// ---- B. 1440 keyboard: Space start, ArrowRight hold → Space drop → real landing (×2) ----
{
  const p = await open({ width: 1440, height: 900 });
  await p.screenshot({ path: EV + 'b1-ready-1440.png' });
  await p.keyboard.press('Space'); await p.waitForFunction(() => __mh.armed);
  const res = [];
  for (const target of [4.0, 5.0]) {
    await p.waitForFunction(() => !!__mh.g.cargo, null, { timeout: 5000 });
    const x0 = (await st(p)).x; const key = target > x0 ? 'ArrowRight' : 'ArrowLeft';
    await p.keyboard.down(key); await p.waitForFunction(([t, r]) => (r ? __mh.g.crane.x >= t - 0.05 : __mh.g.crane.x <= t + 0.05), [target, key === 'ArrowRight'], { timeout: 3000, polling: 'raf' }); await p.keyboard.up(key);
    await sleep(1000); const m = await st(p); await p.keyboard.press('Space'); await sleep(700); const s = await st(p);
    res.push({ key, x: m.x, aim: m.aim, tier: m.tier, lands: s.lands.length, rel: s.rel, last: s.lands[s.lands.length - 1] });
    if (res.length === 1) await p.screenshot({ path: EV + 'b2-landed-1440.png' });
  }
  ok('B1 1440 ArrowRight/Left hold moves crane, Space drops, both land', res.every((r, i) => r.aim && r.tier === 'good' && r.lands === i + 1 && r.rel === i + 1), JSON.stringify(res));
  ok('B no page errors', p.errs.length === 0, p.errs.join(' | ')); await p.ctx.close();
}
// ---- C. result tips for height/tilt from real engine runs (policy played inside the page's engine, then the page's result UI) ----
{
  // find seeds in node first (same core file the page inlines)
  const find = (why, pol) => { for (let i = 0; i < 200; i++) { const g = E.simulate(`tip${i}`, pol); if (g.lastFail === why) return `tip${i}`; } return null; };
  const cases = [['step', 'oneCol'], ['over', 'stayTap'], ['tilt', 'randomTap'], ['tilt', 'oneCol']];
  const found = {}; for (const [why, pol] of cases) if (!found[why]) { const sd = find(why, pol); if (sd) found[why] = { seed: sd, pol }; }
  out.C_seeds = found;
  for (const [why, { seed, pol }] of Object.entries(found)) {
    const p = await open({ width: 412, height: 915 }, { touch: true, path: `/ko/play/magnet-harbor/?seed=${seed}` });
    const r = await p.evaluate(([pol]) => { const g = __mh.g, E = __mh.E; E.start(g); const P = E.POLICIES[pol](g.seed); while (!g.over) E.step(g, P(g) || {}); g.events.length = 0; document.getElementById('ready').hidden = true; __mh.finish(); return { ...__mh.tip, k: document.getElementById('r-tipk').textContent }; }, [pol]);
    const exp = why === 'tilt' ? T.ko.tipTilt : T.ko.tipHigh;
    await p.screenshot({ path: EV + `c-result-${why}-412.png` });
    ok(`C result tip for '${why}' (${pol}, seed ${seed})`, r.why === why && r.text === exp, JSON.stringify(r));
    await p.ctx.close();
  }
  // time-out run with no drops → time tip
  const p = await open({ width: 412, height: 915 }, { touch: true, path: '/ko/play/magnet-harbor/?seed=tip0' });
  const r = await p.evaluate(() => { const g = __mh.g, E = __mh.E; E.start(g); const P = E.POLICIES.safe(g.seed); while (!g.over) E.step(g, P(g) || {}); g.events.length = 0; document.getElementById('ready').hidden = true; __mh.finish(); return { ...__mh.tip, fails: g.fails, ships: g.ships }; });
  ok('C result tip for time-out / last cause (safe policy)', r.text === (r.why === 'time' ? T.ko.tipTime : r.why === 'sea' ? T.ko.tipSea : r.why === 'tilt' ? T.ko.tipTilt : T.ko.tipHigh), JSON.stringify(r));
  await p.screenshot({ path: EV + 'c-result-safe-412.png' }); await p.ctx.close();
}
// ---- D. PERFECT streak label: engine reports the multiplier used; UI flash text uses T.combo for ×2/×3 ----
{
  let best = null; for (let i = 0; i < 30 && !best; i++) { const g = E.createGame(`pf${i}`); E.start(g); const P = E.POLICIES.safe(); const evs = []; while (!g.over) { E.step(g, P(g)); evs.push(...g.events.splice(0)); } const m = evs.filter((e) => e.k === 'land' && e.perfect && e.mult >= 2); const nonP = evs.filter((e) => e.k === 'land' && !e.perfect); if (m.length && nonP.length) best = { seed: `pf${i}`, streak: m.map((e) => e.mult), resetAfterNormal: (() => { let last = 1; for (const e of evs) if (e.k === 'land') { if (!e.perfect) last = 1; else { if (e.mult !== last) return false; last = Math.min(3, last + 1); } } else if (e.k === 'fall') last = 1; return true; })() }; }
  ok('D streak: PERFECT mult goes ×2/×3 and resets to ×1 after a normal landing or a drop', best && best.resetAfterNormal, JSON.stringify(best));
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const lbl = await p.evaluate(() => { const T = JSON.parse(document.getElementById('mt').textContent); return T.combo.replace('{n}', 3); }); ok('D streak label text', lbl === '연속 PERFECT ×3', lbl); await p.ctx.close();
}
// ---- E. 6 langs × 360×780 / 412×915: ready panel leaves the green deck visible; result panel fits without scrolling ----
{
  const bad = [], rows = [];
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const vp of [{ width: 360, height: 780 }, { width: 412, height: 915 }]) {
    const p = await open(vp, { touch: true, path: `/${l}/play/magnet-harbor/?seed=tip0` });
    const r = await p.evaluate(() => { const pb = document.querySelector('#ready .panel').getBoundingClientRect().bottom, cv = document.getElementById('cv').getBoundingClientRect(); return { pb: Math.round(pb), deck: Math.round(cv.top + cv.height * 0.8 - cv.width / 9) }; });
    if (vp.width === 360) await p.screenshot({ path: EV + `e-ready-${l}-360.png` });
    const q = await p.evaluate(() => { const g = __mh.g, E = __mh.E; E.start(g); const P = E.POLICIES.oneCol(g.seed); while (!g.over) E.step(g, P(g) || {}); g.events.length = 0; document.getElementById('ready').hidden = true; __mh.finish(); const el = document.querySelector('#res .panel'); return { sh: el.scrollHeight, ch: el.clientHeight }; });
    if (vp.width === 360) await p.screenshot({ path: EV + `e-result-${l}-360.png` });
    rows.push(`${l}@${vp.width}: ready ${r.pb}<${r.deck} result ${q.sh}/${q.ch}`);
    if (!(r.pb < r.deck)) bad.push(`${l}@${vp.width} ready covers deck`); if (q.sh > q.ch + 1) bad.push(`${l}@${vp.width} result scrolls ${q.sh}>${q.ch}`);
    await p.ctx.close();
  }
  ok('E 6 langs × 360/412: ready leaves deck visible, result fits', bad.length === 0, bad.join(' ; ') || rows.join(' | '));
}
await b.close();
out.fails = fails; writeFileSync(`${ROOT}reboot-evidence/magnet/learn-${tag}.json`, JSON.stringify(out, null, 1));
console.log(fails.length ? `FAILED ${fails.length}` : `ALL PASS ${Object.values(out).filter((v) => v && v.pass).length}`);
process.exit(fails.length ? 1 : 0);
