import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreQuiz, chemistry, bestBuddy, CODES } from '../public/js/logic.js';
import * as G from '../public/js/rush-core.js';
import { checkI18n } from '../scripts/build-i18n.mjs';

test('quiz: all-a → SPH, all-b → CIT, tie broken by last question of axis', () => {
  assert.equal(scoreQuiz(Array(10).fill('a')).code, 'SPH');
  assert.equal(scoreQuiz(Array(10).fill('b')).code, 'CIT');
  // energy axis Q1,4,7,10: a,a,b,b → tie → Q10 = b → C
  const ans = ['a', 'a', 'a', 'a', 'a', 'a', 'b', 'a', 'a', 'b'];
  assert.equal(scoreQuiz(ans).code[0], 'C');
  assert.throws(() => scoreQuiz(['a']));
});
test('quiz: every code reachable (1024 combos)', () => {
  const seen = new Set();
  for (let m = 0; m < 1024; m++) seen.add(scoreQuiz([...Array(10)].map((_, i) => ((m >> i) & 1 ? 'b' : 'a'))).code);
  assert.deepEqual([...seen].sort(), [...CODES].sort());
});
test('chemistry: 8 patterns, symmetric pattern, best buddy opposite', () => {
  const pats = new Set();
  for (const a of CODES) for (const b of CODES) { const c = chemistry(a, b); pats.add(c.pattern); assert.equal(c.pattern, chemistry(b, a).pattern); }
  assert.equal(pats.size, 8);
  assert.equal(chemistry('SPH', 'SPH').pattern, 0); assert.equal(chemistry('SPH', 'CIT').pattern, 7);
  assert.equal(bestBuddy('SPH'), 'CIT'); assert.equal(chemistry('SPH', 'CPH').care, 'none');
  assert.equal(chemistry('SPH', 'SIH').care, 'prog'); assert.equal(chemistry('SPH', 'SPT').care, 'judge'); assert.equal(chemistry('SPH', 'SPH').care, 'same');
});
test('rush: deterministic course & attacks; no attack impact within 0.7s of gates', () => {
  for (const seed of ['2026-10-18', 'abc', 'x-1']) for (let s = 1; s <= 30; s++) {
    const c1 = G.makeCourse(seed, s), c2 = G.makeCourse(seed, s);
    assert.deepEqual(c1, c2);
    const gates = c1.filter((e) => e.type === 'gate').map((e) => e.time);
    for (const a of G.makeAttacks(seed, s, c1)) {
      if (a.type === 'D') continue;
      for (const h of [a.hit, a.hit2].filter((x) => x != null)) for (const g of gates) assert.ok(Math.abs(h - g) >= 0.7 - 1e-6, `seed ${seed} s${s} ${a.type} hit ${h} gate ${g}`);
    }
  }
});
test('rush: sim evidence passes spec targets', () => {
  const sim = JSON.parse(readFileSync(new URL('../reboot-evidence/rush-sim.json', import.meta.url)));
  assert.equal(sim.pass, true, JSON.stringify(sim.checks || sim));
});
test('i18n: 6 languages share ko key structure; MBTI only in disclaimer', () => {
  assert.deepEqual(checkI18n(), []);
});
test('core has no DOM / Math.random', () => {
  const src = (readFileSync(new URL('../public/js/rush-core.js', import.meta.url), 'utf8') + readFileSync(new URL('../public/js/logic.js', import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '');
  assert.ok(!/Math\.random|document\.|window\./.test(src));
});
