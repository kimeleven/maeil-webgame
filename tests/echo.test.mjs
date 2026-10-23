import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/echo-core.js';

const lens = (g) => g.log.rounds.map((x) => x.L);
test('echo A1: starts at 3, +1 per success, caps at 12 (stays 12)', () => {
  const g = E.simulate('a1', 'perfect', 0.05);
  const L = lens(g); assert.equal(L[0], 3);
  for (let i = 1; i < L.length; i++) assert.equal(L[i], Math.min(12, L[i - 1] + 1));
  assert.ok(L.filter((x) => x === 12).length >= 2, 'reached 12 and stayed');
  for (let s = 0; s < 50; s++) for (const x of lens(E.simulate('s' + s, (g, w) => (Math.random() < 0.3 ? (w + 1) % 9 : w), 0.2))) assert.ok(x >= 3 && x <= 12);
});
test('echo A4: two fails at same length → one shorter, 3 stays 3', () => {
  let n = 0; const g = E.simulate('a4', (g, w) => { if (g.idx === 0) n++; return g.r <= 4 ? w : (w + 1) % 9; }, 0.05);
  const L = lens(g); // rounds 1-4 succeed (3,4,5,6), then fails: 7,7,6,6,5,5,4,4,3,3,3...
  assert.deepEqual(L.slice(0, 14), [3, 4, 5, 6, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3]);
  assert.ok(L.slice(13).every((x) => x === 3)); void n;
});
test('echo A3: fail → next round r+1 with same length after 1.2 s', () => {
  const g = E.createGame('a3'); while (g.phase !== 'input') E.step(g, 0.01);
  E.tap(g, (g.path[0] + 1) % 9); assert.equal(g.phase, 'fail'); const t0 = g.t;
  while (g.r === 1) E.step(g, 0.01);
  assert.ok(g.t - t0 <= 1.21 && g.t - t0 >= 1.19); assert.equal(g.path.length, 3);
  assert.deepEqual(g.path, E.basePath('a3', 2).slice(0, 3));
});
test('echo A5/A8: 90 s of active time, no per-cell limit, round in progress not recorded', () => {
  const g = E.createGame('a8'); while (g.phase !== 'input') E.step(g, 0.01);
  for (let i = 0; i < 1000; i++) E.step(g, 0.01); // 10 s idle
  assert.equal(g.phase, 'input'); assert.equal(g.fails, 0);
  const h = E.simulate('a5', 'perfect', 0.6); assert.equal(h.t, 90);
  assert.equal(h.done, h.log.rounds.filter((x) => x.res === 'ok').length);
  assert.ok(h.log.rounds.at(-1).res === undefined);
});
test('echo A6a: same seed + same inputs → identical rounds', () => {
  const pol = (g, w) => (g.r % 4 === 2 ? (w + 2) % 9 : w);
  assert.deepEqual(E.simulate('x', pol).log.rounds, E.simulate('x', pol).log.rounds);
});
test('echo A6b: different histories → round r paths share the shorter prefix (r 1..10)', () => {
  const a = E.simulate('y', 'perfect').log.rounds, b = E.simulate('y', (g, w) => (g.r === 2 ? (w + 1) % 9 : w)).log.rounds;
  for (let r = 0; r < 10; r++) { const n = Math.min(a[r].L, b[r].L); assert.deepEqual(a[r].path.slice(0, n), b[r].path.slice(0, n)); }
  assert.notDeepEqual(a.slice(0, 10).map((x) => x.L), b.slice(0, 10).map((x) => x.L));
});
test('echo A6c: 100 seeds — first 6 unique, no repeat, adjacent moves', () => {
  let revisit = 0;
  for (let s = 0; s < 100; s++) for (let r = 1; r <= 20; r++) {
    const p = E.basePath('seed' + s, r); assert.equal(p.length, 12);
    assert.equal(new Set(p.slice(0, 6)).size, 6);
    for (let i = 1; i < 12; i++) assert.ok(E.adjacent(p[i - 1], p[i]), `${p}`);
    for (let i = 6; i < 12; i++) if (p.slice(0, i).includes(p[i])) revisit++;
  }
  assert.ok(revisit > 0);
});
test('echo: replay restarts the echo of the current round, time continues', () => {
  const g = E.createGame('rp'); while (g.phase !== 'input') E.step(g, 0.01); E.tap(g, g.path[0]);
  const t = g.t, r = g.r; assert.ok(E.replay(g)); assert.equal(g.idx, 0); assert.equal(g.phase, 'show'); assert.equal(g.t, t); assert.equal(g.r, r);
});
test('echo: numpad mapping', () => { assert.equal(E.cellOfKey(7), 0); assert.equal(E.cellOfKey(3), 8); assert.equal(E.cellOfKey(5), 4); });
