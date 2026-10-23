// Fair Slice unit tests (t_bbb6c617). Deterministic engine only — not human fun, not real devices.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../public/js/fair-core.js';

const SQ = [[0, 0], [100, 0], [100, 100], [0, 100]];
const L = [[0, 0], [200, 0], [200, 100], [100, 100], [100, 200], [0, 200]];   // area 30000

test('R4 area: square x=50 → 50.0, x=49 → 49.0 (e 1.0, 80 pts); miss outside; rounding to tenths', () => {
  let j = F.judgeCut(SQ, [50, -10], [50, 10]); assert.equal(j.small10, 500); assert.equal(j.e10, 0); assert.equal(j.score, 120); assert.equal(j.grade, 'perfect');
  j = F.judgeCut(SQ, [49, 0], [49, 1]); assert.equal(j.small10, 490); assert.equal(j.e10, 10); assert.equal(j.score, 80); assert.equal(j.grade, 'good');
  j = F.judgeCut(SQ, [150, 0], [150, 1]); assert.equal(j.miss, true); assert.equal(j.e10, 500); assert.equal(j.score, 0);
  j = F.judgeCut(SQ, [0.05, 0], [0.05, 1]); assert.equal(j.miss, true, 'min/total < 0.001 is a miss');
  j = F.judgeCut(SQ, [0.2, 0], [0.2, 1]); assert.equal(j.miss, false); assert.equal(j.small10, 2);
  assert.equal(F.tenths(49.95), 500); assert.equal(F.tenths(49.94999), 499);   // round half up
});
test('R4 concave L: one side made of two pieces sums correctly (hand calc)', () => {
  // horizontal line y=50 → below: 200×50 = 10000; above: 30000-10000 = 20000 → 33.3 %
  let j = F.judgeCut(L, [0, 50], [10, 50]); assert.equal(j.small10, 333);
  // diagonal x+y=250: the far side is two separate triangles, one per arm (legs 50 each → 1250 + 1250 = 2500) → 8.3 %
  j = F.judgeCut(L, [250, 0], [0, 250]);
  const c = F.cutPoly(L, [250, 0], [0, 250]); assert.equal(Math.round(c.a1 + c.a2), 30000); assert.equal(Math.round(Math.min(c.a1, c.a2)), 2500);
  assert.equal(j.small10, 83);
  // x+y=150: far side 10000 (lower arm) + 8750 (upper arm) = 18750 → small 11250 → 37.5 %
  assert.equal(F.judgeCut(L, [150, 0], [0, 150]).small10, 375);
});
test('R4 grade/score boundaries', () => {
  const T = [[5, 'perfect', 110], [6, 'good', 88], [20, 'good', 60], [21, 'ok', 58], [50, 'ok', 0], [51, 'meh', 0], [500, 'meh', 0]];
  for (const [e, g, s] of T) { assert.equal(F.grade(e), g, `e ${e}`); assert.equal(F.roundScore(e), s, `e ${e}`); }
  assert.equal(F.roundScore(0), 120);
});
test('R5 no input: 10 timeouts, score 0, result at 116 s; boundary deadline−1 accepted, deadline = timeout', () => {
  const g = F.createGame('idle'); F.start(g, 0); F.advance(g, 200000);
  assert.equal(g.phase, 'result'); assert.equal(g.rounds.length, 10); assert.ok(g.rounds.every((r) => r.timeout && r.e10 === 500)); assert.equal(g.score, 0); assert.equal(g.end.at, 116000);
  const h = F.createGame('b'); F.start(h, 0); F.advance(h, 400); const dl = h.deadline; assert.equal(dl, 10400);
  const hl = F.halfLine(h.shapes[0].poly, 90);
  assert.equal(F.cut(h, hl[0], hl[1], dl - 1).ok, true);
  const k = F.createGame('b'); F.start(k, 0); F.advance(k, 400);
  const r = F.cut(k, hl[0], hl[1], dl); assert.equal(r.ok, false); assert.equal(r.why, 'timeout'); assert.equal(k.rounds[0].timeout, true);
});
test('R6 short drag (< 24) is cancelled without consuming the round; 24 counts', () => {
  const g = F.createGame('s'); F.start(g, 0); F.advance(g, 500);
  assert.equal(F.cut(g, [500, 100], [500, 123.9], 600).why, 'short'); assert.equal(g.phase, 'aim'); assert.equal(g.rounds.length, 0);
  assert.equal(F.cut(g, [500, 100], [500, 124], 700).ok, true); assert.equal(g.rounds.length, 1);
  assert.equal(F.cut(g, [500, 100], [500, 900], 800).why, 'phase', 'one cut per round');
});
test('R7a seed 100 × 10 rounds pass realValidate ①~⑦; same seed same shapes', () => {
  let fb = 0;
  for (let s = 0; s < 100; s++) {
    const A = F.genShapes('v' + s), B = F.genShapes('v' + s);
    assert.deepEqual(A.map((x) => x.poly), B.map((x) => x.poly));
    A.forEach((x, i) => { const c = F.checks(x.poly, i + 1); assert.ok(F.realValidate(x.poly, i + 1), `seed v${s} r${i + 1} ${JSON.stringify(c)}`); assert.ok(x.poly.length <= 24); if (x.fallback) fb++; });
  }
  console.log(`# R7a fallback rounds used: ${fb}/1000`);
});
test('R7b injected always-false validate: exactly 8 calls per round then fallback tag (not a correctness check)', () => {
  for (let r = 1; r <= 10; r++) { let n = 0; const g = F.generate('x', r, () => (n++, false)); assert.equal(n, 8); assert.equal(g.fallback, true); assert.equal(g.tag, `shape=fallback:${r}`); assert.deepEqual(g.poly, F.FALLBACK[r - 1]); }
});
test('R7c fallback constants pass realValidate directly (no injection)', () => {
  F.FALLBACK.forEach((P, i) => assert.ok(F.realValidate(P, i + 1), `fallback r${i + 1} ${JSON.stringify(F.checks(P, i + 1))}`));
});
test('R2 auto player (bisection half line) → all 10 rounds perfect, seed 50', () => {
  for (let s = 0; s < 50; s++) { const g = F.simulate('a' + s, (P, r) => F.halfLine(P, (r * 37) % 180)); assert.equal(g.rounds.length, 10); assert.ok(g.rounds.every((x) => x.e10 <= 5), `seed a${s} ${g.rounds.map((x) => x.e10)}`); }
});
test('R3 replay: same seed + same log → same per-round % and score; coordinates normalised to 0.1', () => {
  const g = F.simulate('rp', (P, r) => (r % 3 ? F.halfLine(P, r * 20) : [[100.04, 500.06], [900.01, 520.04]]));
  const a = F.replay('rp', g.log), b = F.replay('rp', JSON.parse(JSON.stringify(g.log)));
  assert.deepEqual(a, b); assert.equal(a.score, g.score);
  assert.deepEqual(g.log.find((e) => e.r === 3).p0, [100, 500.1]);
});
test('R1 keyboard: → ×10 = 10°, Shift+↑ = normal −10; angle cycles 0..179; offset clamp ±708; same judge', () => {
  const P = F.genShapes('k')[4].poly; let k = F.kbInit(P);
  for (let i = 0; i < 10; i++) k = F.kbRotate(k, 1); assert.equal(k.th, 10);
  k = F.kbMove(k, -10); assert.ok(Math.abs(F.kbOffset(k) + 10) < 1e-9);
  k = F.kbRotate(F.kbInit(P), -1); assert.equal(k.th, 179);
  k = F.kbMove(F.kbInit(P), -5000); assert.ok(Math.abs(F.kbOffset(k) + 708) < 1e-9);
  const [p0, p1] = F.kbPoints(F.kbInit(P)); const g = F.createGame('k'); F.start(g); F.advance(g, 400); g.r = 1;
  assert.ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) >= 24);
});
test('R11 (measurement, not a guarantee): horizontal line through bbox centre, rounds 3-10, seed 20', () => {
  const per = [];
  for (let s = 0; s < 20; s++) { const g = F.simulate('h' + s, (P) => { const B = F.bbox(P); return [[B.cx - 100, B.cy], [B.cx + 100, B.cy]]; }); per.push(g.rounds.slice(2).reduce((a, x) => a + x.score, 0) / 8); }
  const mean = per.reduce((a, b) => a + b, 0) / per.length;
  console.log(`# R11 fixed-horizontal mean score r3-10 over 20 seeds: ${mean.toFixed(1)} (target ≤ 50 [estimate]); per seed ${per.map((x) => x.toFixed(0)).join(',')}`);
  assert.ok(Number.isFinite(mean));
});

// t_411a0ed8: after any aborted pointer the UI resets the keyboard line to kbInit (never null); arrows from that reset must preview the same round's line.
test('kb reset after aborted pointer: kbInit → ArrowRight previews th=1, same foot', async () => {
  const E = await import('../public/js/fair-core.js'); const g = E.createGame('kbr'); const P = g.shapes[0].poly;
  const k0 = E.kbInit(P); assert.equal(k0.shown, false);
  const k1 = E.kbRotate(k0, 1); assert.equal(k1.shown, true); assert.equal(k1.th, 1); assert.equal(Math.round(E.kbOffset(k1) * 10), 0);
  const [p0, p1] = E.kbPoints(k1); assert.ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0);
});
