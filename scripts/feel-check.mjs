// t_2d4c9465 feel check: node scripts/feel-check.mjs  (needs dev server on :4319)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const U = process.env.U || 'http://localhost:4319';
const OUT = new URL('../reboot-evidence/feel/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const res = {}; const ok = (k, v) => { res[k] = v; console.log(k, JSON.stringify(v)); };
const b = await chromium.launch();
for (const [name, vp] of [['412', { width: 412, height: 915 }], ['1440', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: name === '412', hasTouch: name === '412' });
  await ctx.addInitScript(() => { window.__buzz = []; navigator.vibrate = (p) => (window.__buzz.push(p), true); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const t0 = Date.now(); await p.goto(U + '/ko/play/gate-rush/?seed=feel', { waitUntil: 'load' }); await p.waitForFunction(() => window.__gameTest); ok(`ready_ms_${name}`, Date.now() - t0);
  ok(`ctx_before_input_${name}`, await p.evaluate(() => __gameTest.sfx.state.ctx));
  await p.screenshot({ path: `${OUT}ready-${name}.png` });
  await p.click('.gmodal .btn');
  ok(`ctx_after_start_${name}`, await p.evaluate(() => __gameTest.sfx.state.ctx));
  // stand still → get hit, then lose
  await p.evaluate(() => { __gameTest.step(31); });
  await p.waitForTimeout(1600);
  const st = await p.evaluate(() => ({ s: __gameTest.state.state, sfx: __gameTest.sfx.state, buzz: window.__buzz.length }));
  ok(`after_run_${name}`, st);
  await p.screenshot({ path: `${OUT}end-${name}.png` });
  if (st.s === 'lost') {
    const t1 = Date.now(); await p.click('.gmodal .stack .btn:last-child');
    const r = await p.evaluate(() => ({ s: __gameTest.state.state, seed: __gameTest.state.seed, stage: __gameTest.state.stage, ov: document.querySelector('[data-ov]').hidden }));
    ok(`retry_1tap_${name}`, { ...r, ms: Date.now() - t1 });
  }
  // mute persists
  await p.uncheck('[data-sfx=sound]'); await p.reload(); await p.waitForFunction(() => window.__gameTest);
  ok(`mute_persist_${name}`, await p.evaluate(() => ({ checked: document.querySelector('[data-sfx=sound]').checked, ls: localStorage.getItem('gate-rush-sfx') })));
  await p.check('[data-sfx=sound]');
  ok(`errors_${name}`, errs); await ctx.close();
}
// reduced motion → no vibrate; no AudioContext API → graceful
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { window.__buzz = []; navigator.vibrate = (p) => (window.__buzz.push(p), true); delete window.AudioContext; delete window.webkitAudioContext; });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(U + '/en/play/gate-rush/?seed=feel'); await p.waitForFunction(() => window.__gameTest); await p.click('.gmodal .btn');
await p.evaluate(() => __gameTest.step(31)); await p.waitForTimeout(1500);
ok('reduced_noaudio', { buzz: await p.evaluate(() => window.__buzz.length), sfx: await p.evaluate(() => __gameTest.sfx.state), supported: await p.evaluate(() => __gameTest.sfx.supported), state: await p.evaluate(() => __gameTest.state.state), errs });
await b.close();
writeFileSync(OUT + 'feel.json', JSON.stringify(res, null, 2));
