import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../public/js/orbit-core.js';

test('orbit: same seed → same level, different seed differs', () => {
  assert.deepEqual(O.generate('a').obs.slice(0, 10), O.generate('a').obs.slice(0, 10));
  assert.notDeepEqual(O.generate('a').obs.slice(0, 10), O.generate('b').obs.slice(0, 10));
});
test('orbit: switch windows ≥ 0.25 s and safe bot clears (10 seeds)', () => {
  for (let i = 0; i < 10; i++) {
    const L = O.generate('t' + i);
    for (const w of O.switchWindows(L)) assert.ok(w.window >= 0.25 && w.slack >= 0);
    assert.ok(O.simulate(L, 'safe').clear);
    assert.ok(!O.simulate(L, 'mash').clear);
  }
});
test('orbit: cooldown 0.25 s, collision during switch uses interpolated radius', () => {
  const g = O.createGame({ seed: 'x', obs: [], rings: [] });
  assert.equal(O.input(g), true); for (let i = 0; i < 24; i++) O.step(g); assert.equal(O.input(g), false);
  const ob = O.placeOb(1, 5); const h = O.createGame({ seed: 'f', obs: [ob], rings: [] }); h.shields = 0;
  while (!h.over && h.t < 6) { if (Math.abs(h.t - (ob.enter - 0.1)) < O.OC.DT / 2) O.input(h); O.step(h); }
  assert.equal(h.log.hits.length, 1); assert.equal(h.log.hits[0].trans, true);
});
test('orbit: late game (60 s+) has visible spinning bars, single pass inside each life span (t_9ad9f847)', () => {
  let bars = 0, late = 0;
  for (let i = 0; i < 20; i++) {
    for (const o of O.generate('b' + i).obs) {
      if (o.T < 60) continue; late++;
      if (o.vb) { bars++; assert.equal(O.intervals(o, o.warnStart - 0.1, o.exit + 0.1).length, 1); }
    }
  }
  assert.ok(bars / 20 >= 8, `bars/seed ${bars / 20}`); assert.ok(bars / late >= 0.2 && bars / late <= 0.5, `share ${bars / late}`);
});
