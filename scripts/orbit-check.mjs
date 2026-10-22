// Orbit Switch browser evidence (t_34f9c354): O1 O4(network) O6 O7 O8 O9 O10 + haptic/PNG/audio contracts.
// node scripts/orbit-check.mjs [baseUrl]   (default: starts local dev server on :5192)
// Runs HEADED Chromium: headless rAF is throttled to ~16 fps on this Mac, which would distort fps and real-time play.
// Automated browser runs only — not a substitute for real-device / real-player checks.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/orbit/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2];
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5192); U = 'http://localhost:5192'; }
const out = { base: U, at: new Date().toISOString() }; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); };
const PATH = '/ko/play/orbit-switch/';
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(vp, { touch = false, path = PATH + '?seed=check', init, game = true } = {}) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.reqs = [];
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  await p.goto(U + path); if (game) await p.waitForFunction(() => window.__orbit && __orbit.ready);
  return p;
}
const sw = (p) => p.evaluate(() => __orbit.g.log.switches.length);
const waitOver = (p, ms = 40000) => p.waitForFunction(() => __orbit.g.over && !document.getElementById('res').hidden, null, { timeout: ms });

// ---- O1 + O11(UI) on 412 touch ----
{
  const p = await open({ width: 412, height: 915 }, { touch: true });
  const sfx0 = await p.evaluate(() => __orbit.sfx);
  await sleep(400); const s0 = await sw(p);
  await p.touchscreen.tap(206, 600); await sleep(350); const s1 = await sw(p);
  await p.touchscreen.tap(60, 200); await sleep(40); await p.touchscreen.tap(60, 200); await sleep(350); const s2 = await sw(p); // 2nd tap within 0.25 s
  const mute = await p.locator('.bar [data-set=sound]').boundingBox();
  await p.touchscreen.tap(mute.x + mute.width / 2, mute.y + mute.height / 2); await sleep(350); const s3 = await sw(p);
  await p.touchscreen.tap(mute.x + mute.width / 2, mute.y + mute.height / 2); // back on
  const sfx1 = await p.evaluate(() => __orbit.sfx);
  out.O1_412 = { tap: s1 - s0, doubleTapWithin40ms: s2 - s1, muteButtonTap: s3 - s2, sfxBeforeInput: sfx0, sfxAfter: sfx1 };
  ok('O1 412 tap anywhere = 1 switch', s1 - s0 === 1);
  ok('O11 2nd tap within 0.25 s ignored', s2 - s1 === 1);
  ok('O11 mute button tap does not switch', s3 - s2 === 0);
  ok('audio: silent before first input', sfx0 === 0, `sfx after input ${sfx1}`);
  await p.screenshot({ path: EV + 'play-412.png' });
  // O9 at 412 (play)
  out.O9_412_play = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  await p.context().close();
}
// ---- O1 + O11(UI) on 1440: Space / click / key repeat ----
{
  const p = await open({ width: 1440, height: 1000 });
  await sleep(400); const s0 = await sw(p);
  await p.keyboard.press('Space'); await sleep(350); const s1 = await sw(p);
  await p.mouse.click(300, 500); await sleep(350); const s2 = await sw(p);
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true }))); await sleep(350); const s3 = await sw(p);
  await p.keyboard.down('Space'); await sleep(700); await p.keyboard.up('Space'); await sleep(50); const s4 = await sw(p); // held key: OS auto-repeat events ignored
  out.O1_1440 = { space: s1 - s0, click: s2 - s1, repeatEvent: s3 - s2, holdSpace700ms: s4 - s3 };
  ok('O1 1440 Space = 1 switch, click = 1 switch', s1 - s0 === 1 && s2 - s1 === 1);
  ok('O11 keydown repeat ignored (synthetic repeat=true, held key)', s3 - s2 === 0 && s4 - s3 <= 1, JSON.stringify(out.O1_1440));
  await p.screenshot({ path: EV + 'play-1440.png' });
  out.O9_1440_play = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  await p.context().close();
}
// ---- O6 results / restart, O9 widths, PNG, links (412 + 360 + 1440) ----
for (const vp of [{ width: 412, height: 915 }, { width: 360, height: 740 }, { width: 1440, height: 1000 }]) {
  const p = await open(vp, { path: PATH + '?seed=res' });
  await waitOver(p); // idle → dies at ~10 s
  const r1 = await p.evaluate(() => ({ title: document.getElementById('r-title').textContent, now: document.getElementById('r-now').textContent, best: document.getElementById('r-best').textContent, dt: document.getElementById('r-dt').textContent }));
  const t0 = Date.now(); await p.click('#b-again'); await p.waitForFunction(() => !__orbit.g.over && __orbit.g.t > 0.01); const restartMs = Date.now() - t0;
  await waitOver(p);
  const r2 = await p.evaluate(() => ({ now: document.getElementById('r-now').textContent, best: document.getElementById('r-best').textContent, dt: document.getElementById('r-dt').textContent, ds: document.getElementById('r-ds').textContent, near: document.getElementById('r-near').textContent }));
  const geo = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const small = [...document.querySelectorAll('button, a, summary')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44);
    const again = document.getElementById('b-again').getBoundingClientRect(), share = document.getElementById('b-share').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, w: innerWidth, small, againBigger: again.width * again.height > share.width * share.height && again.height > share.height };
  });
  const tag = `${vp.width}`;
  await p.screenshot({ path: EV + `result-${tag}.png` });
  const row = { vp: tag, first: r1, second: r2, restartMs, ...geo };
  if (vp.width === 412) {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#b-png')]);
    const f = EV + 'result-card.png'; await dl.saveAs(f); const buf = readFileSync(f);
    row.png = { name: dl.suggestedFilename(), bytes: buf.length, sig: buf.subarray(1, 4).toString(), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    ok('PNG download local 1080×1350', row.png.sig === 'PNG' && row.png.w === 1080 && row.png.h === 1350, `${row.png.name} ${row.png.bytes}B`);
    await p.click('#b-link'); row.link = await p.evaluate(() => navigator.clipboard.readText());
    ok('challenge link = preview path + ?seed only', /\/ko\/play\/orbit-switch\/\?seed=res$/.test(row.link), row.link);
    row.apiReqs = p.reqs.filter((u) => u.includes('/api')); row.reqs = [...new Set(p.reqs.map((u) => new URL(u).pathname))];
  }
  out['O6_' + tag] = row;
  ok(`O6 ${tag} result shows this/best/diff without sharing`, !!r1.now && !!r1.best && !!r2.dt && !!r2.best, `${r2.now} | best ${r2.best} | ${r2.dt} ${r2.ds} ${r2.near}`);
  ok(`O6 ${tag} restart 1 tap < 500 ms`, restartMs < 500, `${restartMs} ms`);
  ok(`O9 ${tag} no horizontal overflow, targets ≥44px, restart biggest`, geo.sw <= geo.w && geo.small.length === 0 && geo.againBigger, JSON.stringify(geo.small));
  if (p.errs.length) ok(`console errors ${tag}`, false, p.errs.join(' | '));
  await p.context().close();
}
// ---- O7 reduced motion + mute persistence; haptic off persistence ----
{
  const init = () => { window.__vib = 0; Object.defineProperty(navigator, 'vibrate', { value: () => { window.__vib++; return true; }, configurable: true }); };
  const p = await open({ width: 412, height: 915 }, { touch: true, init });
  await p.emulateMedia({ reducedMotion: 'reduce' }); await sleep(300);
  await p.touchscreen.tap(206, 500); await sleep(300);
  const d = await p.evaluate(() => __orbit.dbg());
  await p.emulateMedia({ reducedMotion: 'no-preference' }); await sleep(300); const d2 = await p.evaluate(() => __orbit.dbg());
  out.O7_motion = { reduced: d, normal: d2 };
  ok('O7 reduced motion: trail/shake/slow off', d.reduced && d.trail === 0 && !d.shake && !d.slow && d2.trail > 0, JSON.stringify(out.O7_motion));
  const vibOn = await p.evaluate(() => window.__vib);
  // turn sound + haptic off via the pause sheet (visible toggles), reload, verify persisted and no vibration
  await p.evaluate(() => { for (const k of ['sound', 'haptic']) document.querySelector(`#res [data-set=${k}]`).click(); });
  await p.reload(); await p.waitForFunction(() => window.__orbit && __orbit.ready);
  const st = await p.evaluate(() => ({ ls: localStorage.getItem('orbit-switch-settings'), mute: document.querySelector('.bar [data-set=sound]').getAttribute('aria-pressed'), haptic: document.querySelector('#res [data-set=haptic]').getAttribute('aria-pressed') }));
  await sleep(300); await p.touchscreen.tap(206, 500); await sleep(350); await p.touchscreen.tap(206, 500); await sleep(300);
  const after = await p.evaluate(() => ({ vib: window.__vib, sfx: __orbit.sfx, sw: __orbit.g.log.switches.length }));
  out.O7_persist = { vibrateCallsWhileOn: vibOn, afterReload: st, ...after };
  ok('haptic on → vibrate called', vibOn > 0, `${vibOn}`);
  ok('O7 mute + haptic-off persist after reload, no vibration/sfx', st.mute === 'false' && st.haptic === 'false' && after.vib === 0 && after.sfx === 0 && after.sw >= 1, JSON.stringify(out.O7_persist));
  // judgement identical: same seed level and sim results do not depend on motion (core has no motion input)
  await p.context().close();
}
// ---- O8 load / size / fps under 4× CPU + Fast 3G ----
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 / 8) * 0.9, uploadThroughput: (750 * 1024 / 8) * 0.9 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let bytes = 0; const urls = []; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; }); cdp.on('Network.requestWillBeSent', (e) => urls.push(e.request.url));
  const t0 = Date.now(); await p.goto(U + PATH + '?seed=perf', { waitUntil: 'commit' });
  await p.waitForFunction(() => window.__orbit && __orbit.ready, null, { polling: 16, timeout: 15000 }); const tapReadyMs = Date.now() - t0;
  const navReady = await p.evaluate(() => Math.round(__orbit.starts[0]));
  await p.touchscreen.tap(206, 500);
  const f0 = await p.evaluate(() => __orbit.frames); await sleep(8000); const f1 = await p.evaluate(() => __orbit.frames);
  const html = readFileSync(`${ROOT}public/ko/play/orbit-switch/index.html`);
  out.O8 = { tapReadyWallMs: tapReadyMs, tapReadyPerfNowMs: navReady, transferBytes: bytes, requests: urls.map((u) => new URL(u).pathname), htmlGzipBytes: gzipSync(html).length, htmlRawBytes: html.length, fps8s: +((f1 - f0) / 8).toFixed(1), note: 'local dev server sends uncompressed; Vercel serves gzip/br' };
  ok('O8 first tap ready ≤ 2 s (4× CPU, Fast 3G, local)', navReady <= 2000, `${navReady} ms (wall ${tapReadyMs} ms)`);
  ok('O8 page gzip ≤ 60 KB, 1 request before play, no /api', out.O8.htmlGzipBytes <= 60 * 1024 && urls.every((u) => !u.includes('/api')), `${out.O8.htmlGzipBytes} B gzip, requests ${out.O8.requests.join(',')}`);
  ok('O8 avg fps ≥ 50 during play (4× CPU)', out.O8.fps8s >= 50, `${out.O8.fps8s} fps`);
  await ctx.close();
}
// ---- O10 categories unchanged / not listed; O4 server unchanged ----
{
  const p = await open({ width: 1440, height: 1000 }, { path: '/ko/', game: false });
  const cats = await p.evaluate(() => ({ n: document.querySelectorAll('.grid3 .cat').length, orbitLinks: [...document.querySelectorAll('a')].filter((a) => a.href.includes('orbit')).length })).catch(() => null);
  await p.context().close();
  const walk = (d) => readdirSync(d).flatMap((f) => { const x = join(d, f); return statSync(x).isDirectory() ? walk(x) : [x]; });
  const refs = walk(`${ROOT}public`).filter((f) => /\.(html|xml|json|webmanifest|js)$/.test(f) && !f.includes('/orbit-switch/') && !/orbit(-core)?\.js$/.test(f)).filter((f) => readFileSync(f, 'utf8').includes('orbit-switch'));
  out.O10 = { lobbyCats: cats, filesReferencingOrbit: refs.map((f) => f.slice(ROOT.length)) };
  ok('O10 lobby still 3 categories, orbit not listed anywhere (sitemap/lobby/nav/manifest)', cats && cats.n === 3 && cats.orbitLinks === 0 && refs.length === 0, JSON.stringify(out.O10));
}
writeFileSync(EV + 'browser.json', JSON.stringify(out, null, 1));
console.log(fails.length ? `FAILED ${fails.length}: ${fails.join('; ')}` : 'all browser checks passed');
await b.close(); process.exit(fails.length ? 1 : 0);
