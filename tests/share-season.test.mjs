import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inWindow, SEASON2_END, SEASON3_END } from '../public/js/season.js';
const kst = (s) => Date.parse(s + '+09:00');
test('quiz result season line: hidden before 12/1, shown in Dec, hidden 2027', () => {
  assert.equal(inWindow(kst('2026-11-30T23:59:59'), SEASON2_END, SEASON3_END), false);
  assert.equal(inWindow(kst('2026-12-01T00:00:00'), SEASON2_END, SEASON3_END), true);
  assert.equal(inWindow(kst('2027-01-01T00:00:00'), SEASON2_END, SEASON3_END), false);
});
test('6 languages carry challengeStart (game, distinct from challenge) and quiz.shareSeason', () => {
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) {
    const D = JSON.parse(readFileSync(`i18n/${l}.json`, 'utf8'));
    assert.ok(D.game.challengeStart && D.game.challengeStart !== D.game.challenge, l);
    assert.ok(D.quiz.shareSeason && D.quiz.shareSeason.length > 8, l);
  }
  assert.match(readFileSync('public/js/rush.js', 'utf8'), /g\.challengeStart/);
});

test('landing (/c/ without ?vs) also uses the challengeStart button and sub line [1120-21]', () => {
  const s = readFileSync('public/js/rush.js', 'utf8');
  assert.match(s, /btn\(inv \? \(g\.challengeStart/);
  assert.match(s, /if \(inv\) modal\.querySelector\('\.stack'\)/);
});
