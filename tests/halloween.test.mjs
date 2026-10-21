import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hwTarget, HALLOWEEN_END as MW_END } from '../middleware.js';
import { isHalloween, HALLOWEEN_END } from '../public/js/theme.js';

const before = Date.parse('2026-10-31T23:59:59+09:00'), after = Date.parse('2026-11-01T00:00:00+09:00');

test('cutoff is 2026-11-01 00:00 KST and the same in both places', () => {
  assert.equal(HALLOWEEN_END, after);
  assert.equal(MW_END, after);
});
test('theme on before cutoff, off after, query overrides', () => {
  assert.equal(isHalloween(before, ''), true);
  assert.equal(isHalloween(after, ''), false);
  assert.equal(isHalloween(after, '?theme=halloween'), true);
  assert.equal(isHalloween(before, '?theme=off'), false);
});
test('og rewrite only for known OG names, only before cutoff', () => {
  assert.equal(hwTarget('/og/site-ko.png', before), '/og/hw/site-ko.png');
  assert.equal(hwTarget('/og/type-SPH-pt-br.png', before), '/og/hw/type-SPH-pt-br.png');
  assert.equal(hwTarget('/og/challenge-zh-hans.png', before), '/og/hw/challenge-zh-hans.png');
  assert.equal(hwTarget('/og/game.png', before), '/og/hw/game.png');
  assert.equal(hwTarget('/og/hw/site-ko.png', before), null);
  assert.equal(hwTarget('/og/site-ko.png', after), null);
});
