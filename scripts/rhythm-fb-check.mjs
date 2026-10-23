// Rhythm Garden feedback-gate browser check (t_5517535f). node scripts/rhythm-fb-check.mjs [baseUrl] [--quick]
// Real Chromium, sound ENABLED (not muted as a test escape). Inputs via CDP with explicit past platform timestamps so the frame
// driver closes the window first. Evidence is split: W.fb = gated feedback, W.osc = real WebAudio oscillator starts (live
// AudioContext), W.vibs = real navigator.vibrate calls, W.snd = requested sounds (diagnostic). Automated only: not a real device,
// not audible perception, not human feel.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/rhythm/`; mkdirSync(EV, { recursive: true });
const args = process.argv.slice(2), quick = args.includes('--quick');
let U = args.find((a) => !a.startsWith('--')); const tag = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5199); U = 'http://localhost:5199'; }
const b = await chromium.launch({ headless: false, args: ['--window-position=0,0', '--autoplay-policy=no-user-gesture-required'] });
const rows = [], fails = [];
const ok = (name, pass, info) => { rows.push({ name, pass, info }); if (!pass) fails.push(name); console.log(`${pass ? '✔' : '✘'} ${name} | ${typeof info === 'string' ? info : JSON.stringify(info)}`); };
async function open(seed, vp = { width: 1440, height: 960 }, set) {
  const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  if (set) await p.addInitScript((s) => localStorage.setItem('rg-set', s), JSON.stringify(set));
  await p.goto(`${U}/ko/play/rhythm-garden/?seed=${seed}`); await p.waitForFunction(() => window.__rg && __rg.ready); await p.bringToFront();
  const cdp = await ctx.newCDPSession(p); return { ctx, p, cdp, errs };
}
const key = (cdp, type, epoch) => cdp.send('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, timestamp: epoch });
const epochOf = (p, raw) => p.evaluate((raw) => (performance.timeOrigin + __rg.T0 + __rg.P + raw) / 1000, raw);
const waitAct = (p, at) => p.evaluate((at) => new Promise((r) => { const f = () => { const a = __rg.act(performance.now()); if (a >= at) r(a); else requestAnimationFrame(f); }; f(); }), at);
async function startGame(p) { await p.keyboard.press('Enter'); await p.waitForFunction(() => __rg.g.phase === 'play'); }
const snap = (p) => p.evaluate(() => ({ fb: __rg.W.fb.map((x) => ({ ...x })), osc: __rg.W.osc.map((x) => x.k), st: __rg.W.osc.map((x) => x.st), vibs: __rg.W.vibs.slice(), snd: __rg.W.snd.slice(), canVib: typeof navigator.vibrate === 'function',
  g: { wilts: __rg.g.wilts, score: __rg.g.score, phase: __rg.g.phase, res0: __rg.g.res[0] }, fbn: __rg.fb.n, ev: __rg.evlog.filter((x) => x.k === 'down').map((x) => ({ raw: x.raw, recv: x.recv, frameAt: x.frameAt, path: x.path, r: x.r, why: x.why, revoked: x.revoked })) }));
// ---- A. boundary matrix on beat 0 (t=1334, w=160): raw = window edge 1494 (or on-beat 1334), delivered d ms late, frame first ----
const MATRIX = [['edge', 39], ['edge', 40], ['edge', 41], ['edge', 160], ['edge', 161], ['edge', 250], ['onbeat', 250], ['edge', 320], ['outside', 41]];
for (const [mode, d] of MATRIX) {
  const { ctx, p, cdp, errs } = await open('late'); await startGame(p);
  const B = await p.evaluate(() => __rg.g.chart.beats[0]); const raw = mode === 'edge' ? B.t + B.w : mode === 'onbeat' ? B.t : B.t + B.w + 1;
  await waitAct(p, raw + d - 3); const ep = await epochOf(p, raw);
  const pre = await p.evaluate(() => ({ res0: __rg.g.res[0], wilts: __rg.g.wilts, fb: __rg.W.fb.length, osc: __rg.W.osc.filter((x) => x.k === 'wilt').length, vib40: __rg.W.vibs.filter((v) => v === 40).length }));
  await key(cdp, 'keyDown', ep); await key(cdp, 'keyUp', ep + 0.03);
  await waitAct(p, raw + d + 450); const s = await snap(p); const e = s.ev[0] || {}; const dm = e.recv - e.raw;
  const near = s.fb.filter((x) => x.k === 0 || x.why === 'stray'), sig = near.map((x) => `${x.a}${x.why ? ':' + x.why : ''}`);
  const wiltOsc = s.osc.filter((k) => k === 'wilt').length, vib40 = s.vibs.filter((v) => v === 40).length;
  let expect, pass;
  if (mode === 'outside') { expect = ['wilt:miss', 'wilt:stray']; pass = JSON.stringify(sig.sort()) === JSON.stringify(expect) && wiltOsc === 2; }
  else if (dm > 250) { expect = ['wilt:miss']; pass = JSON.stringify(sig) === JSON.stringify(expect) && wiltOsc === 1 && e.path === 'stale'; }
  else { expect = [mode === 'edge' ? 'good' : 'perfect']; pass = JSON.stringify(sig) === JSON.stringify(expect) && wiltOsc === 0 && s.osc.includes(expect[0]) && pre.osc === 0; }
  if (s.canVib) pass = pass && vib40 === wiltOsc;
  pass = pass && !errs.length && s.st.every((x) => x === 'running');
  ok(`A ${mode} d=${d} (raw ${e.raw} recv ${e.recv} Δ${dm} frame ${e.frameAt} path ${e.path}; provisional ${pre.res0}/wilts ${pre.wilts} silent=${pre.osc === 0})`, pass,
    { announced: sig, expect, wiltOsc, oscKinds: [...new Set(s.osc)], vib40, canVib: s.canVib, wilts: s.g.wilts, score: s.g.score, revoked: e.revoked, errs });
  await ctx.close();
}
// ---- B. sound OFF: requested feedback still logged (W.snd) but no oscillator — the two evidences are separate ----
{
  const { ctx, p, cdp } = await open('late', undefined, { sound: false, haptic: true, motion: true }); await startGame(p);
  await waitAct(p, 1500); const ep = await epochOf(p, 1334); await key(cdp, 'keyDown', ep); await key(cdp, 'keyUp', ep + 0.03); await waitAct(p, 1900);
  const s = await snap(p); ok('B sound off: W.snd has feedback, W.osc empty (no WebAudio), gate same', s.snd.includes('perfect') && s.osc.length === 0 && s.fb.some((x) => x.a === 'perfect'), { snd: s.snd.slice(0, 5), osc: s.osc.length });
  await ctx.close();
}
// ---- C. pause inside the provisional window: miss announced once at pause (flush), not again after resume ----
{
  const { ctx, p, cdp } = await open('late'); await startGame(p);
  await waitAct(p, 1494 + 60); const pre = (await snap(p)).fb.filter((x) => x.a === 'wilt').length;
  await p.keyboard.press('p'); await p.waitForTimeout(80); const atP = await snap(p);
  await p.click('#pz'); await p.waitForFunction(() => !__rg.paused, null, { timeout: 6000 }); await waitAct(p, 2600);
  const s = await snap(p); const w0 = s.fb.filter((x) => x.a === 'wilt' && x.k === 0);
  ok('C pause flush: beat0 miss silent before pause, announced once at pause, not re-announced after resume', pre === 0 && atP.fb.filter((x) => x.a === 'wilt' && x.k === 0).length === 1 && w0.length === 1 && w0[0].flush === true && s.osc.filter((k) => k === 'wilt').length === s.fb.filter((x) => x.a === 'wilt').length, { pre, w0 });
  await ctx.close();
}
// ---- D. again (다시하기): a fresh gate — previous session's feedback never replays, new session misses announced once ----
// ---- E. 5th leaf: five real misses → the 5th is announced once before the result, result shown after HORIZON ----
{
  const { ctx, p } = await open('late'); await startGame(p);
  await p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 20000 });
  const s = await snap(p); const w = s.fb.filter((x) => x.a === 'wilt');
  const endInfo = await p.evaluate(() => { const r = __rg.evlog.find((x) => x.k === 'result'); return { resAt: __rg.act(r.at), end: __rg.g.now }; });
  ok('E 5th leaf: 5 wilts announced once each (5 wilt oscillators), result after HORIZON', w.length === 5 && new Set(w.map((x) => x.k)).size === 5 && s.osc.filter((k) => k === 'wilt').length === 5 && s.fbn === 5, { ks: w.map((x) => x.k), ...endInfo });
  const n0 = s.osc.length; await p.click('#b-again'); await startGame(p); await waitAct(p, 1494 + 300);
  const s2 = await snap(p); const w2 = s2.fb.filter((x) => x.a === 'wilt');
  ok('D again: new session announces its own beat0 miss once; old 5 not replayed', w2.length === 6 && w2[5].k === 0 && s2.osc.slice(n0).filter((k) => k === 'wilt').length === 1, { n: w2.length, newOsc: s2.osc.slice(n0) });
  await ctx.close();
}
// ---- F. full 90 s real-browser run (120 BPM segment, vines) with all perfect inputs delivered 0–200 ms late via CDP ----
if (!quick) {
  const { ctx, p, cdp, errs } = await open('fbrun'); await startGame(p);
  const ch = await p.evaluate(() => ({ beats: __rg.g.chart.beats, vines: __rg.g.chart.vines }));
  const ins = []; for (const bt of ch.beats) { if (bt.kind === 'seed') ins.push([bt.t, 'keyDown'], [bt.t + 30, 'keyUp']); if (bt.kind === 'head') ins.push([bt.t, 'keyDown']); if (bt.kind === 'tail') ins.push([bt.t, 'keyUp']); }
  ins.sort((a, c) => a[0] - c[0]); let seedR = 7; const rnd = () => ((seedR = (seedR * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let last = 0; const delays = [];
  for (const [raw, type] of ins) { const d = Math.max(last - raw, Math.floor(rnd() * 200)); last = raw + d; delays.push(d); await waitAct(p, raw + d); await key(cdp, type, await epochOf(p, raw)); }
  await p.waitForFunction(() => !document.getElementById('res').hidden, null, { timeout: 20000 });
  const s = await snap(p); const fin = await p.evaluate(() => ({ wilts: __rg.g.wilts, perfect: __rg.g.perfect, good: __rg.g.good, survived: __rg.g.end.survived, vines: __rg.g.chart.vines.length, b120: __rg.g.chart.beats.filter((x) => x.t >= 60000).length, paths: __rg.evlog.filter((x) => x.k === 'down' || x.k === 'up').reduce((m, x) => ((m[x.path] = (m[x.path] || 0) + 1), m), {}) }));
  const wo = s.osc.filter((k) => k === 'wilt').length, hits = s.fb.filter((x) => x.a !== 'wilt').length, maxD = Math.max(...s.ev.map((x) => x.recv - x.raw));
  ok('F 90 s run, 120 BPM + vines, late delivery 0–200 ms: 0 wilts announced, every hit announced once, finish once', fin.survived && fin.wilts === 0 && wo === 0 && hits === fin.perfect + fin.good && s.snd.filter((k) => k === 'finish').length === 1 && s.osc.filter((k) => k === 'finish').length === 4 && !errs.length,
    { ...fin, hitsAnnounced: hits, wiltOsc: wo, maxDelay: maxD, inputs: ins.length, errs });
  await ctx.close();
}
await b.close();
writeFileSync(`${EV}fb-${tag}.json`, JSON.stringify({ base: U, at: new Date().toISOString(), rows, fails }, null, 1));
console.log(`${rows.length - fails.length}/${rows.length} pass → reboot-evidence/rhythm/fb-${tag}.json`);
process.exit(fails.length ? 1 : 0);
