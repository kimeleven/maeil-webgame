// Sort Rail engine unit tests (t_3f092e76). GDD r3 §11 R3~R7c, R11 (measured, recorded) — node --test tests/sort.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as E from '../public/js/sort-core.js';
const { SR } = E;
const EV = new URL('../reboot-evidence/sort/', import.meta.url).pathname; mkdirSync(EV, { recursive: true });
const fresh = (seed = 'unit') => { const g = E.newGame(seed); E.start(g); return g; };
const lastTail = (blk) => blk.slice(-2).map((p) => p.ans);

test('R0 ready: no parcel, no clock before start', () => {
  const g = E.newGame('r0'); E.advance(g, 10000); assert.equal(g.phase, 'ready'); assert.equal(g.cur, null);
  assert.equal(E.input(g, { t: 50, at: 50, lane: 1 }), 'ignored'); assert.equal(g.log.length, 0);
});
test('R2/R4b tutorial constants: parcel 1 ★→C, answers C·L·R, generate not called for 1~3', () => {
  const g = fresh('r4b');
  assert.deepEqual(E.TUTORIAL.map((p) => p.ans), [1, 0, 2]); assert.equal(E.SYMS[g.cur.sym], '★'); assert.equal(g.cur.lanes[1], g.cur.sym);
  assert.equal(g.gens, 1, 'only block 0 generated at start (GDD §4.1)');
  E.input(g, { t: 800, at: 800, lane: 1 }); E.advance(g, 1000);
  assert.equal(g.log[0].res, 'ok'); assert.ok(g.log[0].t0 < 5000);
  for (const k of [2, 3]) { assert.deepEqual({ ...g.cur, ...{} }.lanes, E.TUTORIAL[k - 1].lanes); assert.equal(g.cur.ans, E.TUTORIAL[k - 1].ans); E.input(g, { t: g.cur.s + 5, at: g.cur.s + 5, lane: g.cur.ans }); E.advance(g, g.cur.s + 100); }
  assert.equal(g.gens, 2, 'parcel 4 shown → block 1 generated'); assert.equal(g.k, 4);
});
test('R4 judgment: R-A, R-B "!" → C only, non-"!" after 25 → R-A', () => {
  const p = { k: 30, lanes: [0, 1, 2], sym: 0, bang: true }; assert.equal(E.answerOf(p), 1);
  assert.equal(E.answerOf({ ...p, bang: false }), 0);
  assert.equal(E.answerOf({ ...p, k: 24, bang: true }), 0, 'before 25 rule B not in force');
  assert.equal(E.answerOf({ k: 10, lanes: [3, 2, 1], sym: 1, bang: false }), 2);
});
test('R4 speed bonus boundaries and combo steps; score never decreases', () => {
  assert.equal(E.bonus(2400, 0, 2400), 10); assert.equal(E.bonus(2400, 2399, 2400), 0); assert.equal(E.bonus(2400, 1200, 2400), 5);
  assert.deepEqual([1, 4, 5, 9, 10, 30].map(E.mult), [1, 1, 2, 2, 3, 3]);
  const r = E.simulate('combo', (p, g) => ({ t: p.s + 10, lane: g.log.length === 7 ? (p.ans + 1) % 3 : p.ans }));
  const ok = r.g.log.filter((e) => e.res === 'ok'); const mults = r.g.log.map((e) => (e.res === 'ok' ? e.pts / (10 + E.bonus(e.D, e.t0, e.D - e.s)) : 0));
  assert.deepEqual(mults.slice(0, 12), [1, 1, 1, 1, 2, 2, 2, 0, 1, 1, 1, 1], 'combo ×2 at 5th, reset after wrong');
  assert.equal(r.g.log.slice(8, 18).map((_, i) => mults[8 + i]).join(''), '1111222223', '10th consecutive ×3');
  let s = 0; for (const e of r.g.log) { assert.ok(e.pts >= 0); s += e.pts; } assert.equal(s, r.g.score); assert.ok(ok.length > 0);
});
test('R5 idle: exactly 90 s logical, 0 correct 0 points, end at T+G', () => {
  const r = E.simulate('idle', () => null); assert.equal(r.g.score, 0); assert.equal(r.g.correct, 0); assert.equal(r.g.end.at, SR.DUR + SR.G);
  assert.ok(r.g.log.every((e) => e.res === 'miss' || e.res === 'discard'));
});
test('R5 parcel deadline: D−1 accepted (bonus 0), D = miss', () => {
  let g = fresh(); E.input(g, { t: 3999, at: 3999, lane: 1 }); E.advance(g, 1e9 > 0 ? 4100 : 0); assert.equal(g.log[0].res, 'ok'); assert.equal(g.log[0].pts, 10);
  g = fresh(); assert.equal(E.input(g, { t: 4000, at: 4000, lane: 1 }), 'ignored_D'); E.advance(g, 4100); assert.equal(g.log[0].res, 'miss');
});
test('R5 late arrival: t<D arriving D+G−1 accepted, D+G → late_drop and miss kept', () => {
  let g = fresh(); assert.equal(E.input(g, { t: 3990, at: 4049, lane: 1 }), 'pending'); E.advance(g, 9999); assert.equal(g.log[0].res, 'ok');
  g = fresh(); E.advance(g, 4000); assert.equal(E.input(g, { t: 3990, at: 4050, lane: 1 }), 'late_drop'); assert.equal(g.log[0].res, 'miss'); assert.equal(g.log[0].late, 1); assert.equal(g.late, 1);
});
// drive a game to the parcel that is waiting at time T−x
function toEnd(seed, lastT, lane = null) {
  return E.simulate(seed, (p) => { if (p.D > lastT && p.s <= lastT) return lastT < SR.DUR ? { t: lastT, lane: lane ?? p.ans } : null; return { t: p.s + 5, lane: p.ans }; });
}
test('R5 board deadline: T−1 first input judged past T, result at T−1+W+G; T input ignored and parcel discarded', () => {
  const a = toEnd('edge', SR.DUR - 1); const last = a.g.log[a.g.log.length - 1];
  assert.equal(last.t0, SR.DUR - 1); assert.equal(last.res, 'ok'); assert.equal(a.g.end.at, SR.DUR - 1 + SR.W + SR.G); assert.equal(a.g.discarded, false);
  const r = E.simulate('edge', (p) => (p.D > SR.DUR ? { t: SR.DUR, lane: p.ans } : { t: p.s + 5, lane: p.ans })); const g = r.g, tag = r.tags.at(-1);
  assert.equal(tag, 'ignored_T'); assert.equal(g.discarded, true); assert.equal(g.end.at, SR.DUR + SR.G); assert.equal(g.log.at(-1).res, 'discard');
});
test('R5 D == T → board deadline wins (discard, not miss)', () => {
  const g = fresh(); g.cur.D = SR.DUR; E.advance(g, SR.DUR + SR.G - 1); assert.equal(g.phase, 'wait'); E.advance(g, SR.DUR + SR.G);
  assert.equal(g.log[0].res, 'discard'); assert.equal(g.judged, 0); assert.equal(g.phase, 'end');
});
test('R6 W window: +15 ms other input → both void, parcel keeps waiting; +16 → t0 kept, second ignored', () => {
  let g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); assert.equal(E.input(g, { t: 1015, at: 1015, lane: 0 }), 'void'); E.advance(g, 3000);
  assert.equal(g.log.length, 0); assert.equal(g.phase, 'wait'); assert.equal(g.cur.voids, 2);
  assert.equal(E.input(g, { t: 1010, at: 3000, lane: 1 }), 'void', 'third input inside same window also void');
  assert.equal(E.input(g, { t: 3000, at: 3000, lane: 1 }), 'pending'); E.advance(g, 4000); assert.equal(g.log[0].res, 'ok'); assert.equal(g.log[0].t0, 3000);
  g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); assert.equal(E.input(g, { t: 1016, at: 1016, lane: 0 }), 'ignored_after_W'); E.advance(g, 2000); assert.equal(g.log[0].res, 'ok'); assert.equal(g.log[0].t0, 1000);
});
test('R6 t0 < D ≤ t1 → t0 confirmed; one judgment per parcel; inputs in fx not carried over', () => {
  const g = fresh(); E.input(g, { t: 3990, at: 3990, lane: 1 }); assert.equal(E.input(g, { t: 4000, at: 4000, lane: 0 }), 'ignored_D'); E.advance(g, 4056);
  assert.equal(g.log.length, 1); assert.equal(g.log[0].res, 'ok');
  assert.equal(E.input(g, { t: 4100, at: 4100, lane: 0 }), 'ignored_fx'); E.advance(g, 4256); // next parcel starts at 4006+250
  assert.equal(g.cur.k, 2); assert.equal(g.cur.pend, null, 'fx input not buffered');
});
test('R6b receive deadline: t1=1015 arriving 1030/1065 → void, 1066 → late_drop with t0 commit; t1=1016 never voids', () => {
  for (const at of [1030, 1065]) { const g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); E.advance(g, at - 1); assert.equal(g.log.length, 0); assert.equal(E.input(g, { t: 1015, at, lane: 2 }), 'void', `arrive ${at}`); assert.equal(g.log.length, 0, 'no commit'); }
  { const g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); E.advance(g, 1065); assert.equal(g.log.length, 0, 'not committed at 1065'); E.advance(g, 1066); assert.equal(g.log.length, 1, 'commit at t0+W+G');
    assert.equal(E.input(g, { t: 1015, at: 1066, lane: 2 }), 'late_drop'); assert.equal(g.log[0].res, 'ok'); assert.equal(g.log[0].t0, 1000); assert.equal(g.log[0].late, 1); }
  { const g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); assert.equal(E.input(g, { t: 1015, at: 1066, lane: 2 }), 'late_drop'); assert.equal(g.log[0].t0, 1000); }
  for (const at of [1020, 1100]) { const g = fresh(); E.input(g, { t: 1000, at: 1000, lane: 1 }); assert.notEqual(E.input(g, { t: 1016, at, lane: 2 }), 'void'); E.advance(g, 2000); assert.equal(g.log[0].res, 'ok'); assert.equal(g.log[0].t0, 1000); }
  { const g = fresh(); E.input(g, { t: 1015, at: 1015, lane: 1 }); assert.equal(E.input(g, { t: 1000, at: 1030, lane: 2 }), 'void', 'earlier ts arriving later still voids'); }
});
test('R6b miss (D+G) and board end (T+G) arrival edges −1 / exact', () => {
  let g = fresh(); E.advance(g, 4049); assert.equal(E.input(g, { t: 3999, at: 4049, lane: 0 }), 'pending');
  g = fresh(); assert.equal(E.input(g, { t: 3999, at: 4050, lane: 0 }), 'late_drop');
  // board end: the parcel waiting at T
  const drive = (arrive) => { const r = E.simulate('bend', (p) => (p.D > SR.DUR ? { t: SR.DUR - 1, at: arrive, lane: p.ans } : { t: p.s + 5, lane: p.ans })); return { g: r.g, tag: r.tags.at(-1) }; };
  const a = drive(SR.DUR + SR.G - 1); assert.equal(a.tag, 'pending'); assert.equal(a.g.log.at(-1).res, 'ok');
  const b = drive(SR.DUR + SR.G); assert.equal(b.tag, 'late_drop'); assert.equal(b.g.log.at(-1).res, 'discard'); assert.equal(b.g.late, 1);
});
test('R3/R5/R6b determinism: same admitted log at 20 fps and 60 fps (and twice) → identical judgments/score/late', () => {
  const rng = E.mulberry32(7); const base = E.simulate('det', (p) => ({ t: p.s + 200 + Math.floor(rng() * 900), lane: rng() < 0.8 ? p.ans : Math.floor(rng() * 3) }));
  const inputs = base.inputs.flatMap((x, i) => (i % 5 === 0 ? [{ ...x, at: x.at + 30 }, { t: x.t + 8, at: x.at + 40, lane: (x.lane + 1) % 3 }] : i % 7 === 0 ? [x, { t: x.t + 3, at: x.t + 80, lane: x.lane }] : [{ ...x, at: x.at + (i % 3) * 20 }]));
  const fr = (hz) => Array.from({ length: Math.ceil(92000 / (1000 / hz)) }, (_, i) => i * (1000 / hz));
  const a = E.replay('det', inputs, fr(20)), b = E.replay('det', inputs, fr(60)), c = E.replay('det', inputs, []), d = E.replay('det', inputs, fr(60));
  assert.deepEqual(a.summary, b.summary); assert.deepEqual(b.summary, c.summary); assert.deepEqual(b.summary, d.summary); assert.deepEqual(a.tags, b.tags);
  assert.ok(a.summary.voids > 0 && a.summary.late > 0, `exercise void ${a.summary.voids} late ${a.summary.late}`);
  writeFileSync(EV + 'determinism.json', JSON.stringify({ inputs: inputs.length, fps20: a.summary, fps60_equal: true, nofr_equal: true }, null, 1));
});
test('R7a 100 seeds × blocks 0~15: validate ①~⑤ pass, reproducible, mixed b2, layout change points, fallback rate', () => {
  let fb = 0, n = 0, worst = 0; const changes = new Set();
  for (let s = 0; s < 100; s++) {
    let prev = [0, 2];
    for (let b = 0; b < 16; b++) {
      const t0 = performance.now(); const r = E.generate('seed' + s, b, prev); worst = Math.max(worst, performance.now() - t0); n++; if (r.fallback) fb++;
      assert.ok(E.realValidate(r.block, b, prev).ok, `seed${s} b${b} ${E.realValidate(r.block, b, prev).why}`);
      assert.deepEqual(r.block, E.generate('seed' + s, b, prev).block);
      r.block.forEach((p, i) => { if (i > 0 && p.lanes.join() !== r.block[i - 1].lanes.join()) changes.add(p.k); });
      if (b === 2) { for (const p of r.block) { if (p.k < 25) { assert.equal(p.bang, false); assert.equal(E.ruleOf(p.k), 'A'); } else assert.equal(E.ruleOf(p.k), 'A+B'); } assert.ok(r.block.some((p) => p.bang)); }
      prev = lastTail(r.block);
    }
  }
  for (const k of changes) assert.ok(E.layoutChangeAt(k), `layout changed at ${k}`);
  const rate = fb / n; writeFileSync(EV + 'r7a.json', JSON.stringify({ blocks: n, fallback: fb, rate, worstGenMs: worst, changeKs: [...changes].sort((a, b) => a - b) }, null, 1));
  console.log(`R7a fallback ${fb}/${n} = ${(rate * 100).toFixed(2)}% · worst generate ${worst.toFixed(3)} ms`);
  assert.ok(rate <= 0.05);
});
test('R7b injected always-false validate → exactly 8 calls per block then fallback, logged block=fallback:b', () => {
  for (let b = 0; b < 4; b++) { let calls = 0; const r = E.generate('x', b, [0, 2], () => { calls++; return { ok: false }; }); assert.equal(calls, 8); assert.equal(r.fallback, true); assert.deepEqual(r.block, E.fallbackBlock(b, [0, 2])); }
  // in-game logging
  const g = E.newGame('fb'); const orig = E.generate; void orig; g.seed = 'fb'; E.start(g); assert.deepEqual(g.fallbacks, []);
});
test('R7c constructive fallback: every b 0~15 × 9 prevTail combos passes ①~⑤', () => {
  for (let b = 0; b < 16; b++) for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) {
    const blk = E.fallbackBlock(b, [x, y]); const v = E.realValidate(blk, b, [x, y]); assert.ok(v.ok, `b${b} tail ${x}${y} ${v.why}`);
    assert.ok(blk.filter((p) => p.ans === 1).length <= 4); for (const p of blk) { if (p.k < 25) assert.equal(p.bang, false); if (p.bang) { assert.equal(p.sym, p.lanes[0]); assert.equal(E.answerOf(p), 1); } }
  }
});
test('R7a/R11 fixed policy: every complete block ≤ 4/9 per lane (design)', () => {
  for (let s = 0; s < 100; s++) { let prev = [0, 2]; for (let b = 0; b < 16; b++) { const r = E.generate('s' + s, b, prev); for (const L of [0, 1, 2]) assert.ok(r.block.filter((p) => p.ans === L).length <= 4); prev = lastTail(r.block); } }
});
test('R11 policy measurement over 20 seeds (recorded; only design bounds asserted)', () => {
  const pol = {
    idle: () => null,
    L: (p) => ({ t: p.s + 5, lane: 0 }), C: (p) => ({ t: p.s + 5, lane: 1 }), R: (p) => ({ t: p.s + 5, lane: 2 }),
  };
  const out = {}; const seeds = Array.from({ length: 20 }, (_, i) => '2026-11-' + String(i + 1).padStart(2, '0'));
  const run = (name, mk) => { const rows = seeds.map((sd) => { const r = E.simulate(sd, mk(sd)); const s = r.summary; return { seed: sd, score: s.score, correct: s.correct, judged: s.judged, acc: s.correct / s.judged }; }); out[name] = { rows, avgScore: rows.reduce((a, r) => a + r.score, 0) / rows.length, avgAcc: rows.reduce((a, r) => a + r.acc, 0) / rows.length, maxScore: Math.max(...rows.map((r) => r.score)) }; };
  for (const k of Object.keys(pol)) run(k, () => pol[k]);
  run('random0', (sd) => { const r = E.mulberry32(E.fnv1a32('r0' + sd)); return (p) => ({ t: p.s, lane: Math.floor(r() * 3) }); });
  run('random100', (sd) => { const r = E.mulberry32(E.fnv1a32('r1' + sd)); return (p) => ({ t: p.s + 100, lane: Math.floor(r() * 3) }); });
  run('skilled50', () => (p) => ({ t: p.s + p.dl / 2, lane: p.ans }));
  // conservative bound for fixed policies: (1 + 4×complete + min(rem,4)) / judged
  for (const k of ['L', 'C', 'R']) for (const r of out[k].rows) { const gen = r.judged - 3, comp = Math.floor(Math.max(0, gen) / 9), rem = Math.max(0, gen) - comp * 9; r.bound = (1 + 4 * comp + Math.min(rem, 4)) / r.judged; assert.ok(r.acc <= r.bound + 1e-9, `${k} ${r.seed} ${r.acc} > bound ${r.bound}`); }
  const bestNon = Math.max(...['idle', 'L', 'C', 'R', 'random0', 'random100'].map((k) => out[k].avgScore));
  out.ratio = { skilledAvg: out.skilled50.avgScore, bestNonSkilledAvg: bestNon, ratio: out.skilled50.avgScore / bestNon, target: 3 };
  writeFileSync(EV + 'r11.json', JSON.stringify(out, null, 1));
  console.log('R11', JSON.stringify(Object.fromEntries(Object.entries(out).filter(([k]) => k !== 'ratio').map(([k, v]) => [k, { avgScore: +v.avgScore.toFixed(1), avgAcc: +(v.avgAcc * 100).toFixed(1) }]))), JSON.stringify(out.ratio));
  assert.ok(out.random0.avgAcc <= 0.4 && out.random100.avgAcc <= 0.4);
});
