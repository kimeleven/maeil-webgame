// Echo Courier launch-metric checks (t_06bfa4bc): event flow + dedupe on 412 touch and 1440 keyboard,
// same contract as magnet (g, from, qa; play_start/play_again/play_end/share_click/share_done|share_fail).
// node scripts/orbit-events-check.mjs [baseUrl]   (default: local dev server)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
let U = process.argv[2]; let srv = null;
if (!U) { const { startServer } = await import('./dev.mjs'); const s = await startServer(0); srv = s.server; U = s.url; }
U = U.replace(/\/$/, '');
const fails = []; const out = { base: U, at: new Date().toISOString(), checks: {}, logs: {} };
const ok = (k, v, d = '') => { out.checks[k] = { pass: !!v, d }; (v ? console.log : console.error)(`${v ? '✔' : '✘'} ${k}${d ? ' — ' + d : ''}`); if (!v) fails.push(k); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (e) => e.name + (e.end ? ':' + e.end : '') + (e.via ? ':' + e.via : '');
const PATH = '/ko/play/echo-courier/';
const b = await chromium.launch();
const waitRes = (p) => p.waitForFunction(() => __echo.g.over && !document.getElementById('res').hidden, null, { timeout: 40000 });
const toTime = (p) => p.evaluate(() => { __echo.g.t = 89.99; }); // jump the clock to the last frame: 'time' end path

for (const [tag, vp, touch] of [['412', { width: 412, height: 915 }, true], ['1440', { width: 1440, height: 900 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // navigator.share is absent on desktop Chromium; on 412 stub it so one call resolves and one is cancelled
  if (touch) await p.addInitScript(() => { let n = 0; navigator.share = () => (++n === 1 ? Promise.resolve() : Promise.reject(new DOMException('cancel', 'AbortError'))); });
  await p.goto(`${U}${PATH}?seed=qa-ev-1&from=c&qa=1`); await p.waitForFunction(() => window.__echo && __echo.ready);
  const press = () => (touch ? p.tap('#ready') : p.keyboard.press('Space'));
  await sleep(200);
  ok(`${tag} no event before first input`, (await p.evaluate(() => (window.__trackLog || []).length)) === 0);
  await press(); await p.waitForFunction(() => __echo.armed);
  for (let i = 0; i < 3; i++) { await (touch ? p.touchscreen.tap(206, 500) : p.keyboard.press('Space')); await sleep(300); } // switches inside a run: no extra play_start
  await toTime(p); await waitRes(p);
  await sleep(300);
  ok(`${tag} result shown once → play_end once`, (await p.evaluate(() => __trackLog.filter((e) => e.name === 'play_end').length)) === 1);
  // share paths
  await p.click('#b-share'); await sleep(250);
  if (touch) { await p.click('#b-share'); await sleep(250); }
  await p.click('#b-link'); await sleep(250);
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.click('#b-png'); await dl; await sleep(250);
  // restart from the result (412 tap button, 1440 keyboard Enter), second run also ends on the timer
  if (touch) await p.click('#b-again'); else { await p.focus('#b-again'); await p.keyboard.press('Enter'); }
  await p.waitForFunction(() => !__echo.g.over && __echo.g.t > 0.01);
  await toTime(p); await waitRes(p); await sleep(300);
  // double-trigger restart guard: two quick restarts → only one again/start pair
  await p.evaluate(() => { document.getElementById('b-again').click(); document.getElementById('b-again').click(); });
  await sleep(300);
  const L = await p.evaluate(() => window.__trackLog);
  const names = L.map(key); out.logs[tag] = names;
  const exp = ['play_start', 'play_end:time',
    ...(touch ? ['share_click:native', 'share_done:native', 'share_click:native', 'share_fail:native'] : ['share_click:text', 'share_done:text']),
    'share_click:link', 'share_done:link', 'share_click:png', 'share_done:png',
    'play_again', 'play_start', 'play_end:time', 'play_again', 'play_start'];
  ok(`${tag} event sequence`, JSON.stringify(names) === JSON.stringify(exp), names.join(','));
  ok(`${tag} share cancel not counted as done`, !touch || names.filter((n) => n === 'share_done:native').length === 1);
  const starts = names.filter((n) => n === 'play_start').length, ends = names.filter((n) => n.startsWith('play_end')).length;
  ok(`${tag} 1 start per run, ends ≤ starts`, starts === 3 && ends === 2, `start ${starts} end ${ends}`);
  ok(`${tag} props: g=echo from=c qa=1, only whitelisted keys, ≤12 chars`, L.every((e) => e.g === 'echo' && e.from === 'c' && e.qa === '1' && Object.keys(e).every((k) => ['name', 'g', 'from', 'qa', 'end', 'via'].includes(k)) && Object.values(e).every((v) => typeof v === 'string' && v.length <= 12)), JSON.stringify(L[0]));
  ok(`${tag} no seed/score/streak/time in events`, !JSON.stringify(L).match(/qa-ev-1|seed|score|streak|"time":/)); // end:'time' value is the allowed enum
  await p.goto(`${U}${PATH}?qa=0`); await p.waitForFunction(() => window.__echo && __echo.ready); await press(); await sleep(200);
  ok(`${tag} qa=0 clears flag, from=direct`, await p.evaluate(() => __trackLog.length === 1 && __trackLog.every((e) => !e.qa && e.from === 'direct')));
  ok(`${tag} no page errors`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await b.close(); if (srv) srv.close();
mkdirSync(`${ROOT}reboot-evidence/echo`, { recursive: true });
writeFileSync(`${ROOT}reboot-evidence/echo/events-${srv ? 'local' : 'remote'}.json`, JSON.stringify({ ...out, fails }, null, 1));
console.log(fails.length ? `FAIL ${fails.length}` : `ALL PASS ${Object.keys(out.checks).length}`); process.exit(fails.length ? 1 : 0);
