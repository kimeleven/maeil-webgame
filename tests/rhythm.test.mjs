// Rhythm Garden unit tests (t_177308a9): GDD r2 R2 R3 R4 R5 R6 R7 R11a R13 + boundary-input priority.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/rhythm-core.js';
const { RG } = E;
// hand-made chart helper: beats with automatic w; vines by index pairs
const mk = (beats, vines = []) => ({ beats: beats.map((b) => ({ ...b, w: E.winOf(b.t) })), vines, attempt: 0, fallback: false });
const game = (chart, o = 0) => { const g = E.createGame('t', { chart, offset: o }); E.start(g); return g; };
const last = (g) => g.events[g.events.length - 1];

test('R4 judge boundaries t>=10000: ±50 PERFECT, ±51/±120 GOOD, ±121 stray wilt', () => {
  for (const d of [-50, 50]) assert.equal(E.input(game(mk([{ t: 20000, kind: 'seed' }])), 'down', 20000 + d).a, 'perfect');
  for (const d of [-51, 51, -120, 120]) assert.equal(E.input(game(mk([{ t: 20000, kind: 'seed' }])), 'down', 20000 + d).a, 'good');
  for (const d of [-121, 121]) { const g = game(mk([{ t: 20000, kind: 'seed' }])); const e = E.input(g, 'down', 20000 + d); assert.equal(e.a, 'wilt'); assert.equal(g.wilts, d > 0 ? 2 : 1); } // +121: miss (closed first) + stray
});
test('R4 t<10000: ±160 GOOD, ±161 wilt; t=9999 → w160, t=10000 → w120', () => {
  for (const d of [-160, 160]) assert.equal(E.input(game(mk([{ t: 5000, kind: 'seed' }])), 'down', 5000 + d).a, 'good');
  for (const d of [-161, 161]) assert.equal(E.input(game(mk([{ t: 5000, kind: 'seed' }])), 'down', 5000 + d).a, 'wilt');
  assert.equal(E.winOf(9999), 160); assert.equal(E.winOf(10000), 120);
});
test('R4 second tap in the same window wilts; tap inside a rest window wilts', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }])); assert.equal(E.input(g, 'down', 20000).a, 'perfect'); E.input(g, 'up', 20010);
  const e = E.input(g, 'down', 20030); assert.equal(e.a, 'wilt'); assert.equal(e.why, 'double');
  const r = game(mk([{ t: 20000, kind: 'rest' }])); assert.equal(E.input(r, 'down', 20000).why, 'rest');
  const p = game(mk([{ t: 20000, kind: 'rest' }])); E.advance(p, 20200); assert.equal(p.wilts, 0); assert.equal(p.res[0], 'pass');
});
test('R4 offset: o=+30, input at t+30 → Δ0 PERFECT; storage normalisation', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }]), 30); const e = E.input(g, 'down', 20030); assert.equal(e.a, 'perfect'); assert.equal(e.d, 0);
  assert.equal(E.normOffset(-150), -100); assert.equal(E.normOffset(101), 100); assert.equal(E.normOffset('abc'), 0); assert.equal(E.normOffset(12.6), 13); assert.equal(E.normOffset('12.6'), 13); assert.equal(E.normOffset(null), 0);
});
test('boundary priority: input exactly at window close counts before the miss (±w inclusive)', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }])); E.advance(g, 20120); assert.equal(g.wilts, 0); // frame exactly at close: still open
  assert.equal(E.input(g, 'down', 20120).a, 'good'); E.advance(g, 20121); assert.equal(g.wilts, 0);
  const h = game(mk([{ t: 20000, kind: 'seed' }])); E.advance(h, 20121); assert.equal(h.wilts, 1); assert.equal(h.res[0], 'miss');
  // with offset the close is on corrected time: o=-100 → raw 20020 is corrected 20120 (still open)
  const o = game(mk([{ t: 20000, kind: 'seed' }]), -100); E.advance(o, 20020); assert.equal(o.wilts, 0); assert.equal(E.input(o, 'down', 20020).a, 'good');
});
test('R4/R10 active time: pause is outside the engine (UI subtracts P); inputs outside play ignored', () => {
  const g = E.createGame('t', { chart: mk([{ t: 20000, kind: 'seed' }]) }); assert.equal(E.input(g, 'down', 20000).a, 'ignored'); E.start(g);
  // UI: active(ts) = ts - T_start - P. 5 s pause → the same beat is hit with Δ=0
  const T = 1000, P = 5000, ts = T + P + 20000; assert.equal(E.input(g, 'down', ts - T - P).d, 0);
});
test('R5 idle: 100 seeds → result before 6 s, score 0', () => {
  for (let s = 0; s < 100; s++) { const g = E.simulate('idle' + s, 'idle'); assert.equal(g.phase, 'result'); assert.ok(g.end.c < 6000, `${g.end.c}`); assert.equal(g.score, 0); }
});
test('R7 100 seeds pass ①~⑧; same seed twice → same chart; validator forced to fail → 8 tries then fallback (valid)', () => {
  for (let s = 0; s < 100; s++) { const a = E.genChart('r7-' + s), b = E.genChart('r7-' + s); assert.deepEqual(E.validate(a), []); assert.deepEqual(a, b); assert.ok(a.tries <= 8); }
  const f = E.genChart('x', { validate: () => [9] }); assert.equal(f.tries, 8); assert.equal(f.fallback, true); assert.deepEqual(E.validate(f), []);
  const c = E.genChart('2026-10-23'); const B = c.beats; let minGap = 1e9; for (let k = 0; k + 1 < B.length; k++) minGap = Math.min(minGap, B[k + 1].t - B[k].t - B[k].w - B[k + 1].w);
  assert.ok(minGap >= RG.GAP_PAD);
});
test('R2 perfect bot: first success < 5 s; PERFECT, rest pass, combo 10 before 30 s; no vine < 30 s, first vine success 30–36 s', () => {
  for (let s = 0; s < 50; s++) {
    const g = E.simulate('r2-' + s, 'perfect'); const ev = g.events;
    assert.ok(ev.find((e) => e.a === 'perfect').c < 5000);
    assert.ok(ev.some((e) => e.a === 'pass' && e.c < 30000)); const k10 = g.chart.beats.findIndex((b) => b.t >= 0); void k10;
    let combo = 0, c10 = Infinity; for (const e of ev) { if (e.a === 'perfect' || e.a === 'good') { combo++; if (combo === 10) { c10 = Math.min(c10, e.c); } } }
    assert.ok(c10 < 30000);
    const heads = ev.filter((e) => e.part === 'head'), tails = ev.filter((e) => e.part === 'tail');
    assert.ok(heads.every((e) => e.c >= 30000)); assert.ok(heads[0].c >= 30000 && heads[0].c <= 36000); assert.ok(tails[0].a === 'perfect');
    assert.equal(g.wilts, 0); assert.equal(g.end.survived, true);
  }
});
test('R3 replay: same seed + log → identical results (also through the policy logs)', () => {
  for (const pol of ['random', 'perfect', 'everyBeat']) for (let s = 0; s < 5; s++) {
    const g = E.simulate(`r3${pol}${s}`, pol), r = E.replay(g.seed, g.log);
    assert.deepEqual([r.score, r.maxCombo, r.perfect, r.wilts, r.res], [g.score, g.maxCombo, g.perfect, g.wilts, g.res]);
  }
});
test('R6 frame rate independence: advancing at 60 / 20 / 7 fps between inputs gives the same judgements', () => {
  const g0 = E.simulate('r6', 'random');
  for (const fps of [60, 20, 7]) {
    const g = E.createGame('r6'); E.start(g); let f = 0, i = 0; const L = g0.log;
    while (g.phase === 'play' && f <= RG.DUR) { while (i < L.length && L[i][1] <= f) { g.o = L[i][2]; E.input(g, L[i][0], L[i][1], L[i][3]); i++; } E.advance(g, f); f += Math.round(1000 / fps); }
    E.advance(g, RG.DUR); assert.deepEqual([g.score, g.wilts, g.res], [g0.score, g0.wilts, g0.res]);
  }
});
test('R11a 20 seeds × idle / double tap / every-beat tap: all end by 5 wilts (every-beat within 30 s), 0 finishes', () => {
  for (let s = 0; s < 20; s++) for (const pol of ['idle', 'double', 'everyBeat']) {
    const g = E.simulate(`a${s}`, pol); assert.equal(g.wilts, 5, pol); assert.equal(g.end.survived, false);
    if (pol === 'everyBeat') assert.ok(g.end.c < 30000, `${g.end.c}`);
  }
});
// R13 vine: head 30000 (w120), tail 30545 (L=1). Nothing else.
const V = () => game(mk([{ t: 30000, kind: 'head', v: 0 }, { t: 30545, kind: 'tail', v: 0 }], [{ h: 0, e: 1 }]));
test('R13 vine contract', () => {
  for (const d of [-120, 120]) { const g = V(); E.input(g, 'down', 30000); assert.equal(E.input(g, 'up', 30545 + d).a, 'good'); assert.equal(g.wilts, 0); }
  { const g = V(); E.input(g, 'down', 30000); const e = E.input(g, 'up', 30545 - 121); assert.equal(e.why, 'early'); assert.equal(g.wilts, 1); }
  { const g = V(); E.input(g, 'down', 30000); E.advance(g, 30665); assert.equal(g.wilts, 0); E.advance(g, 30666); assert.equal(g.wilts, 1); assert.equal(g.res[1], 'late'); assert.equal(E.input(g, 'up', 30700).a, 'ignored'); assert.equal(g.wilts, 1); }
  { const g = V(); E.advance(g, 30121); assert.equal(g.wilts, 1); E.input(g, 'down', 30545); E.input(g, 'up', 30600); E.advance(g, 31000); assert.equal(g.wilts, 1); assert.equal(g.score, 0); }
  { const g = V(); E.input(g, 'down', 30000, 1); for (let i = 0; i < 10; i++) assert.equal(E.input(g, 'down', 30050 + i * 40, 2 + i).a, 'ignored'); assert.equal(E.input(g, 'cancel', 30545, 1).a, 'perfect'); assert.equal(g.wilts, 0); }
  { const g = V(); E.input(g, 'down', 30000, 'key'); E.pauseRelease(g, 30200); assert.equal(g.wilts, 1); assert.equal(E.input(g, 'up', 30545, 'key').a, 'ignored'); assert.equal(g.wilts, 1); }
  // early release then re-press inside head window: still ≤1 wilt for the vine
  { const g = V(); E.input(g, 'down', 30000); E.input(g, 'up', 30050); E.input(g, 'down', 30080); E.input(g, 'down', 30500); E.input(g, 'up', 30545); E.advance(g, 31000); assert.equal(g.wilts, 1); }
});
test('R13 fuzz: any random input log → wilts per vine ≤ 1', () => {
  const r = E.rng(7);
  for (let s = 0; s < 40; s++) {
    const g = E.createGame('fz' + s); E.start(g); let t = 29000;
    while (t < 90000 && g.phase === 'play') { t += Math.floor(r() * 400); E.input(g, r() < 0.5 ? 'down' : r() < 0.8 ? 'up' : 'cancel', t, r() < 0.8 ? 'p' : 'q'); }
    const per = new Map(); for (const e of g.events) if (e.a === 'wilt' && e.k >= 0 && g.chart.beats[e.k].v !== undefined) per.set(g.chart.beats[e.k].v, (per.get(g.chart.beats[e.k].v) || 0) + 1);
    for (const n of per.values()) assert.ok(n <= 1);
  }
});
test('R11b (measured, not guaranteed): random 1 tap/beat — seeds with mean survival ≤ 10 s', () => {
  let okSeeds = 0; const means = [];
  for (let s = 0; s < 20; s++) { let sum = 0; for (let k = 0; k < 10; k++) { const g = E.createGame(`b${s}`); E.start(g); const r = E.rng(E.hash(`rb${s}:${k}`)); for (const [kk, raw, id] of E.policyInputs(g.chart, 'random', r)) { if (g.phase !== 'play') break; E.input(g, kk, raw, id); } E.advance(g, RG.DUR); sum += g.end.c; } const m = sum / 10; means.push(Math.round(m)); if (m <= 10000) okSeeds++; }
  console.log(`R11b random: ${okSeeds}/20 seeds mean survival ≤ 10 s; means(ms) ${means.join(',')}`);
  assert.ok(okSeeds >= 0);
});

