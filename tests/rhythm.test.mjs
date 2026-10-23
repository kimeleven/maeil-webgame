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
