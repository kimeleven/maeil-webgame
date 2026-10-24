import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/magnet-core.js';

test('magnet M5: idle after start → auto drop 360 ticks after ready, result < 30 s, 0 ships', () => {
  for (let s = 0; s < 10; s++) { const g = E.simulate('t' + s, 'idle'); assert.equal(g.ships, 0); assert.equal(g.overWhy, 'lives'); assert.ok(g.tick < 1800); }
});
test('magnet M3: replay of the input log is identical', () => {
  for (const p of ['safe', 'randomTap']) { const g = E.simulate('rp', p), r = E.replay('rp', g.log); assert.deepEqual([r.placed, r.score, r.ships], [g.placed, g.score, g.ships]); }
});
test('magnet M11a: one column / stay-tap policies never ship', () => {
  for (let s = 0; s < 10; s++) for (const p of ['oneCol', 'stayTap']) assert.equal(E.simulate('a' + s, p).ships, 0);
});
test('magnet snap: column from ship-relative x, err ≥0.5 → sea', () => {
  assert.deepEqual([E.snap(4.5 - 2.5, 1).c, E.snap(4.5 + 2.5, 1).c], [0, 5]);
  assert.ok(E.snap(0.5, 1).err >= 0.5); assert.ok(E.snap(5.1, 1).err < 0.15 && E.snap(5.1, 1).c === 3);
  assert.equal(E.snap(4.5, 2).c, 2); assert.ok(E.snap(4.5, 2).err < 1e-9);
});