// ---- t_552009cf: failure causes + 40 ms frame-lag boundary ----
test('causes: per-reason counts match engine wilt reasons; top = most frequent, ties → fixed order', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }, { t: 20600, kind: 'rest' }, { t: 21200, kind: 'seed' }, { t: 21800, kind: 'seed' }]));
  E.input(g, 'down', 20000); E.input(g, 'down', 20030);   // double
  E.input(g, 'down', 20600);                              // rest
  E.input(g, 'down', 20400);                              // stray (between windows)
  E.advance(g, 22000);                                    // 21200 and 21800(not yet: 21920<22000 → closed) miss
  const C = E.causes(g);
  assert.deepEqual(C.n, { miss: 2, stray: 1, double: 1, rest: 1, early: 0, late: 0 });
  assert.equal(C.total, g.wilts); assert.equal(C.top, 'miss');
  const t = game(mk([{ t: 20000, kind: 'seed' }])); E.input(t, 'down', 19000); E.input(t, 'down', 20000); E.input(t, 'down', 20010);
  assert.equal(E.causes(t).top, 'stray');                 // stray 1 = double 1 → order picks stray
  assert.equal(E.causes(game(mk([{ t: 20000, kind: 'seed' }]))).top, null);
});
test('causes: PO session shape — 1 hit + 5 misses → hits n=1 is the accuracy sample, top cause miss', () => {
  const B = [20000, 20600, 21200, 21800, 22400, 23000].map((t) => ({ t, kind: 'seed' }));
  const g = game(mk(B)); E.input(g, 'down', 19968); E.advance(g, 30000);
  assert.equal(g.phase, 'result'); assert.equal(g.end.survived, false);
  const A = E.accuracy(g), C = E.causes(g);
  assert.equal(A.n, 1); assert.equal(A.mean, -32); assert.equal(C.n.miss, 5); assert.equal(C.top, 'miss');
});
// UI model: each frame at receive time r calls advance(r - LAG); an input stamped ts is fed with raw=ts when delivered at ts+d.
// Worst case = a frame runs right before the queued input is delivered.
const LAG = 40;
const lagged = (bt, ts, d, o = 0) => { const g = game(mk([{ t: bt, kind: 'seed' }, { t: bt + 500, kind: 'seed' }]), o); E.advance(g, ts + d - LAG); return { g, e: E.input(g, 'down', ts) }; };
test('LAG 40: window-edge input (ts = t+w) delivered 39/40 ms late is judged; 41 ms late is misjudged as miss+stray', () => {
  for (const d of [0, 39, 40]) { const { g, e } = lagged(70000, 70120, d); assert.equal(e.a, 'good', `d=${d}`); assert.equal(g.wilts, 0); }
  { const { g, e } = lagged(70000, 70120, 41); assert.equal(e.why, 'stray'); assert.equal(g.wilts, 2); }
  // early-phase window (w=160) same edge rule
  { const { e } = lagged(5000, 5160, 40); assert.equal(e.a, 'good'); } { const { g } = lagged(5000, 5160, 41); assert.equal(g.wilts, 2); }
});
test('LAG 40: on-beat input survives delivery delay up to w+40 (120 BPM: 160 ms); CPU stall beyond → misjudge', () => {
  for (const d of [100, 160]) { const { e } = lagged(70000, 70000, d); assert.equal(e.a, 'perfect', `d=${d}`); }
  { const { g, e } = lagged(70000, 70000, 161); assert.equal(e.why, 'stray'); assert.equal(g.wilts, 2); }
  { const { g } = lagged(70000, 70000, 250); assert.equal(g.wilts, 2); }   // 250 ms main-thread stall + frame first
  // if the browser delivers the queued input BEFORE the next frame (usual ordering), any stall is safe
  { const g = game(mk([{ t: 70000, kind: 'seed' }])); assert.equal(E.input(g, 'down', 70000).a, 'perfect'); E.advance(g, 70250 - LAG); assert.equal(g.wilts, 0); }
});
test('LAG 40: vine release at tail edge (120 BPM) — 40 ms ok, 41 ms → late wilt (≤1 per vine kept)', () => {
  const V2 = () => game(mk([{ t: 61000, kind: 'head', v: 0 }, { t: 62000, kind: 'tail', v: 0 }], [{ h: 0, e: 1 }]));
  { const g = V2(); E.input(g, 'down', 61000); E.advance(g, 62120 + 40 - LAG); assert.equal(E.input(g, 'up', 62120).a, 'good'); assert.equal(g.wilts, 0); }
  { const g = V2(); E.input(g, 'down', 61000); E.advance(g, 62120 + 41 - LAG); assert.equal(E.input(g, 'up', 62120).a, 'ignored'); assert.equal(g.wilts, 1); assert.equal(E.causes(g).n.late, 1); }
});
// ---- t_2b703714: deliver() — frame-first ordering no longer double-penalises a timestamp-valid input (≤ HORIZON old) ----
const dl = (bt, ts, d, kind = 'down', o = 0) => { const g = game(mk([{ t: bt, kind: 'seed' }, { t: bt + 500, kind: 'seed' }]), o); E.advance(g, ts + d - LAG); return { g, r: E.deliver(g, kind, ts, 'p', ts + d) }; };
test('deliver: window-edge input 39/40/41/160/161/250 ms late, frame first → judged at its timestamp, 0 wilts', () => {
  for (const d of [0, 39, 40, 41, 160, 161, 250]) { const { g, r } = dl(70000, 70120, d); assert.equal(r.e.a, 'good', `d=${d}`); assert.equal(g.wilts, 0, `d=${d}`); assert.equal(g.res[0], 'good'); }
  for (const d of [41, 161, 250]) { const { g, r } = dl(5000, 5160, d); assert.equal(r.e.a, 'good'); assert.equal(g.wilts, 0); }
  for (const d of [160, 161, 250]) { const { g, r } = dl(70000, 70000, d); assert.equal(r.e.a, 'perfect', `on-beat d=${d}`); assert.equal(g.wilts, 0); assert.equal(r.path, 'rebuild'); }
});
test('deliver: windows unchanged — a tap really outside the window (t+121) is still miss+stray, same as direct delivery', () => {
  // out-of-window tap at t+121 delivered 41 ms late: miss (beat really missed) + stray (tap really hit nothing) — same as direct
  const { g: a } = dl(70000, 70121, 41); const b = game(mk([{ t: 70000, kind: 'seed' }, { t: 70500, kind: 'seed' }])); E.input(b, 'down', 70121);
  assert.equal(a.wilts, b.wilts); assert.equal(a.wilts, 2); assert.deepEqual(E.causes(a).n, E.causes(b).n);
});
test('deliver: beyond HORIZON (251 ms) the closed miss is final and the stale tap is discarded (single penalty, never double)', () => {
  const { g, r } = dl(70000, 70000, 251); assert.equal(r.path, 'stale'); assert.equal(r.e.why, 'stale'); assert.equal(g.wilts, 1); assert.equal(E.causes(g).n.stray, 0);
  // stale but the beat is still open at its timestamp (no frame closed it) → judged normally
  const h = game(mk([{ t: 70000, kind: 'seed' }])); h.now = 69990; const r2 = E.deliver(h, 'down', 70010, 'p', 70400); assert.equal(r2.e.a, 'perfect');
});
test('deliver: vine tail release 41/250 ms late after frame → good, no late wilt; down/up boundary order kept', () => {
  const V2 = () => game(mk([{ t: 61000, kind: 'head', v: 0 }, { t: 62000, kind: 'tail', v: 0 }], [{ h: 0, e: 1 }]));
  for (const d of [41, 250]) { const g = V2(); E.input(g, 'down', 61000); E.advance(g, 62120 + d - LAG); const r = E.deliver(g, 'up', 62120, 'p', 62120 + d); assert.equal(r.e.a, 'good', `d=${d}`); assert.equal(g.wilts, 0); assert.equal(g.vine[0], 'done'); }
  // head down delivered late after the head window closed → held, then up on time
  { const g = V2(); E.advance(g, 61120 + 41 - LAG); const r = E.deliver(g, 'down', 61120, 'p', 61161); assert.equal(r.e.a, 'good'); assert.equal(g.vine[0], 'held'); assert.equal(E.deliver(g, 'up', 62000, 'p', 62000).e.a, 'perfect'); assert.equal(g.wilts, 0); }
  // cancel (pointercancel) late = up
  { const g = V2(); E.input(g, 'down', 61000); E.advance(g, 62100); assert.equal(E.deliver(g, 'cancel', 62050, 'p', 62141).e.a, 'perfect'); assert.equal(g.wilts, 0); }
});
test('deliver: duplicate tap stays a double wilt; order inside the log is by timestamp', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }, { t: 20600, kind: 'seed' }])); E.deliver(g, 'down', 20000, 'p', 20000); E.deliver(g, 'up', 20010, 'p', 20010);
  E.advance(g, 20200); const r = E.deliver(g, 'down', 20030, 'p', 20241); assert.equal(r.e.why, 'double'); assert.equal(g.wilts, 1); assert.equal(g.score, 20);
});
test('deliver: 5th provisional miss ended the game → late valid tap within HORIZON reopens it (4 wilts, still playing)', () => {
  const B = [20000, 20600, 21200, 21800, 22400, 23000].map((t) => ({ t, kind: 'seed' })); const g = game(mk(B));
  E.advance(g, 22521 + 41 - LAG); assert.equal(g.phase, 'result'); assert.equal(g.wilts, 5);   // 4 real misses + provisional 5th
  const r = E.deliver(g, 'down', 22520, 'p', 22561); assert.equal(r.path, 'rebuild'); assert.equal(r.e.a, 'good');
  assert.equal(g.phase, 'play'); assert.equal(g.wilts, 4); assert.equal(r.revoked.filter((x) => x.a === 'wilt').length, 1);
});
test('deliver: 90 s end — last beat hit delivered 41 ms after the final frame still counts; result stays survived', () => {
  const ch = E.genChart('end'), B = ch.beats; const k = B.map((b) => b.kind).lastIndexOf('seed'), b = B[k];
  const ins = E.policyInputs(ch, 'perfect').filter(([, raw]) => raw !== b.t);
  const g = E.createGame('end', { chart: ch }); E.start(g); for (const [kk, raw, id] of ins) E.input(g, kk, raw, id);
  const recv = Math.max(RG.DUR, b.t + b.w + 41); E.advance(g, recv - LAG); if (recv >= RG.DUR) E.advance(g, recv);
  assert.equal(g.res[k], 'miss'); const w0 = g.wilts, s0 = g.score;
  const r = E.deliver(g, 'down', b.t + b.w, 'p', b.t + b.w + 41); assert.equal(r.path, 'rebuild'); assert.equal(r.e.a, 'good');
  assert.equal(g.res[k], 'good'); assert.equal(g.wilts, w0 - 1); assert.ok(g.score > s0); assert.equal(g.phase, recv >= RG.DUR ? 'result' : 'play');
  // ended game: input older than HORIZON is final
  const g2 = E.simulate('end', 'perfect'); assert.equal(E.deliver(g2, 'down', RG.DUR - 300, 'p', RG.DUR + 400).path, 'final');
});
test('deliver: pause release (pauseRelease up) then the real up arriving late → ignored, no extra wilt', () => {
  const g = game(mk([{ t: 61000, kind: 'head', v: 0 }, { t: 62000, kind: 'tail', v: 0 }], [{ h: 0, e: 1 }]));
  E.input(g, 'down', 61000); E.pauseRelease(g, 61500); const w = g.wilts; assert.equal(E.deliver(g, 'up', 61600, 'p', 61600).e.a, 'ignored'); assert.equal(g.wilts, w);
});
test('deliver: replay determinism — rebuilt game equals a game that received the same inputs in timestamp order', () => {
  const ch = E.genChart('det'); const ins = E.policyInputs(ch, 'perfect');
  const a = E.createGame('det', { chart: ch }); E.start(a); const b = E.createGame('det', { chart: ch }); E.start(b);
  for (const [k, raw, id] of ins) { E.advance(a, raw + 60 - LAG); E.deliver(a, k, raw, id, raw + 60); E.input(b, k, raw, id); }
  E.advance(a, RG.DUR); E.advance(b, RG.DUR); assert.equal(a.score, b.score); assert.equal(a.wilts, 0); assert.equal(a.perfect, b.perfect);
});
// ---- t_5517535f: feedback gate — success immediately, wilt (irreversible sound/vibration/fx) exactly once after it is final ----
// UI model: every frame fbStep(now); every delivery fbStep(recv); pause/result → flush. Collect what would be announced.
const H = E.HORIZON;
function ui(g) { const f = E.fbGate(), said = []; const step = (now, flush) => { for (const e of E.fbStep(f, g, now, flush)) said.push({ ...e, at: now }); }; return { f, said, step,
  frame: (now) => { E.advance(g, now - LAG); step(now); }, feed: (k, raw, recv, id = 'p') => { const r = E.deliver(g, k, raw, id, recv); step(recv); return r; } }; }
