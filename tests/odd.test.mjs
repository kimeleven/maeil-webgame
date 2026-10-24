// Odd Tile core unit tests (GDD r3 R4–R7c, R6/R6b/R6c/R6d engine side) [t_2964ede9]
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/odd-core.js';
const { W, G } = E.OT;
// grid 1: start 0, dl 5000 → D 5000, answer cell 3 (2x2)
const run = (inputs, f = 1000 / 60, opts) => E.replay('unit', inputs, f, opts);
const first = (r) => r.log[0];
const I = (t, cell, arr = t) => ({ t, cell, arr });

test('R4 judge: odd cell = hit, same-picture cell = wrong, D-1 hit with bonus 0, D exact = miss', () => {
  assert.equal(first(run([I(1000, 3)])).kind, 'hit');
  assert.equal(first(run([I(1000, 0)])).kind, 'wrong');
  const r = run([I(4999, 3)]); assert.equal(first(r).kind, 'hit'); assert.equal(first(r).pts, 10);
  assert.equal(first(run([I(5000, 3)])).kind, 'miss');
  assert.equal(E.speedBonus(5000, 0, 5000), 10); assert.equal(E.speedBonus(5000, 4999, 5000), 0);
});
test('R4 combo x2 at 5th, x3 at 10th, x1 after wrong; score non-decreasing', () => {
  assert.deepEqual([1, 4, 5, 9, 10, 30].map(E.comboMul), [1, 1, 2, 2, 3, 3]);
  const r = E.simPolicy('combo', 'skilled'); const hits = r.log.filter((e) => e.kind === 'hit');
  assert.equal(hits[4].combo, 5); assert.equal(hits[4].pts % 2, 0); assert.ok(hits[4].pts >= 2 * 10);
  assert.ok(hits[9].pts >= 30);
  let s = 0; for (const e of r.log) { const n = s + (e.pts || 0); assert.ok(n >= s); s = n; }
  // wrong resets combo
  const g = E.createGame('c2'); g.input(100, 3); g.frame(500); const s1 = g.S.start; g.input(s1 + 10, 1); g.frame(s1 + 1000); assert.equal(g.S.combo, 0);
});
test('R4b tutorial constants 1–3 (2x2, no generate), 3x3 at k4, 4x4 at k25', () => {
  const d = E.makeDeck('x'); assert.equal(d.grid(1), E.TUTORIAL[0]); assert.equal(d.blocks.length, 0);
  assert.deepEqual(E.TUTORIAL.map((g) => [g.n, g.ans, g.dl]), [[2, 3, 5000], [2, 0, 5000], [2, 1, 5000]]);
  assert.equal(d.grid(4).n, 3); assert.equal(d.grid(24).n, 3); assert.equal(d.grid(25).n, 4);
});
test('R5 idle: logical end exactly 60000, 0 found 0 score; result display T+G ≤ x < T+G+f (60/20fps)', () => {
  for (const f of [1000 / 60, 50]) { const r = run([], f); assert.equal(r.endLogical, 60000); assert.equal(r.found, 0); assert.equal(r.score, 0);
    assert.ok(r.resultShownAt >= 60050 && r.resultShownAt < 60050 + f, `${f}: ${r.resultShownAt}`); }
});
test('R5 T-1 judged, T ignored; grid deadline == T → discard (not miss)', () => {
  const o = { T: 2000 }; // grid1 D=5000 > T
  assert.equal(first(run([I(1999, 3)], 16, o)).kind, 'hit');
  const r = run([I(2000, 3)], 16, o); assert.equal(first(r).kind, 'end'); assert.equal(r.found, 0); assert.equal(r.judged, 0);
  const r2 = run([], 16, { T: 5000 }); assert.equal(first(r2).kind, 'end'); assert.equal(r2.judged, 0);
  // t0 < T with t0+W > T: result at max(T,t0+W)+G
  const r3 = run([I(1995, 3)], 1, o); assert.equal(first(r3).kind, 'hit'); assert.equal(r3.resultAt, 2011 + G);
});
test('R5 t<D arriving D+G-1 accepted, D+G late_drop', () => {
  assert.equal(first(run([I(4999, 3, 5049)])).kind, 'hit');
  const r = run([I(4999, 3, 5050)]); assert.equal(first(r).kind, 'miss'); assert.ok(r.drops.late >= 1);
});
test('R5/R6b fps independence: 60fps vs 20fps same log & score', () => {
  const xs = []; for (let t = 100; t < 59000; t += 137) xs.push(I(t, (t / 137) % 9 | 0, t + ((t * 7) % 40)));
  const a = run(xs, 1000 / 60), b = run(xs, 50);
  assert.deepEqual(a.game.replayLog(), b.game.replayLog()); assert.equal(a.score, b.score);
});
test('R6 +15 ms other cell → both void, wait continues; +16 → t0 confirmed; same cell overlap void', () => {
  const r = run([I(1000, 3), I(1015, 0)]); assert.equal(r.log[0].kind, 'void'); assert.equal(r.log[1].kind, 'miss'); assert.equal(r.log[1].at, 5000);
  assert.equal(first(run([I(1000, 3), I(1016, 0)])).kind, 'hit');
  assert.equal(first(run([I(1000, 3), I(1005, 3)])).kind, 'void');
});
test('R6b receive deadline: t1=1015 arriving 1030/1065 void, 1066 late_drop; t1=1016 → t0', () => {
  for (const a of [1030, 1065]) assert.equal(first(run([I(1000, 3), I(1015, 0, a)])).kind, 'void', `arr ${a}`);
  const r = run([I(1000, 3), I(1015, 0, 1066)]); assert.equal(first(r).kind, 'hit');
  for (const a of [1016, 1030, 1070]) assert.equal(first(run([I(1000, 3), I(1016, 0, a)])).kind, 'hit');
  // commit exactly once at first frame >= 1066
  const g = E.createGame('unit'); g.input(1000, 3, 1000); assert.equal(g.frame(1065).length, 0); const c = g.frame(1066); assert.equal(c.length, 1); assert.equal(g.frame(1067).length, 0);
});
test('R6c after void: t2=t0+W new candidate, t0+W-1 same bundle; D unchanged; t2<D with t2+W>D judged, t2=D miss', () => {
  let r = run([I(1000, 3), I(1010, 0), I(1016, 3, 1020)]); assert.equal(r.log[0].kind, 'void'); assert.equal(r.log[1].kind, 'hit'); assert.equal(r.log[1].t0, 1016);
  r = run([I(1000, 3), I(1010, 0), I(1015, 3)]); assert.equal(r.log[0].n, 3); assert.equal(r.log[1].kind, 'miss'); assert.equal(r.log[1].at, 5000);
  r = run([I(4980, 3), I(4985, 0), I(4996, 3)]); assert.equal(r.log[1].kind, 'hit');
  r = run([I(4980, 3), I(4985, 0), I(5000, 3)]); assert.equal(r.log[1].kind, 'miss');
  for (const gap of [0, 5, 10]) { const xs = []; for (let t = 1000; t < 2000; t += gap || 1) xs.push(I(t, 3)); const r2 = run(gap === 0 ? xs.flatMap((x) => [x, { ...x }]) : xs);
    const k1 = r2.log.filter((e) => e.k === 1); assert.ok(k1.every((e) => e.kind === 'void' || e.kind === 'miss') && k1.at(-1).kind === 'miss', `gap ${gap}`); assert.equal(r2.log.find((e) => e.kind === 'miss').at, 5000); }
});
test('R6d E1–E6 (engine side: pause = active clock frozen, arrival active = tp)', () => {
  // E1 t0=1000, tp=1008, no input → logical 1016, commit at first frame >= 1066 after resume
  let g = E.createGame('unit'); g.input(1000, 3, 1000); assert.equal(g.frame(1008).length, 0); /* paused: no frames */ assert.equal(g.frame(1065).length, 0); assert.equal(g.frame(1066)[0].kind, 'hit');
  // E3 t1=1015 (<tp=1020) arriving during pause → arr=1020 < 1066 → void ; tp=1070 → late_drop, t0
  assert.equal(first(run([I(1000, 3), I(1015, 0, 1020)])).kind, 'void');
  assert.equal(first(run([I(1000, 3), I(1015, 0, 1070)])).kind, 'hit');
  // E4 after resume at 1008: 1013 → void, 1016 → t0
  assert.equal(first(run([I(1000, 3), I(1013, 0)])).kind, 'void'); assert.equal(first(run([I(1000, 3), I(1016, 0)])).kind, 'hit');
  // E5 void bundle (1000,1010), tp=1012 → 1014 same bundle, 1016 new candidate
  let r = run([I(1000, 3), I(1010, 0), I(1014, 3)]); assert.equal(r.log[0].n, 3);
  r = run([I(1000, 3), I(1010, 0), I(1016, 3)]); assert.equal(r.log[1].kind, 'hit');
  // E6 D=5000: 4999 judged, 5000 miss; D<tp<D+G → miss already logical, commit after resume
  assert.equal(first(run([I(4999, 3)])).kind, 'hit'); assert.equal(first(run([I(5000, 3)])).kind, 'miss');
  g = E.createGame('unit'); assert.equal(g.frame(5020).length, 0); assert.equal(g.frame(5050)[0].kind, 'miss');
  // ③ committed → later arrivals don't change it
  g = E.createGame('unit'); g.input(1000, 3, 1000); g.frame(1066); assert.equal(g.input(1010, 0, 1200), 'late_drop'); assert.equal(g.S.log[0].kind, 'hit');
});
test('R3 determinism: same seed + log twice → same', () => {
  const xs = [I(900, 3), I(5300, 0), I(5310, 2), I(7000, 1)];
  assert.deepEqual(run(xs).game.replayLog(), run(xs).game.replayLog());
});
test('R7a seed 100 × blocks 0–15 pass ①–⑤, deterministic, fallback rate', () => {
  let fb = 0, n = 0, worst = 0;
  for (let s = 0; s < 100; s++) { const d = E.makeDeck(`s${s}`); d.ensure(15); const d2 = E.makeDeck(`s${s}`); d2.ensure(15);
    d.blocks.forEach((b, i) => { const tail = i === 0 ? E.TUT_TAIL : b && d.blocks[i - 1].grids.slice(-2).map((g) => [g.n, g.ans]); assert.deepEqual(E.validateWhy(b.grids, i, tail), [], `s${s} b${i}`); fb += b.fallback; n++; worst = Math.max(worst, b.ms); });
    assert.deepEqual(JSON.stringify(d.blocks.map((b) => b.grids)), JSON.stringify(d2.blocks.map((b) => b.grids))); }
  console.log(`R7a fallback ${fb}/${n} = ${((100 * fb) / n).toFixed(2)}%, worst block gen ${worst.toFixed(3)} ms`);
  assert.ok(fb / n <= 0.05);
});
test('R7b always-false validate → exactly 8 calls per block then fallback, block=fallback:b logged', () => {
  let calls = 0; const r = E.generate('z', 2, [[3, 1], [3, 2]], () => (calls++, false)); assert.equal(calls, 8); assert.equal(r.fallback, true);
  const d = E.makeDeck('z', () => false); d.ensure(1); assert.deepEqual(d.logs, ['block=fallback:0', 'block=fallback:1']);
});
test('R7c fallback for every b 0–15 × every possible prevTail passes ①–⑤ (mixed b2, boundary k13)', () => {
  let cases = 0;
  for (let b = 0; b < 16; b++) {
    const prevK = b === 0 ? [2, 3] : [3 + 9 * b - 1, 3 + 9 * b]; // last two k of previous block
    const sizes = prevK.map((k) => E.tableOf(k).n);
    const tails = [];
    for (let a = 0; a < sizes[0] ** 2; a++) for (let c = 0; c < sizes[1] ** 2; c++) if (!(sizes[0] === sizes[1] && a === c)) tails.push([[sizes[0], a], [sizes[1], c]]);
    for (const t of tails) { const blk = E.fallbackBlock(b, t); assert.deepEqual(E.validateWhy(blk, b, t), []); assert.ok(blk.every((g) => g.attr === 'size' && E.isValid(g.row, 'size', g.base.shape))); cases++; }
  }
  console.log(`R7c fallback cases ${cases}, fail 0`);
});
test('R7 X combos never generated (seed 100 × blocks 0–15)', () => {
  for (let s = 0; s < 100; s++) { const d = E.makeDeck(`x${s}`); d.ensure(15); for (const b of d.blocks) for (const g of b.grids) assert.ok(E.isValid(g.row, g.attr, g.base.shape), `${g.row} ${g.attr} ${g.base.shape}`); }
});
test('R11 policies (measured, seed 20)', () => {
  const pol = ['idle', ...Array.from({ length: 9 }, (_, i) => `fixed:${i}`), 'mash:0', 'mash:100', 'skilled'], res = {};
  for (const p of pol) { let sc = 0, fd = 0, jd = 0; for (let s = 0; s < 20; s++) { const r = p === 'idle' ? run([]) : E.simPolicy(`r${s}`, p); sc += r.score; fd += r.found; jd += r.judged; } res[p] = { score: sc / 20, found: fd / 20, acc: jd ? fd / jd : 0 }; }
  const best = Math.max(...pol.filter((p) => p !== 'skilled').map((p) => res[p].score));
  console.log('R11', JSON.stringify(res), 'ratio', (res.skilled.score / best).toFixed(2));
  assert.equal(res.idle.score, 0);
  // fixed: per complete block ≤ 2/9 hits
  for (let s = 0; s < 20; s++) for (let c = 0; c < 9; c++) { const d = E.makeDeck(`r${s}`); d.ensure(3); for (const b of d.blocks) { const n3 = b.grids.filter((g) => g.n === 3 && g.ans === c).length; assert.ok(n3 <= 2 && (c !== 4 || n3 <= 1)); } }
});
test('late-delivered lone candidate (timeStamp lag > G, before any commit) is still judged; companions in the same delivery count', () => {
  const r = run([I(27, 3, 198)]); assert.equal(first(r).kind, 'hit'); assert.equal(first(r).t0, 27);
  assert.equal(first(run([I(27, 3, 198), I(30, 0, 198)])).kind, 'void');
  assert.equal(first(run([I(27, 3, 198), I(30, 0, 199)])).kind, 'hit'); // arrives after the (late) commit point
  assert.equal(first(run([I(4990, 3, 5049)])).kind, 'hit'); assert.equal(first(run([I(4990, 3, 5050)])).kind, 'miss');
});
