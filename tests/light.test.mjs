import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/light-core.js';

test('light L3: same seed+n → same board; board1 par 1; 2..30 par>=2 in range', () => {
  for (let s = 0; s < 20; s++) for (let n = 1; n <= 30; n++) {
    const a = E.genBoard('t' + s, n), b = E.genBoard('t' + s, n), t = E.TIERS[E.tierOf(n)];
    assert.equal(E.encode(a), E.encode(b)); assert.ok(a.par >= t.par[0] && a.par <= t.par[1]); assert.ok(n === 1 ? a.par === 1 : a.par >= 2); assert.ok(a.tries <= 33);
  }
});
test('light L5: idle → result at 5400 ticks', () => { for (let s = 0; s < 5; s++) assert.equal(E.simulate('i' + s, 'idle').tick, 5400); });
test('light L11a: same mirror never solves past board 1; skip spam 0 boards', () => {
  for (let s = 0; s < 5; s++) { assert.equal(E.simulate('m' + s, 'sameMirror').boards, 1); assert.equal(E.simulate('m' + s, 'skipSpam').boards, 0); }
});
test('light replay identical; FALLBACK boards valid', () => {
  const g = E.simulate('rp', 'random'), r = E.replay('rp', g.log); assert.deepEqual([r.boards, r.score], [g.boards, g.score]);
  E.FALLBACK.forEach((rows, ti) => rows.forEach((x) => { const d = E.decode(x), p = E.solve(d).par, t = E.TIERS[ti]; assert.ok(p >= t.par[0] && p <= t.par[1]); }));
});