test('gate: PO repro — beat 1334 closed by frame 1535, key ts 1494 recv 1594 → good once, the provisional miss never announced', () => {
  const g = E.createGame('late'); E.start(g); const u = ui(g); const b = g.chart.beats[0]; assert.equal(b.t, 1334);
  for (let t = 0; t <= 1535 + LAG; t += 16) u.frame(t); u.frame(1535 + LAG); assert.equal(g.res[0], 'miss'); assert.equal(g.wilts, 1);
  assert.equal(u.said.length, 0, 'provisional miss is silent');
  const r = u.feed('down', 1494, 1594, 'key'); assert.equal(r.path, 'rebuild'); assert.equal(g.wilts, 0); assert.equal(g.score, 10);
  for (let t = 1600; t <= 3000; t += 16) u.frame(t); u.feed('up', 1524, 3000, 'key');
  const w0 = u.said.filter((e) => e.a === 'wilt' && e.k === 0);
  assert.equal(w0.length, 0); assert.deepEqual(u.said.filter((e) => e.k === 0).map((e) => e.a), ['good']);
});
test('gate: miss boundary — final exactly when now − (end + o) > HORIZON (250 silent, 251 announced once), with offset', () => {
  for (const o of [0, 30, -40]) {
    const g = game(mk([{ t: 20000, kind: 'seed' }, { t: 22000, kind: 'seed' }]), o); const u = ui(g); const end = 20120 + o;
    u.frame(end + LAG + 1); assert.equal(g.wilts, 1); u.frame(end + H); assert.equal(u.said.length, 0, `o=${o} at +250`);
    u.frame(end + H + 1); assert.equal(u.said.length, 1, `o=${o} at +251`); for (let t = end + H + 2; t < end + 900; t += 7) u.frame(t); assert.equal(u.said.length, 1);
  }
});
test('gate: 39/40/41/160/161/250 ms late valid inputs → only success announced; 320 ms (stale) → the miss announced once, no stray', () => {
  for (const d of [39, 40, 41, 160, 161, 250]) for (const raw of [70120, 70000]) {
    const g = game(mk([{ t: 70000, kind: 'seed' }, { t: 70700, kind: 'seed' }])); const u = ui(g);
    for (let t = 69000; t < raw + d; t += 16) u.frame(t); u.frame(raw + d); u.feed('down', raw, raw + d); for (let t = raw + d; t < 70500; t += 16) u.frame(t);
    assert.deepEqual(u.said.map((e) => e.a), [raw === 70000 ? 'perfect' : 'good'], `d=${d} raw=${raw}`);
  }
  const g = game(mk([{ t: 70000, kind: 'seed' }, { t: 71000, kind: 'seed' }])); const u = ui(g);
  for (let t = 69000; t <= 70440; t += 16) u.frame(t); const r = u.feed('down', 70120, 70440); assert.equal(r.path, 'stale');
  for (let t = 70440; t < 70800; t += 16) u.frame(t); assert.deepEqual(u.said.map((e) => `${e.a}:${e.why}`), ['wilt:miss']);
});
test('gate: real failures still announced exactly once (stray, double, rest, early, late vine) — no loss, no duplicate', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }, { t: 20700, kind: 'rest' }, { t: 61000, kind: 'head', v: 0 }, { t: 62000, kind: 'tail', v: 0 }, { t: 64000, kind: 'head', v: 1 }, { t: 65000, kind: 'tail', v: 1 }],
    [{ h: 2, e: 3 }, { h: 4, e: 5 }])); const u = ui(g);
  const ins = [[19000, 'down'], [19020, 'up'], [20000, 'down'], [20010, 'up'], [20040, 'down'], [20050, 'up'], [20700, 'down'], [20710, 'up'], [61000, 'down'], [61500, 'up'], [64000, 'down']];
  let i = 0; for (let t = 18000; t < 66000; t += 16) { while (i < ins.length && ins[i][0] <= t) { u.feed(ins[i][1], ins[i][0], t + 30); i++; } u.frame(t); }
  const w = u.said.filter((e) => e.a === 'wilt').map((e) => e.why); assert.deepEqual(w, ['stray', 'double', 'rest', 'early', 'late']);
  assert.equal(w.length, g.wilts); assert.equal(new Set(u.said.map(E.fbSig)).size, u.said.length);
});
test('gate: pause flush — pending wilt announced once at pause (inputs dropped), nothing re-announced after resume', () => {
  const g = game(mk([{ t: 20000, kind: 'seed' }, { t: 22000, kind: 'seed' }])); const u = ui(g); u.frame(20200); assert.equal(u.said.length, 0);
  u.step(20200, true); assert.equal(u.said.length, 1); for (let t = 20200; t < 21000; t += 16) u.frame(t); assert.equal(u.said.length, 1);
});
test('gate: 5th leaf — provisional end revoked by late tap → that wilt never announced; real 5th announced once by result flush', () => {
  const B = [20000, 20600, 21200, 21800, 22400, 23000].map((t) => ({ t, kind: 'seed' }));
  { const g = game(mk(B)); const u = ui(g); for (let t = 19000; t <= 22561; t += 16) u.frame(t); u.frame(22561); assert.equal(g.phase, 'result');
    u.feed('down', 22520, 22561); assert.equal(g.phase, 'play'); for (let t = 22561; t < 24000; t += 16) u.frame(t);
    assert.deepEqual(u.said.filter((e) => e.a === 'wilt').map((e) => e.k), [0, 1, 2, 3, 5]); assert.ok(!u.said.some((e) => e.a === 'wilt' && e.k === 4)); }
  { const g = game(mk(B)); const u = ui(g); for (let t = 19000; t <= 22600; t += 16) u.frame(t); assert.equal(g.phase, 'result'); const n = u.said.length;
    assert.equal(n, 4); u.step(22600, true); assert.equal(u.said.length, 5); u.step(23000, true); u.frame(23000); assert.equal(u.said.length, 5); }
});
test('gate: rebuild re-creates earlier successes silently (no duplicate success), random late-delivery soak = engine totals', () => {
  for (const seed of ['s1', 's2', 's3', 'late']) {
    const g = E.createGame(seed); E.start(g); const u = ui(g); const r = E.rng(E.hash('soak' + seed));
    const ins = E.policyInputs(g.chart, 'random', r).map(([k, raw, id]) => [k, raw, id, raw + Math.floor(r() * 300)]).sort((a, b) => a[3] - b[3]);
    let i = 0; for (let t = 0; t <= RG.DUR + 400 && g.phase !== 'result'; t += 16) { while (i < ins.length && ins[i][3] <= t) { const [k, raw, id, recv] = ins[i++]; u.feed(k, raw, recv, id); } u.frame(t); if (t >= RG.DUR) E.advance(g, t); }
    u.step(RG.DUR + 400, true);
    const sigs = u.said.map(E.fbSig); assert.equal(new Set(sigs).size, sigs.length, `${seed}: no duplicate`);
    const wilts = u.said.filter((e) => e.a === 'wilt');
    // every final engine wilt announced; nothing announced that is not in the final timeline
    const fin = new Set(g.events.filter((e) => e.a === 'wilt').map(E.fbSig)); assert.equal(wilts.length, fin.size, seed); for (const w of wilts) assert.ok(fin.has(E.fbSig(w)), seed);
    assert.equal(u.said.filter((e) => e.a !== 'wilt').length >= g.perfect + g.good, true);
  }
});
